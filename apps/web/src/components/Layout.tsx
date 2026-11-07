import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  ArrowLeftRight,
  Boxes,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  ShoppingCart,
  Users,
  Warehouse,
  X,
} from 'lucide-react';
import { useAuth } from '../auth';

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/warehouses', label: 'Warehouses', icon: Warehouse },
  { to: '/movements', label: 'Stock Movements', icon: ArrowLeftRight },
  { to: '/orders', label: 'Orders', icon: ShoppingCart },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  const allLinks =
    user?.role === 'ADMIN' ? [...links, { to: '/users', label: 'Users', icon: Users }] : links;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* mobile top bar */}
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 lg:hidden">
        <Logo />
        <button onClick={() => setOpen(true)} aria-label="Open menu">
          <Menu size={22} />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setOpen(false)} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-gray-200 bg-white transition-transform lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <Logo />
          <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {allLinks.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
                  isActive ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-900">{user?.name}</p>
          <p className="mb-3 text-xs text-gray-500">
            {user?.email} · {user?.role.toLowerCase()}
          </p>
          <button onClick={logout} className="btn btn-secondary w-full">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      <main className="lg:pl-64">
        <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-2 text-lg font-bold text-gray-900">
      <span className="rounded-lg bg-indigo-600 p-1.5 text-white">
        <Boxes size={18} />
      </span>
      StockFlow
    </div>
  );
}
