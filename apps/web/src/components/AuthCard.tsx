import type { ReactNode } from 'react';
import { Boxes } from 'lucide-react';

interface Props {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export default function AuthCard({ title, subtitle, children }: Props) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2 text-xl font-bold">
          <span className="rounded-lg bg-indigo-600 p-1.5 text-white">
            <Boxes size={20} />
          </span>
          StockFlow
        </div>
        <div className="card p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
          <p className="mb-6 text-sm text-gray-500">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
