# Crear Usuario Admin

Este documento explica cómo crear el usuario administrador inicial en la base de datos.

## Método 1: Usar el Script de Seed (Recomendado)

El proyecto incluye un script de seed que crea automáticamente:

1. **Company**: "Panadería La Paz" (si no existe)
2. **Usuario Admin**: 
   - Username: `admin`
   - Password: `admin123`
   - Role: `ADMIN`
3. **Campaña Activa**: Necesaria para registrar producción
4. **Ubicación de Producción**: Necesaria para registrar producción

### Pasos:

1. **Asegúrate de que la base de datos esté configurada y las migraciones estén aplicadas:**

```bash
cd api
npx prisma migrate dev
```

2. **Ejecuta el script de seed:**

```bash
npm run prisma:seed
```

O directamente:

```bash
npx ts-node prisma/seed.ts
```

3. **Verifica que se haya creado correctamente:**

El script mostrará un mensaje de éxito con las credenciales:

```
✅ Usuario admin creado:
   Username: admin
   Password: admin123
   ⚠️  IMPORTANTE: Cambia la contraseña después del primer login
```

4. **Inicia sesión en el frontend:**

- Ve a `http://localhost:3001/login`
- Username: `admin`
- Password: `admin123`

## Método 2: Crear Manualmente con Prisma Studio

1. **Abre Prisma Studio:**

```bash
cd api
npm run prisma:studio
```

2. **Crea la Company:**
   - Ve a la tabla `Company`
   - Crea un nuevo registro con:
     - name: "Panadería La Paz"
     - slug: "panaderia-la-paz"
     - is_active: true

3. **Crea el Usuario Admin:**
   - Ve a la tabla `User`
   - Crea un nuevo registro con:
     - company_id: (el ID de la company creada)
     - username: "admin"
     - password_hash: (necesitas hashearlo con bcrypt)
     - role: "ADMIN"
     - is_active: true

   **Para hashear la contraseña, puedes usar Node.js:**
   ```javascript
   const bcrypt = require('bcrypt');
   const hash = await bcrypt.hash('admin123', 10);
   console.log(hash);
   ```

## Método 3: Crear con SQL Directo

```sql
-- 1. Crear Company (ajusta el ID si es necesario)
INSERT INTO companies (id, name, slug, is_active, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Panadería La Paz',
  'panaderia-la-paz',
  true,
  NOW(),
  NOW()
);

-- 2. Obtener el company_id (reemplaza con el ID real)
-- SELECT id FROM companies WHERE slug = 'panaderia-la-paz';

-- 3. Crear Usuario Admin
-- NOTA: Necesitas hashear la contraseña 'admin123' con bcrypt primero
-- Puedes usar: SELECT crypt('admin123', gen_salt('bf', 10));
-- O mejor, usa el script de seed que ya lo hace por ti

INSERT INTO users (
  id, 
  company_id, 
  username, 
  password_hash, 
  role, 
  is_active, 
  created_at, 
  updated_at
)
VALUES (
  gen_random_uuid(),
  'TU_COMPANY_ID_AQUI', -- Reemplaza con el ID de la company
  'admin',
  '$2b$10$...', -- Hash bcrypt de 'admin123' (usa el script de seed para generarlo)
  'ADMIN',
  true,
  NOW(),
  NOW()
);
```

## Cambiar la Contraseña del Admin

**⚠️ IMPORTANTE:** Después del primer login, deberías cambiar la contraseña del admin.

Para cambiar la contraseña, puedes:

1. **Usar Prisma Studio:**
   - Abre `npm run prisma:studio`
   - Ve a la tabla `User`
   - Edita el usuario `admin`
   - Genera un nuevo hash de la contraseña y actualízalo

2. **Crear un endpoint temporal** (solo para desarrollo):
   - Puedes crear un endpoint POST `/auth/change-password` temporal
   - O usar el script de seed modificado

3. **Usar SQL directo** (después de hashear la nueva contraseña)

## Solución de Problemas

### Error: "Company no encontrada"
- Asegúrate de ejecutar las migraciones primero: `npx prisma migrate dev`

### Error: "Usuario ya existe"
- El script verifica si el usuario existe antes de crearlo
- Si quieres recrearlo, primero elimínalo manualmente o modifica el script

### Error de conexión a la base de datos
- Verifica que `DATABASE_URL` esté configurado correctamente en `.env`
- Asegúrate de que PostgreSQL esté corriendo

