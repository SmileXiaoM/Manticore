import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Search,
  CheckSquare,
  Square,
  AlertCircle,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileSpreadsheet,
  Database,
  ArrowRight,
  Filter,
  Save,
  Info,
  RefreshCw,
  Sparkles,
  Server,
  Layers,
  Check,
  RotateCcw
} from 'lucide-react';
import {
  SourceFieldMeta,
  MappingObjectType,
  FieldMappingItem,
  BatchImportCandidate,
  BatchImportConflictType,
  ManticoreFieldType,
  resolveSourceDisplayName,
  formatRootTypeDisplayName
} from '../../stage1MappingTypes';

interface BatchImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRootType: MappingObjectType;
  availablePlmFields: SourceFieldMeta[];
  existingFieldMappings: FieldMappingItem[];
  onSaveBatchDrafts: (newDrafts: FieldMappingItem[]) => void;
  hasPermission?: boolean;
}

export const BatchImportModal: React.FC<BatchImportModalProps> = ({
  isOpen,
  onClose,
  currentRootType,
  availablePlmFields,
  existingFieldMappings,
  onSaveBatchDrafts,
  hasPermission = true
}) => {
  // 1. PLM 元数据读取状态: 'IDLE' | 'FETCHING' | 'SUCCESS' | 'FAILED' | 'EMPTY'
  const [fetchStatus, setFetchStatus] = useState<'IDLE' | 'FETCHING' | 'SUCCESS' | 'FAILED' | 'EMPTY'>('IDLE');
  const [fetchErrorMsg, setFetchErrorMsg] = useState<string>('');

  // 2. 来源与分类筛选
  const [searchTerm, setSearchTerm] = useState('');
  const [conflictFilter, setConflictFilter] = useState<'ALL' | 'UNMAPPED' | 'ALREADY_CONFIGURED' | 'HAS_DRAFT' | 'SOURCE_CHANGED' | 'INCOMPATIBLE'>('ALL');

  // 3. 选中的候选 keys 及自定义 Manticore 字段名 / 自定义前台显示名
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [customManticoreFields, setCustomManticoreFields] = useState<Record<string, string>>({});
  const [customDisplayTitles, setCustomDisplayTitles] = useState<Record<string, string>>({});
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);

  // 当弹窗打开时重置状态
  useEffect(() => {
    if (!isOpen) {
      setFetchStatus('IDLE');
      setFetchErrorMsg('');
      setSearchTerm('');
      setConflictFilter('ALL');
      setSelectedKeys([]);
      setCustomManticoreFields({});
      setCustomDisplayTitles({});
      setShowUnsavedConfirm(false);
    }
  }, [isOpen]);

  // 4. 构建候选比对列表 (从 availablePlmFields 与 existingFieldMappings 关联推断)
  const candidates: BatchImportCandidate[] = useMemo(() => {
    if (fetchStatus !== 'SUCCESS') return [];

    return availablePlmFields.map(meta => {
      // 查找当前根类型下已存在的映射
      const existing = existingFieldMappings.find(
        f =>
          f.rootTypeId === currentRootType.id &&
          f.sourceFieldKey === meta.sourceFieldKey
      );

      const { resolvedName, isMissing } = resolveSourceDisplayName(
        meta.sourceDisplayName,
        meta.sourceFieldName,
        meta.sourceFieldKey
      );

      let conflictType: BatchImportConflictType = 'UNMAPPED';
      let conflictReason: string | undefined = undefined;
      let resolutionHint: string | undefined = undefined;
      let isSelectable = true;

      // 规则：显示名缺失不误判为 SOURCE_CHANGED 或错误
      if (meta.sourceDataType === 'LONG_TEXT' && meta.sourceFieldKey.includes('cad_binary')) {
        conflictType = 'TYPE_INCOMPATIBLE';
        conflictReason = '二进制模型流不支持直接全文或标量索引';
        resolutionHint = '需在 PLM 侧提供结构化元数据提取插件';
        isSelectable = false;
      } else if (meta.sourceFieldKey.includes('legacy_untyped')) {
        conflictType = 'METADATA_MISSING';
        conflictReason = 'PLM 属性缺失明确业务数据类型定义';
        resolutionHint = '需在 PLM 属性目录中补充数据类型';
        isSelectable = false;
      } else if (existing) {
        if (existing.configStatus === 'CONFIGURED') {
          conflictType = 'ALREADY_CONFIGURED';
          conflictReason = '已存在生效配置';
          resolutionHint = '无需重复导入，可在字段列表中直接修改';
          isSelectable = false;
        } else {
          conflictType = 'HAS_DRAFT';
          conflictReason = '已存在未生效的草稿项';
          resolutionHint = '可前往字段列表查看或编辑现有草稿';
          isSelectable = false;
        }
      }

      // 默认推断 Manticore 字段及类型
      const suggestedManticore = meta.sourceFieldName
        .replace(/([A-Z])/g, '_$1')
        .toLowerCase()
        .replace(/^_/, '');

      let suggestedType: ManticoreFieldType = 'STRING';
      let suggestedDisplayType: FieldMappingItem['displayType'] = 'CONDITION_QUERY';
      let suggestedQueryCap: FieldMappingItem['queryCapability'] = 'QUERY_CONDITION';

      if (meta.sourceDataType === 'NUMERIC' || meta.sourceDataType === 'NUMERIC_WITH_UNIT') {
        suggestedType = 'FLOAT';
      } else if (meta.sourceDataType === 'LONG_TEXT') {
        suggestedType = 'TEXT';
        suggestedDisplayType = 'FULLTEXT';
        suggestedQueryCap = 'FULLTEXT_SEARCH';
      } else if (meta.sourceDataType === 'CATEGORY_TREE') {
        suggestedType = 'STRING';
        suggestedDisplayType = 'CATEGORY_PATH';
      } else if (meta.sourceDataType === 'ENUM') {
        suggestedType = 'STRING';
        suggestedDisplayType = 'ENUM_BADGE';
      }

      return {
        sourceFieldMeta: {
          ...meta,
          sourceDisplayName: meta.sourceDisplayName // 保持原始元数据
        },
        resolvedDisplayName: resolvedName,
        isDisplayNameMissing: isMissing,
        suggestedManticoreField: suggestedManticore,
        suggestedManticoreType: suggestedType,
        suggestedDisplayTitle: resolvedName,
        suggestedDisplayType,
        suggestedQueryCapability: suggestedQueryCap,
        conflictType,
        conflictReason,
        resolutionHint,
        isSelectable
      };
    });
  }, [fetchStatus, availablePlmFields, existingFieldMappings, currentRootType.id]);

  // 模拟从 PLM 读取元数据
  const handleFetchPlmMetadata = (simulateFail = false, simulateEmpty = false) => {
    setFetchStatus('FETCHING');
    setFetchErrorMsg('');
    setTimeout(() => {
      if (simulateFail) {
        setFetchStatus('FAILED');
        setFetchErrorMsg('连接 PLM 元数据服务超时 (HTTP 504 Gateway Timeout)，请检查企业网络或重试');
      } else if (simulateEmpty) {
        setFetchStatus('EMPTY');
      } else {
        setFetchStatus('SUCCESS');
        // 默认自动勾选所有可直接导入的未映射项
        const unmappedKeys = availablePlmFields
          .filter(meta => {
            const isBinary = meta.sourceDataType === 'LONG_TEXT' && meta.sourceFieldKey.includes('cad_binary');
            const isUntyped = meta.sourceFieldKey.includes('legacy_untyped');
            const existing = existingFieldMappings.some(
              f =>
                f.rootTypeId === currentRootType.id &&
                f.sourceFieldKey === meta.sourceFieldKey
            );
            return !isBinary && !isUntyped && !existing;
          })
          .map(m => m.sourceFieldKey);
        setSelectedKeys(unmappedKeys);
      }
    }, 500);
  };

  // 过滤后的候选列表
  const filteredCandidates = useMemo(() => {
    return candidates.filter(c => {
      if (conflictFilter === 'UNMAPPED' && c.conflictType !== 'UNMAPPED') return false;
      if (conflictFilter === 'ALREADY_CONFIGURED' && c.conflictType !== 'ALREADY_CONFIGURED') return false;
      if (conflictFilter === 'HAS_DRAFT' && c.conflictType !== 'HAS_DRAFT') return false;
      if (conflictFilter === 'SOURCE_CHANGED' && c.conflictType !== 'SOURCE_CHANGED') return false;
      if (
        conflictFilter === 'INCOMPATIBLE' &&
        c.conflictType !== 'TYPE_INCOMPATIBLE' &&
        c.conflictType !== 'METADATA_MISSING'
      )
        return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchKey = c.sourceFieldMeta.sourceFieldKey.toLowerCase().includes(term);
        const matchName = c.sourceFieldMeta.sourceFieldName.toLowerCase().includes(term);
        const matchTitle = (c.sourceFieldMeta.sourceDisplayName || '').toLowerCase().includes(term);
        if (!matchKey && !matchName && !matchTitle) return false;
      }
      return true;
    });
  }, [candidates, conflictFilter, searchTerm]);

  const selectedCount = selectedKeys.length;
  const unselectableCandidates = candidates.filter(c => !c.isSelectable);

  const toggleSelectAll = () => {
    const selectableInView = filteredCandidates.filter(c => c.isSelectable).map(c => c.sourceFieldMeta.sourceFieldKey);
    const allSelected = selectableInView.every(k => selectedKeys.includes(k));
    if (allSelected) {
      setSelectedKeys(prev => prev.filter(k => !selectableInView.includes(k)));
    } else {
      setSelectedKeys(prev => Array.from(new Set([...prev, ...selectableInView])));
    }
  };

  const handleToggleRow = (key: string, selectable: boolean) => {
    if (!selectable) return;
    if (selectedKeys.includes(key)) {
      setSelectedKeys(selectedKeys.filter(k => k !== key));
    } else {
      setSelectedKeys([...selectedKeys, key]);
    }
  };

  const isDirty = selectedKeys.length > 0 || Object.keys(customManticoreFields).length > 0;

  const handleRequestClose = () => {
    if (isDirty) {
      setShowUnsavedConfirm(true);
    } else {
      onClose();
    }
  };

  // 确认批量保存为草稿 (以 rootTypeId + sourceFieldKey 去重)
  const handleConfirmBatch = () => {
    const selectedCandidateList = candidates.filter(
      c => selectedKeys.includes(c.sourceFieldMeta.sourceFieldKey) && c.isSelectable
    );

    const uniqueMap = new Map<string, BatchImportCandidate>();
    selectedCandidateList.forEach(c => {
      const stableKey = `${currentRootType.id}::${c.sourceFieldMeta.sourceFieldKey}`;
      if (!uniqueMap.has(stableKey)) {
        uniqueMap.set(stableKey, c);
      }
    });

    const newDrafts: FieldMappingItem[] = Array.from(uniqueMap.values()).map((c, idx) => {
      const customName = customManticoreFields[c.sourceFieldMeta.sourceFieldKey] || c.suggestedManticoreField;
      const customTitle = customDisplayTitles[c.sourceFieldMeta.sourceFieldKey] || c.suggestedDisplayTitle;

      const { resolvedName, isMissing } = resolveSourceDisplayName(
        c.sourceFieldMeta.sourceDisplayName,
        c.sourceFieldMeta.sourceFieldName,
        c.sourceFieldMeta.sourceFieldKey
      );

      return {
        id: `MAP-BATCH-${Date.now()}-${idx}`,
        rootTypeId: currentRootType.id,
        sourceSystemId: currentRootType.sourceSystemId,
        sourceFieldKey: c.sourceFieldMeta.sourceFieldKey,
        sourceFieldName: c.sourceFieldMeta.sourceFieldName,
        sourceDisplayName: resolvedName,
        isDisplayNameMissing: isMissing,
        sourceDataType: c.sourceFieldMeta.sourceDataType,
        sourceDataTypeLabel: c.sourceFieldMeta.sourceDataTypeLabel,
        unitFamily: c.sourceFieldMeta.unitFamily,
        defaultUnit: c.sourceFieldMeta.defaultUnit,
        manticoreField: customName,
        manticoreType: c.suggestedManticoreType,
        displayTitle: customTitle.trim() || resolvedName,
        displayType: c.suggestedDisplayType,
        queryCapability: c.suggestedQueryCapability,
        isQueryCondition: c.suggestedQueryCapability === 'QUERY_CONDITION' || c.suggestedQueryCapability === 'BOTH',
        isSortable: c.suggestedManticoreType !== 'TEXT',
        isDisplayInResult: c.suggestedDisplayType !== 'FULLTEXT',
        isFulltextSearch: c.suggestedManticoreType === 'TEXT',
        isUniqueKey: false,
        defaultColumnWidth: 150,
        defaultDisplayOrder: 20 + idx,
        configStatus: 'DRAFT',
        hasDraftModification: false,
        isDataImpactingChange: true,
        isInFormalQueryBase: false,
        updatedAt: '刚刚 (PLM批量导入)',
        updatedBy: '当前用户'
      };
    });

    onSaveBatchDrafts(newDrafts);
    onClose();
  };

  const renderConflictBadge = (c: BatchImportCandidate) => {
    switch (c.conflictType) {
      case 'UNMAPPED':
        return (
          <span className="h-5 inline-flex items-center px-1.5 py-0.5 rounded-[4px] text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-2.5 h-2.5 mr-1 text-emerald-600 shrink-0" />
            未映射 (可导入)
          </span>
        );
      case 'SOURCE_CHANGED':
        return (
          <span className="h-5 inline-flex items-center px-1.5 py-0.5 rounded-[4px] text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200" title={c.conflictReason}>
            <Sparkles className="w-2.5 h-2.5 mr-1 text-purple-600 shrink-0" />
            PLM来源变更
          </span>
        );
      case 'ALREADY_CONFIGURED':
        return (
          <span className="h-5 inline-flex items-center px-1.5 py-0.5 rounded-[4px] text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
            已生效映射
          </span>
        );
      case 'HAS_DRAFT':
        return (
          <span className="h-5 inline-flex items-center px-1.5 py-0.5 rounded-[4px] text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-2.5 h-2.5 mr-1 text-amber-600 shrink-0" />
            已有草稿
          </span>
        );
      case 'TYPE_INCOMPATIBLE':
      case 'METADATA_MISSING':
      default:
        return (
          <span className="h-5 inline-flex items-center px-1.5 py-0.5 rounded-[4px] text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-200" title={c.conflictReason}>
            <AlertTriangle className="w-2.5 h-2.5 mr-1 text-rose-600 shrink-0" />
            阻断/不兼容
          </span>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-[8px] shadow-xl border border-slate-200 max-w-6xl w-full flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150 relative">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="space-y-0.5">
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center">
                <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-600" />
                从 PLM 批量发现并导入字段 (生成草稿)
              </h3>
              <span className="px-2 py-0.5 text-[11px] font-mono font-medium rounded-[4px] bg-slate-100 text-slate-800 border border-slate-200">
                根类型: {formatRootTypeDisplayName(currentRootType.name, currentRootType.code)}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              主动读取来源系统元数据定义，自动完成类型推断与来源显示名兜底。勾选后生成草稿，需生效配置后方能进入正式底座。
            </p>
          </div>
          <button
            type="button"
            onClick={handleRequestClose}
            className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-[4px] hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* PLM 元数据读取控制条 */}
        <div className="px-5 py-3 bg-slate-100/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-3 text-xs">
            <div className="flex items-center space-x-1.5 text-slate-700">
              <Server className="w-3.5 h-3.5 text-blue-600" />
              <span className="font-semibold">来源系统:</span>
              <span className="font-mono bg-white px-2 py-0.5 rounded-[4px] border border-slate-200">
                {currentRootType.sourceSystemName}
              </span>
            </div>
            <div className="flex items-center space-x-1.5 text-slate-700">
              <Layers className="w-3.5 h-3.5 text-purple-600" />
              <span className="font-semibold">根类型对象:</span>
              <span className="font-mono bg-white px-2 py-0.5 rounded-[4px] border border-slate-200 font-bold">
                {formatRootTypeDisplayName(currentRootType.name, currentRootType.code)}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {fetchStatus === 'SUCCESS' ? (
              <button
                type="button"
                onClick={() => handleFetchPlmMetadata(false)}
                className="h-8 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-[6px] text-xs font-medium flex items-center space-x-1.5 cursor-pointer transition-colors shadow-2xs"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                <span>重新读取元数据</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleFetchPlmMetadata(false)}
                disabled={fetchStatus === 'FETCHING'}
                className={`h-8 px-3.5 rounded-[6px] text-xs font-medium flex items-center space-x-1.5 cursor-pointer transition-colors ${
                  fetchStatus === 'FETCHING'
                    ? 'bg-blue-400 text-white cursor-wait'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-2xs'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${fetchStatus === 'FETCHING' ? 'animate-spin' : ''}`} />
                <span>{fetchStatus === 'FETCHING' ? '正在连接 PLM 读取中...' : '读取 PLM 元数据'}</span>
              </button>
            )}

            {fetchStatus !== 'FETCHING' && (
              <div className="flex items-center space-x-1 pl-2 border-l border-slate-300">
                <button
                  type="button"
                  onClick={() => handleFetchPlmMetadata(true)}
                  className="h-6 px-2 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-[4px] text-[11px] font-mono cursor-pointer"
                  title="模拟连接失败"
                >
                  模拟失败
                </button>
                <button
                  type="button"
                  onClick={() => handleFetchPlmMetadata(false, true)}
                  className="h-6 px-2 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-[4px] text-[11px] font-mono cursor-pointer"
                  title="模拟空结果"
                >
                  模拟空结果
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          {fetchStatus === 'IDLE' && (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-500 space-y-3">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <Database className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">尚未读取 PLM 来源元数据</h4>
              <p className="text-xs text-slate-500 max-w-md leading-relaxed">
                点击上方「读取 PLM 元数据」按钮，系统将自动连接当前所选的 PLM 实例并解析出根类型 <strong>{currentRootType.name}</strong> 的全部属性定义。
              </p>
              <button
                type="button"
                onClick={() => handleFetchPlmMetadata(false)}
                className="mt-2 h-8 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-[6px] text-xs font-medium shadow-2xs flex items-center space-x-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>立即读取 PLM 元数据</span>
              </button>
            </div>
          )}

          {fetchStatus === 'FETCHING' && (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-500 space-y-3">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">正在连接 PLM 解析属性字典...</h4>
              <p className="text-xs text-slate-400 font-mono">
                GET /api/plm/v21/metadata?rootType={currentRootType.code}
              </p>
            </div>
          )}

          {fetchStatus === 'FAILED' && (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">PLM 元数据读取失败</h4>
              <p className="text-xs text-rose-600 max-w-lg bg-rose-50 p-2.5 rounded-[6px] border border-rose-200">
                {fetchErrorMsg}
              </p>
              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleFetchPlmMetadata(false)}
                  className="h-8 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-[6px] text-xs font-medium shadow-2xs flex items-center space-x-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>重试读取</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="h-8 px-3.5 border border-slate-300 rounded-[6px] text-xs text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  取消
                </button>
              </div>
            </div>
          )}

          {fetchStatus === 'EMPTY' && (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-500 space-y-3">
              <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">未在 PLM 中发现任何已注册属性</h4>
              <p className="text-xs text-slate-400 max-w-md">
                当前根类型在 PLM 中可能未配置任何属性。
              </p>
              <button
                type="button"
                onClick={() => handleFetchPlmMetadata(false)}
                className="h-8 px-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-[6px] text-xs font-medium cursor-pointer"
              >
                重新读取
              </button>
            </div>
          )}

          {fetchStatus === 'SUCCESS' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* 筛选条 (统一 32px 控件) */}
              <div className="px-5 py-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-[6px] text-xs font-medium h-8">
                    <button
                      type="button"
                      onClick={() => setConflictFilter('ALL')}
                      className={`h-7 px-2.5 rounded-[4px] transition-colors cursor-pointer flex items-center ${
                        conflictFilter === 'ALL'
                          ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      全部 ({candidates.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setConflictFilter('UNMAPPED')}
                      className={`h-7 px-2.5 rounded-[4px] transition-colors cursor-pointer flex items-center ${
                        conflictFilter === 'UNMAPPED'
                          ? 'bg-white text-emerald-800 shadow-2xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      未映射 ({candidates.filter(c => c.conflictType === 'UNMAPPED').length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setConflictFilter('ALREADY_CONFIGURED')}
                      className={`h-7 px-2.5 rounded-[4px] transition-colors cursor-pointer flex items-center ${
                        conflictFilter === 'ALREADY_CONFIGURED'
                          ? 'bg-white text-blue-800 shadow-2xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      已配置 ({candidates.filter(c => c.conflictType === 'ALREADY_CONFIGURED').length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setConflictFilter('HAS_DRAFT')}
                      className={`h-7 px-2.5 rounded-[4px] transition-colors cursor-pointer flex items-center ${
                        conflictFilter === 'HAS_DRAFT'
                          ? 'bg-white text-amber-800 shadow-2xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      已有草稿 ({candidates.filter(c => c.conflictType === 'HAS_DRAFT').length})
                    </button>
                  </div>

                  <div className="relative min-w-[200px]">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="搜索字段名、显示名..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="w-full h-8 pl-7 pr-3 bg-slate-50 border border-slate-300 rounded-[6px] text-xs focus:bg-white focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="text-xs text-slate-500 flex items-center space-x-3">
                  <div>
                    已选择: <span className="font-bold text-blue-700 font-mono">{selectedCount}</span> 项
                  </div>
                  <div className="text-slate-300">|</div>
                  <div>
                    不可导入: <span className="font-bold text-slate-600 font-mono">{unselectableCandidates.length}</span> 项
                  </div>
                </div>
              </div>

              {/* 候选表格 */}
              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">
                        <button
                          type="button"
                          onClick={toggleSelectAll}
                          className="cursor-pointer text-slate-500 hover:text-blue-600 p-0.5"
                          title="全选/全不选"
                        >
                          {filteredCandidates.filter(c => c.isSelectable).length > 0 &&
                          filteredCandidates
                            .filter(c => c.isSelectable)
                            .every(c => selectedKeys.includes(c.sourceFieldMeta.sourceFieldKey)) ? (
                            <CheckSquare className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                      </th>
                      <th className="py-2.5 px-3 min-w-[150px]">PLM 源字段 / 显示名</th>
                      <th className="py-2.5 px-3 min-w-[110px]">PLM 业务类型</th>
                      <th className="py-2.5 px-3 min-w-[140px]">前台显示名称</th>
                      <th className="py-2.5 px-3 min-w-[140px]">推断 Manticore 字段</th>
                      <th className="py-2.5 px-3 min-w-[90px]">底层类型</th>
                      <th className="py-2.5 px-3 min-w-[120px]">比对状态</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredCandidates.length > 0 ? (
                      filteredCandidates.map(c => {
                        const isChecked = selectedKeys.includes(c.sourceFieldMeta.sourceFieldKey);
                        const customManticore = customManticoreFields[c.sourceFieldMeta.sourceFieldKey] || c.suggestedManticoreField;
                        const customTitle = customDisplayTitles[c.sourceFieldMeta.sourceFieldKey] ?? c.suggestedDisplayTitle;

                        const { resolvedName, isMissing } = resolveSourceDisplayName(
                          c.sourceFieldMeta.sourceDisplayName,
                          c.sourceFieldMeta.sourceFieldName,
                          c.sourceFieldMeta.sourceFieldKey
                        );

                        return (
                          <tr
                            key={c.sourceFieldMeta.sourceFieldKey}
                            onClick={() => handleToggleRow(c.sourceFieldMeta.sourceFieldKey, c.isSelectable)}
                            className={`transition-colors ${
                              !c.isSelectable
                                ? 'bg-slate-50/50 opacity-70 cursor-not-allowed'
                                : isChecked
                                ? 'bg-blue-50/40 hover:bg-blue-50/60 cursor-pointer'
                                : 'hover:bg-slate-50 cursor-pointer'
                            }`}
                          >
                            <td className="py-2.5 px-3 text-center" onClick={e => e.stopPropagation()}>
                              {c.isSelectable ? (
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleToggleRow(c.sourceFieldMeta.sourceFieldKey, c.isSelectable)}
                                  className="rounded text-blue-600 cursor-pointer"
                                />
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>

                            <td className="py-2.5 px-3">
                              <div className="font-mono font-semibold text-slate-900">
                                {c.sourceFieldMeta.sourceFieldName}
                              </div>
                              <div className="text-[11px] text-slate-500 flex items-center mt-0.5">
                                <span>{resolvedName}</span>
                                {isMissing && (
                                  <span className="ml-1 text-[9px] text-amber-800 bg-amber-100 px-1 rounded font-normal" title="PLM 未返回显示名，已按字段名兜底">
                                    显示名兜底
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="py-2.5 px-3 text-slate-600">
                              <span>{c.sourceFieldMeta.sourceDataTypeLabel}</span>
                              {c.sourceFieldMeta.defaultUnit && (
                                <span className="text-[10px] font-mono text-slate-400 ml-1">
                                  ({c.sourceFieldMeta.defaultUnit})
                                </span>
                              )}
                            </td>

                            <td className="py-2.5 px-3" onClick={e => e.stopPropagation()}>
                              {c.isSelectable ? (
                                <input
                                  type="text"
                                  value={customTitle}
                                  onChange={e => {
                                    setCustomDisplayTitles({
                                      ...customDisplayTitles,
                                      [c.sourceFieldMeta.sourceFieldKey]: e.target.value
                                    });
                                  }}
                                  className="h-7 px-2 bg-white border border-slate-300 rounded-[4px] text-slate-800 text-xs w-full focus:outline-hidden focus:border-blue-500"
                                />
                              ) : (
                                <span className="text-slate-700">{customTitle}</span>
                              )}
                            </td>

                            <td className="py-2.5 px-3" onClick={e => e.stopPropagation()}>
                              {c.isSelectable ? (
                                <input
                                  type="text"
                                  value={customManticore}
                                  onChange={e => {
                                    setCustomManticoreFields({
                                      ...customManticoreFields,
                                      [c.sourceFieldMeta.sourceFieldKey]: e.target.value.toLowerCase()
                                    });
                                  }}
                                  className="h-7 px-2 bg-white border border-slate-300 rounded-[4px] font-mono text-blue-700 text-xs w-full focus:outline-hidden focus:border-blue-500"
                                />
                              ) : (
                                <span className="font-mono text-slate-400">{c.suggestedManticoreField}</span>
                              )}
                            </td>

                            <td className="py-2.5 px-3 font-mono text-slate-600">
                              {c.suggestedManticoreType}
                            </td>

                            <td className="py-2.5 px-3">
                              <div className="space-y-0.5">
                                {renderConflictBadge(c)}
                                {c.resolutionHint && (
                                  <div className="text-[10px] text-slate-400 leading-tight">
                                    {c.resolutionHint}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          未找到匹配的候选元数据
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* 底部栏 (统一 32px 按钮高度) */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 flex items-center space-x-2">
            <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>
              批量导入将直接为根类型生成草稿项。生效配置后方能进入正式底座。
            </span>
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              onClick={handleRequestClose}
              className="h-8 px-4 border border-slate-300 rounded-[6px] text-xs font-medium text-slate-700 hover:bg-white bg-white cursor-pointer transition-colors shadow-2xs"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleConfirmBatch}
              disabled={selectedCount === 0 || !hasPermission || fetchStatus !== 'SUCCESS'}
              className={`h-8 px-4 rounded-[6px] text-xs font-medium shadow-2xs flex items-center space-x-1.5 transition-colors cursor-pointer ${
                selectedCount > 0 && hasPermission && fetchStatus === 'SUCCESS'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Save className="w-3.5 h-3.5" />
              <span>保存选中项为草稿 ({selectedCount})</span>
            </button>
          </div>
        </div>

        {/* 未保存退出确认 */}
        {showUnsavedConfirm && (
          <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-[8px] shadow-xl border border-slate-200 max-w-sm w-full p-4 space-y-3 animate-in zoom-in-95 duration-100">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-amber-100 text-amber-700 rounded-full shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">未保存选择确认</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    您已勾选了 {selectedCount} 项候选字段，尚未保存为草稿。确定要放弃并退出吗？
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUnsavedConfirm(false)}
                  className="h-8 px-3 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-[6px] text-xs font-medium cursor-pointer"
                >
                  继续选择
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowUnsavedConfirm(false);
                    onClose();
                  }}
                  className="h-8 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-[6px] text-xs font-medium cursor-pointer"
                >
                  放弃并退出
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
