import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from '../services/auth.service';
import { LoginDto } from '../dtos/request/login.dto';
import { ResponseFormat } from '../../common/response-format';

describe('AuthController', () => {
  let authController: AuthController;
  let authService: jest.Mocked<AuthService>;

  beforeEach(() => {
    authService = {
      login: jest.fn(),
    } as unknown as jest.Mocked<AuthService>;

    authController = new AuthController(authService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'john@eequ.org',
      password: 'password123',
    };

    it('should successfully login and return access token', async () => {
      const mockResponse = new ResponseFormat(true, 'Login successful', {
        accessToken: 'mock.jwt.token',
        expiresIn: 900,
      });
      authService.login.mockResolvedValue(mockResponse);

      const result = await authController.login(loginDto);

      expect(authService.login).toHaveBeenCalledWith(loginDto);
      expect(authService.login).toHaveBeenCalledTimes(1);
      expect(result).toBe(mockResponse);
      expect(result.success).toBe(true);
      expect(result.data.accessToken).toBe('mock.jwt.token');
      expect(result.data.expiresIn).toBe(900);
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      const error = new UnauthorizedException(
        new ResponseFormat(false, 'Invalid credentials'),
      );
      authService.login.mockRejectedValue(error);

      await expect(authController.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(authService.login).toHaveBeenCalledWith(loginDto);
      expect(authService.login).toHaveBeenCalledTimes(1);
    });

    it('should handle service errors', async () => {
      const error = new Error('Service unavailable');
      authService.login.mockRejectedValue(error);

      await expect(authController.login(loginDto)).rejects.toThrow('Service unavailable');
      expect(authService.login).toHaveBeenCalledWith(loginDto);
    });

    it('should pass email in lowercase', async () => {
      const upperCaseDto = { ...loginDto, email: 'JOHN@EEQU.ORG' };
      const mockResponse = new ResponseFormat(true, 'Login successful', {
        accessToken: 'mock.jwt.token',
        expiresIn: 900,
      });
      authService.login.mockResolvedValue(mockResponse);

      await authController.login(upperCaseDto);

      expect(authService.login).toHaveBeenCalledWith(upperCaseDto);
    });
  });
});

