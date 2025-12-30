import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProductRepository } from '../repositories/product.repository';
import { CreateProductDto } from '../dtos/request/create-product.dto';
import { UpdateProductDto } from '../dtos/request/update-product.dto';
import { ProductDto } from '../dtos/response/product.dto';
import { ResponseFormat } from '../../common/response-format';
import { PageDto } from '../../common/dtos/page.dto';
import { Product } from '../entities/product.entity';

@Injectable()
export class ProductService {
  constructor(private readonly productRepository: ProductRepository) {}

  async findProducts(query: {
    search?: string;
    limit: number;
    offset: number;
  }): Promise<ResponseFormat<PageDto<ProductDto>>> {
    const { limit, offset, search } = query;
    const queryBuilder = this.productRepository.createQueryBuilder('product');

    if (search) {
      queryBuilder.where('product.title LIKE :search', {
        search: `%${search}%`,
      });
    }

    const [products, count] = await queryBuilder
      .take(limit)
      .skip(offset)
      .orderBy('product.createdDate', 'DESC')
      .getManyAndCount();

    const dtos = products.map(ProductDto.fromEntity);

    return new ResponseFormat(
      true,
      'Products retrieved successfully',
      new PageDto(dtos, count, limit, offset),
    );
  }

  async getProduct(id: number): Promise<ResponseFormat<ProductDto>> {
    const product = await this.productRepository.findOneById(id);

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return new ResponseFormat(
      true,
      'Product retrieved successfully',
      ProductDto.fromEntity(product),
    );
  }

  async createProduct(
    dto: CreateProductDto,
  ): Promise<ResponseFormat<ProductDto>> {
    const product = new Product();
    product.userId = dto.userId;
    product.title = dto.title;
    product.description = dto.description;
    product.number = dto.number;

    const createdProduct = await this.productRepository.save(product);
    return new ResponseFormat(
      true,
      'Product created successfully',
      ProductDto.fromEntity(createdProduct),
    );
  }

  async updateProduct(
    id: number,
    dto: UpdateProductDto,
  ): Promise<ResponseFormat<ProductDto>> {
    const product = await this.productRepository.findOneById(id);

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (dto.userId !== undefined && product.userId !== dto.userId) {
       // logic from original controller: 
       // if (product.userId !== userId) throw Forbidden
       // Assuming dto.userId is the "current user" or the intended owner.
       // The original code was: const { userId, ... } = body; if (product.userId !== userId) ...
       // This implies the body contains the requester's userId (insecure but matching original logic for now)
      throw new ForbiddenException('You do not have access to this product');
    }

    if (dto.title !== undefined) product.title = dto.title;
    if (dto.description !== undefined) product.description = dto.description;
    if (dto.number !== undefined) product.number = dto.number;
    // Note: updating userId usually transfers ownership, but the original logic blocked update if userId didn't match. 
    // It actually set product.userId = userId later. 
    // Original: 
    // if (product.userId !== userId) throw Forbidden
    // product.userId = userId;
    // So it enforces that you can only update if you send the SAME userId? Or is it expecting the userId in body to match the product's userId?
    // "if (product.userId !== userId) throw Forbidden" -> means if the userId in body is DIFFERENT from product.userId, throw error.
    // THEN "product.userId = userId". This effectively means userId cannot change.
    
    // I will keep the assignment if it passes the check.
    if (dto.userId !== undefined) product.userId = dto.userId;


    const updatedProduct = await this.productRepository.save(product);
    return new ResponseFormat(
      true,
      'Product updated successfully',
      ProductDto.fromEntity(updatedProduct),
    );
  }

  async deleteProduct(id: number): Promise<ResponseFormat<void>> {
    const product = await this.productRepository.findOneById(id);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    await this.productRepository.delete(id);
    return new ResponseFormat(true, 'Product deleted successfully');
  }
}

