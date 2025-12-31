import { Body, Controller, Post, HttpCode } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from '../services/auth.service';
import { LoginDto } from '../dtos/request/login.dto';
import { LoginResponseDto } from '../dtos/response/login-response.dto';
import { ResponseFormat } from '../../common/response-format';
import { Public } from '../decorators/public.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Login',
    description: 'Authenticate user and return JWT token.',
  })
  @ApiBody({ type: LoginDto })
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
