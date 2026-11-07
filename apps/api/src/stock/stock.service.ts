import { BadRequestException, Injectable } from '@nestjs/common';
import { MovementType, Prisma } from '@prisma/client';
import { paginate } from '../common/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMovementDto, MovementQueryDto, TransferDto } from './stock.dto';

type Tx = Prisma.TransactionClient;

@Injectable()
export class StockService {
  constructor(private prisma: PrismaService) {}

  async listMovements(query: MovementQueryDto) {
    const { page, limit, productId, warehouseId, type } = query;
    const where: Prisma.StockMovementWhereInput = { productId, warehouseId, type };

    const [data, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        include: {
          product: { select: { id: true, sku: true, name: true } },
          warehouse: { select: { id: true, name: true } },
          user: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.stockMovement.count({ where }),
    ]);
    return paginate(data, total, page, limit);
  }

  createMovement(dto: CreateMovementDto, userId: number) {
    return this.prisma.$transaction(async (tx) => {
      let change = dto.quantity;

      if (dto.type === MovementType.OUT) {
        change = -dto.quantity;
      } else if (dto.type === MovementType.ADJUST) {
        const current = await tx.stock.findUnique({
          where: {
            productId_warehouseId: { productId: dto.productId, warehouseId: dto.warehouseId },
          },
        });
        change = dto.quantity - (current?.quantity ?? 0);
      }

      if (change === 0 && dto.type !== MovementType.ADJUST) {
        throw new BadRequestException('Quantity must be more than 0');
      }

      await this.changeStock(tx, dto.productId, dto.warehouseId, change);

      return tx.stockMovement.create({
        data: {
          type: dto.type,
          quantity: change,
          note: dto.note,
          productId: dto.productId,
          warehouseId: dto.warehouseId,
          userId,
        },
      });
    });
  }

  transfer(dto: TransferDto, userId: number) {
    if (dto.fromWarehouseId === dto.toWarehouseId) {
      throw new BadRequestException('Pick two different warehouses');
    }

    return this.prisma.$transaction(async (tx) => {
      await this.changeStock(tx, dto.productId, dto.fromWarehouseId, -dto.quantity);
      await this.changeStock(tx, dto.productId, dto.toWarehouseId, dto.quantity);

      const note = dto.note || 'Transfer';
      await tx.stockMovement.createMany({
        data: [
          {
            type: MovementType.OUT,
            quantity: -dto.quantity,
            productId: dto.productId,
            warehouseId: dto.fromWarehouseId,
            note,
            userId,
          },
          {
            type: MovementType.IN,
            quantity: dto.quantity,
            productId: dto.productId,
            warehouseId: dto.toWarehouseId,
            note,
            userId,
          },
        ],
      });
      return { success: true };
    });
  }

  async changeStock(tx: Tx, productId: number, warehouseId: number, change: number) {
    if (change >= 0) {
      await tx.stock.upsert({
        where: { productId_warehouseId: { productId, warehouseId } },
        create: { productId, warehouseId, quantity: change },
        update: { quantity: { increment: change } },
      });
      return;
    }

    // only update if there is enough, so two requests at the same time can't go below 0
    const result = await tx.stock.updateMany({
      where: { productId, warehouseId, quantity: { gte: -change } },
      data: { quantity: { increment: change } },
    });

    if (result.count === 0) {
      const product = await tx.product.findUnique({ where: { id: productId } });
      throw new BadRequestException(`Not enough stock for ${product?.name ?? 'product'}`);
    }
  }
}
