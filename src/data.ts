/**
 * PLM / Manticore 属性相似度搜索配置 - 模拟企业级真实数据
 */

import {
  FieldSimilarityRule,
  StandardizationRule,
  SynonymRule,
  ClassificationAlignmentRule,
  PublishRecord,
  VersionDiffItem,
  AttributeTypeItem,
  AttributeEnumItem,
  QueryResultItem,
  FieldWhitelistItem,
  ThresholdRule,
  HardRule,
  CategoryCoverage,
  ObjectType,
  MatchConfig,
  ReferenceObject,
  CompareFieldResult,
  ScoredCandidate,
  SearchRunResult,
  UnitCatalog
} from './types';
import unitCatalogData from './unit-catalog.json';

// Unit Catalog Model - Read-Only Versioned Simulation
export const mockUnitCatalog: UnitCatalog = unitCatalogData as UnitCatalog;

// Unit conversion helpers
// Base value = Display value * scale + offset
export function convertToBaseUnit(value: number, unitCode: string, quantityCode: string): number {
  const normalizedQuantityCode = quantityCode.toUpperCase();
  const qty = mockUnitCatalog.quantities.find(q => q.code === normalizedQuantityCode || q.name === quantityCode);
  if (!qty) {
    throw new Error(`未知或不支持的测量类型 [${quantityCode}]！`);
  }
  const unit = qty.units.find(u => u.code === unitCode);
  if (!unit) {
    throw new Error(`在测量类型 [${quantityCode}] 中未找到单位 [${unitCode}]！`);
  }
  if (unit.status && unit.status !== 'ACTIVE') {
    throw new Error(`单位 [${unitCode}] 处于停用/非激活状态！`);
  }
  return value * unit.scale + unit.offset;
}

// Display value = (Base value - offset) / scale
export function convertFromBaseUnit(baseValue: number, unitCode: string, quantityCode: string): number {
  const normalizedQuantityCode = quantityCode.toUpperCase();
  const qty = mockUnitCatalog.quantities.find(q => q.code === normalizedQuantityCode || q.name === quantityCode);
  if (!qty) {
    throw new Error(`未知或不支持的测量类型 [${quantityCode}]！`);
  }
  const unit = qty.units.find(u => u.code === unitCode);
  if (!unit) {
    throw new Error(`在测量类型 [${quantityCode}] 中未找到单位 [${unitCode}]！`);
  }
  if (unit.status && unit.status !== 'ACTIVE') {
    throw new Error(`单位 [${unitCode}] 处于停用/非激活状态！`);
  }
  return (baseValue - unit.offset) / unit.scale;
}

// 0. 一阶段对齐已映射字段目录 (Stage 1 Mapped Fields Directory)
export interface Stage1MappedField {
  objectType: ObjectType;
  fieldId: string;
  displayName: string;
  fieldCode: string;
  businessFieldType: string;
  manticoreType: string;
  enumOrCategorySource: string;
  unitFamily: string;
  baseUnit: string;
  indexStatus: string;
  enabled: boolean;
  displayUnit?: string;
}

export const stage1MappedFields: Stage1MappedField[] = [
  {
    objectType: 'PART_MECHANICAL',
    fieldId: 'spec_name_stage1',
    displayName: '名称',
    fieldCode: 'spec_name',
    businessFieldType: '文本 (TEXT)',
    manticoreType: 'VARCHAR',
    enumOrCategorySource: '无',
    unitFamily: '无',
    baseUnit: '无',
    indexStatus: '已索引',
    enabled: true
  },
  {
    objectType: 'PART_MECHANICAL',
    fieldId: 'spec_description_stage1',
    displayName: '规格描述',
    fieldCode: 'spec_description',
    businessFieldType: '长文本 (LONG_TEXT)',
    manticoreType: 'TEXT',
    enumOrCategorySource: '无',
    unitFamily: '无',
    baseUnit: '无',
    indexStatus: '已索引',
    enabled: true
  },
  {
    objectType: 'PART_MECHANICAL',
    fieldId: 'core_material_stage1',
    displayName: '主要材质',
    fieldCode: 'core_material',
    businessFieldType: '枚举 (ENUM)',
    manticoreType: 'VARCHAR',
    enumOrCategorySource: '物料材质牌号字典',
    unitFamily: '无',
    baseUnit: '无',
    indexStatus: '已索引',
    enabled: true
  },
  {
    objectType: 'PART_MECHANICAL',
    fieldId: 'nominal_diameter_stage1',
    displayName: '标称直径',
    fieldCode: 'nominal_diameter',
    businessFieldType: '带单位数值 (NUMBER_WITH_UNIT)',
    manticoreType: 'DOUBLE',
    enumOrCategorySource: '无',
    unitFamily: '长度',
    baseUnit: 'm',
    displayUnit: 'mm',
    indexStatus: '已索引',
    enabled: true
  },
  {
    objectType: 'PART_MECHANICAL',
    fieldId: 'length_stage1',
    displayName: '长度',
    fieldCode: 'length',
    businessFieldType: '带单位数值 (NUMBER_WITH_UNIT)',
    manticoreType: 'DOUBLE',
    enumOrCategorySource: '无',
    unitFamily: '长度',
    baseUnit: 'm',
    displayUnit: 'mm',
    indexStatus: '已索引',
    enabled: true
  },
  {
    objectType: 'PART_MECHANICAL',
    fieldId: 'thread_pitch_stage1',
    displayName: '螺距',
    fieldCode: 'thread_pitch',
    businessFieldType: '带单位数值 (NUMBER_WITH_UNIT)',
    manticoreType: 'DOUBLE',
    enumOrCategorySource: '无',
    unitFamily: '长度',
    baseUnit: 'm',
    displayUnit: 'mm',
    indexStatus: '已索引',
    enabled: true
  },
  {
    objectType: 'PART_MECHANICAL',
    fieldId: 'thread_count_stage1',
    displayName: '螺纹牙数',
    fieldCode: 'thread_count',
    businessFieldType: '数值 (NUMBER)',
    manticoreType: 'INT',
    enumOrCategorySource: '无',
    unitFamily: '无',
    baseUnit: '无',
    indexStatus: '已索引',
    enabled: true
  },
  {
    objectType: 'PART_MECHANICAL',
    fieldId: 'category_path_stage1',
    displayName: '分类路径',
    fieldCode: 'category_path',
    businessFieldType: '分类树 (CLASS_TREE)',
    manticoreType: 'VARCHAR',
    enumOrCategorySource: 'PLM原生分类树',
    unitFamily: '无',
    baseUnit: '无',
    indexStatus: '已索引',
    enabled: true
  },
  {
    objectType: 'PART_MECHANICAL',
    fieldId: 'lifecycle_state_stage1',
    displayName: '生命周期状态',
    fieldCode: 'lifecycle_state',
    businessFieldType: '枚举 (ENUM)',
    manticoreType: 'VARCHAR',
    enumOrCategorySource: '生命周期状态枚举',
    unitFamily: '无',
    baseUnit: '无',
    indexStatus: '已索引',
    enabled: true
  },
  {
    objectType: 'PART_ELECTRICAL',
    fieldId: 'working_voltage_stage1',
    displayName: '工作电压',
    fieldCode: 'working_voltage',
    businessFieldType: '带单位数值 (NUMBER_WITH_UNIT)',
    manticoreType: 'DOUBLE',
    enumOrCategorySource: '无',
    unitFamily: '电压',
    baseUnit: 'V',
    displayUnit: 'V',
    indexStatus: '已索引',
    enabled: true
  },
  {
    objectType: 'PART_ELECTRICAL',
    fieldId: 'working_temp_stage1',
    displayName: '工作温度',
    fieldCode: 'working_temp',
    businessFieldType: '带单位数值 (NUMBER_WITH_UNIT)',
    manticoreType: 'DOUBLE',
    enumOrCategorySource: '无',
    unitFamily: '温度',
    baseUnit: 'K',
    displayUnit: 'degC',
    indexStatus: '已索引',
    enabled: true
  },
  {
    objectType: 'PART_MECHANICAL',
    fieldId: 'surface_treatment_stage1',
    displayName: '表面处理',
    fieldCode: 'surface_treatment',
    businessFieldType: '文本 (TEXT)',
    manticoreType: 'VARCHAR',
    enumOrCategorySource: '无',
    unitFamily: '无',
    baseUnit: '无',
    indexStatus: '未索引',
    enabled: true
  },
  {
    objectType: 'PART_MECHANICAL',
    fieldId: 'material_thickness_stage1',
    displayName: '材料厚度',
    fieldCode: 'material_thickness',
    businessFieldType: '带单位数值 (NUMBER_WITH_UNIT)',
    manticoreType: 'DOUBLE',
    enumOrCategorySource: '无',
    unitFamily: '长度',
    baseUnit: 'm',
    displayUnit: 'mm',
    indexStatus: '已索引',
    enabled: false
  },
  {
    objectType: 'PART_MECHANICAL',
    fieldId: 'creation_date_stage1',
    displayName: '创建日期',
    fieldCode: 'creation_date',
    businessFieldType: '日期 (DATE)',
    manticoreType: 'TIMESTAMP',
    enumOrCategorySource: '无',
    unitFamily: '无',
    baseUnit: '无',
    indexStatus: '已索引',
    enabled: true
  },
  {
    objectType: 'PART_ELECTRICAL',
    fieldId: 'creation_date_elec_stage1',
    displayName: '创建日期',
    fieldCode: 'creation_date',
    businessFieldType: '日期 (DATE)',
    manticoreType: 'TIMESTAMP',
    enumOrCategorySource: '无',
    unitFamily: '无',
    baseUnit: '无',
    indexStatus: '已索引',
    enabled: true
  }
];

// 1. 字段相似度规则初始数据
export const initialFieldRules: FieldSimilarityRule[] = [
  {
    id: 'F-001',
    objectType: 'PART_MECHANICAL',
    fieldName: '规格描述',
    propertyCode: 'spec_description',
    fieldType: '长文本 (LONG_TEXT)',
    weight: 35,
    matchType: '文本相似匹配 (非 AI)',
    nullHandling: '候选缺失按 0 分',
    isScoreActive: true,
    isQueryPreviewAvailable: true,
    isAppEndActive: true,
    showHitReason: true,
    showDiffFields: true,
    hitReasonTemplate: '规格文本相似度达 {score}%, 命中了以下相同模式: {match}',
    diffFieldsTemplate: '规格中存在差异: 源[{source_val}] vs 目标[{target_val}]',
    enabled: true,
    configVersion: 'v2.5.0',
    lastEditor: '张建国 (系统架构师)',
    lastEditTime: '2026-07-02 14:32:15',
    fieldId: 'spec_description_stage1',
    manticoreType: 'TEXT',
    enumOrCategorySource: '无',
    unitFamily: '无',
    baseUnit: '无',
    displayUnit: '无',
    matchConfig: { kind: 'TEXT_SIMILARITY', threshold: 60 }
  },
  {
    id: 'F-002',
    objectType: 'PART_MECHANICAL',
    fieldName: '主要材质',
    propertyCode: 'core_material',
    fieldType: '枚举 (ENUM)',
    weight: 25,
    matchType: '精确值匹配',
    nullHandling: '候选缺失按 0 分',
    isScoreActive: true,
    isQueryPreviewAvailable: true,
    isAppEndActive: true,
    showHitReason: true,
    showDiffFields: true,
    hitReasonTemplate: '材质完全匹配 (归一化值: {source_val})',
    diffFieldsTemplate: '材质不一致: 源[{source_val}] vs 目标[{target_val}]',
    enabled: true,
    configVersion: 'v2.5.0',
    lastEditor: '李晓华 (数据标准管理员)',
    lastEditTime: '2026-07-06 18:24:00',
    fieldId: 'core_material_stage1',
    manticoreType: 'VARCHAR',
    enumOrCategorySource: '物料材质牌号字典',
    unitFamily: '无',
    baseUnit: '无',
    displayUnit: '无',
    matchConfig: { kind: 'EXACT' }
  },
  {
    id: 'F-003',
    objectType: 'PART_MECHANICAL',
    fieldName: '标称直径',
    propertyCode: 'nominal_diameter',
    fieldType: '带单位数值 (NUMBER_WITH_UNIT)',
    weight: 15,
    matchType: '数值容差匹配',
    nullHandling: '候选缺失按 0 分',
    isScoreActive: true,
    isQueryPreviewAvailable: true,
    isAppEndActive: true,
    showHitReason: true,
    showDiffFields: true,
    hitReasonTemplate: '直径误差在容差范围内: 源[{source_val}mm] 与 目标[{target_val}mm] 相差 {diff_val}mm',
    diffFieldsTemplate: '直径不匹配: 源[{source_val}mm] vs 目标[{target_val}mm]',
    enabled: true,
    configVersion: 'v2.5.0',
    lastEditor: '王明 (机械工程师)',
    lastEditTime: '2026-06-28 10:11:45',
    fieldId: 'nominal_diameter_stage1',
    manticoreType: 'DOUBLE',
    enumOrCategorySource: '无',
    unitFamily: '长度',
    baseUnit: 'm',
    displayUnit: 'mm',
    matchConfig: {
      kind: 'NUMERIC_TOLERANCE',
      toleranceType: 'ABSOLUTE',
      toleranceValue: 0.2,
      direction: 'BOTH'
    }
  },
  {
    id: 'F-004',
    objectType: 'PART_MECHANICAL',
    fieldName: '螺距',
    propertyCode: 'thread_pitch',
    fieldType: '带单位数值 (NUMBER_WITH_UNIT)',
    weight: 10,
    matchType: '精确值匹配',
    nullHandling: '候选缺失按 0 分',
    isScoreActive: true,
    isQueryPreviewAvailable: true,
    isAppEndActive: true,
    showHitReason: false,
    showDiffFields: true,
    hitReasonTemplate: '',
    diffFieldsTemplate: '螺距不一致: 源[{source_val}mm] vs 目标[{target_val}mm]',
    enabled: true,
    configVersion: 'v2.5.0',
    lastEditor: '王明 (机械工程师)',
    lastEditTime: '2026-05-15 16:45:00',
    fieldId: 'thread_pitch_stage1',
    manticoreType: 'DOUBLE',
    enumOrCategorySource: '无',
    unitFamily: '长度',
    baseUnit: 'm',
    displayUnit: 'mm',
    matchConfig: { kind: 'EXACT' }
  },
  {
    id: 'F-005',
    objectType: 'PART_MECHANICAL',
    fieldName: '分类路径',
    propertyCode: 'category_path',
    fieldType: '分类树 (CLASS_TREE)',
    weight: 15,
    matchType: '层级关系匹配',
    nullHandling: '候选缺失按 0 分',
    isScoreActive: true,
    isQueryPreviewAvailable: true,
    isAppEndActive: true,
    showHitReason: true,
    showDiffFields: false,
    hitReasonTemplate: '同属【{category}】子分类层级, 折扣后得分: {score}',
    diffFieldsTemplate: '',
    enabled: true,
    configVersion: 'v2.5.0',
    lastEditor: '张建国 (系统架构师)',
    lastEditTime: '2026-07-01 09:15:30',
    fieldId: 'category_path_stage1',
    manticoreType: 'VARCHAR',
    enumOrCategorySource: 'PLM原生分类树',
    unitFamily: '无',
    baseUnit: '无',
    displayUnit: '无',
    matchConfig: {
      kind: 'NATIVE_HIERARCHY',
      maxLevelGap: 3,
      relation: 'ANCESTOR_DESCENDANT',
      deductionPerLevel: 5
    }
  },
  {
    id: 'F-006',
    objectType: 'PART_ELECTRICAL',
    fieldName: '工作电压',
    propertyCode: 'working_voltage',
    fieldType: '带单位数值 (NUMBER_WITH_UNIT)',
    weight: 30,
    matchType: '数值容差匹配',
    nullHandling: '候选缺失按 0 分',
    isScoreActive: true,
    isQueryPreviewAvailable: true,
    isAppEndActive: true,
    showHitReason: true,
    showDiffFields: true,
    hitReasonTemplate: '电压额定范围匹配: 源[{source_val}V] 覆盖 目标[{target_val}V]',
    diffFieldsTemplate: '电压范围冲突: 源[{source_val}V] vs 目标[{target_val}V]',
    enabled: true,
    configVersion: 'v1.0.0',
    lastEditor: '赵丽 (电气工程师)',
    lastEditTime: '2026-07-06 11:30:22',
    fieldId: 'working_voltage_stage1',
    manticoreType: 'DOUBLE',
    enumOrCategorySource: '无',
    unitFamily: '电压',
    baseUnit: 'V',
    displayUnit: 'V',
    matchConfig: {
      kind: 'NUMERIC_TOLERANCE',
      toleranceType: 'ABSOLUTE',
      toleranceValue: 12,
      direction: 'BOTH'
    }
  },
  {
    id: 'F-007',
    objectType: 'PART_MECHANICAL',
    fieldName: '螺纹牙数',
    propertyCode: 'thread_count',
    fieldType: '数值 (NUMBER)',
    weight: 0,
    matchType: '精确值匹配',
    nullHandling: '不参与计算',
    isScoreActive: false,
    isQueryPreviewAvailable: true,
    isAppEndActive: true,
    showHitReason: false,
    showDiffFields: false,
    hitReasonTemplate: '',
    diffFieldsTemplate: '',
    enabled: false,
    configVersion: 'v2.5.0',
    lastEditor: '李晓华 (数据标准管理员)',
    lastEditTime: '2026-07-15 12:00:00',
    fieldId: 'thread_count_stage1',
    manticoreType: 'INT',
    enumOrCategorySource: '无',
    unitFamily: '无',
    baseUnit: '无',
    displayUnit: '无',
    matchConfig: { kind: 'EXACT' }
  }
];

// 2. 标准化规则初始数据
export const initialStandardizationRules: StandardizationRule[] = [
  {
    id: 'S-001',
    ruleName: '不锈钢牌号标准化映射',
    applicableObjectType: 'PART_MECHANICAL',
    applicableProperty: 'core_material',
    propertyType: '枚举 (ENUM)',
    rawValue: 'SUS304\n304不锈钢\n06Cr19Ni10\n1.4301\n304',
    standardValue: '304 (06Cr19Ni10)',
    ruleMethod: 'MAP',
    matchPriority: 1,
    isSimilarityActive: true,
    isFullTextActive: true,
    status: 'ACTIVE',
    version: 'v1.2.3',
    lastEditor: '李晓华 (数据标准管理员)',
    lastEditTime: '2026-07-04 15:40:00',
    remarks: '实现美标、国标、日标及行业通用俗称对标准 304 不锈钢材质的自动收敛归一。'
  },
  {
    id: 'S-002',
    ruleName: '紧固件长度单位自动换算',
    applicableObjectType: 'PART_MECHANICAL',
    applicableProperty: 'spec_length',
    propertyType: '数字 (NUMBER)',
    rawValue: '(\\d+)\\s*(mm|MM|毫米|公厘)',
    standardValue: '$1 (统一折算为毫米 mm)',
    ruleMethod: 'REGEX',
    matchPriority: 2,
    isSimilarityActive: true,
    isFullTextActive: false,
    status: 'ACTIVE',
    version: 'v1.1.0',
    lastEditor: '王明 (机械工程师)',
    lastEditTime: '2026-06-12 11:15:30',
    remarks: '使用正则表达式提取规格描述中的长度数值，并消除单位变体统一为标准毫米。'
  },
  {
    id: 'S-003',
    ruleName: '铜合金材质标准化归一',
    applicableObjectType: 'PART_MECHANICAL',
    applicableProperty: 'core_material',
    propertyType: '枚举 (ENUM)',
    rawValue: '黄铜\nH59\nH62\nHPb59-1\nC36000',
    standardValue: '黄铜 (HPb59-1)',
    ruleMethod: 'MAP',
    matchPriority: 3,
    isSimilarityActive: true,
    isFullTextActive: true,
    status: 'ACTIVE',
    version: 'v1.0.5',
    lastEditor: '李晓华 (数据标准管理员)',
    lastEditTime: '2026-07-01 16:22:11',
    remarks: '将生产现场和源图纸中的各种铜合金俗称映射到标准高精黄铜物料编码对应的标准值。'
  },
  {
    id: 'S-004',
    ruleName: '电气绝缘等级命名标准化',
    applicableObjectType: 'PART_ELECTRICAL',
    applicableProperty: 'insulation_class',
    propertyType: '文本 (TEXT)',
    rawValue: 'Class F\nF级绝缘\n绝缘等级F\nF级',
    standardValue: 'F级 (Class F)',
    ruleMethod: 'MAP',
    matchPriority: 1,
    isSimilarityActive: true,
    isFullTextActive: true,
    status: 'ACTIVE',
    version: 'v1.0.1',
    lastEditor: '赵丽 (电气工程师)',
    lastEditTime: '2026-05-20 09:33:00',
    remarks: '规范不同供应商提供的电气元器件参数绝缘等级，提升精确属性配对成功率。'
  }
];

// 3. 同义词规则初始数据
export const initialSynonymRules: SynonymRule[] = [
  {
    id: 'SY-001',
    primaryWord: '螺栓',
    synonyms: ['螺丝', '紧固件', '螺钉', '栓钉', 'Bolt', 'Screw'],
    applicableObjectType: 'PART_MECHANICAL',
    applicableProperty: 'spec_description',
    scope: 'PROPERTY_SPECIFIC',
    isSimilarityActive: true,
    isFullTextActive: true,
    status: 'ACTIVE',
    version: 'v2.1.0',
    lastEditor: '王明 (机械工程师)',
    lastEditTime: '2026-07-03 10:20:00',
    remarks: '机械零部件大类中螺纹紧固件名称极其繁杂，统一进行别名同义扩展，以防检索遗漏。'
  },
  {
    id: 'SY-002',
    primaryWord: '不锈钢',
    synonyms: ['耐酸钢', '白钢', 'Stainless Steel', 'SS', 'S.S.'],
    applicableObjectType: 'ALL',
    applicableProperty: 'all',
    scope: 'GLOBAL',
    isSimilarityActive: true,
    isFullTextActive: true,
    status: 'ACTIVE',
    version: 'v2.0.0',
    lastEditor: '张建国 (系统架构师)',
    lastEditTime: '2026-06-18 14:05:00',
    remarks: '全局通用的核心金属类别代号，防止因简写或外文缩写导致一阶段漏召回。'
  },
  {
    id: 'SY-003',
    primaryWord: '电容',
    synonyms: ['电容器', '电容元件', 'Capacitor', 'CAP', '滤波电容'],
    applicableObjectType: 'PART_ELECTRICAL',
    applicableProperty: 'spec_description',
    scope: 'PROPERTY_SPECIFIC',
    isSimilarityActive: true,
    isFullTextActive: true,
    status: 'ACTIVE',
    version: 'v1.8.0',
    lastEditor: '赵丽 (电气工程师)',
    lastEditTime: '2026-07-05 16:50:00',
    remarks: '电气元器件核心同义词，确保采购件与自制件命名别名能够完成属性相似对齐。'
  }
];

// 4. 分类/类型归一初始数据
export const initialAlignmentRules: ClassificationAlignmentRule[] = [
  {
    id: 'A-001',
    ruleType: 'CLASSIFICATION',
    sourceSystem: 'Windchill PLM',
    sourceObjectType: 'wt.part.WTPart',
    sourcePath: '/物料分类树/标准件/紧固件/螺纹副/内六角螺栓',
    standardPath: '/国家标准分类/紧固件/螺栓/内六角螺栓',
    hierarchyStrategy: 'ALIGN_STANDARD',
    similarityDiscount: 1.0,
    applicableObjectType: 'PART_MECHANICAL',
    status: 'ACTIVE',
    version: 'v3.1.0',
    lastEditor: '李晓华 (数据标准管理员)',
    lastEditTime: '2026-07-02 11:24:00',
    remarks: '直接映射：将旧版研发系统中的内六角螺栓分类全路径对齐到集团统一的国标分类，折合系数1.0 (无损失)。',
    isSimilarityActive: true
  },
  {
    id: 'A-002',
    ruleType: 'CLASSIFICATION',
    sourceSystem: 'SAP ERP',
    sourceObjectType: 'Material Master (MARA)',
    sourcePath: '/原材料/金属类/五金/螺丝/普通外六角',
    standardPath: '/国家标准分类/紧固件/螺栓/六角头螺栓/普通级',
    hierarchyStrategy: 'CO_LEVEL_SIMILAR',
    similarityDiscount: 0.85,
    applicableObjectType: 'PART_MECHANICAL',
    status: 'ACTIVE',
    version: 'v3.0.5',
    lastEditor: '张建国 (系统架构师)',
    lastEditTime: '2026-06-25 15:30:10',
    remarks: '同级退避：ERP 的“普通外六角”与 PLM 的“普通级六角头螺栓”定义相似。由于分类体系略微错位，判定同级相似，相似度扣减15%。',
    isSimilarityActive: true
  },
  {
    id: 'A-003',
    ruleType: 'TYPE',
    sourceSystem: 'Teamcenter PLM',
    sourceObjectType: 'ItemRevision',
    sourcePath: 'TC_MechanicalPartRevision',
    standardPath: 'PLM_MechanicalPart',
    hierarchyStrategy: 'PARENT_CHILD_SIMILAR',
    similarityDiscount: 0.9,
    applicableObjectType: 'PART_MECHANICAL',
    status: 'ACTIVE',
    version: 'v2.8.0',
    lastEditor: '李晓华 (数据标准管理员)',
    lastEditTime: '2026-05-18 10:11:00',
    remarks: '类型继承：Teamcenter 的子类型与国标通用物理部件互为父子级，支持 90% 的折射退让，用于计算跨系统相似检索。',
    isSimilarityActive: true
  },
  {
    id: 'A-004',
    ruleType: 'CLASSIFICATION',
    sourceSystem: '旧 PLM (Legacy)',
    sourceObjectType: 'Part',
    sourcePath: '/零配件/电子料/阻容感/陶瓷电容',
    standardPath: '/国家标准分类/电子元器件/电容器/固定电容器/多层陶瓷电容器',
    hierarchyStrategy: 'DISPLAY_ONLY',
    similarityDiscount: 0.0,
    applicableObjectType: 'PART_ELECTRICAL',
    status: 'ACTIVE',
    version: 'v1.0.0',
    lastEditor: '赵丽 (电气工程师)',
    lastEditTime: '2026-07-06 09:12:00',
    remarks: '旧系统的粗放分类，在新标准体系中仅作展示对照，不赋予相似度自动计算得分。',
    isSimilarityActive: false
  }
];

// 5. 发布记录数据
export const initialPublishRecords: PublishRecord[] = [
  {
    id: 'PUB-001',
    versionCode: 'v2.4.0',
    publishTime: '2026-07-02 15:00:00',
    publisher: '张建国 (系统架构师)',
    changeSummary: '优化了机械类物料规格描述字段的权重至35%，并引入了新版「紧固件规格同义词集」；针对直径、材质两属性的合并检索添加了差异高亮模板配置。',
    affectedObjectType: '机械零件 (PART_MECHANICAL)',
    affectedFieldCount: 5,
    validationResult: 'SUCCESS',
    status: 'ACTIVE'
  },
  {
    id: 'PUB-002',
    versionCode: 'v2.3.5',
    publishTime: '2026-06-18 10:22:00',
    publisher: '李晓华 (数据标准管理员)',
    changeSummary: '新增了一阶段对齐中的「多层陶瓷电容器」分类映射关系，微调了同级退避的折射退让权重。',
    affectedObjectType: '电气元器件 (PART_ELECTRICAL)',
    affectedFieldCount: 2,
    validationResult: 'SUCCESS',
    status: 'SUPERSEDED'
  }
];

// 6. 版本差异对比数据
export const versionDiffs: VersionDiffItem[] = [
  {
    fieldName: '规格描述 (spec_description)',
    beforeValue: '权重: 30%',
    afterValue: '权重: 35%',
    impactDescription: '提高机械类物料规格匹配权重，强化 TF-IDF 长文本比对度量。'
  },
  {
    fieldName: '主要材质 (core_material)',
    beforeValue: '无归一对齐',
    afterValue: '引入「牌号同义词对齐规则」',
    impactDescription: '使 SUS304 与 304 不锈钢等通过同义词判定为 100% 相同，减少工艺重复提报。'
  },
  {
    fieldName: '分类路径 (category_path)',
    beforeValue: '精确等值匹配',
    afterValue: '层级深度折扣匹配 (0.85)',
    impactDescription: '允许在大类相同但子类微调时保留基本分，提升相近零件召回率。'
  }
];

// 7. 物料通用属性对应数据类型及配置组件清单
export const attributeTypes: AttributeTypeItem[] = [
  {
    id: 'T-001',
    objectType: '机械零件 (PART_MECHANICAL)',
    propertyName: '主要材质',
    propertyCode: 'core_material',
    dataType: 'ENUM',
    configComponent: '单选下拉 (Select)',
    queryComponent: '标准枚举勾选器',
    isEnum: true,
    optionalMatchTypes: ['精确比对', '外形别名匹配'],
    optionalStandardization: ['材料牌号归一映射'],
    description: '指导材质如 SUS304 与 304 不锈钢的字段与属性相似度映射。'
  },
  {
    id: 'T-002',
    objectType: '机械零件 (PART_MECHANICAL)',
    propertyName: '标称直径',
    propertyCode: 'nominal_diameter',
    dataType: 'NUMBER',
    configComponent: '数值输入框 (NumberInput)',
    queryComponent: '双向容差范围检索',
    isEnum: false,
    optionalMatchTypes: ['绝对值比对', '区间容差计算'],
    optionalStandardization: ['单位收敛标准化'],
    description: '机械件的核心尺寸属性，决定物理拼装复用性。'
  },
  {
    id: 'T-003',
    objectType: '机械零件 (PART_MECHANICAL)',
    propertyName: '规格描述',
    propertyCode: 'spec_description',
    dataType: 'LONG_TEXT',
    configComponent: '多行文本框 (TextArea)',
    queryComponent: '模糊匹配输入框',
    isEnum: false,
    optionalMatchTypes: ['Manticore 模糊匹配', '模糊词典匹配', 'TF-IDF 相似度'],
    optionalStandardization: ['特殊字符过滤'],
    description: '物料的详细文本规格描述，常在属性级评分中占高权重。'
  },
  {
    id: 'T-004',
    objectType: '电气元器件 (PART_ELECTRICAL)',
    propertyName: '封装形式',
    propertyCode: 'package_type',
    dataType: 'ENUM',
    configComponent: '单选/多选下拉 (Select/Multi)',
    queryComponent: '标准枚举勾选器',
    isEnum: true,
    optionalMatchTypes: ['精确比对', '外形别名匹配'],
    optionalStandardization: ['封装尺寸俗称映射'],
    description: '如 SOP8, TSSOP8 等，对齐供应商规格变体。'
  },
  {
    id: 'T-005',
    objectType: '所有对象 (ALL)',
    propertyName: '创建日期',
    propertyCode: 'create_date',
    dataType: 'DATE',
    configComponent: '日期选择器 (DatePicker)',
    queryComponent: '日期时间范围筛选',
    isEnum: false,
    optionalMatchTypes: ['近邻衰减计算', '绝对日期区间判定'],
    optionalStandardization: ['ISO 格式标准化'],
    description: '时间戳基础属性，极少在相似度中设高权重，主要作为辅助一阶段初筛。'
  },
  {
    id: 'T-006',
    objectType: '机械零件 (PART_MECHANICAL)',
    propertyName: '图幅尺寸',
    propertyCode: 'drawing_size',
    dataType: 'ENUM',
    configComponent: '单选下拉 (Select)',
    queryComponent: '下拉单选框',
    isEnum: true,
    optionalMatchTypes: ['绝对值匹配'],
    optionalStandardization: ['大写标准化'],
    description: '工程图纸幅面 (A0, A1, A2, A3, A4) 等，仅用于数据追溯与快速显示，不计相似分值。'
  },
  {
    id: 'T-007',
    objectType: '所有对象 (ALL)',
    propertyName: '三维模型引用',
    propertyCode: 'cad_model_ref',
    dataType: 'OBJECT_REF',
    configComponent: '引用选择器 (ObjectPicker)',
    queryComponent: '弹窗搜素引用组件',
    isEnum: false,
    optionalMatchTypes: ['关联 ID 精确匹配', '几何特征指纹距离'],
    optionalStandardization: ['版本提取归一'],
    description: '关联对应的 CAD 三维实体模型，计算实体几何特征相似时的核心媒介。'
  }
];

// 8. 属性对应枚举清单数据 (非界面说明页 - 示例属性含: 材料、生命周期、对象类型、单位、表面处理、来源系统)
export const attributeEnums: AttributeEnumItem[] = [
  {
    id: 'E-001',
    objectType: '所有对象 (ALL)',
    propertyName: '表面处理',
    propertyCode: 'surface_treatment',
    enumSource: '工艺表面处理规范',
    enumValueCode: 'E_SURFACE_001',
    enumDisplayName: '发黑',
    standardValue: '发黑',
    synonyms: ['化学氧化', '发蓝', 'BO'],
    isSimilarityActive: true,
    status: 'ACTIVE',
    description: '钢件表面经过碱性氧化处理，防锈能力弱，主要用于不需高防锈的室内装配。'
  },
  {
    id: 'E-002',
    objectType: '所有对象 (ALL)',
    propertyName: '表面处理',
    propertyCode: 'surface_treatment',
    enumSource: '工艺表面处理规范',
    enumValueCode: 'E_SURFACE_002',
    enumDisplayName: '镀白锌',
    standardValue: '镀锌',
    synonyms: ['白锌', '电镀白锌', 'ZN_W'],
    isSimilarityActive: true,
    status: 'ACTIVE',
    description: '常规电镀锌工艺，表面呈银白色，广泛用于一般结构件及紧固件。'
  },
  {
    id: 'E-003',
    objectType: '所有对象 (ALL)',
    propertyName: '表面处理',
    propertyCode: 'surface_treatment',
    enumSource: '老旧子工厂历史习惯 (草案)',
    enumValueCode: 'E_SURFACE_003',
    enumDisplayName: '阳极氧化',
    standardValue: '阳极氧化',
    synonyms: ['硬质氧化', '黑氧', 'ANODIZE'],
    isSimilarityActive: true,
    status: 'UNCONFIRMED',
    description: '工艺待确认的各种工厂级非受控历史俗称，待会签。'
  },
  {
    id: 'E-004',
    objectType: '所有对象 (ALL)',
    propertyName: '生命周期状态',
    propertyCode: 'lifecycle_state',
    enumSource: 'PLM 内置工作流',
    enumValueCode: 'E_LIFE_RELEASED',
    enumDisplayName: '已发布',
    standardValue: 'Released',
    synonyms: ['发布', '生效', 'ACTIVE'],
    isSimilarityActive: false,
    status: 'ACTIVE',
    description: '物料的正式生命周期状态，已完成工艺会签，属于可正常选用和生产的状态。'
  },
  {
    id: 'E-005',
    objectType: '所有对象 (ALL)',
    propertyName: '生命周期状态',
    propertyCode: 'lifecycle_state',
    enumSource: 'PLM 内置工作流',
    enumValueCode: 'E_LIFE_OBSOLETE',
    enumDisplayName: '已作废',
    standardValue: 'Obsolete',
    synonyms: ['作废', '淘汰', 'INACTIVE'],
    isSimilarityActive: false,
    status: 'ACTIVE',
    description: '由于失效、设计缺陷或工艺变更导致的作废状态，限制任何新图纸进行借用。'
  },
  {
    id: 'E-006',
    objectType: '机械零件 (PART_MECHANICAL)',
    propertyName: '主要材质',
    propertyCode: 'core_material',
    enumSource: '集团标准材料库',
    enumValueCode: 'E_MAT_304',
    enumDisplayName: '304 不锈钢',
    standardValue: '304',
    synonyms: ['SUS304', '06Cr19Ni10', 'A2', 'A2-70'],
    isSimilarityActive: true,
    status: 'ACTIVE',
    description: '最通用的奥氏体不锈钢材料，具有良好的耐腐蚀性、耐热性和冷加工性能。'
  }
];

// 9. 相似度搜索候选列表 / 治理决策结果数据
export const queryResults: QueryResultItem[] = [
  {
    similarityScore: 89.1,
    objectId: 'PART-2025-009831',
    objectName: '内六角圆柱头螺钉 M10x45-A2',
    material: '06Cr19Ni10 不锈钢',
    classificationPath: '/国家标准分类/紧固件/螺栓/内六角螺栓',
    lifecycleState: '已发布 (Released)',
    hitReason: '规格长文本高度重叠 (得29.1分/满分35)；材质 06Cr19Ni10 匹配至 304 (得25分)；标称直径一致 (得15分)；螺距一致 (得10分)。由于规格长度差异扣除 5.9 分，且无螺栓俗称扣 5 分。',
    diffFields: '长度存在差异: 源[50mm] vs 目标[45mm]；规格名称用词差异(“螺丝” vs “圆柱头螺钉”)。',
    scoreDetail: [
      { fieldName: '规格描述 (spec_description)', score: 29.1, weight: 35, matchInfo: 'TF-IDF 相似度: 83.1%' },
      { fieldName: '主要材质 (core_material)', score: 25.0, weight: 25, matchInfo: '材质匹配 (06Cr19Ni10 与 304 相似)' },
      { fieldName: '标称直径 (nominal_diameter)', score: 15.0, weight: 15, matchInfo: '精确等值 (10mm)' },
      { fieldName: '分类路径 (category_path)', score: 15.0, weight: 15, matchInfo: '同路径一致' },
      { fieldName: '螺距 (thread_pitch)', score: 10.0, weight: 10, matchInfo: '精确等值 (1.5mm)' }
    ],
    differenceDetail: '核心不同差异点主要在长度（拟申请50mm，该物料45mm）以及国家标准标注用词差异（“圆柱头螺钉”与“螺栓”）。',
    sourceObjectType: 'PART_MECHANICAL',
    sourceCategoryPath: '/国家标准分类/紧固件/螺栓/内六角螺栓',
    sourceCoreFields: '规格描述: 内六角螺栓 M10x50 SUS304 | 材质: SUS304 | 直径: 10mm | 螺距: 1.5mm',
    sourceLifecycle: '设计中 (In Work)',
    sourceSystem: '总部 PLM (Windchill)',
    sourceSyncStatus: '已同步完毕'
  },
  {
    similarityScore: 76.5,
    objectId: 'PART-2024-118204',
    objectName: '六角头螺栓 M10x50 GB5783',
    material: 'A2-70 不锈钢',
    classificationPath: '/国家标准分类/紧固件/螺栓/六角头螺栓/普通级',
    lifecycleState: '已发布 (Released)',
    hitReason: '基本属性吻合：标称直径 (得15分)；规格描述(得22.5分)；材质匹配(得25分)。由于分类路径不匹配，仅得同属螺栓大类的折扣分 4 分 (满分15)；由于螺纹型式差异(外六角 vs 内六角)造成规格模式不匹配扣分。',
    diffFields: '分类不一致: 源[内六角螺栓] vs 目标[六角头螺栓/普通级]；驱动头几何型式不同。',
    scoreDetail: [
      { fieldName: '规格描述 (spec_description)', score: 22.5, weight: 35, matchInfo: 'TF-IDF 相似度: 64.3%' },
      { fieldName: '主要材质 (core_material)', score: 25.0, weight: 25, matchInfo: '材质匹配 (A2-70 映射至不锈钢大类)' },
      { fieldName: '标称直径 (nominal_diameter)', score: 15.0, weight: 15, matchInfo: '精确等值 (10mm)' },
      { fieldName: '分类路径 (category_path)', score: 4.0, weight: 15, matchInfo: '分类树同级退避相似 (折扣系数0.85)' },
      { fieldName: '螺距 (thread_pitch)', score: 10.0, weight: 10, matchInfo: '精确等值 (1.5mm)' }
    ],
    differenceDetail: '驱动型式存在根本分歧：拟申请为内六角圆柱头（需用内六角扳手在轴向装配），而该件为外六角头（需用套筒或双头扳手，占据较大侧向扭转空间）。',
    sourceObjectType: 'PART_MECHANICAL',
    sourceCategoryPath: '/国家标准分类/紧固件/螺栓/内六角螺栓',
    sourceCoreFields: '规格描述: 内六角螺栓 M10x50 SUS304 | 材质: SUS304 | 直径: 10mm | 螺距: 1.5mm',
    sourceLifecycle: '设计中 (In Work)',
    sourceSystem: '总部 PLM (Windchill)',
    sourceSyncStatus: '已同步完毕'
  },
  {
    similarityScore: 54.0,
    objectId: 'PART-2026-000492',
    objectName: '内六角螺栓 M8x50 GB70',
    material: '碳钢 (8.8级镀锌)',
    classificationPath: '/国家标准分类/紧固件/螺栓/内六角螺栓',
    lifecycleState: '设计中 (In Work)',
    hitReason: '分类完全一致 (得15分)；由于标称直径不一致 (8mm vs 10mm, 直接扣除15分)；由于材质不一致 (碳钢 vs 不锈钢, 直接扣除25分)；螺纹螺距不一致 (1.25mm vs 1.5mm)。',
    diffFields: '直径不一致: 源[10mm] vs 目标[8mm]；材质严重冲突: 源[304 不锈钢] vs 目标[碳钢]；螺距不同。',
    scoreDetail: [
      { fieldName: '规格描述 (spec_description)', score: 19.0, weight: 35, matchInfo: 'TF-IDF 相似度: 54.2%' },
      { fieldName: '主要材质 (core_material)', score: 0.0, weight: 25, matchInfo: '材质不同，扣除满分' },
      { fieldName: '标称直径 (nominal_diameter)', score: 0.0, weight: 15, matchInfo: '值不匹配 (8mm !== 10mm)' },
      { fieldName: '分类路径 (category_path)', score: 15.0, weight: 15, matchInfo: '同路径一致' },
      { fieldName: '螺距 (thread_pitch)', score: 0.0, weight: 10, matchInfo: '值不匹配 (1.25mm !== 1.5mm)' }
    ],
    differenceDetail: '螺丝直径相差 2mm（拟申请 M10，该件 M8），无法在同一个螺纹过孔中装配。材质为[碳钢] vs 拟申请[304 不锈钢]，在化学防锈和载荷强度上完全不可复用。',
    sourceObjectType: 'PART_MECHANICAL',
    sourceCategoryPath: '/国家标准分类/紧固件/螺栓/内六角螺栓',
    sourceCoreFields: '规格描述: 内六角螺栓 M10x50 SUS304 | 材质: SUS304 | 直径: 10mm | 螺距: 1.5mm',
    sourceLifecycle: '设计中 (In Work)',
    sourceSystem: '总部 PLM (Windchill)',
    sourceSyncStatus: '已同步完毕'
  },
  {
    similarityScore: 92.0,
    objectId: 'PART-2023-001099',
    objectName: '内六角螺栓 M10x50 (作废备件)',
    material: '304 不锈钢',
    classificationPath: '/国家标准分类/紧固件/螺栓/内六角螺栓',
    lifecycleState: '已作废 (Obsolete)',
    hitReason: '分类完全一致 (得15分)；规格高度吻合 (得27分)；材质完全对准 (得25分)；直径完全一致 (得15分)；螺距对准 (得10分)。但在全生命周期中处于已作废状态。',
    diffFields: '生命周期状态为已作废/淘汰。',
    scoreDetail: [
      { fieldName: '规格描述 (spec_description)', score: 27.0, weight: 35, matchInfo: 'TF-IDF 相似度: 92%' },
      { fieldName: '主要材质 (core_material)', score: 25.0, weight: 25, matchInfo: '精确等值' },
      { fieldName: '标称直径 (nominal_diameter)', score: 15.0, weight: 15, matchInfo: '精确等值' },
      { fieldName: '分类路径 (category_path)', score: 15.0, weight: 15, matchInfo: '同路径一致' },
      { fieldName: '螺距 (thread_pitch)', score: 10.0, weight: 10, matchInfo: '精确等值' }
    ],
    differenceDetail: '各项几何参数 and 材料特性完全相同。核心差异仅在物料生命周期状态，候选件已退市废弃。',
    sourceObjectType: 'PART_MECHANICAL',
    sourceCategoryPath: '/国家标准分类/紧固件/螺栓/内六角螺栓',
    sourceCoreFields: '规格描述: 内六角螺栓 M10x50 SUS304 | 材质: SUS304 | 直径: 10mm | 螺距: 1.5mm',
    sourceLifecycle: '设计中 (In Work)',
    sourceSystem: '总部 PLM (Windchill)',
    sourceSyncStatus: '已同步完毕'
  }
];

// Manticore 一些系统级变量
export const defaultScoreTotal = 100;
export const currentActiveVersion = 'v2.4.0';
export const lastPublishTime = '2026-07-02 15:00:00';
export const draftStateInfo = {
  hasUnpublishedDrafts: true,
  draftCount: 2,
  lastDraftEditor: '李晓华 (数据标准管理员)',
  lastDraftEditTime: '2026-07-06 18:24:00'
};

// 10. 字段白名单初始数据
export const initialFieldWhitelists: FieldWhitelistItem[] = [
  {
    id: 'WL-001',
    objectType: 'PART_MECHANICAL',
    fieldName: '规格描述',
    propertyCode: 'spec_description',
    fieldType: 'TEXT',
    isEnabled: true,
    isFilterActive: false,
    isScoreActive: true,
    isTextMatchActive: true,
    isRequiredForAudit: true,
    showInApp: true,
    showDifference: true,
    defaultMatchMethod: 'TF-IDF 文本相似度',
    defaultWeight: 35,
    sortOrder: 10,
    status: 'ACTIVE',
    lastEditor: '张建国 (系统架构师)',
    lastEditTime: '2026-07-06 14:30:00'
  },
  {
    id: 'WL-002',
    objectType: 'PART_MECHANICAL',
    fieldName: '主要材质',
    propertyCode: 'core_material',
    fieldType: 'ENUM',
    isEnabled: true,
    isFilterActive: true,
    isScoreActive: true,
    isTextMatchActive: false,
    isRequiredForAudit: true,
    showInApp: true,
    showDifference: true,
    defaultMatchMethod: '精确对齐/同义词归一',
    defaultWeight: 25,
    sortOrder: 20,
    status: 'ACTIVE',
    lastEditor: '李晓华 (数据标准管理员)',
    lastEditTime: '2026-07-06 14:32:15'
  },
  {
    id: 'WL-003',
    objectType: 'PART_MECHANICAL',
    fieldName: '标称直径',
    propertyCode: 'nominal_diameter',
    fieldType: 'NUMBER',
    isEnabled: true,
    isFilterActive: true,
    isScoreActive: true,
    isTextMatchActive: false,
    isRequiredForAudit: true,
    showInApp: true,
    showDifference: true,
    defaultMatchMethod: '数值范围容差匹配 (+/- 0.2mm)',
    defaultWeight: 15,
    sortOrder: 30,
    status: 'ACTIVE',
    lastEditor: '王明 (机械工程师)',
    lastEditTime: '2026-07-05 10:11:45'
  },
  {
    id: 'WL-004',
    objectType: 'PART_MECHANICAL',
    fieldName: '螺距',
    propertyCode: 'thread_pitch',
    fieldType: 'NUMBER',
    isEnabled: true,
    isFilterActive: false,
    isScoreActive: true,
    isTextMatchActive: false,
    isRequiredForAudit: false,
    showInApp: true,
    showDifference: true,
    defaultMatchMethod: '数值等值匹配',
    defaultWeight: 10,
    sortOrder: 40,
    status: 'ACTIVE',
    lastEditor: '王明 (机械工程师)',
    lastEditTime: '2026-07-05 11:22:00'
  },
  {
    id: 'WL-005',
    objectType: 'PART_MECHANICAL',
    fieldName: '分类路径',
    propertyCode: 'category_path',
    fieldType: 'CLASS_TREE',
    isEnabled: true,
    isFilterActive: true,
    isScoreActive: true,
    isTextMatchActive: false,
    isRequiredForAudit: true,
    showInApp: true,
    showDifference: false,
    defaultMatchMethod: '层级深度折扣匹配',
    defaultWeight: 15,
    sortOrder: 50,
    status: 'ACTIVE',
    lastEditor: '张建国 (系统架构师)',
    lastEditTime: '2026-07-06 09:15:30'
  },
  {
    id: 'WL-006',
    objectType: 'PART_ELECTRICAL',
    fieldName: '工作电压',
    propertyCode: 'working_voltage',
    fieldType: 'NUMBER',
    isEnabled: true,
    isFilterActive: true,
    isScoreActive: true,
    isTextMatchActive: false,
    isRequiredForAudit: true,
    showInApp: true,
    showDifference: true,
    defaultMatchMethod: '数值范围退让比对',
    defaultWeight: 30,
    sortOrder: 10,
    status: 'ACTIVE',
    lastEditor: '赵丽 (电气工程师)',
    lastEditTime: '2026-07-06 11:30:22'
  }
];

// 11. 阈值规则初始数据
export const initialThresholdRules: ThresholdRule[] = [
  {
    id: 'TR-001',
    ruleName: '紧固件大类三化准则',
    applicableObjectType: 'PART_MECHANICAL',
    applicableCategory: '/国家标准分类/紧固件',
    reuseThreshold: 86,
    reviewThresholdMin: 68,
    reviewThresholdMax: 86,
    isEnabled: true,
    version: 'v2.4.0',
    remarks: '针对通用型五金标准紧固件，设定较高的复用要求。相似度 >= 86% 时建议复用已有件；介于 68% 到 86% 之间建议人工复核；低于 68% 允许继续新建物料申请。'
  },
  {
    id: 'TR-002',
    ruleName: '机械加工定制件三化准则',
    applicableObjectType: 'PART_MECHANICAL',
    applicableCategory: '/自定义零组件/非标定制件/机加工件',
    reuseThreshold: 92,
    reviewThresholdMin: 75,
    reviewThresholdMax: 92,
    isEnabled: true,
    version: 'v2.4.0',
    remarks: '定制件的相似度要求更严，避免错误复用。>= 92% 建议复用已有件；75% - 92% 建议人工复核；< 75% 允许继续新建。'
  },
  {
    id: 'TR-003',
    ruleName: '阻容感电子元器件三化准则',
    applicableObjectType: 'PART_ELECTRICAL',
    applicableCategory: '/电气元器件/基础阻容感',
    reuseThreshold: 80,
    reviewThresholdMin: 60,
    reviewThresholdMax: 80,
    isEnabled: true,
    version: 'v2.4.0',
    remarks: '电子元器件具有规格标准性，复用阈值适当下调。>= 80% 建议复用；60% - 80% 建议人工复核；< 60% 允许继续新建。'
  }
];

// 12. 强制复核 / 不可复用规则初始数据
export const initialHardRules: HardRule[] = [
  {
    id: 'HR-001',
    ruleName: '主材不一致一票强制复核',
    ruleType: 'FORCE_REVIEW',
    applicableObjectType: 'PART_MECHANICAL',
    applicableCategory: 'ALL',
    triggerField: 'core_material',
    triggerCondition: '源与候选物料材质牌号不同，且无法经由标准化规则自动收敛',
    triggerExample: '源: SUS304 vs 候选: Q235 钢',
    actionAfterTrigger: 'RECOMMEND_REVIEW',
    priority: 1,
    isEnabled: true,
    remarks: '在相似度较高的情况下（如100%几何相同，但材质一铜一铁），材质不同不可自动通过，必须强制复核。'
  },
  {
    id: 'HR-002',
    ruleName: '尺寸超出容差强制复核',
    ruleType: 'FORCE_REVIEW',
    applicableObjectType: 'PART_MECHANICAL',
    applicableCategory: 'ALL',
    triggerField: 'nominal_diameter',
    triggerCondition: '直径绝对误差超过容差设定的 0.5mm 边界',
    triggerExample: '源: 10mm vs 候选: 12mm',
    actionAfterTrigger: 'RECOMMEND_REVIEW',
    priority: 2,
    isEnabled: true,
    remarks: '尺寸超出基本机械装配限制时，即使整体文本匹配分高，也必须强制提醒研发复核。'
  },
  {
    id: 'HR-003',
    ruleName: '生命周期为停用/作废禁止复用',
    ruleType: 'NON_REUSABLE',
    applicableObjectType: 'ALL',
    applicableCategory: 'ALL',
    triggerField: 'lifecycle_state',
    triggerCondition: '候选件状态 === Obsolete (作废) / Inactive (停用)',
    triggerExample: '候选件状态: 已作废 (Obsolete)',
    actionAfterTrigger: 'PROHIBIT_REUSE',
    priority: 3,
    isEnabled: true,
    remarks: '禁止复用已进入淘汰状态、老项目废弃的零部件，避免新项目错误引入劣质或已断供备件。'
  },
  {
    id: 'HR-004',
    ruleName: '表面处理不一致提示风险',
    ruleType: 'RISK_ALERT',
    applicableObjectType: 'PART_MECHANICAL',
    applicableCategory: 'ALL',
    triggerField: 'surface_treatment',
    triggerCondition: '源与目标表面处理工艺不重叠 (如镀锌 vs 阳极氧化)',
    triggerExample: '源: 钝化 vs 候选: 镀白锌',
    actionAfterTrigger: 'ONLY_ALERT',
    priority: 4,
    isEnabled: true,
    remarks: '表面处理不一致会影响腐蚀寿命或电化学接触，提示装配兼容性风险。'
  },
  {
    id: 'HR-005',
    ruleName: '来源系统数据未同步完成提示复核',
    ruleType: 'FORCE_REVIEW',
    applicableObjectType: 'ALL',
    applicableCategory: 'ALL',
    triggerField: 'source_system',
    triggerCondition: '候选件来源系统状态显示为“同步中(SYNC_IN_PROGRESS)”',
    triggerExample: '数据状态: 同步中',
    actionAfterTrigger: 'RECOMMEND_REVIEW',
    priority: 5,
    isEnabled: true,
    remarks: '由于ERP与PLM中间集成状态存在延迟，未完成全部属性对齐的物料不可盲目复用。'
  }
];

// 13. 分类覆盖配置初始数据
export const initialCategoryCoverages: CategoryCoverage[] = [
  {
    id: 'CC-001',
    categoryPath: 'ALL (全局默认规则)',
    objectType: 'ALL',
    whitelistId: 'WL-001, WL-002, WL-003, WL-004, WL-005',
    similarityRuleSetId: '机械通用相似度评分参数集',
    thresholdRuleId: 'TR-001 (紧固件大类三化准则)',
    hardRuleSetIds: ['HR-001', 'HR-002', 'HR-003', 'HR-004', 'HR-005'],
    weightOverrideInfo: '无 (采用系统预置全局默认权重比例)',
    inheritParent: false,
    isEnabled: true,
    version: 'v2.4.0'
  },
  {
    id: 'CC-002',
    categoryPath: '/国家标准分类/紧固件',
    objectType: 'PART_MECHANICAL',
    whitelistId: 'WL-001, WL-002, WL-003, WL-004, WL-005',
    similarityRuleSetId: '紧固件专用精密评分参数集',
    thresholdRuleId: 'TR-001 (紧固件大类三化准则)',
    hardRuleSetIds: ['HR-001', 'HR-002', 'HR-003', 'HR-004', 'HR-005'],
    weightOverrideInfo: '螺距权重上调至 15%, 标称直径权重上调至 20%, 规格描述降为 30%',
    inheritParent: true,
    isEnabled: true,
    version: 'v2.4.0'
  },
  {
    id: 'CC-003',
    categoryPath: '/国家标准分类/紧固件/螺栓/内六角螺栓',
    objectType: 'PART_MECHANICAL',
    whitelistId: 'WL-001, WL-002, WL-003, WL-004, WL-005',
    similarityRuleSetId: '紧固件专用精密评分参数集',
    thresholdRuleId: 'TR-001 (紧固件大类三化准则)',
    hardRuleSetIds: ['HR-001', 'HR-002', 'HR-003', 'HR-004', 'HR-005'],
    weightOverrideInfo: '继承父分类【紧固件】全部覆盖参数，未作独立子类偏差设定',
    inheritParent: true,
    isEnabled: true,
    version: 'v2.4.0'
  },
  {
    id: 'CC-004',
    categoryPath: '/自定义零组件/非标定制件/机加工件',
    objectType: 'PART_MECHANICAL',
    whitelistId: 'WL-001, WL-002, WL-003',
    similarityRuleSetId: '非标件几何包络及公差专用评分集',
    thresholdRuleId: 'TR-002 (机械加工定制件三化准则)',
    hardRuleSetIds: ['HR-001', 'HR-002', 'HR-003'],
    weightOverrideInfo: '剔除螺距字段，将主要材质权重调整至 40%, 规格包络描述权重 45%',
    inheritParent: false,
    isEnabled: true,
    version: 'v2.4.0'
  }
];

export function calculateFieldMatchRate(
  rule: FieldSimilarityRule,
  refVal: any,
  candVal: any,
  cand: any
): number {
  if (refVal === undefined || refVal === null || refVal === '') {
    return 0;
  }
  if (candVal === undefined || candVal === null || candVal === '') {
    return 0;
  }

  const config = rule.matchConfig;
  const matchKind = config?.kind || 'EXACT';

  // EXACT Match
  if (matchKind === 'EXACT') {
    if (rule.fieldType === '带单位数值 (NUMBER_WITH_UNIT)') {
      const candUnit = cand.units?.[rule.propertyCode] || rule.displayUnit || 'mm';
      const refUnit = rule.displayUnit || 'mm';
      const refBase = convertToBaseUnit(Number(refVal), refUnit, rule.unitFamily || '');
      const candBase = convertToBaseUnit(Number(candVal), candUnit, rule.unitFamily || '');
      return Math.abs(refBase - candBase) < 1e-6 ? 1.0 : 0.0;
    }
    return String(refVal).trim() === String(candVal).trim() ? 1.0 : 0.0;
  }

  // TEXT SIMILARITY
  if (matchKind === 'TEXT_SIMILARITY') {
    const s1 = String(refVal).trim();
    const s2 = String(candVal).trim();
    if (s1 === s2) return 1.0;

    // Character overlap similarity
    const set1 = new Set(s1.split(''));
    const arr2 = s2.split('');
    const common = arr2.filter(c => set1.has(c)).length;
    const rawRate = common / Math.max(s1.length, s2.length);

    const threshold = (config as any).threshold || 60;
    if (rawRate * 100 < threshold) {
      return 0.0;
    }
    return rawRate;
  }

  // NUMERIC TOLERANCE
  if (matchKind === 'NUMERIC_TOLERANCE') {
    const candUnit = cand.units?.[rule.propertyCode] || rule.displayUnit || 'mm';
    const refUnit = rule.displayUnit || 'mm';
    const refBase = convertToBaseUnit(Number(refVal), refUnit, rule.unitFamily || '');
    const candBase = convertToBaseUnit(Number(candVal), candUnit, rule.unitFamily || '');

    const refDisp = convertFromBaseUnit(refBase, rule.displayUnit || 'mm', rule.unitFamily || '');
    const candDisp = convertFromBaseUnit(candBase, rule.displayUnit || 'mm', rule.unitFamily || '');

    const diff = candDisp - refDisp;
    const direction = (config as any).direction || 'BOTH';
    if (direction === 'HIGHER' && diff < 0) return 0.0;
    if (direction === 'LOWER' && diff > 0) return 0.0;

    const absDiff = Math.abs(diff);
    const tolType = (config as any).toleranceType || 'ABSOLUTE';
    const tolVal = (config as any).toleranceValue || 0.2;

    if (tolType === 'ABSOLUTE') {
      return absDiff <= tolVal ? 1.0 : 0.0;
    } else {
      // PERCENTAGE
      if (refDisp === 0) return absDiff === 0 ? 1.0 : 0.0;
      return (absDiff / refDisp) <= (tolVal / 100) ? 1.0 : 0.0;
    }
  }

  // NUMERIC DECAY
  if (matchKind === 'NUMERIC_DECAY') {
    const candUnit = cand.units?.[rule.propertyCode] || rule.displayUnit || 'mm';
    const refUnit = rule.displayUnit || 'mm';
    const refBase = convertToBaseUnit(Number(refVal), refUnit, rule.unitFamily || '');
    const candBase = convertToBaseUnit(Number(candVal), candUnit, rule.unitFamily || '');

    const refDisp = convertFromBaseUnit(refBase, rule.displayUnit || 'mm', rule.unitFamily || '');
    const candDisp = convertFromBaseUnit(candBase, rule.displayUnit || 'mm', rule.unitFamily || '');

    const diff = candDisp - refDisp;
    const direction = (config as any).direction || 'BOTH';
    if (direction === 'HIGHER' && diff < 0) return 0.0;
    if (direction === 'LOWER' && diff > 0) return 0.0;

    const absDiff = Math.abs(diff);
    const fullRange = (config as any).fullScoreRange || 0.1;
    const zeroBoundary = (config as any).zeroScoreBoundary || 1.0;

    if (absDiff <= fullRange) return 1.0;
    if (absDiff >= zeroBoundary) return 0.0;

    const rate = 1.0 - (absDiff - fullRange) / (zeroBoundary - fullRange);
    return Math.max(0, Math.min(1.0, rate));
  }

  // NATIVE HIERARCHY
  if (matchKind === 'NATIVE_HIERARCHY') {
    const p1 = String(refVal).replace(/^\/|\/$/g, '').split('/');
    const p2 = String(candVal).replace(/^\/|\/$/g, '').split('/');

    let c = 0;
    const limit = Math.min(p1.length, p2.length);
    for (let i = 0; i < limit; i++) {
      if (p1[i] === p2[i]) {
        c++;
      } else {
        break;
      }
    }

    if (p1.join('/') === p2.join('/')) {
      return 1.0;
    }

    const maxGap = (config as any).maxLevelGap || 3;
    const relation = (config as any).relation || 'ANCESTOR_DESCENDANT';
    const deduction = (config as any).deductionPerLevel || 5;

    const refDist = p1.length - c;
    const candDist = p2.length - c;
    const gap = refDist + candDist;

    if (relation === 'PARENT_CHILD') {
      const isParentChild = (refDist === 1 && candDist === 0) || (refDist === 0 && candDist === 1);
      if (!isParentChild) return 0.0;
    } else if (relation === 'ANCESTOR_DESCENDANT') {
      const isAncestorDescendant = (refDist === 0 || candDist === 0);
      if (!isAncestorDescendant) {
        return 0.0; // Cousin relationship gets 0 score, no deduction, no error
      }
    }

    if (gap > maxGap) {
      return 0.0;
    }

    const rate = 1.0 - (gap * deduction / 100);
    return Math.max(0, Math.min(1.0, rate));
  }

  // DATE TOLERANCE
  if (matchKind === 'DATE_TOLERANCE') {
    const t1 = new Date(refVal).getTime();
    const t2 = new Date(candVal).getTime();
    if (isNaN(t1) || isNaN(t2)) return 0.0;

    const diffMs = t2 - t1;
    const unit = (config as any).toleranceUnit || 'DAY';
    const factor = unit === 'DAY' ? (1000 * 60 * 60 * 24) : (1000 * 60 * 60);
    const diff = diffMs / factor;

    const direction = (config as any).direction || 'BOTH';
    if (direction === 'HIGHER' && diff < 0) return 0.0;
    if (direction === 'LOWER' && diff > 0) return 0.0;

    const absDiff = Math.abs(diff);
    const tolVal = (config as any).toleranceValue || 7;

    return absDiff <= tolVal ? 1.0 : 0.0;
  }

  return String(refVal) === String(candVal) ? 1.0 : 0.0;
}

// Evaluation helpers for R11-BLK-03
function evaluateClassTree(candPath: string, targetPath: string, operator: string): boolean {
  const p1 = candPath.trim().replace(/\/$/, '');
  const p2 = targetPath.trim().replace(/\/$/, '');
  if (operator === '路径一致') {
    return p1 === p2;
  }
  if (operator === '属于该路径') {
    return p1.startsWith(p2);
  }
  if (operator === '父子关系') {
    const s1 = p1.split('/').filter(Boolean);
    const s2 = p2.split('/').filter(Boolean);
    if (s1.length === s2.length + 1) {
      return p1.startsWith(p2);
    }
    if (s2.length === s1.length + 1) {
      return p2.startsWith(p1);
    }
    return false;
  }
  if (operator === '祖先/后代关系') {
    return p1.startsWith(p2) || p2.startsWith(p1);
  }
  return false;
}

function evaluateDate(candVal: string, targetVal: string, operator: string): boolean {
  const tCand = Date.parse(candVal);
  if (isNaN(tCand)) return false;

  if (operator === '区间内') {
    const parts = targetVal.split('~');
    const tMin = Date.parse(parts[0] || '');
    const tMax = Date.parse(parts[1] || '');
    if (isNaN(tMin) || isNaN(tMax)) return false;
    return tCand >= tMin && tCand <= tMax;
  }

  const tTarget = Date.parse(targetVal);
  if (isNaN(tTarget)) return false;

  if (operator === '等于') {
    return tCand === tTarget;
  }
  if (operator === '早于') {
    return tCand < tTarget;
  }
  if (operator === '晚于') {
    return tCand > tTarget;
  }
  return false;
}

function evaluateNumeric(numCand: number, targetVal: string, operator: string, rule: FieldSimilarityRule): boolean {
  if (operator === '区间内' || operator === '区间外') {
    const parts = targetVal.split('~');
    const minRaw = Number(parts[0]);
    const maxRaw = Number(parts[1]);
    if (isNaN(minRaw) || isNaN(maxRaw)) return false;

    const isUnitType = rule.fieldType?.includes('NUMBER_WITH_UNIT');
    const qtyFamily = rule.unitFamily || '长度';
    const minVal = isUnitType ? convertToBaseUnit(minRaw, rule.displayUnit || '', qtyFamily) : minRaw;
    const maxVal = isUnitType ? convertToBaseUnit(maxRaw, rule.displayUnit || '', qtyFamily) : maxRaw;

    if (operator === '区间内') {
      return numCand >= minVal && numCand <= maxVal;
    } else {
      return numCand < minVal || numCand > maxVal;
    }
  }

  const targetNumRaw = Number(targetVal);
  if (isNaN(targetNumRaw)) return false;
  const isUnitType = rule.fieldType?.includes('NUMBER_WITH_UNIT');
  const qtyFamily = rule.unitFamily || '长度';
  const targetNum = isUnitType ? convertToBaseUnit(targetNumRaw, rule.displayUnit || '', qtyFamily) : targetNumRaw;

  if (operator === '等于') {
    return Math.abs(numCand - targetNum) < 1e-9;
  }
  if (operator === '大于等于') {
    return numCand >= targetNum - 1e-9;
  }
  if (operator === '小于等于') {
    return numCand <= targetNum + 1e-9;
  }
  return false;
}



export const allMechanicalParts = [
  {
    requestCode: 'REQ-2026-000100',
    objectType: 'PART_MECHANICAL',
    objectId: 'PART-2026-000100',
    objectName: '六角头螺栓 M10 x 50',
    specification: 'M10 x 50',
    material: 'SUS304',
    classificationPath: '/紧固件/螺栓/六角头螺栓',
    lifecycleState: '有效',
    attributes: {
      spec_description: '六角头螺栓 M10 x 50',
      core_material: 'SUS304',
      nominal_diameter: 10,
      thread_pitch: 1.5,
      nominal_length: 50,
      category_path: '/紧固件/螺栓/六角头螺栓',
      lifecycle_state: '有效',
      creation_date: '2026-01-15'
    },
    units: {
      nominal_diameter: 'mm',
      thread_pitch: 'mm',
      nominal_length: 'mm'
    }
  },
  {
    requestCode: 'REQ-2026-000101',
    objectType: 'PART_MECHANICAL',
    objectId: 'PART-A-FULL',
    objectName: '六角头螺栓 M10 x 50 (全量命中)',
    specification: 'M10 x 50',
    material: 'SUS304',
    classificationPath: '/紧固件/螺栓/六角头螺栓',
    lifecycleState: '有效',
    attributes: {
      spec_description: '六角头螺栓 M10 x 50',
      core_material: 'SUS304',
      nominal_diameter: 10,
      thread_pitch: 1.5,
      nominal_length: 50,
      category_path: '/紧固件/螺栓/六角头螺栓',
      lifecycle_state: '有效',
      creation_date: '2026-01-01'
    },
    units: {
      nominal_diameter: 'mm',
      thread_pitch: 'mm',
      nominal_length: 'mm'
    }
  },
  {
    requestCode: 'REQ-2026-000102',
    objectType: 'PART_MECHANICAL',
    objectId: 'PART-B-UNIT',
    objectName: '六角螺栓 M10 x 50 (厘米量纲)',
    specification: 'M10 x 50',
    material: 'SUS304',
    classificationPath: '/紧固件/螺栓/六角头螺栓',
    lifecycleState: '有效',
    attributes: {
      spec_description: '六角头螺栓M10 x 50 碳钢防锈器件',
      core_material: 'SUS304',
      nominal_diameter: 1, // in cm, converts to 10mm
      thread_pitch: 1.2,
      nominal_length: 5, // in cm, converts to 50mm
      category_path: '/紧固件/螺栓/六角头螺栓',
      lifecycle_state: '有效',
      creation_date: '2026-01-31'
    },
    units: {
      nominal_diameter: 'cm',
      thread_pitch: 'mm',
      nominal_length: 'cm'
    }
  },
  {
    requestCode: 'REQ-2026-000103',
    objectType: 'PART_MECHANICAL',
    objectId: 'PART-C-MISSING',
    objectName: '螺栓 M10 (轻量空值型)',
    specification: 'M10',
    material: 'A2-70',
    classificationPath: '/紧固件/螺栓/六角头螺栓',
    lifecycleState: '有效',
    attributes: {
      spec_description: '螺栓 M10',
      core_material: 'A2-70',
      nominal_diameter: 10,
      thread_pitch: null,
      nominal_length: null,
      category_path: '/紧固件/螺栓/六角头螺栓',
      lifecycle_state: '有效',
      creation_date: '2025-12-31'
    },
    units: {
      nominal_diameter: 'mm',
      nominal_length: 'mm'
    }
  }
];

export const allElectricalParts = [
  {
    requestCode: 'REQ-2026-000200',
    objectType: 'PART_ELECTRICAL',
    objectId: 'ELEC-2026-000100',
    objectName: '直流继电器 12V',
    specification: '12V',
    material: '塑料/铜',
    classificationPath: '/电子元器件/继电器/直流继电器',
    lifecycleState: '有效',
    attributes: {
      working_voltage: 12,
      working_temp: 298.15, // in K (25 degC)
      category_path: '/电子元器件/继电器/直流继电器',
      lifecycle_state: '有效',
      creation_date: '2026-01-15'
    },
    units: {
      working_voltage: 'V',
      working_temp: 'K'
    }
  },
  {
    requestCode: 'REQ-2026-000201',
    objectType: 'PART_ELECTRICAL',
    objectId: 'ELEC-A-FULL',
    objectName: '直流继电器 12V (全量匹配)',
    specification: '12V',
    material: '塑料/铜',
    classificationPath: '/电子元器件/继电器/直流继电器',
    lifecycleState: '有效',
    attributes: {
      working_voltage: 12,
      working_temp: 298.15,
      category_path: '/电子元器件/继电器/直流继电器',
      lifecycle_state: '有效',
      creation_date: '2026-01-01'
    },
    units: {
      working_voltage: 'V',
      working_temp: 'K'
    }
  },
  {
    requestCode: 'REQ-2026-000202',
    objectType: 'PART_ELECTRICAL',
    objectId: 'ELEC-B-TEMP',
    objectName: '直流继电器 12V (高温偏差版)',
    specification: '12V',
    material: '塑料/铜',
    classificationPath: '/电子元器件/继电器/直流继电器',
    lifecycleState: '有效',
    attributes: {
      working_voltage: 12,
      working_temp: 313.15,
      category_path: '/电子元器件/继电器/直流继电器',
      lifecycle_state: '有效',
      creation_date: '2026-01-31'
    },
    units: {
      working_voltage: 'V',
      working_temp: 'K'
    }
  }
];

export function runSimilaritySearch(
  objectType: string,
  requestCodeOrId: string,
  rules: FieldSimilarityRule[],
  filters?: {
    keyword?: string;
    category?: string;
    lifecycle?: string;
    specInput?: string;
    materialOperator?: string;
    materialValue?: string;
    diameterValue?: string;
    diameterUnit?: string;
    diameterOperator?: string;
    voltageValue?: string;
    voltageUnit?: string;
    voltageOperator?: string;
  }
): SearchRunResult {
  // Resolve reference part and raw candidates
  const targetPool = objectType === 'PART_MECHANICAL' ? allMechanicalParts : allElectricalParts;
  const searchId = (requestCodeOrId || '').trim().toUpperCase();

  const referenceItem = targetPool.find(
    p => p.objectId.toUpperCase() === searchId || p.requestCode.toUpperCase() === searchId
  );

  if (!referenceItem) {
    return {
      reference: null,
      scoredCandidates: [],
      errorCode: 'REFERENCE_NOT_FOUND',
      errorMessage: `未找到基准零部件: ${requestCodeOrId}`
    };
  }

  const reference: ReferenceObject = referenceItem;
  // Candidates are all pool items EXCEPT the selected benchmark reference
  const rawCandidates = targetPool.filter(p => p.objectId !== referenceItem.objectId);

  const scoredCandidates: ScoredCandidate[] = [];

  // Filter rules relevant to this object type
  const typeRules = rules.filter(r => r.objectType === objectType);
  const activeRules = typeRules.filter(r => r.isScoreActive && r.enabled);

  for (const cand of rawCandidates) {
    // Apply UI Filters from search panel (Client view)
    if (filters) {
      if (filters.keyword && filters.keyword.trim()) {
        const k = filters.keyword.toLowerCase();
        if (!cand.objectName.toLowerCase().includes(k) && !cand.objectId.toLowerCase().includes(k)) {
          continue;
        }
      }
      if (filters.category && filters.category !== 'ALL') {
        if (filters.category === 'BOLT') {
          if (!cand.classificationPath.includes('螺栓')) continue;
        } else {
          if (cand.classificationPath.includes('螺栓')) continue;
        }
      }
      if (filters.lifecycle && filters.lifecycle !== 'ALL') {
        const val = filters.lifecycle.toLowerCase();
        const candState = (cand.lifecycleState || '').toLowerCase();
        if (candState !== val) continue;
      }
      if (filters.specInput && filters.specInput.trim()) {
        const s = filters.specInput.toLowerCase();
        if (!cand.objectName.toLowerCase().includes(s)) continue;
      }
      if (filters.materialOperator && filters.materialValue !== undefined && filters.materialValue !== '') {
        const op = filters.materialOperator;
        const val = filters.materialValue.trim().toLowerCase();
        const candMat = (cand.material || '').toLowerCase();
        if (op === 'CONTAINS') {
          if (!candMat.includes(val)) continue;
        } else if (op === 'EQUALS') {
          if (candMat !== val) continue;
        } else if (op === 'NOT_EQUALS') {
          if (candMat === val) continue;
        }
      }

      // R19-UI-02: Unit-based Numerical filter for Mechanical (nominal_diameter)
      if (objectType === 'PART_MECHANICAL' && filters.diameterOperator === 'EQUALS' && filters.diameterValue !== undefined && filters.diameterValue !== '') {
        const val = parseFloat(filters.diameterValue);
        if (!isNaN(val)) {
          const unitDef = mockUnitCatalog.quantities.find(q => q.code === '长度' || q.name === '长度')?.units.find(u => u.code === filters.diameterUnit);
          if (!unitDef || (unitDef.status && unitDef.status !== 'ACTIVE')) {
            return {
              reference: reference,
              scoredCandidates: [],
              errorCode: 'OBJECT_TYPE_MISMATCH',
              errorMessage: `未知或停用的单位 [${filters.diameterUnit}]，等值换算被拒绝！`
            };
          }
          const filterBaseDiameter = val * unitDef.scale + unitDef.offset;

          const candDiameter = (cand.attributes as any).nominal_diameter;
          if (candDiameter !== undefined && candDiameter !== null) {
            const candUnitStr = (cand as any).units?.nominal_diameter || 'mm';
            const candUnitDef = mockUnitCatalog.quantities.find(q => q.code === '长度' || q.name === '长度')?.units.find(u => u.code === candUnitStr);
            if (!candUnitDef) {
              return {
                reference: reference,
                scoredCandidates: [],
                errorCode: 'OBJECT_TYPE_MISMATCH',
                errorMessage: `候选物料 [${cand.objectId}] 包含未知单位 [${candUnitStr}]，换算失败！`
              };
            }
            const candBaseDiameter = Number(candDiameter) * candUnitDef.scale + candUnitDef.offset;
            if (Math.abs(candBaseDiameter - filterBaseDiameter) > 1e-6) {
              continue;
            }
          } else {
            continue;
          }
        }
      }

      // R19-UI-02: Unit-based Numerical filter for Electrical (working_voltage)
      if (objectType === 'PART_ELECTRICAL' && filters.voltageOperator === 'EQUALS' && filters.voltageValue !== undefined && filters.voltageValue !== '') {
        const val = parseFloat(filters.voltageValue);
        if (!isNaN(val)) {
          const unitDef = mockUnitCatalog.quantities.find(q => q.code === '电压' || q.name === '电压')?.units.find(u => u.code === filters.voltageUnit);
          if (!unitDef || (unitDef.status && unitDef.status !== 'ACTIVE')) {
            return {
              reference: reference,
              scoredCandidates: [],
              errorCode: 'OBJECT_TYPE_MISMATCH',
              errorMessage: `未知或停用的单位 [${filters.voltageUnit}]，等值换算被拒绝！`
            };
          }
          const filterBaseVoltage = val * unitDef.scale + unitDef.offset;

          const candVoltage = (cand.attributes as any).working_voltage;
          if (candVoltage !== undefined && candVoltage !== null) {
            const candUnitStr = (cand as any).units?.working_voltage || 'V';
            const candUnitDef = mockUnitCatalog.quantities.find(q => q.code === '电压' || q.name === '电压')?.units.find(u => u.code === candUnitStr);
            if (!candUnitDef) {
              return {
                reference: reference,
                scoredCandidates: [],
                errorCode: 'OBJECT_TYPE_MISMATCH',
                errorMessage: `候选物料 [${cand.objectId}] 包含未知单位 [${candUnitStr}]，换算失败！`
              };
            }
            const candBaseVoltage = Number(candVoltage) * candUnitDef.scale + candUnitDef.offset;
            if (Math.abs(candBaseVoltage - filterBaseVoltage) > 1e-6) {
              continue;
            }
          } else {
            continue;
          }
        }
      }


    }

    // 4. Step 2: Scoring calculations
    const compareFields: CompareFieldResult[] = [];
    let totalScore = 0;
    let sumActiveWeights = 0;
    let numeratorScore = 0;

    for (const rule of activeRules) {
      const key = rule.propertyCode;
      const refVal = reference ? reference.attributes[key] : null;
      const candVal = cand.attributes[key];

      const isRefMissing = (refVal === null || refVal === undefined || refVal === '');
      const isCandMissing = (candVal === null || candVal === undefined || candVal === '');

      if (isRefMissing) {
        // 1. & 2. 如果参考值缺失，或者参考值和候选值都缺失：无条件跳过该字段，不进入分母
        compareFields.push({
          fieldKey: key,
          fieldLabel: rule.fieldName,
          sourceValue: null,
          candidateValue: candVal as any,
          weight: rule.weight,
          matchRate: 0,
          weightedScore: 0,
          status: 'MISS',
          reason: '参考值缺失，字段跳过且未进入分母'
        });
        continue;
      }

      if (isCandMissing) {
        // 3. 参考值有值、候选值缺失：根据空值退让回退策略进行处理
        if (rule.nullHandling === '不参与计算' || rule.nullHandling === '不参与计算 (权重均摊到其他有值项)') {
          // 候选值缺失且不参与计算，不计入权重分母
          compareFields.push({
            fieldKey: key,
            fieldLabel: rule.fieldName,
            sourceValue: refVal as any,
            candidateValue: null,
            weight: rule.weight,
            matchRate: 0,
            weightedScore: 0,
            status: 'MISS',
            reason: '候选值缺失，字段跳过并重新归一'
          });
        } else {
          // 候选值缺失按 0 分，计入权重分母，得分 0
          sumActiveWeights += rule.weight;
          compareFields.push({
            fieldKey: key,
            fieldLabel: rule.fieldName,
            sourceValue: refVal as any,
            candidateValue: null,
            weight: rule.weight,
            matchRate: 0,
            weightedScore: 0,
            status: 'MISS',
            reason: '候选值缺失，按 0 分计入'
          });
        }
        continue;
      }

      // Candidate has value
      sumActiveWeights += rule.weight;
      const matchRate = calculateFieldMatchRate(rule, refVal, candVal, cand);

      let status: 'FULL' | 'PARTIAL' | 'MISS' = 'MISS';
      if (matchRate === 1.0) status = 'FULL';
      else if (matchRate > 0) status = 'PARTIAL';
      else status = 'MISS';

      // Build specific reasons
      let reason = '';
      if (matchRate === 1.0) {
        if (rule.fieldType === '带单位数值 (NUMBER_WITH_UNIT)') {
          const candUnit = (cand as any).units?.[key] || rule.displayUnit || '';
          if (candUnit && candUnit !== rule.displayUnit) {
            reason = `${candVal}${candUnit} 换算后等值命中 (统一至 ${refVal}${rule.displayUnit})`;
          } else {
            reason = `数值完全一致 (${refVal}${rule.displayUnit})`;
          }
        } else {
          reason = `${rule.fieldName}完全一致`;
        }
      } else if (matchRate > 0) {
        if (rule.fieldType === '长文本 (LONG_TEXT)') {
          reason = `规格文本相似度达 ${(matchRate * 100).toFixed(1)}%`;
        } else {
          reason = `部分吻合 (匹配度 ${(matchRate * 100).toFixed(1)}%)`;
        }
      } else {
        reason = `${rule.fieldName}不匹配`;
      }

      const weightedScore = Number((rule.weight * matchRate).toFixed(2));
      numeratorScore += weightedScore;

      // Construct nicely formatted representation values
      let srcRep = refVal;
      let candRep = candVal;
      if (rule.fieldType === '带单位数值 (NUMBER_WITH_UNIT)') {
        srcRep = `${refVal}${rule.displayUnit}`;
        candRep = `${candVal}${(cand as any).units?.[key] || rule.displayUnit}`;
      }

      compareFields.push({
        fieldKey: key,
        fieldLabel: rule.fieldName,
        sourceValue: srcRep as any,
        candidateValue: candRep as any,
        weight: rule.weight,
        matchRate,
        weightedScore,
        status,
        reason
      });
    }

    // Sort compareFields by weight descending
    compareFields.sort((a, b) => b.weight - a.weight);

    // Final calculations
    const rawTotalScore = sumActiveWeights > 0 ? (numeratorScore / sumActiveWeights) * 100 : 0;
    const similarityScore = Number(rawTotalScore.toFixed(1));
    const similarityTier = similarityScore >= 85 ? '高相似' : similarityScore >= 70 ? '中相似' : '低相似';

    // Coverage calculation: (sum of weights of non-missing fields) / (sum of all active weights)
    const nonMissingWeights = compareFields
      .filter(f => !f.reason.includes('缺失'))
      .reduce((sum, f) => sum + f.weight, 0);
    const totalActiveWeights = compareFields.reduce((sum, f) => sum + f.weight, 0);
    const coverageRate = totalActiveWeights > 0 ? Math.round((nonMissingWeights / totalActiveWeights) * 100) : 0;

    const fullHitCount = compareFields.filter(f => f.status === 'FULL').length;
    const differenceCount = compareFields.filter(f => f.status === 'MISS' || f.status === 'PARTIAL').length;

    scoredCandidates.push({
      objectType: objectType,
      objectId: cand.objectId,
      objectName: cand.objectName,
      specification: cand.specification,
      material: cand.material,
      classificationPath: cand.classificationPath,
      lifecycleState: cand.lifecycleState,
      compareFields,
      similarityScore,
      similarityTier,
      coverageRate,
      fullHitCount,
      differenceCount
    });
  }

  // Sort scoredCandidates by score descending
  scoredCandidates.sort((a, b) => b.similarityScore - a.similarityScore);

  return {
    reference,
    scoredCandidates
  };
}
