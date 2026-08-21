// src/components/common/StatusBadge.tsx
import React from 'react';

interface StatusBadgeProps {
    status: string;
    variant?: 'default' | 'recording' | 'completed' | 'archived' | 'pending' | 'normal' | 'moderate' | 'poor';
}

export function StatusBadge({ status, variant = 'default' }: StatusBadgeProps) {
    const variants: Record<string, { bg: string; text: string }> = {
        default: { bg: '#e8ecf4', text: '#4a4a6a' },
        recording: { bg: '#dbeafe', text: '#1e40af' },
        completed: { bg: '#d1fae5', text: '#065f46' },
        archived: { bg: '#fef3c7', text: '#92400e' },
        pending: { bg: '#fef3c7', text: '#92400e' },
        normal: { bg: '#d1fae5', text: '#065f46' },
        moderate: { bg: '#fef3c7', text: '#92400e' },
        poor: { bg: '#fee2e2', text: '#991b1b' },
    };

    const style = variants[variant] || variants.default;

    return (
        <span
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: style.bg, color: style.text }}
        >
            {status}
        </span>
    );
}