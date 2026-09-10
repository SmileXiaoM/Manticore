import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  ChevronsDown,
  ChevronsUp,
  GripVertical,
  ListOrdered,
  Search,
  Square,
  Trash2,
  X
} from 'lucide-react';
import {
  FieldMappingItem,
  MappingObjectType,
  formatRootTypeDisplayName,
  getFieldDisplayOrder
} from '../../stage1MappingTypes';
import { HelpTooltip } from '../ui/HelpTooltip';

type StatusFilter = 'ALL' | 'CONFIGURED' | 'DRAFT';

interface DisplayLayoutUpdate {
  fieldId: string;
  displayOrder: number;
  defaultColumnWidth: number;
}

interface BatchDisplayOrderModalProps {
  isOpen: boolean;
  currentRootType: MappingObjectType;
  fields: FieldMappingItem[];
  onClose: () => void;
  onSave: (updates: DisplayLayoutUpdate[]) => void;
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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [positionInputs, setPositionInputs] = useState<Record<string, string>>({});
  const [widthInputs, setWidthInputs] = useState<Record<string, string>>({});
  const [sharedWidthInput, setSharedWidthInput] = useState('150');
  const [draggedId, setDraggedId] = useState<string>();
  const [dragOverId, setDragOverId] = useState<string>();
  const [errorMessage, setErrorMessage] = useState('');

  const rootTypeFields = useMemo(() => {
    return fields
      .filter(field => field.rootTypeId === currentRootType.id)
      .map((field, sourceIndex) => ({ field, sourceIndex }))
      .sort((left, right) => getFieldDisplayOrder(left.field) - getFieldDisplayOrder(right.field) || left.sourceIndex - right.sourceIndex)
      .map(item => item.field);
  }, [fields, currentRootType.id]);

  const fieldsById = useMemo(
    () => new Map(rootTypeFields.map(field => [field.id, field])),
    [rootTypeFields]
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

  const selectedFields = useMemo(
    () => selectedIds.map(id => fieldsById.get(id)).filter((field): field is FieldMappingItem => Boolean(field)),
    [selectedIds, fieldsById]
  );

  useEffect(() => {
    if (!isOpen) return;
    setSearchTerm('');
    setStatusFilter('ALL');
    setSelectedIds([]);
    setPositionInputs({});
    setWidthInputs({});
    setSharedWidthInput('150');
    setDraggedId(undefined);
    setDragOverId(undefined);
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

  const configuredCount = rootTypeFields.filter(field => field.configStatus === 'CONFIGURED' && !field.hasDraftModification).length;
  const draftCount = rootTypeFields.filter(field => field.configStatus === 'DRAFT' || field.hasDraftModification).length;
  const filteredIds = filteredFields.map(field => field.id);
  const allFilteredSelected = filteredIds.length > 0 && filteredIds.every(id => selectedIds.includes(id));
  const selectedOrderSlots = selectedFields
    .map(field => getFieldDisplayOrder(field))
    .sort((left, right) => left - right);
  const getFieldColumnWidth = (field: FieldMappingItem) => field.hasDraftModification && field.draftData?.defaultColumnWidth !== undefined
    ? field.draftData.defaultColumnWidth
    : field.defaultColumnWidth ?? 150;

  const parseColumnWidth = (rawValue: string) => {
    const value = Number(rawValue);
    return Number.isInteger(value) && value >= 80 && value <= 350 ? value : null;
  };

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

  const moveToIndex = (fieldId: string, nextIndex: number) => {
    setSelectedIds(previous => {
      const currentIndex = previous.indexOf(fieldId);
      if (currentIndex < 0) return previous;
      const boundedIndex = Math.max(0, Math.min(nextIndex, previous.length - 1));
      if (currentIndex === boundedIndex) return previous;
      const next = [...previous];
      next.splice(currentIndex, 1);
      next.splice(boundedIndex, 0, fieldId);
      return next;
    });
    setErrorMessage('');
  };

  const moveBefore = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    setSelectedIds(previous => {
      const next = previous.filter(id => id !== sourceId);
      const targetIndex = next.indexOf(targetId);
      if (targetIndex < 0) return previous;
      next.splice(targetIndex, 0, sourceId);
      return next;
    });
    setDraggedId(undefined);
    setDragOverId(undefined);
    setErrorMessage('');
  };

  const moveToEnteredPosition = (fieldId: string, currentPosition: number) => {
    const rawValue = positionInputs[fieldId] || String(currentPosition);
    const targetPosition = Number(rawValue);
    if (!Number.isInteger(targetPosition) || targetPosition < 1 || targetPosition > selectedIds.length) {
      setErrorMessage(`移动位置请输入 1–${selectedIds.length} 之间的整数`);
      return;
    }
    moveToIndex(fieldId, targetPosition - 1);
    setPositionInputs(previous => ({ ...previous, [fieldId]: '' }));
  };

  const applySharedWidth = () => {
    const width = parseColumnWidth(sharedWidthInput);
    if (width === null) {
      setErrorMessage('统一列宽请输入 80–350 之间的整数');
      return;
    }
    setWidthInputs(previous => ({
      ...previous,
      ...Object.fromEntries(selectedIds.map(fieldId => [fieldId, String(width)]))
    }));
    setErrorMessage('');
  };

  const handleSave = () => {
    if (selectedIds.length === 0) {
      setErrorMessage('请至少选择一个需要调整的属性');
      return;
    }
    const invalidField = selectedFields.find(field => parseColumnWidth(widthInputs[field.id] ?? String(getFieldColumnWidth(field))) === null);
    if (invalidField) {
      setErrorMessage(`${invalidField.draftData?.displayTitle ?? invalidField.displayTitle}的列宽请输入 80–350 之间的整数`);
      return;
    }
    onSave(selectedIds.map((fieldId, index) => {
      const field = fieldsById.get(fieldId)!;
      return {
        fieldId,
        displayOrder: selectedOrderSlots[index],
        defaultColumnWidth: parseColumnWidth(widthInputs[fieldId] ?? String(getFieldColumnWidth(field)))!
      };
    }));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ty-overlay backdrop-blur-xs px-4 py-[60px] overflow-y-auto">
      <section
        role="dialog"
        aria-modal="true"
        aria-label="批量调整属性展示顺序与列宽"
        className="bg-[var(--ty-fill-white-color)] rounded-ty-lg shadow-ty-lg border border-[var(--ty-border-color)] w-[min(1200px,calc(100vw-32px))] flex flex-col h-[min(820px,calc(100dvh-120px))] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        <header className="px-5 py-3 border-b border-[var(--ty-border-color)] bg-[var(--ty-fill-weak-dark-color)] flex items-start justify-between gap-4 shrink-0">
          <div className="min-w-0 flex flex-wrap items-center gap-2">
            <h2 className="text-ty-lg font-semibold text-[var(--ty-font-main-color)] flex items-center">
              <ListOrdered className="w-4 h-4 mr-2 text-[var(--ty-primary-color)]" />
              批量调整展示顺序与列宽
            </h2>
            <HelpTooltip label="查看批量调整展示布局说明" content="从左侧选择属性，在右侧调整顺序和表格列宽；顺序支持拖动、置顶、上下移动、置底和移动到第 N 位。" />
            <span className="min-h-6 px-2 inline-flex items-center text-ty-2xs font-mono font-medium rounded-ty-sm bg-[var(--ty-fill-color)] text-[var(--ty-font-main-color)] border border-[var(--ty-border-color)]">
              根类型：{formatRootTypeDisplayName(currentRootType.name, currentRootType.code)}
            </span>
          </div>
          <button type="button" aria-label="关闭批量调整展示顺序与列宽" onClick={onClose} className="h-7 w-7 inline-flex items-center justify-center rounded-ty-sm text-[var(--ty-font-sub-light-color)] hover:text-[var(--ty-font-main-color)] hover:bg-[var(--ty-fill-dark-color)] cursor-pointer transition-colors">
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(460px,1fr)] flex-1 min-h-0">
          <section className="flex flex-col min-h-0 border-b lg:border-b-0 lg:border-r border-[var(--ty-border-color)]" aria-label="可选属性">
            <div className="px-4 py-3 border-b border-[var(--ty-border-color)] space-y-2 shrink-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-ty-sm font-semibold text-[var(--ty-font-main-color)]">可选属性</h3>
                <span className="text-ty-xs text-[var(--ty-font-sub-color)]">共 {rootTypeFields.length} 个</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="sr-only" htmlFor="batch-order-status-filter">属性状态</label>
                <select id="batch-order-status-filter" value={statusFilter} onChange={event => setStatusFilter(event.target.value as StatusFilter)} className="h-8 w-36 px-3 text-ty-xs bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm focus:outline-hidden focus:border-[var(--ty-primary-color)] cursor-pointer">
                  <option value="ALL">全部状态（{rootTypeFields.length}）</option>
                  <option value="CONFIGURED">已配置（{configuredCount}）</option>
                  <option value="DRAFT">草稿项（{draftCount}）</option>
                </select>
                <div className="relative min-w-0 flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ty-icon-light-color)]" />
                  <input type="text" value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="搜索属性或字段" className="w-full h-8 pl-8 pr-3 text-ty-xs bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm focus:outline-hidden focus:border-[var(--ty-primary-color)]" />
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
              <table className="ty-data-table table-fixed w-full text-left text-ty-xs">
                <thead className="sticky top-0 z-10 bg-[var(--ty-fill-weak-dark-color)] border-b border-[var(--ty-border-color)] text-[var(--ty-font-sub-color)] font-semibold">
                  <tr>
                    <th className="w-10 px-2 py-2 text-center">
                      <button type="button" onClick={toggleAllFiltered} disabled={filteredFields.length === 0} aria-label={allFilteredSelected ? '取消选择当前结果' : '选择当前全部结果'} className="h-7 w-7 inline-flex items-center justify-center text-[var(--ty-font-sub-color)] hover:text-[var(--ty-primary-color)] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed">
                        {allFilteredSelected ? <CheckSquare className="w-4 h-4 text-[var(--ty-primary-color)]" /> : <Square className="w-4 h-4" />}
                      </button>
                    </th>
                    <th className="w-[24%] px-2 py-2">属性名称</th>
                    <th className="w-[23%] px-2 py-2">字段编码</th>
                    <th className="w-16 px-2 py-2 text-center">顺序</th>
                    <th className="w-20 px-2 py-2 text-center">列宽</th>
                    <th className="w-[22%] px-2 py-2">状态</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--ty-border-light-color)]">
                  {filteredFields.length > 0 ? filteredFields.map(field => {
                    const selected = selectedIds.includes(field.id);
                    const hasOrderDraft = field.configStatus === 'CONFIGURED' && field.hasDraftModification && field.draftData?.displayOrder !== undefined;
                    return (
                      <tr key={field.id} className={selected ? 'bg-[var(--ty-blue-lightest-color)]/60' : 'hover:bg-[var(--ty-fill-weak-dark-color)]/50'}>
                        <td className="px-2 py-2 text-center">
                          <button type="button" onClick={() => toggleField(field.id)} className="h-7 w-7 inline-flex items-center justify-center cursor-pointer text-[var(--ty-font-sub-color)] hover:text-[var(--ty-primary-color)]" aria-label={`${selected ? '取消选择' : '选择'}${field.sourceDisplayName}`}>
                            {selected ? <CheckSquare className="w-4 h-4 text-[var(--ty-primary-color)]" /> : <Square className="w-4 h-4" />}
                          </button>
                        </td>
                        <td className="px-2 py-2 min-w-0 font-medium text-[var(--ty-font-main-color)] truncate">{field.draftData?.displayTitle ?? field.displayTitle}</td>
                        <td className="px-2 py-2 min-w-0 font-mono text-ty-2xs text-[var(--ty-font-sub-color)] truncate">{field.manticoreField}</td>
                        <td className="px-2 py-2 text-center">
                          <span className={`min-h-6 px-2 inline-flex items-center rounded-ty-xs border font-mono font-semibold ${hasOrderDraft ? 'bg-[var(--ty-blue-lightest-color)] border-[var(--ty-blue-color)]/30 text-[var(--ty-font-main-light-color)]' : 'bg-[var(--ty-fill-weak-dark-color)] border-[var(--ty-border-light-color)] text-[var(--ty-font-main-color)]'}`}>{getFieldDisplayOrder(field)}</span>
                        </td>
                        <td className="px-2 py-2 text-center font-mono text-[var(--ty-font-sub-color)]">{getFieldColumnWidth(field)} px</td>
                        <td className="px-2 py-2 text-[var(--ty-font-sub-color)]">{field.configStatus === 'DRAFT' ? '草稿' : field.hasDraftModification ? '已配置 · 有草稿' : '已配置'}</td>
                      </tr>
                    );
                  }) : (
                    <tr><td colSpan={6} className="py-10 text-center text-[var(--ty-font-sub-light-color)]">未找到符合条件的属性</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2 border-t border-[var(--ty-border-color)] bg-[var(--ty-fill-weak-dark-color)] text-ty-2xs text-[var(--ty-font-sub-color)] shrink-0">当前结果 {filteredFields.length} 个；顶部勾选框可一次选择当前全部结果。</div>
          </section>

          <section className="flex flex-col min-h-0" aria-label="已选属性排序">
            <div className="px-4 py-3 border-b border-[var(--ty-border-color)] flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-1">
                <h3 className="text-ty-sm font-semibold text-[var(--ty-font-main-color)]">已选属性 <span className="font-mono text-[var(--ty-primary-color)]">{selectedFields.length}</span></h3>
                <HelpTooltip label="查看已选属性布局调整方法" content="拖动整行，或输入目标位置后按回车、点击确认图标调整顺序；列宽可逐项填写，也可统一应用到全部已选属性。" />
              </div>
              <div className="flex flex-wrap items-center justify-end gap-1.5">
                <label className="h-7 inline-flex items-center gap-1 text-ty-2xs text-[var(--ty-font-sub-color)]">
                  统一列宽
                  <input type="number" min="80" max="350" step="10" value={sharedWidthInput} onChange={event => setSharedWidthInput(event.target.value)} aria-label="统一列宽" className="h-7 w-16 px-1.5 font-mono text-[var(--ty-font-main-color)] border border-[var(--ty-border-color)] rounded-ty-xs focus:outline-hidden focus:border-[var(--ty-primary-color)]" />
                  px
                </label>
                <button type="button" onClick={applySharedWidth} disabled={selectedIds.length === 0} className="h-7 px-2.5 border border-[var(--ty-border-color)] rounded-ty-sm text-ty-xs bg-[var(--ty-fill-white-color)] hover:bg-[var(--ty-fill-weak-dark-color)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">应用</button>
                <button type="button" onClick={() => setSelectedIds([])} disabled={selectedIds.length === 0} className="h-7 px-2.5 inline-flex items-center gap-1 border border-[var(--ty-border-color)] rounded-ty-sm text-ty-xs bg-[var(--ty-fill-white-color)] hover:bg-[var(--ty-fill-weak-dark-color)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"><Trash2 className="w-3.5 h-3.5" />清空</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 p-3 space-y-1.5 bg-[var(--ty-fill-color)]/40" role="list" aria-label="全部已选属性">
              {selectedFields.length > 0 ? selectedFields.map((field, index) => {
                const currentPosition = index + 1;
                const previewOrder = selectedOrderSlots[index];
                return (
                  <div key={field.id} role="listitem" draggable onDragStart={() => setDraggedId(field.id)} onDragOver={event => { event.preventDefault(); setDragOverId(field.id); }} onDrop={event => { event.preventDefault(); if (draggedId) moveBefore(draggedId, field.id); }} onDragEnd={() => { setDraggedId(undefined); setDragOverId(undefined); }} className={`grid grid-cols-[34px_minmax(110px,1fr)_auto] items-center gap-2 px-2 py-2 rounded-ty-sm border bg-[var(--ty-fill-white-color)] transition-colors ${dragOverId === field.id && draggedId !== field.id ? 'border-[var(--ty-primary-color)]' : 'border-[var(--ty-border-color)]'} ${draggedId === field.id ? 'opacity-50' : ''}`}>
                    <div className="flex items-center gap-1 text-[var(--ty-font-sub-light-color)] cursor-grab" title="拖动排序"><GripVertical className="w-3.5 h-3.5" /><span className="font-mono text-ty-2xs">{currentPosition}</span></div>
                    <div className="min-w-0">
                      <div className="font-medium text-ty-xs text-[var(--ty-font-main-color)] truncate">{field.draftData?.displayTitle ?? field.displayTitle}</div>
                      <div className="mt-0.5 text-ty-2xs text-[var(--ty-font-sub-color)] truncate">当前 {getFieldDisplayOrder(field)} · 保存后 {previewOrder} · {field.configStatus === 'DRAFT' ? '草稿' : field.hasDraftModification ? '有草稿' : '已配置'}</div>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-1">
                      <span className="inline-flex items-center gap-0.5">
                        <button type="button" onClick={() => moveToIndex(field.id, 0)} disabled={index === 0} aria-label={`将${field.sourceDisplayName}置顶`} title="置顶" className="w-7 h-7 inline-flex items-center justify-center rounded-ty-xs hover:bg-[var(--ty-fill-weak-dark-color)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"><ChevronsUp className="w-3.5 h-3.5" /></button>
                        <button type="button" onClick={() => moveToIndex(field.id, index - 1)} disabled={index === 0} aria-label={`将${field.sourceDisplayName}上移`} title="上移" className="w-7 h-7 inline-flex items-center justify-center rounded-ty-xs hover:bg-[var(--ty-fill-weak-dark-color)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"><ChevronUp className="w-3.5 h-3.5" /></button>
                        <button type="button" onClick={() => moveToIndex(field.id, index + 1)} disabled={index === selectedIds.length - 1} aria-label={`将${field.sourceDisplayName}下移`} title="下移" className="w-7 h-7 inline-flex items-center justify-center rounded-ty-xs hover:bg-[var(--ty-fill-weak-dark-color)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"><ChevronDown className="w-3.5 h-3.5" /></button>
                        <button type="button" onClick={() => moveToIndex(field.id, selectedIds.length - 1)} disabled={index === selectedIds.length - 1} aria-label={`将${field.sourceDisplayName}置底`} title="置底" className="w-7 h-7 inline-flex items-center justify-center rounded-ty-xs hover:bg-[var(--ty-fill-weak-dark-color)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"><ChevronsDown className="w-3.5 h-3.5" /></button>
                      </span>
                      <span className="h-7 inline-flex items-center gap-1 px-1.5 rounded-ty-xs border border-[var(--ty-border-color)] bg-[var(--ty-fill-white-color)] text-ty-2xs text-[var(--ty-font-sub-color)]">
                        <span>移至</span>
                        <input type="number" min="1" max={selectedIds.length} step="1" value={positionInputs[field.id] || ''} onChange={event => { setPositionInputs(previous => ({ ...previous, [field.id]: event.target.value })); setErrorMessage(''); }} onKeyDown={event => { if (event.key === 'Enter') moveToEnteredPosition(field.id, currentPosition); }} placeholder={String(currentPosition)} aria-label={`${field.sourceDisplayName}移动到第 N 位`} className="h-6 w-10 px-1 text-center text-ty-2xs font-mono text-[var(--ty-font-main-color)] border-0 border-b border-[var(--ty-border-color)] bg-transparent focus:outline-hidden focus:border-[var(--ty-primary-color)]" />
                        <span>位</span>
                        <button type="button" onClick={() => moveToEnteredPosition(field.id, currentPosition)} aria-label={`确认将${field.sourceDisplayName}移动到指定位置`} title="确认移动" className="w-5 h-5 inline-flex items-center justify-center rounded-ty-xs text-[var(--ty-primary-color)] hover:bg-[var(--ty-primary-lightest-color)] cursor-pointer"><Check className="w-3.5 h-3.5" /></button>
                      </span>
                      <label className="h-7 inline-flex items-center gap-1 text-ty-2xs text-[var(--ty-font-sub-color)]">
                        列宽
                        <input type="number" min="80" max="350" step="10" value={widthInputs[field.id] ?? String(getFieldColumnWidth(field))} onChange={event => { setWidthInputs(previous => ({ ...previous, [field.id]: event.target.value })); setErrorMessage(''); }} aria-label={`${field.sourceDisplayName}列宽`} className="h-7 w-16 px-1.5 font-mono text-[var(--ty-font-main-color)] border border-[var(--ty-border-color)] rounded-ty-xs focus:outline-hidden focus:border-[var(--ty-primary-color)]" />
                        px
                      </label>
                      <button type="button" onClick={() => toggleField(field.id)} aria-label={`移除${field.sourceDisplayName}`} title="从已选属性移除" className="w-7 h-7 inline-flex items-center justify-center rounded-ty-xs text-[var(--ty-font-sub-light-color)] hover:text-[var(--ty-red-color)] hover:bg-[var(--ty-red-lightest-color)] cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                );
              }) : (
                <div className="h-full min-h-48 flex flex-col items-center justify-center text-center text-[var(--ty-font-sub-light-color)]"><ListOrdered className="w-8 h-8 mb-2 text-[var(--ty-icon-lighter-color)]" /><p className="text-ty-xs font-medium">尚未选择属性</p><p className="mt-1 text-ty-2xs">从左侧勾选后，全部已选属性会集中显示在这里。</p></div>
              )}
            </div>
          </section>
        </div>

        <footer className="px-5 py-3 border-t border-[var(--ty-border-color)] bg-[var(--ty-fill-weak-dark-color)] flex flex-wrap items-center justify-between gap-3 shrink-0">
          {errorMessage && <p role="alert" className="text-ty-2xs text-[var(--ty-red-color)]">{errorMessage}</p>}
          <div className="flex items-center gap-3 ml-auto">
            <button type="button" onClick={onClose} className="h-8 px-4 border border-[var(--ty-border-color)] rounded-ty-sm text-ty-xs font-medium bg-[var(--ty-fill-white-color)] hover:bg-[var(--ty-fill-color)] cursor-pointer">取消</button>
            <button type="button" onClick={handleSave} disabled={!hasPermission || selectedIds.length === 0} className="h-8 px-4 rounded-ty-sm text-ty-xs font-medium bg-[var(--ty-primary-color)] text-[var(--ty-font-white-color)] hover:opacity-90 disabled:bg-[var(--ty-fill-dark-color)] disabled:text-[var(--ty-font-sub-light-color)] disabled:cursor-not-allowed cursor-pointer">保存布局草稿（{selectedIds.length}）</button>
          </div>
        </footer>
      </section>
    </div>
  );
};
