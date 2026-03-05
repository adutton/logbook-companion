import React, { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Search } from 'lucide-react';

/** Column definition for DataTable */
export interface Column<T> {
  key: string;
  header: string;
  /** Render cell content */
  render: (row: T, index: number) => React.ReactNode;
  /** Sort comparator — if provided, column is sortable */
  sortFn?: (a: T, b: T) => number;
  /** Column header className override */
  headerClassName?: string;
  /** Cell className override */
  cellClassName?: string;
  /** Hide on mobile (below sm breakpoint) */
  hideOnMobile?: boolean;
}

interface DataTableProps<T> {
  /** Column definitions */
  columns: Column<T>[];
  /** Data rows */
  data: T[];
  /** Unique key extractor */
  keyExtractor: (row: T) => string;
  /** Optional search — filter function and placeholder */
  search?: {
    placeholder: string;
    filter: (row: T, query: string) => boolean;
  };
  /** Optional empty state content */
  emptyState?: React.ReactNode;
  /** Optional row click handler */
  onRowClick?: (row: T) => void;
  /** Optional className for the table container */
  className?: string;
  /** Whether to show row hover effect */
  hoverable?: boolean;
  /** Optional caption for accessibility */
  caption?: string;
}

type SortDirection = 'asc' | 'desc';

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  search,
  emptyState,
  onRowClick,
  className = '',
  hoverable,
  caption,
}: DataTableProps<T>) {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>('asc');

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const filteredData = useMemo(() => {
    if (!search || !query.trim()) return data;
    const q = query.trim().toLowerCase();
    return data.filter(row => search.filter(row, q));
  }, [data, query, search]);

  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    const col = columns.find(c => c.key === sortKey);
    if (!col?.sortFn) return filteredData;
    const sorted = [...filteredData].sort(col.sortFn);
    return sortDir === 'desc' ? sorted.reverse() : sorted;
  }, [filteredData, sortKey, sortDir, columns]);

  const showHover = hoverable || !!onRowClick;
  const isEmpty = sortedData.length === 0;

  const renderSortIcon = (col: Column<T>) => {
    if (!col.sortFn) return null;
    if (sortKey !== col.key) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-content-faint ml-1 inline-block" />;
    }
    return sortDir === 'asc'
      ? <ArrowUp className="w-3.5 h-3.5 text-accent-primary ml-1 inline-block" />
      : <ArrowDown className="w-3.5 h-3.5 text-accent-primary ml-1 inline-block" />;
  };

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* Search bar */}
      {search && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-content-faint pointer-events-none" size={16} />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={search.placeholder}
            className="
              w-full pl-9 pr-3 py-1.5 text-sm rounded-lg
              bg-surface-secondary border border-border text-content-primary
              placeholder-content-faint
              focus:outline-none focus:ring-2 focus:ring-focus focus:border-accent-primary
              transition-colors duration-150
            "
          />
        </div>
      )}

      {/* Table container */}
      <div className="bg-surface-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            {caption && <caption className="sr-only">{caption}</caption>}

            <thead className="bg-surface-secondary sticky top-0 z-10">
              <tr className="border-b border-border">
                {columns.map(col => {
                  const isSortable = !!col.sortFn;
                  const visibility = col.hideOnMobile ? 'hidden sm:table-cell' : '';
                  return (
                    <th
                      key={col.key}
                      scope="col"
                      className={`
                        px-3 py-3 text-xs font-medium text-content-muted uppercase tracking-wider select-none
                        ${isSortable ? 'cursor-pointer hover:text-content-primary' : ''}
                        ${visibility}
                        ${col.headerClassName ?? ''}
                      `}
                      onClick={isSortable ? () => toggleSort(col.key) : undefined}
                      aria-sort={
                        sortKey === col.key
                          ? sortDir === 'asc' ? 'ascending' : 'descending'
                          : undefined
                      }
                    >
                      {col.header}
                      {renderSortIcon(col)}
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {isEmpty ? (
                <tr>
                  <td colSpan={columns.length} className="px-3 py-12 text-center">
                    {emptyState ?? (
                      <span className="text-sm text-content-faint">No data to display</span>
                    )}
                  </td>
                </tr>
              ) : (
                sortedData.map((row, rowIndex) => (
                  <tr
                    key={keyExtractor(row)}
                    className={`
                      transition-colors
                      ${showHover ? 'hover:bg-surface-secondary/60 cursor-pointer' : ''}
                    `}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                  >
                    {columns.map(col => {
                      const visibility = col.hideOnMobile ? 'hidden sm:table-cell' : '';
                      return (
                        <td
                          key={col.key}
                          className={`
                            px-3 py-2.5 text-sm whitespace-nowrap text-content-primary
                            ${visibility}
                            ${col.cellClassName ?? ''}
                          `}
                        >
                          {col.render(row, rowIndex)}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
