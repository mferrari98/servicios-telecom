# Servicios Telecom

Proyecto de orquestación de servicios de telecomunicaciones usando Docker Compose.

## Estructura del Proyecto

```
servicios-telecom/
├── docker-compose.yml     # Orquestación de servicios
├── scripts/               # Scripts de gestión (Node.js)
│   ├── package.json       # Dependencias de los scripts
│   ├── setup.js          # Script de configuración inicial
│   └── actualizar.js  # Gestor de actualizaciones
├── cont-nginx/            # Configuración de Nginx
├── cont-portal/           # Aplicación React (Portal de Servicios)
├── cont-guardias/         # Aplicación Flask (Sistema de Guardias)
└── logs/                  # Logs de nginx
```

## Configuración Inicial

### 1. Instalar dependencias de los scripts

```bash
cd scripts
npm install
```

### 2. Configurar el proyecto

```bash
npm run setup
```

Este comando:
- Clona los repositorios necesarios (cont-nginx, cont-portal, cont-guardias)
- Configura los archivos .env requeridos
- Muestra un resumen de la configuración

## Uso

### Iniciar los servicios

```bash
docker-compose up --build -d
```

### Verificar y actualizar repositorios

```bash
node actualizar.js
```

### Comandos útiles

```bash
# Ver logs de todos los servicios
docker-compose logs -f

# Ver logs de un servicio específico
docker-compose logs -f nginx

# Ver estado de los contenedores
docker-compose ps

# Detener todos los servicios
docker-compose down

# Reiniciar los servicios
docker-compose restart
```

## Contenedores

- **cont-nginx**: Servidor Nginx como proxy reverso (puertos 80, 443)
- **cont-portal**: Portal de servicios React (puerto interno 80)
- **cont-guardias**: Sistema de guardias Flask (puerto interno 5000)

## Acceso a los Servicios

- **Portal de Servicios**: http://localhost
- **Sistema de Guardias**: http://localhost/guardias

## Scripts

### setup.js
Configura el proyecto inicialmente clonando los repositorios necesarios y configurando las variables de entorno.

### actualizar.js
Verifica el estado de todos los repositorios (incluyendo el principal), detecta cambios locales, actualizaciones disponibles y gestiona la actualización con stash automático de cambios locales.

## Variables de Entorno

El archivo `.env` se crea automáticamente al ejecutar `npm run setup`. Las variables principales son:

- `NGINX_HTTP_PORT`: Puerto HTTP para Nginx (default: 80)
- `NGINX_HTTPS_PORT`: Puerto HTTPS para Nginx (default: 443)
- `FLASK_HOST`: Host del contenedor Flask (default: cont-guardias)
- `FLASK_PORT`: Puerto del contenedor Flask (default: 5000)
- `PORTAL_SERVICIOS_HOST`: Host del portal (default: cont-portal)
- `PORTAL_SERVICIOS_PORT`: Puerto del portal (default: 80)