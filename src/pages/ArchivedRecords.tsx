// src/pages/ArchivedRecords.tsx
import React, { useState, useEffect } from 'react';
import { Layout } from '../components/layout/Layout';
import { getArchivedRecordings, restoreRecording } from '../services/recordingService';
import { getArchivedAssessments, restoreAssessment } from '../services/assessmentService';
import { formatDateTimeFull } from '../utils/dateTime';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { ArchiveItem } from '../types';

export function ArchivedRecords() {
    const [items, setItems] = useState<ArchiveItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showRestoreModal, setShowRestoreModal] = useState<string | null>(null);
    const [restoreType, setRestoreType] = useState<'recording' | 'assessment'>('recording');

    const loadData = async () => {
        setLoading(true);
        try {
            const [recordings, assessments] = await Promise.all([
                getArchivedRecordings(),
                getArchivedAssessments(),
            ]);

            const mapped: ArchiveItem[] = [
                ...recordings.map(r => ({
                    id: r.id,
                    type: 'recording' as const,
                    name: `${r.device?.device_name || 'Unknown'} - ${formatDateTimeFull(r.started_at)}`,
                    archived_at: r.archived_at || r.created_at,
                    original_date: r.started_at,
                    status: r.status,
                    data: r,
                })),
                ...assessments.map(a => ({
                    id: a.id,
                    type: 'assessment' as const,
                    name: `${a.subject} - ${a.assessment_name}`,
                    archived_at: a.archived_at || a.created_at,
                    original_date: a.assessment_date,
                    status: `${a.group_type} | ${a.assessment_type}`,
                    data: a,
                })),
            ];

            setItems(mapped.sort((a, b) =>
                new Date(b.archived_at).getTime() - new Date(a.archived_at).getTime()
            ));
        } catch (err) {
            console.error('Error loading archived records:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleRestore = async (id: string, type: 'recording' | 'assessment') => {
        try {
            if (type === 'recording') {
                await restoreRecording(id);
            } else {
                await restoreAssessment(id);
            }
            setShowRestoreModal(null);
            await loadData();
        } catch (err) {
            console.error('Error restoring record:', err);
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
                    <h1 className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>Archived Records</h1>
                    <p className="text-text-muted text-sm">View and restore archived recordings and assessments</p>
                </div>

                {items.length === 0 ? (
                    <EmptyState
                        title="No archived records"
                        description="Archived records will appear here when you archive recordings or assessments."
                        icon="📦"
                    />
                ) : (
                    <div className="bg-white rounded-lg border border-border overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-bg text-text-muted text-xs uppercase tracking-wider">
                                    <tr>
                                        <th className="px-4 py-3 text-left">Type</th>
                                        <th className="px-4 py-3 text-left">Name / Identifier</th>
                                        <th className="px-4 py-3 text-left">Original Date</th>
                                        <th className="px-4 py-3 text-left">Archived Date</th>
                                        <th className="px-4 py-3 text-left">Status</th>
                                        <th className="px-4 py-3 text-left">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {items.map((item) => (
                                        <tr key={`${item.type}-${item.id}`} className="hover:bg-bg/50 transition">
                                            <td className="px-4 py-3">
                                                <StatusBadge
                                                    status={item.type === 'recording' ? 'Recording' : 'Assessment'}
                                                    variant={item.type === 'recording' ? 'recording' : 'completed'}
                                                />
                                            </td>
                                            <td className="px-4 py-3 font-medium">{item.name}</td>
                                            <td className="px-4 py-3 text-text-secondary">{formatDateTimeFull(item.original_date)}</td>
                                            <td className="px-4 py-3 text-text-secondary">{formatDateTimeFull(item.archived_at)}</td>
                                            <td className="px-4 py-3">
                                                <StatusBadge status={item.status} variant="archived" />
                                            </td>
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={() => {
                                                        setShowRestoreModal(item.id);
                                                        setRestoreType(item.type);
                                                    }}
                                                    className="text-xs px-3 py-1 rounded-md bg-green-50 text-green-700 hover:bg-green-100 transition border border-green-200"
                                                >
                                                    Restore
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Restore Modal */}
            {showRestoreModal && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl border border-border">
                        <h3 className="text-lg font-semibold mb-2">Restore Record</h3>
                        <p className="text-text-secondary text-sm mb-4">
                            This record will be restored and will become available again for normal functions, reports, and statistical analysis.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowRestoreModal(null)}
                                className="px-4 py-2 text-sm border border-border rounded-md hover:bg-bg transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleRestore(showRestoreModal, restoreType)}
                                className="px-4 py-2 text-sm text-white rounded-md hover:opacity-90 transition"
                                style={{ backgroundColor: 'var(--secondary)' }}
                            >
                                Restore
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}