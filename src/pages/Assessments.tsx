// src/pages/Assessments.tsx
import React, { useState, useEffect } from 'react';
import { Layout } from '../components/layout/Layout';
import { getAssessments, archiveAssessment } from '../services/assessmentService';
import { formatDateTimeFull } from '../utils/dateTime';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { Assessment } from '../types';

export function Assessments() {
    const [assessments, setAssessments] = useState<Assessment[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        subject: '',
        section: '',
        group_type: '',
        assessment_type: '',
        dateFrom: '',
        dateTo: '',
        search: '',
    });
    const [showArchiveModal, setShowArchiveModal] = useState<string | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await getAssessments(filters);
            setAssessments(data);
        } catch (err) {
            console.error('Error loading assessments:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [filters]);

    const handleArchive = async (id: string) => {
        try {
            await archiveAssessment(id);
            setShowArchiveModal(null);
            await loadData();
        } catch (err) {
            console.error('Error archiving assessment:', err);
        }
    };

    const groupOptions = ['', 'Experimental', 'Comparison'];
    const typeOptions = ['', 'Quiz', 'Examination', 'Activity', 'Exercise'];

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
                    <h1 className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>Assessments</h1>
                    <p className="text-text-muted text-sm">Manage research assessment records</p>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-lg border border-border p-4 shadow-sm">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <input
                            type="text"
                            placeholder="Search..."
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            className="px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                        <input
                            type="text"
                            placeholder="Subject"
                            value={filters.subject}
                            onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
                            className="px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                        <input
                            type="text"
                            placeholder="Section"
                            value={filters.section}
                            onChange={(e) => setFilters({ ...filters, section: e.target.value })}
                            className="px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                        <select
                            value={filters.group_type}
                            onChange={(e) => setFilters({ ...filters, group_type: e.target.value })}
                            className="px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                        >
                            {groupOptions.map(g => <option key={g} value={g}>{g || 'All Groups'}</option>)}
                        </select>
                        <select
                            value={filters.assessment_type}
                            onChange={(e) => setFilters({ ...filters, assessment_type: e.target.value })}
                            className="px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                        >
                            {typeOptions.map(t => <option key={t} value={t}>{t || 'All Types'}</option>)}
                        </select>
                        <input
                            type="date"
                            value={filters.dateFrom}
                            onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                            className="px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                        <input
                            type="date"
                            value={filters.dateTo}
                            onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                            className="px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                        <button
                            onClick={() => setFilters({ subject: '', section: '', group_type: '', assessment_type: '', dateFrom: '', dateTo: '', search: '' })}
                            className="px-4 py-2 text-sm text-text-muted hover:text-text-primary transition border border-border rounded-md bg-bg"
                        >
                            Clear
                        </button>
                    </div>
                </div>

                {/* Table */}
                {assessments.length === 0 ? (
                    <EmptyState title="No assessments found" description="Try adjusting your filters." />
                ) : (
                    <div className="bg-white rounded-lg border border-border overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-bg text-text-muted text-xs uppercase tracking-wider">
                                    <tr>
                                        <th className="px-4 py-3 text-left">Subject</th>
                                        <th className="px-4 py-3 text-left">Section</th>
                                        <th className="px-4 py-3 text-left">Group</th>
                                        <th className="px-4 py-3 text-left">Assessment</th>
                                        <th className="px-4 py-3 text-left">Type</th>
                                        <th className="px-4 py-3 text-left">Date</th>
                                        <th className="px-4 py-3 text-left">Score %</th>
                                        <th className="px-4 py-3 text-left">Avg CO₂</th>
                                        <th className="px-4 py-3 text-left">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {assessments.map((a) => {
                                        const rec = a.recording as any;
                                        const readings = rec?.readings || [];
                                        const avgCO2 = readings.length > 0
                                            ? readings.reduce((s: number, r: any) => s + r.average_co2, 0) / readings.length
                                            : 0;
                                        const avgTemp = readings.length > 0
                                            ? readings.reduce((s: number, r: any) => s + r.average_temperature, 0) / readings.length
                                            : 0;
                                        const avgNoise = readings.length > 0
                                            ? readings.reduce((s: number, r: any) => s + r.average_noise, 0) / readings.length
                                            : 0;

                                        return (
                                            <tr key={a.id} className="hover:bg-bg/50 transition">
                                                <td className="px-4 py-3 font-medium">{a.subject}</td>
                                                <td className="px-4 py-3">{a.section}</td>
                                                <td className="px-4 py-3">
                                                    <StatusBadge
                                                        status={a.group_type}
                                                        variant={a.group_type === 'Experimental' ? 'recording' : 'completed'}
                                                    />
                                                </td>
                                                <td className="px-4 py-3">{a.assessment_name}</td>
                                                <td className="px-4 py-3">{a.assessment_type}</td>
                                                <td className="px-4 py-3 text-text-secondary">{formatDateTimeFull(a.assessment_date)}</td>
                                                <td className="px-4 py-3 font-bold" style={{ color: 'var(--primary)' }}>
                                                    {a.score_percentage}%
                                                </td>
                                                <td className="px-4 py-3">{avgCO2.toFixed(1)} ppm</td>
                                                <td className="px-4 py-3">
                                                    <button
                                                        onClick={() => setShowArchiveModal(a.id)}
                                                        className="text-xs px-3 py-1 rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100 transition border border-amber-200"
                                                    >
                                                        Archive
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
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
                        <h3 className="text-lg font-semibold mb-2">Archive Assessment</h3>
                        <p className="text-text-secondary text-sm mb-4">
                            Archived data will not be included in reports, statistical analysis, or other active research functions. You can restore it later.
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