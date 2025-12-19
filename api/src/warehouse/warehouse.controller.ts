import { Controller, Post, Get, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { WarehouseService } from './warehouse.service';
import { CreateWarehouseReceiptDto } from './dto/create-warehouse-receipt.dto';
import { ConfirmWarehouseReceiptDto } from './dto/confirm-warehouse-receipt.dto';
import { ComparisonQueryDto } from './dto/comparison-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('warehouse')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WarehouseController {
  constructor(private readonly warehouseService: WarehouseService) {}

  @Post('receipts')
  @Roles(Role.WAREHOUSE, Role.ADMIN)
  async createReceipt(@Body() createDto: CreateWarehouseReceiptDto, @Request() req) {
    return this.warehouseService.createReceipt(
      createDto,
      req.user.companyId,
      req.user.userId,
    );
  }

  @Patch('receipts/:id/confirm')
  @Roles(Role.WAREHOUSE, Role.ADMIN)
  async confirmReceipt(
    @Param('id') receiptId: string,
    @Body() confirmDto: ConfirmWarehouseReceiptDto,
    @Request() req,
  ) {
    return this.warehouseService.confirmReceipt(
      receiptId,
      confirmDto,
      req.user.companyId,
      req.user.userId,
      req.user.role,
    );
  }

  @Get('receipts')
  @Roles(Role.WAREHOUSE, Role.ADMIN)
  async getHistory(
    @Query('locationId') locationId?: string,
    @Request() req?: any,
  ) {
    // Si el usuario es WAREHOUSE (no ADMIN), solo mostrar sus propias recepciones
    const userId = req.user.role === 'WAREHOUSE' ? req.user.userId : undefined;
    return this.warehouseService.getHistory(req.user.companyId, userId, locationId);
  }

  @Get('receipts/:id')
  @Roles(Role.WAREHOUSE, Role.ADMIN)
  async getReceiptById(@Param('id') receiptId: string, @Request() req) {
    return this.warehouseService.getReceiptById(receiptId, req.user.companyId);
  }

  @Get('comparison')
  @Roles(Role.ADMIN)
  async getComparison(@Query() query: ComparisonQueryDto, @Request() req) {
    return this.warehouseService.getComparison(query, req.user.companyId);
  }
}

