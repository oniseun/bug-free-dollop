import { ConfigService } from '@nestjs/config';
import {
  TypeOrmModuleAsyncOptions,
  TypeOrmModuleOptions,
} from '@nestjs/typeorm';
import { DB_ENTITIES } from './database.entities';
import { DB_MIGRATIONS } from './database.migrations';
import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

export const typeormModuleOptions: TypeOrmModuleAsyncOptions = {
  useFactory: async (
    configService: ConfigService,
  ): Promise<TypeOrmModuleOptions> => {
    return {
      type: 'mysql',
      host: configService.get<string>('DB_HOST'),
      port: configService.get<number>('DB_PORT'),
      username: configService.get<string>('DB_USERNAME'),
      password: configService.get<string>('DB_PASSWORD'),
      database: configService.get<string>('DB_NAME'),
      timezone: 'Z',
      entities: DB_ENTITIES,
      synchronize: false,
      migrations: DB_MIGRATIONS,
      migrationsRun: false,
      namingStrategy: new SnakeNamingStrategy(),
    };
  },
  async dataSourceFactory(options) {
    if (!options) {
      throw new Error('Invalid options passed');
    }
    return new DataSource(options);
  },
  inject: [ConfigService],
};
