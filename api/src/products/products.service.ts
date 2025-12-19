import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from '@prisma/client';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(
    createProductDto: CreateProductDto,
    companyId: string,
  ): Promise<Product> {
    return this.prisma.product.create({
      data: {
        name: createProductDto.name,
        description: createProductDto.description,
        base_price: createProductDto.base_price,
        price_1: createProductDto.price_1,
        price_2: createProductDto.price_2,
        company_id: companyId,
        is_active: createProductDto.is_active ?? true,
      },
    });
  }

  async findAll(companyId: string, includeInactive: boolean = false): Promise<Product[]> {
    const where: any = {
      company_id: companyId,
    };

    // Por defecto, solo mostrar productos activos
    if (!includeInactive) {
      where.is_active = true;
    }

    return this.prisma.product.findMany({
      where,
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  async findOne(id: string, companyId: string): Promise<Product> {
    const product = await this.prisma.product.findFirst({
      where: {
        id,
        company_id: companyId,
      },
    });

    if (!product) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado`);
    }

    return product;
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
    companyId: string,
  ): Promise<Product> {
    const product = await this.findOne(id, companyId);

    const updateData: any = {};
    if (updateProductDto.name !== undefined) updateData.name = updateProductDto.name;
    if (updateProductDto.description !== undefined) updateData.description = updateProductDto.description;
    if (updateProductDto.base_price !== undefined) updateData.base_price = updateProductDto.base_price;
    if (updateProductDto.price_1 !== undefined) updateData.price_1 = updateProductDto.price_1;
    if (updateProductDto.price_2 !== undefined) updateData.price_2 = updateProductDto.price_2;
    if (updateProductDto.is_active !== undefined) updateData.is_active = updateProductDto.is_active;

    return this.prisma.product.update({
      where: { id: product.id },
      data: updateData,
    });
  }

  async remove(id: string, companyId: string): Promise<Product> {
    const product = await this.findOne(id, companyId);

    // Soft delete: marcar como inactivo en lugar de eliminar
    return this.prisma.product.update({
      where: { id: product.id },
      data: { is_active: false },
    });
  }

  async getProductVariantsWithPrices(companyId: string) {
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
      return [];
    }

    // Obtener todas las variantes de productos activos con sus precios de la campaña
    return this.prisma.productVariant.findMany({
      where: {
        is_active: true,
        product: {
          company_id: companyId,
          is_active: true,
        },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            base_price: true,
            price_1: true,
            price_2: true,
          },
        },
        price_configs: {
          where: {
            campaign_id: activeCampaign.id,
            is_active: true,
          },
          select: {
            id: true,
            price: true,
            cost: true,
          },
        },
      },
      orderBy: {
        product: {
          name: 'asc',
        },
      },
    });
  }
}

