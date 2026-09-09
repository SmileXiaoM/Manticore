/**
 * 一阶段：对象与字段映射配置 - 核心模拟数据与快照
 * 遵循最新根类型口径与无生效配置版本模型
 */

import {
  SourceSystemInfo,
  MappingObjectType,
  SourceFieldMeta,
  FieldMappingItem,
  QueryBaseSnapshot,
  Stage1PreviewRecord,
  SyncErrorRecord
} from './stage1MappingTypes';

// 1. 来源系统适配器
export const initialSourceSystems: SourceSystemInfo[] = [
  {
    id: 'PLM_WINCHILL',
    name: 'Windchill PLM 核心系统',
    code: 'Windchill_Prod',
    version: '12.1.2-M030',
    type: 'PLM',
    status: 'ONLINE',
    description: '企业统一产品数据管理中心，承载 Part、Document、Process 等核心元数据'
  },
  {
    id: 'SAP_ERP',
    name: 'SAP S/4 HANA',
    code: 'SAP_ERP_P01',
    version: '2023 FPS02',
    type: 'ERP',
    status: 'ONLINE',
    description: '物料主数据与价格库存系统'
  }
];

// 2. 根类型配置总表 (严格按 Part, Document, Process 三个根类型，每个一行)
export const initialMappingObjectTypes: MappingObjectType[] = [
  {
    id: 'PART',
    code: 'Part',
    name: '零部件 (Part)',
    sourceSystemId: 'PLM_WINCHILL',
    sourceSystemName: 'Windchill PLM 核心系统',
    description: '工程物料、标准件、电子元器件及装配体根对象',
    configuredFieldCount: 5,
    formalQueryableFieldCount: 5,
    draftFieldCount: 2, // 1 个纯草稿 + 1 个已配置字段的草稿修改
    manticoreDocCount: 38400, // 当前 Manticore 检索底座中的索引记录总数
    configStatus: 'CONFIGURED_WITH_DRAFT',
    syncStatus: 'COMPLETED',
    accessEnabled: true,
    serviceStarted: true,
    pollingIntervalMinutes: 1,
    lastSyncedAt: '2026-08-28 14:35:12',
    lastSyncBatchId: 'BATCH-20260828-002',
    lastSyncSuccessCount: 38400,
    lastSyncErrorCount: 0,
    lastSyncErrorRecords: [],
    lastSyncExecutionStrategy: 'INCREMENTAL_REFRESH',
    lastSyncStrategyReason: '当前配置稳定且底座正常，基于最新变更水位执行日常增量刷新。',
    hasPendingSyncChanges: false
  },
  {
    id: 'DOCUMENT',
    code: 'Document',
    name: '文档 (Document)',
    sourceSystemId: 'PLM_WINCHILL',
    sourceSystemName: 'Windchill PLM 核心系统',
    description: '工程图纸、技术规范说明书及 CAD 模型设计文档',
    configuredFieldCount: 4,
    formalQueryableFieldCount: 4,
    draftFieldCount: 0,
    manticoreDocCount: 12480,
    configStatus: 'CONFIGURED',
    syncStatus: 'COMPLETED_WITH_ERRORS',
    accessEnabled: true,
    serviceStarted: true,
    pollingIntervalMinutes: 5,
    lastSyncedAt: '2026-08-22 11:20:00',
    lastSyncBatchId: 'BATCH-20260822-001',
    lastSyncSuccessCount: 12480,
    lastSyncErrorCount: 3,
    lastSyncExecutionStrategy: 'RETRY_COMPENSATION',
    lastSyncStrategyReason: '上一同步批次存在 3 条记录级异常，需针对异常数据执行补偿重试。',
    lastSyncErrorRecords: [
      {
        id: 'ERR-DOC-001',
        recordKey: 'DOC-SPEC-2026-0042',
        sourceSystemId: 'PLM_WINCHILL',
        rootTypeId: 'DOCUMENT',
        errorField: 'doc_version',
        errorCode: 'ERR_DATA_TRUNCATION',
        errorMsg: '源端字段值超出设定最大长度 (实际长度 128 > 目标定义 32)',
        rawPayloadSummary: '{"docNumber":"DOC-SPEC-2026-0042","version":"A.1.999-SPECIAL-TEST-EXTENDED-VERSION-LONG"}',
        timestamp: '2026-08-22 11:18:20',
        status: 'UNRESOLVED'
      },
      {
        id: 'ERR-DOC-002',
        recordKey: 'DOC-DWG-88102',
        sourceSystemId: 'PLM_WINCHILL',
        rootTypeId: 'DOCUMENT',
        errorField: 'sheet_size',
        errorCode: 'ERR_INVALID_ENUM',
        errorMsg: '未映射的枚举值 "A0_EXTENDED"，已跳过该行索引更新',
        rawPayloadSummary: '{"drawingNo":"DWG-88102","sheetSize":"A0_EXTENDED"}',
        timestamp: '2026-08-22 11:19:04',
        status: 'UNRESOLVED'
      },
      {
        id: 'ERR-DOC-003',
        recordKey: 'DOC-SPEC-2026-0199',
        sourceSystemId: 'PLM_WINCHILL',
        rootTypeId: 'DOCUMENT',
        errorField: 'doc_title',
        errorCode: 'ERR_CHARACTER_ENCODING',
        errorMsg: '源端特殊 UTF-8 字符无法解析为标量文本',
        rawPayloadSummary: '{"docNumber":"DOC-SPEC-2026-0199","docTitle":"\u0000\u001fTechnical Spec"}',
        timestamp: '2026-08-22 11:19:45',
        status: 'UNRESOLVED'
      }
    ],
    hasPendingSyncChanges: false
  },
  {
    id: 'PROCESS',
    code: 'Process',
    name: '工艺路线 (Process)',
    sourceSystemId: 'PLM_WINCHILL',
    sourceSystemName: 'Windchill PLM 核心系统',
    description: '制造工艺计划、工序工步及工装治具路线根对象',
    configuredFieldCount: 0,
    formalQueryableFieldCount: 0,
    draftFieldCount: 2,
    manticoreDocCount: 0,
    configStatus: 'DRAFTING',
    syncStatus: 'NOT_SYNCED',
    accessEnabled: false,
    serviceStarted: false,
    pollingIntervalMinutes: 30,
    lastSyncedAt: undefined,
    lastSyncBatchId: undefined,
    lastSyncSuccessCount: 0,
    lastSyncErrorCount: 0,
    lastSyncErrorRecords: [],
    lastSyncExecutionStrategy: 'INITIAL_REBUILD',
    lastSyncStrategyReason: '当前根类型未曾同步底座，需执行首次初始化全量构建。',
    hasPendingSyncChanges: false
  }
];

// 3. 各根类型的初始字段映射列表
export const initialFieldMappings: Record<string, FieldMappingItem[]> = {
  PART: [
    {
      id: 'MAP-P01',
      rootTypeId: 'PART',
      sourceSystemId: 'PLM_WINCHILL',
      sourceFieldKey: 'iba_part_number',
      sourceFieldName: 'partNumber',
      sourceDisplayName: '物料编码',
      sourceDataType: 'TEXT',
      sourceDataTypeLabel: '文本',
      manticoreField: 'part_number',
      manticoreType: 'STRING',
      displayTitle: '物料编码',
      displayType: 'LINK',
      hyperlinkConfig: {
        urlTemplate: 'https://plm.internal.corp/app/view?oid={oid}&type={otype}',
        oidSourceField: 'master_oid',
        otypeSourceField: 'object_type_code',
        displayTextSource: 'FIELD_VALUE',
        openTarget: '_blank',
        onMissingParam: 'HIDE_LINK_SHOW_TEXT'
      },
      queryCapability: 'QUERY_CONDITION',
      isQueryCondition: true,
      isSortable: true,
      isDisplayInResult: true,
      isFulltextSearch: false,
      isUniqueKey: true,
      defaultColumnWidth: 160,
      displayOrder: 1,

      defaultDisplayOrder: 1,
      configStatus: 'CONFIGURED',
      hasDraftModification: false,
      isDataImpactingChange: false,
      isInFormalQueryBase: true,
      updatedAt: '2026-08-28 14:20:00',
      updatedBy: '李晓华 (数据标准管理员)'
    },
    {
      id: 'MAP-P02',
      rootTypeId: 'PART',
      sourceSystemId: 'PLM_WINCHILL',
      sourceFieldKey: 'iba_part_name',
      sourceFieldName: 'partName',
      sourceDisplayName: '零件名称',
      sourceDataType: 'TEXT',
      sourceDataTypeLabel: '文本',
      manticoreField: 'part_name',
      manticoreType: 'STRING',
      displayTitle: '零件名称',
      displayType: 'CONDITION_QUERY',
      queryCapability: 'BOTH',
      isQueryCondition: true,
      isSortable: true,
      isDisplayInResult: true,
      isFulltextSearch: true,
      isUniqueKey: false,
      defaultColumnWidth: 200,
      displayOrder: 2,

      defaultDisplayOrder: 2,
      configStatus: 'CONFIGURED',
      hasDraftModification: true, // 存在草稿修改演示
      draftData: {
        displayTitle: '零件标准名称 (草稿优化)',
        queryCapability: 'QUERY_CONDITION',
        isFulltextSearch: false,
        isDataImpactingChange: true
      },
      isDataImpactingChange: false,
      isInFormalQueryBase: true,
      updatedAt: '2026-08-28 14:20:00',
      updatedBy: '李晓华 (数据标准管理员)'
    },
    {
      id: 'MAP-P03',
      rootTypeId: 'PART',
      sourceSystemId: 'PLM_WINCHILL',
      sourceFieldKey: 'iba_material',
      sourceFieldName: 'material',
      sourceDisplayName: '主要材质',
      sourceDataType: 'TEXT',
      sourceDataTypeLabel: '文本',
      manticoreField: 'material',
      manticoreType: 'STRING',
      displayTitle: '主要材质',
      displayType: 'CONDITION_QUERY',
      queryCapability: 'QUERY_CONDITION',
      isQueryCondition: true,
      isSortable: false,
      isDisplayInResult: true,
      isFulltextSearch: false,
      isUniqueKey: false,
      defaultColumnWidth: 140,
      displayOrder: 3,

      defaultDisplayOrder: 3,
      configStatus: 'CONFIGURED',
      hasDraftModification: false,
      isDataImpactingChange: false,
      isInFormalQueryBase: true,
      updatedAt: '2026-08-28 14:20:00',
      updatedBy: '李晓华 (数据标准管理员)'
    },
    {
      id: 'MAP-P04',
      rootTypeId: 'PART',
      sourceSystemId: 'PLM_WINCHILL',
      sourceFieldKey: 'iba_nominal_diameter',
      sourceFieldName: 'nominalDiameter',
      sourceDisplayName: '公称直径',
      sourceDataType: 'NUMERIC_WITH_UNIT',
      sourceDataTypeLabel: '带单位数值',
      unitFamily: '长度 (Length)',
      defaultUnit: 'mm',
      manticoreField: 'nominal_diameter_mm',
      manticoreType: 'FLOAT',
      displayTitle: '公称直径 (mm)',
      displayType: 'CONDITION_QUERY',
      queryCapability: 'QUERY_CONDITION',
      isQueryCondition: true,
      isSortable: true,
      isDisplayInResult: true,
      isFulltextSearch: false,
      isUniqueKey: false,
      defaultColumnWidth: 130,
      displayOrder: 4,

      defaultDisplayOrder: 4,
      configStatus: 'CONFIGURED',
      hasDraftModification: false,
      isDataImpactingChange: false,
      isInFormalQueryBase: true,
      updatedAt: '2026-08-28 14:20:00',
      updatedBy: '李晓华 (数据标准管理员)'
    },
    {
      id: 'MAP-P05',
      rootTypeId: 'PART',
      sourceSystemId: 'PLM_WINCHILL',
      sourceFieldKey: 'iba_classification_path',
      sourceFieldName: 'classificationPath',
      sourceDisplayName: '分类路径',
      sourceDataType: 'CATEGORY_TREE',
      sourceDataTypeLabel: '分类树',
      manticoreField: 'category_path',
      manticoreType: 'STRING',
      displayTitle: '物料分类树路径',
      displayType: 'CATEGORY_PATH',
      queryCapability: 'QUERY_CONDITION',
      isQueryCondition: true,
      isSortable: false,
      isDisplayInResult: true,
      isFulltextSearch: false,
      isUniqueKey: false,
      defaultColumnWidth: 220,
      displayOrder: 5,

      defaultDisplayOrder: 5,
      configStatus: 'CONFIGURED',
      hasDraftModification: false,
      isDataImpactingChange: false,
      isInFormalQueryBase: true,
      updatedAt: '2026-08-28 14:20:00',
      updatedBy: '李晓华 (数据标准管理员)'
    },
    // 纯草稿字段演示
    {
      id: 'MAP-P06-DRAFT',
      rootTypeId: 'PART',
      sourceSystemId: 'PLM_WINCHILL',
      sourceFieldKey: 'iba_surface_treatment',
      sourceFieldName: 'surfaceTreatment',
      sourceDisplayName: '表面处理工艺',
      sourceDataType: 'ENUM',
      sourceDataTypeLabel: '枚举',
      manticoreField: 'surface_treatment',
      manticoreType: 'STRING',
      displayTitle: '表面处理',
      displayType: 'ENUM_BADGE',
      queryCapability: 'QUERY_CONDITION',
      isQueryCondition: true,
      isSortable: false,
      isDisplayInResult: true,
      isFulltextSearch: false,
      isUniqueKey: false,
      defaultColumnWidth: 150,
      displayOrder: 6,

      defaultDisplayOrder: 6,
      configStatus: 'DRAFT',
      hasDraftModification: false,
      isDataImpactingChange: true,
      isInFormalQueryBase: false,
      updatedAt: '2026-09-02 10:15:00',
      updatedBy: '张强 (工艺工程师)'
    }
  ],
  DOCUMENT: [
    {
      id: 'MAP-D01',
      rootTypeId: 'DOCUMENT',
      sourceSystemId: 'PLM_WINCHILL',
      sourceFieldKey: 'iba_doc_number',
      sourceFieldName: 'docNumber',
      sourceDisplayName: '文档编号',
      sourceDataType: 'TEXT',
      sourceDataTypeLabel: '文本',
      manticoreField: 'doc_number',
      manticoreType: 'STRING',
      displayTitle: '文档编号',
      displayType: 'LINK',
      hyperlinkConfig: {
        urlTemplate: 'https://plm.internal.corp/app/document/view?oid={oid}&type={otype}',
        oidSourceField: 'master_oid',
        otypeSourceField: 'object_type_code',
        displayTextSource: 'FIELD_VALUE',
        openTarget: '_blank',
        onMissingParam: 'HIDE_LINK_SHOW_TEXT'
      },
      queryCapability: 'QUERY_CONDITION',
      isQueryCondition: true,
      isSortable: true,
      isDisplayInResult: true,
      isFulltextSearch: false,
      isUniqueKey: true,
      defaultColumnWidth: 160,
      displayOrder: 1,

      defaultDisplayOrder: 1,
      configStatus: 'CONFIGURED',
      hasDraftModification: false,
      isDataImpactingChange: false,
      isInFormalQueryBase: true,
      updatedAt: '2026-08-22 11:00:00',
      updatedBy: '陈琳 (文档管理员)'
    },
    {
      id: 'MAP-D02',
      rootTypeId: 'DOCUMENT',
      sourceSystemId: 'PLM_WINCHILL',
      sourceFieldKey: 'iba_doc_title',
      sourceFieldName: 'docTitle',
      sourceDisplayName: '文档标题',
      sourceDataType: 'TEXT',
      sourceDataTypeLabel: '文本',
      manticoreField: 'doc_title',
      manticoreType: 'STRING',
      displayTitle: '文档中文标题',
      displayType: 'CONDITION_QUERY',
      queryCapability: 'BOTH',
      isQueryCondition: true,
      isSortable: true,
      isDisplayInResult: true,
      isFulltextSearch: true,
      isUniqueKey: false,
      defaultColumnWidth: 240,
      displayOrder: 2,

      defaultDisplayOrder: 2,
      configStatus: 'CONFIGURED',
      hasDraftModification: false,
      isDataImpactingChange: false,
      isInFormalQueryBase: true,
      updatedAt: '2026-08-22 11:00:00',
      updatedBy: '陈琳 (文档管理员)'
    },
    {
      id: 'MAP-D03',
      rootTypeId: 'DOCUMENT',
      sourceSystemId: 'PLM_WINCHILL',
      sourceFieldKey: 'iba_doc_version',
      sourceFieldName: 'docVersion',
      sourceDisplayName: '文档版本',
      sourceDataType: 'TEXT',
      sourceDataTypeLabel: '文本',
      manticoreField: 'doc_version',
      manticoreType: 'STRING',
      displayTitle: '文档版本号',
      displayType: 'CONDITION_QUERY',
      queryCapability: 'QUERY_CONDITION',
      isQueryCondition: true,
      isSortable: true,
      isDisplayInResult: true,
      isFulltextSearch: false,
      isUniqueKey: false,
      defaultColumnWidth: 100,
      displayOrder: 3,

      defaultDisplayOrder: 3,
      configStatus: 'CONFIGURED',
      hasDraftModification: false,
      isDataImpactingChange: false,
      isInFormalQueryBase: true,
      updatedAt: '2026-08-22 11:00:00',
      updatedBy: '陈琳 (文档管理员)'
    },
    {
      id: 'MAP-D04',
      rootTypeId: 'DOCUMENT',
      sourceSystemId: 'PLM_WINCHILL',
      sourceFieldKey: 'iba_drawing_no',
      sourceFieldName: 'drawingNo',
      sourceDisplayName: '工程图纸编号',
      sourceDataType: 'TEXT',
      sourceDataTypeLabel: '文本',
      manticoreField: 'drawing_no',
      manticoreType: 'STRING',
      displayTitle: '图纸图号',
      displayType: 'LINK',
      hyperlinkConfig: {
        urlTemplate: 'https://plm.internal.corp/app/cad/drawing?oid={oid}&type={otype}',
        oidSourceField: 'drawing_oid',
        otypeSourceField: 'drawing_type',
        displayTextSource: 'FIELD_VALUE',
        openTarget: '_blank',
        onMissingParam: 'HIDE_LINK_SHOW_TEXT'
      },
      queryCapability: 'QUERY_CONDITION',
      isQueryCondition: true,
      isSortable: true,
      isDisplayInResult: true,
      isFulltextSearch: false,
      isUniqueKey: false,
      defaultColumnWidth: 180,
      displayOrder: 4,

      defaultDisplayOrder: 4,
      configStatus: 'CONFIGURED',
      hasDraftModification: false,
      isDataImpactingChange: false,
      isInFormalQueryBase: true,
      updatedAt: '2026-08-22 11:00:00',
      updatedBy: '刘洋 (制图组长)'
    }
  ],
  PROCESS: [
    {
      id: 'MAP-PR01-DRAFT',
      rootTypeId: 'PROCESS',
      sourceSystemId: 'PLM_WINCHILL',
      sourceFieldKey: 'iba_route_code',
      sourceFieldName: 'routeCode',
      sourceDisplayName: '工艺路线编码',
      sourceDataType: 'TEXT',
      sourceDataTypeLabel: '文本',
      manticoreField: 'route_code',
      manticoreType: 'STRING',
      displayTitle: '工艺路线编码',
      displayType: 'LINK',
      queryCapability: 'QUERY_CONDITION',
      isQueryCondition: true,
      isSortable: true,
      isDisplayInResult: true,
      isFulltextSearch: false,
      isUniqueKey: true,
      defaultColumnWidth: 160,
      displayOrder: 1,

      defaultDisplayOrder: 1,
      configStatus: 'DRAFT',
      hasDraftModification: false,
      isDataImpactingChange: true,
      isInFormalQueryBase: false,
      updatedAt: '2026-09-02 09:30:00',
      updatedBy: '赵丽 (工艺主管)'
    },
    {
      id: 'MAP-PR02-DRAFT',
      rootTypeId: 'PROCESS',
      sourceSystemId: 'PLM_WINCHILL',
      sourceFieldKey: 'iba_operation_name',
      sourceFieldName: 'operationName',
      sourceDisplayName: '工序名称',
      sourceDataType: 'TEXT',
      sourceDataTypeLabel: '文本',
      manticoreField: 'operation_name',
      manticoreType: 'STRING',
      displayTitle: '工序标准名称',
      displayType: 'CONDITION_QUERY',
      queryCapability: 'BOTH',
      isQueryCondition: true,
      isSortable: true,
      isDisplayInResult: true,
      isFulltextSearch: true,
      isUniqueKey: false,
      defaultColumnWidth: 200,
      displayOrder: 2,

      defaultDisplayOrder: 2,
      configStatus: 'DRAFT',
      hasDraftModification: false,
      isDataImpactingChange: true,
      isInFormalQueryBase: false,
      updatedAt: '2026-09-02 09:30:00',
      updatedBy: '赵丽 (工艺主管)'
    }
  ]
};

// 4. 根类型级正式查询底座快照
export const initialQuerySnapshots: Record<string, QueryBaseSnapshot> = {
  PART: {
    rootTypeId: 'PART',
    syncedAt: '2026-08-28 14:35:12',
    batchId: 'BATCH-20260828-002',
    fields: [
      {
        id: 'MAP-P01',
        rootTypeId: 'PART',
        sourceSystemId: 'PLM_WINCHILL',
        sourceFieldKey: 'iba_part_number',
        sourceFieldName: 'partNumber',
        sourceDisplayName: '物料编码',
        sourceDataType: 'TEXT',
        sourceDataTypeLabel: '文本',
        manticoreField: 'part_number',
        manticoreType: 'STRING',
        displayTitle: '物料编码',
        displayType: 'LINK',
        queryCapability: 'QUERY_CONDITION',
        isQueryCondition: true,
        isSortable: true,
        isDisplayInResult: true,
        isFulltextSearch: false,
        isUniqueKey: true,
        defaultColumnWidth: 160,
        displayOrder: 1,

        defaultDisplayOrder: 1,
        configStatus: 'CONFIGURED',
        hasDraftModification: false,
        isDataImpactingChange: false,
        isInFormalQueryBase: true,
        updatedAt: '2026-08-28 14:20:00',
        updatedBy: '李晓华 (数据标准管理员)'
      },
      {
        id: 'MAP-P02',
        rootTypeId: 'PART',
        sourceSystemId: 'PLM_WINCHILL',
        sourceFieldKey: 'iba_part_name',
        sourceFieldName: 'partName',
        sourceDisplayName: '零件名称',
        sourceDataType: 'TEXT',
        sourceDataTypeLabel: '文本',
        manticoreField: 'part_name',
        manticoreType: 'STRING',
        displayTitle: '零件名称',
        displayType: 'CONDITION_QUERY',
        queryCapability: 'BOTH',
        isQueryCondition: true,
        isSortable: true,
        isDisplayInResult: true,
        isFulltextSearch: true,
        isUniqueKey: false,
        defaultColumnWidth: 200,
        displayOrder: 2,

        defaultDisplayOrder: 2,
        configStatus: 'CONFIGURED',
        hasDraftModification: false,
        isDataImpactingChange: false,
        isInFormalQueryBase: true,
        updatedAt: '2026-08-28 14:20:00',
        updatedBy: '李晓华 (数据标准管理员)'
      },
      {
        id: 'MAP-P03',
        rootTypeId: 'PART',
        sourceSystemId: 'PLM_WINCHILL',
        sourceFieldKey: 'iba_material',
        sourceFieldName: 'material',
        sourceDisplayName: '主要材质',
        sourceDataType: 'TEXT',
        sourceDataTypeLabel: '文本',
        manticoreField: 'material',
        manticoreType: 'STRING',
        displayTitle: '主要材质',
        displayType: 'CONDITION_QUERY',
        queryCapability: 'QUERY_CONDITION',
        isQueryCondition: true,
        isSortable: false,
        isDisplayInResult: true,
        isFulltextSearch: false,
        isUniqueKey: false,
        defaultColumnWidth: 140,
        displayOrder: 3,

        defaultDisplayOrder: 3,
        configStatus: 'CONFIGURED',
        hasDraftModification: false,
        isDataImpactingChange: false,
        isInFormalQueryBase: true,
        updatedAt: '2026-08-28 14:20:00',
        updatedBy: '李晓华 (数据标准管理员)'
      },
      {
        id: 'MAP-P04',
        rootTypeId: 'PART',
        sourceSystemId: 'PLM_WINCHILL',
        sourceFieldKey: 'iba_nominal_diameter',
        sourceFieldName: 'nominalDiameter',
        sourceDisplayName: '公称直径',
        sourceDataType: 'NUMERIC_WITH_UNIT',
        sourceDataTypeLabel: '带单位数值',
        unitFamily: '长度 (Length)',
        defaultUnit: 'mm',
        manticoreField: 'nominal_diameter_mm',
        manticoreType: 'FLOAT',
        displayTitle: '公称直径 (mm)',
        displayType: 'CONDITION_QUERY',
        queryCapability: 'QUERY_CONDITION',
        isQueryCondition: true,
        isSortable: true,
        isDisplayInResult: true,
        isFulltextSearch: false,
        isUniqueKey: false,
        defaultColumnWidth: 130,
        displayOrder: 4,

        defaultDisplayOrder: 4,
        configStatus: 'CONFIGURED',
        hasDraftModification: false,
        isDataImpactingChange: false,
        isInFormalQueryBase: true,
        updatedAt: '2026-08-28 14:20:00',
        updatedBy: '李晓华 (数据标准管理员)'
      },
      {
        id: 'MAP-P05',
        rootTypeId: 'PART',
        sourceSystemId: 'PLM_WINCHILL',
        sourceFieldKey: 'iba_classification_path',
        sourceFieldName: 'classificationPath',
        sourceDisplayName: '分类路径',
        sourceDataType: 'CATEGORY_TREE',
        sourceDataTypeLabel: '分类树',
        manticoreField: 'category_path',
        manticoreType: 'STRING',
        displayTitle: '物料分类树路径',
        displayType: 'CATEGORY_PATH',
        queryCapability: 'QUERY_CONDITION',
        isQueryCondition: true,
        isSortable: false,
        isDisplayInResult: true,
        isFulltextSearch: false,
        isUniqueKey: false,
        defaultColumnWidth: 220,
        displayOrder: 5,

        defaultDisplayOrder: 5,
        configStatus: 'CONFIGURED',
        hasDraftModification: false,
        isDataImpactingChange: false,
        isInFormalQueryBase: true,
        updatedAt: '2026-08-28 14:20:00',
        updatedBy: '李晓华 (数据标准管理员)'
      }
    ]
  },
  DOCUMENT: {
    rootTypeId: 'DOCUMENT',
    syncedAt: '2026-08-22 11:20:00',
    batchId: 'BATCH-20260822-001',
    fields: [
      {
        id: 'MAP-D01',
        rootTypeId: 'DOCUMENT',
        sourceSystemId: 'PLM_WINCHILL',
        sourceFieldKey: 'iba_doc_number',
        sourceFieldName: 'docNumber',
        sourceDisplayName: '文档编号',
        sourceDataType: 'TEXT',
        sourceDataTypeLabel: '文本',
        manticoreField: 'doc_number',
        manticoreType: 'STRING',
        displayTitle: '文档编号',
        displayType: 'LINK',
        queryCapability: 'QUERY_CONDITION',
        isQueryCondition: true,
        isSortable: true,
        isDisplayInResult: true,
        isFulltextSearch: false,
        isUniqueKey: true,
        defaultColumnWidth: 160,
        displayOrder: 1,

        defaultDisplayOrder: 1,
        configStatus: 'CONFIGURED',
        hasDraftModification: false,
        isDataImpactingChange: false,
        isInFormalQueryBase: true,
        updatedAt: '2026-08-22 11:00:00',
        updatedBy: '陈琳 (文档管理员)'
      },
      {
        id: 'MAP-D02',
        rootTypeId: 'DOCUMENT',
        sourceSystemId: 'PLM_WINCHILL',
        sourceFieldKey: 'iba_doc_title',
        sourceFieldName: 'docTitle',
        sourceDisplayName: '文档标题',
        sourceDataType: 'TEXT',
        sourceDataTypeLabel: '文本',
        manticoreField: 'doc_title',
        manticoreType: 'STRING',
        displayTitle: '文档中文标题',
        displayType: 'CONDITION_QUERY',
        queryCapability: 'BOTH',
        isQueryCondition: true,
        isSortable: true,
        isDisplayInResult: true,
        isFulltextSearch: true,
        isUniqueKey: false,
        defaultColumnWidth: 240,
        displayOrder: 2,

        defaultDisplayOrder: 2,
        configStatus: 'CONFIGURED',
        hasDraftModification: false,
        isDataImpactingChange: false,
        isInFormalQueryBase: true,
        updatedAt: '2026-08-22 11:00:00',
        updatedBy: '陈琳 (文档管理员)'
      },
      {
        id: 'MAP-D03',
        rootTypeId: 'DOCUMENT',
        sourceSystemId: 'PLM_WINCHILL',
        sourceFieldKey: 'iba_doc_version',
        sourceFieldName: 'docVersion',
        sourceDisplayName: '文档版本',
        sourceDataType: 'TEXT',
        sourceDataTypeLabel: '文本',
        manticoreField: 'doc_version',
        manticoreType: 'STRING',
        displayTitle: '文档版本号',
        displayType: 'CONDITION_QUERY',
        queryCapability: 'QUERY_CONDITION',
        isQueryCondition: true,
        isSortable: true,
        isDisplayInResult: true,
        isFulltextSearch: false,
        isUniqueKey: false,
        defaultColumnWidth: 100,
        displayOrder: 3,

        defaultDisplayOrder: 3,
        configStatus: 'CONFIGURED',
        hasDraftModification: false,
        isDataImpactingChange: false,
        isInFormalQueryBase: true,
        updatedAt: '2026-08-22 11:00:00',
        updatedBy: '陈琳 (文档管理员)'
      },
      {
        id: 'MAP-D04',
        rootTypeId: 'DOCUMENT',
        sourceSystemId: 'PLM_WINCHILL',
        sourceFieldKey: 'iba_drawing_no',
        sourceFieldName: 'drawingNo',
        sourceDisplayName: '工程图纸编号',
        sourceDataType: 'TEXT',
        sourceDataTypeLabel: '文本',
        manticoreField: 'drawing_no',
        manticoreType: 'STRING',
        displayTitle: '图纸图号',
        displayType: 'LINK',
        queryCapability: 'QUERY_CONDITION',
        isQueryCondition: true,
        isSortable: true,
        isDisplayInResult: true,
        isFulltextSearch: false,
        isUniqueKey: false,
        defaultColumnWidth: 180,
        displayOrder: 4,

        defaultDisplayOrder: 4,
        configStatus: 'CONFIGURED',
        hasDraftModification: false,
        isDataImpactingChange: false,
        isInFormalQueryBase: true,
        updatedAt: '2026-08-22 11:00:00',
        updatedBy: '刘洋 (制图组长)'
      }
    ]
  },
  PROCESS: {
    rootTypeId: 'PROCESS',
    fields: []
  }
};

// 5. 来源元数据基线 (用于严格对比变更与来源变化)
export const initialSourceFieldBaselines: Record<string, Record<string, SourceFieldMeta>> = {
  PART: {
    iba_part_number: {
      sourceFieldKey: 'iba_part_number',
      sourceFieldName: 'partNumber',
      sourceDisplayName: '物料编码',
      sourceDataType: 'TEXT',
      sourceDataTypeLabel: '文本',
      isRequired: true,
      isPrimaryKey: true
    },
    iba_part_name: {
      sourceFieldKey: 'iba_part_name',
      sourceFieldName: 'partName',
      sourceDisplayName: '零件名称',
      sourceDataType: 'TEXT',
      sourceDataTypeLabel: '文本',
      isRequired: true
    },
    iba_material: {
      sourceFieldKey: 'iba_material',
      sourceFieldName: 'material',
      sourceDisplayName: '主要材质',
      sourceDataType: 'TEXT',
      sourceDataTypeLabel: '文本',
      isRequired: false
    },
    iba_nominal_diameter: {
      sourceFieldKey: 'iba_nominal_diameter',
      sourceFieldName: 'nominalDiameter',
      sourceDisplayName: '公称直径',
      sourceDataType: 'NUMERIC_WITH_UNIT',
      sourceDataTypeLabel: '带单位数值',
      unitFamily: '长度 (Length)',
      defaultUnit: 'mm',
      isRequired: false
    },
    iba_classification_path: {
      sourceFieldKey: 'iba_classification_path',
      sourceFieldName: 'classificationPath',
      sourceDisplayName: '分类路径',
      sourceDataType: 'CATEGORY_TREE',
      sourceDataTypeLabel: '分类树',
      isRequired: false
    },
    iba_surface_treatment: {
      sourceFieldKey: 'iba_surface_treatment',
      sourceFieldName: 'surfaceTreatment',
      sourceDisplayName: '表面处理工艺',
      sourceDataType: 'TEXT', // 旧基线为 TEXT
      sourceDataTypeLabel: '文本',
      isRequired: false
    }
  },
  DOCUMENT: {
    iba_doc_number: {
      sourceFieldKey: 'iba_doc_number',
      sourceFieldName: 'docNumber',
      sourceDisplayName: '文档编号',
      sourceDataType: 'TEXT',
      sourceDataTypeLabel: '文本',
      isRequired: true,
      isPrimaryKey: true
    },
    iba_doc_title: {
      sourceFieldKey: 'iba_doc_title',
      sourceFieldName: 'docTitle',
      sourceDisplayName: '文档标题',
      sourceDataType: 'TEXT',
      sourceDataTypeLabel: '文本',
      isRequired: true
    },
    iba_doc_version: {
      sourceFieldKey: 'iba_doc_version',
      sourceFieldName: 'docVersion',
      sourceDisplayName: '文档版本',
      sourceDataType: 'TEXT',
      sourceDataTypeLabel: '文本',
      isRequired: true
    },
    iba_drawing_no: {
      sourceFieldKey: 'iba_drawing_no',
      sourceFieldName: 'drawingNo',
      sourceDisplayName: '工程图纸编号',
      sourceDataType: 'TEXT',
      sourceDataTypeLabel: '文本',
      isRequired: false
    }
  },
  PROCESS: {}
};

// 6. 模拟从 PLM 在线读取元数据 (包含各种元数据场景及显示名为空的条目)
export const mockSourceFieldMetas: Record<string, SourceFieldMeta[]> = {
  PART: [
    {
      sourceFieldKey: 'iba_part_number',
      isExampleMetadata: true,
      sourceTables: ['example_part_master'], attributeKind: 'HARD', isMultiValue: false, hasEnumDefinition: false,
      sourceFieldName: 'partNumber',
      sourceDisplayName: '物料编码',
      sourceDataType: 'TEXT',
      sourceDataTypeLabel: '文本',
      isRequired: true,
      isPrimaryKey: true
    },
    {
      sourceFieldKey: 'iba_part_name',
      sourceFieldName: 'partName',
      sourceDisplayName: '零件名称',
      sourceDataType: 'TEXT',
      sourceDataTypeLabel: '文本',
      isRequired: true
    },
    {
      sourceFieldKey: 'iba_material',
      isExampleMetadata: true,
      sourceTables: ['example_part_attribute'], attributeKind: 'EXTENDED', isMultiValue: false, hasEnumDefinition: false,
      sourceFieldName: 'material',
      sourceDisplayName: '主要材质',
      sourceDataType: 'TEXT',
      sourceDataTypeLabel: '文本',
      isRequired: false
    },
    {
      sourceFieldKey: 'iba_nominal_diameter',
      sourceFieldName: 'nominalDiameter',
      sourceDisplayName: '公称直径',
      sourceDataType: 'NUMERIC_WITH_UNIT',
      sourceDataTypeLabel: '带单位数值',
      unitFamily: '长度 (Length)',
      defaultUnit: 'mm',
      isRequired: false
    },
    {
      sourceFieldKey: 'iba_classification_path',
      isExampleMetadata: true,
      sourceTables: [], attributeKind: 'VIRTUAL', isMultiValue: false, hasEnumDefinition: false,
      sourceFieldName: 'classificationPath',
      sourceDisplayName: '分类路径',
      sourceDataType: 'CATEGORY_TREE',
      sourceDataTypeLabel: '分类树',
      isRequired: false
    },
    // 真实来源类型升级变更 (TEXT -> ENUM)
    {
      sourceFieldKey: 'iba_surface_treatment',
      isExampleMetadata: true,
      sourceTables: ['example_part_attribute'], attributeKind: 'EXTENDED', isMultiValue: true, hasEnumDefinition: true, enumDefinition: { code: 'EXAMPLE_SURFACE_TREATMENT', name: '表面处理工艺（示例）' },
      sourceFieldName: 'surfaceTreatment',
      sourceDisplayName: '表面处理工艺',
      sourceDataType: 'ENUM',
      sourceDataTypeLabel: '枚举',
      enumOptions: [
        { code: 'ANODIZING', label: '阳极氧化' },
        { code: 'ELECTROPLATING', label: '电镀防锈' },
        { code: 'POWDER_COATING', label: '喷塑' }
      ],
      isRequired: false
    },
    // 来源显示名缺失场景测试字段 (sourceDisplayName 为空，自动以 sourceFieldName 'grossWeight' 兜底并标记告警)
    {
      sourceFieldKey: 'iba_gross_weight',
      sourceFieldName: 'grossWeight',
      sourceDisplayName: '', // 空显示名
      sourceDataType: 'NUMERIC_WITH_UNIT',
      sourceDataTypeLabel: '带单位数值',
      unitFamily: '质量 (Mass)',
      defaultUnit: 'kg',
      isRequired: false,
      description: 'PLM 系统未配置中文显示名属性，需前台自动兜底'
    },
    // 未映射新属性
    {
      sourceFieldKey: 'iba_lifecycle_state',
      isExampleMetadata: true,
      sourceTables: ['example_part_master'], attributeKind: 'HARD', isMultiValue: false, hasEnumDefinition: true, enumDefinition: { code: 'EXAMPLE_LIFECYCLE_STATE', name: '生命周期状态（示例）' },
      sourceFieldName: 'state',
      sourceDisplayName: '生命周期状态',
      sourceDataType: 'ENUM',
      sourceDataTypeLabel: '枚举',
      enumOptions: [
        { code: 'INWORK', label: '工作中' },
        { code: 'RELEASED', label: '已发布' },
        { code: 'OBSOLETE', label: '已废弃' }
      ],
      isRequired: false
    },
    {
      sourceFieldKey: 'iba_manufacturer_name',
      isExampleMetadata: true,
      sourceTables: ['example_part_attribute'], attributeKind: 'EXTENDED', isMultiValue: false, hasEnumDefinition: false,
      sourceFieldName: 'manufacturerName',
      sourceDisplayName: '原厂制造商名称',
      sourceDataType: 'TEXT',
      sourceDataTypeLabel: '文本',
      isRequired: false
    }
  ],
  DOCUMENT: [
    {
      sourceFieldKey: 'iba_doc_number',
      isExampleMetadata: true,
      sourceTables: ['example_document_master'], attributeKind: 'HARD', isMultiValue: false, hasEnumDefinition: false,
      sourceFieldName: 'docNumber',
      sourceDisplayName: '文档编号',
      sourceDataType: 'TEXT',
      sourceDataTypeLabel: '文本',
      isRequired: true,
      isPrimaryKey: true
    },
    {
      sourceFieldKey: 'iba_doc_title',
      sourceFieldName: 'docTitle',
      sourceDisplayName: '文档标题',
      sourceDataType: 'TEXT',
      sourceDataTypeLabel: '文本',
      isRequired: true
    },
    {
      sourceFieldKey: 'iba_doc_version',
      sourceFieldName: 'docVersion',
      sourceDisplayName: '文档版本',
      sourceDataType: 'TEXT',
      sourceDataTypeLabel: '文本',
      isRequired: true
    },
    {
      sourceFieldKey: 'iba_drawing_no',
      sourceFieldName: 'drawingNo',
      sourceDisplayName: '工程图纸编号',
      sourceDataType: 'TEXT',
      sourceDataTypeLabel: '文本',
      isRequired: false
    },
    {
      sourceFieldKey: 'iba_sheet_size',
      isExampleMetadata: true,
      sourceTables: ['example_document_attribute'], attributeKind: 'EXTENDED', isMultiValue: false, hasEnumDefinition: true, enumDefinition: { code: 'EXAMPLE_SHEET_SIZE', name: '图幅幅面（示例）' },
      sourceFieldName: 'sheetSize',
      sourceDisplayName: '图幅幅面',
      sourceDataType: 'ENUM',
      sourceDataTypeLabel: '枚举',
      enumOptions: [
        { code: 'A0', label: 'A0 (841x1189)' },
        { code: 'A1', label: 'A1 (594x841)' },
        { code: 'A2', label: 'A2 (420x594)' },
        { code: 'A3', label: 'A3 (297x420)' },
        { code: 'A4', label: 'A4 (210x297)' }
      ],
      isRequired: false
    }
  ],
  PROCESS: [
    {
      sourceFieldKey: 'iba_route_code',
      isExampleMetadata: true,
      sourceTables: ['example_process_master'], attributeKind: 'HARD', isMultiValue: false, hasEnumDefinition: false,
      sourceFieldName: 'routeCode',
      sourceDisplayName: '工艺路线编码',
      sourceDataType: 'TEXT',
      sourceDataTypeLabel: '文本',
      isRequired: true,
      isPrimaryKey: true
    },
    {
      sourceFieldKey: 'iba_operation_name',
      sourceFieldName: 'operationName',
      sourceDisplayName: '工序名称',
      sourceDataType: 'TEXT',
      sourceDataTypeLabel: '文本',
      isRequired: true
    },
    {
      sourceFieldKey: 'iba_work_center',
      sourceFieldName: 'workCenter',
      sourceDisplayName: '工作中心车间',
      sourceDataType: 'TEXT',
      sourceDataTypeLabel: '文本',
      isRequired: false
    },
    {
      sourceFieldKey: 'iba_standard_time_min',
      sourceFieldName: 'standardTime',
      sourceDisplayName: '标准工时 (分钟)',
      sourceDataType: 'NUMERIC',
      sourceDataTypeLabel: '数值',
      isRequired: false
    }
  ]
};

// 7. 正式查询预览样本数据
export const mockStage1PreviewRecords: Record<string, Stage1PreviewRecord[]> = {
  PART: [
    {
      id: 'REC-P-001',
      partNumber: 'PART-2026-M102',
      partName: '传动主轴驱动轴承座',
      material: '45# 优质碳素结构钢',
      categoryPath: '机械传动部件 > 轴承支撑总成 > 刚性座',
      nominalDiameter: '25.0',
      grossWeight: '3.45',
      lifecycleState: 'RELEASED',
      createTime: '2026-08-15 09:20:11',
      master_oid: 'OR:wt.part.WTPart:9823101',
      object_type_code: 'WTPart'
    },
    {
      id: 'REC-P-002',
      partNumber: 'PART-2026-M103',
      partName: '高速法兰连接盘',
      material: '304 不锈钢 (06Cr19Ni10)',
      categoryPath: '流体密封系统 > 法兰接头 > 高压法兰',
      nominalDiameter: '50.0',
      grossWeight: '1.20',
      lifecycleState: 'RELEASED',
      createTime: '2026-08-16 11:05:44',
      master_oid: 'OR:wt.part.WTPart:9823102',
      object_type_code: 'WTPart'
    },
    {
      id: 'REC-P-003',
      partNumber: 'PART-2026-M104',
      partName: '精密行星齿轮箱箱体',
      material: 'QT500-7 球墨铸铁',
      categoryPath: '动力总成 > 减速机构 > 壳体铸件',
      nominalDiameter: '120.0',
      grossWeight: '18.80',
      lifecycleState: 'RELEASED',
      createTime: '2026-08-18 14:30:00',
      master_oid: 'OR:wt.part.WTPart:9823103',
      object_type_code: 'WTPart'
    },
    {
      id: 'REC-P-004',
      partNumber: 'PART-2026-M105',
      partName: '六角头螺栓 M10x50',
      material: '35CrMo 合金钢',
      categoryPath: '标准件库 > 紧固连接件 > 外六角螺栓',
      nominalDiameter: '10.0',
      grossWeight: '0.08',
      lifecycleState: 'RELEASED',
      createTime: '2026-08-20 08:45:12',
      // 故意缺参测试：缺少 master_oid，按 onMissingParam 处理（HIDE_LINK_SHOW_TEXT）
      master_oid: '',
      object_type_code: 'WTPart'
    }
  ],
  DOCUMENT: [
    {
      id: 'REC-D-001',
      docNumber: 'DOC-SPEC-2026-001',
      docTitle: '传动轴装配技术规范与扭矩校核标准',
      docVersion: 'A.3',
      drawingNo: 'DWG-ME-2026-8801',
      sheetSize: 'A3',
      master_oid: 'OR:wt.doc.WTDocument:8812001',
      object_type_code: 'WTDocument',
      drawing_oid: 'OR:wt.epm.EPMDocument:7701001',
      drawing_type: 'EPMDocument'
    },
    {
      id: 'REC-D-002',
      docNumber: 'DOC-SPEC-2026-002',
      docTitle: '高温高压密封圈材质选型指南',
      docVersion: 'B.1',
      drawingNo: 'DWG-FL-2026-1024',
      sheetSize: 'A4',
      master_oid: 'OR:wt.doc.WTDocument:8812002',
      object_type_code: 'WTDocument',
      drawing_oid: 'OR:wt.epm.EPMDocument:7701002',
      drawing_type: 'EPMDocument'
    }
  ],
  PROCESS: []
};
