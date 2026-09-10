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
  RefreshCw,
  Sliders,
  Check,
  ExternalLink,
  Edit3,
  HelpCircle
} from 'lucide-react';
import {
  SourceFieldMeta,
  MappingObjectType,
  FieldMappingItem,
  BatchImportCandidate,
  BatchImportConflictType,
  ManticoreFieldType,
  resolveSourceDisplayName,
  formatRootTypeDisplayName,
  getMaxDisplayOrder,
  getFieldDisplayOrder,
  validateDisplayOrder
} from '../../stage1MappingTypes';
import { FieldMappingForm, FieldMappingFormData } from './FieldMappingForm';

interface BatchImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRootType: MappingObjectType;
  availablePlmFields: SourceFieldMeta[];
  existingFieldMappings: FieldMappingItem[];
  onSaveBatchDrafts: (newDrafts: FieldMappingItem[]) => void;
  onEditField?: (field: FieldMappingItem) => void;
  hasPermission?: boolean;
}

export const BatchImportModal: React.FC<BatchImportModalProps> = ({
  isOpen,
  onClose,
  currentRootType,
  availablePlmFields,
  existingFieldMappings,
  onSaveBatchDrafts,
  onEditField,
  hasPermission = true
}) => {
  // 1. PLM 元数据读取状态: 'IDLE' | 'FETCHING' | 'SUCCESS' | 'FAILED' | 'EMPTY'
  const [fetchStatus, setFetchStatus] = useState<'IDLE' | 'FETCHING' | 'SUCCESS' | 'FAILED' | 'EMPTY'>('IDLE');
  const [fetchErrorMsg, setFetchErrorMsg] = useState<string>('');

  // 2. 来源与分类筛选
  const [searchTerm, setSearchTerm] = useState('');
  const [conflictFilter, setConflictFilter] = useState<'ALL' | 'UNMAPPED' | 'ALREADY_CONFIGURED' | 'HAS_DRAFT' | 'SOURCE_CHANGED' | 'INCOMPATIBLE'>('UNMAPPED');

  // 3. 选中的候选 keys 及各字段自定义完整配置
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  // 针对候选字段的完整自定义配置 (使用统一 FieldMappingFormData)
  const [candidateCustomConfigs, setCandidateCustomConfigs] = useState<Record<string, FieldMappingFormData>>({});
  const [sharedDisplayOrder, setSharedDisplayOrder] = useState('');

  // 4. 单行配置抽屉/子弹窗状态
  const [configuringCandidate, setConfiguringCandidate] = useState<BatchImportCandidate | null>(null);
  const [configuringFormData, setConfiguringFormData] = useState<FieldMappingFormData | null>(null);
  const [configuringErrors, setConfiguringErrors] = useState<Record<string, string>>({});

  const [batchErrorMessage, setBatchErrorMessage] = useState<string | null>(null);
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);

  // 当弹窗打开时重置状态
  useEffect(() => {
    if (!isOpen) {
      setFetchStatus('IDLE');
      setFetchErrorMsg('');
      setSearchTerm('');
      setConflictFilter('UNMAPPED');
      setSelectedKeys([]);
      setCandidateCustomConfigs({});
      setSharedDisplayOrder('');
      setConfiguringCandidate(null);
      setConfiguringFormData(null);
      setConfiguringErrors({});
      setBatchErrorMessage(null);
      setShowUnsavedConfirm(false);
    }
  }, [isOpen]);

  // 构建候选比对列表 (从 availablePlmFields 与 existingFieldMappings 关联推断)
  const candidates: BatchImportCandidate[] = useMemo(() => {
    if (fetchStatus !== 'SUCCESS') return [];

    const baseMaxOrder = getMaxDisplayOrder(existingFieldMappings, currentRootType.id);
    let unmappedCounter = 0;

    return availablePlmFields.map((meta) => {
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
      let existingFieldId: string | undefined = undefined;
      let realDisplayOrder: number | undefined = undefined;

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
        existingFieldId = existing.id;
        realDisplayOrder = getFieldDisplayOrder(existing);
        if (existing.configStatus === 'CONFIGURED') {
          conflictType = 'ALREADY_CONFIGURED';
          conflictReason = '该属性已在当前根类型中生效配置，无需重复导入';
          resolutionHint = '可在字段配置列表中直接查看或修改';
          isSelectable = false;
        } else {
          conflictType = 'HAS_DRAFT';
          conflictReason = '该属性已存在未生效的草稿项，无需重复导入';
          resolutionHint = '可前往字段配置列表继续编辑现有草稿';
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
        suggestedQueryCap = 'FULLTEXT_SEARCH';
      } else if (meta.sourceDataType === 'CATEGORY_TREE') {
        suggestedType = 'STRING';
      } else if (meta.sourceDataType === 'ENUM') {
        suggestedType = 'STRING';
      }

      // 未映射字段默认自动连续编排；用户也可以为整批设置同一个展示顺序
      let suggestedDisplayOrder: number | undefined = undefined;
      if (conflictType === 'UNMAPPED' && isSelectable) {
        unmappedCounter += 1;
        suggestedDisplayOrder = baseMaxOrder + unmappedCounter;
      }

      return {
        sourceFieldMeta: {
          ...meta,
          sourceDisplayName: meta.sourceDisplayName
        },
        resolvedDisplayName: resolvedName,
        isDisplayNameMissing: isMissing,
        suggestedManticoreField: suggestedManticore,
        suggestedManticoreType: suggestedType,
        suggestedDisplayTitle: resolvedName,
        suggestedDisplayType,
        suggestedQueryCapability: suggestedQueryCap,
        suggestedDisplayOrder,
        realDisplayOrder,
        conflictType,
        conflictReason,
        resolutionHint,
        isSelectable,
        existingFieldId
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
        // 读取成功后仅展示可导入项，不替用户做批量选择。
        setConflictFilter('UNMAPPED');
        setSelectedKeys([]);
      }
    }, 450);
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

  // 打开候选字段的单独完整配置弹窗
  const handleOpenConfigureCandidate = (c: BatchImportCandidate) => {
    const key = c.sourceFieldMeta.sourceFieldKey;
    const existingCustom = candidateCustomConfigs[key];

    if (existingCustom) {
      setConfiguringFormData({ ...existingCustom });
    } else {
      // 初始默认推断值
      const defaultOrder = c.suggestedDisplayOrder ?? (getMaxDisplayOrder(existingFieldMappings, currentRootType.id) + 1);
      const isNum = c.sourceFieldMeta.sourceDataType === 'NUMERIC' || c.sourceFieldMeta.sourceDataType === 'NUMERIC_WITH_UNIT';
      const isLongText = c.sourceFieldMeta.sourceDataType === 'LONG_TEXT';
      const isLink = c.suggestedDisplayType === 'LINK';

      setConfiguringFormData({
        selectedSourceKey: key,
        displayTitle: c.suggestedDisplayTitle,
        displayOrder: defaultOrder,
        defaultColumnWidth: 150,
        displayType: isLink ? 'LINK' : 'CONDITION_QUERY',
        manticoreField: c.suggestedManticoreField,
        manticoreType: c.suggestedManticoreType,
        isQueryCondition: true,
        isSortable: isNum,
        isDisplayInResult: true,
        isFulltextSearch: isLongText,
        isUniqueKey: false,
        isEnableHyperlink: isLink,
        hyperlinkConfig: {
          urlTemplate: 'https://plm.internal.corp/app/view?oid={oid}&type={otype}',
          oidSourceField: 'master_oid',
          otypeSourceField: 'object_type_code',
          displayTextSource: 'FIELD_VALUE',
          staticLabel: '查看源数据',
          openTarget: '_blank',
          onMissingParam: 'HIDE_LINK_SHOW_TEXT'
        }
      });
    }

    setConfiguringCandidate(c);
    setConfiguringErrors({});
  };

  // 保存单行候选配置
  const handleSaveCandidateConfig = () => {
    if (!configuringCandidate || !configuringFormData) return;

    const newErrors: Record<string, string> = {};
    if (!configuringFormData.displayTitle.trim()) {
      newErrors.displayTitle = '前台显示名称为必填项，不可为空';
    }

    const currentKey = configuringCandidate.sourceFieldMeta.sourceFieldKey;

    const orderVal = validateDisplayOrder(
      configuringFormData.displayOrder,
      existingFieldMappings,
      currentRootType.id
    );
    if (!orderVal.valid && orderVal.errorMessage) {
      newErrors.displayOrder = orderVal.errorMessage;
    }

    if (!configuringFormData.manticoreField.trim()) {
      newErrors.manticoreField = 'Manticore 字段名不能为空';
    } else if (!/^[a-z][a-z0-9_]*$/.test(configuringFormData.manticoreField)) {
      newErrors.manticoreField = 'Manticore 字段必须为全小写蛇形命名 (例如 part_number)';
    }

    if (configuringFormData.isEnableHyperlink || configuringFormData.displayType === 'LINK') {
      if (!configuringFormData.hyperlinkConfig?.urlTemplate?.trim()) {
        newErrors.urlTemplate = '超链接 URL 模板不能为空';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setConfiguringErrors(newErrors);
      return;
    }

    setCandidateCustomConfigs(prev => ({
      ...prev,
      [currentKey]: {
        ...configuringFormData,
        displayType: configuringFormData.isEnableHyperlink ? 'LINK' : 'CONDITION_QUERY',
        hyperlinkConfig: configuringFormData.isEnableHyperlink ? configuringFormData.hyperlinkConfig : undefined
      }
    }));

    // 自动勾选此候选
    if (!selectedKeys.includes(currentKey)) {
      setSelectedKeys(prev => [...prev, currentKey]);
    }

    setConfiguringCandidate(null);
    setConfiguringFormData(null);
    setConfiguringErrors({});
  };

  // 导航到已配置字段或草稿项进行编辑
  const handleJumpToEditField = (existingFieldId?: string) => {
    if (!existingFieldId) {
      setBatchErrorMessage('未找到对应字段的映射标识，无法跳转编辑');
      return;
    }
    const target = existingFieldMappings.find(f => f.id === existingFieldId);
    if (!target) {
      setBatchErrorMessage('未在当前根类型中找到对应的字段映射项，可能已被删除');
      return;
    }
    if (!onEditField) {
      setBatchErrorMessage('系统未配置字段编辑入口，无法完成跳转');
      return;
    }
    setBatchErrorMessage(null);
    onClose();
    onEditField(target);
  };

  const isDirty = selectedKeys.length > 0 || Object.keys(candidateCustomConfigs).length > 0 || sharedDisplayOrder.trim() !== '';

  const handleRequestClose = () => {
    if (isDirty) {
      setShowUnsavedConfirm(true);
    } else {
      onClose();
    }
  };

  // 确认批量保存为草稿；可自动连续编排，也可把整批归入同一展示顺序
  const handleConfirmBatch = () => {
    setBatchErrorMessage(null);

    const selectedCandidateList = candidates.filter(
      c => selectedKeys.includes(c.sourceFieldMeta.sourceFieldKey) && c.isSelectable
    );

    if (selectedCandidateList.length === 0) {
      setBatchErrorMessage('请至少选择一个待导入的属性');
      return;
    }

    const normalizedSharedOrder = sharedDisplayOrder.trim() === '' ? undefined : Number(sharedDisplayOrder);
    if (normalizedSharedOrder !== undefined && (!Number.isInteger(normalizedSharedOrder) || normalizedSharedOrder <= 0)) {
      setBatchErrorMessage('统一展示顺序必须为大于 0 的正整数');
      return;
    }

    // 提取所有待导入项与最终展示顺序；统一值优先于单项建议值
    const pendingItems = selectedCandidateList.map(c => {
      const key = c.sourceFieldMeta.sourceFieldKey;
      const custom = candidateCustomConfigs[key];
      const title = custom ? custom.displayTitle.trim() : c.suggestedDisplayTitle;
      const order = normalizedSharedOrder ?? (custom && custom.displayOrder > 0 ? custom.displayOrder : (c.suggestedDisplayOrder ?? 0));
      return {
        candidate: c,
        custom,
        title,
        order
      };
    });

    // 基础有效性校验：必须为正整数；允许已有字段和本批字段使用相同值
    for (const item of pendingItems) {
      if (!Number.isInteger(item.order) || item.order <= 0) {
        setBatchErrorMessage(`字段「${item.title}」的展示顺序无效 (${item.order})，必须为大于 0 的正整数`);
        return;
      }
    }

    // 校验通过，生成草稿映射项
    const newDrafts: FieldMappingItem[] = pendingItems.map((item, idx) => {
      const c = item.candidate;
      const custom = item.custom;

      const { resolvedName, isMissing } = resolveSourceDisplayName(
        c.sourceFieldMeta.sourceDisplayName,
        c.sourceFieldMeta.sourceFieldName,
        c.sourceFieldMeta.sourceFieldKey
      );

      const title = item.title;
      const manticoreName = custom ? custom.manticoreField : c.suggestedManticoreField;
      const manticoreType = custom ? custom.manticoreType : c.suggestedManticoreType;
      const isEnableHyperlink = custom ? !!custom.isEnableHyperlink : (c.suggestedDisplayType === 'LINK');
      const displayType: FieldMappingItem['displayType'] = isEnableHyperlink ? 'LINK' : 'CONDITION_QUERY';
      const isQueryCond = custom ? custom.isQueryCondition : true;
      const isSort = custom ? custom.isSortable : (c.suggestedManticoreType !== 'TEXT');
      const isDisplayInRes = custom ? custom.isDisplayInResult : true;
      const isFulltext = custom ? custom.isFulltextSearch : (c.suggestedManticoreType === 'TEXT');
      const isUnique = custom ? custom.isUniqueKey : false;
      const colWidth = custom ? custom.defaultColumnWidth : 150;
      const hyperlink = isEnableHyperlink ? (custom?.hyperlinkConfig ?? {
        urlTemplate: 'https://plm.internal.corp/app/view?oid={oid}&type={otype}',
        oidSourceField: 'master_oid',
        otypeSourceField: 'object_type_code',
        displayTextSource: 'FIELD_VALUE',
        staticLabel: '查看源数据',
        openTarget: '_blank',
        onMissingParam: 'HIDE_LINK_SHOW_TEXT'
      }) : undefined;

      const order = item.order;

      const derivedQueryCap: FieldMappingItem['queryCapability'] =
        isQueryCond && isFulltext
          ? 'BOTH'
          : isFulltext
          ? 'FULLTEXT_SEARCH'
          : isQueryCond
          ? 'QUERY_CONDITION'
          : 'NONE';

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
        sourceMetadata: structuredClone(c.sourceFieldMeta),
        unitFamily: c.sourceFieldMeta.unitFamily,
        defaultUnit: c.sourceFieldMeta.defaultUnit,
        manticoreField: manticoreName,
        manticoreType,
        displayTitle: title || resolvedName,
        displayOrder: order,
        defaultDisplayOrder: order,
        displayType,
        queryCapability: derivedQueryCap,
        isQueryCondition: isQueryCond,
        isSortable: isSort,
        isDisplayInResult: isDisplayInRes,
        isFulltextSearch: isFulltext,
        isUniqueKey: isUnique,
        defaultColumnWidth: colWidth,
        hyperlinkConfig: hyperlink,
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
          <span className="h-6 inline-flex items-center px-2 rounded-ty-sm text-ty-2xs font-medium bg-[var(--ty-green-lightest-color)] text-[var(--ty-font-main-light-color)] border border-[var(--ty-green-color)]/30">
            <CheckCircle2 className="w-2.5 h-2.5 mr-1 text-[var(--ty-green-color)] shrink-0" />
            未映射 (可导入)
          </span>
        );
      case 'ALREADY_CONFIGURED':
        return (
          <span className="h-6 inline-flex items-center px-2 rounded-ty-sm text-ty-2xs font-medium bg-[var(--ty-primary-lightest-color)] text-[var(--ty-font-main-light-color)] border border-[var(--ty-primary-color)]/30">
            <Check className="w-2.5 h-2.5 mr-1 text-[var(--ty-primary-color)] shrink-0" />
            已配置
          </span>
        );
      case 'HAS_DRAFT':
        return (
          <span className="h-6 inline-flex items-center px-2 rounded-ty-sm text-ty-2xs font-medium bg-[var(--ty-orange-lightest-color)] text-[var(--ty-font-main-light-color)] border border-[var(--ty-orange-color)]/30">
            <Clock className="w-2.5 h-2.5 mr-1 text-[var(--ty-orange-color)] shrink-0" />
            已有草稿
          </span>
        );
      case 'TYPE_INCOMPATIBLE':
      case 'METADATA_MISSING':
      default:
        return (
          <span className="h-6 inline-flex items-center px-2 rounded-ty-sm text-ty-2xs font-medium bg-[var(--ty-fill-dark-color)] text-[var(--ty-font-sub-light-color)] border border-[var(--ty-border-color)]">
            <AlertCircle className="w-2.5 h-2.5 mr-1 text-[var(--ty-font-sub-light-color)] shrink-0" />
            不可导入
          </span>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ty-overlay backdrop-blur-xs px-4 py-[60px] overflow-y-auto">
      <section role="dialog" aria-modal="true" aria-label="批量属性配置" className="bg-[var(--ty-fill-white-color)] rounded-ty-lg shadow-ty-lg border border-[var(--ty-border-color)] w-[min(1200px,calc(100vw-32px))] flex flex-col max-h-[calc(100dvh-120px)] overflow-hidden animate-in fade-in zoom-in-95 duration-150 relative">
        {/* Header - 已精简顶部信息，收回高度并保持右对齐操作 */}
        <div className="px-5 py-3 border-b border-[var(--ty-border-color)] flex flex-wrap items-center justify-between gap-3 bg-[var(--ty-fill-weak-dark-color)] shrink-0">
          <div className="space-y-0.5">
            <h2 className="text-ty-lg font-semibold text-[var(--ty-font-main-color)] flex items-center">
              <FileSpreadsheet className="w-4 h-4 mr-2 text-[var(--ty-primary-color)]" />
              批量发现并导入 PLM 字段映射
              <span className="ml-2 text-ty-2xs font-normal text-[var(--ty-font-sub-color)]">原型示例数据</span>
            </h2>
            <p className="text-ty-xs text-[var(--ty-font-sub-color)]">
              主动读取来源系统元数据定义，自动完成类型推断与来源显示名兜底。勾选后生成草稿，需生效配置后方能进入正式底座。
            </p>
          </div>

          {/* 右对齐的读取 PLM 元数据控制按钮 */}
          <div className="flex items-center space-x-2">
            {fetchStatus === 'SUCCESS' ? (
              <button
                type="button"
                onClick={() => handleFetchPlmMetadata(false)}
                className="h-8 px-3 bg-[var(--ty-fill-white-color)] hover:bg-[var(--ty-fill-color)] text-[var(--ty-font-main-color)] border border-[var(--ty-border-color)] rounded-ty-sm text-ty-xs font-medium flex items-center space-x-2 cursor-pointer transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[var(--ty-font-sub-color)]" />
                <span>重新读取元数据</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleFetchPlmMetadata(false)}
                disabled={fetchStatus === 'FETCHING'}
                className={`h-8 px-4 rounded-ty-sm text-ty-xs font-medium flex items-center space-x-2 cursor-pointer transition-colors ${
                  fetchStatus === 'FETCHING'
                    ? 'bg-[var(--ty-primary-color)]/70 text-[var(--ty-font-white-color)] cursor-wait'
                    : 'bg-[var(--ty-primary-color)] hover:opacity-90 text-[var(--ty-font-white-color)]'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${fetchStatus === 'FETCHING' ? 'animate-spin' : ''}`} />
                <span>{fetchStatus === 'FETCHING' ? '正在连接 PLM 读取中...' : '读取 PLM 元数据'}</span>
              </button>
            )}

            <button
              type="button"
              aria-label="关闭批量属性配置"
              onClick={handleRequestClose}
              className="text-[var(--ty-font-sub-light-color)] hover:text-[var(--ty-font-main-color)] cursor-pointer p-1 rounded-ty-sm hover:bg-[var(--ty-fill-dark-color)] transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 主体区 */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {fetchStatus === 'IDLE' && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[var(--ty-fill-weak-dark-color)]/40">
              <div className="w-12 h-12 rounded-full bg-[var(--ty-primary-lighter-color)] text-[var(--ty-primary-color)] flex items-center justify-center mb-3">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <h4 className="text-ty-sm font-bold text-[var(--ty-font-main-color)]">尚未读取 PLM 元数据字典</h4>
              <p className="text-ty-xs text-[var(--ty-font-sub-color)] max-w-md mt-1 mb-4 leading-relaxed">
                读取当前根类型的来源属性，查看定义并选择需要映射的字段。当前原型使用示例元数据。
              </p>
              <button
                type="button"
                onClick={() => handleFetchPlmMetadata(false)}
                className="h-8 px-4 bg-[var(--ty-primary-color)] hover:opacity-90 text-[var(--ty-font-white-color)] rounded-ty-sm text-ty-xs font-medium cursor-pointer transition-colors flex items-center space-x-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>立即读取 PLM 元数据</span>
              </button>
            </div>
          )}

          {fetchStatus === 'FETCHING' && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <RefreshCw className="w-8 h-8 text-[var(--ty-primary-color)] animate-spin mb-3" />
              <h4 className="text-ty-sm font-bold text-[var(--ty-font-main-color)]">正在读取 PLM 属性定义...</h4>
              <p className="text-ty-xs text-[var(--ty-font-sub-color)] mt-1">
                正在读取 {formatRootTypeDisplayName(currentRootType)} 的属性类型、多值和枚举定义。
              </p>
            </div>
          )}

          {fetchStatus === 'FAILED' && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-[var(--ty-red-lightest-color)] border border-[var(--ty-red-color)]/30 text-[var(--ty-red-color)] flex items-center justify-center mb-3">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h4 className="text-ty-sm font-bold text-[var(--ty-red-color)]">PLM 元数据读取失败</h4>
              <p className="text-ty-xs text-[var(--ty-red-color)] max-w-md mt-1 mb-4">{fetchErrorMsg}</p>
              <button
                type="button"
                onClick={() => handleFetchPlmMetadata(false)}
                className="h-8 px-4 bg-[var(--ty-red-color)] hover:opacity-90 text-[var(--ty-font-white-color)] rounded-ty-sm text-ty-xs font-medium cursor-pointer transition-colors"
              >
                重试连接
              </button>
            </div>
          )}

          {fetchStatus === 'EMPTY' && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-[var(--ty-fill-dark-color)] text-[var(--ty-font-sub-light-color)] flex items-center justify-center mb-3">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <h4 className="text-ty-sm font-bold text-[var(--ty-font-main-color)]">未发现任何 PLM 属性</h4>
              <p className="text-ty-xs text-[var(--ty-font-sub-color)] mt-1">PLM 系统当前根类型未返回任何业务属性定义</p>
            </div>
          )}

          {/* 错误提示横幅 */}
          {batchErrorMessage && (
            <div className="mx-5 my-3 p-3 rounded-ty-sm bg-[var(--ty-red-lightest-color)] border border-[var(--ty-red-color)]/30 text-ty-xs text-[var(--ty-font-main-light-color)] flex items-center justify-between shrink-0 animate-in fade-in duration-150">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-[var(--ty-red-color)] shrink-0" />
                <span className="font-medium text-[var(--ty-red-color)]">{batchErrorMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setBatchErrorMessage(null)}
                className="text-[var(--ty-font-sub-light-color)] hover:text-[var(--ty-red-color)] p-0.5 cursor-pointer transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {fetchStatus === 'SUCCESS' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* 筛选条 (统一 32px 控件) */}
              <div className="px-5 py-2 bg-[var(--ty-fill-white-color)] border-b border-[var(--ty-border-color)] flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center bg-[var(--ty-fill-weak-dark-color)] p-0.5 rounded-ty-sm text-ty-xs font-medium h-8 border border-[var(--ty-border-color)]">
                    <button
                      type="button"
                      onClick={() => setConflictFilter('ALL')}
                      className={`h-7 px-3 rounded-ty-xs transition-colors cursor-pointer flex items-center ${
                        conflictFilter === 'ALL'
                          ? 'bg-[var(--ty-fill-white-color)] text-[var(--ty-font-main-color)] font-semibold'
                          : 'text-[var(--ty-font-sub-color)] hover:text-[var(--ty-font-main-color)]'
                      }`}
                    >
                      全部 ({candidates.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setConflictFilter('UNMAPPED')}
                      className={`h-7 px-3 rounded-ty-xs transition-colors cursor-pointer flex items-center ${
                        conflictFilter === 'UNMAPPED'
                          ? 'bg-[var(--ty-fill-white-color)] text-[var(--ty-green-color)] font-semibold'
                          : 'text-[var(--ty-font-sub-color)] hover:text-[var(--ty-font-main-color)]'
                      }`}
                    >
                      未映射 ({candidates.filter(c => c.conflictType === 'UNMAPPED').length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setConflictFilter('ALREADY_CONFIGURED')}
                      className={`h-7 px-3 rounded-ty-xs transition-colors cursor-pointer flex items-center ${
                        conflictFilter === 'ALREADY_CONFIGURED'
                          ? 'bg-[var(--ty-fill-white-color)] text-[var(--ty-primary-color)] font-semibold'
                          : 'text-[var(--ty-font-sub-color)] hover:text-[var(--ty-font-main-color)]'
                      }`}
                    >
                      已配置 ({candidates.filter(c => c.conflictType === 'ALREADY_CONFIGURED').length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setConflictFilter('HAS_DRAFT')}
                      className={`h-7 px-3 rounded-ty-xs transition-colors cursor-pointer flex items-center ${
                        conflictFilter === 'HAS_DRAFT'
                          ? 'bg-[var(--ty-fill-white-color)] text-[var(--ty-orange-color)] font-semibold'
                          : 'text-[var(--ty-font-sub-color)] hover:text-[var(--ty-font-main-color)]'
                      }`}
                    >
                      已有草稿 ({candidates.filter(c => c.conflictType === 'HAS_DRAFT').length})
                    </button>
                  </div>

                  <div className="relative min-w-[200px]">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--ty-font-sub-light-color)]" />
                    <input
                      type="text"
                      placeholder="搜索字段名、显示名..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="w-full h-8 pl-7 pr-3 bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm text-ty-xs text-[var(--ty-font-main-color)] focus:outline-hidden focus:border-[var(--ty-primary-color)]"
                    />
                  </div>
                </div>

                <div className="text-ty-xs text-[var(--ty-font-sub-color)] flex items-center space-x-3">
                  <div>
                    已勾选待导入: <span className="font-bold text-[var(--ty-primary-color)] font-mono">{selectedCount}</span> 项
                  </div>
                  <div className="text-[var(--ty-border-color)]">|</div>
                  <div>
                    不可导入: <span className="font-bold text-[var(--ty-font-sub-color)] font-mono">{unselectableCandidates.length}</span> 项
                  </div>
                </div>
              </div>

              {/* 候选表格 */}
              <div className="flex-1 overflow-auto">
                <table className="ty-data-table w-full min-w-[2100px] text-left text-ty-xs">
                  <thead className="bg-[var(--ty-fill-weak-dark-color)] border-b border-[var(--ty-border-color)] text-[var(--ty-font-sub-color)] font-semibold sticky top-0 z-10">
                    <tr>
                      <th className="py-2 px-3 w-10 text-center">
                        <button
                          type="button"
                          onClick={toggleSelectAll}
                          className="h-7 w-7 inline-flex items-center justify-center cursor-pointer text-[var(--ty-font-sub-color)] hover:text-[var(--ty-primary-color)]"
                          aria-label="全选或取消全选"
                        >
                          {filteredCandidates.filter(c => c.isSelectable).length > 0 &&
                          filteredCandidates
                            .filter(c => c.isSelectable)
                            .every(c => selectedKeys.includes(c.sourceFieldMeta.sourceFieldKey)) ? (
                            <CheckSquare className="w-4 h-4 text-[var(--ty-primary-color)]" />
                          ) : (
                            <Square className="w-4 h-4 text-[var(--ty-font-sub-light-color)]" />
                          )}
                        </button>
                      </th>
                      <th className="py-2 px-3 w-12 text-center">序号</th>
                      <th className="py-2 px-3 min-w-[140px]">PLM 源字段</th>
                      <th className="py-2 px-3 min-w-[140px]">PLM 显示名</th>
                      <th className="py-2 px-3 min-w-[130px]">PLM 数据类型</th>
                      <th className="py-2 px-3 min-w-[170px]">来源表</th>
                      <th className="py-2 px-3 min-w-[100px]">属性类型</th>
                      <th className="py-2 px-3 min-w-[80px]">多值</th>
                      <th className="py-2 px-3 min-w-[100px]">枚举定义</th>
                      <th className="py-2 px-3 min-w-[140px]">前台显示名称</th>
                      <th className="py-2 px-3 min-w-[150px]">Manticore 字段</th>
                      <th className="py-2 px-3 min-w-[100px]">存储类型</th>
                      <th className="py-2 px-3 min-w-[90px] text-center">展示顺序</th>
                      <th className="py-2 px-3 min-w-[120px]">比对状态</th>
                      <th className="py-2 px-3 min-w-[180px]">说明</th>
                      <th className="py-2 px-3 min-w-[110px] text-center sticky right-0 bg-[var(--ty-fill-weak-dark-color)] border-l border-[var(--ty-border-color)] z-10 shadow-ty-sticky">
                        配置与操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--ty-border-light-color)] text-[var(--ty-font-main-color)]">
                    {filteredCandidates.length > 0 ? (
                      filteredCandidates.map((c, index) => {
                        const key = c.sourceFieldMeta.sourceFieldKey;
                        const isChecked = selectedKeys.includes(key);
                        const custom = candidateCustomConfigs[key];

                        const { resolvedName, isMissing } = resolveSourceDisplayName(
                          c.sourceFieldMeta.sourceDisplayName,
                          c.sourceFieldMeta.sourceFieldName,
                          c.sourceFieldMeta.sourceFieldKey
                        );

                        const currentTitle = custom ? custom.displayTitle : c.suggestedDisplayTitle;
                        const currentManticore = custom ? custom.manticoreField : c.suggestedManticoreField;
                        const currentType = custom ? custom.manticoreType : c.suggestedManticoreType;
                        const sourceTables = c.sourceFieldMeta.sourceTables === undefined
                          ? '未返回'
                          : c.sourceFieldMeta.sourceTables.length > 0
                          ? c.sourceFieldMeta.sourceTables.join('、')
                          : '无直接来源表';
                        const sourceKind = c.sourceFieldMeta.attributeKind
                          ? ({ HARD: '硬属性', EXTENDED: '扩展属性', VIRTUAL: '虚拟属性' } as const)[c.sourceFieldMeta.attributeKind]
                          : '未返回';
                        const enumDefined = c.sourceFieldMeta.hasEnumDefinition ??
                          (c.sourceFieldMeta.enumDefinition || (c.sourceFieldMeta.enumOptions?.length ?? 0) > 0 ? true : undefined);
                        const normalizedSharedOrder = sharedDisplayOrder.trim() === '' ? undefined : Number(sharedDisplayOrder);
                        const currentOrder =
                          isChecked && normalizedSharedOrder !== undefined && Number.isInteger(normalizedSharedOrder) && normalizedSharedOrder > 0
                            ? normalizedSharedOrder
                            : c.conflictType === 'ALREADY_CONFIGURED' || c.conflictType === 'HAS_DRAFT'
                            ? c.realDisplayOrder
                            : custom && custom.displayOrder > 0
                            ? custom.displayOrder
                            : c.suggestedDisplayOrder;

                        return (
                          <tr
                            key={key}
                            onClick={() => handleToggleRow(key, c.isSelectable)}
                            className={`transition-colors ${
                              !c.isSelectable
                                ? 'bg-[var(--ty-fill-weak-dark-color)]/40 opacity-75 cursor-not-allowed'
                                : isChecked
                                ? 'bg-[var(--ty-primary-lighter-color)]/30 hover:bg-[var(--ty-primary-lighter-color)]/50 cursor-pointer'
                                : 'hover:bg-[var(--ty-fill-weak-dark-color)] cursor-pointer'
                            }`}
                          >
                            <td className="py-2 px-3 text-center" onClick={e => e.stopPropagation()}>
                              {c.isSelectable ? (
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleToggleRow(key, c.isSelectable)}
                                  className="rounded text-[var(--ty-primary-color)] cursor-pointer"
                                />
                              ) : (
                                <span className="text-[var(--ty-font-sub-light-color)]">-</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center text-[var(--ty-font-sub-color)]">{index + 1}</td>

                            {/* PLM 来源元数据 (只读) */}
                            <td className="py-2 px-3">
                              <div className="font-mono font-semibold text-[var(--ty-font-main-color)]">
                                {c.sourceFieldMeta.sourceFieldName}
                              </div>
                            </td>
                            <td className="py-2 px-3 text-ty-2xs text-[var(--ty-font-sub-color)]">
                              <span className="inline-flex items-center gap-1">
                                <span>{resolvedName}</span>
                                {isMissing && (
                                  <span
                                    className="text-ty-2xs text-[var(--ty-font-main-light-color)] bg-[var(--ty-orange-lightest-color)] border border-[var(--ty-orange-color)]/30 px-1 rounded-ty-xs font-normal shrink-0"
                                    title="PLM 未返回显示名，已按字段名兜底"
                                  >
                                    显示名兜底
                                  </span>
                                )}
                              </span>
                            </td>

                            <td className="py-2 px-3 text-[var(--ty-font-sub-color)] whitespace-nowrap">
                              {c.sourceFieldMeta.sourceDataTypeLabel}{c.sourceFieldMeta.defaultUnit ? `（${c.sourceFieldMeta.defaultUnit}）` : ''}
                            </td>
                            <td className="py-2 px-3 text-[var(--ty-font-sub-color)]">{sourceTables}</td>
                            <td className="py-2 px-3 text-[var(--ty-font-sub-color)] whitespace-nowrap">{sourceKind}</td>
                            <td className="py-2 px-3 text-[var(--ty-font-sub-color)] whitespace-nowrap">{c.sourceFieldMeta.isMultiValue === undefined ? '未返回' : c.sourceFieldMeta.isMultiValue ? '是' : '否'}</td>
                            <td className="py-2 px-3 text-[var(--ty-font-sub-color)] whitespace-nowrap">{enumDefined === undefined ? '未返回' : enumDefined ? `有${c.sourceFieldMeta.enumOptions?.length ? `（${c.sourceFieldMeta.enumOptions.length} 项）` : ''}` : '无'}</td>

                            <td className="py-2 px-3 font-medium text-[var(--ty-font-main-color)]">{currentTitle}</td>
                            <td className="py-2 px-3 font-mono text-[var(--ty-primary-color)]">{currentManticore}</td>
                            <td className="py-2 px-3 font-mono text-[var(--ty-font-sub-color)]">{currentType}</td>
                            <td className="py-2 px-3 text-center font-mono">{currentOrder ?? '-'}</td>

                            {/* 比对状态与提示 */}
                            <td className="py-2 px-3">
                              <div>
                                {renderConflictBadge(c)}
                                {custom && (
                                  <span className="ml-1 px-1 py-0.5 rounded-ty-xs text-ty-2xs bg-[var(--ty-primary-lightest-color)] text-[var(--ty-font-main-light-color)] border border-[var(--ty-primary-color)]/30 font-medium inline-block">
                                    已定制属性
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2 px-3 text-ty-2xs text-[var(--ty-font-sub-color)] leading-tight">{c.conflictReason || '—'}</td>

                            {/* 配置与操作入口 */}
                            <td
                              className="py-2 px-3 text-center sticky right-0 bg-[var(--ty-fill-white-color)]/95 border-l border-[var(--ty-border-color)] z-10 shadow-ty-sticky"
                              onClick={e => e.stopPropagation()}
                            >
                              {c.conflictType === 'UNMAPPED' ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenConfigureCandidate(c)}
                                  className="h-7 px-3 bg-[var(--ty-primary-lighter-color)] hover:opacity-90 text-[var(--ty-primary-color)] border border-[var(--ty-primary-lighter-color)] rounded-ty-sm text-ty-xs font-medium flex items-center justify-center space-x-1 cursor-pointer transition-colors mx-auto"
                                  title="打开完整配置表单，编辑显示名、展示顺序、列宽、Manticore属性与检索能力"
                                >
                                  <Sliders className="w-3 h-3 text-[var(--ty-primary-color)]" />
                                  <span>配置</span>
                                </button>
                              ) : c.conflictType === 'ALREADY_CONFIGURED' ? (
                                <button
                                  type="button"
                                  onClick={() => handleJumpToEditField(c.existingFieldId)}
                                  className="h-7 px-2 bg-[var(--ty-fill-weak-dark-color)] hover:bg-[var(--ty-fill-color)] text-[var(--ty-font-main-color)] border border-[var(--ty-border-color)] rounded-ty-sm text-ty-2xs font-medium flex items-center justify-center space-x-1 cursor-pointer transition-colors mx-auto"
                                  title="已配置字段无法重复导入，点击直接查看/修改现有配置"
                                >
                                  <Edit3 className="w-3 h-3 text-[var(--ty-font-sub-color)]" />
                                  <span>查看/修改配置</span>
                                </button>
                              ) : c.conflictType === 'HAS_DRAFT' ? (
                                <button
                                  type="button"
                                  onClick={() => handleJumpToEditField(c.existingFieldId)}
                                  className="h-7 px-2 bg-[var(--ty-orange-lightest-color)] hover:bg-[var(--ty-orange-light-color)]/50 text-[var(--ty-font-main-light-color)] border border-[var(--ty-orange-color)]/30 rounded-ty-sm text-ty-2xs font-medium flex items-center justify-center space-x-1 cursor-pointer transition-colors mx-auto"
                                  title="已存在草稿无法重复导入，点击直接继续编辑现有草稿"
                                >
                                  <Clock className="w-3 h-3 text-[var(--ty-orange-color)]" />
                                  <span>继续编辑草稿</span>
                                </button>
                              ) : (
                                <span className="text-ty-2xs text-[var(--ty-font-sub-light-color)]">不可导入</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={16} className="py-12 text-center text-[var(--ty-font-sub-light-color)]">
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

        {/* 底部固定操作条 */}
        {fetchStatus === 'SUCCESS' && (
          <div className="px-5 py-3 border-t border-[var(--ty-border-color)] bg-[var(--ty-fill-weak-dark-color)] flex flex-wrap items-end justify-between gap-3 shrink-0">
            <div className="flex flex-wrap items-end gap-3 text-ty-xs text-[var(--ty-font-sub-color)]">
              <span className="font-semibold text-[var(--ty-font-main-color)]">
                已勾选 <span className="font-mono text-[var(--ty-primary-color)] text-ty-sm">{selectedCount}</span> 项
              </span>
              <label className="space-y-1">
                <span className="block text-ty-2xs">所选统一展示顺序（可选）</span>
                <input type="number" min="1" step="1" value={sharedDisplayOrder} onChange={(event) => setSharedDisplayOrder(event.target.value)} disabled={selectedCount === 0} placeholder="留空则自动排列" className="h-8 w-40 px-3 bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm disabled:opacity-40" />
              </label>
              <span className="text-ty-2xs text-[var(--ty-font-sub-light-color)]">填写后，所选属性使用同一顺序并排在一起；留空则按来源顺序连续编排。</span>
            </div>

            <div className="flex items-center space-x-3 ml-auto">
              <button
                type="button"
                onClick={handleRequestClose}
                className="h-8 px-4 border border-[var(--ty-border-color)] rounded-ty-sm text-ty-xs font-medium text-[var(--ty-font-main-color)] hover:bg-[var(--ty-fill-color)] bg-[var(--ty-fill-white-color)] cursor-pointer transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmBatch}
                disabled={selectedCount === 0 || !hasPermission}
                className={`h-8 px-4 rounded-ty-sm text-ty-xs font-medium flex items-center space-x-2 transition-colors cursor-pointer ${
                  selectedCount > 0 && hasPermission
                    ? 'bg-[var(--ty-primary-color)] hover:opacity-90 text-[var(--ty-font-white-color)]'
                    : 'bg-[var(--ty-fill-dark-color)] text-[var(--ty-font-sub-light-color)] cursor-not-allowed'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>确认批量导入为草稿 ({selectedCount})</span>
              </button>
            </div>
          </div>
        )}

        {/* 单行完整属性配置子弹窗 (使用公共 FieldMappingForm，避免代码与校验分裂) */}
        {configuringCandidate && configuringFormData && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-ty-overlay backdrop-blur-xs px-4 py-[60px] overflow-y-auto">
            <section role="dialog" aria-modal="true" aria-label="批量属性单项配置" className="bg-[var(--ty-fill-white-color)] rounded-ty-lg shadow-ty-lg border border-[var(--ty-border-color)] w-[min(1000px,calc(100vw-32px))] flex flex-col max-h-[calc(100dvh-120px)] overflow-hidden animate-in fade-in zoom-in-95 duration-100">
              <div className="px-5 py-4 border-b border-[var(--ty-border-color)] flex items-center justify-between bg-[var(--ty-fill-weak-dark-color)] shrink-0">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <h2 className="text-ty-lg font-semibold text-[var(--ty-font-main-color)] flex items-center">
                      <Sliders className="w-4 h-4 mr-2 text-[var(--ty-primary-color)]" />
                      配置导入字段属性 - {configuringCandidate.sourceFieldMeta.sourceFieldName}
                    </h2>
                    <span className="min-h-6 px-2 inline-flex items-center text-ty-2xs font-mono font-medium rounded-ty-sm bg-[var(--ty-fill-color)] text-[var(--ty-font-main-color)] border border-[var(--ty-border-color)]">
                      根类型: {formatRootTypeDisplayName(currentRootType.name, currentRootType.code)}
                    </span>
                  </div>
                  <p className="text-ty-xs text-[var(--ty-font-sub-color)]">
                    使用与单字段相同的完整配置结构。推断值仅为默认建议，您可在导入前自由修改前台显示名、展示顺序、Manticore 物理类型及检索能力。
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="关闭单项属性配置"
                  onClick={() => {
                    setConfiguringCandidate(null);
                    setConfiguringFormData(null);
                    setConfiguringErrors({});
                  }}
                  className="h-7 w-7 inline-flex items-center justify-center text-[var(--ty-font-sub-light-color)] hover:text-[var(--ty-font-main-color)] cursor-pointer rounded-ty-sm hover:bg-[var(--ty-fill-dark-color)] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                <FieldMappingForm
                  currentRootType={currentRootType}
                  sourceMeta={configuringCandidate.sourceFieldMeta}
                  formData={configuringFormData}
                  onChange={partial => setConfiguringFormData(prev => prev ? { ...prev, ...partial } : null)}
                  errors={configuringErrors}
                  isEditingConfigured={false}
                  sourceReadonly={true}
                />
              </div>

              <div className="px-5 py-3 border-t border-[var(--ty-border-color)] bg-[var(--ty-fill-weak-dark-color)] flex items-center justify-between shrink-0">
                <span className="text-ty-xs text-[var(--ty-font-sub-color)]">
                  * 确认配置后将更新此字段在批量导入中的设定，并自动将其标记为勾选状态
                </span>
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setConfiguringCandidate(null);
                      setConfiguringFormData(null);
                      setConfiguringErrors({});
                    }}
                    className="h-8 px-4 border border-[var(--ty-border-color)] rounded-ty-sm text-ty-xs font-medium text-[var(--ty-font-main-color)] hover:bg-[var(--ty-fill-color)] bg-[var(--ty-fill-white-color)] cursor-pointer transition-colors"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveCandidateConfig}
                    className="h-8 px-4 bg-[var(--ty-primary-color)] hover:opacity-90 text-[var(--ty-font-white-color)] rounded-ty-sm text-ty-xs font-medium flex items-center space-x-2 cursor-pointer transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>确认配置</span>
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* 未保存修改确认弹窗 */}
        {showUnsavedConfirm && (
          <div className="absolute inset-0 z-50 bg-ty-overlay backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-[var(--ty-fill-white-color)] rounded-ty-lg shadow-ty-lg border border-[var(--ty-border-color)] max-w-sm w-full p-4 space-y-3 animate-in zoom-in-95 duration-100">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-[var(--ty-orange-lightest-color)] border border-[var(--ty-orange-color)]/30 text-[var(--ty-orange-color)] rounded-full shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-ty-xs font-bold text-[var(--ty-font-main-color)]">未保存勾选确认</h4>
                  <p className="text-ty-xs text-[var(--ty-font-sub-color)] mt-1 leading-relaxed">
                    当前已有勾选或定制的导入项。如果退出，所选内容将不会保存为草稿。确定要退出吗？
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-[var(--ty-border-light-color)]">
                <button
                  type="button"
                  onClick={() => setShowUnsavedConfirm(false)}
                  className="h-8 px-3 bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] text-[var(--ty-font-main-color)] hover:bg-[var(--ty-fill-weak-dark-color)] rounded-ty-sm text-ty-xs font-medium cursor-pointer"
                >
                  继续选择
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowUnsavedConfirm(false);
                    onClose();
                  }}
                  className="h-8 px-3 bg-[var(--ty-red-color)] hover:opacity-90 text-[var(--ty-font-white-color)] rounded-ty-sm text-ty-xs font-medium cursor-pointer"
                >
                  放弃并退出
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
