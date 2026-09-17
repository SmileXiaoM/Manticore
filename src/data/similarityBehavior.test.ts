import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSimilarityRuleScopeKey, calculateFieldMatchRate, initialFieldRules, mockPartDatabase, resolveSimilarityRuleScope, runSimilaritySearch } from '../data';
import { FieldSimilarityRule } from '../types';
import { createSimilarityVersionSignature, resolveSimilarityTier, validateSimilarityTierConfig } from '../similarityTier';

const exactTextRule: FieldSimilarityRule = {
  ...initialFieldRules[0],
  fieldType: '文本 (TEXT)',
  matchType: '精确值匹配',
  matchConfig: { kind: 'EXACT' }
};

test('text exact match trims ends, keeps case sensitivity, and treats whitespace as missing', () => {
  assert.equal(calculateFieldMatchRate(exactTextRule, 'ABC', ' ABC ', {}, {}), 1);
  assert.equal(calculateFieldMatchRate(exactTextRule, 'ABC', 'abc', {}, {}), 0);
  assert.equal(calculateFieldMatchRate(exactTextRule, 'A B C', 'ABC', {}, {}), 0);
  assert.equal(calculateFieldMatchRate(exactTextRule, '   ', '   ', {}, {}), 0);
});

test('current text rules expose exact matching instead of partial text scoring', () => {
  const textRules = initialFieldRules.filter(rule => rule.fieldType.toUpperCase().includes('TEXT'));
  assert.ok(textRules.length > 0);
  assert.ok(textRules.every(rule => rule.matchType === '精确值匹配' && rule.matchConfig?.kind === 'EXACT'));
});

test('two-percent bidirectional tolerance converts units before judging the boundary', () => {
  const toleranceRule = initialFieldRules.find(rule => rule.id === 'R-INHOUSE-02');
  assert.ok(toleranceRule);
  assert.deepEqual(toleranceRule.matchConfig, {
    kind: 'NUMERIC_TOLERANCE',
    toleranceType: 'PERCENTAGE',
    toleranceValue: 2,
    direction: 'BOTH'
  });
  assert.equal(
    calculateFieldMatchRate(toleranceRule, 1, 102, { units: { nominal_diameter: 'cm' } }, { units: { nominal_diameter: 'm' } }),
    1
  );
  assert.equal(
    calculateFieldMatchRate(toleranceRule, 1, 1.021, { units: { nominal_diameter: 'm' } }, { units: { nominal_diameter: 'm' } }),
    0
  );
});

test('relative deviation decay converts units and scores only within the configured maximum', () => {
  const relativeRule: FieldSimilarityRule = {
    ...initialFieldRules.find(rule => rule.id === 'R-INHOUSE-02')!,
    matchType: '相对偏差衰减',
    matchConfig: { kind: 'RELATIVE_DEVIATION_DECAY', maxDeviationPercent: 10 },
    mismatchAction: 'EXCLUDE_CANDIDATE'
  };
  const reference = { units: { nominal_diameter: 'm' } };
  const withinRangeCandidate = { units: { nominal_diameter: 'cm' } };
  const exceededCandidate = { units: { nominal_diameter: 'm' } };

  assert.ok(Math.abs(calculateFieldMatchRate(relativeRule, 1, 105, withinRangeCandidate, reference) - 0.95) < 1e-12);
  assert.ok(Math.abs(calculateFieldMatchRate(relativeRule, 1, 1.1, exceededCandidate, reference) - 0.9) < 1e-12);
  assert.equal(calculateFieldMatchRate(relativeRule, 1, 1.11, exceededCandidate, reference), 0);
  assert.equal(calculateFieldMatchRate(relativeRule, 0, 0, exceededCandidate, reference), 0);
});

test('relative deviation gate keeps in-range candidates and excludes only values beyond the maximum', () => {
  const rules = initialFieldRules.map(rule => rule.id === 'R-INHOUSE-02'
    ? {
        ...rule,
        matchType: '相对偏差衰减',
        matchConfig: { kind: 'RELATIVE_DEVIATION_DECAY' as const, maxDeviationPercent: 10 },
        mismatchAction: 'EXCLUDE_CANDIDATE' as const
      }
    : rule
  );
  const result = runSimilaritySearch('PART', 'IN_HOUSE', { type: 'EXISTING_PART', objectId: 'PART-2026-000100' }, rules);

  assert.ok(result.scoredCandidates.some(candidate => candidate.objectId === 'PART-A-001'));
  const excluded = result.excludedCandidates.find(candidate => candidate.objectId === 'PART-X-001');
  assert.ok(excluded);
  assert.match(excluded.matchingRequirement, /相对偏差 60\.00% 超过最大允许偏差 10\.00%/);
});

test('relative deviation search rejects a zero reference before scoring', () => {
  const relativeRule: FieldSimilarityRule = {
    ...initialFieldRules.find(rule => rule.id === 'R-INHOUSE-02')!,
    matchType: '相对偏差衰减',
    matchConfig: { kind: 'RELATIVE_DEVIATION_DECAY', maxDeviationPercent: 10 }
  };
  const result = runSimilaritySearch(
    'PART',
    'IN_HOUSE',
    {
      type: 'FORM_VALUES',
      rootTypeId: 'PART',
      softTypeId: 'IN_HOUSE',
      values: { nominal_diameter: 0 },
      units: { nominal_diameter: 'mm' }
    },
    [relativeRule]
  );
  assert.equal(result.errorCode, 'QUERY_ERROR');
  assert.equal(result.errorMessage, '参考值必须为非零有效数字，无法计算相对偏差。');
});

test('similarity tier uses the displayed two-decimal score and validates boundaries', () => {
  const config = { highStart: 85, mediumStart: 70, configVersion: 'test', lastModifiedAt: '-' };
  assert.equal(resolveSimilarityTier(84.999, config), '高相似');
  assert.equal(resolveSimilarityTier(69.999, config), '中相似');
  assert.equal(resolveSimilarityTier(69.994, config), '低相似');
  assert.equal(validateSimilarityTierConfig(config), '');
  assert.match(validateSimilarityTierConfig({ ...config, mediumStart: 85 }), /0 < 中相似/);
  assert.match(validateSimilarityTierConfig({ ...config, highStart: 85.001 }), /两位小数/);
});

test('changing the scope model invalidates the saved draft preview signature', () => {
  const tier = { highStart: 85, mediumStart: 70, configVersion: 'test', lastModifiedAt: '-' };
  const original = createSimilarityVersionSignature(initialFieldRules, 'PART', 'IN_HOUSE', tier, 'stage1-role-v1');
  const changed = createSimilarityVersionSignature(initialFieldRules, 'PART', 'IN_HOUSE', tier, 'stage1-role-v2');
  assert.notEqual(original, changed);
});

test('rule scope resolves classification-specific first and falls back to type-generic', () => {
  const specificKey = buildSimilarityRuleScopeKey('IN_HOUSE', 'HEX_HEAD_BOLT');
  const statuses = {
    IN_HOUSE: { enabled: true, configVersion: 'v2.5.0' },
    [specificKey]: { enabled: true, configVersion: 'v2.5.0' }
  };
  const specific = resolveSimilarityRuleScope('IN_HOUSE', '/紧固件/螺栓/六角头螺栓', initialFieldRules, statuses);
  assert.equal(specific?.scopeKey, specificKey);
  assert.equal(specific?.kind, 'CLASSIFICATION_SPECIFIC');

  const generic = resolveSimilarityRuleScope('IN_HOUSE', '/紧固件/螺栓/六角头螺栓', initialFieldRules, {
    ...statuses,
    [specificKey]: { enabled: false, configVersion: 'v2.5.0' }
  });
  assert.equal(generic?.scopeKey, 'IN_HOUSE');
  assert.equal(generic?.kind, 'TYPE_GENERIC');

  const unavailable = resolveSimilarityRuleScope('IN_HOUSE', '/紧固件/螺栓/六角头螺栓', initialFieldRules, {
    IN_HOUSE: { enabled: false, configVersion: 'v2.5.0' },
    [specificKey]: { enabled: false, configVersion: 'v2.5.0' }
  });
  assert.equal(unavailable, null);
});

test('non-scoring fields are shown without changing scoring counters', () => {
  const result = runSimilaritySearch(
    'PART',
    'IN_HOUSE',
    { type: 'EXISTING_PART', objectId: 'PART-2026-000100' },
    initialFieldRules
  );
  assert.equal(result.errorCode, undefined);
  const candidate = result.scoredCandidates[0];
  assert.ok(candidate);
  const scoringFields = candidate.compareFields.filter(field => field.isScoreActive);
  const displayOnlyFields = candidate.compareFields.filter(field => !field.isScoreActive);
  assert.ok(displayOnlyFields.length > 0);
  const expectedScore = scoringFields.reduce((sum, field) => sum + field.weightedScore, 0) /
    scoringFields.reduce((sum, field) => sum + field.weight, 0) * 100;
  assert.equal(candidate.rawSimilarityScore, expectedScore);
  assert.equal(candidate.similarityScore, Number(expectedScore.toFixed(2)));
  assert.equal(candidate.fullHitCount, scoringFields.filter(field => field.status === 'FULL').length);
  assert.equal(candidate.differenceCount, scoringFields.filter(field => field.status === 'MISS' || field.status === 'PARTIAL').length);
  assert.ok(displayOnlyFields.every(field => field.weightedScore === 0 && field.reason === ''));
});

test('display-only numeric fields show raw value differences without applying tolerance scoring', () => {
  const rules = initialFieldRules.map(rule => rule.id === 'R-INHOUSE-03' ? { ...rule, isScoreActive: false } : rule);
  const result = runSimilaritySearch(
    'PART',
    'IN_HOUSE',
    { type: 'EXISTING_PART', objectId: 'PART-2026-000100' },
    rules
  );
  const candidate = result.scoredCandidates.find(item => item.objectId === 'PART-A-001');
  const displayOnlyLength = candidate?.compareFields.find(field => field.fieldKey === 'length');
  assert.ok(displayOnlyLength);
  assert.equal(displayOnlyLength.isScoreActive, false);
  assert.equal(displayOnlyLength.hasDifference, true);
  assert.equal(displayOnlyLength.weightedScore, 0);
  assert.equal(displayOnlyLength.matchRate, 0);
});

test('candidate missing policy keeps coverage stable and changes only the scoring denominator', () => {
  const testCandidate = {
    requestCode: 'REQ-TEST-MISSING-LENGTH',
    rootTypeId: 'PART',
    softTypeId: 'IN_HOUSE',
    objectId: 'PART-TEST-MISSING-LENGTH',
    objectName: '候选缺少长度',
    specification: 'M10',
    material: 'A2-70',
    classificationPath: '/紧固件/测试',
    lifecycleState: '有效',
    attributes: {
      core_material: 'A2-70',
      nominal_diameter: 10,
      length: null
    },
    units: {
      nominal_diameter: 'mm',
      length: 'mm'
    }
  };
  mockPartDatabase.push(testCandidate);

  try {
    const material = initialFieldRules.find(rule => rule.id === 'R-INHOUSE-01');
    const diameter = initialFieldRules.find(rule => rule.id === 'R-INHOUSE-02');
    const length = initialFieldRules.find(rule => rule.id === 'R-INHOUSE-03');
    assert.ok(material && diameter && length);

    const baseRules: FieldSimilarityRule[] = [
      { ...material, weight: 40, mismatchAction: 'ZERO_AND_CONTINUE', nullHandling: '计0分' },
      { ...diameter, weight: 40, mismatchAction: 'EXCLUDE_CANDIDATE', nullHandling: '计0分' },
      { ...length, weight: 20, mismatchAction: 'EXCLUDE_CANDIDATE', nullHandling: '计0分' }
    ];
    const baseline = { type: 'EXISTING_PART' as const, objectId: 'PART-2026-000100' };

    const zeroResult = runSimilaritySearch('PART', 'IN_HOUSE', baseline, baseRules);
    const zeroCandidate = zeroResult.scoredCandidates.find(item => item.objectId === testCandidate.objectId);
    assert.ok(zeroCandidate);
    assert.equal(zeroCandidate.similarityScore, 40);
    assert.equal(zeroCandidate.coverageRate, 80);
    assert.equal(zeroResult.excludedCandidates.some(item => item.objectId === testCandidate.objectId), false);
    const zeroMissingField = zeroCandidate.compareFields.find(field => field.fieldKey === 'length');
    assert.equal(zeroMissingField?.missingSide, 'CANDIDATE');
    assert.equal(zeroMissingField?.candidateMissingHandling, 'ZERO_SCORE');

    const skipRules = baseRules.map(rule => rule.propertyCode === 'length'
      ? { ...rule, nullHandling: '不参与本次计算（跳过）' }
      : rule
    );
    const skipResult = runSimilaritySearch('PART', 'IN_HOUSE', baseline, skipRules);
    const skipCandidate = skipResult.scoredCandidates.find(item => item.objectId === testCandidate.objectId);
    assert.ok(skipCandidate);
    assert.equal(skipCandidate.similarityScore, 50);
    assert.equal(skipCandidate.coverageRate, 80);
    assert.equal(skipResult.excludedCandidates.some(item => item.objectId === testCandidate.objectId), false);
    assert.equal(skipCandidate.compareFields.find(field => field.fieldKey === 'length')?.candidateMissingHandling, 'SKIP');

    const otherFieldGateRules = skipRules.map(rule => rule.propertyCode === 'core_material'
      ? { ...rule, mismatchAction: 'EXCLUDE_CANDIDATE' as const }
      : rule
    );
    const otherFieldGateResult = runSimilaritySearch('PART', 'IN_HOUSE', baseline, otherFieldGateRules);
    assert.equal(otherFieldGateResult.scoredCandidates.some(item => item.objectId === testCandidate.objectId), false);
    const excludedByMaterial = otherFieldGateResult.excludedCandidates.find(item => item.objectId === testCandidate.objectId);
    assert.ok(excludedByMaterial);
    assert.equal(excludedByMaterial.excludedByField, 'core_material');

    const zeroDenominatorResult = runSimilaritySearch('PART', 'IN_HOUSE', baseline, [
      { ...length, weight: 100, mismatchAction: 'EXCLUDE_CANDIDATE', nullHandling: '不参与本次计算（跳过）' }
    ]);
    assert.equal(zeroDenominatorResult.scoredCandidates.some(item => item.objectId === testCandidate.objectId), false);
    assert.equal(zeroDenominatorResult.excludedCandidates.some(item => item.objectId === testCandidate.objectId), false);
  } finally {
    const index = mockPartDatabase.findIndex(item => item.objectId === testCandidate.objectId);
    if (index >= 0) mockPartDatabase.splice(index, 1);
  }
});

test('TopK is applied after stable score sorting and before result pagination', () => {
  const seed = mockPartDatabase.find(item => item.objectId === 'PART-A-001');
  assert.ok(seed);
  const additions = Array.from({ length: 105 }, (_, index) => ({
    ...seed,
    objectId: `PART-TOPK-${String(index).padStart(3, '0')}`,
    requestCode: `REQ-TOPK-${String(index).padStart(3, '0')}`,
    attributes: { ...seed.attributes },
    units: { ...seed.units }
  }));
  mockPartDatabase.push(...additions);

  try {
    const allResults = runSimilaritySearch(
      'PART',
      'IN_HOUSE',
      { type: 'EXISTING_PART', objectId: 'PART-2026-000100' },
      initialFieldRules,
      undefined,
      undefined,
      { topK: 500 }
    );
    const top100Results = runSimilaritySearch(
      'PART',
      'IN_HOUSE',
      { type: 'EXISTING_PART', objectId: 'PART-2026-000100' },
      initialFieldRules,
      undefined,
      undefined,
      { topK: 100 }
    );

    assert.ok((allResults.scoredCount || 0) > 100);
    assert.equal(top100Results.topK, 100);
    assert.equal(top100Results.returnedCount, 100);
    assert.equal(top100Results.scoredCandidates.length, 100);
    assert.deepEqual(
      top100Results.scoredCandidates.map(item => item.objectId),
      allResults.scoredCandidates.slice(0, 100).map(item => item.objectId)
    );
  } finally {
    const addedIds = new Set(additions.map(item => item.objectId));
    for (let index = mockPartDatabase.length - 1; index >= 0; index -= 1) {
      if (addedIds.has(mockPartDatabase[index].objectId)) mockPartDatabase.splice(index, 1);
    }
  }
});
