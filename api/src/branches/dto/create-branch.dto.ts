import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateBranchDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  contact_name?: string;

  @IsString()
  @IsOptional()
  contact_phone?: string;
}

