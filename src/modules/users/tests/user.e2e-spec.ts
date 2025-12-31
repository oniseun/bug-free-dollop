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

  const uniqueEmail = (prefix: string) =>
    `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;

  const makeUserPayload = (
    overrides: Partial<CreateUserDto> = {},
  ): CreateUserDto => ({
    firstName: 'Test',
    lastName: 'User',
    email: uniqueEmail('user'),
    password: 'testPass123',
    role: UserRole.user,
    ...overrides,
  });

  const registerUser = async (overrides?: Partial<CreateUserDto>) => {
    const payload = makeUserPayload(overrides);
    const response = await request(app.getHttpServer())
      .post('/user')
      .send(payload)
      .expect(201);

    return {
      payload,
      dto: response.body.data as UserDto,
    };
  };

  const loginUser = async (email: string, password: string) => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);

    return response.body.data.accessToken as string;
  };

  describe('Authentication & registration', () => {
    it('registers a new user', async () => {
      const { payload, dto } = await registerUser();

      expect(dto.email).toBe(payload.email);
      expect(dto.firstName).toBe(payload.firstName);
      expect(dto.role).toBe(payload.role);
    });

    it('allows a registered user to log in', async () => {
      const payload = makeUserPayload({ password: 'loginPassword123' });
      await request(app.getHttpServer()).post('/user').send(payload).expect(201);
      const token = await loginUser(payload.email, payload.password);

      expect(token).toBeDefined();
    });

    it('allows an admin to log in', async () => {
      const { payload } = await registerUser({
        password: 'adminPass123',
        role: UserRole.admin,
      });
      const token = await loginUser(payload.email, payload.password);

      expect(token).toBeDefined();
    });
  });

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

  describe('Authorization guards', () => {
    it('rejects updating another user when not admin', async () => {
      const userA = await testService.user.create({
        role: UserRole.user,
        email: uniqueEmail('userA'),
      });
      const userB = await testService.user.create({
        role: UserRole.user,
        email: uniqueEmail('userB'),
      });
      const token = getAccessToken(userA);

      const response = await request(app.getHttpServer())
        .put(`/user/${userB.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ firstName: 'Intruder' })
        .expect(403);

      expect(response.body.message).toBe(
        'You do not have access to update this user',
      );
    });

    it('returns 401 when updating without auth', async () => {
      await request(app.getHttpServer())
        .put('/user/1')
        .send({ firstName: 'NoAuth' })
        .expect(401);
    });

    it('prevents non-admins from deleting other users', async () => {
      const nonAdmin = await testService.user.create({
        role: UserRole.user,
        email: uniqueEmail('nonAdmin'),
      });
      const targetUser = await testService.user.create({
        role: UserRole.user,
        email: uniqueEmail('target'),
      });
      const token = getAccessToken(nonAdmin);

      const response = await request(app.getHttpServer())
        .delete(`/user/${targetUser.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(401);

      expect(response.body.message).toBe('Forbidden resource');
    });

    it('returns 401 when deleting without auth', async () => {
      await request(app.getHttpServer()).delete('/user/1').expect(401);
    });

    it('prevents admin from deleting themselves', async () => {
      const adminUser = await testService.user.create({
        role: UserRole.admin,
        email: uniqueEmail('selfAdmin'),
      });
      const token = getAccessToken(adminUser);

      const response = await request(app.getHttpServer())
        .delete(`/user/${adminUser.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(response.body.message).toBe('You cannot delete your own account');
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
