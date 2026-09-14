import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateFieldMatchRate, getSimilarityGroupValueOptions, initialFieldRules, runSimilaritySearch } from '../data';
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

test('similarity tier uses the displayed two-decimal score and validates boundaries', () => {
  const config = { highStart: 85, mediumStart: 70, configVersion: 'test', lastModifiedAt: '-' };
  assert.equal(resolveSimilarityTier(84.999, config), '高相似');
  assert.equal(resolveSimilarityTier(69.999, config), '中相似');
  assert.equal(resolveSimilarityTier(69.994, config), '低相似');
  assert.equal(validateSimilarityTierConfig(config), '');
  assert.match(validateSimilarityTierConfig({ ...config, mediumStart: 85 }), /0 < 中相似/);
  assert.match(validateSimilarityTierConfig({ ...config, highStart: 85.001 }), /两位小数/);
});

test('changing the grouping property invalidates the saved draft preview signature', () => {
  const tier = { highStart: 85, mediumStart: 70, configVersion: 'test', lastModifiedAt: '-' };
  const original = createSimilarityVersionSignature(initialFieldRules, 'PART', 'IN_HOUSE', tier, 'business_classification');
  const changed = createSimilarityVersionSignature(initialFieldRules, 'PART', 'IN_HOUSE', tier, 'source_type');
  assert.notEqual(original, changed);
});

test('group values follow the selected grouping property without reusing another property values', () => {
  assert.deepEqual(
    getSimilarityGroupValueOptions('product_family').map(option => option.code),
    ['FASTENER', 'SHEET_METAL', 'TRANSMISSION']
  );
  assert.equal(getSimilarityGroupValueOptions('product_family').some(option => option.id === 'IN_HOUSE'), false);
  assert.equal(getSimilarityGroupValueOptions('business_classification').some(option => option.id === 'IN_HOUSE'), true);
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
  assert.equal(candidate.fullHitCount, scoringFields.filter(field => field.status === 'FULL').length);
  assert.equal(candidate.differenceCount, scoringFields.filter(field => field.status === 'MISS' || field.status === 'PARTIAL').length);
  assert.ok(displayOnlyFields.every(field => field.weightedScore === 0 && field.reason === ''));
});
