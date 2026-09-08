/**
 * 数据一致性核验类型声明与统一统计计算
 * 遵循业务口径：单一根类型、动态正式查询底座字段快照、统一统计口径
 */

// 统一对象结果状态（四种核心状态，无歧义主状态）
export type ConsistencyItemStatus = 
  | 'CONSISTENT'          // 一致
  | 'INCONSISTENT'        // 不一致（包含字段不符、目标记录缺失等）
  | 'PENDING_RECHECK'     // 待复查（处于同步管道延迟中，暂不判定为故障）
  | 'UNABLE_TO_COMPARE';  // 无法比对（唯一键缺失、重复或源数据不可读）

// 统一任务状态
export type ConsistencyTaskStatus = 
  | 'RUNNING'             // 核验中
  | 'COMPLETED'           // 核验完成
  | 'FAILED';             // 核验失败

export type ConsistencyStrategyType = 
  | 'RANDOM_SAMPLE'        // 抽检核验
  | 'EXHAUSTIVE_SCOPE'     // 指定范围全量核验
  | 'SPECIFIC_IDS';        // 指定对象核验

export type ObjectSelectedReason = 
  | 'HIGH_FREQUENCY'       // 重点高频
  | 'RECENT_MODIFIED'      // 近期修改
  | 'RANDOM_SAMPLE'        // 随机抽检
  | 'MANUAL_SPECIFIED';    // 手工指定

export interface ConsistencyFieldComparison {
  fieldCode: string;
  fieldName: string;
  plmRawValue: string | number | null;
  mappedExpectedValue: string | number | null; // 经字段映射规则转换后的预期值
  manticoreActualValue: string | number | null; // Manticore实际存储值
  matchStatus: 'MATCH' | 'MISMATCH' | 'TARGET_MISSING' | 'UNVERIFIABLE';
  note?: string;
}

export interface ConsistencyObjectResult {
  objectId: string;                     // 对象唯一标识 (如 P-30001, DOC-50001)
  objectName: string;                   // 业务名称
  rootTypeCode: string;
  selectedReason: ObjectSelectedReason; // 选中原因
  modifyCount?: number;
  lastModifiedAt?: string;              // 最后修改时间
  status: ConsistencyItemStatus;
  statusDetail: string;                 // 差异或状态原因说明
  differenceFields: string[];           // 存在差异的字段列表
  fields: ConsistencyFieldComparison[];
  isTargetMissing?: boolean;            // 目标记录缺失（归属于 INCONSISTENT 的原因）
  recheckReason?: string;               // 待复查原因
  unableToCompareReason?: string;       // 无法比对原因
}

// 纳入核验的字段定义
export interface ComparisonFieldItem {
  sourceFieldKey: string;
  manticoreField: string;
  displayName: string;
  dataType: string;
  comparisonMethod: string;
}

// 被排除字段说明
export interface ExcludedFieldItem {
  sourceFieldKey: string;
  fieldName: string;
  reason: string;
}

// 任务启动时冻结的字段快照（保证历史记录可追溯，不引入配置版本号）
export interface ComparisonFieldSnapshot {
  rootTypeCode: string;
  uniqueKeyField: {
    sourceFieldKey: string;
    manticoreField: string;
    displayName: string;
  };
  includedFields: ComparisonFieldItem[];
  excludedFields: ExcludedFieldItem[];
  snapshotTime: string;
}

export interface ConsistencyBatchRecord {
  id: string;                           // 批次号，如 CC-20260907-001
  planName: string;
  triggerType: 'SCHEDULED' | 'MANUAL_BY_PLAN' | 'MANUAL_CUSTOM';
  rootTypeCode: string;
  rootTypeName: string;
  scopeMode: ConsistencyStrategyType;   // 模式：抽检 / 全量 / 定向
  scopeDescription: string;             // 核验范围描述
  strategySummary: string;              // 选数策略摘要
  executedAt: string;                   // 执行时间
  
  // 样本统计指标
  plannedCount: number;                 // 计划样本数
  actualCount: number;                  // 实际样本数（包含一致、不一致、待复查、无法比对）
  
  // 结果统计
  consistentCount: number;              // 一致数量
  differenceCount: number;              // 不一致数量（与 inconsistentCount 等价）
  pendingRecheckCount: number;          // 待复查数量
  incompleteCount: number;              // 无法比对数量（即 unableToCompareCount）
  
  // 冻结字段快照与对象
  comparisonFieldSnapshot?: ComparisonFieldSnapshot;
  frozenObjectIds: string[];
  objectResults: ConsistencyObjectResult[];
  
  status: ConsistencyTaskStatus;
  failedStage?: string;                 // 任务失败阶段
  failedReason?: string;                // 任务失败原因
}

/**
 * 唯一统计计算函数
 * 顶部指标卡、历史列表、详情抽屉共同调用！
 * 严格口径：
 * - 有效完成比对数 = 一致数 + 不一致数
 * - 待复查、无法比对、未覆盖和任务级失败不计入分母
 * - 分母为 0 时显示 '--'，不得显示 100% 或 0%
 * - 百分比旁必须显示分子和分母，例如 46 / 48
 */
export interface ConsistencyStats {
  effectiveComparedCount: number;       // 有效比对数 (consistent + inconsistent)
  effectiveCount: number;               // 兼容别名
  consistentCount: number;
  inconsistentCount: number;
  differenceCount: number;              // 兼容别名
  pendingCount: number;                 // 待复查数
  unableCount: number;                  // 无法比对数
  pendingTotalCount: number;            // 待处理数合计 (待复查 + 无法比对)
  consistencyRate: number | null;       // 数值百分比，如 95.8；分母为0时为 null
  ratePercentOnly: string;              // 如 "95.8%" 或 "--"
  fractionDisplay: string;              // 如 "(46 / 48)" 或 "(0 / 0)"
  rateDisplay: string;                  // 如 "95.8% (46 / 48)" 或 "-- (0 / 0)"
  rateText: string;                     // 兼容别名
  fractionText: string;                 // 兼容别名
}

export function calculateConsistencyStats(batch: {
  consistentCount: number;
  differenceCount?: number;
  pendingRecheckCount?: number;
  incompleteCount?: number;
}): ConsistencyStats {
  const consistent = batch.consistentCount || 0;
  const inconsistent = batch.differenceCount || 0;
  const pending = batch.pendingRecheckCount || 0;
  const unable = batch.incompleteCount || 0;
  const effective = consistent + inconsistent;
  const pendingTotal = pending + unable;

  if (effective === 0) {
    return {
      effectiveComparedCount: 0,
      effectiveCount: 0,
      consistentCount: 0,
      inconsistentCount: inconsistent,
      differenceCount: inconsistent,
      pendingCount: pending,
      unableCount: unable,
      pendingTotalCount: pendingTotal,
      consistencyRate: null,
      ratePercentOnly: '--',
      fractionDisplay: '(0 / 0)',
      rateDisplay: '-- (0 / 0)',
      rateText: '--',
      fractionText: '(0 / 0)'
    };
  }

  const rate = (consistent / effective) * 100;
  const rateFixed = rate.toFixed(1);
  const fractionStr = `(${consistent} / ${effective})`;
  const rateDisplayStr = `${rateFixed}% ${fractionStr}`;
  return {
    effectiveComparedCount: effective,
    effectiveCount: effective,
    consistentCount: consistent,
    inconsistentCount: inconsistent,
    differenceCount: inconsistent,
    pendingCount: pending,
    unableCount: unable,
    pendingTotalCount: pendingTotal,
    consistencyRate: rate,
    ratePercentOnly: `${rateFixed}%`,
    fractionDisplay: fractionStr,
    rateDisplay: rateDisplayStr,
    rateText: `${rateFixed}%`,
    fractionText: fractionStr
  };
}

/**
 * 统一本地时间格式化函数
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

/**
 * 统一按本地日期生成批次号日期代码 YYYYMMDD
 */
export function formatLocalDateCode(date: Date = new Date()): string {
  const pad = (num: number) => String(num).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
}
