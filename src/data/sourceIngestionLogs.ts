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
];

export const ingestionStatusLabel: Record<IngestionStatus, string> = {
  RUNNING: '采集中', SUCCESS: '成功', PARTIAL_SUCCESS: '部分成功', FAILED: '失败',
};
