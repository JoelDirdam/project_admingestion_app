import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { Product } from '@prisma/client';

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  create(@Body() createProductDto: CreateProductDto, @Request() req): Promise<Product> {
    const companyId = req.user.companyId;
    return this.productsService.create(createProductDto, companyId);
  }

  @Get()
  findAll(
    @Request() req,
    @Query('includeInactive') includeInactive?: string,
  ): Promise<Product[]> {
    const companyId = req.user.companyId;
    const includeInactiveBool = includeInactive === 'true';
    return this.productsService.findAll(companyId, includeInactiveBool);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req): Promise<Product> {
    const companyId = req.user.companyId;
    return this.productsService.findOne(id, companyId);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @Request() req,
  ): Promise<Product> {
    const companyId = req.user.companyId;
    return this.productsService.update(id, updateProductDto, companyId);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string, @Request() req): Promise<Product> {
    const companyId = req.user.companyId;
    return this.productsService.remove(id, companyId);
  }

  @Get('variants/with-prices')
  getProductVariantsWithPrices(@Request() req) {
    const companyId = req.user.companyId;
    return this.productsService.getProductVariantsWithPrices(companyId);
  }
}

