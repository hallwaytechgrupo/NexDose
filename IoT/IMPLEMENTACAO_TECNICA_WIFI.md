# 🔧 Implementação Técnica - WiFi Provisioning

## Sumário Executivo

Este documento detalha a implementação técnica do sistema de WiFi Provisioning para ESP32 NexDose, incluindo:
- Arquitetura de componentes
- Fluxos de estado
- Integração com hardware existente
- Otimizações e trade-offs

---

## 📐 Arquitetura de Componentes

### Diagrama de Estados

```
┌──────────────────┐
│   POWER ON       │
└────────┬─────────┘
         │
         ↓
┌──────────────────────────────┐
│ Carregar Credenciais da      │
│ EEPROM (Endereço 12-109)     │
└────────┬─────────────────────┘
         │
         ↓
┌──────────────────────────────┐     NÃO  ┌─────────────────┐
│ verificarConexaoWiFi()       │──────────→│ AP Mode Ativo  │
│ Timeout: 10s                 │     ✓    │ (Captive Portal)│
│ Max Tentativas: 20           │         └────────┬────────┘
└────────┬─────────────────────┘ ✓              │
         │                                      ↓
         ↓                          ┌──────────────────────┐
┌──────────────────────────────┐   │ WebServer na Porta 80│
│ WiFi Conectado               │   │ DNSServer na Porta 53│
│ Modo WIFI_STA                │   │ Aguarda Config (5min)│
└────────┬─────────────────────┘   └────────┬─────────────┘
         │                                    │
         ↓                                    ↓
┌──────────────────────────────┐   ┌─────────────────┐
│ MQTT Setup                   │   │ Recebe JSON com │
│ Sincronizar NTP              │   │ SSID + Password │
│ Operação Normal              │   └────────┬────────┘
│ (Agendamentos, Sensores, etc)│          │
└──────────────────────────────┘          ↓
                                 ┌──────────────────────┐
                                 │ Salvar na EEPROM    │
                                 │ Validar Tamanho:    │
                                 │  SSID ≤ 32 bytes    │
                                 │  Pass ≤ 64 bytes    │
                                 └────────┬─────────────┘
                                          │
                                          ↓
                                 ┌──────────────────────┐
                                 │ ESP.restart()       │
                                 │ Reinicia ESP32      │
                                 └────────┬─────────────┘
                                          │
                                          └──→ (Volta a Power On)
```

### Máquina de Estados Detalhada

```cpp
enum EstadoWiFi {
  ESTADO_STARTUP = 0,        // Carrega EEPROM
  ESTADO_VERIFICANDO = 1,    // Tenta conectar (10s)
  ESTADO_AP_MODE = 2,        // Captive Portal ativo
  ESTADO_CONECTADO = 3,      // WiFi + MQTT OK
  ESTADO_ERRO = 4            // Falha
};
```

---

## 🗄️ Layout de EEPROM

### Visão Geral

```
┌─────┬──────────────────────────────────┬────────────┐
│ Uso │ Endereços                        │ Tamanho    │
├─────┼──────────────────────────────────┼────────────┤
│ Srv │ 0-11 (Servo Positions)           │ 12 bytes   │
├─────┼──────────────────────────────────┼────────────┤
│ WiFi│ 12: Comprimento SSID             │ 1 byte     │
│     │ 13-44: Dados SSID                │ 32 bytes   │
│     │ 45: Comprimento Senha            │ 1 byte     │
│     │ 46-109: Dados Senha              │ 64 bytes   │
├─────┼──────────────────────────────────┼────────────┤
│ Res │ 110-511 (Reservado para futuro)  │ 402 bytes  │
└─────┴──────────────────────────────────┴────────────┘

Total: 512 bytes
```

### Detalhamento Endereços WiFi

```
ENDEREÇO    CONTEÚDO                  EXEMPLO
─────────────────────────────────────────────────
12          Len(SSID)                 8 (bytes)

13          S (ASCII 83)              'W'
14          S (ASCII 83)              'i'
15          S (ASCII 83)              'f'
16          S (ASCII 83)              'i'
17          S (ASCII 83)              '_'
18          S (ASCII 83)              'C'
19          S (ASCII 83)              'a'
20          S (ASCII 83)              's'
21-44       (não usados se SSID < 32) 0x00

45          Len(Senha)                12 (bytes)

46          P (ASCII 80)              'm'
47          P (ASCII 80)              'i'
48          P (ASCII 80)              'n'
49          P (ASCII 80)              'h'
50          P (ASCII 80)              'a'
51          P (ASCII 80)              'S'
52          P (ASCII 80)              'e'
53          P (ASCII 80)              'n'
54          P (ASCII 80)              'h'
55          P (ASCII 80)              'a'
56          P (ASCII 80)              '1'
57          P (ASCII 80)              '2'
58-109      (não usados se Senha < 64) 0x00
```

### Funções de Acesso

```cpp
// Salvar credenciais (atômico)
void salvarCredenciaisWiFi(const String& novo_ssid, const String& nova_senha) {
  EEPROM.begin(EEPROM_SIZE);
  
  // 1. Escrever comprimento
  EEPROM.write(ADDR_SSID_LENGTH, novo_ssid.length());
  
  // 2. Escrever bytes do SSID
  for (int i = 0; i < novo_ssid.length(); i++) {
    EEPROM.write(ADDR_SSID_DATA + i, novo_ssid[i]);
  }
  
  // 3. Escrever comprimento da senha
  EEPROM.write(ADDR_PASSWORD_LENGTH, nova_senha.length());
  
  // 4. Escrever bytes da senha
  for (int i = 0; i < nova_senha.length(); i++) {
    EEPROM.write(ADDR_PASSWORD_DATA + i, nova_senha[i]);
  }
  
  // 5. Confirmar escrita
  EEPROM.commit();  // CRÍTICO: sem isto, dados são perdidos
}

// Carregar credenciais (seguro)
void carregarCredenciaisWiFi() {
  EEPROM.begin(EEPROM_SIZE);
  
  int ssid_length = EEPROM.read(ADDR_SSID_LENGTH);
  
  // Validar tamanho lido
  if (ssid_length > 0 && ssid_length <= 32) {
    ssid = "";
    for (int i = 0; i < ssid_length; i++) {
      ssid += (char)EEPROM.read(ADDR_SSID_DATA + i);
    }
  } else {
    ssid = "SSID_WIFI";  // Fallback se inválido
  }
  
  // Mesmo processo para senha...
}
```

**⚠️ Pontos Críticos:**
1. Sempre chamar `EEPROM.commit()` após escrever
2. Validar comprimento lido antes de usar
3. Limpar bytes não utilizados (opcional mas recomendado)

---

## 🌐 Servidor Web (WebServer.h)

### Handler da Página Raiz

```cpp
void handleRoot() {
  // Gera HTML inline com estilos CSS
  String html = R"=====(
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
        // ... CSS estilos ...
      </style>
    </head>
    <body>
      // ... Form HTML ...
    </body>
    </html>
  )=====" ;
  
  webServer.send(200, "text/html", html);
}
```

**Tamanho HTML:** ~3.5 KB
**Tempo de Carregamento:** <500ms em WiFi 2.4GHz

### Handler POST `/save-wifi`

```cpp
void handleSaveWiFi() {
  // 1. Validar método HTTP
  if (webServer.method() == HTTP_POST) {
    
    // 2. Extrair body JSON
    if (webServer.hasArg("plain")) {
      String body = webServer.arg("plain");
      
      // 3. Parse JSON
      StaticJsonDocument<256> doc;
      DeserializationError error = deserializeJson(doc, body);
      
      if (!error) {
        String novo_ssid = doc["ssid"].as<String>();
        String nova_senha = doc["password"].as<String>();
        
        // 4. Validar tamanhos
        if (novo_ssid.length() > 0 && novo_ssid.length() <= 32 &&
            nova_senha.length() > 0 && nova_senha.length() <= 64) {
          
          // 5. Salvar em EEPROM
          salvarCredenciaisWiFi(novo_ssid, nova_senha);
          
          // 6. Atualizar variáveis globais
          ssid = novo_ssid;
          password = nova_senha;
          
          // 7. Responder sucesso
          StaticJsonDocument<128> resposta;
          resposta["success"] = true;
          resposta["message"] = "WiFi salvo com sucesso! Reiniciando...";
          
          String response;
          serializeJson(resposta, response);
          webServer.send(200, "application/json", response);
          
          // 8. Aguardar transmissão de dados
          delay(2000);
          
          // 9. Reiniciar
          ESP.restart();
        }
      }
    }
  }
}
```

**Fluxo de Requisição:**
```
Cliente                    ESP32 (WebServer)
   │                            │
   ├──POST /save-wifi ────→     │
   │    Content-Type: application/json
   │    {"ssid":"...", "password":"..."}
   │                            │
   │                      1. Validar HTTP
   │                      2. Parse JSON
   │                      3. Validar tamanhos
   │                      4. Salvar EEPROM
   │                            │
   │    ←────────── 200 OK ──    │
   │    Content-Type: application/json
   │    {"success":true,"message":"..."}
   │                            │
   │                      5. Delay 2s
   │                      6. ESP.restart()
   │
   └─ (Conexão encerra)
```

---

## 🛰️ DNS Server (Captive Portal)

### Configuração

```cpp
void inicializarAPMode() {
  // 1. Modo AP
  WiFi.mode(WIFI_AP);
  WiFi.softAP("NexDose_Setup", "12345678");
  
  // 2. IP Address
  IPAddress apIP(192, 168, 4, 1);
  WiFi.softAPConfig(apIP, apIP, IPAddress(255, 255, 255, 0));
  
  // 3. DNS Server - CRÍTICO para Captive Portal
  dnsServer.start(DNS_PORT, "*", apIP);
  // O "*" significa: qualquer domínio → 192.168.4.1
}
```

### Como Funciona o DNS Redirecionamento

```
┌──────────────────────────────────────────┐
│ Usuário conecta ao "NexDose_Setup"      │
│ Sistema atribui IP: 192.168.1.100       │
│ (Obtém via DHCP do AP)                  │
└──────────────────────────────────────────┘
           │
           ↓
┌──────────────────────────────────────────┐
│ Browser: "Como chego ao portal?"         │
│ 1. Tenta conectar a apple.com (probe)    │
│ 2. Requisição DNS: "o que é apple.com?" │
└──────────────────────────────────────────┘
           │
           ↓
┌──────────────────────────────────────────┐
│ ESP32 DNSServer:                         │
│ "Qualquer domínio = 192.168.4.1"        │
│ Resposta DNS: A record → 192.168.4.1   │
└──────────────────────────────────────────┘
           │
           ↓
┌──────────────────────────────────────────┐
│ Browser:                                 │
│ "Vou conectar em apple.com (192.168.4.1)"
│ HTTP GET / 192.168.4.1                  │
└──────────────────────────────────────────┘
           │
           ↓
┌──────────────────────────────────────────┐
│ WebServer no /                           │
│ ← Retorna página HTML do Portal         │
└──────────────────────────────────────────┘
```

---

## ⏱️ Timing e Timeouts

### Sequência de Boot

```
0ms      ┌─ Inicializa UART (Serial 115200 baud)
         │
100ms    ├─ Carrega EEPROM com credenciais
         │
200ms    ├─ Inicializa GPIO (LEDs, Buzzer, Sensor)
         │
300ms    ├─ Inicializa Servo motores (3x)
         │
400ms    ├─ WiFi.begin(ssid, password) - Inicia tentativa
         │
400-10400ms ├─ Loop: verificarConexaoWiFi()
         │  Tenta conectar por até 10 segundos
         │
         │  Caso 1: ✓ WiFi conectado (antes de 10s)
         │  └─→ 10500ms: MQTT Setup
         │      11000ms: NTP Sync (pode levar até 5s)
         │      16000ms: Sistema operacional
         │
         │  Caso 2: ✗ WiFi falhou (após 10s)
         │  └─→ 10500ms: Inicia AP Mode
         │      (Fica em loop processando AP)
         │      300000ms: Timeout AP (5 min)
         │              └─→ Para AP, tenta WiFi novamente

10400ms  └─ Setup completo
```

### Validação de Conexão

```cpp
bool verificarConexaoWiFi() {
  int tentativas = 0;
  const int MAX_TENTATIVAS = 20;  // 20 * 500ms = 10 segundos
  
  while (WiFi.status() != WL_CONNECTED && tentativas < MAX_TENTATIVAS) {
    delay(500);
    Serial.print(".");
    tentativas++;
  }
  
  return WiFi.status() == WL_CONNECTED;
}
```

**Timeline:**
```
Tentativa  Milissegundos  Status              Serial
1          0              Aguardando...       .
2          500            Aguardando...       .
3          1000           Aguardando...       .
...
20         9500           Aguardando...       .
           10000          TIMEOUT             (Sai do loop)
```

---

## 📊 Consumo de Recursos

### Memória RAM

```
Componente                      RAM (bytes)
─────────────────────────────────────────
WebServer object                ~1500
DNSServer object                ~500
JSON Document (256 bytes)       256
HTML buffer                     ~3500
Variáveis WiFi                  ~256
─────────────────────────────────────────
TOTAL (AP Mode ativo)           ~6000 bytes

ESP32: 520 KB disponível
Utilização: ~1.2% (ainda há espaço)
```

### Armazenamento Flash

```
Componente                      Flash (bytes)
─────────────────────────────────────────
WebServer library               ~30 KB
DNSServer library               ~8 KB
HTML inline (string)            ~3.5 KB
─────────────────────────────────────────
TOTAL                           ~41.5 KB

ESP32: 4 MB disponível
Utilização: ~1% (espaço suficiente)
```

---

## 🔌 Integração com Sistema Existente

### Startup Sequence

```cpp
void setup() {
  // ... GPIO config ...
  
  // NOVO: Carregar credenciais WiFi da EEPROM
  carregarCredenciaisWiFi();
  
  // NOVO: Tentar conectar com provisioning automático
  conectarWiFi();  // Ativa AP Mode se falhar
  
  // Resto do setup (servo, MQTT, NTP)
  if (WiFi.status() == WL_CONNECTED) {
    conectarMQTT();
    sincronizarHora();
  }
}
```

### Loop Principal

```cpp
void loop() {
  // NOVO: Processar AP Mode se ativo
  if (ap_mode_ativo) {
    procesarAPMode();  // Processa DNS/WebServer
  }
  
  // Resto do loop (MQTT, sensores, etc)
  if (WiFi.status() == WL_CONNECTED) {
    manutencaoMQTT();
    verificarAgendamentos();
  }
  
  verificarMedicacaoNaGaveta();
}
```

### Compatibilidade com Features Existentes

| Feature            | Estado | Notas |
|-------------------|--------|-------|
| Servo Control     | ✅     | Funciona sempre |
| Sensor HC-SR04    | ✅     | Funciona sempre |
| Buzzer/LEDs       | ✅     | Funciona sempre |
| MQTT              | ⏸️     | Aguarda WiFi |
| NTP Sync          | ⏸️     | Aguarda WiFi |
| Agendamentos      | ⏸️     | Aguarda NTP |

---

## 🧪 Testes e Validação

### Teste 1: Boot sem EEPROM

```
Procedimento:
1. Limpar EEPROM com script
2. Fazer upload do firmware
3. Ligar ESP32

Resultado esperado:
- LED WiFi pisca
- Buzzer toca 2x
- AP Mode inicia
- Captive Portal acessível
```

### Teste 2: Reconfigurar WiFi

```
Procedimento:
1. Conectar a um WiFi válido
2. Fazer login no Captive Portal
3. Inseri novas credenciais
4. Reiniciar

Resultado esperado:
- Reinicia com novas credenciais
- Conecta à nova rede
- LED WiFi acende
```

### Teste 3: Credenciais Inválidas

```
Procedimento:
1. Inserir SSID inexistente
2. Inserir senha incorreta
3. Submeter formulário
4. Aguardar timeout (5 min)

Resultado esperado:
- Buzzer 3x (confirmação de falha)
- AP Mode reinicia
- Permite reconfiguração
```

### Teste 4: Tamanho Máximo de Credenciais

```
Procedimento:
1. Testar SSID = 32 caracteres
2. Testar Senha = 64 caracteres
3. Inserir valores maiores (deve rejeitar)

Resultado esperado:
- Aceita até limites especificados
- Rejeita com mensagem de erro
- Permite reconfiguração
```

---

## ⚠️ Limitações Conhecidas

### 1. **Encriptação não implementada**
- Credenciais em texto plano na EEPROM
- Requer acesso físico para exploração
- Melhoria: Implementar AES-256

### 2. **Sem autenticação no Captive Portal**
- Qualquer pessoa conectada ao AP pode configurar
- Sem proteção contra ataques CSRF
- Melhoria: Implementar token único por sessão

### 3. **Timeout fixo (5 minutos)**
- Não configurável pela interface
- Melhoria: Adicionar comando MQTT para alterar

### 4. **Sem histórico de tentativas**
- Não registra tentativas de acesso falhadas
- Melhoria: Implementar log em SPIFFS

### 5. **EEPROM limitada a 512 bytes**
- Reduz espaço para futuras features
- Melhoria: Usar SPIFFS para armazenamento maior

---

## 🚀 Melhorias Futuras (v2.0)

```cpp
// TODO: Geração de PIN aleatório por boot
String gerarPINAleatorio() {
  return String(random(1000, 9999));
}

// TODO: QR Code com informações do WiFi
void gerarQRCode() {
  // Implementar biblioteca QR code
  // Exibir em página HTML
}

// TODO: Reset via MQTT
void processarComandoReset() {
  if (topico == "dispositivo/reset_wifi") {
    limparCredenciaisWiFi();
    ESP.restart();
  }
}

// TODO: Modo de recuperação com botão
const int RECOVERY_BUTTON = 35;
void verificarBotaoRecuperacao() {
  if (digitalRead(RECOVERY_BUTTON) == LOW) {
    delay(5000);  // Pressionar 5s
    if (digitalRead(RECOVERY_BUTTON) == LOW) {
      limparCredenciaisWiFi();
      ESP.restart();
    }
  }
}
```

---

## 📚 Referências

- [ESP32 WebServer Docs](https://github.com/espressif/arduino-esp32)
- [Captive Portal Pattern](https://en.wikipedia.org/wiki/Captive_portal)
- [RFC 1918 - Private IP Space](https://tools.ietf.org/html/rfc1918)
- [IEEE 802.11 WiFi Standard](https://en.wikipedia.org/wiki/IEEE_802.11)

---

**Versão:** 1.0  
**Data:** 2024  
**Autor:** NexDose Technical Team
