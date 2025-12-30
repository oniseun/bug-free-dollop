
# TypeORM

Run the existing migrations:
> npm run migration:run

Generate a new migration from your entity changes:
> npm run typeorm migration:generate -- src/database/migrations/MigrationName -d src/database/localDataSource.ts

Run the migrations again, including the newly created one:
> npm run migration:run

Revert the last migration:
> npm run migration:revert