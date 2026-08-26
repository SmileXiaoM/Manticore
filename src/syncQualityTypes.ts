/**
 * 一阶段：数据同步质量 - TypeScript 类型声明
 */

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
  status: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILED';
}

// 失败单条记录（技术跟踪与异常关联）
export interface SyncFailedRecord {
  id: string;
  objectCode: string;
  objectType: string;
  softType: string;
  businessReason: string;
  traceId: string;
  hasExceptionCreated: boolean;
  linkedExceptionId?: string;
  techDetail?: string;
}

// 同步轨迹步骤
export interface SyncTrajectoryStep {
  step: string;
  timestamp: string;
  status: 'DONE' | 'CURRENT' | 'WAITING' | 'ERROR';
  description: string;
}

// 同步批次
export interface SyncBatch {
  id: string; // e.g. SYNC-20260825-001
  sourceSystem: string; // 'IntePLM V21'
  objectsSummary: string[]; // ['Part', 'Document', 'Process']
  syncMethod: SyncMethod;
  sourceDataCount: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  startTime: string;
  endTime?: string;
  durationText: string;
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
