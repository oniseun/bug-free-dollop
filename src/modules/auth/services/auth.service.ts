import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRepository } from '../../users/repositories/user.repository';
import * as bcrypt from 'bcrypt';
import { LoginDto } from '../dtos/request/login.dto';
import { LoginResponseDto } from '../dtos/response/login-response.dto';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { ResponseFormat } from '../../common/response-format';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto): Promise<ResponseFormat<LoginResponseDto>> {
    const user = await this.userRepository.findOneByEmail(loginDto.email);

    if (!user) {
      throw new UnauthorizedException(
        new ResponseFormat(false, 'Invalid credentials'),
      );
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException(
        new ResponseFormat(false, 'Invalid credentials'),
      );
    }

    const payload: JwtPayload = { sub: user.id, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    return new ResponseFormat(true, 'Login successful', {
      accessToken,
      expiresIn: 900, // 15 minutes
    });
  }
}
