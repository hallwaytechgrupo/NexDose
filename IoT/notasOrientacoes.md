# NexDose - Sistema de Entrega Automática de Medicamentos

## 📋 Status do Projeto

✅ **IMPLEMENTADO E DOCUMENTADO**

Toda a programação foi completada em arquivo `.ino` pronto para uso com Arduino IDE.

---

## 📁 Arquivos do Projeto

### Firmware
1. **NexDose_ESP32.ino** - Código completo (versão anterior, sem WiFi Provisioning)
2. **NexDose_ESP32_WiFi_Provisioning.ino** - ⭐ VERSÃO ATUAL COM WIFI PROVISIONING (Recomendado)

### Documentação Técnica
3. **GUIA_INSTALACAO.md** - Setup do Arduino IDE e configuração
4. **ARQUITETURA_E_DOCUMENTACAO.md** - Arquitetura e fluxos detalhados
5. **GUIA_WIFI_PROVISIONING.md** - ⭐ NOVO: Guia de uso do Captive Portal
6. **IMPLEMENTACAO_TECNICA_WIFI.md** - ⭐ NOVO: Detalhes técnicos da implementação
7. **MELHORIAS_E_EXTENSOES.md** - Funcionalidades futuras e exemplos
8. **CLASSE_AUXILIAR_E_TESTES.md** - Classe helper e testes unitários
9. **CHECKLIST_DESENVOLVIMENTO_DEPLOYMENT.md** - Checklists completos

### Recomendação
✅ Use **NexDose_ESP32_WiFi_Provisioning.ino** - Inclui toda a funcionalidade anterior + WiFi Provisioning com Captive Portal

---

## 📱 WiFi Provisioning (Novo - v2.0)

### O que é?
Sistema de **configuração automática de WiFi** sem necessidade de reprogramação. Na primeira inicialização, o ESP32 cria sua própria rede WiFi (Access Point) e permite que você configure as credenciais através de um navegador no celular.

### Como funciona?

1. **Primeiro Boot (sem WiFi):**
   - ESP32 tenta conectar por 10 segundos
   - Se falhar, ativa o "AP Mode" (rede própria)
   - Cria rede: `NexDose_Setup` (senha: `12345678`)
   - LED WiFi pisca indicando provisioning ativo

2. **Configuração via Celular:**
   - Conecte à rede `NexDose_Setup`
   - Abra navegador → `http://192.168.4.1`
   - Aparece formulário automático (Captive Portal)
   - Insira SSID e senha do seu WiFi
   - Clique em "Conectar"

3. **Reconexão Automática:**
   - Credenciais são salvas na EEPROM
   - Dispositivo reinicia
   - Conecta à nova rede WiFi
   - LED WiFi acende (conexão confirmada)
   - Buzzer toca 3x (confirmação)

4. **Boots Subsequentes:**
   - Carrega credenciais da EEPROM
   - Tenta conectar automaticamente
   - Pula AP Mode se conectar com sucesso

### Dados Armazenados (EEPROM)
```
Endereço  Conteúdo            Tamanho
─────────────────────────────────────
0-11      Posições Servos     12 bytes
12        Len(SSID)           1 byte
13-44     SSID                32 bytes
45        Len(Senha)          1 byte
46-109    Senha               64 bytes
```

### Recursos
- ✅ Sem fios de programação necessários
- ✅ Interface intuitiva no navegador
- ✅ Timeout automático (5 minutos)
- ✅ LED e Buzzer confirmam status
- ✅ Suporta SSID/Senha com caracteres especiais
- ✅ Reconexão automática em caso de falha

### Documentação Completa
- Leia **GUIA_WIFI_PROVISIONING.md** para o manual de usuário
- Leia **IMPLEMENTACAO_TECNICA_WIFI.md** para detalhes técnicos

---

## Estrutura de comunicação MQTT:

* `dispositivo/ID_UNICO/config` - app publica aqui os horários de medicamentos (Dispositivo assina o tópico)
* `dispositivo/ID_UNICO/status` - esp32 publica aqui quando o remédio foi coletado e se houve erro (app assina este tópico)

## estrutura payload

** para cada disco com uma medicação ou grupo de medicações conjuntas **
a aplicação deve encaminhar um JSON estruturado, informando ao esp32, qual servo acionar, qual angulo inciial e final do movimento, como no exemplo seguinte
```
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
      "hora": "20:00",
      "disco": 1,
      "dose_index": 2,
      "nome": "Dipirona"
    },
    {
      "hora": "09:00",
      "disco": 2,
      "dose_index": 1,
      "nome": "Vitamina"
    }
  ]
}
```

## logica de movimentação

angulo alvo = dose_index x angulo_por_dose

```
void dispararDose(int pinoServo, int doseIndex, int anguloBase) {
  Servo servoTemporario;
  servoTemporario.attach(pinoServo);
  
  int anguloFinal = doseIndex * anguloBase;
  
  // Movimento controlado para precisão
  servoTemporario.write(anguloFinal); 
  
  delay(1000); // Tempo para o comprimido cair
  servoTemporario.detach(); // Desliga o servo para economizar energia e evitar ruído
}
```

## estados do status

para sinalizar para a plicação, mantendo assim o gerenciamento via aplicação, o esp32 deve reportar quando uma dose foi disparada, gerando tambem o historico via aplicação para o banco de dados

assim:
no topico  MQTT `dispositivo/ID_UNICO/status`
deve ser encaminhada o json a ser lido e utilizado pela aplicação

```
{
  "evento": "dose_entregue",
  "disco": 1,
  "dose_index": 2,
  "confirmado_pela_gaveta": true,
  "timestamp": "2026-05-11T20:05:00Z"
}
```


## lógica de confirmação:

    O Servo move para dose_index * angulo.

    O Sensor IR de Queda confirma que o objeto caiu.

    Se o Sensor da Gaveta não for acionado em 30 minutos, o ESP32 envia um alerta via MQTT para o seu app React Native disparar uma notificação push no celular.

## obs de desenvolvimento
para evitar erros de queda de energia e afins, toda vez que o servo motor se mover, deve ser salvo o `ultimo_index_sucesso` de forma que o esp32 le esse valor ao ligar e saiba onde o disco parou, de forma a nao mover-se sem necessidade.

---

## 🎯 FUNCIONALIDADES IMPLEMENTADAS NO CÓDIGO (.ino)

### ✅ Controle de Hardware
- **3x Servo Motores**: Controle via GPIO (32, 33, 25)
- **Sensor HC-SR04**: Medição de distância e detecção de medicação na gaveta
- **Buzzer**: Sons para aviso, confirmação e alerta
- **2x LEDs**: Indicador WiFi (GPIO 12) e Medicação Disponível (GPIO 13)
- **EEPROM**: Persistência do último índice de cada servo

### ✅ Conectividade
- **WiFi**: Conexão automática ao SSID configurado
- **MQTT**: Pub/Sub para comunicação com servidor
- **NTP**: Sincronização de hora via internet
- **Reconexão Automática**: Em caso de desconexão

### ✅ Lógica de Dispensação
- Recepção de configuração JSON via MQTT
- Cálculo de ângulo: `ângulo_alvo = dose_index × angulo_por_dose`
- Movimento suave do servo
- Toque de buzzer em sequência
- Salvamento do índice em EEPROM

### ✅ Detecção e Confirmação
- Monitoramento contínuo do HC-SR04
- Detecção de medicação na gaveta
- Confirmação automática de coleta
- LED apaga quando medicação é coletada
- Publicação de evento de coleta

### ✅ Sistema de Alertas
- Timeout de 30 minutos
- Alerta sonoro contínuo se medicação não coletada
- Publicação de alerta via MQTT
- Notificação para app (via servidor)

### ✅ Gerenciamento de Energia
- Servos detachados após movimento (economia de energia)
- LEDs ligam/desligam conforme necessário
- Buzzer ativado apenas quando necessário

### ✅ Persistência e Confiabilidade
- Último índice salvo em EEPROM
- Leitura automática ao ligar
- Continuidade operacional após falha de energia
- Validação de dados em EEPROM

---

## 🚀 COMO USAR

### 1. Instalação
```
1. Abra Arduino IDE
2. Vá em Ferramentas → Placa → Gerenciador de Placas
3. Instale: ESP32 by Espressif Systems
4. Vá em Sketch → Incluir biblioteca → Gerenciar bibliotecas
5. Instale: PubSubClient, ArduinoJson, ESP32Servo
6. Abra o arquivo NexDose_ESP32.ino
7. Configure WiFi e MQTT no topo do arquivo
8. Clique em Sketch → Upload
```

### 2. Configuração Inicial
```cpp
// No topo do arquivo NexDose_ESP32.ino, altere:
const char* ssid = "SEU_SSID";
const char* password = "SUA_SENHA";
const char* mqtt_server = "seu.servidor.mqtt.com";
const char* deviceID = "NexDose_001";
```

### 3. Enviar Configuração
```bash
mosquitto_pub -h localhost -t "dispositivo/NexDose_001/config" -m '{
  "config": {
    "total_divisorias": 6,
    "angulo_por_dose": 30
  },
  "agenda": [
    {"hora": "08:00", "disco": 1, "dose_index": 1, "nome": "Dipirona"},
    {"hora": "14:00", "disco": 2, "dose_index": 2, "nome": "Vitamina"},
    {"hora": "20:00", "disco": 3, "dose_index": 1, "nome": "Melatonina"}
  ]
}'
```

### 4. Monitorar Status
```bash
mosquitto_sub -h localhost -t "dispositivo/NexDose_001/status"
```

---

## 📊 ARQUITETURA GERAL

```
┌─────────────────────────┐
│   Servidor MQTT         │
│  (mosquitto/cloud)      │
└────────────┬────────────┘
             │
      ┌──────┴──────┐
      ▼             ▼
  Aplicação    ESP32 (Controlador)
  (React       • WiFi
   Native)     • 3x Servos
              • HC-SR04
              • Buzzer + LEDs
              • MQTT
              
    │           │
    ├───────────┘
    ▼
  App envia agenda → ESP32 recebe → Dispensa medicação → Confirma → Histórico
```

---

## ⚙️ CONFIGURAÇÃO DE PINOS (Padrão)

| Componente | GPIO | Tipo |
|-----------|------|------|
| Servo 1 | 32 | Output |
| Servo 2 | 33 | Output |
| Servo 3 | 25 | Output |
| Buzzer | 14 | Output |
| LED WiFi | 12 | Output |
| LED Medicação | 13 | Output |
| HC-SR04 TRIG | 26 | Output |
| HC-SR04 ECHO | 27 | Input |

---

## 📈 FLUXO COMPLETO DE OPERAÇÃO

```
1. INICIALIZAÇÃO
   └─ Conecta WiFi → Sincroniza hora (NTP) → Conecta MQTT

2. AGUARDAR AGENDA
   └─ App envia config JSON → ESP32 processa → Armazena em memória

3. HORA AGENDADA
   ├─ Verifica se é hora de dispensar
   ├─ Toca buzzer (aviso)
   ├─ Move servo para ângulo calculado
   ├─ Salva índice em EEPROM
   ├─ Toca buzzer (confirmação)
   ├─ Acende LED medicação
   └─ Publica evento "dose_dispensada"

4. MONITORA GAVETA
   ├─ HC-SR04 mede distância continuamente
   ├─ Se distância < limiar (medicação coletada)
   │  ├─ Desliga LED medicação
   │  ├─ Toca buzzer (confirmação)
   │  └─ Publica evento "dose_coletada"
   └─ Se timeout de 30min não coletada
      ├─ Toca buzzer (alerta)
      └─ Publica evento "alerta_coleta"

5. HISTÓRICO
   └─ Todos os eventos são registrados no servidor
```

---

## 🔧 PRINCIPAIS FUNÇÕES

```cpp
// Inicializar
inicializarServos()        // Lê EEPROM e configura servos
conectarMQTT()            // Conecta ao broker MQTT

// Executar
dispararDose(servo, indice)           // Dispensa medicação
verificarMedicacaoNaGaveta()          // Monitora coleta
manutencaoMQTT()                      // Mantém conexão MQTT

// Auxiliares
publicarDoseDispensada()              // Publica evento
publicarConfirmacaoColeta()           // Confirma coleta
publicarAlertaColeta()                // Alerta se não coletada
tocarBuzzer(duracao, repeticoes)      // Toca buzzer
```

---

## 🧪 TESTES RECOMENDADOS

1. **Teste de Conexão**: Verificar WiFi e MQTT no Serial Monitor
2. **Teste de Servos**: Disparar cada servo individualmente
3. **Teste de Sensor**: Mover mão perto do HC-SR04
4. **Teste de Áudio**: Escutar diferentes tons do buzzer
5. **Teste de Persistência**: Desligar ESP32 e verificar posição dos servos
6. **Teste de Alerta**: Aguardar 30 min sem coletar medicação

---

## ⚠️ NOTAS IMPORTANTES

- **Alimentação**: Servos precisam de fonte separada (5V, 2A+)
- **Resistor no ECHO**: Use divisor 1kΩ/2kΩ para HC-SR04
- **Capacitor**: Coloque 100µF entre 5V e GND próximo aos servos
- **ID Único**: Altere `deviceID` para identificar cada dispositivo
- **Broker MQTT**: Configure endereço e porta corretos

---

## 📞 ARQUIVOS DE DOCUMENTAÇÃO

Consulte os seguintes arquivos para mais informações:

| Arquivo | Conteúdo |
|---------|----------|
| **GUIA_INSTALACAO.md** | Passo a passo da instalação |
| **ARQUITETURA_E_DOCUMENTACAO.md** | Visão geral da arquitetura |
| **MELHORIAS_E_EXTENSOES.md** | Funcionalidades futuras |
| **CLASSE_AUXILIAR_E_TESTES.md** | Classe helper e testes |
| **CHECKLIST_DESENVOLVIMENTO_DEPLOYMENT.md** | Checklists de produção |

---

## ✅ PRÓXIMOS PASSOS

1. ✅ Implementar código principal
2. ✅ Documentar todo o projeto
3. ⏳ Testar em ambiente real
4. ⏳ Integrar com app (React Native)
5. ⏳ Deploy em produção
6. ⏳ Monitoramento contínuo

---

**Versão:** 1.0  
**Status:** Pronto para Upload  
**Data:** 2026-05-27  
**Último Update:** 2026-05-27

