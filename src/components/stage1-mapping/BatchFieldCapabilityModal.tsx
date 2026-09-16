import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Settings2, X } from 'lucide-react';
import { ManticoreFieldType } from '../../stage1MappingTypes';

export interface BatchFieldCapabilityChanges {
  isDisplayInResult?: boolean;
  isFulltextSearch?: boolean;
  isQueryCondition?: boolean;
  isSortable?: boolean;
  defaultColumnWidth?: number;
}

export interface BatchFieldCapabilityItem {
  id: string;
  displayName: string;
  fieldCode: string;
  manticoreType: ManticoreFieldType;
  defaultColumnWidth: number;
  isDisplayInResult: boolean;
  isFulltextSearch: boolean;
  isQueryCondition: boolean;
  isSortable: boolean;
}

export interface BatchFieldCapabilityUpdate extends BatchFieldCapabilityChanges {
  fieldId: string;
}

interface BatchFieldCapabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: BatchFieldCapabilityItem[];
  scopeLabel: string;
  onApply: (updates: BatchFieldCapabilityUpdate[]) => void;
}

interface EditableRow extends BatchFieldCapabilityItem {
  widthInput: string;
}

const toEditableRow = (item: BatchFieldCapabilityItem): EditableRow => ({
  ...item,
  isSortable: item.manticoreType === 'TEXT' ? false : item.isSortable,
  widthInput: String(item.defaultColumnWidth)
});

const CapabilityCheckbox: React.FC<{
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}> = ({ checked, disabled = false, label, onChange }) => (
  <label className={`inline-flex items-center justify-center gap-1.5 text-ty-xs ${disabled ? 'text-[var(--ty-font-sub-light-color)] cursor-not-allowed' : 'text-[var(--ty-font-main-color)] cursor-pointer'}`}>
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={event => onChange(event.target.checked)}
      className="rounded text-[var(--ty-primary-color)] disabled:opacity-40"
      aria-label={label}
    />
    <span>{checked ? '开启' : '关闭'}</span>
  </label>
);

export const BatchFieldCapabilityModal: React.FC<BatchFieldCapabilityModalProps> = ({
  isOpen,
  onClose,
  items,
  scopeLabel,
  onApply
}) => {
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setRows(items.map(toEditableRow));
    setErrorMessage('');
  }, [isOpen, items]);

  const originalById = useMemo(() => new Map(items.map(item => [item.id, item])), [items]);

  const changedCount = useMemo(() => rows.filter(row => {
    const original = originalById.get(row.id);
    if (!original) return true;
    return Number(row.widthInput) !== original.defaultColumnWidth
      || row.isDisplayInResult !== original.isDisplayInResult
      || row.isFulltextSearch !== original.isFulltextSearch
      || row.isQueryCondition !== original.isQueryCondition
      || row.isSortable !== (original.manticoreType === 'TEXT' ? false : original.isSortable);
  }).length, [rows, originalById]);

  if (!isOpen) return null;

  const updateRow = (id: string, patch: Partial<EditableRow>) => {
    setRows(previous => previous.map(row => row.id === id ? { ...row, ...patch } : row));
    setErrorMessage('');
  };

  const handleApply = () => {
    for (const row of rows) {
      const width = Number(row.widthInput);
      if (!Number.isInteger(width) || width < 80 || width > 350) {
        setErrorMessage(`“${row.displayName}”的列宽请输入 80–350 之间的整数`);
        return;
      }
    }

    const updates = rows
      .filter(row => {
        const original = originalById.get(row.id);
        if (!original) return true;
        return Number(row.widthInput) !== original.defaultColumnWidth
          || row.isDisplayInResult !== original.isDisplayInResult
          || row.isFulltextSearch !== original.isFulltextSearch
          || row.isQueryCondition !== original.isQueryCondition
          || row.isSortable !== (original.manticoreType === 'TEXT' ? false : original.isSortable);
      })
      .map(row => ({
        fieldId: row.id,
        defaultColumnWidth: Number(row.widthInput),
        isDisplayInResult: row.isDisplayInResult,
        isFulltextSearch: row.isFulltextSearch,
        isQueryCondition: row.isQueryCondition,
        isSortable: row.manticoreType === 'TEXT' ? false : row.isSortable
      }));

    if (updates.length === 0) {
      setErrorMessage('请至少修改一个属性后再应用');
      return;
    }
    onApply(updates);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-ty-overlay backdrop-blur-xs p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="batch-field-capability-title"
        className="w-[min(1180px,calc(100vw-32px))] max-h-[calc(100dvh-48px)] overflow-hidden rounded-ty-lg border border-[var(--ty-border-color)] bg-[var(--ty-fill-white-color)] shadow-ty-lg flex flex-col"
      >
        <header className="px-5 py-4 border-b border-[var(--ty-border-color)] bg-[var(--ty-fill-weak-dark-color)] flex items-start justify-between gap-3 shrink-0">
          <div>
            <h2 id="batch-field-capability-title" className="text-ty-lg font-semibold text-[var(--ty-font-main-color)] flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-[var(--ty-primary-color)]" />
              批量设置属性
            </h2>
            <p className="mt-1 text-ty-xs text-[var(--ty-font-sub-color)]">
              已展开全部 {items.length} 个{scopeLabel}。每一行独立设置，应用后一次保存本次修改。
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="关闭批量设置属性" className="w-8 h-8 inline-flex items-center justify-center rounded-ty-sm text-[var(--ty-font-sub-light-color)] hover:bg-[var(--ty-fill-dark-color)] hover:text-[var(--ty-font-main-color)]">
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="overflow-auto min-h-0 flex-1">
          <table className="w-full min-w-[1040px] border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-[var(--ty-fill-weak-dark-color)] text-ty-xs text-[var(--ty-font-main-light-color)]">
              <tr className="border-b border-[var(--ty-border-color)]">
                <th className="px-4 py-3 font-semibold w-[280px]">属性</th>
                <th className="px-3 py-3 font-semibold w-[130px]">列宽（px）</th>
                <th className="px-3 py-3 font-semibold text-center">结果列显示</th>
                <th className="px-3 py-3 font-semibold text-center">写入全文检索</th>
                <th className="px-3 py-3 font-semibold text-center">查询条件</th>
                <th className="px-3 py-3 font-semibold text-center">支持排序</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id} className="border-b border-[var(--ty-border-color)] hover:bg-[var(--ty-fill-weak-dark-color)]/45">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-ty-xs text-[var(--ty-font-main-color)]">{row.displayName}</div>
                    <div className="mt-1 flex items-center gap-2 text-ty-2xs text-[var(--ty-font-sub-color)]">
                      <span className="font-mono truncate max-w-[180px]" title={row.fieldCode}>{row.fieldCode}</span>
                      <span className="px-1.5 min-h-5 inline-flex items-center rounded-ty-xs border border-[var(--ty-border-color)] bg-white font-mono">{row.manticoreType}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <input
                      type="number"
                      min="80"
                      max="350"
                      step="10"
                      value={row.widthInput}
                      onChange={event => updateRow(row.id, { widthInput: event.target.value })}
                      aria-label={`${row.displayName}默认列宽`}
                      className="h-8 w-24 px-2 rounded-ty-sm border border-[var(--ty-border-color)] bg-white font-mono focus:outline-hidden focus:border-[var(--ty-primary-color)]"
                    />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <CapabilityCheckbox checked={row.isDisplayInResult} label={`${row.displayName}结果列显示`} onChange={checked => updateRow(row.id, { isDisplayInResult: checked })} />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <CapabilityCheckbox checked={row.isFulltextSearch} label={`${row.displayName}写入全文检索`} onChange={checked => updateRow(row.id, { isFulltextSearch: checked })} />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <CapabilityCheckbox checked={row.isQueryCondition} label={`${row.displayName}查询条件`} onChange={checked => updateRow(row.id, { isQueryCondition: checked })} />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <CapabilityCheckbox
                      checked={row.isSortable}
                      disabled={row.manticoreType === 'TEXT'}
                      label={`${row.displayName}支持排序`}
                      onChange={checked => updateRow(row.id, { isSortable: checked })}
                    />
                    {row.manticoreType === 'TEXT' && <div className="mt-1 text-ty-2xs text-[var(--ty-font-sub-light-color)]">TEXT 不支持</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-2 border-t border-[var(--ty-border-color)] bg-[var(--ty-blue-lightest-color)] text-ty-xs text-[var(--ty-font-main-light-color)] shrink-0">
          “写入全文检索”表示同步时将该属性值写入系统预留的全文检索字段，不改变该属性自身的 Manticore 存储类型。
        </div>

        {errorMessage && <div role="alert" className="mx-5 mt-3 rounded-ty-sm border border-[var(--ty-red-color)]/30 bg-[var(--ty-red-lightest-color)] px-3 py-2 text-ty-xs text-[var(--ty-red-color)] shrink-0">{errorMessage}</div>}

        <footer className="px-5 py-3 border-t border-[var(--ty-border-color)] bg-[var(--ty-fill-weak-dark-color)] flex items-center justify-between gap-3 shrink-0">
          <span className="text-ty-xs text-[var(--ty-font-sub-color)]">
            共 <strong className="font-mono text-[var(--ty-font-main-color)]">{items.length}</strong> 个属性，已修改 <strong className="font-mono text-[var(--ty-primary-color)]">{changedCount}</strong> 个
          </span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="h-8 px-4 rounded-ty-sm border border-[var(--ty-border-color)] bg-white text-ty-xs font-medium text-[var(--ty-font-main-color)] hover:bg-[var(--ty-fill-color)]">取消</button>
            <button type="button" onClick={handleApply} disabled={changedCount === 0} className="h-8 px-4 rounded-ty-sm bg-[var(--ty-primary-color)] text-white text-ty-xs font-medium inline-flex items-center gap-1.5 disabled:bg-[var(--ty-fill-dark-color)] disabled:text-[var(--ty-font-sub-light-color)] disabled:cursor-not-allowed">
              <CheckCircle2 className="w-3.5 h-3.5" />应用批量设置
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
};
