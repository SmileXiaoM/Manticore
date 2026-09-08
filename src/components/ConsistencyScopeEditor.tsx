import { Plus, X } from 'lucide-react';
import { FieldMappingItem } from '../stage1MappingTypes';
import {
  ConsistencyScopeDraft,
  ScopeCondition,
  ScopeOperator,
  SCOPE_OPERATOR_LABELS,
  scopeFieldUnavailable,
  scopeOperators,
} from '../data/consistencyScope';

interface Props {
  value: ConsistencyScopeDraft;
  fields: FieldMappingItem[];
  onChange: (value: ConsistencyScopeDraft) => void;
}

const newCondition = (): ScopeCondition => ({ id: crypto.randomUUID(), fieldKey: '', operator: 'EQ', value: '' });

export function ConsistencyScopeEditor({ value, fields, onChange }: Props) {
  const updateCondition = (id: string, patch: Partial<ScopeCondition>) =>
    onChange({ ...value, conditions: value.conditions.map((row) => (row.id === id ? { ...row, ...patch } : row)) });
  return (
    <section className="scope-editor" aria-label="指定范围条件">
      <label className="scope-kind">
        范围条件
        <select
          aria-label="范围条件"
          value={value.kind}
          onChange={(event) => {
            const kind = event.target.value as ConsistencyScopeDraft['kind'];
            onChange({
              ...value,
              kind,
              conditions: kind !== 'TIME' && !value.conditions.length ? [newCondition()] : value.conditions,
            });
          }}
        >
          <option value="TIME">按时间范围</option>
          <option value="ATTRIBUTE">按属性条件</option>
          <option value="COMBINED">时间范围 + 属性条件</option>
        </select>
      </label>
      {value.kind !== 'ATTRIBUTE' && (
        <div className="scope-time">
          <div className="scope-time-inputs">
            <label>
              开始时间
              <input
                type="datetime-local"
                aria-label="范围开始时间"
                value={value.start}
                onChange={(event) => onChange({ ...value, start: event.target.value })}
              />
            </label>
            <label>
              结束时间
              <input
                type="datetime-local"
                aria-label="范围结束时间"
                value={value.end}
                onChange={(event) => onChange({ ...value, end: event.target.value })}
              />
            </label>
          </div>
          <p className="muted">按 PLM 最后修改时间筛选（北京时间），包含开始时间，不包含结束时间。</p>
        </div>
      )}
      {value.kind !== 'TIME' && (
        <div className="scope-attributes">
          <div className="scope-condition-heading">
            <strong>属性条件</strong>
            <span className="muted">同时满足以下条件</span>
          </div>
          {value.conditions.map((condition, index) => {
            const field = fields.find((item) => item.sourceFieldKey === condition.fieldKey);
            const isNumber = field && ['NUMERIC', 'NUMERIC_WITH_UNIT'].includes(field.sourceDataType);
            return (
              <div className="scope-condition-row" key={condition.id}>
                <label>
                  属性
                  <select
                    aria-label={`条件 ${index + 1} 属性`}
                    value={condition.fieldKey}
                    onChange={(event) =>
                      updateCondition(condition.id, { fieldKey: event.target.value, operator: 'EQ', value: '' })
                    }
                  >
                    <option value="">请选择属性</option>
                    {fields.map((item) => {
                      const unavailable = scopeFieldUnavailable(item);
                      return (
                        <option key={item.id} value={item.sourceFieldKey} disabled={!!unavailable}>
                          {item.sourceDisplayName?.trim() || item.sourceFieldKey}
                          {unavailable ? `（${unavailable}）` : ''}
                        </option>
                      );
                    })}
                  </select>
                </label>
                <label>
                  条件
                  <select
                    aria-label={`条件 ${index + 1} 运算符`}
                    value={condition.operator}
                    disabled={!field}
                    onChange={(event) =>
                      updateCondition(condition.id, { operator: event.target.value as ScopeOperator })
                    }
                  >
                    {scopeOperators(field).map((operator) => (
                      <option value={operator} key={operator}>
                        {SCOPE_OPERATOR_LABELS[operator]}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  属性值{field?.sourceDataType === 'NUMERIC_WITH_UNIT' ? `（${field.defaultUnit}）` : ''}
                  {field?.sourceDataType === 'BOOLEAN' ? (
                    <select
                      aria-label={`条件 ${index + 1} 属性值`}
                      value={condition.value}
                      onChange={(event) => updateCondition(condition.id, { value: event.target.value })}
                    >
                      <option value="">请选择</option>
                      <option value="true">是</option>
                      <option value="false">否</option>
                    </select>
                  ) : (
                    <input
                      aria-label={`条件 ${index + 1} 属性值`}
                      disabled={!field}
                      type={field?.sourceDataType === 'DATE' ? 'date' : isNumber ? 'number' : 'text'}
                      step={isNumber ? 'any' : undefined}
                      value={condition.value}
                      placeholder="请输入属性值"
                      onChange={(event) => updateCondition(condition.id, { value: event.target.value })}
                    />
                  )}
                </label>
                <button
                  type="button"
                  className="scope-remove"
                  aria-label={`删除条件 ${index + 1}`}
                  onClick={() =>
                    onChange({ ...value, conditions: value.conditions.filter((row) => row.id !== condition.id) })
                  }
                >
                  <X size={16} />
                </button>
              </div>
            );
          })}
          <button
            type="button"
            className="text-button"
            disabled={!fields.some((field) => !scopeFieldUnavailable(field))}
            onClick={() => onChange({ ...value, conditions: [...value.conditions, newCondition()] })}
          >
            <Plus size={14} />
            添加条件
          </button>
          {!fields.length && <p className="muted">当前根类型暂无可选属性，可使用时间范围。</p>}
        </div>
      )}
      <p className="scope-footnote muted">
        核验满足{value.kind === 'COMBINED' ? '时间及全部属性' : '上述'}条件的全部对象；核验属性沿用所选方案。
      </p>
    </section>
  );
}
