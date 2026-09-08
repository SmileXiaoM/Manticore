import {
  ConsistencyBatchRecord,
  ConsistencyObjectResult,
  ComparisonFieldSnapshot,
  ComparisonFieldItem,
  formatLocalDateTime,
  formatLocalDateCode
} from '../types/consistencyCheck';
import { FieldMappingItem } from '../stage1MappingTypes';

// 初始历史演示对象明细 (严格剔除所有已作废的 version_lifecycle，采用真实正式底座字段)
export const initialDemoPartObjects: ConsistencyObjectResult[] = [
  {
    objectId: 'P-30001',
    objectName: '六角头法兰面承载螺栓 M12x45',
    rootTypeCode: 'PART',
    selectedReason: 'HIGH_FREQUENCY',
    modifyCount: 30,
    lastModifiedAt: '2026-09-06 20:15:30',
    status: 'INCONSISTENT',
    statusDetail: '发现字段差异：PLM 主要材质为 SCM435，经规则映射预期为“铬钼合金钢”，而 Manticore 实际为“普通碳钢”',
    differenceFields: ['主要材质'],
    fields: [
      {
        fieldCode: 'iba_part_number',
        fieldName: '物料编码',
        plmRawValue: 'P-30001',
        mappedExpectedValue: 'P-30001',
        manticoreActualValue: 'P-30001',
        matchStatus: 'MATCH'
      },
      {
        fieldCode: 'iba_part_name',
        fieldName: '零件名称',
        plmRawValue: '六角头法兰面承载螺栓 M12x45',
        mappedExpectedValue: '六角头法兰面承载螺栓 M12x45',
        manticoreActualValue: '六角头法兰面承载螺栓 M12x45',
        matchStatus: 'MATCH'
      },
      {
        fieldCode: 'iba_material',
        fieldName: '主要材质',
        plmRawValue: 'SCM435',
        mappedExpectedValue: '铬钼合金钢',
        manticoreActualValue: '普通碳钢',
        matchStatus: 'MISMATCH',
        note: '源端材质编码更新为 SCM435，目标检索底座仍为旧值普通碳钢'
      },
      {
        fieldCode: 'iba_nominal_diameter',
        fieldName: '公称直径 (mm)',
        plmRawValue: '12',
        mappedExpectedValue: 12,
        manticoreActualValue: 12,
        matchStatus: 'MATCH'
      },
      {
        fieldCode: 'iba_classification_path',
        fieldName: '分类路径',
        plmRawValue: '/标准件/螺栓/法兰面螺栓',
        mappedExpectedValue: '标准件 > 螺栓 > 法兰面螺栓',
        manticoreActualValue: '标准件 > 螺栓 > 法兰面螺栓',
        matchStatus: 'MATCH'
      }
    ]
  },
  {
    objectId: 'P-30002',
    objectName: '精密行星齿轮箱外壳法兰',
    rootTypeCode: 'PART',
    selectedReason: 'HIGH_FREQUENCY',
    modifyCount: 15,
    lastModifiedAt: '2026-09-05 14:22:10',
    status: 'INCONSISTENT',
    statusDetail: '发现不一致：目标记录缺失 (源端唯一键 P-30002 有效，按唯一键在 Manticore 查询不到目标记录)',
    differenceFields: ['目标对象唯一标识'],
    isTargetMissing: true,
    fields: [
      {
        fieldCode: 'iba_part_number',
        fieldName: '物料编码 (业务唯一键)',
        plmRawValue: 'P-30002',
        mappedExpectedValue: 'P-30002',
        manticoreActualValue: null,
        matchStatus: 'TARGET_MISSING',
        note: '源端存在有效主记录，按业务唯一键在 Manticore 检索底座查询不到对应文档'
      },
      {
        fieldCode: 'iba_part_name',
        fieldName: '零件名称',
        plmRawValue: '精密行星齿轮箱外壳法兰',
        mappedExpectedValue: '精密行星齿轮箱外壳法兰',
        manticoreActualValue: null,
        matchStatus: 'TARGET_MISSING'
      },
      {
        fieldCode: 'iba_material',
        fieldName: '主要材质',
        plmRawValue: 'AL6061-T6',
        mappedExpectedValue: '航空硬铝合金',
        manticoreActualValue: null,
        matchStatus: 'TARGET_MISSING'
      },
      {
        fieldCode: 'iba_nominal_diameter',
        fieldName: '公称直径 (mm)',
        plmRawValue: '180',
        mappedExpectedValue: 180,
        manticoreActualValue: null,
        matchStatus: 'TARGET_MISSING'
      }
    ]
  },
  {
    objectId: 'P-30003',
    objectName: '不锈钢耐酸排气阀弹簧',
    rootTypeCode: 'PART',
    selectedReason: 'RANDOM_SAMPLE',
    lastModifiedAt: '2026-08-30 09:12:00',
    status: 'CONSISTENT',
    statusDetail: '全部核验字段一致：业务唯一键匹配，零件名称、主要材质、公称直径与分类路径完全一致',
    differenceFields: [],
    fields: [
      {
        fieldCode: 'iba_part_number',
        fieldName: '物料编码',
        plmRawValue: 'P-30003',
        mappedExpectedValue: 'P-30003',
        manticoreActualValue: 'P-30003',
        matchStatus: 'MATCH'
      },
      {
        fieldCode: 'iba_part_name',
        fieldName: '零件名称',
        plmRawValue: '不锈钢耐酸排气阀弹簧',
        mappedExpectedValue: '不锈钢耐酸排气阀弹簧',
        manticoreActualValue: '不锈钢耐酸排气阀弹簧',
        matchStatus: 'MATCH'
      },
      {
        fieldCode: 'iba_material',
        fieldName: '主要材质',
        plmRawValue: 'SS304',
        mappedExpectedValue: '不锈钢 (304)',
        manticoreActualValue: '不锈钢 (304)',
        matchStatus: 'MATCH',
        note: '源端编码 SS304 经映射转换后与底座存储值一致'
      },
      {
        fieldCode: 'iba_nominal_diameter',
        fieldName: '公称直径 (mm)',
        plmRawValue: '25',
        mappedExpectedValue: 25,
        manticoreActualValue: 25,
        matchStatus: 'MATCH'
      },
      {
        fieldCode: 'iba_classification_path',
        fieldName: '分类路径',
        plmRawValue: '/通用件/弹性元件/螺旋弹簧',
        mappedExpectedValue: '通用件 > 弹性元件 > 螺旋弹簧',
        manticoreActualValue: '通用件 > 弹性元件 > 螺旋弹簧',
        matchStatus: 'MATCH'
      }
    ]
  },
  {
    objectId: 'P-30004',
    objectName: '液压动力转向泵传动齿轴',
    rootTypeCode: 'PART',
    selectedReason: 'HIGH_FREQUENCY',
    modifyCount: 8,
    lastModifiedAt: '2026-09-06 22:28:40',
    status: 'PENDING_RECHECK',
    statusDetail: '待复查：PLM 源端近期发生修改，数据处于同步流转管道，暂不判定为故障',
    differenceFields: ['主要材质'],
    recheckReason: 'PLM 源端最近变更在途，数据处于同步流转期间，暂不进入不一致分母',
    fields: [
      {
        fieldCode: 'iba_part_number',
        fieldName: '物料编码',
        plmRawValue: 'P-30004',
        mappedExpectedValue: 'P-30004',
        manticoreActualValue: 'P-30004',
        matchStatus: 'MATCH'
      },
      {
        fieldCode: 'iba_part_name',
        fieldName: '零件名称',
        plmRawValue: '液压动力转向泵传动齿轴',
        mappedExpectedValue: '液压动力转向泵传动齿轴',
        manticoreActualValue: '液压动力转向泵传动齿轴',
        matchStatus: 'MATCH'
      },
      {
        fieldCode: 'iba_material',
        fieldName: '主要材质',
        plmRawValue: '20CrMnTi',
        mappedExpectedValue: '合金结构钢 (20CrMnTi)',
        manticoreActualValue: '45# 优质碳素钢',
        matchStatus: 'UNVERIFIABLE',
        note: '源端处于同步延迟流转中，待下一周期自动复查'
      }
    ]
  },
  {
    objectId: 'P-30005',
    objectName: '高压共轨柴油喷油嘴偶件',
    rootTypeCode: 'PART',
    selectedReason: 'RANDOM_SAMPLE',
    lastModifiedAt: '2026-09-04 11:45:00',
    status: 'UNABLE_TO_COMPARE',
    statusDetail: '无法比对：PLM 源端批量只读接口超时 (504 Gateway Timeout)，无法取得原始字段值',
    differenceFields: ['全部待检字段'],
    unableToCompareReason: 'PLM 源端接口读取超时，无法提取来源数据，不计入一致/不一致分母',
    fields: [
      {
        fieldCode: 'iba_part_number',
        fieldName: '物料编码',
        plmRawValue: null,
        mappedExpectedValue: null,
        manticoreActualValue: 'P-30005',
        matchStatus: 'UNVERIFIABLE',
        note: '源端读取失败，当前无法比对'
      },
      {
        fieldCode: 'iba_part_name',
        fieldName: '零件名称',
        plmRawValue: null,
        mappedExpectedValue: null,
        manticoreActualValue: '高压共轨柴油喷油嘴偶件',
        matchStatus: 'UNVERIFIABLE'
      },
      {
        fieldCode: 'iba_material',
        fieldName: '主要材质',
        plmRawValue: null,
        mappedExpectedValue: null,
        manticoreActualValue: '特种耐磨合金',
        matchStatus: 'UNVERIFIABLE'
      }
    ]
  }
];

// 初始历史批次记录：
// CC-20260906-001: 一致 1, 不一致 2, 待复查 1, 无法比对 1 -> 有效比对 3, 一致率 33.3% (1 / 3)
export const initialConsistencyBatches: ConsistencyBatchRecord[] = [
  {
    id: 'CC-20260906-001',
    planName: '零件抽检核验批次',
    triggerType: 'MANUAL_CUSTOM',
    rootTypeCode: 'PART',
    rootTypeName: '零部件 (Part)',
    scopeMode: 'RANDOM_SAMPLE',
    scopeDescription: '合格零部件对象抽检 (样本容量 5)',
    strategySummary: '随机抽检 (高频样本 3 + 随机样本 2)',
    executedAt: '2026-09-06 02:30:15',
    plannedCount: 5,
    actualCount: 5,
    consistentCount: 1,
    differenceCount: 2,
    pendingRecheckCount: 1,
    incompleteCount: 1,
    comparisonFieldSnapshot: {
      rootTypeCode: 'PART',
      uniqueKeyField: {
        sourceFieldKey: 'iba_part_number',
        manticoreField: 'part_number',
        displayName: '物料编码'
      },
      includedFields: [
        {
          sourceFieldKey: 'iba_part_name',
          manticoreField: 'part_name',
          displayName: '零件名称',
          dataType: 'TEXT',
          comparisonMethod: '精确文本相等'
        },
        {
          sourceFieldKey: 'iba_material',
          manticoreField: 'material',
          displayName: '主要材质',
          dataType: 'TEXT',
          comparisonMethod: '映射值标准化相等'
        },
        {
          sourceFieldKey: 'iba_nominal_diameter',
          manticoreField: 'nominal_diameter_mm',
          displayName: '公称直径 (mm)',
          dataType: 'NUMERIC_WITH_UNIT',
          comparisonMethod: '数值精度相等'
        },
        {
          sourceFieldKey: 'iba_classification_path',
          manticoreField: 'category_path',
          displayName: '分类路径',
          dataType: 'CATEGORY_TREE',
          comparisonMethod: '树路径标准化相等'
        }
      ],
      excludedFields: [
        {
          sourceFieldKey: 'iba_surface_treatment',
          fieldName: '表面处理工艺',
          reason: '草稿字段未正式生效进入底座'
        }
      ],
      snapshotTime: '2026-09-06 02:30:15'
    },
    frozenObjectIds: ['P-30001', 'P-30002', 'P-30003', 'P-30004', 'P-30005'],
    objectResults: initialDemoPartObjects,
    status: 'COMPLETED'
  },
  {
    id: 'CC-20260905-001',
    planName: '零件抽检核验批次',
    triggerType: 'MANUAL_CUSTOM',
    rootTypeCode: 'PART',
    rootTypeName: '零部件 (Part)',
    scopeMode: 'RANDOM_SAMPLE',
    scopeDescription: '合格零部件对象抽检 (样本容量 4)',
    strategySummary: '随机抽检 (高频样本 2 + 随机样本 2)',
    executedAt: '2026-09-05 02:30:10',
    plannedCount: 4,
    actualCount: 4,
    consistentCount: 1,
    differenceCount: 1,
    pendingRecheckCount: 1,
    incompleteCount: 1,
    comparisonFieldSnapshot: {
      rootTypeCode: 'PART',
      uniqueKeyField: {
        sourceFieldKey: 'iba_part_number',
        manticoreField: 'part_number',
        displayName: '物料编码'
      },
      includedFields: [
        {
          sourceFieldKey: 'iba_part_name',
          manticoreField: 'part_name',
          displayName: '零件名称',
          dataType: 'TEXT',
          comparisonMethod: '精确文本相等'
        },
        {
          sourceFieldKey: 'iba_material',
          manticoreField: 'material',
          displayName: '主要材质',
          dataType: 'TEXT',
          comparisonMethod: '映射值标准化相等'
        }
      ],
      excludedFields: [],
      snapshotTime: '2026-09-05 02:30:10'
    },
    frozenObjectIds: ['P-30001', 'P-30003', 'P-30004', 'P-30005'],
    objectResults: [
      initialDemoPartObjects[0],
      initialDemoPartObjects[2],
      initialDemoPartObjects[3],
      initialDemoPartObjects[4]
    ],
    status: 'COMPLETED'
  }
];

// 各根类型可用的指定分类范围选项（严格隔离，绝不串类型）
export const ROOT_TYPE_SCOPE_OPTIONS: Record<string, Array<{ id: string; label: string; count: number }>> = {
  PART: [
    { id: 'SCOPE_PART_FASTENER', label: '标准件 > 紧固件 > 螺栓 (36 个对象)', count: 36 },
    { id: 'SCOPE_PART_TRANSMISSION', label: '传动系统 > 齿轮箱部件 (24 个对象)', count: 24 },
    { id: 'SCOPE_PART_SEAL', label: '密封件与弹性元件 (18 个对象)', count: 18 },
    { id: 'SCOPE_PART_HYDRAULIC', label: '液压动力与控制阀组 (42 个对象)', count: 42 }
  ],
  DOCUMENT: [
    { id: 'SCOPE_DOC_DRAWING', label: '技术图纸 > 二维装配工程图 (28 篇文档)', count: 28 },
    { id: 'SCOPE_DOC_SPEC', label: '技术规范与设计标准说明书 (32 篇文档)', count: 32 },
    { id: 'SCOPE_DOC_TEST_REPORT', label: '试验验证与质量检测报告 (20 篇文档)', count: 20 },
    { id: 'SCOPE_DOC_CAD_MODEL', label: '三维模型与设计规格书 (25 篇文档)', count: 25 }
  ],
  PROCESS: [
    { id: 'SCOPE_PROC_MACHINING', label: '机械加工工艺路线 (15 条路线)', count: 15 },
    { id: 'SCOPE_PROC_ASSEMBLY', label: '装配与调试工艺路线 (22 条路线)', count: 22 },
    { id: 'SCOPE_PROC_SURFACE', label: '表面处理与热处理工艺 (12 条路线)', count: 12 }
  ]
};

// 指定对象输入框提示语（随根类型动态变化）
export const ROOT_TYPE_OBJECT_ID_PLACEHOLDER: Record<string, string> = {
  PART: '输入零部件编码，例如：P-30001, P-30002，多个以逗号分隔',
  DOCUMENT: '输入文档编号，例如：DOC-50001, DOC-50002，多个以逗号分隔',
  PROCESS: '输入工艺路线编码，例如：PR-70001, PR-70002，多个以逗号分隔'
};

// 构造指定根类型的只读核验字段快照
export function buildComparisonFieldSnapshot(
  rootTypeCode: string,
  fieldMappings: FieldMappingItem[]
): {
  snapshot?: ComparisonFieldSnapshot;
  uniqueKeyError?: string;
  fieldsError?: string;
} {
  const rootFields = fieldMappings.filter(f => f.rootTypeId === rootTypeCode);
  
  // 查找唯一键字段 (必须配置且 isInFormalQueryBase)
  const uniqueKeyFields = rootFields.filter(f => f.isUniqueKey && f.configStatus === 'CONFIGURED' && f.isInFormalQueryBase);
  if (uniqueKeyFields.length === 0) {
    return { uniqueKeyError: `当前根类型 [${rootTypeCode}] 正式底座中缺少业务唯一键配置，无法发起核验。` };
  }
  if (uniqueKeyFields.length > 1) {
    return { uniqueKeyError: `当前根类型 [${rootTypeCode}] 正式底座中配置了多个业务唯一键 (${uniqueKeyFields.map(f => f.sourceFieldKey).join(', ')})，口径冲突阻断任务。` };
  }
  const uField = uniqueKeyFields[0];

  // 正式纳入比对的业务字段（非唯一键，已生效进入正式查询底座，排除纯界面配置）
  const includedCandidates = rootFields.filter(
    f => !f.isUniqueKey &&
         f.configStatus === 'CONFIGURED' &&
         f.isInFormalQueryBase &&
         f.sourceFieldKey &&
         f.manticoreField
  );

  if (includedCandidates.length === 0) {
    return { fieldsError: '当前根类型暂无正式可核验字段。' };
  }

  // 排除字段记录
  const excludedCandidates: ComparisonFieldSnapshot['excludedFields'] = rootFields
    .filter(f => !f.isUniqueKey && (!f.isInFormalQueryBase || f.configStatus === 'DRAFT'))
    .map(f => ({
      sourceFieldKey: f.sourceFieldKey || f.id,
      fieldName: f.displayTitle || f.sourceDisplayName || f.sourceFieldName || '未命名字段',
      reason: f.configStatus === 'DRAFT' ? '草稿字段未生效' : '未纳入正式查询底座'
    }));

  const snapshot: ComparisonFieldSnapshot = {
    rootTypeCode,
    uniqueKeyField: {
      sourceFieldKey: uField.sourceFieldKey || 'partNumber',
      manticoreField: uField.manticoreField || 'part_number',
      displayName: uField.displayTitle || uField.sourceDisplayName || '唯一编码'
    },
    includedFields: includedCandidates.map(f => ({
      sourceFieldKey: f.sourceFieldKey || f.id,
      manticoreField: f.manticoreField || f.id,
      displayName: f.displayTitle || f.sourceDisplayName || f.sourceFieldName || '未命名字段',
      dataType: f.sourceDataType || 'TEXT',
      comparisonMethod: f.sourceDataType === 'NUMERIC_WITH_UNIT' ? '数值相等' : '标准规范化文本相等'
    })),
    excludedFields: excludedCandidates,
    snapshotTime: formatLocalDateTime()
  };

  return { snapshot };
}

// 模拟生成核验结果记录
export function simulateConsistencyRun(
  rootTypeCode: string,
  rootTypeName: string,
  scopeMode: 'RANDOM_SAMPLE' | 'EXHAUSTIVE_SCOPE' | 'SPECIFIC_IDS',
  sampleCount: number,
  snapshot: ComparisonFieldSnapshot,
  specificScopeOrIds?: string
): ConsistencyBatchRecord {
  const batchId = `CC-${formatLocalDateCode()}-${String(Math.floor(Math.random() * 900) + 100)}`;
  const nowStr = formatLocalDateTime();

  // 区分根类型生成不同业务对象与字段
  let objects: ConsistencyObjectResult[] = [];
  const count = sampleCount;

  // 经典测试模式：如果抽检 50 条，产生 46 条一致、2 条不一致、2 条待处理 (1待复查 + 1无法比对)
  // 严格验证：有效比对数 = 46 + 2 = 48, 一致率 = 46 / 48 = 95.8%
  let consistentCount = 0;
  let inconsistentCount = 0;
  let pendingCount = 0;
  let unableCount = 0;

  if (count === 50) {
    consistentCount = 46;
    inconsistentCount = 2;
    pendingCount = 1;
    unableCount = 1;
  } else if (count === 100) {
    consistentCount = 92;
    inconsistentCount = 4;
    pendingCount = 2;
    unableCount = 2;
  } else if (count === 200) {
    consistentCount = 186;
    inconsistentCount = 8;
    pendingCount = 4;
    unableCount = 2;
  } else {
    // 默认按比例
    inconsistentCount = Math.max(1, Math.round(count * 0.04));
    pendingCount = Math.max(1, Math.round(count * 0.02));
    unableCount = Math.max(1, Math.round(count * 0.02));
    consistentCount = Math.max(0, count - inconsistentCount - pendingCount - unableCount);
  }

  // 针对特定输入测试 0 样本比对
  if (specificScopeOrIds === 'TEST_ZERO_EFFECTIVE') {
    consistentCount = 0;
    inconsistentCount = 0;
    pendingCount = 1;
    unableCount = 1;
  }

  // 根据 rootTypeCode 生成专用数据
  const prefix = rootTypeCode === 'PART' ? 'P' : rootTypeCode === 'DOCUMENT' ? 'DOC' : 'PR';
  const startNum = rootTypeCode === 'PART' ? 30000 : rootTypeCode === 'DOCUMENT' ? 50000 : 70000;
  
  const sampleTitles = rootTypeCode === 'PART'
    ? ['六角头法兰面承载螺栓', '精密行星齿轮箱外壳法兰', '不锈钢耐酸排气阀弹簧', '液压动力转向泵传动齿轴', '高压共轨柴油喷油嘴偶件', '高强度双头螺柱 M16', '耐磨滑动轴承衬套']
    : rootTypeCode === 'DOCUMENT'
    ? ['工程总装配设计图纸', '变速箱控制系统技术规范书', '出厂满载温升试验报告', '结构强度有限元仿真报告', '电气接线端子布线图', '部件维护保养操作手册']
    : ['主轴箱精密加工工序路线', '齿轮淬火与渗碳热处理工艺', '转向节整体模锻工艺规范', '表面阳极氧化防腐工艺'];

  let currentIdx = 1;

  // 1. 生成不一致样本
  for (let i = 0; i < inconsistentCount; i++) {
    const oid = `${prefix}-${startNum + currentIdx}`;
    const name = `${sampleTitles[i % sampleTitles.length]} ${oid}`;
    const isTargetMiss = i === 1; // 第二个设为目标记录缺失
    
    objects.push({
      objectId: oid,
      objectName: name,
      rootTypeCode,
      selectedReason: 'RANDOM_SAMPLE',
      status: 'INCONSISTENT',
      statusDetail: isTargetMiss
        ? `发现不一致：目标记录缺失 (源端业务唯一键 ${oid} 存在，Manticore 未检索到实际记录)`
        : `发现不一致：核验字段存在差异 (${snapshot.includedFields[0]?.displayName || '业务属性'} 与目标存储不符)`,
      differenceFields: isTargetMiss ? ['目标记录缺失'] : [snapshot.includedFields[0]?.displayName || '属性差异'],
      isTargetMissing: isTargetMiss,
      fields: isTargetMiss
        ? [
            {
              fieldCode: snapshot.uniqueKeyField.sourceFieldKey,
              fieldName: snapshot.uniqueKeyField.displayName,
              plmRawValue: oid,
              mappedExpectedValue: oid,
              manticoreActualValue: null,
              matchStatus: 'TARGET_MISSING',
              note: '目标记录缺失'
            }
          ]
        : snapshot.includedFields.map((f, fIdx) => ({
            fieldCode: f.sourceFieldKey,
            fieldName: f.displayName,
            plmRawValue: fIdx === 0 ? '标准版本值_A' : '预期值',
            mappedExpectedValue: fIdx === 0 ? '标准版本值_A' : '预期值',
            manticoreActualValue: fIdx === 0 ? '历史旧值_B' : '预期值',
            matchStatus: fIdx === 0 ? 'MISMATCH' : 'MATCH',
            note: fIdx === 0 ? '源端与目标端字段值不一致' : undefined
          }))
    });
    currentIdx++;
  }

  // 2. 生成待复查样本
  for (let i = 0; i < pendingCount; i++) {
    const oid = `${prefix}-${startNum + currentIdx}`;
    const name = `${sampleTitles[i % sampleTitles.length]} ${oid}`;
    objects.push({
      objectId: oid,
      objectName: name,
      rootTypeCode,
      selectedReason: 'RANDOM_SAMPLE',
      status: 'PENDING_RECHECK',
      statusDetail: '待复查：PLM 源端处于活动事务窗口期，数据处于同步流转管道中',
      differenceFields: [],
      recheckReason: '源端数据近期发生变更，数据仍处于同步延迟管道中，暂不进入不一致分母',
      fields: snapshot.includedFields.map(f => ({
        fieldCode: f.sourceFieldKey,
        fieldName: f.displayName,
        plmRawValue: '新变更值_待同步',
        mappedExpectedValue: '新变更值_待同步',
        manticoreActualValue: '原底座值',
        matchStatus: 'UNVERIFIABLE',
        note: '变更在途中'
      }))
    });
    currentIdx++;
  }

  // 3. 生成无法比对样本
  for (let i = 0; i < unableCount; i++) {
    const oid = `${prefix}-${startNum + currentIdx}`;
    const name = `${sampleTitles[i % sampleTitles.length]} ${oid}`;
    objects.push({
      objectId: oid,
      objectName: name,
      rootTypeCode,
      selectedReason: 'RANDOM_SAMPLE',
      status: 'UNABLE_TO_COMPARE',
      statusDetail: '无法比对：源端只读数据接口响应异常或单条对象唯一键缺失',
      differenceFields: [],
      unableToCompareReason: '源端记录唯一键值缺失或不可读，无法进行确定性比对',
      fields: snapshot.includedFields.map(f => ({
        fieldCode: f.sourceFieldKey,
        fieldName: f.displayName,
        plmRawValue: null,
        mappedExpectedValue: null,
        manticoreActualValue: '未知',
        matchStatus: 'UNVERIFIABLE',
        note: '源端取数失败'
      }))
    });
    currentIdx++;
  }

  // 4. 生成一致样本
  for (let i = 0; i < consistentCount; i++) {
    const oid = `${prefix}-${startNum + currentIdx}`;
    const name = `${sampleTitles[i % sampleTitles.length]} ${oid}`;
    objects.push({
      objectId: oid,
      objectName: name,
      rootTypeCode,
      selectedReason: 'RANDOM_SAMPLE',
      status: 'CONSISTENT',
      statusDetail: '全部核验字段一致：业务唯一键匹配，核验字段经映射后与底座存储完全一致',
      differenceFields: [],
      fields: snapshot.includedFields.map(f => ({
        fieldCode: f.sourceFieldKey,
        fieldName: f.displayName,
        plmRawValue: '合规值',
        mappedExpectedValue: '合规值',
        manticoreActualValue: '合规值',
        matchStatus: 'MATCH'
      }))
    });
    currentIdx++;
  }

  const scopeDesc =
    scopeMode === 'RANDOM_SAMPLE'
      ? `抽检核验（${count} 个样本）`
      : scopeMode === 'EXHAUSTIVE_SCOPE'
      ? `全量核验：${specificScopeOrIds || '指定分类子范围'}`
      : `定向核验：${specificScopeOrIds || '指定对象'}`;

  const modeLabel = scopeMode === 'RANDOM_SAMPLE' ? '抽检核验' : scopeMode === 'EXHAUSTIVE_SCOPE' ? '全量核验' : '定向核验';

  return {
    id: batchId,
    planName: `${rootTypeName} ${modeLabel}批次`,
    triggerType: 'MANUAL_CUSTOM',
    rootTypeCode,
    rootTypeName,
    scopeMode,
    scopeDescription: scopeDesc,
    strategySummary: `${modeLabel}（有效比对数 ${consistentCount + inconsistentCount}，一致 ${consistentCount}，不一致 ${inconsistentCount}，待复查 ${pendingCount}，无法比对 ${unableCount}）`,
    executedAt: nowStr,
    plannedCount: count,
    actualCount: objects.length,
    consistentCount,
    differenceCount: inconsistentCount,
    pendingRecheckCount: pendingCount,
    incompleteCount: unableCount,
    comparisonFieldSnapshot: snapshot,
    frozenObjectIds: objects.map(o => o.objectId),
    objectResults: objects,
    status: 'COMPLETED'
  };
}
