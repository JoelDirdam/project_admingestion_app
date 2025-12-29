import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createAdmin() {
  console.log('🔧 Iniciando creación de usuario admin...\n');

  try {
    // 1. Buscar o crear una company (necesaria para el usuario)
    let company = await prisma.company.findFirst({
      where: { is_active: true },
    });

    if (!company) {
      console.log('📦 No se encontró ninguna compañía activa. Creando una por defecto...');
      company = await prisma.company.create({
        data: {
          name: 'Panaderia la Paz',
          slug: 'la-paz',
          email: 'admin@panaderialapaz.com',
          is_active: true,
        },
      });
      console.log('✅ Compañía creada:', company.name);
    } else {
      console.log('✅ Compañía encontrada:', company.name);
    }

    // 2. Verificar si el usuario admin ya existe
    const adminUsername = 'admin';
    const adminPassword = 'admin123';

    const existingAdmin = await prisma.user.findUnique({
      where: { username: adminUsername },
    });

    if (existingAdmin) {
      console.log('\n⚠️  El usuario admin ya existe.');
      console.log('   Username:', existingAdmin.username);
      console.log('   Role:', existingAdmin.role);
      console.log('   Company:', company.name);
      
      // Preguntar si se desea actualizar la contraseña
      console.log('\n💡 Si deseas actualizar la contraseña, elimina el usuario primero o usa el endpoint de actualización.');
      return;
    }

    // 3. Crear el usuario admin
    console.log('\n👤 Creando usuario admin...');
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    const adminUser = await prisma.user.create({
      data: {
        company_id: company.id,
        username: adminUsername,
        password_hash: passwordHash,
        first_name: 'Admin',
        last_name: 'Sistema',
        email: 'admin@admin.com',
        role: Role.ADMIN,
        is_active: true,
      },
    });

    console.log('\n✅ Usuario admin creado exitosamente!');
    console.log('\n📝 Credenciales de acceso:');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('   Role: ADMIN');
    console.log('   Company:', company.name);
    console.log('\n⚠️  IMPORTANTE: Cambia la contraseña después del primer login por seguridad.');

  } catch (error) {
    console.error('\n❌ Error al crear el usuario admin:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin()
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });

