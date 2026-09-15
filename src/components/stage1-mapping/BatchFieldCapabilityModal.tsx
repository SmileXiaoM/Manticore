import React, { useEffect, useMemo, useState } from 'react';
import { ArrowUpDown, CheckCircle2, Eye, ListFilter, Ruler, Search, Sliders, X } from 'lucide-react';

export interface BatchFieldCapabilityChanges {
  isDisplayInResult?: boolean;
  isFulltextSearch?: boolean;
  isQueryCondition?: boolean;
  isSortable?: boolean;
  defaultColumnWidth?: number;
}

interface BatchFieldCapabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  selectedTextCount: number;
  scopeLabel: string;
  onApply: (changes: BatchFieldCapabilityChanges) => void;
}

type BooleanCapabilityKey = 'DISPLAY' | 'FULLTEXT' | 'QUERY' | 'SORT';

const CAPABILITY_ROWS: Array<{
  key: BooleanCapabilityKey;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    key: 'DISPLAY',
    title: '在正式查询表格结果列展示',
    description: '控制该属性是否作为正式查询结果表格中的列。',
    icon: Eye
  },
  {
    key: 'FULLTEXT',
    title: '加入全局全文分词检索',
    description: '开启后，属性值在同步时写入系统预留的全局全文检索字段，不改变自身存储类型。',
    icon: Search
  },
  {
    key: 'QUERY',
    title: '允许作为精确/范围查询条件',
    description: '控制该属性是否可用于精确查询或范围查询。',
    icon: ListFilter
  },
  {
    key: 'SORT',
    title: '支持排序',
    description: '控制正式查询结果是否允许按该属性排序；TEXT 字段不能开启排序。',
    icon: ArrowUpDown
  }
];

const createBooleanMap = (value: boolean) => ({
  DISPLAY: value,
  FULLTEXT: value,
  QUERY: value,
  SORT: value
});

export const BatchFieldCapabilityModal: React.FC<BatchFieldCapabilityModalProps> = ({
  isOpen,
  onClose,
  selectedCount,
  selectedTextCount,
  scopeLabel,
  onApply
}) => {
  const [included, setIncluded] = useState<Record<BooleanCapabilityKey | 'WIDTH', boolean>>({
    DISPLAY: false,
    FULLTEXT: false,
    QUERY: false,
    SORT: false,
    WIDTH: false
  });
  const [booleanValues, setBooleanValues] = useState<Record<BooleanCapabilityKey, boolean>>(createBooleanMap(true));
  const [widthInput, setWidthInput] = useState('150');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setIncluded({ DISPLAY: false, FULLTEXT: false, QUERY: false, SORT: false, WIDTH: false });
    setBooleanValues(createBooleanMap(true));
    setWidthInput('150');
    setErrorMessage('');
  }, [isOpen]);

  const includedCount = useMemo(
    () => Object.values(included).filter(Boolean).length,
    [included]
  );
  const sortableTargetCount = Math.max(0, selectedCount - selectedTextCount);
  const sortWillSkipText = included.SORT && booleanValues.SORT && selectedTextCount > 0;

  if (!isOpen) return null;

  const toggleIncluded = (key: BooleanCapabilityKey | 'WIDTH') => {
    setIncluded(previous => ({ ...previous, [key]: !previous[key] }));
    setErrorMessage('');
  };

  const handleApply = () => {
    if (includedCount === 0) {
      setErrorMessage('请至少勾选一个本次需要设置的配置项');
      return;
    }

    const width = Number(widthInput);
    if (included.WIDTH && (!Number.isInteger(width) || width < 80 || width > 350)) {
      setErrorMessage('默认列宽请输入 80–350 之间的整数');
      return;
    }
    if (included.SORT && booleanValues.SORT && sortableTargetCount === 0) {
      setErrorMessage('所选属性全部为 TEXT 类型，不能开启排序');
      return;
    }

    const changes: BatchFieldCapabilityChanges = {};
    if (included.DISPLAY) changes.isDisplayInResult = booleanValues.DISPLAY;
    if (included.FULLTEXT) changes.isFulltextSearch = booleanValues.FULLTEXT;
    if (included.QUERY) changes.isQueryCondition = booleanValues.QUERY;
    if (included.SORT) changes.isSortable = booleanValues.SORT;
    if (included.WIDTH) changes.defaultColumnWidth = width;
    onApply(changes);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-ty-overlay backdrop-blur-xs p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="batch-field-capability-title"
        className="w-[min(760px,calc(100vw-32px))] max-h-[calc(100dvh-48px)] overflow-hidden rounded-ty-lg border border-[var(--ty-border-color)] bg-[var(--ty-fill-white-color)] shadow-ty-lg flex flex-col"
      >
        <header className="px-5 py-4 border-b border-[var(--ty-border-color)] bg-[var(--ty-fill-weak-dark-color)] flex items-start justify-between gap-3">
          <div>
            <h2 id="batch-field-capability-title" className="text-ty-lg font-semibold text-[var(--ty-font-main-color)] flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[var(--ty-primary-color)]" />
              批量设置属性
            </h2>
            <p className="mt-1 text-ty-xs text-[var(--ty-font-sub-color)]">
              已选 {selectedCount} 个{scopeLabel}；可一次设置多个配置项。只有左侧勾选的配置项会被修改。
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="关闭批量设置属性" className="w-8 h-8 inline-flex items-center justify-center rounded-ty-sm text-[var(--ty-font-sub-light-color)] hover:bg-[var(--ty-fill-dark-color)] hover:text-[var(--ty-font-main-color)]">
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="p-5 overflow-y-auto space-y-3">
          <div className="grid grid-cols-[minmax(0,1fr)_210px] gap-3 px-3 text-ty-2xs font-medium text-[var(--ty-font-sub-color)]">
            <span>本次设置的配置项</span>
            <span>目标值</span>
          </div>

          {CAPABILITY_ROWS.map(row => {
            const Icon = row.icon;
            const active = included[row.key];
            const disabledEnable = row.key === 'SORT' && selectedTextCount === selectedCount;
            return (
              <div key={row.key} className={`grid grid-cols-[minmax(0,1fr)_210px] gap-3 items-center rounded-ty-sm border p-3 ${active ? 'border-[var(--ty-primary-color)]/40 bg-[var(--ty-primary-lightest-color)]/45' : 'border-[var(--ty-border-color)] bg-[var(--ty-fill-white-color)]'}`}>
                <label className="flex items-start gap-3 cursor-pointer min-w-0">
                  <input type="checkbox" checked={active} onChange={() => toggleIncluded(row.key)} className="mt-0.5 rounded text-[var(--ty-primary-color)]" aria-label={`本次设置${row.title}`} />
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 text-ty-xs font-semibold text-[var(--ty-font-main-color)]">
                      <Icon className="w-3.5 h-3.5 text-[var(--ty-primary-color)]" />{row.title}
                    </span>
                    <span className="mt-1 block text-ty-2xs leading-relaxed text-[var(--ty-font-sub-color)]">{row.description}</span>
                  </span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" disabled={!active || disabledEnable} onClick={() => setBooleanValues(previous => ({ ...previous, [row.key]: true }))} className={`h-8 rounded-ty-sm border text-ty-xs font-medium ${active && booleanValues[row.key] ? 'border-[var(--ty-primary-color)] bg-[var(--ty-primary-color)] text-white' : 'border-[var(--ty-border-color)] bg-white text-[var(--ty-font-main-color)]'} disabled:opacity-40 disabled:cursor-not-allowed`}>
                    开启
                  </button>
                  <button type="button" disabled={!active} onClick={() => setBooleanValues(previous => ({ ...previous, [row.key]: false }))} className={`h-8 rounded-ty-sm border text-ty-xs font-medium ${active && !booleanValues[row.key] ? 'border-[var(--ty-primary-color)] bg-[var(--ty-primary-color)] text-white' : 'border-[var(--ty-border-color)] bg-white text-[var(--ty-font-main-color)]'} disabled:opacity-40 disabled:cursor-not-allowed`}>
                    关闭
                  </button>
                </div>
              </div>
            );
          })}

          <div className={`grid grid-cols-[minmax(0,1fr)_210px] gap-3 items-center rounded-ty-sm border p-3 ${included.WIDTH ? 'border-[var(--ty-primary-color)]/40 bg-[var(--ty-primary-lightest-color)]/45' : 'border-[var(--ty-border-color)] bg-[var(--ty-fill-white-color)]'}`}>
            <label className="flex items-start gap-3 cursor-pointer min-w-0">
              <input type="checkbox" checked={included.WIDTH} onChange={() => toggleIncluded('WIDTH')} className="mt-0.5 rounded text-[var(--ty-primary-color)]" aria-label="本次设置默认列宽" />
              <span>
                <span className="flex items-center gap-1.5 text-ty-xs font-semibold text-[var(--ty-font-main-color)]"><Ruler className="w-3.5 h-3.5 text-[var(--ty-primary-color)]" />默认表格列宽</span>
                <span className="mt-1 block text-ty-2xs text-[var(--ty-font-sub-color)]">统一设置正式查询结果中的默认列宽，范围 80–350px。</span>
              </span>
            </label>
            <label className="flex items-center gap-2">
              <input type="number" min="80" max="350" step="10" disabled={!included.WIDTH} value={widthInput} onChange={event => { setWidthInput(event.target.value); setErrorMessage(''); }} aria-label="批量设置默认列宽" className="h-8 w-full px-3 rounded-ty-sm border border-[var(--ty-border-color)] bg-white font-mono disabled:opacity-40 focus:outline-hidden focus:border-[var(--ty-primary-color)]" />
              <span className="text-ty-xs text-[var(--ty-font-sub-color)]">px</span>
            </label>
          </div>

          {sortWillSkipText && (
            <div className="rounded-ty-sm border border-[var(--ty-orange-color)]/35 bg-[var(--ty-orange-lightest-color)] px-3 py-2 text-ty-xs text-[var(--ty-font-main-light-color)]">
              排序将对 {sortableTargetCount} 个非 TEXT 属性开启；{selectedTextCount} 个 TEXT 属性不支持排序并保持关闭。
            </div>
          )}
          {errorMessage && <div role="alert" className="rounded-ty-sm border border-[var(--ty-red-color)]/30 bg-[var(--ty-red-lightest-color)] px-3 py-2 text-ty-xs text-[var(--ty-red-color)]">{errorMessage}</div>}
        </div>

        <footer className="px-5 py-3 border-t border-[var(--ty-border-color)] bg-[var(--ty-fill-weak-dark-color)] flex items-center justify-between gap-3">
          <span className="text-ty-xs text-[var(--ty-font-sub-color)]">
            已选择 <strong className="font-mono text-[var(--ty-font-main-color)]">{includedCount}</strong> 个配置项，将应用到 <strong className="font-mono text-[var(--ty-font-main-color)]">{selectedCount}</strong> 个属性
          </span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="h-8 px-4 rounded-ty-sm border border-[var(--ty-border-color)] bg-white text-ty-xs font-medium text-[var(--ty-font-main-color)] hover:bg-[var(--ty-fill-color)]">取消</button>
            <button type="button" onClick={handleApply} disabled={includedCount === 0} className="h-8 px-4 rounded-ty-sm bg-[var(--ty-primary-color)] text-white text-ty-xs font-medium inline-flex items-center gap-1.5 disabled:bg-[var(--ty-fill-dark-color)] disabled:text-[var(--ty-font-sub-light-color)] disabled:cursor-not-allowed">
              <CheckCircle2 className="w-3.5 h-3.5" />应用批量设置
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
};
