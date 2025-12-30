import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { AuthService } from './auth.service';
import { UserRepository } from '../../users/repositories/user.repository';
import { User } from '../../users/entities/user.entity';
import { UserRole } from '../../users/enums/user-role.enum';

// Mock bcrypt
jest.mock('bcrypt');

describe('AuthService', () => {
  let authService: AuthService;
  let userRepository: DeepMocked<UserRepository>;
  let jwtService: DeepMocked<JwtService>;

  beforeEach(() => {
    userRepository = createMock<UserRepository>();
    jwtService = createMock<JwtService>();

    authService = new AuthService(userRepository, jwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
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

    const loginDto = {
      email: 'john@eequ.org',
      password: 'password123',
    };

    it('should successfully login with valid credentials', async () => {
      const mockToken = 'mock.jwt.token';
      userRepository.findOneByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.sign.mockReturnValue(mockToken);

      const result = await authService.login(loginDto);

      expect(userRepository.findOneByEmail).toHaveBeenCalledWith(loginDto.email);
      expect(bcrypt.compare).toHaveBeenCalledWith(loginDto.password, mockUser.password);
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        role: mockUser.role,
      });
      expect(result).toEqual({
        success: true,
        message: 'Login successful',
        data: {
          accessToken: mockToken,
          expiresIn: 900,
        },
      });
    });

    it('should throw UnauthorizedException when user not found', async () => {
      userRepository.findOneByEmail.mockResolvedValue(null);

      await expect(authService.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(userRepository.findOneByEmail).toHaveBeenCalledWith(loginDto.email);
      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(jwtService.sign).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      userRepository.findOneByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authService.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(userRepository.findOneByEmail).toHaveBeenCalledWith(loginDto.email);
      expect(bcrypt.compare).toHaveBeenCalledWith(loginDto.password, mockUser.password);
      expect(jwtService.sign).not.toHaveBeenCalled();
    });

    it('should handle admin user login', async () => {
      const adminUser = { ...mockUser, role: UserRole.admin };
      const mockToken = 'admin.jwt.token';
      userRepository.findOneByEmail.mockResolvedValue(adminUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.sign.mockReturnValue(mockToken);

      const result = await authService.login(loginDto);

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: adminUser.id,
        role: UserRole.admin,
      });
      expect(result.data.accessToken).toBe(mockToken);
    });

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      userRepository.findOneByEmail.mockRejectedValue(dbError);

      await expect(authService.login(loginDto)).rejects.toThrow(dbError);
      expect(userRepository.findOneByEmail).toHaveBeenCalledWith(loginDto.email);
    });

    it('should handle bcrypt comparison errors', async () => {
      userRepository.findOneByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockRejectedValue(new Error('Bcrypt error'));

      await expect(authService.login(loginDto)).rejects.toThrow('Bcrypt error');
    });
  });
});
