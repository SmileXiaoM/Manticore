import { useState } from 'react';
import { ArrowUpRight, Clock3, Database, Settings2 } from 'lucide-react';
import { MappingObjectType } from '../stage1MappingTypes';
import { SyncBatch, formatSyncCount, getSyncStatusMeta } from '../syncQualityTypes';
import { ConsistencyBatchRecord, calculateConsistencyStats } from '../types/consistencyCheck';
import { ExecutionSchedule, buildOverview, scheduleLabel } from '../data/operations';

export function OperationsDashboard({
  roots,
  syncs,
  checks,
  schedules,
  onSync,
  onCheck,
  onSchedule,
  onPresence,
}: {
  roots: MappingObjectType[];
  syncs: SyncBatch[];
  checks: ConsistencyBatchRecord[];
  schedules: ExecutionSchedule[];
  onSync: (root?: string, batchId?: string) => void;
  onCheck: (root?: string) => void;
  onSchedule: (kind: ExecutionSchedule['kind'], root: string) => void;
  onPresence: (root?: string) => void;
}) {
  const [filter, setFilter] = useState('ALL');
  const rows = buildOverview(
    roots.filter((root) => filter === 'ALL' || root.id === filter),
    syncs,
    checks,
  );
  const selectedSyncs = syncs.filter(
    (batch) =>
      batch.taskType !== 'RESET' && (filter === 'ALL' || batch.rootTypes.some((root) => root.toUpperCase() === filter)),
  );
  const selectedChecks = checks.filter((check) => filter === 'ALL' || check.rootTypeCode === filter);
  const knownCounts = rows.filter(
    (row) => Number.isFinite(row.root.manticoreDocCount) && row.root.manticoreDocCount! >= 0,
  );
  const indexed = knownCounts.reduce((sum, row) => sum + row.root.manticoreDocCount!, 0);
  const issueTasks = selectedSyncs.filter(
    (batch) =>
      batch.executionStatus === 'FAILED' ||
      (batch.executionStatus === 'PARTIAL_SUCCESS' &&
        (!batch.failedRecords.length || batch.failedRecords.some((record) => record.latestRetryResult !== 'SUCCESS'))),
  );
  const findings = rows.filter(
    (row) =>
      row.latestCheck &&
      (row.latestCheck.differenceCount > 0 ||
        row.latestCheck.pendingRecheckCount > 0 ||
        row.latestCheck.incompleteCount > 0 ||
        row.latestCheck.status === 'FAILED'),
  );
  return (
    <div className="operations ops-dashboard">
      <header className="ops-heading">
        <div>
          <span className="ops-eyebrow">MANTICORE · 运行总览</span>
          <h1>Manticore 运行看板</h1>
          <p>
            按对象类型查看同步进展、核验结果与待排查问题。<span className="ops-badge">原型演示</span>
          </p>
        </div>
        <button onClick={() => onSchedule('SYNC', filter === 'ALL' ? roots[0]?.id || 'PART' : filter)}>
          <Settings2 size={16} />
          自动执行设置
        </button>
      </header>
      <div className="ops-toolbar">
        <label>
          对象类型
          <select aria-label="看板对象类型" value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="ALL">全部类型</option>
            {roots.map((root) => (
              <option key={root.id} value={root.id}>
                {root.name}
              </option>
            ))}
          </select>
        </label>
        <span className="ops-muted">实时服务监测尚未接入 · 以下为当前记录</span>
      </div>
      <div className="ops-metrics">
        <div className="ops-metric">
          <span>
            <Database size={16} />
            已记录的目标数据量
          </span>
          <strong>{knownCounts.length ? indexed.toLocaleString() : '待获取'}</strong>
          <small>
            {knownCounts.length} / {rows.length} 个类型有数量，非实时总量
          </small>
        </div>
        <div className="ops-metric">
          <span>
            <Clock3 size={16} />
            进行中的任务
          </span>
          <strong>
            {selectedSyncs.filter((batch) => batch.executionStatus === 'RUNNING').length +
              selectedChecks.filter((check) => check.status === 'RUNNING').length}
          </strong>
          <small>同步与核验任务，不含接入重置</small>
        </div>
        <button className="ops-metric" onClick={() => onSync(filter === 'ALL' ? undefined : filter)}>
          <span>
            待处理同步任务
            <ArrowUpRight size={16} />
          </span>
          <strong>{issueTasks.length}</strong>
          <small>失败或仍有未解决数据异常的任务</small>
        </button>
        <button className="ops-metric" onClick={() => onCheck(filter === 'ALL' ? undefined : filter)}>
          <span>
            最近核验有问题的类型
            <ArrowUpRight size={16} />
          </span>
          <strong>
            {findings.length}
            <small> / {rows.length}</small>
          </strong>
          <small>按每种类型最近一次核验判断</small>
        </button>
      </div>
      <section className="ops-panel">
        <div className="ops-section-heading">
          <div>
            <h2>各类型运行情况</h2>
            <p>源表、中间表与目标总量分开展示；同步批次数量不等于源表总量。</p>
          </div>
        </div>
        <div className="ops-table-scroll">
          <table>
            <thead>
              <tr>
                <th>对象类型</th>
                <th>源表 / 中间表总量</th>
                <th>Manticore 数量</th>
                <th>最近同步</th>
                <th>最近核验</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ root, latestSync, latestCheck }) => (
                <tr key={root.id}>
                  <td>
                    <strong>{root.name}</strong>
                    <small>{root.formalQueryableFieldCount} 个正式可查询字段</small>
                  </td>
                  <td>
                    <span className="ops-muted">待获取 / 待获取</span>
                  </td>
                  <td>
                    <strong>{formatSyncCount(root.manticoreDocCount)}</strong>
                    <small>记录时间：{root.lastSyncedAt || '待获取'}</small>
                  </td>
                  <td>
                    {latestSync ? (
                      <>
                        <span
                          className={`ops-status ${latestSync.executionStatus === 'FAILED' ? 'ops-danger' : latestSync.executionStatus === 'RUNNING' ? 'ops-info' : ''}`}
                        >
                          {getSyncStatusMeta(latestSync.executionStatus).label}
                        </span>
                        <small>{latestSync.startTime}</small>
                      </>
                    ) : (
                      <span className="ops-muted">暂无同步记录</span>
                    )}
                  </td>
                  <td>
                    {latestCheck ? (
                      <>
                        <span>
                          {
                            {
                              RUNNING: '核验中',
                              COMPLETED: '完成',
                              COMPLETED_WITH_ERRORS: '完成（有异常）',
                              FAILED: '失败',
                            }[latestCheck.status]
                          }
                        </span>
                        <small>{latestCheck.executedAt}</small>
                        <small>
                          本次对象一致率{' '}
                          {latestCheck.status === 'RUNNING' || latestCheck.status === 'FAILED'
                            ? '--'
                            : calculateConsistencyStats(latestCheck).rateDisplay}
                        </small>
                      </>
                    ) : (
                      <span className="ops-muted">尚未核验</span>
                    )}
                  </td>
                  <td>
                    <div className="ops-row-actions">
                      <button onClick={() => onSync(root.id, latestSync?.id)}>同步日志</button>
                      <button onClick={() => onCheck(root.id)}>核验记录</button>
                      <button onClick={() => onPresence(root.id)}>多余数据排查</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <div className="ops-bottom-grid">
        <section className="ops-panel">
          <div className="ops-section-heading">
            <div>
              <h2>自动执行计划</h2>
              <p>每种类型独立定义同步与核验频率。</p>
            </div>
            <span className="ops-badge">调度待接入</span>
          </div>
          {rows.map(({ root }) => (
            <div className="ops-plan-row" key={root.id}>
              <strong>{root.name}</strong>
              <div>
                {(['SYNC', 'VERIFY'] as const).map((kind) => (
                  <button key={kind} onClick={() => onSchedule(kind, root.id)}>
                    <span>{kind === 'SYNC' ? '同步' : '核验'}</span>
                    {scheduleLabel(
                      schedules.find((schedule) => schedule.kind === kind && schedule.rootTypeCode === root.id),
                    )}
                    <Settings2 size={14} />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </section>
        <section className="ops-panel">
          <h2>重点排查</h2>
          <div className="ops-focus">
            <span className="ops-step">01</span>
            <div>
              <h3>源表到中间表是否完整到达</h3>
              <p>在同步任务中查看分环节日志，定位读取、落表或写入异常。</p>
              <button onClick={() => onSync(filter === 'ALL' ? undefined : filter)}>
                查看同步日志 <ArrowUpRight size={14} />
              </button>
            </div>
          </div>
          <div className="ops-focus">
            <span className="ops-step">02</span>
            <div>
              <h3>目标端是否残留多余对象</h3>
              <p>从目标端反查源端存在性；数量差额只是线索，不直接作为多余记录数。</p>
              <button onClick={() => onPresence(filter === 'ALL' ? undefined : filter)}>
                进入排查 <ArrowUpRight size={14} />
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
