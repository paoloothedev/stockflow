import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, errorMessage } from '../api/client';
import type { Order, OrderStatus } from '../api/types';
import { StatusBadge } from '../components/Badges';
import { PageLoader } from '../components/Spinner';
import { date, money } from '../utils/format';

const nextActions: Record<OrderStatus, { status: OrderStatus; label: string }[]> = {
  PENDING: [
    { status: 'CONFIRMED', label: 'Confirm order' },
    { status: 'CANCELLED', label: 'Cancel' },
  ],
  CONFIRMED: [
    { status: 'SHIPPED', label: 'Mark as shipped' },
    { status: 'CANCELLED', label: 'Cancel' },
  ],
  SHIPPED: [{ status: 'DELIVERED', label: 'Mark as delivered' }],
  DELIVERED: [],
  CANCELLED: [],
};

export default function OrderDetails() {
  const { id } = useParams();
  const queryClient = useQueryClient();

  const {
    data: order,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['orders', id],
    queryFn: () => api.get<Order>(`/orders/${id}`).then((r) => r.data),
  });

  const changeStatus = useMutation({
    mutationFn: (status: OrderStatus) => api.patch(`/orders/${id}/status`, { status }),
    onSuccess: () => {
      toast.success('Order updated');
      for (const key of ['orders', 'products', 'movements', 'warehouses', 'dashboard']) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  if (isError) return <p className="text-gray-500">Order not found.</p>;
  if (isLoading || !order) return <PageLoader />;

  return (
    <>
      <Link to="/orders" className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500">
        <ArrowLeft size={16} /> Orders
      </Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Order #{order.id}</h1>
          <StatusBadge status={order.status} />
        </div>
        <div className="flex gap-2">
          {nextActions[order.status].map((a) => (
            <button
              key={a.status}
              className={a.status === 'CANCELLED' ? 'btn btn-secondary' : 'btn btn-primary'}
              disabled={changeStatus.isPending}
              onClick={() => changeStatus.mutate(a.status)}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {order.status === 'PENDING' && (
        <p className="mb-6 rounded-lg bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          Stock is taken from <b>{order.warehouse.name}</b> when you confirm the order.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card space-y-3 p-5 text-sm">
          <h2 className="font-semibold">Customer</h2>
          <p>{order.customerName}</p>
          <p className="text-gray-500">{order.customerPhone ?? 'No phone'}</p>
          <p className="text-gray-500">{order.address ?? 'No address'}</p>
          <hr className="border-gray-100" />
          <p className="text-gray-500">
            Warehouse: <span className="text-gray-900">{order.warehouse.name}</span>
          </p>
          <p className="text-gray-500">
            Created by {order.createdBy?.name ?? '-'} · {date(order.createdAt)}
          </p>
        </div>

        <div className="card overflow-hidden lg:col-span-2">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Price</th>
                  <th>Qty</th>
                  <th className="text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {order.items?.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <p className="font-medium">{item.product.name}</p>
                      <p className="text-xs text-gray-400">{item.product.sku}</p>
                    </td>
                    <td>{money(item.price)}</td>
                    <td>{item.quantity}</td>
                    <td className="text-right">{money(Number(item.price) * item.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end border-t border-gray-200 px-4 py-4 text-lg font-semibold">
            Total: {money(order.total)}
          </div>
        </div>
      </div>
    </>
  );
}
