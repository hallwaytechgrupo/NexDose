

# NexDose 💊

> **Inovação em IoT para monitoramento e adesão ao tratamento medicamentoso.**

O **NexDose** é uma solução de saúde inteligente (HealthTech) projetada para solucionar um dos maiores desafios do envelhecimento populacional: a gestão complexa de múltiplos medicamentos. Unindo hardware (IoT) e software, garantimos que o paciente certo tome a dose certa na hora certa.

-----

## 📋 Sobre o Projeto

O envelhecimento e o aumento de doenças crônicas exigem acompanhamento contínuo. O NexDose mitiga erros de dosagem e esquecimentos através de:

  * **Dispositivo IoT:** Caixa organizadora inteligente com compartimentos automatizados.
  * **App Mobile:** Interface intuitiva para configuração e acompanhamento em tempo real.
  * **Monitoramento Remoto:** Notificações instantâneas para cuidadores em caso de não conformidade.

-----

## 🛠️ Tecnologias Utilizadas

### **Mobile & Cloud**

  * **React Native**: Framework para desenvolvimento cross-platform (iOS/Android).
  * **TypeScript**: Garantia de tipagem estática e maior manutenibilidade.
  * **Node.js / Firebase**: Para persistência e notificações push.

### **Hardware (IoT)**

  * **ESP32**: Microcontrolador com Wi-Fi e Bluetooth integrado.
  * **Sensores & Atuadores**: Sensores de presença/abertura, Buzzer (alerta sonoro) e Servomotores (bloqueio de compartimentos).
  * **C++ / Arduino IDE**: Linguagem base para o firmware do dispositivo.

-----

## 🚀 Funcionalidades Principais

1.  **Acesso Restrito:** Apenas o compartimento do horário atual é desbloqueado, evitando sobredosagem.
2.  **Alertas Sonoros:** Notificação física no dispositivo no momento exato da medicação.
3.  **Janela de Tempo Configurável:** Tolerância ajustável para a retirada do fármaco.
4.  **Escalonamento de Alerta:** Se o medicamento não for retirado, o responsável recebe uma notificação via App.
5.  **Dashboard de Adesão:** Histórico completo de ingestão para análise médica.

-----

## 🏗️ Arquitetura do Sistema

A solução é composta por três camadas integradas:

  * **Device:** O kit ESP32 gerencia os sensores e trava/destrava os compartimentos.
  * **Backend:** Sincroniza os horários agendados no App com o hardware.
  * **Application:** Onde o usuário ou cuidador cadastra as receitas e monitora o status.

-----

## 👥 Equipe (Sprint Team)

Conheça os responsáveis pelo desenvolvimento do NexDose:

| Cargo | Nome | GitHub |
| :--- | :--- | :--- |
| **Product Owner** | Mario Cesar | [Link](https://www.github.com/MarioC3sar) |
| **Scrum Master** | Marcos Oliveira | [Link](https://www.github.com/marcknero) |
| **Developer** | Vinicius Lemes | [Link](https://www.github.com/viniilemes) |
| **Developer** | Christopher Costa | [Link](https://www.github.com/chriskryon) |

-----

## 🔧 Instalação e Configuração (Em desenvolvimento)

### **Pré-requisitos**

  * Node.js e Yarn/NPM.
  * Ambiente React Native configurado.
  * Arduino IDE ou VS Code + PlatformIO (para o ESP32).

### **Executando o App**

```bash
# Instalar dependências
npm install

# Iniciar o Metro Bundler
npx react-native start

# Executar no Android/iOS
npx react-native run-android
```

-----

## 📄 Licença

Este projeto é para fins acadêmicos e de desenvolvimento tecnológico.

-----
