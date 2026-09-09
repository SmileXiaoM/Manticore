export type TargetSyncStatus = 'PENDING' | 'PROCESSED' | 'FAILED';
export type TargetSyncOperation = 'CREATE' | 'UPDATE' | 'DELETE';

export interface TargetSyncRecord {
  id: string;
  rootTypeCode: 'PART' | 'DOCUMENT' | 'PROCESS';
  stagingTable: string;
  targetIndex: string;
  sourceObjectOid: string;
  businessKey: string;
  operationType: TargetSyncOperation;
  receivedAt: string;
  processedAt?: string;
  status: TargetSyncStatus;
  retryCount: number;
  errorCode?: string;
  failureReason?: string;
  traceId: string;
  payload: Record<string, unknown>;
}

export const targetSyncStatusLabel: Record<TargetSyncStatus, string> = {
  PENDING: '待处理',
  PROCESSED: '已处理',
  FAILED: '失败',
};

export const targetSyncOperationLabel: Record<TargetSyncOperation, string> = {
  CREATE: '新增',
  UPDATE: '修改',
  DELETE: '删除',
};

const partPayload = (number: string, name: string, masterOid: string, view = 'Design', plant = 'CN01') => ({
  oid: masterOid.replace('WTPartMaster', 'WTPart'),
  masterOid,
  number,
  name,
  view,
  plant,
  lifecycleState: 'RELEASED',
  source: 'Windchill PLM',
});

const documentPayload = (number: string, name: string, oid: string) => ({
  oid,
  number,
  name,
  version: 'A.3',
  documentType: '技术文档',
  source: 'Windchill PLM',
});

export const initialTargetSyncRecords: TargetSyncRecord[] = [
  {
    id: 'STG-PART-0908-0020', rootTypeCode: 'PART', stagingTable: 'stg_part', targetIndex: 'idx_part',
    sourceObjectOid: 'OR:wt.part.WTPart:3917', businessKey: 'OR:wt.part.WTPartMaster:3917|Design|CN01', operationType: 'CREATE',
    receivedAt: '2026-09-08 09:02:00', status: 'PENDING', retryCount: 0, traceId: 'TRC-OUT-0908-0020',
    payload: partPayload('PART-2026-003917', '液压阀体组件', 'OR:wt.part.WTPartMaster:3917'),
  },
  {
    id: 'STG-DOC-0908-0019', rootTypeCode: 'DOCUMENT', stagingTable: 'stg_document', targetIndex: 'idx_document',
    sourceObjectOid: 'OR:wt.doc.WTDocument:208', businessKey: 'DOC-SPEC-2026-0208', operationType: 'UPDATE',
    receivedAt: '2026-09-08 09:01:58', status: 'PENDING', retryCount: 1,
    errorCode: 'TARGET_TIMEOUT', failureReason: '上次写入目标索引超时，已由人工重新入队。', traceId: 'TRC-OUT-0908-0019',
    payload: documentPayload('DOC-SPEC-2026-0208', '液压系统设计规范', 'OR:wt.doc.WTDocument:208'),
  },
  {
    id: 'STG-PART-0908-0018', rootTypeCode: 'PART', stagingTable: 'stg_part', targetIndex: 'idx_part',
    sourceObjectOid: 'OR:wt.part.WTPart:3901', businessKey: 'OR:wt.part.WTPartMaster:3901|Design|CN01', operationType: 'UPDATE',
    receivedAt: '2026-09-08 09:01:56', processedAt: '2026-09-08 09:01:57', status: 'PROCESSED', retryCount: 0, traceId: 'TRC-OUT-0908-0018',
    payload: partPayload('PART-2026-003901', '伺服阀安装座', 'OR:wt.part.WTPartMaster:3901'),
  },
  {
    id: 'STG-DOC-0908-0017', rootTypeCode: 'DOCUMENT', stagingTable: 'stg_document', targetIndex: 'idx_document',
    sourceObjectOid: 'OR:wt.doc.WTDocument:88142', businessKey: 'DOC-DWG-88142', operationType: 'UPDATE',
    receivedAt: '2026-09-08 09:01:51', processedAt: '2026-09-08 09:01:53', status: 'FAILED', retryCount: 1,
    errorCode: 'ENUM_NOT_MAPPED', failureReason: '图幅枚举 A0_EXTENDED 未在目标索引中定义。', traceId: 'TRC-OUT-0908-0017',
    payload: { ...documentPayload('DOC-DWG-88142', '总装布置图', 'OR:wt.doc.WTDocument:88142'), sheetSize: 'A0_EXTENDED' },
  },
  {
    id: 'STG-PART-0908-0016', rootTypeCode: 'PART', stagingTable: 'stg_part', targetIndex: 'idx_part',
    sourceObjectOid: 'OR:wt.part.WTPart:3821', businessKey: 'OR:wt.part.WTPartMaster:3821|Design|CN01', operationType: 'CREATE',
    receivedAt: '2026-09-08 09:01:48', processedAt: '2026-09-08 09:01:49', status: 'PROCESSED', retryCount: 0, traceId: 'TRC-OUT-0908-0016',
    payload: partPayload('PART-2026-003821', '齿轮轴', 'OR:wt.part.WTPartMaster:3821'),
  },
  {
    id: 'STG-DOC-0908-0015', rootTypeCode: 'DOCUMENT', stagingTable: 'stg_document', targetIndex: 'idx_document',
    sourceObjectOid: 'OR:wt.doc.WTDocument:88141', businessKey: 'DOC-DWG-88141', operationType: 'DELETE',
    receivedAt: '2026-09-08 09:01:45', processedAt: '2026-09-08 09:01:46', status: 'PROCESSED', retryCount: 0, traceId: 'TRC-OUT-0908-0015',
    payload: { oid: 'OR:wt.doc.WTDocument:88141', number: 'DOC-DWG-88141', deleted: true, source: 'Windchill PLM' },
  },
  {
    id: 'STG-PART-0908-0014', rootTypeCode: 'PART', stagingTable: 'stg_part', targetIndex: 'idx_part',
    sourceObjectOid: 'OR:wt.part.WTPart:3802', businessKey: 'OR:wt.part.WTPartMaster:3802|Design|CN01', operationType: 'UPDATE',
    receivedAt: '2026-09-08 09:00:58', processedAt: '2026-09-08 09:00:59', status: 'PROCESSED', retryCount: 0, traceId: 'TRC-OUT-0908-0014',
    payload: partPayload('PART-2026-003802', '法兰盘', 'OR:wt.part.WTPartMaster:3802'),
  },
  {
    id: 'STG-DOC-0908-0013', rootTypeCode: 'DOCUMENT', stagingTable: 'stg_document', targetIndex: 'idx_document',
    sourceObjectOid: 'OR:wt.doc.WTDocument:199', businessKey: 'DOC-SPEC-2026-0199', operationType: 'CREATE',
    receivedAt: '2026-09-08 09:00:55', processedAt: '2026-09-08 09:00:56', status: 'FAILED', retryCount: 2,
    errorCode: 'CHARACTER_ENCODING', failureReason: '正文包含不可解析控制字符，索引写入失败。', traceId: 'TRC-OUT-0908-0013',
    payload: { ...documentPayload('DOC-SPEC-2026-0199', '材料选型规范', 'OR:wt.doc.WTDocument:199'), contentEncoding: 'GBK-MIXED' },
  },
  {
    id: 'STG-PART-0908-0012', rootTypeCode: 'PART', stagingTable: 'stg_part', targetIndex: 'idx_part',
    sourceObjectOid: 'OR:wt.part.WTPart:3790', businessKey: 'OR:wt.part.WTPartMaster:3790|Design|CN02', operationType: 'CREATE',
    receivedAt: '2026-09-08 09:00:52', processedAt: '2026-09-08 09:00:53', status: 'PROCESSED', retryCount: 0, traceId: 'TRC-OUT-0908-0012',
    payload: partPayload('PART-2026-003790', '轴承座', 'OR:wt.part.WTPartMaster:3790', 'Design', 'CN02'),
  },
  {
    id: 'STG-DOC-0908-0011', rootTypeCode: 'DOCUMENT', stagingTable: 'stg_document', targetIndex: 'idx_document',
    sourceObjectOid: 'OR:wt.doc.WTDocument:88138', businessKey: 'DOC-DWG-88138', operationType: 'UPDATE',
    receivedAt: '2026-09-08 09:00:49', processedAt: '2026-09-08 09:00:50', status: 'PROCESSED', retryCount: 0, traceId: 'TRC-OUT-0908-0011',
    payload: documentPayload('DOC-DWG-88138', '电气原理图', 'OR:wt.doc.WTDocument:88138'),
  },
  {
    id: 'STG-PART-0908-0010', rootTypeCode: 'PART', stagingTable: 'stg_part', targetIndex: 'idx_part',
    sourceObjectOid: 'OR:wt.part.WTPart:3788', businessKey: 'OR:wt.part.WTPartMaster:3788|Design|CN01', operationType: 'UPDATE',
    receivedAt: '2026-09-08 09:00:46', processedAt: '2026-09-08 09:00:47', status: 'PROCESSED', retryCount: 0, traceId: 'TRC-OUT-0908-0010',
    payload: partPayload('PART-2026-003788', '端盖', 'OR:wt.part.WTPartMaster:3788'),
  },
  {
    id: 'STG-DOC-0908-0009', rootTypeCode: 'DOCUMENT', stagingTable: 'stg_document', targetIndex: 'idx_document',
    sourceObjectOid: 'OR:wt.doc.WTDocument:88135', businessKey: 'DOC-DWG-88135', operationType: 'UPDATE',
    receivedAt: '2026-09-08 09:00:43', processedAt: '2026-09-08 09:00:44', status: 'PROCESSED', retryCount: 0, traceId: 'TRC-OUT-0908-0009',
    payload: documentPayload('DOC-DWG-88135', '管路装配图', 'OR:wt.doc.WTDocument:88135'),
  },
  {
    id: 'STG-PART-0908-0008', rootTypeCode: 'PART', stagingTable: 'stg_part', targetIndex: 'idx_part',
    sourceObjectOid: 'OR:wt.part.WTPart:3781', businessKey: 'OR:wt.part.WTPartMaster:3781|Design|CN01', operationType: 'DELETE',
    receivedAt: '2026-09-08 09:00:40', processedAt: '2026-09-08 09:00:41', status: 'PROCESSED', retryCount: 0, traceId: 'TRC-OUT-0908-0008',
    payload: { oid: 'OR:wt.part.WTPart:3781', masterOid: 'OR:wt.part.WTPartMaster:3781', view: 'Design', plant: 'CN01', deleted: true },
  },
  {
    id: 'STG-DOC-0908-0007', rootTypeCode: 'DOCUMENT', stagingTable: 'stg_document', targetIndex: 'idx_document',
    sourceObjectOid: 'OR:wt.doc.WTDocument:88131', businessKey: 'DOC-DWG-88131', operationType: 'CREATE',
    receivedAt: '2026-09-08 09:00:37', processedAt: '2026-09-08 09:00:38', status: 'PROCESSED', retryCount: 0, traceId: 'TRC-OUT-0908-0007',
    payload: documentPayload('DOC-DWG-88131', '零件加工图', 'OR:wt.doc.WTDocument:88131'),
  },
];
