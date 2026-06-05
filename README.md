# NexDose Docker Setup

Este repositório tem o backend em Node/Express/TypeScript e o app mobile em Expo.

## Subir com Docker

1. Copie `.env.example` para `.env` se quiser sobrescrever os valores padrão.
2. Execute:

```bash
docker compose up --build
```

Isso sobe:
- PostgreSQL na porta `5432`
- Backend na porta `3000`
- Broker MQTT na porta `1883`

## Modo desenvolvimento

Para hot reload no backend:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

## Health checks

- `GET /health`
- `GET /health/db`

## MQTT

Tópicos usados pelo backend:

- `nexdose/dispenser/+/status`
- `nexdose/dispenser/+/event`
- `nexdose/dispenser/{id}/command`

Payload base esperado:

```json
{
	"eventType": "device_status",
	"timestamp": "2026-05-28T12:00:00.000Z",
	"deviceId": "1",
	"data": {}
}
```

## Frontend

O frontend Expo consome a API pela variável `EXPO_PUBLIC_API_BASE_URL`.
Para rodar localmente com o backend no Docker, use:

```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
```

Se estiver em dispositivo físico, ajuste para o IP da máquina host.