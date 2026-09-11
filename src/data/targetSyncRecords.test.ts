import assert from 'node:assert/strict';
import test from 'node:test';
import { getCurrentTargetSyncRecords, TargetSyncRecord } from './targetSyncRecords';

const record = (
  id: string,
  status: TargetSyncRecord['status'],
  receivedAt: string,
  overrides: Partial<TargetSyncRecord> = {},
): TargetSyncRecord => ({
  id,
  rootTypeCode: 'PART',
  stagingTable: 'stg_part',
  targetIndex: 'idx_part',
  sourceObjectOid: 'OR:wt.part.WTPart:1',
  businessKey: 'PART-1|Design|CN01',
  operationType: 'UPDATE',
  receivedAt,
  processedAt: status === 'PENDING' ? undefined : receivedAt,
  status,
  retryCount: 0,
  traceId: `TRACE-${id}`,
  payload: {},
  ...overrides,
});

test('current queue keeps only the latest record for each root type and business key', () => {
  const rows = [
    record('A', 'PROCESSED', '2026-09-08 09:00:00'),
    record('B', 'FAILED', '2026-09-08 09:01:00'),
    record('C', 'FAILED', '2026-09-08 09:02:00'),
    record('D', 'PROCESSED', '2026-09-08 09:03:00'),
  ];
  assert.deepEqual(getCurrentTargetSyncRecords(rows).map((item) => item.id), ['D']);
});

test('a newer pending or failed record remains current even after an earlier success', () => {
  const pending = getCurrentTargetSyncRecords([
    record('D', 'PROCESSED', '2026-09-08 09:03:00'),
    record('E', 'PENDING', '2026-09-08 09:04:00'),
  ]);
  assert.equal(pending[0].id, 'E');
  assert.equal(pending[0].status, 'PENDING');

  const failed = getCurrentTargetSyncRecords([
    record('D', 'PROCESSED', '2026-09-08 09:03:00'),
    record('E', 'FAILED', '2026-09-08 09:04:00'),
  ]);
  assert.equal(failed[0].id, 'E');
  assert.equal(failed[0].status, 'FAILED');
});

test('identical business keys from different root types are counted separately', () => {
  const rows = [
    record('PART-LATEST', 'PROCESSED', '2026-09-08 09:03:00'),
    record('DOC-LATEST', 'FAILED', '2026-09-08 09:04:00', {
      rootTypeCode: 'DOCUMENT',
      stagingTable: 'stg_document',
      targetIndex: 'idx_document',
    }),
  ];
  assert.deepEqual(getCurrentTargetSyncRecords(rows).map((item) => item.id), ['DOC-LATEST', 'PART-LATEST']);
});
