import { FieldSimilarityRule, SimilarityTierConfig, SimilarityTierConfigMap, normalizeRulesForCompare } from './types';

export const DEFAULT_SIMILARITY_TIER: SimilarityTierConfig = {
  highStart: 85,
  mediumStart: 70,
  configVersion: '-',
  lastModifiedAt: '-'
};

export const initialSimilarityTierConfigs: SimilarityTierConfigMap = {
  IN_HOUSE: { ...DEFAULT_SIMILARITY_TIER, configVersion: 'v2.5.0', lastModifiedAt: '2026-07-15 16:30:12' },
  PURCHASED: { ...DEFAULT_SIMILARITY_TIER, configVersion: 'v1.0.0', lastModifiedAt: '2026-07-12 11:20:00' },
  HEADED: { ...DEFAULT_SIMILARITY_TIER, configVersion: 'v1.0.0' },
  STAMPING_UNCONFIGURED: { ...DEFAULT_SIMILARITY_TIER }
};

export function getSimilarityTierConfig(configs: SimilarityTierConfigMap, groupValueId: string): SimilarityTierConfig {
  return configs[groupValueId] || { ...DEFAULT_SIMILARITY_TIER };
}

export function validateSimilarityTierConfig(config: SimilarityTierConfig): string {
  const { highStart, mediumStart } = config;
  if (!Number.isFinite(highStart) || !Number.isFinite(mediumStart)) return '请输入有效数字。';
  if (decimalPlaces(highStart) > 2 || decimalPlaces(mediumStart) > 2) return '分数最多保留两位小数。';
  if (!(mediumStart > 0 && mediumStart < highStart && highStart <= 100)) {
    return '需满足 0 < 中相似起始分数 < 高相似起始分数 ≤ 100。';
  }
  return '';
}

function decimalPlaces(value: number): number {
  const text = String(value);
  if (/e-/i.test(text)) return Number(text.split(/e-/i)[1]);
  return text.includes('.') ? text.split('.')[1].length : 0;
}

export function resolveSimilarityTier(
  rawScore: number,
  config: Pick<SimilarityTierConfig, 'highStart' | 'mediumStart'> = DEFAULT_SIMILARITY_TIER
): '高相似' | '中相似' | '低相似' {
  const displayedScore = Number(rawScore.toFixed(2));
  if (displayedScore >= config.highStart) return '高相似';
  if (displayedScore >= config.mediumStart) return '中相似';
  return '低相似';
}

export function formatSimilarityTierRange(config: Pick<SimilarityTierConfig, 'highStart' | 'mediumStart'>): string {
  return `高相似 ${config.highStart.toFixed(2)}–100.00；中相似 ${config.mediumStart.toFixed(2)}–<${config.highStart.toFixed(2)}；低相似 0.00–<${config.mediumStart.toFixed(2)}`;
}

export function createSimilarityVersionSignature(
  rules: FieldSimilarityRule[],
  rootTypeId: string,
  groupValueId: string,
  tierConfig: Pick<SimilarityTierConfig, 'highStart' | 'mediumStart'>
): string {
  return JSON.stringify({
    rules: normalizeRulesForCompare(rules, rootTypeId, groupValueId),
    tier: {
      highStart: Number(tierConfig.highStart.toFixed(2)),
      mediumStart: Number(tierConfig.mediumStart.toFixed(2))
    }
  });
}
