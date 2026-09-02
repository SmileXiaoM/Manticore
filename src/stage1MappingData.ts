/**
 * 一阶段：对象与字段映射配置 - 统一演示数据与初始状态
 */

import {
  SourceSystemInfo,
  MappingObjectType,
  SourceFieldMeta,
  FieldMappingItem,
  Stage1PreviewRecord
} from './stage1MappingTypes';

// 1. 来源系统适配器元数据
export const mockSourceSystems: SourceSystemInfo[] = [
  {
    id: 'IntePLM_V21',
    name: 'IntePLM V21 企业研发管理系统',
    code: 'IntePLM',
    version: '21.4.2-SP3',
    type: 'PLM',
    status: 'ONLINE',
    description: '企业主数据源：机械图纸、零部件主数据与 BOM 结构'
  },
  {
    id: 'ERP_SAP_S4',
    name: 'SAP S/4HANA 物料主数据适配器 (元数据已注册)',
    code: 'SAP_ERP',
    version: '2023-FPS02',
    type: 'ERP',
    status: 'ONLINE',
    description: '物料财务视图与供应商采购生命周期主数据'
  }
];

export const initialSourceSystems = mockSourceSystems;

// 2. 根对象与软类型层级定义 (严格保持与字段明细 100% 派生一致)
export const initialMappingObjects: MappingObjectType[] = [
  {
    id: 'PART',
    code: 'Part',
    name: '零部件 (Part)',
    sourceSystemId: 'IntePLM_V21',
    sourceSystemName: 'IntePLM V21',
    description: '机械与电气零部件核心主对象，包含标准件、结构件与自制件',
    softTypes: [
      {
        id: 'PART_MECHANICAL',
        rootTypeId: 'PART',
        code: 'MechanicalPart',
        name: '机械零件',
        description: '自制与外购机械结构件、机加件、钣金冲压件',
        activeFieldCount: 5, // 5 个已生效字段 (MAP-001 ~ MAP-005)
        queryableFieldCount: 5, // 全部已同步成功，可查询字段为 5
        draftFieldCount: 3, // 2 个纯草稿 (MAP-006, MAP-007) + 1 个生效字段存在草稿微调 (MAP-003) = 3
        configStatus: 'ACTIVE',
        syncStatus: 'SYNC_SUCCESS',
        activeConfigVersion: 'v1.2.0',
        lastPublishedAt: '2026-08-28 14:20:00',
        lastSyncedAt: '2026-08-28 14:35:12',
        lastSyncBatchId: 'BATCH-20260828-002',
        activeQueryVersion: 'v1.2.0',
        hasPendingSyncFields: false
      },
      {
        id: 'PART_ELECTRICAL',
        rootTypeId: 'PART',
        code: 'ElectricalPart',
        name: '电子电气零件',
        description: '贴片元器件、继电器、传感器与接插件',
        activeFieldCount: 4, // 4 个已生效字段 (MAP-101 ~ MAP-104)
        queryableFieldCount: 2, // 仅 2 个已同步成功 (MAP-101, MAP-102)，另外 2 个待同步，故可查询为 2
        draftFieldCount: 0,
        configStatus: 'ACTIVE',
        syncStatus: 'PENDING_SYNC',
        activeConfigVersion: 'v1.1.0',
        lastPublishedAt: '2026-08-30 09:15:00',
        lastSyncedAt: '2026-08-25 03:00:00',
        lastSyncBatchId: 'BATCH-20260825-001',
        activeQueryVersion: 'v1.0.0', // 上一成功查询版本
        hasPendingSyncFields: true
      },
      {
        id: 'PART_FASTENER',
        rootTypeId: 'PART',
        code: 'FastenerPart',
        name: '标准紧固件',
        description: '螺栓、螺母、垫圈与销轴标准件',
        activeFieldCount: 3, // 3 个已生效字段 (MAP-201 ~ MAP-203)
        queryableFieldCount: 3,
        draftFieldCount: 0,
        configStatus: 'ACTIVE',
        syncStatus: 'SYNC_FAILED',
        activeConfigVersion: 'v1.0.0',
        lastPublishedAt: '2026-08-24 10:00:00',
        lastSyncedAt: '2026-08-24 10:45:00',
        lastSyncBatchId: 'BATCH-20260824-006',
        lastSyncErrorMsg: 'PLM 连接池超时 (HTTP 504)，索引锁冲突未完成',
        activeQueryVersion: 'v0.9.0', // 上一成功查询版本保持不变
        hasPendingSyncFields: false
      }
    ]
  },
  {
    id: 'DOCUMENT',
    code: 'Document',
    name: '技术文档 (Document)',
    sourceSystemId: 'IntePLM_V21',
    sourceSystemName: 'IntePLM V21',
    description: '设计规范、装配图纸、检验报告与技术说明书',
    softTypes: [
      {
        id: 'DOC_SPEC',
        rootTypeId: 'DOCUMENT',
        code: 'SpecDocument',
        name: '技术规范与说明书',
        description: '产品技术设计说明书与试验标准文档',
        activeFieldCount: 3, // 3 个已生效 (MAP-301 ~ MAP-303)
        queryableFieldCount: 3,
        draftFieldCount: 1, // 1 个纯草稿 (MAP-304)
        configStatus: 'ACTIVE',
        syncStatus: 'SYNC_SUCCESS',
        activeConfigVersion: 'v1.0.0',
        lastPublishedAt: '2026-08-22 11:00:00',
        lastSyncedAt: '2026-08-22 11:20:00',
        lastSyncBatchId: 'BATCH-20260822-001',
        activeQueryVersion: 'v1.0.0',
        hasPendingSyncFields: false
      },
      {
        id: 'DOC_DRAWING',
        rootTypeId: 'DOCUMENT',
        code: 'DrawingDocument',
        name: '装配工程图纸',
        description: 'CAD 二维图纸、工程图及图幅尺寸元数据',
        activeFieldCount: 2, // 2 个已生效 (MAP-401 ~ MAP-402)
        queryableFieldCount: 2,
        draftFieldCount: 0,
        configStatus: 'ACTIVE',
        syncStatus: 'NO_SYNC_NEEDED',
        activeConfigVersion: 'v1.0.0',
        lastPublishedAt: '2026-08-20 16:00:00',
        lastSyncedAt: '2026-08-20 16:15:00',
        lastSyncBatchId: 'BATCH-20260820-003',
        activeQueryVersion: 'v1.0.0',
        hasPendingSyncFields: false
      }
    ]
  },
  {
    id: 'PROCESS',
    code: 'Process',
    name: '工艺对象 (Process)',
    sourceSystemId: 'IntePLM_V21',
    sourceSystemName: 'IntePLM V21',
    description: '机加工艺路线、装配工序及工装刀具索引',
    softTypes: [
      {
        id: 'PROCESS_ROUTE',
        rootTypeId: 'PROCESS',
        code: 'MachiningRoute',
        name: '机加工艺路线',
        description: '铸造、粗铣、精密研磨等工艺路线定义',
        activeFieldCount: 0, // 尚未发布任何生效版本
        queryableFieldCount: 0,
        draftFieldCount: 2, // 2 个草稿字段 (MAP-501, MAP-502)
        configStatus: 'DRAFT_ONLY',
        syncStatus: 'NO_SYNC_NEEDED',
        activeConfigVersion: 'v0.1.0-draft',
        lastPublishedAt: undefined,
        lastSyncedAt: undefined,
        activeQueryVersion: 'NONE',
        hasPendingSyncFields: false
      }
    ]
  }
];

// 3. PLM 来源系统可读取的元数据字段池 (用于单个新建选择或批量选择发现)
export const mockPlmSourceMetadataPool: Record<string, SourceFieldMeta[]> = {
  PART_MECHANICAL: [
    // 已经映射生效的
    {
      sourceFieldKey: 'iba_part_number',
      sourceFieldName: 'partNumber',
      sourceDisplayName: '物料编码',
      sourceDataType: 'TEXT',
      sourceDataTypeLabel: '文本',
      isRequired: true,
      isPrimaryKey: true,
      description: 'PLM 全局唯一零件编号'
    },
    {
      sourceFieldKey: 'iba_part_name',
      sourceFieldName: 'partName',
      sourceDisplayName: '零件名称',
      sourceDataType: 'TEXT',
      sourceDataTypeLabel: '文本',
      isRequired: true,
      description: '零件中文标准品名'
    },
    {
      sourceFieldKey: 'iba_material',
      sourceFieldName: 'material',
      sourceDisplayName: '主要材质',
      sourceDataType: 'TEXT',
      sourceDataTypeLabel: '文本',
      isRequired: false,
      description: '机械结构材质牌号'
    },
    {
      sourceFieldKey: 'iba_nominal_diameter',
      sourceFieldName: 'nominalDiameter',
      sourceDisplayName: '公称直径',
      sourceDataType: 'NUMERIC_WITH_UNIT',
      sourceDataTypeLabel: '带单位数值',
      unitFamily: '长度 (Length)',
      defaultUnit: 'mm',
      isRequired: false,
      description: '尺寸公称直径'
    },
    {
      sourceFieldKey: 'iba_classification_path',
      sourceFieldName: 'classificationPath',
      sourceDisplayName: '分类路径',
      sourceDataType: 'CATEGORY_TREE',
      sourceDataTypeLabel: '分类树',
      categoryTreeRoot: '机械结构件分类树',
      isRequired: false,
      description: 'PLM 标准分类层级'
    },
    // 未映射 / 可供批量发现的字段
    {
      sourceFieldKey: 'iba_manufacturer_name',
      sourceFieldName: 'manufacturerName',
      sourceDisplayName: '制造商名称',
      sourceDataType: 'TEXT',
      sourceDataTypeLabel: '文本',
      isRequired: false,
      description: '主制造商或委外加工厂商'
    },
    {
      sourceFieldKey: 'iba_tech_desc',
      sourceFieldName: 'technicalDescription',
      sourceDisplayName: '技术规格描述',
      sourceDataType: 'LONG_TEXT',
      sourceDataTypeLabel: '长文本',
      isRequired: false,
      description: '技术要求及详细工艺参数'
    },
    {
      sourceFieldKey: 'iba_lifecycle_state',
      sourceFieldName: 'lifecycleState',
      sourceDisplayName: '生命周期状态',
      sourceDataType: 'ENUM',
      sourceDataTypeLabel: '枚举',
      enumOptions: [
        { code: 'INWORK', label: '工作阶段' },
        { code: 'UNDER_REVIEW', label: '审核中' },
        { code: 'RELEASED', label: '已发布' },
        { code: 'OBSOLETE', label: '已废弃' }
      ],
      isRequired: true,
      description: '零件在 PLM 中的当前状态'
    },
    {
      sourceFieldKey: 'iba_gross_weight',
      sourceFieldName: 'grossWeight',
      sourceDisplayName: '毛重',
      sourceDataType: 'NUMERIC_WITH_UNIT',
      sourceDataTypeLabel: '带单位数值',
      unitFamily: '质量 (Mass)',
      defaultUnit: 'kg',
      isRequired: false,
      description: '包装毛重或粗坯重量'
    },
    {
      sourceFieldKey: 'iba_create_time',
      sourceFieldName: 'createTime',
      sourceDisplayName: '创建时间',
      sourceDataType: 'DATE',
      sourceDataTypeLabel: '日期时间',
      isRequired: true,
      description: '在 PLM 首次入库时间戳'
    },
    {
      sourceFieldKey: 'iba_supplier_category',
      sourceFieldName: 'supplierCategory',
      sourceDisplayName: '供应商类别',
      sourceDataType: 'CATEGORY_TREE',
      sourceDataTypeLabel: '分类树',
      categoryTreeRoot: '合格供应商资质树',
      isRequired: false,
      description: '供应商目录分类树'
    },
    // 来源发生变化示例 (SOURCE_CHANGED: PLM 端近期由单值改为枚举)
    {
      sourceFieldKey: 'iba_surface_treatment',
      sourceFieldName: 'surfaceTreatment',
      sourceDisplayName: '表面处理工艺 (PLM升级)',
      sourceDataType: 'ENUM',
      sourceDataTypeLabel: '枚举 (原TEXT已升级为ENUM)',
      enumOptions: [
        { code: 'BLACKENING', label: '发黑处理' },
        { code: 'ANODIZING', label: '阳极氧化' },
        { code: 'CHROME_PLATING', label: '镀硬铬' },
        { code: 'NITRIDING', label: '渗氮处理' }
      ],
      isRequired: false,
      description: 'PLM 属性字典于 2026-08-30 升级为受控枚举'
    },
    // 冲突或不兼容示例
    {
      sourceFieldKey: 'iba_cad_binary_stream',
      sourceFieldName: 'cadBinaryStream',
      sourceDisplayName: '3D 模型原始二进制',
      sourceDataType: 'LONG_TEXT',
      sourceDataTypeLabel: '长文本 (二进制流)',
      isRequired: false,
      description: '不兼容检索底座的纯二进制流'
    },
    {
      sourceFieldKey: 'iba_legacy_untyped_blob',
      sourceFieldName: 'legacyUntypedBlob',
      sourceDisplayName: '旧版未定义属性块',
      sourceDataType: 'TEXT',
      sourceDataTypeLabel: '未定义类型',
      isRequired: false,
      description: '缺失关键数据类型元数据'
    }
  ],
  PART_ELECTRICAL: [
    {
      sourceFieldKey: 'iba_part_number',
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
      sourceDisplayName: '元器件品名',
      sourceDataType: 'TEXT',
      sourceDataTypeLabel: '文本',
      isRequired: true
    },
    {
      sourceFieldKey: 'iba_rated_voltage',
      sourceFieldName: 'ratedVoltage',
      sourceDisplayName: '额定电压',
      sourceDataType: 'NUMERIC_WITH_UNIT',
      sourceDataTypeLabel: '带单位数值',
      unitFamily: '电压 (Voltage)',
      defaultUnit: 'V',
      isRequired: false
    },
    {
      sourceFieldKey: 'iba_capacitance',
      sourceFieldName: 'capacitance',
      sourceDisplayName: '静电容量',
      sourceDataType: 'NUMERIC_WITH_UNIT',
      sourceDataTypeLabel: '带单位数值',
      unitFamily: '电容 (Capacitance)',
      defaultUnit: 'uF',
      isRequired: false
    },
    {
      sourceFieldKey: 'iba_pin_count',
      sourceFieldName: 'pinCount',
      sourceDisplayName: '引脚数量',
      sourceDataType: 'NUMERIC',
      sourceDataTypeLabel: '浮点数',
      isRequired: false
    }
  ],
  PART_FASTENER: [
    {
      sourceFieldKey: 'iba_fastener_code',
      sourceFieldName: 'fastenerCode',
      sourceDisplayName: '标准件编码',
      sourceDataType: 'TEXT',
      sourceDataTypeLabel: '文本',
      isRequired: true,
      isPrimaryKey: true
    },
    {
      sourceFieldKey: 'iba_fastener_standard',
      sourceFieldName: 'standardSpec',
      sourceDisplayName: '执行标准号',
      sourceDataType: 'TEXT',
      sourceDataTypeLabel: '文本',
      isRequired: true
    },
    {
      sourceFieldKey: 'iba_thread_spec',
      sourceFieldName: 'threadSpec',
      sourceDisplayName: '螺纹规格',
      sourceDataType: 'TEXT',
      sourceDataTypeLabel: '文本',
      isRequired: false
    }
  ],
  DOC_SPEC: [
    {
      sourceFieldKey: 'iba_doc_number',
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
      sourceFieldKey: 'iba_doc_content',
      sourceFieldName: 'documentContent',
      sourceDisplayName: '文档正文内容',
      sourceDataType: 'LONG_TEXT',
      sourceDataTypeLabel: '长文本',
      isRequired: false
    }
  ],
  DOC_DRAWING: [
    {
      sourceFieldKey: 'iba_drawing_no',
      sourceFieldName: 'drawingNo',
      sourceDisplayName: '工程图纸编号',
      sourceDataType: 'TEXT',
      sourceDataTypeLabel: '文本',
      isRequired: true,
      isPrimaryKey: true
    },
    {
      sourceFieldKey: 'iba_sheet_size',
      sourceFieldName: 'sheetSize',
      sourceDisplayName: '图幅尺寸 (A0-A4)',
      sourceDataType: 'ENUM',
      sourceDataTypeLabel: '枚举',
      isRequired: false
    }
  ],
  PROCESS_ROUTE: [
    {
      sourceFieldKey: 'iba_route_code',
      sourceFieldName: 'routeCode',
      sourceDisplayName: '工艺路线编码',
      sourceDataType: 'TEXT',
      sourceDataTypeLabel: '文本',
      isRequired: true,
      isPrimaryKey: true
    },
    {
      sourceFieldKey: 'iba_work_center',
      sourceFieldName: 'workCenter',
      sourceDisplayName: '负责工作中心',
      sourceDataType: 'TEXT',
      sourceDataTypeLabel: '文本',
      isRequired: true
    }
  ]
};

// 4. 初始字段映射数据 (按软类型完整组织，所有软类型均有真实明细)
export const initialFieldMappings: FieldMappingItem[] = [
  // -------------------------------------------------------------
  // A. 机械零件 (PART_MECHANICAL)
  // 生效 5 + 纯草稿 2 + 生效草稿微调 1 = 总 7 行
  // -------------------------------------------------------------
  {
    id: 'MAP-001',
    rootTypeId: 'PART',
    softTypeId: 'PART_MECHANICAL',
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
    defaultDisplayOrder: 1,
    hyperlinkConfig: {
      urlTemplate: 'https://plm.internal.corp/app/part-view?oid={oid}&type={otype}',
      oidSourceField: 'master_oid',
      otypeSourceField: 'object_type_code',
      displayTextSource: 'FIELD_VALUE',
      openTarget: '_blank',
      onMissingParam: 'HIDE_LINK_SHOW_TEXT'
    },
    configStatus: 'ACTIVE',
    hasDraftModification: false,
    dataStatus: 'SYNC_SUCCESS',
    isDataImpactingChange: false,
    lastConfigVersion: 'v1.2.0',
    updatedAt: '2026-08-28 14:20:00',
    updatedBy: '李晓华 (数据标准管理员)'
  },
  {
    id: 'MAP-002',
    rootTypeId: 'PART',
    softTypeId: 'PART_MECHANICAL',
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
    defaultDisplayOrder: 2,
    configStatus: 'ACTIVE',
    hasDraftModification: false,
    dataStatus: 'SYNC_SUCCESS',
    isDataImpactingChange: false,
    lastConfigVersion: 'v1.2.0',
    updatedAt: '2026-08-28 14:20:00',
    updatedBy: '李晓华 (数据标准管理员)'
  },
  {
    id: 'MAP-003',
    rootTypeId: 'PART',
    softTypeId: 'PART_MECHANICAL',
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
    defaultDisplayOrder: 3,
    configStatus: 'ACTIVE',
    // 存在草稿修改示例 (修改了显示名称与列宽，纯展示变更)
    hasDraftModification: true,
    draftData: {
      displayTitle: '主体材质牌号 (草稿微调)',
      displayType: 'CONDITION_QUERY',
      queryCapability: 'QUERY_CONDITION',
      isQueryCondition: true,
      isSortable: false,
      isDisplayInResult: true,
      isFulltextSearch: false,
      isUniqueKey: false,
      defaultColumnWidth: 160
    },
    dataStatus: 'SYNC_SUCCESS',
    isDataImpactingChange: false,
    lastConfigVersion: 'v1.2.0',
    updatedAt: '2026-08-28 14:20:00',
    updatedBy: '王明 (机械工程师)'
  },
  {
    id: 'MAP-004',
    rootTypeId: 'PART',
    softTypeId: 'PART_MECHANICAL',
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
    defaultDisplayOrder: 4,
    configStatus: 'ACTIVE',
    hasDraftModification: false,
    dataStatus: 'SYNC_SUCCESS',
    isDataImpactingChange: false,
    lastConfigVersion: 'v1.2.0',
    updatedAt: '2026-08-28 14:20:00',
    updatedBy: '李晓华 (数据标准管理员)'
  },
  {
    id: 'MAP-005',
    rootTypeId: 'PART',
    softTypeId: 'PART_MECHANICAL',
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
    defaultDisplayOrder: 5,
    configStatus: 'ACTIVE',
    hasDraftModification: false,
    dataStatus: 'SYNC_SUCCESS',
    isDataImpactingChange: false,
    lastConfigVersion: 'v1.2.0',
    updatedAt: '2026-08-28 14:20:00',
    updatedBy: '李晓华 (数据标准管理员)'
  },
  // 机械零件纯草稿 1 (未发布)
  {
    id: 'MAP-006',
    rootTypeId: 'PART',
    softTypeId: 'PART_MECHANICAL',
    sourceFieldKey: 'iba_manufacturer_name',
    sourceFieldName: 'manufacturerName',
    sourceDisplayName: '制造商名称',
    sourceDataType: 'TEXT',
    sourceDataTypeLabel: '文本',
    manticoreField: 'manufacturer_name',
    manticoreType: 'STRING',
    displayTitle: '指定制造商',
    displayType: 'CONDITION_QUERY',
    queryCapability: 'QUERY_CONDITION',
    isQueryCondition: true,
    isSortable: true,
    isDisplayInResult: true,
    isFulltextSearch: false,
    isUniqueKey: false,
    defaultColumnWidth: 150,
    defaultDisplayOrder: 6,
    configStatus: 'DRAFT',
    hasDraftModification: false,
    dataStatus: 'NO_SYNC_NEEDED',
    isDataImpactingChange: true,
    lastConfigVersion: 'v1.3.0-draft',
    updatedAt: '2026-09-01 10:30:00',
    updatedBy: '王明 (机械工程师)'
  },
  // 机械零件纯草稿 2 (长文本全文检索，未发布)
  {
    id: 'MAP-007',
    rootTypeId: 'PART',
    softTypeId: 'PART_MECHANICAL',
    sourceFieldKey: 'iba_tech_desc',
    sourceFieldName: 'technicalDescription',
    sourceDisplayName: '技术规格描述',
    sourceDataType: 'LONG_TEXT',
    sourceDataTypeLabel: '长文本',
    manticoreField: 'search_text_spec',
    manticoreType: 'TEXT',
    displayTitle: '技术规格全文索引',
    displayType: 'FULLTEXT',
    queryCapability: 'FULLTEXT_SEARCH',
    isQueryCondition: false,
    isSortable: false,
    isDisplayInResult: false,
    isFulltextSearch: true,
    isUniqueKey: false,
    configStatus: 'DRAFT',
    hasDraftModification: false,
    dataStatus: 'NO_SYNC_NEEDED',
    isDataImpactingChange: true,
    lastConfigVersion: 'v1.3.0-draft',
    updatedAt: '2026-09-01 11:15:00',
    updatedBy: '王明 (机械工程师)'
  },

  // -------------------------------------------------------------
  // B. 电子电气零件 (PART_ELECTRICAL)
  // 生效 4 (2个已同步，2个待同步)
  // -------------------------------------------------------------
  {
    id: 'MAP-101',
    rootTypeId: 'PART',
    softTypeId: 'PART_ELECTRICAL',
    sourceFieldKey: 'iba_part_number',
    sourceFieldName: 'partNumber',
    sourceDisplayName: '物料编码',
    sourceDataType: 'TEXT',
    sourceDataTypeLabel: '文本',
    manticoreField: 'part_number',
    manticoreType: 'STRING',
    displayTitle: '元器件编码',
    displayType: 'CONDITION_QUERY',
    queryCapability: 'QUERY_CONDITION',
    isQueryCondition: true,
    isSortable: true,
    isDisplayInResult: true,
    isFulltextSearch: false,
    isUniqueKey: true,
    defaultColumnWidth: 160,
    configStatus: 'ACTIVE',
    hasDraftModification: false,
    dataStatus: 'SYNC_SUCCESS',
    isDataImpactingChange: false,
    lastConfigVersion: 'v1.0.0',
    updatedAt: '2026-08-25 03:00:00',
    updatedBy: '赵丽 (电气工程师)'
  },
  {
    id: 'MAP-102',
    rootTypeId: 'PART',
    softTypeId: 'PART_ELECTRICAL',
    sourceFieldKey: 'iba_part_name',
    sourceFieldName: 'partName',
    sourceDisplayName: '元器件品名',
    sourceDataType: 'TEXT',
    sourceDataTypeLabel: '文本',
    manticoreField: 'part_name',
    manticoreType: 'STRING',
    displayTitle: '元器件名称',
    displayType: 'CONDITION_QUERY',
    queryCapability: 'BOTH',
    isQueryCondition: true,
    isSortable: true,
    isDisplayInResult: true,
    isFulltextSearch: true,
    isUniqueKey: false,
    defaultColumnWidth: 180,
    configStatus: 'ACTIVE',
    hasDraftModification: false,
    dataStatus: 'SYNC_SUCCESS',
    isDataImpactingChange: false,
    lastConfigVersion: 'v1.0.0',
    updatedAt: '2026-08-25 03:00:00',
    updatedBy: '赵丽 (电气工程师)'
  },
  {
    id: 'MAP-103',
    rootTypeId: 'PART',
    softTypeId: 'PART_ELECTRICAL',
    sourceFieldKey: 'iba_rated_voltage',
    sourceFieldName: 'ratedVoltage',
    sourceDisplayName: '额定电压',
    sourceDataType: 'NUMERIC_WITH_UNIT',
    sourceDataTypeLabel: '带单位数值',
    unitFamily: '电压 (Voltage)',
    defaultUnit: 'V',
    manticoreField: 'rated_voltage_v',
    manticoreType: 'FLOAT',
    displayTitle: '额定工作电压 (V)',
    displayType: 'CONDITION_QUERY',
    queryCapability: 'QUERY_CONDITION',
    isQueryCondition: true,
    isSortable: true,
    isDisplayInResult: true,
    isFulltextSearch: false,
    isUniqueKey: false,
    defaultColumnWidth: 140,
    configStatus: 'ACTIVE',
    hasDraftModification: false,
    dataStatus: 'PENDING_SYNC', // 已发布但数据待同步！
    isDataImpactingChange: true,
    lastConfigVersion: 'v1.1.0',
    updatedAt: '2026-08-30 09:15:00',
    updatedBy: '赵丽 (电气工程师)'
  },
  {
    id: 'MAP-104',
    rootTypeId: 'PART',
    softTypeId: 'PART_ELECTRICAL',
    sourceFieldKey: 'iba_capacitance',
    sourceFieldName: 'capacitance',
    sourceDisplayName: '静电容量',
    sourceDataType: 'NUMERIC_WITH_UNIT',
    sourceDataTypeLabel: '带单位数值',
    unitFamily: '电容 (Capacitance)',
    defaultUnit: 'uF',
    manticoreField: 'capacitance_uf',
    manticoreType: 'FLOAT',
    displayTitle: '标称静电容量 (uF)',
    displayType: 'CONDITION_QUERY',
    queryCapability: 'QUERY_CONDITION',
    isQueryCondition: true,
    isSortable: true,
    isDisplayInResult: true,
    isFulltextSearch: false,
    isUniqueKey: false,
    defaultColumnWidth: 140,
    configStatus: 'ACTIVE',
    hasDraftModification: false,
    dataStatus: 'PENDING_SYNC', // 已发布但数据待同步！
    isDataImpactingChange: true,
    lastConfigVersion: 'v1.1.0',
    updatedAt: '2026-08-30 09:15:00',
    updatedBy: '赵丽 (电气工程师)'
  },

  // -------------------------------------------------------------
  // C. 标准紧固件 (PART_FASTENER)
  // 生效 3
  // -------------------------------------------------------------
  {
    id: 'MAP-201',
    rootTypeId: 'PART',
    softTypeId: 'PART_FASTENER',
    sourceFieldKey: 'iba_fastener_code',
    sourceFieldName: 'fastenerCode',
    sourceDisplayName: '标准件编码',
    sourceDataType: 'TEXT',
    sourceDataTypeLabel: '文本',
    manticoreField: 'fastener_code',
    manticoreType: 'STRING',
    displayTitle: '紧固件编码',
    displayType: 'LINK',
    queryCapability: 'QUERY_CONDITION',
    isQueryCondition: true,
    isSortable: true,
    isDisplayInResult: true,
    isFulltextSearch: false,
    isUniqueKey: true,
    defaultColumnWidth: 150,
    configStatus: 'ACTIVE',
    hasDraftModification: false,
    dataStatus: 'SYNC_FAILED',
    isDataImpactingChange: false,
    lastConfigVersion: 'v1.0.0',
    updatedAt: '2026-08-24 10:00:00',
    updatedBy: '张强 (标准件工程师)'
  },
  {
    id: 'MAP-202',
    rootTypeId: 'PART',
    softTypeId: 'PART_FASTENER',
    sourceFieldKey: 'iba_fastener_standard',
    sourceFieldName: 'standardSpec',
    sourceDisplayName: '执行标准号',
    sourceDataType: 'TEXT',
    sourceDataTypeLabel: '文本',
    manticoreField: 'standard_spec',
    manticoreType: 'STRING',
    displayTitle: '执行标准号 (GB/ISO)',
    displayType: 'CONDITION_QUERY',
    queryCapability: 'QUERY_CONDITION',
    isQueryCondition: true,
    isSortable: true,
    isDisplayInResult: true,
    isFulltextSearch: false,
    isUniqueKey: false,
    defaultColumnWidth: 180,
    configStatus: 'ACTIVE',
    hasDraftModification: false,
    dataStatus: 'SYNC_FAILED',
    isDataImpactingChange: false,
    lastConfigVersion: 'v1.0.0',
    updatedAt: '2026-08-24 10:00:00',
    updatedBy: '张强 (标准件工程师)'
  },
  {
    id: 'MAP-203',
    rootTypeId: 'PART',
    softTypeId: 'PART_FASTENER',
    sourceFieldKey: 'iba_thread_spec',
    sourceFieldName: 'threadSpec',
    sourceDisplayName: '螺纹规格',
    sourceDataType: 'TEXT',
    sourceDataTypeLabel: '文本',
    manticoreField: 'thread_spec',
    manticoreType: 'STRING',
    displayTitle: '公称螺纹规格',
    displayType: 'CONDITION_QUERY',
    queryCapability: 'QUERY_CONDITION',
    isQueryCondition: true,
    isSortable: true,
    isDisplayInResult: true,
    isFulltextSearch: false,
    isUniqueKey: false,
    defaultColumnWidth: 140,
    configStatus: 'ACTIVE',
    hasDraftModification: false,
    dataStatus: 'SYNC_FAILED',
    isDataImpactingChange: false,
    lastConfigVersion: 'v1.0.0',
    updatedAt: '2026-08-24 10:00:00',
    updatedBy: '张强 (标准件工程师)'
  },

  // -------------------------------------------------------------
  // D. 技术规范与说明书 (DOC_SPEC)
  // 生效 3 + 纯草稿 1
  // -------------------------------------------------------------
  {
    id: 'MAP-301',
    rootTypeId: 'DOCUMENT',
    softTypeId: 'DOC_SPEC',
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
    configStatus: 'ACTIVE',
    hasDraftModification: false,
    dataStatus: 'SYNC_SUCCESS',
    isDataImpactingChange: false,
    lastConfigVersion: 'v1.0.0',
    updatedAt: '2026-08-22 11:00:00',
    updatedBy: '陈琳 (文档管理员)'
  },
  {
    id: 'MAP-302',
    rootTypeId: 'DOCUMENT',
    softTypeId: 'DOC_SPEC',
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
    configStatus: 'ACTIVE',
    hasDraftModification: false,
    dataStatus: 'SYNC_SUCCESS',
    isDataImpactingChange: false,
    lastConfigVersion: 'v1.0.0',
    updatedAt: '2026-08-22 11:00:00',
    updatedBy: '陈琳 (文档管理员)'
  },
  {
    id: 'MAP-303',
    rootTypeId: 'DOCUMENT',
    softTypeId: 'DOC_SPEC',
    sourceFieldKey: 'iba_doc_version',
    sourceFieldName: 'docVersion',
    sourceDisplayName: '文档版本',
    sourceDataType: 'TEXT',
    sourceDataTypeLabel: '文本',
    manticoreField: 'doc_version',
    manticoreType: 'STRING',
    displayTitle: '文档大版本',
    displayType: 'CONDITION_QUERY',
    queryCapability: 'QUERY_CONDITION',
    isQueryCondition: true,
    isSortable: true,
    isDisplayInResult: true,
    isFulltextSearch: false,
    isUniqueKey: false,
    defaultColumnWidth: 100,
    configStatus: 'ACTIVE',
    hasDraftModification: false,
    dataStatus: 'SYNC_SUCCESS',
    isDataImpactingChange: false,
    lastConfigVersion: 'v1.0.0',
    updatedAt: '2026-08-22 11:00:00',
    updatedBy: '陈琳 (文档管理员)'
  },
  {
    id: 'MAP-304',
    rootTypeId: 'DOCUMENT',
    softTypeId: 'DOC_SPEC',
    sourceFieldKey: 'iba_doc_content',
    sourceFieldName: 'documentContent',
    sourceDisplayName: '文档正文内容',
    sourceDataType: 'LONG_TEXT',
    sourceDataTypeLabel: '长文本',
    manticoreField: 'doc_fulltext_body',
    manticoreType: 'TEXT',
    displayTitle: '文档正文全文检索',
    displayType: 'FULLTEXT',
    queryCapability: 'FULLTEXT_SEARCH',
    isQueryCondition: false,
    isSortable: false,
    isDisplayInResult: false,
    isFulltextSearch: true,
    isUniqueKey: false,
    configStatus: 'DRAFT',
    hasDraftModification: false,
    dataStatus: 'NO_SYNC_NEEDED',
    isDataImpactingChange: true,
    lastConfigVersion: 'v1.1.0-draft',
    updatedAt: '2026-09-01 15:00:00',
    updatedBy: '陈琳 (文档管理员)'
  },

  // -------------------------------------------------------------
  // E. 装配工程图纸 (DOC_DRAWING)
  // 生效 2
  // -------------------------------------------------------------
  {
    id: 'MAP-401',
    rootTypeId: 'DOCUMENT',
    softTypeId: 'DOC_DRAWING',
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
    isUniqueKey: true,
    defaultColumnWidth: 180,
    configStatus: 'ACTIVE',
    hasDraftModification: false,
    dataStatus: 'SYNC_SUCCESS',
    isDataImpactingChange: false,
    lastConfigVersion: 'v1.0.0',
    updatedAt: '2026-08-20 16:00:00',
    updatedBy: '刘洋 (制图组长)'
  },
  {
    id: 'MAP-402',
    rootTypeId: 'DOCUMENT',
    softTypeId: 'DOC_DRAWING',
    sourceFieldKey: 'iba_sheet_size',
    sourceFieldName: 'sheetSize',
    sourceDisplayName: '图幅尺寸 (A0-A4)',
    sourceDataType: 'ENUM',
    sourceDataTypeLabel: '枚举',
    manticoreField: 'sheet_size',
    manticoreType: 'STRING',
    displayTitle: '图幅幅面',
    displayType: 'ENUM_BADGE',
    queryCapability: 'QUERY_CONDITION',
    isQueryCondition: true,
    isSortable: false,
    isDisplayInResult: true,
    isFulltextSearch: false,
    isUniqueKey: false,
    defaultColumnWidth: 120,
    configStatus: 'ACTIVE',
    hasDraftModification: false,
    dataStatus: 'SYNC_SUCCESS',
    isDataImpactingChange: false,
    lastConfigVersion: 'v1.0.0',
    updatedAt: '2026-08-20 16:00:00',
    updatedBy: '刘洋 (制图组长)'
  },

  // -------------------------------------------------------------
  // F. 机加工艺路线 (PROCESS_ROUTE)
  // 仅草稿 2
  // -------------------------------------------------------------
  {
    id: 'MAP-501',
    rootTypeId: 'PROCESS',
    softTypeId: 'PROCESS_ROUTE',
    sourceFieldKey: 'iba_route_code',
    sourceFieldName: 'routeCode',
    sourceDisplayName: '工艺路线编码',
    sourceDataType: 'TEXT',
    sourceDataTypeLabel: '文本',
    manticoreField: 'route_code',
    manticoreType: 'STRING',
    displayTitle: '路线编码',
    displayType: 'CONDITION_QUERY',
    queryCapability: 'QUERY_CONDITION',
    isQueryCondition: true,
    isSortable: true,
    isDisplayInResult: true,
    isFulltextSearch: false,
    isUniqueKey: true,
    defaultColumnWidth: 160,
    configStatus: 'DRAFT',
    hasDraftModification: false,
    dataStatus: 'NO_SYNC_NEEDED',
    isDataImpactingChange: true,
    lastConfigVersion: 'v0.1.0-draft',
    updatedAt: '2026-08-29 09:00:00',
    updatedBy: '孙工 (工艺主管)'
  },
  {
    id: 'MAP-502',
    rootTypeId: 'PROCESS',
    softTypeId: 'PROCESS_ROUTE',
    sourceFieldKey: 'iba_work_center',
    sourceFieldName: 'workCenter',
    sourceDisplayName: '负责工作中心',
    sourceDataType: 'TEXT',
    sourceDataTypeLabel: '文本',
    manticoreField: 'work_center',
    manticoreType: 'STRING',
    displayTitle: '主责工作中心',
    displayType: 'CONDITION_QUERY',
    queryCapability: 'QUERY_CONDITION',
    isQueryCondition: true,
    isSortable: true,
    isDisplayInResult: true,
    isFulltextSearch: false,
    isUniqueKey: false,
    defaultColumnWidth: 180,
    configStatus: 'DRAFT',
    hasDraftModification: false,
    dataStatus: 'NO_SYNC_NEEDED',
    isDataImpactingChange: true,
    lastConfigVersion: 'v0.1.0-draft',
    updatedAt: '2026-08-29 09:30:00',
    updatedBy: '孙工 (工艺主管)'
  }
];

// 5. 一阶段正式查询预览模拟数据集 (覆盖全部已配置软类型)
export const mockStage1PreviewData: Record<string, Stage1PreviewRecord[]> = {
  PART_MECHANICAL: [
    {
      id: 'REC-001',
      partNumber: 'P-10029',
      partName: '高速传动主轴',
      material: '42CrMo4',
      nominalDiameter: '45.0',
      categoryPath: '机械零部件 / 轴系零件 / 传动轴',
      manufacturerName: '沪东重型机械',
      lifecycleState: '已发布',
      createTime: '2026-03-12 10:20:00',
      technicalDescription: '用于高精度数控机床主轴传动，高频淬火硬度 HRC58-62',
      updateCount: 18
    },
    {
      id: 'REC-002',
      partNumber: 'P-10030',
      partName: '精密主轴滑动轴承座',
      material: 'QT600-3',
      nominalDiameter: '80.0',
      categoryPath: '机械零部件 / 轴承附件 / 轴承座',
      manufacturerName: '大连机床附件厂',
      lifecycleState: '已发布',
      createTime: '2026-04-05 14:30:00',
      technicalDescription: '内孔精密镗削 Ra0.4，同轴度 0.005mm',
      updateCount: 16
    },
    {
      id: 'REC-003',
      partNumber: 'P-10045',
      partName: '法兰联轴器半联',
      material: '45#',
      nominalDiameter: '60.0',
      categoryPath: '机械零部件 / 联轴器与离合器',
      manufacturerName: '上海联轴器总厂',
      lifecycleState: '已发布',
      createTime: '2026-05-18 09:00:00',
      technicalDescription: '表面发黑防锈处理，键槽对称度 0.02mm',
      updateCount: 12
    },
    {
      id: 'REC-004',
      partNumber: 'P-10088',
      partName: '减速机输出轴箱盖',
      material: 'HT250',
      nominalDiameter: '120.0',
      categoryPath: '机械零部件 / 箱体与盖板',
      manufacturerName: '通用重工',
      lifecycleState: '已发布',
      createTime: '2026-06-20 16:45:00',
      technicalDescription: '平面研磨密封，气密性试验 0.6MPa 保压',
      updateCount: 9
    }
  ],
  PART_ELECTRICAL: [
    {
      id: 'REC-E01',
      partNumber: 'E-4001',
      partName: '大功率固态继电器',
      ratedVoltage: '24.0',
      capacitance: '10.0',
      categoryPath: '电子元器件 / 继电器',
      lifecycleState: '已发布',
      updateCount: 8
    },
    {
      id: 'REC-E02',
      partNumber: 'E-4002',
      partName: '高频贴片陶瓷电容',
      ratedVoltage: '50.0',
      capacitance: '100.0',
      categoryPath: '电子元器件 / 电容器',
      lifecycleState: '已发布',
      updateCount: 5
    }
  ],
  PART_FASTENER: [
    {
      id: 'REC-F01',
      fastenerCode: 'GB-HEX-M12-50',
      standardSpec: 'GB/T 5782-2016',
      threadSpec: 'M12×1.75'
    },
    {
      id: 'REC-F02',
      fastenerCode: 'ISO-NUT-M10',
      standardSpec: 'ISO 4032-2012',
      threadSpec: 'M10×1.5'
    }
  ],
  DOC_SPEC: [
    {
      id: 'REC-D01',
      docNumber: 'TS-2026-001',
      docTitle: '主轴高速动态平衡测试设计规范',
      docVersion: 'A.2'
    },
    {
      id: 'REC-D02',
      docNumber: 'TS-2026-002',
      docTitle: '高精度滑动轴承温升与润滑检验标准',
      docVersion: 'B.0'
    }
  ],
  DOC_DRAWING: [
    {
      id: 'REC-DW01',
      drawingNo: 'DWG-0029-A',
      sheetSize: 'A1'
    },
    {
      id: 'REC-DW02',
      drawingNo: 'DWG-0030-B',
      sheetSize: 'A2'
    }
  ],
  PROCESS_ROUTE: []
};
