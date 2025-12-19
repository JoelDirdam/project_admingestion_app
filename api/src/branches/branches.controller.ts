import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { SellersService } from './sellers/sellers.service';
import { CreateSellerDto } from './sellers/dto/create-seller.dto';

@Controller('branches')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BranchesController {
  constructor(
    private readonly branchesService: BranchesService,
    private readonly sellersService: SellersService,
  ) {}

  @Post()
  @Roles(Role.ADMIN)
  async create(@Body() createBranchDto: CreateBranchDto, @Request() req) {
    return this.branchesService.create(createBranchDto, req.user.companyId);
  }

  @Get()
  @Roles(Role.ADMIN, Role.SELLER)
  async findAll(@Request() req) {
    return this.branchesService.findAll(req.user.companyId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.SELLER)
  async findOne(@Param('id') id: string, @Request() req) {
    return this.branchesService.findOne(id, req.user.companyId);
  }

  @Post(':branchId/sellers')
  @Roles(Role.ADMIN)
  async createSeller(
    @Param('branchId') branchId: string,
    @Body() createSellerDto: CreateSellerDto,
    @Request() req,
  ) {
    return this.sellersService.create(
      branchId,
      createSellerDto,
      req.user.companyId,
    );
  }

  @Get(':branchId/sellers')
  @Roles(Role.ADMIN)
  async findSellersByBranch(
    @Param('branchId') branchId: string,
    @Request() req,
  ) {
    return this.sellersService.findAllByBranch(branchId, req.user.companyId);
  }
}

