import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductionBatchDto } from './dto/create-production-batch.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProductionBatchesService {
  constructor(private prisma: PrismaService) {}

  async create(
    createProductionBatchDto: CreateProductionBatchDto,
    companyId: string,
    userId: string,
  ) {
    // Para simplificar, asumimos que hay una campaña activa y una ubicación de producción
    // En producción real, estos deberían venir de la configuración o ser parámetros
    const activeCampaign = await this.prisma.campaign.findFirst({
      where: {
        company_id: companyId,
        status: 'ACTIVE',
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    if (!activeCampaign) {
      throw new BadRequestException('No hay una campaña activa. Por favor, crea una campaña primero.');
    }

    const productionLocation = await this.prisma.location.findFirst({
      where: {
        company_id: companyId,
        type: 'PRODUCTION',
        is_active: true,
      },
    });

    if (!productionLocation) {
      throw new BadRequestException('No hay una ubicación de producción configurada.');
    }

    // Verificar que todos los productos existan
    const productIds = createProductionBatchDto.items.map(item => item.productId);
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        company_id: companyId,
      },
    });

    if (products.length !== productIds.length) {
      throw new NotFoundException('Uno o más productos no fueron encontrados.');
    }

    // Generar número de lote único
    const dateStr = new Date(createProductionBatchDto.date).toISOString().split('T')[0].replace(/-/g, '');
    const batchCount = await this.prisma.productionBatch.count({
      where: {
        company_id: companyId,
        production_date: {
          gte: new Date(createProductionBatchDto.date),
          lt: new Date(new Date(createProductionBatchDto.date).getTime() + 24 * 60 * 60 * 1000),
        },
      },
    });
    const batchNumber = `BATCH-${dateStr}-${String(batchCount + 1).padStart(3, '0')}`;

    // Nota: El modelo ProductionBatchItem requiere product_variant_id, no product_id
    // Por ahora, creamos un ProductVariant temporal o usamos el primer variant del producto
    // En producción real, esto debería manejarse mejor
    const batchItemsData = await Promise.all(
      createProductionBatchDto.items.map(async (item) => {
        const product = products.find(p => p.id === item.productId);
        if (!product) {
          throw new NotFoundException(`Producto con ID ${item.productId} no encontrado`);
        }

        // Buscar o crear un ProductVariant por defecto para el producto
        let productVariant = await this.prisma.productVariant.findFirst({
          where: {
            product_id: product.id,
          },
        });

        if (!productVariant) {
          // Crear un variant por defecto si no existe
          productVariant = await this.prisma.productVariant.create({
            data: {
              product_id: product.id,
              name: product.name,
              is_active: true,
            },
          });
        }

        return {
          product_variant_id: productVariant.id,
          quantity: item.quantityProduced,
        };
      }),
    );

    // Crear el lote de producción con sus items
    return this.prisma.productionBatch.create({
      data: {
        company_id: companyId,
        campaign_id: activeCampaign.id,
        location_id: productionLocation.id,
        user_id: userId,
        batch_number: batchNumber,
        production_date: new Date(createProductionBatchDto.date),
        batch_items: {
          create: batchItemsData,
        },
      },
      include: {
        batch_items: {
          include: {
            product_variant: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });
  }

  async getSummary(
    companyId: string,
    campaignId?: string,
    fromDate?: string,
    toDate?: string,
  ) {
    // Si no hay fechas, usar los últimos 30 días
    const defaultToDate = new Date();
    const defaultFromDate = new Date();
    defaultFromDate.setDate(defaultFromDate.getDate() - 30);

    const from = fromDate ? new Date(fromDate) : defaultFromDate;
    const to = toDate ? new Date(toDate) : defaultToDate;

    // Asegurar que 'to' incluya todo el día
    to.setHours(23, 59, 59, 999);

    const where: any = {
      company_id: companyId,
      production_date: {
        gte: from,
        lte: to,
      },
    };

    if (campaignId) {
      where.campaign_id = campaignId;
    } else {
      // Si no hay campaignId, usar la campaña activa
      const activeCampaign = await this.prisma.campaign.findFirst({
        where: {
          company_id: companyId,
          status: 'ACTIVE',
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      if (activeCampaign) {
        where.campaign_id = activeCampaign.id;
      }
    }

    // Obtener todos los batches en el rango de fechas
    const batches = await this.prisma.productionBatch.findMany({
      where,
      include: {
        batch_items: {
          include: {
            product_variant: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    // Agrupar por fecha
    const summaryByDate: Record<string, { date: string; totalUnits: number; batchCount: number }> = {};

    batches.forEach((batch) => {
      const dateKey = batch.production_date.toISOString().split('T')[0];

      if (!summaryByDate[dateKey]) {
        summaryByDate[dateKey] = {
          date: dateKey,
          totalUnits: 0,
          batchCount: 0,
        };
      }

      summaryByDate[dateKey].batchCount += 1;
      summaryByDate[dateKey].totalUnits += batch.batch_items.reduce(
        (sum, item) => sum + item.quantity,
        0,
      );
    });

    // Convertir a array y ordenar por fecha
    return Object.values(summaryByDate).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
  }

  async getByDate(companyId: string, date: string, campaignId?: string) {
    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const where: any = {
      company_id: companyId,
      production_date: {
        gte: startOfDay,
        lte: endOfDay,
      },
    };

    if (campaignId) {
      where.campaign_id = campaignId;
    } else {
      // Si no hay campaignId, usar la campaña activa
      const activeCampaign = await this.prisma.campaign.findFirst({
        where: {
          company_id: companyId,
          status: 'ACTIVE',
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      if (activeCampaign) {
        where.campaign_id = activeCampaign.id;
      }
    }

    const batches = await this.prisma.productionBatch.findMany({
      where,
      include: {
        batch_items: {
          include: {
            product_variant: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    // Agrupar por producto (sumando cantidades)
    const productsByDate: Record<
      string,
      {
        productId: string;
        productName: string;
        quantityProduced: number;
      }
    > = {};

    batches.forEach((batch) => {
      batch.batch_items.forEach((item) => {
        const productId = item.product_variant.product.id;
        const productName = item.product_variant.product.name;

        if (!productsByDate[productId]) {
          productsByDate[productId] = {
            productId,
            productName,
            quantityProduced: 0,
          };
        }

        productsByDate[productId].quantityProduced += item.quantity;
      });
    });

    return {
      date,
      products: Object.values(productsByDate),
    };
  }
}

