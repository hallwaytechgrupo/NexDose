## Estrutura inicial de comunicação:

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

