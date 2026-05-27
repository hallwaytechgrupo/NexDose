# NexDose - Melhorias e Extensões Futuras

## 🚀 Funcionalidades Planejadas

### Fase 1 (Atual)
- ✅ Controle de 3 servo motores
- ✅ Sensor ultrassônico para detecção de medicação
- ✅ Comunicação MQTT
- ✅ Persistência em EEPROM
- ✅ Alarme de timeout (30 minutos)
- ✅ LEDs indicadores
- ✅ Buzzer sonoro

### Fase 2 (Próximo)
- ⏳ RTC (Real Time Clock) para agendamento automático
- ⏳ Display LCD/OLED para exibir informações
- ⏳ Botão de confirmação manual
- ⏳ Sensor de temperatura (opcional)
- ⏳ Detecção de queda (IR ou FSR)
- ⏳ Backup de bateria com UPS

### Fase 3 (Futuro)
- ⏳ Sincronização com servidor central em tempo real

---

## 📝 Exemplos de Teste

### Teste 1: Verificar Inicialização

**Esperado no Serial Monitor:**
```
========== NexDose ESP32 INICIANDO ==========

Inicializando servo motores...
Servo 0 - Último índice: 0
Servo 1 - Último índice: 0
Servo 2 - Último índice: 0
Servo motores inicializados!

Conectando WiFi: SSID_AQUI
WiFi conectado!
IP: 192.168.1.100

Conectando MQTT...
MQTT Conectado!
Inscrito em: dispositivo/NexDose_001/config

Sincronizando hora com NTP...
Hora sincronizada!

========== SETUP COMPLETADO ==========
```

### Teste 2: Enviar Configuração

**Comando:**
```bash
mosquitto_pub -h localhost -t "dispositivo/NexDose_001/config" -m '{
  "config": {"total_divisorias": 6, "angulo_por_dose": 30},
  "agenda": [
    {"hora": "08:00", "disco": 1, "dose_index": 1, "nome": "Dipirona"},
    {"hora": "09:00", "disco": 2, "dose_index": 2, "nome": "Vitamina"}
  ]
}'
```

**Esperado no Serial Monitor:**
```
Agenda recebida: 08:00 - Disco 1 - Dose 1 - Dipirona
Agenda recebida: 09:00 - Disco 2 - Dose 2 - Vitamina
Configuração processada com sucesso!
```

### Teste 3: Verificar Publicação MQTT

**Monitorar tópico:**
```bash
mosquitto_sub -h localhost -t "dispositivo/NexDose_001/status"
```

**Esperado:**
```json
{"evento":"conectado","deviceID":"NexDose_001","timestamp":"2026-05-27T14:30:00Z"}
```

---

## 🔧 Extensões Recomendadas

### 1. Adicionar RTC (Real Time Clock)

Se usar um RTC como DS3231:

```cpp
#include <RTClib.h>

RTC_DS3231 rtc;

void setup() {
  if (!rtc.begin()) {
    Serial.println("RTC não encontrado!");
  }
  
  // Sincronizar RTC com NTP (executar uma vez)
  // rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));
}

// Função melhorada para obter timestamp
String obterTimestampRTC() {
  DateTime now = rtc.now();
  
  char buffer[25];
  sprintf(buffer, "%04d-%02d-%02dT%02d:%02d:%02dZ",
          now.year(), now.month(), now.day(),
          now.hour(), now.minute(), now.second());
  
  return String(buffer);
}
```

### 2. Adicionar Display OLED

```cpp
#include <Adafruit_SSD1306.h>
#include <Adafruit_GFX.h>

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 32
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

void inicializarDisplay() {
  if(!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("Display não encontrado!");
    return;
  }
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.println("NexDose");
  display.display();
}

void atualizarDisplay() {
  static unsigned long proximo_update = 0;
  
  if (millis() < proximo_update) {
    return;
  }
  proximo_update = millis() + 2000;

  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  
  // Linha 1: Status WiFi
  display.setCursor(0, 0);
  display.print("WiFi: ");
  display.println(WiFi.status() == WL_CONNECTED ? "OK" : "X");
  
  // Linha 2: MQTT
  display.setCursor(0, 8);
  display.print("MQTT: ");
  display.println(client.connected() ? "OK" : "X");
  
  // Linha 3: Dose Ativa
  display.setCursor(0, 16);
  display.printf("Dose: D%d I%d", dose_ativa.disco, dose_ativa.dose_index);
  
  // Linha 4: Medicação disponível
  display.setCursor(0, 24);
  display.print("Med: ");
  display.println(medicacao_disponivel ? "Disponível" : "-");
  
  display.display();
}
```

### 3. Sensor de Queda (IR ou FSR)

```cpp
const int SENSOR_QUEDA_PIN = 35;  // GPIO35 (ADC)
const int LIMIAR_DETECCAO = 2000;  // Limiar ADC

bool verificarQuedaDose() {
  int valor = analogRead(SENSOR_QUEDA_PIN);
  
  if (valor > LIMIAR_DETECCAO) {
    Serial.printf("Queda detectada! Valor: %d\n", valor);
    return true;
  }
  return false;
}
```

### 4. Botão de Confirmação Manual

```cpp
const int BOTAO_CONFIRMACAO = 34;

void verificarBotao() {
  static unsigned long debounce_time = 0;
  
  if (digitalRead(BOTAO_CONFIRMACAO) == LOW) {
    if (millis() - debounce_time > 100) {
      debounce_time = millis();
      
      if (dose_ativa.disco != -1 && !dose_ativa.confirmada_pela_gaveta) {
        dose_ativa.confirmada_pela_gaveta = true;
        publicarConfirmacaoColeta();
        Serial.println("Coleta confirmada manualmente!");
      }
    }
  }
}
```

### 5. Agendamento Automático

```cpp
#include <time.h>

struct Agendamento {
  int hora;
  int minuto;
  int disco;
  int dose_index;
  String nome;
  bool executado_hoje;
};

Agendamento agendamentos[10];
int total_agendamentos = 0;

void verificarAgendamentos() {
  time_t now = time(nullptr);
  struct tm* timeinfo = localtime(&now);
  
  int hora_atual = timeinfo->tm_hour;
  int minuto_atual = timeinfo->tm_min;
  
  for (int i = 0; i < total_agendamentos; i++) {
    if (agendamentos[i].hora == hora_atual && 
        agendamentos[i].minuto == minuto_atual &&
        !agendamentos[i].executado_hoje) {
      
      dispararDose(agendamentos[i].disco - 1, agendamentos[i].dose_index);
      agendamentos[i].executado_hoje = true;
      
      Serial.printf("Dose agendada executada: %s\n", agendamentos[i].nome.c_str());
    }
    
    // Resetar flag ao virar o dia
    if (hora_atual == 0 && minuto_atual == 0) {
      agendamentos[i].executado_hoje = false;
    }
  }
}
```

### 6. Monitoramento de Temperatura

```cpp
#include <Adafruit_DHT.h>

#define DHT_PIN 21
#define DHT_TYPE DHT22
DHT dht(DHT_PIN, DHT_TYPE);

void inicializarDHT() {
  dht.begin();
}

void publicarTemperatura() {
  static unsigned long proximo_check = 0;
  
  if (millis() < proximo_check) {
    return;
  }
  proximo_check = millis() + 60000; // A cada 1 minuto

  float temperatura = dht.readTemperature();
  float umidade = dht.readHumidity();

  if (isnan(temperatura) || isnan(umidade)) {
    Serial.println("Erro ao ler DHT!");
    return;
  }

  StaticJsonDocument<128> doc;
  doc["evento"] = "monitoramento";
  doc["temperatura"] = temperatura;
  doc["umidade"] = umidade;
  doc["timestamp"] = obterTimestamp();

  String topico = String("dispositivo/") + String(deviceID) + String("/status");
  char buffer[128];
  serializeJson(doc, buffer);
  
  client.publish(topico.c_str(), buffer);
  Serial.printf("Temp: %.1f°C, Umidade: %.1f%%\n", temperatura, umidade);
}
```

### 7. Melhorar Logs e Debug

```cpp
#define DEBUG 1

#if DEBUG
  #define LOG(msg) Serial.println(msg)
  #define LOG_PRINTF(fmt, ...) Serial.printf(fmt, __VA_ARGS__)
#else
  #define LOG(msg)
  #define LOG_PRINTF(fmt, ...)
#endif

void salvarLogEmSD() {
  // Implementar se usar cartão SD
  // Salvar eventos críticos para análise posterior
}
```

### 8. Detecção de Desconexão com Reconexão Automática

```cpp
unsigned long tempo_ultima_conexao = 0;

void verificarConexaoWiFi() {
  if (WiFi.status() != WL_CONNECTED) {
    if (millis() - tempo_ultima_conexao > 30000) {
      Serial.println("WiFi desconectado. Tentando reconectar...");
      WiFi.reconnect();
      tempo_ultima_conexao = millis();
    }
  } else {
    tempo_ultima_conexao = millis();
  }
}
```

---

## 🔌 Diagrama de Blocos do Sistema

```
┌─────────────────────────────────────────────────┐
│            ESP32 (Controlador Central)           │
└─────────────────────────────────────────────────┘
         │        │        │        │        │
    ┌────┴┐    ┌──┴──┐  ┌──┴──┐  ┌─┴─┐  ┌──┴──┐
    │    ▼    │   ▼    │   ▼   │  ▼   │  ▼    │
   Servo1   Servo2   Servo3  Buzzer LED1  LED2
    │       │       │
    ├─────┬─┴─────┬─┴──────┐
    ▼     ▼       ▼        ▼
  Plat1 Plat2  Plat3    Rampa
    │     │      │         │
    └─────┴──────┴─────────┘
            │
            ▼
         Gaveta + Sensor HC-SR04
            │
            ▼
        Histórico

┌─────────────────────────────────────────────────┐
│           MQTT Broker (Servidor)                │
├─────────────────────────────────────────────────┤
│  dispositivo/NexDose_001/config (RX)            │
│  dispositivo/NexDose_001/status (TX)            │
└─────────────────────────────────────────────────┘
            │
            ▼
  ┌──────────────────────────┐
  │  App React Native / WEB  │
  │  + Banco de Dados        │
  └──────────────────────────┘
```

---

## 🎯 Checklist de Implementação

- [ ] Testar conexão WiFi
- [ ] Testar conexão MQTT
- [ ] Testar controle de servo motores
- [ ] Testar sensor ultrassônico
- [ ] Testar buzzer
- [ ] Testar LEDs
- [ ] Testar persistência em EEPROM
- [ ] Testar agendamento (simulado)
- [ ] Testar publicação MQTT
- [ ] Testar recebimento MQTT
- [ ] Testar timeout de 30 minutos
- [ ] Testar reconexão automática
- [ ] Validar consumo de energia
- [ ] Documentar fluxo de operação

---

## Debugger

Para ativar logs mais detalhados, descomente a linha:

```cpp
#define DEBUG 1
```

Então use:

```cpp
LOG("Mensagem simples");
LOG_PRINTF("Valor: %d\n", valor);
```

## Performance e Otimização

- Usar `delay()` minimamente
- Preferir `millis()` para timing
- Usar EEPROM apenas quando necessário
- Implementar pooling ao invés de polling constante
- Usar heap dinamicamente apenas se necessário

---

**Versão:** 1.0  
**Última atualização:** 2026-05-27  
**Mantido por:** Equipe NexDose

