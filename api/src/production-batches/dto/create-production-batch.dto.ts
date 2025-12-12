import { IsDateString, IsArray, ValidateNested, IsString, IsNotEmpty, IsNumber, IsPositive, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ProductionBatchItemDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsNumber()
  @IsPositive()
  @Min(1)
  @Type(() => Number)
  quantityProduced: number;
}

export class CreateProductionBatchDto {
  @IsDateString()
  date: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductionBatchItemDto)
  items: ProductionBatchItemDto[];
}

