import { IsString, IsNotEmpty } from 'class-validator';

export class ConfirmWarehouseReceiptDto {
  @IsString()
  @IsNotEmpty()
  confirmedByName: string;
}

