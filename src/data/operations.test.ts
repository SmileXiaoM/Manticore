import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildOverview,
  newSchedule,
  nextScheduledAt,
  validateSchedule,
  classifyPresence,
  PresenceSnapshot,
} from './operations';
import { initialMappingObjectTypes } from '../stage1MappingData';
import { initialSyncBatches } from '../syncQualityData';
import { initialConsistencyBatches } from './consistencyCheckData';

test('schedule computes the next Beijing daily, weekly and anchored hourly occurrence', () => {
  const base = { ...newSchedule('PART'), enabled: true, time: '02:00' };
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
  assert.equal(validateSchedule({ ...base, frequency: 'HOURLY', intervalHours: 0 }).length > 0, true);
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
  assert.equal(rows.find((row) => row.root.id === 'DOCUMENT')?.latestCheck?.rootTypeCode, 'DOCUMENT');
  assert.equal(
    buildOverview(initialMappingObjectTypes, [], []).every(
      (row) => !row.latestSync && !row.latestCheck && row.unresolvedTasks === 0,
    ),
    true,
  );
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
