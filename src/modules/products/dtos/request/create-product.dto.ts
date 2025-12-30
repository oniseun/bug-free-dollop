import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ description: 'ID of the user creating the product' })
  @IsNumber()
  @IsNotEmpty()
  userId: number;

  @ApiProperty({ description: 'Product identification number' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  number: string;

  @ApiProperty({ description: 'Title of the product' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({ description: 'Detailed description of the product' })
  @IsString()
  @IsNotEmpty()
  description: string;
}
