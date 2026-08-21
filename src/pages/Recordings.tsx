// src/pages/Recordings.tsx
import React, { useState, useEffect } from 'react';
import { Layout } from '../components/layout/Layout';
import { getRecordings, archiveRecording } from '../services/recordingService';
import { formatDateTimeFull, formatDuration } from '../utils/dateTime';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { RecordingWithDetails } from '../types';
import { useNavigate } from 'react-router-dom';

export function Recordings() {
    const [recordings, setRecordings] = useState<RecordingWithDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        status: '',
        deviceId: '',
        dateFrom: '',
        dateTo: '',
        search: '',
    });
    const [showArchiveModal, setShowArchiveModal] = useState<string | null>(null);
    const navigate = useNavigate();

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await getRecordings(filters);
            setRecordings(data);
        } catch (err) {
            console.error('Error loading recordings:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [filters]);

    const handleArchive = async (id: string) => {
        try {
            await archiveRecording(id);
            setShowArchiveModal(null);
            await loadData();
        } catch (err) {
            console.error('Error archiving recording:', err);
        }
    };

    const handleViewDetails = (id: string) => {
        navigate(`/recordings/${id}`);
    };

    const handleAddAssessment = (id: string) => {
        navigate(`/recordings/${id}/assessment`);
    };

    const statusOptions = ['', 'Recording', 'Completed', 'Pending Assessment Details'];

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
                    <h1 className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>Recordings</h1>
                    <p className="text-text-muted text-sm">Manage BANHA recording sessions</p>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-lg border border-border p-4 shadow-sm">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <input
                            type="text"
                            placeholder="Search..."
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            className="px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                            className="px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                        >
                            {statusOptions.map(s => (
                                <option key={s} value={s}>{s || 'All Status'}</option>
                            ))}
                        </select>
                        <input
                            type="date"
                            value={filters.dateFrom}
                            onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                            className="px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                            placeholder="Date from"
                        />
                        <input
                            type="date"
                            value={filters.dateTo}
                            onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                            className="px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                            placeholder="Date to"
                        />
                        <button
                            onClick={() => setFilters({ status: '', deviceId: '', dateFrom: '', dateTo: '', search: '' })}
                            className="px-4 py-2 text-sm text-text-muted hover:text-text-primary transition border border-border rounded-md bg-bg"
                        >
                            Clear
                        </button>
                    </div>
                </div>

                {/* Table */}
                {recordings.length === 0 ? (
                    <EmptyState title="No recordings found" description="Try adjusting your filters." />
                ) : (
                    <div className="bg-white rounded-lg border border-border overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-bg text-text-muted text-xs uppercase tracking-wider">
                                    <tr>
                                        <th className="px-4 py-3 text-left">Device</th>
                                        <th className="px-4 py-3 text-left">Date</th>
                                        <th className="px-4 py-3 text-left">Start</th>
                                        <th className="px-4 py-3 text-left">Duration</th>
                                        <th className="px-4 py-3 text-left">Status</th>
                                        <th className="px-4 py-3 text-left">Assessment</th>
                                        <th className="px-4 py-3 text-left">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {recordings.map((rec) => (
                                        <tr key={rec.id} className="hover:bg-bg/50 transition">
                                            <td className="px-4 py-3 font-medium">{rec.device?.device_name || 'Unknown'}</td>
                                            <td className="px-4 py-3 text-text-secondary">{formatDateTimeFull(rec.started_at).split(',')[0]}</td>
                                            <td className="px-4 py-3 text-text-secondary">{formatDateTimeFull(rec.started_at).split(',')[1]?.trim() || '--'}</td>
                                            <td className="px-4 py-3 font-mono">{formatDuration(rec.duration_seconds)}</td>
                                            <td className="px-4 py-3">
                                                <StatusBadge
                                                    status={rec.status}
                                                    variant={rec.status === 'Recording' ? 'recording' : 'completed'}
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                {rec.assessment ? (
                                                    <StatusBadge status="Completed" variant="completed" />
                                                ) : rec.status === 'Recording' ? (
                                                    <span className="text-text-muted text-xs">—</span>
                                                ) : (
                                                    <StatusBadge status="Pending" variant="pending" />
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <button
                                                        onClick={() => handleViewDetails(rec.id)}
                                                        className="text-xs px-3 py-1 rounded-md bg-bg hover:bg-border transition text-text-secondary"
                                                    >
                                                        View
                                                    </button>
                                                    {rec.status !== 'Recording' && !rec.assessment && (
                                                        <button
                                                            onClick={() => handleAddAssessment(rec.id)}
                                                            className="text-xs px-3 py-1 rounded-md text-white transition hover:opacity-90"
                                                            style={{ backgroundColor: 'var(--secondary)' }}
                                                        >
                                                            Add Assessment
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => setShowArchiveModal(rec.id)}
                                                        className="text-xs px-3 py-1 rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100 transition border border-amber-200"
                                                    >
                                                        Archive
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Archive Modal */}
            {showArchiveModal && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl border border-border">
                        <h3 className="text-lg font-semibold mb-2">Archive Recording</h3>
                        <p className="text-text-secondary text-sm mb-4">
                            Archived data will not be included in reports, statistical analysis, or other active research functions. You can restore it later from the Archived Records page.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowArchiveModal(null)}
                                className="px-4 py-2 text-sm border border-border rounded-md hover:bg-bg transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleArchive(showArchiveModal)}
                                className="px-4 py-2 text-sm text-white rounded-md hover:opacity-90 transition"
                                style={{ backgroundColor: 'var(--accent)' }}
                            >
                                Archive
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}