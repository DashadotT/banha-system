// src/pages/Users.tsx
import React, { useState, useEffect } from 'react';
import { Layout } from '../components/layout/Layout';
import { getUsers, updateUserRole } from '../services/authService';
import { Profile } from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { StatusBadge } from '../components/common/StatusBadge';
import { useAuth } from '../hooks/useAuth';

export function Users() {
    const [users, setUsers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingRole, setEditingRole] = useState<string | null>(null);
    const { profile: currentProfile } = useAuth();

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await getUsers();
            setUsers(data);
        } catch (err) {
            console.error('Error loading users:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleRoleChange = async (userId: string, role: 'Administrator' | 'Researcher') => {
        try {
            await updateUserRole(userId, role);
            setEditingRole(null);
            await loadData();
        } catch (err) {
            console.error('Error updating role:', err);
        }
    };

    if (loading) {
        return (
            <Layout>
                <div className="flex justify-center py-12">
                    <LoadingSpinner size="lg" />
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>Users</h1>
                    <p className="text-text-muted text-sm">Manage system users and roles</p>
                </div>

                {users.length === 0 ? (
                    <EmptyState title="No users found" />
                ) : (
                    <div className="bg-white rounded-lg border border-border overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-bg text-text-muted text-xs uppercase tracking-wider">
                                    <tr>
                                        <th className="px-4 py-3 text-left">Name</th>
                                        <th className="px-4 py-3 text-left">Email</th>
                                        <th className="px-4 py-3 text-left">Role</th>
                                        <th className="px-4 py-3 text-left">Status</th>
                                        <th className="px-4 py-3 text-left">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {users.map((user) => (
                                        <tr key={user.id} className="hover:bg-bg/50 transition">
                                            <td className="px-4 py-3 font-medium">
                                                {user.full_name}
                                                {currentProfile?.id === user.id && (
                                                    <span className="ml-2 text-xs text-text-muted">(you)</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-text-secondary">{user.id}</td>
                                            <td className="px-4 py-3">
                                                {editingRole === user.id ? (
                                                    <select
                                                        value={user.role}
                                                        onChange={(e) => handleRoleChange(user.id, e.target.value as 'Administrator' | 'Researcher')}
                                                        className="px-2 py-1 border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                                                        autoFocus
                                                    >
                                                        <option value="Administrator">Administrator</option>
                                                        <option value="Researcher">Researcher</option>
                                                    </select>
                                                ) : (
                                                    <StatusBadge
                                                        status={user.role}
                                                        variant={user.role === 'Administrator' ? 'recording' : 'completed'}
                                                    />
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <StatusBadge status="Active" variant="normal" />
                                            </td>
                                            <td className="px-4 py-3">
                                                {editingRole === user.id ? (
                                                    <button
                                                        onClick={() => setEditingRole(null)}
                                                        className="text-xs px-3 py-1 rounded-md bg-bg hover:bg-border transition text-text-secondary"
                                                    >
                                                        Cancel
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => setEditingRole(user.id)}
                                                        className="text-xs px-3 py-1 rounded-md bg-bg hover:bg-border transition text-text-secondary"
                                                        disabled={currentProfile?.id === user.id}
                                                    >
                                                        {currentProfile?.id === user.id ? '—' : 'Change Role'}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}