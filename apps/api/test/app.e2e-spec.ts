import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Role } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaExceptionFilter } from '../src/common/prisma-exception.filter';
import { PrismaService } from '../src/prisma/prisma.service';

// needs a real postgres, see README (DATABASE_URL should point to a test db)
describe('StockFlow API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let staffToken: string;
  let productId: number;
  let warehouseId: number;

  const api = () => request(app.getHttpServer());

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new PrismaExceptionFilter());
    await app.init();

    prisma = app.get(PrismaService);
    await prisma.$executeRawUnsafe(
      'TRUNCATE "StockMovement", "OrderItem", "Order", "Stock", "Product", "Category", "Warehouse", "User" RESTART IDENTITY CASCADE',
    );

    // first user -> make it admin directly in the db
    const admin = await api()
      .post('/api/auth/register')
      .send({ name: 'Admin', email: 'admin@test.com', password: 'secret123' })
      .expect(201);
    await prisma.user.update({ where: { id: admin.body.user.id }, data: { role: Role.ADMIN } });

    const login = await api()
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'secret123' })
      .expect(200);
    adminToken = login.body.token;

    const staff = await api()
      .post('/api/auth/register')
      .send({ name: 'Staff', email: 'staff@test.com', password: 'secret123' })
      .expect(201);
    staffToken = staff.body.token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('auth', () => {
    it('rejects requests without a token', () => {
      return api().get('/api/products').expect(401);
    });

    it('rejects wrong password', () => {
      return api()
        .post('/api/auth/login')
        .send({ email: 'admin@test.com', password: 'wrong' })
        .expect(401);
    });

    it('does not allow the same email twice', () => {
      return api()
        .post('/api/auth/register')
        .send({ name: 'Again', email: 'ADMIN@test.com', password: 'secret123' })
        .expect(409);
    });

    it('returns the current user without the password', async () => {
      const res = await api().get('/api/auth/me').set('Authorization', `Bearer ${staffToken}`);
      expect(res.status).toBe(200);
      expect(res.body.email).toBe('staff@test.com');
      expect(res.body.password).toBeUndefined();
    });

    it('validates the body', () => {
      return api().post('/api/auth/register').send({ email: 'not-an-email' }).expect(400);
    });
  });

  describe('roles', () => {
    it('staff can not create warehouses', () => {
      return api()
        .post('/api/warehouses')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ name: 'Nope' })
        .expect(403);
    });

    it('admin can create warehouses', async () => {
      const res = await api()
        .post('/api/warehouses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Main', location: 'Alex' })
        .expect(201);
      warehouseId = res.body.id;
    });
  });

  describe('products & stock', () => {
    it('creates a product', async () => {
      const res = await api()
        .post('/api/products')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ sku: 'TEST-1', name: 'Test Mouse', price: 100, minStock: 3 })
        .expect(201);
      productId = res.body.id;
    });

    it('returns 409 for duplicated sku', () => {
      return api()
        .post('/api/products')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ sku: 'TEST-1', name: 'Other', price: 50 })
        .expect(409);
    });

    it('adds stock', async () => {
      await api()
        .post('/api/stock/movements')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ type: 'IN', productId, warehouseId, quantity: 10 })
        .expect(201);

      const res = await api()
        .get(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${staffToken}`);
      expect(res.body.totalStock).toBe(10);
    });

    it('can not take out more than available', () => {
      return api()
        .post('/api/stock/movements')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ type: 'OUT', productId, warehouseId, quantity: 11 })
        .expect(400);
    });

    it('adjust sets the counted quantity', async () => {
      const res = await api()
        .post('/api/stock/movements')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ type: 'ADJUST', productId, warehouseId, quantity: 8, note: 'stock count' })
        .expect(201);
      expect(res.body.quantity).toBe(-2);
    });

    it('searches products', async () => {
      const res = await api()
        .get('/api/products?search=mouse')
        .set('Authorization', `Bearer ${staffToken}`);
      expect(res.body.meta.total).toBe(1);
    });
  });

  describe('orders', () => {
    let orderId: number;

    const stockNow = async () => {
      const res = await api()
        .get(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${staffToken}`);
      return res.body.totalStock;
    };

    it('creates an order with the price from the db', async () => {
      const res = await api()
        .post('/api/orders')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ customerName: 'Ali', warehouseId, items: [{ productId, quantity: 3 }] })
        .expect(201);
      orderId = res.body.id;
      expect(Number(res.body.total)).toBe(300);
      expect(res.body.status).toBe('PENDING');
    });

    it('confirming takes items from stock', async () => {
      await api()
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ status: 'CONFIRMED' })
        .expect(200);
      expect(await stockNow()).toBe(5);
    });

    it('can not jump to delivered', () => {
      return api()
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ status: 'DELIVERED' })
        .expect(400);
    });

    it('cancelling returns items to stock', async () => {
      await api()
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ status: 'CANCELLED' })
        .expect(200);
      expect(await stockNow()).toBe(8);
    });

    it('can not confirm an order when stock is not enough', async () => {
      const order = await api()
        .post('/api/orders')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ customerName: 'Big order', warehouseId, items: [{ productId, quantity: 50 }] })
        .expect(201);

      await api()
        .patch(`/api/orders/${order.body.id}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ status: 'CONFIRMED' })
        .expect(400);
      expect(await stockNow()).toBe(8);
    });
  });
});
