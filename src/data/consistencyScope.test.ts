import assert from 'node:assert/strict';
import test from 'node:test';
import { initialFieldMappings } from '../stage1MappingData';
import { FieldMappingItem } from '../stage1MappingTypes';
import { buildComparisonFieldSnapshot } from './consistencyCheckData';
import { preparePlanRun } from './consistencyPlans';
import { ConsistencyPlan } from '../types/consistencyCheck';
import {
  ConsistencyScopeDraft,
  getScopeFields,
  newScopeDraft,
  SCOPE_QUERY_UNAVAILABLE,
  validateScopeDraft,
} from './consistencyScope';

const fields = Object.values(initialFieldMappings).flat();
const partFields = getScopeFields('PART', fields);
const time: ConsistencyScopeDraft = { ...newScopeDraft(), start: '2026-09-01T00:00', end: '2026-09-08T00:00' };
const condition = (fieldKey: string, value: string): ConsistencyScopeDraft => ({
  ...newScopeDraft(),
  kind: 'ATTRIBUTE',
  conditions: [{ id: 'one', fieldKey, operator: 'EQ', value }],
});

test('time ranges require two valid ordered boundaries, including leap-day validation', () => {
  assert.equal(validateScopeDraft(time, partFields), undefined);
  for (const change of [
    { start: '' },
    { end: '' },
    { end: time.start },
    { end: '2026-08-01T00:00' },
    { start: '2026-02-30T00:00' },
    { start: '2026-02-29T00:00' },
    { start: '2026-09-01T25:00' },
  ])
    assert.ok(validateScopeDraft({ ...time, ...change }, partFields));
  assert.equal(validateScopeDraft({ ...time, start: '2024-02-29T00:00' }, partFields), undefined);
});

test('attribute filters are root-specific and independent of comparison-field selection', () => {
  const key = partFields.find((field) => field.isUniqueKey)!.sourceFieldKey;
  assert.equal(validateScopeDraft(condition(key, 'P-001'), partFields), undefined);
  assert.ok(validateScopeDraft(condition(key, 'P-001'), getScopeFields('DOCUMENT', fields)));
  assert.ok(validateScopeDraft(condition('fabricated', 'anything'), partFields));
  assert.ok(validateScopeDraft(condition(key, '  '), partFields));
  assert.ok(validateScopeDraft({ ...condition(key, 'P-001'), conditions: [] }, partFields));
  const category = partFields.find((field) => field.sourceDataType === 'CATEGORY_TREE')!;
  assert.match(validateScopeDraft(condition(category.sourceFieldKey, 'fake'), partFields)!, /分类选项未加载/);
  assert.equal(
    validateScopeDraft(
      time,
      partFields.filter((field) => field.sourceDataType !== 'CATEGORY_TREE'),
    ),
    undefined,
  );
  assert.ok(
    getScopeFields('PART', fields).every(
      (field) => field.rootTypeId === 'PART' && field.configStatus === 'CONFIGURED' && field.isInFormalQueryBase,
    ),
  );
});

test('typed values, operators, and both halves of combined filters are validated', () => {
  const numeric: FieldMappingItem = { ...partFields[0], sourceDataType: 'NUMERIC', sourceFieldKey: 'numeric' };
  const boolean: FieldMappingItem = { ...numeric, sourceDataType: 'BOOLEAN', sourceFieldKey: 'boolean' };
  const date: FieldMappingItem = { ...numeric, sourceDataType: 'DATE', sourceFieldKey: 'date' };
  const typedFields = [numeric, boolean, date];
  assert.equal(validateScopeDraft(condition('numeric', '-1.25'), typedFields), undefined);
  assert.ok(validateScopeDraft(condition('numeric', 'abc'), typedFields));
  assert.ok(validateScopeDraft(condition('numeric', 'Infinity'), typedFields));
  const invalidOp = condition('numeric', '3');
  invalidOp.conditions[0].operator = 'CONTAINS';
  assert.ok(validateScopeDraft(invalidOp, typedFields));
  assert.equal(validateScopeDraft(condition('boolean', 'false'), typedFields), undefined);
  assert.ok(validateScopeDraft(condition('boolean', 'yes'), typedFields));
  assert.ok(validateScopeDraft(condition('date', '2026-02-30'), typedFields));
  const combined = {
    ...condition('numeric', '5'),
    ...time,
    kind: 'COMBINED' as const,
    conditions: condition('numeric', '5').conditions,
  };
  assert.equal(validateScopeDraft(combined, typedFields), undefined);
  assert.ok(validateScopeDraft({ ...combined, end: '' }, typedFields));
  assert.ok(validateScopeDraft({ ...combined, conditions: [] }, typedFields));
  // Inactive criteria do not constrain the selected kind.
  assert.equal(
    validateScopeDraft({ ...time, conditions: condition('invalid', '').conditions }, typedFields),
    undefined,
  );
});

test('valid range criteria stay blocked without a PLM range query, while sample and IDs are unchanged', () => {
  const snapshot = buildComparisonFieldSnapshot('PART', fields).snapshot!;
  const plan: ConsistencyPlan = {
    id: 'p',
    name: '范围测试',
    rootTypeCode: 'PART',
    scopeRule: 'ALL_ROOT',
    uniqueKeyFieldKey: snapshot.uniqueKeyField.sourceFieldKey,
    comparisonFieldKeys: [snapshot.includedFields[0].sourceFieldKey],
    comparisonRule: 'FORMAL_MAPPING',
    allowedModes: ['RANDOM_SAMPLE', 'EXHAUSTIVE_SCOPE', 'SPECIFIC_IDS'],
    defaultMode: 'RANDOM_SAMPLE',
  };
  const prepared = preparePlanRun(plan, fields, '零件', 'EXHAUSTIVE_SCOPE', 50, [], time);
  assert.equal(prepared.error, SCOPE_QUERY_UNAVAILABLE);
  assert.equal(prepared.request, undefined);
  assert.ok(preparePlanRun(plan, fields, '零件', 'RANDOM_SAMPLE', 50, [], newScopeDraft()).request);
  assert.deepEqual(
    preparePlanRun(plan, fields, '零件', 'SPECIFIC_IDS', 50, ['P-001'], newScopeDraft()).request?.requestedObjectIds,
    ['P-001'],
  );
  assert.equal(
    preparePlanRun({ ...plan, scopeRule: 'PLM_SCOPE' }, fields, '零件', 'EXHAUSTIVE_SCOPE', 50, [], time).error,
    SCOPE_QUERY_UNAVAILABLE,
  );
});
