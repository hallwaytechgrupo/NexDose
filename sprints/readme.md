# Tabelas de controle das atividades das sprints 2 e 3:

## Sprint 2
| Atividade | Descrição | Pontos (Poker) |
| :--- | :--- | :---: |
| **Configuração de Broker MQTT** | Configurar o servidor (ex: Mosquitto ou Adafruit IO) para troca de mensagens entre App e IoT. | 3 |
| **Lógica de Agendamento (Backend)** | Desenvolver a função que processa os horários salvos e envia o comando de "liberar" para o hardware. | 5 |
| **Firmware: Controle de Atuador** | Codificar a ativação do servo motor/esteira no ESP32/Arduino para dispensar a dose física. | 5 |
| **Integração de Banco de Dados** | Substituir os dados "mocados" do App por chamadas reais (Firebase/Supabase) para salvar horários. | 5 |
| **Feedback de Sensor (Presença)** | Implementar sensor (infravermelho ou ultrassônico) para detectar se o remédio foi retirado do bocal. | 3 |
| **Aviso Sonoro Local** | Implementar a ativação do Buzzer no dispositivo no horário programado. | 2 |
| **Refinamento Front** | Refinar o Front com base no protótipo já realizado e entregue. | 2 |
| **Entrega e refinamento documentação UML** | Entregar os diagramas e refinar de acordo com o que foi desenvolvido até o momento, seguindo padrão UML | 5 |
| **Total da Sprint** | | **30** |


## Sprint 3

| Atividade | Descrição | Pontos (Poker) |
| :--- | :--- | :---: |
| **Sistema de Notificações Push** | Configurar o app para alertar o celular caso o sensor não detecte a retirada da dose após X minutos. | 5 |
| **Geração de Histórico (Logs)** | Criar a lógica que grava "Dose Tomada", "Dose Atrasada" ou "Dispenser Vazio" no banco de dados. | 3 |
| **Interface de Relatórios** | Desenvolver a tela de histórico no aplicativo com filtros de data e status da medicação. | 3 |
| **Sinalização Visual (LEDs Status)** | Implementar LEDs no dispositivo (Verde: OK, Vermelho: Atrasado/Erro, Azul: Conectado). | 2 |
| **Tratamento de Falha de Conexão** | Criar rotina para que o dispositivo funcione offline (RTC - Real Time Clock) se o Wi-Fi cair. | 5 |
| **Teste de Estresse e Calibração** | Testar a precisão da liberação física e a latência das notificações. | 3 |
| **Documentação Final** | Manual de uso e diagrama final de montagem. | 2 |
| **Total da Sprint** | | **23** |


** as atividades aqui mensionadas estão sugeitas a alterações ou mesmo abandono, de acordo com o andamento do projeto e o contato junto ao cliente ou focalpoint **