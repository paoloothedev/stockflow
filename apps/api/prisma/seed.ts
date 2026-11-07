import { MovementType, OrderStatus, PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const products = [
  { sku: 'KB-001', name: 'Mechanical Keyboard RGB', price: 1850, minStock: 5, category: 'Keyboards' },
  { sku: 'KB-002', name: 'Wireless Keyboard Slim', price: 950, minStock: 5, category: 'Keyboards' },
  { sku: 'MS-001', name: 'Gaming Mouse 16000 DPI', price: 780, minStock: 8, category: 'Mice' },
  { sku: 'MS-002', name: 'Wireless Mouse Silent', price: 420, minStock: 10, category: 'Mice' },
  { sku: 'HS-001', name: 'Headset 7.1 Surround', price: 1650, minStock: 4, category: 'Headsets' },
  { sku: 'HS-002', name: 'Earbuds Pro', price: 1200, minStock: 6, category: 'Headsets' },
  { sku: 'MP-001', name: 'Mouse Pad XL', price: 250, minStock: 15, category: 'Accessories' },
  { sku: 'CB-001', name: 'USB-C Cable 2m', price: 120, minStock: 20, category: 'Accessories' },
  { sku: 'ST-001', name: 'Headphone Stand', price: 300, minStock: 5, category: 'Accessories' },
  { sku: 'MN-001', name: '27" Monitor 165Hz', price: 8900, minStock: 2, category: 'Monitors' },
];

async function main() {
  // start clean every time
  await prisma.stockMovement.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.stock.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.user.deleteMany();

  const admin = await prisma.user.create({
    data: {
      name: 'Demo Admin',
      email: 'demo@stockflow.dev',
      password: await bcrypt.hash('demo1234', 10),
      role: Role.ADMIN,
    },
  });
  await prisma.user.create({
    data: {
      name: 'Ahmed (Staff)',
      email: 'staff@stockflow.dev',
      password: await bcrypt.hash('staff1234', 10),
    },
  });

  const main = await prisma.warehouse.create({
    data: { name: 'Main Warehouse', location: 'Alexandria' },
  });
  const cairo = await prisma.warehouse.create({
    data: { name: 'Cairo Branch', location: 'Nasr City, Cairo' },
  });

  const categoryIds: Record<string, number> = {};
  for (const name of [...new Set(products.map((p) => p.category))]) {
    const c = await prisma.category.create({ data: { name } });
    categoryIds[name] = c.id;
  }

  const created = [];
  for (const [i, p] of products.entries()) {
    const product = await prisma.product.create({
      data: {
        sku: p.sku,
        name: p.name,
        price: p.price,
        minStock: p.minStock,
        categoryId: categoryIds[p.category],
      },
    });
    created.push(product);

    // a couple of products are low on purpose so the dashboard shows alerts
    const qtyMain = i % 4 === 3 ? 2 : 20 + i * 3;
    const qtyCairo = i % 3 === 0 ? 0 : 6 + i;

    for (const [warehouse, quantity] of [
      [main, qtyMain],
      [cairo, qtyCairo],
    ] as const) {
      if (quantity === 0) continue;
      await prisma.stock.create({
        data: { productId: product.id, warehouseId: warehouse.id, quantity },
      });
      await prisma.stockMovement.create({
        data: {
          type: MovementType.IN,
          quantity,
          productId: product.id,
          warehouseId: warehouse.id,
          userId: admin.id,
          note: 'Opening stock',
        },
      });
    }
  }

  await prisma.order.create({
    data: {
      customerName: 'Omar Khaled',
      customerPhone: '01012345678',
      address: 'Smouha, Alexandria',
      warehouseId: main.id,
      createdById: admin.id,
      total: 1850 + 250,
      items: {
        create: [
          { productId: created[0].id, quantity: 1, price: 1850 },
          { productId: created[6].id, quantity: 1, price: 250 },
        ],
      },
    },
  });
  await prisma.order.create({
    data: {
      customerName: 'Mona Adel',
      customerPhone: '01198765432',
      warehouseId: cairo.id,
      createdById: admin.id,
      status: OrderStatus.DELIVERED,
      total: 420 * 2,
      items: { create: [{ productId: created[3].id, quantity: 2, price: 420 }] },
    },
  });

  console.log('Seed done. Login with demo@stockflow.dev / demo1234');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
