import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ description: 'Product identification number', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  number: string;

  @ApiProperty({ description: 'Title of the product', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({ description: 'Detailed description of the product' })
  @IsString()
  @IsNotEmpty()
  description: string;
}
