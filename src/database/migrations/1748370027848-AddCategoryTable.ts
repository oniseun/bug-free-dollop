import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCategoryTable1748370027848 implements MigrationInterface {
  name = 'AddCategoryTable1748370027848';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`category\` (\`id\` int NOT NULL AUTO_INCREMENT, \`parent_id\` int NULL, \`order\` int NULL, \`title\` varchar(255) NULL, \`description\` text NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`product_category\` (\`category_id\` int NOT NULL, \`product_id\` int NOT NULL, INDEX \`IDX_2df1f83329c00e6eadde0493e1\` (\`category_id\`), INDEX \`IDX_0374879a971928bc3f57eed0a5\` (\`product_id\`), PRIMARY KEY (\`category_id\`, \`product_id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`category\` ADD CONSTRAINT \`FK_1117b4fcb3cd4abb4383e1c2743\` FOREIGN KEY (\`parent_id\`) REFERENCES \`category\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`product_category\` ADD CONSTRAINT \`FK_2df1f83329c00e6eadde0493e16\` FOREIGN KEY (\`category_id\`) REFERENCES \`category\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE \`product_category\` ADD CONSTRAINT \`FK_0374879a971928bc3f57eed0a59\` FOREIGN KEY (\`product_id\`) REFERENCES \`product\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`product_category\` DROP FOREIGN KEY \`FK_0374879a971928bc3f57eed0a59\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`product_category\` DROP FOREIGN KEY \`FK_2df1f83329c00e6eadde0493e16\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`category\` DROP FOREIGN KEY \`FK_1117b4fcb3cd4abb4383e1c2743\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_0374879a971928bc3f57eed0a5\` ON \`product_category\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_2df1f83329c00e6eadde0493e1\` ON \`product_category\``,
    );
    await queryRunner.query(`DROP TABLE \`product_category\``);
    await queryRunner.query(`DROP TABLE \`category\``);
  }
}
