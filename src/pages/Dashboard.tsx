import React, { useState, useEffect } from 'react';
import { Layout } from '../components/layout/Layout';
import { getActiveRecording, getRecordings } from '../services/recordingService';
import { getAssessments } from '../services/assessmentService';
import { formatDateTimeFull, formatDuration } from '../utils/dateTime';
import { RecordingWithDetails, Assessment } from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { StatusBadge } from '../components/common/StatusBadge';

export function Dashboard() {
    const [activeRecording, setActiveRecording] = useState<RecordingWithDetails | null>(null);
    const [recentRecordings, setRecentRecordings] = useState<RecordingWithDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalRecordings: 0,
        totalAssessments: 0,
        pendingAssessments: 0,
    });

    const loadData = async () => {
        setLoading(true);
        try {
            const [active, recordings, assessmentsData] = await Promise.all([
                getActiveRecording(),
                getRecordings(),
                getAssessments(),
            ]);

            setActiveRecording(active);
            setRecentRecordings(recordings.slice(0, 5));

            const pending = recordings.filter(r => r.status === 'Pending Assessment Details');

            setStats({
                totalRecordings: recordings.length,
                totalAssessments: assessmentsData.length,
                pendingAssessments: pending.length,
            });
        } catch (err) {
            console.error('Error loading dashboard:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const getLatestReading = () => {
        if (!activeRecording || activeRecording.readings.length === 0) return null;
        const sorted = [...activeRecording.readings].sort((a, b) => b.packet_number - a.packet_number);
        return sorted[0];
    };

    const latest = getLatestReading();

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
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-[#002858] tracking-tight">Dashboard</h1>
                        <p className="text-gray-500 text-sm">Overview of BANHA research data</p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        Live
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-all duration-200">
                        <div className="flex items-center justify-between">
                            <p className="text-gray-500 text-xs uppercase tracking-wider font-medium">Total Recordings</p>
                            <span className="text-2xl">🎙️</span>
                        </div>
                        <p className="text-3xl font-bold mt-2 text-[#002858]">{stats.totalRecordings}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-all duration-200">
                        <div className="flex items-center justify-between">
                            <p className="text-gray-500 text-xs uppercase tracking-wider font-medium">Assessments</p>
                            <span className="text-2xl">📝</span>
                        </div>
                        <p className="text-3xl font-bold mt-2 text-[#002858]">{stats.totalAssessments}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-all duration-200">
                        <div className="flex items-center justify-between">
                            <p className="text-gray-500 text-xs uppercase tracking-wider font-medium">Pending</p>
                            <span className="text-2xl">⏳</span>
                        </div>
                        <p className="text-3xl font-bold mt-2" style={{ color: stats.pendingAssessments > 0 ? '#DEAE20' : '#8a8aaa' }}>
                            {stats.pendingAssessments}
                        </p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-all duration-200">
                        <div className="flex items-center justify-between">
                            <p className="text-gray-500 text-xs uppercase tracking-wider font-medium">Active Recording</p>
                            <span className="text-2xl">📡</span>
                        </div>
                        <p className="text-3xl font-bold mt-2" style={{ color: activeRecording ? '#10b981' : '#8a8aaa' }}>
                            {activeRecording ? 'Yes' : 'No'}
                        </p>
                    </div>
                </div>

                {/* Active Recording */}
                {activeRecording ? (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="bg-gradient-to-r from-[#002858] to-[#1a3d6b] px-6 py-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Current Recording</h2>
                                <StatusBadge status="RECORDING" variant="recording" />
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                <div>
                                    <p className="text-gray-500 text-xs uppercase tracking-wider font-medium">Device</p>
                                    <p className="font-semibold text-gray-900 mt-1">{activeRecording.device?.device_name || 'Unknown'}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500 text-xs uppercase tracking-wider font-medium">Started</p>
                                    <p className="text-sm text-gray-700 mt-1">{formatDateTimeFull(activeRecording.started_at)}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500 text-xs uppercase tracking-wider font-medium">Duration</p>
                                    <p className="text-sm font-mono text-gray-700 mt-1">
                                        {formatDuration(activeRecording.duration_seconds)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-500 text-xs uppercase tracking-wider font-medium">Packets</p>
                                    <p className="font-semibold text-gray-900 mt-1">{activeRecording.readings.length}</p>
                                </div>
                            </div>

                            {latest && (
                                <div className="mt-6 pt-6 border-t border-gray-200 grid grid-cols-3 gap-6">
                                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                                        <p className="text-blue-600 text-xs uppercase tracking-wider font-medium">CO₂</p>
                                        <p className="text-2xl font-bold text-blue-900">{latest.average_co2.toFixed(1)} <span className="text-sm font-normal text-blue-600">ppm</span></p>
                                        <StatusBadge
                                            status={latest.average_co2 > 1000 ? 'Poor' : latest.average_co2 > 700 ? 'Moderate' : 'Normal'}
                                            variant={latest.average_co2 > 1000 ? 'poor' : latest.average_co2 > 700 ? 'moderate' : 'normal'}
                                        />
                                    </div>
                                    <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                                        <p className="text-green-600 text-xs uppercase tracking-wider font-medium">Temperature</p>
                                        <p className="text-2xl font-bold text-green-900">{latest.average_temperature.toFixed(1)} <span className="text-sm font-normal text-green-600">°C</span></p>
                                        <StatusBadge
                                            status={latest.average_temperature > 28 ? 'Moderate' : 'Normal'}
                                            variant={latest.average_temperature > 28 ? 'moderate' : 'normal'}
                                        />
                                    </div>
                                    <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                                        <p className="text-purple-600 text-xs uppercase tracking-wider font-medium">Noise</p>
                                        <p className="text-2xl font-bold text-purple-900">{latest.average_noise.toFixed(1)} <span className="text-sm font-normal text-purple-600">dB</span></p>
                                        <StatusBadge
                                            status={latest.average_noise > 60 ? 'Poor' : latest.average_noise > 45 ? 'Moderate' : 'Normal'}
                                            variant={latest.average_noise > 60 ? 'poor' : latest.average_noise > 45 ? 'moderate' : 'normal'}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
                        <div className="text-4xl mb-3">📡</div>
                        <h3 className="text-lg font-semibold text-gray-600">No Active Recording</h3>
                        <p className="text-gray-400 text-sm mt-1">Start a BANHA recording to begin monitoring</p>
                    </div>
                )}

                {/* Recent Recordings */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Recent Recordings</h2>
                        <button className="text-sm text-[#678EC4] hover:text-[#002858] transition font-medium">
                            View all →
                        </button>
                    </div>
                    {recentRecordings.length === 0 ? (
                        <EmptyState title="No recordings yet" description="Recordings will appear here once available." />
                    ) : (
                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Device</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Started</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Duration</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {recentRecordings.map((rec) => (
                                            <tr key={rec.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-3.5 font-medium text-gray-900">{rec.device?.device_name || 'Unknown'}</td>
                                                <td className="px-6 py-3.5 text-gray-600">{formatDateTimeFull(rec.started_at)}</td>
                                                <td className="px-6 py-3.5 font-mono text-gray-600">{formatDuration(rec.duration_seconds)}</td>
                                                <td className="px-6 py-3.5">
                                                    <StatusBadge
                                                        status={rec.status}
                                                        variant={rec.status === 'Recording' ? 'recording' : 'completed'}
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
}