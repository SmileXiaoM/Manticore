import { useState } from 'react';
import { ArrowUpRight, Database, FileCheck2, RefreshCw, ScrollText } from 'lucide-react';
import { MappingObjectType } from '../stage1MappingTypes';
import { SyncBatch, formatSyncCount, getSyncStatusMeta } from '../syncQualityTypes';
import { ConsistencyBatchRecord, calculateConsistencyStats } from '../types/consistencyCheck';
import { buildOverview } from '../data/operations';
import { SourceIngestionLog, ingestionStatusLabel } from '../data/sourceIngestionLogs';

const recordTime = (value?: string) => {
  if (!value) return 0;
  return Date.parse(value.includes('T') ? value : `${value.replace(' ', 'T')}+08:00`) || 0;
};

const ingestionTone: Record<SourceIngestionLog['status'], string> = {
  RUNNING: 'bg-[var(--ty-blue-lightest-color)] text-[var(--ty-blue-color)]',
  SUCCESS: 'bg-[var(--ty-green-lightest-color)] text-[var(--ty-green-color)]',
  PARTIAL_SUCCESS: 'bg-[var(--ty-orange-lightest-color)] text-[var(--ty-orange-color)]',
  FAILED: 'bg-[var(--ty-red-lightest-color)] text-[var(--ty-red-color)]',
};

const checkStatus = (check: ConsistencyBatchRecord) => {
  if (check.status === 'RUNNING') {
    return { label: '核验中', tone: 'bg-[var(--ty-blue-lightest-color)] text-[var(--ty-blue-color)]' };
  }
  if (check.status === 'FAILED') {
    return { label: '任务失败', tone: 'bg-[var(--ty-red-lightest-color)] text-[var(--ty-red-color)]' };
  }
  if (check.differenceCount || check.pendingRecheckCount || check.incompleteCount) {
    return { label: '发现问题', tone: 'bg-[var(--ty-orange-lightest-color)] text-[var(--ty-orange-color)]' };
  }
  return { label: '核验通过', tone: 'bg-[var(--ty-green-lightest-color)] text-[var(--ty-green-color)]' };
};

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
  onIngestion: (root?: string) => void;
  onSync: (root?: string, batchId?: string) => void;
  onCheck: (root?: string) => void;
  onPresence: (root?: string) => void;
}) {
  const [filter, setFilter] = useState('ALL');
  const selectedRoot = filter === 'ALL' ? undefined : filter;
  const filteredRoots = roots.filter((root) => !selectedRoot || root.id === selectedRoot);
  const rows = buildOverview(filteredRoots, syncs, checks).map((row) => ({
    ...row,
    latestIngestion: [...ingestionLogs]
      .filter((log) => log.rootTypeCode === row.root.id)
      .sort((a, b) => recordTime(b.startedAt) - recordTime(a.startedAt))[0],
  }));
  const targetCountKnown = rows.some((row) => Number.isFinite(row.root.manticoreDocCount));
  const indexed = rows.reduce((sum, row) => sum + (row.root.manticoreDocCount || 0), 0);
  const ingestionIssues = rows.filter(
    (row) => row.latestIngestion?.status === 'FAILED' || row.latestIngestion?.status === 'PARTIAL_SUCCESS',
  );
  const syncIssues = rows.filter(
    (row) => row.latestSync?.executionStatus === 'FAILED' || row.latestSync?.executionStatus === 'PARTIAL_SUCCESS',
  );
  const checkIssueObjects = rows.reduce(
    (sum, row) => sum + (row.latestCheck
      ? row.latestCheck.differenceCount + row.latestCheck.pendingRecheckCount + row.latestCheck.incompleteCount
      : 0),
    0,
  );
  const checkFailures = rows.filter((row) => row.latestCheck?.status === 'FAILED').length;

  const metrics = [
    {
      label: '源端采集',
      value: ingestionIssues.length,
      note: `异常类型 · 运行中 ${rows.filter((row) => row.latestIngestion?.status === 'RUNNING').length}`,
      icon: <ScrollText className="w-4 h-4" />,
      action: () => onIngestion(selectedRoot),
    },
    {
      label: 'Manticore 同步',
      value: syncIssues.length,
      note: `异常类型 · 运行中 ${rows.filter((row) => row.latestSync?.executionStatus === 'RUNNING').length}`,
      icon: <RefreshCw className="w-4 h-4" />,
      action: () => onSync(selectedRoot),
    },
    {
      label: '一致性核验',
      value: checkIssueObjects,
      note: `问题对象 · 任务失败 ${checkFailures}`,
      icon: <FileCheck2 className="w-4 h-4" />,
      action: () => onCheck(selectedRoot),
    },
    {
      label: '目标数据',
      value: targetCountKnown ? indexed.toLocaleString() : '待获取',
      note: 'Manticore 已记录数量',
      icon: <Database className="w-4 h-4" />,
      action: () => onPresence(selectedRoot),
    },
  ];

  return (
    <div className="flex-1 min-w-0 flex flex-col h-full overflow-y-auto space-y-4">
      <header className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileCheck2 className="w-5 h-5 text-[var(--ty-primary-color)]" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-ty-md font-semibold">Manticore 运行看板</h1>
              <span className="text-ty-2xs px-2 py-0.5 rounded-ty-xs bg-[var(--ty-fill-color)] text-[var(--ty-font-sub-color)] border border-[var(--ty-border-color)]">多类型总览</span>
            </div>
            <p className="text-ty-xs text-[var(--ty-font-sub-color)] mt-1">按对象类型查看源端采集、Manticore 同步、一致性核验和目标数据状态。</p>
          </div>
        </div>
        <span className="text-ty-xs text-[var(--ty-font-sub-color)]">当前展示任务与数据记录 · 实时服务指标待接入</span>
      </header>

      <div className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-3.5 flex items-center gap-3">
        <label className="text-ty-xs text-[var(--ty-font-sub-color)] flex items-center gap-2">
          对象类型
          <select
            aria-label="看板对象类型"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="h-8 min-w-40 px-2.5 border border-[var(--ty-border-color)] rounded-ty-sm bg-[var(--ty-fill-white-color)] text-[var(--ty-font-main-color)]"
          >
            <option value="ALL">全部类型</option>
            {roots.map((root) => <option key={root.id} value={root.id}>{root.name}</option>)}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {metrics.map((metric) => (
          <button
            key={metric.label}
            onClick={metric.action}
            className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-3.5 flex items-center justify-between text-left hover:border-[var(--ty-primary-color)]"
          >
            <div>
              <span className="text-ty-xs text-[var(--ty-font-sub-color)] block">{metric.label}</span>
              <strong className="text-ty-xl mt-1 block">{metric.value}</strong>
              <small className="text-ty-2xs text-[var(--ty-font-sub-color)] mt-1 block">{metric.note}</small>
            </div>
            <div className="w-9 h-9 rounded-ty-sm bg-[var(--ty-fill-color)] text-[var(--ty-font-sub-color)] flex items-center justify-center">{metric.icon}</div>
          </button>
        ))}
      </div>

      <section className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--ty-border-color)]">
          <h2 className="text-ty-sm font-semibold">各类型运行情况</h2>
          <p className="text-ty-xs text-[var(--ty-font-sub-color)] mt-1">四列分别来自三类独立任务记录和 Manticore 数量记录，点击对应入口继续排查。</p>
        </div>
        <div className="p-3 space-y-3 bg-[var(--ty-fill-color)]">
          {rows.map(({ root, latestIngestion, latestSync, latestCheck }) => {
            const syncMeta = latestSync ? getSyncStatusMeta(latestSync.executionStatus) : undefined;
            const checkMeta = latestCheck ? checkStatus(latestCheck) : undefined;
            return (
              <article key={root.id} className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm overflow-hidden">
                <header className="px-4 py-3 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--ty-border-light-color)]">
                  <div>
                    <strong className="text-ty-sm">{root.name}</strong>
                    <span className="text-ty-xs text-[var(--ty-font-sub-color)] ml-2">{root.formalQueryableFieldCount} 个正式可查询字段</span>
                  </div>
                  <span className="text-ty-xs text-[var(--ty-font-sub-color)]">Manticore 数据：{formatSyncCount(root.manticoreDocCount)}</span>
                </header>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 text-ty-xs">
                  <section className="p-4 min-h-36 border-b md:border-r xl:border-b-0 border-[var(--ty-border-light-color)] flex flex-col">
                    <div className="text-[var(--ty-font-sub-color)] mb-2">① 源端采集</div>
                    {latestIngestion ? (
                      <>
                        <span className={`self-start inline-flex px-2 py-0.5 rounded-ty-xs ${ingestionTone[latestIngestion.status]}`}>{ingestionStatusLabel[latestIngestion.status]}</span>
                        <span className="text-[var(--ty-font-sub-color)] mt-2 block">{latestIngestion.startedAt}</span>
                        <span className="text-[var(--ty-font-sub-color)] mt-1 block">读取 {latestIngestion.readCount ?? '待获取'} · 写入 {latestIngestion.writtenCount ?? '待获取'}</span>
                      </>
                    ) : <span className="text-[var(--ty-font-sub-color)]">暂无记录</span>}
                    <button className="text-[var(--ty-primary-color)] mt-auto pt-3 self-start" onClick={() => onIngestion(root.id)}>采集日志</button>
                  </section>
                  <section className="p-4 min-h-36 border-b xl:border-b-0 xl:border-r border-[var(--ty-border-light-color)] flex flex-col">
                    <div className="text-[var(--ty-font-sub-color)] mb-2">② Manticore 同步</div>
                    {latestSync && syncMeta ? (
                      <>
                        <span className={`self-start inline-flex px-2 py-0.5 rounded-ty-xs ${syncMeta.bgClass} ${syncMeta.textClass}`}>{syncMeta.label}</span>
                        <span className="text-[var(--ty-font-sub-color)] mt-2 block">{latestSync.startTime}</span>
                        <span className="text-[var(--ty-font-sub-color)] mt-1 block">成功 {formatSyncCount(latestSync.successCount)} · 失败 {formatSyncCount(latestSync.failedCount)}</span>
                      </>
                    ) : <span className="text-[var(--ty-font-sub-color)]">暂无记录</span>}
                    <button className="text-[var(--ty-primary-color)] mt-auto pt-3 self-start" onClick={() => onSync(root.id, latestSync?.id)}>同步记录</button>
                  </section>
                  <section className="p-4 min-h-36 border-b md:border-b-0 md:border-r border-[var(--ty-border-light-color)] flex flex-col">
                    <div className="text-[var(--ty-font-sub-color)] mb-2">③ 一致性核验</div>
                    {latestCheck && checkMeta ? (
                      <>
                        <span className={`self-start inline-flex px-2 py-0.5 rounded-ty-xs ${checkMeta.tone}`}>{checkMeta.label}</span>
                        <span className="text-[var(--ty-font-sub-color)] mt-2 block">{latestCheck.executedAt}</span>
                        <span className="text-[var(--ty-font-sub-color)] mt-1 block">
                          {latestCheck.status === 'RUNNING' || latestCheck.status === 'FAILED'
                            ? '一致率 --'
                            : `一致率 ${calculateConsistencyStats(latestCheck).rateDisplay} · 不一致 ${latestCheck.differenceCount}`}
                        </span>
                      </>
                    ) : <span className="text-[var(--ty-font-sub-color)]">尚未核验</span>}
                    <button className="text-[var(--ty-primary-color)] mt-auto pt-3 self-start" onClick={() => onCheck(root.id)}>核验记录</button>
                  </section>
                  <section className="p-4 min-h-36 flex flex-col">
                    <div className="text-[var(--ty-font-sub-color)] mb-2">目标数据</div>
                    <strong className="text-ty-base">{formatSyncCount(root.manticoreDocCount)}</strong>
                    <span className="text-[var(--ty-font-sub-color)] mt-2 block">记录时间：{root.lastSyncedAt || '待获取'}</span>
                    <button className="text-[var(--ty-primary-color)] mt-auto pt-3 self-start inline-flex items-center gap-1" onClick={() => onPresence(root.id)}>
                      多余数据排查<ArrowUpRight className="w-3 h-3" />
                    </button>
                  </section>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
