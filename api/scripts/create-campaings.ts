import { PrismaClient, CampaignStatus, LocationType } from '@prisma/client';

const prisma = new PrismaClient();

async function createCampaign() {
  console.log('🔧 Iniciando creación de campaña activa...\n');

  try {
    // 1. Obtener todas las compañías activas
    const companies = await prisma.company.findMany({
      where: { is_active: true },
    });

    if (companies.length === 0) {
      console.log('❌ No se encontraron compañías activas en el sistema.');
      return;
    }

    console.log(`📦 Se encontraron ${companies.length} compañía(s) activa(s).\n`);

    const campaignName = 'Roscas de reyes enero 2026';
    
    // 2. Para cada compañía, verificar y crear/actualizar la campaña
    for (const company of companies) {
      console.log(`\n🏢 Procesando compañía: ${company.name} (${company.id})`);

      // Verificar si ya existe una campaña con ese nombre
      let existingCampaign = await prisma.campaign.findFirst({
        where: {
          company_id: company.id,
          name: campaignName,
        },
      });

      if (existingCampaign) {
        // Si existe pero no está activa, actualizarla
        if (existingCampaign.status !== CampaignStatus.ACTIVE) {
          console.log(`   ⚠️  Campaña encontrada pero no está activa. Actualizando...`);
          existingCampaign = await prisma.campaign.update({
            where: { id: existingCampaign.id },
            data: {
              status: CampaignStatus.ACTIVE,
              // Actualizar fechas si es necesario
              start_date: new Date('2026-01-01'),
              end_date: new Date('2026-01-31'),
            },
          });
          console.log(`   ✅ Campaña actualizada a estado ACTIVE: ${existingCampaign.id}`);
        } else {
          console.log(`   ✅ Campaña activa ya existe: ${existingCampaign.id}`);
        }
      } else {
        // Crear nueva campaña
        console.log(`   📅 Creando nueva campaña activa...`);
        const startDate = new Date('2026-01-01');
        const endDate = new Date('2026-01-31');

        existingCampaign = await prisma.campaign.create({
          data: {
            company_id: company.id,
            name: campaignName,
            description: 'Campaña activa para Roscas de Reyes - Enero 2026',
            start_date: startDate,
            end_date: endDate,
            status: CampaignStatus.ACTIVE,
          },
        });
        console.log(`   ✅ Campaña creada exitosamente: ${existingCampaign.id}`);
        console.log(`   📝 Nombre: ${existingCampaign.name}`);
        console.log(`   📅 Fechas: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`);
      }

      // 3. Verificar y crear ubicación de producción
      let productionLocation = await prisma.location.findFirst({
        where: {
          company_id: company.id,
          type: LocationType.PRODUCTION,
          is_active: true,
        },
      });

      if (!productionLocation) {
        console.log(`   🏭 Creando ubicación de producción...`);
        productionLocation = await prisma.location.create({
          data: {
            company_id: company.id,
            name: 'Planta de Producción Principal',
            type: LocationType.PRODUCTION,
            address: 'Primo de Verdad # 206, Valle del Sur, 34120 Durango, Dgo.',
            is_active: true,
          },
        });
        console.log(`   ✅ Ubicación de producción creada: ${productionLocation.id}`);
        console.log(`   📍 Dirección: ${productionLocation.address}`);
      } else {
        // Si existe pero la dirección es diferente, actualizarla
        if (productionLocation.address !== 'Primo de Verdad # 206, Valle del Sur, 34120 Durango, Dgo.') {
          console.log(`   ⚠️  Ubicación encontrada pero con dirección diferente. Actualizando...`);
          productionLocation = await prisma.location.update({
            where: { id: productionLocation.id },
            data: {
              address: 'Primo de Verdad # 206, Valle del Sur, 34120 Durango, Dgo.',
              is_active: true,
            },
          });
          console.log(`   ✅ Ubicación actualizada: ${productionLocation.id}`);
          console.log(`   📍 Nueva dirección: ${productionLocation.address}`);
        } else {
          console.log(`   ✅ Ubicación de producción ya existe: ${productionLocation.id}`);
        }
      }
    }

    console.log('\n🎉 Proceso completado exitosamente!');

  } catch (error) {
    console.error('\n❌ Error al crear/actualizar la campaña:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createCampaign()
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });

