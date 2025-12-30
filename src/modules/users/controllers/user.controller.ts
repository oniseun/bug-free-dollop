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
import { ApiOperation, ApiResponse, ApiTags, ApiBody, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from '../services/user.service';
import { CreateUserDto } from '../dtos/request/create-user.dto';
import { UpdateUserDto } from '../dtos/request/update-user.dto';
import { ResponseFormat } from '../../common/response-format';
import { PageDto } from '../../common/dtos/page.dto';
import { UserDto } from '../dtos/response/user.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { Public } from '../../auth/decorators/public.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../enums/user-role.enum';

@ApiTags('User')
@ApiBearerAuth()
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Roles(UserRole.admin)
  @Get()
  @ApiOperation({ summary: 'Find users', description: 'Retrieve a paginated list of users with optional search.' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search term for user first name' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of items per page', example: 10 })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Pagination offset', example: 0 })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully', type: PageDto })
  async find(
    @Query() query: PaginationDto,
  ): Promise<ResponseFormat<PageDto<UserDto>>> {
    return this.userService.findUsers(query);
  }

  @Roles(UserRole.admin)
  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID', description: 'Retrieve a single user by their unique identifier.' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully', type: UserDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUser(@Param('id') id: number): Promise<ResponseFormat<UserDto>> {
    return this.userService.getUser(id);
  }

  @Public() // Allow registration
  @Post()
  @ApiOperation({ summary: 'Create user', description: 'Register a new user.' })
  @ApiBody({ type: CreateUserDto, description: 'User creation details' })
  @ApiResponse({ status: 201, description: 'User created successfully', type: UserDto })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async createUser(
    @Body() body: CreateUserDto,
  ): Promise<ResponseFormat<UserDto>> {
    return this.userService.createUser(body);
  }

  @Roles(UserRole.admin) // Only admin can update users for now (or implement self-update logic)
  @Put(':id')
  @ApiOperation({ summary: 'Update user', description: 'Update an existing user profile.' })
  @ApiBody({ type: UpdateUserDto, description: 'User update details' })
  @ApiResponse({ status: 200, description: 'User updated successfully', type: UserDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async updateUser(
    @Param('id') id: number,
    @Body() body: UpdateUserDto,
  ): Promise<ResponseFormat<UserDto>> {
    return this.userService.updateUser(id, body);
  }

  @Roles(UserRole.admin)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete user', description: 'Delete a user account.' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async delete(@Param('id') id: number): Promise<ResponseFormat<void>> {
    return this.userService.deleteUser(id);
  }
}
