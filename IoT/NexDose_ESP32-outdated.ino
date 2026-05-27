#include <WiFi.h>
#include <PubSubClient.h>
#include <ESP32Servo.h>
#include <ArduinoJson.h>
#include <EEPROM.h>
#include <time.h>

// ============================================================================
// CONFIGURAÇÕES DE REDE E MQTT
// ============================================================================
const char* ssid = "SSID_WIFI";                    // Configure com seu SSID WiFi
const char* password = "SENHA_WIFI";               // Configure com sua senha WiFi
const char* mqtt_server = "mqtt.example.com";      // Configure com seu servidor MQTT
const int mqtt_port = 1883;                        // Porta MQTT (1883 padrão)
const char* deviceID = "NexDose_001";              // ID único do dispositivo

// ============================================================================
// CONFIGURAÇÕES DE PINOS
// ============================================================================
const int SERVO1_PIN = 32;                         // GPIO32 - Servo Plataforma 1
const int SERVO2_PIN = 33;                         // GPIO33 - Servo Plataforma 2
const int SERVO3_PIN = 25;                         // GPIO25 - Servo Plataforma 3

const int HC_SR04_TRIG = 26;                       // GPIO26 - Sensor Ultrassônico TRIG
const int HC_SR04_ECHO = 27;                       // GPIO27 - Sensor Ultrassônico ECHO

const int BUZZER_PIN = 14;                         // GPIO14 - Buzzer
const int LED_WIFI_PIN = 12;                       // GPIO12 - LED Conexão WiFi
const int LED_MEDICACAO_PIN = 13;                  // GPIO13 - LED Medicação Disponível

// ============================================================================
// CONFIGURAÇÕES DE HARDWARE
// ============================================================================
const int TOTAL_SERVOS = 3;
const int HC_SR04_TIMEOUT = 30000;                 // Timeout sensor ultrassônico (µs)
const float DISTANCIA_GAVETA_LIMPA = 30.0;         // Distância (cm) quando gaveta está vazia
const float LIMIAR_DETECCAO_MEDICACAO = 25.0;      // Limiar para detectar medicação (cm)
const int TEMPO_ALERTA_COLETA = 30 * 60 * 1000;   // 30 minutos para coletar medicação

// ============================================================================
// EEPROM ADDRESSES
// ============================================================================
const int EEPROM_SIZE = 512;
const int ADDR_SERVO1_INDEX = 0;
const int ADDR_SERVO2_INDEX = 4;
const int ADDR_SERVO3_INDEX = 8;

// ============================================================================
// ESTRUTURAS DE DADOS
// ============================================================================
struct Configuracao {
  int total_divisorias;
  int angulo_por_dose;
};

struct DoseAgendada {
  int hora;              // Hora em formato 24h (0-23)
  int minuto;            // Minuto (0-59)
  int disco;             // Qual plataforma (1, 2, 3)
  int dose_index;        // Qual dose naquela plataforma
  String nome;           // Nome do medicamento
  bool executado_hoje;   // Já foi executado hoje?
};

struct EstadoDose {
  int disco;
  int dose_index;
  String nome;
  unsigned long timestamp_dispensada;
  bool confirmada_pela_gaveta;
};

// ============================================================================
// VARIÁVEIS GLOBAIS
// ============================================================================
WiFiClient espClient;
PubSubClient client(espClient);
Servo servos[TOTAL_SERVOS];
Configuracao config = {6, 30};                     // Valores padrão
EstadoDose dose_ativa = {-1, -1, "", 0, false};
unsigned long tempo_ultimo_alerta = 0;
bool wifi_conectado = false;
bool medicacao_disponivel = false;
int ultimo_index_servo[TOTAL_SERVOS] = {0, 0, 0};
// AGENDAMENTO E SINCRONIZAÇÃO DE HORA
const int MAX_AGENDAMENTOS = 20;                  // Máximo de horários agendados
DoseAgendada agendamentos[MAX_AGENDAMENTOS];
int total_agendamentos = 0;
unsigned long ultima_sincronizacao_ntp = 0;
const unsigned long INTERVALO_SINCRONIZACAO = 3600000; // 1 hora em ms
bool hora_sincronizada = false;
int ultima_hora_verificada = -1;                  // Última hora verificada
// ============================================================================
// CALLBACKS MQTT
// ============================================================================
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  char message[length + 1];
  strncpy(message, (char*)payload, length);
  message[length] = '\0';

  String topicStr = String(topic);
  String configTopic = String("dispositivo/") + String(deviceID) + String("/config");

  if (topicStr == configTopic) {
    processarConfiguracao(message);
  }
}

// ============================================================================
// PROCESSAMENTO DE CONFIGURAÇÃO JSON COM AGENDAMENTO
// ============================================================================
void processarConfiguracao(const char* jsonPayload) {
  StaticJsonDocument<3000> doc;
  DeserializationError error = deserializeJson(doc, jsonPayload);

  if (error) {
    Serial.print("Erro ao desserializar JSON: ");
    Serial.println(error.f_str());
    return;
  }

  // Atualizar configuração
  config.total_divisorias = doc["config"]["total_divisorias"] | 6;
  config.angulo_por_dose = doc["config"]["angulo_por_dose"] | 30;

  // Limpar agendamentos anteriores
  total_agendamentos = 0;
  memset(agendamentos, 0, sizeof(agendamentos));

  // Processar agenda com horários específicos
  JsonArray agenda = doc["agenda"];
  
  for (JsonObject item : agenda) {
    if (total_agendamentos >= MAX_AGENDAMENTOS) {
      Serial.println("Aviso: Máximo de agendamentos atingido!");
      break;
    }

    // Formato: "HH:MM" (ex: "08:30")
    String horario = item["hora"];
    int separador = horario.indexOf(':');
    
    if (separador == -1) {
      Serial.println("Erro: Formato de hora inválido (use HH:MM)");
      continue;
    }

    int hora = horario.substring(0, separador).toInt();
    int minuto = horario.substring(separador + 1).toInt();

    // Validar hora e minuto
    if (hora < 0 || hora > 23 || minuto < 0 || minuto > 59) {
      Serial.printf("Erro: Hora inválida - %d:%d\n", hora, minuto);
      continue;
    }

    agendamentos[total_agendamentos].hora = hora;
    agendamentos[total_agendamentos].minuto = minuto;
    agendamentos[total_agendamentos].disco = item["disco"] | 1;
    agendamentos[total_agendamentos].dose_index = item["dose_index"] | 1;
    agendamentos[total_agendamentos].nome = item["nome"].as<String>();
    agendamentos[total_agendamentos].executado_hoje = false;

    Serial.printf("✓ Agendamento %d: %02d:%02d - Disco %d, Dose %d - %s\n",
                  total_agendamentos + 1,
                  agendamentos[total_agendamentos].hora,
                  agendamentos[total_agendamentos].minuto,
                  agendamentos[total_agendamentos].disco,
                  agendamentos[total_agendamentos].dose_index,
                  agendamentos[total_agendamentos].nome.c_str());

    total_agendamentos++;
  }

  Serial.printf("✓ Configuração recebida: %d medicações agendadas\n", total_agendamentos);
  Serial.printf("✓ Config: %d divisórias, %d° por dose\n", config.total_divisorias, config.angulo_por_dose);
}

// ============================================================================
// FUNÇÕES DE SERVO MOTOR
// ============================================================================
void inicializarServos() {
  Serial.println("Inicializando servo motores...");
  
  // Restaurar últimos índices da EEPROM
  EEPROM.begin(EEPROM_SIZE);
  ultimo_index_servo[0] = EEPROM.readInt(ADDR_SERVO1_INDEX);
  ultimo_index_servo[1] = EEPROM.readInt(ADDR_SERVO2_INDEX);
  ultimo_index_servo[2] = EEPROM.readInt(ADDR_SERVO3_INDEX);
  
  // Validar valores lidos
  for (int i = 0; i < TOTAL_SERVOS; i++) {
    if (ultimo_index_servo[i] < 0 || ultimo_index_servo[i] > 180) {
      ultimo_index_servo[i] = 0;
    }
    Serial.printf("Servo %d - Último índice: %d\n", i + 1, ultimo_index_servo[i]);
  }

  // Anexar servos aos pinos
  servos[0].attach(SERVO1_PIN, 1000, 2000);
  servos[1].attach(SERVO2_PIN, 1000, 2000);
  servos[2].attach(SERVO3_PIN, 1000, 2000);

  // Mover servos para posição inicial (último índice conhecido)
  for (int i = 0; i < TOTAL_SERVOS; i++) {
    servos[i].write(ultimo_index_servo[i]);
  }

  delay(500);
  Serial.println("Servo motores inicializados!");
}

void dispararDose(int numeroServo, int doseIndex) {
  if (numeroServo < 0 || numeroServo >= TOTAL_SERVOS) {
    Serial.printf("Erro: Servo %d inválido!\n", numeroServo);
    return;
  }

  if (doseIndex < 1 || doseIndex > config.total_divisorias) {
    Serial.printf("Erro: Índice de dose %d fora do intervalo!\n", doseIndex);
    return;
  }

  Serial.printf("Disparando dose: Servo %d, Índice %d\n", numeroServo + 1, doseIndex);

  // Calcular ângulo alvo
  int anguloAlvo = doseIndex * config.angulo_por_dose;
  
  // Limitar ângulo entre 0 e 180
  if (anguloAlvo > 180) {
    anguloAlvo = 180;
  }

  // Tocar buzzer para indicar início do disparo
  tocarBuzzer(200, 1);

  // Mover servo
  servos[numeroServo].write(anguloAlvo);
  delay(1000); // Aguardar a dose cair

  // Salvar o novo índice na EEPROM
  ultimo_index_servo[numeroServo] = anguloAlvo;
  EEPROM.writeInt(ADDR_SERVO1_INDEX + (numeroServo * 4), anguloAlvo);
  EEPROM.commit();

  // Registrar dose dispensada
  dose_ativa.disco = numeroServo + 1;
  dose_ativa.dose_index = doseIndex;
  dose_ativa.timestamp_dispensada = millis();
  dose_ativa.confirmada_pela_gaveta = false;

  // Tocar buzzer mais longo para indicar que a dose está disponível
  delay(200);
  tocarBuzzer(500, 3);

  // Ativar LED de medicação disponível
  medicacao_disponivel = true;
  digitalWrite(LED_MEDICACAO_PIN, HIGH);

  // Publicar evento via MQTT
  publicarDoseDispensada();

  Serial.println("Dose dispensada com sucesso!");
}

// ============================================================================
// FUNÇÕES DO SENSOR ULTRASSÔNICO HC-SR04
// ============================================================================
float medirDistanciaGaveta() {
  // Enviar pulso de trigger
  digitalWrite(HC_SR04_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(HC_SR04_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(HC_SR04_TRIG, LOW);

  // Medir duração do pulso echo
  unsigned long duracao = pulseIn(HC_SR04_ECHO, HIGH, HC_SR04_TIMEOUT);

  // Calcular distância (velocidade do som = 343 m/s)
  float distancia = (duracao * 0.0343) / 2;

  return distancia;
}

void verificarMedicacaoNaGaveta() {
  static unsigned long proximo_check = 0;
  
  // Verificar a cada 2 segundos
  if (millis() < proximo_check) {
    return;
  }
  proximo_check = millis() + 2000;

  if (dose_ativa.disco == -1) {
    return; // Nenhuma dose ativa
  }

  float distancia = medirDistanciaGaveta();
  
  Serial.printf("Distância gaveta: %.1f cm\n", distancia);

  // Se a distância mudou significativamente, medicação foi coletada
  if (distancia < LIMIAR_DETECCAO_MEDICACAO) {
    if (!dose_ativa.confirmada_pela_gaveta) {
      dose_ativa.confirmada_pela_gaveta = true;
      
      // Apagar LED de medicação disponível
      medicacao_disponivel = false;
      digitalWrite(LED_MEDICACAO_PIN, LOW);
      
      // Tocar buzzer de confirmação
      tocarBuzzer(100, 2);
      
      // Publicar confirmação via MQTT
      publicarConfirmacaoColeta();
      
      Serial.println("Medicação coletada na gaveta!");
    }
  }
  
  // Verificar timeout (30 minutos sem coletar)
  if (!dose_ativa.confirmada_pela_gaveta && 
      millis() - dose_ativa.timestamp_dispensada > TEMPO_ALERTA_COLETA) {
    
    if (millis() - tempo_ultimo_alerta > 60000) { // Alertar a cada 1 minuto
      publicarAlertaColeta();
      tempo_ultimo_alerta = millis();
      
      // Tocar buzzer de alerta
      tocarBuzzer(150, 5);
      
      Serial.println("ALERTA: Medicação não foi coletada em 30 minutos!");
    }
  }
}

// ============================================================================
// FUNÇÕES DE BUZZER
// ============================================================================
void tocarBuzzer(int duracao_ms, int repeticoes) {
  for (int i = 0; i < repeticoes; i++) {
    digitalWrite(BUZZER_PIN, HIGH);
    delay(duracao_ms);
    digitalWrite(BUZZER_PIN, LOW);
    if (i < repeticoes - 1) {
      delay(100);
    }
  }
}

// ============================================================================
// FUNÇÕES DE LED
// ============================================================================
void atualizarLEDWiFi() {
  static unsigned long proximo_update = 0;
  
  if (millis() < proximo_update) {
    return;
  }
  proximo_update = millis() + 1000;

  if (WiFi.status() == WL_CONNECTED && client.connected()) {
    wifi_conectado = true;
    digitalWrite(LED_WIFI_PIN, HIGH);
  } else {
    wifi_conectado = false;
    digitalWrite(LED_WIFI_PIN, LOW);
  }
}

// ============================================================================
// FUNÇÕES MQTT
// ============================================================================
void conectarMQTT() {
  // Aguardar conexão WiFi
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(500);
  }
  
  Serial.println("\nWiFi conectado!");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());

  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(mqttCallback);

  // Tentar conectar ao MQTT
  int tentativas = 0;
  while (!client.connected() && tentativas < 10) {
    Serial.print("Conectando MQTT...");
    
    String clientID = String("ESP32-") + String(deviceID);
    if (client.connect(clientID.c_str())) {
      Serial.println(" Conectado!");
      
      // Inscrever nos tópicos relevantes
      String configTopic = String("dispositivo/") + String(deviceID) + String("/config");
      client.subscribe(configTopic.c_str());
      Serial.println("Inscrito em: " + configTopic);
      
      // Publicar status de conexão
      publicarStatusConexao(true);
      
    } else {
      Serial.print(" Falha, rc=");
      Serial.println(client.state());
      delay(3000);
      tentativas++;
    }
  }
}

void publicarDoseDispensada() {
  StaticJsonDocument<256> doc;
  
  doc["evento"] = "dose_dispensada";
  doc["disco"] = dose_ativa.disco;
  doc["dose_index"] = dose_ativa.dose_index;
  doc["nome"] = dose_ativa.nome;
  doc["timestamp"] = obterTimestamp();
  doc["confirmado_pela_gaveta"] = false;

  String topico = String("dispositivo/") + String(deviceID) + String("/status");
  char buffer[256];
  serializeJson(doc, buffer);
  
  client.publish(topico.c_str(), buffer);
  Serial.printf("Publicado em %s: %s\n", topico.c_str(), buffer);
}

void publicarConfirmacaoColeta() {
  StaticJsonDocument<256> doc;
  
  doc["evento"] = "dose_coletada";
  doc["disco"] = dose_ativa.disco;
  doc["dose_index"] = dose_ativa.dose_index;
  doc["timestamp"] = obterTimestamp();
  doc["confirmado_pela_gaveta"] = true;

  String topico = String("dispositivo/") + String(deviceID) + String("/status");
  char buffer[256];
  serializeJson(doc, buffer);
  
  client.publish(topico.c_str(), buffer);
  Serial.printf("Confirmação publicada em %s: %s\n", topico.c_str(), buffer);
  
  // Resetar dose ativa
  dose_ativa.disco = -1;
}

void publicarAlertaColeta() {
  StaticJsonDocument<256> doc;
  
  doc["evento"] = "alerta_coleta";
  doc["disco"] = dose_ativa.disco;
  doc["dose_index"] = dose_ativa.dose_index;
  doc["mensagem"] = "Medicação não foi coletada em 30 minutos";
  doc["timestamp"] = obterTimestamp();

  String topico = String("dispositivo/") + String(deviceID) + String("/status");
  char buffer[256];
  serializeJson(doc, buffer);
  
  client.publish(topico.c_str(), buffer);
  Serial.printf("Alerta publicado em %s: %s\n", topico.c_str(), buffer);
}

void publicarStatusConexao(bool conectado) {
  StaticJsonDocument<128> doc;
  
  doc["evento"] = conectado ? "conectado" : "desconectado";
  doc["deviceID"] = deviceID;
  doc["timestamp"] = obterTimestamp();

  String topico = String("dispositivo/") + String(deviceID) + String("/status");
  char buffer[128];
  serializeJson(doc, buffer);
  
  client.publish(topico.c_str(), buffer);
  Serial.printf("Status publicado: %s\n", buffer);
}

void manutencaoMQTT() {
  if (!client.connected()) {
    Serial.println("MQTT desconectado. Reconectando...");
    conectarMQTT();
  }
  client.loop();
}

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================
String obterTimestamp() {
  time_t now = time(nullptr);
  struct tm* timeinfo = gmtime(&now);
  
  char buffer[25];
  strftime(buffer, sizeof(buffer), "%Y-%m-%dT%H:%M:%SZ", timeinfo);
  
  return String(buffer);
}

void sincronizarHora() {
  // Sincronizar com NTP
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  
  Serial.print("Sincronizando hora com NTP...");
  time_t now = time(nullptr);
  int tentativas = 0;
  
  while (now < 24 * 3600 && tentativas < 20) {
    delay(500);
    Serial.print(".");
    now = time(nullptr);
    tentativas++;
  }
  
  Serial.println();
  if (now > 24 * 3600) {
    Serial.println("✓ Hora sincronizada com sucesso!");
    hora_sincronizada = true;
    ultima_sincronizacao_ntp = millis();
    imprimirHoraAtual();
  } else {
    Serial.println("✗ Falha na sincronização de hora!");
    hora_sincronizada = false;
  }
}

void imprimirHoraAtual() {
  time_t now = time(nullptr);
  struct tm* timeinfo = localtime(&now);
  
  Serial.printf("Hora atual do sistema: %02d:%02d:%02d\n",
                timeinfo->tm_hour,
                timeinfo->tm_min,
                timeinfo->tm_sec);
}

void manterSincronizacaoHora() {
  // Ressincronizar a cada 1 hora
  if (millis() - ultima_sincronizacao_ntp > INTERVALO_SINCRONIZACAO) {
    if (WiFi.status() == WL_CONNECTED) {
      Serial.println("\n[SINCRONIZAÇÃO] Ressincronizando hora com NTP...");
      sincronizarHora();
    }
  }
}

// ============================================================================
// VERIFICAÇÃO DE AGENDAMENTOS E DISPENSAÇÃO AUTOMÁTICA
// ============================================================================
void verificarAgendamentos() {
  // Só executa se a hora foi sincronizada
  if (!hora_sincronizada) {
    return;
  }

  // Obter hora atual
  time_t now = time(nullptr);
  struct tm* timeinfo = localtime(&now);
  
  int hora_atual = timeinfo->tm_hour;
  int minuto_atual = timeinfo->tm_min;
  
  // Verificar se há algum agendamento para agora
  for (int i = 0; i < total_agendamentos; i++) {
    DoseAgendada* agenda = &agendamentos[i];
    
    // Verificar se é a hora correta e ainda não foi executada hoje
    if (agenda->hora == hora_atual && 
        agenda->minuto == minuto_atual &&
        !agenda->executado_hoje) {
      
      Serial.printf("\n🕐 [AGENDAMENTO] Horário atingido: %02d:%02d\n", hora_atual, minuto_atual);
      Serial.printf("   Medicamento: %s (Disco %d, Dose %d)\n",
                    agenda->nome.c_str(),
                    agenda->disco,
                    agenda->dose_index);
      
      // Executar dispensação
      executarDoseAgendada(agenda);
      
      // Marcar como executada hoje
      agenda->executado_hoje = true;
    }
    
    // Resetar flag ao virar o dia (00:00)
    if (hora_atual == 0 && minuto_atual == 0 && agenda->executado_hoje) {
      agenda->executado_hoje = false;
      Serial.println("✓ Agendamentos resetados para o novo dia");
    }
  }
}

void executarDoseAgendada(DoseAgendada* agenda) {
  // Validar disco (1, 2, 3)
  if (agenda->disco < 1 || agenda->disco > TOTAL_SERVOS) {
    Serial.printf("✗ Erro: Disco %d inválido!\n", agenda->disco);
    return;
  }
  
  // Converter disco (1-3) para índice servo (0-2)
  int numeroServo = agenda->disco - 1;
  
  Serial.printf("→ Disparando dose agendada...\n");
  
  // Disparar a dose
  dispararDose(numeroServo, agenda->dose_index);
  
  // Publicar evento especial de agendamento executado
  publicarDoseAgendadaExecutada(agenda);
}

void publicarDoseAgendadaExecutada(DoseAgendada* agenda) {
  StaticJsonDocument<256> doc;
  
  doc["evento"] = "dose_agendada_executada";
  doc["disco"] = agenda->disco;
  doc["dose_index"] = agenda->dose_index;
  doc["nome"] = agenda->nome;
  doc["horario_planejado"] = String(agenda->hora) + ":" + 
                              (agenda->minuto < 10 ? "0" : "") + 
                              String(agenda->minuto);
  doc["timestamp"] = obterTimestamp();
  doc["confirmado_pela_gaveta"] = false;

  String topico = String("dispositivo/") + String(deviceID) + String("/status");
  char buffer[256];
  serializeJson(doc, buffer);
  
  client.publish(topico.c_str(), buffer);
  Serial.printf("✓ Dose agendada publicada: %s\n", buffer);
}

void imprimirAgendamentosAtivos() {
  static unsigned long proximo_print = 0;
  
  if (millis() < proximo_print) {
    return;
  }
  proximo_print = millis() + 60000; // A cada 1 minuto

  if (total_agendamentos == 0) {
    return;
  }

  Serial.println("\n========== AGENDAMENTOS ATIVOS ==========");
  for (int i = 0; i < total_agendamentos; i++) {
    DoseAgendada* agenda = &agendamentos[i];
    Serial.printf("%d. %02d:%02d - Disco %d (Dose %d) - %s %s\n",
                  i + 1,
                  agenda->hora,
                  agenda->minuto,
                  agenda->disco,
                  agenda->dose_index,
                  agenda->nome.c_str(),
                  agenda->executado_hoje ? "[✓ Executado hoje]" : "");
  }
  Serial.println("========================================\n");
}

void imprimirStatusSistema() {
  static unsigned long proximo_print = 0;
  
  if (millis() < proximo_print) {
    return;
  }
  proximo_print = millis() + 30000; // A cada 30 segundos

  Serial.println("\n========== STATUS DO SISTEMA ==========");
  Serial.printf("WiFi Conectado: %s\n", WiFi.status() == WL_CONNECTED ? "Sim" : "Não");
  Serial.printf("MQTT Conectado: %s\n", client.connected() ? "Sim" : "Não");
  Serial.printf("IP: %s\n", WiFi.localIP().toString().c_str());
  Serial.printf("Dose Ativa: Disco %d, Índice %d\n", dose_ativa.disco, dose_ativa.dose_index);
  Serial.printf("Medicação Disponível: %s\n", medicacao_disponivel ? "Sim" : "Não");
  for (int i = 0; i < TOTAL_SERVOS; i++) {
    Serial.printf("Servo %d - Último Índice: %d, Posição: %d°\n", 
                  i + 1, ultimo_index_servo[i], servos[i].read());
  }
  Serial.println("=======================================\n");
}

// ============================================================================
// SETUP
// ============================================================================
void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n========== NexDose ESP32 INICIANDO ==========\n");

  // Configurar pinos
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LED_WIFI_PIN, OUTPUT);
  pinMode(LED_MEDICACAO_PIN, OUTPUT);
  pinMode(HC_SR04_TRIG, OUTPUT);
  pinMode(HC_SR04_ECHO, INPUT);

  // Estado inicial dos LEDs
  digitalWrite(LED_WIFI_PIN, LOW);
  digitalWrite(LED_MEDICACAO_PIN, LOW);
  digitalWrite(BUZZER_PIN, LOW);

  // Inicializar servo motores
  inicializarServos();

  // Conectar WiFi
  Serial.print("Conectando WiFi: ");
  Serial.println(ssid);
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  // Conectar MQTT
  conectarMQTT();

  // Sincronizar hora com NTP
  sincronizarHora();

  // Tocar buzzer de inicialização bem-sucedida
  tocarBuzzer(100, 3);

  Serial.println("========== SETUP COMPLETADO ==========\n");
}

// ============================================================================
// LOOP PRINCIPAL
// ============================================================================
// ============================================================================
// LOOP PRINCIPAL
// ============================================================================
void loop() {
  // Manutenção MQTT
  manutencaoMQTT();

  // Atualizar status LED WiFi
  atualizarLEDWiFi();

  // Manter sincronização de hora (ressincronizar a cada 1 hora)
  manterSincronizacaoHora();

  // *** VERIFICAR AGENDAMENTOS E DISPENSAR AUTOMATICAMENTE ***
  verificarAgendamentos();

  // Verificar medicação na gaveta
  verificarMedicacaoNaGaveta();

  // Imprimir status do sistema periodicamente
  imprimirStatusSistema();

  // Imprimir agendamentos ativos periodicamente
  imprimirAgendamentosAtivos();

  // Pequeno delay para evitar saturação
  delay(100);
}

// ============================================================================
// FUNÇÕES ÚTEIS PARA TESTE
// ============================================================================
/*
  Para testar as funcionalidades, você pode usar estes comandos via Serial Monitor:
  
  - Publicar configuração JSON (substitua o tópico):
    mosquitto_pub -h localhost -t "dispositivo/NexDose_001/config" -m '{
      "config": {"total_divisorias": 6, "angulo_por_dose": 30},
      "agenda": [
        {"hora": "08:00", "disco": 1, "dose_index": 1, "nome": "Dipirona"},
        {"hora": "09:00", "disco": 2, "dose_index": 2, "nome": "Vitamina"}
      ]
    }'
  
  - Para disparar uma dose manualmente (via MQTT ou serial):
    Serial.println("Comando: DISPARAR_DOSE 1 3"); // Disco 1, Índice 3
*/
