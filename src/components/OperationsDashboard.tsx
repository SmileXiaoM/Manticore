import { useState } from 'react';
import { ArrowUpRight, Database, FileCheck2, ScrollText, Server } from 'lucide-react';
import { MappingObjectType } from '../stage1MappingTypes';
import { ConsistencyBatchRecord } from '../types/consistencyCheck';
import { ExecutionSchedule, scheduleLabel } from '../data/operations';
import { SourceIngestionLog } from '../data/sourceIngestionLogs';
import { TargetSyncRecord } from '../data/targetSyncRecords';

const rootName: Record<string, string> = { PART: '零部件', DOCUMENT: '文档', PROCESS: '工艺路线' };
export function OperationsDashboard({ roots, checks, ingestionLogs, syncRecords, schedules, onIngestion, onSync, onCheck, onPresence }: {
  roots: MappingObjectType[];
  checks: ConsistencyBatchRecord[];
  ingestionLogs: SourceIngestionLog[];
  syncRecords: TargetSyncRecord[];
  schedules: ExecutionSchedule[];
  onIngestion: (root?: string) => void;
  onSync: (root?: string) => void;
  onCheck: (root?: string) => void;
  onPresence: (root?: string) => void;
}) {
  const [filter, setFilter] = useState('ALL');
  const selected = filter === 'ALL' ? undefined : filter;
  const shownRoots = roots.filter((root) => !selected || root.id === selected);
  const rootIds = new Set(shownRoots.map((root) => root.id));
  const sourceRows = ingestionLogs.filter((row) => rootIds.has(row.rootTypeCode));
  const targetRows = syncRecords.filter((row) => rootIds.has(row.rootTypeCode));
  const scopedChecks = checks.filter((row) => rootIds.has(row.rootTypeCode));
  const sourceBacklog = sourceRows.filter((row) => row.status === 'PENDING' || row.status === 'PROCESSING').length;
  const targetBacklog = targetRows.filter((row) => row.status === 'PENDING' || row.status === 'PROCESSING').length;
  const targetCount = shownRoots.reduce((sum, root) => sum + (root.manticoreDocCount || 0), 0);
  const issueObjects = scopedChecks.reduce((sum, row) => sum + row.differenceCount + row.pendingRecheckCount + row.incompleteCount, 0);

  const cards = [
    { label: '中间表写入队列', value: sourceBacklog, note: `待写入 ${sourceRows.filter((r) => r.status === 'PENDING').length} · 失败 ${sourceRows.filter((r) => r.status === 'FAILED').length}`, icon: <ScrollText className="w-4 h-4" />, action: () => onIngestion(selected) },
    { label: 'Manticore 同步队列', value: targetBacklog, note: `待处理 ${targetRows.filter((r) => r.status === 'PENDING').length} · 失败 ${targetRows.filter((r) => r.status === 'FAILED').length}`, icon: <Server className="w-4 h-4" />, action: () => onSync(selected) },
    { label: '一致性问题对象', value: issueObjects, note: `核验记录 ${scopedChecks.length} · 任务失败 ${scopedChecks.filter((r) => r.status === 'FAILED').length}`, icon: <FileCheck2 className="w-4 h-4" />, action: () => onCheck(selected) },
    { label: 'Manticore 数据', value: targetCount.toLocaleString(), note: '当前目标索引记录数', icon: <Database className="w-4 h-4" />, action: () => onPresence(selected) },
  ];

  return <div className="min-w-0 space-y-4">
    <header className="bg-white border border-[var(--ty-border-color)] rounded-ty-sm px-4 py-3 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><FileCheck2 className="w-5 h-5 text-[var(--ty-primary-color)]" /><div><div className="flex items-center gap-2"><h1 className="text-ty-xl font-semibold">Manticore 运行看板</h1><span className="text-ty-2xs min-h-6 px-2 inline-flex items-center rounded-ty-xs bg-[var(--ty-fill-color)] text-[var(--ty-font-sub-color)] border border-[var(--ty-border-color)]">多类型总览</span></div><p className="text-ty-xs text-[var(--ty-font-sub-color)] mt-1">统一查看两条数据队列、一致性核验与目标索引现状。</p></div></div><span className="min-h-6 px-2 inline-flex items-center rounded-ty-xs bg-[var(--ty-green-lightest-color)] text-[var(--ty-green-color)] border border-[var(--ty-green-color)]/30 text-ty-xs"><Server className="w-3.5 h-3.5 mr-1" />同步服务运行中</span></header>
    <section className="bg-white border border-[var(--ty-border-color)] rounded-ty-sm p-3"><label className="text-ty-xs text-[var(--ty-font-sub-color)] flex items-center gap-2">对象类型<select aria-label="看板对象类型" value={filter} onChange={(e) => setFilter(e.target.value)} className="h-8 min-w-40 px-3 border border-[var(--ty-border-color)] rounded-ty-sm bg-white text-[var(--ty-font-main-color)]"><option value="ALL">全部类型</option>{roots.map((root) => <option key={root.id} value={root.id}>{root.name}</option>)}</select></label></section>
    <section className="grid grid-cols-2 xl:grid-cols-4 gap-3">{cards.map((card) => <button key={card.label} onClick={card.action} className="bg-white border border-[var(--ty-border-color)] rounded-ty-sm p-4 flex items-center justify-between text-left hover:border-[var(--ty-primary-color)]"><div><span className="text-ty-xs text-[var(--ty-font-sub-color)] block">{card.label}</span><strong className="text-ty-xl mt-1 block font-mono">{card.value}</strong><small className="text-ty-2xs text-[var(--ty-font-sub-color)] mt-1 block">{card.note}</small></div><div className="w-9 h-9 rounded-ty-sm bg-[var(--ty-fill-color)] text-[var(--ty-font-sub-color)] flex items-center justify-center">{card.icon}</div></button>)}</section>
    <section className="bg-white border border-[var(--ty-border-color)] rounded-ty-sm overflow-hidden"><div className="px-4 py-3 border-b border-[var(--ty-border-color)]"><h2 className="text-ty-sm font-semibold">各类型运行情况</h2><p className="text-ty-xs text-[var(--ty-font-sub-color)] mt-1">两条队列独立统计；接入停用只停止该类型的中间表轮询。</p></div><div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-ty-xs"><thead className="bg-[var(--ty-fill-weak-dark-color)] text-[var(--ty-font-sub-color)]"><tr><th className="px-3 py-2 text-left">对象类型</th><th className="px-3 py-2 text-left">接入状态 / 检查频率</th><th className="px-3 py-2 text-left">中间表写入</th><th className="px-3 py-2 text-left">Manticore 同步</th><th className="px-3 py-2 text-left">最近核验</th><th className="px-3 py-2 text-left">目标数据</th></tr></thead><tbody className="divide-y divide-[var(--ty-border-light-color)]">{shownRoots.map((root) => {
      const source = sourceRows.filter((r) => r.rootTypeCode === root.id);
      const target = targetRows.filter((r) => r.rootTypeCode === root.id);
      const rootChecks = scopedChecks.filter((r) => r.rootTypeCode === root.id);
      const latestCheck = [...rootChecks].sort((a, b) => b.executedAt.localeCompare(a.executedAt))[0];
      return <tr key={root.id} className="hover:bg-[var(--ty-fill-weak-dark-color)]/50"><td className="px-3 py-3"><strong>{root.name}</strong><span className="block mt-1 text-[var(--ty-font-sub-color)]">{root.formalQueryableFieldCount} 个正式字段</span></td><td className="px-3 py-3"><span className={`min-h-6 px-2 inline-flex items-center rounded-ty-xs border ${root.accessEnabled ? 'bg-[var(--ty-green-lightest-color)] text-[var(--ty-green-color)] border-[var(--ty-green-color)]/30' : 'bg-[var(--ty-fill-weak-dark-color)] text-[var(--ty-font-sub-color)] border-[var(--ty-border-color)]'}`}>{root.accessEnabled ? '已启用' : '已停用'}</span><span className="block mt-1 text-[var(--ty-font-sub-color)]">{root.accessEnabled ? scheduleLabel(schedules.find((s) => s.rootTypeCode === root.id), root.pollingIntervalMinutes) : '不轮询中间表'}</span></td><td className="px-3 py-3"><strong>积压 {source.filter((r) => r.status === 'PENDING' || r.status === 'PROCESSING').length}</strong><span className="block mt-1 text-[var(--ty-font-sub-color)]">成功 {source.filter((r) => r.status === 'SUCCESS').length} · 失败 {source.filter((r) => r.status === 'FAILED').length}</span><button className="text-[var(--ty-primary-color)] mt-2" onClick={() => onIngestion(root.id)}>查看队列</button></td><td className="px-3 py-3"><strong>积压 {target.filter((r) => r.status === 'PENDING' || r.status === 'PROCESSING').length}</strong><span className="block mt-1 text-[var(--ty-font-sub-color)]">成功 {target.filter((r) => r.status === 'SUCCESS').length} · 失败 {target.filter((r) => r.status === 'FAILED').length}</span><button className="text-[var(--ty-primary-color)] mt-2" onClick={() => onSync(root.id)}>查看队列</button></td><td className="px-3 py-3"><strong>{latestCheck ? (latestCheck.status === 'FAILED' ? '任务失败' : latestCheck.differenceCount || latestCheck.pendingRecheckCount || latestCheck.incompleteCount ? '发现问题' : '核验通过') : '暂无记录'}</strong><span className="block mt-1 text-[var(--ty-font-sub-color)]">{latestCheck?.executedAt || '—'}</span><button className="text-[var(--ty-primary-color)] mt-2" onClick={() => onCheck(root.id)}>核验记录</button></td><td className="px-3 py-3"><strong className="font-mono">{(root.manticoreDocCount || 0).toLocaleString()}</strong><span className="block mt-1 text-[var(--ty-font-sub-color)]">Manticore 记录</span><button className="text-[var(--ty-primary-color)] mt-2 inline-flex items-center gap-1" onClick={() => onPresence(root.id)}>多余数据排查<ArrowUpRight className="w-3 h-3" /></button></td></tr>;
    })}</tbody></table></div></section>
  </div>;
}
