import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWarehouseReceiptDto } from './dto/create-warehouse-receipt.dto';
import { ConfirmWarehouseReceiptDto } from './dto/confirm-warehouse-receipt.dto';
import { UpdateWarehouseReceiptDto } from './dto/update-warehouse-receipt.dto';
import { ReviewEditRequestDto } from './dto/review-edit-request.dto';
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

  async updateReceipt(
    receiptId: string,
    updateDto: UpdateWarehouseReceiptDto,
    companyId: string,
    userId: string,
    userRole: string,
  ) {
    // Obtener la recepción actual
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

    // Si es ADMIN, puede editar directamente
    if (userRole === 'ADMIN') {
      return this.applyReceiptUpdate(receiptId, updateDto, companyId, userId, receipt);
    }

    // Si es WAREHOUSE, debe crear una solicitud de edición
    if (userRole === 'WAREHOUSE') {
      // Guardar el estado actual como datos previos
      const previousData = {
        date: receipt.receipt_date.toISOString().split('T')[0],
        campaignId: receipt.campaign_id,
        locationId: receipt.location_id,
        notes: receipt.notes,
        items: receipt.receipt_items.map(item => ({
          productId: item.product_variant.product.id,
          quantityReceived: item.quantity_received,
        })),
      };

      // Preparar los datos propuestos
      const proposedData = {
        date: updateDto.date || previousData.date,
        campaignId: updateDto.campaignId ?? previousData.campaignId,
        locationId: updateDto.locationId || previousData.locationId,
        notes: updateDto.notes ?? previousData.notes,
        items: updateDto.items || previousData.items,
      };

      // Crear la solicitud de edición
      const editRequest = await this.prisma.warehouseEditRequest.create({
        data: {
          warehouse_receipt_id: receiptId,
          requester_id: userId,
          proposed_data: proposedData as any,
          status: 'PENDING',
        },
        include: {
          warehouse_receipt: {
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
          },
          requester: {
            select: {
              id: true,
              username: true,
              first_name: true,
              last_name: true,
            },
          },
        },
      });

      // Crear notificaciones para todos los administradores
      await this.notificationsService.createEditRequestNotification(
        companyId,
        editRequest,
      );

      return editRequest;
    }

    throw new ForbiddenException('No tienes permisos para editar esta recepción');
  }

  async applyReceiptUpdate(
    receiptId: string,
    updateDto: UpdateWarehouseReceiptDto,
    companyId: string,
    userId: string,
    currentReceipt: any,
  ) {
    // Guardar el estado anterior para el historial
    const previousData = {
      date: currentReceipt.receipt_date.toISOString().split('T')[0],
      campaignId: currentReceipt.campaign_id,
      locationId: currentReceipt.location_id,
      notes: currentReceipt.notes,
      items: currentReceipt.receipt_items.map((item: any) => ({
        productId: item.product_variant.product.id,
        quantityReceived: item.quantity_received,
      })),
    };

    // Preparar los nuevos datos
    const receiptDate = updateDto.date ? parseLocalDate(updateDto.date) : currentReceipt.receipt_date;

    // Procesar items si se proporcionan
    let batchItemsData: any[] | undefined;
    if (updateDto.items && updateDto.items.length > 0) {
      const productIds = updateDto.items.map(item => item.productId);
      const products = await this.prisma.product.findMany({
        where: {
          id: { in: productIds },
          company_id: companyId,
        },
      });

      if (products.length !== productIds.length) {
        throw new NotFoundException('Uno o más productos no fueron encontrados');
      }

      batchItemsData = await Promise.all(
        updateDto.items.map(async (item) => {
          const product = products.find(p => p.id === item.productId);
          if (!product) {
            throw new NotFoundException(`Producto con ID ${item.productId} no encontrado`);
          }

          let productVariant = await this.prisma.productVariant.findFirst({
            where: {
              product_id: product.id,
            },
          });

          if (!productVariant) {
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

      // Eliminar items existentes
      await this.prisma.warehouseReceiptItem.deleteMany({
        where: {
          warehouse_receipt_id: receiptId,
        },
      });
    }

    // Actualizar la recepción
    const updatedReceipt = await this.prisma.warehouseReceipt.update({
      where: { id: receiptId },
      data: {
        receipt_date: receiptDate,
        campaign_id: updateDto.campaignId ?? currentReceipt.campaign_id,
        location_id: updateDto.locationId || currentReceipt.location_id,
        notes: updateDto.notes ?? currentReceipt.notes,
        ...(batchItemsData && {
          receipt_items: {
            create: batchItemsData,
          },
        }),
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

    // Guardar el registro de edición
    const newData = {
      date: updatedReceipt.receipt_date.toISOString().split('T')[0],
      campaignId: updatedReceipt.campaign_id,
      locationId: updatedReceipt.location_id,
      notes: updatedReceipt.notes,
      items: updatedReceipt.receipt_items.map((item: any) => ({
        productId: item.product_variant.product.id,
        quantityReceived: item.quantity_received,
      })),
    };

    await this.prisma.warehouseReceiptEdit.create({
      data: {
        warehouse_receipt_id: receiptId,
        edited_by_id: userId,
        previous_data: previousData as any,
        new_data: newData as any,
      },
    });

    return updatedReceipt;
  }

  async reviewEditRequest(
    requestId: string,
    reviewDto: ReviewEditRequestDto,
    companyId: string,
    userId: string,
  ) {
    // Obtener la solicitud
    const editRequest = await this.prisma.warehouseEditRequest.findFirst({
      where: {
        id: requestId,
        warehouse_receipt: {
          company_id: companyId,
        },
      },
      include: {
        warehouse_receipt: {
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
        },
        requester: {
          select: {
            id: true,
            username: true,
            first_name: true,
            last_name: true,
          },
        },
      },
    });

    if (!editRequest) {
      throw new NotFoundException('Solicitud de edición no encontrada');
    }

    if (editRequest.status !== 'PENDING') {
      throw new BadRequestException('Esta solicitud ya fue procesada');
    }

    // Actualizar la solicitud
    const updatedRequest = await this.prisma.warehouseEditRequest.update({
      where: { id: requestId },
      data: {
        status: reviewDto.status,
        approver_id: userId,
        rejection_reason: reviewDto.rejectionReason || null,
        reviewed_at: new Date(),
      },
      include: {
        warehouse_receipt: {
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
        },
        requester: {
          select: {
            id: true,
            username: true,
            first_name: true,
            last_name: true,
          },
        },
        approver: {
          select: {
            id: true,
            username: true,
            first_name: true,
            last_name: true,
          },
        },
      },
    });

    // Si fue aprobada, aplicar los cambios
    if (reviewDto.status === 'APPROVED') {
      const proposedData = editRequest.proposed_data as any;
      const updateDto: UpdateWarehouseReceiptDto = {
        date: proposedData.date,
        campaignId: proposedData.campaignId,
        locationId: proposedData.locationId,
        notes: proposedData.notes,
        items: proposedData.items,
      };

      await this.applyReceiptUpdate(
        editRequest.warehouse_receipt_id,
        updateDto,
        companyId,
        editRequest.requester_id, // El usuario que solicitó la edición es quien la hace
        editRequest.warehouse_receipt,
      );
    }

    // Crear notificación para el usuario que solicitó la edición
    await this.notificationsService.createEditRequestResponseNotification(
      editRequest.requester_id,
      updatedRequest,
    );

    return updatedRequest;
  }

  async getEditRequests(companyId: string, status?: string) {
    const where: any = {
      warehouse_receipt: {
        company_id: companyId,
      },
    };

    if (status) {
      where.status = status;
    }

    return this.prisma.warehouseEditRequest.findMany({
      where,
      include: {
        warehouse_receipt: {
          include: {
            location: {
              select: {
                id: true,
                name: true,
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
        },
        requester: {
          select: {
            id: true,
            username: true,
            first_name: true,
            last_name: true,
          },
        },
        approver: {
          select: {
            id: true,
            username: true,
            first_name: true,
            last_name: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  async getReceiptEditHistory(receiptId: string, companyId: string) {
    // Verificar que la recepción pertenece a la compañía
    const receipt = await this.prisma.warehouseReceipt.findFirst({
      where: {
        id: receiptId,
        company_id: companyId,
      },
    });

    if (!receipt) {
      throw new NotFoundException('Recepción no encontrada');
    }

    return this.prisma.warehouseReceiptEdit.findMany({
      where: {
        warehouse_receipt_id: receiptId,
      },
      include: {
        edited_by: {
          select: {
            id: true,
            username: true,
            first_name: true,
            last_name: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }
}

