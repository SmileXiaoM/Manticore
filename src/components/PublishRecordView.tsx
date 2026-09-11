import React, { useMemo, useState } from 'react';
import { CheckCircle2, ChevronRight, Eye, History, RotateCcw, Search, X, XCircle } from 'lucide-react';
import { ChangeRecord } from '../types';
import { softTypeOptions } from '../data';
import { paginateRows, TablePagination } from './ui/TablePagination';
import { HelpTooltip } from './ui/HelpTooltip';
import { ManualRefreshControl } from './ui/ManualRefreshControl';

interface PublishRecordViewProps { changeRecords: ChangeRecord[]; }

export const PublishRecordView: React.FC<PublishRecordViewProps> = ({ changeRecords }) => {
  const [groupValue, setGroupValue] = useState('ALL');
  const [operation, setOperation] = useState('ALL');
  const [result, setResult] = useState('ALL');
  const [keyword, setKeyword] = useState('');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const partGroups = softTypeOptions.filter(item => item.rootTypeId === 'PART');
  const filteredRecords = useMemo(() => changeRecords.filter(record => {
    if (groupValue !== 'ALL' && record.groupValueId !== groupValue && !record.objectType.includes(groupValue)) return false;
    if (operation !== 'ALL' && record.operationType !== operation) return false;
    if (result !== 'ALL' && record.result !== result) return false;
    const term = keyword.trim().toLowerCase();
    return !term || [record.id, record.objectType, record.groupValueName, record.configVersion, record.summary, record.operator, record.failureReason]
      .some(value => value?.toLowerCase().includes(term));
  }), [changeRecords, groupValue, keyword, operation, result]);
  const { currentPage, rows } = paginateRows<ChangeRecord>(filteredRecords, page, pageSize);
  const detail = changeRecords.find(record => record.id === detailId);
  const reset = () => { setGroupValue('ALL'); setOperation('ALL'); setResult('ALL'); setKeyword(''); setPage(1); };

  return <div className="space-y-4" id="publish-record-view-container">
    <header className="bg-[var(--ty-fill-white-color)] rounded-ty-sm border border-[var(--ty-border-color)] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
      <div>
        <div className="flex items-center gap-2 text-ty-2xs text-[var(--ty-font-sub-light-color)] mb-1"><span>相似度配置</span><ChevronRight className="w-3 h-3" /><span className="text-[var(--ty-font-main-color)] font-medium">变更记录</span></div>
        <div className="flex flex-wrap items-center gap-2"><History className="w-5 h-5 text-[var(--ty-primary-color)]" /><h1 className="text-ty-xl font-semibold">配置变更审计历史</h1><HelpTooltip label="查看配置变更审计历史说明" content="追溯零部件各分组属性值下相似度配置的保存、启用、停用、失败原因及变更前后摘要。" /></div>
      </div>
      <ManualRefreshControl ariaLabel="刷新配置变更记录" />
    </header>

    <section className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-3 flex flex-wrap items-end gap-3">
      <label className="text-ty-xs text-[var(--ty-font-sub-color)] space-y-1"><span className="block">分组属性值</span><select value={groupValue} onChange={event => { setGroupValue(event.target.value); setPage(1); }} className="h-8 min-w-40 px-3 border border-[var(--ty-border-color)] rounded-ty-sm bg-white"><option value="ALL">全部分组值</option>{partGroups.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="text-ty-xs text-[var(--ty-font-sub-color)] space-y-1"><span className="block">操作类型</span><select value={operation} onChange={event => { setOperation(event.target.value); setPage(1); }} className="h-8 min-w-32 px-3 border border-[var(--ty-border-color)] rounded-ty-sm bg-white"><option value="ALL">全部操作</option><option value="保存">保存</option><option value="启用">启用</option><option value="停用">停用</option></select></label>
      <label className="text-ty-xs text-[var(--ty-font-sub-color)] space-y-1"><span className="block">执行结果</span><select value={result} onChange={event => { setResult(event.target.value); setPage(1); }} className="h-8 min-w-32 px-3 border border-[var(--ty-border-color)] rounded-ty-sm bg-white"><option value="ALL">全部结果</option><option value="SUCCESS">成功</option><option value="FAILED">失败</option></select></label>
      <label className="text-ty-xs text-[var(--ty-font-sub-color)] space-y-1 flex-1 min-w-56"><span className="block">记录 / 版本 / 摘要 / 操作人</span><span className="relative block"><Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5" /><input value={keyword} onChange={event => { setKeyword(event.target.value); setPage(1); }} placeholder="输入关键字" className="h-8 w-full pl-8 pr-2 border border-[var(--ty-border-color)] rounded-ty-sm" /></span></label>
      <button type="button" onClick={reset} className="h-8 px-3 border border-[var(--ty-border-color)] rounded-ty-sm text-ty-xs inline-flex items-center gap-2 hover:bg-[var(--ty-fill-weak-dark-color)]"><RotateCcw className="w-3.5 h-3.5" />重置</button>
    </section>

    <section className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--ty-border-color)]"><h2 className="text-ty-sm font-semibold">变更记录</h2><p className="mt-1 text-ty-xs text-[var(--ty-font-sub-color)]">共 {filteredRecords.length} 条，只读保留配置变更及执行结果。</p></div>
      <div className="overflow-x-auto"><table className="ty-data-table w-full min-w-[1260px] text-left text-ty-xs"><thead><tr className="bg-[var(--ty-fill-weak-dark-color)] text-[var(--ty-font-sub-color)]"><th className="w-12 px-2 py-2 text-center">序号</th><th className="px-3 py-2">分组属性值</th><th className="px-3 py-2">配置版本</th><th className="px-3 py-2">操作类型</th><th className="px-3 py-2">变更摘要</th><th className="px-3 py-2">操作人</th><th className="px-3 py-2">操作时间</th><th className="px-3 py-2 text-center">结果</th><th className="px-3 py-2 text-center sticky right-0 bg-[var(--ty-fill-weak-dark-color)]">操作</th></tr></thead>
      <tbody className="divide-y divide-[var(--ty-border-light-color)]">{rows.map((record, index) => <tr key={record.id} className="hover:bg-[var(--ty-fill-weak-dark-color)]/50"><td className="px-2 py-3 text-center text-[var(--ty-font-sub-color)]">{(currentPage - 1) * pageSize + index + 1}</td><td className="px-3 py-3"><strong>{record.groupValueName || record.objectType}</strong><span className="block font-mono text-ty-2xs text-[var(--ty-font-sub-color)]">{record.groupValueId || '历史口径'}</span></td><td className="px-3 py-3 font-mono">{record.configVersion}</td><td className="px-3 py-3"><span className="min-h-6 px-2 inline-flex items-center rounded-ty-xs border border-[var(--ty-border-color)] bg-[var(--ty-fill-color)]">{record.operationType}</span></td><td className="px-3 py-3 max-w-96"><span className="block truncate" title={record.summary}>{record.summary}</span></td><td className="px-3 py-3 whitespace-nowrap">{record.operator}</td><td className="px-3 py-3 font-mono whitespace-nowrap text-[var(--ty-font-sub-color)]">{record.time}</td><td className="px-3 py-3 text-center">{record.result === 'SUCCESS' ? <span className="inline-flex items-center gap-1 text-[var(--ty-green-color)]"><CheckCircle2 className="w-3.5 h-3.5" />成功</span> : <span className="inline-flex items-center gap-1 text-[var(--ty-red-color)]"><XCircle className="w-3.5 h-3.5" />失败</span>}</td><td className="px-3 py-3 text-center sticky right-0 bg-[var(--ty-fill-white-color)]"><button type="button" onClick={() => setDetailId(record.id)} className="h-7 px-2 inline-flex items-center gap-1 text-[var(--ty-primary-color)] hover:bg-[var(--ty-primary-lightest-color)] rounded-ty-sm"><Eye className="w-3.5 h-3.5" />详情</button></td></tr>)}</tbody></table></div>
      {!rows.length && <div className="p-10 text-center text-ty-xs text-[var(--ty-font-sub-color)]">当前条件下暂无变更记录</div>}
      <TablePagination total={filteredRecords.length} page={currentPage} pageSize={pageSize} itemLabel="条" onPageChange={setPage} onPageSizeChange={size => { setPageSize(size); setPage(1); }} />
    </section>

    {detail && <div className="fixed inset-0 z-50 bg-ty-overlay flex items-center justify-center p-4" onMouseDown={event => event.target === event.currentTarget && setDetailId(null)}><section role="dialog" aria-modal="true" aria-label="配置变更详情" className="w-[min(640px,calc(100vw-32px))] max-h-[calc(100dvh-120px)] overflow-hidden bg-white border border-[var(--ty-border-color)] rounded-ty-lg shadow-ty-lg"><header className="px-4 py-3 bg-[var(--ty-fill-weak-dark-color)] border-b flex items-center justify-between"><div><h2 className="text-ty-lg font-semibold">配置变更详情</h2><p className="text-ty-xs font-mono text-[var(--ty-font-sub-color)]">{detail.id}</p></div><button aria-label="关闭配置变更详情" onClick={() => setDetailId(null)} className="w-8 h-8 inline-flex items-center justify-center"><X className="w-4 h-4" /></button></header><div className="p-4 overflow-y-auto space-y-4 text-ty-xs"><div className="grid grid-cols-2 gap-4"><div><span className="block text-[var(--ty-font-sub-color)]">对象 / 分组值</span><strong>{detail.objectType}</strong></div><div><span className="block text-[var(--ty-font-sub-color)]">版本 / 结果</span><strong>{detail.configVersion} · {detail.result === 'SUCCESS' ? '成功' : '失败'}</strong></div><div><span className="block text-[var(--ty-font-sub-color)]">操作人</span><strong>{detail.operator}</strong></div><div><span className="block text-[var(--ty-font-sub-color)]">操作时间</span><strong className="font-mono">{detail.time}</strong></div></div><div><span className="block text-[var(--ty-font-sub-color)]">变更摘要</span><p className="mt-1">{detail.summary}</p></div>{(detail.beforeSummary || detail.afterSummary) && <div className="grid grid-cols-2 gap-3"><div className="p-3 rounded-ty-sm bg-[var(--ty-fill-weak-dark-color)] border"><span className="block text-[var(--ty-font-sub-color)]">变更前</span><p className="mt-1">{detail.beforeSummary || '—'}</p></div><div className="p-3 rounded-ty-sm bg-[var(--ty-primary-lightest-color)]/35 border border-[var(--ty-primary-color)]/20"><span className="block text-[var(--ty-font-sub-color)]">变更后</span><p className="mt-1">{detail.afterSummary || '—'}</p></div></div>}{detail.failureReason && <div className="p-3 rounded-ty-sm bg-[var(--ty-red-lightest-color)] border border-[var(--ty-red-color)]/30"><strong className="text-[var(--ty-red-color)]">失败原因</strong><p className="mt-1">{detail.failureReason}</p></div>}</div><footer className="px-4 py-3 bg-[var(--ty-fill-weak-dark-color)] border-t flex justify-end"><button onClick={() => setDetailId(null)} className="h-8 px-4 border border-[var(--ty-border-color)] rounded-ty-sm bg-white">关闭</button></footer></section></div>}
  </div>;
};
