import { Injectable, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
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
}

