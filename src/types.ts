/**
 * PLM / Manticore 二阶段相似度搜索配置 - TypeScript 类型声明
 */

export type ObjectType = 'PART_MECHANICAL' | 'PART_ELECTRICAL' | 'DOCUMENT' | 'CAD_MODEL' | 'ALL';

export interface FieldSimilarityRule {
  id: string;
  objectType: ObjectType;
  fieldName: string; // 字段显示名称
  propertyCode: string; // 属性编码 / Manticore 字段
  fieldType: string; // 字段类型
  weight: number; // 权重
  matchType: string; // 匹配方式 (精确, 模糊, 范围, 权重词, 向量等)
  nullHandling: string; // 空值处理 (不参与, 扣分, 设为默认值等)
  standardizationRuleSet: string; // 标准化规则集
  synonymRuleSet: string; // 同义词规则集
  categoryAlignmentStrategy: string; // 分类/类型归一策略
  isScoreActive: boolean; // 参与相似度评分
  isFilterCondition: boolean; // 作为过滤条件
  isQueryPreviewAvailable: boolean; // 查询预览可用
  isAppEndActive: boolean; // 应用端生效
  showHitReason: boolean; // 展示命中原因
  showDiffFields: boolean; // 展示差异字段
  hitReasonTemplate: string; // 命中原因模板
  diffFieldsTemplate: string; // 差异字段模板
  status: 'DRAFT' | 'PUBLISHED' | 'CHANGED';
  publishVersion: string;
  lastEditor: string;
  lastEditTime: string;
}

export interface StandardizationRule {
  id: string;
  ruleName: string;
  applicableObjectType: ObjectType;
  applicableProperty: string;
  propertyType: string;
  rawValue: string; // 原始值 (支持多行映射)
  standardValue: string; // 标准值
  ruleMethod: 'MAP' | 'REGEX' | 'REPLACE'; // 规则方式
  matchPriority: number; // 匹配优先级
  isSimilarityActive: boolean; // 是否参与相似度
  isFullTextActive: boolean; // 是否参与全文检索
  status: 'ACTIVE' | 'INACTIVE';
  version: string;
  lastEditor: string;
  lastEditTime: string;
  remarks?: string;
}

export interface SynonymRule {
  id: string;
  primaryWord: string; // 主词
  synonyms: string[]; // 同义词/别名
  applicableObjectType: ObjectType;
  applicableProperty: string;
  scope: 'GLOBAL' | 'OBJECT_SPECIFIC' | 'PROPERTY_SPECIFIC'; // 作用范围
  isSimilarityActive: boolean; // 是否参与相似度
  isFullTextActive: boolean; // 是否参与全文检索
  status: 'ACTIVE' | 'INACTIVE';
  version: string;
  lastEditor: string;
  lastEditTime: string;
  remarks?: string;
}

export interface ClassificationAlignmentRule {
  id: string;
  ruleType: 'CLASSIFICATION' | 'TYPE' | 'ATTRIBUTES'; // 规则类型
  sourceSystem: string; // 源系统
  sourceObjectType: string; // 源对象类型
  sourcePath: string; // 源分类/类型路径
  standardPath: string; // 标准分类/类型路径
  hierarchyStrategy: 'ALIGN_STANDARD' | 'CO_LEVEL_SIMILAR' | 'PARENT_CHILD_SIMILAR' | 'DISPLAY_ONLY'; // 层级策略
  similarityDiscount: number; // 相似度折扣
  applicableObjectType: ObjectType;
  status: 'ACTIVE' | 'INACTIVE';
  version: string;
  lastEditor: string;
  lastEditTime: string;
  remarks?: string;
  isSimilarityActive: boolean;
}

export interface PublishRecord {
  id: string;
  versionCode: string; // 版本号
  publishTime: string;
  publisher: string;
  changeSummary: string; // 变更摘要
  affectedObjectType: string; // 影响对象类型
  affectedFieldCount: number; // 影响字段数
  validationResult: 'SUCCESS' | 'WARNING' | 'FAILED'; // 校验结果
  status: 'ACTIVE' | 'SUPERSEDED' | 'ROLLEDBACK'; // 发布状态
}

export interface VersionDiffItem {
  fieldName: string;
  beforeValue: string;
  afterValue: string;
  impactDescription: string;
}

export interface AttributeTypeItem {
  id: string;
  objectType: string;
  propertyName: string;
  propertyCode: string;
  dataType: 'TEXT' | 'LONG_TEXT' | 'NUMBER' | 'DATE' | 'ENUM' | 'BOOLEAN' | 'CLASS_TREE' | 'OBJECT_REF';
  configComponent: string; // 配置组件
  queryComponent: string; // 查询组件
  isEnum: boolean;
  optionalMatchTypes: string[]; // 可选匹配方式
  optionalStandardization: string[]; // 可选标准化/归一能力
  description: string;
}

export interface AttributeEnumItem {
  id: string;
  objectType: string;
  propertyName: string;
  propertyCode: string;
  enumSource: string; // 枚举来源 (如：硬编码, 外部系统字典)
  enumValueCode: string; // 枚举值编码
  enumDisplayName: string; // 枚举显示名
  standardValue: string; // 标准值
  synonyms: string[]; // 同义词/别名
  isSimilarityActive: boolean;
  status: 'ACTIVE' | 'UNCONFIRMED'; // 状态: 已启用 / 待业务确认
  description: string;
}

export interface QueryResultItem {
  similarityScore: number; // 相似度 (0-100)
  objectId: string; // 对象标识
  objectName: string; // 名称
  material: string; // 材料
  classificationPath: string; // 分类路径
  lifecycleState: string; // 生命周期
  hitReason: string; // 命中原因
  diffFields: string; // 差异字段
  scoreDetail: { fieldName: string; score: number; weight: number; matchInfo: string }[];
}
