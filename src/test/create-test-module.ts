import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '../app.module';
import { typeormTestOptions } from './test-database.provider';
import { UserTestService } from '../modules/users/services/user-test.service';
import { EntityTestService } from './entity-test.service';
import { TestDatabaseService } from './test-database.service';
import { ProductTestService } from '../modules/products/services/product-test.service';

export const createTestModule = async (): Promise<TestingModule> => {
  return Test.createTestingModule({
    imports: [AppModule],
    providers: [
      TestDatabaseService,
      UserTestService,
      ProductTestService,
      EntityTestService,
    ],
  })
    .overrideProvider(DataSource)
    .useFactory({
      factory: typeormTestOptions.useFactory,
      inject: typeormTestOptions.inject,
    })
    .compile();
};
