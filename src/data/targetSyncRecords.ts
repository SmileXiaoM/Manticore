export type TargetSyncStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';
export interface TargetSyncRecord {
  id: string;
  objectId: string;
  rootTypeCode: 'PART' | 'DOCUMENT' | 'PROCESS';
  stagingTable: string;
  targetIndex: string;
  detectedAt: string;
  processedAt?: string;
  status: TargetSyncStatus;
  attempt: number;
  errorCode?: string;
  errorSummary?: string;
  traceId: string;
}
export const targetSyncStatusLabel: Record<TargetSyncStatus, string> = {
  PENDING: '待处理', PROCESSING: '处理中', SUCCESS: '同步成功', FAILED: '同步失败',
};
export const initialTargetSyncRecords: TargetSyncRecord[] = [
  { id: 'MSG-OUT-0908-0020', objectId: 'PART-2026-003917', rootTypeCode: 'PART', stagingTable: 'stg_part', targetIndex: 'idx_part', detectedAt: '2026-09-08 09:02:00', status: 'PENDING', attempt: 0, traceId: 'TRC-OUT-0908-0020' },
  { id: 'MSG-OUT-0908-0019', objectId: 'DOC-SPEC-2026-0208', rootTypeCode: 'DOCUMENT', stagingTable: 'stg_document', targetIndex: 'idx_document', detectedAt: '2026-09-08 09:01:58', status: 'PENDING', attempt: 0, traceId: 'TRC-OUT-0908-0019' },
  { id: 'MSG-OUT-0908-0018', objectId: 'PART-2026-003901', rootTypeCode: 'PART', stagingTable: 'stg_part', targetIndex: 'idx_part', detectedAt: '2026-09-08 09:01:56', status: 'PROCESSING', attempt: 1, traceId: 'TRC-OUT-0908-0018' },
  { id: 'MSG-OUT-0908-0017', objectId: 'DOC-DWG-88142', rootTypeCode: 'DOCUMENT', stagingTable: 'stg_document', targetIndex: 'idx_document', detectedAt: '2026-09-08 09:01:51', processedAt: '2026-09-08 09:01:53', status: 'FAILED', attempt: 1, errorCode: 'ENUM_NOT_MAPPED', errorSummary: '图幅枚举 A0_EXTENDED 未在目标索引中定义。', traceId: 'TRC-OUT-0908-0017' },
  { id: 'MSG-OUT-0908-0016', objectId: 'PART-2026-003821', rootTypeCode: 'PART', stagingTable: 'stg_part', targetIndex: 'idx_part', detectedAt: '2026-09-08 09:01:48', processedAt: '2026-09-08 09:01:49', status: 'SUCCESS', attempt: 1, traceId: 'TRC-OUT-0908-0016' },
  { id: 'MSG-OUT-0908-0015', objectId: 'DOC-DWG-88141', rootTypeCode: 'DOCUMENT', stagingTable: 'stg_document', targetIndex: 'idx_document', detectedAt: '2026-09-08 09:01:45', processedAt: '2026-09-08 09:01:46', status: 'SUCCESS', attempt: 1, traceId: 'TRC-OUT-0908-0015' },
  { id: 'MSG-OUT-0908-0014', objectId: 'PART-2026-003802', rootTypeCode: 'PART', stagingTable: 'stg_part', targetIndex: 'idx_part', detectedAt: '2026-09-08 09:00:58', processedAt: '2026-09-08 09:00:59', status: 'SUCCESS', attempt: 1, traceId: 'TRC-OUT-0908-0014' },
  { id: 'MSG-OUT-0908-0013', objectId: 'DOC-SPEC-2026-0199', rootTypeCode: 'DOCUMENT', stagingTable: 'stg_document', targetIndex: 'idx_document', detectedAt: '2026-09-08 09:00:55', processedAt: '2026-09-08 09:00:56', status: 'FAILED', attempt: 2, errorCode: 'CHARACTER_ENCODING', errorSummary: '正文包含不可解析控制字符，索引写入失败。', traceId: 'TRC-OUT-0908-0013' },
  { id: 'MSG-OUT-0908-0012', objectId: 'PART-2026-003790', rootTypeCode: 'PART', stagingTable: 'stg_part', targetIndex: 'idx_part', detectedAt: '2026-09-08 09:00:52', processedAt: '2026-09-08 09:00:53', status: 'SUCCESS', attempt: 1, traceId: 'TRC-OUT-0908-0012' },
  { id: 'MSG-OUT-0908-0011', objectId: 'DOC-DWG-88138', rootTypeCode: 'DOCUMENT', stagingTable: 'stg_document', targetIndex: 'idx_document', detectedAt: '2026-09-08 09:00:49', processedAt: '2026-09-08 09:00:50', status: 'SUCCESS', attempt: 1, traceId: 'TRC-OUT-0908-0011' },
  { id: 'MSG-OUT-0908-0010', objectId: 'PART-2026-003788', rootTypeCode: 'PART', stagingTable: 'stg_part', targetIndex: 'idx_part', detectedAt: '2026-09-08 09:00:46', processedAt: '2026-09-08 09:00:47', status: 'SUCCESS', attempt: 1, traceId: 'TRC-OUT-0908-0010' },
  { id: 'MSG-OUT-0908-0009', objectId: 'DOC-DWG-88135', rootTypeCode: 'DOCUMENT', stagingTable: 'stg_document', targetIndex: 'idx_document', detectedAt: '2026-09-08 09:00:43', processedAt: '2026-09-08 09:00:44', status: 'SUCCESS', attempt: 1, traceId: 'TRC-OUT-0908-0009' },
  { id: 'MSG-OUT-0908-0008', objectId: 'PART-2026-003781', rootTypeCode: 'PART', stagingTable: 'stg_part', targetIndex: 'idx_part', detectedAt: '2026-09-08 09:00:40', processedAt: '2026-09-08 09:00:41', status: 'SUCCESS', attempt: 1, traceId: 'TRC-OUT-0908-0008' },
  { id: 'MSG-OUT-0908-0007', objectId: 'DOC-DWG-88131', rootTypeCode: 'DOCUMENT', stagingTable: 'stg_document', targetIndex: 'idx_document', detectedAt: '2026-09-08 09:00:37', processedAt: '2026-09-08 09:00:38', status: 'SUCCESS', attempt: 1, traceId: 'TRC-OUT-0908-0007' },
];
