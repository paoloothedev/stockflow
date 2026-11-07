import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import type { Category, Paginated, Product, Warehouse } from '../api/types';

export function useWarehouses() {
  return useQuery({
    queryKey: ['warehouses'],
    queryFn: () => api.get<Warehouse[]>('/warehouses').then((r) => r.data),
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<Category[]>('/categories').then((r) => r.data),
  });
}

// small list used in dropdowns (movements, new order)
export function useProductOptions() {
  return useQuery({
    queryKey: ['products', 'options'],
    queryFn: () =>
      api.get<Paginated<Product>>('/products', { params: { limit: 100 } }).then((r) => r.data.data),
  });
}
