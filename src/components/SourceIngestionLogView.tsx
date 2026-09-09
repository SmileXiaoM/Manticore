import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, DatabaseZap, Eye, RotateCcw, Search, X } from 'lucide-react';
import { IngestionStatus, SourceIngestionLog, ingestionStatusLabel, initialSourceIngestionLogs } from '../data/sourceIngestionLogs';

const statusClass: Record<IngestionStatus, string> = {
  SUCCESS: 'bg-[var(--ty-green-lightest-color)] text-[var(--ty-green-color)] border-[var(--ty-green-color)]/30',
  FAILED: 'bg-[var(--ty-red-lightest-color)] text-[var(--ty-red-color)] border-[var(--ty-red-color)]/30',
};
const rootName: Record<string, string> = { PART: '零部件', DOCUMENT: '文档', PROCESS: '工艺路线' };

export function SourceIngestionLogView({ logs = initialSourceIngestionLogs, initialRootTypeFilter = 'ALL' }: { logs?: SourceIngestionLog[]; initialRootTypeFilter?: string }) {
  const [rootType, setRootType] = useState(initialRootTypeFilter);
  const [status, setStatus] = useState<'ALL' | IngestionStatus>('ALL');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [detailId, setDetailId] = useState<string | null>(null);
  const scoped = useMemo(() => logs.filter((row) => rootType === 'ALL' || row.rootTypeCode === rootType), [logs, rootType]);
  const visible = useMemo(() => scoped.filter((row) => {
    if (status !== 'ALL' && row.status !== status) return false;
    const term = keyword.trim().toLowerCase();
    return !term || [row.id, row.objectId, row.sourceTable, row.stagingTable, row.errorCode, row.errorSummary, row.traceId].some((value) => value?.toLowerCase().includes(term));
  }), [scoped, status, keyword]);
  const counts = (target: IngestionStatus) => scoped.filter((row) => row.status === target).length;
  const latestProcessedAt = scoped.map((row) => row.processedAt).sort((a, b) => b.localeCompare(a))[0] || '—';
  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const rows = visible.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const detail = logs.find((row) => row.id === detailId);
  useEffect(() => {
    if (!detailId) return;
    const close = (event: KeyboardEvent) => event.key === 'Escape' && setDetailId(null);
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [detailId]);

  return <div className="min-w-0 space-y-4">
    <header className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm px-4 py-3 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2"><DatabaseZap className="w-5 h-5 text-[var(--ty-primary-color)]" /><div><div className="flex items-center gap-2"><h1 className="text-ty-xl font-semibold">中间表写入日志</h1><span className="text-ty-2xs min-h-6 px-2 inline-flex items-center rounded-ty-xs bg-[var(--ty-fill-color)] text-[var(--ty-font-sub-color)] border border-[var(--ty-border-color)]">PLM → 中间表</span></div><p className="mt-1 text-ty-xs text-[var(--ty-font-sub-color)]">查看上游中间件已经产生的写入结果；本系统只负责发现与定位，源端问题由源端责任方处理。</p></div></div>
      <span className="text-ty-xs text-[var(--ty-font-sub-color)]">结果日志 · 只读</span>
    </header>

    <section className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      {[
        ['日志总数', scoped.length, <DatabaseZap className="w-4 h-4" />],
        ['写入成功', counts('SUCCESS'), <CheckCircle2 className="w-4 h-4" />],
        ['写入失败', counts('FAILED'), <AlertTriangle className="w-4 h-4" />],
        ['最近写入时间', latestProcessedAt, <Clock3 className="w-4 h-4" />],
      ].map(([label, value, icon]) => <div key={String(label)} className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-4 flex items-center justify-between gap-2"><div className="min-w-0"><span className="text-ty-xs text-[var(--ty-font-sub-color)] block">{label}</span><strong className={`${label === '最近写入时间' ? 'text-ty-xs' : 'text-ty-xl'} mt-0.5 block font-mono truncate`} title={String(value)}>{value}</strong></div><div className="shrink-0 w-9 h-9 rounded-ty-sm bg-[var(--ty-fill-color)] text-[var(--ty-font-sub-color)] flex items-center justify-center">{icon}</div></div>)}
    </section>

    <section className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-3 flex flex-wrap items-end gap-3">
      <label className="text-ty-xs text-[var(--ty-font-sub-color)] space-y-1"><span className="block">对象类型</span><select aria-label="中间表写入日志对象类型" value={rootType} onChange={(e) => { setRootType(e.target.value); setPage(1); }} className="h-8 min-w-36 px-3 border border-[var(--ty-border-color)] rounded-ty-sm bg-white"><option value="ALL">全部类型</option><option value="PART">零部件</option><option value="DOCUMENT">文档</option><option value="PROCESS">工艺路线</option></select></label>
      <label className="text-ty-xs text-[var(--ty-font-sub-color)] space-y-1"><span className="block">写入结果</span><select aria-label="中间表写入日志状态" value={status} onChange={(e) => { setStatus(e.target.value as 'ALL' | IngestionStatus); setPage(1); }} className="h-8 min-w-36 px-3 border border-[var(--ty-border-color)] rounded-ty-sm bg-white"><option value="ALL">全部结果</option>{Object.entries(ingestionStatusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="text-ty-xs text-[var(--ty-font-sub-color)] space-y-1 flex-1 min-w-56"><span className="block">消息 / 对象 / 表 / 异常</span><span className="relative block"><Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5" /><input aria-label="搜索中间表写入日志" value={keyword} onChange={(e) => { setKeyword(e.target.value); setPage(1); }} placeholder="输入关键字" className="h-8 w-full pl-8 pr-2 border border-[var(--ty-border-color)] rounded-ty-sm" /></span></label>
      <button type="button" onClick={() => { setRootType('ALL'); setStatus('ALL'); setKeyword(''); setPage(1); }} className="h-8 px-3 border border-[var(--ty-border-color)] rounded-ty-sm text-ty-xs flex items-center gap-2 hover:bg-[var(--ty-fill-weak-dark-color)]"><RotateCcw className="w-3.5 h-3.5" />重置</button>
    </section>

    <section className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--ty-border-color)] flex justify-between"><div><h2 className="text-ty-sm font-semibold">写入日志</h2><p className="text-ty-xs text-[var(--ty-font-sub-color)] mt-1">共 {visible.length} 条，每条记录均为上游中间件已经返回的写入结果。</p></div></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[1080px] text-ty-xs"><thead className="bg-[var(--ty-fill-weak-dark-color)] text-[var(--ty-font-sub-color)]"><tr><th className="px-3 py-2 text-left">消息 / 接收时间</th><th className="px-3 py-2 text-left">对象 / 类型</th><th className="px-3 py-2 text-left">写入链路</th><th className="px-3 py-2 text-left">状态</th><th className="px-3 py-2 text-left">写入时间</th><th className="px-3 py-2 text-left">结果摘要</th><th className="px-3 py-2 text-center">操作</th></tr></thead>
      <tbody className="divide-y divide-[var(--ty-border-light-color)]">{rows.map((row) => <tr key={row.id} className="hover:bg-[var(--ty-fill-weak-dark-color)]/50"><td className="px-3 py-2"><strong className="font-mono">{row.id}</strong><span className="block text-[var(--ty-font-sub-color)] mt-1">{row.receivedAt}</span></td><td className="px-3 py-2"><strong>{row.objectId}</strong><span className="block text-[var(--ty-font-sub-color)] mt-1">{rootName[row.rootTypeCode]}</span></td><td className="px-3 py-2"><span>{row.sourceSystemName} · {row.sourceTable}</span><span className="block text-[var(--ty-font-sub-color)] mt-1">→ {row.stagingTable}</span></td><td className="px-3 py-2"><span className={`min-h-6 px-2 inline-flex items-center rounded-ty-xs border font-medium ${statusClass[row.status]}`}>{ingestionStatusLabel[row.status]}</span></td><td className="px-3 py-2 font-mono text-[var(--ty-font-sub-color)]">{row.processedAt}</td><td className="px-3 py-2"><span className={row.status === 'FAILED' ? 'text-[var(--ty-red-color)]' : 'text-[var(--ty-font-sub-color)]'}>{row.errorSummary || '已写入中间表'}</span></td><td className="px-3 py-2 text-center"><button type="button" onClick={() => setDetailId(row.id)} className="h-8 px-2 text-[var(--ty-primary-color)] inline-flex items-center gap-1 hover:underline"><Eye className="w-3.5 h-3.5" />详情</button></td></tr>)}</tbody></table></div>
      {!rows.length && <div className="p-10 text-center text-ty-xs text-[var(--ty-font-sub-color)]">当前条件下暂无消息</div>}
      <div className="px-4 py-3 border-t border-[var(--ty-border-color)] flex flex-wrap items-center justify-between gap-3 text-ty-xs text-[var(--ty-font-sub-color)]"><span>第 {visible.length ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, visible.length)} 条 / 共 {visible.length} 条</span><div className="flex items-center gap-2"><select aria-label="每页条数" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="h-8 border border-[var(--ty-border-color)] rounded-ty-sm px-2 bg-white"><option value={10}>10 条/页</option><option value={20}>20 条/页</option></select><button className="h-8 px-3 border rounded-ty-sm disabled:opacity-40" disabled={currentPage <= 1} onClick={() => setPage((p) => p - 1)}>上一页</button><span>{currentPage} / {totalPages}</span><button className="h-8 px-3 border rounded-ty-sm disabled:opacity-40" disabled={currentPage >= totalPages} onClick={() => setPage((p) => p + 1)}>下一页</button></div></div>
    </section>

    {detail && <div className="fixed inset-0 z-50 bg-ty-overlay flex items-center justify-center p-4" onMouseDown={(e) => e.target === e.currentTarget && setDetailId(null)}><section role="dialog" aria-modal="true" aria-label="中间表写入日志详情" className="w-[min(640px,calc(100vw-32px))] bg-white border border-[var(--ty-border-color)] rounded-ty-lg shadow-ty-lg overflow-hidden"><header className="px-4 py-3 bg-[var(--ty-fill-weak-dark-color)] border-b flex justify-between items-center"><div><h2 className="text-ty-lg font-semibold">{detail.objectId} · 写入详情</h2><p className="text-ty-xs text-[var(--ty-font-sub-color)] mt-1 font-mono">{detail.id}</p></div><button aria-label="关闭详情" onClick={() => setDetailId(null)} className="w-8 h-8 flex items-center justify-center rounded-ty-sm hover:bg-[var(--ty-fill-color)]"><X className="w-4 h-4" /></button></header><div className="p-4 grid grid-cols-2 gap-4 text-ty-xs"><div><span className="text-[var(--ty-font-sub-color)] block">对象类型</span><strong>{rootName[detail.rootTypeCode]}</strong></div><div><span className="text-[var(--ty-font-sub-color)] block">状态</span><strong>{ingestionStatusLabel[detail.status]}</strong></div><div><span className="text-[var(--ty-font-sub-color)] block">来源</span><strong>{detail.sourceTable}</strong></div><div><span className="text-[var(--ty-font-sub-color)] block">中间表</span><strong>{detail.stagingTable}</strong></div><div><span className="text-[var(--ty-font-sub-color)] block">接收时间</span><strong className="font-mono">{detail.receivedAt}</strong></div><div><span className="text-[var(--ty-font-sub-color)] block">写入时间</span><strong className="font-mono">{detail.processedAt}</strong></div><div className="col-span-2"><span className="text-[var(--ty-font-sub-color)] block">追踪编号</span><strong className="font-mono">{detail.traceId}</strong></div>{detail.errorSummary && <div className="col-span-2 p-3 rounded-ty-sm bg-[var(--ty-red-lightest-color)] border border-[var(--ty-red-color)]/30"><strong className="text-[var(--ty-red-color)]">{detail.errorCode}</strong><p className="mt-1">{detail.errorSummary}</p><p className="mt-2 text-[var(--ty-font-sub-color)]">本系统只负责发现与定位，请将追踪编号反馈给源端责任方处理。</p></div>}</div><footer className="px-4 py-3 bg-[var(--ty-fill-weak-dark-color)] border-t flex justify-end"><button className="h-8 px-4 border border-[var(--ty-border-color)] rounded-ty-sm bg-white" onClick={() => setDetailId(null)}>关闭</button></footer></section></div>}
  </div>;
}
