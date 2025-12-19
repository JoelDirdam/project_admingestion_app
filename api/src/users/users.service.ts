import { Injectable, ForbiddenException, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto, companyId: string) {
    // Verificar que el username no exista
    const existingUser = await this.prisma.user.findUnique({
      where: { username: createUserDto.username },
    });

    if (existingUser) {
      throw new ConflictException('El nombre de usuario ya existe');
    }

    // Si se proporciona location_id, verificar que existe y pertenece a la compañía
    if (createUserDto.location_id) {
      const location = await this.prisma.location.findFirst({
        where: {
          id: createUserDto.location_id,
          company_id: companyId,
        },
      });

      if (!location) {
        throw new BadRequestException('La ubicación especificada no existe o no pertenece a tu compañía');
      }
    }

    // Hash de la contraseña
    const passwordHash = await bcrypt.hash(createUserDto.password, 10);

    // Crear el usuario
    return this.prisma.user.create({
      data: {
        username: createUserDto.username,
        password_hash: passwordHash,
        role: createUserDto.role,
        first_name: createUserDto.first_name,
        last_name: createUserDto.last_name,
        email: createUserDto.email,
        location_id: createUserDto.location_id,
        company_id: companyId,
        is_active: true,
      },
      select: {
        id: true,
        username: true,
        role: true,
        first_name: true,
        last_name: true,
        email: true,
        location_id: true,
        is_active: true,
        created_at: true,
      },
    });
  }

  async findAll(companyId: string) {
    return this.prisma.user.findMany({
      where: {
        company_id: companyId,
      },
      select: {
        id: true,
        username: true,
        role: true,
        first_name: true,
        last_name: true,
        email: true,
        location_id: true,
        is_active: true,
        created_at: true,
        location: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  async update(userId: string, updateUserDto: UpdateUserDto, companyId: string) {
    // Verificar que el usuario existe y pertenece a la compañía
    const existingUser = await this.prisma.user.findFirst({
      where: {
        id: userId,
        company_id: companyId,
      },
    });

    if (!existingUser) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Si se proporciona location_id, verificar que existe y pertenece a la compañía
    if (updateUserDto.location_id !== undefined) {
      if (updateUserDto.location_id) {
        const location = await this.prisma.location.findFirst({
          where: {
            id: updateUserDto.location_id,
            company_id: companyId,
          },
        });

        if (!location) {
          throw new BadRequestException('La ubicación especificada no existe o no pertenece a tu compañía');
        }
      }
    }

    // Preparar los datos a actualizar
    const updateData: any = {};

    if (updateUserDto.password) {
      // Hash de la contraseña si se proporciona
      updateData.password_hash = await bcrypt.hash(updateUserDto.password, 10);
    }

    if (updateUserDto.role !== undefined) {
      updateData.role = updateUserDto.role;
    }

    if (updateUserDto.first_name !== undefined) {
      updateData.first_name = updateUserDto.first_name;
    }

    if (updateUserDto.last_name !== undefined) {
      updateData.last_name = updateUserDto.last_name;
    }

    if (updateUserDto.email !== undefined) {
      updateData.email = updateUserDto.email;
    }

    if (updateUserDto.location_id !== undefined) {
      updateData.location_id = updateUserDto.location_id || null;
    }

    if (updateUserDto.is_active !== undefined) {
      updateData.is_active = updateUserDto.is_active;
    }

    // Actualizar el usuario
    return this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        role: true,
        first_name: true,
        last_name: true,
        email: true,
        location_id: true,
        is_active: true,
        created_at: true,
      },
    });
  }
}

