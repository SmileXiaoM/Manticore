import { useState } from 'react';
import { ArrowUpRight, Database, FileCheck2, ScrollText, Server } from 'lucide-react';
import { MappingObjectType } from '../stage1MappingTypes';
import { ConsistencyBatchRecord } from '../types/consistencyCheck';
import { ExecutionSchedule, scheduleLabel } from '../data/operations';
import { SourceIngestionLog } from '../data/sourceIngestionLogs';
import { TargetSyncRecord } from '../data/targetSyncRecords';
import { formatCompactNumber, paginateRows, TablePagination } from './ui/TablePagination';
import { HelpTooltip } from './ui/HelpTooltip';

type StatisticPeriod = '1H' | '24H' | '7D';

const periodMeta: Record<StatisticPeriod, { label: string; shortLabel: string; factor: number }> = {
  '1H': { label: '最近 1 小时', shortLabel: '近 1 小时', factor: 0.045 },
  '24H': { label: '最近 24 小时', shortLabel: '近 24 小时', factor: 1 },
  '7D': { label: '最近 7 天', shortLabel: '近 7 天', factor: 6.6 },
};

const operationalSnapshot: Record<string, {
  written: number;
  writeSuccess: number;
  writeFailed: number;
  pending: number;
  synced: number;
  syncFailed: number;
}> = {
  PART: { written: 128426, writeSuccess: 128374, writeFailed: 52, pending: 1245, synced: 86540, syncFailed: 32 },
  DOCUMENT: { written: 64281, writeSuccess: 64276, writeFailed: 5, pending: 83, synced: 31128, syncFailed: 2 },
  PROCESS: { written: 0, writeSuccess: 0, writeFailed: 0, pending: 0, synced: 0, syncFailed: 0 },
};

const emptySnapshot = { written: 0, writeSuccess: 0, writeFailed: 0, pending: 0, synced: 0, syncFailed: 0 };
const scalePeriod = (value: number, factor: number) => Math.round(value * factor);

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
  const [period, setPeriod] = useState<StatisticPeriod>('24H');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const selected = filter === 'ALL' ? undefined : filter;
  const shownRoots = roots.filter((root) => !selected || root.id === selected);
  const { currentPage, rows: pageRoots } = paginateRows(shownRoots, page, pageSize);
  const rootIds = new Set(shownRoots.map((root) => root.id));
  const sourceRows = ingestionLogs.filter((row) => rootIds.has(row.rootTypeCode));
  const targetRows = syncRecords.filter((row) => rootIds.has(row.rootTypeCode));
  const scopedChecks = checks.filter((row) => rootIds.has(row.rootTypeCode));
  const targetCount = shownRoots.reduce((sum, root) => sum + (root.manticoreDocCount || 0), 0);
  const issueObjects = scopedChecks.reduce((sum, row) => sum + row.differenceCount + row.pendingRecheckCount + row.incompleteCount, 0);
  const factor = periodMeta[period].factor;
  const aggregate = shownRoots.reduce((summary, root) => {
    const snapshot = operationalSnapshot[root.id] || emptySnapshot;
    summary.written += scalePeriod(snapshot.written, factor);
    summary.writeSuccess += scalePeriod(snapshot.writeSuccess, factor);
    summary.writeFailed += scalePeriod(snapshot.writeFailed, factor);
    summary.pending += snapshot.pending;
    summary.synced += scalePeriod(snapshot.synced, factor);
    summary.syncFailed += snapshot.syncFailed;
    return summary;
  }, { ...emptySnapshot });
  const successRate = aggregate.written ? `${(aggregate.writeSuccess / aggregate.written * 100).toFixed(2)}%` : '--';

  const cards = [
    { label: `中间表写入（${periodMeta[period].shortLabel}）`, value: formatCompactNumber(aggregate.written), exactValue: aggregate.written.toLocaleString(), note: `成功率 ${successRate} · 失败 ${formatCompactNumber(aggregate.writeFailed)}`, icon: <ScrollText className="w-4 h-4" />, action: () => onIngestion(selected) },
    { label: 'Manticore 同步队列', value: formatCompactNumber(aggregate.pending), exactValue: aggregate.pending.toLocaleString(), note: `${periodMeta[period].shortLabel}成功 ${formatCompactNumber(aggregate.synced)} · 当前失败 ${formatCompactNumber(aggregate.syncFailed)}`, icon: <Server className="w-4 h-4" />, action: () => onSync(selected) },
    { label: '一致性问题对象', value: formatCompactNumber(issueObjects), exactValue: issueObjects.toLocaleString(), note: `核验记录 ${scopedChecks.length} · 任务失败 ${scopedChecks.filter((row) => row.status === 'FAILED').length}`, icon: <FileCheck2 className="w-4 h-4" />, action: () => onCheck(selected) },
    { label: 'Manticore 数据', value: formatCompactNumber(targetCount), exactValue: targetCount.toLocaleString(), note: '当前目标索引记录数', icon: <Database className="w-4 h-4" />, action: () => onPresence(selected) },
  ];

  return <div className="min-w-0 space-y-4">
    <header className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm px-4 py-3 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2"><FileCheck2 className="w-5 h-5 text-[var(--ty-primary-color)]" /><div><div className="flex items-center gap-2"><h1 className="text-ty-xl font-semibold">Manticore 运行看板</h1><span className="text-ty-2xs min-h-6 px-2 inline-flex items-center rounded-ty-xs bg-[var(--ty-fill-color)] text-[var(--ty-font-sub-color)] border border-[var(--ty-border-color)]">多类型总览</span></div><p className="text-ty-xs text-[var(--ty-font-sub-color)] mt-1">统一查看中间表写入、Manticore 同步队列、一致性核验与目标数据现状。</p></div></div>
      <span className="min-h-6 px-2 inline-flex items-center rounded-ty-xs bg-[var(--ty-green-lightest-color)] text-[var(--ty-green-color)] border border-[var(--ty-green-color)]/30 text-ty-xs"><Server className="w-3.5 h-3.5 mr-1" />同步服务运行中</span>
    </header>

    <section className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-3 flex flex-wrap items-center gap-4">
      <label className="text-ty-xs text-[var(--ty-font-sub-color)] flex items-center gap-2">对象类型<select aria-label="看板对象类型" value={filter} onChange={(event) => { setFilter(event.target.value); setPage(1); }} className="h-8 min-w-40 px-3 border border-[var(--ty-border-color)] rounded-ty-sm bg-[var(--ty-fill-white-color)] text-[var(--ty-font-main-color)]"><option value="ALL">全部类型</option>{roots.map((root) => <option key={root.id} value={root.id}>{root.name}</option>)}</select></label>
      <label className="text-ty-xs text-[var(--ty-font-sub-color)] flex items-center gap-2">统计周期<select aria-label="看板统计周期" value={period} onChange={(event) => setPeriod(event.target.value as StatisticPeriod)} className="h-8 min-w-36 px-3 border border-[var(--ty-border-color)] rounded-ty-sm bg-[var(--ty-fill-white-color)] text-[var(--ty-font-main-color)]">{Object.entries(periodMeta).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}</select></label>
      <span className="text-ty-2xs text-[var(--ty-font-sub-color)] ml-auto">大数字按万/亿缩写，悬停可查看精确值</span>
    </section>

    <section className="grid grid-cols-2 xl:grid-cols-4 gap-3">{cards.map((card) => <button key={card.label} onClick={card.action} aria-label={`${card.label} ${card.exactValue}`} title={`${card.label}：${card.exactValue}`} className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-4 flex items-center justify-between text-left hover:border-[var(--ty-primary-color)]"><div className="min-w-0"><span className="text-ty-xs text-[var(--ty-font-sub-color)] block">{card.label}</span><strong className="text-ty-xl mt-1 block font-mono">{card.value}</strong><small className="text-ty-2xs text-[var(--ty-font-sub-color)] mt-1 block">{card.note}</small></div><div className="w-9 h-9 shrink-0 rounded-ty-sm bg-[var(--ty-fill-color)] text-[var(--ty-font-sub-color)] flex items-center justify-center">{card.icon}</div></button>)}</section>

    <section className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--ty-border-color)] flex items-center gap-1"><h2 className="text-ty-sm font-semibold">各类型运行情况</h2><HelpTooltip label="查看运行情况口径" content="写入数据按统计周期汇总；同步队列展示当前待处理、已处理和失败记录，并提供对应页面下钻。" /></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[1120px] text-ty-xs"><thead className="bg-[var(--ty-fill-weak-dark-color)] text-[var(--ty-font-sub-color)]"><tr><th className="px-3 py-2 text-left">对象类型</th><th className="px-3 py-2 text-left">接入状态 / 检查频率</th><th className="px-3 py-2 text-left">中间表写入（{periodMeta[period].shortLabel}）</th><th className="px-3 py-2 text-left">Manticore 同步</th><th className="px-3 py-2 text-left">最近核验</th><th className="px-3 py-2 text-left">目标数据</th></tr></thead><tbody className="divide-y divide-[var(--ty-border-light-color)]">{pageRoots.map((root) => {
        const source = sourceRows.filter((row) => row.rootTypeCode === root.id);
        const target = targetRows.filter((row) => row.rootTypeCode === root.id);
        const rootChecks = scopedChecks.filter((row) => row.rootTypeCode === root.id);
        const latestSourceAt = source.map((row) => row.processedAt).sort((a, b) => b.localeCompare(a))[0];
        const latestProcessedAt = target.map((row) => row.processedAt).filter((value): value is string => Boolean(value)).sort((a, b) => b.localeCompare(a))[0];
        const latestCheck = [...rootChecks].sort((a, b) => b.executedAt.localeCompare(a.executedAt))[0];
        const snapshot = operationalSnapshot[root.id] || emptySnapshot;
        const written = scalePeriod(snapshot.written, factor);
        const writeSuccess = scalePeriod(snapshot.writeSuccess, factor);
        const writeFailed = scalePeriod(snapshot.writeFailed, factor);
        const rate = written ? `${(writeSuccess / written * 100).toFixed(2)}%` : '--';
        const synced = scalePeriod(snapshot.synced, factor);
        return <tr key={root.id} className="hover:bg-[var(--ty-fill-weak-dark-color)]/50">
          <td className="px-3 py-3"><strong>{root.name}</strong><span className="block mt-1 text-[var(--ty-font-sub-color)]">{root.formalQueryableFieldCount} 个正式字段</span></td>
          <td className="px-3 py-3"><span className={`min-h-6 px-2 inline-flex items-center rounded-ty-xs border ${root.accessEnabled ? 'bg-[var(--ty-green-lightest-color)] text-[var(--ty-green-color)] border-[var(--ty-green-color)]/30' : 'bg-[var(--ty-fill-weak-dark-color)] text-[var(--ty-font-sub-color)] border-[var(--ty-border-color)]'}`}>{root.accessEnabled ? '已启用' : '已停用'}</span><span className="block mt-1 text-[var(--ty-font-sub-color)]">{root.accessEnabled ? scheduleLabel(schedules.find((schedule) => schedule.rootTypeCode === root.id), root.pollingIntervalMinutes) : '不轮询中间表'}</span></td>
          <td className="px-3 py-3"><strong aria-label={`${written.toLocaleString()} 条`}>{formatCompactNumber(written)} 条</strong><span className="block mt-1 text-[var(--ty-font-sub-color)]">成功率 {rate} · <span className={writeFailed ? 'text-[var(--ty-red-color)]' : ''}>失败 {formatCompactNumber(writeFailed)}</span></span><span className="block mt-1 text-[var(--ty-font-sub-color)]">最近写入 {latestSourceAt || '—'}</span><button className="h-7 min-w-16 px-2 inline-flex items-center text-[var(--ty-primary-color)] mt-1 rounded-ty-sm hover:bg-[var(--ty-primary-lightest-color)]" onClick={() => onIngestion(root.id)}>查看日志</button></td>
          <td className="px-3 py-3"><strong aria-label={`待处理 ${snapshot.pending.toLocaleString()}`}>待处理 {formatCompactNumber(snapshot.pending)}</strong><span className="block mt-1 text-[var(--ty-font-sub-color)]">{periodMeta[period].shortLabel}成功 {formatCompactNumber(synced)} · <span className={snapshot.syncFailed ? 'text-[var(--ty-red-color)]' : ''}>当前失败 {formatCompactNumber(snapshot.syncFailed)}</span></span><span className="block mt-1 text-[var(--ty-font-sub-color)]">最近处理 {latestProcessedAt || '—'}</span><button className="h-7 min-w-16 px-2 inline-flex items-center text-[var(--ty-primary-color)] mt-1 rounded-ty-sm hover:bg-[var(--ty-primary-lightest-color)]" onClick={() => onSync(root.id)}>查看队列</button></td>
          <td className="px-3 py-3"><strong>{latestCheck ? (latestCheck.status === 'FAILED' ? '任务失败' : latestCheck.differenceCount || latestCheck.pendingRecheckCount || latestCheck.incompleteCount ? '发现问题' : '核验通过') : '暂无记录'}</strong><span className="block mt-1 text-[var(--ty-font-sub-color)]">{latestCheck?.executedAt || '—'}</span><button className="h-7 min-w-16 px-2 inline-flex items-center text-[var(--ty-primary-color)] mt-1 rounded-ty-sm hover:bg-[var(--ty-primary-lightest-color)]" onClick={() => onCheck(root.id)}>核验记录</button></td>
          <td className="px-3 py-3"><strong className="font-mono" aria-label={`${(root.manticoreDocCount || 0).toLocaleString()} 条 Manticore 记录`}>{formatCompactNumber(root.manticoreDocCount || 0)}</strong><span className="block mt-1 text-[var(--ty-font-sub-color)]">Manticore 记录</span><button className="h-7 min-w-16 px-2 text-[var(--ty-primary-color)] mt-1 inline-flex items-center gap-1 rounded-ty-sm hover:bg-[var(--ty-primary-lightest-color)]" onClick={() => onPresence(root.id)}>多余数据排查<ArrowUpRight className="w-3 h-3" /></button></td>
        </tr>;
      })}</tbody></table></div>
      {shownRoots.length > 10 && <TablePagination total={shownRoots.length} page={currentPage} pageSize={pageSize} itemLabel="个类型" onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />}
    </section>
  </div>;
}
