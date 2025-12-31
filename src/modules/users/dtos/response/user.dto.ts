import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../enums/user-role.enum';
import { User } from '../../entities/user.entity';

export class UserDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty({ description: 'email address', required: false })
  email?: string;

  @ApiProperty({ enum: UserRole, required: false })
  role?: UserRole;

  static fromEntity(entity: User, displaySensitiveData: boolean = false): UserDto {
    const dto = new UserDto();
    dto.id = entity.id;
    dto.firstName = entity.firstName;
    dto.lastName = entity.lastName;
    if (displaySensitiveData) {
      dto.email = entity.email;
      dto.role = entity.role;
    } 
    return dto;
  }
}
