import assert from 'node:assert/strict';
import test from 'node:test';
import { initialFieldMappings } from '../stage1MappingData';
import { ConsistencyPlan, calculateConsistencyStats } from '../types/consistencyCheck';
import { buildComparisonFieldSnapshot, executeConsistencyRun } from './consistencyCheckData';
import { resolvePlanSnapshot, preparePlanRun } from './consistencyPlans';

const fields = Object.values(initialFieldMappings).flat();
function plan(root = 'PART'): ConsistencyPlan {
  const formal = buildComparisonFieldSnapshot(root, fields).snapshot!;
  return {
    id: `plan-${root}`,
    name: `${root} 核验方案`,
    rootTypeCode: root,
    scopeRule: 'ALL_ROOT',
    uniqueKeyFieldKey: formal.uniqueKeyField.sourceFieldKey,
    comparisonFieldKeys: [formal.includedFields[0].sourceFieldKey],
    comparisonRule: 'FORMAL_MAPPING',
    allowedModes: ['RANDOM_SAMPLE', 'SPECIFIC_IDS', 'EXHAUSTIVE_SCOPE'],
    defaultMode: 'RANDOM_SAMPLE',
  };
}

test('plans use only same-root formal fields, a separate configured unique key, and a non-empty fixed subset', () => {
  for (const root of ['PART', 'DOCUMENT']) {
    const p = plan(root);
    const resolved = resolvePlanSnapshot(p, fields);
    assert.ok(resolved.snapshot);
    assert.equal(resolved.snapshot.includedFields.length, 1);
    assert.equal(resolved.snapshot.rootTypeCode, root);
    assert.notEqual(resolved.snapshot.includedFields[0].sourceFieldKey, p.uniqueKeyFieldKey);
    const other = plan(root === 'PART' ? 'DOCUMENT' : 'PART');
    for (const invalid of [
      { ...p, uniqueKeyFieldKey: other.uniqueKeyFieldKey },
      { ...p, comparisonFieldKeys: other.comparisonFieldKeys },
      { ...p, comparisonFieldKeys: [p.uniqueKeyFieldKey] },
      { ...p, comparisonFieldKeys: [] },
      { ...p, comparisonFieldKeys: ['fabricated_field'] },
      { ...p, allowedModes: [] },
      { ...p, allowedModes: ['SPECIFIC_IDS'] as const },
    ])
      assert.ok(resolvePlanSnapshot(invalid as ConsistencyPlan, fields).error);
    const unavailable = fields.map((field) =>
      p.comparisonFieldKeys.includes(field.sourceFieldKey) && field.rootTypeId === root
        ? { ...field, isInFormalQueryBase: false }
        : field,
    );
    assert.ok(resolvePlanSnapshot(p, unavailable).error);
  }
});

test('empty display names fall back to stable field codes, and the missing-name flag is frozen', () => {
  const p = plan();
  const missing = fields.map((field) =>
    field.rootTypeId === 'PART'
      ? { ...field, sourceDisplayName: '  ', displayTitle: '旧标题', sourceFieldName: 'oldName' }
      : field,
  );
  const snapshot = resolvePlanSnapshot(p, missing).snapshot!;
  assert.equal(snapshot.uniqueKeyField.displayName, p.uniqueKeyFieldKey);
  assert.equal(snapshot.uniqueKeyField.isDisplayNameMissing, true);
  assert.equal(snapshot.includedFields[0].displayName, p.comparisonFieldKeys[0]);
  assert.equal(snapshot.includedFields[0].isDisplayNameMissing, true);
});

test('launch freezes plan, chosen fields and comparison rules independently of later edits', () => {
  const p = plan('DOCUMENT');
  const prepared = preparePlanRun(p, fields, '文档', 'SPECIFIC_IDS', 50, ['DOC-ONE', ' DOC-TWO ', 'DOC-ONE']);
  assert.ok(prepared.request);
  const originalKey = p.comparisonFieldKeys[0];
  p.name = '已修改名称';
  p.comparisonFieldKeys.length = 0;
  p.rootTypeCode = 'PART';
  const result = executeConsistencyRun(prepared.request);
  assert.equal(result.status, 'COMPLETED');
  assert.equal(result.planName, 'DOCUMENT 核验方案');
  assert.equal(result.rootTypeCode, 'DOCUMENT');
  assert.deepEqual(result.frozenObjectIds, ['DOC-ONE', 'DOC-TWO']);
  assert.deepEqual(
    result.comparisonFieldSnapshot!.includedFields.map((field) => field.sourceFieldKey),
    [originalKey],
  );
  prepared.request.comparisonFieldSnapshot.includedFields[0].comparisonMethod = 'changed';
  prepared.request.planSnapshot!.name = 'changed again';
  assert.notEqual(result.comparisonFieldSnapshot!.includedFields[0].comparisonMethod, 'changed');
  assert.equal(result.planSnapshot!.name, 'DOCUMENT 核验方案');
});

test('scope-dependent launches fail closed for all modes until PLM data is available', () => {
  const p = plan();
  assert.match(preparePlanRun(p, fields, '零部件', 'EXHAUSTIVE_SCOPE', 50, []).error!, /请选择范围条件/);
  p.scopeRule = 'PLM_SCOPE';
  for (const mode of ['RANDOM_SAMPLE', 'SPECIFIC_IDS'] as const) {
    assert.match(preparePlanRun(p, fields, '零部件', mode, 50, ['P-1']).error!, /需从 PLM 读取/);
  }
  p.scopeRule = 'ALL_ROOT';
  p.allowedModes = ['SPECIFIC_IDS'];
  p.defaultMode = 'SPECIFIC_IDS';
  assert.match(preparePlanRun(p, fields, '零部件', 'RANDOM_SAMPLE', 50, []).error!, /不允许/);
  assert.ok(preparePlanRun(p, fields, '零部件', 'SPECIFIC_IDS', 50, []).error);
});

test('a thrown record error is recorded while subsequent objects complete; rate excludes errors', () => {
  const req = preparePlanRun(plan(), fields, '零部件', 'SPECIFIC_IDS', 50, ['P-FIRST', 'P-BROKEN', 'P-LAST']).request!;
  req.simulateObjectErrorIds = ['P-BROKEN'];
  const result = executeConsistencyRun(req);
  assert.equal(result.status, 'COMPLETED_WITH_ERRORS');
  assert.equal(result.actualCount, 3);
  assert.equal(result.consistentCount, 2);
  assert.equal(result.incompleteCount, 1);
  assert.equal(result.objectResults[1].status, 'UNABLE_TO_COMPARE');
  assert.equal(result.objectResults[2].status, 'CONSISTENT');
  assert.equal(calculateConsistencyStats(result).rateDisplay, '100.0%（2 / 2）');
  req.simulateObjectErrorIds = ['P-FIRST', 'P-BROKEN', 'P-LAST'];
  assert.equal(calculateConsistencyStats(executeConsistencyRun(req)).rateDisplay, '--');
});

test('Process without formal fields is blocked instead of borrowing Part or Document fields', () => {
  const processPlan = { ...plan(), rootTypeCode: 'PROCESS' };
  assert.ok(resolvePlanSnapshot(processPlan, fields).error);
  assert.equal(buildComparisonFieldSnapshot('PROCESS', fields).snapshot, undefined);
});
