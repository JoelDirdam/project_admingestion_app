#!/bin/bash

# Script para iniciar aplicaciones con PM2
# Verifica que los builds existan antes de iniciar

PROJECT_DIR="/projects/project_admingestion_app"
API_DIR="$PROJECT_DIR/api"
FRONTEND_DIR="$PROJECT_DIR/frontend"
API_BUILD="$API_DIR/dist/main.js"
FRONTEND_BUILD="$FRONTEND_DIR/.next"

echo "=========================================="
echo "Iniciando aplicaciones con PM2"
echo "=========================================="
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -d "$API_DIR" ] || [ ! -d "$FRONTEND_DIR" ]; then
    echo "Error: No se encontraron los directorios api/ o frontend/"
    echo "Asegúrate de ejecutar este script desde el directorio raíz del proyecto"
    exit 1
fi

# Verificar que el build del API existe
echo "1. Verificando build del API..."
if [ ! -f "$API_BUILD" ]; then
    echo "   ⚠ Build del API no encontrado en: $API_BUILD"
    echo "   Compilando el API..."
    cd $API_DIR
    
    # Verificar que existe package.json
    if [ ! -f "package.json" ]; then
        echo "   ✗ Error: package.json no encontrado en $API_DIR"
        exit 1
    fi
    
    # Instalar dependencias si node_modules no existe
    if [ ! -d "node_modules" ]; then
        echo "   Instalando dependencias..."
        npm install
    fi
    
    # Compilar
    echo "   Compilando..."
    npm run build
    
    # Verificar que el build se completó
    if [ ! -f "$API_BUILD" ]; then
        echo "   ✗ Error: La compilación del API falló. El archivo $API_BUILD no existe."
        echo "   Revisa los errores de compilación arriba."
        exit 1
    fi
    echo "   ✓ API compilado exitosamente"
else
    echo "   ✓ Build del API encontrado"
fi

# Verificar que el build del Frontend existe
echo ""
echo "2. Verificando build del Frontend..."
if [ ! -d "$FRONTEND_BUILD" ]; then
    echo "   ⚠ Build del Frontend no encontrado en: $FRONTEND_BUILD"
    echo "   Compilando el Frontend..."
    cd $FRONTEND_DIR
    
    # Verificar que existe package.json
    if [ ! -f "package.json" ]; then
        echo "   ✗ Error: package.json no encontrado en $FRONTEND_DIR"
        exit 1
    fi
    
    # Instalar dependencias si node_modules no existe
    if [ ! -d "node_modules" ]; then
        echo "   Instalando dependencias..."
        npm install
    fi
    
    # Compilar
    echo "   Compilando..."
    npm run build
    
    # Verificar que el build se completó
    if [ ! -d "$FRONTEND_BUILD" ]; then
        echo "   ✗ Error: La compilación del Frontend falló. El directorio $FRONTEND_BUILD no existe."
        echo "   Revisa los errores de compilación arriba."
        exit 1
    fi
    echo "   ✓ Frontend compilado exitosamente"
else
    echo "   ✓ Build del Frontend encontrado"
fi

# Crear directorio de logs si no existe
echo ""
echo "3. Verificando directorio de logs..."
mkdir -p $PROJECT_DIR/logs
echo "   ✓ Directorio de logs listo"

# Verificar que ecosystem.config.js existe
echo ""
echo "4. Verificando configuración de PM2..."
if [ ! -f "$PROJECT_DIR/ecosystem.config.js" ]; then
    echo "   ✗ Error: ecosystem.config.js no encontrado en $PROJECT_DIR"
    exit 1
fi
echo "   ✓ Configuración de PM2 encontrada"

# Detener aplicaciones si ya están corriendo
echo ""
echo "5. Deteniendo aplicaciones existentes (si hay)..."
pm2 stop all 2>/dev/null || echo "   (No hay aplicaciones corriendo)"
pm2 delete all 2>/dev/null || echo "   (No hay aplicaciones para eliminar)"

# Iniciar aplicaciones con PM2
echo ""
echo "6. Iniciando aplicaciones con PM2..."
cd $PROJECT_DIR

# Iniciar aplicaciones y capturar errores
if pm2 start ecosystem.config.js; then
    echo "   ✓ PM2 iniciado correctamente"
else
    echo "   ✗ Error al iniciar PM2"
    echo ""
    echo "   Revisando logs de PM2:"
    pm2 logs --lines 20 --nostream
    exit 1
fi

# Verificar que las aplicaciones se iniciaron correctamente
echo ""
echo "7. Verificando estado de las aplicaciones..."
sleep 2  # Esperar un momento para que PM2 inicie

# Verificar estado
pm2_status=$(pm2 jlist)
api_running=$(echo "$pm2_status" | grep -o '"name":"panaderia-api"' | wc -l)
frontend_running=$(echo "$pm2_status" | grep -o '"name":"panaderia-frontend"' | wc -l)

if [ "$api_running" -eq 0 ] || [ "$frontend_running" -eq 0 ]; then
    echo "   ⚠ Advertencia: Algunas aplicaciones no se iniciaron correctamente"
    echo ""
    pm2 status
    echo ""
    echo "   Revisa los logs con: pm2 logs"
    exit 1
fi

# Guardar configuración de PM2
echo ""
echo "8. Guardando configuración de PM2..."
pm2 save
echo "   ✓ Configuración guardada"

# Configurar PM2 para iniciar al arrancar el sistema
echo ""
echo "9. Configurando PM2 para iniciar al arrancar el sistema..."
startup_cmd=$(pm2 startup | grep -v "PM2" | grep -v "command" | tail -1)
if [ ! -z "$startup_cmd" ]; then
    echo "   Ejecutando: $startup_cmd"
    eval $startup_cmd 2>/dev/null || echo "   (Ya configurado o requiere permisos sudo)"
else
    echo "   (PM2 startup ya configurado)"
fi

# Mostrar estado final
echo ""
echo "=========================================="
echo "Aplicaciones iniciadas correctamente"
echo "=========================================="
echo ""
echo "Estado de las aplicaciones:"
pm2 status
echo ""

# Verificar que las aplicaciones están corriendo
api_status=$(pm2 jlist | grep -o '"name":"panaderia-api"[^}]*"status":"[^"]*"' | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
frontend_status=$(pm2 jlist | grep -o '"name":"panaderia-frontend"[^}]*"status":"[^"]*"' | grep -o '"status":"[^"]*"' | cut -d'"' -f4)

if [ "$api_status" = "online" ] && [ "$frontend_status" = "online" ]; then
    echo "✓ Todas las aplicaciones están corriendo"
else
    echo "⚠ Advertencia: Algunas aplicaciones no están online"
    echo "   API: $api_status"
    echo "   Frontend: $frontend_status"
    echo ""
    echo "   Revisa los logs:"
    echo "   pm2 logs panaderia-api"
    echo "   pm2 logs panaderia-frontend"
fi

echo ""
echo "Comandos útiles:"
echo "  - Ver logs: pm2 logs"
echo "  - Ver logs del API: pm2 logs panaderia-api"
echo "  - Ver logs del Frontend: pm2 logs panaderia-frontend"
echo "  - Reiniciar: pm2 restart all"
echo "  - Detener: pm2 stop all"
echo "  - Estado: pm2 status"
echo ""

# Obtener IP del servidor
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || hostname -I | awk '{print $1}' || echo "TU_IP_SERVIDOR")
echo "Accede a la aplicación en:"
echo "  Frontend: http://${SERVER_IP}:3001"
echo "  API: http://${SERVER_IP}:3000"
echo ""
echo "⚠ IMPORTANTE: Asegúrate de abrir los puertos 3000 y 3001 en el firewall de AWS Lightsail"
echo ""


