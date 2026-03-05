import { useCallback, useEffect, useRef, useState } from 'react';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseDebouncedSaveOptions<T> {
  /** Data to auto-save */
  data: T;
  /** Async save function */
  onSave: (data: T) => Promise<void>;
  /** Debounce delay in ms (default: 3000) */
  delay?: number;
  /** Whether auto-save is enabled (default: true) */
  enabled?: boolean;
}

interface UseDebouncedSaveReturn {
  /** Current save status */
  status: SaveStatus;
  /** Manually trigger save now */
  saveNow: () => void;
}

export function useDebouncedSave<T>({
  data,
  onSave,
  delay = 3000,
  enabled = true,
}: UseDebouncedSaveOptions<T>): UseDebouncedSaveReturn {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialRender = useRef(true);
  const lastSavedDataRef = useRef<string>('');
  const onSaveRef = useRef(onSave);
  const dataRef = useRef(data);

  // Keep refs current without triggering effects
  onSaveRef.current = onSave;
  dataRef.current = data;

  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const executeSave = useCallback(async (dataToSave: T) => {
    const serialized = JSON.stringify(dataToSave);
    if (serialized === lastSavedDataRef.current) return;

    setStatus('saving');
    try {
      await onSaveRef.current(dataToSave);
      lastSavedDataRef.current = serialized;
      setStatus('saved');
      statusTimerRef.current = setTimeout(() => setStatus('idle'), 2000);
    } catch {
      setStatus('error');
      statusTimerRef.current = setTimeout(() => setStatus('idle'), 3000);
    }
  }, []);

  // Watch data for changes and debounce save
  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      lastSavedDataRef.current = JSON.stringify(data);
      return;
    }

    if (!enabled) return;

    const serialized = JSON.stringify(data);
    if (serialized === lastSavedDataRef.current) return;

    clearTimers();
    timerRef.current = setTimeout(() => {
      executeSave(data);
    }, delay);

    return () => clearTimers();
  }, [data, delay, enabled, clearTimers, executeSave]);

  // Clean up all timers on unmount
  useEffect(() => {
    return () => {
      clearTimers();
      if (statusTimerRef.current) {
        clearTimeout(statusTimerRef.current);
      }
    };
  }, [clearTimers]);

  const saveNow = useCallback(() => {
    clearTimers();
    executeSave(dataRef.current);
  }, [clearTimers, executeSave]);

  return { status, saveNow };
}
