import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Product } from '../entities/product.entity';

@Injectable()
export class ProductRepository {
  constructor(
    @InjectRepository(Product)
    private readonly repository: Repository<Product>,
  ) {}

  createQueryBuilder(alias: string): SelectQueryBuilder<Product> {
    return this.repository.createQueryBuilder(alias);
  }

  async findOneById(id: number): Promise<Product | null> {
    return this.repository.findOne({ where: { id } });
  }

  async save(product: Product): Promise<Product> {
    return this.repository.save(product);
  }

  async delete(id: number): Promise<void> {
    await this.repository.delete(id);
  }
}

