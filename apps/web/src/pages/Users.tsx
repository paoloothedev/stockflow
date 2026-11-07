import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, errorMessage } from '../api/client';
import type { Role, User } from '../api/types';
import { useAuth } from '../auth';
import PageHeader from '../components/PageHeader';
import { PageLoader } from '../components/Spinner';
import { date } from '../utils/format';

export default function Users() {
  const { user: me } = useAuth();
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get<User[]>('/users').then((r) => r.data),
  });

  const updateRole = useMutation({
    mutationFn: ({ id, role }: { id: number; role: Role }) =>
      api.patch(`/users/${id}/role`, { role }),
    onSuccess: () => {
      toast.success('Role updated');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  if (isLoading) return <PageLoader />;

  return (
    <>
      <PageHeader title="Users" />
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Joined</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {users?.map((u) => (
                <tr key={u.id}>
                  <td className="font-medium">{u.name}</td>
                  <td className="text-gray-600">{u.email}</td>
                  <td className="text-gray-400">{date(u.createdAt)}</td>
                  <td>
                    <select
                      className="input w-auto py-1"
                      value={u.role}
                      disabled={u.id === me?.id}
                      onChange={(e) =>
                        updateRole.mutate({ id: u.id, role: e.target.value as Role })
                      }
                    >
                      <option value="ADMIN">Admin</option>
                      <option value="STAFF">Staff</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
