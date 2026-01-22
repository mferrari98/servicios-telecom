# Servicios Telecom

Orquestador de servicios de telecomunicaciones con Docker Compose.

## Requisitos
- Docker + Docker Compose
- Node.js (para `setup.js` y `actualizar.js`)

## Inicio rapido
```bash
node setup.js
docker-compose up --build -d
```

## Servicios y rutas
- Portal: `/`
- Guardias: `/guardias/`
- EMPA (pedidos): `/pedidos/`
- Reportes: `/reporte/`
- Monitor: `/monitor/`

## Scripts
- `node setup.js`: clona repos y crea `.env`.
- `node actualizar.js`: verifica y actualiza repos.

## Configuracion
- `.env` en la raiz (puertos/hosts de servicios).
- `cont-guardias/.env` (ver `.env.example`).
- `cont-reportespiolis/.env` (ver `example-env`).
- `cont-monitor-recursos`: `MONITOR_API_TOKEN` y `ALLOWED_ORIGINS`.

## Logs
- Consola: `docker-compose logs -f`
- Archivos persistentes:
  - `cont-nginx/logs/access.log`
  - `cont-nginx/logs/error.log`
  - `cont-reportespiolis/logs/app.log`
