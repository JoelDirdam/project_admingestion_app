import { IsString, IsNotEmpty, IsDateString, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class WarehouseReceiptItemDto {
  @IsString()
  @IsNotEmpty()
  productId: string; // Usamos productId, el servicio buscará/creará el variant

  @IsNotEmpty()
  quantityReceived: number;
}

export class CreateWarehouseReceiptDto {
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @IsString()
  @IsOptional()
  campaignId?: string;

  @IsString()
  @IsNotEmpty()
  locationId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WarehouseReceiptItemDto)
  items: WarehouseReceiptItemDto[];

  @IsString()
  @IsOptional()
  notes?: string;
}

