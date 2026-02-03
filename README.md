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
- `node setup.js`: inicializa el entorno local. Clona los repos faltantes dentro del monorepo y genera archivos `.env` base si no existen.
- `node actualizar.js`: sincroniza los repos ya clonados (pull/fetch), mostrando el estado de cada servicio.

## Despliegue (resumen)
1. Actualizar el codigo:
   ```bash
   git pull
   node actualizar.js
   ```
2. Construir y levantar servicios:
   ```bash
   docker-compose up --build -d
   ```
3. Verificar logs:
   ```bash
   docker-compose logs -f
   ```

Notas:
- Para un entorno nuevo, ejecutar primero `node setup.js` antes del paso 1.
- Revisar `.env` en la raiz y en cada servicio antes de desplegar.

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
