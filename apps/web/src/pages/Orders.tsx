import { useState } from 'react';
import { Link } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { api } from '../api/client';
import type { Order, OrderStatus, Paginated } from '../api/types';
import { StatusBadge } from '../components/Badges';
import PageHeader from '../components/PageHeader';
import Pagination from '../components/Pagination';
import { PageLoader } from '../components/Spinner';
import { useDebounce } from '../hooks/useDebounce';
import { date, money } from '../utils/format';

const statuses: OrderStatus[] = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

export default function Orders() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);

  const { data, isLoading } = useQuery({
    queryKey: ['orders', { page, status, search: debouncedSearch }],
    queryFn: () =>
      api
        .get<Paginated<Order>>('/orders', {
          params: { page, status: status || undefined, search: debouncedSearch || undefined },
        })
        .then((r) => r.data),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader title="Orders">
        <Link to="/orders/new" className="btn btn-primary">
          <Plus size={16} /> New order
        </Link>
      </PageHeader>

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Customer name, phone or order #"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <select
          className="input w-auto"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s.toLowerCase()}
            </option>
          ))}
        </select>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <PageLoader />
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Customer</th>
                  <th>Warehouse</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {data?.data.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td>
                      <Link to={`/orders/${o.id}`} className="font-medium text-indigo-600">
                        #{o.id}
                      </Link>
                    </td>
                    <td>
                      <p className="font-medium">{o.customerName}</p>
                      <p className="text-xs text-gray-400">{o.customerPhone}</p>
                    </td>
                    <td>{o.warehouse.name}</td>
                    <td>{o._count?.items}</td>
                    <td>{money(o.total)}</td>
                    <td>
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="whitespace-nowrap text-gray-400">{date(o.createdAt)}</td>
                  </tr>
                ))}
                {data?.data.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-gray-500">
                      No orders found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pagination page={page} pages={data.meta.pages} onChange={setPage} />}
      </div>
    </>
  );
}
