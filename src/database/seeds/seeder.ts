import { DataSource } from 'typeorm';
import { User } from '../../modules/users/entities/user.entity';
import { Product } from '../../modules/products/entities/product.entity';
import { UserRole } from '../../modules/users/enums/user-role.enum';
import * as bcrypt from 'bcrypt';
import seedData from './data.json';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { DB_ENTITIES } from '../database.entities';
import { DB_MIGRATIONS } from '../database.migrations';

// Load environment variables
require('dotenv').config();

const dataSource = new DataSource({
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
  namingStrategy: new SnakeNamingStrategy(),
});

async function seed() {
  console.log(' Starting database seeding...\n');

  try {
    // Initialize data source
    await dataSource.initialize();
    console.log(' Database connection established\n');

    const userRepository = dataSource.getRepository(User);
    const productRepository = dataSource.getRepository(Product);

    // Check if data already exists
    const existingUserCount = await userRepository.count();
    const existingProductCount = await productRepository.count();

    if (existingUserCount > 0 || existingProductCount > 0) {
      console.log('  Database already contains data:');
      console.log(`   Users: ${existingUserCount}`);
      console.log(`   Products: ${existingProductCount}`);
      console.log('\n  Skipping seeding to preserve existing data.');
      console.log('   To re-seed, clear the database first\n');
      await dataSource.destroy();
      process.exit(0);
    }

    console.log('Database is empty, proceeding with seeding...\n');

    // Seed users
    console.log(' Seeding users...');
    const createdUsers: User[] = [];
    const userMap = new Map<string, User>();

    for (const userData of seedData.users) {
      const salt = await bcrypt.genSalt();
      const hashedPassword = await bcrypt.hash(userData.password, salt);

      const user = new User();
      user.firstName = userData.firstName;
      user.lastName = userData.lastName;
      user.email = userData.email;
      user.password = hashedPassword;
      user.role = userData.role === 'admin' ? UserRole.admin : UserRole.user;

      const savedUser = await userRepository.save(user);
      createdUsers.push(savedUser);
      userMap.set(savedUser.email, savedUser);

      console.log(
        `  Created ${userData.role}: ${userData.firstName} ${userData.lastName} (${userData.email})`,
      );
    }
    console.log(`Created ${createdUsers.length} users\n`);

    // Seed products
    console.log('Seeding products...');
    let productCount = 0;

    for (const productData of seedData.products) {
      const user = userMap.get(productData.userEmail);
      if (!user) {
        console.log(
          `  User not found for email: ${productData.userEmail}, skipping product`,
        );
        continue;
      }

      const product = new Product();
      product.userId = user.id;
      product.number = productData.number;
      product.title = productData.title;
      product.description = productData.description;

      await productRepository.save(product);
      productCount++;

      console.log(
        `  Created product: ${productData.title} (${productData.number}) for ${user.firstName}`,
      );
    }
    console.log(`Created ${productCount} products\n`);

    // Summary
    console.log(' Seeding completed successfully!');
    console.log(`\n Summary:`);
    console.log(`   Users: ${createdUsers.length}`);
    console.log(`   Products: ${productCount}`);
    console.log(`\n All user passwords: "password"`);

    await dataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('\n Seeding failed:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

seed();

