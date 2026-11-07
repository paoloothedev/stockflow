import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, errorMessage } from '../api/client';
import type { Order } from '../api/types';
import PageHeader from '../components/PageHeader';
import { useProductOptions, useWarehouses } from '../hooks/queries';
import { money } from '../utils/format';

type Line = { productId: string; quantity: number };

export default function NewOrder() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: products } = useProductOptions();
  const { data: warehouses } = useWarehouses();

  const [customer, setCustomer] = useState({ customerName: '', customerPhone: '', address: '' });
  const [warehouseId, setWarehouseId] = useState('');
  const [lines, setLines] = useState<Line[]>([{ productId: '', quantity: 1 }]);

  const updateLine = (index: number, data: Partial<Line>) => {
    setLines(lines.map((l, i) => (i === index ? { ...l, ...data } : l)));
  };

  const total = lines.reduce((sum, l) => {
    const p = products?.find((p) => String(p.id) === l.productId);
    return sum + (p ? Number(p.price) * l.quantity : 0);
  }, 0);

  const create = useMutation({
    mutationFn: () =>
      api.post<Order>('/orders', {
        customerName: customer.customerName,
        customerPhone: customer.customerPhone || undefined,
        address: customer.address || undefined,
        warehouseId: Number(warehouseId),
        items: lines.map((l) => ({ productId: Number(l.productId), quantity: l.quantity })),
      }),
    onSuccess: (res) => {
      toast.success('Order created');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      navigate(`/orders/${res.data.id}`);
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    create.mutate();
  };

  return (
    <>
      <PageHeader title="New order" />

      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-3">
        <div className="card space-y-4 p-5 lg:col-span-1">
          <h2 className="font-semibold">Customer</h2>
          <div>
            <label className="label">Name</label>
            <input
              className="input"
              required
              value={customer.customerName}
              onChange={(e) => setCustomer({ ...customer, customerName: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Phone</label>
            <input
              className="input"
              value={customer.customerPhone}
              onChange={(e) => setCustomer({ ...customer, customerPhone: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Address</label>
            <textarea
              className="input"
              rows={2}
              value={customer.address}
              onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Ship from</label>
            <select
              className="input"
              required
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
            >
              <option value="">Select warehouse</option>
              {warehouses?.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="card p-5 lg:col-span-2">
          <h2 className="mb-4 font-semibold">Items</h2>
          <div className="space-y-3">
            {lines.map((line, i) => (
              <div key={i} className="flex gap-2">
                <select
                  className="input flex-1"
                  required
                  value={line.productId}
                  onChange={(e) => updateLine(i, { productId: e.target.value })}
                >
                  <option value="">Select product</option>
                  {products?.map((p) => (
                    <option
                      key={p.id}
                      value={p.id}
                      disabled={lines.some((l, j) => j !== i && l.productId === String(p.id))}
                    >
                      {p.name} - {money(p.price)}
                    </option>
                  ))}
                </select>
                <input
                  className="input w-20"
                  type="number"
                  min={1}
                  value={line.quantity}
                  onChange={(e) => updateLine(i, { quantity: Number(e.target.value) })}
                />
                <button
                  type="button"
                  className="px-2 text-gray-400 hover:text-red-600 disabled:opacity-30"
                  disabled={lines.length === 1}
                  onClick={() => setLines(lines.filter((_, j) => j !== i))}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="mt-3 inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline"
            onClick={() => setLines([...lines, { productId: '', quantity: 1 }])}
          >
            <Plus size={16} /> Add item
          </button>

          <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
            <p className="text-lg font-semibold">Total: {money(total)}</p>
            <button className="btn btn-primary" disabled={create.isPending}>
              {create.isPending ? 'Creating...' : 'Create order'}
            </button>
          </div>
        </div>
      </form>
    </>
  );
}
