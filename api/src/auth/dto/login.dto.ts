import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\S+$/, { message: 'El username no puede contener espacios' })
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}


