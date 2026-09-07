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
        note: 'PLM原始材质编码 SS304 经字段映射转换为目标预期值“不锈钢”，比对通过'
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
    statusDetail: '待复查：PLM 源端 2 分钟前仍有活动修改，处于合理同步窗口延迟期 (5分钟内)',
    differenceFields: ['版本/迭代与生命周期'],
    recheckReason: 'PLM 最后变更时间距核验时刻小于 5 分钟缓冲阈值，同步管道可能仍在处理中，不应判定为静默故障',
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

// 初始历史批次记录
export const initialConsistencyBatches: ConsistencyBatchRecord[] = [
  {
    id: 'CC-20260906-001',
    planId: 'PLAN-PART-DAILY-01',
    planName: '零件日常核验',
    triggerType: 'SCHEDULED',
    rootTypeCode: 'PART',
    rootTypeName: '零部件 (Part)',
    scopeDescription: '最近 7 天有变更的合格零部件对象',
    strategySummary: '重点＋随机 (高频修改前 100 个 + 其余合格对象随机 100 个)',
    executedAt: '2026-09-06 02:30:15',
    plmReadTime: '2026-09-06 02:30:18 (耗时 2.3s)',
    manticoreReadTime: '2026-09-06 02:30:21 (耗时 1.1s)',
    benchmarkSource: 'PLM 源端实时主记录 (只读镜像)',
    plannedCount: 200,
    actualCount: 198,
    focusCount: 100,
    randomCount: 98,
    manualCount: 0,
    deduplicatedCount: 2,
    quotaSupplementInfo: '高频修改筛选 100 个；合格随机样本提取 100 个，经内置唯一 ID 去重剔除 2 个重叠对象，最终有效样本 198 个',
    consistentCount: 194,
    differenceCount: 2,
    pendingRecheckCount: 1,
    incompleteCount: 1,
    frozenObjectIds: ['P-30001', 'P-30002', 'P-30003', 'P-30004', 'P-30005', 'P-30006', 'P-30007', 'P-30008'],
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
    strategySummary: '重点＋随机 (高频修改前 100 个 + 其余合格对象随机 100 个)',
    executedAt: '2026-09-05 02:30:10',
    plmReadTime: '2026-09-05 02:30:14 (耗时 2.1s)',
    manticoreReadTime: '2026-09-05 02:30:16 (耗时 0.9s)',
    benchmarkSource: 'PLM 源端实时主记录 (只读镜像)',
    plannedCount: 200,
    actualCount: 200,
    focusCount: 100,
    randomCount: 100,
    manualCount: 0,
    deduplicatedCount: 0,
    consistentCount: 197,
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

// 5 项未确认的真实能力待确认说明
export const pendingConfirmations = [
  {
    title: 'PLM 源端读取通道',
    description: 'PLM 是通过标准化 REST/Web 接口还是直连只读镜像数据库批量提取，尚未最终敲定。',
    status: '待确认'
  },
  {
    title: '对象唯一标识格式与版本语义',
    description: '对象唯一标识是否包含主版本（如 P-10001-A）与小迭代，亦或仅包含基础物料号，需业务口径确认。',
    status: '待确认'
  },
  {
    title: 'Manticore 批量查询接口',
    description: 'Manticore 底座是否支持按对象唯一标识列表（Batch ID List）高效批量获取目标实际存储字段。',
    status: '待确认'
  },
  {
    title: '高频修改统计数据源',
    description: '高频修改统计是否可直接从 PLM 变更历史、审计流或事件中心获取有效变更频次（当前仅为演示数据）。',
    status: '待接入'
  },
  {
    title: '两端时间快照一致性',
    description: '源端读取与 Manticore 读取之间是否存在不可消除的网络与传输时延快照偏差，需设定合理延迟排查窗口。',
    status: '待确认'
  }
];

// 覆盖边界与审计说明
export const coverageBoundaries = [
  {
    title: 'PLM 单向选样的可发现范围',
    content: '从 PLM 单向选样并比对，能可靠发现“字段属性不一致”以及“PLM 源端应该存在但在 Manticore 实际数据中按唯一标识查询不到”的漏同步问题。'
  },
  {
    title: '单向抽样的固有局限',
    content: '单向抽查无法发现“PLM 源端已被物理删除，但 Manticore 底座中仍有残留数据”的孤儿垃圾数据，此类情况需由反向审计模块处理。'
  },
  {
    title: '严禁单向自动删除目标数据',
    content: '若某次单向核验中源端读取不到某条记录，绝不能自动删除 Manticore 目标数据，必须人工排查是否属于源端网络抖动或临时归档。'
  },
  {
    title: '抽样一致性不代表全库一致',
    content: '本次抽检样本未发现差异，仅说明“在本次抽取的样本内及核验的特定字段集合上未发现不一致”，绝不能宣传为“全库完全无静默不一致”。'
  }
];
