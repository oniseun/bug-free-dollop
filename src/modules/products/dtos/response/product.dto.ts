import { ApiProperty } from '@nestjs/swagger';
import { Product } from '../../entities/product.entity';

export class ProductDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  userId: number;

  @ApiProperty()
  number: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  static fromEntity(entity: Product): ProductDto {
    const dto = new ProductDto();
    dto.id = entity.id;
    dto.userId = entity.userId;
    dto.number = entity.number;
    dto.title = entity.title;
    dto.description = entity.description;
    return dto;
  }
}

