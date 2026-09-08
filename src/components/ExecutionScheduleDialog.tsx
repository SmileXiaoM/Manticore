import { useState } from 'react';
import { ConsistencyPlanDialog } from './ConsistencyPlanDialog';
import { MappingObjectType } from '../stage1MappingTypes';
import { ConsistencyPlan } from '../types/consistencyCheck';
import { ExecutionSchedule, newSchedule, validateSchedule, nextScheduledAt, beijingTime } from '../data/operations';

export function ExecutionScheduleDialog({
  kind,
  rootTypeCode,
  roots,
  plans,
  schedules,
  onSave,
  onClose,
}: {
  kind: ExecutionSchedule['kind'];
  rootTypeCode: string;
  roots: MappingObjectType[];
  plans: ConsistencyPlan[];
  schedules: ExecutionSchedule[];
  onSave: (value: ExecutionSchedule) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(() =>
    structuredClone(
      schedules.find((item) => item.kind === kind && item.rootTypeCode === rootTypeCode) ||
        newSchedule(kind, rootTypeCode),
    ),
  );
  const [notice, setNotice] = useState('');
  const select = (kind: ExecutionSchedule['kind'], root: string) => {
    setDraft(
      structuredClone(
        schedules.find((item) => item.kind === kind && item.rootTypeCode === root) || newSchedule(kind, root),
      ),
    );
    setNotice('');
  };
  const error = validateSchedule(draft, plans);
  const eligible = plans.filter(
    (plan) =>
      plan.rootTypeCode === draft.rootTypeCode &&
      plan.allowedModes.includes('RANDOM_SAMPLE') &&
      plan.scopeRule === 'ALL_ROOT',
  );
  const next = !error
    ? nextScheduledAt({ ...draft, savedAt: draft.savedAt || new Date().toISOString() }, new Date())
    : undefined;
  return (
    <div className="data-consistency-check operations">
      <ConsistencyPlanDialog title="自动执行设置" onDismiss={onClose}>
        <form
          className="plan-dialog-form"
          onChange={() => setNotice('')}
          onSubmit={(event) => {
            event.preventDefault();
            if (error) return;
            const saved = { ...draft, savedAt: new Date().toISOString() };
            onSave(saved);
            setDraft(saved);
            setNotice('频率设置已保存；调度服务尚未接入。');
          }}
        >
          <div className="plan-dialog-body">
            <div className="form-grid">
              <label>
                执行内容
                <select
                  data-autofocus
                  aria-label="自动执行内容"
                  value={draft.kind}
                  onChange={(event) => select(event.target.value as ExecutionSchedule['kind'], draft.rootTypeCode)}
                >
                  <option value="SYNC">数据同步</option>
                  <option value="VERIFY">一致性核验</option>
                </select>
              </label>
              <label>
                根类型
                <select
                  aria-label="自动执行根类型"
                  value={draft.rootTypeCode}
                  onChange={(event) => select(draft.kind, event.target.value)}
                >
                  {roots.map((root) => (
                    <option key={root.id} value={root.id}>
                      {root.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="ops-switch">
              <input
                type="checkbox"
                checked={draft.enabled}
                onChange={(event) => {
                  setDraft({ ...draft, enabled: event.target.checked });
                  setNotice('');
                }}
              />
              启用自动执行
            </label>
            {draft.enabled && (
              <>
                {draft.kind === 'VERIFY' && (
                  <div className="form-grid ops-gap">
                    <label>
                      核验方案
                      <select
                        aria-label="自动核验方案"
                        value={draft.planId}
                        onChange={(event) => setDraft({ ...draft, planId: event.target.value })}
                      >
                        <option value="">请选择核验方案</option>
                        {eligible.map((plan) => (
                          <option key={plan.id} value={plan.id}>
                            {plan.name}
                          </option>
                        ))}
                      </select>
                      <small className="muted">
                        自动核验使用抽样方式；
                        {eligible.length ? '字段沿用所选方案。' : '请先建立允许抽样、范围为全部对象的方案。'}
                      </small>
                    </label>
                    <label>
                      抽样量
                      <input
                        aria-label="自动核验抽样量"
                        type="number"
                        min={1}
                        max={10000}
                        value={draft.sampleCount}
                        onChange={(event) => setDraft({ ...draft, sampleCount: Number(event.target.value) })}
                      />
                    </label>
                  </div>
                )}
                <div className="form-grid ops-gap">
                  <label>
                    执行周期
                    <select
                      aria-label="执行周期"
                      value={draft.frequency}
                      onChange={(event) =>
                        setDraft({ ...draft, frequency: event.target.value as ExecutionSchedule['frequency'] })
                      }
                    >
                      <option value="HOURLY">每隔若干小时</option>
                      <option value="DAILY">每天</option>
                      <option value="WEEKLY">每周</option>
                    </select>
                  </label>
                  {draft.frequency === 'HOURLY' ? (
                    <label>
                      间隔小时
                      <input
                        aria-label="间隔小时"
                        type="number"
                        min={1}
                        max={168}
                        value={draft.intervalHours}
                        onChange={(event) => setDraft({ ...draft, intervalHours: Number(event.target.value) })}
                      />
                    </label>
                  ) : (
                    <label>
                      执行时间（北京时间）
                      <input
                        aria-label="执行时间"
                        type="time"
                        value={draft.time}
                        onChange={(event) => setDraft({ ...draft, time: event.target.value })}
                      />
                    </label>
                  )}
                  {draft.frequency === 'WEEKLY' && (
                    <label>
                      星期
                      <select
                        aria-label="执行星期"
                        value={draft.weekday}
                        onChange={(event) => setDraft({ ...draft, weekday: Number(event.target.value) })}
                      >
                        {[1, 2, 3, 4, 5, 6, 0].map((day) => (
                          <option key={day} value={day}>
                            星期{'日一二三四五六'[day]}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>
                <div className="ops-neutral ops-gap">
                  <span>下次计划时间</span>
                  <strong>{beijingTime(next)}</strong>
                  <small>按当前设置计算；同类型任务冲突、错过计划后的补跑规则待调度接入时确认。</small>
                </div>
              </>
            )}
            <p className="muted">同步与核验按根类型独立设置，调度服务未接入，当前仅保存本次会话的频率配置。</p>
            {notice && <p role="status">{notice}</p>}
          </div>
          <div className="form-footer">
            <span className="validation">{error}</span>
            <div className="actions">
              <button type="button" onClick={onClose}>
                关闭
              </button>
              <button className="primary" disabled={!!error}>
                保存设置
              </button>
            </div>
          </div>
        </form>
      </ConsistencyPlanDialog>
    </div>
  );
}
