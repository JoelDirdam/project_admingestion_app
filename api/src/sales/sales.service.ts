import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { SaleChannel } from '@prisma/client';

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  async create(createSaleDto: CreateSaleDto, companyId: string, userId: string, userRole: string, userLocationId?: string) {
    // Obtener campaña activa
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

    // Determinar location_id
    let locationId: string;
    
    if (userRole === 'SELLER') {
      // Si es seller, debe usar su location_id asignada
      if (!userLocationId) {
        throw new BadRequestException('El vendedor no tiene una sucursal asignada');
      }
      locationId = userLocationId;
    } else if (userRole === 'ADMIN') {
      // Si es admin, puede seleccionar la sucursal
      if (!createSaleDto.location_id) {
        throw new BadRequestException('Debe especificar una sucursal para la venta');
      }
      locationId = createSaleDto.location_id;
    } else {
      throw new ForbiddenException('No tienes permisos para crear ventas');
    }

    // Verificar que la ubicación existe y pertenece a la compañía
    const location = await this.prisma.location.findFirst({
      where: {
        id: locationId,
        company_id: companyId,
        type: { in: ['BRANCH', 'STORE'] },
        is_active: true,
      },
    });

    if (!location) {
      throw new NotFoundException('La sucursal especificada no existe o no está activa');
    }

    // Validar items
    if (!createSaleDto.items || createSaleDto.items.length === 0) {
      throw new BadRequestException('La venta debe tener al menos un item');
    }

    // Verificar que todos los product_variants existen y están activos
    const variantIds = createSaleDto.items.map(item => item.product_variant_id);
    const variants = await this.prisma.productVariant.findMany({
      where: {
        id: { in: variantIds },
        is_active: true,
        product: {
          company_id: companyId,
          is_active: true,
        },
      },
      include: {
        product: true,
      },
    });

    if (variants.length !== variantIds.length) {
      throw new NotFoundException('Uno o más productos no fueron encontrados o están inactivos');
    }

    // Generar número de venta único
    const dateStr = new Date(createSaleDto.sale_date).toISOString().split('T')[0].replace(/-/g, '');
    const saleCount = await this.prisma.sale.count({
      where: {
        company_id: companyId,
        sale_date: {
          gte: new Date(createSaleDto.sale_date + 'T00:00:00'),
          lte: new Date(createSaleDto.sale_date + 'T23:59:59'),
        },
      },
    });
    const saleNumber = `SALE-${dateStr}-${String(saleCount + 1).padStart(4, '0')}`;

    // Calcular total
    const total = createSaleDto.items.reduce((sum, item) => {
      return sum + (item.unit_price * item.quantity);
    }, 0);

    // Crear la venta con sus items
    return this.prisma.sale.create({
      data: {
        company_id: companyId,
        campaign_id: activeCampaign.id,
        location_id: locationId,
        user_id: userId,
        sale_number: saleNumber,
        sale_date: new Date(createSaleDto.sale_date),
        channel: createSaleDto.channel,
        customer_name: createSaleDto.customer_name,
        total: total,
        notes: createSaleDto.notes,
        sale_items: {
          create: createSaleDto.items.map(item => ({
            product_variant_id: item.product_variant_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            subtotal: item.unit_price * item.quantity,
          })),
        },
      },
      include: {
        sale_items: {
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
  }

  async findAll(companyId: string, userId?: string, locationId?: string, userRole?: string) {
    const where: any = {
      company_id: companyId,
    };

    // Si es seller, solo ver sus ventas
    if (userRole === 'SELLER' && userId) {
      where.user_id = userId;
    }

    // Si se especifica location_id, filtrar por ella
    if (locationId) {
      where.location_id = locationId;
    }

    return this.prisma.sale.findMany({
      where,
      include: {
        sale_items: {
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
        sale_date: 'desc',
      },
    });
  }

  async findOne(id: string, companyId: string, userId?: string, userRole?: string) {
    const where: any = {
      id,
      company_id: companyId,
    };

    // Si es seller, solo puede ver sus propias ventas
    if (userRole === 'SELLER' && userId) {
      where.user_id = userId;
    }

    const sale = await this.prisma.sale.findFirst({
      where,
      include: {
        sale_items: {
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

    if (!sale) {
      throw new NotFoundException('Venta no encontrada');
    }

    return sale;
  }
}

