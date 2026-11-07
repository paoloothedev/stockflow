import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { api } from '../api/client';
import type { Paginated, Product } from '../api/types';
import { StockBadge } from '../components/Badges';
import Modal from '../components/Modal';
import PageHeader from '../components/PageHeader';
import Pagination from '../components/Pagination';
import ProductForm from '../components/ProductForm';
import { PageLoader } from '../components/Spinner';
import { useCategories } from '../hooks/queries';
import { useDebounce } from '../hooks/useDebounce';
import { money } from '../utils/format';

export default function Products() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const debouncedSearch = useDebounce(search);
  const lowStock = params.get('lowStock') === 'true';

  const { data: categories } = useCategories();
  const { data, isLoading } = useQuery({
    queryKey: ['products', { search: debouncedSearch, categoryId, lowStock, page }],
    queryFn: () =>
      api
        .get<Paginated<Product>>('/products', {
          params: {
            page,
            search: debouncedSearch || undefined,
            categoryId: categoryId || undefined,
            lowStock: lowStock || undefined,
          },
        })
        .then((r) => r.data),
    placeholderData: keepPreviousData,
  });

  const toggleLowStock = () => {
    setPage(1);
    setParams(lowStock ? {} : { lowStock: 'true' });
  };

  return (
    <>
      <PageHeader title="Products">
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={16} /> Add product
        </button>
      </PageHeader>

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search by name or SKU"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <select
          className="input w-auto"
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All categories</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={lowStock} onChange={toggleLowStock} />
          Low stock only
        </label>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <PageLoader />
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th className="hidden sm:table-cell">Category</th>
                  <th>Price</th>
                  <th>In stock</th>
                </tr>
              </thead>
              <tbody>
                {data?.data.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td>
                      <Link to={`/products/${p.id}`} className="font-medium hover:text-indigo-600">
                        {p.name}
                      </Link>
                      <p className="text-xs text-gray-400">{p.sku}</p>
                    </td>
                    <td className="hidden text-gray-600 sm:table-cell">
                      {p.category?.name ?? '-'}
                    </td>
                    <td>{money(p.price)}</td>
                    <td>
                      <StockBadge qty={p.totalStock} min={p.minStock} />
                    </td>
                  </tr>
                ))}
                {data?.data.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-gray-500">
                      No products found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pagination page={page} pages={data.meta.pages} onChange={setPage} />}
      </div>

      <Modal title="Add product" open={showForm} onClose={() => setShowForm(false)}>
        <ProductForm onDone={() => setShowForm(false)} />
      </Modal>
    </>
  );
}
