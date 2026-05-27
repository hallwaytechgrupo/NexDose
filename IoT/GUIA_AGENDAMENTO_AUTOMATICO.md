# NexDose - Guia de Agendamento Automático com Sincronização de Hora

## 📋 Visão Geral

O ESP32 agora é capaz de:
1. Sincronizar a hora via NTP automaticamente
2. Armazenar agendamentos de medicamentos
3. **Dispensar medicamentos automaticamente** nos horários corretos
4. Ressincronizar a hora a cada 1 hora
5. Resetar agendamentos todos os dias

---

## 🕐 Como Funciona

### Fluxo Completo

```
1. ESP32 Liga
   └─ Sincroniza hora via NTP (pool.ntp.org)
   
2. App/Cuidador Envia Configuração
   └─ JSON com medicamentos + horários
   
3. ESP32 Recebe e Armazena Agendamentos
   └─ Máximo de 20 medicações agendadas
   
4. ESP32 Verifica Hora Constantemente
   └─ A cada minuto, verifica se é hora de dispensar
   
5. Hora Correta Atinge
   └─ ESP32 automaticamente:
      ├─ Dispara o servo correto
      ├─ Salva a dose em EEPROM
      ├─ Toca buzzer
      ├─ Acende LED
      └─ Publica evento no MQTT
      
6. Usuário Coleta Medicação
   └─ Sensor HC-SR04 detecta
   └─ Publica confirmação
   └─ LED apaga
```

---

## 📱 Estrutura de Configuração JSON

### Formato Básico

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
      "nome": "Dipirona 500mg"
    },
    {
      "hora": "14:00",
      "disco": 1,
      "dose_index": 2,
      "nome": "Dipirona 500mg"
    },
    {
      "hora": "20:00",
      "disco": 2,
      "dose_index": 1,
      "nome": "Vitamina D"
    }
  ]
}
```

### Campos Obrigatórios

| Campo | Tipo | Descrição | Exemplo |
|-------|------|-----------|---------|
| `hora` | String | Horário em formato 24h | `"08:30"`, `"14:00"`, `"23:59"` |
| `disco` | Número | Qual plataforma (1, 2 ou 3) | `1`, `2`, `3` |
| `dose_index` | Número | Qual compartimento do disco | `1`, `2`, `3`, ... (até `total_divisorias`) |
| `nome` | String | Nome do medicamento | `"Dipirona 500mg"`, `"Vitamina D"` |

---

## 🧮 Calculando Horários a Partir da Receita

### Cenário 1: Medicamento 3x ao dia, começando 08:00

```
Dose inicial: 08:00
Intervalo: 8 horas (3x ao dia)

Horários:
- 08:00 (primeira dose)
- 16:00 (segunda dose: 08:00 + 8h)
- 00:00 (terceira dose: 16:00 + 8h - próximo dia)
```

**JSON correspondente:**
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
      "nome": "Medicamento 3x ao dia"
    },
    {
      "hora": "16:00",
      "disco": 1,
      "dose_index": 2,
      "nome": "Medicamento 3x ao dia"
    },
    {
      "hora": "00:00",
      "disco": 1,
      "dose_index": 3,
      "nome": "Medicamento 3x ao dia"
    }
  ]
}
```

### Cenário 2: Medicamento 2x ao dia (manhã e noite)

```
Dose inicial: 07:00
Intervalo: 12 horas

Horários:
- 07:00 (manhã)
- 19:00 (noite: 07:00 + 12h)
```

**JSON:**
```json
{
  "config": {
    "total_divisorias": 6,
    "angulo_por_dose": 30
  },
  "agenda": [
    {
      "hora": "07:00",
      "disco": 1,
      "dose_index": 1,
      "nome": "Vitamina (manhã)"
    },
    {
      "hora": "19:00",
      "disco": 1,
      "dose_index": 2,
      "nome": "Vitamina (noite)"
    }
  ]
}
```

### Cenário 3: Múltiplos Medicamentos em Diferentes Discos

```
- Disco 1: Medicamento A (08:00, 20:00)
- Disco 2: Medicamento B (09:00, 14:00, 21:00)
- Disco 3: Medicamento C (10:30, 22:30)
```

**JSON:**
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
      "nome": "Medicamento A (dose 1)"
    },
    {
      "hora": "20:00",
      "disco": 1,
      "dose_index": 2,
      "nome": "Medicamento A (dose 2)"
    },
    {
      "hora": "09:00",
      "disco": 2,
      "dose_index": 1,
      "nome": "Medicamento B (dose 1)"
    },
    {
      "hora": "14:00",
      "disco": 2,
      "dose_index": 2,
      "nome": "Medicamento B (dose 2)"
    },
    {
      "hora": "21:00",
      "disco": 2,
      "dose_index": 3,
      "nome": "Medicamento B (dose 3)"
    },
    {
      "hora": "10:30",
      "disco": 3,
      "dose_index": 1,
      "nome": "Medicamento C (dose 1)"
    },
    {
      "hora": "22:30",
      "disco": 3,
      "dose_index": 2,
      "nome": "Medicamento C (dose 2)"
    }
  ]
}
```

---

## 📤 Como Enviar a Configuração

### Via Mosquitto (Linha de Comando)

```bash
# Comando básico
mosquitto_pub -h seu.servidor.mqtt.com \
  -t "dispositivo/NexDose_001/config" \
  -m '{"config":{"total_divisorias":6,"angulo_por_dose":30},"agenda":[{"hora":"08:00","disco":1,"dose_index":1,"nome":"Dipirona"}]}'

# Salvando em arquivo (recomendado)
cat > config.json << 'EOF'
{
  "config": {
    "total_divisorias": 6,
    "angulo_por_dose": 30
  },
  "agenda": [
    {"hora": "08:00", "disco": 1, "dose_index": 1, "nome": "Dipirona"},
    {"hora": "14:00", "disco": 2, "dose_index": 1, "nome": "Vitamina"}
  ]
}
EOF

mosquitto_pub -h seu.servidor.mqtt.com \
  -t "dispositivo/NexDose_001/config" \
  -f config.json
```

### Via App React Native

```javascript
const enviarConfiguracao = async (deviceID, config) => {
  try {
    await mqttClient.publish(
      `dispositivo/${deviceID}/config`,
      JSON.stringify(config),
      { qos: 1, retain: true }
    );
    console.log('Configuração enviada com sucesso!');
  } catch (error) {
    console.error('Erro ao enviar configuração:', error);
  }
};

// Uso:
const config = {
  config: {
    total_divisorias: 6,
    angulo_por_dose: 30
  },
  agenda: [
    {
      hora: "08:00",
      disco: 1,
      dose_index: 1,
      nome: "Dipirona 500mg"
    },
    {
      hora: "14:00",
      disco: 2,
      dose_index: 1,
      nome: "Vitamina D"
    }
  ]
};

enviarConfiguracao("NexDose_001", config);
```

---

## 🔔 Eventos Publicados

### 1. Dose Dispensada Automaticamente

**Tópico:** `dispositivo/NexDose_001/status`

```json
{
  "evento": "dose_agendada_executada",
  "disco": 1,
  "dose_index": 1,
  "nome": "Dipirona 500mg",
  "horario_planejado": "08:00",
  "timestamp": "2026-05-27T08:00:15Z",
  "confirmado_pela_gaveta": false
}
```

### 2. Dose Coletada (Confirmação)

```json
{
  "evento": "dose_coletada",
  "disco": 1,
  "dose_index": 1,
  "timestamp": "2026-05-27T08:00:45Z",
  "confirmado_pela_gaveta": true
}
```

### 3. Alerta de Coleta Atrasada

```json
{
  "evento": "alerta_coleta",
  "disco": 1,
  "dose_index": 1,
  "mensagem": "Medicação não foi coletada em 30 minutos",
  "timestamp": "2026-05-27T08:30:15Z"
}
```

---

## 🔍 Monitorando os Agendamentos

### Via Serial Monitor

Abra o Serial Monitor (115200 baud) e você verá:

```
========== NexDose ESP32 INICIANDO ==========

Sincronizando hora com NTP...
✓ Hora sincronizada com sucesso!
Hora atual do sistema: 07:59:45

Conectando MQTT... Conectado!
Inscrito em: dispositivo/NexDose_001/config

========== SETUP COMPLETADO ==========

✓ Configuração recebida: 3 medicações agendadas
✓ Config: 6 divisórias, 30° por dose

========== AGENDAMENTOS ATIVOS ==========
1. 08:00 - Disco 1 (Dose 1) - Dipirona 500mg
2. 14:00 - Disco 2 (Dose 1) - Vitamina D
3. 20:00 - Disco 1 (Dose 2) - Dipirona 500mg
========================================

[Aguardando...]

🕐 [AGENDAMENTO] Horário atingido: 08:00
   Medicamento: Dipirona 500mg (Disco 1, Dose 1)
→ Disparando dose agendada...
Disparando dose: Servo 1, Índice 1
✓ Dose dispensada com sucesso!
✓ Dose agendada publicada: {"evento":"dose_agendada_executada",...}
```

### Via MQTT Subscription

```bash
mosquitto_sub -h seu.servidor.mqtt.com \
  -t "dispositivo/NexDose_001/status"
```

---

## ⚙️ Funcionalidades Implementadas

- ✅ **Sincronização NTP**: Hora atualizada via WiFi
- ✅ **Ressincronização automática**: A cada 1 hora
- ✅ **Armazenamento de agendamentos**: Até 20 medicações
- ✅ **Dispensação automática**: Nos horários corretos
- ✅ **Resetar diariamente**: Agendamentos voltam ao estado "não executado"
- ✅ **Publicação de eventos**: Cada ação gera evento MQTT
- ✅ **Confirmação de coleta**: Sensor HC-SR04 valida
- ✅ **Alertas**: Se medicação não for coletada em 30 min

---

## 🐛 Troubleshooting

### Problema: ESP32 não sincroniza hora

**Causas:**
- WiFi não conectado
- NTP bloqueado por firewall
- Hora do sistema muito desatualizada

**Solução:**
```
1. Verificar WiFi: Serial Monitor mostra "WiFi conectado"
2. Verificar firewall: Portas NTP (123) deve estar aberta
3. Usar outro servidor NTP: time.google.com, time.cloudflare.com
```

### Problema: Agendamentos não executam

**Causas:**
- Hora não foi sincronizada (`hora_sincronizada = false`)
- Horário no JSON está incorreto (formato HH:MM inválido)
- Disco/dose_index fora do intervalo

**Solução:**
```
1. Verificar Serial Monitor: deve mostrar "Hora sincronizada!"
2. Verificar JSON: formato "08:00" (não "8:00" ou "08h00")
3. Verificar disco: deve ser 1, 2 ou 3
4. Verificar dose_index: deve ser <= total_divisorias
```

### Problema: Agendamentos executam múltiplas vezes

**Causa:**
- Flag `executado_hoje` não funciona corretamente

**Solução:**
```
Reiniciar ESP32 e reenviar configuração
```

---

## 📊 Exemplo Prático Completo

### Cenário: Idoso com 3 medicamentos diferentes

**Medicação 1 - Pressão (Disco 1):**
- Horário: 08:00 e 20:00 (2x ao dia)
- Compartimentos: 1 e 2

**Medicação 2 - Diabetes (Disco 2):**
- Horário: 07:00, 13:00, 19:00 (3x ao dia)
- Compartimentos: 1, 2, 3

**Medicação 3 - Vitamina (Disco 3):**
- Horário: 09:00 (1x ao dia)
- Compartimento: 1

**JSON a enviar:**

```json
{
  "config": {
    "total_divisorias": 6,
    "angulo_por_dose": 30
  },
  "agenda": [
    {
      "hora": "07:00",
      "disco": 2,
      "dose_index": 1,
      "nome": "Diabetes - dose 1"
    },
    {
      "hora": "08:00",
      "disco": 1,
      "dose_index": 1,
      "nome": "Pressão - dose 1"
    },
    {
      "hora": "09:00",
      "disco": 3,
      "dose_index": 1,
      "nome": "Vitamina D - dose única"
    },
    {
      "hora": "13:00",
      "disco": 2,
      "dose_index": 2,
      "nome": "Diabetes - dose 2"
    },
    {
      "hora": "19:00",
      "disco": 2,
      "dose_index": 3,
      "nome": "Diabetes - dose 3"
    },
    {
      "hora": "20:00",
      "disco": 1,
      "dose_index": 2,
      "nome": "Pressão - dose 2"
    }
  ]
}
```

---

## 📈 Fluxo do Dia

```
07:00 → Dispensa Diabetes (Disco 2)
08:00 → Dispensa Pressão (Disco 1)
09:00 → Dispensa Vitamina (Disco 3)
13:00 → Dispensa Diabetes (Disco 2)
19:00 → Dispensa Diabetes (Disco 2)
20:00 → Dispensa Pressão (Disco 1)
```

---

## ✅ Checklist para Implementação

- [ ] WiFi configurado e conectando
- [ ] NTP sincronizando corretamente
- [ ] JSON validado (sem erros de sintaxe)
- [ ] Discos e doses configurados corretamente
- [ ] MQTT broker recebendo mensagens
- [ ] Agendamentos aparecem no Serial Monitor
- [ ] Medicações são dispensadas nos horários corretos
- [ ] Sensor detecta coleta
- [ ] Eventos são publicados no MQTT
- [ ] App recebe os eventos

---

## 🎯 Próximos Passos

1. **Atualizar App React Native** para calcular horários a partir de receita
2. **Adicionar interface visual** para ver agendamentos no app
3. **Implementar notificações push** quando medicação está disponível
4. **Adicionar histórico completo** com timestamps e confirmações
5. **Integrar com API de receita médica** para preenchimento automático

---

**Versão:** 1.0  
**Data:** 2026-05-27  
**Status:** ✅ Pronto para Uso

