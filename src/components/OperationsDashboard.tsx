import { useState } from 'react';
import { AlertTriangle, ArrowUpRight, Database, FileCheck2, RefreshCw, ScrollText } from 'lucide-react';
import { MappingObjectType } from '../stage1MappingTypes';
import { SyncBatch, formatSyncCount, getSyncStatusMeta } from '../syncQualityTypes';
import { ConsistencyBatchRecord, calculateConsistencyStats } from '../types/consistencyCheck';
import { buildOverview } from '../data/operations';
import { SourceIngestionLog } from '../data/sourceIngestionLogs';

export function OperationsDashboard({
  roots,
  syncs,
  checks,
  ingestionLogs,
  onIngestion,
  onSync,
  onCheck,
  onPresence,
}: {
  roots: MappingObjectType[];
  syncs: SyncBatch[];
  checks: ConsistencyBatchRecord[];
  ingestionLogs: SourceIngestionLog[];
  onIngestion: () => void;
  onSync: (root?: string, batchId?: string) => void;
  onCheck: (root?: string) => void;
  onPresence: (root?: string) => void;
}) {
  const [filter, setFilter] = useState('ALL');
  const rows = buildOverview(roots.filter((root) => filter === 'ALL' || root.id === filter), syncs, checks);
  const selectedSyncs = syncs.filter((batch) => batch.taskType !== 'RESET' && (filter === 'ALL' || batch.rootTypes.some((root) => root.toUpperCase() === filter)));
  const selectedChecks = checks.filter((check) => filter === 'ALL' || check.rootTypeCode === filter);
  const indexed = rows.filter((row) => Number.isFinite(row.root.manticoreDocCount)).reduce((sum, row) => sum + (row.root.manticoreDocCount || 0), 0);
  const sourceIssues = ingestionLogs.filter((log) => (filter === 'ALL' || log.rootTypeCode === filter) && (log.status === 'FAILED' || log.status === 'PARTIAL_SUCCESS'));
  const targetIssues = selectedSyncs.filter((batch) => batch.executionStatus === 'FAILED' || batch.executionStatus === 'PARTIAL_SUCCESS');
  const checkIssues = rows.filter((row) => row.latestCheck && (row.latestCheck.differenceCount > 0 || row.latestCheck.pendingRecheckCount > 0 || row.latestCheck.incompleteCount > 0 || row.latestCheck.status === 'FAILED'));
  const statusText = (status: ConsistencyBatchRecord['status']) => ({ RUNNING: '核验中', COMPLETED: '完成', COMPLETED_WITH_ERRORS: '完成（有异常）', FAILED: '失败' })[status];

  const metrics = [
    { label: '已记录的目标数据量', value: rows.some((row) => Number.isFinite(row.root.manticoreDocCount)) ? indexed.toLocaleString() : '待获取', note: '按各根类型最近记录汇总', icon: <Database className="w-4 h-4" /> },
    { label: '运行中的任务', value: selectedSyncs.filter((batch) => batch.executionStatus === 'RUNNING').length + selectedChecks.filter((check) => check.status === 'RUNNING').length, note: 'Manticore 同步与一致性核验', icon: <RefreshCw className="w-4 h-4" /> },
    { label: '源端采集异常', value: sourceIssues.length, note: '源端 → 中间表独立日志', icon: <ScrollText className="w-4 h-4" />, action: onIngestion },
    { label: 'Manticore 待处理', value: targetIssues.length + checkIssues.length, note: '同步异常与最近核验问题', icon: <AlertTriangle className="w-4 h-4" />, action: () => onSync(filter === 'ALL' ? undefined : filter) },
  ];

  return (
    <div className="flex-1 min-w-0 flex flex-col h-full overflow-y-auto space-y-4">
      <header className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileCheck2 className="w-5 h-5 text-[var(--ty-primary-color)]" />
          <div><div className="flex items-center gap-2"><h1 className="text-ty-md font-semibold">Manticore 运行看板</h1><span className="text-ty-2xs px-2 py-0.5 rounded-ty-xs bg-[var(--ty-fill-color)] text-[var(--ty-font-sub-color)] border border-[var(--ty-border-color)]">多类型总览</span></div><p className="text-ty-xs text-[var(--ty-font-sub-color)] mt-1">汇总采集、同步与一致性核验状态，按对象类型继续排查。</p></div>
        </div>
        <span className="text-ty-xs text-[var(--ty-font-sub-color)]">实时服务指标尚未接入 · 当前展示任务记录</span>
      </header>

      <div className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-3.5 flex items-center gap-3">
        <label className="text-ty-xs text-[var(--ty-font-sub-color)] flex items-center gap-2">对象类型<select aria-label="看板对象类型" value={filter} onChange={(event) => setFilter(event.target.value)} className="h-8 min-w-40 px-2.5 border border-[var(--ty-border-color)] rounded-ty-sm bg-[var(--ty-fill-white-color)] text-[var(--ty-font-main-color)]"><option value="ALL">全部类型</option>{roots.map((root) => <option key={root.id} value={root.id}>{root.name}</option>)}</select></label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {metrics.map((metric) => {
          const content = <><div><span className="text-ty-xs text-[var(--ty-font-sub-color)] block">{metric.label}</span><strong className="text-ty-xl mt-1 block">{metric.value}</strong><small className="text-ty-2xs text-[var(--ty-font-sub-color)] mt-1 block">{metric.note}</small></div><div className="w-9 h-9 rounded-ty-sm bg-[var(--ty-fill-color)] text-[var(--ty-font-sub-color)] flex items-center justify-center">{metric.icon}</div></>;
          return metric.action ? <button key={metric.label} onClick={metric.action} className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-3.5 flex items-center justify-between text-left hover:border-[var(--ty-primary-color)]">{content}</button> : <div key={metric.label} className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-3.5 flex items-center justify-between">{content}</div>;
        })}
      </div>

      <section className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--ty-border-color)]"><h2 className="text-ty-sm font-semibold">各类型运行情况</h2><p className="text-ty-xs text-[var(--ty-font-sub-color)] mt-1">源端采集与 Manticore 同步分开记录，本表聚焦各根类型在检索底座中的状态。</p></div>
        <div className="overflow-x-auto"><table className="w-full text-left text-ty-xs border-collapse">
          <thead><tr className="bg-[var(--ty-fill-color)] text-[var(--ty-font-sub-color)]"><th className="px-4 py-2.5 font-medium">对象类型</th><th className="px-4 py-2.5 font-medium">Manticore 数量</th><th className="px-4 py-2.5 font-medium">最近同步</th><th className="px-4 py-2.5 font-medium">最近核验</th><th className="px-4 py-2.5 font-medium">操作</th></tr></thead>
          <tbody>{rows.map(({ root, latestSync, latestCheck }) => <tr key={root.id} className="border-t border-[var(--ty-border-light-color)] align-top">
            <td className="px-4 py-3"><strong className="block">{root.name}</strong><span className="text-[var(--ty-font-sub-color)] mt-1 block">{root.formalQueryableFieldCount} 个正式可查询字段</span></td>
            <td className="px-4 py-3"><strong>{formatSyncCount(root.manticoreDocCount)}</strong><span className="text-[var(--ty-font-sub-color)] mt-1 block">记录时间：{root.lastSyncedAt || '待获取'}</span></td>
            <td className="px-4 py-3">{latestSync ? <><span>{getSyncStatusMeta(latestSync.executionStatus).label}</span><span className="text-[var(--ty-font-sub-color)] mt-1 block">{latestSync.startTime}</span></> : <span className="text-[var(--ty-font-sub-color)]">暂无记录</span>}</td>
            <td className="px-4 py-3">{latestCheck ? <><span>{statusText(latestCheck.status)}</span><span className="text-[var(--ty-font-sub-color)] mt-1 block">一致率 {latestCheck.status === 'RUNNING' || latestCheck.status === 'FAILED' ? '--' : calculateConsistencyStats(latestCheck).rateDisplay}</span></> : <span className="text-[var(--ty-font-sub-color)]">尚未核验</span>}</td>
            <td className="px-4 py-3"><div className="flex flex-wrap gap-x-3 gap-y-1"><button className="text-[var(--ty-primary-color)] inline-flex items-center gap-1" onClick={() => onSync(root.id, latestSync?.id)}>同步记录</button><button className="text-[var(--ty-primary-color)]" onClick={() => onCheck(root.id)}>核验记录</button><button className="text-[var(--ty-primary-color)] inline-flex items-center gap-1" onClick={() => onPresence(root.id)}>多余数据排查<ArrowUpRight className="w-3 h-3" /></button></div></td>
          </tr>)}</tbody>
        </table></div>
      </section>
    </div>
  );
}
