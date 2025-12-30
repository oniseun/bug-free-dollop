import {
  Injectable,
  NotFoundException,
  Inject,
  ConflictException,
} from '@nestjs/common';
import { UserRepository } from '../repositories/user.repository';
import { CreateUserDto } from '../dtos/request/create-user.dto';
import { UpdateUserDto } from '../dtos/request/update-user.dto';
import { UserDto } from '../dtos/response/user.dto';
import { ResponseFormat } from '../../common/response-format';
import { PageDto } from '../../common/dtos/page.dto';
import { User } from '../entities/user.entity';
import * as bcrypt from 'bcrypt';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

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
    const cacheKey = `user_${id}`;
    const cachedUser = await this.cacheManager.get<UserDto>(cacheKey);

    if (cachedUser) {
      return new ResponseFormat(
        true,
        'User retrieved successfully (from cache)',
        cachedUser,
      );
    }

    const user = await this.userRepository.findOneById(id);

    if (!user) {
      throw new NotFoundException(
        new ResponseFormat(false, 'User not found')
      );
    }

    const userDto = UserDto.fromEntity(user);
    await this.cacheManager.set(cacheKey, userDto);

    return new ResponseFormat(
      true,
      'User retrieved successfully',
      userDto,
    );
  }

  async createUser(dto: CreateUserDto): Promise<ResponseFormat<UserDto>> {
    // Check for existing email
    const existingUser = await this.userRepository.createQueryBuilder('user')
      .where('user.email = :email', { email: dto.email })
      .getOne();

    if (existingUser) {
      throw new ConflictException(
        new ResponseFormat(false, 'Email already exists')
      );
    }

    const user = new User();
    user.firstName = dto.firstName;
    user.lastName = dto.lastName;
    user.email = dto.email;
    const salt = await bcrypt.genSalt();
    user.password = await bcrypt.hash(dto.password, salt);
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
      throw new NotFoundException(
        new ResponseFormat(false, 'User not found')
      );
    }

    if (dto.email !== undefined && dto.email !== user.email) {
      const existingUser = await this.userRepository.createQueryBuilder('user')
        .where('user.email = :email', { email: dto.email })
        .getOne();

      if (existingUser) {
        throw new ConflictException(
          new ResponseFormat(false, 'Email already exists')
        );
      }
    }

    if (dto.firstName !== undefined) user.firstName = dto.firstName;
    if (dto.lastName !== undefined) user.lastName = dto.lastName;
    if (dto.email !== undefined) user.email = dto.email;
    if (dto.password !== undefined) {
      const salt = await bcrypt.genSalt();
      user.password = await bcrypt.hash(dto.password, salt);
    }
    if (dto.role !== undefined) user.role = dto.role;

    const updatedUser = await this.userRepository.save(user);

    // Invalidate cache
    await this.cacheManager.del(`user_${id}`);

    return new ResponseFormat(
      true,
      'User updated successfully',
      UserDto.fromEntity(updatedUser),
    );
  }

  async deleteUser(id: number): Promise<ResponseFormat<void>> {
    const user = await this.userRepository.findOneById(id);
    if (!user) {
      throw new NotFoundException(
        new ResponseFormat(false, 'User not found')
      );
    }

    await this.userRepository.delete(id);
    await this.cacheManager.del(`user_${id}`);

    return new ResponseFormat(true, 'User deleted successfully');
  }
}
