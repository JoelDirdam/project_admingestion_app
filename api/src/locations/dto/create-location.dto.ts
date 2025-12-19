import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { LocationType } from '@prisma/client';

export class CreateLocationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(LocationType)
  @IsNotEmpty()
  type: LocationType;

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



