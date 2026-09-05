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
  const [conflictFilter, setConflictFilter] = useState<'ALL' | 'UNMAPPED' | 'ALREADY_CONFIGURED' | 'HAS_DRAFT' | 'SOURCE_CHANGED' | 'INCOMPATIBLE'>('ALL');

  // 3. 选中的候选 keys 及各字段自定义完整配置
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  // 针对候选字段的完整自定义配置 (使用统一 FieldMappingFormData)
  const [candidateCustomConfigs, setCandidateCustomConfigs] = useState<Record<string, FieldMappingFormData>>({});

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
      setConflictFilter('ALL');
      setSelectedKeys([]);
      setCandidateCustomConfigs({});
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

      // 只有“未映射”且可直接导入的候选字段才分配建议顺序号，按待导入顺序递增，避免被已存在或不可导入字段占位空耗
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
    const currentOrder = configuringFormData.displayOrder;

    const orderVal = validateDisplayOrder(
      currentOrder,
      existingFieldMappings,
      currentRootType.id
    );
    if (!orderVal.valid && orderVal.errorMessage) {
      newErrors.displayOrder = orderVal.errorMessage;
    }

    // 校验与当前已有字段是否冲突
    if (!newErrors.displayOrder) {
      const conflictExisting = existingFieldMappings.find(
        f => f.rootTypeId === currentRootType.id && getFieldDisplayOrder(f) === currentOrder
      );
      if (conflictExisting) {
        newErrors.displayOrder = `顺序号 ${currentOrder} 已被当前已有字段「${conflictExisting.displayTitle}」占用`;
      }
    }

    // 校验与其他已定制的候选配置是否冲突
    if (!newErrors.displayOrder) {
      for (const [otherKey, config] of Object.entries(candidateCustomConfigs)) {
        const otherConfig = config as FieldMappingFormData;
        if (otherKey !== currentKey && otherConfig && otherConfig.displayOrder === currentOrder) {
          newErrors.displayOrder = `顺序号 ${currentOrder} 与已定制候选字段「${otherConfig.displayTitle}」冲突`;
          break;
        }
      }
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

  const isDirty = selectedKeys.length > 0 || Object.keys(candidateCustomConfigs).length > 0;

  const handleRequestClose = () => {
    if (isDirty) {
      setShowUnsavedConfirm(true);
    } else {
      onClose();
    }
  };

  // 确认批量保存为草稿 (严格校验整批顺序号唯一性，列表与保存完全一致)
  const handleConfirmBatch = () => {
    setBatchErrorMessage(null);

    const selectedCandidateList = candidates.filter(
      c => selectedKeys.includes(c.sourceFieldMeta.sourceFieldKey) && c.isSelectable
    );

    if (selectedCandidateList.length === 0) {
      setBatchErrorMessage('请至少选择一个待导入的属性');
      return;
    }

    // 1. 提取所有待导入项与其确切最终顺序号（严格与表格显示一致）
    const pendingItems = selectedCandidateList.map(c => {
      const key = c.sourceFieldMeta.sourceFieldKey;
      const custom = candidateCustomConfigs[key];
      const title = custom ? custom.displayTitle.trim() : c.suggestedDisplayTitle;
      const order = custom && custom.displayOrder > 0 ? custom.displayOrder : (c.suggestedDisplayOrder ?? 0);
      return {
        candidate: c,
        custom,
        title,
        order
      };
    });

    // 2. 基础有效性校验：必须为正整数
    for (const item of pendingItems) {
      if (!Number.isInteger(item.order) || item.order <= 0) {
        setBatchErrorMessage(`字段「${item.title}」的顺序号无效 (${item.order})，必须为大于 0 的正整数`);
        return;
      }
    }

    // 3. 校验与当前根类型已有字段的冲突
    for (const item of pendingItems) {
      const conflictExisting = existingFieldMappings.find(
        f => f.rootTypeId === currentRootType.id && getFieldDisplayOrder(f) === item.order
      );
      if (conflictExisting) {
        setBatchErrorMessage(
          `顺序号冲突：待导入字段「${item.title}」的顺序号 (${item.order}) 与当前根类型已有字段「${conflictExisting.displayTitle}」重复，请修改后再保存`
        );
        return;
      }
    }

    // 4. 校验整批内部的顺序号唯一性
    const seenOrders = new Map<number, string>();
    for (const item of pendingItems) {
      if (seenOrders.has(item.order)) {
        const prevTitle = seenOrders.get(item.order);
        setBatchErrorMessage(
          `顺序号冲突：待导入字段「${item.title}」与「${prevTitle}」设置了相同的顺序号 (${item.order})，请修改后再保存`
        );
        return;
      }
      seenOrders.set(item.order, item.title);
    }

    // 5. 校验通过，生成草稿映射项
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
          <span className="h-5 inline-flex items-center px-1.5 py-0.5 rounded-[4px] text-ty-2xs font-medium bg-[var(--ty-green-light-color)] text-[var(--ty-green-color)] border border-[var(--ty-green-color)]/30">
            <CheckCircle2 className="w-2.5 h-2.5 mr-1 text-[var(--ty-green-color)] shrink-0" />
            未映射 (可导入)
          </span>
        );
      case 'ALREADY_CONFIGURED':
        return (
          <span className="h-5 inline-flex items-center px-1.5 py-0.5 rounded-[4px] text-ty-2xs font-medium bg-[var(--ty-primary-lighter-color)] text-[var(--ty-primary-color)] border border-[var(--ty-primary-lighter-color)]">
            <Check className="w-2.5 h-2.5 mr-1 text-[var(--ty-primary-color)] shrink-0" />
            已配置
          </span>
        );
      case 'HAS_DRAFT':
        return (
          <span className="h-5 inline-flex items-center px-1.5 py-0.5 rounded-[4px] text-ty-2xs font-medium bg-[var(--ty-orange-light-color)] text-[var(--ty-orange-color)] border border-[var(--ty-orange-color)]/30">
            <Clock className="w-2.5 h-2.5 mr-1 text-[var(--ty-orange-color)] shrink-0" />
            已有草稿
          </span>
        );
      case 'TYPE_INCOMPATIBLE':
      case 'METADATA_MISSING':
      default:
        return (
          <span className="h-5 inline-flex items-center px-1.5 py-0.5 rounded-[4px] text-ty-2xs font-medium bg-[var(--ty-fill-dark-color)] text-[var(--ty-font-sub-light-color)] border border-[var(--ty-border-color)]">
            <AlertCircle className="w-2.5 h-2.5 mr-1 text-[var(--ty-font-sub-light-color)] shrink-0" />
            不可导入
          </span>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[var(--ty-fill-white-color)] rounded-[8px] shadow-lg border border-[var(--ty-border-color)] max-w-6xl w-full flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150 relative">
        {/* Header - 已精简顶部信息，收回高度并保持右对齐操作 */}
        <div className="px-5 py-3 border-b border-[var(--ty-border-color)] flex flex-wrap items-center justify-between gap-3 bg-[var(--ty-fill-weak-dark-color)] shrink-0">
          <div className="space-y-0.5">
            <h3 className="text-ty-sm font-bold text-[var(--ty-font-main-color)] flex items-center">
              <FileSpreadsheet className="w-4 h-4 mr-1.5 text-[var(--ty-primary-color)]" />
              批量发现并导入 PLM 字段映射
            </h3>
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
                className="h-8 px-3 bg-[var(--ty-fill-white-color)] hover:bg-[var(--ty-fill-color)] text-[var(--ty-font-main-color)] border border-[var(--ty-border-color)] rounded-[4px] text-ty-xs font-medium flex items-center space-x-1.5 cursor-pointer transition-colors shadow-2xs"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[var(--ty-font-sub-color)]" />
                <span>重新读取元数据</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleFetchPlmMetadata(false)}
                disabled={fetchStatus === 'FETCHING'}
                className={`h-8 px-3.5 rounded-[4px] text-ty-xs font-medium flex items-center space-x-1.5 cursor-pointer transition-colors ${
                  fetchStatus === 'FETCHING'
                    ? 'bg-[var(--ty-primary-color)]/70 text-white cursor-wait'
                    : 'bg-[var(--ty-primary-color)] hover:opacity-90 text-white shadow-2xs'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${fetchStatus === 'FETCHING' ? 'animate-spin' : ''}`} />
                <span>{fetchStatus === 'FETCHING' ? '正在连接 PLM 读取中...' : '读取 PLM 元数据'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleRequestClose}
              className="text-[var(--ty-font-sub-light-color)] hover:text-[var(--ty-font-main-color)] cursor-pointer p-1 rounded-[4px] hover:bg-[var(--ty-fill-dark-color)] transition-colors ml-1"
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
                点击上方或下方“读取 PLM 元数据”按钮，系统将连接来源系统接口，实时比对并识别未配置的属性候选。
              </p>
              <button
                type="button"
                onClick={() => handleFetchPlmMetadata(false)}
                className="h-8 px-4 bg-[var(--ty-primary-color)] hover:opacity-90 text-white rounded-[4px] text-ty-xs font-medium cursor-pointer shadow-2xs transition-colors flex items-center space-x-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>立即读取 PLM 元数据</span>
              </button>
            </div>
          )}

          {fetchStatus === 'FETCHING' && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <RefreshCw className="w-8 h-8 text-[var(--ty-primary-color)] animate-spin mb-3" />
              <h4 className="text-ty-sm font-bold text-[var(--ty-font-main-color)]">正在连接 PLM 系统读取元数据...</h4>
              <p className="text-ty-xs text-[var(--ty-font-sub-color)] mt-1 font-mono">
                FETCH /api/plm/schema/metadata?rootType={currentRootType.id}
              </p>
            </div>
          )}

          {fetchStatus === 'FAILED' && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-[var(--ty-red-light-color)] text-[var(--ty-red-color)] flex items-center justify-center mb-3">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h4 className="text-ty-sm font-bold text-[var(--ty-red-color)]">PLM 元数据读取失败</h4>
              <p className="text-ty-xs text-[var(--ty-red-color)] max-w-md mt-1 mb-4">{fetchErrorMsg}</p>
              <button
                type="button"
                onClick={() => handleFetchPlmMetadata(false)}
                className="h-8 px-4 bg-[var(--ty-red-color)] hover:opacity-90 text-white rounded-[4px] text-ty-xs font-medium cursor-pointer shadow-2xs transition-colors"
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
            <div className="mx-5 my-2.5 p-3 rounded-[4px] bg-[var(--ty-red-light-color)] border border-[var(--ty-red-color)]/30 text-ty-xs text-[var(--ty-red-color)] flex items-center justify-between shrink-0 animate-in fade-in duration-150">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-[var(--ty-red-color)] shrink-0" />
                <span className="font-medium">{batchErrorMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setBatchErrorMessage(null)}
                className="text-[var(--ty-red-color)] hover:opacity-80 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {fetchStatus === 'SUCCESS' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* 筛选条 (统一 32px 控件) */}
              <div className="px-5 py-2.5 bg-[var(--ty-fill-white-color)] border-b border-[var(--ty-border-color)] flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center bg-[var(--ty-fill-weak-dark-color)] p-0.5 rounded-[4px] text-ty-xs font-medium h-8 border border-[var(--ty-border-color)]">
                    <button
                      type="button"
                      onClick={() => setConflictFilter('ALL')}
                      className={`h-7 px-2.5 rounded-[2px] transition-colors cursor-pointer flex items-center ${
                        conflictFilter === 'ALL'
                          ? 'bg-[var(--ty-fill-white-color)] text-[var(--ty-font-main-color)] shadow-2xs font-semibold'
                          : 'text-[var(--ty-font-sub-color)] hover:text-[var(--ty-font-main-color)]'
                      }`}
                    >
                      全部 ({candidates.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setConflictFilter('UNMAPPED')}
                      className={`h-7 px-2.5 rounded-[2px] transition-colors cursor-pointer flex items-center ${
                        conflictFilter === 'UNMAPPED'
                          ? 'bg-[var(--ty-fill-white-color)] text-[var(--ty-green-color)] shadow-2xs font-semibold'
                          : 'text-[var(--ty-font-sub-color)] hover:text-[var(--ty-font-main-color)]'
                      }`}
                    >
                      未映射 ({candidates.filter(c => c.conflictType === 'UNMAPPED').length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setConflictFilter('ALREADY_CONFIGURED')}
                      className={`h-7 px-2.5 rounded-[2px] transition-colors cursor-pointer flex items-center ${
                        conflictFilter === 'ALREADY_CONFIGURED'
                          ? 'bg-[var(--ty-fill-white-color)] text-[var(--ty-primary-color)] shadow-2xs font-semibold'
                          : 'text-[var(--ty-font-sub-color)] hover:text-[var(--ty-font-main-color)]'
                      }`}
                    >
                      已配置 ({candidates.filter(c => c.conflictType === 'ALREADY_CONFIGURED').length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setConflictFilter('HAS_DRAFT')}
                      className={`h-7 px-2.5 rounded-[2px] transition-colors cursor-pointer flex items-center ${
                        conflictFilter === 'HAS_DRAFT'
                          ? 'bg-[var(--ty-fill-white-color)] text-[var(--ty-orange-color)] shadow-2xs font-semibold'
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
                      className="w-full h-8 pl-7 pr-3 bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-[4px] text-ty-xs text-[var(--ty-font-main-color)] focus:outline-hidden focus:border-[var(--ty-primary-color)]"
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
              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-left text-ty-xs">
                  <thead className="bg-[var(--ty-fill-weak-dark-color)] border-b border-[var(--ty-border-color)] text-[var(--ty-font-sub-color)] font-semibold sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">
                        <button
                          type="button"
                          onClick={toggleSelectAll}
                          className="cursor-pointer text-[var(--ty-font-sub-color)] hover:text-[var(--ty-primary-color)] p-0.5"
                          title="全选/全不选"
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
                      <th className="py-2.5 px-3 min-w-[150px]">PLM 源字段 / 显示名</th>
                      <th className="py-2.5 px-3 min-w-[100px]">PLM 业务类型</th>
                      <th className="py-2.5 px-3 min-w-[140px]">前台显示名称</th>
                      <th className="py-2.5 px-3 min-w-[130px]">Manticore 字段</th>
                      <th className="py-2.5 px-3 min-w-[80px]">底层类型</th>
                      <th className="py-2.5 px-3 min-w-[65px] text-center">顺序号</th>
                      <th className="py-2.5 px-3 min-w-[130px]">比对状态与说明</th>
                      <th className="py-2.5 px-3 min-w-[110px] text-center sticky right-0 bg-[var(--ty-fill-weak-dark-color)] border-l border-[var(--ty-border-color)] z-10 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.03)]">
                        配置与操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--ty-border-light-color)] text-[var(--ty-font-main-color)]">
                    {filteredCandidates.length > 0 ? (
                      filteredCandidates.map(c => {
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
                        const currentOrder =
                          c.conflictType === 'ALREADY_CONFIGURED' || c.conflictType === 'HAS_DRAFT'
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
                            <td className="py-2.5 px-3 text-center" onClick={e => e.stopPropagation()}>
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

                            {/* PLM 来源元数据 (只读) */}
                            <td className="py-2.5 px-3">
                              <div className="font-mono font-semibold text-[var(--ty-font-main-color)]">
                                {c.sourceFieldMeta.sourceFieldName}
                              </div>
                                <div className="text-ty-2xs text-[var(--ty-font-sub-color)] flex items-center mt-0.5">
                                <span>{resolvedName}</span>
                                {isMissing && (
                                  <span
                                    className="ml-1 text-ty-2xs text-[var(--ty-font-main-light-color)] bg-[var(--ty-orange-lightest-color)] border border-[var(--ty-orange-color)]/30 px-1 rounded-[2px] font-normal shrink-0"
                                    title="PLM 未返回显示名，已按字段名兜底"
                                  >
                                    显示名兜底
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="py-2.5 px-3 text-[var(--ty-font-sub-color)]">
                              <span>{c.sourceFieldMeta.sourceDataTypeLabel}</span>
                              {c.sourceFieldMeta.defaultUnit && (
                                <span className="text-ty-2xs font-mono text-[var(--ty-font-sub-light-color)] ml-1">
                                  ({c.sourceFieldMeta.defaultUnit})
                                </span>
                              )}
                            </td>

                            {/* 前台显示名称 */}
                            <td className="py-2.5 px-3 font-medium text-[var(--ty-font-main-color)]">
                              {currentTitle}
                            </td>

                            {/* Manticore 字段 */}
                            <td className="py-2.5 px-3 font-mono text-[var(--ty-primary-color)] font-semibold">
                              {currentManticore}
                            </td>

                            {/* 底层类型 */}
                            <td className="py-2.5 px-3 font-mono text-[var(--ty-font-sub-color)]">
                              {currentType}
                            </td>

                            {/* 顺序号 */}
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-[var(--ty-font-main-color)]">
                              {currentOrder !== undefined ? (
                                <span
                                  className={`px-1.5 py-0.5 rounded-[2px] border text-ty-2xs ${
                                    c.conflictType === 'ALREADY_CONFIGURED' || c.conflictType === 'HAS_DRAFT'
                                      ? 'bg-[var(--ty-fill-dark-color)] border-[var(--ty-border-color)] text-[var(--ty-font-sub-color)]'
                                      : custom
                                      ? 'bg-[var(--ty-primary-lighter-color)] border-[var(--ty-primary-color)]/30 text-[var(--ty-primary-color)] font-bold'
                                      : 'bg-[var(--ty-primary-lighter-color)] border-[var(--ty-primary-lighter-color)] text-[var(--ty-primary-color)]'
                                  }`}
                                  title={
                                    c.conflictType === 'ALREADY_CONFIGURED' || c.conflictType === 'HAS_DRAFT'
                                      ? '该字段在当前根类型已有映射中的实际顺序号'
                                      : custom
                                      ? '用户在本次批量导入中单独定制的顺序号'
                                      : '系统推断建议顺序号'
                                  }
                                >
                                  {currentOrder}
                                </span>
                              ) : (
                                <span className="text-[var(--ty-font-sub-light-color)]">-</span>
                              )}
                            </td>

                            {/* 比对状态与提示 */}
                            <td className="py-2.5 px-3">
                              <div className="space-y-0.5">
                                {renderConflictBadge(c)}
                                {custom && (
                                  <span className="ml-1 px-1 py-0.2 rounded-[2px] text-ty-2xs bg-[var(--ty-primary-lightest-color)] text-[var(--ty-font-main-light-color)] border border-[var(--ty-primary-color)]/30 font-medium inline-block">
                                    已定制属性
                                  </span>
                                )}
                                {c.conflictReason && (
                                  <div className="text-ty-2xs text-[var(--ty-font-sub-color)] leading-tight">
                                    {c.conflictReason}
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* 配置与操作入口 */}
                            <td
                              className="py-2.5 px-3 text-center sticky right-0 bg-[var(--ty-fill-white-color)]/95 border-l border-[var(--ty-border-color)] z-10 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.03)]"
                              onClick={e => e.stopPropagation()}
                            >
                              {c.conflictType === 'UNMAPPED' ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenConfigureCandidate(c)}
                                  className="h-7 px-2.5 bg-[var(--ty-primary-lighter-color)] hover:opacity-90 text-[var(--ty-primary-color)] border border-[var(--ty-primary-lighter-color)] rounded-[4px] text-ty-xs font-medium flex items-center justify-center space-x-1 cursor-pointer transition-colors mx-auto shadow-2xs"
                                  title="打开完整配置表单，编辑显示名、顺序号、列宽、Manticore属性与检索能力"
                                >
                                  <Sliders className="w-3 h-3 text-[var(--ty-primary-color)]" />
                                  <span>配置</span>
                                </button>
                              ) : c.conflictType === 'ALREADY_CONFIGURED' ? (
                                <button
                                  type="button"
                                  onClick={() => handleJumpToEditField(c.existingFieldId)}
                                  className="h-7 px-2 bg-[var(--ty-fill-weak-dark-color)] hover:bg-[var(--ty-fill-color)] text-[var(--ty-font-main-color)] border border-[var(--ty-border-color)] rounded-[4px] text-ty-2xs font-medium flex items-center justify-center space-x-1 cursor-pointer transition-colors mx-auto"
                                  title="已配置字段无法重复导入，点击直接查看/修改现有配置"
                                >
                                  <Edit3 className="w-3 h-3 text-[var(--ty-font-sub-color)]" />
                                  <span>查看/修改配置</span>
                                </button>
                              ) : c.conflictType === 'HAS_DRAFT' ? (
                                <button
                                  type="button"
                                  onClick={() => handleJumpToEditField(c.existingFieldId)}
                                  className="h-7 px-2 bg-[var(--ty-orange-light-color)] hover:opacity-90 text-[var(--ty-orange-color)] border border-[var(--ty-orange-color)]/30 rounded-[4px] text-ty-2xs font-medium flex items-center justify-center space-x-1 cursor-pointer transition-colors mx-auto"
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
                        <td colSpan={9} className="py-12 text-center text-[var(--ty-font-sub-light-color)]">
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
          <div className="px-5 py-3 border-t border-[var(--ty-border-color)] bg-[var(--ty-fill-weak-dark-color)] flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-2 text-ty-xs text-[var(--ty-font-sub-color)]">
              <span className="font-semibold text-[var(--ty-font-main-color)]">
                已勾选 <span className="font-mono text-[var(--ty-primary-color)] text-sm">{selectedCount}</span> 项
              </span>
              <span className="text-[var(--ty-border-color)]">|</span>
              <span className="text-ty-2xs text-[var(--ty-font-sub-light-color)]">
                * 批量导入的字段将自动生成为草稿项，顺序号连续编排，需生效配置后方能进入正式底座
              </span>
            </div>

            <div className="flex items-center space-x-2.5">
              <button
                type="button"
                onClick={handleRequestClose}
                className="h-8 px-4 border border-[var(--ty-border-color)] rounded-[4px] text-ty-xs font-medium text-[var(--ty-font-main-color)] hover:bg-[var(--ty-fill-color)] bg-[var(--ty-fill-white-color)] cursor-pointer transition-colors shadow-2xs"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmBatch}
                disabled={selectedCount === 0 || !hasPermission}
                className={`h-8 px-4 rounded-[4px] text-ty-xs font-medium shadow-2xs flex items-center space-x-1.5 transition-colors cursor-pointer ${
                  selectedCount > 0 && hasPermission
                    ? 'bg-[var(--ty-primary-color)] hover:opacity-90 text-white'
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
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
            <div className="bg-[var(--ty-fill-white-color)] rounded-[8px] shadow-lg border border-[var(--ty-border-color)] max-w-5xl w-full flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-100">
              <div className="px-5 py-3.5 border-b border-[var(--ty-border-color)] flex items-center justify-between bg-[var(--ty-fill-weak-dark-color)] shrink-0">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-ty-sm font-bold text-[var(--ty-font-main-color)] flex items-center">
                      <Sliders className="w-4 h-4 mr-1.5 text-[var(--ty-primary-color)]" />
                      配置导入字段属性 - {configuringCandidate.sourceFieldMeta.sourceFieldName}
                    </h3>
                    <span className="px-2 py-0.5 text-ty-2xs font-mono font-medium rounded-[4px] bg-[var(--ty-fill-color)] text-[var(--ty-font-main-color)] border border-[var(--ty-border-color)]">
                      根类型: {formatRootTypeDisplayName(currentRootType.name, currentRootType.code)}
                    </span>
                  </div>
                  <p className="text-ty-xs text-[var(--ty-font-sub-color)]">
                    使用与单字段相同的完整配置结构。推断值仅为默认建议，您可在导入前自由修改前台显示名、顺序号、Manticore 物理类型及检索能力。
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setConfiguringCandidate(null);
                    setConfiguringFormData(null);
                    setConfiguringErrors({});
                  }}
                  className="text-[var(--ty-font-sub-light-color)] hover:text-[var(--ty-font-main-color)] cursor-pointer p-1 rounded-[4px] hover:bg-[var(--ty-fill-dark-color)] transition-colors"
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
                <div className="flex items-center space-x-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setConfiguringCandidate(null);
                      setConfiguringFormData(null);
                      setConfiguringErrors({});
                    }}
                    className="h-8 px-4 border border-[var(--ty-border-color)] rounded-[4px] text-ty-xs font-medium text-[var(--ty-font-main-color)] hover:bg-[var(--ty-fill-color)] bg-[var(--ty-fill-white-color)] cursor-pointer transition-colors"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveCandidateConfig}
                    className="h-8 px-4 bg-[var(--ty-primary-color)] hover:opacity-90 text-white rounded-[4px] text-ty-xs font-medium shadow-2xs flex items-center space-x-1.5 cursor-pointer transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>确认配置</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 未保存修改确认弹窗 */}
        {showUnsavedConfirm && (
          <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-[var(--ty-fill-white-color)] rounded-[8px] shadow-lg border border-[var(--ty-border-color)] max-w-sm w-full p-4 space-y-3 animate-in zoom-in-95 duration-100">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-[var(--ty-orange-light-color)] text-[var(--ty-orange-color)] rounded-full shrink-0">
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
                  className="h-8 px-3 bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] text-[var(--ty-font-main-color)] hover:bg-[var(--ty-fill-weak-dark-color)] rounded-[4px] text-ty-xs font-medium cursor-pointer"
                >
                  继续选择
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowUnsavedConfirm(false);
                    onClose();
                  }}
                  className="h-8 px-3 bg-[var(--ty-red-color)] hover:opacity-90 text-white rounded-[4px] text-ty-xs font-medium cursor-pointer"
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
