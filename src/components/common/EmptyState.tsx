// src/components/common/EmptyState.tsx
import React from 'react';

interface EmptyStateProps {
    title: string;
    description?: string;
    icon?: React.ReactNode;
}

export function EmptyState({ title, description, icon }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            {icon && <div className="text-4xl mb-4 opacity-50">{icon}</div>}
            <h3 className="text-lg font-medium text-text-primary">{title}</h3>
            {description && <p className="text-text-muted mt-1 max-w-md">{description}</p>}
        </div>
    );
}