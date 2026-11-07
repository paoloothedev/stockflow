import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlertTriangle, Clock, DollarSign, Package, Warehouse } from 'lucide-react';
import { api } from '../api/client';
import type { DashboardStats } from '../api/types';
import { MovementBadge } from '../components/Badges';
import PageHeader from '../components/PageHeader';
import { PageLoader } from '../components/Spinner';
import { date, money } from '../utils/format';

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardStats>('/dashboard').then((r) => r.data),
  });

  if (isLoading || !data) return <PageLoader />;

  const cards = [
    {
      label: 'Products',
      value: data.productsCount,
      icon: Package,
      color: 'text-indigo-600 bg-indigo-50',
    },
    {
      label: 'Warehouses',
      value: data.warehousesCount,
      icon: Warehouse,
      color: 'text-sky-600 bg-sky-50',
    },
    {
      label: 'Pending orders',
      value: data.pendingOrders,
      icon: Clock,
      color: 'text-yellow-600 bg-yellow-50',
    },
    {
      label: 'Total sales',
      value: money(data.totalSales),
      icon: DollarSign,
      color: 'text-green-600 bg-green-50',
    },
  ];

  return (
    <>
      <PageHeader title="Dashboard" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="card flex items-center gap-4 p-5">
            <span className={`rounded-lg p-2.5 ${c.color}`}>
              <c.icon size={22} />
            </span>
            <div>
              <p className="text-sm text-gray-500">{c.label}</p>
              <p className="text-xl font-semibold text-gray-900">{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
            <h2 className="flex items-center gap-2 font-semibold">
              <AlertTriangle size={18} className="text-amber-500" />
              Low stock ({data.lowStockCount})
            </h2>
            <Link to="/products?lowStock=true" className="text-sm text-indigo-600 hover:underline">
              View all
            </Link>
          </div>
          {data.lowStock.length === 0 ? (
            <p className="p-5 text-sm text-gray-500">All products are above the minimum 👌</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {data.lowStock.map((p) => (
                <li key={p.id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <Link to={`/products/${p.id}`} className="font-medium hover:text-indigo-600">
                    {p.name}
                    <span className="ml-2 text-xs text-gray-400">{p.sku}</span>
                  </Link>
                  <span className="text-red-600">
                    {p.totalStock} / min {p.minStock}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
            <h2 className="font-semibold">Recent movements</h2>
            <Link to="/movements" className="text-sm text-indigo-600 hover:underline">
              View all
            </Link>
          </div>
          <ul className="divide-y divide-gray-100">
            {data.recentMovements.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <div className="flex items-center gap-3">
                  <MovementBadge type={m.type} />
                  <div>
                    <p className="font-medium">{m.product?.name}</p>
                    <p className="text-xs text-gray-400">
                      {m.warehouse?.name} · {date(m.createdAt)}
                    </p>
                  </div>
                </div>
                <span className={m.quantity >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
