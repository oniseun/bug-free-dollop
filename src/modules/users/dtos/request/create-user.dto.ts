import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserRole } from '../../enums/user-role.enum';

export class CreateUserDto {
  @ApiProperty()
  @IsString()
  @IsOptional()
  @MaxLength(255)
  firstName: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  @MaxLength(255)
  lastName: string;

  @ApiProperty()
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(255)
  password: string;

  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole)
  role: UserRole;
}
