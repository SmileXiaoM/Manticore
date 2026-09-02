import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  AlertCircle,
  HelpCircle,
  Link2,
  Sliders,
  Settings,
  Info,
  CheckCircle2
} from 'lucide-react';
import {
  FieldMappingItem,
  MappingObjectType,
  MappingSoftType,
  SourceFieldMeta,
  ManticoreFieldType,
  HyperlinkConfig
} from '../../stage1MappingTypes';

interface SingleFieldEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRootType: MappingObjectType;
  currentSoftType: MappingSoftType;
  availablePlmFields: SourceFieldMeta[];
  existingFieldMappings: FieldMappingItem[];
  editingField?: FieldMappingItem | null; // 若为 null 则为新建
  onSaveDraft: (fieldData: FieldMappingItem) => void;
  hasPermission?: boolean;
}

export const SingleFieldEditModal: React.FC<SingleFieldEditModalProps> = ({
  isOpen,
  onClose,
  currentRootType,
  currentSoftType,
  availablePlmFields,
  existingFieldMappings,
  editingField,
  onSaveDraft,
  hasPermission = true
}) => {
  if (!isOpen) return null;

  const isEditMode = !!editingField;
  const isEditingActiveField = isEditMode && editingField?.configStatus === 'ACTIVE';

  // 1. 对象类型与来源字段
  const [selectedSoftTypeId, setSelectedSoftTypeId] = useState<string>(
    editingField?.softTypeId || currentSoftType.id
  );
  const [selectedSourceKey, setSelectedSourceKey] = useState<string>(
    editingField?.sourceFieldKey || (availablePlmFields[0]?.sourceFieldKey ?? '')
  );

  const activeSourceMeta = availablePlmFields.find(f => f.sourceFieldKey === selectedSourceKey);

  // 2. 表单主体字段
  const [displayTitle, setDisplayTitle] = useState<string>(
    editingField?.displayTitle || ''
  );
  const [manticoreField, setManticoreField] = useState<string>(
    editingField?.manticoreField || ''
  );
  const [manticoreType, setManticoreType] = useState<string>(
    editingField?.manticoreType ? editingField.manticoreType.toLowerCase() : 'string'
  );
  const [sourceDataType, setSourceDataType] = useState<SourceFieldMeta['sourceDataType']>(
    editingField?.sourceDataType || (activeSourceMeta?.sourceDataType || 'TEXT')
  );
  const [displayType, setDisplayType] = useState<FieldMappingItem['displayType']>(
    editingField?.displayType || 'LINK'
  );

  // 3. 超链接配置
  const [hyperlinkConfig, setHyperlinkConfig] = useState<HyperlinkConfig>(
    editingField?.hyperlinkConfig || {
      urlTemplate: '/plm/object/{otype}/{oid}',
      oidSourceField: 'OID',
      otypeSourceField: 'otype',
      displayTextSource: 'FIELD_VALUE',
      openTarget: '_blank',
      onMissingParam: 'HIDE_LINK_SHOW_TEXT'
    }
  );

  // 4. 查询与展示能力开关 (对照图片 5 项)
  const [isQueryCondition, setIsQueryCondition] = useState<boolean>(
    editingField?.isQueryCondition ?? (editingField?.queryCapability === 'QUERY_CONDITION' || editingField?.queryCapability === 'BOTH' || true)
  );
  const [isDisplayInResult, setIsDisplayInResult] = useState<boolean>(
    editingField ? editingField.isDisplayInResult : true
  );
  const [isSortable, setIsSortable] = useState<boolean>(
    editingField ? editingField.isSortable : false
  );
  const [isFulltextSearch, setIsFulltextSearch] = useState<boolean>(
    editingField?.isFulltextSearch ?? (editingField?.queryCapability === 'FULLTEXT_SEARCH' || editingField?.queryCapability === 'BOTH' || false)
  );
  const [isUniqueKey, setIsUniqueKey] = useState<boolean>(
    editingField?.isUniqueKey ?? (editingField?.sourceFieldKey?.includes('oid') || editingField?.sourceFieldKey?.includes('part_number') || false)
  );

  // 辅助列宽和显示顺序
  const [defaultColumnWidth, setDefaultColumnWidth] = useState<number | undefined>(
    editingField?.defaultColumnWidth
  );
  const [defaultDisplayOrder, setDefaultDisplayOrder] = useState<number | undefined>(
    editingField?.defaultDisplayOrder
  );

  // 校验与提示错误
  const [validationError, setValidationError] = useState<string | null>(null);

  // 智能根据来源元数据推断默认 Manticore 字段及类型 (仅在新建切换来源字段时)
  useEffect(() => {
    if (!isEditMode && activeSourceMeta) {
      // 生成默认 Manticore 字段名 (下划线转小写)
      const defaultManticore = activeSourceMeta.sourceFieldName
        .replace(/([A-Z])/g, '_$1')
        .toLowerCase()
        .replace(/^_/, '');
      setManticoreField(defaultManticore);
      setDisplayTitle(activeSourceMeta.sourceDisplayName);
      setSourceDataType(activeSourceMeta.sourceDataType);

      // 类型推断
      if (activeSourceMeta.sourceDataType === 'NUMERIC' || activeSourceMeta.sourceDataType === 'NUMERIC_WITH_UNIT') {
        setManticoreType('float');
        setDisplayType('CONDITION_QUERY');
        setIsFulltextSearch(false);
        setIsSortable(true);
      } else if (activeSourceMeta.sourceDataType === 'LONG_TEXT') {
        setManticoreType('text');
        setDisplayType('FULLTEXT');
        setIsFulltextSearch(true);
        setIsDisplayInResult(false);
        setIsSortable(false);
      } else if (activeSourceMeta.sourceDataType === 'CATEGORY_TREE') {
        setManticoreType('string');
        setDisplayType('CATEGORY_PATH');
        setIsFulltextSearch(false);
      } else if (activeSourceMeta.sourceDataType === 'ENUM') {
        setManticoreType('string');
        setDisplayType('ENUM_BADGE');
        setIsFulltextSearch(false);
      } else if (activeSourceMeta.sourceFieldKey.includes('number') || activeSourceMeta.sourceFieldKey.includes('code')) {
        setManticoreType('string');
        setDisplayType('LINK');
        setIsFulltextSearch(false);
        setIsSortable(true);
      } else {
        setManticoreType('string');
        setDisplayType('CONDITION_QUERY');
      }
    }
  }, [selectedSourceKey, isEditMode, activeSourceMeta]);

  // 处理保存草稿
  const handleSave = () => {
    setValidationError(null);

    // 必填项校验
    if (!selectedSourceKey || !activeSourceMeta) {
      setValidationError('请选择源字段。');
      return;
    }
    if (!displayTitle.trim()) {
      setValidationError('显示名称不能为空。');
      return;
    }
    if (!manticoreField.trim()) {
      setValidationError('Manticore 字段不能为空。');
      return;
    }
    // 命名规范检查 (仅允许字母、数字、下划线)
    if (!/^[a-z0-9_]+$/.test(manticoreField.trim())) {
      setValidationError('Manticore 字段仅支持小写字母、数字与下划线 (snake_case)。');
      return;
    }

    // 重复性检查 (检查是否有除当前字段外的同名 Manticore 字段)
    const duplicateManticore = existingFieldMappings.find(
      f =>
        f.rootTypeId === currentRootType.id &&
        f.softTypeId === currentSoftType.id &&
        f.manticoreField.toLowerCase() === manticoreField.trim().toLowerCase() &&
        f.id !== editingField?.id
    );
    if (duplicateManticore) {
      setValidationError(`Manticore 字段名 "${manticoreField}" 已被占用，请更换。`);
      return;
    }

    // 映射 queryCapability
    let computedQueryCap: FieldMappingItem['queryCapability'] = 'NONE';
    if (isQueryCondition && isFulltextSearch) computedQueryCap = 'BOTH';
    else if (isQueryCondition) computedQueryCap = 'QUERY_CONDITION';
    else if (isFulltextSearch) computedQueryCap = 'FULLTEXT_SEARCH';

    const normalizedManticoreType = manticoreType.toUpperCase() as ManticoreFieldType;

    // 构建保存实体
    if (isEditMode && editingField) {
      if (isEditingActiveField) {
        // 对已生效字段的编辑：形成草稿修改，保留原已生效实体不变
        const updatedField: FieldMappingItem = {
          ...editingField,
          hasDraftModification: true,
          draftData: {
            displayTitle: displayTitle.trim(),
            displayType,
            queryCapability: computedQueryCap,
            isQueryCondition,
            isSortable,
            isDisplayInResult,
            isFulltextSearch,
            isUniqueKey,
            defaultColumnWidth: isDisplayInResult ? defaultColumnWidth : undefined,
            defaultDisplayOrder: isDisplayInResult ? defaultDisplayOrder : undefined,
            hyperlinkConfig: displayType === 'LINK' ? hyperlinkConfig : undefined
          },
          updatedAt: '2026-09-02 10:00:00',
          updatedBy: '当前登录用户 (草稿编辑)'
        };
        onSaveDraft(updatedField);
      } else {
        // 对纯草稿的编辑：直接更新草稿内容
        const updatedDraft: FieldMappingItem = {
          ...editingField,
          manticoreField: manticoreField.trim(),
          manticoreType: normalizedManticoreType,
          displayTitle: displayTitle.trim(),
          displayType,
          queryCapability: computedQueryCap,
          isQueryCondition,
          isSortable,
          isDisplayInResult,
          isFulltextSearch,
          isUniqueKey,
          defaultColumnWidth: isDisplayInResult ? defaultColumnWidth : undefined,
          defaultDisplayOrder: isDisplayInResult ? defaultDisplayOrder : undefined,
          hyperlinkConfig: displayType === 'LINK' ? hyperlinkConfig : undefined,
          updatedAt: '2026-09-02 10:00:00',
          updatedBy: '当前登录用户 (草稿)'
        };
        onSaveDraft(updatedDraft);
      }
    } else {
      // 单个新建草稿
      const newDraftItem: FieldMappingItem = {
        id: `MAP-DRAFT-${Date.now()}`,
        rootTypeId: currentRootType.id,
        softTypeId: currentSoftType.id,
        sourceFieldKey: activeSourceMeta.sourceFieldKey,
        sourceFieldName: activeSourceMeta.sourceFieldName,
        sourceDisplayName: activeSourceMeta.sourceDisplayName,
        sourceDataType: sourceDataType,
        sourceDataTypeLabel: activeSourceMeta.sourceDataTypeLabel,
        unitFamily: activeSourceMeta.unitFamily,
        defaultUnit: activeSourceMeta.defaultUnit,
        manticoreField: manticoreField.trim(),
        manticoreType: normalizedManticoreType,
        displayTitle: displayTitle.trim(),
        displayType,
        queryCapability: computedQueryCap,
        isQueryCondition,
        isSortable,
        isDisplayInResult,
        isFulltextSearch,
        isUniqueKey,
        defaultColumnWidth: isDisplayInResult ? defaultColumnWidth : undefined,
        defaultDisplayOrder: isDisplayInResult ? defaultDisplayOrder : undefined,
        hyperlinkConfig: displayType === 'LINK' ? hyperlinkConfig : undefined,
        configStatus: 'DRAFT',
        hasDraftModification: false,
        dataStatus: 'NO_SYNC_NEEDED', // 未发布的草稿不参与同步
        isDataImpactingChange: true,
        lastConfigVersion: `${currentSoftType.activeConfigVersion || 'v1.0.0'}-draft`,
        updatedAt: '2026-09-02 10:00:00',
        updatedBy: '当前登录用户 (新建草稿)'
      };
      onSaveDraft(newDraftItem);
    }

    onClose();
  };

  const objectNameLabel = currentRootType.code === 'Part' ? '零部件' : currentRootType.name.replace(/ \(.*\)/, '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-4xl w-full flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* 顶部标题栏 */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center space-x-2">
            <span className="w-1 h-4.5 bg-blue-600 rounded-xs inline-block"></span>
            <h3 className="text-base font-bold text-slate-900">
              {isEditMode ? '编辑' : '新建'}{objectNameLabel}字段映射
            </h3>
            <span className="px-2 py-0.5 text-[11px] font-mono font-semibold rounded bg-slate-100 text-slate-700">
              {currentSoftType.name}
            </span>
            {isEditingActiveField && (
              <span className="px-2 py-0.5 text-[11px] font-semibold rounded bg-amber-100 text-amber-800 border border-amber-200">
                生效中 (保存将生成草稿修改)
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 校验错误提示条 */}
        {validationError && (
          <div className="px-6 py-2 bg-rose-50 border-b border-rose-200 text-xs text-rose-700 flex items-center shrink-0">
            <AlertCircle className="w-4 h-4 text-rose-600 mr-2 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* 表单主体区域 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* 上半部分：2 列标准表单网格 (完全匹配设计图) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            
            {/* 左 1：对象类型 */}
            <div className="flex items-center">
              <label className="w-28 text-right text-xs text-slate-700 font-medium shrink-0 mr-3">
                <span className="text-rose-500 mr-1">*</span>对象类型:
              </label>
              <select
                value={selectedSoftTypeId}
                onChange={e => setSelectedSoftTypeId(e.target.value)}
                disabled={isEditMode}
                className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-hidden focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
              >
                {currentRootType.softTypes.map(soft => (
                  <option key={soft.id} value={soft.id}>
                    {currentRootType.name} / {soft.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 右 1：源字段 */}
            <div className="flex items-center">
              <label className="w-28 text-right text-xs text-slate-700 font-medium shrink-0 mr-3">
                <span className="text-rose-500 mr-1">*</span>源字段:
              </label>
              {isEditMode ? (
                <div className="flex-1 px-3 py-1.5 bg-slate-100 border border-slate-300 rounded text-xs text-slate-800 font-mono flex justify-between items-center">
                  <span>{activeSourceMeta?.sourceFieldName || editingField?.sourceFieldName}</span>
                  <span className="text-slate-400 text-[11px] font-sans">
                    {activeSourceMeta?.sourceDisplayName || editingField?.sourceDisplayName}
                  </span>
                </div>
              ) : (
                <select
                  value={selectedSourceKey}
                  onChange={e => setSelectedSourceKey(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-hidden focus:border-blue-500"
                >
                  {availablePlmFields.map(field => (
                    <option key={field.sourceFieldKey} value={field.sourceFieldKey}>
                      {field.sourceFieldName} ({field.sourceDisplayName}) - {field.sourceDataTypeLabel}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* 左 2：显示名称 */}
            <div className="flex items-center">
              <label className="w-28 text-right text-xs text-slate-700 font-medium shrink-0 mr-3">
                <span className="text-rose-500 mr-1">*</span>显示名称:
              </label>
              <input
                type="text"
                value={displayTitle}
                onChange={e => setDisplayTitle(e.target.value)}
                placeholder="请输入"
                className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-900 focus:outline-hidden focus:border-blue-500 placeholder:text-slate-400"
              />
            </div>

            {/* 右 2：Manticore 字段 */}
            <div className="flex items-center">
              <label className="w-28 text-right text-xs text-slate-700 font-medium shrink-0 mr-3">
                <span className="text-rose-500 mr-1">*</span>Manticore 字段:
              </label>
              <input
                type="text"
                value={manticoreField}
                onChange={e => setManticoreField(e.target.value)}
                disabled={isEditingActiveField}
                placeholder="请输入"
                className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-900 font-mono focus:outline-hidden focus:border-blue-500 placeholder:text-slate-400 disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>

            {/* 左 3：Manticore 类型 */}
            <div className="flex items-center">
              <label className="w-28 text-right text-xs text-slate-700 font-medium shrink-0 mr-3">
                <span className="text-rose-500 mr-1">*</span>Manticore 类型:
              </label>
              <select
                value={manticoreType}
                onChange={e => setManticoreType(e.target.value)}
                disabled={isEditingActiveField}
                className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-hidden focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
              >
                <option value="string">string</option>
                <option value="text">text</option>
                <option value="float">float</option>
                <option value="integer">integer</option>
                <option value="timestamp">timestamp</option>
                <option value="boolean">boolean</option>
                <option value="json">json</option>
                <option value="multi_value">multi_value</option>
              </select>
            </div>

            {/* 右 3：业务字段类型 */}
            <div className="flex items-center">
              <label className="w-28 text-right text-xs text-slate-700 font-medium shrink-0 mr-3">
                <span className="text-rose-500 mr-1">*</span>业务字段类型:
              </label>
              <select
                value={sourceDataType}
                onChange={e => setSourceDataType(e.target.value as SourceFieldMeta['sourceDataType'])}
                className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-hidden focus:border-blue-500"
              >
                <option value="TEXT">文本 (TEXT)</option>
                <option value="LONG_TEXT">长文本 (LONG_TEXT)</option>
                <option value="NUMERIC_WITH_UNIT">带单位数值 (NUMERIC_WITH_UNIT)</option>
                <option value="NUMERIC">浮点数 (NUMERIC)</option>
                <option value="ENUM">枚举 (ENUM)</option>
                <option value="CATEGORY_TREE">分类树 (CATEGORY_TREE)</option>
                <option value="DATE">日期时间 (DATE)</option>
                <option value="BOOLEAN">布尔值 (BOOLEAN)</option>
              </select>
            </div>

            {/* 左 4：显示名称来源 / 显示类型 */}
            <div className="flex items-center">
              <label className="w-28 text-right text-xs text-slate-700 font-medium shrink-0 mr-3">
                <span className="text-rose-500 mr-1">*</span>显示名称来源:
              </label>
              <select
                value={displayType}
                onChange={e => setDisplayType(e.target.value as FieldMappingItem['displayType'])}
                className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-hidden focus:border-blue-500"
              >
                <option value="LINK">超链接</option>
                <option value="CONDITION_QUERY">标准文本显示</option>
                <option value="ENUM_BADGE">枚举状态标签</option>
                <option value="CATEGORY_PATH">分类树路径</option>
                <option value="FULLTEXT">全文大字段</option>
                <option value="HIDDEN">隐藏 (仅供索引)</option>
              </select>
            </div>

            {/* 右 4：占位对齐 */}
            <div className="hidden md:block"></div>
          </div>

          {/* 中间部分：超链接参数来源 (仅在显示类型为 LINK 时展示，100% 对齐设计图) */}
          {displayType === 'LINK' && (
            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3.5">
              <h4 className="text-xs font-bold text-slate-900">超链接参数来源</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                
                {/* 左 1：显示文本来源 */}
                <div className="flex items-center">
                  <label className="w-28 text-right text-xs text-slate-700 font-medium shrink-0 mr-3">
                    <span className="text-rose-500 mr-1">*</span>显示文本来源:
                  </label>
                  <select
                    value={hyperlinkConfig.displayTextSource}
                    onChange={e =>
                      setHyperlinkConfig({
                        ...hyperlinkConfig,
                        displayTextSource: e.target.value as HyperlinkConfig['displayTextSource']
                      })
                    }
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="FIELD_VALUE">当前字段值 (FIELD_VALUE)</option>
                    <option value="STATIC_TEXT">固定自定义文本</option>
                    <option value="CUSTOM_TEMPLATE">动态模板拼接</option>
                  </select>
                </div>

                {/* 右 1：OID来源 */}
                <div className="flex items-center">
                  <label className="w-28 text-right text-xs text-slate-700 font-medium shrink-0 mr-3">
                    <span className="text-rose-500 mr-1">*</span>OID来源:
                  </label>
                  <input
                    type="text"
                    value={hyperlinkConfig.oidSourceField}
                    onChange={e =>
                      setHyperlinkConfig({ ...hyperlinkConfig, oidSourceField: e.target.value })
                    }
                    placeholder="OID"
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-900 font-mono focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                {/* 左 2：OTYPE来源 */}
                <div className="flex items-center">
                  <label className="w-28 text-right text-xs text-slate-700 font-medium shrink-0 mr-3">
                    <span className="text-rose-500 mr-1">*</span>OTYPE来源:
                  </label>
                  <input
                    type="text"
                    value={hyperlinkConfig.otypeSourceField}
                    onChange={e =>
                      setHyperlinkConfig({ ...hyperlinkConfig, otypeSourceField: e.target.value })
                    }
                    placeholder="otype"
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-900 font-mono focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                {/* 右 2：URL模版 */}
                <div className="flex items-center">
                  <label className="w-28 text-right text-xs text-slate-700 font-medium shrink-0 mr-3">
                    <span className="text-rose-500 mr-1">*</span>URL模版:
                  </label>
                  <input
                    type="text"
                    value={hyperlinkConfig.urlTemplate}
                    onChange={e =>
                      setHyperlinkConfig({ ...hyperlinkConfig, urlTemplate: e.target.value })
                    }
                    placeholder="/plm/object/{otype}/{oid}"
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-900 font-mono focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                {/* 左 3：打开方式 */}
                <div className="flex items-center">
                  <label className="w-28 text-right text-xs text-slate-700 font-medium shrink-0 mr-3">
                    <span className="text-rose-500 mr-1">*</span>打开方式:
                  </label>
                  <select
                    value={hyperlinkConfig.openTarget}
                    onChange={e =>
                      setHyperlinkConfig({
                        ...hyperlinkConfig,
                        openTarget: e.target.value as '_blank' | '_self'
                      })
                    }
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="_blank">新窗口打开</option>
                    <option value="_self">当前窗口打开</option>
                  </select>
                </div>

                {/* 右 3：缺失参数处理 */}
                <div className="flex items-center">
                  <label className="w-28 text-right text-xs text-slate-700 font-medium shrink-0 mr-3">
                    <span className="text-rose-500 mr-1">*</span>缺失参数处理:
                  </label>
                  <select
                    value={hyperlinkConfig.onMissingParam}
                    onChange={e =>
                      setHyperlinkConfig({
                        ...hyperlinkConfig,
                        onMissingParam: e.target.value as HyperlinkConfig['onMissingParam']
                      })
                    }
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="HIDE_LINK_SHOW_TEXT">隐藏打开入口</option>
                    <option value="SHOW_DISABLED_LINK">显示禁用链接</option>
                    <option value="HIDE_ENTIRE_COLUMN">不展示此列</option>
                  </select>
                </div>
              </div>

              {/* 辅助说明 */}
              <div className="text-[11px] text-slate-400 mt-2 pl-31 leading-relaxed">
                OID 和 OTYPE 不要求所有对象固定字段名；哪个字段展示为超链接，就在这里声明它需要从哪些同步字段取跳转参数。
              </div>
            </div>
          )}

          {/* 下半部分：查询与展示能力 (100% 对齐设计图) */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <span className="w-1 h-4 bg-blue-600 rounded-xs inline-block"></span>
              <h4 className="text-sm font-bold text-slate-900">查询与展示能力</h4>
            </div>

            {/* 5 个能力复选框横向排列 */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-slate-800 pt-1">
              <label className="flex items-center space-x-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isQueryCondition}
                  onChange={e => setIsQueryCondition(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <span>作为独立查询条件</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isDisplayInResult}
                  onChange={e => setIsDisplayInResult(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <span>在查询结果中展示</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isSortable}
                  onChange={e => setIsSortable(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <span>允许排序</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isFulltextSearch}
                  onChange={e => setIsFulltextSearch(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <span>进入全文大字段</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isUniqueKey}
                  onChange={e => setIsUniqueKey(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <span>对象同步唯一键</span>
              </label>
            </div>

            {/* 当勾选在查询结果中展示时的轻量辅助配置 (列宽与顺序) */}
            {isDisplayInResult && (
              <div className="flex items-center space-x-6 text-xs text-slate-600 pt-2 border-t border-slate-100">
                <div className="flex items-center space-x-2">
                  <span>默认列宽 (px):</span>
                  <input
                    type="number"
                    value={defaultColumnWidth || ''}
                    onChange={e =>
                      setDefaultColumnWidth(e.target.value ? Number(e.target.value) : undefined)
                    }
                    placeholder="自适应"
                    className="w-24 px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-900"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <span>显示顺序:</span>
                  <input
                    type="number"
                    value={defaultDisplayOrder || ''}
                    onChange={e =>
                      setDefaultDisplayOrder(e.target.value ? Number(e.target.value) : undefined)
                    }
                    placeholder="末尾"
                    className="w-24 px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-900"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 底部按钮栏 */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            {isEditingActiveField ? (
              <span className="text-amber-700">保存后仅更新草稿版本，需在主表点击「发布配置」方可生效。</span>
            ) : (
              <span>保存后将作为「草稿」存储，不参与正式查询与数据同步。</span>
            )}
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              onClick={onClose}
              className="px-4 py-1.5 border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={!hasPermission}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold shadow-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>保存为草稿</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
