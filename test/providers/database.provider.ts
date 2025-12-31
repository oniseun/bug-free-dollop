import { FactoryProvider } from '@nestjs/common/interfaces';
import { ConfigService } from '@nestjs/config';
import { DataSource, DataSourceOptions } from 'typeorm';
import { typeormModuleOptions } from '../../src/database/database.provider';

export const typeormTestOptions: FactoryProvider = {
  provide: DataSource,
  useFactory: async (config: ConfigService): Promise<DataSource> => {
    const appOptions = await typeormModuleOptions.useFactory(config);
    const testOptions = {
      ...appOptions,
      multipleStatements: true,
      host: config.get<string>('DB_HOST'),
      port: config.get<number>('DB_PORT'),
      username: config.get<string>('DB_USERNAME'),
      password: config.get<string>('DB_PASSWORD'),
      database: config.get<string>('DB_NAME'),
    } as DataSourceOptions;
    const dataSource = new DataSource(testOptions);
    return dataSource.initialize();
  },
  inject: [ConfigService],
};
