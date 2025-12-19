import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class CreateSaleItemDto {
  @IsString()
  @IsNotEmpty()
  product_variant_id: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  unit_price: number;
}

