import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dtos/request/login.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ResponseFormat } from '../common/response-format';
import { LoginResponseDto } from './dtos/response/login-response.dto';
import { Public } from './decorators/public.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: LoginResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() loginDto: LoginDto,
  ): Promise<ResponseFormat<LoginResponseDto>> {
    return this.authService.login(loginDto);
  }
}
