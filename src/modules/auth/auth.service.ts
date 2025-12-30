import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../users/services/user.service';
import { LoginDto } from './dtos/request/login.dto';
import { ResponseFormat } from '../common/response-format';
import * as bcrypt from 'bcrypt';
import { UserRepository } from '../users/repositories/user.repository';
import { LoginResponseDto } from './dtos/response/login-response.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly userRepository: UserRepository,
  ) {}

  async login(loginDto: LoginDto): Promise<ResponseFormat<LoginResponseDto>> {
    const user = await this.userRepository.createQueryBuilder('user')
        .where('user.email = :email', { email: loginDto.email })
        .addSelect('user.password') // Password is usually hidden
        .getOne();

    if (!user) {
      this.logger.warn(`Failed login attempt for email: ${loginDto.email}`);
      throw new UnauthorizedException(
        new ResponseFormat(false, 'Invalid credentials')
      );
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);

    if (!isPasswordValid) {
      this.logger.warn(`Invalid password for user: ${loginDto.email}`);
      throw new UnauthorizedException(
        new ResponseFormat(false, 'Invalid credentials')
      );
    }

    const payload = { sub: user.id, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    return new ResponseFormat(true, 'Login successful', {
      accessToken,
      expiresIn: 900, // 15 minutes in seconds
    });
  }
}

