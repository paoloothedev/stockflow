import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, errorMessage } from '../api/client';
import type { Product } from '../api/types';
import { useAuth } from '../auth';
import { MovementBadge, StockBadge } from '../components/Badges';
import Modal from '../components/Modal';
import ProductForm from '../components/ProductForm';
import { PageLoader } from '../components/Spinner';
import { date, money } from '../utils/format';

export default function ProductDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  const {
    data: product,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['products', id],
    queryFn: () => api.get<Product>(`/products/${id}`).then((r) => r.data),
  });

  const remove = useMutation({
    mutationFn: () => api.delete(`/products/${id}`),
    onSuccess: () => {
      toast.success('Product deleted');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      navigate('/products');
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  if (isError) return <p className="text-gray-500">Product not found.</p>;
  if (isLoading || !product) return <PageLoader />;

  return (
    <>
      <Link to="/products" className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500">
        <ArrowLeft size={16} /> Products
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
          <p className="text-sm text-gray-500">
            {product.sku} · {product.category?.name ?? 'No category'}
          </p>
          {product.description && <p className="mt-2 text-gray-600">{product.description}</p>}
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={() => setEditing(true)}>
            <Pencil size={16} /> Edit
          </button>
          {user?.role === 'ADMIN' && (
            <button
              className="btn btn-danger"
              disabled={remove.isPending}
              onClick={() => confirm('Delete this product?') && remove.mutate()}
            >
              <Trash2 size={16} /> Delete
            </button>
          )}
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Info label="Price" value={money(product.price)} />
        <Info
          label="Total in stock"
          value={<StockBadge qty={product.totalStock} min={product.minStock} />}
        />
        <Info label="Low stock alert at" value={product.minStock} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card">
          <h2 className="border-b border-gray-200 px-5 py-4 font-semibold">Per warehouse</h2>
          <ul className="divide-y divide-gray-100">
            {product.stock?.map((s) => (
              <li key={s.warehouseId} className="flex justify-between px-5 py-3 text-sm">
                <span>{s.warehouse?.name}</span>
                <span className="font-medium">{s.quantity}</span>
              </li>
            ))}
            {product.stock?.length === 0 && (
              <li className="px-5 py-3 text-sm text-gray-500">Not in any warehouse yet</li>
            )}
          </ul>
        </div>

        <div className="card overflow-hidden lg:col-span-2">
          <h2 className="border-b border-gray-200 px-5 py-4 font-semibold">Last movements</h2>
          <div className="overflow-x-auto">
            <table className="table">
              <tbody>
                {product.movements?.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <MovementBadge type={m.type} />
                    </td>
                    <td className={m.quantity >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                    </td>
                    <td>{m.warehouse?.name}</td>
                    <td className="text-gray-500">{m.note}</td>
                    <td className="whitespace-nowrap text-gray-400">{date(m.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal title="Edit product" open={editing} onClose={() => setEditing(false)}>
        <ProductForm product={product} onDone={() => setEditing(false)} />
      </Modal>
    </>
  );
}

function Info({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="card p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}
