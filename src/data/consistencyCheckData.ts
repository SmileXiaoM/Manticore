import {
  ConsistencyBatchRecord,
  ConsistencyObjectResult,
  ComparisonFieldSnapshot,
  ComparisonFieldItem,
  ConsistencyCheckRequest,
  ObjectSelectedReason,
  ConsistencyItemStatus,
  formatLocalDateTime,
  createConsistencyBatchId,
  resolveFieldDisplayName,
  getComparisonCapability,
  COMPARISON_CAPABILITY_TABLE
} from '../types/consistencyCheck';
import { FieldMappingItem } from '../stage1MappingTypes';
import { SyncBatch, toSyncRootType } from '../syncQualityTypes';

// 本地时间与带时区 ISO 时间均明确到秒；拒绝日期溢出和无法解析的时间。
function reliableTimestamp(value?: string): number | undefined {
  if (!value) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?$/.exec(value);
  if (!match) return undefined;
  const [, year, month, day, hour, minute, second] = match.map(Number);
  const calendar = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  if (calendar.getUTCFullYear() !== year || calendar.getUTCMonth() !== month - 1 || calendar.getUTCDate() !== day ||
      calendar.getUTCHours() !== hour || calendar.getUTCMinutes() !== minute || calendar.getUTCSeconds() !== second) return undefined;
  const timestamp = Date.parse(value.replace(' ', 'T'));
  return Number.isFinite(timestamp) ? timestamp : undefined;
}

/** 最近一次完成的同根类型真实同步，不依赖数组位置，也不关联重置。 */
export function findLatestSuccessfulSyncBatch(batches: SyncBatch[] = [], rootTypeCode: string): SyncBatch | undefined {
  const rootType = toSyncRootType(rootTypeCode);
  if (!rootType) return undefined;
  return batches.flatMap(batch => {
    const isSync = batch.taskType === 'SYNC' || (batch.taskType === undefined && !batch.resetAuditDetail &&
      (batch.syncMethod === 'FULL' || batch.syncMethod === 'INCREMENTAL' || batch.syncMethod === 'COMPENSATION'));
    if (!isSync || !batch.rootTypes.includes(rootType) ||
        (batch.executionStatus !== 'SUCCESS' && batch.executionStatus !== 'PARTIAL_SUCCESS')) return [];
    const startTime = reliableTimestamp(batch.startTime);
    const completedTime = reliableTimestamp(batch.endTime) ?? startTime;
    return completedTime === undefined ? [] : [{ batch, completedTime, startTime }];
  }).sort((a, b) => b.completedTime - a.completedTime ||
    (b.startTime ?? Number.MIN_SAFE_INTEGER) - (a.startTime ?? Number.MIN_SAFE_INTEGER))[0]?.batch;
}

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
    statusDetail: '发现字段差异：PLM 主要材质为 304，经规则映射预期为“SUS304”，而 Manticore 实际为“SUS201”',
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
        plmRawValue: '304',
        mappedExpectedValue: 'SUS304',
        manticoreActualValue: 'SUS201',
        matchStatus: 'MISMATCH',
        note: '源端编码 304 经枚举映射预期为 SUS304，目标底座实际为 SUS201'
      },
      {
        fieldCode: 'iba_nominal_diameter',
        fieldName: '公称直径 (mm)',
        plmRawValue: '12 mm',
        mappedExpectedValue: 12,
        manticoreActualValue: 12,
        matchStatus: 'MATCH',
        note: '单位换算 12 mm -> 12'
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
    differenceFields: ['目标对象唯一标识 (缺失)'],
    isTargetMissing: true,
    fields: [
      {
        fieldCode: 'iba_part_number',
        fieldName: '物料编码',
        plmRawValue: 'P-30002',
        mappedExpectedValue: 'P-30002',
        manticoreActualValue: null,
        matchStatus: 'TARGET_MISSING',
        note: '源端存在有效主记录，按业务唯一键在 Manticore 检索底座查询不到对应文档'
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
        plmRawValue: '304',
        mappedExpectedValue: 'SUS304',
        manticoreActualValue: 'SUS304',
        matchStatus: 'MATCH',
        note: '源端编码 304 经映射转换后与底座存储值一致'
      },
      {
        fieldCode: 'iba_nominal_diameter',
        fieldName: '公称直径 (mm)',
        plmRawValue: '25 mm',
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
    differenceFields: [],
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
        mappedExpectedValue: '20CrMnTi',
        manticoreActualValue: '45#',
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
    differenceFields: [],
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
        manticoreActualValue: 'SUS304',
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
        displayName: '物料编码',
        sourceDataType: 'STRING',
        manticoreType: 'STRING'
      },
      includedFields: [
        {
          sourceFieldKey: 'iba_part_name',
          manticoreField: 'part_name',
          displayName: '零件名称',
          dataType: 'TEXT',
          manticoreType: 'STRING',
          comparisonMethod: COMPARISON_CAPABILITY_TABLE.TEXT.comparisonMethod
        },
        {
          sourceFieldKey: 'iba_material',
          manticoreField: 'material',
          displayName: '主要材质',
          dataType: 'ENUM',
          manticoreType: 'STRING',
          comparisonMethod: COMPARISON_CAPABILITY_TABLE.ENUM.comparisonMethod
        },
        {
          sourceFieldKey: 'iba_nominal_diameter',
          manticoreField: 'nominal_diameter_mm',
          displayName: '公称直径 (mm)',
          dataType: 'NUMERIC_WITH_UNIT',
          manticoreType: 'FLOAT',
          comparisonMethod: COMPARISON_CAPABILITY_TABLE.NUMERIC_WITH_UNIT.comparisonMethod
        },
        {
          sourceFieldKey: 'iba_classification_path',
          manticoreField: 'category_path',
          displayName: '分类路径',
          dataType: 'CATEGORY_TREE',
          manticoreType: 'STRING',
          comparisonMethod: COMPARISON_CAPABILITY_TABLE.CATEGORY_TREE.comparisonMethod
        }
      ],
      excludedFields: [
        {
          sourceFieldKey: 'iba_surface_treatment',
          fieldName: '表面处理工艺',
          sourceDataType: 'STRING',
          actualManticoreType: 'STRING',
          reason: '草稿字段未正式生效进入底座'
        }
      ],
      snapshotTime: '2026-09-06 02:30:15'
    },
    frozenObjectIds: ['P-30001', 'P-30002', 'P-30003', 'P-30004', 'P-30005'],
    objectResults: initialDemoPartObjects,
    sourceSyncBatchId: 'SYNC-20260825-001',
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
        displayName: '物料编码',
        sourceDataType: 'STRING',
        manticoreType: 'STRING'
      },
      includedFields: [
        {
          sourceFieldKey: 'iba_part_name',
          manticoreField: 'part_name',
          displayName: '零件名称',
          dataType: 'TEXT',
          manticoreType: 'STRING',
          comparisonMethod: COMPARISON_CAPABILITY_TABLE.TEXT.comparisonMethod
        },
        {
          sourceFieldKey: 'iba_material',
          manticoreField: 'material',
          displayName: '主要材质',
          dataType: 'ENUM',
          manticoreType: 'STRING',
          comparisonMethod: COMPARISON_CAPABILITY_TABLE.ENUM.comparisonMethod
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

// 构造指定根类型的只读核验字段快照（基于确定性比较能力表）
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

  // 唯一键也必须验证 source key、Manticore 字段和可定位类型，不得使用 partNumber/part_number 默认值补位
  if (!uField.sourceFieldKey?.trim() || !uField.manticoreField?.trim()) {
    return { uniqueKeyError: `当前根类型 [${rootTypeCode}] 正式底座中业务唯一键缺少有效源端字段标识或底座物理字段名，无法用于对象定位。` };
  }
  const uManticoreType = (uField.manticoreType || '').toUpperCase().trim();
  const validUniqueLocatableTypes = ['STRING', 'TEXT', 'INTEGER', 'INT', 'BIGINT', 'CODE'];
  const isLocatable = validUniqueLocatableTypes.some(t => uManticoreType.includes(t));
  if (!isLocatable) {
    return { uniqueKeyError: `当前根类型 [${rootTypeCode}] 业务唯一键底座类型 [${uField.manticoreType}] 不属于标量唯一可定位类型 (STRING/TEXT/BIGINT/INT)。` };
  }

  // 正式可比对字段与被排除字段
  const includedCandidates: ComparisonFieldItem[] = [];
  const excludedCandidates: ComparisonFieldSnapshot['excludedFields'] = [];

  rootFields.forEach(f => {
    // 唯一键只负责定位对象，不进入普通字段一致率
    if (f.isUniqueKey) return;

    // 排除草稿或未入正式查询底座
    if (!f.isInFormalQueryBase || f.configStatus === 'DRAFT') {
      excludedCandidates.push({
        sourceFieldKey: f.sourceFieldKey || f.id,
        fieldName: resolveFieldDisplayName(f),
        sourceDataType: f.sourceDataType,
        actualManticoreType: f.manticoreType,
        reason: f.configStatus === 'DRAFT' ? '草稿字段未生效' : '未纳入正式查询底座'
      });
      return;
    }

    if (!f.sourceFieldKey || !f.manticoreField) {
      excludedCandidates.push({
        sourceFieldKey: f.sourceFieldKey || f.id,
        fieldName: resolveFieldDisplayName(f),
        sourceDataType: f.sourceDataType,
        actualManticoreType: f.manticoreType,
        reason: '未定义有效源端或底座字段标识'
      });
      return;
    }

    // 检查确定性比较能力表（双端校验：来源业务类型 + Manticore 实际类型）
    const cap = getComparisonCapability(f.sourceDataType, f.manticoreType);
    if (!cap.isVerifiable) {
      excludedCandidates.push({
        sourceFieldKey: f.sourceFieldKey,
        fieldName: resolveFieldDisplayName(f),
        sourceDataType: f.sourceDataType,
        actualManticoreType: f.manticoreType,
        reason: cap.excludeReason || '当前类型暂无确定性核验规则'
      });
      return;
    }

    includedCandidates.push({
      sourceFieldKey: f.sourceFieldKey,
      manticoreField: f.manticoreField,
      displayName: resolveFieldDisplayName(f),
      dataType: f.sourceDataType || 'TEXT',
      manticoreType: f.manticoreType || cap.manticoreType,
      comparisonMethod: cap.comparisonMethod
    });
  });

  if (includedCandidates.length === 0) {
    return { fieldsError: `当前根类型 [${rootTypeCode}] 暂无满足确定性核验规则的正式字段。` };
  }

  const snapshot: ComparisonFieldSnapshot = {
    rootTypeCode,
    uniqueKeyField: {
      sourceFieldKey: uField.sourceFieldKey.trim(),
      manticoreField: uField.manticoreField.trim(),
      displayName: resolveFieldDisplayName(uField),
      sourceDataType: uField.sourceDataType || 'STRING',
      manticoreType: uField.manticoreType || 'STRING'
    },
    includedFields: includedCandidates,
    excludedFields: excludedCandidates,
    snapshotTime: formatLocalDateTime()
  };

  return { snapshot };
}

// 模拟生成与字段类型匹配的真实业务数据（fixture 夹具，无占位字符串）
function getRealisticFieldValue(
  field: ComparisonFieldItem,
  objectId: string,
  objectName: string,
  mode: 'MATCH' | 'MISMATCH' | 'PENDING'
): { plm: string | number | null; expected: string | number | null; actual: string | number | null; note?: string } {
  const dt = (field.dataType || 'TEXT').toUpperCase();
  const key = (field.sourceFieldKey || '').toLowerCase();

  if (dt === 'NUMERIC_WITH_UNIT' || dt === 'NUMERIC' || dt === 'FLOAT' || dt === 'INTEGER') {
    const rawNum = 12;
    if (mode === 'MATCH') {
      return { plm: `${rawNum} mm`, expected: rawNum, actual: rawNum, note: '单位统一转换 12 mm -> 12' };
    } else if (mode === 'MISMATCH') {
      return { plm: `${rawNum} mm`, expected: rawNum, actual: 10, note: '数值不一致 (预期 12 != 实际 10)' };
    } else {
      return { plm: '15 mm', expected: 15, actual: 12, note: '源端变更在途中' };
    }
  }

  if (dt === 'ENUM') {
    if (mode === 'MATCH') {
      return { plm: '304', expected: 'SUS304', actual: 'SUS304', note: '枚举字典对齐 304 -> SUS304' };
    } else if (mode === 'MISMATCH') {
      return { plm: '304', expected: 'SUS304', actual: 'SUS201', note: '枚举值差异 (预期 SUS304 != 实际 SUS201)' };
    } else {
      return { plm: '316L', expected: 'SUS316L', actual: 'SUS304', note: '源端变更在途中' };
    }
  }

  if (dt === 'CATEGORY_TREE' || dt === 'PATH') {
    const pathVal = '标准件 > 紧固件 > 螺栓';
    if (mode === 'MATCH') {
      return { plm: '/标准件/紧固件/螺栓', expected: pathVal, actual: pathVal, note: '规范路径对齐' };
    } else if (mode === 'MISMATCH') {
      return { plm: '/标准件/紧固件/螺栓', expected: pathVal, actual: '通用件 > 紧固件 > 螺栓', note: '路径不一致' };
    } else {
      return { plm: '/标准件/特种螺栓', expected: '标准件 > 特种螺栓', actual: pathVal, note: '源端变更在途中' };
    }
  }

  if (key.includes('version')) {
    if (mode === 'MATCH') {
      return { plm: 'A.2', expected: 'A.2', actual: 'A.2' };
    } else if (mode === 'MISMATCH') {
      return { plm: 'A.2', expected: 'A.2', actual: 'A.1', note: '文档版本号差异 (预期 A.2 != 实际 A.1)' };
    } else {
      return { plm: 'B.0', expected: 'B.0', actual: 'A.2', note: '新版本同步在途' };
    }
  }

  if (key.includes('drawing')) {
    const dwg = `DWG-${objectId}`;
    if (mode === 'MATCH') {
      return { plm: dwg, expected: dwg, actual: dwg };
    } else if (mode === 'MISMATCH') {
      return { plm: dwg, expected: dwg, actual: `${dwg}-REV-OLD`, note: '图号不一致' };
    } else {
      return { plm: `${dwg}-REV2`, expected: `${dwg}-REV2`, actual: dwg, note: '图号更新在途' };
    }
  }

  // 默认标量文本
  if (mode === 'MATCH') {
    return { plm: objectName, expected: objectName, actual: objectName };
  } else if (mode === 'MISMATCH') {
    return { plm: objectName, expected: objectName, actual: `${objectName} (旧版归档)`, note: '文本规范化内容不一致' };
  } else {
    return { plm: `${objectName} (修订中)`, expected: `${objectName} (修订中)`, actual: objectName, note: '修订同步在途' };
  }
}

/**
 * 核心核验模拟执行函数
 * 严格支持：
 * 1. SPECIFIC_IDS 模式的任务对象集合严格等于去重后的用户输入 ID（去重，不补位，不换前缀流水号，selectedReason 为 MANUAL_SPECIFIED）
 * 2. 非法请求或显式注入 simulateFailure 返回 FAILED，不生成补位对象
 * 3. 字段比对使用快照中真实类型规则，杜绝占位词
 * 4. 批次 ID 使用可靠唯一标识防碰撞
 */
export function executeConsistencyRun(
  req: ConsistencyCheckRequest,
  batchIdOverride?: string
): ConsistencyBatchRecord {
  const batchId = batchIdOverride || createConsistencyBatchId();
  const nowStr = formatLocalDateTime();
  const { rootTypeCode, rootTypeName, scopeMode, comparisonFieldSnapshot } = req;
  const idsAreValid = req.requestedObjectIds === undefined || (Array.isArray(req.requestedObjectIds) &&
    req.requestedObjectIds.every(id => typeof id === 'string'));
  const uniqueIds = idsAreValid ? Array.from(new Set((req.requestedObjectIds || []).map(id => id.trim()).filter(Boolean))) : [];
  const countIsValid = typeof req.sampleCount === 'number' && Number.isSafeInteger(req.sampleCount) && req.sampleCount > 0;
  let validationError: string | undefined;
  if (!Object.hasOwn(ROOT_TYPE_SCOPE_OPTIONS, rootTypeCode)) {
    validationError = `未知根类型 [${rootTypeCode}]，无法确定核验范围`;
  } else if (!['RANDOM_SAMPLE', 'EXHAUSTIVE_SCOPE', 'SPECIFIC_IDS'].includes(scopeMode)) {
    validationError = '不支持的核验范围模式';
  } else if (scopeMode === 'SPECIFIC_IDS') {
    if (!idsAreValid || uniqueIds.length === 0) validationError = '指定对象核验必须提供至少一个有效的对象唯一标识';
  } else if (!countIsValid) {
    validationError = '核验样本数必须为大于 0 的安全整数';
  } else if (scopeMode === 'EXHAUSTIVE_SCOPE' && !ROOT_TYPE_SCOPE_OPTIONS[rootTypeCode].some(scope => scope.id === req.scopeId)) {
    validationError = '指定分类范围不存在或不属于当前根类型';
  }
  if (!validationError && (!comparisonFieldSnapshot || comparisonFieldSnapshot.rootTypeCode !== rootTypeCode ||
      !comparisonFieldSnapshot.uniqueKeyField?.sourceFieldKey?.trim() || !comparisonFieldSnapshot.uniqueKeyField?.manticoreField?.trim() ||
      !comparisonFieldSnapshot.includedFields?.length)) {
    validationError = '当前根类型缺少有效的业务唯一键或正式核验字段快照';
  }

  // 1. 测试失败分支：通过参数显式注入 simulateFailure 触发，杜绝从用户业务输入中嗅探暗号
  if (validationError || req.simulateFailure) {
    const modeLabel = scopeMode === 'RANDOM_SAMPLE' ? '抽检核验' : scopeMode === 'EXHAUSTIVE_SCOPE' ? '全量核验' : '定向核验';
    return {
      id: batchId,
      planName: `${rootTypeName} ${modeLabel}批次`,
      triggerType: 'MANUAL_CUSTOM',
      rootTypeCode,
      rootTypeName,
      scopeMode,
      scopeDescription: req.scopeDescription || (scopeMode === 'SPECIFIC_IDS' ? `定向核验：${uniqueIds.join(', ')}` : `${modeLabel}批次`),
      strategySummary: '核验执行失败（未完成有效比对）',
      executedAt: nowStr,
      plannedCount: scopeMode === 'SPECIFIC_IDS' ? uniqueIds.length : countIsValid ? req.sampleCount : 0,
      actualCount: 0,
      consistentCount: 0,
      differenceCount: 0,
      pendingRecheckCount: 0,
      incompleteCount: 0,
      comparisonFieldSnapshot,
      frozenObjectIds: [],
      objectResults: [],
      requestedObjectIds: scopeMode === 'SPECIFIC_IDS' ? uniqueIds : undefined,
      sourceSyncBatchId: req.sourceSyncBatchId,
      status: 'FAILED',
      failedStage: validationError ? '核验请求校验' : 'PLM 数据批量读取',
      failedReason: validationError || 'PLM 批量查询接口超时 (504 Gateway Timeout)，无法建立源端读取会话'
    };
  }

  // 2. 根据模式确定对象清单
  interface TargetObjectSpec {
    objectId: string;
    objectName: string;
    selectedReason: ObjectSelectedReason;
    plannedStatus?: ConsistencyItemStatus;
    isTargetMissing?: boolean;
  }

  const targetSpecs: TargetObjectSpec[] = [];

  if (scopeMode === 'SPECIFIC_IDS') {
    uniqueIds.forEach(oid => {
      let plannedStatus: ConsistencyItemStatus = 'CONSISTENT';
      let isTargetMissing = false;
      const upper = oid.toUpperCase();
      if (upper.includes('MISS')) {
        plannedStatus = 'INCONSISTENT';
        isTargetMissing = true;
      } else if (upper.includes('DIFF') || upper.includes('MISMATCH')) {
        plannedStatus = 'INCONSISTENT';
      } else if (upper.includes('PENDING') || upper.includes('SYNC')) {
        plannedStatus = 'PENDING_RECHECK';
      } else if (upper.includes('UNABLE') || upper.includes('ERR')) {
        plannedStatus = 'UNABLE_TO_COMPARE';
      }

      const objName = rootTypeCode === 'PART'
        ? `零部件 ${oid}`
        : rootTypeCode === 'DOCUMENT'
        ? `技术文件 ${oid}`
        : `工艺规程 ${oid}`;

      targetSpecs.push({
        objectId: oid,
        objectName: objName,
        selectedReason: 'MANUAL_SPECIFIED',
        plannedStatus,
        isTargetMissing
      });
    });
  } else if (scopeMode === 'EXHAUSTIVE_SCOPE') {
    const count = req.sampleCount;
    const prefix = rootTypeCode === 'PART' ? 'P' : rootTypeCode === 'DOCUMENT' ? 'DOC' : 'PR';
    const startNum = rootTypeCode === 'PART' ? 32000 : rootTypeCode === 'DOCUMENT' ? 52000 : 72000;
    const sampleNames = rootTypeCode === 'PART'
      ? ['法兰面锁紧螺栓', '内六角圆柱头螺钉', '双头耐热螺柱', '沉头螺钉', '自锁螺母', '球面垫圈']
      : rootTypeCode === 'DOCUMENT'
      ? ['总体装配设计图纸', '零部件技术规范书', '出厂试验合格报告', '有限元计算说明书', '工艺检验规程']
      : ['精密端面车削工艺', '内外圆磨削工艺路线', '高频感应淬火工艺', '氮化表面处理工艺'];

    for (let i = 0; i < count; i++) {
      const oid = `${prefix}-${startNum + i + 1}`;
      let plannedStatus: ConsistencyItemStatus = 'CONSISTENT';
      let isTargetMissing = false;
      if (i === 1) {
        plannedStatus = 'INCONSISTENT';
      } else if (i === 4 && count > 10) {
        plannedStatus = 'PENDING_RECHECK';
      } else if (i === 7 && count > 15) {
        plannedStatus = 'UNABLE_TO_COMPARE';
      }
      targetSpecs.push({
        objectId: oid,
        objectName: `${sampleNames[i % sampleNames.length]} ${oid}`,
        selectedReason: 'SCOPE_EXHAUSTIVE',
        plannedStatus,
        isTargetMissing
      });
    }
  } else {
    // RANDOM_SAMPLE
    const count = req.sampleCount;
    const prefix = rootTypeCode === 'PART' ? 'P' : rootTypeCode === 'DOCUMENT' ? 'DOC' : 'PR';
    const startNum = rootTypeCode === 'PART' ? 30000 : rootTypeCode === 'DOCUMENT' ? 50000 : 70000;
    const sampleNames = rootTypeCode === 'PART'
      ? ['六角头法兰面承载螺栓', '精密行星齿轮箱外壳法兰', '不锈钢耐酸排气阀弹簧', '液压动力转向泵传动齿轴', '高压共轨柴油喷油嘴偶件', '高强度双头螺柱 M16', '耐磨滑动轴承衬套']
      : rootTypeCode === 'DOCUMENT'
      ? ['工程总装配设计图纸', '变速箱控制系统技术规范书', '出厂满载温升试验报告', '结构强度有限元仿真报告', '电气接线端子布线图', '部件维护保养操作手册']
      : ['主轴箱精密加工工序路线', '齿轮淬火与渗碳热处理工艺', '转向节整体模锻工艺规范', '表面阳极氧化防腐工艺'];

    let inconsistentTarget = 2;
    let pendingTarget = 1;
    let unableTarget = 1;
    if (count === 100) { inconsistentTarget = 4; pendingTarget = 2; unableTarget = 2; }
    else if (count === 200) { inconsistentTarget = 8; pendingTarget = 4; unableTarget = 2; }
    else if (count < 10) { inconsistentTarget = 1; pendingTarget = 1; unableTarget = 0; }

    for (let i = 0; i < count; i++) {
      const oid = `${prefix}-${startNum + i + 1}`;
      let plannedStatus: ConsistencyItemStatus = 'CONSISTENT';
      let isTargetMissing = false;
      if (i < inconsistentTarget) {
        plannedStatus = 'INCONSISTENT';
        isTargetMissing = i === 1; // 第二个设为目标记录缺失
      } else if (i < inconsistentTarget + pendingTarget) {
        plannedStatus = 'PENDING_RECHECK';
      } else if (i < inconsistentTarget + pendingTarget + unableTarget) {
        plannedStatus = 'UNABLE_TO_COMPARE';
      }
      targetSpecs.push({
        objectId: oid,
        objectName: `${sampleNames[i % sampleNames.length]} ${oid}`,
        selectedReason: i < 3 ? 'HIGH_FREQUENCY' : 'RANDOM_SAMPLE',
        plannedStatus,
        isTargetMissing
      });
    }
  }

  // 3. 构建每个对象的字段比对详情（真实类型数据转换）
  const objectResults: ConsistencyObjectResult[] = [];
  let consistentCount = 0;
  let differenceCount = 0;
  let pendingRecheckCount = 0;
  let incompleteCount = 0;

  targetSpecs.forEach(spec => {
    const { objectId, objectName, selectedReason, plannedStatus, isTargetMissing } = spec;

    if (plannedStatus === 'CONSISTENT') {
      consistentCount++;
      const fields = comparisonFieldSnapshot.includedFields.map(f => {
        const val = getRealisticFieldValue(f, objectId, objectName, 'MATCH');
        return {
          fieldCode: f.sourceFieldKey,
          fieldName: f.displayName,
          plmRawValue: val.plm,
          mappedExpectedValue: val.expected,
          manticoreActualValue: val.actual,
          matchStatus: 'MATCH' as const,
          note: val.note
        };
      });

      objectResults.push({
        objectId,
        objectName,
        rootTypeCode,
        selectedReason,
        status: 'CONSISTENT',
        statusDetail: '全部核验字段一致：业务唯一键匹配，核验字段经映射后与检索底座完全一致',
        differenceFields: [],
        fields
      });
    } else if (plannedStatus === 'INCONSISTENT') {
      differenceCount++;
      if (isTargetMissing) {
        const uField = comparisonFieldSnapshot.uniqueKeyField;
        objectResults.push({
          objectId,
          objectName,
          rootTypeCode,
          selectedReason,
          status: 'INCONSISTENT',
          statusDetail: `发现不一致：目标记录缺失 (源端业务唯一键 ${objectId} 存在，Manticore 未检索到实际记录)`,
          differenceFields: ['目标对象唯一标识 (缺失)'],
          isTargetMissing: true,
          fields: [
            {
              fieldCode: uField.sourceFieldKey,
              fieldName: uField.displayName,
              plmRawValue: objectId,
              mappedExpectedValue: objectId,
              manticoreActualValue: null,
              matchStatus: 'TARGET_MISSING',
              note: '源端存在有效主记录，Manticore 未检索到对应记录'
            }
          ]
        });
      } else {
        const diffField = comparisonFieldSnapshot.includedFields[0];
        const fields = comparisonFieldSnapshot.includedFields.map((f, idx) => {
          const isDiff = idx === 0;
          const val = getRealisticFieldValue(f, objectId, objectName, isDiff ? 'MISMATCH' : 'MATCH');
          return {
            fieldCode: f.sourceFieldKey,
            fieldName: f.displayName,
            plmRawValue: val.plm,
            mappedExpectedValue: val.expected,
            manticoreActualValue: val.actual,
            matchStatus: isDiff ? ('MISMATCH' as const) : ('MATCH' as const),
            note: isDiff ? val.note || '源端字段值经映射后与底座存储值不一致' : val.note
          };
        });

        objectResults.push({
          objectId,
          objectName,
          rootTypeCode,
          selectedReason,
          status: 'INCONSISTENT',
          statusDetail: `发现不一致：${diffField?.displayName || '字段'} 存储值与映射预期值不符`,
          differenceFields: [diffField?.displayName || '业务属性差异'],
          fields
        });
      }
    } else if (plannedStatus === 'PENDING_RECHECK') {
      pendingRecheckCount++;
      const fields = comparisonFieldSnapshot.includedFields.map(f => {
        const val = getRealisticFieldValue(f, objectId, objectName, 'PENDING');
        return {
          fieldCode: f.sourceFieldKey,
          fieldName: f.displayName,
          plmRawValue: val.plm,
          mappedExpectedValue: val.expected,
          manticoreActualValue: val.actual,
          matchStatus: 'UNVERIFIABLE' as const,
          note: '源端近期变更处于同步延迟管道中'
        };
      });

      objectResults.push({
        objectId,
        objectName,
        rootTypeCode,
        selectedReason,
        status: 'PENDING_RECHECK',
        statusDetail: '待复查：PLM 源端近期发生变更，数据处于同步流转管道中，暂不进入不一致分母',
        differenceFields: [],
        recheckReason: 'PLM 源端最近变更在途，数据处于同步流转期间，待下一个核验窗口复查',
        fields
      });
    } else {
      // UNABLE_TO_COMPARE
      incompleteCount++;
      const fields = comparisonFieldSnapshot.includedFields.map(f => ({
        fieldCode: f.sourceFieldKey,
        fieldName: f.displayName,
        plmRawValue: null,
        mappedExpectedValue: null,
        manticoreActualValue: '未知',
        matchStatus: 'UNVERIFIABLE' as const,
        note: '源端取数超时或不可读'
      }));

      objectResults.push({
        objectId,
        objectName,
        rootTypeCode,
        selectedReason,
        status: 'UNABLE_TO_COMPARE',
        statusDetail: '无法比对：PLM 源端只读数据接口响应超时或单条对象唯一键缺失',
        differenceFields: [],
        unableToCompareReason: '源端记录唯一键值缺失或取数超时，无法进行确定性比对',
        fields
      });
    }
  });

  const modeLabel = scopeMode === 'RANDOM_SAMPLE' ? '抽检核验' : scopeMode === 'EXHAUSTIVE_SCOPE' ? '全量核验' : '定向核验';
  const scopeDesc = scopeMode === 'RANDOM_SAMPLE'
    ? `抽检核验（${targetSpecs.length} 个样本）`
    : scopeMode === 'EXHAUSTIVE_SCOPE'
    ? `全量核验：${req.scopeName || req.scopeId || '指定分类范围'}`
    : `定向核验：${targetSpecs.map(t => t.objectId).join(', ')}`;

  return {
    id: batchId,
    planName: `${rootTypeName} ${modeLabel}批次`,
    triggerType: 'MANUAL_CUSTOM',
    rootTypeCode,
    rootTypeName,
    scopeMode,
    scopeDescription: scopeDesc,
    strategySummary: `${modeLabel}（有效比对数 ${consistentCount + differenceCount}，一致 ${consistentCount}，不一致 ${differenceCount}，待复查 ${pendingRecheckCount}，无法比对 ${incompleteCount}）`,
    executedAt: nowStr,
    plannedCount: targetSpecs.length,
    actualCount: targetSpecs.length,
    consistentCount,
    differenceCount,
    pendingRecheckCount,
    incompleteCount,
    comparisonFieldSnapshot,
    frozenObjectIds: targetSpecs.map(t => t.objectId),
    objectResults,
    requestedObjectIds: scopeMode === 'SPECIFIC_IDS' ? uniqueIds : undefined,
    sourceSyncBatchId: req.sourceSyncBatchId,
    status: 'COMPLETED'
  };
}

// 兼容老调用签名
export function simulateConsistencyRun(
  rootTypeCode: string,
  rootTypeName: string,
  scopeMode: 'RANDOM_SAMPLE' | 'EXHAUSTIVE_SCOPE' | 'SPECIFIC_IDS',
  sampleCount: number,
  snapshot: ComparisonFieldSnapshot,
  specificScopeOrIds?: string,
  sourceSyncBatchId?: string
): ConsistencyBatchRecord {
  let requestedObjectIds: string[] | undefined;
  let scopeId: string | undefined;

  if (scopeMode === 'SPECIFIC_IDS' && specificScopeOrIds) {
    requestedObjectIds = specificScopeOrIds.split(/[,，\n]/).map(s => s.trim()).filter(Boolean);
  } else if (scopeMode === 'EXHAUSTIVE_SCOPE') {
    scopeId = specificScopeOrIds;
  }

  return executeConsistencyRun({
    rootTypeCode,
    rootTypeName,
    scopeMode,
    sampleCount,
    scopeId,
    scopeName: specificScopeOrIds,
    requestedObjectIds,
    comparisonFieldSnapshot: snapshot,
    sourceSyncBatchId
  });
}
