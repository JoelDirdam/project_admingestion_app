#!/bin/bash

# Script para configurar PostgreSQL en Ubuntu
# Este script establece una contraseña para el usuario postgres

echo "=========================================="
echo "Configuración de PostgreSQL"
echo "=========================================="

# Solicitar contraseña para el usuario postgres
read -sp "Ingresa la contraseña para el usuario postgres: " POSTGRES_PASSWORD
echo ""
read -sp "Confirma la contraseña: " POSTGRES_PASSWORD_CONFIRM
echo ""

if [ "$POSTGRES_PASSWORD" != "$POSTGRES_PASSWORD_CONFIRM" ]; then
    echo "Error: Las contraseñas no coinciden"
    exit 1
fi

# Cambiar a usuario postgres y establecer la contraseña
echo "Configurando contraseña para el usuario postgres..."
sudo -u postgres psql -c "ALTER USER postgres PASSWORD '$POSTGRES_PASSWORD';"

if [ $? -eq 0 ]; then
    echo "✓ Contraseña configurada exitosamente"
    echo ""
    echo "La contraseña del usuario postgres es: $POSTGRES_PASSWORD"
    echo "Guarda esta contraseña de forma segura."
else
    echo "Error al configurar la contraseña"
    exit 1
fi

# Crear la base de datos si no existe
echo "Creando base de datos panaderia_la_paz..."
sudo -u postgres psql -c "SELECT 1 FROM pg_database WHERE datname = 'panaderia_la_paz'" | grep -q 1 || sudo -u postgres psql -c "CREATE DATABASE panaderia_la_paz;"

if [ $? -eq 0 ]; then
    echo "✓ Base de datos creada o ya existe"
else
    echo "Error al crear la base de datos"
    exit 1
fi

echo ""
echo "=========================================="
echo "Configuración completada"
echo "=========================================="
echo ""
echo "DATABASE_URL que debes usar en tu .env:"
echo "postgresql://postgres:${POSTGRES_PASSWORD}@localhost:5432/panaderia_la_paz?schema=public"


