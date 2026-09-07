import {
  ConsistencyCheckPlan,
  ConsistencyBatchRecord,
  ConsistencyObjectResult
} from '../types/consistencyCheck';

// 预设默认计划：零件日常核验
export const initialConsistencyPlan: ConsistencyCheckPlan = {
  id: 'PLAN-PART-DAILY-01',
  name: '零件日常核验',
  rootTypeCode: 'PART',
  rootTypeName: '零部件 (Part)',
  frequency: 'DAILY',
  frequencyLabel: '每天 (低峰期)',
  scheduledTime: '02:30',
  timeWindowDays: 7,
  strategy: 'FOCUS_AND_RANDOM',
  maxSampleLimit: 200,
  focusCriteria: 'HIGH_FREQUENCY',
  focusQuota: 100,
  randomQuota: 100,
  selectedScopeId: 'SCOPE_BOLT',
  selectedScopeName: '标准件 > 紧固件 > 螺栓 (最近7天)',
  targetFields: [
    { fieldCode: 'version_lifecycle', fieldName: '版本/迭代与生命周期', description: '核验版本号与发布状态一致性' },
    { fieldCode: 'part_name', fieldName: '物料名称', description: '基础业务名称' },
    { fieldCode: 'primary_material', fieldName: '主要材质', description: '经过映射转换的规范材质名称' },
    { fieldCode: 'classification_path', fieldName: '分类路径', description: '分类目录节点全路径' }
  ],
  enabled: true,
  updatedAt: '2026-09-06 18:00:00',
  isDemoPlan: true
};

// 预设确定的典型核验对象结果
export const demoObjectResults: ConsistencyObjectResult[] = [
  {
    objectId: 'P-30001',
    objectName: '六角头法兰面承载螺栓 M12x45',
    rootTypeCode: 'PART',
    selectedReason: 'HIGH_FREQUENCY',
    modifyCount: 30,
    lastModifiedAt: '2026-09-06 20:15:30',
    status: 'DIFFERENCE_FOUND',
    statusDetail: '发现字段差异：PLM 版本为 8/已发布，而 Manticore 实际为 7/工作中',
    differenceFields: ['版本/迭代与生命周期'],
    fields: [
      {
        fieldCode: 'version_lifecycle',
        fieldName: '版本/迭代与生命周期',
        plmRawValue: 'Rev 8 / Released (已发布)',
        mappedExpectedValue: 'Rev 8 / 已发布',
        manticoreActualValue: 'Rev 7 / 工作中',
        matchStatus: 'MISMATCH',
        note: '源端已完成升版并归档发布，Manticore 主表仍驻留上一历史版本'
      },
      {
        fieldCode: 'part_name',
        fieldName: '物料名称',
        plmRawValue: '六角头法兰面承载螺栓 M12x45',
        mappedExpectedValue: '六角头法兰面承载螺栓 M12x45',
        manticoreActualValue: '六角头法兰面承载螺栓 M12x45',
        matchStatus: 'MATCH'
      },
      {
        fieldCode: 'primary_material',
        fieldName: '主要材质',
        plmRawValue: 'SCM435',
        mappedExpectedValue: '铬钼合金钢 (SCM435)',
        manticoreActualValue: '铬钼合金钢 (SCM435)',
        matchStatus: 'MATCH',
        note: '按材料字典规则完成映射转换'
      },
      {
        fieldCode: 'classification_path',
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
    status: 'DIFFERENCE_FOUND',
    statusDetail: '发现差异：疑似目标缺失 (PLM主记录有效，按唯一标识查询不到目标实际数据)',
    differenceFields: ['目标对象唯一标识'],
    isTargetMissing: true,
    fields: [
      {
        fieldCode: 'object_identity',
        fieldName: '对象唯一标识',
        plmRawValue: 'P-30002',
        mappedExpectedValue: 'P-30002',
        manticoreActualValue: null,
        matchStatus: 'TARGET_MISSING',
        note: 'PLM源端存在有效主记录，按对象唯一标识查询 Manticore 返回 0 条实际存储记录'
      },
      {
        fieldCode: 'version_lifecycle',
        fieldName: '版本/迭代与生命周期',
        plmRawValue: 'Rev 2 / 已发布',
        mappedExpectedValue: 'Rev 2 / 已发布',
        manticoreActualValue: null,
        matchStatus: 'TARGET_MISSING'
      },
      {
        fieldCode: 'part_name',
        fieldName: '物料名称',
        plmRawValue: '精密行星齿轮箱外壳法兰',
        mappedExpectedValue: '精密行星齿轮箱外壳法兰',
        manticoreActualValue: null,
        matchStatus: 'TARGET_MISSING'
      },
      {
        fieldCode: 'primary_material',
        fieldName: '主要材质',
        plmRawValue: 'AL6061-T6',
        mappedExpectedValue: '航空硬铝合金 (6061-T6)',
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
    statusDetail: '映射后保持一致：PLM 原始材质 SS304 经映射规则转换为“不锈钢”，与目标实际值一致',
    differenceFields: [],
    fields: [
      {
        fieldCode: 'version_lifecycle',
        fieldName: '版本/迭代与生命周期',
        plmRawValue: 'Rev 3 / 已发布',
        mappedExpectedValue: 'Rev 3 / 已发布',
        manticoreActualValue: 'Rev 3 / 已发布',
        matchStatus: 'MATCH'
      },
      {
        fieldCode: 'part_name',
        fieldName: '物料名称',
        plmRawValue: '不锈钢耐酸排气阀弹簧',
        mappedExpectedValue: '不锈钢耐酸排气阀弹簧',
        manticoreActualValue: '不锈钢耐酸排气阀弹簧',
        matchStatus: 'MATCH'
      },
      {
        fieldCode: 'primary_material',
        fieldName: '主要材质',
        plmRawValue: 'SS304',
        mappedExpectedValue: '不锈钢',
        manticoreActualValue: '不锈钢',
        matchStatus: 'MATCH',
        note: 'PLM原始材质编码 SS304 经字段映射转换为目标预期值“不锈钢”，比对通过 (SS304 → 不锈钢 → 不锈钢)'
      },
      {
        fieldCode: 'classification_path',
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
    statusDetail: '待复查：PLM 源端活动变更在途，同步尚未到达',
    differenceFields: ['版本与生命周期状态'],
    recheckReason: 'PLM 源端近期发生变更，数据处于同步流转期间，暂不判定为异常',
    fields: [
      {
        fieldCode: 'version_lifecycle',
        fieldName: '版本/迭代与生命周期',
        plmRawValue: 'Rev 5 / 签审中',
        mappedExpectedValue: 'Rev 5 / 签审中',
        manticoreActualValue: 'Rev 4 / 工作中',
        matchStatus: 'UNVERIFIABLE',
        note: '源端仍在活动事务修改中，需待同步窗口后重新复查'
      },
      {
        fieldCode: 'part_name',
        fieldName: '物料名称',
        plmRawValue: '液压动力转向泵传动齿轴',
        mappedExpectedValue: '液压动力转向泵传动齿轴',
        manticoreActualValue: '液压动力转向泵传动齿轴',
        matchStatus: 'MATCH'
      },
      {
        fieldCode: 'primary_material',
        fieldName: '主要材质',
        plmRawValue: '20CrMnTi',
        mappedExpectedValue: '合金结构钢 (20CrMnTi)',
        manticoreActualValue: '合金结构钢 (20CrMnTi)',
        matchStatus: 'MATCH'
      }
    ]
  },
  {
    objectId: 'P-30005',
    objectName: '高压共轨柴油喷油嘴偶件',
    rootTypeCode: 'PART',
    selectedReason: 'RANDOM_SAMPLE',
    lastModifiedAt: '2026-09-04 11:45:00',
    status: 'INCOMPLETE',
    statusDetail: '检查未完成：PLM 源端批量只读接口握手超时 (504 Gateway Timeout)，无法判定一致性',
    differenceFields: ['全部待检字段'],
    incompleteReason: 'PLM 源端数据服务在批量取数时发生连接中断或超时，不应误判为数据缺失或不一致',
    fields: [
      {
        fieldCode: 'version_lifecycle',
        fieldName: '版本/迭代与生命周期',
        plmRawValue: null,
        mappedExpectedValue: null,
        manticoreActualValue: 'Rev 1 / 已发布',
        matchStatus: 'UNVERIFIABLE',
        note: '源端读取失败，当前无法比对'
      },
      {
        fieldCode: 'part_name',
        fieldName: '物料名称',
        plmRawValue: null,
        mappedExpectedValue: null,
        manticoreActualValue: '高压共轨柴油喷油嘴偶件',
        matchStatus: 'UNVERIFIABLE'
      },
      {
        fieldCode: 'primary_material',
        fieldName: '主要材质',
        plmRawValue: null,
        mappedExpectedValue: null,
        manticoreActualValue: '特种耐磨合金',
        matchStatus: 'UNVERIFIABLE'
      }
    ]
  }
];

// 初始历史批次记录 (固定演示数据，严格保证 实际样本数 = 冻结ID数 = 明细行数 = 状态分布合计)
export const initialConsistencyBatches: ConsistencyBatchRecord[] = [
  {
    id: 'CC-20260906-001',
    planId: 'PLAN-PART-DAILY-01',
    planName: '零件日常核验',
    triggerType: 'SCHEDULED',
    rootTypeCode: 'PART',
    rootTypeName: '零部件 (Part)',
    scopeDescription: '最近 7 天有变更的合格零部件对象',
    strategySummary: '重点＋随机 (高频修改前 3 个 + 其余合格对象随机 2 个)',
    executedAt: '2026-09-06 02:30:15',
    plmReadTime: '2026-09-06 02:30:18 (耗时 2.3s)',
    manticoreReadTime: '2026-09-06 02:30:21 (耗时 1.1s)',
    benchmarkSource: '固定演示数据（真实取数待接入）',
    plannedCount: 200,
    actualCount: 5,
    focusCount: 3,
    randomCount: 2,
    manualCount: 0,
    deduplicatedCount: 0,
    quotaSupplementInfo: '计划单次上限 200 个（重点配额 100 + 随机配额 100）。当前固定演示样本库仅配置 5 条典型用例（重点 3 条 + 随机 2 条），合格候选不足，实际执行 5 条（不代表真实计划只核验 5 条）。真实环境接入后支持充足候选自动补足至计划上限。',
    consistentCount: 1,
    differenceCount: 2,
    pendingRecheckCount: 1,
    incompleteCount: 1,
    frozenObjectIds: ['P-30001', 'P-30002', 'P-30003', 'P-30004', 'P-30005'],
    objectResults: demoObjectResults,
    status: 'COMPLETED'
  },
  {
    id: 'CC-20260905-001',
    planId: 'PLAN-PART-DAILY-01',
    planName: '零件日常核验',
    triggerType: 'SCHEDULED',
    rootTypeCode: 'PART',
    rootTypeName: '零部件 (Part)',
    scopeDescription: '最近 7 天有变更的合格零部件对象',
    strategySummary: '重点＋随机 (高频修改前 2 个 + 其余合格对象随机 2 个)',
    executedAt: '2026-09-05 02:30:10',
    plmReadTime: '2026-09-05 02:30:14 (耗时 2.1s)',
    manticoreReadTime: '2026-09-05 02:30:16 (耗时 0.9s)',
    benchmarkSource: '固定演示数据（真实取数待接入）',
    plannedCount: 200,
    actualCount: 4,
    focusCount: 2,
    randomCount: 2,
    manualCount: 0,
    deduplicatedCount: 0,
    quotaSupplementInfo: '计划单次上限 200 个。当前固定演示样本库仅配置 4 条典型对象，合格候选不足，实际执行 4 条。',
    consistentCount: 1,
    differenceCount: 1,
    pendingRecheckCount: 1,
    incompleteCount: 1,
    frozenObjectIds: ['P-30001', 'P-30003', 'P-30004', 'P-30005'],
    objectResults: [
      demoObjectResults[0],
      demoObjectResults[2],
      demoObjectResults[3],
      demoObjectResults[4]
    ],
    status: 'COMPLETED'
  }
];
