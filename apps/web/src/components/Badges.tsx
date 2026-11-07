import type { MovementType, OrderStatus } from '../api/types';

const statusColors: Record<OrderStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  SHIPPED: 'bg-purple-100 text-purple-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-200 text-gray-700',
};

const movementColors: Record<MovementType, string> = {
  IN: 'bg-green-100 text-green-800',
  OUT: 'bg-red-100 text-red-800',
  ADJUST: 'bg-amber-100 text-amber-800',
};

const base = 'inline-block rounded-full px-2.5 py-0.5 text-xs font-medium';

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`${base} ${statusColors[status]}`}>{status.toLowerCase()}</span>;
}

export function MovementBadge({ type }: { type: MovementType }) {
  return <span className={`${base} ${movementColors[type]}`}>{type}</span>;
}

export function StockBadge({ qty, min }: { qty: number; min: number }) {
  if (qty === 0) return <span className={`${base} bg-red-100 text-red-800`}>Out of stock</span>;
  if (qty <= min) return <span className={`${base} bg-amber-100 text-amber-800`}>Low · {qty}</span>;
  return <span className={`${base} bg-green-100 text-green-800`}>{qty}</span>;
}
