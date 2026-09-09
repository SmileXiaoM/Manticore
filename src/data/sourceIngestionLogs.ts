export type IngestionStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';

export interface SourceIngestionLog {
  id: string;
  objectId: string;
  rootTypeCode: 'PART' | 'DOCUMENT' | 'PROCESS';
  sourceSystemName: string;
  sourceTable: string;
  stagingTable: string;
  receivedAt: string;
  processedAt?: string;
  status: IngestionStatus;
  errorCode?: string;
  errorSummary?: string;
  traceId: string;
}

export const initialSourceIngestionLogs: SourceIngestionLog[] = [
  { id: 'MSG-IN-0908-0016', objectId: 'PART-2026-003917', rootTypeCode: 'PART', sourceSystemName: 'PLM', sourceTable: 'WTPart', stagingTable: 'stg_part', receivedAt: '2026-09-08 09:01:14', status: 'PENDING', traceId: 'TRC-IN-0908-0016' },
  { id: 'MSG-IN-0908-0015', objectId: 'DOC-SPEC-2026-0208', rootTypeCode: 'DOCUMENT', sourceSystemName: 'PLM', sourceTable: 'EPMDocument', stagingTable: 'stg_document', receivedAt: '2026-09-08 09:01:12', status: 'PENDING', traceId: 'TRC-IN-0908-0015' },
  { id: 'MSG-IN-0908-0014', objectId: 'PART-2026-003901', rootTypeCode: 'PART', sourceSystemName: 'PLM', sourceTable: 'WTPart', stagingTable: 'stg_part', receivedAt: '2026-09-08 09:01:10', status: 'PROCESSING', traceId: 'TRC-IN-0908-0014' },
  { id: 'MSG-IN-0908-0013', objectId: 'PART-2026-003894', rootTypeCode: 'PART', sourceSystemName: 'PLM', sourceTable: 'WTPart', stagingTable: 'stg_part', receivedAt: '2026-09-08 09:01:08', processedAt: '2026-09-08 09:01:09', status: 'FAILED', errorCode: 'REQUIRED_FIELD_MISSING', errorSummary: '对象唯一标识为空，记录未写入中间表。', traceId: 'TRC-IN-0908-0013' },
  { id: 'MSG-IN-0908-0012', objectId: 'PART-2026-003879', rootTypeCode: 'PART', sourceSystemName: 'PLM', sourceTable: 'WTPart', stagingTable: 'stg_part', receivedAt: '2026-09-08 09:01:06', processedAt: '2026-09-08 09:01:07', status: 'FAILED', errorCode: 'FIELD_LENGTH_EXCEEDED', errorSummary: '规格描述超过中间表字段长度限制。', traceId: 'TRC-IN-0908-0012' },
  { id: 'MSG-IN-0908-0011', objectId: 'PART-2026-003846', rootTypeCode: 'PART', sourceSystemName: 'PLM', sourceTable: 'WTPart', stagingTable: 'stg_part', receivedAt: '2026-09-08 09:01:04', processedAt: '2026-09-08 09:01:05', status: 'FAILED', errorCode: 'TYPE_CONVERSION_FAILED', errorSummary: '公称直径无法转换为中间表数值类型。', traceId: 'TRC-IN-0908-0011' },
  { id: 'MSG-IN-0908-0010', objectId: 'PART-2026-003821', rootTypeCode: 'PART', sourceSystemName: 'PLM', sourceTable: 'WTPart', stagingTable: 'stg_part', receivedAt: '2026-09-08 09:01:02', processedAt: '2026-09-08 09:01:03', status: 'SUCCESS', traceId: 'TRC-IN-0908-0010' },
  { id: 'MSG-IN-0908-0009', objectId: 'DOC-DWG-88142', rootTypeCode: 'DOCUMENT', sourceSystemName: 'PLM', sourceTable: 'EPMDocument', stagingTable: 'stg_document', receivedAt: '2026-09-08 08:31:02', processedAt: '2026-09-08 08:31:03', status: 'SUCCESS', traceId: 'TRC-IN-0908-0009' },
  { id: 'MSG-IN-0908-0008', objectId: 'DOC-DWG-88141', rootTypeCode: 'DOCUMENT', sourceSystemName: 'PLM', sourceTable: 'EPMDocument', stagingTable: 'stg_document', receivedAt: '2026-09-08 08:31:00', processedAt: '2026-09-08 08:31:01', status: 'SUCCESS', traceId: 'TRC-IN-0908-0008' },
  { id: 'MSG-IN-0908-0007', objectId: 'PROC-PP-2026-0097', rootTypeCode: 'PROCESS', sourceSystemName: 'PLM', sourceTable: 'WTProcessPlan', stagingTable: 'stg_process', receivedAt: '2026-09-08 08:00:12', processedAt: '2026-09-08 08:00:13', status: 'FAILED', errorCode: 'SOURCE_CREDENTIAL_EXPIRED', errorSummary: '上游读取账号凭证失效，未取得完整对象数据。', traceId: 'TRC-IN-0908-0007' },
  { id: 'MSG-IN-0908-0006', objectId: 'PART-2026-003802', rootTypeCode: 'PART', sourceSystemName: 'PLM', sourceTable: 'WTPart', stagingTable: 'stg_part', receivedAt: '2026-09-08 07:59:58', processedAt: '2026-09-08 07:59:59', status: 'SUCCESS', traceId: 'TRC-IN-0908-0006' },
  { id: 'MSG-IN-0908-0005', objectId: 'DOC-SPEC-2026-0199', rootTypeCode: 'DOCUMENT', sourceSystemName: 'PLM', sourceTable: 'EPMDocument', stagingTable: 'stg_document', receivedAt: '2026-09-08 07:59:56', processedAt: '2026-09-08 07:59:57', status: 'SUCCESS', traceId: 'TRC-IN-0908-0005' },
  { id: 'MSG-IN-0908-0004', objectId: 'PART-2026-003790', rootTypeCode: 'PART', sourceSystemName: 'PLM', sourceTable: 'WTPart', stagingTable: 'stg_part', receivedAt: '2026-09-08 07:59:54', processedAt: '2026-09-08 07:59:55', status: 'SUCCESS', traceId: 'TRC-IN-0908-0004' },
  { id: 'MSG-IN-0908-0003', objectId: 'DOC-DWG-88138', rootTypeCode: 'DOCUMENT', sourceSystemName: 'PLM', sourceTable: 'EPMDocument', stagingTable: 'stg_document', receivedAt: '2026-09-08 07:59:52', processedAt: '2026-09-08 07:59:53', status: 'SUCCESS', traceId: 'TRC-IN-0908-0003' },
  { id: 'MSG-IN-0908-0002', objectId: 'PART-2026-003788', rootTypeCode: 'PART', sourceSystemName: 'PLM', sourceTable: 'WTPart', stagingTable: 'stg_part', receivedAt: '2026-09-08 07:59:50', processedAt: '2026-09-08 07:59:51', status: 'SUCCESS', traceId: 'TRC-IN-0908-0002' },
  { id: 'MSG-IN-0908-0001', objectId: 'DOC-DWG-88135', rootTypeCode: 'DOCUMENT', sourceSystemName: 'PLM', sourceTable: 'EPMDocument', stagingTable: 'stg_document', receivedAt: '2026-09-08 07:59:48', processedAt: '2026-09-08 07:59:49', status: 'SUCCESS', traceId: 'TRC-IN-0908-0001' },
];

export const ingestionStatusLabel: Record<IngestionStatus, string> = {
  PENDING: '待写入', PROCESSING: '写入中', SUCCESS: '写入成功', FAILED: '写入失败',
};
