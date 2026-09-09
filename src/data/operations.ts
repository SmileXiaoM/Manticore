import { MappingObjectType } from '../stage1MappingTypes';
import { SyncBatch } from '../syncQualityTypes';
import { ConsistencyBatchRecord } from '../types/consistencyCheck';

/** 每个根类型独立配置的中间表轮询间隔。 */
export interface ExecutionSchedule {
  rootTypeCode: string;
  intervalMinutes: number;
  savedAt?: string;
}

export const POLLING_INTERVAL_OPTIONS = [1, 5, 10, 30, 60] as const;

export const newSchedule = (rootTypeCode: string): ExecutionSchedule => ({
  rootTypeCode,
  intervalMinutes: 5,
});

export function validateSchedule(schedule: ExecutionSchedule) {
  if (!['PART', 'DOCUMENT', 'PROCESS'].includes(schedule.rootTypeCode)) return '请选择对象类型';
  if (!POLLING_INTERVAL_OPTIONS.includes(schedule.intervalMinutes as (typeof POLLING_INTERVAL_OPTIONS)[number])) {
    return '请选择有效的检查间隔';
  }
  return '';
}

export function nextScheduledAt(schedule: ExecutionSchedule, after: Date): string | undefined {
  if (!Number.isFinite(after.getTime()) || validateSchedule(schedule)) return undefined;
  return new Date(after.getTime() + schedule.intervalMinutes * 60_000).toISOString();
}

export const beijingTime = (value?: string) =>
  value && Number.isFinite(Date.parse(value))
    ? new Intl.DateTimeFormat('zh-CN', {
        timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false,
      }).format(new Date(value))
    : '—';

export function scheduleLabel(schedule?: ExecutionSchedule, fallbackMinutes = 5) {
  const minutes = schedule?.intervalMinutes ?? fallbackMinutes;
  return minutes === 60 ? '每 1 小时检查' : `每 ${minutes} 分钟检查`;
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
        (batch) => batch.executionStatus === 'FAILED' ||
          (batch.executionStatus === 'PARTIAL_SUCCESS' && (!batch.failedRecords.length || batch.failedRecords.some((record) => record.latestRetryResult !== 'SUCCESS'))),
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
