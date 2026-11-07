import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { errorMessage } from '../api/client';
import { useAuth } from '../auth';
import AuthCard from '../components/AuthCard';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      toast.error(errorMessage(err));
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setEmail('demo@stockflow.dev');
    setPassword('demo1234');
  };

  return (
    <AuthCard title="Welcome back" subtitle="Login to manage your stock">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">Email</label>
          <input
            className="input"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Password</label>
          <input
            className="input"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button className="btn btn-primary w-full" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <button onClick={fillDemo} className="mt-3 w-full text-sm text-indigo-600 hover:underline">
        Use demo account
      </button>

      <p className="mt-6 text-center text-sm text-gray-500">
        No account?{' '}
        <Link to="/register" className="font-medium text-indigo-600 hover:underline">
          Register
        </Link>
      </p>
    </AuthCard>
  );
}
