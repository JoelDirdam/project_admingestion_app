import { PrismaClient, Role, CampaignStatus, LocationType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...');

  // 1. Crear o obtener la Company (Panadería La Paz)
  let company = await prisma.company.findFirst({
    where: { slug: 'panaderia-la-paz' },
  });

  if (!company) {
    console.log('📦 Creando Company: Panadería La Paz...');
    company = await prisma.company.create({
      data: {
        name: 'Panadería La Paz',
        slug: 'panaderia-la-paz',
        email: 'admin@panaderialapaz.com',
        phone: '+52 123 456 7890',
        address: 'Dirección de la panadería',
        is_active: true,
      },
    });
    console.log('✅ Company creada:', company.id);
  } else {
    console.log('✅ Company ya existe:', company.id);
  }

  // 2. Crear usuario admin
  const adminUsername = 'admin';
  const adminPassword = 'admin123'; // Cambia esto en producción

  const existingAdmin = await prisma.user.findUnique({
    where: { username: adminUsername },
  });

  if (!existingAdmin) {
    console.log('👤 Creando usuario admin...');
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    const adminUser = await prisma.user.create({
      data: {
        company_id: company.id,
        username: adminUsername,
        password_hash: passwordHash,
        first_name: 'Administrador',
        last_name: 'Sistema',
        email: 'admin@panaderialapaz.com',
        role: Role.ADMIN,
        is_active: true,
      },
    });
    console.log('✅ Usuario admin creado:');
    console.log('   Username:', adminUsername);
    console.log('   Password:', adminPassword);
    console.log('   ⚠️  IMPORTANTE: Cambia la contraseña después del primer login');
  } else {
    console.log('✅ Usuario admin ya existe');
  }

  // 3. Crear una campaña activa (necesaria para production batches)
  let activeCampaign = await prisma.campaign.findFirst({
    where: {
      company_id: company.id,
      status: CampaignStatus.ACTIVE,
    },
  });

  if (!activeCampaign) {
    console.log('📅 Creando campaña activa...');
    const today = new Date();
    const endDate = new Date(today);
    endDate.setMonth(endDate.getMonth() + 3); // 3 meses desde hoy

    activeCampaign = await prisma.campaign.create({
      data: {
        company_id: company.id,
        name: 'Campaña Rosca de Reyes 2024',
        description: 'Campaña activa para la temporada de Rosca de Reyes',
        start_date: today,
        end_date: endDate,
        status: CampaignStatus.ACTIVE,
      },
    });
    console.log('✅ Campaña activa creada:', activeCampaign.id);
  } else {
    console.log('✅ Campaña activa ya existe:', activeCampaign.id);
  }

  // 4. Crear ubicación de producción (necesaria para production batches)
  let productionLocation = await prisma.location.findFirst({
    where: {
      company_id: company.id,
      type: LocationType.PRODUCTION,
      is_active: true,
    },
  });

  if (!productionLocation) {
    console.log('🏭 Creando ubicación de producción...');
    productionLocation = await prisma.location.create({
      data: {
        company_id: company.id,
        name: 'Planta de Producción Principal',
        type: LocationType.PRODUCTION,
        address: 'Dirección de la planta de producción',
        contact_name: 'Gerente de Producción',
        contact_phone: '+52 123 456 7891',
        is_active: true,
      },
    });
    console.log('✅ Ubicación de producción creada:', productionLocation.id);
  } else {
    console.log('✅ Ubicación de producción ya existe:', productionLocation.id);
  }

  console.log('\n🎉 Seed completado exitosamente!');
  console.log('\n📝 Credenciales de acceso:');
  console.log('   Username: admin');
  console.log('   Password: admin123');
  console.log('\n⚠️  RECUERDA: Cambia la contraseña del admin después del primer login');
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


