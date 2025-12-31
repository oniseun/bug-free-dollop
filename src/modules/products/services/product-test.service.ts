import { Injectable } from '@nestjs/common';
import { TestDatabaseService } from '../../../test/test-database.service';
import { Product } from '../entities/product.entity';

@Injectable()
export class ProductTestService {
  constructor(private readonly database: TestDatabaseService) {}

  createItem(params?: Partial<Product>) {
    const repository = this.database.getRepository(Product);
    return repository.save(this.fixtureProduct(params));
  }

  fixtureProduct(params: Partial<Product> = {}) {
    const {
      number = 'a1b2',
      title = 'Moby-Dick',
      description = 'The book is ...',
      userId,
    } = params;

    const product = new Product();
    product.title = title;
    product.description = description;
    product.userId = userId;
    product.number = number;

    return product;
  }
}

