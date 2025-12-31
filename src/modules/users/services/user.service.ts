import {
  Injectable,
  NotFoundException,
  Inject,
  ConflictException,
  Logger,
  ForbiddenException,
  BadRequestException,
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
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { UserRole } from '../enums/user-role.enum';
import { CurrentUser } from '../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly userRepository: UserRepository,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async findUsers(
    query: PaginationDto,
    currentUser?: CurrentUser,
  ): Promise<ResponseFormat<PageDto<UserDto>>> {
    const { limit, offset, search } = query;
    const queryBuilder = this.userRepository.createQueryBuilder('user');

    if (search) {
      queryBuilder.where('user.firstName LIKE :search', {
        search: `%${search}%`,
      });
    }

    try {
      const [users, count] = await queryBuilder
        .take(limit)
        .skip(offset)
        .orderBy('user.createdDate', 'DESC')
        .getManyAndCount();

      const dtos = users.map((user) =>
        UserDto.fromEntity(
          user,
          !!currentUser &&
            (currentUser.role === UserRole.admin ||
              currentUser.userId === user.id),
        ),
      );

      return new ResponseFormat(
        true,
        'Users retrieved successfully',
        new PageDto(dtos, count, limit, offset),
      );
    } catch (error) {
      this.logger.error(`Error finding users: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getUser(
    id: number,
    currentUser?: CurrentUser,
  ): Promise<ResponseFormat<UserDto>> {
    try {
      const cacheKey = `user_${id}`;
      let user = await this.cacheManager.get<User>(cacheKey);
      if (!user) {
        user = await this.userRepository.findOneById(id);

        if (!user) {
          this.logger.warn(`User with ID ${id} not found`);
          throw new NotFoundException(
            new ResponseFormat(false, 'User not found'),
          );
        }
        await this.cacheManager.set(cacheKey, user);
      }
      const userDto = UserDto.fromEntity(
        user,
        currentUser?.role === UserRole.admin || currentUser?.userId === user.id,
      );

      return new ResponseFormat(true, 'User retrieved successfully', userDto);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(
        `Error getting user ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async createUser(dto: CreateUserDto): Promise<ResponseFormat<UserDto>> {
    try {
      const existingUser = await this.userRepository
        .createQueryBuilder('user')
        .where('user.email = :email', { email: dto.email })
        .getOne();

      if (existingUser) {
        this.logger.warn(
          `Attempt to create user with existing email: ${dto.email}`,
        );
        throw new ConflictException(
          new ResponseFormat(false, 'Email already exists'),
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
      this.logger.log(`User created with ID ${createdUser.id}`);

      return new ResponseFormat(
        true,
        'User created successfully',
        UserDto.fromEntity(createdUser, true),
      );
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      this.logger.error(`Error creating user: ${error.message}`, error.stack);
      throw error;
    }
  }

  async updateUser(
    id: number,
    dto: UpdateUserDto,
    currentUser: CurrentUser,
  ): Promise<ResponseFormat<UserDto>> {
    try {
      const user = await this.userRepository.findOneById(id);

      if (!user) {
        this.logger.warn(`User with ID ${id} not found for update`);
        throw new NotFoundException(
          new ResponseFormat(false, 'User not found'),
        );
      }

      // Check if user is admin or updating themselves
      const isAdmin = currentUser.role === UserRole.admin;
      const isSelf = currentUser.userId === id;

      if (!isAdmin && !isSelf) {
        this.logger.warn(
          `Forbidden access attempt to update user ${id} by user ${currentUser.userId}`,
        );
        throw new ForbiddenException(
          new ResponseFormat(
            false,
            'You do not have access to update this user',
          ),
        );
      }

      if (dto.email !== undefined && dto.email !== user.email) {
        const existingUser = await this.userRepository
          .createQueryBuilder('user')
          .where('user.email = :email', { email: dto.email })
          .getOne();

        if (existingUser) {
          this.logger.warn(
            `Attempt to update user ${id} to existing email: ${dto.email}`,
          );
          throw new ConflictException(
            new ResponseFormat(false, 'Email already exists'),
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

      await this.cacheManager.del(`user_${id}`);

      this.logger.log(
        `User updated with ID ${updatedUser.id}${currentUser ? ` by user ${currentUser.userId}` : ''}`,
      );
      return new ResponseFormat(
        true,
        'User updated successfully',
        UserDto.fromEntity(updatedUser, true),
      );
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException ||
        error instanceof ForbiddenException
      )
        throw error;
      this.logger.error(
        `Error updating user ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async deleteUser(
    id: number,
    currentUser?: CurrentUser,
  ): Promise<ResponseFormat<void>> {
    try {
      const user = await this.userRepository.findOneById(id);
      if (!user) {
        this.logger.warn(`User with ID ${id} not found for deletion`);
        throw new NotFoundException(
          new ResponseFormat(false, 'User not found'),
        );
      }

      // Prevent self-deletion
      if (currentUser && currentUser.userId === id) {
        this.logger.warn(
          `User ${currentUser.userId} attempted to delete themselves`,
        );
        throw new BadRequestException(
          new ResponseFormat(false, 'You cannot delete your own account'),
        );
      }

      await this.userRepository.delete(id);
      await this.cacheManager.del(`user_${id}`);

      this.logger.log(
        `User deleted with ID ${id}${currentUser ? ` by user ${currentUser.userId}` : ''}`,
      );
      return new ResponseFormat(true, 'User deleted successfully');
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ForbiddenException
      )
        throw error;
      this.logger.error(
        `Error deleting user ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
