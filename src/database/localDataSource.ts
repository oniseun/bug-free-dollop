import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { DB_ENTITIES } from './database.entities';
import { DB_MIGRATIONS } from './database.migrations';


try {
  require('dotenv').config();
} catch (e) {
  // dotenv not available or no .env file, use process.env directly
}

export const LocalDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'eequ_recruit',
  timezone: 'Z',
  entities: DB_ENTITIES,
  synchronize: false,
  migrations: DB_MIGRATIONS,
  migrationsRun: false, // CLI runs migrations manually
  namingStrategy: new SnakeNamingStrategy(),
});

// Default export for CLI
export default LocalDataSource;

