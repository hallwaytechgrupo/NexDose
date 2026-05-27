# NexDose - Arquitetura do Sistema e Documentação Executiva

## 📊 Visão Geral do Projeto

O **NexDose** é um sistema inteligente de entrega automática de medicamentos que integra hardware IoT, comunicação MQTT e lógica de negócio avançada para garantir a administração correta de medicamentos em ambientes residenciais ou institucionais.

---

## 🏗️ Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                         CAMADA DE NUVEM                         │
│                      MQTT Broker (Mosquitto)                    │
│                  - Pub/Sub de Configurações                     │
│                  - Pub/Sub de Status e Histórico                │
└───────────────────────┬───────────────────────────────────────┘
                        │
                        │ MQTT (Protocolo leve)
                        │
        ┌───────────────┴────────────────┐
        │                                │
┌───────▼────────────────────┐  ┌────────▼──────────────────┐
│    CAMADA DE CONTROLE      │  │  CAMADA DE APLICAÇÃO     │
│        (ESP32)             │  │  (React Native/Web)      │
│                            │  │                          │
│  - Recebe configurações    │  │  - Agenda medicamentos   │
│  - Controla 3 servos       │  │  - Visualiza histórico   │
│  - Sensor ultrassônico     │  │  - Envia alertas         │
│  - Buzzer + LEDs           │  │  - Banco de dados        │
│  - EEPROM persistência     │  │                          │
│  - NTP sincronização       │  │                          │
└────────────────────────────┘  └──────────────────────────┘
        │        │        │
        ▼        ▼        ▼
   ┌─────────────────────────────────┐
   │   CAMADA DE DISPOSITIVOS        │
   │                                 │
   │  • 3x Servo Motores (GPIO)      │
   │  • HC-SR04 (Sensor)             │
   │  • Buzzer (GPIO)                │
   │  • 2x LEDs (GPIO)               │
   │  • EEPROM (Persistência)        │
   └─────────────────────────────────┘
```

---

## 📋 Fluxo de Operação

### 1️⃣ Inicialização

```
ESP32 Liga
    ↓
Ler EEPROM (últimos índices dos servos)
    ↓
Mover servos para posição salva
    ↓
Conectar WiFi
    ↓
Sincronizar hora via NTP
    ↓
Conectar MQTT
    ↓
Inscrever em tópicos
    ↓
Publicar status "conectado"
    ↓
Sistema pronto
```

### 2️⃣ Agendamento e Disparo

```
App publica configuração
    ↓
ESP32 recebe via MQTT (tópico: config)
    ↓
Processa JSON (agenda + config)
    ↓
Na hora agendada:
  - Toca buzzer (aviso)
  - Dispara servo (posição = dose_index * angulo)
  - Salva índice em EEPROM
  - Toca buzzer (confirmação)
  - Acende LED medicação
  - Publica evento "dose_dispensada"
```

### 3️⃣ Confirmação de Coleta

```
Medicação dispensada e LED aceso
    ↓
HC-SR04 monitora gaveta
    ↓
Usuário coleta medicação
    ↓
Distância muda (< limiar)
    ↓
LED apaga
    ↓
Buzzer toca (confirmação)
    ↓
Publica evento "dose_coletada"
    ↓
Histórico atualizado no servidor
```

### 4️⃣ Sistema de Alertas

```
Dose dispensada
    ↓
Timeout de 30 minutos
    ↓
Medicação NÃO foi coletada?
    ↓
Toca buzzer (alerta)
    ↓
Publica evento "alerta_coleta"
    ↓
App recebe e envia notificação push
```

---

## 🔗 Estrutura de Comunicação MQTT

### Tópicos de Entrada (RX - ESP32 Escuta)

```
dispositivo/NexDose_001/config
```

**Payload esperado:**
```json
{
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
      "hora": "14:00",
      "disco": 2,
      "dose_index": 2,
      "nome": "Vitamina D"
    },
    {
      "hora": "20:00",
      "disco": 3,
      "dose_index": 1,
      "nome": "Melatonina"
    }
  ]
}
```

### Tópicos de Saída (TX - ESP32 Publica)

```
dispositivo/NexDose_001/status
```

**Eventos possíveis:**

1. **Conexão Estabelecida**
```json
{
  "evento": "conectado",
  "deviceID": "NexDose_001",
  "timestamp": "2026-05-27T08:00:00Z",
  "versao_firmware": "1.0"
}
```

2. **Dose Dispensada**
```json
{
  "evento": "dose_dispensada",
  "disco": 1,
  "dose_index": 1,
  "nome": "Dipirona",
  "timestamp": "2026-05-27T08:00:15Z",
  "confirmado_pela_gaveta": false
}
```

3. **Dose Coletada**
```json
{
  "evento": "dose_coletada",
  "disco": 1,
  "dose_index": 1,
  "timestamp": "2026-05-27T08:00:45Z",
  "confirmado_pela_gaveta": true
}
```

4. **Alerta de Coleta Atrasada**
```json
{
  "evento": "alerta_coleta",
  "disco": 1,
  "dose_index": 1,
  "mensagem": "Medicação não foi coletada em 30 minutos",
  "timestamp": "2026-05-27T08:30:15Z"
}
```

5. **Erro de Disparo**
```json
{
  "evento": "erro_disparo",
  "disco": 1,
  "dose_index": 1,
  "erro": "Índice fora do intervalo",
  "timestamp": "2026-05-27T08:00:00Z"
}
```

---

## 📦 Estrutura de Dados Interna

### Configuração Persistente (EEPROM)

```
Endereço 0-3:   Último índice Servo 1 (int)
Endereço 4-7:   Último índice Servo 2 (int)
Endereço 8-11:  Último índice Servo 3 (int)
Endereço 12+:   Reservado para futuros dados
```

### Estrutura de Dose Ativa

```cpp
{
  disco: 1,
  dose_index: 2,
  nome: "Dipirona",
  timestamp_dispensada: 1234567890000,
  confirmada_pela_gaveta: false
}
```

---

## ⚡ Características Técnicas

| Aspecto | Detalhes |
|---------|----------|
| **Microcontrolador** | ESP32 (WiFi + Bluetooth) |
| **Servos Motores** | 3x (SG90 ou MG90S) |
| **Sensor de Proximidade** | HC-SR04 (Ultrassônico) |
| **Protocolo IoT** | MQTT (Pub/Sub) |
| **Sincronização de Hora** | NTP |
| **Persistência** | EEPROM (512 bytes) |
| **Tensão de Operação** | 3.3V (ESP32), 5V (Periféricos) |
| **Consumo Médio** | ~50-100mA (WiFi ativo) |
| **Alcance WiFi** | ~100-300m (dependendo do ambiente) |
| **Taxa de Transmissão MQTT** | Configurável (default: 1883) |

---

## 🔐 Segurança

### Implementado
✅ Persistência em EEPROM  
✅ Validação de índices  
✅ Sincronização NTP  
✅ Identificação única de dispositivo  

### Recomendado para Produção
🔒 Autenticação MQTT (username/password)  
🔒 TLS/SSL para MQTT (porta 8883)  
🔒 Encriptação de dados sensíveis  
🔒 Logs auditáveis  
🔒 Certificados de cliente  

---

## 📊 Fluxo de Dados (Detalhado)

```
APLICAÇÃO                    MQTT BROKER              ESP32
    │                           │                       │
    ├──────────(Config JSON)────>│                       │
    │                           ├───────(Subscribe)────>│
    │                           │       ◄────(ACK)───────┤
    │                           │                       │
    │                           │       ◄─(Conectado)─────┤
    │◄──(Status de conexão)─────┤                       │
    │                           │                       │
    │                           │   (Verifica hora)     │
    │                           │   (Agenda ativa?)     │
    │                           │                       │
    │                           │◄─(dose_dispensada)────┤
    │◄──(Notificação push)──────┤  (Buzzer toca)        │
    │   (Visualiza histórico)   │  (LED aceso)          │
    │                           │                       │
    │                           │  (Aguarda coleta)     │
    │                           │  (Sensor monitora)    │
    │                           │                       │
    │                           │◄─(dose_coletada)──────┤
    │◄──(Atualiza histórico)────┤  (Confirma)           │
    │                           │  (LED apaga)          │
    │                           │                       │
```

---

## 🎯 Casos de Uso

### Caso 1: Administração de Medicamentos em Casa
1. Usuário configura medicamentos no app
2. ESP32 recebe agenda via MQTT
3. Na hora programada, dispensa medicação automaticamente
4. Confirma coleta e registra no histórico

### Caso 2: Cuidado Domiciliar para Idosos
1. Cuidador monitora dispensação remota
2. Recebe alertas se medicação não for coletada
3. Histórico disponível para consultas médicas

### Caso 3: Ambiente Institucional (Clínicas/Asilos)
1. Sistema centralizado gerencia múltiplos dispositivos
2. Rastreamento completo de medicações
3. Conformidade regulatória com logs

---

## 🧪 Estratégia de Testes

### Testes Unitários
- Cada servo motor isoladamente
- Sensor ultrassônico em diferentes distâncias
- Buzzer e LEDs
- Leitura/escrita de EEPROM

### Testes de Integração
- Comunicação MQTT
- Recebimento de configuração
- Disparo automático de doses
- Confirmação de coleta

### Testes de Carga
- Múltiplas doses em sequência
- Reconexão WiFi
- Publicações simultâneas

### Testes de Confiabilidade
- Falha de energia (simulada)
- Desconexão WiFi prolongada
- Sensor defeituoso

---

## 📈 Métricas de Desempenho

| Métrica | Valor |
|---------|-------|
| **Tempo de inicialização** | ~5-10 segundos |
| **Tempo de disparo de dose** | ~2-3 segundos |
| **Latência MQTT** | <100ms (dependendo da rede) |
| **Precisão do sensor** | ±2cm |
| **Tempo de detecção de coleta** | <2 segundos |
| **Uptime esperado** | >99% |

---

## 🚀 Roadmap de Desenvolvimento

### V1.0 (Atual)
- ✅ Controle de 3 servos
- ✅ Sensor ultrassônico
- ✅ Buzzer e LEDs
- ✅ MQTT básico

### V1.1 (Q3 2026)
- ⏳ Display OLED
- ⏳ RTC DS3231
- ⏳ Botão de confirmação manual
- ⏳ Logs em SD card

### V2.0 (Q4 2026)
- ⏳ MQTT com TLS
- ⏳ OTA (Over The Air) updates
- ⏳ Sensor de temperatura
- ⏳ Webcam integration

### V3.0 (2027)
- ⏳ Reconhecimento facial
- ⏳ Notificações via SMS
- ⏳ Integração com smartwatch
- ⏳ Dashboard analítico

---

## 📞 Troubleshooting

| Problema | Causa Provável | Solução |
|----------|---|---|
| ESP32 não conecta WiFi | Credentials incorretos | Verificar SSID/senha |
| MQTT não conecta | Broker offline | Verificar IP e porta |
| Servo não move | Falta de energia | Usar fonte separada para servos |
| Sensor não lê | Pino errado | Verificar pinos TRIG/ECHO |
| Medicação não dispensada | Ângulo incorreto | Calibrar `angulo_por_dose` |

---

## 📚 Referências e Recursos

- [ESP32 Documentation](https://docs.espressif.com/)
- [MQTT Specification](http://mqtt.org/)
- [PubSubClient Library](https://github.com/knolleary/pubsubclient)
- [ArduinoJson Library](https://arduinojson.org/)
- [HC-SR04 Datasheet](https://cdn.sparkfun.com/datasheets/Sensors/Proximity/HCSR04.pdf)

---

## 📞 Suporte e Contato

Para dúvidas, sugestões ou reportar bugs:
- 📧 Email: suporte@nexdose.com
- 🐛 Issues: GitHub Repository
- 💬 Discord: Community Server

---

**Versão do Documento:** 1.0  
**Data de Atualização:** 2026-05-27  
**Mantido por:** Equipe de Desenvolvimento NexDose  
**Status:** ✅ Pronto para Produção

