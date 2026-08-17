/**
 * PLM / Manticore 属性相似度搜索配置 - TypeScript 类型声明
 */

export type ObjectType = 'PART_MECHANICAL' | 'PART_ELECTRICAL' | 'DOCUMENT' | 'CAD_MODEL' | 'ALL';

export interface RootTypeOption {
  id: string; // e.g. 'PART', 'COMPONENT', 'FASTENER'
  name: string; // e.g. '零部件 (PART)'
  code: string;
  description?: string;
}

export interface SoftTypeOption {
  id: string; // e.g. 'IN_HOUSE', 'PURCHASED', 'HEADED'
  rootTypeId: string;
  name: string; // e.g. '自制件 (IN_HOUSE)'
  code: string;
  description?: string;
  exampleFieldsHint?: string;
}

export interface RuleScope {
  rootTypeId: string;
  rootTypeName: string;
  softTypeId: string;
  softTypeName: string;
}

export type MismatchAction = 'ZERO_AND_CONTINUE' | 'EXCLUDE_CANDIDATE';

export type SimilarityBaseline =
  | { type: 'EXISTING_PART'; objectId: string }
  | {
      type: 'FORM_VALUES';
      requestNo?: string;
      temporaryNo?: string;
      rootTypeId: string;
      softTypeId: string;
      values: Record<string, any>;
      units?: Record<string, string>;
    };

export type UnitCatalog = {
  schemaVersion: string;
  catalogVersion: string;
  sourceSystem: string;
  loadedAt: string;
  status: 'LOADED' | 'FAILED_USING_LAST_GOOD';
  quantities: QuantityDefinition[];
};

export type UnitDefinition = {
  code: string;
  name: string;
  scale: number;
  offset: number;
  aliases?: string[];
  status?: string;
};

export type QuantityDefinition = {
  code: string;
  name: string;
  baseUnit: string;
  units: UnitDefinition[];
};

export type MatchConfig =
  | { kind: 'EXACT' }
  | { kind: 'TEXT_SIMILARITY'; threshold: number }
  | {
      kind: 'NUMERIC_TOLERANCE';
      toleranceType: 'ABSOLUTE' | 'PERCENTAGE';
      toleranceValue: number;
      direction: 'BOTH' | 'HIGHER' | 'LOWER';
    }
  | {
      kind: 'NUMERIC_DECAY';
      fullScoreRange: number;
      zeroScoreBoundary: number;
      direction: 'BOTH' | 'HIGHER' | 'LOWER';
    }
  | {
      kind: 'DATE_TOLERANCE';
      toleranceValue: number;
      toleranceUnit: 'DAY' | 'HOUR';
      direction: 'BOTH' | 'HIGHER' | 'LOWER';
    }
  | {
      kind: 'NATIVE_HIERARCHY';
      maxLevelGap: number;
      relation: 'PARENT_CHILD' | 'ANCESTOR_DESCENDANT';
      deductionPerLevel: number;
    };

export interface FieldSimilarityRule {
  id: string;
  objectType?: ObjectType; // 兼容旧逻辑
  rootTypeId: string;      // 根类型 ID, e.g. 'PART'
  rootTypeName: string;    // 根类型名称, e.g. '零部件'
  softTypeId: string;      // 软类型 ID, e.g. 'IN_HOUSE'
  softTypeName: string;    // 软类型名称, e.g. '自制件'
  fieldName: string;       // 字段显示名称
  propertyCode: string;    // 属性编码 / Manticore 字段
  fieldType: string;       // 字段类型
  weight: number;          // 权重 (0-100)
  matchType: string;       // 匹配方式 (精确、文本、数值、分类等)
  nullHandling: string;    // 缺失值处理
  mismatchAction: MismatchAction; // 不满足匹配条件时处理: 该字段记0分/排除整个候选
  isScoreActive: boolean;  // 参与相似度评分
  isQueryPreviewAvailable: boolean; // 查询预览可用
  isAppEndActive: boolean; // 应用端生效
  showHitReason: boolean; // 展示命中原因
  showDiffFields: boolean; // 展示差异字段
  hitReasonTemplate: string; // 命中原因模板
  diffFieldsTemplate: string; // 差异字段模板
  enabled: boolean;
  configVersion: string;
  lastEditor: string;
  lastEditTime: string;

  // 扩展属性
  fieldId?: string; // 一阶段字段标识
  manticoreType?: string; // Manticore 字段类型
  enumOrCategorySource?: string; // 枚举、分类或单位来源
  unitFamily?: string; // 单位族
  baseUnit?: string; // 基准单位
  displayUnit?: string; // 显示单位
  matchConfig?: MatchConfig; // 匹配方式对应的动态参数
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

export interface ChangeRecord {
  id: string;
  objectType: string;
  configVersion: string;
  operationType: '保存' | '启用' | '停用';
  summary: string;
  operator: string;
  time: string;
  result: 'SUCCESS' | 'FAILED';
  failureReason?: string;
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

export interface ExcludedCandidate {
  objectId: string;
  objectName: string;
  specification: string;
  material: string;
  classificationPath: string;
  lifecycleState: string;
  excludedByField: string;
  fieldLabel: string;
  sourceValue: any;
  candidateValue: any;
  matchingRequirement: string;
  excludeReason: string;
}

export interface SimilarityCandidate {
  similarityScore: number; // 相似度显示值 (保留两位小数，如 89.14)
  rawSimilarityScore?: number; // 原始未舍入分值 (如 89.1437)
  objectId: string; // 对象标识
  objectName: string; // 名称
  material: string; // 材料
  classificationPath: string; // 分类路径
  lifecycleState: string; // 生命周期
  hitReason: string; // 命中原因
  diffFields: string; // 差异字段
  scoreDetail: { fieldName: string; score: number; weight: number; matchInfo: string }[];
  differenceDetail?: string; // 差异字段说明
  sourceObjectType?: string;
  sourceCategoryPath?: string;
  sourceCoreFields?: string;
  sourceLifecycle?: string;
  sourceSystem?: string;
  sourceSyncStatus?: string;
}

export interface GovernanceDecisionResult {
  auditSuggestion?: 'RECOMMEND_REUSE' | 'RECOMMEND_REVIEW' | 'ALLOW_CREATE' | 'PROHIBIT_REUSE'; // 三化建议
  auditReason?: string; // 建议原因
  triggeredRules?: string[]; // 触发规则
  forceReviewReasons?: string[]; // 强制复核原因
  nonReusableReasons?: string[]; // 不可复用原因
}

export interface QueryResultItem extends SimilarityCandidate {}

// 1. 字段白名单配置
export interface FieldWhitelistItem {
  id: string;
  objectType: ObjectType;
  fieldName: string; // 字段中文名
  propertyCode: string; // 属性编码
  fieldType: 'TEXT' | 'NUMBER' | 'ENUM' | 'CLASS_TREE' | 'DATE' | 'OBJECT_REF'; // 字段类型
  isEnabled: boolean; // 是否启用
  isFilterActive: boolean; // 是否参与过滤
  isScoreActive: boolean; // 是否参与相似度评分
  isTextMatchActive: boolean; // 是否参与文本匹配
  isRequiredForAudit: boolean; // 是否为审核必填
  showInApp: boolean; // 是否在应用端展示
  showDifference: boolean; // 是否展示差异
  defaultMatchMethod: string; // 默认匹配方式
  defaultWeight: number; // 默认权重
  sortOrder: number; // 排序
  status: 'ACTIVE' | 'INACTIVE'; // 状态
  lastEditor: string; // 最后维护人
  lastEditTime: string; // 最后维护时间
}

// 2. 阈值规则配置
export interface ThresholdRule {
  id: string;
  ruleName: string; // 规则名称
  applicableObjectType: ObjectType; // 适用对象类型
  applicableCategory: string; // 适用分类
  reuseThreshold: number; // 建议复用阈值 (>= 86%)
  reviewThresholdMin: number; // 建议复核下限 (68%)
  reviewThresholdMax: number; // 建议复核上限 (86%)
  isEnabled: boolean; // 是否启用
  version: string; // 生效版本
  remarks: string; // 备注说明
}

// 3. 强制复核 / 不可复用规则配置
export interface HardRule {
  id: string;
  ruleName: string; // 规则名称
  ruleType: 'FORCE_REVIEW' | 'NON_REUSABLE' | 'RISK_ALERT'; // 规则类型
  applicableObjectType: ObjectType; // 适用对象类型
  applicableCategory: string; // 适用分类
  triggerField: string; // 触发字段
  triggerCondition: string; // 触发条件
  triggerExample: string; // 触发示例
  actionAfterTrigger: 'RECOMMEND_REVIEW' | 'PROHIBIT_REUSE' | 'ONLY_ALERT'; // 触发后动作
  priority: number; // 优先级
  isEnabled: boolean; // 是否启用
  remarks: string; // 备注
}

// 4. 分类覆盖配置
export interface CategoryCoverage {
  id: string;
  categoryPath: string; // 分类路径
  objectType: ObjectType; // 对象类型
  whitelistId: string; // 使用的字段白名单
  similarityRuleSetId: string; // 使用的字段相似度规则集
  thresholdRuleId: string; // 使用的阈值规则
  hardRuleSetIds: string[]; // 使用的强制复核规则集
  weightOverrideInfo: string; // 权重覆盖说明
  inheritParent: boolean; // 是否继承父分类
  isEnabled: boolean; // 是否启用
  version: string; // 生效版本
}

export type ReferenceObject = {
  requestCode: string;
  objectType?: string;
  rootTypeId: string;
  softTypeId: string;
  objectId: string;
  objectName: string;
  specification: string;
  material: string;
  classificationPath: string;
  lifecycleState: string;
  attributes: Record<string, string | number | null>;
  units?: Record<string, string>;
};

export type CompareFieldResult = {
  fieldKey: string;
  fieldLabel: string;
  sourceValue: string | number | null;
  candidateValue: string | number | null;
  weight: number;
  matchRate: number;       // 0-1
  weightedScore: number;   // weight * matchRate
  status: 'FULL' | 'PARTIAL' | 'MISS' | 'EXCLUDED';
  mismatchAction: MismatchAction;
  reason: string;
};

export type ScoredCandidate = {
  objectType?: string;
  rootTypeId: string;
  softTypeId: string;
  objectId: string;
  objectName: string;
  specification: string;
  material: string;
  classificationPath: string;
  lifecycleState: string;
  compareFields: CompareFieldResult[];
  rawSimilarityScore: number; // 未舍入原始分值，用于排序
  similarityScore: number;    // 显示用保留两位小数
  similarityTier: '高相似' | '中相似' | '低相似';
  coverageRate: number;
  fullHitCount: number;
  differenceCount: number;
  totalScoreFieldsCount: number;
  customAttributes?: Record<string, any>;
};

export type SearchRunResult = {
  reference: ReferenceObject | null;
  baselineType: 'EXISTING_PART' | 'FORM_VALUES';
  formBaselineInfo?: {
    requestNo?: string;
    temporaryNo?: string;
    rootTypeId: string;
    softTypeId: string;
    values: Record<string, any>;
  };
  scoredCandidates: ScoredCandidate[];
  excludedCandidates: ExcludedCandidate[];
  errorCode?: 'REFERENCE_NOT_FOUND' | 'OBJECT_TYPE_MISMATCH' | 'NO_RULES' | 'NO_PERMISSION' | 'QUERY_ERROR';
  errorMessage?: string;
};

export function normalizeRulesForCompare(rules: FieldSimilarityRule[], rootTypeId: string, softTypeId: string): any[] {
  return rules
    .filter(r => (r.rootTypeId === rootTypeId || r.objectType === rootTypeId) && (r.softTypeId === softTypeId || !softTypeId))
    .map(r => {
      return {
        id: r.id,
        rootTypeId: r.rootTypeId,
        softTypeId: r.softTypeId,
        fieldName: r.fieldName,
        propertyCode: r.propertyCode,
        fieldType: r.fieldType,
        weight: r.weight,
        matchType: r.matchType,
        nullHandling: r.nullHandling,
        mismatchAction: r.mismatchAction || 'ZERO_AND_CONTINUE',
        isScoreActive: r.isScoreActive,
        isQueryPreviewAvailable: r.isQueryPreviewAvailable,
        isAppEndActive: r.isAppEndActive,
        showHitReason: r.showHitReason,
        showDiffFields: r.showDiffFields,
        hitReasonTemplate: r.hitReasonTemplate || '',
        diffFieldsTemplate: r.diffFieldsTemplate || '',
        enabled: r.enabled,
        unitFamily: r.unitFamily || '',
        baseUnit: r.baseUnit || '',
        displayUnit: r.displayUnit || '',
        matchConfig: r.matchConfig ? JSON.parse(JSON.stringify(r.matchConfig)) : null,
      };
    })
    .sort((a, b) => {
      const keyA = `${a.rootTypeId}_${a.softTypeId}_${a.propertyCode}_${a.id}`;
      const keyB = `${b.rootTypeId}_${b.softTypeId}_${b.propertyCode}_${b.id}`;
      return keyA.localeCompare(keyB);
    });
}

export function isObjectRulesModified(
  editingRules: FieldSimilarityRule[],
  savedRules: FieldSimilarityRule[],
  rootTypeId: string,
  softTypeId: string = ''
): boolean {
  const normEditing = normalizeRulesForCompare(editingRules, rootTypeId, softTypeId);
  const normSaved = normalizeRulesForCompare(savedRules, rootTypeId, softTypeId);
  return JSON.stringify(normEditing) !== JSON.stringify(normSaved);
}

export function restoreObjectRules(
  editingRules: FieldSimilarityRule[],
  savedRules: FieldSimilarityRule[],
  rootTypeId: string,
  softTypeId: string = ''
): FieldSimilarityRule[] {
  const otherEditingRules = editingRules.filter(r => !(r.rootTypeId === rootTypeId && (!softTypeId || r.softTypeId === softTypeId)));
  const restoredRules = savedRules.filter(r => r.rootTypeId === rootTypeId && (!softTypeId || r.softTypeId === softTypeId));
  return [...otherEditingRules, ...restoredRules];
}

export interface TrialFeedback {
  title: '数值比较' | '文本比较' | '换算说明' | '日期比较' | '层级比较' | '枚举比较';
  rows: { label: string; value: string }[];
  conclusion: string;
  mismatchNote?: string;
}


