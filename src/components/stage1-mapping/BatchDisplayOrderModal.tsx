import React, { useEffect, useMemo, useState } from 'react';
import { CheckSquare, ListOrdered, Search, Square, X } from 'lucide-react';
import {
  FieldMappingItem,
  MappingObjectType,
  formatRootTypeDisplayName,
  getFieldDisplayOrder
} from '../../stage1MappingTypes';

interface BatchDisplayOrderModalProps {
  isOpen: boolean;
  currentRootType: MappingObjectType;
  fields: FieldMappingItem[];
  onClose: () => void;
  onSave: (fieldIds: string[], displayOrder: number) => void;
  hasPermission?: boolean;
}

export const BatchDisplayOrderModal: React.FC<BatchDisplayOrderModalProps> = ({
  isOpen,
  currentRootType,
  fields,
  onClose,
  onSave,
  hasPermission = true
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CONFIGURED' | 'DRAFT'>('ALL');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [displayOrder, setDisplayOrder] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const rootTypeFields = useMemo(
    () => fields.filter(field => field.rootTypeId === currentRootType.id),
    [fields, currentRootType.id]
  );

  const filteredFields = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    return rootTypeFields.filter(field => {
      if (statusFilter === 'CONFIGURED' && (field.configStatus !== 'CONFIGURED' || field.hasDraftModification)) {
        return false;
      }
      if (statusFilter === 'DRAFT' && field.configStatus !== 'DRAFT' && !field.hasDraftModification) {
        return false;
      }
      if (!keyword) return true;
      const currentTitle = field.draftData?.displayTitle ?? field.displayTitle;
      return [field.sourceFieldName, field.sourceDisplayName, currentTitle, field.manticoreField]
        .some(value => value.toLowerCase().includes(keyword));
    });
  }, [rootTypeFields, searchTerm, statusFilter]);

  useEffect(() => {
    if (!isOpen) return;
    setSearchTerm('');
    setStatusFilter('ALL');
    setSelectedIds([]);
    setDisplayOrder('');
    setErrorMessage('');
  }, [isOpen, currentRootType.id]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredIds = filteredFields.map(field => field.id);
  const allFilteredSelected = filteredIds.length > 0 && filteredIds.every(id => selectedIds.includes(id));
  const parsedOrder = Number(displayOrder);
  const isOrderValid = Number.isInteger(parsedOrder) && parsedOrder > 0;

  const toggleField = (fieldId: string) => {
    setSelectedIds(previous => previous.includes(fieldId)
      ? previous.filter(id => id !== fieldId)
      : [...previous, fieldId]);
    setErrorMessage('');
  };

  const toggleAllFiltered = () => {
    if (allFilteredSelected) {
      setSelectedIds(previous => previous.filter(id => !filteredIds.includes(id)));
    } else {
      setSelectedIds(previous => Array.from(new Set([...previous, ...filteredIds])));
    }
    setErrorMessage('');
  };

  const handleSave = () => {
    if (selectedIds.length === 0) {
      setErrorMessage('请至少选择一个需要调整的属性');
      return;
    }
    if (!isOrderValid) {
      setErrorMessage('展示顺序请输入大于 0 的整数');
      return;
    }
    onSave(selectedIds, parsedOrder);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ty-overlay backdrop-blur-xs px-4 py-[60px] overflow-y-auto">
      <section
        role="dialog"
        aria-modal="true"
        aria-label="批量调整属性展示顺序"
        className="bg-[var(--ty-fill-white-color)] rounded-ty-lg shadow-ty-lg border border-[var(--ty-border-color)] w-[min(920px,calc(100vw-32px))] flex flex-col max-h-[calc(100dvh-120px)] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        <header className="px-5 py-3 border-b border-[var(--ty-border-color)] bg-[var(--ty-fill-weak-dark-color)] flex items-start justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <h2 className="text-ty-lg font-semibold text-[var(--ty-font-main-color)] flex items-center">
              <ListOrdered className="w-4 h-4 mr-2 text-[var(--ty-primary-color)]" />
              批量调整展示顺序
            </h2>
            <p className="mt-1 text-ty-xs text-[var(--ty-font-sub-color)]">
              {formatRootTypeDisplayName(currentRootType.name, currentRootType.code)} · 选择已有属性并统一设置顺序；相同顺序的属性将相邻展示。
            </p>
          </div>
          <button
            type="button"
            aria-label="关闭批量调整展示顺序"
            onClick={onClose}
            className="p-1 rounded-ty-sm text-[var(--ty-font-sub-light-color)] hover:text-[var(--ty-font-main-color)] hover:bg-[var(--ty-fill-dark-color)] cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="px-5 py-3 border-b border-[var(--ty-border-color)] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <label className="sr-only" htmlFor="batch-order-status-filter">属性状态</label>
            <select
              id="batch-order-status-filter"
              value={statusFilter}
              onChange={event => setStatusFilter(event.target.value as 'ALL' | 'CONFIGURED' | 'DRAFT')}
              className="h-8 w-40 px-3 text-ty-xs bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm focus:outline-hidden focus:border-[var(--ty-primary-color)] cursor-pointer"
            >
              <option value="ALL">全部状态（{rootTypeFields.length}）</option>
              <option value="CONFIGURED">已配置（{rootTypeFields.filter(field => field.configStatus === 'CONFIGURED' && !field.hasDraftModification).length}）</option>
              <option value="DRAFT">草稿项（{rootTypeFields.filter(field => field.configStatus === 'DRAFT' || field.hasDraftModification).length}）</option>
            </select>
            <div className="relative min-w-[260px] max-w-md flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ty-icon-light-color)]" />
              <input
                type="text"
                value={searchTerm}
                onChange={event => setSearchTerm(event.target.value)}
                placeholder="搜索来源字段、显示名称、Manticore 字段"
                className="w-full h-8 pl-8 pr-3 text-ty-xs bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm focus:outline-hidden focus:border-[var(--ty-primary-color)]"
              />
            </div>
          </div>
          <div className="text-ty-xs text-[var(--ty-font-sub-color)]">
            已选择 <span className="font-mono font-semibold text-[var(--ty-primary-color)]">{selectedIds.length}</span> / {rootTypeFields.length} 个属性
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          <table className="w-full text-left text-ty-xs">
            <thead className="sticky top-0 z-10 bg-[var(--ty-fill-weak-dark-color)] border-b border-[var(--ty-border-color)] text-[var(--ty-font-sub-color)] font-semibold">
              <tr>
                <th className="w-12 px-3 py-2 text-center">
                  <button
                    type="button"
                    onClick={toggleAllFiltered}
                    disabled={filteredFields.length === 0}
                    className="p-0.5 text-[var(--ty-font-sub-color)] hover:text-[var(--ty-primary-color)] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                    title={allFilteredSelected ? '取消选择当前结果' : '选择当前全部结果'}
                  >
                    {allFilteredSelected
                      ? <CheckSquare className="w-4 h-4 text-[var(--ty-primary-color)]" />
                      : <Square className="w-4 h-4" />}
                  </button>
                </th>
                <th className="px-3 py-2">属性</th>
                <th className="px-3 py-2">Manticore 字段</th>
                <th className="w-28 px-3 py-2 text-center">当前顺序</th>
                <th className="w-28 px-3 py-2">配置状态</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--ty-border-light-color)]">
              {filteredFields.length > 0 ? filteredFields.map(field => {
                const selected = selectedIds.includes(field.id);
                const hasOrderDraft = field.configStatus === 'CONFIGURED' && field.hasDraftModification && field.draftData?.displayOrder !== undefined;
                return (
                  <tr key={field.id} className={selected ? 'bg-[var(--ty-blue-lightest-color)]/60' : 'hover:bg-[var(--ty-fill-weak-dark-color)]/50'}>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => toggleField(field.id)}
                        className="p-0.5 cursor-pointer text-[var(--ty-font-sub-color)] hover:text-[var(--ty-primary-color)]"
                        aria-label={`${selected ? '取消选择' : '选择'}${field.sourceDisplayName}`}
                      >
                        {selected
                          ? <CheckSquare className="w-4 h-4 text-[var(--ty-primary-color)]" />
                          : <Square className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-[var(--ty-font-main-color)]">{field.draftData?.displayTitle ?? field.displayTitle}</div>
                      <div className="mt-0.5 font-mono text-ty-2xs text-[var(--ty-font-sub-color)]">{field.sourceFieldName}</div>
                    </td>
                    <td className="px-3 py-2 font-mono text-[var(--ty-blue-color)] break-all">{field.manticoreField}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`min-h-6 px-2 inline-flex items-center rounded-ty-xs border font-mono font-semibold ${hasOrderDraft ? 'bg-[var(--ty-blue-lightest-color)] border-[var(--ty-blue-color)]/30 text-[var(--ty-font-main-light-color)]' : 'bg-[var(--ty-fill-weak-dark-color)] border-[var(--ty-border-light-color)] text-[var(--ty-font-main-color)]'}`}>
                        {getFieldDisplayOrder(field)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[var(--ty-font-sub-color)]">
                      {field.configStatus === 'DRAFT' ? '草稿' : field.hasDraftModification ? '已配置（有草稿）' : '已配置'}
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-[var(--ty-font-sub-light-color)]">未找到符合条件的属性</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <footer className="px-5 py-3 border-t border-[var(--ty-border-color)] bg-[var(--ty-fill-weak-dark-color)] flex flex-wrap items-end justify-between gap-3 shrink-0">
          <div className="space-y-1">
            <label htmlFor="batch-display-order" className="block text-ty-xs font-medium text-[var(--ty-font-main-color)]">
              统一展示顺序
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                id="batch-display-order"
                type="number"
                min="1"
                step="1"
                value={displayOrder}
                onChange={event => {
                  setDisplayOrder(event.target.value);
                  setErrorMessage('');
                }}
                placeholder="请输入正整数"
                className="h-8 w-40 px-3 bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm text-ty-xs focus:outline-hidden focus:border-[var(--ty-primary-color)]"
              />
              <span className="text-ty-2xs text-[var(--ty-font-sub-light-color)]">允许与其他属性同序号</span>
            </div>
            {errorMessage && <p role="alert" className="text-ty-2xs text-[var(--ty-red-color)]">{errorMessage}</p>}
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-4 border border-[var(--ty-border-color)] rounded-ty-sm text-ty-xs font-medium bg-[var(--ty-fill-white-color)] hover:bg-[var(--ty-fill-color)] cursor-pointer"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!hasPermission || selectedIds.length === 0 || !isOrderValid}
              className="h-8 px-4 rounded-ty-sm text-ty-xs font-medium bg-[var(--ty-primary-color)] text-[var(--ty-font-white-color)] hover:opacity-90 disabled:bg-[var(--ty-fill-dark-color)] disabled:text-[var(--ty-font-sub-light-color)] disabled:cursor-not-allowed cursor-pointer"
            >
              保存为草稿（{selectedIds.length}）
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
};
