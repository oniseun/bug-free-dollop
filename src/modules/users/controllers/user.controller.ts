import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserService } from '../services/user.service';
import { CreateUserDto } from '../dtos/request/create-user.dto';
import { UpdateUserDto } from '../dtos/request/update-user.dto';
import { ResponseFormat } from '../../common/response-format';
import { PageDto } from '../../common/dtos/page.dto';
import { UserDto } from '../dtos/response/user.dto';

@ApiTags('User')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @ApiOperation({ summary: 'Find users' })
  @ApiResponse({ type: PageDto })
  async find(
    @Query('search') search: string,
    @Query('limit') limit: number = 10,
    @Query('offset') offset: number = 0,
  ): Promise<ResponseFormat<PageDto<UserDto>>> {
    return this.userService.findUsers({ search, limit, offset });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ type: UserDto })
  async getUser(@Param('id') id: number): Promise<ResponseFormat<UserDto>> {
    return this.userService.getUser(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create user' })
  @ApiResponse({ type: UserDto })
  async createUser(
    @Body() body: CreateUserDto,
  ): Promise<ResponseFormat<UserDto>> {
    return this.userService.createUser(body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update user' })
  @ApiResponse({ type: UserDto })
  async updateUser(
    @Param('id') id: number,
    @Body() body: UpdateUserDto,
  ): Promise<ResponseFormat<UserDto>> {
    return this.userService.updateUser(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user' })
  async delete(@Param('id') id: number): Promise<ResponseFormat<void>> {
    return this.userService.deleteUser(id);
  }
}

