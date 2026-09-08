import assert from 'node:assert/strict';
import test from 'node:test';
import { initialMappingObjectTypes, initialFieldMappings } from './stage1MappingData';
import {
  beginStage1Task, completeStage1Task, validateStage1TaskStart,
  Stage1RuntimeState, Stage1TaskRequest
} from './stage1SyncExecution';

const initialState = (): Stage1RuntimeState => ({
  mappingObjects: structuredClone(initialMappingObjectTypes),
  fieldMappings: structuredClone(Object.values(initialFieldMappings).flat()),
  batches: []
});
const request = (overrides: Partial<Stage1TaskRequest> = {}): Stage1TaskRequest => ({
  id: `RESET-${crypto.randomUUID()}`, taskType: 'RESET', rootTypeId: 'DOCUMENT',
  confirmedCode: 'DOCUMENT', hasPermission: true, startTime: '2026-09-08 16:00:00', ...overrides
});
const completedAt = new Date('2026-09-08T16:00:02');

test('task starts fail closed on permission, exact confirmation, unknown roots and shared running state', () => {
  const state = initialState();
  const req = request();
  assert.equal(validateStage1TaskStart(state, { ...req, hasPermission: false }).ok, false);
  assert.equal(beginStage1Task(state, { ...req, hasPermission: false }), state);
  for (const confirmedCode of ['document', ' DOCUMENT', 'DOCUMENT ', '', undefined]) {
    assert.equal(beginStage1Task(state, { ...req, confirmedCode }), state);
  }
  assert.equal(beginStage1Task(state, { ...req, rootTypeId: 'UNKNOWN' }), state);
  const running = beginStage1Task(state, req);
  assert.equal(running.batches.length, 1);
  assert.equal(beginStage1Task(running, request()), running);
  assert.equal(beginStage1Task(running, request({ taskType: 'SYNC' })), running);
  for (const syncStatus of ['RUNNING', 'RESETTING'] as const) {
    const blockedState = { ...state, mappingObjects: state.mappingObjects.map(root => ({ ...root, syncStatus })) };
    assert.equal(beginStage1Task(blockedState, req), blockedState);
  }
});

test('RESET stays distinct from sync and commits business state only upon success', () => {
  const state = initialState();
  const req = request();
  const running = beginStage1Task(state, req);
  assert.equal(running.batches[0].taskType, 'RESET');
  assert.equal(running.batches[0].syncMethod, undefined);
  assert.equal(running.batches[0].sourceDataCount, undefined);
  assert.equal(running.batches[0].resetAuditDetail?.deletedDocCount, undefined);
  assert.equal(running.mappingObjects, state.mappingObjects);
  assert.equal(running.fieldMappings, state.fieldMappings);

  const failed = completeStage1Task(running, req, { forceTaskFailure: true }, completedAt);
  assert.equal(failed.batches[0].executionStatus, 'FAILED');
  assert.equal(failed.batches[0].id, req.id);
  assert.equal(failed.mappingObjects, state.mappingObjects);
  assert.equal(failed.fieldMappings, state.fieldMappings);
  assert.equal(failed.batches[0].resetAuditDetail?.deletedDocCount, 0);

  const success = completeStage1Task(running, req, {}, completedAt);
  assert.equal(success.batches[0].executionStatus, 'SUCCESS');
  assert.equal(success.batches[0].id, req.id);
  assert.equal(success.mappingObjects.find(root => root.id === req.rootTypeId)?.manticoreDocCount, 0);
  assert.ok(success.fieldMappings.filter(field => field.rootTypeId === req.rootTypeId)
    .every(field => field.configStatus === 'DRAFT' && !field.isInFormalQueryBase));
  assert.deepEqual(success.mappingObjects.filter(root => root.id !== req.rootTypeId),
    state.mappingObjects.filter(root => root.id !== req.rootTypeId));
  assert.equal(completeStage1Task(success, req, { forceTaskFailure: true }), success);
});

test('reset deletion count remains unknown when the original target count is unknown', () => {
  const state = initialState();
  state.mappingObjects = state.mappingObjects.map(root => ({ ...root, manticoreDocCount: undefined }));
  const req = request();
  const completed = completeStage1Task(beginStage1Task(state, req), req, {}, completedAt);
  assert.equal(completed.batches[0].resetAuditDetail?.beforeDocCount, undefined);
  assert.equal(completed.batches[0].resetAuditDetail?.deletedDocCount, undefined);
});

test('new sync results preserve unknown counts and generate fresh task-scoped failures', () => {
  const state = initialState();
  const req = request({ id: `SYNC-${crypto.randomUUID()}`, taskType: 'SYNC', confirmedCode: undefined });
  const synced = completeStage1Task(beginStage1Task(state, req), req, {}, completedAt);
  const batch = synced.batches[0];
  assert.equal(batch.sourceDataCount, undefined);
  assert.equal(batch.successCount, undefined);
  assert.equal(synced.mappingObjects.find(root => root.id === req.rootTypeId)?.manticoreDocCount, undefined);
  assert.equal(batch.failedRecords.length, 1);
  assert.equal(batch.failedRecords[0].occurredAt, '2026-09-08 16:00:02');
  assert.ok(batch.failedRecords[0].id.startsWith(req.id));
  assert.equal(batch.failedRecords[0].latestRetryResult, 'NONE');
  assert.equal(state.mappingObjects.flatMap(root => root.lastSyncErrorRecords || [])
    .some(error => error.id === batch.failedRecords[0].id), false);

  const known = completeStage1Task(beginStage1Task(state, req), req,
    { sourceDataCount: 5, targetDataCount: 4 }, completedAt);
  assert.equal(known.batches[0].successCount, 4);
  assert.equal(known.mappingObjects.find(root => root.id === req.rootTypeId)?.manticoreDocCount, 4);
  const invalid = completeStage1Task(beginStage1Task(state, req), req, { sourceDataCount: NaN }, completedAt);
  assert.equal(invalid.batches[0].executionStatus, 'FAILED');
  assert.equal(invalid.fieldMappings, state.fieldMappings);
  assert.equal(invalid.mappingObjects, state.mappingObjects);
});

test('a completion cannot reuse a task ID for a different root, task type or start time', () => {
  const state = initialState();
  const req = request();
  const running = beginStage1Task(state, req);
  for (const mismatch of [{ rootTypeId: 'PART' }, { taskType: 'SYNC' as const }, { startTime: '2026-09-08 17:00:00' }]) {
    const rejected = completeStage1Task(running, { ...req, ...mismatch }, {}, completedAt);
    assert.equal(rejected.batches[0].executionStatus, 'FAILED');
    assert.equal(rejected.mappingObjects, state.mappingObjects);
    assert.equal(rejected.fieldMappings, state.fieldMappings);
  }
});
