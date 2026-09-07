'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation } from '@/i18n';
import { cn } from '@/lib/utils';

interface DataPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  /** When provided, a page-size selector is shown next to the entry count. */
  pageSizeOptions?: readonly number[];
  onPageSizeChange?: (size: number) => void;
}

function getPageNumbers(currentPage: number, totalPages: number): (number | 'ellipsis')[] {
  const pages: (number | 'ellipsis')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
    return pages;
  }
  pages.push(1);
  if (currentPage > 3) pages.push('ellipsis');
  for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
    pages.push(i);
  }
  if (currentPage < totalPages - 2) pages.push('ellipsis');
  pages.push(totalPages);
  return pages;
}

const circle =
  'inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-40';

export function DataPagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  pageSizeOptions,
  onPageSizeChange,
}: DataPaginationProps) {
  const { t } = useTranslation('common');

  const hasSizeSelector = !!pageSizeOptions && !!onPageSizeChange;
  if (totalItems === 0 || (totalPages <= 1 && !hasSizeSelector)) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);
  const showingText = t('showingEntries')
    .replace('{start}', String(startItem))
    .replace('{end}', String(endItem))
    .replace('{total}', String(totalItems));

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 px-1 py-2">
      <div className="flex items-center gap-3">
        <p className="text-sm text-muted-foreground">{showingText}</p>
        {hasSizeSelector && (
          <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
            <SelectTrigger className="h-10 w-[88px] rounded-xl bg-card" aria-label="Rows per page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={String(size)}>{size}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {totalPages > 1 && (
        <nav role="navigation" aria-label="pagination" className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label={t('previous')}
            disabled={currentPage === 1}
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            className={cn(circle, 'border border-border/60 bg-card text-muted-foreground hover:bg-muted hover:text-foreground')}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {getPageNumbers(currentPage, totalPages).map((page, i) =>
            page === 'ellipsis' ? (
              <span key={`ellipsis-${i}`} className={cn(circle, 'text-muted-foreground')} aria-hidden>
                …
              </span>
            ) : (
              <button
                key={page}
                type="button"
                aria-current={page === currentPage ? 'page' : undefined}
                onClick={() => onPageChange(page)}
                className={cn(
                  circle,
                  page === currentPage
                    ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30'
                    : 'text-foreground hover:bg-muted'
                )}
              >
                {page}
              </button>
            )
          )}

          <button
            type="button"
            aria-label={t('next')}
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            className={cn(circle, 'border border-border/60 bg-card text-muted-foreground hover:bg-muted hover:text-foreground')}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </nav>
      )}
    </div>
  );
}
