import { IsString, IsOptional, IsArray, ValidateNested, IsNotEmpty, IsDateString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateWarehouseReceiptItemDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsInt()
  @Min(0)
  quantityReceived: number;
}

export class UpdateWarehouseReceiptDto {
  @IsDateString()
  @IsOptional()
  date?: string;

  @IsString()
  @IsOptional()
  campaignId?: string;

  @IsString()
  @IsOptional()
  locationId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateWarehouseReceiptItemDto)
  @IsOptional()
  items?: UpdateWarehouseReceiptItemDto[];

  @IsString()
  @IsOptional()
  notes?: string;
}

