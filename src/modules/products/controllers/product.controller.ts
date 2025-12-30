import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  ForbiddenException,
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

  @Post()
  @ApiOperation({ summary: 'Create product', description: 'Create a new product associated with a user.' })
  @ApiBody({ type: CreateProductDto, description: 'Product creation details' })
  @ApiResponse({ status: 201, description: 'Product created successfully', type: ProductDto })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async createProduct(
    @Body() body: CreateProductDto,
    @CurrentUser() user: { userId: number, role: UserRole }
  ): Promise<ResponseFormat<ProductDto>> {
    // Optional: Enforce that user can only create product for themselves if not admin
    if (user.role !== UserRole.admin && body.userId !== user.userId) {
        throw new ForbiddenException(new ResponseFormat(false, 'You can only create products for yourself'));
    }
    return this.productService.createProduct(body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update product', description: 'Update an existing product.' })
  @ApiBody({ type: UpdateProductDto, description: 'Product update details' })
  @ApiResponse({ status: 200, description: 'Product updated successfully', type: ProductDto })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 403, description: 'Forbidden access' })
  async updateProduct(
    @Param('id') id: number,
    @Body() body: UpdateProductDto,
    @CurrentUser() user: { userId: number, role: UserRole }
  ): Promise<ResponseFormat<ProductDto>> {
    // Authorization logic is partly in service (checking existing owner vs dto), 
    // but we should also check if the CURRENT user is allowed to perform this update.
    // If user is admin, they can update anyone's product (but service currently enforces dto.userId == product.userId).
    // The service check "product.userId !== dto.userId" ensures the product isn't being transferred or claimed by mismatch.
    // We also need to ensure `user.userId` (from token) matches `dto.userId` OR `user.role` is admin.
    
    if (user.role !== UserRole.admin && body.userId !== user.userId) {
       throw new ForbiddenException(new ResponseFormat(false, 'You do not have access to update this product'));
    }

    return this.productService.updateProduct(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete product', description: 'Delete a product by its ID. Requires Admin or Owner.' })
  @ApiResponse({ status: 200, description: 'Product deleted successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async delete(
    @Param('id') id: number,
    @CurrentUser() user: { userId: number, role: UserRole }
  ): Promise<ResponseFormat<void>> {
    // Check ownership or admin role
    const productResponse = await this.productService.getProduct(id);
    const product = productResponse.data; // Assuming data contains the DTO

    if (user.role !== UserRole.admin && product.userId !== user.userId) {
        throw new ForbiddenException(new ResponseFormat(false, 'You do not have permission to delete this product'));
    }

    return this.productService.deleteProduct(id);
  }
}
