import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, DatabaseZap, Eye, RotateCcw, Search, X } from 'lucide-react';
import { IngestionStatus, SourceIngestionLog, ingestionStatusLabel, initialSourceIngestionLogs } from '../data/sourceIngestionLogs';
import { formatCompactNumber, paginateRows, TablePagination } from './ui/TablePagination';
import { HelpTooltip } from './ui/HelpTooltip';
import { ManualRefreshControl } from './ui/ManualRefreshControl';

const statusClass: Record<IngestionStatus, string> = {
  SUCCESS: 'bg-[var(--ty-green-lightest-color)] text-[var(--ty-green-color)] border-[var(--ty-green-color)]/30',
  FAILED: 'bg-[var(--ty-red-lightest-color)] text-[var(--ty-red-color)] border-[var(--ty-red-color)]/30',
};
const rootName: Record<string, string> = { PART: '零部件', DOCUMENT: '文档', PROCESS: '工艺路线' };
type LogPeriod = '1H' | '24H' | '7D' | '30D' | '90D' | 'CUSTOM';
const periodHours: Record<Exclude<LogPeriod, 'CUSTOM'>, number> = {
  '1H': 1,
  '24H': 24,
  '7D': 24 * 7,
  '30D': 24 * 30,
  '90D': 24 * 90,
};
const periodLabel: Record<LogPeriod, string> = {
  '1H': '近 1 小时',
  '24H': '近 24 小时',
  '7D': '近 7 天',
  '30D': '近 30 天',
  '90D': '近 90 天',
  'CUSTOM': '自定义范围',
};
const toTimestamp = (value: string) => Date.parse(value.replace(' ', 'T'));

export function SourceIngestionLogView({ logs = initialSourceIngestionLogs, initialRootTypeFilter = 'ALL' }: { logs?: SourceIngestionLog[]; initialRootTypeFilter?: string }) {
  const [rootType, setRootType] = useState(initialRootTypeFilter);
  const [period, setPeriod] = useState<LogPeriod>('24H');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [status, setStatus] = useState<'ALL' | IngestionStatus>('ALL');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [detailId, setDetailId] = useState<string | null>(null);
  const rootTypeCodes = useMemo(() => Array.from(new Set([
    ...(initialRootTypeFilter !== 'ALL' ? [initialRootTypeFilter] : []),
    ...logs.map((row) => row.rootTypeCode),
  ])), [logs, initialRootTypeFilter]);
  const scoped = useMemo(() => logs.filter((row) => rootType === 'ALL' || row.rootTypeCode === rootType), [logs, rootType]);
  const customTimeError = useMemo(() => {
    if (period !== 'CUSTOM') return '';
    if (!customStart || !customEnd) return '请选择完整的开始时间和结束时间。';
    const startAt = Date.parse(customStart);
    const endAt = Date.parse(customEnd);
    if (!Number.isFinite(startAt) || !Number.isFinite(endAt)) return '时间格式无效，请重新选择。';
    if (startAt > endAt) return '开始时间不能晚于结束时间。';
    if (endAt - startAt > periodHours['90D'] * 60 * 60 * 1000) return '在线日志单次最多查询 90 天；更早记录请从归档日志查询。';
    return '';
  }, [period, customStart, customEnd]);
  const periodRows = useMemo(() => {
    if (!scoped.length) return [];
    const latestTimestamp = Math.max(...scoped.map((row) => toTimestamp(row.receivedAt)).filter(Number.isFinite));
    if (!Number.isFinite(latestTimestamp)) return scoped;
    if (period === 'CUSTOM') {
      if (customTimeError) return [];
      const customStartAt = Date.parse(customStart);
      const customEndAt = Date.parse(customEnd);
      return scoped.filter((row) => {
        const timestamp = toTimestamp(row.receivedAt);
        return !Number.isFinite(timestamp) || (timestamp >= customStartAt && timestamp <= customEndAt);
      });
    }
    const periodStart = latestTimestamp - periodHours[period] * 60 * 60 * 1000;
    return scoped.filter((row) => {
      const timestamp = toTimestamp(row.receivedAt);
      return !Number.isFinite(timestamp) || timestamp >= periodStart;
    });
  }, [scoped, period, customStart, customEnd, customTimeError]);
  const visible = useMemo(() => periodRows.filter((row) => {
    if (status !== 'ALL' && row.status !== status) return false;
    const term = keyword.trim().toLowerCase();
    return !term || [row.id, row.objectId, row.sourceTable, row.stagingTable, row.errorCode, row.errorSummary, row.traceId].some((value) => value?.toLowerCase().includes(term));
  }), [periodRows, status, keyword]);
  const counts = (target: IngestionStatus) => periodRows.filter((row) => row.status === target).length;
  const latestProcessedAt = periodRows.map((row) => row.processedAt).sort((a, b) => b.localeCompare(a))[0] || '—';
  const { currentPage, rows } = paginateRows<SourceIngestionLog>(visible, page, pageSize);
  const detail = logs.find((row) => row.id === detailId);
  useEffect(() => {
    if (!detailId) return;
    const close = (event: KeyboardEvent) => event.key === 'Escape' && setDetailId(null);
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [detailId]);

  return <div className="min-w-0 space-y-4">
    <header className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm px-4 py-3 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <DatabaseZap className="w-5 h-5 text-[var(--ty-primary-color)]" />
        <h1 className="text-ty-xl font-semibold">中间表写入日志</h1>
        <HelpTooltip label="查看中间表写入日志说明" content="查看上游中间件已经产生的写入结果。部署时选择接口或固定文件一种接入方式；日志支持近 90 天在线查询，超过 90 天转归档并保留 1 年。本系统只负责发现与定位。" />
        <span className="text-ty-2xs min-h-6 px-2 inline-flex items-center rounded-ty-xs bg-[var(--ty-fill-color)] text-[var(--ty-font-sub-color)] border border-[var(--ty-border-color)]">PLM → 中间表</span>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-ty-xs text-[var(--ty-font-sub-color)]">结果日志 · 只读</span>
        <ManualRefreshControl ariaLabel="刷新中间表写入日志" />
      </div>
    </header>

    <section className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      {[
        { label: `${periodLabel[period]}写入`, value: formatCompactNumber(periodRows.length), exact: periodRows.length.toLocaleString('zh-CN'), icon: <DatabaseZap className="w-4 h-4" /> },
        { label: '写入成功', value: formatCompactNumber(counts('SUCCESS')), exact: counts('SUCCESS').toLocaleString('zh-CN'), icon: <CheckCircle2 className="w-4 h-4" /> },
        { label: '写入失败', value: formatCompactNumber(counts('FAILED')), exact: counts('FAILED').toLocaleString('zh-CN'), icon: <AlertTriangle className="w-4 h-4" /> },
        { label: '最近写入时间', value: latestProcessedAt, exact: latestProcessedAt, icon: <Clock3 className="w-4 h-4" />, time: true },
      ].map((metric) => <div key={metric.label} className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-4 flex items-center justify-between gap-2"><div className="min-w-0"><span className="text-ty-xs text-[var(--ty-font-sub-color)] block">{metric.label}</span><strong className={`${metric.time ? 'text-ty-xs' : 'text-ty-xl'} mt-0.5 block font-mono truncate`} title={metric.exact}>{metric.value}</strong></div><div className="shrink-0 w-9 h-9 rounded-ty-sm bg-[var(--ty-fill-color)] text-[var(--ty-font-sub-color)] flex items-center justify-center">{metric.icon}</div></div>)}
    </section>

    <section className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-3 flex flex-wrap items-end gap-3">
      <label className="text-ty-xs text-[var(--ty-font-sub-color)] space-y-1"><span className="block">对象类型</span><select aria-label="中间表写入日志对象类型" value={rootType} onChange={(e) => { setRootType(e.target.value); setPage(1); }} className="h-8 min-w-36 px-3 border border-[var(--ty-border-color)] rounded-ty-sm bg-[var(--ty-fill-white-color)]"><option value="ALL">全部类型</option>{rootTypeCodes.map(code => <option key={code} value={code}>{rootName[code] || code}</option>)}</select></label>
      <label className="text-ty-xs text-[var(--ty-font-sub-color)] space-y-1"><span className="block">时间范围</span><select aria-label="中间表写入日志时间范围" value={period} onChange={(e) => { setPeriod(e.target.value as LogPeriod); setPage(1); }} className="h-8 min-w-36 px-3 border border-[var(--ty-border-color)] rounded-ty-sm bg-[var(--ty-fill-white-color)]"><option value="1H">最近 1 小时</option><option value="24H">最近 24 小时</option><option value="7D">最近 7 天</option><option value="30D">最近 30 天</option><option value="90D">最近 90 天</option><option value="CUSTOM">自定义时间</option></select></label>
      {period === 'CUSTOM' && <>
        <label className="text-ty-xs text-[var(--ty-font-sub-color)] space-y-1"><span className="block">开始时间</span><input type="datetime-local" aria-label="日志开始时间" value={customStart} onChange={(e) => { setCustomStart(e.target.value); setPage(1); }} className="h-8 px-3 border border-[var(--ty-border-color)] rounded-ty-sm bg-[var(--ty-fill-white-color)]" /></label>
        <label className="text-ty-xs text-[var(--ty-font-sub-color)] space-y-1"><span className="block">结束时间</span><input type="datetime-local" aria-label="日志结束时间" value={customEnd} onChange={(e) => { setCustomEnd(e.target.value); setPage(1); }} className="h-8 px-3 border border-[var(--ty-border-color)] rounded-ty-sm bg-[var(--ty-fill-white-color)]" /></label>
      </>}
      <label className="text-ty-xs text-[var(--ty-font-sub-color)] space-y-1"><span className="block">写入结果</span><select aria-label="中间表写入日志状态" value={status} onChange={(e) => { setStatus(e.target.value as 'ALL' | IngestionStatus); setPage(1); }} className="h-8 min-w-36 px-3 border border-[var(--ty-border-color)] rounded-ty-sm bg-[var(--ty-fill-white-color)]"><option value="ALL">全部结果</option>{Object.entries(ingestionStatusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="text-ty-xs text-[var(--ty-font-sub-color)] space-y-1 flex-1 min-w-56"><span className="block">消息 / 对象 / 表 / 异常</span><span className="relative block"><Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5" /><input aria-label="搜索中间表写入日志" value={keyword} onChange={(e) => { setKeyword(e.target.value); setPage(1); }} placeholder="输入关键字" className="h-8 w-full pl-8 pr-2 border border-[var(--ty-border-color)] rounded-ty-sm" /></span></label>
      <button type="button" onClick={() => { setRootType('ALL'); setPeriod('24H'); setCustomStart(''); setCustomEnd(''); setStatus('ALL'); setKeyword(''); setPage(1); }} className="h-8 px-3 border border-[var(--ty-border-color)] rounded-ty-sm text-ty-xs flex items-center gap-2 hover:bg-[var(--ty-fill-weak-dark-color)]"><RotateCcw className="w-3.5 h-3.5" />重置</button>
      {customTimeError && <p role="alert" className="basis-full text-ty-xs text-[var(--ty-red-color)]">{customTimeError}</p>}
    </section>

    <section className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--ty-border-color)] flex justify-between"><div><h2 className="text-ty-sm font-semibold">写入日志</h2><p className="text-ty-xs text-[var(--ty-font-sub-color)] mt-1">共 {visible.length} 条，每条记录均为上游中间件已经返回的写入结果。</p></div></div>
      <div className="overflow-x-auto"><table className="ty-data-table w-full min-w-[1480px] text-ty-xs"><thead className="bg-[var(--ty-fill-weak-dark-color)] text-[var(--ty-font-sub-color)]"><tr><th className="w-12 px-3 py-2 text-center">序号</th><th className="px-3 py-2 text-left">消息 ID</th><th className="px-3 py-2 text-left">接收时间</th><th className="px-3 py-2 text-left">对象 ID</th><th className="px-3 py-2 text-left">对象类型</th><th className="px-3 py-2 text-left">来源表</th><th className="px-3 py-2 text-left">中间表</th><th className="px-3 py-2 text-left">状态</th><th className="px-3 py-2 text-left">写入时间</th><th className="px-3 py-2 text-left">结果摘要</th><th className="px-3 py-2 text-center sticky right-0 bg-[var(--ty-fill-weak-dark-color)]">操作</th></tr></thead>
      <tbody className="divide-y divide-[var(--ty-border-light-color)]">{rows.map((row, index) => <tr key={row.id} className="hover:bg-[var(--ty-fill-weak-dark-color)]/50"><td className="px-3 py-2 text-center text-[var(--ty-font-sub-color)]">{(currentPage - 1) * pageSize + index + 1}</td><td className="px-3 py-2 font-mono font-semibold whitespace-nowrap">{row.id}</td><td className="px-3 py-2 font-mono text-[var(--ty-font-sub-color)] whitespace-nowrap">{row.receivedAt}</td><td className="px-3 py-2 font-mono font-semibold whitespace-nowrap">{row.objectId}</td><td className="px-3 py-2">{rootName[row.rootTypeCode] || row.rootTypeCode}</td><td className="px-3 py-2 whitespace-nowrap">{row.sourceSystemName} · {row.sourceTable}</td><td className="px-3 py-2 font-mono whitespace-nowrap">{row.stagingTable}</td><td className="px-3 py-2"><span className={`min-h-6 px-2 inline-flex items-center rounded-ty-xs border font-medium ${statusClass[row.status]}`}>{ingestionStatusLabel[row.status]}</span></td><td className="px-3 py-2 font-mono text-[var(--ty-font-sub-color)] whitespace-nowrap">{row.processedAt}</td><td className="px-3 py-2"><span className={`${row.status === 'FAILED' ? 'text-[var(--ty-red-color)]' : 'text-[var(--ty-font-sub-color)]'} block max-w-72 truncate`} aria-label={row.errorSummary || '已写入中间表'}>{row.errorSummary || '已写入中间表'}</span></td><td className="px-3 py-2 text-center sticky right-0 bg-[var(--ty-fill-white-color)]"><button type="button" onClick={() => setDetailId(row.id)} className="h-8 min-w-16 px-2 text-[var(--ty-primary-color)] inline-flex items-center justify-center gap-1 hover:bg-[var(--ty-primary-lightest-color)] rounded-ty-sm"><Eye className="w-3.5 h-3.5" />详情</button></td></tr>)}</tbody></table></div>
      {!rows.length && <div className="p-10 text-center text-ty-xs text-[var(--ty-font-sub-color)]">{customTimeError || '当前条件下暂无写入日志'}</div>}
      <TablePagination total={visible.length} page={currentPage} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
    </section>

    {detail && <div className="fixed inset-0 z-50 bg-ty-overlay flex items-center justify-center px-4 py-[60px]" onMouseDown={(e) => e.target === e.currentTarget && setDetailId(null)}><section role="dialog" aria-modal="true" aria-label="中间表写入日志详情" className="w-[min(640px,calc(100vw-32px))] max-h-[calc(100dvh-120px)] flex flex-col bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-lg shadow-ty-lg overflow-hidden"><header className="px-4 py-3 bg-[var(--ty-fill-weak-dark-color)] border-b flex justify-between items-center shrink-0"><div><h2 className="text-ty-lg font-semibold">{detail.objectId} · 写入详情</h2><p className="text-ty-xs text-[var(--ty-font-sub-color)] mt-1 font-mono">{detail.id}</p></div><button aria-label="关闭详情" onClick={() => setDetailId(null)} className="w-8 h-8 flex items-center justify-center rounded-ty-sm hover:bg-[var(--ty-fill-color)]"><X className="w-4 h-4" /></button></header><div className="p-4 grid grid-cols-2 gap-4 text-ty-xs overflow-y-auto"><div><span className="text-[var(--ty-font-sub-color)] block">对象类型</span><strong>{rootName[detail.rootTypeCode] || detail.rootTypeCode}</strong></div><div><span className="text-[var(--ty-font-sub-color)] block">状态</span><strong>{ingestionStatusLabel[detail.status]}</strong></div><div><span className="text-[var(--ty-font-sub-color)] block">来源</span><strong>{detail.sourceTable}</strong></div><div><span className="text-[var(--ty-font-sub-color)] block">中间表</span><strong>{detail.stagingTable}</strong></div><div><span className="text-[var(--ty-font-sub-color)] block">接收时间</span><strong className="font-mono">{detail.receivedAt}</strong></div><div><span className="text-[var(--ty-font-sub-color)] block">写入时间</span><strong className="font-mono">{detail.processedAt}</strong></div><div className="col-span-2"><span className="text-[var(--ty-font-sub-color)] block">追踪编号</span><strong className="font-mono">{detail.traceId}</strong></div>{detail.errorSummary && <div className="col-span-2 p-3 rounded-ty-sm bg-[var(--ty-red-lightest-color)] border border-[var(--ty-red-color)]/30"><strong className="text-[var(--ty-red-color)]">{detail.errorCode}</strong><p className="mt-1">{detail.errorSummary}</p><p className="mt-2 text-[var(--ty-font-sub-color)]">本系统只负责发现与定位，请将追踪编号反馈给源端责任方处理。</p></div>}</div><footer className="px-4 py-3 bg-[var(--ty-fill-weak-dark-color)] border-t flex justify-end shrink-0"><button className="h-8 px-4 border border-[var(--ty-border-color)] rounded-ty-sm bg-[var(--ty-fill-white-color)]" onClick={() => setDetailId(null)}>关闭</button></footer></section></div>}
  </div>;
}
