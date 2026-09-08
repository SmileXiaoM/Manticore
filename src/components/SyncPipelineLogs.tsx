import { useState } from 'react';
import { SyncBatch, getRootTypeDisplayName, formatSyncCount, getSyncStatusMeta } from '../syncQualityTypes';
import { SyncStageLog, STAGE_LABELS, stageLogFor } from '../data/operations';

export function SyncPipelineLogs({ batch, initialRoot }: { batch: SyncBatch; initialRoot?: string }) {
  const [root, setRoot] = useState(
    batch.rootTypes.some((type) => type.toUpperCase() === initialRoot)
      ? initialRoot!
      : batch.rootTypes[0]?.toUpperCase() || 'PART',
  );
  const [example, setExample] = useState(false);
  const [activeStage, setActiveStage] = useState<SyncStageLog['stage']>('SOURCE_TO_STAGING');
  const exampleId = `EXAMPLE-${root}`;
  const examples: SyncStageLog[] = [
    {
      batchId: exampleId,
      rootTypeCode: root,
      stage: 'SOURCE_TO_STAGING',
      status: 'PARTIAL_SUCCESS',
      startedAt: '2026-09-08 09:00:00',
      endedAt: '2026-09-08 09:00:12',
      readCount: 120,
      writtenCount: 118,
      errorCount: 2,
      skippedCount: 0,
      errors: [
        {
          objectId: `${root}-EXAMPLE-01`,
          field: 'name',
          reason: '必填字段为空，中间表写入失败',
          traceId: 'EXAMPLE-TRACE-01',
        },
        {
          objectId: `${root}-EXAMPLE-02`,
          field: 'code',
          reason: '唯一标识重复，中间表写入失败',
          traceId: 'EXAMPLE-TRACE-02',
        },
      ],
    },
    {
      batchId: exampleId,
      rootTypeCode: root,
      stage: 'STAGING_TO_TARGET',
      status: 'SUCCESS',
      startedAt: '2026-09-08 09:00:12',
      endedAt: '2026-09-08 09:00:24',
      readCount: 118,
      writtenCount: 118,
      errorCount: 0,
      skippedCount: 0,
      errors: [],
    },
  ];
  const logs = example ? examples : batch.stageLogs;
  const logId = example ? exampleId : batch.id;
  const current = stageLogFor(logs, logId, root, activeStage);
  return (
    <section className="operations ops-pipeline">
      <div className="ops-section-heading">
        <div>
          <h3>分环节监控日志</h3>
          <p>同一任务、同一根类型下查看读取和写入结果。</p>
        </div>
        <button onClick={() => setExample(!example)}>{example ? '返回任务日志' : '查看展示示例'}</button>
      </div>
      {example && (
        <p className="ops-example" role="status">
          展示示例 · 不属于当前同步任务，不计入任何统计。
        </p>
      )}
      {batch.rootTypes.length > 1 && (
        <label>
          日志根类型
          <select aria-label="日志根类型" value={root} onChange={(event) => setRoot(event.target.value)}>
            {batch.rootTypes.map((type) => (
              <option value={type.toUpperCase()} key={type}>
                {getRootTypeDisplayName(type)}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="ops-stage-steps">
        {(Object.keys(STAGE_LABELS) as SyncStageLog['stage'][]).map((stage, index) => {
          const log = stageLogFor(logs, logId, root, stage);
          return (
            <button
              key={stage}
              aria-pressed={stage === activeStage}
              className={stage === activeStage ? 'is-selected' : ''}
              onClick={() => setActiveStage(stage)}
            >
              <span className="ops-step">0{index + 1}</span>
              <strong>{STAGE_LABELS[stage]}</strong>
              <small>{log ? getSyncStatusMeta(log.status).label : '日志未上报'}</small>
            </button>
          );
        })}
      </div>
      {current ? (
        <div className="ops-stage-detail">
          <p className="ops-muted">
            {current.startedAt} → {current.endedAt || '进行中'}
          </p>
          <div className="ops-stage-counts">
            {[
              ['读取', current.readCount],
              ['写入', current.writtenCount],
              ['异常', current.errorCount],
              ['跳过', current.skippedCount],
            ].map(([label, count]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{formatSyncCount(count as number | undefined)}</strong>
              </div>
            ))}
          </div>
          {current.errors.length ? (
            <div className="ops-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>对象标识</th>
                    <th>失败字段</th>
                    <th>原因</th>
                  </tr>
                </thead>
                <tbody>
                  {current.errors.map((error, index) => (
                    <tr key={index}>
                      <td>{error.objectId}</td>
                      <td>{error.field || '—'}</td>
                      <td>
                        {error.reason}
                        {error.traceId && (
                          <details>
                            <summary>追溯信息</summary>
                            <code>{error.traceId}</code>
                          </details>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="ops-muted">
              {current.status === 'RUNNING'
                ? '暂未上报异常明细'
                : current.errorCount === 0
                  ? '本环节无已记录异常'
                  : '异常明细待上报'}
            </p>
          )}
        </div>
      ) : (
        <div className="ops-neutral">
          <strong>{STAGE_LABELS[activeStage]}：尚未取得环节日志</strong>
          <span>读取量、写入量、异常量及耗时均待获取。</span>
          <small>任务整体状态不代表各环节日志已上报。</small>
        </div>
      )}
    </section>
  );
}
