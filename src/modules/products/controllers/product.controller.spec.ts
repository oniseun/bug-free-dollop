import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ProductController } from './product.controller';
import { ProductService } from '../services/product.service';
import { CreateProductDto } from '../dtos/request/create-product.dto';
import { UpdateProductDto } from '../dtos/request/update-product.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { ResponseFormat } from '../../common/response-format';
import { PageDto } from '../../common/dtos/page.dto';
import { ProductDto } from '../dtos/response/product.dto';
import { CurrentUser } from '../../auth/interfaces/jwt-payload.interface';
import { UserRole } from '../../users/enums/user-role.enum';

describe('ProductController', () => {
  let productController: ProductController;
  let productService: jest.Mocked<ProductService>;

  const mockUser: CurrentUser = {
    userId: 1,
    role: UserRole.user,
  };

  const mockProductDto: ProductDto = {
    id: 1,
    userId: 1,
    number: 'PROD-001',
    title: 'Test Product',
    description: 'Description',
  };

  beforeEach(() => {
    productService = {
      findProducts: jest.fn(),
      getProduct: jest.fn(),
      createProduct: jest.fn(),
      updateProduct: jest.fn(),
      deleteProduct: jest.fn(),
    } as unknown as jest.Mocked<ProductService>;

    productController = new ProductController(productService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('find', () => {
    const paginationDto: PaginationDto = {
      limit: 10,
      offset: 0,
      search: '',
    };

    it('should return paginated products list', async () => {
      const mockPageDto = new PageDto([mockProductDto], 1, 10, 0);
      const mockResponse = new ResponseFormat(true, 'Products retrieved successfully', mockPageDto);
      productService.findProducts.mockResolvedValue(mockResponse);

      const result = await productController.find(paginationDto);

      expect(productService.findProducts).toHaveBeenCalledWith(paginationDto);
      expect(result).toBe(mockResponse);
      expect(result.success).toBe(true);
      expect(result.data.items).toHaveLength(1);
    });
  });

  describe('getProduct', () => {
    it('should return a product by ID', async () => {
      const mockResponse = new ResponseFormat(true, 'Product retrieved successfully', mockProductDto);
      productService.getProduct.mockResolvedValue(mockResponse);

      const result = await productController.getProduct(1);

      expect(productService.getProduct).toHaveBeenCalledWith(1);
      expect(result.success).toBe(true);
      expect(result.data.id).toBe(1);
    });

    it('should propagate NotFoundException from service', async () => {
      productService.getProduct.mockRejectedValue(new NotFoundException());

      await expect(productController.getProduct(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('createProduct', () => {
    const createDto: CreateProductDto = {
      number: 'PROD-002',
      title: 'New Product',
      description: 'New Description',
    };

    it('should create a product successfully', async () => {
      const newProductDto = { ...mockProductDto, ...createDto };
      const mockResponse = new ResponseFormat(true, 'Product created successfully', newProductDto);
      productService.createProduct.mockResolvedValue(mockResponse);

      const result = await productController.createProduct(createDto, mockUser);

      expect(productService.createProduct).toHaveBeenCalledWith(createDto, mockUser);
      expect(result.success).toBe(true);
      expect(result.data.title).toBe(createDto.title);
    });
  });

  describe('updateProduct', () => {
    const updateDto: UpdateProductDto = {
      title: 'Updated Title',
    };

    it('should update a product successfully', async () => {
      const updatedProductDto = { ...mockProductDto, ...updateDto };
      const mockResponse = new ResponseFormat(true, 'Product updated successfully', updatedProductDto);
      productService.updateProduct.mockResolvedValue(mockResponse);

      const result = await productController.updateProduct(1, updateDto, mockUser);

      expect(productService.updateProduct).toHaveBeenCalledWith(1, updateDto, mockUser);
      expect(result.success).toBe(true);
      expect(result.data.title).toBe(updateDto.title);
    });

    it('should propagate ForbiddenException from service', async () => {
      productService.updateProduct.mockRejectedValue(new ForbiddenException());

      await expect(productController.updateProduct(1, updateDto, mockUser)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('delete', () => {
    it('should delete a product successfully', async () => {
      const mockResponse = new ResponseFormat(true, 'Product deleted successfully');
      productService.deleteProduct.mockResolvedValue(mockResponse);

      const result = await productController.delete(1, mockUser);

      expect(productService.deleteProduct).toHaveBeenCalledWith(1, mockUser);
      expect(result.success).toBe(true);
    });

    it('should propagate ForbiddenException from service', async () => {
      productService.deleteProduct.mockRejectedValue(new ForbiddenException());

      await expect(productController.delete(1, mockUser)).rejects.toThrow(ForbiddenException);
    });
  });
});

