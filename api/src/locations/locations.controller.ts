import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { LocationsService } from './locations.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('locations')
@UseGuards(JwtAuthGuard)
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get()
  async findAll(
    @Query('type') type?: string,
    @Request() req?: any,
  ) {
    return this.locationsService.findAll(req.user.companyId, type);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async create(@Body() createLocationDto: CreateLocationDto, @Request() req) {
    return this.locationsService.create(createLocationDto, req.user.companyId);
  }
}

