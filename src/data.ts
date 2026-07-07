/**
 * PLM / Manticore 二阶段相似度搜索配置 - 模拟企业级真实数据
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
  QueryResultItem
} from './types';

// 1. 字段相似度规则初始数据
export const initialFieldRules: FieldSimilarityRule[] = [
  {
    id: 'F-001',
    objectType: 'PART_MECHANICAL',
    fieldName: '规格描述 (Specification)',
    propertyCode: 'spec_description',
    fieldType: '长文本 (LONG_TEXT)',
    weight: 35,
    matchType: 'TF-IDF 文本相似度 / Manticore 权重词匹配',
    nullHandling: '设为默认空字符串 (不扣分)',
    standardizationRuleSet: '机械物料规格标准化规则集',
    synonymRuleSet: '紧固件规格同义词规则集',
    categoryAlignmentStrategy: '分类继承归一策略',
    isScoreActive: true,
    isFilterCondition: false,
    isQueryPreviewAvailable: true,
    isAppEndActive: true,
    showHitReason: true,
    showDiffFields: true,
    hitReasonTemplate: '规格文本相似度达 {score}%, 命中了以下相同模式: {match}',
    diffFieldsTemplate: '规格中存在差异: 源[{source_val}] vs 目标[{target_val}]',
    status: 'PUBLISHED',
    publishVersion: 'v2.4.0',
    lastEditor: '张建国 (系统架构师)',
    lastEditTime: '2026-07-02 14:32:15'
  },
  {
    id: 'F-002',
    objectType: 'PART_MECHANICAL',
    fieldName: '主要材质 (Material)',
    propertyCode: 'core_material',
    fieldType: '枚举 (ENUM)',
    weight: 25,
    matchType: '精确匹配 / 别名及归一化匹配',
    nullHandling: '缺失判定为不匹配 (扣减该项权重分 25分)',
    standardizationRuleSet: '不锈钢/碳钢牌号归一规则',
    synonymRuleSet: '金属材料等级同义词集',
    categoryAlignmentStrategy: '材料层级关系退避策略',
    isScoreActive: true,
    isFilterCondition: true,
    isQueryPreviewAvailable: true,
    isAppEndActive: true,
    showHitReason: true,
    showDiffFields: true,
    hitReasonTemplate: '材质完全匹配 (归一化值: {val})',
    diffFieldsTemplate: '材质不一致: 源[{source_val}] vs 目标[{target_val}]',
    status: 'CHANGED',
    publishVersion: 'v2.4.0 (草稿修改中)',
    lastEditor: '李晓华 (工艺数据管理员)',
    lastEditTime: '2026-07-06 18:24:00'
  },
  {
    id: 'F-003',
    objectType: 'PART_MECHANICAL',
    fieldName: '标称直径 (Nominal Diameter)',
    propertyCode: 'nominal_diameter',
    fieldType: '数字 (NUMBER)',
    weight: 15,
    matchType: '数值范围容差匹配 (+/- 0.2mm)',
    nullHandling: '缺失不参与计算 (分摊到其他字段)',
    standardizationRuleSet: '螺纹尺寸标准化映射',
    synonymRuleSet: '无',
    categoryAlignmentStrategy: '无',
    isScoreActive: true,
    isFilterCondition: true,
    isQueryPreviewAvailable: true,
    isAppEndActive: true,
    showHitReason: true,
    showDiffFields: true,
    hitReasonTemplate: '直径误差在容差范围内: 源[{source_val}mm] 与 目标[{target_val}mm] 相差 {diff_val}mm',
    diffFieldsTemplate: '直径不匹配: 源[{source_val}mm] vs 目标[{target_val}mm]',
    status: 'PUBLISHED',
    publishVersion: 'v2.4.0',
    lastEditor: '王明 (机械工程师)',
    lastEditTime: '2026-06-28 10:11:45'
  },
  {
    id: 'F-004',
    objectType: 'PART_MECHANICAL',
    fieldName: '螺距 (Thread Pitch)',
    propertyCode: 'thread_pitch',
    fieldType: '数字 (NUMBER)',
    weight: 10,
    matchType: '数值精确匹配',
    nullHandling: '视为不匹配 (扣减10分)',
    standardizationRuleSet: '无',
    synonymRuleSet: '无',
    categoryAlignmentStrategy: '无',
    isScoreActive: true,
    isFilterCondition: false,
    isQueryPreviewAvailable: true,
    isAppEndActive: true,
    showHitReason: false,
    showDiffFields: true,
    hitReasonTemplate: '',
    diffFieldsTemplate: '螺距不一致: 源[{source_val}mm] vs 目标[{target_val}mm]',
    status: 'PUBLISHED',
    publishVersion: 'v2.3.8',
    lastEditor: '王明 (机械工程师)',
    lastEditTime: '2026-05-15 16:45:00'
  },
  {
    id: 'F-005',
    objectType: 'PART_MECHANICAL',
    fieldName: '分类路径 (Category Path)',
    propertyCode: 'category_path',
    fieldType: '分类树 (CLASS_TREE)',
    weight: 15,
    matchType: '层级深度折扣匹配',
    nullHandling: '抛出异常/不参与评分',
    standardizationRuleSet: '分类结构映射归一策略',
    synonymRuleSet: '无',
    categoryAlignmentStrategy: '标准分类树深度计算策略',
    isScoreActive: true,
    isFilterCondition: true,
    isQueryPreviewAvailable: true,
    isAppEndActive: true,
    showHitReason: true,
    showDiffFields: false,
    hitReasonTemplate: '同属【{category}】子分类层级, 折扣后得分: {score}',
    diffFieldsTemplate: '',
    status: 'PUBLISHED',
    publishVersion: 'v2.4.0',
    lastEditor: '张建国 (系统架构师)',
    lastEditTime: '2026-07-01 09:15:30'
  },
  {
    id: 'F-006',
    objectType: 'PART_ELECTRICAL',
    fieldName: '工作电压 (Voltage)',
    propertyCode: 'working_voltage',
    fieldType: '数字 (NUMBER)',
    weight: 30,
    matchType: '数值范围退让比对',
    nullHandling: '缺失视为不兼容 (扣除30分)',
    standardizationRuleSet: '电压单位换算归一化 (V/mV/kV)',
    synonymRuleSet: '无',
    categoryAlignmentStrategy: '无',
    isScoreActive: true,
    isFilterCondition: true,
    isQueryPreviewAvailable: true,
    isAppEndActive: true,
    showHitReason: true,
    showDiffFields: true,
    hitReasonTemplate: '电压额定范围匹配: 源[{source_val}V] 覆盖 目标[{target_val}V]',
    diffFieldsTemplate: '电压范围冲突: 源[{source_val}V] vs 目标[{target_val}V]',
    status: 'DRAFT',
    publishVersion: '草稿 (未发布)',
    lastEditor: '赵丽 (电气工程师)',
    lastEditTime: '2026-07-06 11:30:22'
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
    lastEditor: '李晓华 (工艺数据管理员)',
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
    lastEditor: '李晓华 (工艺数据管理员)',
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
    remarks: '规范不同供应商提供的电气元器件参数绝缘等级，提升二阶段精确配对成功率。'
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
    remarks: '电气元器件核心同义词，确保采购件与自制件命名别名能够完成二阶段相似对齐。'
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
    lastEditor: '李晓华 (工艺数据管理员)',
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
    lastEditor: '李晓华 (工艺数据管理员)',
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
    affectedObjectType: 'PART_MECHANICAL, PART_ELECTRICAL',
    affectedFieldCount: 5,
    validationResult: 'SUCCESS',
    status: 'ACTIVE'
  },
  {
    id: 'PUB-002',
    versionCode: 'v2.3.8',
    publishTime: '2026-05-15 17:00:00',
    publisher: '王明 (机械工程师)',
    changeSummary: '修复了螺距字段 (thread_pitch) 精确比对时的数值溢出异常；将空值处理策略从“强制扣分”调整为“退避不扣分”。',
    affectedObjectType: 'PART_MECHANICAL',
    affectedFieldCount: 2,
    validationResult: 'SUCCESS',
    status: 'SUPERSEDED'
  },
  {
    id: 'PUB-003',
    versionCode: 'v2.3.5',
    publishTime: '2026-03-10 11:30:00',
    publisher: '李晓华 (工艺数据管理员)',
    changeSummary: '发布首套基于 SAP ERP 分类路径向国标分类对齐的折射系数策略；修正内六角螺栓对应的分类继承关系。',
    affectedObjectType: 'PART_MECHANICAL',
    affectedFieldCount: 4,
    validationResult: 'WARNING',
    status: 'ROLLEDBACK'
  }
];

// 6. 版本差异示例数据
export const versionDiffs: VersionDiffItem[] = [
  {
    fieldName: '规格描述 (spec_description) -> 权重 (Weight)',
    beforeValue: '30%',
    afterValue: '35%',
    impactDescription: '提升文本规格在二阶段精筛相似度计算中的基础占比，加强了规则匹配主导地位。'
  },
  {
    fieldName: '主要材质 (core_material) -> 同义词规则集',
    beforeValue: '无',
    afterValue: '金属材料等级同义词集 (SY-002)',
    impactDescription: '材质字段比对将自动拉取合金同义映射（如“SUS304”和“304不锈钢”将按100%匹配不扣分）。'
  },
  {
    fieldName: '主要材质 (core_material) -> 空值处理',
    beforeValue: '不参与评分',
    afterValue: '判定为不匹配 (缺失扣减 25分)',
    impactDescription: '强化属性数据完整性约束，严厉限制图纸未填材质的相似件冒充高相似度。'
  },
  {
    fieldName: '工作电压 (working_voltage) -> 作为过滤条件',
    beforeValue: 'False',
    afterValue: 'True',
    impactDescription: '开启后，若两物料电压值不兼容，直接一票否决(不进行后续复杂计算)，优化计算性能。'
  }
];

// 7. 属性对应类型清单数据 (非界面说明页)
export const attributeTypes: AttributeTypeItem[] = [
  {
    id: 'T-001',
    objectType: '机械零件 (PART_MECHANICAL)',
    propertyName: '规格描述',
    propertyCode: 'spec_description',
    dataType: 'LONG_TEXT',
    configComponent: '文本域组件 (TextArea)',
    queryComponent: '多行模糊搜索文本框',
    isEnum: false,
    optionalMatchTypes: ['Manticore 模糊匹配', 'Cosine 向量余弦值', 'TF-IDF 相似度'],
    optionalStandardization: ['正则清理', '词尾变体收敛', '特殊符号滤除'],
    description: '用于输入类似“HEX BOLT M10X50 GB5783”的混合长文本描述，是相似度计算的主力字段。'
  },
  {
    id: 'T-002',
    objectType: '机械零件 (PART_MECHANICAL)',
    propertyName: '主要材质',
    propertyCode: 'core_material',
    dataType: 'ENUM',
    configComponent: '单选下拉框 (Select)',
    queryComponent: '带搜索的单选下拉器',
    isEnum: true,
    optionalMatchTypes: ['精确值匹配', '归一化主词对齐', '材料牌号层级衰减'],
    optionalStandardization: ['多标牌号归一映射', '材料大类聚合'],
    description: '由受控的材料词典驱动，参与二阶段强匹配，且作为一阶段硬性过滤条件。'
  },
  {
    id: 'T-003',
    objectType: '机械零件 (PART_MECHANICAL)',
    propertyName: '标称直径',
    propertyCode: 'nominal_diameter',
    dataType: 'NUMBER',
    configComponent: '数字输入框 (NumberInput)',
    queryComponent: '数值区间检索器 (+/- Tol)',
    isEnum: false,
    optionalMatchTypes: ['绝对等值比对', '双向容差配对', '指数递减退避'],
    optionalStandardization: ['单位统一折算(mm)', '小数位保留规范'],
    description: '表示螺纹紧固件的标准直径，支持微小容差折分比对，是硬性几何属性之一。'
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

// 8. 属性对应枚举清单数据 (非界面说明页 - 示例属性含: 材料、生命周期、对象类型、单位、来源系统)
export const attributeEnums: AttributeEnumItem[] = [
  {
    id: 'E-001',
    objectType: '机械零件',
    propertyName: '主要材质',
    propertyCode: 'core_material',
    enumSource: '外部 MDM 材料主数据主表 (受控)',
    enumValueCode: 'MAT_304_STAINLESS',
    enumDisplayName: '304 不锈钢',
    standardValue: '304 (06Cr19Ni10)',
    synonyms: ['SUS304', '304SS', '06Cr19Ni10', '1.4301'],
    isSimilarityActive: true,
    status: 'ACTIVE',
    description: '典型奥氏体不锈钢，各工厂俗称和牌号极其多样，需要严格汇总归一。'
  },
  {
    id: 'E-002',
    objectType: '机械零件',
    propertyName: '主要材质',
    propertyCode: 'core_material',
    enumSource: '外部 MDM 材料主数据主表 (受控)',
    enumValueCode: 'MAT_Q235_STEEL',
    enumDisplayName: 'Q235 碳素钢',
    standardValue: 'Q235 碳素结构钢',
    synonyms: ['Q235A', 'Q235B', 'A3钢', '普通碳钢', 'St37-2'],
    isSimilarityActive: true,
    status: 'ACTIVE',
    description: '低碳钢牌号。A3钢为上世纪习惯俗称，仍在大量历史图纸中残留，特建立本映射。'
  },
  {
    id: 'E-003',
    objectType: '所有对象',
    propertyName: '生命周期状态',
    propertyCode: 'lifecycle_state',
    enumSource: 'PLM 本地工作流引擎字典',
    enumValueCode: 'LC_IN_WORK',
    enumDisplayName: '设计中 (In Work)',
    standardValue: '设计中 (IN_WORK)',
    synonyms: ['草稿', 'DRAFT', '工作状态', '设计态'],
    isSimilarityActive: false,
    status: 'ACTIVE',
    description: '控制零组件能否被借用或用于拼装。不参与相似度计算，但在检索预览时用于状态显示过滤。'
  },
  {
    id: 'E-004',
    objectType: '所有对象',
    propertyName: '生命周期状态',
    propertyCode: 'lifecycle_state',
    enumSource: 'PLM 本地工作流引擎字典',
    enumValueCode: 'LC_RELEASED',
    enumDisplayName: '已发布 (Released)',
    standardValue: '已发布 (RELEASED)',
    synonyms: ['归档', '生效', 'APPROVED', '已发布态'],
    isSimilarityActive: false,
    status: 'ACTIVE',
    description: '表示该物料已经通过工艺与采购审核。'
  },
  {
    id: 'E-005',
    objectType: '机械零件',
    propertyName: '基本计量单位',
    propertyCode: 'base_unit',
    enumSource: 'ERP 字典表 T006',
    enumValueCode: 'U_MM',
    enumDisplayName: '毫米 (Millimeter)',
    standardValue: 'mm',
    synonyms: ['MM', '毫米', 'mm.', '公厘'],
    isSimilarityActive: false,
    status: 'ACTIVE',
    description: '系统内标称长度的基本计量单位。'
  },
  {
    id: 'E-006',
    objectType: '所有对象',
    propertyName: '来源系统',
    propertyCode: 'source_system',
    enumSource: '企业服务总线(ESB)集成配置',
    enumValueCode: 'SYS_WINDCHILL_HQ',
    enumDisplayName: '总部研制 PLM (Windchill)',
    standardValue: 'Windchill PLM',
    synonyms: ['PTC Windchill', '总部PLM', '研发一系统'],
    isSimilarityActive: false,
    status: 'ACTIVE',
    description: '标记物料的源头系统，用于判定归一关系。'
  },
  {
    id: 'E-007',
    objectType: '机械零件',
    propertyName: '表面处理方式',
    propertyCode: 'surface_treatment',
    enumSource: '待业务确认 (暂定本地枚举)',
    enumValueCode: 'SF_ZINC_PLATED',
    enumDisplayName: '镀锌 (Zinc Plated)',
    standardValue: '待业务确认',
    synonyms: ['冷镀锌', '电镀锌', '镀白锌', 'Zinc Plating'],
    isSimilarityActive: true,
    status: 'UNCONFIRMED',
    description: '紧固件常用表面工艺。待集团工艺部和标准化办公室给出规范值后对齐。'
  }
];

// 9. 查询预览模拟结果 (包含：相似度、对象标识、名称、材料、分类路径、生命周期、命中原因、差异字段、字段得分明细)
export const queryResults: QueryResultItem[] = [
  {
    similarityScore: 98.4,
    objectId: 'PART-2026-000104',
    objectName: '内六角螺栓 M10x50 GB/T 70.1',
    material: '304 不锈钢',
    classificationPath: '/国家标准分类/紧固件/螺栓/内六角螺栓',
    lifecycleState: '已发布 (Released)',
    hitReason: '分类完全一致 (得15分)；规格高度吻合 (得33.4分/满分35分)；材质同义词归一完全匹配 (SUS304 -> 304, 得25分)；直径等值一致 (10mm, 得15分)；螺距对齐 (得10分)。',
    diffFields: '表面处理存在轻微差异: 源[钝化] vs 目标[无表面处理]；规格尾部文字差异。',
    scoreDetail: [
      { fieldName: '规格描述 (spec_description)', score: 33.4, weight: 35, matchInfo: 'TF-IDF 相似度: 95.4%' },
      { fieldName: '主要材质 (core_material)', score: 25.0, weight: 25, matchInfo: '归一化一致 (SUS304 === 304)' },
      { fieldName: '标称直径 (nominal_diameter)', score: 15.0, weight: 15, matchInfo: '精确等值 (10mm)' },
      { fieldName: '分类路径 (category_path)', score: 15.0, weight: 15, matchInfo: '同路径/标准路径一致' },
      { fieldName: '螺距 (thread_pitch)', score: 10.0, weight: 10, matchInfo: '精确等值 (1.5mm)' }
    ]
  },
  {
    similarityScore: 89.1,
    objectId: 'PART-2025-009831',
    objectName: '内六角圆柱头螺钉 M10x45-A2',
    material: '06Cr19Ni10 不锈钢',
    classificationPath: '/国家标准分类/紧固件/螺栓/内六角螺栓',
    lifecycleState: '已发布 (Released)',
    hitReason: '规格长文本高度重叠 (得29.1分/满分35)；材质 06Cr19Ni10 经标准化收敛至 304 (得25分)；标称直径一致 (得15分)；螺距一致 (得10分)。由于规格长度差异扣除 5.9 分，且无螺栓俗称扣 5 分。',
    diffFields: '长度存在差异: 源[50mm] vs 目标[45mm]；规格名称用词差异(“螺丝” vs “圆柱头螺钉”)。',
    scoreDetail: [
      { fieldName: '规格描述 (spec_description)', score: 29.1, weight: 35, matchInfo: 'TF-IDF 相似度: 83.1%' },
      { fieldName: '主要材质 (core_material)', score: 25.0, weight: 25, matchInfo: '同义归一 (06Cr19Ni10 === 304)' },
      { fieldName: '标称直径 (nominal_diameter)', score: 15.0, weight: 15, matchInfo: '精确等值 (10mm)' },
      { fieldName: '分类路径 (category_path)', score: 15.0, weight: 15, matchInfo: '同路径一致' },
      { fieldName: '螺距 (thread_pitch)', score: 10.0, weight: 10, matchInfo: '精确等值 (1.5mm)' }
    ]
  },
  {
    similarityScore: 76.5,
    objectId: 'PART-2024-118204',
    objectName: '六角头螺栓 M10x50 GB5783',
    material: 'A2-70 不锈钢',
    classificationPath: '/国家标准分类/紧固件/螺栓/六角头螺栓/普通级',
    lifecycleState: '已发布 (Released)',
    hitReason: '基本属性吻合：标称直径 (得15分)；规格描述(得22.5分)；材质同义映射(得25分)。由于分类路径不匹配，仅得同属螺栓大类的折扣分 4 分 (满分15)；由于螺纹型式差异(外六角 vs 内六角)造成语义相似度扣分。',
    diffFields: '分类不一致: 源[内六角螺栓] vs 目标[六角头螺栓/普通级]；驱动头几何型式不同。',
    scoreDetail: [
      { fieldName: '规格描述 (spec_description)', score: 22.5, weight: 35, matchInfo: 'TF-IDF 相似度: 64.3%' },
      { fieldName: '主要材质 (core_material)', score: 25.0, weight: 25, matchInfo: '归一匹配 (A2-70 === 304 对应不锈钢)' },
      { fieldName: '标称直径 (nominal_diameter)', score: 15.0, weight: 15, matchInfo: '精确等值 (10mm)' },
      { fieldName: '分类路径 (category_path)', score: 4.0, weight: 15, matchInfo: '分类树同级退避相似 (折扣系数0.85)' },
      { fieldName: '螺距 (thread_pitch)', score: 10.0, weight: 10, matchInfo: '精确等值 (1.5mm)' }
    ]
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
    ]
  }
];

// Manticore 一些系统级变量
export const defaultScoreTotal = 100;
export const currentActiveVersion = 'v2.4.0';
export const lastPublishTime = '2026-07-02 15:00:00';
export const draftStateInfo = {
  hasUnpublishedDrafts: true,
  draftCount: 2,
  lastDraftEditor: '李晓华 (工艺数据管理员)',
  lastDraftEditTime: '2026-07-06 18:24:00'
};
