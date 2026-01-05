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
import { User } from '../../users/entities/user.entity';
import { UserRole } from '../../users/enums/user-role.enum';

describe('/product', () => {
  let app: INestApplication;
  let module: TestingModule;
  let testDatabaseService: TestDatabaseService;
  let testService: EntityTestService;
  let jwtService: JwtService;

  beforeAll(async () => {
    try {
      module = await createTestModule();
      testDatabaseService = module.get<TestDatabaseService>(TestDatabaseService);
      testService = module.get<EntityTestService>(EntityTestService);
      jwtService = module.get<JwtService>(JwtService);

      app = module.createNestApplication();
      await app.init();
    } catch (e) {
      console.error('Test setup failed in beforeAll:', e);
      throw e;
    }
  });

  beforeEach(async () => {
    if (testDatabaseService) {
        await testDatabaseService.cleanDatabase();
    }
  });

  afterAll(async () => {
    if (testDatabaseService) {
        await testDatabaseService.closeDatabaseConnection();
    }
    if (app) {
        await app.close();
    }
  });

  const getAccessToken = (user: User) => {
    return jwtService.sign({ sub: user.id, role: user.role });
  };

  const uniqueEmail = (prefix: string) =>
    `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@eequ.org`;

  const createUserEntity = (
    overrides: {
      role?: UserRole;
      email?: string;
    } = {},
  ) => {
    return testService.user.create({
      role: overrides.role ?? UserRole.user,
      email: overrides.email ?? uniqueEmail('user'),
    });
  };

  describe('GET / (Public Access)', () => {
    it('should retrieve products without authentication', async () => {
      const user = await testService.user.create();
      const product = await testService.product.createItem({ userId: user.id });

      const response = await request(app.getHttpServer())
        .get('/product')
        .expect(200);

      const { items: results, total } = response.body
        .data as PageDto<ProductDto>;
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
      await testService.product.createItem({ userId: user.id });
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

      const { items: results, total } = response.body
        .data as PageDto<ProductDto>;
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
      await testService.product.createItem({ userId: user.id });
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

  describe('Authorization requirements', () => {
    const productPayload: CreateProductDto = {
      number: 'xyz-123',
      title: 'No Auth Product',
      description: 'Should never be created because no token is provided',
    };

    it('requires authentication to create a product', async () => {
      await request(app.getHttpServer())
        .post('/product')
        .send(productPayload)
        .expect(401);
    });

    it('requires authentication to update a product', async () => {
      const owner = await createUserEntity();
      const product = await testService.product.createItem({
        userId: owner.id,
      });

      await request(app.getHttpServer())
        .put(`/product/${product.id}`)
        .send({ title: 'unauthorized update' })
        .expect(401);
    });

    it('requires authentication to delete a product', async () => {
      const owner = await createUserEntity();
      const product = await testService.product.createItem({
        userId: owner.id,
      });

      await request(app.getHttpServer())
        .delete(`/product/${product.id}`)
        .expect(401);
    });

    it('prevents non-owners from updating a product', async () => {
      const owner = await createUserEntity();
      const otherUser = await createUserEntity();
      const product = await testService.product.createItem({
        userId: owner.id,
      });
      const token = getAccessToken(otherUser);

      const response = await request(app.getHttpServer())
        .put(`/product/${product.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Intruder update' })
        .expect(403);

      expect(response.body.message).toBe(
        'You do not have access to update this product',
      );
    });

    it('prevents non-owners from deleting a product', async () => {
      const owner = await createUserEntity();
      const otherUser = await createUserEntity();
      const product = await testService.product.createItem({
        userId: owner.id,
      });
      const token = getAccessToken(otherUser);

      const response = await request(app.getHttpServer())
        .delete(`/product/${product.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.message).toBe(
        'You do not have permission to delete this product',
      );
    });

    it('allows admins to update products they do not own', async () => {
      const owner = await createUserEntity({ role: UserRole.user });
      const admin = await createUserEntity({ role: UserRole.admin });
      const product = await testService.product.createItem({
        userId: owner.id,
      });
      const token = getAccessToken(admin);

      const response = await request(app.getHttpServer())
        .put(`/product/${product.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Admin update' })
        .expect(200);

      const result = response.body.data as ProductDto;
      expect(result.title).toBe('Admin update');
    });

    it('allows admins to delete products they do not own', async () => {
      const owner = await createUserEntity({ role: UserRole.user });
      const admin = await createUserEntity({ role: UserRole.admin });
      const product = await testService.product.createItem({
        userId: owner.id,
      });
      const token = getAccessToken(admin);

      await request(app.getHttpServer())
        .delete(`/product/${product.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });
});
