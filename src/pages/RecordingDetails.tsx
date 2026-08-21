import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { getRecordingById } from '../services/recordingService';
import { createAssessment, getAssessmentsByRecordingId } from '../services/assessmentService';
import { formatDateTimeFull, formatDuration } from '../utils/dateTime';
import { calculatePercentage } from '../utils/calculations';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { RecordingWithDetails } from '../types';

export function RecordingDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [recording, setRecording] = useState<RecordingWithDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        subject: '',
        section: '',
        group_type: 'Experimental' as 'Experimental' | 'Comparison',
        assessment_type: 'Quiz' as 'Quiz' | 'Examination' | 'Activity' | 'Exercise',
        assessment_name: '',
        assessment_date: new Date().toISOString().split('T')[0],
        class_average_score: 0,
        total_possible_score: 0,
    });
    const [scorePercentage, setScorePercentage] = useState<number | null>(null);
    const [savedAssessment, setSavedAssessment] = useState<any>(null);

    const loadData = async () => {
        if (!id) return;
        setLoading(true);
        try {
            const data = await getRecordingById(id);
            setRecording(data);

            // Check if there's an assessment for this recording
            if (data) {
                const assessments = await getAssessmentsByRecordingId(id);
                if (assessments && assessments.length > 0) {
                    setSavedAssessment(assessments[0]);
                }
            }
        } catch (err) {
            console.error('Error loading recording:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [id]);

    useEffect(() => {
        const { class_average_score, total_possible_score } = formData;
        if (total_possible_score > 0) {
            setScorePercentage(calculatePercentage(class_average_score, total_possible_score));
        } else {
            setScorePercentage(null);
        }
    }, [formData.class_average_score, formData.total_possible_score]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'number' ? parseFloat(value) || 0 : value,
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id || !scorePercentage) return;
        setSaving(true);
        try {
            await createAssessment({
                recording_id: id,
                subject: formData.subject,
                section: formData.section,
                group_type: formData.group_type,
                assessment_type: formData.assessment_type,
                assessment_name: formData.assessment_name,
                assessment_date: formData.assessment_date,
                class_average_score: formData.class_average_score,
                total_possible_score: formData.total_possible_score,
                score_percentage: scorePercentage,
            });
            await loadData();
            navigate('/recordings');
        } catch (err) {
            console.error('Error saving assessment:', err);
            alert('Error saving assessment. Please try again.');
        } finally {
            setSaving(false);
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

    if (!recording) {
        return (
            <Layout>
                <EmptyState title="Recording not found" description="The recording you're looking for doesn't exist or has been archived." />
            </Layout>
        );
    }

    const readings = recording.readings || [];
    const avgCO2 = readings.length > 0 ? readings.reduce((s, r) => s + r.average_co2, 0) / readings.length : 0;
    const avgTemp = readings.length > 0 ? readings.reduce((s, r) => s + r.average_temperature, 0) / readings.length : 0;
    const avgNoise = readings.length > 0 ? readings.reduce((s, r) => s + r.average_noise, 0) / readings.length : 0;

    const hasAssessment = !!savedAssessment;

    return (
        <Layout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-[#002858]">Recording Details</h1>
                        <p className="text-gray-500 text-sm">ID: {recording.id}</p>
                    </div>
                    <button
                        onClick={() => navigate('/recordings')}
                        className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition text-gray-700"
                    >
                        ← Back
                    </button>
                </div>

                {/* Recording Info */}
                <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <p className="text-gray-500 text-xs">Device</p>
                            <p className="font-medium text-gray-900">{recording.device?.device_name || 'Unknown'}</p>
                        </div>
                        <div>
                            <p className="text-gray-500 text-xs">Status</p>
                            <StatusBadge status={recording.status} variant={recording.status === 'Recording' ? 'recording' : 'completed'} />
                        </div>
                        <div>
                            <p className="text-gray-500 text-xs">Started</p>
                            <p className="text-sm text-gray-700">{formatDateTimeFull(recording.started_at)}</p>
                        </div>
                        <div>
                            <p className="text-gray-500 text-xs">Duration</p>
                            <p className="text-sm font-mono text-gray-700">{formatDuration(recording.duration_seconds)}</p>
                        </div>
                    </div>

                    {readings.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-3 gap-4">
                            <div>
                                <p className="text-gray-500 text-xs">Avg CO₂</p>
                                <p className="font-semibold text-gray-900">{avgCO2.toFixed(1)} ppm</p>
                            </div>
                            <div>
                                <p className="text-gray-500 text-xs">Avg Temperature</p>
                                <p className="font-semibold text-gray-900">{avgTemp.toFixed(1)} °C</p>
                            </div>
                            <div>
                                <p className="text-gray-500 text-xs">Avg Noise</p>
                                <p className="font-semibold text-gray-900">{avgNoise.toFixed(1)} dB</p>
                            </div>
                        </div>
                    )}
                    <div className="mt-3 text-gray-500 text-xs">
                        {readings.length} data packet{readings.length !== 1 ? 's' : ''} received
                    </div>
                </div>

                {/* Assessment Form or Display */}
                {hasAssessment ? (
                    <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
                        <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3">Assessment Details</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <p className="text-gray-500 text-xs">Subject</p>
                                <p className="text-gray-900">{savedAssessment.subject}</p>
                            </div>
                            <div>
                                <p className="text-gray-500 text-xs">Section</p>
                                <p className="text-gray-900">{savedAssessment.section}</p>
                            </div>
                            <div>
                                <p className="text-gray-500 text-xs">Group</p>
                                <p className="text-gray-900">{savedAssessment.group_type}</p>
                            </div>
                            <div>
                                <p className="text-gray-500 text-xs">Assessment</p>
                                <p className="text-gray-900">{savedAssessment.assessment_name}</p>
                            </div>
                            <div>
                                <p className="text-gray-500 text-xs">Type</p>
                                <p className="text-gray-900">{savedAssessment.assessment_type}</p>
                            </div>
                            <div>
                                <p className="text-gray-500 text-xs">Date</p>
                                <p className="text-gray-900">{formatDateTimeFull(savedAssessment.assessment_date)}</p>
                            </div>
                            <div>
                                <p className="text-gray-500 text-xs">Class Average</p>
                                <p className="text-gray-900">{savedAssessment.class_average_score} / {savedAssessment.total_possible_score}</p>
                            </div>
                            <div>
                                <p className="text-gray-500 text-xs">Score Percentage</p>
                                <p className="text-lg font-bold text-[#002858]">
                                    {savedAssessment.score_percentage}%
                                </p>
                            </div>
                        </div>
                    </div>
                ) : recording.status !== 'Recording' ? (
                    <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
                        <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-4">Add Assessment Details</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-gray-500 text-xs mb-1">Subject *</label>
                                    <input
                                        name="subject"
                                        value={formData.subject}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#002858]/20 text-gray-900"
                                        placeholder="e.g., Information Management"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-500 text-xs mb-1">Section *</label>
                                    <input
                                        name="section"
                                        value={formData.section}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#002858]/20 text-gray-900"
                                        placeholder="e.g., A1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-500 text-xs mb-1">Group *</label>
                                    <select
                                        name="group_type"
                                        value={formData.group_type}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#002858]/20 bg-white text-gray-900"
                                    >
                                        <option value="Experimental">Experimental</option>
                                        <option value="Comparison">Comparison</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-gray-500 text-xs mb-1">Assessment Type *</label>
                                    <select
                                        name="assessment_type"
                                        value={formData.assessment_type}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#002858]/20 bg-white text-gray-900"
                                    >
                                        <option value="Quiz">Quiz</option>
                                        <option value="Examination">Examination</option>
                                        <option value="Activity">Activity</option>
                                        <option value="Exercise">Exercise</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-gray-500 text-xs mb-1">Assessment Name *</label>
                                    <input
                                        name="assessment_name"
                                        value={formData.assessment_name}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#002858]/20 text-gray-900"
                                        placeholder="e.g., Quiz 1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-500 text-xs mb-1">Assessment Date *</label>
                                    <input
                                        name="assessment_date"
                                        type="date"
                                        value={formData.assessment_date}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#002858]/20 text-gray-900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-500 text-xs mb-1">Class Average Score *</label>
                                    <input
                                        name="class_average_score"
                                        type="number"
                                        step="0.1"
                                        value={formData.class_average_score}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#002858]/20 text-gray-900"
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-500 text-xs mb-1">Total Possible Score *</label>
                                    <input
                                        name="total_possible_score"
                                        type="number"
                                        step="0.1"
                                        value={formData.total_possible_score}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#002858]/20 text-gray-900"
                                        placeholder="0"
                                    />
                                </div>
                                <div className="flex items-end">
                                    <div className="w-full p-3 bg-gray-50 rounded-lg border border-gray-200">
                                        <p className="text-gray-500 text-xs">Score Percentage</p>
                                        <p className="text-xl font-bold text-[#002858]">
                                            {scorePercentage !== null ? `${scorePercentage}%` : '—'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="submit"
                                    disabled={saving || scorePercentage === null}
                                    className="px-6 py-2 text-white rounded-lg text-sm hover:opacity-90 transition disabled:opacity-50 bg-[#002858]"
                                >
                                    {saving ? 'Saving...' : 'Save Assessment'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => navigate('/recordings')}
                                    className="px-6 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition text-gray-700"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                ) : (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-700 text-sm">
                        Assessment details can only be added after the recording has completed.
                    </div>
                )}
            </div>
        </Layout>
    );
}