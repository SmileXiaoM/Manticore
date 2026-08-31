/**
 * 一阶段：数据同步质量 - 初始演示数据
 * 严格按照 V0.1 与 2026-08-31 同步日志证据合同 (R8) 规范提供真实、自洽、多对象的演示数据
 */

import {
  SyncBatch,
  VerificationRecord,
  VerificationStatus,
  SyncException,
  FieldDifference
} from './syncQualityTypes';

// 字段级比对差异（四类典型差异覆盖 + 贯通示例差异）
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
    objectCode: 'DRW-55109',
    objectName: '主传动箱体结构装配图纸',
    objectType: 'Document',
    softType: '图纸',
    fieldName: 'drawing_frame_size (图幅尺寸)',
    plmSourceValue: 'CUSTOM_A0_EXT',
    mappedExpectedValue: 'A0_EXTENDED',
    manticoreActualValue: 'NULL (解析校验未通过)',
    diffType: 'Schema 校验失败',
    result: 'MISSING'
  },
  {
    id: 'DIFF-006',
    objectCode: 'DOC-91002',
    objectName: '电液伺服控制阀出厂检验大纲',
    objectType: 'Document',
    softType: '技术文档',
    fieldName: 'security_level (密级标签)',
    plmSourceValue: 'INTERNAL_RESTRICTED (内部受限)',
    mappedExpectedValue: 'RESTRICTED',
    manticoreActualValue: 'UNCLASSIFIED (未分级)',
    diffType: '状态不一致',
    result: 'MISMATCH'
  },
  {
    id: 'DIFF-007',
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
  },
  {
    id: 'DIFF-010',
    objectCode: 'P-00339',
    objectName: '车规级主控芯片封装总成',
    objectType: 'Part',
    softType: '电子电气零件',
    fieldName: 'pin_array_config (引脚阵列配置)',
    plmSourceValue: 'BGA_256_EXT',
    mappedExpectedValue: 'BGA_256_EXT',
    manticoreActualValue: 'NULL (解析校验未通过)',
    diffType: 'Schema 校验失败',
    result: 'MISSING'
  }
];

// 初始同步批次列表（包含全量多对象批次 SYNC-20260825-001，以及 R8 贯通增量任务 SYNC-20260825-010 及其重试子执行）
export const initialSyncBatches: SyncBatch[] = [
  // 1. 全量多对象基准批次
  {
    id: 'SYNC-20260825-001',
    executionId: 'SYNC-20260825-001',
    jobCode: 'FULL_SYSTEM_SYNC',
    triggerType: 'SCHEDULED',
    sourceSystem: 'IntePLM V21',
    objectsSummary: ['Part', 'Document', 'Process'],
    syncMethod: 'FULL',
    sourceSnapshotAt: '2026-08-25 02:00:00',
    objectMappingVersion: 'ALL-MAP-V21',
    fieldMappingVersion: 'GLOBAL-FIELD-V21',
    syncConfigVersion: 'SYNC-CFG-V5',
    configSnapshotId: 'CFG-SNAP-20260825-001',
    scheduledAt: '2026-08-25 02:00:00',
    startTime: '2026-08-25 02:00:15',
    endTime: '2026-08-25 02:48:32',
    durationSeconds: 2897,
    durationText: '48分17秒',
    sourceDataCount: 68450,
    insertedCount: 1000,
    updatedCount: 67379,
    deletedCount: 44,
    successCount: 68423,
    failedCount: 3,
    skippedCount: 24,
    reconciliation: {
      status: 'BALANCED',
      differenceCount: 0,
      formula: '68,450 = 68,423(成功) + 24(跳过) + 3(失败)'
    },
    lineage: {
      rootExecutionId: 'SYNC-20260825-001',
      attemptNo: 1,
      triggeredBy: '系统定时调度器'
    },
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
        errorCategory: 'STATUS_SYNC_ERROR',
        errorCode: 'SYNC_STATE_002',
        retryable: true,
        owner: '李晓华 (数据标准管理员)',
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
        errorCategory: 'STREAM_PARSE_TIMEOUT',
        errorCode: 'SYNC_PARSE_003',
        retryable: true,
        owner: '李晓华 (数据标准管理员)',
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
        errorCategory: 'SCHEMA_VALIDATION',
        errorCode: 'SYNC_SCHEMA_005',
        retryable: false,
        owner: '李晓华 (数据标准管理员)',
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

  // 2. R8 规范贯通增量同步批次 (具备 UPDATECOUNT 水位、快照与重试血缘)
  {
    id: 'SYNC-20260825-010',
    executionId: 'SYNC-20260825-010',
    jobCode: 'PART_INCREMENTAL_SYNC',
    triggerType: 'SCHEDULED',
    sourceSystem: 'IntePLM V21',
    objectsSummary: ['Part'],
    syncMethod: 'INCREMENTAL',
    dataWindowStart: '2026-08-25 01:00:00',
    dataWindowEnd: '2026-08-25 02:00:00',
    watermarkType: 'UPDATECOUNT',
    watermarkStart: '830120',
    watermarkEnd: '830998',
    objectMappingVersion: 'PART-MAP-V12',
    fieldMappingVersion: 'PART-FIELD-V12',
    syncConfigVersion: 'SYNC-CFG-V5',
    configSnapshotId: 'CFG-SNAP-20260825-001',
    scheduledAt: '2026-08-25 02:00:00',
    startTime: '2026-08-25 02:00:15',
    endTime: '2026-08-25 02:48:32',
    durationSeconds: 2897,
    durationText: '48分17秒',
    sourceDataCount: 1320,
    insertedCount: 57,
    updatedCount: 1258,
    deletedCount: 0,
    successCount: 1315,
    failedCount: 3,
    skippedCount: 2,
    reconciliation: {
      status: 'BALANCED',
      differenceCount: 0,
      formula: '1,320 = 1,315(成功) + 2(跳过) + 3(失败)'
    },
    lineage: {
      rootExecutionId: 'SYNC-20260825-010',
      attemptNo: 1,
      triggeredBy: '系统定时调度器'
    },
    executionStatus: 'PARTIAL_SUCCESS',
    verificationStatus: 'WARNING',
    linkedVerificationId: 'CHK-20260825-010',
    statusNote: '零件增量执行完成；发现 3 条引脚阵列枚举不一致失败记录，已生成重试子批次。',
    objectDetails: [
      {
        objectType: 'Part',
        softType: '机械零件',
        extractedCount: 890,
        insertedCount: 40,
        updatedCount: 848,
        deletedCount: 0,
        failedCount: 1,
        skippedCount: 1,
        status: 'PARTIAL_SUCCESS'
      },
      {
        objectType: 'Part',
        softType: '电子电气零件',
        extractedCount: 430,
        insertedCount: 17,
        updatedCount: 410,
        deletedCount: 0,
        failedCount: 2,
        skippedCount: 1,
        status: 'PARTIAL_SUCCESS'
      }
    ],
    failedRecords: [
      {
        id: 'FAIL-010',
        objectCode: 'P-00339',
        objectType: 'Part',
        softType: '电子电气零件',
        businessReason: '引脚阵列映射参数在目标 Schema 中未找到对应枚举 (BGA_256_EXT)',
        traceId: 'TRC-PLM-20260825-0101',
        hasExceptionCreated: true,
        linkedExceptionId: 'EX-20260825-010',
        errorCategory: 'SCHEMA_VALIDATION',
        errorCode: 'SYNC_MAPPING_001',
        retryable: true,
        owner: '李晓华 (数据标准管理员)',
        techDetail: 'SchemaMappingException: Target attribute "pin_array_config" lacks enumeration "BGA_256_EXT".'
      }
    ],
    timeline: [
      { step: '任务创建与调度', timestamp: '2026-08-25 02:00:15', status: 'DONE', description: '零件增量定时同步启动，读取 UPDATECOUNT 水位 830120 -> 830998' },
      { step: '源数据分片抽取', timestamp: '2026-08-25 02:05:00', status: 'DONE', description: '抽取变更零件记录 1,320 条' },
      { step: '对象模型清洗与写入', timestamp: '2026-08-25 02:40:10', status: 'DONE', description: '成功写入 1,315 条，跳过 2 条，3 条写入失败' },
      { step: '生成失败追溯单', timestamp: '2026-08-25 02:45:20', status: 'DONE', description: '生成失败追溯单并关联质量异常 EX-20260825-010' },
      { step: '批次结束与触发核验', timestamp: '2026-08-25 02:48:32', status: 'DONE', description: '触发标准化哈希核验 CHK-20260825-010' }
    ]
  },

  // 3. R8 重试子执行批次 (指回 SYNC-20260825-010，attemptNo=2)
  {
    id: 'SYNC-20260825-010-R1',
    executionId: 'SYNC-20260825-010-R1',
    jobCode: 'PART_INCREMENTAL_SYNC',
    triggerType: 'RETRY',
    sourceSystem: 'IntePLM V21',
    objectsSummary: ['Part'],
    syncMethod: 'INCREMENTAL',
    dataWindowStart: '2026-08-25 01:00:00',
    dataWindowEnd: '2026-08-25 02:00:00',
    watermarkType: 'UPDATECOUNT',
    watermarkStart: '830120',
    watermarkEnd: '830998',
    objectMappingVersion: 'PART-MAP-V12',
    fieldMappingVersion: 'PART-FIELD-V12',
    syncConfigVersion: 'SYNC-CFG-V5',
    configSnapshotId: 'CFG-SNAP-20260825-001',
    scheduledAt: '2026-08-25 03:15:00',
    startTime: '2026-08-25 03:15:10',
    endTime: '2026-08-25 03:16:25',
    durationSeconds: 75,
    durationText: '1分15秒',
    sourceDataCount: 3,
    insertedCount: 0,
    updatedCount: 3,
    deletedCount: 0,
    successCount: 3,
    failedCount: 0,
    skippedCount: 0,
    reconciliation: {
      status: 'BALANCED',
      differenceCount: 0,
      formula: '3 = 3(成功) + 0(跳过) + 0(失败)'
    },
    lineage: {
      rootExecutionId: 'SYNC-20260825-010',
      parentExecutionId: 'SYNC-20260825-010',
      attemptNo: 2,
      triggeredBy: '李晓华 (数据标准管理员)',
      triggerReason: '校准引脚阵列 Schema 枚举后执行定向重试'
    },
    executionStatus: 'SUCCESS',
    verificationStatus: 'PASSED',
    linkedVerificationId: 'CHK-20260825-010-R1',
    statusNote: '重试子批次对原批次 3 条失败记录重新同步，全部成功完成。',
    objectDetails: [
      {
        objectType: 'Part',
        softType: '电子电气零件',
        extractedCount: 3,
        insertedCount: 0,
        updatedCount: 3,
        deletedCount: 0,
        failedCount: 0,
        skippedCount: 0,
        status: 'SUCCESS'
      }
    ],
    failedRecords: [],
    timeline: [
      { step: '任务创建与调度', timestamp: '2026-08-25 03:15:10', status: 'DONE', description: '针对父批次 SYNC-20260825-010 发起重试子执行' },
      { step: '源数据分片抽取', timestamp: '2026-08-25 03:15:30', status: 'DONE', description: '抽取 3 条未写入零件实体' },
      { step: '对象模型清洗与写入', timestamp: '2026-08-25 03:16:15', status: 'DONE', description: '全部写入成功' },
      { step: '批次结束与触发核验', timestamp: '2026-08-25 03:16:25', status: 'DONE', description: '重试执行完毕，完成核验 CHK-20260825-010-R1' }
    ]
  },

  // 4. 零件与文档增量批次
  {
    id: 'SYNC-20260825-004',
    executionId: 'SYNC-20260825-004',
    jobCode: 'PART_DOC_INCREMENTAL_SYNC',
    triggerType: 'SCHEDULED',
    sourceSystem: 'IntePLM V21',
    objectsSummary: ['Part', 'Document'],
    syncMethod: 'INCREMENTAL',
    dataWindowStart: '2026-08-25 09:00:00',
    dataWindowEnd: '2026-08-25 10:15:00',
    watermarkType: 'TIMESTAMP',
    watermarkStart: '2026-08-25 09:00:00',
    watermarkEnd: '2026-08-25 10:15:00',
    objectMappingVersion: 'PART-DOC-MAP-V11',
    fieldMappingVersion: 'GLOBAL-FIELD-V21',
    syncConfigVersion: 'SYNC-CFG-V5',
    configSnapshotId: 'CFG-SNAP-20260825-002',
    scheduledAt: '2026-08-25 10:15:00',
    startTime: '2026-08-25 10:15:00',
    endTime: '2026-08-25 10:18:24',
    durationSeconds: 204,
    durationText: '3分24秒',
    sourceDataCount: 1320,
    insertedCount: 57,
    updatedCount: 1263,
    deletedCount: 0,
    successCount: 1320,
    failedCount: 0,
    skippedCount: 0,
    reconciliation: {
      status: 'BALANCED',
      differenceCount: 0,
      formula: '1,320 = 1,320(成功) + 0(跳过) + 0(失败)'
    },
    lineage: {
      rootExecutionId: 'SYNC-20260825-004',
      attemptNo: 1,
      triggeredBy: '系统变更监听器'
    },
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

  // 5. 正在运行中批次 (RUNNING: 结束时间为 undefined，对账为 PENDING)
  {
    id: 'SYNC-20260825-005',
    executionId: 'SYNC-20260825-005',
    jobCode: 'PROCESS_INCREMENTAL_SYNC',
    triggerType: 'MANUAL',
    sourceSystem: 'IntePLM V21',
    objectsSummary: ['Process'],
    syncMethod: 'INCREMENTAL',
    dataWindowStart: '2026-08-25 15:00:00',
    dataWindowEnd: '2026-08-25 16:20:00',
    watermarkType: 'TIMESTAMP',
    watermarkStart: '2026-08-25 15:00:00',
    watermarkEnd: '2026-08-25 16:20:00',
    objectMappingVersion: 'PROCESS-MAP-V08',
    fieldMappingVersion: 'PROCESS-FIELD-V08',
    syncConfigVersion: 'SYNC-CFG-V5',
    configSnapshotId: 'CFG-SNAP-20260825-003',
    scheduledAt: '2026-08-25 16:20:00',
    startTime: '2026-08-25 16:20:00',
    durationText: '已运行 8分15秒',
    sourceDataCount: 860,
    insertedCount: 110,
    updatedCount: 414,
    deletedCount: 0,
    successCount: 524,
    failedCount: 0,
    skippedCount: 0,
    reconciliation: {
      status: 'PENDING',
      differenceCount: 0,
      explanation: '批次正在分片写入中 (当前 524/860)，待写入完毕后自动执行对账'
    },
    lineage: {
      rootExecutionId: 'SYNC-20260825-005',
      attemptNo: 1,
      triggeredBy: '李晓华 (数据标准管理员)'
    },
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

  // 6. 早间文档增量批次
  {
    id: 'SYNC-20260825-003',
    executionId: 'SYNC-20260825-003',
    jobCode: 'DOC_INCREMENTAL_SYNC',
    triggerType: 'SCHEDULED',
    sourceSystem: 'IntePLM V21',
    objectsSummary: ['Document'],
    syncMethod: 'INCREMENTAL',
    dataWindowStart: '2026-08-25 00:00:00',
    dataWindowEnd: '2026-08-25 08:30:00',
    watermarkType: 'TIMESTAMP',
    watermarkStart: '2026-08-25 00:00:00',
    watermarkEnd: '2026-08-25 08:30:00',
    objectMappingVersion: 'DOC-MAP-V10',
    fieldMappingVersion: 'GLOBAL-FIELD-V21',
    syncConfigVersion: 'SYNC-CFG-V5',
    configSnapshotId: 'CFG-SNAP-20260825-001',
    scheduledAt: '2026-08-25 08:30:00',
    startTime: '2026-08-25 08:30:00',
    endTime: '2026-08-25 08:34:10',
    durationSeconds: 250,
    durationText: '4分10秒',
    sourceDataCount: 486,
    insertedCount: 40,
    updatedCount: 380,
    deletedCount: 0,
    successCount: 420,
    failedCount: 2,
    skippedCount: 64,
    reconciliation: {
      status: 'BALANCED',
      differenceCount: 0,
      formula: '486 = 420(成功) + 64(跳过) + 2(失败)'
    },
    lineage: {
      rootExecutionId: 'SYNC-20260825-003',
      attemptNo: 1,
      triggeredBy: '系统定时调度器'
    },
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
        errorCategory: 'SECURITY_VALIDATION',
        errorCode: 'SYNC_SEC_001',
        retryable: true,
        owner: '李晓华 (数据标准管理员)',
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
        errorCategory: 'FOREIGN_KEY_MISSING',
        errorCode: 'SYNC_FK_002',
        retryable: true,
        owner: '李晓华 (数据标准管理员)',
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

  // 7. 8月24日历史增量批次 (包含版本 updatecount 滞后异常)
  {
    id: 'SYNC-20260824-006',
    executionId: 'SYNC-20260824-006',
    jobCode: 'PART_INCREMENTAL_SYNC',
    triggerType: 'SCHEDULED',
    sourceSystem: 'IntePLM V21',
    objectsSummary: ['Part'],
    syncMethod: 'INCREMENTAL',
    dataWindowStart: '2026-08-24 16:00:00',
    dataWindowEnd: '2026-08-24 18:15:00',
    watermarkType: 'UPDATECOUNT',
    watermarkStart: '792001',
    watermarkEnd: '794801',
    objectMappingVersion: 'PART-MAP-V11',
    fieldMappingVersion: 'GLOBAL-FIELD-V20',
    syncConfigVersion: 'SYNC-CFG-V4',
    configSnapshotId: 'CFG-SNAP-20260824-001',
    scheduledAt: '2026-08-24 18:15:00',
    startTime: '2026-08-24 18:15:00',
    endTime: '2026-08-24 18:19:45',
    durationSeconds: 285,
    durationText: '4分45秒',
    sourceDataCount: 2800,
    insertedCount: 120,
    updatedCount: 2662,
    deletedCount: 0,
    successCount: 2782,
    failedCount: 18,
    skippedCount: 0,
    reconciliation: {
      status: 'BALANCED',
      differenceCount: 0,
      formula: '2,800 = 2,782(成功) + 0(跳过) + 18(失败)'
    },
    lineage: {
      rootExecutionId: 'SYNC-20260824-006',
      attemptNo: 1,
      triggeredBy: '系统定时调度器'
    },
    executionStatus: 'PARTIAL_SUCCESS',
    verificationStatus: 'FAILED',
    linkedVerificationId: 'CHK-20260824-006',
    statusNote: '增量批次执行完成，但一致性核验发现 18 条零件版本 UpdateCount 滞后。',
    objectDetails: [
      {
        objectType: 'Part',
        softType: '机械零件',
        extractedCount: 2800,
        insertedCount: 120,
        updatedCount: 2662,
        deletedCount: 0,
        failedCount: 18,
        skippedCount: 0,
        status: 'PARTIAL_SUCCESS'
      }
    ],
    failedRecords: [
      {
        id: 'FAIL-007',
        objectCode: 'P-00921',
        objectType: 'Part',
        softType: '机械零件',
        businessReason: '高频并发版本更新引起锁冲突，Manticore 索引未能获取到最新版本 updatecount',
        traceId: 'TRC-PLM-20260824-1801',
        hasExceptionCreated: true,
        linkedExceptionId: 'EX-20260824-006',
        errorCategory: 'LOCK_CONFLICT',
        errorCode: 'SYNC_LOCK_001',
        retryable: true,
        owner: '李晓华 (数据标准管理员)',
        techDetail: 'OptimisticLockingFailure: Version updatecount 17 conflict with cached index version 16.'
      }
    ],
    timeline: [
      { step: '任务创建与调度', timestamp: '2026-08-24 18:15:00', status: 'DONE', description: '傍晚零件增量同步触发' },
      { step: '源数据分片抽取', timestamp: '2026-08-24 18:16:30', status: 'DONE', description: '抽取 2,800 条零件变更记录' },
      { step: '对象模型清洗与写入', timestamp: '2026-08-24 18:19:00', status: 'DONE', description: '完成写入 2,782 条，18 条由于并发冲突写入失败' },
      { step: '生成失败追溯单', timestamp: '2026-08-24 18:19:20', status: 'DONE', description: '生成异常并挂载追溯单' },
      { step: '批次结束与触发核验', timestamp: '2026-08-24 18:19:45', status: 'DONE', description: '触发版本 UpdateCount 核验 CHK-20260824-006' }
    ]
  },

  // 8. 8月24日夜间补偿失败批次 (保持独立来源与 UNCHECKED 状态)
  {
    id: 'SYNC-20260824-009',
    executionId: 'SYNC-20260824-009',
    jobCode: 'PART_COMPENSATION_JOB',
    triggerType: 'MANUAL_COMPENSATION',
    sourceSystem: 'IntePLM V21',
    objectsSummary: ['Part'],
    syncMethod: 'COMPENSATION',
    dataWindowStart: '2026-08-24 18:00:00',
    dataWindowEnd: '2026-08-24 23:00:00',
    watermarkType: 'UPDATECOUNT',
    watermarkStart: '794801',
    watermarkEnd: '794813',
    objectMappingVersion: 'PART-MAP-V11',
    fieldMappingVersion: 'GLOBAL-FIELD-V20',
    syncConfigVersion: 'SYNC-CFG-V4',
    configSnapshotId: 'CFG-SNAP-20260824-002',
    scheduledAt: '2026-08-24 23:10:00',
    startTime: '2026-08-24 23:10:00',
    endTime: '2026-08-24 23:12:05',
    durationSeconds: 125,
    durationText: '2分05秒',
    sourceDataCount: 12,
    insertedCount: 0,
    updatedCount: 0,
    deletedCount: 0,
    successCount: 0,
    failedCount: 12,
    skippedCount: 0,
    reconciliation: {
      status: 'BALANCED',
      differenceCount: 0,
      formula: '12 = 0(成功) + 0(跳过) + 12(失败)'
    },
    lineage: {
      rootExecutionId: 'SYNC-20260824-009',
      attemptNo: 1,
      triggeredBy: '李晓华 (数据标准管理员)',
      triggerReason: '针对夜间零件并发版本滞后发起的人工补偿'
    },
    executionStatus: 'FAILED',
    verificationStatus: 'UNCHECKED',
    statusNote: '补偿同步任务在尝试连接 PLM 历史快照视图时鉴权失败，全批次未完成写入，未触发核验。',
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
        objectCode: 'P-00811',
        objectType: 'Part',
        softType: '机械零件',
        businessReason: 'PLM 源数据快照通道认证凭证已过期 (HTTP 401 Unauthorized)',
        traceId: 'TRC-PLM-20260824-0019',
        hasExceptionCreated: true,
        linkedExceptionId: 'EX-20260824-009',
        errorCategory: 'AUTH_EXPIRED',
        errorCode: 'SYNC_AUTH_401',
        retryable: true,
        owner: '李晓华 (数据标准管理员)',
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

// 初始一致性核验记录（共 6 条记录，包含贯通增量批次核验与重试核验）
export const initialVerificationRecords: VerificationRecord[] = [
  // 1. 全量多对象核验
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
    exceptionCount: 5,
    result: 'WARNING',
    executedAt: '2026-08-25 03:00:00',
    executor: '系统调度器 (AutoCheck)',
    verificationScope: 'FULL_BATCH',
    strategyNotes: '采用 SHA-256 标准化哈希比对全量字段指纹，核验 PLM 源库与 Manticore 检索库多对象一致性。',
    objectDistributions: [
      { objectType: 'Part', softType: '机械零件', checkedCount: 31200, exceptionCount: 1, status: 'WARNING' },
      { objectType: 'Part', softType: '电子电气零件', checkedCount: 16800, exceptionCount: 0, status: 'PASSED' },
      { objectType: 'Document', softType: '技术文档', checkedCount: 12600, exceptionCount: 2, status: 'WARNING' },
      { objectType: 'Document', softType: '图纸', checkedCount: 5400, exceptionCount: 1, status: 'WARNING' },
      { objectType: 'Process', softType: '工艺路线', checkedCount: 2450, exceptionCount: 1, status: 'WARNING' }
    ],
    linkedExceptionIds: ['EX-20260825-001', 'EX-20260825-002', 'EX-20260825-003', 'EX-20260825-004', 'EX-20260825-005'],
    fieldDifferences: initialFieldDifferences.slice(0, 5)
  },

  // 2. 贯通增量批次核验
  {
    id: 'CHK-20260825-010',
    linkedBatchId: 'SYNC-20260825-010',
    sourceSystem: 'IntePLM V21',
    objectsSummary: ['Part'],
    method: 'STANDARDIZED_HASH',
    methodLabel: '标准化哈希核验',
    sampleSize: 1320,
    integrityRate: 99.77,
    fieldConsistencyRate: 99.77,
    timelinessRate: 100,
    exceptionCount: 1,
    result: 'WARNING',
    executedAt: '2026-08-25 03:00:00',
    executor: '系统调度器 (AutoCheck)',
    verificationScope: 'FULL_BATCH',
    strategyNotes: '核验增量批次 SYNC-20260825-010 的 1,320 条零件数据，发现 1 条引脚阵列 Schema 枚举不一致。',
    objectDistributions: [
      { objectType: 'Part', softType: '机械零件', checkedCount: 890, exceptionCount: 0, status: 'PASSED' },
      { objectType: 'Part', softType: '电子电气零件', checkedCount: 430, exceptionCount: 1, status: 'WARNING' }
    ],
    linkedExceptionIds: ['EX-20260825-010'],
    fieldDifferences: [initialFieldDifferences[7]]
  },

  // 3. 贯通增量重试子批次核验
  {
    id: 'CHK-20260825-010-R1',
    linkedBatchId: 'SYNC-20260825-010-R1',
    sourceSystem: 'IntePLM V21',
    objectsSummary: ['Part'],
    method: 'UNIQUE_KEY',
    methodLabel: '唯一键核验',
    sampleSize: 3,
    integrityRate: 100,
    fieldConsistencyRate: 100,
    timelinessRate: 100,
    exceptionCount: 0,
    result: 'PASSED',
    executedAt: '2026-08-25 03:17:00',
    executor: '李晓华 (数据标准管理员)',
    verificationScope: 'FULL_BATCH',
    strategyNotes: '重试子执行核验，3条失败记录已全部对齐写入目标索引。',
    objectDistributions: [
      { objectType: 'Part', softType: '电子电气零件', checkedCount: 3, exceptionCount: 0, status: 'PASSED' }
    ],
    linkedExceptionIds: [],
    fieldDifferences: []
  },

  // 4. 零件与文档增量批次核验
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
    verificationScope: 'FULL_BATCH',
    strategyNotes: '核对批次抽取总量与 Manticore 写入总量，主键对齐比对无任何丢失。',
    objectDistributions: [
      { objectType: 'Part', softType: '机械零件', checkedCount: 890, exceptionCount: 0, status: 'PASSED' },
      { objectType: 'Document', softType: '技术文档', checkedCount: 430, exceptionCount: 0, status: 'PASSED' }
    ],
    linkedExceptionIds: [],
    fieldDifferences: []
  },

  // 5. 文档定向风险核验
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
    verificationScope: 'FULL_BATCH',
    strategyNotes: '定向针对状态变更频繁与包含长文本大字段的文档进行深度字段比对。',
    objectDistributions: [
      { objectType: 'Document', softType: '技术文档', checkedCount: 120, exceptionCount: 2, status: 'WARNING' }
    ],
    linkedExceptionIds: ['EX-20260825-006', 'EX-20260825-007'],
    fieldDifferences: initialFieldDifferences.filter(d => d.objectType === 'Document')
  },

  // 6. 8月24日 UpdateCount 版本核验
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
    verificationScope: 'FULL_BATCH',
    strategyNotes: '核对零件版本 UpdateCount，发现 18 条记录存在索引落后于源库主数据的情况。',
    objectDistributions: [
      { objectType: 'Part', softType: '机械零件', checkedCount: 2800, exceptionCount: 18, status: 'FAILED' }
    ],
    linkedExceptionIds: ['EX-20260824-006'],
    fieldDifferences: [initialFieldDifferences[0]]
  }
];

// 集中批次状态派生函数 (R1)
export const deriveBatchVerificationStatus = (
  batch: SyncBatch,
  allVerifications: VerificationRecord[],
  allExceptions: SyncException[]
): { verificationStatus: VerificationStatus; linkedVerificationId?: string } => {
  // 查找属于本批次的所有核验单
  const batchVerifications = allVerifications.filter(v => v.linkedBatchId === batch.id);

  // 区分整批核验与定向/部分对象核验
  const fullBatchVerifications = batchVerifications.filter(
    v => v.verificationScope === 'FULL_BATCH' || (!v.verificationScope && v.linkedExceptionIds.length === 0)
  );

  const latestFullVer = fullBatchVerifications[0] || null;
  const latestOverallVer = batchVerifications[0] || null;

  // 检查本批次未关闭的异常单
  const batchExceptions = allExceptions.filter(e => e.sourceBatchId === batch.id);
  const unresolvedExceptions = batchExceptions.filter(
    e => e.status !== 'CLOSED' && e.status !== 'RECOVERED'
  );

  // 1. 如果该批次从未发起任何核验
  if (batchVerifications.length === 0) {
    return {
      verificationStatus: batch.verificationStatus || 'UNCHECKED',
      linkedVerificationId: batch.linkedVerificationId
    };
  }

  // 2. 最新整批核验正在核验比对中 (CHECKING)
  if (latestFullVer && latestFullVer.result === 'CHECKING') {
    return {
      verificationStatus: 'CHECKING',
      linkedVerificationId: latestFullVer.id
    };
  }

  // 3. 若存在任何未关闭的异常单，整批严禁显示为“通过”
  if (unresolvedExceptions.length > 0) {
    const baseStatus: VerificationStatus = latestFullVer?.result === 'FAILED' ? 'FAILED' : 'WARNING';
    return {
      verificationStatus: baseStatus,
      // 保持主核验单/整批核验单 ID，定向核验单不覆盖批次主核验
      linkedVerificationId: latestFullVer?.id || batch.linkedVerificationId || latestOverallVer?.id
    };
  }

  // 4. 若不存在未关闭异常单，且存在整批核验单，使用最新整批核验单结果
  if (latestFullVer) {
    return {
      verificationStatus: latestFullVer.result,
      linkedVerificationId: latestFullVer.id
    };
  }

  // 5. 若仅存在部分对象范围核验 (OBJECT_SCOPE) 或定向核验 (EXCEPTION_TARGET)
  // 未覆盖整批时不得宣告整批通过
  return {
    verificationStatus: batch.verificationStatus === 'PASSED' ? (batchExceptions.length > 0 ? 'WARNING' : 'PASSED') : batch.verificationStatus,
    linkedVerificationId: batch.linkedVerificationId || latestOverallVer?.id
  };
};

// 初始异常处置列表（全网唯一、自洽且包含完整闭环状态与权限）
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
    latestReverificationStatus: 'UNCHECKED',
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
    latestReverificationStatus: 'UNCHECKED',
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
    latestReverificationStatus: 'UNCHECKED',
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
    latestReverificationStatus: 'UNCHECKED',
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
  },
  {
    id: 'EX-20260825-005',
    objectCode: 'DRW-55109',
    objectName: '主传动箱体结构装配图纸',
    objectType: 'Document',
    softType: '图纸',
    exceptionType: 'SCHEMA_VIOLATION',
    exceptionTypeLabel: 'Schema 校验失败',
    businessDescription: '图纸矢量元数据转换异常，图幅尺寸参数 "CUSTOM_A0_EXT" 未在 Manticore Schema 白名单枚举中，导致索引构建阶段被拦截。',
    sourceBatchId: 'SYNC-20260825-001',
    linkedVerificationId: 'CHK-20260825-001',
    latestReverificationStatus: 'UNCHECKED',
    severity: 'MEDIUM',
    status: 'PENDING',
    retryCount: 0,
    assignee: '李晓华 (数据标准管理员)',
    lastHandledTime: '2026-08-25 02:45:20',
    hasPermission: true,
    timeline: [
      {
        id: 'TL-501',
        node: '发现异常',
        timestamp: '2026-08-25 02:45:20',
        operator: '同步执行器 (SYNC-20260825-001)',
        note: '写入阶段捕获 SchemaValidationException: drawing_frame_size 枚举越界',
        result: 'INFO'
      }
    ]
  },
  {
    id: 'EX-20260825-010',
    objectCode: 'P-00339',
    objectName: '车规级主控芯片封装总成',
    objectType: 'Part',
    softType: '电子电气零件',
    exceptionType: 'SCHEMA_VIOLATION',
    exceptionTypeLabel: 'Schema 校验失败',
    businessDescription: '引脚阵列参数 "BGA_256_EXT" 缺失目标 Schema 枚举配置，导致写入被拦截。已通过重试子批次 SYNC-20260825-010-R1 完成补救，待复核确认。',
    sourceBatchId: 'SYNC-20260825-010',
    linkedVerificationId: 'CHK-20260825-010',
    latestReverificationStatus: 'PASSED',
    severity: 'HIGH',
    status: 'PENDING_REVIEW',
    retryCount: 1,
    assignee: '李晓华 (数据标准管理员)',
    lastHandledTime: '2026-08-25 03:16:25',
    hasPermission: true,
    timeline: [
      {
        id: 'TL-1001',
        node: '发现异常',
        timestamp: '2026-08-25 02:48:32',
        operator: '同步执行器 (SYNC-20260825-010)',
        note: '引脚阵列参数未通过 Schema 校验 (BGA_256_EXT)',
        result: 'INFO'
      },
      {
        id: 'TL-1002',
        node: '重新同步/补偿',
        timestamp: '2026-08-25 03:15:10',
        operator: '李晓华 (数据标准管理员)',
        note: '触发重试子执行批次 SYNC-20260825-010-R1',
        result: 'SUCCESS'
      },
      {
        id: 'TL-1003',
        node: '重新核验',
        timestamp: '2026-08-25 03:17:00',
        operator: '李晓华 (数据标准管理员)',
        note: '重新核验通过 (CHK-20260825-010-R1)',
        result: 'SUCCESS'
      }
    ]
  },
  {
    id: 'EX-20260825-006',
    objectCode: 'DOC-91002',
    objectName: '电液伺服控制阀出厂检验大纲',
    objectType: 'Document',
    softType: '技术文档',
    exceptionType: 'STATUS_MISMATCH',
    exceptionTypeLabel: '密级合规不一致',
    businessDescription: '密级标签 INTERNAL_RESTRICTED 未正确映射到检索安全字典，需要数据标准管理员校准密级字典并重新下发。',
    sourceBatchId: 'SYNC-20260825-003',
    linkedVerificationId: 'CHK-20260825-003',
    latestReverificationStatus: 'UNCHECKED',
    severity: 'HIGH',
    status: 'PENDING',
    retryCount: 0,
    assignee: '李晓华 (数据标准管理员)',
    lastHandledTime: '2026-08-25 08:33:45',
    hasPermission: true,
    timeline: [
      {
        id: 'TL-601',
        node: '发现异常',
        timestamp: '2026-08-25 08:33:45',
        operator: '同步执行器 (SYNC-20260825-003)',
        note: '密级标签未通过合规性白名单校验',
        result: 'INFO'
      }
    ]
  },
  {
    id: 'EX-20260825-007',
    objectCode: 'DOC-91008',
    objectName: '液压支架主阀体受力有限元分析报告',
    objectType: 'Document',
    softType: '技术文档',
    exceptionType: 'MANTICORE_MISSING',
    exceptionTypeLabel: '外键关联断裂',
    businessDescription: '该文档关联的母体零部件 PART_ID_99011 在 Manticore 检索库索引中不存在，导致关联外键约束校验拦截写入。',
    sourceBatchId: 'SYNC-20260825-003',
    linkedVerificationId: 'CHK-20260825-003',
    latestReverificationStatus: 'UNCHECKED',
    severity: 'MEDIUM',
    status: 'PENDING',
    retryCount: 0,
    assignee: '李晓华 (数据标准管理员)',
    lastHandledTime: '2026-08-25 08:33:45',
    hasPermission: true,
    timeline: [
      {
        id: 'TL-701',
        node: '发现异常',
        timestamp: '2026-08-25 08:33:45',
        operator: '同步执行器 (SYNC-20260825-003)',
        note: 'ForeignKeyConstraintException: Parent part PART_ID_99011 not found',
        result: 'INFO'
      }
    ]
  },
  {
    id: 'EX-20260824-006',
    objectCode: 'P-00921',
    objectName: '行星齿轮减速器箱体',
    objectType: 'Part',
    softType: '机械零件',
    exceptionType: 'VERSION_LAG',
    exceptionTypeLabel: '版本滞后',
    businessDescription: '高频并发版本更新引起乐观锁冲突，Manticore 检索库中 UpdateCount 为 16，PLM 源端已递增至 17。',
    sourceBatchId: 'SYNC-20260824-006',
    linkedVerificationId: 'CHK-20260824-006',
    latestReverificationStatus: 'UNCHECKED',
    severity: 'HIGH',
    status: 'PENDING',
    retryCount: 0,
    assignee: '李晓华 (数据标准管理员)',
    lastHandledTime: '2026-08-24 18:20:00',
    hasPermission: true,
    timeline: [
      {
        id: 'TL-801',
        node: '发现异常',
        timestamp: '2026-08-24 18:20:00',
        operator: '系统自动核验 (CHK-20260824-006)',
        note: 'UpdateCount 核验发现版本落后 (PLM:17 vs Manticore:16)',
        result: 'INFO'
      }
    ]
  },
  {
    id: 'EX-20260824-009',
    objectCode: 'P-00811',
    objectName: '主电机轴承端盖密封组件',
    objectType: 'Part',
    softType: '机械零件',
    exceptionType: 'ENCODING_ERROR',
    exceptionTypeLabel: '网关认证过期',
    businessDescription: '补偿同步任务在尝试连接 PLM 历史快照视图时鉴权 Token 过期，全批次未完成写入，需更新认证后重新同步。',
    sourceBatchId: 'SYNC-20260824-009',
    latestReverificationStatus: 'UNCHECKED',
    severity: 'HIGH',
    status: 'PENDING',
    retryCount: 0,
    assignee: '李晓华 (数据标准管理员)',
    lastHandledTime: '2026-08-24 23:12:00',
    hasPermission: true,
    timeline: [
      {
        id: 'TL-901',
        node: '发现异常',
        timestamp: '2026-08-24 23:12:00',
        operator: '同步执行器 (SYNC-20260824-009)',
        note: 'AuthenticationFailedException: IntePLM Gateway Token expired',
        result: 'FAILED'
      }
    ]
  }
];

// 统一基准演示参考时间：2026-08-25 16:30:00 (UTC+8)
export const DEMO_NOW = new Date('2026-08-25T16:30:00+08:00');

/**
 * 统一时间区间计算工具函数
 * @param dateStr 时间字符串，支持 "2026-08-25 02:00:15" 或 "刚刚 (2026-08-25 16:45)"
 * @param range 'ALL' | 'TODAY' | 'LAST_24H' | 'LAST_7D'
 */
export const checkTimeRange = (dateStr: string, range: string): boolean => {
  if (range === 'ALL') return true;
  if (!dateStr || dateStr === '-') return false;

  const match = dateStr.match(/\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(:\d{2})?/);
  if (!match) return false;

  const normalizedStr = match[0].replace(' ', 'T') + (match[0].length === 16 ? ':00+08:00' : '+08:00');
  const targetTime = new Date(normalizedStr).getTime();
  if (isNaN(targetTime)) return false;

  const demoNowTime = DEMO_NOW.getTime();

  if (range === 'TODAY') {
    const todayStart = new Date('2026-08-25T00:00:00+08:00').getTime();
    return targetTime >= todayStart && targetTime <= demoNowTime + 2 * 3600 * 1000;
  }

  if (range === 'LAST_24H') {
    const last24hStart = demoNowTime - 24 * 3600 * 1000; // 2026-08-24 16:30:00
    return targetTime >= last24hStart && targetTime <= demoNowTime + 2 * 3600 * 1000;
  }

  if (range === 'LAST_7D') {
    const last7dStart = demoNowTime - 7 * 24 * 3600 * 1000; // 2026-08-18 16:30:00
    return targetTime >= last7dStart && targetTime <= demoNowTime + 2 * 3600 * 1000;
  }

  return true;
};

// 严密数据完整性、日志证据合同与追溯双向自检工具 (R8 增补)
export const validateDataIntegrity = (
  batches: SyncBatch[],
  verifications: VerificationRecord[],
  exceptions: SyncException[]
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const batchMap = new Map(batches.map(b => [b.id, b]));
  const verMap = new Map(verifications.map(v => [v.id, v]));
  const exMap = new Map(exceptions.map(e => [e.id, e]));

  // 1. 全局 ID 唯一性与 executionId 单一事实来源
  const allIds = [...batches.map(b => b.id), ...verifications.map(v => v.id), ...exceptions.map(e => e.id)];
  const duplicateIds = allIds.filter((id, index) => allIds.indexOf(id) !== index);
  if (duplicateIds.length > 0) {
    errors.push(`检测到全局重复 ID: ${Array.from(new Set(duplicateIds)).join(', ')}`);
  }

  // 2. 检查批次日志证据合同与数量对账
  batches.forEach(b => {
    if (b.executionId && b.executionId !== b.id) {
      errors.push(`批次 ${b.id} 的 executionId (${b.executionId}) 与 id 不一致`);
    }

    if (!b.configSnapshotId) {
      errors.push(`批次 ${b.id} 缺少不可变配置快照编号 configSnapshotId`);
    }

    // 时间合同校验
    if (b.executionStatus === 'RUNNING') {
      if (b.endTime) {
        errors.push(`运行中批次 ${b.id} 不得包含结束时间 endTime`);
      }
    } else {
      if (!b.endTime) {
        errors.push(`结束态批次 ${b.id} 必须包含结束时间 endTime`);
      }
    }

    // 数量对账公式校验: extractedCount = successCount + skippedCount + failedCount
    const calculatedExtracted = b.successCount + b.skippedCount + b.failedCount;
    if (b.sourceDataCount !== calculatedExtracted) {
      errors.push(`批次 ${b.id} 数量对账不成立: 抽取数 ${b.sourceDataCount} != 成功数 ${b.successCount} + 跳过数 ${b.skippedCount} + 失败数 ${b.failedCount}`);
    }

    // successCount = inserted + updated + deleted
    const calculatedSuccess = b.insertedCount + b.updatedCount + b.deletedCount;
    if (b.successCount !== calculatedSuccess) {
      errors.push(`批次 ${b.id} 成功数对账不成立: 成功数 ${b.successCount} != 新增 ${b.insertedCount} + 更新 ${b.updatedCount} + 删除 ${b.deletedCount}`);
    }

    // 对象级数量明细对账校验
    b.objectDetails.forEach(od => {
      const odSuccess = od.insertedCount + od.updatedCount + od.deletedCount;
      if (od.extractedCount !== odSuccess + od.skippedCount + od.failedCount) {
        errors.push(`批次 ${b.id} 对象明细 (${od.objectType}/${od.softType}) 数量不自洽: 抽取 ${od.extractedCount} != (成功 ${odSuccess} + 跳过 ${od.skippedCount} + 失败 ${od.failedCount})`);
      }
    });

    // 重试血缘校验
    if (b.lineage?.parentExecutionId) {
      const parentBatch = batchMap.get(b.lineage.parentExecutionId);
      if (!parentBatch) {
        errors.push(`批次 ${b.id} 的重试父批次 ${b.lineage.parentExecutionId} 不存在`);
      }
      if (b.lineage.attemptNo <= 1) {
        errors.push(`批次 ${b.id} 存在父批次，但 attemptNo (${b.lineage.attemptNo}) 未递增`);
      }
    }

    // 核验关联与失败记录
    if (b.linkedVerificationId) {
      const targetVer = verMap.get(b.linkedVerificationId);
      if (!targetVer) {
        errors.push(`批次 ${b.id} 引用的核验单 ${b.linkedVerificationId} 不存在`);
      } else if (targetVer.linkedBatchId !== b.id) {
        errors.push(`批次 ${b.id} 指向核验单 ${targetVer.id}，但核验单的 linkedBatchId 为 ${targetVer.linkedBatchId}，存在矛盾`);
      }
    }

    b.failedRecords.forEach(fr => {
      if (fr.hasExceptionCreated && fr.linkedExceptionId) {
        const targetEx = exMap.get(fr.linkedExceptionId);
        if (!targetEx) {
          errors.push(`批次 ${b.id} 失败记录引用的异常 ${fr.linkedExceptionId} 不存在`);
        } else if (targetEx.sourceBatchId !== b.id) {
          errors.push(`批次 ${b.id} 失败记录引用的异常 ${fr.linkedExceptionId} 其 sourceBatchId 为 ${targetEx.sourceBatchId}，来源不一致`);
        }
      }
      // 脱敏与凭据检查
      if (fr.techDetail && /bearer|password|secret|token.*=|\/\/.*:.*@/i.test(fr.techDetail)) {
        errors.push(`批次 ${b.id} 失败记录 ${fr.id} 的技术详情疑似包含敏感凭据信息`);
      }
    });

    // 批次显示“通过”时不存在未关闭异常
    if (b.verificationStatus === 'PASSED') {
      const batchExceptions = exceptions.filter(e => e.sourceBatchId === b.id);
      const unresolved = batchExceptions.filter(e => e.status !== 'CLOSED' && e.status !== 'RECOVERED');
      if (unresolved.length > 0) {
        errors.push(`批次 ${b.id} 核验状态为“通过”，但存在未关闭异常 (${unresolved.map(u => u.id).join(', ')})`);
      }
    }
  });

  // 3. 检查核验单引用的批次和异常
  verifications.forEach(v => {
    const targetBatch = batchMap.get(v.linkedBatchId);
    if (!targetBatch) {
      errors.push(`核验单 ${v.id} 引用的批次 ${v.linkedBatchId} 不存在`);
    } else {
      const invalidObjects = v.objectsSummary.filter(obj => !targetBatch.objectsSummary.includes(obj));
      if (invalidObjects.length > 0) {
        errors.push(`核验单 ${v.id} 对象范围 ${invalidObjects.join(', ')} 超出关联批次 ${targetBatch.id} 的对象范围`);
      }
    }

    v.linkedExceptionIds.forEach(exId => {
      const targetEx = exMap.get(exId);
      if (!targetEx) {
        errors.push(`核验单 ${v.id} 引用的异常单 ${exId} 不存在`);
      } else if (targetEx.sourceBatchId !== v.linkedBatchId) {
        errors.push(`核验单 ${v.id} 所属批次为 ${v.linkedBatchId}，但引用的异常单 ${exId} 来源批次为 ${targetEx.sourceBatchId}，违反唯一来源原则`);
      }
    });
  });

  // 4. 检查异常单引用的批次和核验单
  exceptions.forEach(e => {
    const targetBatch = batchMap.get(e.sourceBatchId);
    if (!targetBatch) {
      errors.push(`异常单 ${e.id} 引用的来源批次 ${e.sourceBatchId} 不存在`);
    }
    if (e.linkedVerificationId) {
      const targetVer = verMap.get(e.linkedVerificationId);
      if (!targetVer) {
        errors.push(`异常单 ${e.id} 引用的核验单 ${e.linkedVerificationId} 不存在`);
      } else if (targetVer.linkedBatchId !== e.sourceBatchId) {
        errors.push(`异常单 ${e.id} 来源批次为 ${e.sourceBatchId}，但引用的核验单 ${targetVer.id} 属于批次 ${targetVer.linkedBatchId}，存在跨批次错乱`);
      }
    }
    if (e.status === 'CLOSED') {
      if (!e.closeConclusion) {
        errors.push(`已关闭异常 ${e.id} 缺少 closeConclusion 关闭结论留痕`);
      }
      const hasCloseNode = e.timeline.some(t => t.node === '已关闭' || t.node === '复核关闭' || t.node === '复核通过并关闭');
      if (!hasCloseNode) {
        errors.push(`已关闭异常 ${e.id} 时间线缺少关闭节点`);
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
};
