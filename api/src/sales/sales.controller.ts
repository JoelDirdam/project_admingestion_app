import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Controller('sales')
@UseGuards(JwtAuthGuard)
export class SalesController {
  constructor(
    private readonly salesService: SalesService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  async create(@Body() createSaleDto: CreateSaleDto, @Request() req) {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        location_id: true,
      },
    });
    
    return this.salesService.create(
      createSaleDto,
      req.user.companyId,
      req.user.userId,
      req.user.role,
      user?.location_id || undefined,
    );
  }

  @Get('campaigns/active')
  async getActiveCampaign(@Request() req) {
    const activeCampaign = await this.prisma.campaign.findFirst({
      where: {
        company_id: req.user.companyId,
        status: 'ACTIVE',
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    if (!activeCampaign) {
      return null;
    }

    return activeCampaign;
  }

  @Get()
  async findAll(
    @Query('location_id') locationId?: string,
    @Request() req?: any,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        location_id: true,
      },
    });
    
    return this.salesService.findAll(
      req.user.companyId,
      req.user.userId,
      locationId,
      req.user.role,
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    return this.salesService.findOne(
      id,
      req.user.companyId,
      req.user.userId,
      req.user.role,
    );
  }
}

