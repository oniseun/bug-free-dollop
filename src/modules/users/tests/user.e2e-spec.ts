import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { EntityTestService } from '../../../test/entity-test.service';
import { TestDatabaseService } from '../../../test/test-database.service';
import { createTestModule } from '../../../test/create-test-module';
import { UserDto } from '../dtos/response/user.dto';
import { CreateUserDto } from '../dtos/request/create-user.dto';
import { UpdateUserDto } from '../dtos/request/update-user.dto';
import { PageDto } from '../../common/dtos/page.dto';
import { UserRole } from '../enums/user-role.enum';

describe('/user', () => {
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

  describe('GET / search user', () => {
    it('GET /', async () => {
      const user = await testService.user.create();
      const token = getAccessToken(user);

      const response = await request(app.getHttpServer())
        .get('/user')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const {
        items: results,
        total,
      } = response.body.data as PageDto<UserDto>;
      expect(total).toBe(1);
      expect(results).toHaveLength(1);

      const result = results.at(0);
      expect(result.id).toBe(user.id);
      expect(result.firstName).toBe(user.firstName);
      expect(result.lastName).toBe(user.lastName);
      expect(result.role).toBe(user.role);
    });

    it('GET / should paginate', async () => {
      const user = await testService.user.create();
      const user2 = await testService.user.create({
        firstName: 'Donny',
        lastName: 'Don',
        email: 'donny@don.com', // Need unique email
      });
      const token = getAccessToken(user);

      const response = await request(app.getHttpServer())
        .get('/user?limit=1&offset=0')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const {
        items: results,
        total,
        limit,
        offset,
      } = response.body.data as PageDto<UserDto>;
      expect(total).toBe(2);
      expect(results).toHaveLength(1);
      expect(Number(limit)).toBe(1);
      expect(Number(offset)).toBe(0);

      const result = results.at(0);
      // Expect user2 (newest)
      expect(result.id).toBe(user2.id);
    });

    it('GET / should find by search term', async () => {
      const user = await testService.user.create();
      const user2 = await testService.user.create({
        firstName: 'Donny',
        lastName: 'Don',
        email: 'donny@don.com',
      });
      const token = getAccessToken(user);

      const response = await request(app.getHttpServer())
        .get('/user?search=Donn')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const {
        items: results,
        total,
      } = response.body.data as PageDto<UserDto>;
      expect(total).toBe(1);
      expect(results).toHaveLength(1);

      const result = results.at(0);
      expect(result.id).toBe(user2.id);
      expect(result.firstName).toBe(user2.firstName);
    });
  });

  it('GET /:id', async () => {
    const user = await testService.user.create();
    const token = getAccessToken(user);

    const response = await request(app.getHttpServer())
      .get(`/user/${user.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const result = response.body.data as UserDto;

    expect(result.id).toBeDefined();
    expect(result.firstName).toBe(user.firstName);
    expect(result.lastName).toBe(user.lastName);
    expect(result.role).toBe(user.role);
  });

  it('PUT /', async () => {
    const user = await testService.user.create();
    const updateDto: UpdateUserDto = {
      firstName: 'Mark',
      lastName: 'Stone',
    };
    const token = getAccessToken(user);

    const response = await request(app.getHttpServer())
      .put(`/user/${user.id}`)
      .send(updateDto)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const result = response.body.data as UserDto;
    expect(result.id).toBe(user.id);
    expect(result.firstName).toBe(updateDto.firstName);
    expect(result.lastName).toBe(updateDto.lastName);
    expect(result.role).toBe(user.role);
  });

  it('DELETE /', async () => {
    const adminUser = await testService.user.create({ role: UserRole.admin, email: 'admin@test.com' });
    const user2 = await testService.user.create({
      firstName: 'Donny',
      lastName: 'Don',
      email: 'donny@don.com',
    });
    const token = getAccessToken(adminUser);

    await request(app.getHttpServer())
      .delete(`/user/${user2.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });
});
