import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { MappingObjectType } from '../stage1MappingTypes';
import { PresenceSnapshot, classifyPresence } from '../data/operations';

export function TargetPresenceView({
  roots,
  initialRoot = 'PART',
  onBack,
  onSync,
  evidence = [],
}: {
  roots: MappingObjectType[];
  initialRoot?: string;
  onBack: () => void;
  onSync: (root: string) => void;
  evidence?: PresenceSnapshot[];
}) {
  const [root, setRoot] = useState(initialRoot);
  const [example, setExample] = useState(false);
  const [scenario, setScenario] = useState('COMPLETE');
  const [filter, setFilter] = useState('ALL');
  const [selected, setSelected] = useState<string | null>(null);
  const snapshot: PresenceSnapshot | undefined = example
    ? {
        rootTypeCode: root,
        snapshotId: `EXAMPLE-PRESENCE-${root}`,
        capturedAt: '2026-09-08T01:00:00Z',
        sourceComplete: scenario === 'COMPLETE',
        sameScope: true,
        authoritative: scenario === 'COMPLETE',
        targetComplete: true,
        records: [
          { objectId: `${root}-EXAMPLE-01`, targetId: '1001', sourceResult: 'FOUND' },
          {
            objectId: `${root}-EXAMPLE-02`,
            targetId: '1002',
            sourceResult: scenario === 'ERROR' ? 'ERROR' : scenario === 'FORBIDDEN' ? 'FORBIDDEN' : 'NOT_FOUND',
            note: '对象为何不再存在，需要结合源端删除、失效及同步记录确认。',
          },
          { objectId: `${root}-EXAMPLE-03`, targetId: '1003', sourceResult: 'FOUND' },
        ],
      }
    : evidence
        .filter((item) => item.rootTypeCode === root)
        .sort((a, b) => Date.parse(b.capturedAt) - Date.parse(a.capturedAt))[0];
  const results = snapshot?.records.map((row) => ({ ...row, ...classifyPresence(snapshot, row) })) || [];
  const visible = results.filter((row) => filter === 'ALL' || row.status === filter);
  const detail = results.find((row) => row.targetId === selected);
  return (
    <div className="operations">
      <header className="ops-heading">
        <div>
          <button className="ops-back" onClick={onBack}>
            <ArrowLeft size={16} />
            返回一致性核验
          </button>
          <h1>目标端多余数据排查</h1>
          <p>从 Manticore 对象标识反查源端存在性，逐条确认多余数据。</p>
        </div>
        <button
          onClick={() => {
            setExample(!example);
            setSelected(null);
            setFilter('ALL');
          }}
        >
          {example ? '返回实际数据' : '查看排查示例'}
        </button>
      </header>
      <div className="ops-toolbar">
        <label>
          对象类型
          <select
            aria-label="排查对象类型"
            value={root}
            onChange={(event) => {
              setRoot(event.target.value);
              setSelected(null);
              setFilter('ALL');
            }}
          >
            {roots.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        {example && (
          <label>
            示例场景
            <select
              aria-label="排查示例场景"
              value={scenario}
              onChange={(event) => {
                setScenario(event.target.value);
                setSelected(null);
              }}
            >
              <option value="COMPLETE">完整查询：确认多余对象</option>
              <option value="INCOMPLETE">源端查询不完整</option>
              <option value="FORBIDDEN">源端权限不足</option>
              <option value="ERROR">源端读取失败</option>
            </select>
          </label>
        )}
        <button disabled title="源端与目标端存在性查询未接入">
          开始排查
        </button>
      </div>
      {example && (
        <p className="ops-example" role="status">
          排查示例 · 以下数据仅用于展示判断过程，不计入看板或核验记录。
        </p>
      )}
      <div className="ops-neutral">
        <strong>数量更多只是排查线索，不等于已确认存在多余对象。</strong>
        <span>
          同根类型、同范围、完整且有权限的源端查询未找到对象后，才可确认多余。源端缺失与目标重复需要分别核查。
        </span>
      </div>
      <div className="ops-metrics ops-gap">
        {[
          ['已检查目标对象', snapshot ? results.length : undefined],
          ['确认多余', snapshot ? results.filter((row) => row.status === 'EXTRA').length : undefined],
          ['待确认 / 读取异常', snapshot ? results.filter((row) => row.status === 'UNKNOWN').length : undefined],
          ['源端存在', snapshot ? results.filter((row) => row.status === 'PRESENT').length : undefined],
        ].map(([label, count]) => (
          <div className="ops-metric" key={label}>
            <span>{label}</span>
            <strong>{count ?? '待获取'}</strong>
          </div>
        ))}
      </div>
      <section className="ops-panel ops-gap">
        <div className="ops-section-heading">
          <div>
            <h2>排查明细</h2>
            <p>
              {snapshot
                ? `快照 ${snapshot.snapshotId} · ${snapshot.capturedAt} · ${snapshot.targetComplete ? '目标清单完整' : '目标清单未完整读取'}`
                : '存在性查询未接入，暂无可确认的排查结果。'}
            </p>
          </div>
          <label>
            排查结果
            <select
              aria-label="排查结果"
              value={filter}
              onChange={(event) => {
                setFilter(event.target.value);
                setSelected(null);
              }}
            >
              <option value="ALL">全部</option>
              <option value="EXTRA">确认多余</option>
              <option value="UNKNOWN">待确认 / 读取异常</option>
              <option value="PRESENT">源端存在</option>
            </select>
          </label>
        </div>
        {visible.length ? (
          <div className="ops-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>目标对象标识</th>
                  <th>目标记录 ID</th>
                  <th>源端查询</th>
                  <th>排查结论</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <tr key={row.targetId}>
                    <td>{row.objectId}</td>
                    <td>{row.targetId}</td>
                    <td>
                      {
                        { FOUND: '已找到', NOT_FOUND: '未找到', FORBIDDEN: '权限不足', ERROR: '读取失败' }[
                          row.sourceResult
                        ]
                      }
                    </td>
                    <td>
                      <span className={`ops-status ${row.status === 'EXTRA' ? 'ops-danger' : ''}`}>{row.label}</span>
                    </td>
                    <td>
                      <button onClick={() => setSelected(row.targetId)}>查看排查依据</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="ops-empty">{snapshot ? '当前条件下暂无记录' : '等待接入源端与目标端存在性查询'}</div>
        )}
        {detail && (
          <div className="ops-evidence">
            <div className="ops-section-heading">
              <h3>{detail.objectId} · 排查依据</h3>
              <button onClick={() => setSelected(null)}>收起</button>
            </div>
            <p>{detail.reason}</p>
            <p className="ops-muted">{detail.note || '继续核查唯一标识、查询范围和同步时点。'}</p>
            <ol>
              <li>确认源端对象是否删除、失效或移出同步范围。</li>
              <li>检查删除或失效事件是否到达中间表，以及是否继续传递至 Manticore。</li>
              <li>检查唯一标识变化或重复写入；修复后重新核验。</li>
            </ol>
            {!example && <button onClick={() => onSync(root)}>查看该类型同步日志</button>}
            <small className="ops-muted">
              这里只排查，不执行删除。具体日志需按对象标识和时间核对，未自动绑定任务。
            </small>
          </div>
        )}
      </section>
    </div>
  );
}
