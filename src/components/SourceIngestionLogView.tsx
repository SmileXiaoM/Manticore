import { useEffect, useMemo, useState } from 'react';
import { DatabaseZap, RotateCcw, Search, AlertTriangle, CheckCircle2, RefreshCw, X } from 'lucide-react';
import {
  IngestionStatus,
  SourceIngestionLog,
  ingestionStatusLabel,
  initialSourceIngestionLogs,
} from '../data/sourceIngestionLogs';

const statusClass: Record<IngestionStatus, string> = {
  RUNNING: 'bg-[var(--ty-primary-lighter-color)] text-[var(--ty-primary-color)] border-[var(--ty-primary-color)]/30',
  SUCCESS: 'bg-[var(--ty-green-lightest-color)] text-[var(--ty-green-color)] border-[var(--ty-green-color)]/30',
  PARTIAL_SUCCESS: 'bg-[var(--ty-orange-lightest-color)] text-[var(--ty-orange-color)] border-[var(--ty-orange-color)]/30',
  FAILED: 'bg-[var(--ty-red-lightest-color)] text-[var(--ty-red-color)] border-[var(--ty-red-color)]/30',
};

export function SourceIngestionLogView({
  logs = initialSourceIngestionLogs,
  initialRootTypeFilter = 'ALL',
}: {
  logs?: SourceIngestionLog[];
  initialRootTypeFilter?: string;
}) {
  const [rootType, setRootType] = useState(initialRootTypeFilter);
  const [status, setStatus] = useState<'ALL' | IngestionStatus>('ALL');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [detailLogId, setDetailLogId] = useState<string | null>(null);
  const scopedLogs = useMemo(
    () => logs.filter((log) => rootType === 'ALL' || log.rootTypeCode === rootType),
    [logs, rootType],
  );
  const visible = useMemo(
    () => scopedLogs
      .filter((log) => {
        if (status !== 'ALL' && log.status !== status) return false;
        const term = keyword.trim().toLowerCase();
        return !term || [
          log.id,
          log.sourceTable,
          log.stagingTable,
          log.errorSummary,
          ...(log.issues?.flatMap((issue) => [issue.name, issue.code, issue.description, ...(issue.exampleObjectIds || [])]) || []),
        ]
          .some((value) => value?.toLowerCase().includes(term));
      })
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
    [scopedLogs, status, keyword],
  );
  const unresolved = scopedLogs.filter((log) => log.status === 'FAILED' || log.status === 'PARTIAL_SUCCESS').length;
  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = visible.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const firstVisibleRow = visible.length ? (currentPage - 1) * pageSize + 1 : 0;
  const lastVisibleRow = Math.min(currentPage * pageSize, visible.length);
  const detailLog = logs.find((log) => log.id === detailLogId);

  useEffect(() => {
    if (!detailLogId) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDetailLogId(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [detailLogId]);

  return (
    <div className="min-w-0 space-y-4">
      <div className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <DatabaseZap className="w-5 h-5 text-[var(--ty-primary-color)]" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-ty-md font-semibold">源端采集日志</h1>
              <span className="text-ty-2xs px-2 py-0.5 rounded-ty-xs bg-[var(--ty-fill-color)] text-[var(--ty-font-sub-color)] border border-[var(--ty-border-color)]">源端 → 中间表</span>
            </div>
            <p className="text-ty-xs text-[var(--ty-font-sub-color)] mt-1">独立记录上游采集批次，只展示读取、落表及异常；不归入 Manticore 同步任务。</p>
          </div>
        </div>
        <span className="text-ty-xs text-[var(--ty-font-sub-color)]">当前为原型示例日志</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          ['日志总数', scopedLogs.length, <DatabaseZap className="w-4 h-4" />],
          ['采集中', scopedLogs.filter((log) => log.status === 'RUNNING').length, <RefreshCw className="w-4 h-4" />],
          ['异常批次', unresolved, <AlertTriangle className="w-4 h-4" />],
        ].map(([label, value, icon]) => (
          <div key={String(label)} className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-3.5 flex items-center justify-between">
            <div><span className="text-ty-xs text-[var(--ty-font-sub-color)] block">{label}</span><strong className="text-ty-xl mt-0.5 block">{value}</strong></div>
            <div className="w-9 h-9 rounded-ty-sm bg-[var(--ty-fill-color)] text-[var(--ty-font-sub-color)] flex items-center justify-center">{icon}</div>
          </div>
        ))}
      </div>

      <div className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-3.5 flex flex-wrap items-end gap-3">
        <label className="text-ty-xs text-[var(--ty-font-sub-color)] space-y-1">
          <span className="block">对象类型</span>
          <select aria-label="采集日志对象类型" value={rootType} onChange={(event) => { setRootType(event.target.value); setPage(1); }} className="h-8 min-w-36 px-2.5 border border-[var(--ty-border-color)] rounded-ty-sm bg-[var(--ty-fill-white-color)] text-[var(--ty-font-main-color)]">
            <option value="ALL">全部类型</option>
            <option value="PART">零部件</option>
            <option value="DOCUMENT">文档</option>
            <option value="PROCESS">工艺路线</option>
          </select>
        </label>
        <label className="text-ty-xs text-[var(--ty-font-sub-color)] space-y-1">
          <span className="block">执行状态</span>
          <select aria-label="采集日志状态" value={status} onChange={(event) => { setStatus(event.target.value as 'ALL' | IngestionStatus); setPage(1); }} className="h-8 min-w-36 px-2.5 border border-[var(--ty-border-color)] rounded-ty-sm bg-[var(--ty-fill-white-color)] text-[var(--ty-font-main-color)]">
            <option value="ALL">全部状态</option>
            {Object.entries(ingestionStatusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="text-ty-xs text-[var(--ty-font-sub-color)] space-y-1 flex-1 min-w-56">
          <span className="block">批次 / 来源表 / 中间表</span>
          <span className="relative block"><Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5" /><input aria-label="搜索采集日志" value={keyword} onChange={(event) => { setKeyword(event.target.value); setPage(1); }} placeholder="输入关键字" className="h-8 w-full pl-8 pr-2.5 border border-[var(--ty-border-color)] rounded-ty-sm" /></span>
        </label>
        <button type="button" onClick={() => { setRootType('ALL'); setStatus('ALL'); setKeyword(''); setPage(1); }} className="h-8 px-3 border border-[var(--ty-border-color)] rounded-ty-sm text-ty-xs flex items-center gap-1.5 hover:bg-[var(--ty-fill-weak-dark-color)]"><RotateCcw className="w-3.5 h-3.5" />重置</button>
      </div>

      <section className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--ty-border-color)] flex items-center justify-between"><div><h2 className="text-ty-sm font-semibold">采集批次</h2><p className="text-ty-xs text-[var(--ty-font-sub-color)] mt-1">共 {visible.length} 条，日志频率由上游任务决定。</p></div></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-ty-xs border-collapse">
            <thead><tr className="bg-[var(--ty-fill-color)] text-[var(--ty-font-sub-color)]"><th className="px-4 py-2.5 font-medium">批次 / 时间</th><th className="px-4 py-2.5 font-medium">采集链路</th><th className="px-4 py-2.5 font-medium">方式</th><th className="px-4 py-2.5 font-medium">读取 / 写入 / 失败</th><th className="px-4 py-2.5 font-medium">状态</th><th className="px-4 py-2.5 font-medium">异常摘要</th></tr></thead>
            <tbody>{pageRows.map((log) => (
              <tr key={log.id} className="border-t border-[var(--ty-border-light-color)] align-top">
                <td className="px-4 py-3"><strong className="font-mono block">{log.id}</strong><span className="text-[var(--ty-font-sub-color)] mt-1 block">{log.startedAt}</span></td>
                <td className="px-4 py-3"><strong>{log.sourceSystemName} · {log.sourceTable}</strong><span className="text-[var(--ty-font-sub-color)] mt-1 block">→ {log.stagingTable}</span></td>
                <td className="px-4 py-3">{log.mode === 'FULL' ? '全量' : '增量'}</td>
                <td className="px-4 py-3">
                  <span className="font-mono">{log.readCount ?? '待获取'} / {log.writtenCount ?? '待获取'} / </span>
                  <strong className={(log.failedCount || 0) > 0 ? 'font-mono text-[var(--ty-red-color)]' : 'font-mono font-normal'}>{log.failedCount ?? '待获取'}</strong>
                </td>
                <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-ty-xs border ${statusClass[log.status]}`}>{log.status === 'SUCCESS' && <CheckCircle2 className="w-3 h-3" />}{ingestionStatusLabel[log.status]}</span></td>
                <td className="px-4 py-3 max-w-72">
                  {log.issues?.length ? (
                    <div>
                      <strong className="text-[var(--ty-red-color)]">{log.failedCount} 条失败 · {log.issues.length} 类异常</strong>
                      <button type="button" onClick={() => setDetailLogId(log.id)} className="ml-3 text-[var(--ty-primary-link-color)] hover:underline">查看失败明细</button>
                    </div>
                  ) : <span>{log.errorSummary || '—'}</span>}
                  {log.traceId && <code className="text-[var(--ty-font-sub-color)] mt-1 block">{log.traceId}</code>}
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        {!visible.length && <div className="p-10 text-center text-ty-xs text-[var(--ty-font-sub-color)]">当前条件下暂无采集日志</div>}
        <div className="px-4 py-3 border-t border-[var(--ty-border-light-color)] flex flex-wrap items-center justify-between gap-3 text-ty-xs">
          <span className="text-[var(--ty-font-sub-color)]">共 {visible.length} 条，当前显示第 {firstVisibleRow}–{lastVisibleRow} 条</span>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-[var(--ty-font-sub-color)]">
              每页
              <select
                aria-label="采集日志每页条数"
                value={pageSize}
                onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}
                className="h-8 px-2 border border-[var(--ty-border-color)] rounded-ty-sm bg-[var(--ty-fill-white-color)] text-[var(--ty-font-main-color)]"
              >
                <option value={10}>10 条</option>
                <option value={20}>20 条</option>
                <option value={50}>50 条</option>
              </select>
            </label>
            <button type="button" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)} className="h-8 px-3 border border-[var(--ty-border-color)] rounded-ty-sm disabled:text-[var(--ty-font-placeholder-color)] disabled:bg-[var(--ty-fill-color)]">上一页</button>
            <span>{currentPage} / {totalPages}</span>
            <button type="button" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)} className="h-8 px-3 border border-[var(--ty-border-color)] rounded-ty-sm disabled:text-[var(--ty-font-placeholder-color)] disabled:bg-[var(--ty-fill-color)]">下一页</button>
          </div>
        </div>
      </section>

      {detailLog?.issues?.length ? (
        <div
          className="fixed inset-0 z-50 bg-ty-overlay flex items-center justify-center p-6"
          role="presentation"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setDetailLogId(null); }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="ingestion-error-title"
            className="w-[min(880px,calc(100vw-48px))] max-h-[calc(100dvh-48px)] bg-[var(--ty-fill-white-color)] rounded-ty-sm shadow-ty-lg flex flex-col overflow-hidden"
          >
            <header className="px-5 py-4 border-b border-[var(--ty-border-light-color)] flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-[var(--ty-orange-color)]" />
                  <h2 id="ingestion-error-title" className="text-ty-md font-semibold">失败明细</h2>
                </div>
                <p className="text-ty-xs text-[var(--ty-font-sub-color)] mt-1">{detailLog.id} · {detailLog.startedAt}</p>
              </div>
              <button type="button" aria-label="关闭失败明细" onClick={() => setDetailLogId(null)} className="p-1.5 text-[var(--ty-icon-color)] hover:bg-[var(--ty-fill-color)] rounded-ty-sm"><X className="w-5 h-5" /></button>
            </header>
            <div className="p-5 overflow-y-auto min-h-0 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  ['读取', detailLog.readCount ?? '待获取'],
                  ['写入', detailLog.writtenCount ?? '待获取'],
                  ['失败记录', detailLog.failedCount ?? '待获取'],
                  ['异常类型', detailLog.issues.length],
                ].map(([label, value]) => (
                  <div key={label} className="p-3 bg-[var(--ty-fill-color)] border border-[var(--ty-border-light-color)] rounded-ty-sm">
                    <span className="text-ty-xs text-[var(--ty-font-sub-color)] block">{label}</span>
                    <strong className="text-ty-lg mt-1 block">{value}</strong>
                  </div>
                ))}
              </div>
              <div className="overflow-x-auto border border-[var(--ty-border-color)] rounded-ty-sm">
                <table className="w-full min-w-[720px] text-left text-ty-xs border-collapse">
                  <thead><tr className="bg-[var(--ty-fill-color)] text-[var(--ty-font-sub-color)]"><th className="px-4 py-2.5 font-medium">异常类型</th><th className="px-4 py-2.5 font-medium">失败记录</th><th className="px-4 py-2.5 font-medium">异常说明</th><th className="px-4 py-2.5 font-medium">示例对象标识</th></tr></thead>
                  <tbody>{detailLog.issues.map((issue) => (
                    <tr key={issue.code} className="border-t border-[var(--ty-border-light-color)] align-top">
                      <td className="px-4 py-3"><strong className="block">{issue.name}</strong><code className="text-[var(--ty-font-sub-color)] mt-1 block">{issue.code}</code></td>
                      <td className="px-4 py-3 font-mono text-[var(--ty-red-color)]">{issue.failedCount}</td>
                      <td className="px-4 py-3">{issue.description}</td>
                      <td className="px-4 py-3 font-mono">{issue.exampleObjectIds?.join('、') || '—'}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
            <footer className="px-5 py-3 border-t border-[var(--ty-border-light-color)] flex flex-wrap items-center justify-between gap-3">
              <span className="text-ty-xs text-[var(--ty-font-sub-color)]">追踪标识：<code className="inline">{detailLog.traceId || '待获取'}</code></span>
              <button type="button" onClick={() => setDetailLogId(null)} className="h-8 px-4 border border-[var(--ty-border-color)] rounded-ty-sm text-ty-xs hover:bg-[var(--ty-fill-color)]">关闭</button>
            </footer>
          </section>
        </div>
      ) : null}
    </div>
  );
}
