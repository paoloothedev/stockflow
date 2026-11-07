import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, errorMessage } from '../api/client';
import type { Product } from '../api/types';
import { useCategories } from '../hooks/queries';

interface Props {
  product?: Product;
  onDone: () => void;
}

export default function ProductForm({ product, onDone }: Props) {
  const queryClient = useQueryClient();
  const { data: categories } = useCategories();
  const [form, setForm] = useState({
    sku: product?.sku ?? '',
    name: product?.name ?? '',
    description: product?.description ?? '',
    price: product?.price ?? '',
    minStock: product?.minStock ?? 5,
    categoryId: product?.categoryId ?? '',
  });

  const save = useMutation({
    mutationFn: () => {
      const body = {
        ...form,
        price: Number(form.price),
        minStock: Number(form.minStock),
        categoryId: form.categoryId ? Number(form.categoryId) : undefined,
        description: form.description || undefined,
      };
      return product ? api.patch(`/products/${product.id}`, body) : api.post('/products', body);
    },
    onSuccess: () => {
      toast.success(product ? 'Product updated' : 'Product added');
      queryClient.invalidateQueries({ queryKey: ['products'] });
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
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">SKU</label>
          <input
            className="input"
            required
            value={form.sku}
            onChange={(e) => setForm({ ...form, sku: e.target.value.toUpperCase() })}
          />
        </div>
        <div>
          <label className="label">Category</label>
          <select
            className="input"
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
          >
            <option value="">No category</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Name</label>
        <input
          className="input"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </div>
      <div>
        <label className="label">Description</label>
        <textarea
          className="input"
          rows={2}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Price (EGP)</label>
          <input
            className="input"
            type="number"
            min="0"
            step="0.01"
            required
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Low stock alert at</label>
          <input
            className="input"
            type="number"
            min="0"
            value={form.minStock}
            onChange={(e) => setForm({ ...form, minStock: Number(e.target.value) })}
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onDone} className="btn btn-secondary">
          Cancel
        </button>
        <button className="btn btn-primary" disabled={save.isPending}>
          {save.isPending ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  );
}
