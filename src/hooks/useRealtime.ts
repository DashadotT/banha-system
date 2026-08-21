// src/hooks/useRealtime.ts
import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

export function useRealtime<T>(
    table: string,
    onUpdate: (payload: any) => void,
    filter?: { column: string; value: any }
) {
    useEffect(() => {
        let channel = supabase
            .channel(`realtime:${table}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table,
                    ...(filter ? { filter: `${filter.column}=eq.${filter.value}` } : {}),
                },
                (payload) => {
                    onUpdate(payload);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [table, filter?.column, filter?.value]);
}