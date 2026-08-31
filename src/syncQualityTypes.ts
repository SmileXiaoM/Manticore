/**
 * 一阶段：数据同步质量 - TypeScript 类型声明
 */

// 触发方式
export type TriggerType = 'SCHEDULED' | 'MANUAL' | 'RETRY' | 'MANUAL_COMPENSATION';

// 数量对账状态
export type ReconciliationStatus = 'PENDING' | 'BALANCED' | 'MISMATCH' | 'NOT_APPLICABLE';

// 数量对账结构
export interface CountReconciliation {
  status: ReconciliationStatus;
  differenceCount: number;
  explanation?: string;
  formula?: string; // e.g. "1,320 = 1,315(成功) + 2(跳过) + 3(失败)"
}

// 重试血缘
export interface RetryLineage {
  rootExecutionId: string;
  parentExecutionId?: string;
  attemptNo: number;
  triggeredBy: string;
  triggerReason?: string;
}

// 同步执行状态
export type SyncStatus = 'RUNNING' | 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILED';

// 一致性核验状态
export type VerificationStatus = 'UNCHECKED' | 'CHECKING' | 'PASSED' | 'WARNING' | 'FAILED';

// 核验方式
export type VerificationMethod =
  | 'COUNT'
  | 'UNIQUE_KEY'
  | 'VERSION_UPDATECOUNT'
  | 'STANDARDIZED_HASH'
  | 'STRATIFIED_RANDOM'
  | 'RISK_TARGETED';

// 异常状态
export type ExceptionStatus =
  | 'PENDING'
  | 'RETRYING'
  | 'PENDING_REVIEW'
  | 'PENDING_BUSINESS_CONFIRM'
  | 'RECOVERED'
  | 'CLOSED';

// 异常严重度
export type ExceptionSeverity = 'HIGH' | 'MEDIUM' | 'LOW';

// 异常类型
export type ExceptionType =
  | 'VERSION_LAG'
  | 'STATUS_MISMATCH'
  | 'TEXT_STALE'
  | 'MANTICORE_MISSING'
  | 'SCHEMA_VIOLATION'
  | 'ENCODING_ERROR';

// 同步方式
export type SyncMethod = 'FULL' | 'INCREMENTAL' | 'COMPENSATION';

// 对象级明细
export interface SyncObjectDetail {
  objectType: 'Part' | 'Document' | 'Process' | string;
  softType: string;
  extractedCount: number;
  insertedCount: number;
  updatedCount: number;
  deletedCount: number;
  failedCount: number;
  skippedCount: number;
  status: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILED' | 'RUNNING';
}

// 失败单条记录（技术跟踪、错误码与异常证据）
export interface SyncFailedRecord {
  id: string;
  objectCode: string;
  objectType: string;
  softType: string;
  businessReason: string;
  traceId: string;
  hasExceptionCreated: boolean;
  linkedExceptionId?: string;
  errorCategory?: string; // 稳定异常分类，如 "MAPPING_ERROR" / "SCHEMA_VALIDATION"
  errorCode?: string; // 稳定错误码，如 "SYNC_MAPPING_001"
  retryable?: boolean; // 是否可重试
  owner?: string; // 责任人/责任组
  techDetail?: string; // 脱敏技术详情
}

// 同步轨迹步骤
export interface SyncTrajectoryStep {
  step: string;
  timestamp: string;
  status: 'DONE' | 'CURRENT' | 'WAITING' | 'ERROR';
  description: string;
}

// 同步批次 (执行证据合同模型)
export interface SyncBatch {
  id: string; // e.g. SYNC-20260825-001 (兼作为 executionId)
  executionId?: string; // 兼容别名，与 id 保持一致
  jobCode: string; // 稳定业务任务标识，例如 'PART_INCREMENTAL_SYNC'
  triggerType: TriggerType; // SCHEDULED | MANUAL | RETRY | MANUAL_COMPENSATION
  sourceSystem: string; // 'IntePLM V21'
  objectsSummary: string[]; // ['Part', 'Document', 'Process']
  syncMethod: SyncMethod; // FULL | INCREMENTAL | COMPENSATION

  // 数据范围与增量水位合同 (R2 明确拆分普通全量截止时点与真实快照)
  sourceDataCutoffAt?: string; // 普通全量抽取的数据截止时间
  sourceSnapshotAt?: string; // 仅在源系统确实提供一致性快照时使用
  dataWindowStart?: string; // 增量/补偿数据窗口开始
  dataWindowEnd?: string; // 增量/补偿数据窗口结束
  watermarkType?: 'UPDATECOUNT' | 'TIMESTAMP' | 'COMPOSITE'; // 水位类型
  watermarkStart?: string;
  watermarkEnd?: string;

  // 配置快照合同
  objectMappingVersion?: string; // e.g. 'PART-MAP-V12'
  fieldMappingVersion?: string; // e.g. 'PART-FIELD-V12'
  syncConfigVersion?: string; // e.g. 'SYNC-CFG-V5'
  configSnapshotId: string; // e.g. 'CFG-SNAP-20260825-001'

  // 时间合同
  scheduledAt?: string; // 计划触发时间
  startTime: string; // 实际开始时间 (startedAt)
  endTime?: string; // 实际结束时间 (finishedAt, RUNNING 时为 undefined)
  durationSeconds?: number; // 耗时秒数
  durationText: string;

  // 数量口径与对账合同
  sourceDataCount: number; // 抽取数 (extractedCount)
  insertedCount: number; // 新增数
  updatedCount: number; // 更新数
  deletedCount: number; // 删除数
  successCount: number; // 成功数 = inserted + updated + deleted
  failedCount: number;
  skippedCount: number;
  reconciliation: CountReconciliation; // 数量对账结果

  // 重试血缘
  lineage?: RetryLineage;

  // 状态与关联
  executionStatus: SyncStatus;
  verificationStatus: VerificationStatus;
  linkedVerificationId?: string;
  objectDetails: SyncObjectDetail[];
  failedRecords: SyncFailedRecord[];
  timeline: SyncTrajectoryStep[];
  statusNote?: string;
}

// 字段级对比差异
export interface FieldDifference {
  id: string;
  objectCode: string;
  objectName: string;
  objectType: string;
  softType: string;
  fieldName: string;
  plmSourceValue: string;
  mappedExpectedValue: string;
  manticoreActualValue: string;
  diffType: string; // '版本滞后' | '状态不一致' | '大文本旧值' | 'Manticore缺失记录'
  result: 'MATCH' | 'MISMATCH' | 'MISSING';
}

// 核验对象分布统计
export interface VerificationObjectDistribution {
  objectType: string;
  softType: string;
  checkedCount: number;
  exceptionCount: number;
  status: 'PASSED' | 'WARNING' | 'FAILED' | 'CHECKING';
}

// 一致性核验记录
export interface VerificationRecord {
  id: string; // e.g. CHK-20260825-001
  linkedBatchId: string;
  sourceSystem: string;
  objectsSummary: string[];
  method: VerificationMethod;
  methodLabel: string;
  sampleSize: number;
  integrityRate: number; // 完整率 (e.g. 99.99)
  fieldConsistencyRate: number; // 字段一致率 (e.g. 99.94)
  timelinessRate: number; // 时效达标率 (e.g. 98.70)
  exceptionCount: number;
  result: VerificationStatus;
  executedAt: string;
  executor: string;
  verificationScope?: 'FULL_BATCH' | 'OBJECT_SCOPE' | 'EXCEPTION_TARGET';
  objectDistributions: VerificationObjectDistribution[];
  linkedExceptionIds: string[];
  fieldDifferences: FieldDifference[];
  strategyNotes: string;
}

// 异常处置时间线节点
export interface ExceptionTimelineItem {
  id: string;
  node: string; // 发现异常 | 自动重试 | 人工补偿 | 待业务确认 | 重新核验 | 待复核 | 已恢复 | 已关闭
  timestamp: string;
  operator: string;
  note: string;
  result?: 'SUCCESS' | 'FAILED' | 'INFO';
}

// 同步数据质量异常
export interface SyncException {
  id: string; // e.g. EX-20260825-001
  objectCode: string;
  objectName: string;
  objectType: string;
  softType: string;
  exceptionType: ExceptionType;
  exceptionTypeLabel: string;
  businessDescription: string;
  sourceBatchId: string;
  linkedVerificationId?: string;
  latestReverificationStatus?: 'UNCHECKED' | 'CHECKING' | 'PASSED' | 'FAILED';
  severity: ExceptionSeverity;
  status: ExceptionStatus;
  retryCount: number;
  assignee: string;
  lastHandledTime: string;
  hasPermission: boolean; // 是否拥有当前角色补偿权限
  timeline: ExceptionTimelineItem[];
  closeConclusion?: string;
  businessConfirmReason?: string;
}

// 活跃页签
export type QualityActiveTab = 'SYNC_LOGS' | 'VERIFICATION' | 'EXCEPTION_DISPOSAL';
