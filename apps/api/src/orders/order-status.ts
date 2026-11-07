import { OrderStatus } from '@prisma/client';

const { PENDING, CONFIRMED, SHIPPED, DELIVERED, CANCELLED } = OrderStatus;

export const allowedNext: Record<OrderStatus, OrderStatus[]> = {
  [PENDING]: [CONFIRMED, CANCELLED],
  [CONFIRMED]: [SHIPPED, CANCELLED],
  [SHIPPED]: [DELIVERED],
  [DELIVERED]: [],
  [CANCELLED]: [],
};

export function canMove(from: OrderStatus, to: OrderStatus) {
  return allowedNext[from].includes(to);
}
