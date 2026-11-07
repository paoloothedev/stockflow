import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { paginate } from '../common/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, ProductQueryDto, UpdateProductDto } from './products.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: ProductQueryDto) {
    const { page, limit, search, categoryId, lowStock } = query;

    const where: Prisma.ProductWhereInput = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (categoryId) where.categoryId = categoryId;
    if (lowStock) where.id = { in: await this.lowStockIds() };

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: { category: true, stock: { select: { quantity: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return paginate(products.map(withTotal), total, page, limit);
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findUniqueOrThrow({
      where: { id },
      include: {
        category: true,
        stock: { include: { warehouse: true } },
        movements: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: { warehouse: true, user: { select: { id: true, name: true } } },
        },
      },
    });
    return withTotal(product);
  }

  create(dto: CreateProductDto) {
    return this.prisma.product.create({ data: dto });
  }

  update(id: number, dto: UpdateProductDto) {
    return this.prisma.product.update({ where: { id }, data: dto });
  }

  remove(id: number) {
    return this.prisma.product.delete({ where: { id } });
  }

  // products where the total quantity in all warehouses is <= minStock
  async lowStockIds(): Promise<number[]> {
    const rows = await this.prisma.$queryRaw<{ id: number }[]>`
      SELECT p.id
      FROM "Product" p
      LEFT JOIN "Stock" s ON s."productId" = p.id
      GROUP BY p.id
      HAVING COALESCE(SUM(s.quantity), 0) <= p."minStock"
    `;
    return rows.map((r) => r.id);
  }
}

function withTotal<T extends { stock: { quantity: number }[] }>(product: T) {
  return { ...product, totalStock: product.stock.reduce((sum, s) => sum + s.quantity, 0) };
}
