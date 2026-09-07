/**
 * 一阶段：对象与字段映射配置 - 领域数据类型定义
 * 严格对齐最新业务口径：
 * 1. 仅支持根类型配置 (Part, Document, Process)，不维护软类型
 * 2. 彻底移除版本概念：没有配置版本、底座版本等业务概念，仅保留正式查询底座作为当前可查数据集合
 * 3. 根类型为数据同步与查询唯一权威实体
 * 4. 数据同步单条异常不中止任务，显示「同步完成（有异常）」
 * 5. 来源显示名空值安全兜底，保留历史非空名称，不破坏已有映射
 */

// 来源系统适配器元数据
export interface SourceSystemInfo {
  id: string;
  name: string;
  code: string;
  version: string;
  type: 'PLM' | 'ERP' | 'MES' | 'OTHER';
  status: 'ONLINE' | 'OFFLINE';
  description?: string;
}

// 根类型配置状态 (派生自已配置字段数与草稿数)
export type RootTypeConfigStatus =
  | 'NOT_CONFIGURED' // 未配置 (已配置 = 0, 草稿 = 0)
  | 'DRAFTING' // 草稿中 (已配置 = 0, 草稿 > 0)
  | 'CONFIGURED' // 已配置 (已配置 > 0, 草稿 = 0)
  | 'CONFIGURED_WITH_DRAFT'; // 已配置（有草稿） (已配置 > 0, 草稿 > 0)

// 根类型数据同步状态
export type RootTypeSyncStatus =
  | 'NOT_SYNCED' // 未同步 (从未完成过同步)
  | 'PENDING' // 待同步 (数据影响配置已生效但尚未同步)
  | 'RUNNING' // 同步中 (任务正在执行)
  | 'RESETTING' // 重置中 (正在执行接入重置与索引清理)
  | 'COMPLETED' // 已同步 (任务执行结束，异常记录数为 0)
  | 'COMPLETED_WITH_ERRORS' // 同步完成（有异常） (任务执行结束，存在记录级错误，未中止)
  | 'FAILED'; // 同步失败 (任务未启动成功或被系统级致命错误中止)

// 实际同步执行策略（后台自动判定，写入审计与任务记录，前端不提供选择）
export type SyncExecutionStrategy =
  | 'INITIAL_REBUILD' // 初始化重建 (首次同步或重置后首次)
  | 'INCREMENTAL_REFRESH' // 增量刷新 (日常水位增量)
  | 'HISTORY_BACKFILL' // 历史回填 (数据影响变更生效后补齐历史底座数据)
  | 'RETRY_COMPENSATION'; // 补偿重试 (针对上一任务记录级异常或失败重试)

// 执行策略中文标签映射
export const SYNC_STRATEGY_LABELS: Record<SyncExecutionStrategy, string> = {
  INITIAL_REBUILD: '初始化重建',
  INCREMENTAL_REFRESH: '增量刷新',
  HISTORY_BACKFILL: '历史回填',
  RETRY_COMPENSATION: '补偿重试'
};

// 重置接入审计记录
export interface ResetAuditRecord {
  id: string; // 任务流水号，如 'RESET-20260907-001'
  rootTypeId: string; // 根类型稳定 ID，如 'PART'
  rootTypeName: string; // 显示名称，如 '零部件 (Part)'
  operator: string; // 操作人
  initiatedAt: string; // 发起时间
  completedAt?: string; // 完成时间
  status: 'RESETTING' | 'SUCCESS' | 'FAILED'; // 最终状态
  confirmedInputCode: string; // 用户输入的确认编码
  isInputCodeMatched: boolean; // 是否完全匹配

  beforeConfiguredCount: number; // 操作前已生效字段数
  beforeDraftCount: number; // 操作前草稿数
  beforeFormalQueryableCount: number; // 操作前正式可查字段数
  beforeDocCount: number; // 操作前索引数据量

  deletedDocCount: number; // 实际删除的索引数据量
  retainedDraftCount: number; // 保留并转草稿的字段映射数量

  failureStage?: string; // 失败阶段 (若失败)
  failureReason?: string; // 失败原因 (若失败)
  manticoreSchemaRetentionNote: '待确认'; // 标记为待确认
}

// 异常记录条目定义
export interface SyncErrorRecord {
  id: string;
  recordKey: string; // 如物料编号或主键 'PART-2026-X091'
  sourceSystemId: string;
  rootTypeId: string;
  errorField?: string;
  errorCode: string;
  errorMsg: string; // 错误信息
  rawPayloadSummary: string;
  timestamp: string;
  status: 'UNRESOLVED' | 'RESOLVED' | 'RETRY_PENDING';
}

// 根类型核心模型
export interface MappingObjectType {
  id: string; // 'PART' | 'DOCUMENT' | 'PROCESS'
  code: string; // 'Part' | 'Document' | 'Process'
  name: string; // '零部件 (Part)' | '文档 (Document)' | '工艺路线 (Process)'
  sourceSystemId: string; // 'PLM_WINCHILL'
  sourceSystemName: string; // 'Windchill PLM'
  description: string;
  
  // 统计指标
  configuredFieldCount: number; // 已配置生效字段数
  formalQueryableFieldCount: number; // 正式可查字段数 (当前底座快照中的字段数)
  draftFieldCount: number; // 草稿字段数 (纯新建草稿 + 生效字段的草稿修改)

  // Manticore 物理索引数据量 (确定性数据，无法获取时显示待获取)
  manticoreDocCount?: number;

  // 状态
  configStatus: RootTypeConfigStatus;
  syncStatus: RootTypeSyncStatus;

  // 同步执行细节
  lastSyncedAt?: string;
  lastSyncBatchId?: string;
  lastSyncSuccessCount?: number; // 成功记录数 e.g. 12480
  lastSyncErrorCount?: number; // 异常记录数 e.g. 3
  lastSyncErrorRecords?: SyncErrorRecord[]; // 异常记录明细
  lastSyncErrorMsg?: string; // 致命失败原因 (仅当 syncStatus === 'FAILED' 时)

  lastSyncExecutionStrategy?: SyncExecutionStrategy; // 系统自动判定的执行方式
  lastSyncStrategyReason?: string; // 判定依据与说明

  hasPendingSyncChanges?: boolean; // 是否有待同步的数据影响变更
}

// 字段配置状态
export type FieldConfigStatus = 'CONFIGURED' | 'DRAFT';

// PLM 来源字段元数据
export interface SourceFieldMeta {
  sourceFieldKey: string; // 稳定的唯一字段标识 e.g. 'iba_part_number', 'master_name'
  sourceFieldName: string; // 源系统字段名 e.g. 'partNumber', 'name'
  sourceDisplayName: string; // 源系统显示名 (可能为空或缺失)
  sourceDataType: 'TEXT' | 'LONG_TEXT' | 'ENUM' | 'NUMERIC' | 'NUMERIC_WITH_UNIT' | 'DATE' | 'CATEGORY_TREE' | 'BOOLEAN';
  sourceDataTypeLabel: string;
  unitFamily?: string;
  defaultUnit?: string;
  enumOptions?: { code: string; label: string }[];
  categoryTreeRoot?: string;
  isRequired: boolean;
  isPrimaryKey?: boolean;
  description?: string;
}

// 来源显示名安全兜底解析函数
export function resolveSourceDisplayName(
  sourceDisplayName?: string | null,
  sourceFieldName?: string,
  sourceFieldKey?: string
): { resolvedName: string; isMissing: boolean } {
  const trimmed = (sourceDisplayName ?? '').trim();
  if (trimmed.length > 0) {
    return { resolvedName: trimmed, isMissing: false };
  }
  // 缺失时依次按 sourceFieldName -> sourceFieldKey 兜底
  const fallback = (sourceFieldName ?? '').trim() || (sourceFieldKey ?? '').trim() || '未命名属性';
  return { resolvedName: fallback, isMissing: true };
}

// Manticore 字段类型
export type ManticoreFieldType =
  | 'STRING'
  | 'TEXT'
  | 'INTEGER'
  | 'FLOAT'
  | 'BOOLEAN'
  | 'TIMESTAMP'
  | 'JSON'
  | 'MULTI_VALUE';

// 超链接配置
export interface HyperlinkConfig {
  urlTemplate: string;
  oidSourceField: string;
  otypeSourceField: string;
  displayTextSource: 'FIELD_VALUE' | 'STATIC_TEXT' | 'CUSTOM_TEMPLATE';
  staticDisplayText?: string;
  staticLabel?: string;
  customTemplate?: string;
  openTarget: '_blank' | '_self';
  onMissingParam: 'HIDE_LINK_SHOW_TEXT' | 'HIDE_ENTIRE_COLUMN' | 'SHOW_DISABLED_LINK';
}

// 字段映射项核心模型 (仅归属根类型，无软类型)
export interface FieldMappingItem {
  id: string;
  rootTypeId: string; // 'PART' | 'DOCUMENT' | 'PROCESS'
  sourceSystemId: string; // 'PLM_WINCHILL'

  // 来源元数据
  sourceFieldKey: string; // 稳定业务键 (sourceSystemId + rootTypeId + sourceFieldKey 唯一)
  sourceFieldName: string;
  sourceDisplayName: string;
  isDisplayNameMissing?: boolean; // 是否属于 PLM 未返回显示名而兜底的字段
  sourceDataType: 'TEXT' | 'LONG_TEXT' | 'ENUM' | 'NUMERIC' | 'NUMERIC_WITH_UNIT' | 'DATE' | 'CATEGORY_TREE' | 'BOOLEAN';
  sourceDataTypeLabel: string;
  unitFamily?: string;
  defaultUnit?: string;

  // 目标 Manticore 配置
  manticoreField: string;
  manticoreType: ManticoreFieldType;
  displayTitle: string;
  displayType: 'CONDITION_QUERY' | 'FULLTEXT' | 'CATEGORY_PATH' | 'ENUM_BADGE' | 'LINK' | 'HIDDEN';
  queryCapability: 'QUERY_CONDITION' | 'FULLTEXT_SEARCH' | 'BOTH' | 'NONE';

  // 检索与展示能力开关
  isQueryCondition?: boolean;
  isDisplayInResult: boolean;
  isSortable: boolean;
  isFulltextSearch?: boolean;
  isUniqueKey?: boolean;

  defaultColumnWidth?: number;
  displayOrder?: number; // 顺序号 (大于0的正整数，同一根类型内唯一)
  defaultDisplayOrder?: number; // 兼容历史引用
  hyperlinkConfig?: HyperlinkConfig;

  // 状态与底座归属
  configStatus: FieldConfigStatus; // 'CONFIGURED' | 'DRAFT'
  hasDraftModification: boolean; // 若为已配置字段，是否存在草稿修改
  draftData?: Partial<FieldMappingItem>; // 关联的草稿修改内容

  isDataImpactingChange: boolean; // 是否为数据影响变更 (改变物理字段/类型/查询/全文/主键等)
  isInFormalQueryBase: boolean; // 是否已进入当前正式查询底座快照

  updatedAt: string;
  updatedBy: string;
}

// 获取字段顺序号 (优先取草稿顺序号)
export function getFieldDisplayOrder(field: Partial<FieldMappingItem>): number {
  if (field.hasDraftModification && field.draftData?.displayOrder !== undefined) {
    return field.draftData.displayOrder;
  }
  return field.displayOrder ?? field.defaultDisplayOrder ?? 1;
}

// 获取当前根类型下已占用的最大顺序号 (若无字段则为 0)
export function getMaxDisplayOrder(fields: FieldMappingItem[], rootTypeId: string): number {
  const rootFields = fields.filter(f => f.rootTypeId === rootTypeId);
  if (rootFields.length === 0) return 0;
  return Math.max(...rootFields.map(f => getFieldDisplayOrder(f)));
}

// 检查顺序号在同一根类型内是否被其他字段占用
export function isDisplayOrderOccupied(
  fields: FieldMappingItem[],
  rootTypeId: string,
  targetOrder: number,
  excludeFieldId?: string
): boolean {
  return fields.some(f =>
    f.rootTypeId === rootTypeId &&
    f.id !== excludeFieldId &&
    getFieldDisplayOrder(f) === targetOrder
  );
}

// 顺序号校验：必须为大于 0 的整数，并在同一根类型内保持唯一；重复时阻止保存并明确提示“顺序号已被占用”
export function validateDisplayOrder(
  order: any,
  existingFields?: FieldMappingItem[],
  rootTypeId?: string,
  excludeFieldId?: string
): { valid: boolean; errorMsg?: string; errorMessage?: string } {
  if (order === undefined || order === null || order === '' || Number.isNaN(Number(order))) {
    const msg = '顺序号为必填项，请输入正整数';
    return { valid: false, errorMsg: msg, errorMessage: msg };
  }
  const num = Number(order);
  if (!Number.isInteger(num)) {
    const msg = '顺序号必须为整数，不可输入小数';
    return { valid: false, errorMsg: msg, errorMessage: msg };
  }
  if (num <= 0) {
    const msg = '顺序号必须为大于 0 的整数';
    return { valid: false, errorMsg: msg, errorMessage: msg };
  }
  if (existingFields && rootTypeId) {
    if (isDisplayOrderOccupied(existingFields, rootTypeId, num, excludeFieldId)) {
      const msg = '顺序号已被占用';
      return { valid: false, errorMsg: msg, errorMessage: msg };
    }
  }
  return { valid: true };
}

// 根类型级正式查询底座快照
export interface QueryBaseSnapshot {
  rootTypeId: string;
  fields: FieldMappingItem[];
  syncedAt?: string;
  batchId?: string;
}

// 统一数据影响判定函数：对比基准字段与草稿/新值
export function checkIsDataImpactingChange(
  baseField: FieldMappingItem | null,
  draftOrNew: {
    manticoreField?: string;
    manticoreType?: ManticoreFieldType;
    sourceDataType?: string;
    isQueryCondition?: boolean;
    isFulltextSearch?: boolean;
    queryCapability?: 'QUERY_CONDITION' | 'FULLTEXT_SEARCH' | 'BOTH' | 'NONE';
    isUniqueKey?: boolean;
    sourceFieldKey?: string;
  }
): boolean {
  // 1. 新增字段：默认为数据影响变更 (需要构建索引并填充底座数据)
  if (!baseField) {
    return true;
  }

  // 2. Manticore 物理字段名变更
  if (draftOrNew.manticoreField && draftOrNew.manticoreField !== baseField.manticoreField) {
    return true;
  }

  // 3. Manticore 存储类型变更
  if (draftOrNew.manticoreType && draftOrNew.manticoreType !== baseField.manticoreType) {
    return true;
  }

  // 4. PLM 来源数据类型变更
  if (draftOrNew.sourceDataType && draftOrNew.sourceDataType !== baseField.sourceDataType) {
    return true;
  }

  // 5. 条件查询能力变更
  if (
    draftOrNew.isQueryCondition !== undefined &&
    draftOrNew.isQueryCondition !== baseField.isQueryCondition
  ) {
    return true;
  }

  // 6. 全文检索能力变更
  if (
    draftOrNew.isFulltextSearch !== undefined &&
    draftOrNew.isFulltextSearch !== baseField.isFulltextSearch
  ) {
    return true;
  }

  // 7. 派生综合查询能力变更
  if (
    draftOrNew.queryCapability !== undefined &&
    draftOrNew.queryCapability !== baseField.queryCapability
  ) {
    return true;
  }

  // 8. 唯一键变更
  if (
    draftOrNew.isUniqueKey !== undefined &&
    draftOrNew.isUniqueKey !== baseField.isUniqueKey
  ) {
    return true;
  }

  // 其余如 displayTitle, defaultColumnWidth, defaultDisplayOrder, displayType(非fulltext), hyperlinkConfig 等纯展示属性变更返回 false
  return false;
}

// 根类型派生配置状态工具函数
export function deriveRootTypeConfigStatus(
  configuredCount: number,
  draftCount: number
): RootTypeConfigStatus {
  if (configuredCount === 0 && draftCount === 0) return 'NOT_CONFIGURED';
  if (configuredCount === 0 && draftCount > 0) return 'DRAFTING';
  if (configuredCount > 0 && draftCount === 0) return 'CONFIGURED';
  return 'CONFIGURED_WITH_DRAFT';
}

// 根类型统一显示名称格式化函数 (防止出现 "零部件 (Part) (Part)" 重复)
export function formatRootTypeDisplayName(name?: string, code?: string): string {
  if (!name && !code) return '';
  if (!name) return code || '';
  if (!code) return name;
  const trimmedName = name.trim();
  const trimmedCode = code.trim();
  // 若名称中已包含 (code) 或 （code），则不再重复追加
  if (
    trimmedName.includes(`(${trimmedCode})`) ||
    trimmedName.includes(`（${trimmedCode}）`) ||
    trimmedName.toLowerCase().endsWith(`(${trimmedCode.toLowerCase()})`) ||
    trimmedName.toLowerCase().endsWith(`（${trimmedCode.toLowerCase()}）`)
  ) {
    return trimmedName;
  }
  return `${trimmedName} (${trimmedCode})`;
}

// 批量导入元数据冲突类型
export type BatchImportConflictType =
  | 'UNMAPPED' // 未映射，可正常批量勾选生成草稿
  | 'ALREADY_CONFIGURED' // 已存在配置
  | 'HAS_DRAFT' // 已存在草稿
  | 'SOURCE_CHANGED' // PLM 来源字段类型或有效名称发生变化
  | 'DISPLAY_NAME_MISSING' // 来源显示名缺失（已自动兜底，可正常导入）
  | 'TYPE_INCOMPATIBLE' // 类型不兼容
  | 'METADATA_MISSING'; // 关键元数据缺失

// 批量发现导入候选项
export interface BatchImportCandidate {
  sourceFieldMeta: SourceFieldMeta;
  resolvedDisplayName: string;
  isDisplayNameMissing: boolean;
  suggestedManticoreField: string;
  suggestedManticoreType: ManticoreFieldType;
  suggestedDisplayTitle: string;
  suggestedDisplayType: 'CONDITION_QUERY' | 'FULLTEXT' | 'CATEGORY_PATH' | 'ENUM_BADGE' | 'LINK' | 'HIDDEN';
  suggestedQueryCapability: 'QUERY_CONDITION' | 'FULLTEXT_SEARCH' | 'BOTH' | 'NONE';
  suggestedDisplayOrder?: number;
  realDisplayOrder?: number;
  conflictType: BatchImportConflictType;
  conflictReason?: string;
  resolutionHint?: string;
  isSelectable: boolean;
  existingFieldId?: string; // 关联的已配置/已有草稿字段 ID，便于直接跳转查看或编辑
  customizedConfig?: Partial<FieldMappingItem>; // 用户通过「配置」入口修改后的完整映射配置
}

// 生效保存/发布影响摘要
export interface PublishImpactSummary {
  newDraftCount: number; // 新增草稿数
  modifiedDraftCount: number; // 修改草稿数
  dataImpactingCount: number; // 数据影响变更数 (生效后需触发数据同步)
  displayOnlyCount: number; // 纯展示变更数 (无需同步)
  targetRootTypeName: string;
}

// 自动判定实际执行方式（确定性逻辑，无随机数）
export function determineSyncStrategy(
  rootType: MappingObjectType,
  fields: FieldMappingItem[]
): {
  strategy: SyncExecutionStrategy;
  strategyLabel: string;
  reason: string;
} {
  // 1. 从未成功同步过，或重置接入后首次同步 (lastSyncedAt 为空或状态为未同步)
  if (rootType.syncStatus === 'NOT_SYNCED' || !rootType.lastSyncedAt) {
    return {
      strategy: 'INITIAL_REBUILD',
      strategyLabel: SYNC_STRATEGY_LABELS.INITIAL_REBUILD,
      reason: '当前根类型未曾同步底座或刚执行重置接入，系统自动执行初始化全量构建。'
    };
  }

  // 2. 上次任务失败或存在记录级异常，需要对失败/异常数据进行补偿处理
  if (
    rootType.syncStatus === 'FAILED' ||
    rootType.syncStatus === 'COMPLETED_WITH_ERRORS' ||
    (rootType.lastSyncErrorCount !== undefined && rootType.lastSyncErrorCount > 0)
  ) {
    return {
      strategy: 'RETRY_COMPENSATION',
      strategyLabel: SYNC_STRATEGY_LABELS.RETRY_COMPENSATION,
      reason: '上一同步批次存在失败记录或异常条目，系统自动对异常数据执行补偿重试。'
    };
  }

  // 3. 存在已生效的数据影响变更，需要补齐历史数据
  const hasUnsyncedDataImpactingField = fields.some(
    f => f.rootTypeId === rootType.id && f.configStatus === 'CONFIGURED' && !f.isInFormalQueryBase
  );
  if (rootType.hasPendingSyncChanges || hasUnsyncedDataImpactingField) {
    return {
      strategy: 'HISTORY_BACKFILL',
      strategyLabel: SYNC_STRATEGY_LABELS.HISTORY_BACKFILL,
      reason: '检测到数据影响配置已生效但尚未进入底座，系统自动对历史数据进行回填。'
    };
  }

  // 4. 已有正式查询底座，日常数据变化
  return {
    strategy: 'INCREMENTAL_REFRESH',
    strategyLabel: SYNC_STRATEGY_LABELS.INCREMENTAL_REFRESH,
    reason: '当前配置稳定且底座正常，系统基于最新变更水位执行日常增量刷新。'
  };
}

// 一阶段查询预览模拟样本数据
export interface Stage1PreviewRecord {
  id: string;
  partNumber?: string;
  partName?: string;
  material?: string;
  categoryPath?: string;
  nominalDiameter?: string;
  grossWeight?: string;
  docNumber?: string;
  docTitle?: string;
  docVersion?: string;
  drawingNo?: string;
  sheetSize?: string;
  processCode?: string;
  processName?: string;
  [key: string]: any;
}
