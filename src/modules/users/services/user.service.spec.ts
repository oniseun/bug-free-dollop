import { ConflictException, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { SelectQueryBuilder } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { UserService } from './user.service';
import { UserRepository } from '../repositories/user.repository';
import { User } from '../entities/user.entity';
import { UserRole } from '../enums/user-role.enum';
import { CreateUserDto } from '../dtos/request/create-user.dto';
import { UpdateUserDto } from '../dtos/request/update-user.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { CurrentUser } from '../../auth/interfaces/jwt-payload.interface';

jest.mock('bcrypt');

describe('UserService', () => {
  let userService: UserService;
  let userRepository: DeepMocked<UserRepository>;
  let cacheManager: DeepMocked<Cache>;

  const mockUser: User = {
    id: 1,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@eequ.org',
    password: '$2b$10$hashedPassword',
    role: UserRole.user,
    createdDate: new Date(),
    updatedDate: new Date(),
    products: [],
  };

  const mockAdmin: CurrentUser = {
    userId: 99,
    role: UserRole.admin,
  };

  const mockRegularUser: CurrentUser = {
    userId: 1,
    role: UserRole.user,
  };

  beforeEach(() => {
    const mockQueryBuilder = createMock<SelectQueryBuilder<User>>();
    mockQueryBuilder.where.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.andWhere.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.take.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.skip.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.orderBy.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

    userRepository = createMock<UserRepository>();
    userRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

    cacheManager = createMock<Cache>();

    userService = new UserService(userRepository, cacheManager);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    const createUserDto: CreateUserDto = {
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@eequ.org',
      password: 'password123',
      role: UserRole.user,
    };

    it('should successfully create a new user', async () => {
      const salt = 'randomSalt';
      const hashedPassword = '$2b$10$newHashedPassword';
      
      const mockQueryBuilder = userRepository.createQueryBuilder('user');
      (mockQueryBuilder.getOne as jest.Mock).mockResolvedValue(null); // No existing user
      
      (bcrypt.genSalt as jest.Mock).mockResolvedValue(salt);
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      
      const savedUser = { ...mockUser, ...createUserDto, password: hashedPassword, id: 1 };
      userRepository.save.mockResolvedValue(savedUser);

      const result = await userService.createUser(createUserDto);

      // We don't check findOneByEmail because service uses QueryBuilder
      expect(userRepository.createQueryBuilder).toHaveBeenCalled(); 
      expect(bcrypt.genSalt).toHaveBeenCalled();
      expect(bcrypt.hash).toHaveBeenCalledWith(createUserDto.password, salt);
      expect(userRepository.save).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.message).toBe('User created successfully');
      expect(result.data).toBeDefined();
    });

    it('should throw ConflictException when email already exists', async () => {
      const mockQueryBuilder = userRepository.createQueryBuilder('user');
      (mockQueryBuilder.getOne as jest.Mock).mockResolvedValue(mockUser);

      await expect(userService.createUser(createUserDto)).rejects.toThrow(ConflictException);
      expect(userRepository.createQueryBuilder).toHaveBeenCalled();
      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('should hash password before saving', async () => {
      const salt = 'randomSalt';
      const hashedPassword = '$2b$10$newHashedPassword';
      
      const mockQueryBuilder = userRepository.createQueryBuilder('user');
      (mockQueryBuilder.getOne as jest.Mock).mockResolvedValue(null);
      
      (bcrypt.genSalt as jest.Mock).mockResolvedValue(salt);
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      
      const savedUser = { ...mockUser, ...createUserDto, password: hashedPassword, id: 1 };
      userRepository.save.mockResolvedValue(savedUser);

      await userService.createUser(createUserDto);

      expect(bcrypt.hash).toHaveBeenCalledWith(createUserDto.password, salt);
      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ password: hashedPassword })
      );
    });

    it('should handle database errors during save', async () => {
      const mockQueryBuilder = userRepository.createQueryBuilder('user');
      (mockQueryBuilder.getOne as jest.Mock).mockResolvedValue(null);
      
      (bcrypt.genSalt as jest.Mock).mockResolvedValue('salt');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      
      userRepository.save.mockRejectedValue(new Error('Database error'));

      await expect(userService.createUser(createUserDto)).rejects.toThrow('Database error');
    });
  });

  describe('findUsers', () => {
    const paginationDto: PaginationDto = {
      limit: 10,
      offset: 0,
      search: '',
    };

    it('should return paginated users list', async () => {
      const users = [mockUser, { ...mockUser, id: 2, email: 'jane@eequ.org' }];
      const mockQueryBuilder = userRepository.createQueryBuilder('user');
      (mockQueryBuilder.getManyAndCount as jest.Mock).mockResolvedValue([users, 2]);

      const result = await userService.findUsers(paginationDto, mockAdmin);

      expect(userRepository.createQueryBuilder).toHaveBeenCalledWith('user');
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(result.success).toBe(true);
      expect(result.data.total).toBe(2);
      expect(result.data.items).toHaveLength(2);
    });

    it('should filter by search term when provided', async () => {
      const searchDto = { ...paginationDto, search: 'john' };
      const mockQueryBuilder = userRepository.createQueryBuilder('user');
      (mockQueryBuilder.getManyAndCount as jest.Mock).mockResolvedValue([[mockUser], 1]);

      await userService.findUsers(searchDto, mockAdmin);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'user.firstName LIKE :search',
        { search: '%john%' },
      );
    });

    it('should show full emails to admin users', async () => {
      const mockQueryBuilder = userRepository.createQueryBuilder('user');
      (mockQueryBuilder.getManyAndCount as jest.Mock).mockResolvedValue([[mockUser], 1]);

      const result = await userService.findUsers(paginationDto, mockAdmin);

      expect(result.data.items[0].email).toBeDefined();
    });

    it('should mask emails for non-admin users', async () => {
      const otherUser = { ...mockUser, id: 999 };
      const mockQueryBuilder = userRepository.createQueryBuilder('user');
      (mockQueryBuilder.getManyAndCount as jest.Mock).mockResolvedValue([[otherUser], 1]);

      const result = await userService.findUsers(paginationDto, mockRegularUser);

      expect(result.data.items[0].email).toBeUndefined();
    });

    it('should handle empty results', async () => {
      const mockQueryBuilder = userRepository.createQueryBuilder('user');
      (mockQueryBuilder.getManyAndCount as jest.Mock).mockResolvedValue([[], 0]);

      const result = await userService.findUsers(paginationDto, mockAdmin);

      expect(result.success).toBe(true);
      expect(result.data.total).toBe(0);
      expect(result.data.items).toHaveLength(0);
    });
  });

  describe('getUser', () => {
    it('should return cached user if available', async () => {
      cacheManager.get.mockResolvedValue(mockUser);

      const result = await userService.getUser(1, mockAdmin);

      expect(cacheManager.get).toHaveBeenCalledWith('user_1');
      expect(userRepository.findOneById).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should fetch from database and cache if not in cache', async () => {
      cacheManager.get.mockResolvedValue(null);
      userRepository.findOneById.mockResolvedValue(mockUser);

      const result = await userService.getUser(1, mockAdmin);

      expect(cacheManager.get).toHaveBeenCalledWith('user_1');
      expect(userRepository.findOneById).toHaveBeenCalledWith(1);
      expect(cacheManager.set).toHaveBeenCalledWith('user_1', mockUser);
      expect(result.success).toBe(true);
    });

    it('should throw NotFoundException when user not found', async () => {
      cacheManager.get.mockResolvedValue(null);
      userRepository.findOneById.mockResolvedValue(null);

      await expect(userService.getUser(999, mockAdmin)).rejects.toThrow(NotFoundException);
      expect(userRepository.findOneById).toHaveBeenCalledWith(999);
    });

    it('should show full email to admin', async () => {
      cacheManager.get.mockResolvedValue(null);
      userRepository.findOneById.mockResolvedValue(mockUser);

      const result = await userService.getUser(1, mockAdmin);

      expect(result.data.email).toBe(mockUser.email);
    });

    it('should show full email to the user themselves', async () => {
      cacheManager.get.mockResolvedValue(null);
      userRepository.findOneById.mockResolvedValue(mockUser);

      const result = await userService.getUser(1, mockRegularUser);

      expect(result.data.email).toBe(mockUser.email);
    });
  });

  describe('updateUser', () => {
    const updateUserDto: UpdateUserDto = {
      firstName: 'Updated',
      lastName: 'Name',
    };

    it('should allow user to update their own profile', async () => {
      userRepository.findOneById.mockResolvedValue(mockUser);
      const savedUser = { ...mockUser, ...updateUserDto, id: 1 };
      userRepository.save.mockResolvedValue(savedUser);

      const result = await userService.updateUser(1, updateUserDto, mockRegularUser);

      expect(userRepository.findOneById).toHaveBeenCalledWith(1);
      expect(userRepository.save).toHaveBeenCalled();
      expect(cacheManager.del).toHaveBeenCalledWith('user_1');
      expect(result.success).toBe(true);
    });

    it('should allow admin to update any user', async () => {
      userRepository.findOneById.mockResolvedValue(mockUser);
      const savedUser = { ...mockUser, ...updateUserDto, id: 1 };
      userRepository.save.mockResolvedValue(savedUser);

      const result = await userService.updateUser(1, updateUserDto, mockAdmin);

      expect(result.success).toBe(true);
    });

    it('should throw ForbiddenException when non-admin tries to update another user', async () => {
      const otherUserId = 999;
      const otherUser = { ...mockUser, id: otherUserId };
      userRepository.findOneById.mockResolvedValue(otherUser);

      await expect(
        userService.updateUser(otherUserId, updateUserDto, mockRegularUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      userRepository.findOneById.mockResolvedValue(null);

      await expect(
        userService.updateUser(999, updateUserDto, mockAdmin),
      ).rejects.toThrow(NotFoundException);
    });

    it('should hash password if provided in update', async () => {
      const updateWithPassword = { ...updateUserDto, password: 'newPassword123' };
      const salt = 'randomSalt';
      const hashedPassword = '$2b$10$newHashedPassword';
      
      userRepository.findOneById.mockResolvedValue(mockUser);
      
      (bcrypt.genSalt as jest.Mock).mockResolvedValue(salt);
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      
      const savedUser = { ...mockUser, id: 1, password: hashedPassword };
      userRepository.save.mockResolvedValue(savedUser);

      await userService.updateUser(1, updateWithPassword, mockRegularUser);

      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword123', salt);
      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ password: hashedPassword }),
      );
    });

    it('should throw ConflictException when updating to existing email', async () => {
      const updateWithEmail = { ...updateUserDto, email: 'existing@eequ.org' };
      
      userRepository.findOneById.mockResolvedValue(mockUser);
      
      const mockQueryBuilder = userRepository.createQueryBuilder('user');
      (mockQueryBuilder.getOne as jest.Mock).mockResolvedValue({ id: 999, email: 'existing@eequ.org' });

      await expect(
        userService.updateUser(1, updateWithEmail, mockRegularUser),
      ).rejects.toThrow(ConflictException);
    });

    it('should invalidate cache after update', async () => {
      userRepository.findOneById.mockResolvedValue(mockUser);
      const savedUser = { ...mockUser, ...updateUserDto, id: 1 };
      userRepository.save.mockResolvedValue(savedUser);

      await userService.updateUser(1, updateUserDto, mockRegularUser);

      expect(cacheManager.del).toHaveBeenCalledWith('user_1');
    });
  });

  describe('deleteUser', () => {
    it('should allow admin to delete any user', async () => {
      // User 1 is trying to delete User 2
      const targetUser = { ...mockUser, id: 2 }; 
      userRepository.findOneById.mockResolvedValue(targetUser);
      userRepository.delete.mockResolvedValue(undefined);

      const result = await userService.deleteUser(2, mockAdmin);

      expect(userRepository.findOneById).toHaveBeenCalledWith(2);
      expect(userRepository.delete).toHaveBeenCalledWith(2);
      expect(cacheManager.del).toHaveBeenCalledWith('user_2');
      expect(result.success).toBe(true);
    });

    it('should throw BadRequestException when user tries to delete themselves', async () => {
      userRepository.findOneById.mockResolvedValue(mockUser); // id 1

      await expect(userService.deleteUser(1, mockRegularUser)).rejects.toThrow(
        'You cannot delete your own account',
      );
      expect(userRepository.delete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when user does not exist', async () => {
      userRepository.findOneById.mockResolvedValue(null);

      await expect(userService.deleteUser(999, mockAdmin)).rejects.toThrow(NotFoundException);
      expect(userRepository.delete).not.toHaveBeenCalled();
    });

    it('should invalidate cache after deletion', async () => {
      const targetUser = { ...mockUser, id: 2 };
      userRepository.findOneById.mockResolvedValue(targetUser);
      userRepository.delete.mockResolvedValue(undefined);

      await userService.deleteUser(2, mockAdmin);

      expect(cacheManager.del).toHaveBeenCalledWith('user_2');
    });
  });
});
