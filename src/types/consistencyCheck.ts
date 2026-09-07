/**
 * PLM — Manticore 数据一致性核验 (候选原型)
 * 链路：PLM 源端 → Manticore 实际数据
 * 与 "中间表 → Manticore 主表" 同步任务严格隔离
 */

export type ConsistencyStrategyType = 
  | 'RANDOM_SAMPLE'        // 策略一：随机抽查
  | 'FOCUS_AND_RANDOM'     // 策略二：重点＋随机
  | 'EXHAUSTIVE_SCOPE';    // 策略三：指定范围全部核验

export type FocusCriteriaType = 
  | 'HIGH_FREQUENCY'       // 高频修改 (基于PLM变更历史/审计记录)
  | 'RECENT_MODIFIED';     // 近期修改 (基于最后修改时间)

export type ConsistencyItemStatus = 
  | 'CONSISTENT'           // 一致
  | 'DIFFERENCE_FOUND'     // 发现差异
  | 'PENDING_RECHECK'      // 待复查 (排查正常延迟/正在修改)
  | 'INCOMPLETE';          // 检查未完成 (读取失败/权限不足)

export type ObjectSelectedReason = 
  | 'HIGH_FREQUENCY'       // 高频修改
  | 'RECENT_MODIFIED'      // 近期修改
  | 'RANDOM_SAMPLE'        // 随机样本
  | 'MANUAL_SPECIFIED';    // 手动指定

export interface ConsistencyCheckPlan {
  id: string;
  name: string;                         // 计划名称，如"零件日常核验"
  rootTypeCode: string;                 // 对象根类型，如 "PART"
  rootTypeName: string;                 // 零部件 (PART)
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY'; // 执行频率
  frequencyLabel: string;               // 每天 (低峰期)
  scheduledTime: string;                // 低峰执行时间，如 "02:30"
  timeWindowDays: number;               // 修改/统计窗口，如 7 天
  strategy: ConsistencyStrategyType;    // 选数策略
  maxSampleLimit: number;               // 每次对象数量上限，如 200
  focusCriteria: FocusCriteriaType;     // 重点依据 (仅组合策略生效)
  focusQuota: number;                   // 重点样本配额，如 100
  randomQuota: number;                  // 随机样本配额，如 100
  selectedScopeId?: string;             // 针对指定范围全量核验时选中的预设范围ID
  selectedScopeName?: string;           // 针对指定范围全量核验时选中的范围名称
  targetFields: Array<{
    fieldCode: string;
    fieldName: string;
    description: string;
  }>;
  enabled: boolean;                     // 是否启用
  updatedAt: string;
  isDemoPlan?: boolean;                 // 标注"演示参数 / 待确认"
}

export interface ConsistencyFieldComparison {
  fieldCode: string;
  fieldName: string;
  plmRawValue: string | number | null;
  mappedExpectedValue: string | number | null; // 经字段映射规则转换后的预期值
  manticoreActualValue: string | number | null; // Manticore实际存储值
  matchStatus: 'MATCH' | 'MISMATCH' | 'TARGET_MISSING' | 'UNVERIFIABLE';
  note?: string; // 如"按材质字典转为标准中文名"，"版本不匹配"
}

export interface ConsistencyObjectResult {
  objectId: string;                     // 对象唯一标识 (如 P-30001)
  objectName: string;                   // 物料名称
  rootTypeCode: string;
  selectedReason: ObjectSelectedReason; // 选中原因
  modifyCount?: number;                 // 高频修改次数 (如 30 次)
  lastModifiedAt?: string;              // 最后修改时间
  status: ConsistencyItemStatus;
  statusDetail: string;                 // 差异或状态原因说明
  differenceFields: string[];           // 存在差异的字段列表
  fields: ConsistencyFieldComparison[];
  isTargetMissing?: boolean;            // 疑似目标缺失
  recheckReason?: string;               // 待复查原因 (如"PLM处于活动编辑期，修改时间距今2分钟")
  incompleteReason?: string;            // 未完成原因 (如"PLM接口超时或目标无只读读取权限")
}

export interface ConsistencyBatchRecord {
  id: string;                           // 批次号，如 CC-20260907-001
  planId?: string;
  planName: string;
  triggerType: 'SCHEDULED' | 'MANUAL_BY_PLAN' | 'MANUAL_CUSTOM'; // 自动计划 / 手动按计划 / 手动临时指定
  rootTypeCode: string;
  rootTypeName: string;
  scopeDescription: string;             // 核验范围描述
  strategySummary: string;              // 选数策略摘要
  executedAt: string;                   // 执行时间
  plmReadTime: string;                  // PLM 读取耗时/时间点
  manticoreReadTime: string;            // Manticore 读取耗时/时间点
  benchmarkSource: string;              // 数据基准来源 (PLM 源端主记录)
  
  // 样本统计指标
  plannedCount: number;                 // 计划样本数
  actualCount: number;                  // 实际样本数
  focusCount: number;                   // 高频样本数
  randomCount: number;                  // 随机样本数
  manualCount: number;                  // 手动指定样本数
  deduplicatedCount: number;            // 去重数量
  quotaSupplementInfo?: string;         // 补足说明：高频不足时自动从随机补足，或总体不足原因
  
  // 结果统计
  consistentCount: number;              // 一致数量
  differenceCount: number;              // 发现差异数量
  pendingRecheckCount: number;          // 待复查数量
  incompleteCount: number;              // 检查未完成数量
  
  // 冻结 ID 列表
  frozenObjectIds: string[];
  
  // 结果对象明细
  objectResults: ConsistencyObjectResult[];
  
  status: 'COMPLETED' | 'RUNNING';
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

/**
 * 统一按本地日期生成批次号日期代码 YYYYMMDD
 */
export function formatLocalDateCode(date: Date = new Date()): string {
  const pad = (num: number) => String(num).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
}
