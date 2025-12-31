import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { EntityTestService } from '../../../test/entity-test.service';
import { TestDatabaseService } from '../../../test/test-database.service';
import { createTestModule } from '../../../test/create-test-module';
import { ProductDto } from '../dtos/response/product.dto';
import { CreateProductDto } from '../dtos/request/create-product.dto';
import { UpdateProductDto } from '../dtos/request/update-product.dto';
import { PageDto } from '../../common/dtos/page.dto';

describe('/product', () => {
  let app: INestApplication;
  let module: TestingModule;
  let testDatabaseService: TestDatabaseService;
  let testService: EntityTestService;
  let jwtService: JwtService;

  beforeAll(async () => {
    module = await createTestModule();
    testDatabaseService = module.get<TestDatabaseService>(TestDatabaseService);
    testService = module.get<EntityTestService>(EntityTestService);
    jwtService = module.get<JwtService>(JwtService);

    app = module.createNestApplication();
    await app.init();
  });

  beforeEach(async () => {
    await testDatabaseService.cleanDatabase();
  });

  afterAll(async () => {
    await testDatabaseService.closeDatabaseConnection();
    await app.close();
  });

  const getAccessToken = (user: any) => {
    return jwtService.sign({ sub: user.id, role: user.role });
  };

  describe('GET / (Public Access)', () => {
    it('should retrieve products without authentication', async () => {
      const user = await testService.user.create();
      const product = await testService.product.createItem({ userId: user.id });
      
      const response = await request(app.getHttpServer())
        .get('/product')
        .expect(200);

      const {
        items: results,
        total,
      } = response.body.data as PageDto<ProductDto>;
      expect(total).toBe(1);
      expect(results).toHaveLength(1);

      const result = results.at(0);
      expect(result.id).toBeDefined();
      expect(result.number).toBe(product.number);
      expect(result.title).toBe(product.title);
      expect(result.description).toBe(product.description);
    });

    it('should paginate products', async () => {
      const user = await testService.user.create();
      const product = await testService.product.createItem({ userId: user.id });
      const product2 = await testService.product.createItem({
        title: 'The Very Hungry Caterpillar',
        userId: user.id,
      });

      const response = await request(app.getHttpServer())
        .get('/product?limit=1&offset=0')
        .expect(200);

      const {
        items: results,
        total,
        limit,
        offset,
      } = response.body.data as PageDto<ProductDto>;
      expect(total).toBe(2);
      expect(results).toHaveLength(1);
      expect(Number(limit)).toBe(1);
      expect(Number(offset)).toBe(0);

      const result = results.at(0);
      expect(result.id).toBeDefined();
      // Expect newest product first (DESC sort)
      expect(result.number).toBe(product2.number);
      expect(result.title).toBe(product2.title);
      expect(result.description).toBe(product2.description);
    });

    it('should find by title search', async () => {
      const user = await testService.user.create();
      const product = await testService.product.createItem({ userId: user.id });
      await testService.product.createItem({
        title: 'The Very Hungry Caterpillar',
        userId: user.id,
      });

      const response = await request(app.getHttpServer())
        .get('/product?search=Moby')
        .expect(200);

      const {
        items: results,
        total,
      } = response.body.data as PageDto<ProductDto>;
      expect(total).toBe(1);
      expect(results).toHaveLength(1);

      const result = results.at(0);
      expect(result.id).toBeDefined();
      expect(result.number).toBe(product.number);
      expect(result.title).toBe(product.title);
      expect(result.description).toBe(product.description);
    });

    it('should get single product by ID', async () => {
      const user = await testService.user.create();
      const product = await testService.product.createItem({ userId: user.id });

      const response = await request(app.getHttpServer())
        .get(`/product/${product.id}`)
        .expect(200);

      const result = response.body.data as ProductDto;

      expect(result.id).toBeDefined();
      expect(result.number).toBe(product.number);
      expect(result.title).toBe(product.title);
      expect(result.description).toBe(product.description);
    });
  });

  describe('Authenticated Operations', () => {
    it('GET / should work with authentication token too', async () => {
      const user = await testService.user.create();
      const product = await testService.product.createItem({ userId: user.id });
      const token = getAccessToken(user);

      const response = await request(app.getHttpServer())
        .get('/product')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const { total } = response.body.data as PageDto<ProductDto>;
      expect(total).toBe(1);
    });

    it('POST / should create product', async () => {
      const user = await testService.user.create();
      const createDto: CreateProductDto = {
        number: 'a1b2',
        title: 'Matilda',
        description: 'Kids book',
      };
      const token = getAccessToken(user);

      const response = await request(app.getHttpServer())
        .post('/product')
        .send(createDto)
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      const result = response.body.data as ProductDto;
      expect(result.id).toBeDefined();
      expect(result.number).toBe(createDto.number);
      expect(result.title).toBe(createDto.title);
      expect(result.description).toBe(createDto.description);
    });

    it('PUT / should update product', async () => {
      const user = await testService.user.create();
      const product = await testService.product.createItem({ userId: user.id });
      const updateDto: UpdateProductDto = {
        title: 'Matilda Updated',
        description: 'Kids book updated',
      };
      const token = getAccessToken(user);

      const response = await request(app.getHttpServer())
        .put(`/product/${product.id}`)
        .send(updateDto)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const result = response.body.data as ProductDto;
      expect(result.id).toBe(product.id);
      expect(result.title).toBe(updateDto.title);
      expect(result.description).toBe(updateDto.description);
    });

    it('DELETE / should delete product', async () => {
      const user = await testService.user.create();
      const product = await testService.product.createItem({ userId: user.id });
      const token = getAccessToken(user);

      await request(app.getHttpServer())
        .delete(`/product/${product.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });
});
