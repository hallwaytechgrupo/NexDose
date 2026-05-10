# NexDose React Native

Este projeto foi convertido de um conjunto de protótipos HTML para uma base mobile em React Native usando Expo.
Atualmente está configurado para Expo SDK 54.

## Rodando o app

1. `npm install`
2. `npm run start`
3. Abra no Expo Go, Android Emulator, iOS Simulator ou web.

## Requisitos

- Node.js 20.19.x ou superior compatível com Expo SDK 54
- Ambiente React Native + Expo configurado
- Arduino IDE ou VS Code + PlatformIO para o ESP32

## Estrutura

- `App.tsx`: ponto de entrada do app
- `src/AppShell.tsx`: shell principal com topo, abas e troca de telas
- `src/screens/*`: telas mobile equivalentes aos protótipos
- `src/components/Primitives.tsx`: componentes reutilizáveis
- `src/theme/tokens.ts`: tokens visuais do design system
- `backend/`: API em TypeScript para o app

## Docker

Agora existe uma base simples de Docker para o backend.

### Desenvolvimento com hot reload

```bash
docker compose -f docker-compose.dev.yml up
```

Esse fluxo monta o código do backend no container e usa `npm run dev` com hot reload.

### Subir o backend com Docker

1. Copie `.env.example` para `.env` e preencha `GOOGLE_MAPS_API_KEY`
2. Execute:

```bash
docker compose up --build
```

O backend ficará disponível em `http://localhost:3000`.

### Arquivos adicionados

- `backend/Dockerfile`: imagem do backend em produção
- `docker-compose.yml`: orquestração simples do backend
- `backend/.dockerignore`: reduz o contexto de build
- `.env.example`: exemplo das variáveis necessárias

## Documentação técnica

Veja os diagramas arquiteturais do sistema:

- [Diagrama de Classes](./docs/diagrams/class-diagram.md) - Entidades e relações do sistema
- [Diagrama de Casos de Uso](./docs/diagrams/use-case-diagram.md) - Funcionalidades por ator
- [Diagrama de Sequência](./docs/diagrams/sequence-diagram.md) - Fluxo de registro e lembretes

## Observação

Os arquivos HTML originais dentro de `stitch_nexdose_iot_health_ecosystem/` foram mantidos como referência visual.

QRCode para instalar o apk para testes.
<img width="596" height="378" alt="image" src="https://github.com/user-attachments/assets/277a6fce-4696-4d01-ba44-7efe84b00193" />

