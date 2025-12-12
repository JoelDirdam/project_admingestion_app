# Panadería La Paz - Admin Panel

Panel de administración moderno para gestión de producción y productos (roscas).

## 🚀 Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **UI Library**: shadcn/ui + TailwindCSS v4
- **Icons**: lucide-react
- **Forms**: react-hook-form + zod (ready to implement)

## 📁 Estructura del Proyecto

\`\`\`
├── app/
│   ├── admin/
│   │   ├── layout.tsx          # Layout con sidebar + header
│   │   ├── page.tsx             # Home del admin
│   │   ├── products/page.tsx    # Gestión de productos (ADMIN only)
│   │   └── production/page.tsx  # Registro de producción (ADMIN only)
│   ├── login/page.tsx           # Login page
│   ├── layout.tsx               # Root layout
│   └── globals.css              # Estilos globales + tokens
├── components/
│   ├── ui/                      # Componentes shadcn/ui
│   ├── AppHeader.tsx            # Header con menú de usuario
│   ├── AppSidebar.tsx           # Sidebar responsive
│   ├── ProtectedRoute.tsx       # Guard para rutas autenticadas
│   └── RoleGuard.tsx            # Guard para rutas ADMIN
├── lib/
│   ├── api-client.ts            # Cliente HTTP con JWT automático
│   ├── auth.ts                  # Helpers de autenticación
│   ├── types.ts                 # TypeScript types
│   └── utils.ts                 # Utilidades (cn, etc.)
└── README.md
\`\`\`

## 🔐 Autenticación y Permisos

### LocalStorage Keys

- `auth_token`: JWT token de autenticación
- `auth_user`: Objeto con datos del usuario `{ id, username, role }`

### Flujo de Autenticación

1. Login en `/login` obtiene JWT desde `POST /auth/login`
2. Token se guarda automáticamente en localStorage
3. Todas las peticiones API incluyen `Authorization: Bearer <token>`
4. Si hay error 401, se limpia localStorage y redirige a `/login`

### Roles y Permisos

- **ADMIN**: Acceso completo a:
  - `/admin/products` - Gestión de productos
  - `/admin/production` - Registro de producción
- **USER**: Solo acceso a `/admin` (home)
- Rutas protegidas con `ProtectedRoute` y `RoleGuard`
- Si no tiene permisos: muestra página "Acceso denegado"

## 🌐 Configuración de Backend

### Cambiar la URL del Backend

Edita la variable de entorno `NEXT_PUBLIC_API_URL`:

\`\`\`bash
# .env.local (create this file)
NEXT_PUBLIC_API_URL=https://tu-backend-api.com
\`\`\`

Si no está definida, usa por defecto `http://localhost:3000`

### Endpoints Utilizados

\`\`\`typescript
// Autenticación
POST /auth/login
Body: { username: string, password: string }
Response: { accessToken: string, user: { id, username, role } }

// Productos
GET /products
POST /products
Body: { name, description?, base_price, price_1, price_2 }
PATCH /products/:id
Body: { name, description?, base_price, price_1, price_2 }

// Producción
POST /production-batches
Body: { date: string, items: [{ productId, quantityProduced }] }
\`\`\`

## 🎨 Diseño y Theming

### Tema Visual

- **Background**: Claro (#f7f7f8)
- **Cards**: Blancas con bordes suaves
- **Primary Color**: Blue (#3b82f6)
- **Typography**: Inter font, jerarquía clara

### Personalizar Colores

Edita los tokens en `app/globals.css`:

\`\`\`css
@theme inline {
  --color-primary: 59 130 246; /* Cambia aquí el color primario */
  --color-background: 247 247 248;
  /* ... otros tokens ... */
}
\`\`\`

## 📱 Responsive Design

- **Mobile**: Sidebar colapsable con overlay
- **Desktop**: Sidebar fijo + header
- **Breakpoint**: `md` (768px)

## 🔧 Agregar Nuevas Páginas Admin

### Paso 1: Crear la página

\`\`\`typescript
// app/admin/nueva-seccion/page.tsx
'use client'

import { RoleGuard } from '@/components/RoleGuard'

export default function NuevaSeccionPage() {
  return (
    <RoleGuard requireAdmin> {/* Solo si requiere ADMIN */}
      <div className="container max-w-6xl py-8 px-4">
        <h1 className="text-3xl font-bold">Nueva Sección</h1>
        {/* Tu contenido aquí */}
      </div>
    </RoleGuard>
  )
}
\`\`\`

### Paso 2: Agregar al sidebar

Edita `components/AppSidebar.tsx`:

\`\`\`typescript
import { TvIcon as TuIcono } from 'lucide-react'

const navItems = [
  // ... existing items ...
  {
    title: 'Nueva Sección',
    href: '/admin/nueva-seccion',
    icon: TuIcono,
    adminOnly: true, // o false si todos pueden acceder
  },
]
\`\`\`

### Paso 3: (Opcional) Agregar card en home

Edita `app/admin/page.tsx` para agregar una card de acceso rápido.

## 🛠️ Utilidades Importantes

### Cliente API

\`\`\`typescript
import { apiClient } from '@/lib/api-client'

// GET
const data = await apiClient.get<TipoRespuesta>('/endpoint')

// POST
const result = await apiClient.post('/endpoint', { data })

// PATCH
await apiClient.patch('/endpoint/:id', { data })

// DELETE
await apiClient.delete('/endpoint/:id')
\`\`\`

### Auth Helpers

\`\`\`typescript
import { auth } from '@/lib/auth'

auth.isAuthenticated() // true/false
auth.isAdmin() // true/false
auth.getUser() // { id, username, role }
auth.getToken() // JWT string
auth.logout() // Limpia localStorage
\`\`\`

### Toasts

\`\`\`typescript
import { useToast } from '@/hooks/use-toast'

const { toast } = useToast()

toast({
  title: 'Éxito',
  description: 'Operación completada',
})

toast({
  variant: 'destructive',
  title: 'Error',
  description: 'Algo salió mal',
})
\`\`\`

## 🚦 Estados UX

- ✅ **Loading states**: Skeletons en tablas y listas
- ✅ **Empty states**: Mensajes cuando no hay datos
- ✅ **Error handling**: Alerts y toasts claros
- ✅ **Confirmaciones**: Dialogs para acciones importantes
- ✅ **Validación**: Formularios con validación inline

## 📦 Instalación

\`\`\`bash
# Clonar el proyecto
git clone <repo-url>

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar NEXT_PUBLIC_API_URL en .env.local

# Ejecutar en desarrollo
npm run dev
\`\`\`

## 🌟 Próximos Pasos (Para Cursor u otra IA)

1. **Validación con Zod**: Implementar schemas en formularios
2. **react-hook-form**: Integrar en ProductForm y ProductionForm
3. **Paginación**: Agregar en tabla de productos si crece
4. **Filtros**: Búsqueda y filtrado en productos
5. **Reportes**: Dashboard con gráficas de producción
6. **Export**: Exportar datos a Excel/CSV
7. **Roles adicionales**: Implementar más roles si es necesario

## 📄 Licencia

Proyecto privado para Panadería La Paz.

---

**Importante**: Este proyecto está listo para que otra IA (Cursor) continúe el desarrollo siguiendo los mismos patrones y estructura establecida. Todos los componentes están documentados y siguen las mejores prácticas de Next.js y TypeScript.
