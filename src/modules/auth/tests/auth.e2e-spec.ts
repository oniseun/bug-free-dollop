import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { createTestModule } from '../../../test/create-test-module';
import { EntityTestService } from '../../../test/entity-test.service';
import { TestDatabaseService } from '../../../test/test-database.service';
import { CreateUserDto } from '../../users/dtos/request/create-user.dto';
import { UserDto } from '../../users/dtos/response/user.dto';
import { UserRole } from '../../users/enums/user-role.enum';

describe('/auth', () => {
  let app: INestApplication;
  let module: TestingModule;
  let testDatabaseService: TestDatabaseService;
  let testService: EntityTestService;

  beforeAll(async () => {
    module = await createTestModule();
    testDatabaseService = module.get<TestDatabaseService>(TestDatabaseService);
    testService = module.get<EntityTestService>(EntityTestService);

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

  const uniqueEmail = (prefix: string) =>
    `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@eequ.org`;

  const makeUserPayload = (
    overrides: Partial<CreateUserDto> = {},
  ): CreateUserDto => ({
    firstName: 'Auth',
    lastName: 'Tester',
    email: uniqueEmail('auth'),
    password: 'testAuth123',
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
      user: response.body.data as UserDto,
    };
  };

  const loginUser = async (email: string, password: string) => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);

    return response.body.data.accessToken as string;
  };

  describe('Authentication flows', () => {
    it('allows a registered user to log in', async () => {
      const { payload } = await registerUser();
      const token = await loginUser(payload.email, payload.password);

      expect(token).toBeDefined();
    });

    it('allows an admin to log in', async () => {
      const { payload } = await registerUser({ role: UserRole.admin });
      const token = await loginUser(payload.email, payload.password);

      expect(token).toBeDefined();
    });

    it('rejects invalid password attempts', async () => {
      const { payload } = await registerUser();

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: payload.email, password: 'wrong-password' })
        .expect(401);

      expect(response.body.message).toBe('Invalid credentials');
    });

    it('rejects login for unknown users', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: uniqueEmail('missing'), password: 'doesnt-matter' })
        .expect(401);
    });
  });
});

