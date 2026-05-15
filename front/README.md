# NexDose React Native

Este projeto foi convertido de um conjunto de prototipos HTML para uma base mobile em React Native usando Expo.
Atualmente esta configurado para Expo SDK 54.

## Rodando

1. `npm install`
2. `npm run start`
3. Abra no Expo Go, Android Emulator, iOS Simulator ou web.

## Variaveis de ambiente (dev/build)

- `EXPO_PUBLIC_API_BASE_URL`: URL do backend (ex: `http://192.168.x.x:3000`).
- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`: chave do Google Maps SDK (Android). Sem ela o mapa pode ficar em branco/cinza no app.

## Requisitos

- Node.js 20.19.x ou superior compativel com Expo SDK 54.

## Estrutura

- `App.tsx`: ponto de entrada do app.
- `src/AppShell.tsx`: shell principal com topo, abas e troca de telas.
- `src/screens/*`: telas mobile equivalentes aos prototipos.
- `src/components/Primitives.tsx`: componentes reutilizaveis.
- `src/theme/tokens.ts`: tokens visuais do design system.

## Observacao

Os arquivos HTML originais dentro de `stitch_nexdose_iot_health_ecosystem/` foram mantidos como referencia visual.


QRCode para instalar o apk para testes.
<img width="596" height="378" alt="image" src="https://github.com/user-attachments/assets/277a6fce-4696-4d01-ba44-7efe84b00193" />

