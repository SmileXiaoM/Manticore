import { useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ManualRefreshControlProps {
  ariaLabel: string;
  onRefresh?: () => void | Promise<void>;
}

export function ManualRefreshControl({ ariaLabel, onRefresh }: ManualRefreshControlProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [refreshedAt, setRefreshedAt] = useState(() => new Date());

  const refresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    setError('');
    try {
      if (onRefresh) {
        await onRefresh();
      } else {
        await new Promise(resolve => setTimeout(resolve, 260));
      }
      setRefreshedAt(new Date());
    } catch (reason) {
      setError(reason instanceof Error && reason.message ? reason.message : '读取失败，请重试。');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {error ? (
        <span role="alert" className="inline-flex items-center gap-1 text-ty-2xs text-[var(--ty-red-color)]">
          <AlertTriangle className="h-3.5 w-3.5" />{error}
        </span>
      ) : (
        <span className="text-ty-2xs text-[var(--ty-font-sub-color)]" title={refreshedAt.toLocaleString('zh-CN', { hour12: false })}>
          更新于 {refreshedAt.toLocaleTimeString('zh-CN', { hour12: false })}
        </span>
      )}
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={refresh}
        disabled={refreshing}
        className="h-8 px-3 inline-flex items-center gap-2 rounded-ty-sm border border-[var(--ty-border-color)] bg-[var(--ty-fill-white-color)] text-ty-xs hover:bg-[var(--ty-fill-weak-dark-color)] disabled:cursor-wait disabled:opacity-50"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
        {refreshing ? '刷新中' : error ? '重新加载' : '刷新'}
      </button>
    </div>
  );
}
