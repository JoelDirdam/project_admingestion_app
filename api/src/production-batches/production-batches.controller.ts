import { Controller, Post, Body, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ProductionBatchesService } from './production-batches.service';
import { CreateProductionBatchDto } from './dto/create-production-batch.dto';
import { ProductionSummaryQueryDto } from './dto/production-summary-query.dto';
import { ProductionByDateQueryDto } from './dto/production-by-date-query.dto';
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

  @Get('summary')
  getSummary(@Query() query: ProductionSummaryQueryDto, @Request() req) {
    const companyId = req.user.companyId;
    return this.productionBatchesService.getSummary(
      companyId,
      query.campaignId,
      query.fromDate,
      query.toDate,
    );
  }

  @Get('by-date')
  getByDate(@Query() query: ProductionByDateQueryDto, @Request() req) {
    const companyId = req.user.companyId;
    return this.productionBatchesService.getByDate(
      companyId,
      query.date,
      query.campaignId,
    );
  }
}



