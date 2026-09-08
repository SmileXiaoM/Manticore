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
  | 'MANUAL_SPECIFIED'     // 手工指定
  | 'SCOPE_EXHAUSTIVE';    // 指定范围全量

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
  manticoreType: string;
  comparisonMethod: string;
}

// 被排除字段说明
export interface ExcludedFieldItem {
  sourceFieldKey: string;
  fieldName: string;
  sourceDataType?: string;
  actualManticoreType?: string;
  reason: string;
}

// 任务启动时冻结的字段快照（保证历史记录可追溯，不引入配置版本号）
export interface ComparisonFieldSnapshot {
  rootTypeCode: string;
  uniqueKeyField: {
    sourceFieldKey: string;
    manticoreField: string;
    displayName: string;
    sourceDataType?: string;
    manticoreType?: string;
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
  requestedObjectIds?: string[];        // SPECIFIC_IDS 模式下用户实际输入的去重 ID 清单
  sourceSyncBatchId?: string;           // 关联的数据同步批次 ID (若有)
  
  status: ConsistencyTaskStatus;
  failedStage?: string;                 // 任务失败阶段
  failedReason?: string;                // 任务失败原因
}

// 显式可复用的确定性比较能力表
export interface ComparisonCapabilityRule {
  isVerifiable: boolean;
  allowedManticoreTypes: string[];
  manticoreType: string;               // 底座期望类型说明
  manticoreTypeDisplay?: string;
  comparisonMethod: string;
  excludeReason?: string;
}

export const COMPARISON_CAPABILITY_TABLE: Record<string, {
  isVerifiable: boolean;
  allowedManticoreTypes: string[];
  manticoreType: string;
  comparisonMethod: string;
  excludeReason?: string;
}> = {
  TEXT: {
    isVerifiable: true,
    allowedManticoreTypes: ['STRING', 'TEXT'],
    manticoreType: 'STRING',
    comparisonMethod: '使用同步映射后的规范化结果做精确相等'
  },
  STRING: {
    isVerifiable: true,
    allowedManticoreTypes: ['STRING', 'TEXT'],
    manticoreType: 'STRING',
    comparisonMethod: '使用同步映射后的规范化结果做精确相等'
  },
  CODE: {
    isVerifiable: true,
    allowedManticoreTypes: ['STRING', 'TEXT'],
    manticoreType: 'STRING',
    comparisonMethod: '使用同步映射后的编码值做精确相等'
  },
  ENUM: {
    isVerifiable: true,
    allowedManticoreTypes: ['STRING', 'TEXT'],
    manticoreType: 'STRING',
    comparisonMethod: '比较同步后的正式枚举值或编码'
  },
  NUMERIC: {
    isVerifiable: true,
    allowedManticoreTypes: ['FLOAT', 'DOUBLE', 'INTEGER', 'INT', 'BIGINT'],
    manticoreType: 'INTEGER/FLOAT',
    comparisonMethod: '按既有同步精度规则比较数值'
  },
  INTEGER: {
    isVerifiable: true,
    allowedManticoreTypes: ['INTEGER', 'INT', 'BIGINT', 'UINT'],
    manticoreType: 'INTEGER',
    comparisonMethod: '按既有同步精度规则比较数值'
  },
  FLOAT: {
    isVerifiable: true,
    allowedManticoreTypes: ['FLOAT', 'DOUBLE', 'INTEGER', 'BIGINT'],
    manticoreType: 'FLOAT',
    comparisonMethod: '按既有同步精度规则比较数值'
  },
  NUMERIC_WITH_UNIT: {
    isVerifiable: true,
    allowedManticoreTypes: ['FLOAT', 'DOUBLE', 'INTEGER', 'BIGINT'],
    manticoreType: 'FLOAT',
    comparisonMethod: '先按同步规则统一单位和精度，再比较数值'
  },
  BOOLEAN: {
    isVerifiable: true,
    allowedManticoreTypes: ['BOOL', 'BOOLEAN', 'INTEGER', 'INT'],
    manticoreType: 'BOOL/INTEGER',
    comparisonMethod: '比较同步后的布尔规范值'
  },
  BOOL: {
    isVerifiable: true,
    allowedManticoreTypes: ['BOOL', 'BOOLEAN', 'INTEGER', 'INT'],
    manticoreType: 'BOOL/INTEGER',
    comparisonMethod: '比较同步后的布尔规范值'
  },
  DATE: {
    isVerifiable: true,
    allowedManticoreTypes: ['TIMESTAMP', 'BIGINT', 'DATETIME', 'INTEGER'],
    manticoreType: 'TIMESTAMP/BIGINT',
    comparisonMethod: '统一到同步落库的时区和精度后比较'
  },
  DATETIME: {
    isVerifiable: true,
    allowedManticoreTypes: ['TIMESTAMP', 'BIGINT', 'DATETIME', 'INTEGER'],
    manticoreType: 'TIMESTAMP/BIGINT',
    comparisonMethod: '统一到同步落库的时区和精度后比较'
  },
  TIMESTAMP: {
    isVerifiable: true,
    allowedManticoreTypes: ['TIMESTAMP', 'BIGINT', 'DATETIME', 'INTEGER'],
    manticoreType: 'TIMESTAMP/BIGINT',
    comparisonMethod: '统一到同步落库的时区和精度后比较'
  },
  CATEGORY_TREE: {
    isVerifiable: true,
    allowedManticoreTypes: ['STRING', 'TEXT'],
    manticoreType: 'STRING',
    comparisonMethod: '使用同步落库的规范路径值比较'
  },
  PATH: {
    isVerifiable: true,
    allowedManticoreTypes: ['STRING', 'TEXT'],
    manticoreType: 'STRING',
    comparisonMethod: '使用同步落库的规范路径值比较'
  },
  LONG_TEXT: {
    isVerifiable: false,
    allowedManticoreTypes: [],
    manticoreType: 'STRING',
    comparisonMethod: '不适用',
    excludeReason: '当前类型暂无确定性核验规则（非结构化长文本）'
  },
  JSON: {
    isVerifiable: false,
    allowedManticoreTypes: [],
    manticoreType: 'JSON',
    comparisonMethod: '不适用',
    excludeReason: '当前类型暂无确定性核验规则（非标JSON结构）'
  },
  MULTI_VALUE: {
    isVerifiable: false,
    allowedManticoreTypes: [],
    manticoreType: 'MULTI',
    comparisonMethod: '不适用',
    excludeReason: '当前类型暂无确定性核验规则（多值集合无序）'
  },
  BINARY: {
    isVerifiable: false,
    allowedManticoreTypes: [],
    manticoreType: 'BINARY',
    comparisonMethod: '不适用',
    excludeReason: '当前类型暂无确定性核验规则（二进制数据）'
  }
};

export function getComparisonCapability(sourceDataType?: string, actualManticoreType?: string): ComparisonCapabilityRule {
  const dt = sourceDataType?.toUpperCase().trim() || 'UNKNOWN';
  const baseRule = COMPARISON_CAPABILITY_TABLE[dt];
  if (!baseRule || !baseRule.isVerifiable) {
    return {
      isVerifiable: false,
      allowedManticoreTypes: baseRule?.allowedManticoreTypes || [],
      manticoreType: baseRule?.manticoreType || 'UNKNOWN',
      comparisonMethod: '不适用',
      excludeReason: baseRule?.excludeReason || `来源类型 [${dt}] 暂无确定性核验规则`
    };
  }

  // 双端兼容性校验：来源业务类型 + Manticore 实际类型
  if (actualManticoreType) {
    const act = actualManticoreType.toUpperCase().trim();
    const isMatched = baseRule.allowedManticoreTypes.some(t => act.includes(t) || t.includes(act));
    if (!isMatched) {
      return {
        isVerifiable: false,
        allowedManticoreTypes: baseRule.allowedManticoreTypes,
        manticoreType: baseRule.manticoreType,
        comparisonMethod: '不适用',
        excludeReason: `来源业务类型 [${dt}] 映射到底座 [${act}]，当前无确定性比较规则（期望底座: ${baseRule.manticoreType}）`
      };
    }
  }

  return {
    isVerifiable: true,
    allowedManticoreTypes: baseRule.allowedManticoreTypes,
    manticoreType: baseRule.manticoreType,
    comparisonMethod: baseRule.comparisonMethod
  };
}

/**
 * 统一显示名解析函数（全站唯一兜底顺序）
 * trim(displayTitle) -> trim(sourceDisplayName) -> trim(sourceFieldName) -> trim(sourceFieldKey) -> 未命名属性
 */
export function resolveFieldDisplayName(field: {
  displayTitle?: string | null;
  sourceDisplayName?: string | null;
  sourceFieldName?: string | null;
  sourceFieldKey?: string | null;
}): string {
  if (field.displayTitle && field.displayTitle.trim()) return field.displayTitle.trim();
  if (field.sourceDisplayName && field.sourceDisplayName.trim()) return field.sourceDisplayName.trim();
  if (field.sourceFieldName && field.sourceFieldName.trim()) return field.sourceFieldName.trim();
  if (field.sourceFieldKey && field.sourceFieldKey.trim()) return field.sourceFieldKey.trim();
  return '未命名属性';
}

/**
 * 统一对象核验主状态元信息映射（仅四种主状态，无歧义，禁止将目标记录缺失作为第五种状态）
 */
export const OBJECT_STATUS_META: Record<ConsistencyItemStatus, {
  label: string;
  badgeClass: string;
  dotClass: string;
}> = {
  CONSISTENT: {
    label: '一致',
    badgeClass: 'bg-[var(--ty-green-lightest-color)] text-[var(--ty-green-color)] border border-[var(--ty-green-color)]/30',
    dotClass: 'bg-[var(--ty-green-color)]'
  },
  INCONSISTENT: {
    label: '不一致',
    badgeClass: 'bg-[var(--ty-red-lightest-color)] text-[var(--ty-red-color)] border border-[var(--ty-red-color)]/30',
    dotClass: 'bg-[var(--ty-red-color)]'
  },
  PENDING_RECHECK: {
    label: '待复查',
    badgeClass: 'bg-[var(--ty-orange-lightest-color)] text-[var(--ty-orange-color)] border border-[var(--ty-orange-color)]/30',
    dotClass: 'bg-[var(--ty-orange-color)]'
  },
  UNABLE_TO_COMPARE: {
    label: '无法比对',
    badgeClass: 'bg-[var(--ty-fill-weak-dark-color)] text-[var(--ty-font-sub-color)] border border-[var(--ty-border-color)]',
    dotClass: 'bg-[var(--ty-font-sub-light-color)]'
  }
};

export interface ConsistencyCheckRequest {
  rootTypeCode: string;
  rootTypeName: string;
  scopeMode: ConsistencyStrategyType;
  sampleCount?: number;
  scopeId?: string;
  scopeName?: string;
  scopeDescription?: string;
  requestedObjectIds?: string[];
  comparisonFieldSnapshot: ComparisonFieldSnapshot;
  sourceSyncBatchId?: string;
  simulateFailure?: boolean;
}

/**
 * 唯一统计计算函数
 * 顶部指标卡、历史列表、详情抽屉共同调用！
 * 严格口径：
 * - 有效完成比对数 = 一致数 + 不一致数
 * - 待复查、无法比对、未覆盖和任务级失败不计入分母
 * - 分母为 0 时显示 '--'，不得显示 100% 或 0%
 * - 百分比旁显示分子分母格式如 (46 / 48)
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
  fractionWithoutParens: string;        // 如 "46 / 48" 或 "0 / 0"
  rateDisplay: string;                  // 如 "95.8% (46 / 48)" 或 "-- (0 / 0)"
  rateText: string;                     // 兼容别名 (纯百分比或--)
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
      fractionDisplay: '（0 / 0）',
      fractionWithoutParens: '0 / 0',
      rateDisplay: '--（0 / 0）',
      rateText: '--',
      fractionText: '（0 / 0）'
    };
  }

  const rate = (consistent / effective) * 100;
  const rateFixed = rate.toFixed(1);
  const fractionStr = `（${consistent} / ${effective}）`;
  const fractionPure = `${consistent} / ${effective}`;
  const rateDisplayStr = `${rateFixed}%${fractionStr}`;
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
    fractionWithoutParens: fractionPure,
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

/** 完整 UUID 同时用于任务更新、列表 key 和详情定位。 */
export function createConsistencyBatchId(): string {
  return `CC-${formatLocalDateCode()}-${crypto.randomUUID()}`;
}
