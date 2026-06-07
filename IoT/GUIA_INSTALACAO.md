# NexDose ESP32 - Guia de Instalação e Configuração

## 📋 Requisitos

- **Hardware:**
  - ESP32 (DevKit ou similar)
  - 3x Servo motores (SG90 ou MG90S recomendados)
  - 1x Sensor ultrassônico HC-SR04
  - 1x Buzzer (5V)
  - 2x LEDs (3mm ou 5mm)
  - 2x Resistores 220Ω (para os LEDs)
  - Cabos de conexão e fonte de alimentação

- **Software:**
  - Arduino IDE (versão 2.0+)
  - ESP32 Board adicional instalado
  - Bibliotecas necessárias (veja abaixo)

## 🔧 Instalação no Arduino IDE

### 1. Instalar o Board ESP32

1. Abra Arduino IDE
2. Acesse **Arquivo → Preferências** (Windows/Linux) ou **Arduino → Preferências** (macOS)
3. No campo "URLs adicionais de Gerenciadores de Placas", adicione:
   ```
   https://dl.espressif.com/dl/package_esp32_index.json
   ```
4. Clique em **OK**
5. Vá para **Ferramentas → Placa → Gerenciador de Placas**
6. Procure por "esp32" e instale o pacote `ESP32 by Espressif Systems`

### 2. Instalar as Bibliotecas Necessárias

Abra **Sketch → Incluir biblioteca → Gerenciar bibliotecas** e instale:

1. **PubSubClient** (versão 2.8.0+)
   - Autor: Nick O'Leary
   - Para comunicação MQTT

2. **ArduinoJson** (versão 6.19.0+)
   - Autor: Benoit Blanchon
   - Para manipulação de JSON

3. **ESP32Servo** (versão 1.1.1+)
   - Autor: John K. Bennett
   - Para controle dos servo motores

### 3. Selecionar Placa e Porta

1. **Ferramentas → Placa** → Selecione `ESP32 Dev Module` (ou sua variante específica)
2. **Ferramentas → Porta** → Selecione a porta COM do ESP32
3. **Ferramentas → Upload Speed** → Selecione `921600` (velocidade recomendada)

## 🔌 Diagrama de Conexão

```
ESP32 PIN CONNECTIONS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SERVO MOTORES:
- Servo 1 → GPIO 32 (amarelo/laranja)
- Servo 2 → GPIO 33 (amarelo/laranja)
- Servo 3 → GPIO 25 (amarelo/laranja)
- GND → GND (preto)
- 5V → 5V (vermelho) - com capacitor 100µF em paralelo

SENSOR ULTRASSÔNICO HC-SR04:
- VCC → 5V
- GND → GND
- TRIG → GPIO 26
- ECHO → GPIO 27 (com resistor divisor 1kΩ/2kΩ)

BUZZER:
- Positivo → GPIO 14 (com resistor 220Ω)
- Negativo → GND

LED WIFI (Verde):
- Ânodo (+) → GPIO 12 (com resistor 220Ω)
- Cátodo (-) → GND

LED MEDICAÇÃO (Vermelho):
- Ânodo (+) → GPIO 13 (com resistor 220Ω)
- Cátodo (-) → GND

ALIMENTAÇÃO:
- GND do ESP32 → GND comum
- 5V do ESP32 → 5V (limitado a ~500mA)
- Para servos, usar fonte separada 5V (2A+)
- Sensor HC-SR04 precisa de divisor de tensão no ECHO
```

## ⚙️ Configuração do Código

Antes de fazer o upload, edite as seguintes constantes no início do arquivo `.ino`:

```cpp
// WiFi
const char* ssid = "SEU_SSID";           // Seu SSID WiFi
const char* password = "SUA_SENHA";      // Sua senha WiFi

// MQTT
const char* mqtt_server = "mqtt.seu.servidor.com";
const int mqtt_port = 1883;              // Porta MQTT
const char* deviceID = "NexDose_001";    // ID único do dispositivo
```

### Configurações Opcionais

```cpp
// Hardware
const int TOTAL_SERVOS = 3;              // Número de servo motores
const int HC_SR04_TIMEOUT = 30000;       // Timeout sensor (µs)
const float LIMIAR_DETECCAO_MEDICACAO = 25.0;  // Distância em cm
const int TEMPO_ALERTA_COLETA = 30 * 60 * 1000; // 30 minutos
```

## 📤 Upload para ESP32

1. Abra o arquivo `NexDose_ESP32.ino` no Arduino IDE
2. Verifique se a placa e porta estão corretos em **Ferramentas**
3. Clique em **Sketch → Upload** (ou Ctrl+U)
4. Aguarde até que apareça a mensagem "Concluído."
5. Abra o **Serial Monitor** (Ctrl+Shift+M) com baud rate `115200`

## 🔍 Testando o Sistema

### 1. Verificar Conexão Serial

Abra o Serial Monitor com baud rate `115200` e observe os logs:
```
========== NexDose ESP32 INICIANDO ==========
Inicializando servo motores...
Servo 0 - Último índice: 0
...
Conectando WiFi: SEU_SSID
WiFi conectado!
IP: 192.168.X.X
Conectando MQTT... Conectado!
Sincronizando hora com NTP...
Hora sincronizada!
========== SETUP COMPLETADO ==========
```

### 2. Testar Configuração MQTT

Publique uma configuração usando `mosquitto_pub` ou sua ferramenta MQTT favorita:

```bash
mosquitto_pub -h mqtt.seu.servidor.com -t "dispositivo/NexDose_001/config" -m '{
  "config": {
    "total_divisorias": 6,
    "angulo_por_dose": 30
  },
  "agenda": [
    {
      "hora": "08:00",
      "disco": 1,
      "dose_index": 1,
      "nome": "Dipirona"
    },
    {
      "hora": "09:00",
      "disco": 2,
      "dose_index": 2,
      "nome": "Vitamina"
    }
  ]
}'
```

Você deverá ver no Serial Monitor:
```
Agenda recebida: 08:00 - Disco 1 - Dose 1 - Dipirona
Agenda recebida: 09:00 - Disco 2 - Dose 2 - Vitamina
Configuração processada com sucesso!
```

### 3. Testar Dispensação Manual

Adicione esta função no final do código para testar via Serial Monitor:

```cpp
void verificarComandosSerial() {
  if (Serial.available()) {
    String comando = Serial.readStringUntil('\n');
    comando.trim();
    
    if (comando.startsWith("DISPARAR")) {
      // Formato: DISPARAR 1 2 (Disco 1, Índice 2)
      int disco = comando.substring(9, 10).toInt() - 1;
      int indice = comando.substring(11).toInt();
      
      if (disco >= 0 && disco < 3) {
        dispararDose(disco, indice);
      }
    }
  }
}
```

E chame `verificarComandosSerial();` no `loop()`.

## 📊 Tópicos MQTT

### Recebimento
- **`dispositivo/NexDose_001/config`** - Configuração e agenda

Payload esperado:
```json
{
  "config": {
    "total_divisorias": 6,
    "angulo_por_dose": 30
  },
  "agenda": [
    {
      "hora": "HH:MM",
      "disco": 1,
      "dose_index": 1,
      "nome": "Nome Medicamento"
    }
  ]
}
```

### Publicação
- **`dispositivo/NexDose_001/status`** - Status e eventos

Eventos possíveis:
```json
{
  "evento": "dose_dispensada",
  "disco": 1,
  "dose_index": 2,
  "nome": "Dipirona",
  "timestamp": "2026-05-27T14:30:45Z",
  "confirmado_pela_gaveta": false
}
```

```json
{
  "evento": "dose_coletada",
  "disco": 1,
  "dose_index": 2,
  "timestamp": "2026-05-27T14:31:00Z",
  "confirmado_pela_gaveta": true
}
```

```json
{
  "evento": "alerta_coleta",
  "disco": 1,
  "dose_index": 2,
  "mensagem": "Medicação não foi coletada em 30 minutos",
  "timestamp": "2026-05-27T15:00:45Z"
}
```

## 🐛 Solução de Problemas

### WiFi não conecta
- Verifique SSID e senha
- Verifique se o ESP32 está próximo do roteador
- Verifique os logs no Serial Monitor

### MQTT não conecta
- Verifique IP e porta do servidor MQTT
- Verifique se o broker MQTT está rodando
- Verifique firewall e permissões de porta

### Servo não move
- Verifique conexão dos cabos
- Verifique alimentação (5V)
- Teste com código simples de servo
- Verifique se o capacitor está colocado entre 5V e GND

### Sensor HC-SR04 não lê
- Verifique se o divisor de tensão está correto no ECHO
- Teste o sensor com código de exemplo
- Verifique conexões TRIG e ECHO

### Buzzer não toca
- Verifique polaridade
- Teste com PWM em vez de digital
- Verifique se GPIO está correta

## 📝 Notas Importantes

1. **Persistência em EEPROM**: O último índice de cada servo é salvo automaticamente
2. **Sincronização de Hora**: Ocorre via NTP no startup
3. **Timeout de Coleta**: 30 minutos sem coletar gera alerta MQTT
4. **Economia de Energia**: Servos são detachados após movimento
5. **Segurança**: Altere o `deviceID` para um valor único

## 🔐 Recomendações de Segurança

1. Use MQTT com autenticação (username/password)
2. Considere usar TLS/SSL para MQTT (porta 8883)
3. Altere `deviceID` para algo único e seguro
4. Configure ACLs no broker MQTT
5. Mantenha o firmware atualizado

## 📚 Recursos Adicionais

- [Documentação ESP32](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/)
- [PubSubClient Documentation](https://github.com/knolleary/pubsubclient)
- [ArduinoJson Documentation](https://arduinojson.org/)
- [HC-SR04 Datasheet](https://cdn.sparkfun.com/datasheets/Sensors/Proximity/HCSR04.pdf)

