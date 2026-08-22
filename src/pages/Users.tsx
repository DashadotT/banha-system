import { Users as UsersIcon } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { Badge } from '../components/common/Badge';
import { Td, Th, TableShell } from '../components/common/Table';
import { EmptyState, ErrorState, LoadingState } from '../components/common/States';
import { useAsync } from '../hooks/useAsync';
import { fetchProfiles } from '../services/userService';
import { useAuth } from '../context/AuthContext';

export default function Users() {
  const { data, loading, error, refetch } = useAsync(fetchProfiles);
  const { profile: currentProfile } = useAuth();

  return (
    <AppLayout title="Users">
      {loading && <LoadingState label="Loading users…" />}
      {error && <ErrorState message={error} onRetry={refetch} />}

      {!loading && !error && (data?.length ?? 0) === 0 && (
        <EmptyState
          icon={<UsersIcon size={28} />}
          title="No users found"
          description="Researcher and administrator accounts will appear here once created in Supabase Authentication."
        />
      )}

      {!loading && !error && data && data.length > 0 && (
        <TableShell>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Email</Th>
              <Th>Role</Th>
              <Th>Account Status</Th>
            </tr>
          </thead>
          <tbody>
            {data.map((u) => (
              <tr key={u.id} className="hover:bg-surface/60">
                <Td className="font-medium text-primary">
                  {u.full_name}
                  {u.id === currentProfile?.id && (
                    <span className="ml-2 text-xs font-normal text-slate-400">(you)</span>
                  )}
                </Td>
                <Td>{u.email}</Td>
                <Td>
                  <Badge tone={u.role === 'administrator' ? 'accent' : 'neutral'}>
                    {u.role === 'administrator' ? 'Administrator' : 'Researcher'}
                  </Badge>
                </Td>
                <Td>
                  <Badge tone={u.status === 'active' ? 'normal' : 'neutral'}>
                    {u.status === 'active' ? 'Active' : 'Inactive'}
                  </Badge>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}
    </AppLayout>
  );
}
