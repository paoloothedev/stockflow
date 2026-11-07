import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProductsService } from '../products/products.service';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(
    private prisma: PrismaService,
    private products: ProductsService,
  ) {}

  @Get()
  async stats() {
    const lowIds = await this.products.lowStockIds();

    const [productsCount, warehousesCount, pendingOrders, sales, lowStock, recentMovements] =
      await Promise.all([
        this.prisma.product.count(),
        this.prisma.warehouse.count(),
        this.prisma.order.count({ where: { status: OrderStatus.PENDING } }),
        this.prisma.order.aggregate({
          _sum: { total: true },
          where: {
            status: { in: [OrderStatus.CONFIRMED, OrderStatus.SHIPPED, OrderStatus.DELIVERED] },
          },
        }),
        this.prisma.product.findMany({
          where: { id: { in: lowIds } },
          include: { stock: { select: { quantity: true } } },
          take: 10,
        }),
        this.prisma.stockMovement.findMany({
          take: 8,
          orderBy: { createdAt: 'desc' },
          include: {
            product: { select: { id: true, name: true } },
            warehouse: { select: { id: true, name: true } },
          },
        }),
      ]);

    return {
      productsCount,
      warehousesCount,
      pendingOrders,
      lowStockCount: lowIds.length,
      totalSales: Number(sales._sum.total ?? 0),
      lowStock: lowStock.map(({ stock, ...p }) => ({
        ...p,
        totalStock: stock.reduce((sum, s) => sum + s.quantity, 0),
      })),
      recentMovements,
    };
  }
}
