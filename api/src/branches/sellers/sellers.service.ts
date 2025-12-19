import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSellerDto } from './dto/create-seller.dto';
import { Role, LocationType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SellersService {
  constructor(private prisma: PrismaService) {}

  async create(
    branchId: string,
    createSellerDto: CreateSellerDto,
    companyId: string,
  ) {
    // Verificar que la sucursal existe y pertenece a la compañía
    const branch = await this.prisma.location.findFirst({
      where: {
        id: branchId,
        company_id: companyId,
        type: LocationType.BRANCH,
        is_active: true,
      },
    });

    if (!branch) {
      throw new NotFoundException(
        'Sucursal no encontrada o no pertenece a tu compañía',
      );
    }

    // Verificar que el username no exista
    const existingUser = await this.prisma.user.findUnique({
      where: { username: createSellerDto.username },
    });

    if (existingUser) {
      throw new ConflictException('El nombre de usuario ya existe');
    }

    // Validar que el username no tenga espacios
    if (/\s/.test(createSellerDto.username)) {
      throw new BadRequestException(
        'El nombre de usuario no puede contener espacios',
      );
    }

    // Hash de la contraseña
    const passwordHash = await bcrypt.hash(createSellerDto.password, 10);

    // Crear el vendedor
    return this.prisma.user.create({
      data: {
        username: createSellerDto.username,
        password_hash: passwordHash,
        role: Role.SELLER,
        first_name: createSellerDto.first_name,
        last_name: createSellerDto.last_name,
        location_id: branchId,
        company_id: companyId,
        is_active: true,
      },
      select: {
        id: true,
        username: true,
        first_name: true,
        last_name: true,
        role: true,
        location_id: true,
        is_active: true,
        created_at: true,
      },
    });
  }

  async findAllByBranch(branchId: string, companyId: string) {
    // Verificar que la sucursal existe y pertenece a la compañía
    const branch = await this.prisma.location.findFirst({
      where: {
        id: branchId,
        company_id: companyId,
        type: LocationType.BRANCH,
        is_active: true,
      },
    });

    if (!branch) {
      throw new NotFoundException(
        'Sucursal no encontrada o no pertenece a tu compañía',
      );
    }

    return this.prisma.user.findMany({
      where: {
        location_id: branchId,
        company_id: companyId,
        role: Role.SELLER,
        is_active: true,
      },
      select: {
        id: true,
        username: true,
        first_name: true,
        role: true,
        location_id: true,
        is_active: true,
        created_at: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }
}

