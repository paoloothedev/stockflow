import { OrderStatus } from '@prisma/client';
import { canMove } from './order-status';

describe('order status flow', () => {
  it('allows the normal flow', () => {
    expect(canMove(OrderStatus.PENDING, OrderStatus.CONFIRMED)).toBe(true);
    expect(canMove(OrderStatus.CONFIRMED, OrderStatus.SHIPPED)).toBe(true);
    expect(canMove(OrderStatus.SHIPPED, OrderStatus.DELIVERED)).toBe(true);
  });

  it('allows cancelling before shipping only', () => {
    expect(canMove(OrderStatus.PENDING, OrderStatus.CANCELLED)).toBe(true);
    expect(canMove(OrderStatus.CONFIRMED, OrderStatus.CANCELLED)).toBe(true);
    expect(canMove(OrderStatus.SHIPPED, OrderStatus.CANCELLED)).toBe(false);
  });

  it('does not allow skipping steps or going back', () => {
    expect(canMove(OrderStatus.PENDING, OrderStatus.DELIVERED)).toBe(false);
    expect(canMove(OrderStatus.DELIVERED, OrderStatus.PENDING)).toBe(false);
    expect(canMove(OrderStatus.CANCELLED, OrderStatus.CONFIRMED)).toBe(false);
  });
});
