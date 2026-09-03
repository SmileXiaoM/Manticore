import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Database,
  ArrowRight,
  HelpCircle,
  AlertCircle,
  Sliders,
  CheckCircle2,
  FileSpreadsheet,
  Layers,
  Link,
  Shield,
  Clock,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import {
  SourceFieldMeta,
  MappingObjectType,
  FieldMappingItem,
  ManticoreFieldType,
  HyperlinkConfig,
  checkIsDataImpactingChange,
  resolveSourceDisplayName
} from '../../stage1MappingTypes';

interface SingleFieldEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRootType: MappingObjectType;
  availablePlmFields: SourceFieldMeta[];
  editingField: FieldMappingItem | null;
  onSaveDraft: (savedField: FieldMappingItem) => void;
  hasPermission?: boolean;
}

export const SingleFieldEditModal: React.FC<SingleFieldEditModalProps> = ({
  isOpen,
  onClose,
  currentRootType,
  availablePlmFields,
  editingField,
  onSaveDraft,
  hasPermission = true
}) => {
  const isEditingExisting = !!editingField;
  const isEditingConfigured = editingField?.configStatus === 'CONFIGURED';

  const [selectedSourceKey, setSelectedSourceKey] = useState<string>('');
  const [displayTitle, setDisplayTitle] = useState<string>('');
  const [manticoreField, setManticoreField] = useState<string>('');
  const [manticoreType, setManticoreType] = useState<ManticoreFieldType>('STRING');
  const [displayType, setDisplayType] = useState<FieldMappingItem['displayType']>('CONDITION_QUERY');
  const [queryCapability, setQueryCapability] = useState<FieldMappingItem['queryCapability']>('QUERY_CONDITION');

  // 5 项关键能力
  const [isQueryCondition, setIsQueryCondition] = useState<boolean>(true);
  const [isSortable, setIsSortable] = useState<boolean>(false);
  const [isDisplayInResult, setIsDisplayInResult] = useState<boolean>(true);
  const [isFulltextSearch, setIsFulltextSearch] = useState<boolean>(false);
  const [isUniqueKey, setIsUniqueKey] = useState<boolean>(false);

  // 列宽与排序
  const [defaultColumnWidth, setDefaultColumnWidth] = useState<number>(150);
  const [defaultDisplayOrder, setDefaultDisplayOrder] = useState<number>(10);

  // 超链接参数
  const [urlTemplate, setUrlTemplate] = useState<string>('https://plm.internal.corp/app/view?oid={oid}&type={otype}');
  const [oidSourceField, setOidSourceField] = useState<string>('master_oid');
  const [otypeSourceField, setOtypeSourceField] = useState<string>('object_type_code');
  const [displayTextSource, setDisplayTextSource] = useState<'FIELD_VALUE' | 'STATIC_TEXT' | 'CUSTOM_TEMPLATE'>('FIELD_VALUE');
  const [staticLabel, setStaticLabel] = useState<string>('查看源数据');
  const [openTarget, setOpenTarget] = useState<'_blank' | '_self'>('_blank');
  const [onMissingParam, setOnMissingParam] = useState<'HIDE_LINK_SHOW_TEXT' | 'HIDE_ENTIRE_COLUMN' | 'SHOW_DISABLED_LINK'>('HIDE_LINK_SHOW_TEXT');

  // 校验与未保存放弃确认
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState<boolean>(false);
  const [initialSnapshot, setInitialSnapshot] = useState<string>('');

  // 选中的来源元数据
  const currentSelectedMeta = useMemo(() => {
    return availablePlmFields.find(f => f.sourceFieldKey === selectedSourceKey) || null;
  }, [availablePlmFields, selectedSourceKey]);

  // 显示名缺失判定
  const displayNameResolved = useMemo(() => {
    if (!currentSelectedMeta) return { resolvedName: '', isMissing: false };
    return resolveSourceDisplayName(
      currentSelectedMeta.sourceDisplayName,
      currentSelectedMeta.sourceFieldName,
      currentSelectedMeta.sourceFieldKey
    );
  }, [currentSelectedMeta]);

  // 弹窗打开或切换编辑项时回填
  useEffect(() => {
    if (!isOpen) {
      setShowUnsavedConfirm(false);
      setErrors({});
      return;
    }

    if (editingField) {
      const draft = editingField.hasDraftModification && editingField.draftData ? editingField.draftData : null;

      setSelectedSourceKey(editingField.sourceFieldKey);
      setDisplayTitle(draft?.displayTitle ?? editingField.displayTitle);
      setManticoreField(editingField.manticoreField);
      setManticoreType(editingField.manticoreType);
      setDisplayType(draft?.displayType ?? editingField.displayType);
      setQueryCapability(draft?.queryCapability ?? editingField.queryCapability);

      setIsQueryCondition(draft?.isQueryCondition ?? editingField.isQueryCondition ?? true);
      setIsSortable(draft?.isSortable ?? editingField.isSortable ?? false);
      setIsDisplayInResult(draft?.isDisplayInResult ?? editingField.isDisplayInResult ?? true);
      setIsFulltextSearch(draft?.isFulltextSearch ?? editingField.isFulltextSearch ?? false);
      setIsUniqueKey(draft?.isUniqueKey ?? editingField.isUniqueKey ?? false);

      setDefaultColumnWidth(draft?.defaultColumnWidth ?? editingField.defaultColumnWidth ?? 150);
      setDefaultDisplayOrder(editingField.defaultDisplayOrder ?? 10);

      if (editingField.hyperlinkConfig) {
        setUrlTemplate(editingField.hyperlinkConfig.urlTemplate || '');
        setOidSourceField(editingField.hyperlinkConfig.oidSourceField || 'master_oid');
        setOtypeSourceField(editingField.hyperlinkConfig.otypeSourceField || 'object_type_code');
        setDisplayTextSource(editingField.hyperlinkConfig.displayTextSource || 'FIELD_VALUE');
        setStaticLabel(editingField.hyperlinkConfig.staticLabel || '查看源数据');
        setOpenTarget(editingField.hyperlinkConfig.openTarget || '_blank');
        setOnMissingParam(editingField.hyperlinkConfig.onMissingParam || 'HIDE_LINK_SHOW_TEXT');
      }

      const snapshot = JSON.stringify({
        selectedSourceKey: editingField.sourceFieldKey,
        displayTitle: draft?.displayTitle ?? editingField.displayTitle,
        manticoreField: editingField.manticoreField,
        manticoreType: editingField.manticoreType,
        displayType: draft?.displayType ?? editingField.displayType,
        isQueryCondition: draft?.isQueryCondition ?? editingField.isQueryCondition ?? true,
        isSortable: draft?.isSortable ?? editingField.isSortable ?? false,
        isDisplayInResult: draft?.isDisplayInResult ?? editingField.isDisplayInResult ?? true,
        isFulltextSearch: draft?.isFulltextSearch ?? editingField.isFulltextSearch ?? false,
        isUniqueKey: draft?.isUniqueKey ?? editingField.isUniqueKey ?? false
      });
      setInitialSnapshot(snapshot);
    } else {
      const firstAvailable = availablePlmFields[0];
      const defaultKey = firstAvailable ? firstAvailable.sourceFieldKey : '';
      setSelectedSourceKey(defaultKey);

      const resolved = firstAvailable
        ? resolveSourceDisplayName(firstAvailable.sourceDisplayName, firstAvailable.sourceFieldName, firstAvailable.sourceFieldKey).resolvedName
        : '';
      setDisplayTitle(resolved);

      const defaultManticore = firstAvailable
        ? firstAvailable.sourceFieldName.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '')
        : '';
      setManticoreField(defaultManticore);
      setManticoreType(firstAvailable?.sourceDataType === 'NUMERIC' || firstAvailable?.sourceDataType === 'NUMERIC_WITH_UNIT' ? 'FLOAT' : firstAvailable?.sourceDataType === 'LONG_TEXT' ? 'TEXT' : 'STRING');
      setDisplayType('CONDITION_QUERY');
      setQueryCapability('QUERY_CONDITION');
      setIsQueryCondition(true);
      setIsSortable(false);
      setIsDisplayInResult(true);
      setIsFulltextSearch(false);
      setIsUniqueKey(false);
      setDefaultColumnWidth(150);
      setDefaultDisplayOrder(10);

      const snapshot = JSON.stringify({
        selectedSourceKey: defaultKey,
        displayTitle: resolved,
        manticoreField: defaultManticore,
        manticoreType: firstAvailable?.sourceDataType === 'NUMERIC' ? 'FLOAT' : 'STRING',
        displayType: 'CONDITION_QUERY',
        isQueryCondition: true,
        isSortable: false,
        isDisplayInResult: true,
        isFulltextSearch: false,
        isUniqueKey: false
      });
      setInitialSnapshot(snapshot);
    }
  }, [isOpen, editingField, availablePlmFields]);

  // 判断表单脏状态
  const isDirty = useMemo(() => {
    const currentSnapshot = JSON.stringify({
      selectedSourceKey,
      displayTitle,
      manticoreField,
      manticoreType,
      displayType,
      isQueryCondition,
      isSortable,
      isDisplayInResult,
      isFulltextSearch,
      isUniqueKey
    });
    return initialSnapshot !== '' && currentSnapshot !== initialSnapshot;
  }, [
    initialSnapshot,
    selectedSourceKey,
    displayTitle,
    manticoreField,
    manticoreType,
    displayType,
    isQueryCondition,
    isSortable,
    isDisplayInResult,
    isFulltextSearch,
    isUniqueKey
  ]);

  const handleRequestClose = () => {
    if (isDirty) {
      setShowUnsavedConfirm(true);
    } else {
      onClose();
    }
  };

  // 源字段选择联动推断
  const handleSourceFieldSelect = (key: string) => {
    setSelectedSourceKey(key);
    const meta = availablePlmFields.find(f => f.sourceFieldKey === key);
    if (!meta) return;

    if (!isEditingExisting) {
      const { resolvedName } = resolveSourceDisplayName(meta.sourceDisplayName, meta.sourceFieldName, meta.sourceFieldKey);
      setDisplayTitle(resolvedName);
      const suggestedName = meta.sourceFieldName
        .replace(/([A-Z])/g, '_$1')
        .toLowerCase()
        .replace(/^_/, '');
      setManticoreField(suggestedName);

      if (meta.sourceDataType === 'NUMERIC' || meta.sourceDataType === 'NUMERIC_WITH_UNIT') {
        setManticoreType('FLOAT');
        setIsSortable(true);
      } else if (meta.sourceDataType === 'LONG_TEXT') {
        setManticoreType('TEXT');
        setDisplayType('FULLTEXT');
        setIsFulltextSearch(true);
        setIsDisplayInResult(false);
        setQueryCapability('FULLTEXT_SEARCH');
      } else if (meta.sourceDataType === 'CATEGORY_TREE') {
        setManticoreType('STRING');
        setDisplayType('CATEGORY_PATH');
      } else if (meta.sourceDataType === 'ENUM') {
        setManticoreType('STRING');
        setDisplayType('ENUM_BADGE');
      } else {
        setManticoreType('STRING');
        setDisplayType('CONDITION_QUERY');
        setIsQueryCondition(true);
      }
    }
  };

  const derivedQueryCapability = useMemo<FieldMappingItem['queryCapability']>(() => {
    if (isQueryCondition && isFulltextSearch) return 'BOTH';
    if (isFulltextSearch) return 'FULLTEXT_SEARCH';
    if (isQueryCondition) return 'QUERY_CONDITION';
    return 'NONE';
  }, [isQueryCondition, isFulltextSearch]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!selectedSourceKey) {
      newErrors.sourceField = '请选择 PLM 来源字段';
    }

    if (!displayTitle.trim()) {
      newErrors.displayTitle = '前台显示名称为必填项，不可为空';
    }

    if (!manticoreField.trim()) {
      newErrors.manticoreField = 'Manticore 字段名不能为空';
    } else if (!/^[a-z][a-z0-9_]*$/.test(manticoreField)) {
      newErrors.manticoreField = 'Manticore 字段必须为全小写蛇形命名 (例如 part_number)';
    }

    if (displayType === 'LINK') {
      if (!urlTemplate.trim()) {
        newErrors.urlTemplate = '超链接 URL 模板不能为空';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const meta = currentSelectedMeta || {
      sourceFieldKey: selectedSourceKey,
      sourceFieldName: selectedSourceKey,
      sourceDisplayName: displayTitle,
      sourceDataType: 'TEXT' as const,
      sourceDataTypeLabel: '文本',
      isRequired: false
    };

    const { resolvedName: finalSourceDisplayName, isMissing } = resolveSourceDisplayName(
      editingField && editingField.sourceDisplayName.trim().length > 0 ? editingField.sourceDisplayName : meta.sourceDisplayName,
      meta.sourceFieldName,
      meta.sourceFieldKey
    );

    let hyperlink: HyperlinkConfig | undefined = undefined;
    if (displayType === 'LINK') {
      hyperlink = {
        urlTemplate,
        oidSourceField,
        otypeSourceField,
        displayTextSource,
        staticLabel: displayTextSource === 'STATIC_TEXT' ? staticLabel : undefined,
        openTarget,
        onMissingParam
      };
    }

    const isDataImpacting = checkIsDataImpactingChange(
      isEditingExisting && isEditingConfigured ? editingField : null,
      {
        manticoreField,
        manticoreType,
        sourceDataType: meta.sourceDataType,
        isQueryCondition,
        isFulltextSearch,
        queryCapability: derivedQueryCapability,
        isUniqueKey,
        sourceFieldKey: meta.sourceFieldKey
      }
    );

    if (isEditingExisting && isEditingConfigured && editingField) {
      // 已配置字段保存草稿修改
      const updatedField: FieldMappingItem = {
        ...editingField,
        hasDraftModification: true,
        draftData: {
          displayTitle: displayTitle.trim(),
          displayType,
          queryCapability: derivedQueryCapability,
          isQueryCondition,
          isSortable,
          isDisplayInResult,
          isFulltextSearch,
          isUniqueKey,
          defaultColumnWidth,
          hyperlinkConfig: hyperlink,
          isDataImpactingChange: isDataImpacting
        },
        isDataImpactingChange: isDataImpacting,
        updatedAt: '刚刚 (草稿修改)',
        updatedBy: '当前用户'
      };
      onSaveDraft(updatedField);
    } else {
      // 纯草稿新建或编辑
      const updatedField: FieldMappingItem = {
        id: editingField ? editingField.id : `MAP-${Date.now()}`,
        rootTypeId: currentRootType.id,
        sourceSystemId: currentRootType.sourceSystemId,
        sourceFieldKey: meta.sourceFieldKey,
        sourceFieldName: meta.sourceFieldName,
        sourceDisplayName: finalSourceDisplayName,
        isDisplayNameMissing: isMissing,
        sourceDataType: meta.sourceDataType,
        sourceDataTypeLabel: meta.sourceDataTypeLabel,
        unitFamily: meta.unitFamily,
        defaultUnit: meta.defaultUnit,
        manticoreField,
        manticoreType,
        displayTitle: displayTitle.trim(),
        displayType,
        queryCapability: derivedQueryCapability,
        isQueryCondition,
        isSortable,
        isDisplayInResult,
        isFulltextSearch,
        isUniqueKey,
        defaultColumnWidth,
        defaultDisplayOrder,
        hyperlinkConfig: hyperlink,
        configStatus: 'DRAFT',
        hasDraftModification: false,
        isDataImpactingChange: isDataImpacting,
        isInFormalQueryBase: false,
        updatedAt: '刚刚 (草稿新建)',
        updatedBy: '当前用户'
      };
      onSaveDraft(updatedField);
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-[8px] shadow-xl border border-slate-200 max-w-5xl w-full flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150 relative">
        {/* Header (固定顶部) */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="space-y-0.5">
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center">
                <Sliders className="w-4 h-4 mr-1.5 text-blue-600" />
                {isEditingExisting ? (
                  isEditingConfigured ? '修改已配置字段映射 (生成草稿)' : '编辑草稿字段映射'
                ) : (
                  '新建单个字段映射 (生成草稿)'
                )}
              </h3>
              <span className="px-2 py-0.5 text-[11px] font-mono font-medium rounded-[4px] bg-slate-100 text-slate-800 border border-slate-200">
                根类型: {currentRootType.name}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              单字段直接归属根类型，三段式配置 PLM 来源元数据、业务展示与 Manticore 底层检索属性。
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

        {/* Form Body (可滚动区域，大屏三列，窄屏820px自适应单列) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            
            {/* 1. PLM 来源元数据 */}
            <div className="bg-slate-50/80 border border-slate-200 rounded-[8px] p-4 space-y-3.5 flex flex-col">
              <div className="flex items-center space-x-2 border-b border-slate-200 pb-2.5">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                  1
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">PLM 来源元数据</h4>
                  <p className="text-[11px] text-slate-500">源系统与对象属性定义</p>
                </div>
              </div>

              {/* 来源字段选择器 */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  选择 PLM 属性 <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedSourceKey}
                  onChange={e => handleSourceFieldSelect(e.target.value)}
                  disabled={isEditingExisting}
                  className={`w-full h-8 px-2.5 bg-white border rounded-[6px] text-xs text-slate-800 focus:outline-hidden focus:border-blue-500 ${
                    errors.sourceField ? 'border-rose-400' : 'border-slate-300'
                  } ${isEditingExisting ? 'bg-slate-100 cursor-not-allowed opacity-80' : 'cursor-pointer'}`}
                >
                  <option value="">-- 请选择来源字段 --</option>
                  {availablePlmFields.map(meta => {
                    const { resolvedName, isMissing } = resolveSourceDisplayName(
                      meta.sourceDisplayName,
                      meta.sourceFieldName,
                      meta.sourceFieldKey
                    );
                    return (
                      <option key={meta.sourceFieldKey} value={meta.sourceFieldKey}>
                        {resolvedName} ({meta.sourceFieldName}){isMissing ? ' [显示名未获取]' : ''} - {meta.sourceDataTypeLabel}
                      </option>
                    );
                  })}
                </select>
                {errors.sourceField && (
                  <p className="text-[11px] text-rose-500">{errors.sourceField}</p>
                )}
              </div>

              {/* PLM 显示名缺失告警提示 */}
              {displayNameResolved.isMissing && (
                <div className="bg-amber-50 border border-amber-200 rounded-[6px] p-2.5 text-xs text-amber-800 space-y-1">
                  <div className="flex items-center space-x-1 font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>PLM 未返回显示名 (元数据告警)</span>
                  </div>
                  <p className="text-[11px] text-amber-700 leading-normal">
                    已自动按字段名 <span className="font-mono font-bold">{displayNameResolved.resolvedName}</span> 兜底。请在右侧“前台显示名称”确认或补充标准名称。
                  </p>
                </div>
              )}

              {/* PLM 元数据详情 */}
              {currentSelectedMeta && (
                <div className="bg-white border border-slate-200 rounded-[6px] p-3 text-xs space-y-2 flex-1">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    PLM 元数据详情
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-400">字段编码:</span>
                      <div className="font-mono text-slate-800 font-semibold truncate">
                        {currentSelectedMeta.sourceFieldName}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400">业务类型:</span>
                      <div className="font-medium text-slate-800">
                        {currentSelectedMeta.sourceDataTypeLabel}
                      </div>
                    </div>
                  </div>

                  {currentSelectedMeta.defaultUnit && (
                    <div className="text-[11px]">
                      <span className="text-slate-400">单位族 / 默认单位:</span>
                      <div className="font-medium text-blue-700">
                        {currentSelectedMeta.unitFamily || '标量'} ({currentSelectedMeta.defaultUnit})
                      </div>
                    </div>
                  )}

                  {currentSelectedMeta.enumOptions && (
                    <div className="text-[11px]">
                      <span className="text-slate-400">受控枚举选项 ({currentSelectedMeta.enumOptions.length}):</span>
                      <div className="flex flex-wrap gap-1 mt-1 max-h-20 overflow-y-auto">
                        {currentSelectedMeta.enumOptions.map(opt => (
                          <span
                            key={opt.code}
                            className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px]"
                          >
                            {opt.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 2. 映射与业务展示 */}
            <div className="bg-slate-50/80 border border-slate-200 rounded-[8px] p-4 space-y-3.5 flex flex-col">
              <div className="flex items-center space-x-2 border-b border-slate-200 pb-2.5">
                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                  2
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">映射与业务展示</h4>
                  <p className="text-[11px] text-slate-500">用户界面显示名称与渲染样式</p>
                </div>
              </div>

              {/* 前台显示名称 */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  前台显示名称 <span className="text-rose-500">* (必填)</span>
                </label>
                <input
                  type="text"
                  value={displayTitle}
                  onChange={e => setDisplayTitle(e.target.value)}
                  placeholder="例如：物料编码 / 额定工作电压"
                  className={`w-full h-8 px-2.5 bg-white border rounded-[6px] text-xs text-slate-800 focus:outline-hidden focus:border-blue-500 ${
                    errors.displayTitle ? 'border-rose-400' : 'border-slate-300'
                  }`}
                />
                {errors.displayTitle && (
                  <p className="text-[11px] text-rose-500">{errors.displayTitle}</p>
                )}
              </div>

              {/* 展示渲染类型 */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">展示渲染方式</label>
                <select
                  value={displayType}
                  onChange={e => setDisplayType(e.target.value as any)}
                  className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded-[6px] text-xs text-slate-800 focus:outline-hidden focus:border-blue-500 cursor-pointer"
                >
                  <option value="CONDITION_QUERY">标准条件 / 文本数值</option>
                  <option value="LINK">超链接跳转 (PLM/外部系统)</option>
                  <option value="FULLTEXT">全文大字段高亮</option>
                  <option value="CATEGORY_PATH">分类树路径面包屑</option>
                  <option value="ENUM_BADGE">彩色枚举状态标签</option>
                  <option value="HIDDEN">仅索引不直接展示</option>
                </select>
              </div>

              {/* 超链接配置 */}
              {displayType === 'LINK' && (
                <div className="bg-white border border-blue-200 rounded-[6px] p-3 space-y-2.5 text-xs animate-in fade-in">
                  <div className="flex items-center text-blue-800 font-semibold text-[11px]">
                    <Link className="w-3.5 h-3.5 mr-1 text-blue-600" />
                    超链接跳转参数映射
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-600 font-medium">URL 模板</label>
                    <input
                      type="text"
                      value={urlTemplate}
                      onChange={e => setUrlTemplate(e.target.value)}
                      placeholder="https://plm.corp/view?oid={oid}&type={otype}"
                      className="w-full h-7 px-2 bg-slate-50 border border-slate-300 rounded-[4px] text-[11px] font-mono text-slate-800"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-500">{'{oid}'} 来源字段:</span>
                      <input
                        type="text"
                        value={oidSourceField}
                        onChange={e => setOidSourceField(e.target.value)}
                        className="w-full h-7 px-2 bg-slate-50 border border-slate-300 rounded-[4px] font-mono text-slate-800 mt-0.5"
                      />
                    </div>
                    <div>
                      <span className="text-slate-500">{'{otype}'} 来源字段:</span>
                      <input
                        type="text"
                        value={otypeSourceField}
                        onChange={e => setOtypeSourceField(e.target.value)}
                        className="w-full h-7 px-2 bg-slate-50 border border-slate-300 rounded-[4px] font-mono text-slate-800 mt-0.5"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 默认列宽 */}
              <div className="space-y-1 pt-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-700">默认表格列宽 (px)</span>
                  <span className="font-mono text-slate-600">{defaultColumnWidth} px</span>
                </div>
                <input
                  type="range"
                  min="80"
                  max="350"
                  step="10"
                  value={defaultColumnWidth}
                  onChange={e => setDefaultColumnWidth(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>
            </div>

            {/* 3. Manticore 底层配置 */}
            <div className="bg-slate-50/80 border border-slate-200 rounded-[8px] p-4 space-y-3.5 flex flex-col">
              <div className="flex items-center space-x-2 border-b border-slate-200 pb-2.5">
                <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
                  3
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Manticore 底层配置</h4>
                  <p className="text-[11px] text-slate-500">检索物理字段与 5 项核心能力</p>
                </div>
              </div>

              {/* Manticore 物理字段名 */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Manticore 物理字段名 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={manticoreField}
                  onChange={e => setManticoreField(e.target.value.toLowerCase())}
                  disabled={isEditingConfigured}
                  placeholder="例如：part_number"
                  className={`w-full h-8 px-2.5 bg-white border rounded-[6px] text-xs font-mono text-blue-700 font-semibold focus:outline-hidden focus:border-blue-500 ${
                    errors.manticoreField ? 'border-rose-400' : 'border-slate-300'
                  } ${isEditingConfigured ? 'bg-slate-100 cursor-not-allowed opacity-80' : ''}`}
                />
                {errors.manticoreField && (
                  <p className="text-[11px] text-rose-500">{errors.manticoreField}</p>
                )}
                {isEditingConfigured && (
                  <p className="text-[10px] text-slate-400">已配置字段的物理名称不可更改</p>
                )}
              </div>

              {/* Manticore 存储类型 */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Manticore 存储类型
                </label>
                <select
                  value={manticoreType}
                  onChange={e => setManticoreType(e.target.value as ManticoreFieldType)}
                  disabled={isEditingConfigured}
                  className={`w-full h-8 px-2.5 bg-white border border-slate-300 rounded-[6px] text-xs font-mono text-slate-800 focus:outline-hidden focus:border-blue-500 ${
                    isEditingConfigured ? 'bg-slate-100 cursor-not-allowed opacity-80' : 'cursor-pointer'
                  }`}
                >
                  <option value="STRING">STRING (标量字符串)</option>
                  <option value="TEXT">TEXT (全文分词检索)</option>
                  <option value="FLOAT">FLOAT (浮点数/度量)</option>
                  <option value="INTEGER">INTEGER (整型)</option>
                  <option value="TIMESTAMP">TIMESTAMP (时间戳)</option>
                  <option value="JSON">JSON (扩展属性树)</option>
                </select>
              </div>

              {/* 5 项检索与展示能力配置 */}
              <div className="bg-white border border-slate-200 rounded-[6px] p-3 space-y-2 flex-1">
                <div className="text-[11px] font-semibold text-slate-700 mb-1 flex items-center">
                  <Shield className="w-3.5 h-3.5 mr-1 text-purple-600" />
                  5 项检索与展示能力配置
                </div>

                <div className="space-y-1.5 text-xs">
                  <label className="flex items-center space-x-2 cursor-pointer hover:bg-slate-50 p-1 rounded-[4px] transition-colors">
                    <input
                      type="checkbox"
                      checked={isQueryCondition}
                      onChange={e => setIsQueryCondition(e.target.checked)}
                      className="rounded text-blue-600 cursor-pointer"
                    />
                    <span className="text-slate-800">允许作为精确/范围查询条件</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer hover:bg-slate-50 p-1 rounded-[4px] transition-colors">
                    <input
                      type="checkbox"
                      checked={isSortable}
                      disabled={manticoreType === 'TEXT'}
                      onChange={e => setIsSortable(e.target.checked)}
                      className="rounded text-blue-600 cursor-pointer disabled:opacity-40"
                    />
                    <span className={manticoreType === 'TEXT' ? 'text-slate-400' : 'text-slate-800'}>
                      支持多列升降排序 (非TEXT)
                    </span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer hover:bg-slate-50 p-1 rounded-[4px] transition-colors">
                    <input
                      type="checkbox"
                      checked={isDisplayInResult}
                      onChange={e => setIsDisplayInResult(e.target.checked)}
                      className="rounded text-blue-600 cursor-pointer"
                    />
                    <span className="text-slate-800">在正式查询表格结果列展示</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer hover:bg-slate-50 p-1 rounded-[4px] transition-colors">
                    <input
                      type="checkbox"
                      checked={isFulltextSearch}
                      onChange={e => setIsFulltextSearch(e.target.checked)}
                      className="rounded text-purple-600 cursor-pointer"
                    />
                    <span className="text-slate-800">加入全局全文分词检索</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer hover:bg-slate-50 p-1 rounded-[4px] transition-colors">
                    <input
                      type="checkbox"
                      checked={isUniqueKey}
                      onChange={e => setIsUniqueKey(e.target.checked)}
                      className="rounded text-amber-600 cursor-pointer"
                    />
                    <span className="text-slate-800 font-medium">作为业务唯一键 (Unique Key)</span>
                  </label>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* 底部固定操作栏 (统一 32px 按钮高度) */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            {isDirty && (
              <span className="inline-flex items-center text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded-[4px] border border-amber-200">
                <Clock className="w-3 h-3 mr-1 text-amber-600" />
                表单存在未保存修改
              </span>
            )}
            <span className="text-[11px] text-slate-400">
              * 保存后将作为草稿写入，需生效配置后方能进入正式环境
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
              onClick={handleSave}
              disabled={!hasPermission}
              className={`h-8 px-4 rounded-[6px] text-xs font-medium shadow-2xs flex items-center space-x-1.5 transition-colors cursor-pointer ${
                hasPermission
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>
                {isEditingExisting && isEditingConfigured ? '保存草稿修改' : '保存为草稿'}
              </span>
            </button>
          </div>
        </div>

        {/* 未保存修改确认弹窗 */}
        {showUnsavedConfirm && (
          <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-[8px] shadow-xl border border-slate-200 max-w-sm w-full p-4 space-y-3 animate-in zoom-in-95 duration-100">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-amber-100 text-amber-700 rounded-full shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">未保存修改确认</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    当前表单有尚未保存的配置更改。如果退出，所做的修改将会丢失。确定要退出吗？
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUnsavedConfirm(false)}
                  className="h-8 px-3 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-[6px] text-xs font-medium cursor-pointer"
                >
                  继续编辑
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowUnsavedConfirm(false);
                    onClose();
                  }}
                  className="h-8 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-[6px] text-xs font-medium cursor-pointer"
                >
                  放弃修改并退出
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
