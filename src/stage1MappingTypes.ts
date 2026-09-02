/**
 * 一阶段：对象与字段映射配置 - 领域数据类型定义
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

// 根对象类型与软类型配置
export interface MappingObjectType {
  id: string; // e.g. 'PART', 'DOCUMENT', 'PROCESS'
  code: string; // 'Part'
  name: string; // '零部件 (Part)'
  sourceSystemId: string; // 'IntePLM_V21'
  sourceSystemName: string; // 'IntePLM V21'
  description: string;
  softTypes: MappingSoftType[];
}

// 软类型定义
export interface MappingSoftType {
  id: string; // 'PART_MECHANICAL'
  rootTypeId: string; // 'PART'
  code: string; // 'MechanicalPart'
  name: string; // '机械零件'
  description: string;
  // 状态统计 (生效字段数 vs 正式可查询字段数 vs 草稿工作项数)
  activeFieldCount: number; // 已生效字段数
  queryableFieldCount: number; // 正式可查询字段数 (已成功同步并在 Manticore 中可检索的字段数)
  draftFieldCount: number; // 草稿工作项数 (纯草稿 + 生效字段存在草稿修改)
  configStatus: 'ACTIVE' | 'DRAFT_ONLY' | 'UNCONFIGURED'; // 配置状态
  syncStatus: 'NO_SYNC_NEEDED' | 'PENDING_SYNC' | 'SYNCING' | 'SYNC_SUCCESS' | 'SYNC_FAILED'; // 数据状态
  activeConfigVersion: string; // 当前生效配置版本 e.g. 'v1.2.0'
  lastPublishedAt?: string; // 最近发布生效时间
  lastSyncedAt?: string; // 最近同步完成时间
  lastSyncBatchId?: string; // 关联的最近同步批次 ID
  lastSyncErrorMsg?: string; // 同步失败提示
  activeQueryVersion: string; // 当前可正式查询的版本 e.g. 'v1.1.0' 或 'v1.2.0'
  hasPendingSyncFields: boolean; // 是否有已发布但未同步字段
}

// 字段配置状态
export type FieldConfigStatus = 'ACTIVE' | 'DRAFT'; // 生效 / 草稿

// 字段数据影响状态
export type FieldDataStatus = 'NO_SYNC_NEEDED' | 'PENDING_SYNC' | 'SYNCING' | 'SYNC_SUCCESS' | 'SYNC_FAILED';

// PLM 来源字段元数据
export interface SourceFieldMeta {
  sourceFieldKey: string; // 稳定的唯一字段标识 e.g. 'iba_part_number', 'master_name'
  sourceFieldName: string; // 源系统字段名 e.g. 'partNumber', 'name'
  sourceDisplayName: string; // 源系统显示名 e.g. '物料编码', '零部件名称'
  sourceDataType: 'TEXT' | 'LONG_TEXT' | 'ENUM' | 'NUMERIC' | 'NUMERIC_WITH_UNIT' | 'DATE' | 'CATEGORY_TREE' | 'BOOLEAN';
  sourceDataTypeLabel: string; // '文本', '长文本', '枚举', '带单位数值' 等
  unitFamily?: string; // 单位族 (长度、质量、电压等)
  defaultUnit?: string; // 默认单位 (mm, kg, V)
  enumOptions?: { code: string; label: string }[]; // 枚举可选值
  categoryTreeRoot?: string; // 分类树根节点
  isRequired: boolean;
  isPrimaryKey?: boolean;
  description?: string;
}

// Manticore 字段类型
export type ManticoreFieldType =
  | 'STRING' // 文本
  | 'TEXT' // 全文检索大文本
  | 'INTEGER' // 整数
  | 'FLOAT' // 浮点数
  | 'BOOLEAN' // 布尔
  | 'TIMESTAMP' // 时间戳
  | 'JSON' // JSON 结构体
  | 'MULTI_VALUE'; // 多值数组

// 超链接参数来源配置 (展示类型为 LINK 时的设置)
export interface HyperlinkConfig {
  urlTemplate: string; // e.g. 'https://plm.internal.corp/view?oid={oid}&type={otype}'
  oidSourceField: string; // e.g. 'master_oid'
  otypeSourceField: string; // e.g. 'object_type_code'
  displayTextSource: 'FIELD_VALUE' | 'STATIC_TEXT' | 'CUSTOM_TEMPLATE';
  staticDisplayText?: string;
  staticLabel?: string;
  customTemplate?: string;
  openTarget: '_blank' | '_self';
  onMissingParam: 'HIDE_LINK_SHOW_TEXT' | 'HIDE_ENTIRE_COLUMN' | 'SHOW_DISABLED_LINK';
}

// 字段映射项核心模型
export interface FieldMappingItem {
  id: string; // 内部唯一 ID
  rootTypeId: string; // 'PART'
  softTypeId: string; // 'PART_MECHANICAL'
  
  // 来源元数据
  sourceFieldKey: string; // 来源稳定字段标识 (不可随意伪造)
  sourceFieldName: string;
  sourceDisplayName: string;
  sourceDataType: 'TEXT' | 'LONG_TEXT' | 'ENUM' | 'NUMERIC' | 'NUMERIC_WITH_UNIT' | 'DATE' | 'CATEGORY_TREE' | 'BOOLEAN';
  sourceDataTypeLabel: string;
  unitFamily?: string;
  defaultUnit?: string;
  
  // 目标 Manticore 配置
  manticoreField: string; // Manticore 检索字段名 e.g. 'part_number'
  manticoreType: ManticoreFieldType; // Manticore 字段类型
  displayTitle: string; // 查询界面显示名称 e.g. '物料编码'
  displayType: 'CONDITION_QUERY' | 'FULLTEXT' | 'CATEGORY_PATH' | 'ENUM_BADGE' | 'LINK' | 'HIDDEN'; // 展示类型
  queryCapability: 'QUERY_CONDITION' | 'FULLTEXT_SEARCH' | 'BOTH' | 'NONE'; // 查询能力
  
  // 查询与展示能力能力开关 (对照标准表单能力项)
  isQueryCondition?: boolean; // 作为独立查询条件
  isDisplayInResult: boolean; // 在查询结果中展示
  isSortable: boolean; // 允许排序
  isFulltextSearch?: boolean; // 进入全文大字段
  isUniqueKey?: boolean; // 对象同步唯一键
  
  defaultColumnWidth?: number; // 默认列宽 (px)，为空时自适应
  defaultDisplayOrder?: number; // 默认显示顺序 (展示时有效)
  hyperlinkConfig?: HyperlinkConfig; // 超链接配置 (当 displayType === 'LINK')
  
  // 状态生命周期
  configStatus: FieldConfigStatus; // 'ACTIVE' | 'DRAFT'
  hasDraftModification: boolean; // 若为已生效字段，是否有草稿修改
  draftData?: Partial<FieldMappingItem>; // 生效字段对应的草稿修改内容
  
  dataStatus: FieldDataStatus; // 数据同步状态
  isDataImpactingChange: boolean; // 是否为数据影响变更 (字段名/类型/查询能力改动)，若纯展示变更则为 false
  
  lastConfigVersion: string; // 配置版本
  updatedAt: string;
  updatedBy: string;
}

// 批量从 PLM 导入元数据的冲突类型
export type BatchImportConflictType =
  | 'UNMAPPED' // 未映射，可正常批量勾选生成草稿
  | 'ALREADY_ACTIVE' // 已存在生效映射
  | 'HAS_DRAFT' // 已存在草稿映射
  | 'SOURCE_CHANGED' // 来源字段类型/名称发生变化
  | 'TYPE_INCOMPATIBLE' // 类型不兼容
  | 'METADATA_MISSING'; // 关键元数据缺失

// 批量发现导入行
export interface BatchImportCandidate {
  sourceFieldMeta: SourceFieldMeta;
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

// 发布配置影响摘要
export interface PublishImpactSummary {
  newDraftCount: number; // 新增草稿数
  modifiedDraftCount: number; // 修改草稿数
  dataImpactingCount: number; // 数据影响变更数 (发布后需要执行数据同步)
  displayOnlyCount: number; // 纯展示变更数 (无需同步)
  targetVersion: string; // 目标新生效版本号 e.g. 'v1.3.0'
  targetSoftTypeName: string;
}

// 一阶段正式查询预览模拟样本数据
export interface Stage1PreviewRecord {
  id: string;
  partNumber?: string;
  partName?: string;
  material?: string;
  categoryPath?: string;
  ratedVoltage?: string;
  nominalDiameter?: string;
  grossWeight?: string;
  lifecycleState?: string;
  createTime?: string;
  manufacturerName?: string;
  technicalDescription?: string;
  updateCount?: number;
  fastenerCode?: string;
  standardSpec?: string;
  threadSpec?: string;
  docNumber?: string;
  docTitle?: string;
  docVersion?: string;
  drawingNo?: string;
  sheetSize?: string;
  [key: string]: any;
}
