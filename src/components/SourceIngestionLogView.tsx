import { useMemo, useState } from 'react';
import { DatabaseZap, RotateCcw, Search, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
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
  const scopedLogs = useMemo(
    () => logs.filter((log) => rootType === 'ALL' || log.rootTypeCode === rootType),
    [logs, rootType],
  );
  const visible = useMemo(() => scopedLogs.filter((log) => {
    if (status !== 'ALL' && log.status !== status) return false;
    const term = keyword.trim().toLowerCase();
    return !term || [log.id, log.sourceTable, log.stagingTable, log.errorSummary].some((value) => value?.toLowerCase().includes(term));
  }), [scopedLogs, status, keyword]);
  const unresolved = scopedLogs.filter((log) => log.status === 'FAILED' || log.status === 'PARTIAL_SUCCESS').length;

  return (
    <div className="flex-1 min-w-0 flex flex-col h-full overflow-y-auto space-y-4">
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
          <select aria-label="采集日志对象类型" value={rootType} onChange={(event) => setRootType(event.target.value)} className="h-8 min-w-36 px-2.5 border border-[var(--ty-border-color)] rounded-ty-sm bg-[var(--ty-fill-white-color)] text-[var(--ty-font-main-color)]">
            <option value="ALL">全部类型</option>
            <option value="PART">零部件</option>
            <option value="DOCUMENT">文档</option>
            <option value="PROCESS">工艺路线</option>
          </select>
        </label>
        <label className="text-ty-xs text-[var(--ty-font-sub-color)] space-y-1">
          <span className="block">执行状态</span>
          <select aria-label="采集日志状态" value={status} onChange={(event) => setStatus(event.target.value as 'ALL' | IngestionStatus)} className="h-8 min-w-36 px-2.5 border border-[var(--ty-border-color)] rounded-ty-sm bg-[var(--ty-fill-white-color)] text-[var(--ty-font-main-color)]">
            <option value="ALL">全部状态</option>
            {Object.entries(ingestionStatusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="text-ty-xs text-[var(--ty-font-sub-color)] space-y-1 flex-1 min-w-56">
          <span className="block">批次 / 来源表 / 中间表</span>
          <span className="relative block"><Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5" /><input aria-label="搜索采集日志" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="输入关键字" className="h-8 w-full pl-8 pr-2.5 border border-[var(--ty-border-color)] rounded-ty-sm" /></span>
        </label>
        <button type="button" onClick={() => { setRootType('ALL'); setStatus('ALL'); setKeyword(''); }} className="h-8 px-3 border border-[var(--ty-border-color)] rounded-ty-sm text-ty-xs flex items-center gap-1.5 hover:bg-[var(--ty-fill-weak-dark-color)]"><RotateCcw className="w-3.5 h-3.5" />重置</button>
      </div>

      <section className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--ty-border-color)] flex items-center justify-between"><div><h2 className="text-ty-sm font-semibold">采集批次</h2><p className="text-ty-xs text-[var(--ty-font-sub-color)] mt-1">共 {visible.length} 条，日志频率由上游任务决定。</p></div></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-ty-xs border-collapse">
            <thead><tr className="bg-[var(--ty-fill-color)] text-[var(--ty-font-sub-color)]"><th className="px-4 py-2.5 font-medium">批次 / 时间</th><th className="px-4 py-2.5 font-medium">采集链路</th><th className="px-4 py-2.5 font-medium">方式</th><th className="px-4 py-2.5 font-medium">读取 / 写入 / 失败</th><th className="px-4 py-2.5 font-medium">状态</th><th className="px-4 py-2.5 font-medium">异常摘要</th></tr></thead>
            <tbody>{visible.map((log) => (
              <tr key={log.id} className="border-t border-[var(--ty-border-light-color)] align-top">
                <td className="px-4 py-3"><strong className="font-mono block">{log.id}</strong><span className="text-[var(--ty-font-sub-color)] mt-1 block">{log.startedAt}</span></td>
                <td className="px-4 py-3"><strong>{log.sourceSystemName} · {log.sourceTable}</strong><span className="text-[var(--ty-font-sub-color)] mt-1 block">→ {log.stagingTable}</span></td>
                <td className="px-4 py-3">{log.mode === 'FULL' ? '全量' : '增量'}</td>
                <td className="px-4 py-3 font-mono">{log.readCount ?? '待获取'} / {log.writtenCount ?? '待获取'} / {log.failedCount ?? '待获取'}</td>
                <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-ty-xs border ${statusClass[log.status]}`}>{log.status === 'SUCCESS' && <CheckCircle2 className="w-3 h-3" />}{ingestionStatusLabel[log.status]}</span></td>
                <td className="px-4 py-3 max-w-72"><span>{log.errorSummary || '—'}</span>{log.traceId && <code className="text-[var(--ty-font-sub-color)] mt-1 block">{log.traceId}</code>}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        {!visible.length && <div className="p-10 text-center text-ty-xs text-[var(--ty-font-sub-color)]">当前条件下暂无采集日志</div>}
      </section>
    </div>
  );
}
