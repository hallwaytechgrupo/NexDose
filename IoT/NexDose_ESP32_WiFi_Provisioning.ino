// #define MBEDTLS_SSL_IN_CONTENT_LEN 4096
// #define MBEDTLS_SSL_OUT_CONTENT_LEN 4096
#define SERVO_MIN_PULSE 544
#define SERVO_MAX_PULSE 2400

#include <WiFi.h>
// #include <WiFiClient.h>
#include <WebServer.h>
#include <DNSServer.h>
#include <PubSubClient.h>
#include <ESP32Servo.h>
#include <ArduinoJson.h>
#include <EEPROM.h>
#include <time.h>

// ============================================================================
// CONFIGURAÇÕES DE REDE E MQTT
// ============================================================================
String ssid = "SSID_WIFI";
String password = "SENHA_WIFI";
const char* mqtt_server = "broker.hivemq.com";
const int mqtt_port = 1883;
const char* deviceID = "nd001";
// const char* mqtt_pass = "public";

String TOPIC_STATUS;
String TOPIC_EVENT;

// ============================================================================
// CONFIGURAÇÕES DE WiFi PROVISIONING (Captive Portal)
// ============================================================================
const char* ap_ssid = "NexDose_Setup";
const char* ap_password = "12345678";
const int AP_TIMEOUT = 300000;
const int DNS_PORT = 53;
const int WEBSERVER_PORT = 80;

// ============================================================================
// CONFIGURAÇÕES DE PINOS
// ============================================================================
const int BOTAO_RESET_WIFI_PIN = 0;   // GPIO0 - botão BOOT

const int SERVO1_PIN = 32;
const int SERVO2_PIN = 33;
const int SERVO3_PIN = 25;

const int HC_SR04_TRIG = 26;
const int HC_SR04_ECHO = 27;

const int BUZZER_PIN = 14;
const int LED_WIFI_PIN = 12;
const int LED_MEDICACAO_PIN = 13;

// ============================================================================
// CONFIGURAÇÕES DE HARDWARE
// ============================================================================
const int TOTAL_SERVOS = 3;
const int HC_SR04_TIMEOUT = 30000;
const float DISTANCIA_GAVETA_LIMPA = 30.0;
const float LIMIAR_DETECCAO_MEDICACAO = 25.0;
const int TEMPO_ALERTA_COLETA = 30 * 60 * 1000;

// ============================================================================
// EEPROM ADDRESSES
// ============================================================================
const int EEPROM_SIZE = 512;
const int ADDR_SERVO1_INDEX = 0;
const int ADDR_SERVO2_INDEX = 4;
const int ADDR_SERVO3_INDEX = 8;
const int ADDR_SSID_LENGTH = 12;
const int ADDR_SSID_DATA = 13;
const int ADDR_PASSWORD_LENGTH = 45;
const int ADDR_PASSWORD_DATA = 46;

// ============================================================================
// ESTRUTURAS DE DADOS
// ============================================================================
struct Configuracao {
  int total_divisorias;
  int angulo_por_dose;
};

struct DoseAgendada {
  int hora;
  int minuto;
  int disco;
  int dose_index;
  String nome;
  bool executado_hoje;
};

struct EstadoDose {
  int disco;
  int dose_index;
  String nome;
  unsigned long timestamp_dispensada;
  bool confirmada_pela_gaveta;
};

struct DoseEmFila {
  int numeroServo;
  int doseIndex;
  String nome;
};

// ============================================================================
// VARIÁVEIS GLOBAIS
// ============================================================================
WiFiClient espClient;
PubSubClient client(espClient);
Servo servos[TOTAL_SERVOS];
Configuracao config = {6, 30};
EstadoDose dose_ativa = {-1, -1, "", 0, false};
unsigned long tempo_ultimo_alerta = 0;
bool wifi_conectado = false;
bool medicacao_disponivel = false;
int ultimo_index_servo[TOTAL_SERVOS] = {0, 0, 0};

const int MAX_AGENDAMENTOS = 20;
DoseAgendada agendamentos[MAX_AGENDAMENTOS];
int total_agendamentos = 0;
unsigned long ultima_sincronizacao_ntp = 0;
const unsigned long INTERVALO_SINCRONIZACAO = 3600000;
bool hora_sincronizada = false;
int ultima_hora_verificada = -1;

const int MAX_DOSES_FILA = 10;
DoseEmFila filaDoses[MAX_DOSES_FILA];
int totalDosesNaFila = 0;
unsigned long tempo_fim_movimento_servo = 0;
bool servo_em_movimento = false;
const unsigned long TEMPO_MINIMO_SERVO = 2000;

WebServer webServer(WEBSERVER_PORT);
DNSServer dnsServer;
bool ap_mode_ativo = false;
unsigned long tempo_ap_iniciado = 0;
bool deve_reconectar_wifi = false;

// ============================================================================
// VARIÁVEIS DO BOTÃO - POLLING DIRETO SEM ISR
// ============================================================================
unsigned long tempo_botao_pressionado = 0;
bool botao_estava_pressionado = false;
unsigned long ultimo_feedback_botao = 0;

// ============================================================================
// PROTÓTIPOS DE FUNÇÕES
// ============================================================================
void tocarBuzzer(int duracao_ms, int repeticoes);
void conectarWiFi();
void conectarMQTT();
void sincronizarHora();
void imprimirHoraAtual();
void publicarDoseDispensada();
void publicarConfirmacaoColeta();
void publicarAlertaColeta();
void publicarStatusConexao(bool conectado);
void publicarDoseAgendadaExecutada(DoseAgendada* agenda);
void dispararDoseInterno(int numeroServo, int doseIndex, const String& nomeMedicamento);
void adicionarDoseAFila(int numeroServo, int doseIndex, const String& nome);
void inicializarAPMode();
void processarConfiguracao(const char* jsonPayload);
void executarDoseAgendada(DoseAgendada* agenda);
String obterTimestamp();

// ============================================================================
// FUNÇÕES DE EEPROM
// ============================================================================
void salvarCredenciaisWiFi(const String& novo_ssid, const String& nova_senha) {
  EEPROM.begin(EEPROM_SIZE);
  EEPROM.write(ADDR_SSID_LENGTH, novo_ssid.length());
  for (int i = 0; i < (int)novo_ssid.length(); i++) {
    EEPROM.write(ADDR_SSID_DATA + i, novo_ssid[i]);
  }
  EEPROM.write(ADDR_PASSWORD_LENGTH, nova_senha.length());
  for (int i = 0; i < (int)nova_senha.length(); i++) {
    EEPROM.write(ADDR_PASSWORD_DATA + i, nova_senha[i]);
  }
  EEPROM.commit();
  Serial.printf("✓ Credenciais salvas: SSID=%s\n", novo_ssid.c_str());
}

void carregarCredenciaisWiFi() {
  EEPROM.begin(EEPROM_SIZE);
  int ssid_length = EEPROM.read(ADDR_SSID_LENGTH);
  if (ssid_length > 0 && ssid_length <= 32) {
    ssid = "";
    for (int i = 0; i < ssid_length; i++) {
      ssid += (char)EEPROM.read(ADDR_SSID_DATA + i);
    }
  } else {
    ssid = "SSID_WIFI";
  }
  int password_length = EEPROM.read(ADDR_PASSWORD_LENGTH);
  if (password_length > 0 && password_length <= 64) {
    password = "";
    for (int i = 0; i < password_length; i++) {
      password += (char)EEPROM.read(ADDR_PASSWORD_DATA + i);
    }
  } else {
    password = "SENHA_WIFI";
  }
  Serial.printf("✓ Credenciais carregadas: SSID=%s\n", ssid.c_str());
}

// ============================================================================
// BOTÃO RESET WiFi - POLLING DIRETO (sem ISR, sem interrupção)
// ============================================================================
void verificarBotaoResetWiFi() {
  bool pressionado_agora = (digitalRead(BOTAO_RESET_WIFI_PIN) == LOW);

  // Borda de descida: botão acabou de ser pressionado
  if (pressionado_agora && !botao_estava_pressionado) {
    botao_estava_pressionado = true;
    tempo_botao_pressionado = millis();
    ultimo_feedback_botao = millis();
    Serial.println("\n🔘 Botão pressionado — segure 5s para resetar WiFi...");
  }

  // Botão solto antes dos 5s
  if (!pressionado_agora && botao_estava_pressionado) {
    botao_estava_pressionado = false;
    tempo_botao_pressionado = 0;
    Serial.println("🔘 Botão solto antes de 5s. Nenhuma ação.");
  }

  // Botão ainda pressionado: feedback a cada segundo
  if (pressionado_agora && botao_estava_pressionado && tempo_botao_pressionado > 0) {
    unsigned long tempo_segurando = millis() - tempo_botao_pressionado;

    // Bipe e log a cada 1 segundo
    if (millis() - ultimo_feedback_botao >= 1000) {
      ultimo_feedback_botao = millis();
      int segundos = tempo_segurando / 1000;
      Serial.printf("🔘 Segurando: %d/5 segundos...\n", segundos);
      
      // Feedback sonoro rápido sem travar a CPU
      digitalWrite(BUZZER_PIN, HIGH);
    }
    
    // Desliga o buzzer após 30ms do feedback (Buzzer Não-Bloqueante)
    if (millis() - ultimo_feedback_botao >= 30 && digitalRead(BUZZER_PIN) == HIGH) {
      digitalWrite(BUZZER_PIN, LOW);
    }

    // 5 segundos atingidos: executar reset
    if (tempo_segurando >= 5000) {
      Serial.println("\n⚠️  RESET WiFi acionado! Apagando credenciais...");
      
      // Forçar o desligamento do buzzer se estiver ligado
      digitalWrite(BUZZER_PIN, LOW);

      // Desconectar MQTT e WiFi
      if (client.connected()) client.disconnect();
      WiFi.disconnect(true);
      wifi_conectado = false;
      
      // Apagar credenciais da EEPROM
      EEPROM.begin(EEPROM_SIZE);
      EEPROM.write(ADDR_SSID_LENGTH, 0);
      EEPROM.write(ADDR_PASSWORD_LENGTH, 0);
      EEPROM.commit();

      Serial.println("✓ Credenciais apagadas. Abrindo configuração WiFi...\n");
      
      // 3 bipes longos de confirmação
      tocarBuzzer(300, 3);

      ap_mode_ativo = false;
      inicializarAPMode();
      
      // Trava a reexecução até que o usuário SOLTE o botão fisicamente
      while(digitalRead(BOTAO_RESET_WIFI_PIN) == LOW) {
        delay(10); 
      }
      
      // Reseta as variáveis de controle após soltar
      botao_estava_pressionado = false;
      tempo_botao_pressionado = 0;
    }
  }
}

// ============================================================================
// SERVIDOR WEB - CAPTIVE PORTAL
// ============================================================================
String gerarHTMLConfiguracao() {
  return R"=====(
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NexDose - Configuração WiFi</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex; justify-content: center; align-items: center;
            min-height: 100vh; margin: 0; padding: 20px;
        }
        .container {
            background: white; border-radius: 10px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            padding: 30px; max-width: 400px; width: 100%;
        }
        h1 { color: #333; text-align: center; margin-bottom: 30px; font-size: 28px; }
        .form-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 8px; color: #555; font-weight: bold; }
        input[type="text"], input[type="password"] {
            width: 100%; padding: 12px; border: 2px solid #ddd;
            border-radius: 5px; font-size: 16px; box-sizing: border-box;
        }
        button {
            width: 100%; padding: 12px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white; border: none; border-radius: 5px;
            font-size: 16px; font-weight: bold; cursor: pointer;
        }
        .info {
            background: #f0f0f0; padding: 15px; border-radius: 5px;
            margin-bottom: 20px; font-size: 14px; color: #666; text-align: center;
        }
        .status { text-align: center; margin-top: 20px; font-size: 14px; color: #666; }
        .spinner {
            display: none; border: 3px solid #f3f3f3; border-top: 3px solid #667eea;
            border-radius: 50%; width: 20px; height: 20px;
            animation: spin 1s linear infinite; margin: 10px auto;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    </style>
</head>
<body>
    <div class="container">
        <h1>🏥 NexDose</h1>
        <div class="info">Dispositivo de Dispensação de Medicamentos</div>
        <form id="wifiForm">
            <div class="form-group">
                <label for="ssid">Rede WiFi (SSID):</label>
                <input type="text" id="ssid" name="ssid" placeholder="Nome da sua rede WiFi" required>
            </div>
            <div class="form-group">
                <label for="password">Senha WiFi:</label>
                <input type="password" id="password" name="password" placeholder="Senha da rede WiFi" required>
            </div>
            <button type="submit">Conectar</button>
        </form>
        <div class="status" id="status"></div>
        <div class="spinner" id="spinner"></div>
    </div>
    <script>
        document.getElementById('wifiForm').addEventListener('submit', function(e) {
            e.preventDefault();
            const ssid = document.getElementById('ssid').value;
            const password = document.getElementById('password').value;
            const spinner = document.getElementById('spinner');
            const status = document.getElementById('status');
            spinner.style.display = 'block';
            status.textContent = 'Conectando...';
            fetch('/save-wifi', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ssid: ssid, password: password })
            })
            .then(response => response.json())
            .then(data => {
                status.textContent = data.message;
                if (data.success) {
                    status.style.color = 'green';
                    status.textContent += '\n\nDispositivo reiniciando...';
                } else {
                    status.style.color = 'red';
                    spinner.style.display = 'none';
                }
            })
            .catch(error => {
                status.textContent = 'Erro: ' + error;
                status.style.color = 'red';
                spinner.style.display = 'none';
            });
        });
    </script>
</body>
</html>
)=====" ;
}

void handleRoot() {
  webServer.send(200, "text/html", gerarHTMLConfiguracao());
}

void handleSaveWiFi() {
  if (webServer.method() == HTTP_POST) {
    if (webServer.hasArg("plain")) {
      String body = webServer.arg("plain");
      StaticJsonDocument<256> doc;
      DeserializationError error = deserializeJson(doc, body);
      if (!error) {
        String novo_ssid = doc["ssid"].as<String>();
        String nova_senha = doc["password"].as<String>();
        if (novo_ssid.length() > 0 && novo_ssid.length() <= 32 &&
            nova_senha.length() > 0 && nova_senha.length() <= 64) {
          salvarCredenciaisWiFi(novo_ssid, nova_senha);
          ssid = novo_ssid;
          password = nova_senha;
          StaticJsonDocument<128> resposta;
          resposta["success"] = true;
          resposta["message"] = "WiFi salvo com sucesso! Reiniciando...";
          String response;
          serializeJson(resposta, response);
          webServer.send(200, "application/json", response);
          deve_reconectar_wifi = true;
          delay(2000);
          ESP.restart();
        } else {
          StaticJsonDocument<128> resposta;
          resposta["success"] = false;
          resposta["message"] = "SSID ou senha inválidos";
          String response;
          serializeJson(resposta, response);
          webServer.send(400, "application/json", response);
        }
      } else {
        webServer.send(400, "application/json", "{\"success\":false,\"message\":\"JSON inválido\"}");
      }
    } else {
      webServer.send(400, "application/json", "{\"success\":false,\"message\":\"Nenhum dado recebido\"}");
    }
  } else {
    webServer.send(405, "application/json", "{\"success\":false,\"message\":\"Método não permitido\"}");
  }
}

void handleNotFound() {
  webServer.sendHeader("Location", "http://192.168.4.1/", true);
  webServer.send(302, "text/plain", "");
}

// ============================================================================
// WIFI PROVISIONING - MODO AP
// ============================================================================
void inicializarAPMode() {
  Serial.println("\n========== INICIANDO AP MODE (Captive Portal) ==========\n");
  WiFi.disconnect(true);
  WiFi.mode(WIFI_AP);
  WiFi.softAP(ap_ssid, ap_password);
  IPAddress apIP(192, 168, 4, 1);
  WiFi.softAPConfig(apIP, apIP, IPAddress(255, 255, 255, 0));
  Serial.printf("✓ AP iniciado: %s\n", ap_ssid);
  Serial.printf("✓ IP: %s\n", WiFi.softAPIP().toString().c_str());
  dnsServer.start(DNS_PORT, "*", apIP);
  webServer.on("/", handleRoot);
  webServer.on("/save-wifi", handleSaveWiFi);
  webServer.onNotFound(handleNotFound);
  webServer.begin();
  Serial.println("✓ WebServer iniciado na porta 80");
  Serial.println("✓ DNS Server iniciado na porta 53");
  Serial.println("\n📱 Conecte seu celular à rede: NexDose_Setup");
  Serial.println("🔑 Senha: 12345678");
  Serial.println("🌐 Acesse: http://192.168.4.1\n");
  ap_mode_ativo = true;
  tempo_ap_iniciado = millis();
  tocarBuzzer(100, 2);
}

void procesarAPMode() {
  if (!ap_mode_ativo) return;
  dnsServer.processNextRequest();
  webServer.handleClient();
  static unsigned long proximo_piscar = 0;
  if (millis() >= proximo_piscar) {
    digitalWrite(LED_WIFI_PIN, !digitalRead(LED_WIFI_PIN));
    proximo_piscar = millis() + 500;
  }
  if (millis() - tempo_ap_iniciado > AP_TIMEOUT) {
    Serial.println("\n⏱️  Timeout AP Mode. Retornando ao modo normal...\n");
    dnsServer.stop();
    webServer.stop();
    ap_mode_ativo = false;
    digitalWrite(LED_WIFI_PIN, LOW);
    conectarWiFi();
  }
}

// ============================================================================
// CONEXÃO WiFi
// ============================================================================
bool verificarConexaoWiFi() {
  int tentativas = 0;
  const int MAX_TENTATIVAS = 20;
  while (WiFi.status() != WL_CONNECTED && tentativas < MAX_TENTATIVAS) {
    delay(500);
    Serial.print(".");
    tentativas++;
  }
  return WiFi.status() == WL_CONNECTED;
}

void conectarWiFi() {
  Serial.print("\n🔌 Tentando conectar ao WiFi: ");
  Serial.println(ssid.c_str());
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid.c_str(), password.c_str());
  if (verificarConexaoWiFi()) {
    Serial.println("\n✓ WiFi conectado com sucesso!");
    Serial.print("✓ IP: ");
    Serial.println(WiFi.localIP());
    wifi_conectado = true;
    tocarBuzzer(100, 3);
  } else {
    Serial.println("\n✗ Falha ao conectar ao WiFi");
    Serial.println("📡 Iniciando AP Mode para configuração...\n");
    wifi_conectado = false;
    inicializarAPMode();
  }
}

// ============================================================================
// CALLBACKS MQTT
// ============================================================================
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  char message[length + 1];
  strncpy(message, (char*)payload, length);
  message[length] = '\0';
  String topicStr = String(topic);

  if (topicStr == TOPIC_EVENT) {
    Serial.println("\n📥 [MQTT] Evento recebido do servidor");
    
    // Aloca um documento temporário para checar comandos diretos
    StaticJsonDocument<512> docTeste;
    DeserializationError error = deserializeJson(docTeste, message);
    
    if (!error && docTeste.containsKey("comando") && docTeste["comando"] == "disparar_imediato") {
      int disco = docTeste["disco"] | 1;
      int dose_index = docTeste["dose_index"] | 1;
      String nome = docTeste["nome"] | "Teste Imediato";
      
      Serial.println("🎯 Comando de disparo imediato recebido!");
      adicionarDoseAFila(disco - 1, dose_index, nome);
    } else {
      // Se não for comando imediato, segue o fluxo normal de agendamento
      processarConfiguracao(message);
    }
  }
}

// ============================================================================
// PROCESSAMENTO DE CONFIGURAÇÃO JSON
// ============================================================================
void processarConfiguracao(const char* jsonPayload) {
  StaticJsonDocument<3000> doc;
  DeserializationError error = deserializeJson(doc, jsonPayload);
  if (error) {
    Serial.print("Erro ao desserializar JSON: ");
    Serial.println(error.f_str());
    return;
  }
  config.total_divisorias = doc["config"]["total_divisorias"] | 6;
  config.angulo_por_dose  = doc["config"]["angulo_por_dose"]  | 30;
  total_agendamentos = 0;
  memset(agendamentos, 0, sizeof(agendamentos));
  JsonArray agenda = doc["agenda"];
  for (JsonObject item : agenda) {
    if (total_agendamentos >= MAX_AGENDAMENTOS) {
      Serial.println("Aviso: Máximo de agendamentos atingido!");
      break;
    }
    String horario = item["hora"];
    int separador = horario.indexOf(':');
    if (separador == -1) { Serial.println("Erro: Formato de hora inválido"); continue; }
    int hora   = horario.substring(0, separador).toInt();
    int minuto = horario.substring(separador + 1).toInt();
    if (hora < 0 || hora > 23 || minuto < 0 || minuto > 59) {
      Serial.printf("Erro: Hora inválida - %d:%d\n", hora, minuto);
      continue;
    }
    agendamentos[total_agendamentos].hora           = hora;
    agendamentos[total_agendamentos].minuto         = minuto;
    agendamentos[total_agendamentos].disco          = item["disco"]      | 1;
    agendamentos[total_agendamentos].dose_index     = item["dose_index"] | 1;
    agendamentos[total_agendamentos].nome           = item["nome"].as<String>();
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
}

// ============================================================================
// FILA DE DOSES
// ============================================================================
void adicionarDoseAFila(int numeroServo, int doseIndex, const String& nome) {
  if (totalDosesNaFila >= MAX_DOSES_FILA) {
    Serial.printf("⚠️  Fila cheia! Não foi possível adicionar: %s\n", nome.c_str());
    return;
  }
  filaDoses[totalDosesNaFila].numeroServo = numeroServo;
  filaDoses[totalDosesNaFila].doseIndex   = doseIndex;
  filaDoses[totalDosesNaFila].nome        = nome;
  totalDosesNaFila++;
  Serial.printf("✓ Dose adicionada à fila (%d pendentes): %s (Servo %d)\n",
                totalDosesNaFila, nome.c_str(), numeroServo + 1);
}

void processarFilaDoses() {
  if (totalDosesNaFila == 0) { servo_em_movimento = false; return; }
  if (servo_em_movimento) {
    if (millis() < tempo_fim_movimento_servo) return;
    servo_em_movimento = false;
    delay(500);
    Serial.println("→ Servo finalizou. Aguardando antes do próximo...");
  }
  if (totalDosesNaFila > 0) {
    DoseEmFila* dose = &filaDoses[0];
    Serial.printf("\n🎯 [FILA] Processando: %s (Servo %d, Índice %d)\n",
                  dose->nome.c_str(), dose->numeroServo + 1, dose->doseIndex);
    dispararDoseInterno(dose->numeroServo, dose->doseIndex, dose->nome);
    servo_em_movimento = true;
    tempo_fim_movimento_servo = millis() + TEMPO_MINIMO_SERVO;
    for (int i = 0; i < totalDosesNaFila - 1; i++) filaDoses[i] = filaDoses[i + 1];
    totalDosesNaFila--;
    Serial.printf("✓ Doses restantes na fila: %d\n\n", totalDosesNaFila);
  }
}

// ============================================================================
// SERVO MOTOR
// ============================================================================
void inicializarServos() {
  Serial.println("Inicializando servo motores...");
  EEPROM.begin(EEPROM_SIZE);
  ultimo_index_servo[0] = EEPROM.readInt(ADDR_SERVO1_INDEX);
  ultimo_index_servo[1] = EEPROM.readInt(ADDR_SERVO2_INDEX);
  ultimo_index_servo[2] = EEPROM.readInt(ADDR_SERVO3_INDEX);
  
  for (int i = 0; i < TOTAL_SERVOS; i++) {
    if (ultimo_index_servo[i] < 0 || ultimo_index_servo[i] > 180) ultimo_index_servo[i] = 0;
    Serial.printf("Servo %d - Último índice: %d\n", i + 1, ultimo_index_servo[i]);
  }

  // 💡 Ajustado aqui também para usar os limites corretos na inicialização
  servos[0].attach(SERVO1_PIN, SERVO_MIN_PULSE, SERVO_MAX_PULSE);
  servos[1].attach(SERVO2_PIN, SERVO_MIN_PULSE, SERVO_MAX_PULSE);
  servos[2].attach(SERVO3_PIN, SERVO_MIN_PULSE, SERVO_MAX_PULSE);
  
  for (int i = 0; i < TOTAL_SERVOS; i++) servos[i].write(ultimo_index_servo[i]);
  delay(500);
  Serial.println("✓ Servo motores inicializados!");
}

void dispararDoseInterno(int numeroServo, int doseIndex, const String& nomeMedicamento) {
  if (numeroServo < 0 || numeroServo >= TOTAL_SERVOS) {
    Serial.printf("✗ Erro: Servo %d inválido!\n", numeroServo + 1);
    return;
  }
  if (doseIndex < 1 || doseIndex > config.total_divisorias) {
    Serial.printf("✗ Erro: Índice de dose %d fora do intervalo!\n", doseIndex);
    return;
  }
  
  Serial.printf("→ Acionando servo %d | Dose %d | %s\n",
                numeroServo + 1, doseIndex, nomeMedicamento.c_str());

  // 💡 Correção 1: Aplica os limites de pulso de 180° na inicialização dinâmica do servo
  servos[numeroServo].attach(numeroServo == 0 ? SERVO1_PIN : (numeroServo == 1 ? SERVO2_PIN : SERVO3_PIN), SERVO_MIN_PULSE, SERVO_MAX_PULSE);
  delay(100);

  // 📐 Correção 2: Novo cálculo de ângulo para cobrir o curso completo até 180°
  int anguloAlvo = doseIndex * config.angulo_por_dose; // Ex: Dose 6 * 30° = 180°
  if (anguloAlvo > 180) anguloAlvo = 180;

  tocarBuzzer(200, 1);
  servos[numeroServo].write(anguloAlvo);
  delay(1500); // Dá tempo físico para o motor alcançar o ângulo e o remédio cair
  
  // 🔄 Correção 3: Regra de Negócio — Se for a última dose (Índice 6 = 180°), retorna ao ponto 0
  if (doseIndex >= config.total_divisorias) {
    Serial.println("🔄 Última dose entregue! Retornando o disco automaticamente para o Ponto Inicial (0°)...");
    servos[numeroServo].write(0);
    delay(1500); // Aguarda o retorno físico ao ponto zero
    anguloAlvo = 0; // Para gravar o estado zerado na EEPROM
  }

  // Atualiza as variáveis internas e a memória estável EEPROM
  ultimo_index_servo[numeroServo] = anguloAlvo;
  EEPROM.writeInt(ADDR_SERVO1_INDEX + (numeroServo * 4), anguloAlvo);
  EEPROM.commit();

  // Mantém os alertas e publicações do seu ecossistema originais ativos
  dose_ativa.disco                  = numeroServo + 1;
  dose_ativa.dose_index             = doseIndex;
  dose_ativa.nome                   = nomeMedicamento;
  dose_ativa.timestamp_dispensada   = millis();
  dose_ativa.confirmada_pela_gaveta = false;
  
  delay(200);
  tocarBuzzer(500, 3);
  medicacao_disponivel = true;
  digitalWrite(LED_MEDICACAO_PIN, HIGH);
  publicarDoseDispensada();
  
  // Desconecta o pino temporariamente para evitar vibrações e economizar energia
  servos[numeroServo].detach();
  Serial.printf("✓ Processo finalizado! Servo %d reposicionado e desligado.\n\n", numeroServo + 1);
}

void dispararDose(int numeroServo, int doseIndex) {
  if (numeroServo < 0 || numeroServo >= TOTAL_SERVOS) {
    Serial.printf("✗ Erro: Servo %d inválido!\n", numeroServo); return;
  }
  if (doseIndex < 1 || doseIndex > config.total_divisorias) {
    Serial.printf("✗ Erro: Índice de dose %d fora do intervalo!\n", doseIndex); return;
  }
  adicionarDoseAFila(numeroServo, doseIndex, "Medicação");
}

// ============================================================================
// SENSOR ULTRASSÔNICO HC-SR04
// ============================================================================
float medirDistanciaGaveta() {
  digitalWrite(HC_SR04_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(HC_SR04_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(HC_SR04_TRIG, LOW);
  unsigned long duracao = pulseIn(HC_SR04_ECHO, HIGH, HC_SR04_TIMEOUT);
  return (duracao * 0.0343) / 2;
}

void verificarMedicacaoNaGaveta() {
  static unsigned long proximo_check = 0;
  if (millis() < proximo_check) return;
  proximo_check = millis() + 2000;
  if (dose_ativa.disco == -1) return;
  float distancia = medirDistanciaGaveta();
  Serial.printf("Distância gaveta: %.1f cm\n", distancia);
  if (distancia < LIMIAR_DETECCAO_MEDICACAO) {
    if (!dose_ativa.confirmada_pela_gaveta) {
      dose_ativa.confirmada_pela_gaveta = true;
      medicacao_disponivel = false;
      digitalWrite(LED_MEDICACAO_PIN, LOW);
      tocarBuzzer(100, 2);
      publicarConfirmacaoColeta();
      Serial.println("✓ Medicação coletada na gaveta!");
    }
  }
  if (!dose_ativa.confirmada_pela_gaveta &&
      millis() - dose_ativa.timestamp_dispensada > TEMPO_ALERTA_COLETA) {
    if (millis() - tempo_ultimo_alerta > 60000) {
      publicarAlertaColeta();
      tempo_ultimo_alerta = millis();
      tocarBuzzer(150, 5);
      Serial.println("⚠️  ALERTA: Medicação não coletada em 30 minutos!");
    }
  }
}

// ============================================================================
// BUZZER
// ============================================================================
void tocarBuzzer(int duracao_ms, int repeticoes) {
  for (int i = 0; i < repeticoes; i++) {
    digitalWrite(BUZZER_PIN, HIGH);
    delay(duracao_ms);
    digitalWrite(BUZZER_PIN, LOW);
    if (i < repeticoes - 1) delay(100);
  }
}

// ============================================================================
// LED WiFi
// ============================================================================
void atualizarLEDWiFi() {
  static unsigned long proximo_update = 0;
  if (millis() < proximo_update) return;
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
// MQTT
// ============================================================================
void conectarMQTT() {
  if (WiFi.status() != WL_CONNECTED) return;
  
  static unsigned long ultima_tentativa_mqtt = 0;
  // Tenta conectar apenas a cada 5 segundos se falhar, sem travar o loop
  if (millis() - ultima_tentativa_mqtt < 5000) return; 
  ultima_tentativa_mqtt = millis();

  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(mqttCallback);

  if (!client.connected()) {
    Serial.print("Conectando ao Broker Público HiveMQ...");
    
    // Gera um Client ID aleatório para evitar conflitos com outros devs no servidor
    String clientID = String("ESP32-NexDose-") + String(deviceID) + String("-") + String(random(0, 9999));
    
    // Conexão direta sem credenciais
    if (client.connect(clientID.c_str())) {
      Serial.println(" Conectado com sucesso!");
      client.subscribe(TOPIC_EVENT.c_str());
      Serial.println("✓ Inscrito em: " + TOPIC_EVENT);
      publicarStatusConexao(true);
    } else {
      Serial.print(" Falha na conexão, rc=");
      Serial.println(client.state());
    }
  }
}

void publicarDoseDispensada() {
  StaticJsonDocument<256> doc;
  doc["evento"]                 = "dose_dispensada";
  doc["disco"]                  = dose_ativa.disco;
  doc["dose_index"]             = dose_ativa.dose_index;
  doc["nome"]                   = dose_ativa.nome;
  doc["timestamp"]              = obterTimestamp();
  doc["confirmado_pela_gaveta"] = false;
  char buffer[256];
  serializeJson(doc, buffer);
  client.publish(TOPIC_STATUS.c_str(), buffer);
  Serial.printf("✓ Publicado em: %s\n", TOPIC_STATUS.c_str());
}

void publicarConfirmacaoColeta() {
  StaticJsonDocument<256> doc;
  doc["evento"]                 = "dose_coletada";
  doc["disco"]                  = dose_ativa.disco;
  doc["dose_index"]             = dose_ativa.dose_index;
  doc["timestamp"]              = obterTimestamp();
  doc["confirmado_pela_gaveta"] = true;
  char buffer[256];
  serializeJson(doc, buffer);
  client.publish(TOPIC_STATUS.c_str(), buffer);
  Serial.printf("✓ Confirmação publicada em: %s\n", TOPIC_STATUS.c_str());
  dose_ativa.disco = -1;
}

void publicarAlertaColeta() {
  StaticJsonDocument<256> doc;
  doc["evento"]     = "alerta_coleta";
  doc["disco"]      = dose_ativa.disco;
  doc["dose_index"] = dose_ativa.dose_index;
  doc["mensagem"]   = "Medicação não foi coletada em 30 minutos";
  doc["timestamp"]  = obterTimestamp();
  char buffer[256];
  serializeJson(doc, buffer);
  client.publish(TOPIC_STATUS.c_str(), buffer);
  Serial.printf("⚠️  Alerta publicado em: %s\n", TOPIC_STATUS.c_str());
}

void publicarStatusConexao(bool conectado) {
  StaticJsonDocument<128> doc;
  doc["evento"]    = conectado ? "conectado" : "desconectado";
  doc["deviceID"]  = deviceID;
  doc["timestamp"] = obterTimestamp();
  char buffer[128];
  serializeJson(doc, buffer);
  client.publish(TOPIC_STATUS.c_str(), buffer);
  Serial.printf("✓ Status publicado em: %s\n", TOPIC_STATUS.c_str());
}

void manutencaoMQTT() {
  if (!client.connected()) {
    if (WiFi.status() == WL_CONNECTED) {
      Serial.println("MQTT desconectado. Reconectando...");
      conectarMQTT();
    }
  } else {
    client.loop();
  }
}

// ============================================================================
// HORA / NTP
// ============================================================================
String obterTimestamp() {
  time_t now = time(nullptr);
  struct tm* timeinfo = gmtime(&now);
  char buffer[25];
  strftime(buffer, sizeof(buffer), "%Y-%m-%dT%H:%M:%SZ", timeinfo);
  return String(buffer);
}

void sincronizarHora() {
  Serial.println("Sincronizando hora via NTP...");
  
  // O fuso horário do Brasil (Horário de Brasília) é UTC -3 horas.
  // 3 horas * 60 minutos * 60 segundos = 10800 segundos negativos.
  long gmtOffset_sec = -10800; 
  int daylightOffset_sec = 0; // Deixe 0 (já que não temos mais horário de verão)

  // Configura o NTP com o fuso correto
  configTime(gmtOffset_sec, daylightOffset_sec, "pool.ntp.org", "time.nist.gov");

  // Aguarda até que a hora seja atualizada (máximo 5 segundos para não travar)
  unsigned long startAttempt = millis();
  time_t now = time(nullptr);
  while (now < 24 * 3600 && millis() - startAttempt < 5000) {
    delay(500);
    Serial.print(".");
    now = time(nullptr);
  }

  struct tm timeinfo;
  if (getLocalTime(&timeinfo)) {
    Serial.print("\n✓ Hora sincronizada com sucesso: ");
    Serial.println(asctime(&timeinfo));
  } else {
    Serial.println("\n✗ Falha ao obter o horário local.");
  }
}

void imprimirHoraAtual() {
  time_t now = time(nullptr);
  struct tm* timeinfo = localtime(&now);
  Serial.printf("Hora atual: %02d:%02d:%02d\n",
                timeinfo->tm_hour, timeinfo->tm_min, timeinfo->tm_sec);
}

void manterSincronizacaoHora() {
  if (millis() - ultima_sincronizacao_ntp > INTERVALO_SINCRONIZACAO) {
    if (WiFi.status() == WL_CONNECTED) {
      Serial.println("\n[NTP] Ressincronizando hora...");
      sincronizarHora();
    }
  }
}

// ============================================================================
// AGENDAMENTOS
// ============================================================================
void verificarAgendamentos() {
  if (!hora_sincronizada) return;
  time_t now = time(nullptr);
  struct tm* timeinfo = localtime(&now);
  int hora_atual   = timeinfo->tm_hour;
  int minuto_atual = timeinfo->tm_min;
  for (int i = 0; i < total_agendamentos; i++) {
    DoseAgendada* agenda = &agendamentos[i];
    if (agenda->hora == hora_atual &&
        agenda->minuto == minuto_atual &&
        !agenda->executado_hoje) {
      Serial.printf("\n🕐 [AGENDAMENTO] %02d:%02d | %s (Disco %d, Dose %d)\n",
                    hora_atual, minuto_atual,
                    agenda->nome.c_str(), agenda->disco, agenda->dose_index);
      executarDoseAgendada(agenda);
      agenda->executado_hoje = true;
    }
    if (hora_atual == 0 && minuto_atual == 0 && agenda->executado_hoje) {
      agenda->executado_hoje = false;
      Serial.println("✓ Agendamentos resetados para o novo dia");
    }
  }
}

void executarDoseAgendada(DoseAgendada* agenda) {
  if (agenda->disco < 1 || agenda->disco > TOTAL_SERVOS) {
    Serial.printf("✗ Erro: Disco %d inválido!\n", agenda->disco); return;
  }
  int numeroServo = agenda->disco - 1;
  Serial.printf("\n📋 Adicionando à fila: %s | Servo %d | Dose %d\n\n",
                agenda->nome.c_str(), numeroServo + 1, agenda->dose_index);
  adicionarDoseAFila(numeroServo, agenda->dose_index, agenda->nome);
  publicarDoseAgendadaExecutada(agenda);
}

void publicarDoseAgendadaExecutada(DoseAgendada* agenda) {
  StaticJsonDocument<256> doc;
  doc["evento"]                 = "dose_agendada_executada";
  doc["disco"]                  = agenda->disco;
  doc["dose_index"]             = agenda->dose_index;
  doc["nome"]                   = agenda->nome;
  doc["horario_planejado"]      = String(agenda->hora) + ":" +
                                  (agenda->minuto < 10 ? "0" : "") +
                                  String(agenda->minuto);
  doc["timestamp"]              = obterTimestamp();
  doc["confirmado_pela_gaveta"] = false;
  char buffer[256];
  serializeJson(doc, buffer);
  client.publish(TOPIC_STATUS.c_str(), buffer);
  Serial.printf("✓ Dose agendada publicada em: %s\n", TOPIC_STATUS.c_str());
}

void imprimirAgendamentosAtivos() {
  static unsigned long proximo_print = 0;
  if (millis() < proximo_print) return;
  proximo_print = millis() + 60000;
  if (total_agendamentos == 0) return;
  Serial.println("\n========== AGENDAMENTOS ATIVOS ==========");
  for (int i = 0; i < total_agendamentos; i++) {
    DoseAgendada* agenda = &agendamentos[i];
    Serial.printf("%d. %02d:%02d - Disco %d (Dose %d) - %s %s\n",
                  i + 1, agenda->hora, agenda->minuto,
                  agenda->disco, agenda->dose_index, agenda->nome.c_str(),
                  agenda->executado_hoje ? "[✓ Executado hoje]" : "");
  }
  Serial.println("========================================\n");
}

void imprimirStatusSistema() {
  static unsigned long proximo_print = 0;
  if (millis() < proximo_print) return;
  proximo_print = millis() + 30000;
  Serial.println("\n========== STATUS DO SISTEMA ==========");
  Serial.printf("WiFi Conectado:       %s\n", WiFi.status() == WL_CONNECTED ? "Sim" : "Não");
  Serial.printf("MQTT Conectado:       %s\n", client.connected() ? "Sim" : "Não");
  Serial.printf("AP Mode Ativo:        %s\n", ap_mode_ativo ? "Sim" : "Não");
  Serial.printf("IP:                   %s\n", WiFi.localIP().toString().c_str());
  Serial.printf("Tópico STATUS:        %s\n", TOPIC_STATUS.c_str());
  Serial.printf("Tópico EVENT:         %s\n", TOPIC_EVENT.c_str());
  Serial.printf("Dose Ativa:           Disco %d, Índice %d\n", dose_ativa.disco, dose_ativa.dose_index);
  Serial.printf("Medicação Disponível: %s\n", medicacao_disponivel ? "Sim" : "Não");
  for (int i = 0; i < TOTAL_SERVOS; i++) {
    Serial.printf("Servo %d:              Posição %d°\n", i + 1, servos[i].read());
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

  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LED_WIFI_PIN, OUTPUT);
  pinMode(LED_MEDICACAO_PIN, OUTPUT);
  pinMode(HC_SR04_TRIG, OUTPUT);
  pinMode(HC_SR04_ECHO, INPUT);
  pinMode(BOTAO_RESET_WIFI_PIN, INPUT_PULLUP);  // SEM attachInterrupt

  digitalWrite(LED_WIFI_PIN, LOW);
  digitalWrite(LED_MEDICACAO_PIN, LOW);
  digitalWrite(BUZZER_PIN, LOW);

  inicializarServos();
 carregarCredenciaisWiFi();

  // 💡 Tópicos customizados para evitar que outras pessoas interfiram no seu projeto
  TOPIC_STATUS = String("nexdose/dispenser/") + String(deviceID) + String("/status");
  TOPIC_EVENT  = String("nexdose/dispenser/") + String(deviceID) + String("/event");

  Serial.println("✓ Tópicos MQTT configurados para Broker Público:");
  Serial.println("  → Publica: " + TOPIC_STATUS);
  Serial.println("  → Escuta:  " + TOPIC_EVENT);

  conectarWiFi();

  // Fluxo corrigido e direto para porta 1883
  if (WiFi.status() == WL_CONNECTED) {
    sincronizarHora(); // Mantido para o relógio interno funcionar
    conectarMQTT();
  }

  tocarBuzzer(100, 3);
  Serial.println("\n========== SETUP COMPLETADO ==========\n");
}

// ============================================================================
// LOOP PRINCIPAL
// ============================================================================
void loop() {
  // ⭐ Botão de reset WiFi - polling direto, primeira prioridade
  verificarBotaoResetWiFi();

  if (ap_mode_ativo) {
    procesarAPMode();
  }

  if (WiFi.status() == WL_CONNECTED) {
    manutencaoMQTT();
    atualizarLEDWiFi();
    manterSincronizacaoHora();
    verificarAgendamentos();
  }

  processarFilaDoses();
  verificarMedicacaoNaGaveta();
  imprimirStatusSistema();
  imprimirAgendamentosAtivos();

  delay(100);
}