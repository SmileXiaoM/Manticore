import { useState } from 'react';
import { ConsistencyPlanDialog } from './ConsistencyPlanDialog';
import { MappingObjectType } from '../stage1MappingTypes';
import { ExecutionSchedule, newSchedule, validateSchedule, nextScheduledAt, beijingTime } from '../data/operations';

export function ExecutionScheduleDialog({
  rootTypeCode,
  roots,
  schedules,
  onSave,
  onClose,
}: {
  rootTypeCode: string;
  roots: MappingObjectType[];
  schedules: ExecutionSchedule[];
  onSave: (value: ExecutionSchedule) => void;
  onClose: () => void;
}) {
  const root = roots.find((item) => item.id === rootTypeCode);
  const [draft, setDraft] = useState(() =>
    structuredClone(schedules.find((item) => item.rootTypeCode === rootTypeCode) || newSchedule(rootTypeCode)),
  );
  const [notice, setNotice] = useState('');
  const error = validateSchedule(draft);
  const next = !error
    ? nextScheduledAt({ ...draft, savedAt: draft.savedAt || new Date().toISOString() }, new Date())
    : undefined;

  return (
    <div className="data-consistency-check">
      <ConsistencyPlanDialog title={`${root?.name || rootTypeCode} · 数据同步计划`} onDismiss={onClose}>
        <form
          className="plan-dialog-form"
          onChange={() => setNotice('')}
          onSubmit={(event) => {
            event.preventDefault();
            if (error) return;
            const saved = { ...draft, savedAt: new Date().toISOString() };
            onSave(saved);
            setDraft(saved);
            setNotice('同步计划已保存；当前原型未接入调度服务。');
          }}
        >
          <div className="plan-dialog-body">
            <div className="notice">
              此计划只负责“中间表 → Manticore”。“源端 → 中间表”的执行由上游中间件管理，本系统只查看中间表写入异常日志。
            </div>
            <label className="inline-control">
              <input
                type="checkbox"
                data-autofocus
                checked={draft.enabled}
                onChange={(event) => setDraft({ ...draft, enabled: event.target.checked })}
              />
              启用自动同步
            </label>
            {draft.enabled && (
              <>
                <div className="form-grid">
                  <label>
                    执行周期
                    <select
                      aria-label="同步执行周期"
                      value={draft.frequency}
                      onChange={(event) => setDraft({ ...draft, frequency: event.target.value as ExecutionSchedule['frequency'] })}
                    >
                      <option value="HOURLY">按小时间隔</option>
                      <option value="DAILY">每天</option>
                      <option value="WEEKLY">每周</option>
                    </select>
                  </label>
                  {draft.frequency === 'HOURLY' ? (
                    <label>
                      间隔小时
                      <input type="number" min="1" max="168" value={draft.intervalHours}
                        onChange={(event) => setDraft({ ...draft, intervalHours: Number(event.target.value) })} />
                    </label>
                  ) : (
                    <label>
                      执行时间（北京时间）
                      <input type="time" value={draft.time} onChange={(event) => setDraft({ ...draft, time: event.target.value })} />
                    </label>
                  )}
                  {draft.frequency === 'WEEKLY' && (
                    <label>
                      星期
                      <select value={draft.weekday} onChange={(event) => setDraft({ ...draft, weekday: Number(event.target.value) })}>
                        {'日一二三四五六'.split('').map((day, index) => <option key={day} value={index}>星期{day}</option>)}
                      </select>
                    </label>
                  )}
                </div>
                <p className="muted">预计下次执行：{beijingTime(next)}（调度服务接入后生效）</p>
              </>
            )}
            {error && <p className="form-error" role="alert">{error}</p>}
            {notice && <p className="notice" role="status">{notice}</p>}
          </div>
          <div className="form-footer">
            <button type="button" onClick={onClose}>取消</button>
            <button type="submit" className="primary" disabled={!!error}>保存计划</button>
          </div>
        </form>
      </ConsistencyPlanDialog>
    </div>
  );
}
