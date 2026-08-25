/**
 * 一阶段：数据同步质量 - 初始演示数据
 * 严格按照 V0.1 规范提供真实、自洽、多对象的演示数据
 */

import {
  SyncBatch,
  VerificationRecord,
  SyncException,
  FieldDifference
} from './syncQualityTypes';

// 初始同步批次列表（共 5 个批次）
export const initialSyncBatches: SyncBatch[] = [
  {
    id: 'SYNC-20260825-001',
    sourceSystem: 'IntePLM V21',
    objectsSummary: ['Part', 'Document', 'Process'],
    syncMethod: 'FULL',
    sourceDataCount: 68450,
    successCount: 68423,
    failedCount: 3,
    skippedCount: 24,
    startTime: '2026-08-25 02:00:15',
    endTime: '2026-08-25 02:48:32',
    durationText: '48分17秒',
    executionStatus: 'PARTIAL_SUCCESS',
    verificationStatus: 'WARNING',
    linkedVerificationId: 'CHK-20260825-001',
    statusNote: '该批次执行为“部分成功”，一致性核验为“预警”，两者分别独立判断。',
    objectDetails: [
      {
        objectType: 'Part',
        softType: '机械零件',
        extractedCount: 31200,
        insertedCount: 420,
        updatedCount: 30770,
        deletedCount: 10,
        failedCount: 0,
        skippedCount: 0,
        status: 'SUCCESS'
      },
      {
        objectType: 'Part',
        softType: '电子电气零件',
        extractedCount: 16800,
        insertedCount: 310,
        updatedCount: 16470,
        deletedCount: 20,
        failedCount: 0,
        skippedCount: 0,
        status: 'SUCCESS'
      },
      {
        objectType: 'Document',
        softType: '技术文档',
        extractedCount: 12600,
        insertedCount: 100,
        updatedCount: 12471,
        deletedCount: 3,
        failedCount: 2,
        skippedCount: 24,
        status: 'PARTIAL_SUCCESS'
      },
      {
        objectType: 'Document',
        softType: '图纸',
        extractedCount: 5400,
        insertedCount: 70,
        updatedCount: 5328,
        deletedCount: 1,
        failedCount: 1,
        skippedCount: 0,
        status: 'PARTIAL_SUCCESS'
      },
      {
        objectType: 'Process',
        softType: '工艺路线',
        extractedCount: 2450,
        insertedCount: 30,
        updatedCount: 2410,
        deletedCount: 10,
        failedCount: 0,
        skippedCount: 0,
        status: 'SUCCESS'
      }
    ],
    failedRecords: [
      {
        id: 'FAIL-001',
        objectCode: 'DOC-88310',
        objectType: 'Document',
        softType: '技术文档',
        businessReason: '源系统状态发布时间戳存在时钟回拨，导致映射状态与目标索引状态不匹配',
        traceId: 'TRC-PLM-20260825-9921',
        hasExceptionCreated: true,
        linkedExceptionId: 'EX-20260825-002',
        techDetail: 'StatusTransitionSyncWorker: Status conflict for entity DOC-88310. PLM version release state mismatch.'
      },
      {
        id: 'FAIL-002',
        objectCode: 'DOC-77402',
        objectType: 'Document',
        softType: '技术文档',
        businessReason: '文档正文大文本字段包含非标准控制字符，流式解析超时导致索引更新中断',
        traceId: 'TRC-PLM-20260825-8834',
        hasExceptionCreated: true,
        linkedExceptionId: 'EX-20260825-003',
        techDetail: 'StreamTextParserException: Chunk delimiter timeout after 30000ms at offset 0x4F01A for DOC-77402.'
      },
      {
        id: 'FAIL-003',
        objectCode: 'DRW-55109',
        objectType: 'Document',
        softType: '图纸',
        businessReason: '图纸矢量元数据转换异常，图幅尺寸参数未通过 Schema 校验',
        traceId: 'TRC-PLM-20260825-7712',
        hasExceptionCreated: true,
        linkedExceptionId: 'EX-20260825-005',
        techDetail: 'SchemaValidationException: Field drawing_frame_size invalid value "CUSTOM_A0_EXT" in DRW-55109.'
      }
    ],
    timeline: [
      { step: '任务创建与调度', timestamp: '2026-08-25 02:00:15', status: 'DONE', description: 'PLM 定时全量同步调度触发，批次 SYNC-20260825-001 生成' },
      { step: '源数据分片抽取', timestamp: '2026-08-25 02:05:00', status: 'DONE', description: '抽取 IntePLM V21 变更数据共 68,450 条记录' },
      { step: '对象模型清洗与写入', timestamp: '2026-08-25 02:40:10', status: 'DONE', description: '多对象并发写入 Manticore 索引库，完成 68,423 条，失败 3 条' },
      { step: '生成失败追溯单', timestamp: '2026-08-25 02:45:20', status: 'DONE', description: '生成 3 条失败记录并同步注册质量异常单' },
      { step: '批次结束与触发核验', timestamp: '2026-08-25 02:48:32', status: 'DONE', description: '批次执行完成，已自动挂载核验计划 CHK-20260825-001' }
    ]
  },
  {
    id: 'SYNC-20260825-004',
    sourceSystem: 'IntePLM V21',
    objectsSummary: ['Part', 'Document'],
    syncMethod: 'INCREMENTAL',
    sourceDataCount: 1320,
    successCount: 1320,
    failedCount: 0,
    skippedCount: 0,
    startTime: '2026-08-25 10:15:00',
    endTime: '2026-08-25 10:18:24',
    durationText: '3分24秒',
    executionStatus: 'SUCCESS',
    verificationStatus: 'PASSED',
    linkedVerificationId: 'CHK-20260825-004',
    statusNote: '增量批次执行完成，数量与内容比对全部一致。',
    objectDetails: [
      {
        objectType: 'Part',
        softType: '机械零件',
        extractedCount: 890,
        insertedCount: 45,
        updatedCount: 845,
        deletedCount: 0,
        failedCount: 0,
        skippedCount: 0,
        status: 'SUCCESS'
      },
      {
        objectType: 'Document',
        softType: '技术文档',
        extractedCount: 430,
        insertedCount: 12,
        updatedCount: 418,
        deletedCount: 0,
        failedCount: 0,
        skippedCount: 0,
        status: 'SUCCESS'
      }
    ],
    failedRecords: [],
    timeline: [
      { step: '任务创建与调度', timestamp: '2026-08-25 10:15:00', status: 'DONE', description: '增量变更监听触发' },
      { step: '源数据分片抽取', timestamp: '2026-08-25 10:16:10', status: 'DONE', description: '抽取 1,320 条最新修改记录' },
      { step: '对象模型清洗与写入', timestamp: '2026-08-25 10:18:00', status: 'DONE', description: '全部成功写入 Manticore 检索库' },
      { step: '批次结束与触发核验', timestamp: '2026-08-25 10:18:24', status: 'DONE', description: '数量核验 CHK-20260825-004 执行完成，核验结果：通过' }
    ]
  },
  {
    id: 'SYNC-20260825-005',
    sourceSystem: 'IntePLM V21',
    objectsSummary: ['Process'],
    syncMethod: 'INCREMENTAL',
    sourceDataCount: 860,
    successCount: 524,
    failedCount: 0,
    skippedCount: 0,
    startTime: '2026-08-25 16:20:00',
    durationText: '已运行 8分15秒',
    executionStatus: 'RUNNING',
    verificationStatus: 'UNCHECKED',
    statusNote: '任务正在分片抽取并写入工艺对象，处于运行中阶段，暂不允许发起一致性核验。',
    objectDetails: [
      {
        objectType: 'Process',
        softType: '工艺路线',
        extractedCount: 860,
        insertedCount: 110,
        updatedCount: 414,
        deletedCount: 0,
        failedCount: 0,
        skippedCount: 0,
        status: 'SUCCESS'
      }
    ],
    failedRecords: [],
    timeline: [
      { step: '任务创建与调度', timestamp: '2026-08-25 16:20:00', status: 'DONE', description: '工艺数据专项增量同步触发' },
      { step: '源数据分片抽取', timestamp: '2026-08-25 16:22:15', status: 'DONE', description: '完成 860 条工艺路线与工序数据抽取' },
      { step: '对象模型清洗与写入', timestamp: '2026-08-25 16:25:00', status: 'CURRENT', description: '正在写入 Manticore 索引 (当前进度 524/860)...' },
      { step: '生成失败追溯单', timestamp: '-', status: 'WAITING', description: '待写入完成后汇总结算' },
      { step: '批次结束与触发核验', timestamp: '-', status: 'WAITING', description: '等待执行完毕后发起核验' }
    ]
  },
  {
    id: 'SYNC-20260825-003',
    sourceSystem: 'IntePLM V21',
    objectsSummary: ['Document'],
    syncMethod: 'INCREMENTAL',
    sourceDataCount: 486,
    successCount: 420,
    failedCount: 2,
    skippedCount: 64,
    startTime: '2026-08-25 08:30:00',
    endTime: '2026-08-25 08:34:10',
    durationText: '4分10秒',
    executionStatus: 'PARTIAL_SUCCESS',
    verificationStatus: 'WARNING',
    linkedVerificationId: 'CHK-20260825-003',
    statusNote: '由于 64 条草稿文档由于未进入 PLM 审批态自动跳过，2 条文档存在校验异常。',
    objectDetails: [
      {
        objectType: 'Document',
        softType: '技术文档',
        extractedCount: 486,
        insertedCount: 40,
        updatedCount: 380,
        deletedCount: 0,
        failedCount: 2,
        skippedCount: 64,
        status: 'PARTIAL_SUCCESS'
      }
    ],
    failedRecords: [
      {
        id: 'FAIL-004',
        objectCode: 'DOC-91002',
        objectType: 'Document',
        softType: '技术文档',
        businessReason: '密级标签未通过合规性白名单校验',
        traceId: 'TRC-PLM-20260825-6601',
        hasExceptionCreated: true,
        linkedExceptionId: 'EX-20260825-006',
        techDetail: 'SecurityClassificationMismatch: Level "INTERNAL_RESTRICTED" not mapped in Manticore dictionary.'
      },
      {
        id: 'FAIL-005',
        objectCode: 'DOC-91008',
        objectType: 'Document',
        softType: '技术文档',
        businessReason: '关联部件主键引用不存在 (外键断裂)',
        traceId: 'TRC-PLM-20260825-6609',
        hasExceptionCreated: true,
        linkedExceptionId: 'EX-20260825-007',
        techDetail: 'ForeignKeyConstraintException: Parent part PART_ID_99011 not found in local index.'
      }
    ],
    timeline: [
      { step: '任务创建与调度', timestamp: '2026-08-25 08:30:00', status: 'DONE', description: '早间文档增量同步触发' },
      { step: '源数据分片抽取', timestamp: '2026-08-25 08:31:00', status: 'DONE', description: '抽取 486 条文档记录' },
      { step: '对象模型清洗与写入', timestamp: '2026-08-25 08:33:00', status: 'DONE', description: '写入成功 420 条，跳过 64 条草稿，失败 2 条' },
      { step: '生成失败追溯单', timestamp: '2026-08-25 08:33:45', status: 'DONE', description: '生成 2 条异常并留痕' },
      { step: '批次结束与触发核验', timestamp: '2026-08-25 08:34:10', status: 'DONE', description: '挂载抽样核验 CHK-20260825-003' }
    ]
  },
  {
    id: 'SYNC-20260824-009',
    sourceSystem: 'IntePLM V21',
    objectsSummary: ['Part'],
    syncMethod: 'COMPENSATION',
    sourceDataCount: 12,
    successCount: 0,
    failedCount: 12,
    skippedCount: 0,
    startTime: '2026-08-24 23:10:00',
    endTime: '2026-08-24 23:12:05',
    durationText: '2分05秒',
    executionStatus: 'FAILED',
    verificationStatus: 'UNCHECKED',
    statusNote: '补偿同步任务在尝试连接 PLM 历史快照视图时鉴权失败，全批次未完成写入。',
    objectDetails: [
      {
        objectType: 'Part',
        softType: '机械零件',
        extractedCount: 12,
        insertedCount: 0,
        updatedCount: 0,
        deletedCount: 0,
        failedCount: 12,
        skippedCount: 0,
        status: 'FAILED'
      }
    ],
    failedRecords: [
      {
        id: 'FAIL-006',
        objectCode: 'BATCH-COMPENSATE-ERROR',
        objectType: 'Part',
        softType: '机械零件',
        businessReason: 'PLM 源数据快照通道认证凭证已过期 (HTTP 401 Unauthorized)',
        traceId: 'TRC-PLM-20260824-0019',
        hasExceptionCreated: true,
        linkedExceptionId: 'EX-20260824-009',
        techDetail: 'AuthenticationFailedException: IntePLM Gateway Token expired at 2026-08-24 23:00:00.'
      }
    ],
    timeline: [
      { step: '任务创建与调度', timestamp: '2026-08-24 23:10:00', status: 'DONE', description: '夜间人工补偿重试任务启动' },
      { step: '源数据分片抽取', timestamp: '2026-08-24 23:11:15', status: 'ERROR', description: 'PLM 网关认证失败，抽取中断' },
      { step: '对象模型清洗与写入', timestamp: '-', status: 'WAITING', description: '未进入写入阶段' },
      { step: '生成失败追溯单', timestamp: '2026-08-24 23:12:00', status: 'DONE', description: '全量失败记录已入库' },
      { step: '批次结束与触发核验', timestamp: '2026-08-24 23:12:05', status: 'DONE', description: '批次异常终止' }
    ]
  }
];

// 字段级比对差异（四类典型差异覆盖）
export const initialFieldDifferences: FieldDifference[] = [
  {
    id: 'DIFF-001',
    objectCode: 'P-00921',
    objectName: '精加工主轴滑动轴承座',
    objectType: 'Part',
    softType: '机械零件',
    fieldName: 'updatecount (数据版本号)',
    plmSourceValue: '17',
    mappedExpectedValue: '17',
    manticoreActualValue: '16',
    diffType: '版本滞后',
    result: 'MISMATCH'
  },
  {
    id: 'DIFF-002',
    objectCode: 'DOC-88310',
    objectName: '液压动力回路拓扑设计规范',
    objectType: 'Document',
    softType: '技术文档',
    fieldName: 'lifeCycleState (生命周期状态)',
    plmSourceValue: '已发布 (RELEASED)',
    mappedExpectedValue: 'RELEASED',
    manticoreActualValue: 'INWORK (工作阶段)',
    diffType: '状态不一致',
    result: 'MISMATCH'
  },
  {
    id: 'DIFF-003',
    objectCode: 'DOC-77402',
    objectName: '高压橡胶密封圈试验规范说明书',
    objectType: 'Document',
    softType: '技术文档',
    fieldName: 'documentContent (大文本正文)',
    plmSourceValue: '【第6版修订规范】高压密封件额定耐受压力提升至 42.5MPa，试验保压周期从 120min 延长至 180min，且环境温湿度需控制在标准公差内...',
    mappedExpectedValue: '【第6版修订规范】高压密封件额定耐受压力提升至 42.5MPa，试验保压周期从 120min 延长至 180min，且环境温湿度需控制在标准公差内...',
    manticoreActualValue: '【第5版旧规范】高压密封件额定耐受压力为 35.0MPa，保压周期 120min...',
    diffType: '大文本旧值',
    result: 'MISMATCH'
  },
  {
    id: 'DIFF-004',
    objectCode: 'PRC-3301',
    objectName: '主轴箱铸造及精密铣削工艺路线',
    objectType: 'Process',
    softType: '工艺路线',
    fieldName: 'processRecord (工艺索引实体)',
    plmSourceValue: '存在有效工艺主记录 (包含 14 道工序清单与刀具参数)',
    mappedExpectedValue: '存在有效工艺主记录 (包含 14 道工序清单与刀具参数)',
    manticoreActualValue: '未找到记录 (NULL)',
    diffType: 'Manticore 缺失记录',
    result: 'MISSING'
  },
  {
    id: 'DIFF-005',
    objectCode: 'P-00102',
    objectName: '六角头螺栓 M10x50 8.8级',
    objectType: 'Part',
    softType: '机械零件',
    fieldName: 'material (主要材质)',
    plmSourceValue: '35CrMo',
    mappedExpectedValue: '35CrMo',
    manticoreActualValue: '35CrMo',
    diffType: '正常匹配',
    result: 'MATCH'
  }
];

// 初始一致性核验记录（共 4 条记录）
export const initialVerificationRecords: VerificationRecord[] = [
  {
    id: 'CHK-20260825-001',
    linkedBatchId: 'SYNC-20260825-001',
    sourceSystem: 'IntePLM V21',
    objectsSummary: ['Part', 'Document', 'Process'],
    method: 'STANDARDIZED_HASH',
    methodLabel: '标准化哈希核验',
    sampleSize: 68450,
    integrityRate: 99.99,
    fieldConsistencyRate: 99.94,
    timelinessRate: 98.70,
    exceptionCount: 4,
    result: 'WARNING',
    executedAt: '2026-08-25 03:00:00',
    executor: '系统调度器 (AutoCheck)',
    strategyNotes: '采用 SHA-256 标准化哈希比对全量字段指纹，核验 PLM 源库与 Manticore 检索库多对象一致性。',
    objectDistributions: [
      { objectType: 'Part', softType: '机械零件', checkedCount: 31200, exceptionCount: 1, status: 'WARNING' },
      { objectType: 'Part', softType: '电子电气零件', checkedCount: 16800, exceptionCount: 0, status: 'PASSED' },
      { objectType: 'Document', softType: '技术文档', checkedCount: 12600, exceptionCount: 2, status: 'WARNING' },
      { objectType: 'Document', softType: '图纸', checkedCount: 5400, exceptionCount: 0, status: 'PASSED' },
      { objectType: 'Process', softType: '工艺路线', checkedCount: 2450, exceptionCount: 1, status: 'WARNING' }
    ],
    linkedExceptionIds: ['EX-20260825-001', 'EX-20260825-002', 'EX-20260825-003', 'EX-20260825-004'],
    fieldDifferences: initialFieldDifferences
  },
  {
    id: 'CHK-20260825-004',
    linkedBatchId: 'SYNC-20260825-004',
    sourceSystem: 'IntePLM V21',
    objectsSummary: ['Part', 'Document'],
    method: 'COUNT',
    methodLabel: '数量核验',
    sampleSize: 1320,
    integrityRate: 100,
    fieldConsistencyRate: 100,
    timelinessRate: 100,
    exceptionCount: 0,
    result: 'PASSED',
    executedAt: '2026-08-25 10:18:24',
    executor: '李晓华 (数据标准管理员)',
    strategyNotes: '核对批次抽取总量与 Manticore 写入总量，主键对齐比对无任何丢失。',
    objectDistributions: [
      { objectType: 'Part', softType: '机械零件', checkedCount: 890, exceptionCount: 0, status: 'PASSED' },
      { objectType: 'Document', softType: '技术文档', checkedCount: 430, exceptionCount: 0, status: 'PASSED' }
    ],
    linkedExceptionIds: [],
    fieldDifferences: []
  },
  {
    id: 'CHK-20260825-003',
    linkedBatchId: 'SYNC-20260825-003',
    sourceSystem: 'IntePLM V21',
    objectsSummary: ['Document'],
    method: 'RISK_TARGETED',
    methodLabel: '风险定向抽样',
    sampleSize: 120,
    integrityRate: 99.58,
    fieldConsistencyRate: 98.33,
    timelinessRate: 96.70,
    exceptionCount: 2,
    result: 'WARNING',
    executedAt: '2026-08-25 08:40:00',
    executor: '李晓华 (数据标准管理员)',
    strategyNotes: '定向针对状态变更频繁与包含长文本大字段的文档进行深度字段比对。',
    objectDistributions: [
      { objectType: 'Document', softType: '技术文档', checkedCount: 120, exceptionCount: 2, status: 'WARNING' }
    ],
    linkedExceptionIds: ['EX-20260825-002', 'EX-20260825-003'],
    fieldDifferences: initialFieldDifferences.filter(d => d.objectType === 'Document')
  },
  {
    id: 'CHK-20260824-006',
    linkedBatchId: 'SYNC-20260824-006',
    sourceSystem: 'IntePLM V21',
    objectsSummary: ['Part'],
    method: 'VERSION_UPDATECOUNT',
    methodLabel: '版本/updatecount 核验',
    sampleSize: 2800,
    integrityRate: 100,
    fieldConsistencyRate: 97.40,
    timelinessRate: 92.10,
    exceptionCount: 18,
    result: 'FAILED',
    executedAt: '2026-08-24 18:20:00',
    executor: '系统调度器 (AutoCheck)',
    strategyNotes: '核对零件版本 UpdateCount，发现 18 条记录存在索引落后于源库主数据的情况。',
    objectDistributions: [
      { objectType: 'Part', softType: '机械零件', checkedCount: 2800, exceptionCount: 18, status: 'FAILED' }
    ],
    linkedExceptionIds: ['EX-20260825-001'],
    fieldDifferences: [initialFieldDifferences[0]]
  }
];

// 初始异常处置列表（包含 4 类指定演示异常）
export const initialSyncExceptions: SyncException[] = [
  {
    id: 'EX-20260825-001',
    objectCode: 'P-00921',
    objectName: '精加工主轴滑动轴承座',
    objectType: 'Part',
    softType: '机械零件',
    exceptionType: 'VERSION_LAG',
    exceptionTypeLabel: '版本滞后',
    businessDescription: 'PLM 源库已升版至 updatecount=17，但 Manticore 检索库索引当前仍保留为 updatecount=16，导致二阶段相似度计算使用的是旧版物理尺寸。',
    sourceBatchId: 'SYNC-20260825-001',
    linkedVerificationId: 'CHK-20260825-001',
    severity: 'HIGH',
    status: 'PENDING',
    retryCount: 0,
    assignee: '李晓华 (数据标准管理员)',
    lastHandledTime: '2026-08-25 03:00:00',
    hasPermission: true,
    timeline: [
      {
        id: 'TL-101',
        node: '发现异常',
        timestamp: '2026-08-25 03:00:00',
        operator: '系统自动核验 (CHK-20260825-001)',
        note: '标准化哈希核验比对发现 updatecount 字段不一致 (PLM:17 vs Manticore:16)',
        result: 'INFO'
      }
    ]
  },
  {
    id: 'EX-20260825-002',
    objectCode: 'DOC-88310',
    objectName: '液压动力回路拓扑设计规范',
    objectType: 'Document',
    softType: '技术文档',
    exceptionType: 'STATUS_MISMATCH',
    exceptionTypeLabel: '状态不一致',
    businessDescription: '源系统状态显示为已发布 (RELEASED)，但 Manticore 索引仍为工作阶段 (INWORK)。经排查源端存在发布审核撤回并发操作，需业务人员确认最终有效状态。',
    sourceBatchId: 'SYNC-20260825-001',
    linkedVerificationId: 'CHK-20260825-001',
    severity: 'MEDIUM',
    status: 'PENDING_BUSINESS_CONFIRM',
    retryCount: 1,
    assignee: '王工 (液压设计室)',
    lastHandledTime: '2026-08-25 08:30:15',
    hasPermission: true,
    businessConfirmReason: 'PLM 流程记录显示该文档在发布后 3 分钟内曾被短暂转入补充评审，需确认是否以最终盖章版本为准。',
    timeline: [
      {
        id: 'TL-201',
        node: '发现异常',
        timestamp: '2026-08-25 03:00:00',
        operator: '系统自动核验 (CHK-20260825-001)',
        note: '字段核验发现状态枚举不一致 (源库: RELEASED vs 检索库: INWORK)',
        result: 'INFO'
      },
      {
        id: 'TL-202',
        node: '自动重试',
        timestamp: '2026-08-25 04:00:00',
        operator: '系统自动补偿器',
        note: '由于检测到并发加锁状态，自动重试同步跳过并转入人工复核',
        result: 'FAILED'
      },
      {
        id: 'TL-203',
        node: '待业务确认',
        timestamp: '2026-08-25 08:30:15',
        operator: '李晓华 (数据标准管理员)',
        note: '转交液压设计室王工确认最终有效文档发布版本',
        result: 'INFO'
      }
    ]
  },
  {
    id: 'EX-20260825-003',
    objectCode: 'DOC-77402',
    objectName: '高压橡胶密封圈试验规范说明书',
    objectType: 'Document',
    softType: '技术文档',
    exceptionType: 'TEXT_STALE',
    exceptionTypeLabel: '大文本旧值',
    businessDescription: '文档正文包含 12 万字试验数据及特殊字符，抽取写入时流式解析超时，当前索引仍为第 5 版旧文本。',
    sourceBatchId: 'SYNC-20260825-001',
    linkedVerificationId: 'CHK-20260825-001',
    severity: 'HIGH',
    status: 'PENDING',
    retryCount: 1,
    assignee: '李晓华 (数据标准管理员)',
    lastHandledTime: '2026-08-25 03:00:00',
    hasPermission: true,
    timeline: [
      {
        id: 'TL-301',
        node: '发现异常',
        timestamp: '2026-08-25 03:00:00',
        operator: '系统自动核验 (CHK-20260825-001)',
        note: '哈希指纹校验失败：正文内容文本校验值不匹配 (版本 6 vs 版本 5)',
        result: 'INFO'
      }
    ]
  },
  {
    id: 'EX-20260825-004',
    objectCode: 'PRC-3301',
    objectName: '主轴箱铸造及精密铣削工艺路线',
    objectType: 'Process',
    softType: '工艺路线',
    exceptionType: 'MANTICORE_MISSING',
    exceptionTypeLabel: 'Manticore 缺失记录',
    businessDescription: 'PLM 工艺库存在该主轴箱工艺主记录，但 Manticore 工艺专用索引中未查找到该实体。该对象需要工艺系统专用管理员角色进行补偿同步。',
    sourceBatchId: 'SYNC-20260825-001',
    linkedVerificationId: 'CHK-20260825-001',
    severity: 'MEDIUM',
    status: 'PENDING',
    retryCount: 0,
    assignee: '陈工艺 (工艺系统管理员)',
    lastHandledTime: '2026-08-25 03:00:00',
    hasPermission: false, // 明确无当前角色权限
    timeline: [
      {
        id: 'TL-401',
        node: '发现异常',
        timestamp: '2026-08-25 03:00:00',
        operator: '系统自动核验 (CHK-20260825-001)',
        note: '唯一键核验发现 Manticore 检索库索引主键 PRC-3301 不存在',
        result: 'INFO'
      }
    ]
  }
];
