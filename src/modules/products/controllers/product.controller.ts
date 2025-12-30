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
import { ProductService } from '../services/product.service';
import { CreateProductDto } from '../dtos/request/create-product.dto';
import { UpdateProductDto } from '../dtos/request/update-product.dto';
import { ResponseFormat } from '../../common/response-format';
import { PageDto } from '../../common/dtos/page.dto';
import { ProductDto } from '../dtos/response/product.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { Public } from '../../auth/decorators/public.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { CurrentUser as CurrentUserType } from '../../auth/interfaces/jwt-payload.interface';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../users/enums/user-role.enum';

@ApiTags('Product')
@ApiBearerAuth()
@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Find products', description: 'Retrieve a paginated list of products with optional search.' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search term for product title' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of items per page', example: 10 })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Pagination offset', example: 0 })
  @ApiResponse({ status: 200, description: 'Products retrieved successfully', type: PageDto })
  async find(
    @Query() query: PaginationDto,
  ): Promise<ResponseFormat<PageDto<ProductDto>>> {
    return this.productService.findProducts(query);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID', description: 'Retrieve a single product by its unique identifier.' })
  @ApiResponse({ status: 200, description: 'Product retrieved successfully', type: ProductDto })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async getProduct(
    @Param('id') id: number,
  ): Promise<ResponseFormat<ProductDto>> {
    return this.productService.getProduct(id);
  }

  @Roles(UserRole.user, UserRole.admin)
  @Post()
  @ApiOperation({ summary: 'Create product', description: 'Create a new product. Admin can create for any user, regular users create for themselves.' })
  @ApiBody({ type: CreateProductDto, description: 'Product creation details' })
  @ApiResponse({ status: 201, description: 'Product created successfully', type: ProductDto })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async createProduct(
    @Body() body: CreateProductDto,
    @CurrentUser() user: CurrentUserType
  ): Promise<ResponseFormat<ProductDto>> {
    return this.productService.createProduct(body, user);
  }

  @Roles(UserRole.user, UserRole.admin)
  @Put(':id')
  @ApiOperation({ summary: 'Update product', description: 'Update an existing product. Only owner or admin can update.' })
  @ApiBody({ type: UpdateProductDto, description: 'Product update details' })
  @ApiResponse({ status: 200, description: 'Product updated successfully', type: ProductDto })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - not owner or admin' })
  async updateProduct(
    @Param('id') id: number,
    @Body() body: UpdateProductDto,
    @CurrentUser() user: CurrentUserType
  ): Promise<ResponseFormat<ProductDto>> {
    return this.productService.updateProduct(id, body, user);
  }

  @Roles(UserRole.user, UserRole.admin)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete product', description: 'Delete a product by its ID. Only owner or admin can delete.' })
  @ApiResponse({ status: 200, description: 'Product deleted successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - not owner or admin' })
  async delete(
    @Param('id') id: number,
    @CurrentUser() user: CurrentUserType
  ): Promise<ResponseFormat<void>> {
    return this.productService.deleteProduct(id, user);
  }
}
