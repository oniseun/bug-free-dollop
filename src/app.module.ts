import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeormModuleOptions } from './database/database.provider';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from './modules/common/common.module';
import { UsersModule } from './modules/users/users.module';
import { ProductsModule } from './modules/products/products.module';
import { LoggerModule } from 'nestjs-pino';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync(typeormModuleOptions),
    LoggerModule.forRoot(),
    CacheModule.register({
      isGlobal: true,
      ttl: 60000,
      max: 100,
    }),
    CommonModule,
    UsersModule,
    ProductsModule,
  ],
  controllers: [],
  providers: [AppService],
})
export class AppModule {}
