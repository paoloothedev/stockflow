export type Role = 'ADMIN' | 'STAFF';
export type MovementType = 'IN' | 'OUT' | 'ADJUST';
export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
}

export interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; pages: number };
}

export interface Category {
  id: number;
  name: string;
  _count?: { products: number };
}

export interface Warehouse {
  id: number;
  name: string;
  location: string | null;
  totalItems?: number;
}

export interface StockLevel {
  productId: number;
  warehouseId: number;
  quantity: number;
  warehouse?: Warehouse;
  product?: Pick<Product, 'id' | 'sku' | 'name' | 'minStock'>;
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  description: string | null;
  price: string;
  minStock: number;
  categoryId: number | null;
  category?: Category | null;
  totalStock: number;
  stock?: StockLevel[];
  movements?: Movement[];
}

export interface Movement {
  id: number;
  type: MovementType;
  quantity: number;
  note: string | null;
  createdAt: string;
  orderId: number | null;
  product?: Pick<Product, 'id' | 'sku' | 'name'>;
  warehouse?: Pick<Warehouse, 'id' | 'name'>;
  user?: Pick<User, 'id' | 'name'> | null;
}

export interface OrderItem {
  id: number;
  productId: number;
  quantity: number;
  price: string;
  product: Pick<Product, 'id' | 'sku' | 'name'>;
}

export interface Order {
  id: number;
  customerName: string;
  customerPhone: string | null;
  address: string | null;
  status: OrderStatus;
  total: string;
  createdAt: string;
  warehouse: Pick<Warehouse, 'id' | 'name'>;
  createdBy?: Pick<User, 'id' | 'name'> | null;
  items?: OrderItem[];
  _count?: { items: number };
}

export interface DashboardStats {
  productsCount: number;
  warehousesCount: number;
  pendingOrders: number;
  lowStockCount: number;
  totalSales: number;
  lowStock: Product[];
  recentMovements: Movement[];
}
