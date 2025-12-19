import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWarehouseReceiptDto } from './dto/create-warehouse-receipt.dto';
import { ConfirmWarehouseReceiptDto } from './dto/confirm-warehouse-receipt.dto';
import { ComparisonQueryDto } from './dto/comparison-query.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { parseLocalDate, getDateRange } from '../common/utils/date.utils';

@Injectable()
export class WarehouseService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async createReceipt(
    createDto: CreateWarehouseReceiptDto,
    companyId: string,
    userId: string,
  ) {
    // Verificar que la ubicación existe y es de tipo WAREHOUSE
    const location = await this.prisma.location.findFirst({
      where: {
        id: createDto.locationId,
        company_id: companyId,
        type: 'WAREHOUSE',
        is_active: true,
      },
    });

    if (!location) {
      throw new NotFoundException('Ubicación de almacén no encontrada o inválida');
    }

    // Verificar que todos los productos existen y obtener/crear sus variants
    const productIds = createDto.items.map(item => item.productId);
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        company_id: companyId,
      },
    });

    if (products.length !== productIds.length) {
      throw new NotFoundException('Uno o más productos no fueron encontrados');
    }

    // Para cada producto, buscar o crear un ProductVariant por defecto
    const batchItemsData = await Promise.all(
      createDto.items.map(async (item) => {
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
          quantity_received: item.quantityReceived,
        };
      }),
    );

    // Verificar si ya existe un receipt para esta fecha y ubicación (no confirmado)
    const { start, end } = getDateRange(createDto.date);
    const existingReceipt = await this.prisma.warehouseReceipt.findFirst({
      where: {
        company_id: companyId,
        location_id: createDto.locationId,
        receipt_date: {
          gte: start,
          lte: end,
        },
        confirmed: false,
      },
    });

    const receiptDate = parseLocalDate(createDto.date);

    // Si existe un draft, actualizarlo; si no, crear uno nuevo
    if (existingReceipt) {
      // Eliminar items existentes
      await this.prisma.warehouseReceiptItem.deleteMany({
        where: {
          warehouse_receipt_id: existingReceipt.id,
        },
      });

      // Actualizar el receipt y crear nuevos items
      return this.prisma.warehouseReceipt.update({
        where: { id: existingReceipt.id },
        data: {
          campaign_id: createDto.campaignId,
          notes: createDto.notes,
          receipt_items: {
            create: batchItemsData,
          },
        },
        include: {
          receipt_items: {
            include: {
              product_variant: {
                include: {
                  product: true,
                },
              },
            },
          },
          location: true,
          user: {
            select: {
              id: true,
              username: true,
              first_name: true,
              last_name: true,
            },
          },
        },
      });
    }

    // Crear nuevo receipt
    return this.prisma.warehouseReceipt.create({
      data: {
        company_id: companyId,
        campaign_id: createDto.campaignId,
        location_id: createDto.locationId,
        user_id: userId,
        receipt_date: receiptDate,
        notes: createDto.notes,
        receipt_items: {
          create: batchItemsData,
        },
      },
      include: {
        receipt_items: {
          include: {
            product_variant: {
              include: {
                product: true,
              },
            },
          },
        },
        location: true,
        user: {
          select: {
            id: true,
            username: true,
            first_name: true,
            last_name: true,
          },
        },
      },
    });
  }

  async confirmReceipt(
    receiptId: string,
    confirmDto: ConfirmWarehouseReceiptDto,
    companyId: string,
    userId: string,
    userRole: string,
  ) {
    // Verificar que el receipt existe y pertenece a la compañía
    const receipt = await this.prisma.warehouseReceipt.findFirst({
      where: {
        id: receiptId,
        company_id: companyId,
      },
      include: {
        location: true,
        user: {
          select: {
            id: true,
            username: true,
            first_name: true,
            last_name: true,
          },
        },
      },
    });

    if (!receipt) {
      throw new NotFoundException('Recepción no encontrada');
    }

    // Si ya está confirmado, no permitir edición desde WAREHOUSE role
    if (receipt.confirmed && userRole !== 'ADMIN') {
      throw new ForbiddenException('Esta recepción ya está confirmada y no puede ser modificada');
    }

    // Confirmar el receipt
    const confirmedReceipt = await this.prisma.warehouseReceipt.update({
      where: { id: receiptId },
      data: {
        confirmed: true,
        confirmed_at: new Date(),
        confirmed_by_name: confirmDto.confirmedByName,
      },
      include: {
        receipt_items: {
          include: {
            product_variant: {
              include: {
                product: true,
              },
            },
          },
        },
        location: true,
        user: {
          select: {
            id: true,
            username: true,
            first_name: true,
            last_name: true,
          },
        },
      },
    });

    // Crear notificaciones para todos los usuarios ADMIN de la compañía
    await this.notificationsService.createWarehouseReceiptConfirmedNotification(
      companyId,
      confirmedReceipt,
    );

    return confirmedReceipt;
  }

  async getHistory(companyId: string, userId?: string, locationId?: string) {
    const where: any = {
      company_id: companyId,
    };

    if (userId) {
      where.user_id = userId;
    }

    if (locationId) {
      where.location_id = locationId;
    }

    const receipts = await this.prisma.warehouseReceipt.findMany({
      where,
      include: {
        receipt_items: {
          include: {
            product_variant: {
              include: {
                product: true,
              },
            },
          },
        },
        location: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        user: {
          select: {
            id: true,
            username: true,
            first_name: true,
            last_name: true,
          },
        },
      },
      orderBy: {
        receipt_date: 'desc',
      },
    });

    return receipts.map(receipt => ({
      ...receipt,
      totalUnits: receipt.receipt_items.reduce((sum, item) => sum + item.quantity_received, 0),
    }));
  }

  async getComparison(query: ComparisonQueryDto, companyId: string) {
    const { start: startOfDay, end: endOfDay } = getDateRange(query.date);

    // Construir where para producción
    const productionWhere: any = {
      company_id: companyId,
      production_date: {
        gte: startOfDay,
        lte: endOfDay,
      },
    };

    if (query.campaignId) {
      productionWhere.campaign_id = query.campaignId;
    }

    if (query.locationId) {
      productionWhere.location_id = query.locationId;
    }

    // Obtener producción
    const productionBatches = await this.prisma.productionBatch.findMany({
      where: productionWhere,
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

    // Construir where para recepciones de almacén
    const warehouseWhere: any = {
      company_id: companyId,
      receipt_date: {
        gte: startOfDay,
        lte: endOfDay,
      },
      confirmed: true, // Solo recepciones confirmadas
    };

    if (query.campaignId) {
      warehouseWhere.campaign_id = query.campaignId;
    }

    if (query.locationId) {
      warehouseWhere.location_id = query.locationId;
    }

    // Obtener recepciones de almacén
    const warehouseReceipts = await this.prisma.warehouseReceipt.findMany({
      where: warehouseWhere,
      include: {
        receipt_items: {
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

    // Agrupar producción por producto
    const productionByProduct: Record<string, { productId: string; productName: string; producedTotal: number }> = {};

    productionBatches.forEach(batch => {
      batch.batch_items.forEach(item => {
        const productId = item.product_variant.product.id;
        const productName = item.product_variant.product.name;

        if (!productionByProduct[productId]) {
          productionByProduct[productId] = {
            productId,
            productName,
            producedTotal: 0,
          };
        }

        productionByProduct[productId].producedTotal += item.quantity;
      });
    });

    // Agrupar recepciones por producto
    const receivedByProduct: Record<string, number> = {};

    warehouseReceipts.forEach(receipt => {
      receipt.receipt_items.forEach(item => {
        const productId = item.product_variant.product.id;

        if (!receivedByProduct[productId]) {
          receivedByProduct[productId] = 0;
        }

        receivedByProduct[productId] += item.quantity_received;
      });
    });

    // Combinar resultados
    const allProductIds = new Set([
      ...Object.keys(productionByProduct),
      ...Object.keys(receivedByProduct),
    ]);

    const comparison = Array.from(allProductIds).map(productId => {
      const production = productionByProduct[productId] || {
        productId,
        productName: 'Producto desconocido',
        producedTotal: 0,
      };

      const receivedTotal = receivedByProduct[productId] || 0;

      return {
        productId: production.productId,
        productName: production.productName,
        producedTotal: production.producedTotal,
        receivedTotal,
        difference: receivedTotal - production.producedTotal,
      };
    });

    return {
      date: query.date,
      comparison,
    };
  }

  async getReceiptById(receiptId: string, companyId: string) {
    const receipt = await this.prisma.warehouseReceipt.findFirst({
      where: {
        id: receiptId,
        company_id: companyId,
      },
      include: {
        receipt_items: {
          include: {
            product_variant: {
              include: {
                product: true,
              },
            },
          },
        },
        location: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        user: {
          select: {
            id: true,
            username: true,
            first_name: true,
            last_name: true,
          },
        },
      },
    });

    if (!receipt) {
      throw new NotFoundException('Recepción no encontrada');
    }

    return receipt;
  }
}

