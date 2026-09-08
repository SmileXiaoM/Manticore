import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DataConsistencyCheckView } from '../components/DataConsistencyCheckView';
import { initialFieldMappings } from '../stage1MappingData';
import { SyncBatch } from '../syncQualityTypes';
import { ConsistencyCheckRequest, calculateConsistencyStats, createConsistencyBatchId } from '../types/consistencyCheck';
import { buildComparisonFieldSnapshot, executeConsistencyRun, findLatestSuccessfulSyncBatch } from './consistencyCheckData';

const snapshot = buildComparisonFieldSnapshot('DOCUMENT', Object.values(initialFieldMappings).flat()).snapshot;
assert.ok(snapshot);

const request = (overrides: Partial<ConsistencyCheckRequest> = {}): ConsistencyCheckRequest => ({
  rootTypeCode: 'DOCUMENT', rootTypeName: '文档', scopeMode: 'RANDOM_SAMPLE', sampleCount: 5,
  comparisonFieldSnapshot: snapshot, ...overrides
});

const sync = (id: string, overrides: Partial<SyncBatch> = {}): SyncBatch => ({
  id, jobName: id, taskType: 'SYNC', rootTypes: ['Document'], syncMethod: 'FULL', triggerType: 'MANUAL',
  startTime: '2026-09-08 08:00:00', endTime: '2026-09-08 08:01:00', executionStatus: 'SUCCESS',
  failedRecords: [], ...overrides
});

test('page renders without selected detail, including a genuinely empty task collection', () => {
  const initialPage = renderToStaticMarkup(React.createElement(DataConsistencyCheckView));
  assert.match(initialPage, /数据一致性核验/);
  assert.doesNotMatch(initialPage, /batch-detail-drawer-overlay/);
  const emptyPage = renderToStaticMarkup(React.createElement(DataConsistencyCheckView, { batches: [] }));
  assert.match(emptyPage, /暂无核验任务/);
  assert.match(emptyPage, /暂无核验记录/);
  assert.doesNotMatch(emptyPage, /batch-detail-drawer-overlay/);
  assert.doesNotMatch(emptyPage, /（0 \/ 0）/);
});

test('invalid sample counts fail at execution, without generating sample objects', () => {
  for (const scopeMode of ['RANDOM_SAMPLE', 'EXHAUSTIVE_SCOPE'] as const) {
    for (const sampleCount of [undefined, 0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      const result = executeConsistencyRun(request({ scopeMode, sampleCount, scopeId: 'SCOPE_DOC_DRAWING' }), 'CC-count-test');
      assert.equal(result.id, 'CC-count-test');
      assert.equal(result.status, 'FAILED');
      assert.equal(result.failedStage, '核验请求校验');
      assert.equal(result.actualCount, 0);
      assert.deepEqual(result.objectResults, []);
      assert.deepEqual(result.frozenObjectIds, []);
    }
  }
});

test('missing and cross-root scopes, empty IDs, unknown modes, and mismatched snapshots fail closed', () => {
  const invalidRequests: ConsistencyCheckRequest[] = [
    request({ scopeMode: 'EXHAUSTIVE_SCOPE', scopeId: undefined }),
    request({ scopeMode: 'EXHAUSTIVE_SCOPE', scopeId: 'SCOPE_PART_FASTENER' }),
    request({ scopeMode: 'SPECIFIC_IDS', requestedObjectIds: [] }),
    request({ scopeMode: 'SPECIFIC_IDS', requestedObjectIds: [' ', '\n'] }),
    request({ scopeMode: 'SPECIFIC_IDS', requestedObjectIds: undefined }),
    // @ts-expect-error a malformed non-array payload must fail rather than throw in the failure description
    request({ scopeMode: 'SPECIFIC_IDS', requestedObjectIds: 'DOC-INVALID' }),
    // @ts-expect-error array entries are also validated at the execution boundary
    request({ scopeMode: 'SPECIFIC_IDS', requestedObjectIds: [42] }),
    request({ rootTypeCode: 'UNKNOWN' }),
    request({ rootTypeCode: 'toString' }),
    request({ comparisonFieldSnapshot: { ...snapshot, rootTypeCode: 'PART' } }),
    // @ts-expect-error exercise malformed requests from a non-TypeScript caller
    request({ scopeMode: 'SPECIFIC_IDS', requestedObjectIds: 'bad' }),
    // A non-TypeScript caller must not turn an unknown mode into random sampling.
    // @ts-expect-error exercise the runtime boundary
    request({ scopeMode: 'UNKNOWN' })
  ];
  for (const req of invalidRequests) {
    const result = executeConsistencyRun(req);
    assert.equal(result.status, 'FAILED');
    assert.equal(result.failedStage, '核验请求校验');
    assert.deepEqual(result.objectResults, []);
  }
});

test('specific IDs remain exact after trimming and deduplication; failure keeps the supplied task ID', () => {
  const req = request({ scopeMode: 'SPECIFIC_IDS', requestedObjectIds: ['DOC-CUSTOM-1', ' DOC-CUSTOM-2 ', 'DOC-CUSTOM-1'] });
  const result = executeConsistencyRun(req, 'CC-completion-test');
  assert.equal(result.id, 'CC-completion-test');
  assert.equal(result.status, 'COMPLETED');
  assert.deepEqual(result.frozenObjectIds, ['DOC-CUSTOM-1', 'DOC-CUSTOM-2']);
  assert.deepEqual(result.requestedObjectIds, result.frozenObjectIds);
  assert.deepEqual(result.objectResults.map(object => object.objectId), result.frozenObjectIds);
  assert.ok(result.objectResults.every(object => object.rootTypeCode === 'DOCUMENT' && object.selectedReason === 'MANUAL_SPECIFIED'));
  const failure = executeConsistencyRun({ ...req, simulateFailure: true }, 'CC-running-test');
  assert.equal(failure.id, 'CC-running-test');
  assert.equal(failure.status, 'FAILED');
  assert.equal(failure.failedStage, 'PLM 数据批量读取');
  assert.deepEqual(failure.objectResults, []);
});

test('exhaustive runs retain the requested scope reason, and pending states stay outside the rate', () => {
  const exhaustive = executeConsistencyRun(request({ scopeMode: 'EXHAUSTIVE_SCOPE', sampleCount: 28, scopeId: 'SCOPE_DOC_DRAWING' }));
  assert.equal(exhaustive.status, 'COMPLETED');
  assert.equal(exhaustive.actualCount, 28);
  assert.ok(exhaustive.objectResults.every(object => object.selectedReason === 'SCOPE_EXHAUSTIVE'));
  const result = executeConsistencyRun(request({ scopeMode: 'SPECIFIC_IDS', requestedObjectIds: ['DOC-OK', 'DOC-DIFF', 'DOC-MISS', 'DOC-PENDING', 'DOC-UNABLE'] }));
  assert.equal(calculateConsistencyStats(result).rateDisplay, '33.3%（1 / 3）');
  assert.equal(result.objectResults.find(object => object.objectId === 'DOC-MISS')?.status, 'INCONSISTENT');
  assert.equal(result.pendingRecheckCount, 1);
  assert.equal(result.incompleteCount, 1);
});

test('sync association picks the latest reliable completed same-root sync, regardless of array order', () => {
  const older = sync('old');
  const latest = sync('latest', { endTime: '2026-09-08 12:00:00', executionStatus: 'PARTIAL_SUCCESS' });
  const reset = sync('reset', { taskType: 'RESET', endTime: '2026-09-08 16:00:00' });
  const otherRoot = sync('other-root', { rootTypes: ['Part'], endTime: '2026-09-08 17:00:00' });
  const failed = sync('failed', { executionStatus: 'FAILED', endTime: '2026-09-08 18:00:00' });
  assert.equal(findLatestSuccessfulSyncBatch([older, reset, otherRoot, failed, latest], 'DOCUMENT')?.id, 'latest');
  assert.equal(findLatestSuccessfulSyncBatch([latest, older, reset], 'DOCUMENT')?.id, 'latest');
  assert.equal(findLatestSuccessfulSyncBatch([sync('legacy', { taskType: undefined })], 'DOCUMENT')?.id, 'legacy');
  assert.equal(findLatestSuccessfulSyncBatch([sync('unmarked', { taskType: undefined, syncMethod: undefined })], 'DOCUMENT'), undefined);
});

test('sync association falls back to valid start time and excludes invalid calendar dates', () => {
  const startFallback = sync('start-fallback', { startTime: '2026-09-08 11:00:00', endTime: undefined });
  assert.equal(findLatestSuccessfulSyncBatch([sync('older'), startFallback], 'DOCUMENT')?.id, 'start-fallback');
  const invalid = sync('invalid', { startTime: 'not a date', endTime: '2026-02-30 08:00:00' });
  assert.equal(findLatestSuccessfulSyncBatch([invalid], 'DOCUMENT'), undefined);
  const laterStart = sync('later-start', { startTime: '2026-09-08 08:00:30' });
  assert.equal(findLatestSuccessfulSyncBatch([sync('older-start'), laterStart], 'DOCUMENT')?.id, 'later-start');
  assert.equal(findLatestSuccessfulSyncBatch([], 'DOCUMENT'), undefined);
});

test('new consistency task IDs preserve a full UUID', () => {
  const ids = Array.from({ length: 20 }, () => createConsistencyBatchId());
  assert.equal(new Set(ids).size, ids.length);
  ids.forEach(id => assert.match(id, /^CC-\d{8}-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/));
});
