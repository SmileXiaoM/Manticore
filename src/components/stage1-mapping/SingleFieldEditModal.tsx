import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Sliders,
  CheckCircle2,
  Clock,
  AlertTriangle
} from 'lucide-react';
import {
  SourceFieldMeta,
  MappingObjectType,
  FieldMappingItem,
  HyperlinkConfig,
  checkIsDataImpactingChange,
  resolveSourceDisplayName,
  formatRootTypeDisplayName,
  getMaxDisplayOrder,
  isDisplayOrderOccupied,
  validateDisplayOrder
} from '../../stage1MappingTypes';
import { FieldMappingForm, FieldMappingFormData } from './FieldMappingForm';

interface SingleFieldEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRootType: MappingObjectType;
  availablePlmFields: SourceFieldMeta[];
  existingFields?: FieldMappingItem[];
  editingField: FieldMappingItem | null;
  onSaveDraft: (savedField: FieldMappingItem) => void;
  hasPermission?: boolean;
}

export const SingleFieldEditModal: React.FC<SingleFieldEditModalProps> = ({
  isOpen,
  onClose,
  currentRootType,
  availablePlmFields,
  existingFields = [],
  editingField,
  onSaveDraft,
  hasPermission = true
}) => {
  const isEditingExisting = !!editingField;
  const isEditingConfigured = editingField?.configStatus === 'CONFIGURED';

  const [formData, setFormData] = useState<FieldMappingFormData>({
    selectedSourceKey: '',
    displayTitle: '',
    displayOrder: 1,
    defaultColumnWidth: 150,
    displayType: 'CONDITION_QUERY',
    manticoreField: '',
    manticoreType: 'STRING',
    isQueryCondition: true,
    isSortable: false,
    isDisplayInResult: true,
    isFulltextSearch: false,
    isUniqueKey: false,
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

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState<boolean>(false);
  const [initialSnapshot, setInitialSnapshot] = useState<string>('');

  // 当前选中的来源元数据
  const currentSelectedMeta = useMemo(() => {
    return availablePlmFields.find(f => f.sourceFieldKey === formData.selectedSourceKey) || null;
  }, [availablePlmFields, formData.selectedSourceKey]);

  // 弹窗打开或切换编辑项时回填
  useEffect(() => {
    if (!isOpen) {
      setShowUnsavedConfirm(false);
      setErrors({});
      return;
    }

    if (editingField) {
      const draft = editingField.hasDraftModification && editingField.draftData ? editingField.draftData : null;
      const initialOrder = draft?.displayOrder ?? draft?.defaultDisplayOrder ?? editingField.displayOrder ?? editingField.defaultDisplayOrder ?? 1;

      const initialData: FieldMappingFormData = {
        selectedSourceKey: editingField.sourceFieldKey,
        displayTitle: draft?.displayTitle ?? editingField.displayTitle,
        displayOrder: initialOrder,
        defaultColumnWidth: draft?.defaultColumnWidth ?? editingField.defaultColumnWidth ?? 150,
        displayType: draft?.displayType ?? editingField.displayType,
        manticoreField: editingField.manticoreField,
        manticoreType: editingField.manticoreType,
        isQueryCondition: draft?.isQueryCondition ?? editingField.isQueryCondition ?? true,
        isSortable: draft?.isSortable ?? editingField.isSortable ?? false,
        isDisplayInResult: draft?.isDisplayInResult ?? editingField.isDisplayInResult ?? true,
        isFulltextSearch: draft?.isFulltextSearch ?? editingField.isFulltextSearch ?? false,
        isUniqueKey: draft?.isUniqueKey ?? editingField.isUniqueKey ?? false,
        hyperlinkConfig: draft?.hyperlinkConfig ?? editingField.hyperlinkConfig ?? {
          urlTemplate: 'https://plm.internal.corp/app/view?oid={oid}&type={otype}',
          oidSourceField: 'master_oid',
          otypeSourceField: 'object_type_code',
          displayTextSource: 'FIELD_VALUE',
          staticLabel: '查看源数据',
          openTarget: '_blank',
          onMissingParam: 'HIDE_LINK_SHOW_TEXT'
        }
      };

      setFormData(initialData);
      setInitialSnapshot(JSON.stringify(initialData));
    } else {
      // 新建字段：默认顺序号取当前根类型已有最大顺序号加 1
      const nextOrder = getMaxDisplayOrder(existingFields, currentRootType.id) + 1;
      const firstAvailable = availablePlmFields[0];
      const defaultKey = firstAvailable ? firstAvailable.sourceFieldKey : '';

      const resolved = firstAvailable
        ? resolveSourceDisplayName(firstAvailable.sourceDisplayName, firstAvailable.sourceFieldName, firstAvailable.sourceFieldKey).resolvedName
        : '';

      const defaultManticore = firstAvailable
        ? firstAvailable.sourceFieldName.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '')
        : '';

      const initialData: FieldMappingFormData = {
        selectedSourceKey: defaultKey,
        displayTitle: resolved,
        displayOrder: nextOrder,
        defaultColumnWidth: 150,
        displayType: 'CONDITION_QUERY',
        manticoreField: defaultManticore,
        manticoreType: firstAvailable?.sourceDataType === 'NUMERIC' || firstAvailable?.sourceDataType === 'NUMERIC_WITH_UNIT' ? 'FLOAT' : firstAvailable?.sourceDataType === 'LONG_TEXT' ? 'TEXT' : 'STRING',
        isQueryCondition: true,
        isSortable: firstAvailable?.sourceDataType === 'NUMERIC' || firstAvailable?.sourceDataType === 'NUMERIC_WITH_UNIT',
        isDisplayInResult: true,
        isFulltextSearch: firstAvailable?.sourceDataType === 'LONG_TEXT',
        isUniqueKey: false,
        hyperlinkConfig: {
          urlTemplate: 'https://plm.internal.corp/app/view?oid={oid}&type={otype}',
          oidSourceField: 'master_oid',
          otypeSourceField: 'object_type_code',
          displayTextSource: 'FIELD_VALUE',
          staticLabel: '查看源数据',
          openTarget: '_blank',
          onMissingParam: 'HIDE_LINK_SHOW_TEXT'
        }
      };

      setFormData(initialData);
      setInitialSnapshot(JSON.stringify(initialData));
    }
  }, [isOpen, editingField, availablePlmFields, existingFields, currentRootType.id]);

  // 判断脏状态
  const isDirty = useMemo(() => {
    return initialSnapshot !== '' && JSON.stringify(formData) !== initialSnapshot;
  }, [initialSnapshot, formData]);

  const handleRequestClose = () => {
    if (isDirty) {
      setShowUnsavedConfirm(true);
    } else {
      onClose();
    }
  };

  // 源字段选择联动推断
  const handleSourceFieldSelect = (key: string) => {
    const meta = availablePlmFields.find(f => f.sourceFieldKey === key);
    if (!meta) {
      setFormData(prev => ({ ...prev, selectedSourceKey: key }));
      return;
    }

    if (!isEditingExisting) {
      const { resolvedName } = resolveSourceDisplayName(meta.sourceDisplayName, meta.sourceFieldName, meta.sourceFieldKey);
      const suggestedName = meta.sourceFieldName
        .replace(/([A-Z])/g, '_$1')
        .toLowerCase()
        .replace(/^_/, '');

      let suggestedType: FieldMappingFormData['manticoreType'] = 'STRING';
      let suggestedDisplay: FieldMappingFormData['displayType'] = 'CONDITION_QUERY';
      let suggestedSortable = false;
      let suggestedFulltext = false;

      if (meta.sourceDataType === 'NUMERIC' || meta.sourceDataType === 'NUMERIC_WITH_UNIT') {
        suggestedType = 'FLOAT';
        suggestedSortable = true;
      } else if (meta.sourceDataType === 'LONG_TEXT') {
        suggestedType = 'TEXT';
        suggestedDisplay = 'FULLTEXT';
        suggestedFulltext = true;
      } else if (meta.sourceDataType === 'CATEGORY_TREE') {
        suggestedDisplay = 'CATEGORY_PATH';
      } else if (meta.sourceDataType === 'ENUM') {
        suggestedDisplay = 'ENUM_BADGE';
      }

      setFormData(prev => ({
        ...prev,
        selectedSourceKey: key,
        displayTitle: resolvedName,
        manticoreField: suggestedName,
        manticoreType: suggestedType,
        displayType: suggestedDisplay,
        isSortable: suggestedSortable,
        isFulltextSearch: suggestedFulltext
      }));
    } else {
      setFormData(prev => ({ ...prev, selectedSourceKey: key }));
    }
  };

  const handleFormChange = (partial: Partial<FieldMappingFormData>) => {
    setFormData(prev => ({
      ...prev,
      ...partial
    }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.selectedSourceKey) {
      newErrors.sourceField = '请选择 PLM 来源字段';
    }

    if (!formData.displayTitle.trim()) {
      newErrors.displayTitle = '前台显示名称为必填项，不可为空';
    }

    // 校验顺序号
    const orderValidation = validateDisplayOrder(
      formData.displayOrder,
      existingFields,
      currentRootType.id,
      editingField?.id
    );
    if (!orderValidation.valid && orderValidation.errorMessage) {
      newErrors.displayOrder = orderValidation.errorMessage;
    }

    if (!formData.manticoreField.trim()) {
      newErrors.manticoreField = 'Manticore 字段名不能为空';
    } else if (!/^[a-z][a-z0-9_]*$/.test(formData.manticoreField)) {
      newErrors.manticoreField = 'Manticore 字段必须为全小写蛇形命名 (例如 part_number)';
    }

    if (formData.displayType === 'LINK') {
      if (!formData.hyperlinkConfig?.urlTemplate.trim()) {
        newErrors.urlTemplate = '超链接 URL 模板不能为空';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    const meta = currentSelectedMeta || {
      sourceFieldKey: formData.selectedSourceKey,
      sourceFieldName: formData.selectedSourceKey,
      sourceDisplayName: formData.displayTitle,
      sourceDataType: 'TEXT' as const,
      sourceDataTypeLabel: '文本',
      isRequired: false
    };

    // 显示名缺失兼容不得回退：已经保存的非空显示名称不得被后续空值覆盖
    const existingDisplayName = editingField?.sourceDisplayName;
    const { resolvedName: finalSourceDisplayName, isMissing } = resolveSourceDisplayName(
      existingDisplayName && existingDisplayName.trim().length > 0 ? existingDisplayName : meta.sourceDisplayName,
      meta.sourceFieldName,
      meta.sourceFieldKey
    );

    const derivedQueryCapability: FieldMappingItem['queryCapability'] =
      formData.isQueryCondition && formData.isFulltextSearch
        ? 'BOTH'
        : formData.isFulltextSearch
        ? 'FULLTEXT_SEARCH'
        : formData.isQueryCondition
        ? 'QUERY_CONDITION'
        : 'NONE';

    const isDataImpacting = checkIsDataImpactingChange(
      isEditingExisting && isEditingConfigured ? editingField : null,
      {
        manticoreField: formData.manticoreField,
        manticoreType: formData.manticoreType,
        sourceDataType: meta.sourceDataType,
        isQueryCondition: formData.isQueryCondition,
        isFulltextSearch: formData.isFulltextSearch,
        queryCapability: derivedQueryCapability,
        isUniqueKey: formData.isUniqueKey,
        sourceFieldKey: meta.sourceFieldKey
      }
    );

    if (isEditingExisting && isEditingConfigured && editingField) {
      // 已配置字段保存草稿修改 (顺序号修改属于展示调整，进入草稿)
      const updatedField: FieldMappingItem = {
        ...editingField,
        hasDraftModification: true,
        draftData: {
          displayTitle: formData.displayTitle.trim(),
          displayOrder: formData.displayOrder,
          defaultDisplayOrder: formData.displayOrder,
          displayType: formData.displayType,
          queryCapability: derivedQueryCapability,
          isQueryCondition: formData.isQueryCondition,
          isSortable: formData.isSortable,
          isDisplayInResult: formData.isDisplayInResult,
          isFulltextSearch: formData.isFulltextSearch,
          isUniqueKey: formData.isUniqueKey,
          defaultColumnWidth: formData.defaultColumnWidth,
          hyperlinkConfig: formData.displayType === 'LINK' ? formData.hyperlinkConfig : undefined,
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
        manticoreField: formData.manticoreField,
        manticoreType: formData.manticoreType,
        displayTitle: formData.displayTitle.trim(),
        displayOrder: formData.displayOrder,
        defaultDisplayOrder: formData.displayOrder,
        displayType: formData.displayType,
        queryCapability: derivedQueryCapability,
        isQueryCondition: formData.isQueryCondition,
        isSortable: formData.isSortable,
        isDisplayInResult: formData.isDisplayInResult,
        isFulltextSearch: formData.isFulltextSearch,
        isUniqueKey: formData.isUniqueKey,
        defaultColumnWidth: formData.defaultColumnWidth,
        hyperlinkConfig: formData.displayType === 'LINK' ? formData.hyperlinkConfig : undefined,
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
                根类型: {formatRootTypeDisplayName(currentRootType.name, currentRootType.code)}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              单字段直接归属根类型，配置 PLM 来源元数据、业务展示、顺序号及 Manticore 底层检索属性。
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

        {/* 来源字段下拉选择器 (仅新建时允许切换属性) */}
        {!isEditingExisting && (
          <div className="px-5 py-2.5 bg-blue-50/40 border-b border-slate-200 flex items-center gap-3 shrink-0">
            <label className="text-xs font-semibold text-slate-700 whitespace-nowrap">
              选择 PLM 来源属性:
            </label>
            <div className="flex-1 max-w-md">
              <select
                value={formData.selectedSourceKey}
                onChange={e => handleSourceFieldSelect(e.target.value)}
                className={`w-full h-8 px-2.5 bg-white border rounded-[6px] text-xs text-slate-800 focus:outline-hidden focus:border-blue-500 cursor-pointer ${
                  errors.sourceField ? 'border-rose-400' : 'border-slate-300'
                }`}
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
            </div>
            {errors.sourceField && (
              <span className="text-xs text-rose-500">{errors.sourceField}</span>
            )}
          </div>
        )}

        {/* Form Body - 使用提取的公共 FieldMappingForm 组件 */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          <FieldMappingForm
            currentRootType={currentRootType}
            sourceMeta={currentSelectedMeta}
            formData={formData}
            onChange={handleFormChange}
            errors={errors}
            isEditingConfigured={isEditingConfigured}
            sourceReadonly={isEditingExisting}
          />
        </div>

        {/* 底部固定操作栏 */}
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
