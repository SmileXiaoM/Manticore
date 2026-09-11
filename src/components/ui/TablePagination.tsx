import { useEffect, useState } from 'react';

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
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const [jumpPage, setJumpPage] = useState(String(currentPage));

  useEffect(() => {
    setJumpPage(String(currentPage));
  }, [currentPage, totalPages]);

  if (total === 0) return null;

  const start = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, total);
  const submitJump = () => {
    const requestedPage = Number(jumpPage);
    if (!Number.isInteger(requestedPage)) {
      setJumpPage(String(currentPage));
      return;
    }
    const nextPage = Math.min(Math.max(requestedPage, 1), totalPages);
    setJumpPage(String(nextPage));
    onPageChange(nextPage);
  };

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
          aria-label="第一页"
          className="h-8 px-3 border border-[var(--ty-border-color)] rounded-ty-sm bg-white disabled:opacity-40"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(1)}
        >
          首页
        </button>
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
        <button
          type="button"
          aria-label="最后一页"
          className="h-8 px-3 border border-[var(--ty-border-color)] rounded-ty-sm bg-white disabled:opacity-40"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(totalPages)}
        >
          末页
        </button>
        <label className="inline-flex items-center gap-1 whitespace-nowrap">
          跳至
          <input
            type="number"
            min="1"
            max={totalPages}
            value={jumpPage}
            aria-label="跳转页码"
            onChange={(event) => setJumpPage(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && submitJump()}
            className="h-8 w-14 border border-[var(--ty-border-color)] rounded-ty-sm px-2 text-center bg-white text-[var(--ty-font-main-color)]"
          />
          页
        </label>
        <button type="button" onClick={submitJump} className="h-8 px-3 border border-[var(--ty-border-color)] rounded-ty-sm bg-white">确定</button>
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
