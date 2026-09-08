import { MappingObjectType } from '../stage1MappingTypes';
import { SyncBatch } from '../syncQualityTypes';
import { ConsistencyBatchRecord } from '../types/consistencyCheck';

export interface ExecutionSchedule {
  rootTypeCode: string;
  enabled: boolean;
  frequency: 'HOURLY' | 'DAILY' | 'WEEKLY';
  intervalHours: number;
  time: string;
  weekday: number;
  savedAt?: string;
}
export const newSchedule = (rootTypeCode: string): ExecutionSchedule => ({
  rootTypeCode,
  enabled: false,
  frequency: 'DAILY',
  intervalHours: 1,
  time: '02:00',
  weekday: 1,
});
export function validateSchedule(schedule: ExecutionSchedule) {
  if (!['PART', 'DOCUMENT', 'PROCESS'].includes(schedule.rootTypeCode)) return '请选择根类型';
  if (!schedule.enabled) return '';
  if (!['HOURLY', 'DAILY', 'WEEKLY'].includes(schedule.frequency)) return '请选择执行周期';
  if (
    schedule.frequency === 'HOURLY' &&
    (!Number.isInteger(schedule.intervalHours) || schedule.intervalHours < 1 || schedule.intervalHours > 168)
  )
    return '间隔请输入 1–168 小时的整数';
  if (schedule.frequency !== 'HOURLY' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(schedule.time)) return '请选择执行时间';
  if (
    schedule.frequency === 'WEEKLY' &&
    (!Number.isInteger(schedule.weekday) || schedule.weekday < 0 || schedule.weekday > 6)
  )
    return '请选择星期';
  return '';
}
export function nextScheduledAt(schedule: ExecutionSchedule, after: Date): string | undefined {
  if (!schedule.enabled || !Number.isFinite(after.getTime())) return undefined;
  if (schedule.frequency === 'HOURLY') {
    if (!Number.isInteger(schedule.intervalHours) || schedule.intervalHours < 1 || schedule.intervalHours > 168)
      return undefined;
    const anchor = schedule.savedAt ? Date.parse(schedule.savedAt) : after.getTime();
    if (!Number.isFinite(anchor)) return undefined;
    const interval = schedule.intervalHours * 3600000;
    return new Date(
      anchor + Math.max(1, Math.floor((after.getTime() - anchor) / interval) + 1) * interval,
    ).toISOString();
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(schedule.time)) return undefined;
  const local = new Date(after.getTime() + 8 * 3600000);
  const [hour, minute] = schedule.time.split(':').map(Number);
  let next = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), hour - 8, minute);
  if (schedule.frequency === 'WEEKLY') {
    if (!Number.isInteger(schedule.weekday) || schedule.weekday < 0 || schedule.weekday > 6) return undefined;
    next += ((schedule.weekday - local.getUTCDay() + 7) % 7) * 86400000;
    if (next <= after.getTime()) next += 7 * 86400000;
  } else if (schedule.frequency === 'DAILY') {
    if (next <= after.getTime()) next += 86400000;
  } else return undefined;
  return new Date(next).toISOString();
}
export const beijingTime = (value?: string) =>
  value && Number.isFinite(Date.parse(value))
    ? new Intl.DateTimeFormat('zh-CN', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(new Date(value))
    : '—';
export function scheduleLabel(schedule?: ExecutionSchedule) {
  if (!schedule) return '未设置';
  if (!schedule.enabled) return '未启用';
  if (schedule.frequency === 'HOURLY') return `每 ${schedule.intervalHours} 小时`;
  return `${schedule.frequency === 'DAILY' ? '每天' : `每周${'日一二三四五六'[schedule.weekday]}`} ${schedule.time}`;
}
const stamp = (value: string) => Date.parse(value.includes('T') ? value : value.replace(' ', 'T') + '+08:00') || 0;
export function buildOverview(roots: MappingObjectType[], batches: SyncBatch[], checks: ConsistencyBatchRecord[]) {
  return roots.map((root) => {
    const syncs = batches.filter(
      (batch) => batch.taskType !== 'RESET' && batch.rootTypes.some((type) => type.toUpperCase() === root.id),
    );
    const rootChecks = checks.filter((check) => check.rootTypeCode === root.id);
    const latestSync = [...syncs].sort((a, b) => stamp(b.startTime) - stamp(a.startTime))[0];
    const latestCheck = [...rootChecks].sort((a, b) => stamp(b.executedAt) - stamp(a.executedAt))[0];
    return {
      root,
      latestSync,
      latestCheck,
      running: syncs.filter((batch) => batch.executionStatus === 'RUNNING').length,
      unresolvedTasks: syncs.filter(
        (batch) =>
          batch.executionStatus === 'FAILED' ||
          (batch.executionStatus === 'PARTIAL_SUCCESS' &&
            (!batch.failedRecords.length ||
              batch.failedRecords.some((record) => record.latestRetryResult !== 'SUCCESS'))),
      ).length,
    };
  });
}

export interface PresenceEvidence {
  objectId: string;
  targetId: string;
  sourceResult: 'FOUND' | 'NOT_FOUND' | 'FORBIDDEN' | 'ERROR';
  note?: string;
}
export interface PresenceSnapshot {
  rootTypeCode: string;
  snapshotId: string;
  capturedAt: string;
  sourceComplete: boolean;
  sameScope: boolean;
  authoritative: boolean;
  targetComplete: boolean;
  records: PresenceEvidence[];
}
export function classifyPresence(snapshot: PresenceSnapshot, row: PresenceEvidence) {
  if (row.sourceResult === 'FORBIDDEN')
    return { status: 'UNKNOWN', label: '权限不足', reason: '需恢复源端读取权限后重查，不能判定为多余。' };
  if (row.sourceResult === 'ERROR')
    return { status: 'UNKNOWN', label: '读取失败', reason: '源端查询失败，需重试获取存在性证据。' };
  if (row.sourceResult === 'FOUND')
    return { status: 'PRESENT', label: '源端存在', reason: '对象在源端存在；如数量不平衡，继续检查重复键和筛选口径。' };
  if (!snapshot.sourceComplete || !snapshot.sameScope || !snapshot.authoritative)
    return { status: 'UNKNOWN', label: '待确认', reason: '源端完整性、查询范围或权威读取尚未确认，不能判定为多余。' };
  return {
    status: 'EXTRA',
    label: '确认多余',
    reason: '同根类型、同范围的完整权威源端查询未找到该对象；需核查删除或失效同步记录。',
  };
}
