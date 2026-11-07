import { BadRequestException, Injectable } from '@nestjs/common';
import { MovementType, OrderStatus, Prisma } from '@prisma/client';
import { paginate } from '../common/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';
import { StockService } from '../stock/stock.service';
import { canMove } from './order-status';
import { CreateOrderDto, OrderQueryDto } from './orders.dto';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private stock: StockService,
  ) {}

  async findAll(query: OrderQueryDto) {
    const { page, limit, status, search } = query;
    const where: Prisma.OrderWhereInput = { status };
    if (search) {
      where.OR = [
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerPhone: { contains: search } },
      ];
      if (!isNaN(Number(search))) where.OR.push({ id: Number(search) });
    }

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          warehouse: { select: { id: true, name: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);
    return paginate(data, total, page, limit);
  }

  findOne(id: number) {
    return this.prisma.order.findUniqueOrThrow({
      where: { id },
      include: {
        warehouse: true,
        createdBy: { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, sku: true, name: true } } } },
      },
    });
  }

  async create(dto: CreateOrderDto, userId: number) {
    const ids = dto.items.map((i) => i.productId);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('Same product is added twice');
    }

    const products = await this.prisma.product.findMany({ where: { id: { in: ids } } });
    if (products.length !== ids.length) {
      throw new BadRequestException('Some products were not found');
    }

    // take the price from the db, never trust the price from the client
    const items = dto.items.map((item) => {
      const product = products.find((p) => p.id === item.productId)!;
      return { productId: item.productId, quantity: item.quantity, price: product.price };
    });
    const total = items.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);

    return this.prisma.order.create({
      data: {
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        address: dto.address,
        warehouseId: dto.warehouseId,
        createdById: userId,
        total,
        items: { create: items },
      },
      include: { items: true },
    });
  }

  async updateStatus(id: number, status: OrderStatus, userId: number) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUniqueOrThrow({ where: { id }, include: { items: true } });

      if (!canMove(order.status, status)) {
        throw new BadRequestException(`Can't change order from ${order.status} to ${status}`);
      }

      // confirming takes the items out of the warehouse
      if (status === OrderStatus.CONFIRMED) {
        for (const item of order.items) {
          await this.stock.changeStock(tx, item.productId, order.warehouseId, -item.quantity);
        }
        await tx.stockMovement.createMany({
          data: order.items.map((item) => ({
            type: MovementType.OUT,
            quantity: -item.quantity,
            productId: item.productId,
            warehouseId: order.warehouseId,
            orderId: order.id,
            userId,
            note: `Order #${order.id}`,
          })),
        });
      }

      // cancelling a confirmed order puts the items back
      if (status === OrderStatus.CANCELLED && order.status === OrderStatus.CONFIRMED) {
        for (const item of order.items) {
          await this.stock.changeStock(tx, item.productId, order.warehouseId, item.quantity);
        }
        await tx.stockMovement.createMany({
          data: order.items.map((item) => ({
            type: MovementType.IN,
            quantity: item.quantity,
            productId: item.productId,
            warehouseId: order.warehouseId,
            orderId: order.id,
            userId,
            note: `Order #${order.id} cancelled`,
          })),
        });
      }

      return tx.order.update({ where: { id }, data: { status } });
    });
  }
}
