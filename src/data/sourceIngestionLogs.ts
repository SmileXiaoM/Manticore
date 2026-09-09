export type IngestionStatus = 'PARTIAL_SUCCESS' | 'FAILED';

export interface SourceIngestionIssue {
  code: string;
  name: string;
  failedCount: number;
  description: string;
  exampleObjectIds?: string[];
}

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
  issues?: SourceIngestionIssue[];
  traceId?: string;
}

export const initialSourceIngestionLogs: SourceIngestionLog[] = [
  {
    id: 'ING-20260908-003', rootTypeCode: 'PART', sourceSystemName: 'PLM', sourceTable: 'WTPart', stagingTable: 'stg_part',
    mode: 'INCREMENTAL', startedAt: '2026-09-08 09:00:02', endedAt: '2026-09-08 09:01:18',
    readCount: 382, writtenCount: 376, failedCount: 6, status: 'PARTIAL_SUCCESS',
    errorSummary: '共 6 条失败，涉及 3 类异常',
    issues: [
      {
        code: 'FIELD_LENGTH_EXCEEDED', name: '字段长度超限', failedCount: 3,
        description: '来源字段内容超过中间表字段长度限制，记录未写入。',
        exampleObjectIds: ['PART-2026-003821', 'PART-2026-003846', 'PART-2026-003879'],
      },
      {
        code: 'REQUIRED_FIELD_MISSING', name: '必填字段缺失', failedCount: 2,
        description: '对象唯一标识或必要业务字段为空，记录未写入。',
        exampleObjectIds: ['PART-2026-003894', 'PART-2026-003901'],
      },
      {
        code: 'TYPE_CONVERSION_FAILED', name: '字段类型转换失败', failedCount: 1,
        description: '来源值无法转换为中间表定义的数据类型，记录未写入。',
        exampleObjectIds: ['PART-2026-003917'],
      },
    ],
    traceId: 'TRC-ING-0908-003',
  },
  {
    id: 'ING-20260908-001', rootTypeCode: 'PROCESS', sourceSystemName: 'PLM', sourceTable: 'WTProcessPlan', stagingTable: 'stg_process',
    mode: 'INCREMENTAL', startedAt: '2026-09-08 08:00:00', endedAt: '2026-09-08 08:00:16',
    status: 'FAILED', errorSummary: '读取账号凭证失效，未取得源表数据量', traceId: 'TRC-ING-0908-001',
  },
  {
    id: 'ING-20260907-002', rootTypeCode: 'DOCUMENT', sourceSystemName: 'PLM', sourceTable: 'EPMDocument', stagingTable: 'stg_document',
    mode: 'INCREMENTAL', startedAt: '2026-09-07 10:30:02', endedAt: '2026-09-07 10:31:16',
    readCount: 194, writtenCount: 192, failedCount: 2, status: 'PARTIAL_SUCCESS',
    errorSummary: '2 条记录的分类路径为空，已跳过并记录', traceId: 'TRC-ING-0907-002',
  },
  {
    id: 'ING-20260906-003', rootTypeCode: 'PART', sourceSystemName: 'PLM', sourceTable: 'WTPart', stagingTable: 'stg_part',
    mode: 'INCREMENTAL', startedAt: '2026-09-06 18:00:01', endedAt: '2026-09-06 18:00:22',
    status: 'FAILED', errorSummary: '源端连接超时，未取得本批次读取数量', traceId: 'TRC-ING-0906-003',
  },
  {
    id: 'ING-20260906-001', rootTypeCode: 'PROCESS', sourceSystemName: 'PLM', sourceTable: 'WTProcessPlan', stagingTable: 'stg_process',
    mode: 'INCREMENTAL', startedAt: '2026-09-06 14:00:02', endedAt: '2026-09-06 14:00:48',
    readCount: 91, writtenCount: 90, failedCount: 1, status: 'PARTIAL_SUCCESS',
    errorSummary: '1 条工艺路线缺少版本标识，已跳过并记录', traceId: 'TRC-ING-0906-001',
  },
];

export const ingestionStatusLabel: Record<IngestionStatus, string> = {
  PARTIAL_SUCCESS: '部分写入', FAILED: '任务失败',
};
