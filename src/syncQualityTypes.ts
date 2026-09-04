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

// 人工处理说明记录（仅用于记录人工处理情况，不改变同步状态，不自动关闭异常）
export interface HandlingNote {
  id: string;
  content: string;
  operator: string;
  createdAt: string;
}

// 同步批次
export interface SyncBatch {
  id: string; // 批次编号，如 SYNC-20260825-010
  jobName: string; // 任务名称，如 零件增量同步任务
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
  failedRecords: SyncFailedRecord[]; // 失败数据明细
  handlingNotes?: HandlingNote[]; // 人工处理说明历史
  statusNote?: string; // 批次执行情况简要说明
}

// 状态元数据工具函数
export interface StatusMeta {
  label: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  dotClass: string;
}

export function getSyncStatusMeta(status: SyncStatus): StatusMeta {
  switch (status) {
    case 'RUNNING':
      return {
        label: '同步中',
        bgClass: 'bg-blue-50',
        textClass: 'text-blue-700',
        borderClass: 'border-blue-200',
        dotClass: 'bg-blue-500'
      };
    case 'SUCCESS':
      return {
        label: '同步完成',
        bgClass: 'bg-emerald-50',
        textClass: 'text-emerald-700',
        borderClass: 'border-emerald-200',
        dotClass: 'bg-emerald-500'
      };
    case 'PARTIAL_SUCCESS':
      return {
        label: '同步完成（有异常）',
        bgClass: 'bg-amber-50',
        textClass: 'text-amber-800',
        borderClass: 'border-amber-200',
        dotClass: 'bg-amber-500'
      };
    case 'FAILED':
      return {
        label: '同步失败',
        bgClass: 'bg-rose-50',
        textClass: 'text-rose-700',
        borderClass: 'border-rose-200',
        dotClass: 'bg-rose-500'
      };
    default:
      return {
        label: '未同步',
        bgClass: 'bg-slate-50',
        textClass: 'text-slate-600',
        borderClass: 'border-slate-200',
        dotClass: 'bg-slate-400'
      };
  }
}

export function getRootTypeDisplayName(rootType: SyncRootType): string {
  switch (rootType) {
    case 'Part':
      return '零部件';
    case 'Document':
      return '文档';
    case 'Process':
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

