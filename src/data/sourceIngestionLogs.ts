export type IngestionStatus = 'RUNNING' | 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILED';

export interface SourceIngestionLog {
  id: string;
  rootTypeCode: 'PART' | 'DOCUMENT' | 'PROCESS';
  sourceSystemName: string;
  sourceTable: string;
  stagingTable: string;
  mode: 'FULL' | 'INCREMENTAL';
  startedAt: string;
  endedAt?: string;
  readCount?: number;
  writtenCount?: number;
  failedCount?: number;
  status: IngestionStatus;
  errorSummary?: string;
  traceId?: string;
}

export const initialSourceIngestionLogs: SourceIngestionLog[] = [
  {
    id: 'ING-20260908-003', rootTypeCode: 'PART', sourceSystemName: 'PLM', sourceTable: 'WTPart', stagingTable: 'stg_part',
    mode: 'INCREMENTAL', startedAt: '2026-09-08 09:00:02', endedAt: '2026-09-08 09:01:18',
    readCount: 382, writtenCount: 381, failedCount: 1, status: 'PARTIAL_SUCCESS',
    errorSummary: '1 条记录字段长度超出中间表限制', traceId: 'TRC-ING-0908-003',
  },
  {
    id: 'ING-20260908-002', rootTypeCode: 'DOCUMENT', sourceSystemName: 'PLM', sourceTable: 'EPMDocument', stagingTable: 'stg_document',
    mode: 'INCREMENTAL', startedAt: '2026-09-08 08:30:01', endedAt: '2026-09-08 08:31:05',
    readCount: 126, writtenCount: 126, failedCount: 0, status: 'SUCCESS', traceId: 'TRC-ING-0908-002',
  },
  {
    id: 'ING-20260908-001', rootTypeCode: 'PROCESS', sourceSystemName: 'PLM', sourceTable: 'WTProcessPlan', stagingTable: 'stg_process',
    mode: 'INCREMENTAL', startedAt: '2026-09-08 08:00:00', endedAt: '2026-09-08 08:00:16',
    status: 'FAILED', errorSummary: '读取账号凭证失效，未取得源表数据量', traceId: 'TRC-ING-0908-001',
  },
  {
    id: 'ING-20260907-006', rootTypeCode: 'PART', sourceSystemName: 'PLM', sourceTable: 'WTPart', stagingTable: 'stg_part',
    mode: 'INCREMENTAL', startedAt: '2026-09-07 18:00:03', endedAt: '2026-09-07 18:01:29',
    readCount: 514, writtenCount: 514, failedCount: 0, status: 'SUCCESS', traceId: 'TRC-ING-0907-006',
  },
  {
    id: 'ING-20260907-005', rootTypeCode: 'DOCUMENT', sourceSystemName: 'PLM', sourceTable: 'EPMDocument', stagingTable: 'stg_document',
    mode: 'INCREMENTAL', startedAt: '2026-09-07 16:30:02', endedAt: '2026-09-07 16:31:08',
    readCount: 208, writtenCount: 208, failedCount: 0, status: 'SUCCESS', traceId: 'TRC-ING-0907-005',
  },
  {
    id: 'ING-20260907-004', rootTypeCode: 'PROCESS', sourceSystemName: 'PLM', sourceTable: 'WTProcessPlan', stagingTable: 'stg_process',
    mode: 'INCREMENTAL', startedAt: '2026-09-07 14:00:01', endedAt: '2026-09-07 14:00:44',
    readCount: 86, writtenCount: 86, failedCount: 0, status: 'SUCCESS', traceId: 'TRC-ING-0907-004',
  },
  {
    id: 'ING-20260907-003', rootTypeCode: 'PART', sourceSystemName: 'PLM', sourceTable: 'WTPart', stagingTable: 'stg_part',
    mode: 'INCREMENTAL', startedAt: '2026-09-07 12:00:04', endedAt: '2026-09-07 12:01:17',
    readCount: 463, writtenCount: 463, failedCount: 0, status: 'SUCCESS', traceId: 'TRC-ING-0907-003',
  },
  {
    id: 'ING-20260907-002', rootTypeCode: 'DOCUMENT', sourceSystemName: 'PLM', sourceTable: 'EPMDocument', stagingTable: 'stg_document',
    mode: 'INCREMENTAL', startedAt: '2026-09-07 10:30:02', endedAt: '2026-09-07 10:31:16',
    readCount: 194, writtenCount: 192, failedCount: 2, status: 'PARTIAL_SUCCESS',
    errorSummary: '2 条记录的分类路径为空，已跳过并记录', traceId: 'TRC-ING-0907-002',
  },
  {
    id: 'ING-20260907-001', rootTypeCode: 'PROCESS', sourceSystemName: 'PLM', sourceTable: 'WTProcessPlan', stagingTable: 'stg_process',
    mode: 'INCREMENTAL', startedAt: '2026-09-07 08:00:02', endedAt: '2026-09-07 08:00:39',
    readCount: 72, writtenCount: 72, failedCount: 0, status: 'SUCCESS', traceId: 'TRC-ING-0907-001',
  },
  {
    id: 'ING-20260906-003', rootTypeCode: 'PART', sourceSystemName: 'PLM', sourceTable: 'WTPart', stagingTable: 'stg_part',
    mode: 'INCREMENTAL', startedAt: '2026-09-06 18:00:01', endedAt: '2026-09-06 18:00:22',
    status: 'FAILED', errorSummary: '源端连接超时，未取得本批次读取数量', traceId: 'TRC-ING-0906-003',
  },
  {
    id: 'ING-20260906-002', rootTypeCode: 'DOCUMENT', sourceSystemName: 'PLM', sourceTable: 'EPMDocument', stagingTable: 'stg_document',
    mode: 'INCREMENTAL', startedAt: '2026-09-06 16:30:03', endedAt: '2026-09-06 16:31:11',
    readCount: 176, writtenCount: 176, failedCount: 0, status: 'SUCCESS', traceId: 'TRC-ING-0906-002',
  },
  {
    id: 'ING-20260906-001', rootTypeCode: 'PROCESS', sourceSystemName: 'PLM', sourceTable: 'WTProcessPlan', stagingTable: 'stg_process',
    mode: 'INCREMENTAL', startedAt: '2026-09-06 14:00:02', endedAt: '2026-09-06 14:00:48',
    readCount: 91, writtenCount: 90, failedCount: 1, status: 'PARTIAL_SUCCESS',
    errorSummary: '1 条工艺路线缺少版本标识，已跳过并记录', traceId: 'TRC-ING-0906-001',
  },
];

export const ingestionStatusLabel: Record<IngestionStatus, string> = {
  RUNNING: '采集中', SUCCESS: '成功', PARTIAL_SUCCESS: '部分成功', FAILED: '失败',
};
