import { IsString, IsNotEmpty, IsEnum, IsOptional, IsArray, ValidateNested, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { SaleChannel } from '@prisma/client';
import { CreateSaleItemDto } from './create-sale-item.dto';

export class CreateSaleDto {
  @IsString()
  @IsOptional()
  location_id?: string; // Opcional: si es seller usa su location_id, si es admin puede seleccionar

  @IsDateString()
  @IsNotEmpty()
  sale_date: string;

  @IsEnum(SaleChannel)
  @IsNotEmpty()
  channel: SaleChannel;

  @IsString()
  @IsOptional()
  customer_name?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSaleItemDto)
  @IsNotEmpty()
  items: CreateSaleItemDto[];
}

