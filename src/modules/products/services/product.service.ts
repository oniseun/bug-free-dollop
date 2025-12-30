import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { ProductRepository } from '../repositories/product.repository';
import { CreateProductDto } from '../dtos/request/create-product.dto';
import { UpdateProductDto } from '../dtos/request/update-product.dto';
import { ProductDto } from '../dtos/response/product.dto';
import { ResponseFormat } from '../../common/response-format';
import { PageDto } from '../../common/dtos/page.dto';
import { Product } from '../entities/product.entity';
import { UserRepository } from '../../users/repositories/user.repository';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class ProductService {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly userRepository: UserRepository,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async findProducts(query: {
    search?: string;
    limit: number;
    offset: number;
  }): Promise<ResponseFormat<PageDto<ProductDto>>> {
    const { limit, offset, search } = query;
    const queryBuilder = this.productRepository.createQueryBuilder('product');
    
    // Join user relation
    queryBuilder.leftJoinAndSelect('product.user', 'user');

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
    const cacheKey = `product_${id}`;
    const cachedProduct = await this.cacheManager.get<ProductDto>(cacheKey);

    if (cachedProduct) {
      return new ResponseFormat(
        true,
        'Product retrieved successfully (from cache)',
        cachedProduct,
      );
    }

    const product = await this.productRepository.findOneById(id);

    if (!product) {
      throw new NotFoundException(
        new ResponseFormat(false, 'Product not found')
      );
    }

    const productDto = ProductDto.fromEntity(product);
    await this.cacheManager.set(cacheKey, productDto);

    return new ResponseFormat(
      true,
      'Product retrieved successfully',
      productDto,
    );
  }

  async createProduct(
    dto: CreateProductDto,
  ): Promise<ResponseFormat<ProductDto>> {
    // Check if user exists
    const user = await this.userRepository.findOneById(dto.userId);
    if (!user) {
      throw new NotFoundException(
        new ResponseFormat(false, 'User not found')
      );
    }

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
      throw new NotFoundException(
        new ResponseFormat(false, 'Product not found')
      );
    }


    if (product.userId !== dto.userId) {
      throw new ForbiddenException(
        new ResponseFormat(false, 'You do not have access to this product')
      );
    }

    if (dto.title !== undefined) product.title = dto.title;
    if (dto.description !== undefined) product.description = dto.description;
    if (dto.number !== undefined) product.number = dto.number;
  

    const updatedProduct = await this.productRepository.save(product);
    
    // Invalidate cache
    await this.cacheManager.del(`product_${id}`);

    return new ResponseFormat(
      true,
      'Product updated successfully',
      ProductDto.fromEntity(updatedProduct),
    );
  }

  async deleteProduct(id: number): Promise<ResponseFormat<void>> {
    const product = await this.productRepository.findOneById(id);
    if (!product) {
      throw new NotFoundException(
        new ResponseFormat(false, 'Product not found')
      );
    }

    await this.productRepository.delete(id);
    await this.cacheManager.del(`product_${id}`);

    return new ResponseFormat(true, 'Product deleted successfully');
  }
}
