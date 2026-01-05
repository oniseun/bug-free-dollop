import { Inject, Injectable } from '@nestjs/common';
import {
  DataSource,
  EntityMetadata,
  EntitySchema,
  ObjectType,
  Repository,
} from 'typeorm';

@Injectable()
export class TestDatabaseService {
  constructor(@Inject(DataSource) public dataSource: DataSource) {}

  getRepository<T>(
    target: string | ObjectType<T> | EntitySchema<T>,
  ): Repository<T> {
    return this.dataSource.getRepository(target);
  }

  async closeDatabaseConnection() {
    if (this.dataSource.isInitialized) {
      await this.dataSource.destroy();
    }
  }

  async cleanDatabase() {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      const entities = await this.getEntities();
      await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0');
      for (const entity of entities) {
        try {
          await queryRunner.query(`DELETE FROM ${entity.tableName}`);
        } catch (err) {
            console.error(`Failed to clean table ${entity.tableName}:`, err);
            throw err;
        }
      }
      await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1');
    } catch (error) {
        console.error('Error cleaning database:', error);
        throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async getEntities() {
    return this.dataSource.entityMetadatas;
  }
}
