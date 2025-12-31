import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserRoleToUserTable1747930420048 implements MigrationInterface {
  name = 'AddUserRoleToUserTable1747930420048';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD \`role\` varchar(50) NOT NULL DEFAULT 'user'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`role\``);
  }
}
