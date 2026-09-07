/**
 * 一阶段：数据同步记录 - 简化数据模型与类型声明
 * 遵循业务范围约束：只有根类型，无软类型，无版本概念，单条错误不终止同步
 */

// 根类型（仅支持三种核心根类型，不支持软类型）
export type SyncRootType = 'Part' | 'Document' | 'Process';

// 统一同步状态
export type SyncStatus = 'RUNNING' | 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILED';

// 同步方式
export type SyncMethod = 'FULL' | 'INCREMENTAL' | 'COMPENSATION';

// 触发方式
export type TriggerType = 'SCHEDULED' | 'MANUAL' | 'RETRY';

// 单条异常重试结果
export type RetryResultStatus = 'NONE' | 'RETRYING' | 'SUCCESS' | 'FAILED';

// 同步失败记录（单条失败数据明细与渐进式技术排查信息）
export interface SyncFailedRecord {
  id: string; // 异常记录ID，如 FAIL-001
  recordKey: string; // 数据标识或业务编码，如 P-00339, DOC-88310
  rootType: SyncRootType; // 根类型
  failedField?: string; // 失败字段（能够取得时），如 pin_array_config
  failureReason: string; // 失败原因（业务易懂描述）
  occurredAt: string; // 发生时间
  retryable: boolean; // 是否可以重试
  latestRetryResult?: RetryResultStatus; // 最近一次重试结果

  // 技术信息（默认在界面中折叠，展开后查看）
  errorCode?: string; // 错误码，如 SYNC_MAPPING_001
  traceId?: string; // 全链路追踪ID，如 TRC-PLM-20260825-0101
  errorCategory?: string; // 错误分类，如 SCHEMA_VALIDATION
  techDetail?: string; // 技术说明
  owner?: string; // 处理责任人或责任组
}

// 任务级失败专属技术排查信息（任务无法继续，不伪装成单条数据异常）
export interface TaskFailureDetail {
  failureReason: string; // 任务级中断原因
  failureStage?: string; // 中断发生环节（如：源数据分片抽取）
  errorCode?: string; // 任务错误码，如 SYNC_AUTH_401
  traceId?: string; // 全链路追踪ID
  errorCategory?: string; // 错误分类，如 AUTH_EXPIRED
  techDetail?: string; // 脱敏技术说明
  owner?: string; // 处理责任人或运维组
}

// 人工处理说明记录（仅用于记录人工处理情况，不改变同步状态，不自动关闭异常）
export interface HandlingNote {
  id: string;
  content: string;
  operator: string;
  createdAt: string;
}

// 任务类型：数据同步 vs 重置接入
export type TaskType = 'SYNC' | 'RESET';

// 重置接入专属审计与详情（统一收回数据同步记录，不建平行页面）
export interface ResetAuditDetail {
  operator: string;
  confirmedInputCode: string;
  beforeConfiguredCount: number;
  beforeDraftCount: number;
  beforeFormalQueryableCount: number;
  beforeDocCount?: number;
  deletedDocCount?: number;
  retainedDraftCount: number;
  failureStage?: string;
  failureReason?: string;
  needsAdminIntervention?: boolean;
}

// 同步批次
export interface SyncBatch {
  id: string; // 批次编号，如 SYNC-20260825-010 或 RESET-20260907-001
  jobName: string; // 任务名称，如 零件增量同步任务 或 零部件接入重置任务
  taskType?: TaskType; // 任务类型：默认为 'SYNC'，重置时为 'RESET'
  parentBatchId?: string; // 关联原批次编号（用于重试留痕，如原批次 SYNC-20260825-010）
  rootTypes: SyncRootType[]; // 涉及的根类型列表
  syncMethod: SyncMethod; // 同步方式
  triggerType: TriggerType; // 触发方式
  startTime: string; // 开始时间
  endTime?: string; // 结束时间（运行中批次为 undefined）
  durationText?: string; // 耗时描述，如 48分17秒

  // 数据数量口径（已完成：总数 = 成功 + 异常 + 跳过；运行中：正在处理 = 总数 - 成功 - 异常 - 跳过）
  sourceDataCount: number; // 同步数据总数
  successCount: number; // 成功数量
  failedCount: number; // 异常数量
  skippedCount: number; // 跳过数量（跳过 N 条，不计为同步异常）

  executionStatus: SyncStatus; // 统一同步状态
  failedRecords: SyncFailedRecord[]; // 失败数据明细（仅用于数据级异常）
  taskFailureDetail?: TaskFailureDetail; // 任务级失败根因详情（仅用于任务级失败 FAILED）
  handlingNotes?: HandlingNote[]; // 人工处理说明历史
  statusNote?: string; // 批次执行情况简要说明

  // 任务详情承接的执行方式与判定原因（用户发起前无需选择，详情中展示）
  actualStrategy?: string; // 实际执行方式：初始化重建 / 增量刷新 / 历史回填 / 补偿重试
  strategyReason?: string; // 判定原因

  // 重置任务专属详情
  resetAuditDetail?: ResetAuditDetail;
}

// 状态元数据工具函数
export interface StatusMeta {
  label: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  dotClass: string;
}

export function getSyncStatusMeta(status: SyncStatus, taskType?: TaskType): StatusMeta {
  const isReset = taskType === 'RESET';
  switch (status) {
    case 'RUNNING':
      return {
        label: isReset ? '重置中' : '同步中',
        bgClass: 'bg-[var(--ty-blue-lightest-color)]',
        textClass: 'text-[var(--ty-font-main-light-color)]',
        borderClass: 'border-[var(--ty-blue-color)]/30',
        dotClass: 'bg-[var(--ty-blue-color)]'
      };
    case 'SUCCESS':
      return {
        label: isReset ? '重置完成' : '同步完成',
        bgClass: 'bg-[var(--ty-green-lightest-color)]',
        textClass: 'text-[var(--ty-font-main-light-color)]',
        borderClass: 'border-[var(--ty-green-color)]/30',
        dotClass: 'bg-[var(--ty-green-color)]'
      };
    case 'PARTIAL_SUCCESS':
      return {
        label: '同步完成（有异常）',
        bgClass: 'bg-[var(--ty-orange-lightest-color)]',
        textClass: 'text-[var(--ty-font-main-light-color)]',
        borderClass: 'border-[var(--ty-orange-color)]/30',
        dotClass: 'bg-[var(--ty-orange-color)]'
      };
    case 'FAILED':
      return {
        label: isReset ? '重置失败' : '同步失败',
        bgClass: 'bg-[var(--ty-red-lightest-color)]',
        textClass: 'text-[var(--ty-font-main-light-color)]',
        borderClass: 'border-[var(--ty-red-color)]/30',
        dotClass: 'bg-[var(--ty-red-color)]'
      };
    default:
      return {
        label: '未同步',
        bgClass: 'bg-[var(--ty-fill-color)]',
        textClass: 'text-[var(--ty-font-sub-color)]',
        borderClass: 'border-[var(--ty-border-light-color)]',
        dotClass: 'bg-[var(--ty-font-sub-light-color)]'
      };
  }
}

/**
 * 集中、双向、类型安全的根类型转换函数
 * 一阶段使用 PART / DOCUMENT / PROCESS，数据同步记录使用 Part / Document / Process
 */
export function toSyncRootType(id: string): SyncRootType {
  const upper = (id || '').toUpperCase();
  if (upper === 'DOCUMENT') return 'Document';
  if (upper === 'PROCESS') return 'Process';
  return 'Part';
}

export function toStage1RootTypeId(rootType: SyncRootType | string): string {
  return (rootType || '').toUpperCase();
}

export function getRootTypeDisplayName(rootType: SyncRootType | string): string {
  const upper = (rootType || '').toUpperCase();
  switch (upper) {
    case 'PART':
      return '零部件';
    case 'DOCUMENT':
      return '文档';
    case 'PROCESS':
      return '工艺路线';
    default:
      return rootType;
  }
}

export function getSyncMethodLabel(method: SyncMethod): string {
  switch (method) {
    case 'FULL':
      return '全量同步';
    case 'INCREMENTAL':
      return '增量同步';
    case 'COMPENSATION':
      return '补偿同步';
    default:
      return method;
  }
}

export function getTriggerTypeLabel(trigger: TriggerType): string {
  switch (trigger) {
    case 'SCHEDULED':
      return '定时调度';
    case 'MANUAL':
      return '手动触发';
    case 'RETRY':
      return '失败重试';
    default:
      return trigger;
  }
}

/**
 * 统一本地时间格式化函数
 * 使用浏览器本地时区格式化输出 YYYY-MM-DD HH:mm:ss，杜绝 toISOString() 导致的 8 小时 UTC 时差
 */
export function formatLocalDateTime(date: Date = new Date()): string {
  const pad = (num: number) => String(num).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}