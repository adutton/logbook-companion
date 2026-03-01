import React from 'react';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'coaching';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-accent-primary hover:bg-accent-primary-hover active:bg-emerald-700 text-white shadow-sm',
  secondary:
    'bg-surface-secondary hover:bg-surface-well active:bg-surface-secondary text-content-secondary border border-border',
  danger:
    'bg-accent-danger hover:bg-accent-danger-hover active:bg-red-700 text-white shadow-sm',
  ghost:
    'bg-transparent hover:bg-surface-card active:bg-surface-secondary text-content-secondary',
  coaching:
    'bg-accent-coaching hover:bg-accent-coaching-hover active:bg-indigo-700 text-white shadow-sm',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-2.5 py-1 text-xs gap-1.5',
  md: 'px-3.5 py-1.5 text-sm gap-2',
  lg: 'px-5 py-2.5 text-sm gap-2',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  disabled,
  className = '',
  children,
  ...props
}) => (
  <button
    className={`
      inline-flex items-center justify-center font-medium rounded-lg
      transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2
      focus:ring-offset-surface-page focus:ring-focus
      disabled:opacity-50 disabled:cursor-not-allowed
      ${variantClasses[variant]} ${sizeClasses[size]} ${className}
    `}
    disabled={disabled || loading}
    {...props}
  >
    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
    {children}
  </button>
);
