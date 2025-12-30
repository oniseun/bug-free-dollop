import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { ProductService } from './product.service';
import { ProductRepository } from '../repositories/product.repository';
import { UserRepository } from '../../users/repositories/user.repository';
import { Product } from '../entities/product.entity';
import { User } from '../../users/entities/user.entity';
import { UserRole } from '../../users/enums/user-role.enum';
import { CreateProductDto } from '../dtos/request/create-product.dto';
import { UpdateProductDto } from '../dtos/request/update-product.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { CurrentUser } from '../../auth/interfaces/jwt-payload.interface';

describe('ProductService', () => {
  let productService: ProductService;
  let productRepository: DeepMocked<ProductRepository>;
  let userRepository: DeepMocked<UserRepository>;
  let cacheManager: DeepMocked<Cache>;

  const mockUser: User = {
    id: 1,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@eequ.org',
    password: '$2b$10$hashedPassword',
    role: UserRole.user,
    createdDate: new Date(),
    updatedDate: new Date(),
    products: [],
  };

  const mockProduct: Product = {
    id: 1,
    userId: 1,
    number: 'PROD-001',
    title: 'Test Product',
    description: 'Description',
    createdDate: new Date(),
    updatedDate: new Date(),
    user: mockUser,
  };

  const mockCurrentUser: CurrentUser = {
    userId: 1,
    role: UserRole.user,
  };

  const mockAdminUser: CurrentUser = {
    userId: 2,
    role: UserRole.admin,
  };

  beforeEach(() => {
    productRepository = createMock<ProductRepository>();
    userRepository = createMock<UserRepository>();
    cacheManager = createMock<Cache>();

    productService = new ProductService(
      productRepository,
      userRepository,
      cacheManager,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findProducts', () => {
    const paginationDto: PaginationDto = {
      limit: 10,
      offset: 0,
      search: '',
    };

    it('should return paginated products list', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockProduct], 1]),
      };
      productRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await productService.findProducts(paginationDto);

      expect(productRepository.createQueryBuilder).toHaveBeenCalledWith('product');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('product.user', 'user');
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(result.success).toBe(true);
      expect(result.data.total).toBe(1);
      expect(result.data.items[0].id).toBe(mockProduct.id);
    });

    it('should apply search filter when provided', async () => {
      const searchDto = { ...paginationDto, search: 'Test' };
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockProduct], 1]),
      };
      productRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await productService.findProducts(searchDto);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'product.title LIKE :search',
        { search: '%Test%' },
      );
    });
  });

  describe('getProduct', () => {
    it('should return cached product if available', async () => {
      const cachedProductDto = { ...mockProduct, user: undefined }; // Simplified DTO
      cacheManager.get.mockResolvedValue(cachedProductDto);

      const result = await productService.getProduct(1);

      expect(cacheManager.get).toHaveBeenCalledWith('product_1');
      expect(productRepository.findOneById).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.message).toContain('from cache');
    });

    it('should fetch from repository if not in cache', async () => {
      cacheManager.get.mockResolvedValue(null);
      productRepository.findOneById.mockResolvedValue(mockProduct);

      const result = await productService.getProduct(1);

      expect(productRepository.findOneById).toHaveBeenCalledWith(1);
      expect(cacheManager.set).toHaveBeenCalledWith('product_1', expect.anything());
      expect(result.success).toBe(true);
      expect(result.data.id).toBe(mockProduct.id);
    });

    it('should throw NotFoundException if product does not exist', async () => {
      cacheManager.get.mockResolvedValue(null);
      productRepository.findOneById.mockResolvedValue(null);

      await expect(productService.getProduct(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('createProduct', () => {
    const createDto: CreateProductDto = {
      number: 'PROD-002',
      title: 'New Product',
      description: 'New Description',
    };

    it('should create a product successfully', async () => {
      userRepository.findOneById.mockResolvedValue(mockUser);
      const savedProduct = { ...mockProduct, ...createDto };
      productRepository.save.mockResolvedValue(savedProduct);

      const result = await productService.createProduct(createDto, mockCurrentUser);

      expect(userRepository.findOneById).toHaveBeenCalledWith(mockCurrentUser.userId);
      expect(productRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        userId: mockCurrentUser.userId,
        title: createDto.title,
      }));
      expect(result.success).toBe(true);
      expect(result.data.title).toBe(createDto.title);
    });

    it('should throw NotFoundException if user does not exist', async () => {
      userRepository.findOneById.mockResolvedValue(null);

      await expect(productService.createProduct(createDto, mockCurrentUser)).rejects.toThrow(NotFoundException);
      expect(productRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('updateProduct', () => {
    const updateDto: UpdateProductDto = {
      title: 'Updated Title',
    };

    it('should allow owner to update product', async () => {
      productRepository.findOneById.mockResolvedValue(mockProduct);
      const updatedProduct = { ...mockProduct, ...updateDto };
      productRepository.save.mockResolvedValue(updatedProduct);

      const result = await productService.updateProduct(1, updateDto, mockCurrentUser);

      expect(productRepository.save).toHaveBeenCalled();
      expect(cacheManager.del).toHaveBeenCalledWith('product_1');
      expect(result.success).toBe(true);
      expect(result.data.title).toBe(updateDto.title);
    });

    it('should allow admin to update any product', async () => {
      productRepository.findOneById.mockResolvedValue(mockProduct);
      const updatedProduct = { ...mockProduct, ...updateDto };
      productRepository.save.mockResolvedValue(updatedProduct);

      const result = await productService.updateProduct(1, updateDto, mockAdminUser);

      expect(result.success).toBe(true);
    });

    it('should throw ForbiddenException if user is not owner or admin', async () => {
      const otherUser: CurrentUser = { userId: 999, role: UserRole.user };
      productRepository.findOneById.mockResolvedValue(mockProduct);

      await expect(productService.updateProduct(1, updateDto, otherUser)).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if product not found', async () => {
      productRepository.findOneById.mockResolvedValue(null);

      await expect(productService.updateProduct(999, updateDto, mockCurrentUser)).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteProduct', () => {
    it('should allow owner to delete product', async () => {
      productRepository.findOneById.mockResolvedValue(mockProduct);
      
      const result = await productService.deleteProduct(1, mockCurrentUser);

      expect(productRepository.delete).toHaveBeenCalledWith(1);
      expect(cacheManager.del).toHaveBeenCalledWith('product_1');
      expect(result.success).toBe(true);
    });

    it('should allow admin to delete any product', async () => {
      productRepository.findOneById.mockResolvedValue(mockProduct);

      const result = await productService.deleteProduct(1, mockAdminUser);

      expect(productRepository.delete).toHaveBeenCalledWith(1);
      expect(result.success).toBe(true);
    });

    it('should throw ForbiddenException if user is not owner or admin', async () => {
      const otherUser: CurrentUser = { userId: 999, role: UserRole.user };
      productRepository.findOneById.mockResolvedValue(mockProduct);

      await expect(productService.deleteProduct(1, otherUser)).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if product not found', async () => {
      productRepository.findOneById.mockResolvedValue(null);

      await expect(productService.deleteProduct(999, mockAdminUser)).rejects.toThrow(NotFoundException);
    });
  });
});

