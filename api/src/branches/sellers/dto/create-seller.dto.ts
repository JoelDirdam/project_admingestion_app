import { IsString, IsNotEmpty, MinLength, Matches, IsOptional } from 'class-validator';

export class CreateSellerDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\S+$/, {
    message: 'El nombre de usuario no puede contener espacios',
  })
  username: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6, {
    message: 'La contraseña debe tener al menos 6 caracteres',
  })
  password: string;

  @IsString()
  @IsOptional()
  first_name?: string;

  @IsString()
  @IsOptional()
  last_name?: string;
}

