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
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { CurrentUser as CurrentUserType } from '../../auth/interfaces/jwt-payload.interface';

@ApiTags('User')
@ApiBearerAuth()
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Public()
  @Roles(UserRole.user, UserRole.admin)
  @Get()
  @ApiOperation({ summary: 'Find users', description: 'Retrieve a paginated list of users with optional search. Admin only.' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search term for user first name' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of items per page', example: 10 })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Pagination offset', example: 0 })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully', type: PageDto })
  async find(
    @Query() query: PaginationDto,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<ResponseFormat<PageDto<UserDto>>> {
    return this.userService.findUsers(query, currentUser);
  }

  @Public()
  @Roles(UserRole.user, UserRole.admin)
  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID', description: 'Retrieve a single user by their unique identifier. Admin only.' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully', type: UserDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUser(
    @Param('id') id: number,
    @CurrentUser() user: CurrentUserType,
  ): Promise<ResponseFormat<UserDto>> {
    return this.userService.getUser(id, user);
  }

  @Public()
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

  @Roles(UserRole.user, UserRole.admin)
  @Put(':id')
  @ApiOperation({ summary: 'Update user', description: 'Update an existing user profile. Admin can update any user, users can update themselves.' })
  @ApiBody({ type: UpdateUserDto, description: 'User update details' })
  @ApiResponse({ status: 200, description: 'User updated successfully', type: UserDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  @ApiResponse({ status: 403, description: 'Forbidden - not admin or self' })
  async updateUser(
    @Param('id') id: number,
    @Body() body: UpdateUserDto,
    @CurrentUser() user: CurrentUserType,
  ): Promise<ResponseFormat<UserDto>> {
    return this.userService.updateUser(id, body, user);
  }

  @Roles(UserRole.admin)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete user', description: 'Delete a user account. Admin only. Cannot delete yourself.' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 400, description: 'Cannot delete yourself' })
  async delete(
    @Param('id') id: number,
    @CurrentUser() user: CurrentUserType,
  ): Promise<ResponseFormat<void>> {
    return this.userService.deleteUser(id, user);
  }
}
