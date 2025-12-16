# Guía de Despliegue en AWS Lightsail

Esta guía te ayudará a desplegar la aplicación en una instancia de AWS Lightsail con Ubuntu.

## Prerrequisitos

- Instancia de AWS Lightsail con Ubuntu configurada
- Node.js y npm instalados
- PostgreSQL instalado
- PM2 instalado globalmente (`npm install -g pm2`)
- Git instalado
- Proyecto clonado en `/home/ubuntu/projects/project_admingestion_app`

## Paso 1: Configurar PostgreSQL

### Problema común: PostgreSQL pide contraseña pero no se configuró

Cuando instalas PostgreSQL en Ubuntu, el usuario `postgres` se crea sin contraseña. Necesitas establecer una.

### Solución 1: Usar el script automatizado

```bash
cd /home/ubuntu/projects/project_admingestion_app
chmod +x scripts/setup-postgres.sh
bash scripts/setup-postgres.sh
```

Este script te pedirá una contraseña y la configurará automáticamente.

### Solución 2: Configuración manual

```bash
# Cambiar a usuario postgres
sudo -u postgres psql

# Dentro de psql, ejecutar:
ALTER USER postgres PASSWORD 'tu_contraseña_segura';
\q

# Crear la base de datos
sudo -u postgres psql -c "CREATE DATABASE panaderia_la_paz;"
```

## Paso 2: Configurar Variables de Entorno

### API (.env)

```bash
cd /home/ubuntu/projects/project_admingestion_app/api
cp env.example .env
nano .env
```

Edita el archivo `.env` con tus credenciales:

```env
DATABASE_URL="postgresql://postgres:TU_CONTRASEÑA@localhost:5432/panaderia_la_paz?schema=public"
PORT=3000
NODE_ENV=production
JWT_SECRET=tu-secret-key-muy-seguro-aqui
FRONTEND_URL=http://TU_IP_SERVIDOR:3001
```

**Reemplaza:**
- `TU_CONTRASEÑA` con la contraseña que configuraste para postgres
- `TU_IP_SERVIDOR` con la IP pública de tu servidor Lightsail

### Frontend (.env.local)

```bash
cd /home/ubuntu/projects/project_admingestion_app/frontend
nano .env.local
```

Crea el archivo con:

```env
NEXT_PUBLIC_API_URL=http://TU_IP_SERVIDOR:3000
```

**Reemplaza `TU_IP_SERVIDOR` con la IP pública de tu servidor.**

## Paso 3: Ejecutar el Script de Despliegue

```bash
cd /home/ubuntu/projects/project_admingestion_app
chmod +x scripts/deploy.sh
bash scripts/deploy.sh
```

Este script:
1. Verifica PostgreSQL
2. Instala dependencias
3. Configura Prisma y ejecuta migraciones
4. Compila API y Frontend
5. Inicia todo con PM2

## Paso 4: Configurar Firewall en AWS Lightsail

1. Ve a la consola de AWS Lightsail
2. Selecciona tu instancia
3. Ve a la pestaña "Networking"
4. Agrega reglas de firewall para:
   - Puerto 3000 (API)
   - Puerto 3001 (Frontend)
   - Puerto 22 (SSH, si no está ya abierto)

## Paso 5: Verificar el Despliegue

### Verificar que las aplicaciones están corriendo:

```bash
pm2 status
```

Deberías ver:
- `panaderia-api` (running)
- `panaderia-frontend` (running)

### Ver logs:

```bash
# Logs del API
pm2 logs panaderia-api

# Logs del Frontend
pm2 logs panaderia-frontend

# Todos los logs
pm2 logs
```

### Acceder a la aplicación:

- **Frontend**: `http://TU_IP_SERVIDOR:3001`
- **API**: `http://TU_IP_SERVIDOR:3000`

## Comandos Útiles de PM2

```bash
# Ver estado
pm2 status

# Ver logs en tiempo real
pm2 logs

# Reiniciar todas las aplicaciones
pm2 restart all

# Reiniciar una aplicación específica
pm2 restart panaderia-api
pm2 restart panaderia-frontend

# Detener todas las aplicaciones
pm2 stop all

# Eliminar todas las aplicaciones
pm2 delete all

# Guardar configuración actual
pm2 save

# Ver información detallada
pm2 info panaderia-api
pm2 info panaderia-frontend
```

## Solución de Problemas

### Error: "No se puede conectar a la base de datos"

1. Verifica que PostgreSQL está corriendo:
   ```bash
   sudo systemctl status postgresql
   ```

2. Verifica la contraseña en el archivo `.env` del API

3. Prueba la conexión manualmente:
   ```bash
   psql -U postgres -d panaderia_la_paz -h localhost
   ```

### Error: "Puerto ya en uso"

Si los puertos 3000 o 3001 están ocupados:

```bash
# Ver qué proceso está usando el puerto
sudo lsof -i :3000
sudo lsof -i :3001

# O usar netstat
sudo netstat -tulpn | grep :3000
```

### Error: "PM2 no encontrado"

Instala PM2 globalmente:

```bash
npm install -g pm2
```

### Las aplicaciones no inician al reiniciar el servidor

```bash
# Configurar PM2 para iniciar al arrancar
pm2 startup
# Ejecuta el comando que te muestre
pm2 save
```

### Actualizar la aplicación después de cambios

```bash
cd /home/ubuntu/projects/project_admingestion_app

# Actualizar código
git pull

# Recompilar y reiniciar
cd api
npm install
npm run build
cd ../frontend
npm install
npm run build
cd ..

# Reiniciar con PM2
pm2 restart all
```

## Configuración de Nginx (Opcional - Para usar puerto 80)

Si quieres acceder sin especificar el puerto, puedes configurar Nginx como proxy reverso:

```bash
sudo apt install nginx
```

Configuración para `/etc/nginx/sites-available/panaderia`:

```nginx
server {
    listen 80;
    server_name TU_IP_SERVIDOR;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Luego:

```bash
sudo ln -s /etc/nginx/sites-available/panaderia /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

Y abre el puerto 80 en el firewall de Lightsail.

## Seguridad Adicional

1. **Cambiar puertos por defecto**: Considera usar puertos no estándar
2. **Configurar SSL/TLS**: Usa Let's Encrypt con Certbot para HTTPS
3. **Firewall del sistema**: Configura UFW para mayor seguridad
4. **Actualizaciones**: Mantén el sistema actualizado:
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```


