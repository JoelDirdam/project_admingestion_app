import { IsDateString, IsOptional, IsString } from 'class-validator';

export class ProductionByDateQueryDto {
  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  campaignId?: string;
}

