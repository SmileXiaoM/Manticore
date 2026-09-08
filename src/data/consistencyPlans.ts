import { FieldMappingItem } from '../stage1MappingTypes';
import {
  ComparisonFieldSnapshot,
  ConsistencyPlan,
  ConsistencyCheckRequest,
  ConsistencyStrategyType,
  formatLocalDateTime,
} from '../types/consistencyCheck';
import { buildComparisonFieldSnapshot, PLM_SCOPE_UNAVAILABLE } from './consistencyCheckData';
import { ConsistencyScopeDraft, getScopeFields, SCOPE_QUERY_UNAVAILABLE, validateScopeDraft } from './consistencyScope';

export function resolvePlanSnapshot(
  plan: ConsistencyPlan,
  fields: FieldMappingItem[],
): { snapshot?: ComparisonFieldSnapshot; error?: string } {
  if (!plan.name.trim()) return { error: '请输入方案名称' };
  if (!['PART', 'DOCUMENT', 'PROCESS'].includes(plan.rootTypeCode)) return { error: '请选择适用根类型' };
  if (!['ALL_ROOT', 'PLM_SCOPE'].includes(plan.scopeRule)) return { error: '请选择核验范围规则' };
  if (plan.comparisonRule !== 'FORMAL_MAPPING') return { error: '请选择正式字段比较规则' };
  if (
    !plan.allowedModes.length ||
    plan.allowedModes.some((mode) => !['RANDOM_SAMPLE', 'EXHAUSTIVE_SCOPE', 'SPECIFIC_IDS'].includes(mode)) ||
    !plan.allowedModes.includes(plan.defaultMode)
  )
    return { error: '请选择允许的运行方式及其中一种默认方式' };
  const formal = buildComparisonFieldSnapshot(plan.rootTypeCode, fields);
  if (!formal.snapshot) return { error: formal.uniqueKeyError || formal.fieldsError };
  if (plan.uniqueKeyFieldKey !== formal.snapshot.uniqueKeyField.sourceFieldKey)
    return { error: '请选择当前根类型的正式唯一标识属性' };
  const keys = new Set(plan.comparisonFieldKeys);
  if (!keys.size) return { error: '请至少选择一个固定核验属性' };
  if (
    keys.size !== plan.comparisonFieldKeys.length ||
    [...keys].some((key) => !formal.snapshot.includedFields.some((field) => field.sourceFieldKey === key))
  ) {
    return { error: '方案中的属性已不可用，请编辑方案并重新选择当前根类型的正式字段' };
  }
  return {
    snapshot: structuredClone({
      ...formal.snapshot,
      includedFields: formal.snapshot.includedFields.filter((field) => keys.has(field.sourceFieldKey)),
      excludedFields: [],
      snapshotTime: formatLocalDateTime(),
    }),
  };
}

export function preparePlanRun(
  plan: ConsistencyPlan,
  fields: FieldMappingItem[],
  rootTypeName: string,
  mode: ConsistencyStrategyType,
  sampleCount: number,
  objectIds: string[],
  rangeScope?: ConsistencyScopeDraft,
): { request?: ConsistencyCheckRequest; error?: string } {
  const resolved = resolvePlanSnapshot(plan, fields);
  if (!resolved.snapshot) return { error: resolved.error };
  if (!plan.allowedModes.includes(mode)) return { error: '该方案不允许此运行方式' };
  if (mode === 'EXHAUSTIVE_SCOPE') {
    return {
      error: validateScopeDraft(rangeScope, getScopeFields(plan.rootTypeCode, fields)) || SCOPE_QUERY_UNAVAILABLE,
    };
  }
  if (plan.scopeRule === 'PLM_SCOPE') return { error: PLM_SCOPE_UNAVAILABLE };
  if (mode === 'RANDOM_SAMPLE' && (!Number.isSafeInteger(sampleCount) || sampleCount < 1 || sampleCount > 10000)) {
    return { error: '抽样量请输入 1–10000 的整数' };
  }
  const uniqueIds = [...new Set(objectIds.map((id) => id.trim()).filter(Boolean))];
  if (mode === 'SPECIFIC_IDS' && !uniqueIds.length) return { error: '请输入至少一个对象 ID' };
  return {
    request: structuredClone({
      rootTypeCode: plan.rootTypeCode,
      rootTypeName,
      scopeMode: mode,
      sampleCount: mode === 'RANDOM_SAMPLE' ? sampleCount : undefined,
      requestedObjectIds: mode === 'SPECIFIC_IDS' ? uniqueIds : undefined,
      comparisonFieldSnapshot: resolved.snapshot,
      planSnapshot: plan,
    }),
  };
}
