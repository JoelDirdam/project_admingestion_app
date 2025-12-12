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
}

