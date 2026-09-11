interface TablePaginationProps {
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  itemLabel?: string;
  pageSizeOptions?: number[];
}

export function TablePagination({
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  itemLabel = '条',
  pageSizeOptions = [20, 50, 200, 500, 1000],
}: TablePaginationProps) {
  if (total === 0) return null;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const start = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, total);

  return (
    <div className="px-4 py-3 border-t border-[var(--ty-border-color)] flex flex-wrap items-center justify-between gap-3 text-ty-xs text-[var(--ty-font-sub-color)]">
      <span>第 {start}–{end} {itemLabel} / 共 {total.toLocaleString()} {itemLabel}</span>
      <div className="flex items-center gap-2">
        <select
          aria-label={`${itemLabel}每页数量`}
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          className="h-8 border border-[var(--ty-border-color)] rounded-ty-sm px-2 bg-white text-[var(--ty-font-main-color)]"
        >
          {pageSizeOptions.map((option) => <option key={option} value={option}>{option} {itemLabel}/页</option>)}
        </select>
        <button
          type="button"
          className="h-8 px-3 border border-[var(--ty-border-color)] rounded-ty-sm bg-white disabled:opacity-40"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          上一页
        </button>
        <span className="min-w-12 text-center">{currentPage} / {totalPages}</span>
        <button
          type="button"
          className="h-8 px-3 border border-[var(--ty-border-color)] rounded-ty-sm bg-white disabled:opacity-40"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          下一页
        </button>
      </div>
    </div>
  );
}

export function paginateRows<T>(rows: T[], page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  return {
    currentPage,
    rows: rows.slice((currentPage - 1) * pageSize, currentPage * pageSize),
  };
}

export function formatCompactNumber(value: number) {
  if (Math.abs(value) < 10_000) return value.toLocaleString('zh-CN');
  return new Intl.NumberFormat('zh-CN', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}
