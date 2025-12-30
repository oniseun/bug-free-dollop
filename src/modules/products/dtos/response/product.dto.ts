import { ApiProperty } from '@nestjs/swagger';
import { Product } from '../../entities/product.entity';
import { UserDto } from '../../../users/dtos/response/user.dto';

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

  @ApiProperty({ type: () => UserDto })
  user?: UserDto;

  static fromEntity(entity: Product): ProductDto {
    const dto = new ProductDto();
    dto.id = entity.id;
    dto.userId = entity.userId;
    dto.number = entity.number;
    dto.title = entity.title;
    dto.description = entity.description;
    
    if (entity.user) {
      dto.user = UserDto.fromEntity(entity.user);
    }
    
    return dto;
  }
}
