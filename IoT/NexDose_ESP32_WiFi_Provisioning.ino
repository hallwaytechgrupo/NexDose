#include <WiFi.h>
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
String ssid = "SSID_WIFI";                         // Será carregado da EEPROM
String password = "SENHA_WIFI";                    // Será carregado da EEPROM
const char* mqtt_server = "mqtt.example.com";      // Configure com seu servidor MQTT
const int mqtt_port = 1883;                        // Porta MQTT (1883 padrão)
const char* deviceID = "NexDose_001";              // ID único do dispositivo

// ============================================================================
// CONFIGURAÇÕES DE WiFi PROVISIONING (Captive Portal)
// ============================================================================
const char* ap_ssid = "NexDose_Setup";             // Rede WiFi própria
const char* ap_password = "12345678";              // Senha da rede própria
const int AP_TIMEOUT = 300000;                     // 5 minutos tentando conectar
const int DNS_PORT = 53;
const int WEBSERVER_PORT = 80;

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
const int ADDR_SSID_LENGTH = 12;                   // Comprimento do SSID
const int ADDR_SSID_DATA = 13;                     // Começar dados SSID (máx 32 bytes)
const int ADDR_PASSWORD_LENGTH = 45;               // Comprimento da senha
const int ADDR_PASSWORD_DATA = 46;                 // Começar dados senha (máx 64 bytes)

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
Configuracao config = {6, 30};
EstadoDose dose_ativa = {-1, -1, "", 0, false};
unsigned long tempo_ultimo_alerta = 0;
bool wifi_conectado = false;
bool medicacao_disponivel = false;
int ultimo_index_servo[TOTAL_SERVOS] = {0, 0, 0};

// AGENDAMENTO E SINCRONIZAÇÃO DE HORA
const int MAX_AGENDAMENTOS = 20;
DoseAgendada agendamentos[MAX_AGENDAMENTOS];
int total_agendamentos = 0;
unsigned long ultima_sincronizacao_ntp = 0;
const unsigned long INTERVALO_SINCRONIZACAO = 3600000;
bool hora_sincronizada = false;
int ultima_hora_verificada = -1;

// WIFI PROVISIONING
WebServer webServer(WEBSERVER_PORT);
DNSServer dnsServer;
bool ap_mode_ativo = false;
unsigned long tempo_ap_iniciado = 0;
bool deve_reconectar_wifi = false;

// ============================================================================
// FUNÇÕES DE EEPROM - SALVAR/CARREGAR CREDENCIAIS WiFi
// ============================================================================
void salvarCredenciaisWiFi(const String& novo_ssid, const String& nova_senha) {
  EEPROM.begin(EEPROM_SIZE);
  
  // Salvar comprimento do SSID
  EEPROM.write(ADDR_SSID_LENGTH, novo_ssid.length());
  
  // Salvar SSID
  for (int i = 0; i < novo_ssid.length(); i++) {
    EEPROM.write(ADDR_SSID_DATA + i, novo_ssid[i]);
  }
  
  // Salvar comprimento da senha
  EEPROM.write(ADDR_PASSWORD_LENGTH, nova_senha.length());
  
  // Salvar senha
  for (int i = 0; i < nova_senha.length(); i++) {
    EEPROM.write(ADDR_PASSWORD_DATA + i, nova_senha[i]);
  }
  
  EEPROM.commit();
  
  Serial.printf("✓ Credenciais salvas: SSID=%s, Senha=%s\n", novo_ssid.c_str(), nova_senha.c_str());
}

void carregarCredenciaisWiFi() {
  EEPROM.begin(EEPROM_SIZE);
  
  // Carregar comprimento do SSID
  int ssid_length = EEPROM.read(ADDR_SSID_LENGTH);
  if (ssid_length > 0 && ssid_length <= 32) {
    ssid = "";
    for (int i = 0; i < ssid_length; i++) {
      ssid += (char)EEPROM.read(ADDR_SSID_DATA + i);
    }
  } else {
    ssid = "SSID_WIFI";
  }
  
  // Carregar comprimento da senha
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
// SERVIDOR WEB - PÁGINA DE CONFIGURAÇÃO (Captive Portal)
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
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 10px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            padding: 30px;
            max-width: 400px;
            width: 100%;
        }
        h1 {
            color: #333;
            text-align: center;
            margin-bottom: 30px;
            font-size: 28px;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 8px;
            color: #555;
            font-weight: bold;
        }
        input[type="text"],
        input[type="password"] {
            width: 100%;
            padding: 12px;
            border: 2px solid #ddd;
            border-radius: 5px;
            font-size: 16px;
            box-sizing: border-box;
            transition: border-color 0.3s;
        }
        input[type="text"]:focus,
        input[type="password"]:focus {
            outline: none;
            border-color: #667eea;
        }
        button {
            width: 100%;
            padding: 12px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 5px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: transform 0.2s;
        }
        button:active {
            transform: scale(0.98);
        }
        .info {
            background: #f0f0f0;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
            font-size: 14px;
            color: #666;
            text-align: center;
        }
        .status {
            text-align: center;
            margin-top: 20px;
            font-size: 14px;
            color: #666;
        }
        .spinner {
            display: none;
            border: 3px solid #f3f3f3;
            border-top: 3px solid #667eea;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            animation: spin 1s linear infinite;
            margin: 10px auto;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🏥 NexDose</h1>
        <div class="info">
            Dispositivo de Dispensação de Medicamentos
        </div>
        
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
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ssid: ssid,
                    password: password
                })
            })
            .then(response => response.json())
            .then(data => {
                status.textContent = data.message;
                if (data.success) {
                    status.style.color = 'green';
                    status.textContent += '\n\nDispostivo reiniciando...';
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
          
          // Salvar credenciais
          salvarCredenciaisWiFi(novo_ssid, nova_senha);
          
          // Atualizar variáveis globais
          ssid = novo_ssid;
          password = nova_senha;
          
          // Enviar resposta de sucesso
          StaticJsonDocument<128> resposta;
          resposta["success"] = true;
          resposta["message"] = "WiFi salvo com sucesso! Reiniciando...";
          
          String response;
          serializeJson(resposta, response);
          webServer.send(200, "application/json", response);
          
          // Sinalizar para reconectar
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
  // Redirecionar para página de configuração (Captive Portal)
  webServer.sendHeader("Location", "http://192.168.4.1/", true);
  webServer.send(302, "text/plain", "");
}

// ============================================================================
// WIFI PROVISIONING - MODO AP (Access Point)
// ============================================================================
void inicializarAPMode() {
  Serial.println("\n========== INICIANDO AP MODE (Captive Portal) ==========\n");
  
  // Parar WiFi em modo station
  WiFi.disconnect(true); // true = desligar WiFi
  WiFi.mode(WIFI_AP);
  
  // Configurar AP
  WiFi.softAP(ap_ssid, ap_password);
  IPAddress apIP(192, 168, 4, 1);
  WiFi.softAPConfig(apIP, apIP, IPAddress(255, 255, 255, 0));
  
  Serial.printf("✓ AP iniciado: %s\n", ap_ssid);
  Serial.printf("✓ IP: %s\n", WiFi.softAPIP().toString().c_str());
  Serial.printf("✓ Senha: %s\n", ap_password);
  
  // Iniciar DNS server
  dnsServer.start(DNS_PORT, "*", apIP);
  
  // Iniciar Web Server
  webServer.on("/", handleRoot);
  webServer.on("/save-wifi", handleSaveWiFi);
  webServer.onNotFound(handleNotFound);
  webServer.begin();
  
  Serial.println("✓ WebServer iniciado na porta 80");
  Serial.println("✓ DNS Server iniciado na porta 53");
  Serial.println("\n📱 Conecte seu celular à rede: NexDose_Setup");
  Serial.println("🔑 Senha: 12345678");
  Serial.println("🌐 Abra o navegador e acesse: http://192.168.4.1\n");
  
  // Sinalizar LED WiFi piscando (modo AP)
  ap_mode_ativo = true;
  tempo_ap_iniciado = millis();
  
  // Tocar buzzer 2x para indicar AP iniciado
  tocarBuzzer(100, 2);
}

void procesarAPMode() {
  if (!ap_mode_ativo) {
    return;
  }
  
  // Processar DNS
  dnsServer.processNextRequest();
  
  // Processar requisições Web
  webServer.handleClient();
  
  // LED WiFi pisca em modo AP
  static unsigned long proximo_piscar = 0;
  if (millis() >= proximo_piscar) {
    digitalWrite(LED_WIFI_PIN, !digitalRead(LED_WIFI_PIN));
    proximo_piscar = millis() + 500; // Pisca a cada 500ms
  }
  
  // Verificar timeout (5 minutos)
  if (millis() - tempo_ap_iniciado > AP_TIMEOUT) {
    Serial.println("\n⏱️  Timeout AP Mode: Nenhuma configuração recebida em 5 minutos");
    Serial.println("   Retornando ao modo normal...\n");
    
    // Parar AP
    dnsServer.stop();
    webServer.stop();
    ap_mode_ativo = false;
    digitalWrite(LED_WIFI_PIN, LOW);
    
    // Tentar conectar com credenciais salvas
    conectarWiFi();
  }
}

// ============================================================================
// VERIFICAÇÃO DE CONEXÃO WiFi
// ============================================================================
bool verificarConexaoWiFi() {
  int tentativas = 0;
  const int MAX_TENTATIVAS = 20; // 20 * 500ms = 10 segundos
  
  while (WiFi.status() != WL_CONNECTED && tentativas < MAX_TENTATIVAS) {
    delay(500);
    Serial.print(".");
    tentativas++;
  }
  
  return WiFi.status() == WL_CONNECTED;
}

// ============================================================================
// CONEXÃO WiFi COM PROVISIONING
// ============================================================================
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
    
    // Tocar buzzer 3x para indicar conexão
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

  config.total_divisorias = doc["config"]["total_divisorias"] | 6;
  config.angulo_por_dose = doc["config"]["angulo_por_dose"] | 30;

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
    
    if (separador == -1) {
      Serial.println("Erro: Formato de hora inválido (use HH:MM)");
      continue;
    }

    int hora = horario.substring(0, separador).toInt();
    int minuto = horario.substring(separador + 1).toInt();

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
}

// ============================================================================
// FUNÇÕES DE SERVO MOTOR
// ============================================================================
void inicializarServos() {
  Serial.println("Inicializando servo motores...");
  
  EEPROM.begin(EEPROM_SIZE);
  ultimo_index_servo[0] = EEPROM.readInt(ADDR_SERVO1_INDEX);
  ultimo_index_servo[1] = EEPROM.readInt(ADDR_SERVO2_INDEX);
  ultimo_index_servo[2] = EEPROM.readInt(ADDR_SERVO3_INDEX);
  
  for (int i = 0; i < TOTAL_SERVOS; i++) {
    if (ultimo_index_servo[i] < 0 || ultimo_index_servo[i] > 180) {
      ultimo_index_servo[i] = 0;
    }
    Serial.printf("Servo %d - Último índice: %d\n", i + 1, ultimo_index_servo[i]);
  }

  servos[0].attach(SERVO1_PIN, 1000, 2000);
  servos[1].attach(SERVO2_PIN, 1000, 2000);
  servos[2].attach(SERVO3_PIN, 1000, 2000);

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

  int anguloAlvo = doseIndex * config.angulo_por_dose;
  
  if (anguloAlvo > 180) {
    anguloAlvo = 180;
  }

  tocarBuzzer(200, 1);
  servos[numeroServo].write(anguloAlvo);
  delay(1000);

  ultimo_index_servo[numeroServo] = anguloAlvo;
  EEPROM.writeInt(ADDR_SERVO1_INDEX + (numeroServo * 4), anguloAlvo);
  EEPROM.commit();

  dose_ativa.disco = numeroServo + 1;
  dose_ativa.dose_index = doseIndex;
  dose_ativa.timestamp_dispensada = millis();
  dose_ativa.confirmada_pela_gaveta = false;

  delay(200);
  tocarBuzzer(500, 3);

  medicacao_disponivel = true;
  digitalWrite(LED_MEDICACAO_PIN, HIGH);

  publicarDoseDispensada();

  Serial.println("Dose dispensada com sucesso!");
}

// ============================================================================
// FUNÇÕES DO SENSOR ULTRASSÔNICO HC-SR04
// ============================================================================
float medirDistanciaGaveta() {
  digitalWrite(HC_SR04_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(HC_SR04_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(HC_SR04_TRIG, LOW);

  unsigned long duracao = pulseIn(HC_SR04_ECHO, HIGH, HC_SR04_TIMEOUT);
  float distancia = (duracao * 0.0343) / 2;

  return distancia;
}

void verificarMedicacaoNaGaveta() {
  static unsigned long proximo_check = 0;
  
  if (millis() < proximo_check) {
    return;
  }
  proximo_check = millis() + 2000;

  if (dose_ativa.disco == -1) {
    return;
  }

  float distancia = medirDistanciaGaveta();
  
  Serial.printf("Distância gaveta: %.1f cm\n", distancia);

  if (distancia < LIMIAR_DETECCAO_MEDICACAO) {
    if (!dose_ativa.confirmada_pela_gaveta) {
      dose_ativa.confirmada_pela_gaveta = true;
      
      medicacao_disponivel = false;
      digitalWrite(LED_MEDICACAO_PIN, LOW);
      
      tocarBuzzer(100, 2);
      
      publicarConfirmacaoColeta();
      
      Serial.println("Medicação coletada na gaveta!");
    }
  }
  
  if (!dose_ativa.confirmada_pela_gaveta && 
      millis() - dose_ativa.timestamp_dispensada > TEMPO_ALERTA_COLETA) {
    
    if (millis() - tempo_ultimo_alerta > 60000) {
      publicarAlertaColeta();
      tempo_ultimo_alerta = millis();
      
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
  if (WiFi.status() != WL_CONNECTED) {
    return;
  }
  
  Serial.println("WiFi conectado!");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());

  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(mqttCallback);

  int tentativas = 0;
  while (!client.connected() && tentativas < 10) {
    Serial.print("Conectando MQTT...");
    
    String clientID = String("ESP32-") + String(deviceID);
    if (client.connect(clientID.c_str())) {
      Serial.println(" Conectado!");
      
      String configTopic = String("dispositivo/") + String(deviceID) + String("/config");
      client.subscribe(configTopic.c_str());
      Serial.println("Inscrito em: " + configTopic);
      
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
  Serial.printf("Publicado em %s\n", topico.c_str());
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
  Serial.printf("Confirmação publicada em %s\n", topico.c_str());
  
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
  Serial.printf("Alerta publicado\n");
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
  Serial.printf("Status publicado\n");
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
// FUNÇÕES AUXILIARES DE HORA
// ============================================================================
String obterTimestamp() {
  time_t now = time(nullptr);
  struct tm* timeinfo = gmtime(&now);
  
  char buffer[25];
  strftime(buffer, sizeof(buffer), "%Y-%m-%dT%H:%M:%SZ", timeinfo);
  
  return String(buffer);
}

void sincronizarHora() {
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
  if (millis() - ultima_sincronizacao_ntp > INTERVALO_SINCRONIZACAO) {
    if (WiFi.status() == WL_CONNECTED) {
      Serial.println("\n[SINCRONIZAÇÃO] Ressincronizando hora com NTP...");
      sincronizarHora();
    }
  }
}

// ============================================================================
// VERIFICAÇÃO DE AGENDAMENTOS
// ============================================================================
void verificarAgendamentos() {
  if (!hora_sincronizada) {
    return;
  }

  time_t now = time(nullptr);
  struct tm* timeinfo = localtime(&now);
  
  int hora_atual = timeinfo->tm_hour;
  int minuto_atual = timeinfo->tm_min;
  
  for (int i = 0; i < total_agendamentos; i++) {
    DoseAgendada* agenda = &agendamentos[i];
    
    if (agenda->hora == hora_atual && 
        agenda->minuto == minuto_atual &&
        !agenda->executado_hoje) {
      
      Serial.printf("\n🕐 [AGENDAMENTO] Horário atingido: %02d:%02d\n", hora_atual, minuto_atual);
      Serial.printf("   Medicamento: %s (Disco %d, Dose %d)\n",
                    agenda->nome.c_str(),
                    agenda->disco,
                    agenda->dose_index);
      
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
    Serial.printf("✗ Erro: Disco %d inválido!\n", agenda->disco);
    return;
  }
  
  int numeroServo = agenda->disco - 1;
  
  Serial.printf("→ Disparando dose agendada...\n");
  dispararDose(numeroServo, agenda->dose_index);
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
  Serial.printf("✓ Dose agendada publicada\n");
}

void imprimirAgendamentosAtivos() {
  static unsigned long proximo_print = 0;
  
  if (millis() < proximo_print) {
    return;
  }
  proximo_print = millis() + 60000;

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
  proximo_print = millis() + 30000;

  Serial.println("\n========== STATUS DO SISTEMA ==========");
  Serial.printf("WiFi Conectado: %s\n", WiFi.status() == WL_CONNECTED ? "Sim" : "Não");
  Serial.printf("MQTT Conectado: %s\n", client.connected() ? "Sim" : "Não");
  Serial.printf("AP Mode Ativo: %s\n", ap_mode_ativo ? "Sim" : "Não");
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

  digitalWrite(LED_WIFI_PIN, LOW);
  digitalWrite(LED_MEDICACAO_PIN, LOW);
  digitalWrite(BUZZER_PIN, LOW);

  // Inicializar servo motores
  inicializarServos();

  // Carregar credenciais WiFi da EEPROM
  carregarCredenciaisWiFi();

  // Conectar WiFi (ou iniciar AP se falhar)
  conectarWiFi();

  // Se conectado, sincronizar hora e MQTT
  if (WiFi.status() == WL_CONNECTED) {
    conectarMQTT();
    sincronizarHora();
  }

  tocarBuzzer(100, 3);

  Serial.println("========== SETUP COMPLETADO ==========\n");
}

// ============================================================================
// LOOP PRINCIPAL
// ============================================================================
void loop() {
  // Processar AP Mode (se ativo)
  if (ap_mode_ativo) {
    procesarAPMode();
  }

  // Manutenção MQTT
  if (WiFi.status() == WL_CONNECTED) {
    manutencaoMQTT();
    atualizarLEDWiFi();
    manterSincronizacaoHora();
    verificarAgendamentos();
  }

  // Verificar medicação na gaveta
  verificarMedicacaoNaGaveta();

  // Status do sistema
  imprimirStatusSistema();
  imprimirAgendamentosAtivos();

  delay(100);
}
