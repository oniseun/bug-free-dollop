import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeUserRoleToEnum1767140000000 implements MigrationInterface {
  name = 'ChangeUserRoleToEnum1767140000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`user\` MODIFY \`role\` ENUM('user', 'admin') NOT NULL DEFAULT 'user'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`user\` MODIFY \`role\` varchar(50) NOT NULL DEFAULT 'user'`,
    );
  }
}
