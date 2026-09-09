import { useState } from 'react';
import { ConsistencyPlanDialog } from './ConsistencyPlanDialog';
import { MappingObjectType } from '../stage1MappingTypes';
import {
  ExecutionSchedule,
  POLLING_INTERVAL_OPTIONS,
  newSchedule,
  validateSchedule,
  nextScheduledAt,
  beijingTime,
} from '../data/operations';

export function ExecutionScheduleDialog({ rootTypeCode, roots, schedules, onSave, onClose }: {
  rootTypeCode: string;
  roots: MappingObjectType[];
  schedules: ExecutionSchedule[];
  onSave: (value: ExecutionSchedule) => void;
  onClose: () => void;
}) {
  const root = roots.find((item) => item.id === rootTypeCode);
  const [draft, setDraft] = useState(() => structuredClone(
    schedules.find((item) => item.rootTypeCode === rootTypeCode) || {
      ...newSchedule(rootTypeCode), intervalMinutes: root?.pollingIntervalMinutes || 5,
    },
  ));
  const [notice, setNotice] = useState('');
  const error = validateSchedule(draft);
  const next = !error && root?.accessEnabled ? nextScheduledAt(draft, new Date()) : undefined;

  return (
    <div className="data-consistency-check">
      <ConsistencyPlanDialog title={`${root?.name || rootTypeCode} · 中间表检查频率`} onDismiss={onClose}>
        <form className="plan-dialog-form" onChange={() => setNotice('')} onSubmit={(event) => {
          event.preventDefault();
          if (error) return;
          const saved = { ...draft, savedAt: new Date().toISOString() };
          onSave(saved);
          setDraft(saved);
          setNotice(root?.accessEnabled ? '检查频率已保存，将用于后续轮询。' : '检查频率已保存；当前对象类型停用，启用后开始轮询。');
        }}>
          <div className="plan-dialog-body">
            <div className="notice">
              常驻同步服务按此间隔检查该对象类型的中间表，并逐条写入 Manticore。此处配置检查间隔，不是定时拉取任务。
            </div>
            <div className="form-grid">
              <label>
                检查间隔
                <select data-autofocus aria-label="中间表检查间隔" value={draft.intervalMinutes}
                  onChange={(event) => setDraft({ ...draft, intervalMinutes: Number(event.target.value) })}>
                  {POLLING_INTERVAL_OPTIONS.map((minutes) => (
                    <option key={minutes} value={minutes}>{minutes === 60 ? '每 1 小时' : `每 ${minutes} 分钟`}</option>
                  ))}
                </select>
              </label>
              <label>
                当前接入状态
                <input value={root?.accessEnabled ? '已启用' : '已停用'} readOnly aria-label="当前接入状态" />
              </label>
            </div>
            <p className="muted">
              {root?.accessEnabled ? `预计下次检查：${beijingTime(next)}。发现新记录后逐条处理。` : '停用期间不检查该对象类型的中间表，也不会消费新增记录。'}
            </p>
            {error && <p className="form-error" role="alert">{error}</p>}
            {notice && <p className="notice" role="status">{notice}</p>}
          </div>
          <div className="form-footer">
            <button type="button" onClick={onClose}>取消</button>
            <button type="submit" className="primary" disabled={!!error}>保存检查频率</button>
          </div>
        </form>
      </ConsistencyPlanDialog>
    </div>
  );
}
