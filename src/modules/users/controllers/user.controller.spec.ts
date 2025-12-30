import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { UserController } from './user.controller';
import { UserService } from '../services/user.service';
import { CreateUserDto } from '../dtos/request/create-user.dto';
import { UpdateUserDto } from '../dtos/request/update-user.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { ResponseFormat } from '../../common/response-format';
import { UserRole } from '../enums/user-role.enum';
import { CurrentUser } from '../../auth/interfaces/jwt-payload.interface';
import { UserDto } from '../dtos/response/user.dto';
import { PageDto } from '../../common/dtos/page.dto';

describe('UserController', () => {
  let userController: UserController;
  let userService: DeepMocked<UserService>;

  const mockAdmin: CurrentUser = {
    userId: 1,
    role: UserRole.admin,
  };

  const mockUser: CurrentUser = {
    userId: 2,
    role: UserRole.user,
  };

  beforeEach(() => {
    userService = createMock<UserService>();
    userController = new UserController(userService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createUserDto: CreateUserDto = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@eequ.org',
      password: 'password123',
      role: UserRole.user,
    };

    it('should create a new user successfully', async () => {
      const mockResponse = new ResponseFormat(true, 'User created successfully', {
        id: 1,
        ...createUserDto,
      });
      userService.createUser.mockResolvedValue(mockResponse);

      const result = await userController.createUser(createUserDto);

      expect(userService.createUser).toHaveBeenCalledWith(createUserDto);
      expect(userService.createUser).toHaveBeenCalledTimes(1);
      expect(result).toBe(mockResponse);
      expect(result.success).toBe(true);
    });

    it('should handle service errors', async () => {
      const error = new Error('Database error');
      userService.createUser.mockRejectedValue(error);

      await expect(userController.createUser(createUserDto)).rejects.toThrow('Database error');
    });
  });

  describe('find', () => {
    const paginationDto: PaginationDto = {
      limit: 10,
      offset: 0,
      search: '',
    };

    it('should return paginated users list', async () => {
      const mockUsers: UserDto[] = [
        { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@eequ.org', role: UserRole.user },
        { id: 2, firstName: 'Jane', lastName: 'Smith', email: 'jane@eequ.org', role: UserRole.user },
      ];
      const mockResponse = new ResponseFormat(
        true,
        'Users retrieved successfully',
        new PageDto(mockUsers, 2, 10, 0),
      );
      userService.findUsers.mockResolvedValue(mockResponse);

      const result = await userController.find(paginationDto, mockAdmin);

      expect(userService.findUsers).toHaveBeenCalledWith(paginationDto, mockAdmin);
      expect(result.success).toBe(true);
      expect(result.data.total).toBe(2);
    });

    it('should work without authentication (public endpoint)', async () => {
      const mockResponse = new ResponseFormat(
        true,
        'Users retrieved successfully',
        new PageDto([], 0, 10, 0),
      );
      userService.findUsers.mockResolvedValue(mockResponse);

      const result = await userController.find(paginationDto, undefined);

      expect(userService.findUsers).toHaveBeenCalledWith(paginationDto, undefined);
      expect(result.success).toBe(true);
    });
  });

  describe('getUser', () => {
    it('should return a user by ID', async () => {
      const mockUserDto = {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@eequ.org',
        role: UserRole.user,
      };
      const mockResponse = new ResponseFormat(
        true,
        'User retrieved successfully',
        mockUserDto,
      );
      userService.getUser.mockResolvedValue(mockResponse);

      const result = await userController.getUser(1, mockAdmin);

      expect(userService.getUser).toHaveBeenCalledWith(1, mockAdmin);
      expect(result.success).toBe(true);
      expect(result.data.id).toBe(1);
    });

    it('should throw NotFoundException when user not found', async () => {
      userService.getUser.mockRejectedValue(
        new NotFoundException(new ResponseFormat(false, 'User not found')),
      );

      await expect(userController.getUser(999, mockAdmin)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateUserDto: UpdateUserDto = {
      firstName: 'Updated',
      lastName: 'Name',
    };

    it('should allow user to update their own profile', async () => {
      const mockUserDto: UserDto = {
        id: 2,
        firstName: updateUserDto.firstName!,
        lastName: updateUserDto.lastName!,
        email: 'user@eequ.org',
        role: UserRole.user,
      };
      const mockResponse = new ResponseFormat(true, 'User updated successfully', mockUserDto);
      userService.updateUser.mockResolvedValue(mockResponse);

      const result = await userController.updateUser(2, updateUserDto, mockUser);

      expect(userService.updateUser).toHaveBeenCalledWith(2, updateUserDto, mockUser);
      expect(result.success).toBe(true);
    });

    it('should allow admin to update any user', async () => {
      const mockUserDto: UserDto = {
        id: 2,
        firstName: updateUserDto.firstName!,
        lastName: updateUserDto.lastName!,
        email: 'user@eequ.org',
        role: UserRole.user,
      };
      const mockResponse = new ResponseFormat(true, 'User updated successfully', mockUserDto);
      userService.updateUser.mockResolvedValue(mockResponse);

      const result = await userController.updateUser(2, updateUserDto, mockAdmin);

      expect(userService.updateUser).toHaveBeenCalledWith(2, updateUserDto, mockAdmin);
      expect(result.success).toBe(true);
    });

    it('should throw ForbiddenException when non-admin tries to update another user', async () => {
      userService.updateUser.mockRejectedValue(
        new ForbiddenException(
          new ResponseFormat(false, 'You do not have access to update this user'),
        ),
      );

      await expect(userController.updateUser(999, updateUserDto, mockUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('delete', () => {
    it('should allow admin to delete a user', async () => {
      const mockResponse = new ResponseFormat(true, 'User deleted successfully');
      userService.deleteUser.mockResolvedValue(mockResponse);

      const result = await userController.delete(2, mockAdmin);

      expect(userService.deleteUser).toHaveBeenCalledWith(2, mockAdmin);
      expect(result.success).toBe(true);
    });

    it('should throw ForbiddenException when user tries to delete themselves', async () => {
      userService.deleteUser.mockRejectedValue(
        new ForbiddenException(
          new ResponseFormat(false, 'You cannot delete your own account'),
        ),
      );

      await expect(userController.delete(2, mockUser)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when non-admin tries to delete another user', async () => {
      userService.deleteUser.mockRejectedValue(
        new ForbiddenException(
          new ResponseFormat(false, 'You do not have access to delete this user'),
        ),
      );

      await expect(userController.delete(999, mockUser)).rejects.toThrow(ForbiddenException);
    });
  });
});

