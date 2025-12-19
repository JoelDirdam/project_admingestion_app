import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLocationDto } from './dto/create-location.dto';

@Injectable()
export class LocationsService {
  constructor(private prisma: PrismaService) {}

  async findAll(companyId: string, type?: string) {
    const where: any = {
      company_id: companyId,
      is_active: true,
    };

    if (type) {
      where.type = type;
    }

    return this.prisma.location.findMany({
      where,
      orderBy: {
        name: 'asc',
      },
    });
  }

  async create(createLocationDto: CreateLocationDto, companyId: string) {
    return this.prisma.location.create({
      data: {
        name: createLocationDto.name,
        type: createLocationDto.type,
        address: createLocationDto.address,
        contact_name: createLocationDto.contact_name,
        contact_phone: createLocationDto.contact_phone,
        company_id: companyId,
        is_active: true,
      },
    });
  }
}

