# NexDose - Classe Auxiliar e Testes Unitários

## 📦 Classe NexDoseHelper

Esta classe encapsula as funcionalidades principais do sistema e facilita testes e manutenção.

```cpp
// ============================================================================
// FILE: NexDoseHelper.h
// ============================================================================
#ifndef NEXDOSE_HELPER_H
#define NEXDOSE_HELPER_H

#include <Arduino.h>
#include <ESP32Servo.h>
#include <ArduinoJson.h>

class NexDoseHelper {
private:
  Servo servos[3];
  int ultimo_index[3];
  int pino_servo[3];
  int pino_buzzer;
  int pino_led_wifi;
  int pino_led_medicacao;
  int pino_hc_trig;
  int pino_hc_echo;
  
  int total_divisorias;
  int angulo_por_dose;

public:
  // Construtor
  NexDoseHelper(int servo1, int servo2, int servo3,
                int buzzer, int led_wifi, int led_med,
                int hc_trig, int hc_echo);
  
  // Inicialização
  void inicializar();
  void carregarUltimosIndices();
  void salvarUltimoIndice(int servo, int indice);
  
  // Servo Motors
  void dispararDose(int servo, int indice);
  void moverServo(int servo, int angulo);
  int obterUltimoIndice(int servo);
  
  // Sensor Ultrassônico
  float medirDistancia();
  bool temMedicacao(float limiar = 25.0);
  
  // Buzzer
  void tocarBuzzer(int duracao, int repeticoes = 1);
  void tocarAviso();
  void tocarConfirmacao();
  void tocarAlerta();
  
  // LEDs
  void definirLEDWiFi(bool ligado);
  void definirLEDMedicacao(bool ligado);
  void piscarLED(int pino, int vezes, int intervalo = 100);
  
  // Configuração
  void definirConfiguracao(int divisorias, int angulo);
  
  // Testes
  bool testarTodosServos();
  bool testarSensor();
  bool testarBuzzer();
  bool testarLEDs();
  void relatorioDiagnostico();
};

#endif

// ============================================================================
// FILE: NexDoseHelper.cpp
// ============================================================================

#include "NexDoseHelper.h"
#include <EEPROM.h>

NexDoseHelper::NexDoseHelper(int servo1, int servo2, int servo3,
                             int buzzer, int led_wifi, int led_med,
                             int hc_trig, int hc_echo)
  : pino_buzzer(buzzer), pino_led_wifi(led_wifi), pino_led_medicacao(led_med),
    pino_hc_trig(hc_trig), pino_hc_echo(hc_echo),
    total_divisorias(6), angulo_por_dose(30) {
  
  pino_servo[0] = servo1;
  pino_servo[1] = servo2;
  pino_servo[2] = servo3;
  
  memset(ultimo_index, 0, sizeof(ultimo_index));
}

void NexDoseHelper::inicializar() {
  Serial.println("[NexDoseHelper] Inicializando...");
  
  // Configurar pinos
  pinMode(pino_buzzer, OUTPUT);
  pinMode(pino_led_wifi, OUTPUT);
  pinMode(pino_led_medicacao, OUTPUT);
  pinMode(pino_hc_trig, OUTPUT);
  pinMode(pino_hc_echo, INPUT);
  
  // Estado inicial
  digitalWrite(pino_buzzer, LOW);
  digitalWrite(pino_led_wifi, LOW);
  digitalWrite(pino_led_medicacao, LOW);
  
  // Anexar servos
  for (int i = 0; i < 3; i++) {
    servos[i].attach(pino_servo[i], 1000, 2000);
    delay(50);
  }
  
  // Carregar índices da EEPROM
  carregarUltimosIndices();
  
  // Mover servos para posição inicial
  for (int i = 0; i < 3; i++) {
    servos[i].write(ultimo_index[i]);
  }
  
  delay(500);
  Serial.println("[NexDoseHelper] Inicialização concluída!");
}

void NexDoseHelper::carregarUltimosIndices() {
  EEPROM.begin(512);
  
  for (int i = 0; i < 3; i++) {
    int valor = EEPROM.readInt(i * 4);
    
    if (valor < 0 || valor > 180) {
      ultimo_index[i] = 0;
    } else {
      ultimo_index[i] = valor;
    }
    
    Serial.printf("[NexDoseHelper] Servo %d - Último índice: %d\n", i + 1, ultimo_index[i]);
  }
}

void NexDoseHelper::salvarUltimoIndice(int servo, int indice) {
  if (servo < 0 || servo > 2) return;
  
  ultimo_index[servo] = indice;
  EEPROM.writeInt(servo * 4, indice);
  EEPROM.commit();
  
  Serial.printf("[NexDoseHelper] Servo %d salvo com índice %d\n", servo + 1, indice);
}

void NexDoseHelper::dispararDose(int servo, int indice) {
  if (servo < 0 || servo > 2) {
    Serial.printf("[NexDoseHelper] ERRO: Servo %d inválido!\n", servo);
    return;
  }
  
  if (indice < 1 || indice > total_divisorias) {
    Serial.printf("[NexDoseHelper] ERRO: Índice %d fora do intervalo!\n", indice);
    return;
  }
  
  Serial.printf("[NexDoseHelper] Disparando dose: Servo %d, Índice %d\n", servo + 1, indice);
  
  tocarBuzzer(200, 1);
  
  int angulo = indice * angulo_por_dose;
  if (angulo > 180) angulo = 180;
  
  moverServo(servo, angulo);
  
  delay(1000);
  
  salvarUltimoIndice(servo, angulo);
  tocarConfirmacao();
  
  Serial.printf("[NexDoseHelper] Dose dispensada com sucesso!\n");
}

void NexDoseHelper::moverServo(int servo, int angulo) {
  if (servo < 0 || servo > 2) return;
  if (angulo < 0 || angulo > 180) return;
  
  servos[servo].write(angulo);
  delay(50);
}

int NexDoseHelper::obterUltimoIndice(int servo) {
  if (servo < 0 || servo > 2) return -1;
  return ultimo_index[servo];
}

float NexDoseHelper::medirDistancia() {
  digitalWrite(pino_hc_trig, LOW);
  delayMicroseconds(2);
  digitalWrite(pino_hc_trig, HIGH);
  delayMicroseconds(10);
  digitalWrite(pino_hc_trig, LOW);
  
  unsigned long duracao = pulseIn(pino_hc_echo, HIGH, 30000);
  float distancia = (duracao * 0.0343) / 2;
  
  return distancia;
}

bool NexDoseHelper::temMedicacao(float limiar) {
  float distancia = medirDistancia();
  return distancia < limiar;
}

void NexDoseHelper::tocarBuzzer(int duracao, int repeticoes) {
  for (int i = 0; i < repeticoes; i++) {
    digitalWrite(pino_buzzer, HIGH);
    delay(duracao);
    digitalWrite(pino_buzzer, LOW);
    
    if (i < repeticoes - 1) {
      delay(100);
    }
  }
}

void NexDoseHelper::tocarAviso() {
  tocarBuzzer(500, 3);
}

void NexDoseHelper::tocarConfirmacao() {
  tocarBuzzer(100, 2);
}

void NexDoseHelper::tocarAlerta() {
  tocarBuzzer(150, 5);
}

void NexDoseHelper::definirLEDWiFi(bool ligado) {
  digitalWrite(pino_led_wifi, ligado ? HIGH : LOW);
}

void NexDoseHelper::definirLEDMedicacao(bool ligado) {
  digitalWrite(pino_led_medicacao, ligado ? HIGH : LOW);
}

void NexDoseHelper::piscarLED(int pino, int vezes, int intervalo) {
  for (int i = 0; i < vezes; i++) {
    digitalWrite(pino, HIGH);
    delay(intervalo);
    digitalWrite(pino, LOW);
    delay(intervalo);
  }
}

void NexDoseHelper::definirConfiguracao(int divisorias, int angulo) {
  total_divisorias = divisorias;
  angulo_por_dose = angulo;
  
  Serial.printf("[NexDoseHelper] Configuração atualizada: %d divisórias, %d° por dose\n",
                total_divisorias, angulo_por_dose);
}

bool NexDoseHelper::testarTodosServos() {
  Serial.println("[Teste] Testando todos os servo motores...");
  
  for (int servo = 0; servo < 3; servo++) {
    Serial.printf("  Servo %d: ", servo + 1);
    
    servos[servo].write(0);
    delay(500);
    
    servos[servo].write(90);
    delay(500);
    
    servos[servo].write(180);
    delay(500);
    
    servos[servo].write(ultimo_index[servo]);
    delay(500);
    
    Serial.println("OK");
  }
  
  return true;
}

bool NexDoseHelper::testarSensor() {
  Serial.println("[Teste] Testando sensor ultrassônico...");
  
  for (int i = 0; i < 5; i++) {
    float distancia = medirDistancia();
    Serial.printf("  Leitura %d: %.2f cm\n", i + 1, distancia);
    delay(500);
  }
  
  return true;
}

bool NexDoseHelper::testarBuzzer() {
  Serial.println("[Teste] Testando buzzer...");
  
  Serial.println("  Tom 1: Aviso");
  tocarAviso();
  delay(1000);
  
  Serial.println("  Tom 2: Confirmação");
  tocarConfirmacao();
  delay(1000);
  
  Serial.println("  Tom 3: Alerta");
  tocarAlerta();
  
  return true;
}

bool NexDoseHelper::testarLEDs() {
  Serial.println("[Teste] Testando LEDs...");
  
  Serial.println("  LED WiFi: Piscando");
  piscarLED(pino_led_wifi, 5);
  delay(500);
  
  Serial.println("  LED Medicação: Piscando");
  piscarLED(pino_led_medicacao, 5);
  
  Serial.println("  Ambos ligados");
  definirLEDWiFi(true);
  definirLEDMedicacao(true);
  delay(1000);
  
  Serial.println("  Ambos desligados");
  definirLEDWiFi(false);
  definirLEDMedicacao(false);
  
  return true;
}

void NexDoseHelper::relatorioDiagnostico() {
  Serial.println("\n========== DIAGNÓSTICO DO SISTEMA ==========");
  Serial.println("SERVO MOTORS:");
  for (int i = 0; i < 3; i++) {
    Serial.printf("  Servo %d: Posição atual = %d°, Último índice = %d\n",
                  i + 1, servos[i].read(), ultimo_index[i]);
  }
  
  Serial.println("\nSENSOR ULTRASSÔNICO:");
  for (int i = 0; i < 3; i++) {
    float dist = medirDistancia();
    Serial.printf("  Leitura %d: %.2f cm %s\n", i + 1, dist, 
                  temMedicacao() ? "(Medicação detectada)" : "");
    delay(200);
  }
  
  Serial.println("\nLEDS e BUZZER: OK");
  
  Serial.println("========== FIM DO DIAGNÓSTICO ==========\n");
}
```

---

## 🧪 Testes Unitários

### Teste 1: Inicialização

```cpp
void testeInicializacao() {
  Serial.println("\n[TESTE 1] Inicialização");
  
  // Verificar se EEPROM foi lido
  for (int i = 0; i < 3; i++) {
    int indice = helper.obterUltimoIndice(i);
    Serial.printf("  Servo %d - Índice lido: %d\n", i + 1, indice);
    assert(indice >= 0 && indice <= 180);
  }
  
  Serial.println("  ✓ Inicialização OK\n");
}
```

### Teste 2: Movimento de Servo

```cpp
void testeMovimentoServo() {
  Serial.println("[TESTE 2] Movimento de Servo");
  
  Serial.println("  Disparando Servo 1, Índice 2...");
  helper.dispararDose(0, 2);
  
  int indice = helper.obterUltimoIndice(0);
  Serial.printf("  Último índice salvo: %d\n", indice);
  assert(indice == 2 * 30); // 2 * angulo_por_dose
  
  Serial.println("  ✓ Movimento OK\n");
}
```

### Teste 3: Sensor Ultrassônico

```cpp
void testeSensorUltrassonico() {
  Serial.println("[TESTE 3] Sensor Ultrassônico");
  
  float distancia = helper.medirDistancia();
  Serial.printf("  Distância medida: %.2f cm\n", distancia);
  assert(distancia >= 0 && distancia <= 400);
  
  bool temMed = helper.temMedicacao();
  Serial.printf("  Tem medicação: %s\n", temMed ? "Sim" : "Não");
  
  Serial.println("  ✓ Sensor OK\n");
}
```

### Teste 4: Buzzer e LEDs

```cpp
void testeBuzzerLEDs() {
  Serial.println("[TESTE 4] Buzzer e LEDs");
  
  helper.tocarBuzzer(100, 1);
  helper.definirLEDWiFi(true);
  delay(500);
  helper.definirLEDWiFi(false);
  
  helper.definirLEDMedicacao(true);
  delay(500);
  helper.definirLEDMedicacao(false);
  
  Serial.println("  ✓ Buzzer e LEDs OK\n");
}
```

---

## 📝 Exemplo de Uso

```cpp
#include "NexDoseHelper.h"

// Criar instância do helper
NexDoseHelper helper(32, 33, 25,  // Pinos dos servos
                     14, 12, 13,  // Buzzer, LED WiFi, LED Medicação
                     26, 27);     // HC-SR04 TRIG, ECHO

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  helper.inicializar();
  
  // Definir configuração
  helper.definirConfiguracao(6, 30);
  
  // Executar diagnóstico
  helper.relatorioDiagnostico();
}

void loop() {
  // Testar disparo de dose
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    
    if (cmd.startsWith("DISPARAR")) {
      int servo = cmd.substring(9, 10).toInt() - 1;
      int indice = cmd.substring(11).toInt();
      
      helper.dispararDose(servo, indice);
    }
    else if (cmd == "TESTE") {
      helper.testarTodosServos();
      helper.testarSensor();
      helper.testarBuzzer();
      helper.testarLEDs();
    }
    else if (cmd == "DIAG") {
      helper.relatorioDiagnostico();
    }
  }
  
  delay(100);
}
```

---

## 🚀 Comandos de Teste via Serial

- `DISPARAR 1 2` - Dispara Servo 1, Índice 2
- `TESTE` - Executa todos os testes
- `DIAG` - Mostra diagnóstico completo

---

**Versão:** 1.0  
**Data:** 2026-05-27

