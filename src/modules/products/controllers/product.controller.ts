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
import { ProductService } from '../services/product.service';
import { CreateProductDto } from '../dtos/request/create-product.dto';
import { UpdateProductDto } from '../dtos/request/update-product.dto';
import { ResponseFormat } from '../../common/response-format';
import { PageDto } from '../../common/dtos/page.dto';
import { ProductDto } from '../dtos/response/product.dto';

@ApiTags('Product')
@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  @ApiOperation({ summary: 'Find products' })
  @ApiResponse({ type: PageDto })
  async find(
    @Query('search') search: string,
    @Query('limit') limit: number = 10,
    @Query('offset') offset: number = 0,
  ): Promise<ResponseFormat<PageDto<ProductDto>>> {
    return this.productService.findProducts({ search, limit, offset });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  @ApiResponse({ type: ProductDto })
  async getProduct(
    @Param('id') id: number,
  ): Promise<ResponseFormat<ProductDto>> {
    return this.productService.getProduct(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create product' })
  @ApiResponse({ type: ProductDto })
  async createProduct(
    @Body() body: CreateProductDto,
  ): Promise<ResponseFormat<ProductDto>> {
    return this.productService.createProduct(body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update product' })
  @ApiResponse({ type: ProductDto })
  async updateProduct(
    @Param('id') id: number,
    @Body() body: UpdateProductDto,
  ): Promise<ResponseFormat<ProductDto>> {
    return this.productService.updateProduct(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete product' })
  async delete(@Param('id') id: number): Promise<ResponseFormat<void>> {
    return this.productService.deleteProduct(id);
  }
}

