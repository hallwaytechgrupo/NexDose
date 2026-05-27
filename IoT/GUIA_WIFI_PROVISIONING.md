# 📡 Guia de WiFi Provisioning - NexDose ESP32

## Visão Geral

A funcionalidade de **WiFi Provisioning** permite que o dispositivo NexDose configure sua conexão WiFi de forma automática e amigável através de um **Captive Portal** (página de configuração) sem necessidade de reprogramação.

### Fluxo de Funcionamento

```
┌─────────────────────────────────────────────┐
│   1. ESP32 Inicia (Power On)                │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│   2. Verifica Conexão WiFi (10 segundos)    │
│      - Tenta conectar com credenciais       │
│      - Armazenadas na EEPROM                │
└─────────────────────────────────────────────┘
                    ↓
        ┌──────────────────────────┐
        │  WiFi Conectado?         │
        └──────────────────────────┘
         /           |           \
       SIM          NÃO         TIMEOUT
        |            |            |
        ↓            ↓            ↓
    ✓ Normal   Captive Portal   Retry
    (Skip AP)  (Inicia AP)      (Retry)
```

---

## 🚀 Como Usar - Primeiro Boot (Sem WiFi Salvo)

### Passo 1: Alimentar o Dispositivo

1. Conecte a ESP32 à fonte de alimentação (USB ou bateria)
2. Observar o **buzzer** toca 2 vezes → **AP Mode iniciado**
3. O **LED WiFi pisca** a cada 500ms

### Passo 2: Conectar ao Captive Portal

#### No Android/iOS:
1. Abra **Configurações → WiFi**
2. Localize a rede: `NexDose_Setup`
3. Conecte com a senha: `12345678`
4. Uma janela deve aparecer automaticamente com a página de configuração

#### Se não abrir automaticamente:
1. Abra o navegador (Chrome, Safari, Firefox)
2. Acesse: `http://192.168.4.1`
3. A página de configuração será exibida

### Passo 3: Configurar Credenciais WiFi

Na página que abrir:

```html
┌─────────────────────────────────────────┐
│        🏥 NexDose                       │
│  Dispositivo de Dispensação de          │
│        Medicamentos                     │
├─────────────────────────────────────────┤
│                                         │
│  Rede WiFi (SSID):                      │
│  [ Minha_Rede_WiFi        ]             │
│                                         │
│  Senha WiFi:                            │
│  [ ****** ]                             │
│                                         │
│         [ Conectar ]                    │
│                                         │
└─────────────────────────────────────────┘
```

**Campo 1: SSID**
- Digite o nome exato da sua rede WiFi
- Exemplo: `WiFi_Casa` ou `TP-Link_2G`

**Campo 2: Senha**
- Digite a senha exata da sua rede WiFi
- Sensível a maiúsculas/minúsculas

### Passo 4: Confirmar Configuração

1. Clique em **"Conectar"**
2. Aguarde a mensagem: `"WiFi salvo com sucesso! Reiniciando..."`
3. O dispositivo **reinicia automaticamente**

### Passo 5: Verificar Conexão

Após reiniciar (5-10 segundos):

- ✅ **LED WiFi aceso**: Conectado com sucesso!
- ❌ **LED WiFi desligado**: Falha na conexão
- 🔊 **Buzzer toca 3 vezes**: Confirmação de conexão

Se **falhar**:
1. Verifique o SSID e senha
2. O AP Mode inicia novamente
3. Tente configurar novamente

---

## 🔧 Componentes da Implementação

### 1. **Armazenamento de Credenciais (EEPROM)**

```
ENDEREÇO    CONTEÚDO                 TAMANHO
────────────────────────────────────────────
0-11        Posições dos Servos      12 bytes
12          Comprimento SSID         1 byte
13-44       Dados SSID               32 bytes
45          Comprimento Senha        1 byte
46-109      Dados Senha              64 bytes
```

**Protocolos de Segurança:**
- ⚠️ Credenciais armazenadas em **texto plano** na EEPROM
- ✅ Acesso físico à ESP32 necessário para recuperar
- 🔒 Considerar adicionar encriptação em versões futuras

### 2. **Servidor Web (WebServer.h)**

```cpp
WebServer webServer(80);  // Porta HTTP padrão
- GET  /          → Retorna página HTML
- POST /save-wifi → Recebe credenciais (JSON)
- 404  *          → Redireciona para /
```

### 3. **DNS Server (DNSServer.h)**

```cpp
DNSServer dnsServer;
dnsServer.start(53, "*", 192.168.4.1);
```

- Intercepta todas as requisições DNS
- Redireciona para `192.168.4.1` (Captive Portal)
- Automático em Android/iOS

### 4. **Modo AP (Access Point)**

```cpp
WiFi.mode(WIFI_AP);
WiFi.softAP("NexDose_Setup", "12345678");
IPAddress apIP(192, 168, 4, 1);
```

**Configuração AP:**
- SSID: `NexDose_Setup`
- Senha: `12345678`
- IP: `192.168.4.1`
- Máscara: `255.255.255.0`

### 5. **Timeout de AP (5 minutos)**

```cpp
const int AP_TIMEOUT = 300000;  // 5 minutos

// Se nenhuma config recebida em 5 min:
if (millis() - tempo_ap_iniciado > AP_TIMEOUT) {
    // Para AP Mode
    // Tenta conectar com credenciais salvas
}
```

---

## 📱 Cenários de Uso

### Cenário 1: Primeiro Boot (Sem WiFi)
```
1. ESP32 liga
2. Não encontra credenciais na EEPROM
3. Falha ao conectar em 10 segundos
4. Inicia AP Mode automaticamente
5. Usuário acessa http://192.168.4.1
6. Configura credenciais
7. ESP32 reinicia e conecta
```

### Cenário 2: Boot com WiFi Salvo
```
1. ESP32 liga
2. Carrega credenciais da EEPROM
3. Tenta conectar em 10 segundos
4. ✅ Sucesso → Pula AP Mode, funciona normalmente
5. ❌ Falha → Inicia AP Mode, aguarda reconfiguração
```

### Cenário 3: Mudança de WiFi
```
1. Dispositivo já está configurado
2. Rede WiFi original indisponível
3. Dispositivo falha a conectar
4. Inicia AP Mode automaticamente
5. Usuário acessa http://192.168.4.1
6. Insere novas credenciais
7. Dispositivo reconecta com nova rede
```

---

## 🔄 Fluxo JSON de Comunicação

### Requisição POST para `/save-wifi`:

```json
{
  "ssid": "WiFi_Casa",
  "password": "minha_senha_segura"
}
```

### Resposta de Sucesso:

```json
{
  "success": true,
  "message": "WiFi salvo com sucesso! Reiniciando..."
}
```

### Resposta de Erro:

```json
{
  "success": false,
  "message": "SSID ou senha inválidos"
}
```

**Validações:**
- SSID: 1-32 caracteres
- Senha: 1-64 caracteres
- Ambos obrigatórios

---

## 🔍 Troubleshooting

### ❌ **Não consigo acessar o Captive Portal**

**Solução 1: Conectar manualmente à rede**
```
1. Settings → WiFi → NexDose_Setup
2. Senha: 12345678
3. Abrir navegador
4. Acesse: http://192.168.4.1
```

**Solução 2: Verificar firewall**
- Desabilitar VPN/Proxy temporariamente
- Alguns firewalls bloqueiam acesso ao Captive Portal

**Solução 3: Reiniciar dispositivo**
- Desligar ESP32
- Aguardar 10 segundos
- Ligar novamente

### ❌ **"WiFi salvo com sucesso!" mas não conecta**

**Verificar:**
1. SSID está digitado corretamente?
2. Senha está correta?
3. A rede WiFi existe e está funcionando?
4. O sinal está forte (próximo ao roteador)?

**Teste:**
```
Tentar conectar com outro dispositivo (celular/laptop)
na mesma rede para confirmar acesso
```

### ❌ **LED WiFi está desligado / Buzzer não toca**

**Verificar:**
1. Conexão dos LEDs nos pinos corretos (GPIO 12, 13)
2. Conexão do buzzer no pino correto (GPIO 14)
3. Polaridade dos LEDs
4. Alimentação adequada (5V ou 3.3V conforme especificado)

### ❌ **Timeout de AP Mode (5 minutos)**

**O que significa:**
- Nenhuma configuração foi recebida em 5 minutos
- AP Mode é interrompido
- Tenta conectar com credenciais anteriores

**Solução:**
1. Verifique se a rede WiFi está selecionada
2. Reabra o Captive Portal
3. Insira as credenciais novamente

---

## 🛠️ Reset de Credenciais WiFi

### Método 1: Via Firmware (TODO - Implementar)
```cpp
// Adicionar comando MQTT para resetar
// Tópico: dispositivo/NexDose_001/comando
// Payload: {"acao": "reset_wifi"}
```

### Método 2: Limpar EEPROM
```cpp
// Upload esse sketch para limpar:
void setup() {
  EEPROM.begin(512);
  for (int i = 12; i < 110; i++) {
    EEPROM.write(i, 0);
  }
  EEPROM.commit();
  Serial.println("EEPROM limpo");
}
void loop() {}
```

### Método 3: Botão Hardware (TODO - Implementar)
```cpp
// Adicionar botão em GPIO (ex: GPIO 35)
// Pressionar por 5 segundos para resetar WiFi
```

---

## 📊 Pinagem do AP Mode

| Componente | GPIO | Função |
|-----------|------|--------|
| LED WiFi  | 12   | Indicador de conexão (pisca no AP) |
| Buzzer    | 14   | 2 toques = AP iniciado |
| -         | -    | -      |

**Indicadores Auditivos:**
- 🔊 **2 toques**: AP Mode iniciado
- 🔊 **3 toques**: WiFi conectado com sucesso
- 🔊 **1 toque**: Buzzer normal (disparo de medicação)

---

## 📋 Checklist de Configuração

- [ ] ESP32 com firmware NexDose_ESP32_WiFi_Provisioning.ino
- [ ] LEDs conectados (GPIO 12, 13)
- [ ] Buzzer conectado (GPIO 14)
- [ ] Alimentação adequada (5V USB ou 3.3V)
- [ ] Antena WiFi conectada (se aplicável)
- [ ] Primeiro boot sem WiFi salvo
- [ ] Acessa Captive Portal automaticamente
- [ ] Página carrega com sucesso
- [ ] Insere credenciais WiFi
- [ ] Dispositivo reinicia e conecta
- [ ] LED WiFi acende após conexão
- [ ] Buzzer toca 3 vezes (confirmação)

---

## 🔐 Segurança

### ⚠️ Considerações de Segurança Atuais

1. **Credenciais em Texto Plano**
   - Armazenadas na EEPROM sem encriptação
   - Acesso físico à placa necessário
   - Considerar para ambientes públicos/hospitalares

2. **Senha do AP Fixa**
   - AP sempre inicia com `12345678`
   - Qualquer pessoa perto pode conectar
   - Melhorar para versão com QR Code + PIN

3. **Sem Autenticação Web**
   - Captive Portal não valida cliente
   - Qualquer um conectado ao AP pode configurar

### ✅ Melhorias Futuras de Segurança

```cpp
// TODO v2.0:
// 1. Criptografar credenciais com AES-256
// 2. Gerar PIN aleatório por sessão
// 3. Autenticação HTTP básica no Captive Portal
// 4. Hash da senha do AP com derivação chave
// 5. Timeout mais curto (2-3 minutos)
// 6. Logs de tentativas de acesso
```

---

## 📝 Formato de Logs

Durante o boot, você verá:

```
========== NexDose ESP32 INICIANDO ==========

Inicializando servo motores...
✓ Credenciais carregadas: SSID=WiFi_Casa

🔌 Tentando conectar ao WiFi: WiFi_Casa
.................
✓ WiFi conectado com sucesso!
✓ IP: 192.168.1.100
Conectando MQTT... Conectado!
Inscrito em: dispositivo/NexDose_001/config
Sincronizando hora com NTP...
✓ Hora sincronizada com sucesso!
Hora atual do sistema: 14:30:45

========== SETUP COMPLETADO ==========
```

---

## 🆘 Suporte

Para problemas não cobertos neste guia:

1. Verifique os **logs seriais** (Arduino IDE → Monitor Serial)
2. Consulte o arquivo **GUIA_INSTALACAO.md**
3. Verifique a documentação em **ARQUITETURA_E_DOCUMENTACAO.md**

---

## 📚 Referências

- [ESP32 WebServer Documentation](https://github.com/espressif/arduino-esp32/tree/master/libraries/WebServer)
- [DNSServer Library](https://github.com/espressif/arduino-esp32/tree/master/libraries/DNSServer)
- [WiFi Provisioning Pattern](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/provisioning/provisioning.html)

---

**Versão:** 1.0  
**Data:** 2024  
**Autor:** NexDose Team
