// src/pages/LiveMonitoring.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Layout } from '../components/layout/Layout';
import { getActiveRecording } from '../services/recordingService';
import { supabase } from '../services/supabase';
import { formatDateTimeFull, formatDuration } from '../utils/dateTime';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { RecordingWithDetails, EnvironmentalReading } from '../types';

export function LiveMonitoring() {
    const [recording, setRecording] = useState<RecordingWithDetails | null>(null);
    const [readings, setReadings] = useState<EnvironmentalReading[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const chartRefs = useRef<{ [key: string]: HTMLCanvasElement | null }>({});

    const loadData = async () => {
        try {
            const active = await getActiveRecording();
            setRecording(active);
            if (active) {
                setReadings(active.readings || []);
                setLastUpdated(new Date());
            }
        } catch (err) {
            console.error('Error loading live data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();

        // Realtime subscription
        const channel = supabase
            .channel('live-monitoring')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'environmental_readings',
                },
                async (payload) => {
                    // Check if this reading belongs to the active recording
                    if (recording && payload.new.recording_id === recording.id) {
                        const newReading = payload.new as EnvironmentalReading;
                        setReadings(prev => [...prev, newReading].sort((a, b) => a.packet_number - b.packet_number));
                        setLastUpdated(new Date());
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'recordings',
                    filter: `id=eq.${recording?.id || ''}`,
                },
                async () => {
                    // Reload if recording status changed
                    await loadData();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [recording?.id]);

    const latestReading = readings.length > 0 ? readings[readings.length - 1] : null;

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
                <EmptyState
                    title="No Active Recording"
                    description="There is currently no active BANHA recording. Start a recording to begin monitoring."
                    icon="📡"
                />
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>Live Monitoring</h1>
                    <p className="text-text-muted text-sm">Real-time environmental data from the active BANHA device</p>
                </div>

                {/* Status Card */}
                <div className="bg-white rounded-lg border border-border p-5 shadow-sm">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <p className="text-text-muted text-xs">Device</p>
                            <p className="font-medium">{recording.device?.device_name || 'Unknown'}</p>
                        </div>
                        <div>
                            <p className="text-text-muted text-xs">Status</p>
                            <StatusBadge status="RECORDING" variant="recording" />
                        </div>
                        <div>
                            <p className="text-text-muted text-xs">Started</p>
                            <p className="text-sm">{formatDateTimeFull(recording.started_at)}</p>
                        </div>
                        <div>
                            <p className="text-text-muted text-xs">Duration</p>
                            <p className="text-sm font-mono">{formatDuration(recording.duration_seconds)}</p>
                        </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                            <p className="text-text-muted text-xs">Packets</p>
                            <p>{readings.length}</p>
                        </div>
                        <div>
                            <p className="text-text-muted text-xs">Last Updated</p>
                            <p>{lastUpdated ? formatDateTimeFull(lastUpdated) : '--'}</p>
                        </div>
                        <div className="col-span-2">
                            <p className="text-text-muted text-xs">Latest Packet</p>
                            <p>#{latestReading?.packet_number || '--'}</p>
                        </div>
                    </div>
                </div>

                {/* Latest Readings */}
                {latestReading && (
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white rounded-lg border border-border p-4 shadow-sm text-center">
                            <p className="text-text-muted text-xs uppercase tracking-wider">CO₂</p>
                            <p className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>
                                {latestReading.average_co2.toFixed(1)}
                            </p>
                            <p className="text-text-muted text-xs">ppm</p>
                            <StatusBadge
                                status={latestReading.average_co2 > 1000 ? 'Poor' : latestReading.average_co2 > 700 ? 'Moderate' : 'Normal'}
                                variant={latestReading.average_co2 > 1000 ? 'poor' : latestReading.average_co2 > 700 ? 'moderate' : 'normal'}
                            />
                        </div>
                        <div className="bg-white rounded-lg border border-border p-4 shadow-sm text-center">
                            <p className="text-text-muted text-xs uppercase tracking-wider">Temperature</p>
                            <p className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>
                                {latestReading.average_temperature.toFixed(1)}
                            </p>
                            <p className="text-text-muted text-xs">°C</p>
                            <StatusBadge
                                status={latestReading.average_temperature > 28 ? 'Moderate' : 'Normal'}
                                variant={latestReading.average_temperature > 28 ? 'moderate' : 'normal'}
                            />
                        </div>
                        <div className="bg-white rounded-lg border border-border p-4 shadow-sm text-center">
                            <p className="text-text-muted text-xs uppercase tracking-wider">Noise</p>
                            <p className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>
                                {latestReading.average_noise.toFixed(1)}
                            </p>
                            <p className="text-text-muted text-xs">dB</p>
                            <StatusBadge
                                status={latestReading.average_noise > 60 ? 'Poor' : latestReading.average_noise > 45 ? 'Moderate' : 'Normal'}
                                variant={latestReading.average_noise > 60 ? 'poor' : latestReading.average_noise > 45 ? 'moderate' : 'normal'}
                            />
                        </div>
                    </div>
                )}

                {/* Trends - simplified chart display using divs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {['average_co2', 'average_temperature', 'average_noise'].map((key) => {
                        const data = readings.map(r => ({
                            packet: r.packet_number,
                            value: r[key as keyof EnvironmentalReading] as number,
                        }));
                        const max = Math.max(...data.map(d => d.value), 1);
                        const label = key === 'average_co2' ? 'CO₂ (ppm)' : key === 'average_temperature' ? 'Temperature (°C)' : 'Noise (dB)';

                        return (
                            <div key={key} className="bg-white rounded-lg border border-border p-4 shadow-sm">
                                <p className="text-text-muted text-xs uppercase tracking-wider mb-2">{label}</p>
                                <div className="h-24 flex items-end gap-0.5">
                                    {data.length === 0 ? (
                                        <p className="text-text-muted text-xs">No data yet</p>
                                    ) : (
                                        data.slice(-30).map((d, i) => (
                                            <div
                                                key={i}
                                                className="flex-1 min-w-[2px] rounded-sm"
                                                style={{
                                                    height: `${(d.value / max) * 80 + 4}%`,
                                                    backgroundColor: `var(--secondary)`,
                                                    opacity: 0.6 + (i / data.slice(-30).length) * 0.4,
                                                }}
                                                title={`Packet ${d.packet}: ${d.value.toFixed(1)}`}
                                            />
                                        ))
                                    )}
                                </div>
                                <p className="text-text-muted text-xs mt-1">
                                    {data.length > 0 ? `${data.length} readings` : 'Waiting for data...'}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </Layout>
    );
}