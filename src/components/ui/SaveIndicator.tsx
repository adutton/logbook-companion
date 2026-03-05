import React from 'react';
import { Loader2, Check, AlertCircle } from 'lucide-react';
import type { SaveStatus } from '../../hooks/useDebouncedSave';

interface SaveIndicatorProps {
  status: SaveStatus;
  className?: string;
}

export const SaveIndicator: React.FC<SaveIndicatorProps> = ({ status, className = '' }) => {
  if (status === 'idle') {
    return (
      <span className={`flex items-center gap-1 text-xs text-neutral-600 ${className}`}>
        Auto-save on
      </span>
    );
  }

  if (status === 'saving') {
    return (
      <span className={`flex items-center gap-1 text-xs text-neutral-400 ${className}`}>
        <Loader2 className="animate-spin" size={14} />
        Saving…
      </span>
    );
  }

  if (status === 'saved') {
    return (
      <span className={`flex items-center gap-1 text-xs text-emerald-400 ${className}`}>
        <Check size={14} />
        Saved
      </span>
    );
  }

  if (status === 'error') {
    return (
      <span className={`flex items-center gap-1 text-xs text-red-400 ${className}`}>
        <AlertCircle size={14} />
        Save failed
      </span>
    );
  }

  return null;
};
