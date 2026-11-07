import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, errorMessage } from '../api/client';
import type { StockLevel, Warehouse } from '../api/types';
import { useAuth } from '../auth';
import { StockBadge } from '../components/Badges';
import Modal from '../components/Modal';
import PageHeader from '../components/PageHeader';
import { PageLoader } from '../components/Spinner';
import { useWarehouses } from '../hooks/queries';

export default function Warehouses() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const queryClient = useQueryClient();
  const { data: warehouses, isLoading } = useWarehouses();
  const [selected, setSelected] = useState<number | null>(null);
  const [editing, setEditing] = useState<Warehouse | 'new' | null>(null);

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/warehouses/${id}`),
    onSuccess: () => {
      toast.success('Warehouse deleted');
      setSelected(null);
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  if (isLoading) return <PageLoader />;

  return (
    <>
      <PageHeader title="Warehouses">
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setEditing('new')}>
            <Plus size={16} /> Add warehouse
          </button>
        )}
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {warehouses?.map((w) => (
          <div
            key={w.id}
            onClick={() => setSelected(w.id)}
            className={`card cursor-pointer p-5 transition hover:shadow-md ${
              selected === w.id ? 'ring-2 ring-indigo-500' : ''
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">{w.name}</h3>
                {w.location && (
                  <p className="mt-1 flex items-center gap-1 text-sm text-gray-500">
                    <MapPin size={14} /> {w.location}
                  </p>
                )}
              </div>
              {isAdmin && (
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="p-1 text-gray-400 hover:text-gray-700"
                    onClick={() => setEditing(w)}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    className="p-1 text-gray-400 hover:text-red-600"
                    onClick={() => confirm(`Delete ${w.name}?`) && remove.mutate(w.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
            <p className="mt-4 text-2xl font-bold">{w.totalItems}</p>
            <p className="text-sm text-gray-500">items in stock</p>
          </div>
        ))}
      </div>

      {selected && <WarehouseStock id={selected} />}

      <Modal
        title={editing === 'new' ? 'Add warehouse' : 'Edit warehouse'}
        open={editing !== null}
        onClose={() => setEditing(null)}
      >
        {editing && (
          <WarehouseForm
            warehouse={editing === 'new' ? undefined : editing}
            onDone={() => setEditing(null)}
          />
        )}
      </Modal>
    </>
  );
}

function WarehouseStock({ id }: { id: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ['warehouses', id],
    queryFn: () =>
      api.get<Warehouse & { stock: StockLevel[] }>(`/warehouses/${id}`).then((r) => r.data),
  });

  if (isLoading || !data) return <PageLoader />;

  return (
    <div className="card mt-6 overflow-hidden">
      <h2 className="border-b border-gray-200 px-5 py-4 font-semibold">Stock in {data.name}</h2>
      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Quantity</th>
            </tr>
          </thead>
          <tbody>
            {data.stock.map((s) => (
              <tr key={s.productId}>
                <td className="font-medium">{s.product?.name}</td>
                <td className="text-gray-500">{s.product?.sku}</td>
                <td>
                  <StockBadge qty={s.quantity} min={s.product?.minStock ?? 0} />
                </td>
              </tr>
            ))}
            {data.stock.length === 0 && (
              <tr>
                <td colSpan={3} className="py-8 text-center text-gray-500">
                  This warehouse is empty
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function WarehouseForm({ warehouse, onDone }: { warehouse?: Warehouse; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(warehouse?.name ?? '');
  const [location, setLocation] = useState(warehouse?.location ?? '');

  const save = useMutation({
    mutationFn: () => {
      const body = { name, location: location || undefined };
      return warehouse
        ? api.patch(`/warehouses/${warehouse.id}`, body)
        : api.post('/warehouses', body);
    },
    onSuccess: () => {
      toast.success('Saved');
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      onDone();
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label">Name</label>
        <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label className="label">Location</label>
        <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} />
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn btn-secondary" onClick={onDone}>
          Cancel
        </button>
        <button className="btn btn-primary" disabled={save.isPending}>
          Save
        </button>
      </div>
    </form>
  );
}
