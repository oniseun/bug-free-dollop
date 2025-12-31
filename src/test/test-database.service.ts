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
    const entities = await this.getEntities();

    await this.cleanAllEntities(entities);
  }

  private async getEntities() {
    return this.dataSource.entityMetadatas;
  }

  private async cleanAllEntities(entities: EntityMetadata[]) {
    const query = [
      'SET FOREIGN_KEY_CHECKS = 0;',
      ...entities.map(
        (entity) => `DELETE
                             FROM ${entity.tableName};`,
      ),
      'SET FOREIGN_KEY_CHECKS = 1;',
    ].join('');

    await this.dataSource.query(query);
  }
}

