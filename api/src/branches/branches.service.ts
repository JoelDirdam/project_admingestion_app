import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { LocationType } from '@prisma/client';

@Injectable()
export class BranchesService {
  constructor(private prisma: PrismaService) {}

  async create(createBranchDto: CreateBranchDto, companyId: string) {
    return this.prisma.location.create({
      data: {
        name: createBranchDto.name,
        type: LocationType.BRANCH,
        address: createBranchDto.address,
        contact_name: createBranchDto.contact_name,
        contact_phone: createBranchDto.contact_phone,
        company_id: companyId,
        is_active: true,
      },
    });
  }

  async findAll(companyId: string) {
    return this.prisma.location.findMany({
      where: {
        company_id: companyId,
        type: LocationType.BRANCH,
        is_active: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findOne(id: string, companyId: string) {
    const branch = await this.prisma.location.findFirst({
      where: {
        id,
        company_id: companyId,
        type: LocationType.BRANCH,
        is_active: true,
      },
    });

    if (!branch) {
      throw new NotFoundException('Sucursal no encontrada');
    }

    return branch;
  }
}

