import { useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';

/**
 * Subscribes to realtime INSERT/UPDATE/DELETE events on the given tables and
 * calls `onChange` (debounced) whenever any of them changes. Used to keep
 * list/summary pages in sync without requiring a manual page refresh.
 */
export function useRealtimeRefresh(tables: string[], onChange: () => void) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const tableKey = tables.join(',');

  useEffect(() => {
    if (!tableKey) return;

    const channelName = `realtime-${tableKey}-${Math.random().toString(36).slice(2, 8)}`;
    let channel = supabase.channel(channelName);
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const trigger = () => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => onChangeRef.current(), 400);
    };

    tableKey.split(',').forEach((table) => {
      channel = channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        trigger
      );
    });
    channel.subscribe();

    return () => {
      if (timeout) clearTimeout(timeout);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableKey]);
}
