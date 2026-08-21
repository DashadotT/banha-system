// src/components/common/ErrorState.tsx
import React from 'react';

interface ErrorStateProps {
    message: string;
    onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <div className="text-3xl mb-3">⚠️</div>
            <p className="text-red-600 text-sm">{message}</p>
            {onRetry && (
                <button
                    onClick={onRetry}
                    className="mt-3 px-4 py-2 bg-secondary text-white rounded-md text-sm hover:opacity-90 transition"
                    style={{ backgroundColor: 'var(--secondary)' }}
                >
                    Try Again
                </button>
            )}
        </div>
    );
}