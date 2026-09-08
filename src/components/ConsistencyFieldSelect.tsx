import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { ComparisonFieldItem } from '../types/consistencyCheck';

export function ConsistencyFieldSelect({
  fields,
  value,
  onChange,
  disabled,
}: {
  key?: string;
  fields: ComparisonFieldItem[];
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0, maxHeight: 280 });
  const trigger = useRef<HTMLButtonElement>(null);
  const control = useRef<HTMLDivElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const id = useId();
  const selected = fields.filter((field) => value.includes(field.sourceFieldKey));
  const filtered = fields.filter((field) =>
    `${field.displayName} ${field.sourceFieldKey}`.toLowerCase().includes(query.trim().toLowerCase()),
  );
  function close(restoreFocus = false) {
    setOpen(false);
    setQuery('');
    if (restoreFocus) trigger.current?.focus();
  }
  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const rect = control.current!.getBoundingClientRect();
      const body = control.current!.closest('.plan-dialog-body')?.getBoundingClientRect();
      if (body && (rect.bottom < body.top || rect.top > body.bottom)) {
        close();
        return;
      }
      const below = window.innerHeight - rect.bottom - 16;
      const above = rect.top - 16;
      const height = Math.min(280, Math.max(below, above));
      const left = Math.max(16, Math.min(rect.left, window.innerWidth - rect.width - 16));
      setPosition({
        top: below >= Math.min(280, above) ? rect.bottom + 4 : rect.top - height - 4,
        left,
        width: Math.min(rect.width, window.innerWidth - 32),
        maxHeight: height,
      });
    };
    update();
    const observer = new ResizeObserver(update);
    const dialog = trigger.current?.closest('dialog');
    if (dialog) observer.observe(dialog);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, selected.length]);
  useEffect(() => {
    if (!open) return;
    popup.current?.querySelector<HTMLInputElement>('input[type="search"]')?.focus();
    const outside = (event: PointerEvent) => {
      if (!popup.current?.contains(event.target as Node) && !control.current?.contains(event.target as Node)) close();
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  return (
    <div className="field-select">
      <div ref={control} className="field-select-control" data-disabled={disabled || undefined}>
        {selected.map((field) => (
          <span key={field.sourceFieldKey} className="selected-field-tag">
            <span title={field.sourceFieldKey}>
              {field.displayName || field.sourceFieldKey}
              {field.isDisplayNameMissing && <small className="missing-name">显示名缺失</small>}
            </span>
            <button
              type="button"
              aria-label={`移除 ${field.displayName || field.sourceFieldKey}`}
              onClick={() => onChange(value.filter((key) => key !== field.sourceFieldKey))}
            >
              <X size={14} />
            </button>
          </span>
        ))}
        <button
          ref={trigger}
          type="button"
          className="field-select-trigger"
          aria-label="固定核验属性"
          aria-expanded={open}
          aria-controls={id}
          disabled={disabled}
          onClick={() => {
            setOpen(!open);
            setQuery('');
          }}
        >
          <span className={selected.length ? '' : 'muted'}>
            {selected.length ? '添加属性' : disabled ? '请先选择有正式字段的根类型' : '请选择核验属性，可搜索多选'}
          </span>
          <ChevronDown size={16} />
        </button>
      </div>
      {open && (
        <div
          ref={popup}
          id={id}
          role="group"
          aria-label="可选核验属性"
          className="field-select-popup"
          style={position}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              event.stopPropagation();
              close(true);
            }
          }}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node) && event.relatedTarget !== trigger.current)
              close();
          }}
        >
          <div className="field-search">
            <Search size={16} />
            <input
              type="search"
              aria-label="搜索核验属性"
              placeholder="搜索属性名称或编码"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') event.preventDefault();
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  popup.current?.querySelector<HTMLInputElement>('input[type="checkbox"]')?.focus();
                }
              }}
            />
          </div>
          <div className="field-select-options">
            {filtered.length ? (
              filtered.map((field) => (
                <label key={field.sourceFieldKey} className="field-select-option">
                  <input
                    type="checkbox"
                    checked={value.includes(field.sourceFieldKey)}
                    onChange={(event) =>
                      onChange(
                        event.target.checked
                          ? [...value, field.sourceFieldKey]
                          : value.filter((key) => key !== field.sourceFieldKey),
                      )
                    }
                  />
                  <span>
                    {field.displayName || field.sourceFieldKey}
                    {field.isDisplayNameMissing && <small className="missing-name">显示名缺失</small>}
                    <code>{field.sourceFieldKey}</code>
                  </span>
                </label>
              ))
            ) : (
              <p className="field-select-empty">未找到匹配属性</p>
            )}
          </div>
          <div className="field-select-footer">
            <span className="muted">已选择 {selected.length} 项</span>
            <button type="button" className="text-button" onClick={() => close(true)}>
              完成选择
            </button>
          </div>
        </div>
      )}
      {!!selected.length && (
        <details className="compact-details field-rules">
          <summary>比较规则</summary>
          <ul className="rule-list">
            {selected.map((field) => (
              <li key={field.sourceFieldKey}>
                {field.displayName || field.sourceFieldKey}：{field.comparisonMethod}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
