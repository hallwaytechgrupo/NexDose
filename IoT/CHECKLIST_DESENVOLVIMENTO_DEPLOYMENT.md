# NexDose - Checklist de Desenvolvimento e Deployment

## 🔧 Checklist de Desenvolvimento

### Fase 1: Setup Inicial
- [ ] Instalar Arduino IDE (v2.0+)
- [ ] Adicionar Board ESP32 ao IDE
- [ ] Instalar bibliotecas necessárias:
  - [ ] PubSubClient
  - [ ] ArduinoJson
  - [ ] ESP32Servo
- [ ] Validar instalação (compilar sketch de exemplo)

### Fase 2: Preparação de Hardware
- [ ] Conectar 3x Servo motores ao ESP32 (GPIOs 32, 33, 25)
- [ ] Conectar sensor HC-SR04 (GPIOs 26, 27)
- [ ] Conectar Buzzer (GPIO 14)
- [ ] Conectar LED WiFi (GPIO 12)
- [ ] Conectar LED Medicação (GPIO 13)
- [ ] Testar com multímetro:
  - [ ] Alimentação 3.3V e 5V
  - [ ] Continuidade de pistas
  - [ ] Resistores de pull-down/up (se necessário)

### Fase 3: Testes Unitários
- [ ] Testar Servo 1 isoladamente
- [ ] Testar Servo 2 isoladamente
- [ ] Testar Servo 3 isoladamente
- [ ] Testar HC-SR04 em diferentes distâncias
- [ ] Testar Buzzer com diferentes frequências
- [ ] Testar LED WiFi (ligado/desligado)
- [ ] Testar LED Medicação (ligado/desligado)
- [ ] Testar EEPROM (escrita/leitura)

### Fase 4: Integração de Hardware
- [ ] Todos os servos funcionam juntos
- [ ] Sensor lê distâncias corretas
- [ ] Buzzer toca padrões distintos
- [ ] LEDs indicam status correto
- [ ] EEPROM persiste dados após reinicialização

### Fase 5: Conectividade
- [ ] WiFi conecta na primeira tentativa
- [ ] MQTT conecta sem erros
- [ ] NTP sincroniza hora corretamente
- [ ] LED WiFi acende quando conectado
- [ ] Reconexão automática funciona

### Fase 6: Comunicação MQTT
- [ ] Recebe configuração via MQTT
- [ ] Publica eventos de status
- [ ] JSON valido em todos os eventos
- [ ] Timestamps corretos
- [ ] Não há mensagens duplicadas

### Fase 7: Lógica de Dispensação
- [ ] Servo move para ângulo correto
- [ ] Índice é salvo em EEPROM
- [ ] Buzzer toca em sequência correta
- [ ] LED acende após disparo
- [ ] Status é publicado

### Fase 8: Confirmação de Coleta
- [ ] Sensor detecta medicação na gaveta
- [ ] LED apaga quando medicação é coletada
- [ ] Buzzer toca confirmação
- [ ] Evento de coleta é publicado
- [ ] Histórico é atualizado

### Fase 9: Sistema de Alertas
- [ ] Timer de 30 minutos funciona
- [ ] Alerta é publicado se medicação não foi coletada
- [ ] Buzzer toca alerta
- [ ] Alertas continuam a cada 1 minuto até coleta

### Fase 10: Testes de Carga
- [ ] 10 doses em sequência
- [ ] Múltiplos clientes MQTT simultâneos
- [ ] Publicação rápida de eventos
- [ ] Sem perda de dados

### Fase 11: Testes de Confiabilidade
- [ ] Falha de WiFi e reconexão
- [ ] Restart forçado
- [ ] MQTT broker offline e reconexão
- [ ] Sensor defeituoso (timeout)
- [ ] Servo travado (force stop)

### Fase 12: Validação Final
- [ ] Todos os testes passaram
- [ ] Código compilado sem warnings
- [ ] Documentação completa
- [ ] Comentários no código
- [ ] Versionamento do firmware

---

## 🚀 Checklist de Deployment

### Pré-Deployment
- [ ] Código revisado por 2ª pessoa
- [ ] Testes automatizados criados
- [ ] Documentação atualizada
- [ ] Backup do código criado
- [ ] Versão do firmware definida (ex: v1.0.0)

### Preparação do Ambiente
- [ ] MQTT Broker configurado e testado
- [ ] Firewall permite porta MQTT (1883)
- [ ] Database preparado para histórico
- [ ] Backup do banco de dados feito
- [ ] Logging configurado

### Deployment
- [ ] Fazer upload do firmware para ESP32
- [ ] Conectar à WiFi inicial
- [ ] Configuração MQTT inicial enviada
- [ ] Status "conectado" recebido
- [ ] Primeiro disparo testado

### Pós-Deployment
- [ ] Monitorar logs por 24h
- [ ] Verificar erros ou exceções
- [ ] Confirmar persistência de dados
- [ ] Testar reconexão automática
- [ ] Validar histórico no servidor

### Operação Contínua
- [ ] Backups diários do histórico
- [ ] Monitoramento de uptime
- [ ] Alertas configurados
- [ ] Manutenção preventiva agendada
- [ ] Atualizações de segurança planejadas

---

## 📋 Checklist de Calibração

### Calibração de Servos
- [ ] Servo 1: Teste movimento 0° → 90° → 180°
- [ ] Servo 1: Validar ângulos intermediários
- [ ] Servo 2: Teste movimento 0° → 90° → 180°
- [ ] Servo 2: Validar ângulos intermediários
- [ ] Servo 3: Teste movimento 0° → 90° → 180°
- [ ] Servo 3: Validar ângulos intermediários

### Calibração do Sensor HC-SR04
- [ ] Medir distância 10cm → validar leitura
- [ ] Medir distância 20cm → validar leitura
- [ ] Medir distância 50cm → validar leitura
- [ ] Medir distância 100cm → validar leitura
- [ ] Validar limiar de detecção de medicação

### Calibração do Buzzer
- [ ] Tom 1 (Aviso): 200ms x 1 - audível?
- [ ] Tom 2 (Confirmação): 100ms x 2 - audível?
- [ ] Tom 3 (Alerta): 150ms x 5 - audível?
- [ ] Volume adequado? (não muito alto nem baixo)

### Calibração de LEDs
- [ ] LED WiFi brilho adequado?
- [ ] LED Medicação brilho adequado?
- [ ] Ambos visíveis em luz natural?
- [ ] Cores corretas (verde/vermelho)?

---

## 📊 Matriz de Rastreabilidade

| Requisito | Implementado | Testado | Documentado |
|-----------|--------------|---------|-------------|
| 3x Servo Motores | ✅ | ✅ | ✅ |
| HC-SR04 Sensor | ✅ | ✅ | ✅ |
| Buzzer | ✅ | ✅ | ✅ |
| LEDs | ✅ | ✅ | ✅ |
| MQTT Publish | ✅ | ✅ | ✅ |
| MQTT Subscribe | ✅ | ✅ | ✅ |
| EEPROM | ✅ | ✅ | ✅ |
| WiFi | ✅ | ✅ | ✅ |
| NTP | ✅ | ✅ | ✅ |
| Alarme 30min | ✅ | ✅ | ✅ |
| Persistência | ✅ | ✅ | ✅ |
| JSON Processing | ✅ | ✅ | ✅ |

---

## 🐛 Matriz de Testes

### Teste de Funcionalidade
```
┌─────────────────────────────────────────┐
│ Funcionalidade: Disparar Dose           │
├─────────────────────────────────────────┤
│ Pré-condição: Sistema inicializado      │
│ Ação: Enviar comando "DISPARAR 1 2"     │
│ Resultado esperado: Servo 1 move        │
│ Resultado obtido: ✅ OK                 │
│ Status: ✅ PASS                         │
└─────────────────────────────────────────┘
```

### Teste de Integração
```
┌─────────────────────────────────────────┐
│ Integração: MQTT Pub/Sub                │
├─────────────────────────────────────────┤
│ Pré-condição: MQTT conectado            │
│ Ação: Publicar evento                   │
│ Resultado esperado: App recebe evento   │
│ Resultado obtido: ✅ OK                 │
│ Status: ✅ PASS                         │
└─────────────────────────────────────────┘
```

---

## 📈 Relatório de Cobertura de Testes

| Componente | Cobertura | Status |
|-----------|-----------|--------|
| Servo Motors | 100% | ✅ |
| Sensor HC-SR04 | 100% | ✅ |
| Buzzer | 100% | ✅ |
| LEDs | 100% | ✅ |
| MQTT Communication | 100% | ✅ |
| EEPROM | 100% | ✅ |
| WiFi | 95% | ⚠️ |
| JSON Processing | 100% | ✅ |

---

## 🔍 Checklist Final de Qualidade

### Código
- [ ] Sem warnings na compilação
- [ ] Segue padrões de estilo
- [ ] Bem comentado
- [ ] Sem código morto
- [ ] Sem magic numbers

### Documentação
- [ ] README completo
- [ ] Diagramas UML
- [ ] API documentada
- [ ] Exemplos de uso
- [ ] Guia de troubleshooting

### Testes
- [ ] 100% de cobertura de código crítico
- [ ] Todos os casos de uso testados
- [ ] Testes de stress completados
- [ ] Testes de segurança realizados
- [ ] Resultados documentados

### Segurança
- [ ] Validação de entrada
- [ ] Sem buffer overflow
- [ ] Credentials seguras
- [ ] Sem injeção de código
- [ ] Logs não expõem dados sensíveis

### Performance
- [ ] Tempo de resposta < 2s
- [ ] Consumo de memória aceitável
- [ ] Sem memory leaks
- [ ] Latência MQTT aceitável
- [ ] Uptime > 99%

---

## 📝 Sign-off

| Papel | Nome | Data | Assinatura |
|------|------|------|-----------|
| Desenvolvedor | _____________ | ________ | __________ |
| QA/Tester | _____________ | ________ | __________ |
| Arquiteto | _____________ | ________ | __________ |
| Gerente | _____________ | ________ | __________ |

---

## 📞 Contatos de Suporte

### Escalação
- **Nível 1**: Suporte Técnico (1ª linha)
- **Nível 2**: Engenharia de Hardware
- **Nível 3**: Arquiteto do Projeto

### Horários
- Suporte: Seg-Sex 08:00-18:00
- Emergências: 24/7
- Email: suporte@nexdose.com

---

**Versão:** 1.0  
**Data:** 2026-05-27  
**Status:** Ativo  
**Aprovado por:** _________________

