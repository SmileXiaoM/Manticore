/**
 * 一阶段：对象与字段映射配置 - 领域数据类型定义
 * 严格对齐最新业务口径：
 * 1. 仅支持根类型配置 (Part, Document, Process)，不维护软类型
 * 2. 仅保留正式查询底座版本 (formalQueryBaseVersion)，不维护生效配置版本
 * 3. 根类型为数据同步与查询快照唯一权威实体
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
  | 'COMPLETED' // 已同步 (任务执行结束，异常记录数为 0)
  | 'COMPLETED_WITH_ERRORS' // 同步完成（有异常） (任务执行结束，存在记录级错误，未中止)
  | 'FAILED'; // 同步失败 (任务未启动成功或被系统级致命错误中止)

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
  
  // 状态与版本
  configStatus: RootTypeConfigStatus;
  syncStatus: RootTypeSyncStatus;
  formalQueryBaseVersion: string; // 正式查询底座版本 e.g. 'v1.2.0' 或 'NONE'
  
  // 同步执行细节
  lastSyncedAt?: string;
  lastSyncBatchId?: string;
  lastSyncSuccessCount?: number; // 成功记录数 e.g. 12480
  lastSyncErrorCount?: number; // 异常记录数 e.g. 3
  lastSyncErrorRecords?: SyncErrorRecord[]; // 异常记录明细
  lastSyncErrorMsg?: string; // 致命失败原因 (仅当 syncStatus === 'FAILED' 时)
  
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
  defaultDisplayOrder?: number;
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

// 根类型级正式查询底座快照 (保证与 formalQueryBaseVersion 原子绑定)
export interface QueryBaseSnapshot {
  rootTypeId: string;
  formalQueryBaseVersion: string;
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
  conflictType: BatchImportConflictType;
  conflictReason?: string;
  resolutionHint?: string;
  isSelectable: boolean;
}

// 生效保存/发布影响摘要
export interface PublishImpactSummary {
  newDraftCount: number; // 新增草稿数
  modifiedDraftCount: number; // 修改草稿数
  dataImpactingCount: number; // 数据影响变更数 (生效后需触发数据同步)
  displayOnlyCount: number; // 纯展示变更数 (无需同步)
  targetRootTypeName: string;
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
