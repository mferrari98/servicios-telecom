#!/bin/bash

echo "🧹 Limpiando Docker para instalación limpia..."
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Paso 1: Deteniendo y eliminando contenedores...${NC}"
# Detener y eliminar todos los contenedores
docker stop $(docker ps -aq) 2>/dev/null || echo "No hay contenedores corriendo"
docker rm $(docker ps -aq) 2>/dev/null || echo "No hay contenedores para eliminar"

echo -e "\n${BLUE}Paso 2: Eliminando imágenes del proyecto...${NC}"
# Eliminar imágenes relacionadas con el proyecto
docker rmi servicios-telecom_nginx 2>/dev/null || echo "No existe imagen nginx del proyecto"
docker rmi servicios-telecom_portal-servicios 2>/dev/null || echo "No existe imagen portal-servicios del proyecto"
docker rmi servicios-telecom_sistema-guardias 2>/dev/null || echo "No existe imagen sistema-guardias del proyecto"

echo -e "\n${BLUE}Paso 3: Eliminando imágenes huérfanas...${NC}"
# Eliminar imágenes huérfanas (dangling images)
docker rmi $(docker images -f "dangling=true" -q) 2>/dev/null || echo "No hay imágenes huérfanas"

echo -e "\n${BLUE}Paso 4: Limpiando caché de Docker...${NC}"
# Limpiar caché de construcción
docker builder prune -f

echo -e "\n${BLUE}Paso 5: Eliminando volúmenes no utilizados...${NC}"
# Eliminar volúmenes no utilizados (con precaución)
docker volume prune -f

echo -e "\n${BLUE}Paso 6: Limpiando redes no utilizadas...${NC}"
# Eliminar redes no utilizadas
docker network prune -f

echo -e "\n${GREEN}✅ Limpieza completada!${NC}"

echo ""
echo -e "${YELLOW}Espacio liberado:${NC}"
docker system df

echo ""
echo -e "${BLUE}💡 Para una limpieza completa (CUIDADO - elimina TODO):${NC}"
echo "  docker system prune -a --volumes"
echo ""
echo -e "${BLUE}🚀 Ahora puedes ejecutar:${NC}"
echo "  ./setup.sh"
echo "  docker-compose up --build -d"