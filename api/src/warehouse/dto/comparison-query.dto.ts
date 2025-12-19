import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class ComparisonQueryDto {
  @IsString()
  @IsNotEmpty()
  date: string;

  @IsString()
  @IsOptional()
  locationId?: string;

  @IsString()
  @IsOptional()
  campaignId?: string;
}

