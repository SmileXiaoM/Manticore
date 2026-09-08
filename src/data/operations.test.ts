import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildOverview,
  newSchedule,
  nextScheduledAt,
  validateSchedule,
  stageLogFor,
  classifyPresence,
  PresenceSnapshot,
  SyncStageLog,
} from './operations';
import { initialMappingObjectTypes } from '../stage1MappingData';
import { initialSyncBatches } from '../syncQualityData';
import { initialConsistencyBatches } from './consistencyCheckData';
import { ConsistencyPlan } from '../types/consistencyCheck';

test('schedule computes the next Beijing daily, weekly and anchored hourly occurrence', () => {
  const base = { ...newSchedule('SYNC', 'PART'), enabled: true, time: '02:00' };
  assert.equal(nextScheduledAt(base, new Date('2026-09-08T17:59:00Z')), '2026-09-08T18:00:00.000Z');
  assert.equal(nextScheduledAt(base, new Date('2026-09-08T18:00:00Z')), '2026-09-09T18:00:00.000Z');
  assert.equal(
    nextScheduledAt({ ...base, frequency: 'WEEKLY', weekday: 3 }, new Date('2026-09-08T18:00:00Z')),
    '2026-09-15T18:00:00.000Z',
  );
  assert.equal(
    nextScheduledAt(
      { ...base, frequency: 'HOURLY', intervalHours: 3, savedAt: '2026-09-08T00:00:00Z' },
      new Date('2026-09-08T04:00:00Z'),
    ),
    '2026-09-08T06:00:00.000Z',
  );
  assert.equal(nextScheduledAt({ ...base, enabled: false }, new Date()), undefined);
  assert.equal(nextScheduledAt({ ...base, time: '25:00' }, new Date()), undefined);
  assert.equal(validateSchedule({ ...base, frequency: 'HOURLY', intervalHours: 0 }, []).length > 0, true);
});

test('automatic verification requires a same-root eligible plan and bounded sample count', () => {
  const plan: ConsistencyPlan = {
    id: 'plan',
    name: '零件',
    rootTypeCode: 'PART',
    scopeRule: 'ALL_ROOT',
    uniqueKeyFieldKey: 'key',
    comparisonFieldKeys: ['name'],
    comparisonRule: 'FORMAL_MAPPING',
    allowedModes: ['RANDOM_SAMPLE'],
    defaultMode: 'RANDOM_SAMPLE',
  };
  const schedule = { ...newSchedule('VERIFY', 'PART'), enabled: true, planId: plan.id };
  assert.equal(validateSchedule(schedule, [plan]), '');
  assert.ok(validateSchedule({ ...schedule, rootTypeCode: 'DOCUMENT' }, [plan]));
  assert.ok(validateSchedule(schedule, [{ ...plan, scopeRule: 'PLM_SCOPE' }]));
  assert.ok(validateSchedule(schedule, [{ ...plan, allowedModes: ['SPECIFIC_IDS'] }]));
  assert.ok(validateSchedule({ ...schedule, sampleCount: 0 }, [plan]));
  assert.equal(validateSchedule({ ...schedule, enabled: false, planId: '' }, []), '');
});

test('dashboard isolates roots, orders by time, and ignores RESET as a sync', () => {
  const syncs = initialSyncBatches.filter((batch) => batch.taskType !== 'RESET');
  const part = syncs.find((batch) => batch.rootTypes.includes('Part'))!;
  const input = [
    { ...part, id: 'reset-later', taskType: 'RESET' as const, startTime: '2099-01-01 00:00:00' },
    { ...part, id: 'later', rootTypes: ['Part'] as const, startTime: '2026-09-09 00:00:00' },
    ...syncs,
  ];
  const rows = buildOverview(initialMappingObjectTypes, input as typeof syncs, initialConsistencyBatches);
  assert.equal(rows.find((row) => row.root.id === 'PART')?.latestSync?.id, 'later');
  assert.notEqual(rows.find((row) => row.root.id === 'DOCUMENT')?.latestSync?.id, 'later');
  assert.equal(rows.find((row) => row.root.id === 'DOCUMENT')?.latestCheck, undefined);
  assert.equal(
    buildOverview(initialMappingObjectTypes, [], []).every(
      (row) => !row.latestSync && !row.latestCheck && row.unresolvedTasks === 0,
    ),
    true,
  );
});

test('stage logs require exact task, root and stage; overall success never implies stage success', () => {
  const log: SyncStageLog = {
    batchId: 'A',
    rootTypeCode: 'PART',
    stage: 'SOURCE_TO_STAGING',
    status: 'SUCCESS',
    startedAt: '2026-09-08 00:00:00',
    errors: [],
  };
  assert.equal(stageLogFor([log], 'A', 'PART', 'SOURCE_TO_STAGING'), log);
  assert.equal(stageLogFor([log], 'B', 'PART', 'SOURCE_TO_STAGING'), undefined);
  assert.equal(stageLogFor([log], 'A', 'DOCUMENT', 'SOURCE_TO_STAGING'), undefined);
  assert.equal(stageLogFor([log], 'A', 'PART', 'STAGING_TO_TARGET'), undefined);
  assert.equal(stageLogFor(undefined, 'A', 'PART', 'SOURCE_TO_STAGING'), undefined);
});

test('target-only classification requires authoritative complete same-scope source evidence', () => {
  const snapshot: PresenceSnapshot = {
    rootTypeCode: 'PART',
    snapshotId: 's',
    capturedAt: '2026-09-08T00:00:00Z',
    sourceComplete: true,
    sameScope: true,
    authoritative: true,
    targetComplete: true,
    records: [],
  };
  const row = { objectId: 'P-1', targetId: '1', sourceResult: 'NOT_FOUND' as const };
  assert.equal(classifyPresence(snapshot, row).status, 'EXTRA');
  for (const change of [{ sourceComplete: false }, { authoritative: false }, { sameScope: false }])
    assert.equal(classifyPresence({ ...snapshot, ...change }, row).status, 'UNKNOWN');
  for (const sourceResult of ['FORBIDDEN', 'ERROR'] as const)
    assert.equal(classifyPresence(snapshot, { ...row, sourceResult }).status, 'UNKNOWN');
  assert.equal(classifyPresence(snapshot, { ...row, sourceResult: 'FOUND' }).status, 'PRESENT');
});
