#!/bin/bash

# Script de despliegue para AWS Lightsail
# Ejecuta este script desde el directorio raíz del proyecto

set -e  # Salir si hay algún error

PROJECT_DIR="/projects/project_admingestion_app"
API_DIR="$PROJECT_DIR/api"
FRONTEND_DIR="$PROJECT_DIR/frontend"

echo "=========================================="
echo "Despliegue de Panadería La Paz"
echo "=========================================="
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -d "$API_DIR" ] || [ ! -d "$FRONTEND_DIR" ]; then
    echo "Error: No se encontraron los directorios api/ o frontend/"
    echo "Asegúrate de ejecutar este script desde el directorio raíz del proyecto"
    exit 1
fi

# 1. Verificar que PostgreSQL está configurado
echo "1. Verificando PostgreSQL..."
if ! sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw panaderia_la_paz; then
    echo "   ⚠ Base de datos no encontrada. Ejecuta primero: bash scripts/setup-postgres.sh"
    exit 1
fi
echo "   ✓ PostgreSQL configurado"

# 2. Instalar dependencias del API
echo ""
echo "2. Instalando dependencias del API..."
cd $API_DIR
npm install --production=false
echo "   ✓ Dependencias del API instaladas"

# 3. Configurar variables de entorno del API
echo ""
echo "3. Configurando variables de entorno del API..."
if [ ! -f "$API_DIR/.env" ]; then
    echo "   ⚠ Archivo .env no encontrado. Creando desde env.example..."
    cp $API_DIR/env.example $API_DIR/.env
    echo ""
    echo "   ⚠ IMPORTANTE: Edita $API_DIR/.env con tus credenciales de base de datos"
    echo "   Ejecuta: nano $API_DIR/.env"
    read -p "   Presiona Enter cuando hayas configurado el .env..."
fi
echo "   ✓ Variables de entorno configuradas"

# 4. Generar Prisma Client y ejecutar migraciones
echo ""
echo "4. Configurando base de datos con Prisma..."
cd $API_DIR
npm run prisma:generate
npm run prisma:migrate deploy
echo "   ✓ Base de datos configurada"

# 5. Compilar el API
echo ""
echo "5. Compilando el API..."
cd $API_DIR
npm run build
echo "   ✓ API compilado"

# 6. Instalar dependencias del Frontend
echo ""
echo "6. Instalando dependencias del Frontend..."
cd $FRONTEND_DIR
npm install --production=false
echo "   ✓ Dependencias del Frontend instaladas"

# 7. Configurar variables de entorno del Frontend
echo ""
echo "7. Configurando variables de entorno del Frontend..."
if [ ! -f "$FRONTEND_DIR/.env.local" ]; then
    echo "   ⚠ Archivo .env.local no encontrado. Creando..."
    
    # Obtener la IP pública del servidor
    SERVER_IP=$(curl -s ifconfig.me || curl -s ipinfo.io/ip || echo "TU_IP_SERVIDOR")
    
    cat > $FRONTEND_DIR/.env.local << EOF
NEXT_PUBLIC_API_URL=http://${SERVER_IP}:3000
EOF
    echo "   ✓ Variables de entorno creadas"
    echo "   ⚠ Verifica que NEXT_PUBLIC_API_URL en .env.local sea correcta"
else
    echo "   ✓ Variables de entorno ya configuradas"
fi

# 8. Compilar el Frontend
echo ""
echo "8. Compilando el Frontend..."
cd $FRONTEND_DIR
npm run build
echo "   ✓ Frontend compilado"

# 9. Crear directorio de logs si no existe
echo ""
echo "9. Creando directorio de logs..."
mkdir -p $PROJECT_DIR/logs
echo "   ✓ Directorio de logs creado"

# 10. Iniciar aplicaciones con PM2
echo ""
echo "10. Iniciando aplicaciones con PM2..."
cd $PROJECT_DIR

# Usar el script dedicado para iniciar PM2
if [ -f "$PROJECT_DIR/scripts/start-pm2.sh" ]; then
    chmod +x "$PROJECT_DIR/scripts/start-pm2.sh"
    bash "$PROJECT_DIR/scripts/start-pm2.sh"
else
    echo "   ⚠ Script start-pm2.sh no encontrado, usando método básico..."
    
    # Verificar que el build del API existe
    if [ ! -f "$API_DIR/dist/main.js" ]; then
        echo "   ✗ Error: Build del API no encontrado. Ejecuta 'npm run build' en el directorio api/"
        exit 1
    fi
    
    # Detener aplicaciones si ya están corriendo
    pm2 stop all 2>/dev/null || true
    pm2 delete all 2>/dev/null || true
    
    # Iniciar aplicaciones
    pm2 start ecosystem.config.js
    
    # Guardar configuración de PM2
    pm2 save
    
    # Configurar PM2 para iniciar al arrancar el sistema
    pm2 startup | tail -1 | bash || true

    ## Freeze a process list on reboot via:
    #pm2 save
    ##! Remove init script via:
    #pm2 unstartup systemd
    
    echo "   ✓ Aplicaciones iniciadas con PM2"
    
    # Mostrar estado
    echo ""
    echo "=========================================="
    echo "Despliegue completado"
    echo "=========================================="
    echo ""
    echo "Estado de las aplicaciones:"
    pm2 status
    echo ""
    echo "Para ver los logs:"
    echo "  - API: pm2 logs panaderia-api"
    echo "  - Frontend: pm2 logs panaderia-frontend"
    echo ""
    echo "Para reiniciar:"
    echo "  pm2 restart all"
    echo ""
    echo "Para detener:"
    echo "  pm2 stop all"
    echo ""
    
    # Obtener IP del servidor
    SERVER_IP=$(curl -s ifconfig.me || curl -s ipinfo.io/ip || hostname -I | awk '{print $1}')
    echo "Accede a la aplicación en:"
    echo "  Frontend: http://${SERVER_IP}:3001"
    echo "  API: http://${SERVER_IP}:3000"
    echo ""
    echo "⚠ IMPORTANTE: Asegúrate de abrir los puertos 3000 y 3001 en el firewall de AWS Lightsail"
fi

