import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ProductionBatchesService } from './production-batches.service';
import { CreateProductionBatchDto } from './dto/create-production-batch.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('production-batches')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class ProductionBatchesController {
  constructor(private readonly productionBatchesService: ProductionBatchesService) {}

  @Post()
  create(@Body() createProductionBatchDto: CreateProductionBatchDto, @Request() req) {
    const companyId = req.user.companyId;
    const userId = req.user.userId;
    return this.productionBatchesService.create(createProductionBatchDto, companyId, userId);
  }
}


