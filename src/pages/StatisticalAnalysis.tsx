// src/pages/StatisticalAnalysis.tsx
import React, { useState, useEffect } from 'react';
import { Layout } from '../components/layout/Layout';
import { getDataForAnalysis, calculateCorrelations, calculateTTest } from '../services/analysisService';
import { getDistinctSubjects } from '../services/assessmentService';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { Assessment, CorrelationResult, TTestResult } from '../types';

export function StatisticalAnalysis() {
    const [subjects, setSubjects] = useState<string[]>([]);
    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedType, setSelectedType] = useState('');
    const [selectedAssessment, setSelectedAssessment] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [assessments, setAssessments] = useState<Assessment[]>([]);
    const [correlations, setCorrelations] = useState<CorrelationResult[]>([]);
    const [tTestResult, setTTestResult] = useState<TTestResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [assessmentNames, setAssessmentNames] = useState<string[]>([]);

    const loadSubjects = async () => {
        try {
            const data = await getDistinctSubjects();
            setSubjects(data);
        } catch (err) {
            console.error('Error loading subjects:', err);
        }
    };

    useEffect(() => {
        loadSubjects();
    }, []);

    useEffect(() => {
        if (selectedSubject) {
            const names = assessments
                .filter(a => a.subject === selectedSubject)
                .map(a => a.assessment_name);
            setAssessmentNames([...new Set(names)]);
        }
    }, [selectedSubject, assessments]);

    const handleAnalyze = async () => {
        setLoading(true);
        try {
            const data = await getDataForAnalysis(
                selectedSubject || undefined,
                selectedType || undefined,
                selectedAssessment || undefined,
                dateFrom || undefined,
                dateTo || undefined
            );
            setAssessments(data);

            // Calculate correlations
            const corrResults = calculateCorrelations(data);
            setCorrelations(corrResults);

            // Calculate t-test for selected subject
            if (selectedSubject) {
                const tResult = calculateTTest(data, selectedSubject);
                setTTestResult(tResult);
            } else {
                setTTestResult(null);
            }
        } catch (err) {
            console.error('Error analyzing data:', err);
        } finally {
            setLoading(false);
        }
    };

    const typeOptions = ['', 'Quiz', 'Examination', 'Activity', 'Exercise'];

    return (
        <Layout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>Statistical Analysis</h1>
                    <p className="text-text-muted text-sm">Pearson correlation and independent samples t-test for research data</p>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-lg border border-border p-5 shadow-sm">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <select
                            value={selectedSubject}
                            onChange={(e) => setSelectedSubject(e.target.value)}
                            className="px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                        >
                            <option value="">All Subjects</option>
                            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <select
                            value={selectedType}
                            onChange={(e) => setSelectedType(e.target.value)}
                            className="px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                        >
                            {typeOptions.map(t => <option key={t} value={t}>{t || 'All Types'}</option>)}
                        </select>
                        <select
                            value={selectedAssessment}
                            onChange={(e) => setSelectedAssessment(e.target.value)}
                            className="px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                            disabled={!selectedSubject}
                        >
                            <option value="">All Assessments</option>
                            {assessmentNames.map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>
                    <button
                        onClick={handleAnalyze}
                        className="mt-3 px-6 py-2 text-white rounded-md text-sm hover:opacity-90 transition"
                        style={{ backgroundColor: 'var(--primary)' }}
                    >
                        Run Analysis
                    </button>
                </div>

                {loading && (
                    <div className="flex justify-center py-8">
                        <LoadingSpinner size="lg" />
                    </div>
                )}

                {!loading && assessments.length === 0 && (
                    <EmptyState
                        title="No data for analysis"
                        description="Select filters and run analysis to see results."
                    />
                )}

                {!loading && assessments.length > 0 && (
                    <>
                        {/* Dataset info */}
                        <div className="bg-white rounded-lg border border-border p-4 shadow-sm">
                            <p className="text-text-muted text-sm">
                                Dataset: <span className="font-medium text-text-primary">{assessments.length}</span> records
                                {selectedSubject && ` · Subject: ${selectedSubject}`}
                                {selectedType && ` · Type: ${selectedType}`}
                            </p>
                        </div>

                        {/* Pearson Correlations */}
                        <div>
                            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Pearson Correlation</h2>
                            {correlations.length === 0 ? (
                                <div className="bg-white rounded-lg border border-border p-4 text-text-muted text-sm">
                                    Not enough data for correlation analysis (minimum 3 records required).
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {correlations.map((c, i) => (
                                        <div key={i} className="bg-white rounded-lg border border-border p-4 shadow-sm">
                                            <p className="font-medium text-sm">{c.variable1} vs {c.variable2}</p>
                                            <div className="mt-2 space-y-1 text-sm">
                                                <p><span className="text-text-muted">n =</span> {c.n}</p>
                                                <p><span className="text-text-muted">r =</span> {c.r.toFixed(3)}</p>
                                                <p><span className="text-text-muted">p =</span> {c.p_value.toFixed(4)}</p>
                                                <p>
                                                    <StatusBadge
                                                        status={c.significance === 'significant' ? 'Significant' : 'Not Significant'}
                                                        variant={c.significance === 'significant' ? 'completed' : 'default'}
                                                    />
                                                </p>
                                                <p className="text-xs text-text-secondary mt-1 italic">{c.interpretation}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* T-Test */}
                        {selectedSubject && (
                            <div>
                                <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
                                    Independent Samples T-Test: {selectedSubject}
                                </h2>
                                {tTestResult ? (
                                    <div className="bg-white rounded-lg border border-border p-5 shadow-sm">
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                            <div>
                                                <p className="text-text-muted text-xs">Experimental n</p>
                                                <p className="font-medium">{tTestResult.experimental_n}</p>
                                            </div>
                                            <div>
                                                <p className="text-text-muted text-xs">Comparison n</p>
                                                <p className="font-medium">{tTestResult.comparison_n}</p>
                                            </div>
                                            <div>
                                                <p className="text-text-muted text-xs">Experimental Mean</p>
                                                <p className="font-medium">{tTestResult.experimental_mean.toFixed(2)}%</p>
                                            </div>
                                            <div>
                                                <p className="text-text-muted text-xs">Comparison Mean</p>
                                                <p className="font-medium">{tTestResult.comparison_mean.toFixed(2)}%</p>
                                            </div>
                                            <div>
                                                <p className="text-text-muted text-xs">t-value</p>
                                                <p className="font-medium">{tTestResult.t_value.toFixed(3)}</p>
                                            </div>
                                            <div>
                                                <p className="text-text-muted text-xs">df</p>
                                                <p className="font-medium">{tTestResult.df}</p>
                                            </div>
                                            <div>
                                                <p className="text-text-muted text-xs">p-value</p>
                                                <p className="font-medium">{tTestResult.p_value.toFixed(4)}</p>
                                            </div>
                                            <div>
                                                <p className="text-text-muted text-xs">Decision</p>
                                                <StatusBadge
                                                    status={tTestResult.decision}
                                                    variant={tTestResult.significance === 'significant' ? 'recording' : 'default'}
                                                />
                                            </div>
                                        </div>
                                        <div className="mt-4 pt-4 border-t border-border text-sm">
                                            <p className="text-text-secondary">{tTestResult.interpretation}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-white rounded-lg border border-border p-4 text-text-muted text-sm">
                                        Insufficient data for t-test (need at least 2 records per group).
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </Layout>
    );
}