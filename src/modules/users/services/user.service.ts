import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from '../repositories/user.repository';
import { CreateUserDto } from '../dtos/request/create-user.dto';
import { UpdateUserDto } from '../dtos/request/update-user.dto';
import { UserDto } from '../dtos/response/user.dto';
import { ResponseFormat } from '../../common/response-format';
import { PageDto } from '../../common/dtos/page.dto';
import { User } from '../entities/user.entity';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async findUsers(query: {
    search?: string;
    limit: number;
    offset: number;
  }): Promise<ResponseFormat<PageDto<UserDto>>> {
    const { limit, offset, search } = query;
    const queryBuilder = this.userRepository.createQueryBuilder('user');

    if (search) {
      queryBuilder.where('user.firstName LIKE :search', {
        search: `%${search}%`,
      });
    }

    const [users, count] = await queryBuilder
      .take(limit)
      .skip(offset)
      .orderBy('user.createdDate', 'DESC')
      .getManyAndCount();

    const dtos = users.map(UserDto.fromEntity);

    return new ResponseFormat(
      true,
      'Users retrieved successfully',
      new PageDto(dtos, count, limit, offset),
    );
  }

  async getUser(id: number): Promise<ResponseFormat<UserDto>> {
    const user = await this.userRepository.findOneById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return new ResponseFormat(
      true,
      'User retrieved successfully',
      UserDto.fromEntity(user),
    );
  }

  async createUser(dto: CreateUserDto): Promise<ResponseFormat<UserDto>> {
    const user = new User();
    user.firstName = dto.firstName;
    user.lastName = dto.lastName;
    user.email = dto.email;
    user.password = dto.password; // Note: In a real app, hash this!
    user.role = dto.role;

    const createdUser = await this.userRepository.save(user);
    return new ResponseFormat(
      true,
      'User created successfully',
      UserDto.fromEntity(createdUser),
    );
  }

  async updateUser(
    id: number,
    dto: UpdateUserDto,
  ): Promise<ResponseFormat<UserDto>> {
    const user = await this.userRepository.findOneById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.firstName !== undefined) user.firstName = dto.firstName;
    if (dto.lastName !== undefined) user.lastName = dto.lastName;
    if (dto.email !== undefined) user.email = dto.email;
    if (dto.password !== undefined) user.password = dto.password; // Should hash
    if (dto.role !== undefined) user.role = dto.role;

    const updatedUser = await this.userRepository.save(user);
    return new ResponseFormat(
      true,
      'User updated successfully',
      UserDto.fromEntity(updatedUser),
    );
  }

  async deleteUser(id: number): Promise<ResponseFormat<void>> {
    const user = await this.userRepository.findOneById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userRepository.delete(id);
    return new ResponseFormat(true, 'User deleted successfully');
  }
}

