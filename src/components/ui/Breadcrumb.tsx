import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, className = '' }) => (
  <nav aria-label="Breadcrumb" className={`flex items-center gap-1.5 text-xs ${className}`}>
    {items.map((item, i) => (
      <React.Fragment key={i}>
        {i > 0 && <ChevronRight className="w-3 h-3 text-content-faint shrink-0" />}
        {item.to ? (
          <Link
            to={item.to}
            className="text-content-muted hover:text-content-primary transition-colors truncate max-w-[160px]"
          >
            {item.label}
          </Link>
        ) : (
          <span className="text-content-secondary font-medium truncate max-w-[200px]">
            {item.label}
          </span>
        )}
      </React.Fragment>
    ))}
  </nav>
);
