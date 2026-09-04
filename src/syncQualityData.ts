/**
 * 一阶段：数据同步记录 - 初始演示数据
 * 遵循业务约束：只有根类型，无软类型，无版本概念，单条错误不终止同步
 * 数量口径完全自洽：同步总数 = 成功数 + 异常数 + 跳过数（运行中：正在处理 = 总数 - 成功 - 异常 - 跳过）
 */

import { SyncBatch } from './syncQualityTypes';

export const initialSyncBatches: SyncBatch[] = [
  // 1. 全量同步批次（三根类型覆盖，完成有少量异常与跳过数据）
  {
    id: 'SYNC-20260825-001',
    jobName: '全系统三根类型基准全量同步',
    rootTypes: ['Part', 'Document', 'Process'],
    syncMethod: 'FULL',
    triggerType: 'SCHEDULED',
    startTime: '2026-08-25 02:00:15',
    endTime: '2026-08-25 02:48:32',
    durationText: '48分17秒',
    sourceDataCount: 68450,
    successCount: 68423,
    failedCount: 3,
    skippedCount: 24, // 满足：68450 = 68423 + 3 + 24
    executionStatus: 'PARTIAL_SUCCESS',
    statusNote: '全量同步顺利完成大部分数据抽取与写入；跳过 24 条未发布数据，检测到 3 条数据存在字段校验或解析异常。',
    failedRecords: [
      {
        id: 'FAIL-001',
        recordKey: 'DOC-88310',
        rootType: 'Document',
        failedField: 'lifeCycleState',
        failureReason: '源系统状态发布时间戳存在时钟回拨，导致映射状态与目标索引状态不匹配',
        occurredAt: '2026-08-25 02:22:10',
        retryable: true,
        latestRetryResult: 'NONE',
        errorCode: 'SYNC_STATE_002',
        traceId: 'TRC-PLM-20260825-9921',
        errorCategory: 'STATUS_SYNC_ERROR',
        techDetail: 'StatusTransitionSyncWorker: Status conflict for entity DOC-88310. PLM version release state mismatch.',
        owner: '数据标准组'
      },
      {
        id: 'FAIL-002',
        recordKey: 'DOC-77402',
        rootType: 'Document',
        failedField: 'documentContent',
        failureReason: '文档正文大文本字段包含非标准控制字符，流式解析超时导致索引更新中断',
        occurredAt: '2026-08-25 02:31:45',
        retryable: true,
        latestRetryResult: 'NONE',
        errorCode: 'SYNC_PARSE_003',
        traceId: 'TRC-PLM-20260825-8834',
        errorCategory: 'STREAM_PARSE_TIMEOUT',
        techDetail: 'StreamTextParserException: Chunk delimiter timeout after 30000ms at offset 0x4F01A for DOC-77402.',
        owner: '数据清洗支持'
      },
      {
        id: 'FAIL-003',
        recordKey: 'DRW-55109',
        rootType: 'Document',
        failedField: 'drawing_frame_size',
        failureReason: '工程图幅尺寸参数在 Manticore 标准规范词表中未定义对应枚举 (CUSTOM_A0_EXT)',
        occurredAt: '2026-08-25 02:40:12',
        retryable: true,
        latestRetryResult: 'NONE',
        errorCode: 'SYNC_SCHEMA_005',
        traceId: 'TRC-PLM-20260825-7712',
        errorCategory: 'SCHEMA_VALIDATION',
        techDetail: 'SchemaMappingException: Target attribute "drawing_frame_size" lacks enumeration "CUSTOM_A0_EXT".',
        owner: '标准化管理员'
      }
    ],
    handlingNotes: [
      {
        id: 'NOTE-001',
        content: '已通知图纸管理部门确认 CUSTOM_A0_EXT 是否纳入下一批次标准图幅字典。',
        operator: '李晓华 (数据管理员)',
        createdAt: '2026-08-25 08:30:00'
      }
    ]
  },

  // 2. 零件增量同步批次（单条失败数据，执行完成后状态为 PARTIAL_SUCCESS）
  {
    id: 'SYNC-20260825-010',
    jobName: '零部件常规增量同步任务',
    rootTypes: ['Part'],
    syncMethod: 'INCREMENTAL',
    triggerType: 'SCHEDULED',
    startTime: '2026-08-25 02:00:15',
    endTime: '2026-08-25 02:48:32',
    durationText: '48分17秒',
    sourceDataCount: 1320,
    successCount: 1315,
    failedCount: 3,
    skippedCount: 2, // 满足：1320 = 1315 + 3 + 2
    executionStatus: 'PARTIAL_SUCCESS',
    statusNote: '零部件增量同步已完成；检测到 3 条引脚阵列枚举参数未通过字段验证，主任务继续完成其余 1,315 条数据写入。',
    failedRecords: [
      {
        id: 'FAIL-010',
        recordKey: 'P-00339',
        rootType: 'Part',
        failedField: 'pin_array_config',
        failureReason: '引脚阵列映射参数在目标 Schema 中未找到对应枚举 (BGA_256_EXT)',
        occurredAt: '2026-08-25 02:41:20',
        retryable: true,
        latestRetryResult: 'NONE',
        errorCode: 'SYNC_MAPPING_001',
        traceId: 'TRC-PLM-20260825-0101',
        errorCategory: 'SCHEMA_VALIDATION',
        techDetail: 'SchemaMappingException: Target attribute "pin_array_config" lacks enumeration "BGA_256_EXT".',
        owner: '李晓华 (数据管理员)'
      },
      {
        id: 'FAIL-011',
        recordKey: 'P-00412',
        rootType: 'Part',
        failedField: 'voltage_range',
        failureReason: '工作电压范围字段单位格式不合规，源数据缺少标称单位伏特(V)',
        occurredAt: '2026-08-25 02:42:05',
        retryable: true,
        latestRetryResult: 'NONE',
        errorCode: 'SYNC_UNIT_002',
        traceId: 'TRC-PLM-20260825-0102',
        errorCategory: 'UNIT_PARSE_ERROR',
        techDetail: 'UnitConversionException: Input string "12.0~24.0" missing standard volt unit suffix.',
        owner: '电气标准组'
      },
      {
        id: 'FAIL-012',
        recordKey: 'P-00508',
        rootType: 'Part',
        failedField: 'material',
        failureReason: '主要材质与当前物料所属分类属性约束冲突，源系统存在历史脏数据',
        occurredAt: '2026-08-25 02:43:18',
        retryable: false,
        latestRetryResult: 'NONE',
        errorCode: 'SYNC_ATTR_CONFLICT',
        traceId: 'TRC-PLM-20260825-0103',
        errorCategory: 'BUSINESS_CONFLICT',
        techDetail: 'BusinessConstraintViolation: Material "PTFE" incompatible with MetalPart classification.',
        owner: '物料规范组'
      }
    ],
    handlingNotes: []
  },

  // 3. 失败重试子批次（对 P-00339, P-00412 等执行重试，成功完成）
  {
    id: 'SYNC-20260825-010-R1',
    jobName: '零部件失败数据专项重试',
    rootTypes: ['Part'],
    syncMethod: 'INCREMENTAL',
    triggerType: 'RETRY',
    startTime: '2026-08-25 03:15:10',
    endTime: '2026-08-25 03:16:25',
    durationText: '1分15秒',
    sourceDataCount: 2,
    successCount: 2,
    failedCount: 0,
    skippedCount: 0, // 满足：2 = 2 + 0 + 0
    executionStatus: 'SUCCESS',
    statusNote: '重试批次对前序批次中 2 条可重试失败记录重新执行清洗与同步，全部写入成功。',
    failedRecords: [],
    handlingNotes: [
      {
        id: 'NOTE-002',
        content: '校准引脚阵列 Schema 枚举后发起定向重试，已成功写入索引。',
        operator: '李晓华 (数据管理员)',
        createdAt: '2026-08-25 03:18:00'
      }
    ]
  },

  // 4. 零件与文档增量批次（完全成功，无异常无跳过）
  {
    id: 'SYNC-20260825-004',
    jobName: '零部件与文档常规增量同步',
    rootTypes: ['Part', 'Document'],
    syncMethod: 'INCREMENTAL',
    triggerType: 'SCHEDULED',
    startTime: '2026-08-25 10:15:00',
    endTime: '2026-08-25 10:18:24',
    durationText: '3分24秒',
    sourceDataCount: 1320,
    successCount: 1320,
    failedCount: 0,
    skippedCount: 0, // 满足：1320 = 1320 + 0 + 0
    executionStatus: 'SUCCESS',
    statusNote: '批次执行完成，1,320 条变更记录全部成功清洗并写入 Manticore 检索库。',
    failedRecords: [],
    handlingNotes: []
  },

  // 5. 正在运行中批次（RUNNING，无结束时间，存在正在处理数量）
  {
    id: 'SYNC-20260825-005',
    jobName: '工艺路线专项增量同步',
    rootTypes: ['Process'],
    syncMethod: 'INCREMENTAL',
    triggerType: 'MANUAL',
    startTime: '2026-08-25 16:20:00',
    durationText: '已运行 8分15秒',
    sourceDataCount: 860,
    successCount: 524,
    failedCount: 0,
    skippedCount: 0, // 正在处理数 = 860 - 524 - 0 - 0 = 336
    executionStatus: 'RUNNING',
    statusNote: '任务正在分片抽取并写入工艺路线数据，当前进度 524/860，剩余 336 条正在处理中。',
    failedRecords: [],
    handlingNotes: []
  },

  // 6. 早间文档增量批次（跳过 64 条草稿文档，2 条校验异常）
  {
    id: 'SYNC-20260825-003',
    jobName: '技术文档早间增量同步',
    rootTypes: ['Document'],
    syncMethod: 'INCREMENTAL',
    triggerType: 'SCHEDULED',
    startTime: '2026-08-25 08:30:00',
    endTime: '2026-08-25 08:34:10',
    durationText: '4分10秒',
    sourceDataCount: 486,
    successCount: 420,
    failedCount: 2,
    skippedCount: 64, // 满足：486 = 420 + 2 + 64
    executionStatus: 'PARTIAL_SUCCESS',
    statusNote: '64 条处于草稿编辑态的文档自动合规跳过；420 条成功写入；2 条文档存在校验异常。',
    failedRecords: [
      {
        id: 'FAIL-004',
        recordKey: 'DOC-91002',
        rootType: 'Document',
        failedField: 'security_level',
        failureReason: '密级标签未通过合规性白名单校验 (INTERNAL_RESTRICTED)',
        occurredAt: '2026-08-25 08:32:15',
        retryable: true,
        latestRetryResult: 'NONE',
        errorCode: 'SYNC_SEC_001',
        traceId: 'TRC-PLM-20260825-6601',
        errorCategory: 'SECURITY_VALIDATION',
        techDetail: 'SecurityClassificationMismatch: Level "INTERNAL_RESTRICTED" not mapped in Manticore dictionary.',
        owner: '安全合规组'
      },
      {
        id: 'FAIL-005',
        recordKey: 'DOC-91008',
        rootType: 'Document',
        failedField: 'parent_part_id',
        failureReason: '关联零部件引用不存在 (外键断裂，引用的零部件尚未同步)',
        occurredAt: '2026-08-25 08:33:02',
        retryable: true,
        latestRetryResult: 'NONE',
        errorCode: 'SYNC_FK_002',
        traceId: 'TRC-PLM-20260825-6609',
        errorCategory: 'FOREIGN_KEY_MISSING',
        techDetail: 'ForeignKeyConstraintException: Parent part PART_ID_99011 not found in local index.',
        owner: '数据标准组'
      }
    ],
    handlingNotes: []
  },

  // 7. 历史零件增量批次（单条并发锁冲突导致 18 条更新异常）
  {
    id: 'SYNC-20260824-006',
    jobName: '零部件傍晚增量同步',
    rootTypes: ['Part'],
    syncMethod: 'INCREMENTAL',
    triggerType: 'SCHEDULED',
    startTime: '2026-08-24 18:15:00',
    endTime: '2026-08-24 18:19:45',
    durationText: '4分45秒',
    sourceDataCount: 2800,
    successCount: 2782,
    failedCount: 18,
    skippedCount: 0, // 满足：2800 = 2782 + 18 + 0
    executionStatus: 'PARTIAL_SUCCESS',
    statusNote: '增量批次完成 2,782 条写入；高频并发更新引起 18 条记录乐观锁冲突。',
    failedRecords: [
      {
        id: 'FAIL-007',
        recordKey: 'P-00921',
        rootType: 'Part',
        failedField: 'updatecount',
        failureReason: '高频并发版本更新引起乐观锁冲突，Manticore 索引未能获取到最新版本标记',
        occurredAt: '2026-08-24 18:18:22',
        retryable: true,
        latestRetryResult: 'NONE',
        errorCode: 'SYNC_LOCK_001',
        traceId: 'TRC-PLM-20260824-1801',
        errorCategory: 'LOCK_CONFLICT',
        techDetail: 'OptimisticLockingFailure: Version updatecount 17 conflict with cached index version 16.',
        owner: '李晓华 (数据管理员)'
      },
      {
        id: 'FAIL-008',
        recordKey: 'P-00925',
        rootType: 'Part',
        failedField: 'updatecount',
        failureReason: '源系统与目标索引在写入时发生版本更新锁抢占',
        occurredAt: '2026-08-24 18:18:30',
        retryable: true,
        latestRetryResult: 'NONE',
        errorCode: 'SYNC_LOCK_001',
        traceId: 'TRC-PLM-20260824-1805',
        errorCategory: 'LOCK_CONFLICT',
        techDetail: 'OptimisticLockingFailure: Simultaneous update conflict on record P-00925.',
        owner: '李晓华 (数据管理员)'
      },
      {
        id: 'FAIL-009',
        recordKey: 'P-00930',
        rootType: 'Part',
        failedField: 'updatecount',
        failureReason: '源系统与目标索引在写入时发生版本更新锁抢占',
        occurredAt: '2026-08-24 18:18:42',
        retryable: true,
        latestRetryResult: 'NONE',
        errorCode: 'SYNC_LOCK_001',
        traceId: 'TRC-PLM-20260824-1809',
        errorCategory: 'LOCK_CONFLICT',
        techDetail: 'OptimisticLockingFailure: Simultaneous update conflict on record P-00930.',
        owner: '李晓华 (数据管理员)'
      }
    ],
    handlingNotes: []
  },

  // 8. 任务级错误失败批次（FAILED：无法连接源系统，整个任务无法继续执行）
  {
    id: 'SYNC-20260824-009',
    jobName: '夜间零部件补偿同步',
    rootTypes: ['Part'],
    syncMethod: 'COMPENSATION',
    triggerType: 'MANUAL',
    startTime: '2026-08-24 23:10:00',
    endTime: '2026-08-24 23:12:05',
    durationText: '2分05秒',
    sourceDataCount: 12,
    successCount: 0,
    failedCount: 12,
    skippedCount: 0, // 满足：12 = 0 + 12 + 0
    executionStatus: 'FAILED',
    statusNote: '任务级错误：PLM 网关接口认证凭证已过期 (HTTP 401 Unauthorized)，无法建立连接，全批次未能读取和写入数据。',
    failedRecords: [
      {
        id: 'FAIL-006',
        recordKey: 'P-00811',
        rootType: 'Part',
        failedField: '全量连接通道',
        failureReason: '任务级网络/鉴权中断：PLM 源数据通道认证凭证已过期 (HTTP 401 Unauthorized)，导致批次无法读取数据',
        occurredAt: '2026-08-24 23:11:15',
        retryable: true,
        latestRetryResult: 'NONE',
        errorCode: 'SYNC_AUTH_401',
        traceId: 'TRC-PLM-20260824-0019',
        errorCategory: 'AUTH_EXPIRED',
        techDetail: 'AuthenticationFailedException: IntePLM Gateway Token expired at 2026-08-24 23:00:00. Connection refused.',
        owner: '网关运维组'
      }
    ],
    handlingNotes: [
      {
        id: 'NOTE-003',
        content: '网关运维已更新网关 Token 并在次日晨会前恢复连接。',
        operator: '系统支持',
        createdAt: '2026-08-25 00:30:00'
      }
    ]
  }
];
