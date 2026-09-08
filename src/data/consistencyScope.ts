import { FieldMappingItem } from '../stage1MappingTypes';

export type ScopeOperator = 'EQ' | 'NE' | 'CONTAINS' | 'GT' | 'GTE' | 'LT' | 'LTE';
export interface ScopeCondition {
  id: string;
  fieldKey: string;
  operator: ScopeOperator;
  value: string;
}
export interface ConsistencyScopeDraft {
  kind: 'TIME' | 'ATTRIBUTE' | 'COMBINED';
  start: string;
  end: string;
  conditions: ScopeCondition[];
}

export const SCOPE_QUERY_UNAVAILABLE = 'PLM 范围查询未接入，暂不能发起核验。';
export const SCOPE_OPERATOR_LABELS: Record<ScopeOperator, string> = {
  EQ: '等于',
  NE: '不等于',
  CONTAINS: '包含',
  GT: '大于',
  GTE: '大于等于',
  LT: '小于',
  LTE: '小于等于',
};
export const newScopeDraft = (): ConsistencyScopeDraft => ({ kind: 'TIME', start: '', end: '', conditions: [] });

export function getScopeFields(root: string, fields: FieldMappingItem[]) {
  return fields.filter(
    (field) => field.rootTypeId === root && field.configStatus === 'CONFIGURED' && field.isInFormalQueryBase,
  );
}

export function scopeFieldUnavailable(field: FieldMappingItem) {
  if (field.sourceDataType === 'CATEGORY_TREE') return '分类选项未加载';
  if (field.sourceDataType === 'ENUM') return '枚举选项未加载';
  if (field.sourceDataType === 'NUMERIC_WITH_UNIT' && !field.defaultUnit) return '计量单位未配置';
  return '';
}

export function scopeOperators(field?: FieldMappingItem): ScopeOperator[] {
  if (!field) return ['EQ'];
  if (['NUMERIC', 'NUMERIC_WITH_UNIT', 'DATE'].includes(field.sourceDataType))
    return ['EQ', 'NE', 'GT', 'GTE', 'LT', 'LTE'];
  if (['TEXT', 'LONG_TEXT'].includes(field.sourceDataType)) return ['EQ', 'NE', 'CONTAINS'];
  return ['EQ', 'NE'];
}

// datetime-local values are interpreted as PLM wall-clock time in Asia/Shanghai.
function validDate(value: string, withTime: boolean) {
  const pattern = withTime ? /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/ : /^\d{4}-\d{2}-\d{2}$/;
  if (!pattern.test(value)) return false;
  const date = new Date(`${value}${withTime ? ':00' : 'T00:00:00'}Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, withTime ? 16 : 10) === value;
}

export function validateScopeDraft(scope: ConsistencyScopeDraft | undefined, fields: FieldMappingItem[]) {
  if (!scope || !['TIME', 'ATTRIBUTE', 'COMBINED'].includes(scope.kind)) return '请选择范围条件';
  if (scope.kind !== 'ATTRIBUTE') {
    if (!scope.start || !scope.end) return '请填写开始时间和结束时间';
    if (!validDate(scope.start, true) || !validDate(scope.end, true)) return '请输入有效的时间';
    if (scope.start >= scope.end) return '结束时间必须晚于开始时间';
  }
  if (scope.kind !== 'TIME') {
    if (!scope.conditions.length) return '请至少添加一项属性条件';
    for (const [index, condition] of scope.conditions.entries()) {
      const prefix = `条件 ${index + 1}：`;
      const field = fields.find((item) => item.sourceFieldKey === condition.fieldKey);
      if (!field) return `${prefix}请选择当前根类型的属性`;
      const unavailable = scopeFieldUnavailable(field);
      if (unavailable) return `${prefix}${unavailable}`;
      if (!scopeOperators(field).includes(condition.operator)) return `${prefix}请选择适用的比较条件`;
      if (!condition.value.trim()) return `${prefix}请填写属性值`;
      if (
        ['NUMERIC', 'NUMERIC_WITH_UNIT'].includes(field.sourceDataType) &&
        !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(condition.value.trim())
      )
        return `${prefix}请输入有效数值`;
      if (['NUMERIC', 'NUMERIC_WITH_UNIT'].includes(field.sourceDataType) && !Number.isFinite(Number(condition.value)))
        return `${prefix}数值超出范围`;
      if (field.sourceDataType === 'DATE' && !validDate(condition.value, false)) return `${prefix}请输入有效日期`;
      if (field.sourceDataType === 'BOOLEAN' && !['true', 'false'].includes(condition.value))
        return `${prefix}请选择是或否`;
    }
  }
  return undefined;
}
