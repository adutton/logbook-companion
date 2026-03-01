import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => (
  <div
    className={`flex flex-col items-center justify-center py-12 px-6 text-center ${className}`}
  >
    {icon && (
      <div className="mb-4 text-neutral-600">{icon}</div>
    )}
    <h3 className="text-sm font-semibold text-content-secondary mb-1">{title}</h3>
    {description && (
      <p className="text-xs text-content-faint max-w-xs mb-4">{description}</p>
    )}
    {action && <div>{action}</div>}
  </div>
);
