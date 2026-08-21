// src/components/common/LoadingSpinner.tsx
import React from 'react';

export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
    const sizes = {
        sm: 'h-4 w-4 border-2',
        md: 'h-8 w-8 border-3',
        lg: 'h-12 w-12 border-4',
    };

    return (
        <div className="flex items-center justify-center p-4">
            <div
                className={`${sizes[size]} rounded-full border-t-transparent border-primary animate-spin`}
                style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }}
            />
        </div>
    );
}