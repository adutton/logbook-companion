import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    direction: 'up' | 'down' | 'flat';
    label: string;
  };
  accent?: 'primary' | 'coaching' | 'danger' | 'default';
  className?: string;
}

export function StatCard({ label, value, icon, trend, accent = 'default', className = '' }: StatCardProps) {
  const accentStyles = {
    primary: 'border-accent-primary/30',
    coaching: 'border-accent-coaching/30',
    danger: 'border-accent-danger/30',
    default: 'border-border-subtle',
  };

  return (
    <div className={`bg-surface-card p-5 rounded-2xl border ${accentStyles[accent]} ${className}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium uppercase tracking-wider text-content-muted">{label}</span>
        {icon && <span className="text-content-muted">{icon}</span>}
      </div>
      <div className="text-2xl font-bold text-content-primary">{value}</div>
      {trend && (
        <div className={`text-xs mt-1 ${
          trend.direction === 'up' ? 'text-emerald-400' : 
          trend.direction === 'down' ? 'text-red-400' : 
          'text-content-muted'
        }`}>
          {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'} {trend.label}
        </div>
      )}
    </div>
  );
}
