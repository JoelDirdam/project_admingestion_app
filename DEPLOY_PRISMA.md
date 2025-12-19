# Guía de Comandos Prisma para Despliegue

Esta guía explica los comandos de Prisma que debes ejecutar después de hacer `git pull` en el servidor y cómo copiar la base de datos del servidor a tu PC local.

## 📋 Comandos Prisma después de `git pull` en el servidor

Después de hacer `git pull` en el servidor, necesitas ejecutar estos comandos para aplicar los cambios de la base de datos:

### Opción 1: Proceso Manual (Recomendado para producción)

```bash
# 1. Ir al directorio del API
cd /home/ubuntu/projects/project_admingestion_app/api
# O la ruta donde tengas el proyecto en tu servidor

# 2. Instalar dependencias (por si hay cambios en package.json)
npm install

# 3. Generar el cliente de Prisma (necesario si hay cambios en schema.prisma)
npm run prisma:generate

# 4. Aplicar migraciones pendientes (PRODUCCIÓN - no crea nuevas migraciones)
npx prisma migrate deploy

# 5. Recompilar el API
npm run build

# 6. Reiniciar la aplicación con PM2
pm2 restart panaderia-api
```

### Opción 2: Script Automatizado

Puedes crear un script `update.sh` en el servidor:

```bash
#!/bin/bash
# Guardar como: /home/ubuntu/projects/project_admingestion_app/update.sh

set -e

PROJECT_DIR="/home/ubuntu/projects/project_admingestion_app"
API_DIR="$PROJECT_DIR/api"

echo "Actualizando aplicación..."

# Ir al directorio del proyecto
cd $PROJECT_DIR

# Actualizar código
git pull

# Actualizar API
cd $API_DIR
npm install
npm run prisma:generate
npx prisma migrate deploy
npm run build

# Reiniciar con PM2
pm2 restart panaderia-api

echo "✅ Actualización completada"
```

Dar permisos de ejecución:
```bash
chmod +x /home/ubuntu/projects/project_admingestion_app/update.sh
```

Usar el script:
```bash
cd /home/ubuntu/projects/project_admingestion_app
./update.sh
```

### ⚠️ Diferencia entre `migrate dev` y `migrate deploy`

- **`migrate dev`**: Para desarrollo local. Crea nuevas migraciones si detecta cambios en el schema.
- **`migrate deploy`**: Para producción. Solo aplica las migraciones existentes sin crear nuevas.

**En el servidor SIEMPRE usa `migrate deploy`** para evitar crear migraciones en producción.

---

## 💾 Copiar Base de Datos del Servidor a tu PC Local

Para hacer pruebas con datos reales del servidor, puedes copiar la base de datos completa.

### Método 1: Usando pg_dump y psql (Recomendado)

#### Paso 1: En el servidor - Exportar la base de datos

```bash
# Conectarse al servidor por SSH
ssh usuario@tu-servidor-ip

# Crear un dump de la base de datos
pg_dump -U postgres -h localhost -d panaderia_la_paz -F c -f /tmp/panaderia_backup.dump

# O si prefieres formato SQL plano (más fácil de leer pero más grande)
pg_dump -U postgres -h localhost -d panaderia_la_paz -f /tmp/panaderia_backup.sql

# Copiar el archivo a tu PC usando SCP
# Desde tu PC local, ejecuta:
# scp usuario@tu-servidor-ip:/tmp/panaderia_backup.dump ./panaderia_backup.dump
# O para SQL:
# scp usuario@tu-servidor-ip:/tmp/panaderia_backup.sql ./panaderia_backup.sql
```

#### Paso 2: En tu PC local - Importar la base de datos

**Opción A: Si usaste formato .dump (binario, más rápido)**

```bash
# Asegúrate de tener una base de datos local creada
psql -U postgres -c "CREATE DATABASE panaderia_la_paz;"

# Importar el dump
pg_restore -U postgres -d panaderia_la_paz -h localhost panaderia_backup.dump

# Si hay errores de permisos, puedes usar:
pg_restore -U postgres -d panaderia_la_paz -h localhost --no-owner --no-privileges panaderia_backup.dump
```

**Opción B: Si usaste formato .sql (texto plano)**

```bash
# Asegúrate de tener una base de datos local creada
psql -U postgres -c "CREATE DATABASE panaderia_la_paz;"

# Importar el SQL
psql -U postgres -d panaderia_la_paz -f panaderia_backup.sql
```

#### Paso 3: Actualizar Prisma Client en tu PC

```bash
cd api
npm run prisma:generate
```

### Método 2: Script Automatizado (Más fácil)

#### Script para el servidor: `backup-db.sh`

```bash
#!/bin/bash
# Guardar como: /home/ubuntu/projects/project_admingestion_app/backup-db.sh

BACKUP_DIR="/home/ubuntu/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/panaderia_la_paz_$DATE.dump"

# Crear directorio de backups si no existe
mkdir -p $BACKUP_DIR

# Crear backup
pg_dump -U postgres -h localhost -d panaderia_la_paz -F c -f $BACKUP_FILE

echo "✅ Backup creado en: $BACKUP_FILE"
echo "📦 Tamaño: $(du -h $BACKUP_FILE | cut -f1)"
```

Dar permisos:
```bash
chmod +x /home/ubuntu/projects/project_admingestion_app/backup-db.sh
```

#### Script para tu PC local: `restore-db.sh`

```bash
#!/bin/bash
# Guardar en tu PC: ./restore-db.sh

if [ -z "$1" ]; then
    echo "Uso: ./restore-db.sh <ruta-al-archivo.dump>"
    exit 1
fi

DUMP_FILE=$1

echo "⚠️  ADVERTENCIA: Esto eliminará todos los datos de la base de datos local"
read -p "¿Continuar? (s/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    exit 1
fi

# Eliminar y recrear la base de datos
psql -U postgres -c "DROP DATABASE IF EXISTS panaderia_la_paz;"
psql -U postgres -c "CREATE DATABASE panaderia_la_paz;"

# Restaurar
pg_restore -U postgres -d panaderia_la_paz -h localhost --no-owner --no-privileges $DUMP_FILE

echo "✅ Base de datos restaurada"
echo "🔄 Regenerando Prisma Client..."
cd api
npm run prisma:generate
```

### Método 3: Usando Prisma Migrate (Solo estructura, sin datos)

Si solo necesitas la estructura de la base de datos (sin datos):

```bash
# En el servidor, exportar solo el schema
pg_dump -U postgres -h localhost -d panaderia_la_paz --schema-only -f schema.sql

# En tu PC, aplicar el schema
psql -U postgres -d panaderia_la_paz -f schema.sql
```

---

## 🔄 Flujo de Trabajo Recomendado

### Desarrollo Local → Servidor

1. **En tu PC local:**
   ```bash
   # Hacer cambios y crear migración
   cd api
   npm run prisma:migrate dev --name nombre_de_la_migracion
   
   # Commit y push
   git add .
   git commit -m "feat: nueva migración"
   git push
   ```

2. **En el servidor:**
   ```bash
   cd /home/ubuntu/projects/project_admingestion_app
   git pull
   cd api
   npm install
   npm run prisma:generate
   npx prisma migrate deploy
   npm run build
   pm2 restart panaderia-api
   ```

### Servidor → Desarrollo Local (Para pruebas con datos reales)

1. **En el servidor:**
   ```bash
   ./backup-db.sh
   # O manualmente:
   pg_dump -U postgres -d panaderia_la_paz -F c -f /tmp/backup.dump
   ```

2. **Copiar a tu PC:**
   ```bash
   scp usuario@servidor:/tmp/backup.dump ./backup.dump
   ```

3. **En tu PC:**
   ```bash
   ./restore-db.sh backup.dump
   # O manualmente:
   psql -U postgres -c "DROP DATABASE IF EXISTS panaderia_la_paz;"
   psql -U postgres -c "CREATE DATABASE panaderia_la_paz;"
   pg_restore -U postgres -d panaderia_la_paz --no-owner --no-privileges backup.dump
   cd api && npm run prisma:generate
   ```

---

## ⚠️ Advertencias Importantes

1. **NUNCA uses `migrate dev` en producción** - Solo usa `migrate deploy`
2. **Haz backups antes de restaurar** - La restauración elimina todos los datos locales
3. **Verifica la conexión** - Asegúrate de que `DATABASE_URL` en `.env` sea correcta
4. **Datos sensibles** - Los backups contienen datos reales, manéjalos con cuidado

---

## 🛠️ Comandos Útiles

### Ver migraciones aplicadas
```bash
npx prisma migrate status
```

### Ver estado de la base de datos
```bash
npx prisma db pull  # Ver diferencias entre schema y DB
```

### Resetear base de datos (SOLO DESARROLLO)
```bash
npx prisma migrate reset  # ⚠️ ELIMINA TODOS LOS DATOS
```

### Abrir Prisma Studio (visualizar datos)
```bash
npm run prisma:studio
```

---

## 📝 Checklist de Actualización en Servidor

- [ ] `git pull` - Actualizar código
- [ ] `npm install` - Actualizar dependencias
- [ ] `npm run prisma:generate` - Regenerar Prisma Client
- [ ] `npx prisma migrate deploy` - Aplicar migraciones
- [ ] `npm run build` - Recompilar
- [ ] `pm2 restart panaderia-api` - Reiniciar aplicación
- [ ] Verificar logs: `pm2 logs panaderia-api`
- [ ] Probar la aplicación

---

## 🆘 Solución de Problemas

### Error: "Migration failed to apply"
```bash
# Ver estado de migraciones
npx prisma migrate status

# Si hay migraciones pendientes, aplicar manualmente
npx prisma migrate deploy
```

### Error: "Prisma Client is out of date"
```bash
npm run prisma:generate
```

### Error: "Database connection failed"
- Verifica que PostgreSQL esté corriendo: `sudo systemctl status postgresql`
- Verifica `DATABASE_URL` en `.env`
- Prueba conexión: `psql -U postgres -d panaderia_la_paz`

### Error al restaurar: "permission denied"
```bash
# Usar --no-owner --no-privileges
pg_restore -U postgres -d panaderia_la_paz --no-owner --no-privileges backup.dump
```
