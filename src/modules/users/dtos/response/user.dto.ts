import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../enums/user-role.enum';
import { User } from '../../entities/user.entity';
import { maskEmail } from '../../../common/utils/email-mask.util';

export class UserDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty({ description: 'Masked email address' })
  email: string;

  @ApiProperty({ enum: UserRole })
  role: UserRole;

  static fromEntity(entity: User): UserDto {
    const dto = new UserDto();
    dto.id = entity.id;
    dto.firstName = entity.firstName;
    dto.lastName = entity.lastName;
    dto.email = maskEmail(entity.email);
    dto.role = entity.role;
    return dto;
  }
}
