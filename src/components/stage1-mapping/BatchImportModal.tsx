import React, { useState } from 'react';
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
  Info
} from 'lucide-react';
import {
  SourceFieldMeta,
  MappingObjectType,
  MappingSoftType,
  FieldMappingItem,
  BatchImportCandidate,
  BatchImportConflictType,
  ManticoreFieldType
} from '../../stage1MappingTypes';

interface BatchImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRootType: MappingObjectType;
  currentSoftType: MappingSoftType;
  availablePlmFields: SourceFieldMeta[];
  existingFieldMappings: FieldMappingItem[];
  onSaveBatchDrafts: (newDrafts: FieldMappingItem[]) => void;
  hasPermission?: boolean;
}

export const BatchImportModal: React.FC<BatchImportModalProps> = ({
  isOpen,
  onClose,
  currentRootType,
  currentSoftType,
  availablePlmFields,
  existingFieldMappings,
  onSaveBatchDrafts,
  hasPermission = true
}) => {
  if (!isOpen) return null;

  // 1. 来源与分类筛选
  const [searchTerm, setSearchTerm] = useState('');
  const [conflictFilter, setConflictFilter] = useState<'ALL' | 'UNMAPPED' | 'ALREADY_ACTIVE' | 'HAS_DRAFT' | 'INCOMPATIBLE'>('UNMAPPED');

  // 构建候选比对列表
  const existingSourceKeys = new Set(
    existingFieldMappings
      .filter(f => f.rootTypeId === currentRootType.id && f.softTypeId === currentSoftType.id)
      .map(f => f.sourceFieldKey)
  );

  const candidates: BatchImportCandidate[] = availablePlmFields.map(meta => {
    // 检查冲突类型
    const existing = existingFieldMappings.find(
      f =>
        f.rootTypeId === currentRootType.id &&
        f.softTypeId === currentSoftType.id &&
        f.sourceFieldKey === meta.sourceFieldKey
    );

    let conflictType: BatchImportConflictType = 'UNMAPPED';
    let conflictReason: string | undefined = undefined;
    let resolutionHint: string | undefined = undefined;
    let isSelectable = true;

    if (meta.sourceDataType === 'LONG_TEXT' && meta.sourceFieldKey.includes('cad_binary')) {
      conflictType = 'TYPE_INCOMPATIBLE';
      conflictReason = '二进制流不支持直接全文或标量索引';
      resolutionHint = '请在 PLM 侧提供元数据结构体或解析插件';
      isSelectable = false;
    } else if (meta.sourceFieldKey.includes('legacy_untyped')) {
      conflictType = 'METADATA_MISSING';
      conflictReason = 'PLM 属性缺失明确业务数据类型';
      resolutionHint = '需在 PLM 属性目录中补充数据类型定义';
      isSelectable = false;
    } else if (existing) {
      if (existing.configStatus === 'ACTIVE') {
        conflictType = 'ALREADY_ACTIVE';
        conflictReason = `已存在生效映射 (版本 ${existing.lastConfigVersion})`;
        resolutionHint = '无需重复导入，可在字段列表中直接修改';
        isSelectable = false;
      } else {
        conflictType = 'HAS_DRAFT';
        conflictReason = '已存在未发布草稿配置';
        resolutionHint = '可前往字段列表查看或编辑草稿';
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
      sourceFieldMeta: meta,
      suggestedManticoreField: suggestedManticore,
      suggestedManticoreType: suggestedType,
      suggestedDisplayTitle: meta.sourceDisplayName,
      suggestedDisplayType,
      suggestedQueryCapability: suggestedQueryCap,
      conflictType,
      conflictReason,
      resolutionHint,
      isSelectable
    };
  });

  // 选中的候选 keys
  const [selectedKeys, setSelectedKeys] = useState<string[]>(() => {
    // 默认选中所有可直接导入的未映射字段
    return candidates.filter(c => c.conflictType === 'UNMAPPED').map(c => c.sourceFieldMeta.sourceFieldKey);
  });

  // 允许用户在表格行直接微调 suggestedManticoreField
  const [customManticoreFields, setCustomManticoreFields] = useState<Record<string, string>>({});

  const filteredCandidates = candidates.filter(c => {
    if (conflictFilter === 'UNMAPPED' && c.conflictType !== 'UNMAPPED') return false;
    if (conflictFilter === 'ALREADY_ACTIVE' && c.conflictType !== 'ALREADY_ACTIVE') return false;
    if (conflictFilter === 'HAS_DRAFT' && c.conflictType !== 'HAS_DRAFT') return false;
    if (conflictFilter === 'INCOMPATIBLE' && c.conflictType !== 'TYPE_INCOMPATIBLE' && c.conflictType !== 'METADATA_MISSING') return false;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchKey = c.sourceFieldMeta.sourceFieldKey.toLowerCase().includes(term);
      const matchName = c.sourceFieldMeta.sourceFieldName.toLowerCase().includes(term);
      const matchTitle = c.sourceFieldMeta.sourceDisplayName.toLowerCase().includes(term);
      if (!matchKey && !matchName && !matchTitle) return false;
    }
    return true;
  });

  const toggleSelectAll = () => {
    const selectableCurrent = filteredCandidates.filter(c => c.isSelectable).map(c => c.sourceFieldMeta.sourceFieldKey);
    const allSelected = selectableCurrent.every(k => selectedKeys.includes(k));
    if (allSelected) {
      setSelectedKeys(prev => prev.filter(k => !selectableCurrent.includes(k)));
    } else {
      setSelectedKeys(prev => Array.from(new Set([...prev, ...selectableCurrent])));
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

  // 批量保存为草稿
  const handleConfirmBatch = () => {
    const selectedCandidates = candidates.filter(
      c => selectedKeys.includes(c.sourceFieldMeta.sourceFieldKey) && c.isSelectable
    );

    const newDrafts: FieldMappingItem[] = selectedCandidates.map((c, idx) => {
      const customName = customManticoreFields[c.sourceFieldMeta.sourceFieldKey] || c.suggestedManticoreField;
      return {
        id: `MAP-BATCH-${Date.now()}-${idx}`,
        rootTypeId: currentRootType.id,
        softTypeId: currentSoftType.id,
        sourceFieldKey: c.sourceFieldMeta.sourceFieldKey,
        sourceFieldName: c.sourceFieldMeta.sourceFieldName,
        sourceDisplayName: c.sourceFieldMeta.sourceDisplayName,
        sourceDataType: c.sourceFieldMeta.sourceDataType,
        sourceDataTypeLabel: c.sourceFieldMeta.sourceDataTypeLabel,
        unitFamily: c.sourceFieldMeta.unitFamily,
        defaultUnit: c.sourceFieldMeta.defaultUnit,
        manticoreField: customName,
        manticoreType: c.suggestedManticoreType,
        displayTitle: c.suggestedDisplayTitle,
        displayType: c.suggestedDisplayType,
        queryCapability: c.suggestedQueryCapability,
        isSortable: c.suggestedManticoreType !== 'TEXT',
        isDisplayInResult: c.suggestedDisplayType !== 'FULLTEXT',
        configStatus: 'DRAFT',
        hasDraftModification: false,
        dataStatus: 'NO_SYNC_NEEDED', // 草稿不参与同步
        isDataImpactingChange: true,
        lastConfigVersion: `${currentSoftType.activeConfigVersion || 'v1.0.0'}-draft`,
        updatedAt: '2026-09-02 10:00:00',
        updatedBy: '当前用户 (PLM批量发现)'
      };
    });

    onSaveBatchDrafts(newDrafts);
    onClose();
  };

  const renderConflictBadge = (c: BatchImportCandidate) => {
    switch (c.conflictType) {
      case 'UNMAPPED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
            未映射 (可直接导入)
          </span>
        );
      case 'ALREADY_ACTIVE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
            已生效映射
          </span>
        );
      case 'HAS_DRAFT':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 mr-1 text-amber-600" />
            已有草稿
          </span>
        );
      case 'TYPE_INCOMPATIBLE':
      case 'METADATA_MISSING':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle className="w-3 h-3 mr-1 text-rose-600" />
            {c.conflictReason}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-5xl w-full flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="space-y-0.5">
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center">
                <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-600" />
                从 PLM 批量选择属性
              </h3>
              <span className="px-2 py-0.5 text-[11px] font-mono font-semibold rounded bg-blue-100 text-blue-800">
                {currentRootType.name} / {currentSoftType.name}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              通过来源系统元数据适配器读取 PLM 属性目录，自动比对生效/草稿映射，批量生成推荐配置草稿。
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 筛选与搜索工具条 */}
        <div className="px-6 py-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">状态筛选:</span>
            <button
              onClick={() => setConflictFilter('UNMAPPED')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                conflictFilter === 'UNMAPPED'
                  ? 'bg-emerald-100 text-emerald-800 font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              未映射 ({candidates.filter(c => c.conflictType === 'UNMAPPED').length})
            </button>
            <button
              onClick={() => setConflictFilter('ALL')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                conflictFilter === 'ALL'
                  ? 'bg-slate-800 text-white font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              全部属性 ({candidates.length})
            </button>
            <button
              onClick={() => setConflictFilter('ALREADY_ACTIVE')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                conflictFilter === 'ALREADY_ACTIVE'
                  ? 'bg-blue-100 text-blue-800 font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              已生效 ({candidates.filter(c => c.conflictType === 'ALREADY_ACTIVE').length})
            </button>
            <button
              onClick={() => setConflictFilter('HAS_DRAFT')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                conflictFilter === 'HAS_DRAFT'
                  ? 'bg-amber-100 text-amber-800 font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              已有草稿 ({candidates.filter(c => c.conflictType === 'HAS_DRAFT').length})
            </button>
            <button
              onClick={() => setConflictFilter('INCOMPATIBLE')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                conflictFilter === 'INCOMPATIBLE'
                  ? 'bg-rose-100 text-rose-800 font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              阻断/不兼容 (
              {
                candidates.filter(
                  c => c.conflictType === 'TYPE_INCOMPATIBLE' || c.conflictType === 'METADATA_MISSING'
                ).length
              }
              )
            </button>
          </div>

          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="搜索源字段或名称..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-7 pr-3 py-1 bg-slate-50 border border-slate-300 rounded text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:border-blue-500"
            />
          </div>
        </div>

        {/* 表格区 */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold sticky top-0 z-10">
              <tr>
                <th className="py-2.5 px-3.5 w-10 text-center">
                  <button
                    onClick={toggleSelectAll}
                    className="cursor-pointer text-slate-600 hover:text-slate-900"
                    title="全选当前可导入项"
                  >
                    <CheckSquare className="w-4 h-4" />
                  </button>
                </th>
                <th className="py-2.5 px-3 min-w-[150px]">PLM 来源字段</th>
                <th className="py-2.5 px-3 min-w-[120px]">业务类型</th>
                <th className="py-2.5 px-3 min-w-[150px]">建议 Manticore 字段</th>
                <th className="py-2.5 px-3 min-w-[100px]">建议检索类型</th>
                <th className="py-2.5 px-3 min-w-[140px]">比对与冲突状态</th>
                <th className="py-2.5 px-3 min-w-[180px]">处理指引</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredCandidates.length > 0 ? (
                filteredCandidates.map(c => {
                  const isSelected = selectedKeys.includes(c.sourceFieldMeta.sourceFieldKey);
                  return (
                    <tr
                      key={c.sourceFieldMeta.sourceFieldKey}
                      className={`hover:bg-slate-50 transition-colors ${
                        !c.isSelectable ? 'bg-slate-50/50 opacity-75' : ''
                      }`}
                    >
                      {/* 勾选框 */}
                      <td className="py-2.5 px-3.5 text-center">
                        <button
                          type="button"
                          disabled={!c.isSelectable}
                          onClick={() =>
                            handleToggleRow(c.sourceFieldMeta.sourceFieldKey, c.isSelectable)
                          }
                          className={`cursor-pointer ${
                            !c.isSelectable ? 'cursor-not-allowed opacity-30 text-slate-300' : ''
                          }`}
                        >
                          {isSelected && c.isSelectable ? (
                            <CheckSquare className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300 hover:text-slate-400" />
                          )}
                        </button>
                      </td>

                      {/* PLM 来源字段 */}
                      <td className="py-2.5 px-3">
                        <div className="font-mono font-bold text-slate-900">
                          {c.sourceFieldMeta.sourceFieldName}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {c.sourceFieldMeta.sourceFieldKey} ({c.sourceFieldMeta.sourceDisplayName})
                        </div>
                      </td>

                      {/* 业务类型 */}
                      <td className="py-2.5 px-3">
                        <span className="font-medium text-slate-800">
                          {c.sourceFieldMeta.sourceDataTypeLabel}
                        </span>
                        {c.sourceFieldMeta.defaultUnit && (
                          <span className="text-slate-400 text-[10px] ml-1">
                            [{c.sourceFieldMeta.defaultUnit}]
                          </span>
                        )}
                      </td>

                      {/* 建议 Manticore 字段 (可原地微调) */}
                      <td className="py-2.5 px-3">
                        {c.isSelectable ? (
                          <input
                            type="text"
                            value={
                              customManticoreFields[c.sourceFieldMeta.sourceFieldKey] ??
                              c.suggestedManticoreField
                            }
                            onChange={e =>
                              setCustomManticoreFields({
                                ...customManticoreFields,
                                [c.sourceFieldMeta.sourceFieldKey]: e.target.value
                              })
                            }
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono text-xs text-slate-900 focus:outline-hidden focus:border-blue-500"
                          />
                        ) : (
                          <span className="font-mono text-slate-400">{c.suggestedManticoreField}</span>
                        )}
                      </td>

                      {/* 建议检索类型 */}
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                        {c.suggestedManticoreType}
                      </td>

                      {/* 比对与冲突状态 */}
                      <td className="py-2.5 px-3">
                        {renderConflictBadge(c)}
                      </td>

                      {/* 处理指引 */}
                      <td className="py-2.5 px-3 text-[11px] text-slate-500">
                        {c.resolutionHint || '勾选后将自动生成默认 1:1 草稿映射'}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    未找到匹配的 PLM 属性
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 底部确认栏 */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-600">
            已选择 <span className="font-bold text-emerald-700">{selectedKeys.length}</span> 项待导入字段
            （生成草稿后需在主表点击发布配置生效）
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              onClick={onClose}
              className="px-4 py-1.5 border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              取消
            </button>
            <button
              onClick={handleConfirmBatch}
              disabled={selectedKeys.length === 0 || !hasPermission}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded text-xs font-semibold shadow-xs flex items-center space-x-1.5 transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              <Save className="w-3.5 h-3.5" />
              <span>批量生成草稿 ({selectedKeys.length})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
