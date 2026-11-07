import { useState, type FormEvent } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeftRight, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, errorMessage } from '../api/client';
import type { Movement, MovementType, Paginated } from '../api/types';
import { MovementBadge } from '../components/Badges';
import Modal from '../components/Modal';
import PageHeader from '../components/PageHeader';
import Pagination from '../components/Pagination';
import { PageLoader } from '../components/Spinner';
import { useProductOptions, useWarehouses } from '../hooks/queries';
import { date } from '../utils/format';

export default function Movements() {
  const [page, setPage] = useState(1);
  const [type, setType] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [modal, setModal] = useState<'movement' | 'transfer' | null>(null);
  const { data: warehouses } = useWarehouses();

  const { data, isLoading } = useQuery({
    queryKey: ['movements', { page, type, warehouseId }],
    queryFn: () =>
      api
        .get<Paginated<Movement>>('/stock/movements', {
          params: { page, type: type || undefined, warehouseId: warehouseId || undefined },
        })
        .then((r) => r.data),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader title="Stock Movements">
        <button className="btn btn-secondary" onClick={() => setModal('transfer')}>
          <ArrowLeftRight size={16} /> Transfer
        </button>
        <button className="btn btn-primary" onClick={() => setModal('movement')}>
          <Plus size={16} /> New movement
        </button>
      </PageHeader>

      <div className="mb-4 flex flex-wrap gap-3">
        <select
          className="input w-auto"
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All types</option>
          <option value="IN">IN</option>
          <option value="OUT">OUT</option>
          <option value="ADJUST">ADJUST</option>
        </select>
        <select
          className="input w-auto"
          value={warehouseId}
          onChange={(e) => {
            setWarehouseId(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All warehouses</option>
          {warehouses?.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
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
                  <th>Type</th>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Warehouse</th>
                  <th>Note</th>
                  <th>By</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {data?.data.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <MovementBadge type={m.type} />
                    </td>
                    <td className="font-medium">{m.product?.name}</td>
                    <td className={m.quantity >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                    </td>
                    <td>{m.warehouse?.name}</td>
                    <td className="text-gray-500">{m.note ?? '-'}</td>
                    <td className="text-gray-500">{m.user?.name ?? '-'}</td>
                    <td className="whitespace-nowrap text-gray-400">{date(m.createdAt)}</td>
                  </tr>
                ))}
                {data?.data.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-gray-500">
                      No movements yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pagination page={page} pages={data.meta.pages} onChange={setPage} />}
      </div>

      <Modal title="New stock movement" open={modal === 'movement'} onClose={() => setModal(null)}>
        <MovementForm onDone={() => setModal(null)} />
      </Modal>
      <Modal
        title="Transfer between warehouses"
        open={modal === 'transfer'}
        onClose={() => setModal(null)}
      >
        <TransferForm onDone={() => setModal(null)} />
      </Modal>
    </>
  );
}

function useRefreshStock() {
  const queryClient = useQueryClient();
  return () => {
    for (const key of ['movements', 'products', 'warehouses', 'dashboard']) {
      queryClient.invalidateQueries({ queryKey: [key] });
    }
  };
}

function MovementForm({ onDone }: { onDone: () => void }) {
  const refresh = useRefreshStock();
  const { data: products } = useProductOptions();
  const { data: warehouses } = useWarehouses();
  const [form, setForm] = useState({
    type: 'IN' as MovementType,
    productId: '',
    warehouseId: '',
    quantity: 1,
    note: '',
  });

  const save = useMutation({
    mutationFn: () =>
      api.post('/stock/movements', {
        ...form,
        productId: Number(form.productId),
        warehouseId: Number(form.warehouseId),
        note: form.note || undefined,
      }),
    onSuccess: () => {
      toast.success('Stock updated');
      refresh();
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
      <div className="grid grid-cols-3 gap-2">
        {(['IN', 'OUT', 'ADJUST'] as const).map((t) => (
          <button
            type="button"
            key={t}
            onClick={() => setForm({ ...form, type: t })}
            className={`btn ${form.type === t ? 'btn-primary' : 'btn-secondary'}`}
          >
            {t}
          </button>
        ))}
      </div>
      <div>
        <label className="label">Product</label>
        <select
          className="input"
          required
          value={form.productId}
          onChange={(e) => setForm({ ...form, productId: e.target.value })}
        >
          <option value="">Select product</option>
          {products?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.sku})
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Warehouse</label>
        <select
          className="input"
          required
          value={form.warehouseId}
          onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}
        >
          <option value="">Select warehouse</option>
          {warehouses?.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">{form.type === 'ADJUST' ? 'Counted quantity' : 'Quantity'}</label>
        <input
          className="input"
          type="number"
          min={form.type === 'ADJUST' ? 0 : 1}
          required
          value={form.quantity}
          onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
        />
        {form.type === 'ADJUST' && (
          <p className="mt-1 text-xs text-gray-500">
            Enter the real quantity you counted, the difference will be saved.
          </p>
        )}
      </div>
      <div>
        <label className="label">Note</label>
        <input
          className="input"
          placeholder="e.g. new shipment from supplier"
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
        />
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

function TransferForm({ onDone }: { onDone: () => void }) {
  const refresh = useRefreshStock();
  const { data: products } = useProductOptions();
  const { data: warehouses } = useWarehouses();
  const [form, setForm] = useState({
    productId: '',
    fromWarehouseId: '',
    toWarehouseId: '',
    quantity: 1,
  });

  const save = useMutation({
    mutationFn: () =>
      api.post('/stock/transfer', {
        productId: Number(form.productId),
        fromWarehouseId: Number(form.fromWarehouseId),
        toWarehouseId: Number(form.toWarehouseId),
        quantity: form.quantity,
      }),
    onSuccess: () => {
      toast.success('Transfer done');
      refresh();
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
        <label className="label">Product</label>
        <select
          className="input"
          required
          value={form.productId}
          onChange={(e) => setForm({ ...form, productId: e.target.value })}
        >
          <option value="">Select product</option>
          {products?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.sku})
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">From</label>
          <select
            className="input"
            required
            value={form.fromWarehouseId}
            onChange={(e) => setForm({ ...form, fromWarehouseId: e.target.value })}
          >
            <option value="">Select</option>
            {warehouses?.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">To</label>
          <select
            className="input"
            required
            value={form.toWarehouseId}
            onChange={(e) => setForm({ ...form, toWarehouseId: e.target.value })}
          >
            <option value="">Select</option>
            {warehouses
              ?.filter((w) => String(w.id) !== form.fromWarehouseId)
              .map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Quantity</label>
        <input
          className="input"
          type="number"
          min={1}
          required
          value={form.quantity}
          onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
        />
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn btn-secondary" onClick={onDone}>
          Cancel
        </button>
        <button className="btn btn-primary" disabled={save.isPending}>
          Transfer
        </button>
      </div>
    </form>
  );
}
