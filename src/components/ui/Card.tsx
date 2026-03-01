import React from 'react';

type CardVariant = 'default' | 'elevated' | 'outlined' | 'ghost';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const variantClasses: Record<CardVariant, string> = {
  default: 'bg-surface-card border border-border shadow-sm',
  elevated: 'bg-surface-elevated border border-border shadow-md',
  outlined: 'border border-border bg-transparent',
  ghost: 'bg-surface-card/50',
};

const paddingClasses = {
  none: '',
  sm: 'p-3',
  md: 'p-4 sm:p-5',
  lg: 'p-5 sm:p-6',
};

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  padding = 'md',
  className = '',
  children,
  ...props
}) => (
  <div
    className={`rounded-xl ${variantClasses[variant]} ${paddingClasses[padding]} ${className}`}
    {...props}
  >
    {children}
  </div>
);

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  subtitle,
  action,
  className = '',
  ...props
}) => (
  <div className={`flex items-start justify-between gap-3 mb-4 ${className}`} {...props}>
    <div>
      <h3 className="text-sm font-semibold text-content-primary tracking-tight">{title}</h3>
      {subtitle && <p className="text-xs text-content-muted mt-0.5">{subtitle}</p>}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);
