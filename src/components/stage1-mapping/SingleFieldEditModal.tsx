import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  validateDisplayOrder
} from '../../stage1MappingTypes';
import { FieldMappingForm, FieldMappingFormData } from './FieldMappingForm';

const EMPTY_EXISTING_FIELDS: FieldMappingItem[] = [];

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
  existingFields = EMPTY_EXISTING_FIELDS,
  editingField,
  onSaveDraft,
  hasPermission = true
}) => {
  const isEditingExisting = !!editingField;
  const isEditingConfigured = editingField?.configStatus === 'CONFIGURED';
  const schemaLocked = Boolean(currentRootType.serviceStarted && isEditingExisting);

  const prevOpenRef = useRef(false);
  const prevEditingFieldIdRef = useRef<string | null>(null);
  const prevRootTypeIdRef = useRef<string | null>(null);

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
    isEnableHyperlink: false,
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
    return availablePlmFields.find(f => f.sourceFieldKey === formData.selectedSourceKey) ||
      (editingField?.sourceFieldKey === formData.selectedSourceKey
        ? editingField.draftData?.sourceMetadata || editingField.sourceMetadata || null
        : null);
  }, [availablePlmFields, formData.selectedSourceKey, editingField]);

  // 弹窗打开、切换编辑项或切换根类型时才回填，用户输入过程中绝不重新初始化
  useEffect(() => {
    if (!isOpen) {
      prevOpenRef.current = false;
      setShowUnsavedConfirm(false);
      setErrors({});
      return;
    }

    const isJustOpened = !prevOpenRef.current && isOpen;
    const isTargetChanged = (editingField ? editingField.id : null) !== prevEditingFieldIdRef.current;
    const isRootTypeChanged = currentRootType.id !== prevRootTypeIdRef.current;

    if (!isJustOpened && !isTargetChanged && !isRootTypeChanged) {
      return;
    }

    prevOpenRef.current = true;
    prevEditingFieldIdRef.current = editingField ? editingField.id : null;
    prevRootTypeIdRef.current = currentRootType.id;

    if (editingField) {
      const draft = editingField.hasDraftModification && editingField.draftData ? editingField.draftData : null;
      const initialOrder = draft?.displayOrder ?? draft?.defaultDisplayOrder ?? editingField.displayOrder ?? editingField.defaultDisplayOrder ?? 1;

      const rawDisplayType = draft?.displayType ?? editingField.displayType;
      const isHidden = rawDisplayType === 'HIDDEN';
      const isFulltext = rawDisplayType === 'FULLTEXT';
      const isLink = rawDisplayType === 'LINK' || !!(draft?.hyperlinkConfig ?? editingField?.hyperlinkConfig);

      const initialDisplayInResult = isHidden ? false : (draft?.isDisplayInResult ?? editingField?.isDisplayInResult ?? true);
      const initialFulltext = isFulltext ? true : (draft?.isFulltextSearch ?? editingField?.isFulltextSearch ?? false);
      const initialEnableHyperlink = isLink;

      const initialData: FieldMappingFormData = {
        selectedSourceKey: editingField.sourceFieldKey,
        displayTitle: draft?.displayTitle ?? editingField.displayTitle,
        displayOrder: initialOrder,
        defaultColumnWidth: draft?.defaultColumnWidth ?? editingField.defaultColumnWidth ?? 150,
        displayType: isLink ? 'LINK' : 'CONDITION_QUERY',
        manticoreField: editingField.manticoreField,
        manticoreType: editingField.manticoreType,
        isQueryCondition: draft?.isQueryCondition ?? editingField.isQueryCondition ?? true,
        isSortable: draft?.isSortable ?? editingField.isSortable ?? false,
        isDisplayInResult: initialDisplayInResult,
        isFulltextSearch: initialFulltext,
        isUniqueKey: draft?.isUniqueKey ?? editingField.isUniqueKey ?? false,
        isEnableHyperlink: initialEnableHyperlink,
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
      // 新建字段：默认顺序号必须为当前根类型最大顺序号加 1
      const nextOrder = getMaxDisplayOrder(existingFields, currentRootType.id) + 1;
      const firstAvailable = availablePlmFields[0];
      const defaultKey = firstAvailable ? firstAvailable.sourceFieldKey : '';

      const resolved = firstAvailable
        ? resolveSourceDisplayName(firstAvailable.sourceDisplayName, firstAvailable.sourceFieldName, firstAvailable.sourceFieldKey).resolvedName
        : '';

      const defaultManticore = firstAvailable
        ? firstAvailable.sourceFieldName.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '')
        : '';

      const isLongText = firstAvailable?.sourceDataType === 'LONG_TEXT';
      const isNum = firstAvailable?.sourceDataType === 'NUMERIC' || firstAvailable?.sourceDataType === 'NUMERIC_WITH_UNIT';

      const initialData: FieldMappingFormData = {
        selectedSourceKey: defaultKey,
        displayTitle: resolved,
        displayOrder: nextOrder,
        defaultColumnWidth: 150,
        displayType: 'CONDITION_QUERY',
        manticoreField: defaultManticore,
        manticoreType: isNum ? 'FLOAT' : isLongText ? 'TEXT' : 'STRING',
        isQueryCondition: true,
        isSortable: isNum,
        isDisplayInResult: true,
        isFulltextSearch: isLongText,
        isUniqueKey: false,
        isEnableHyperlink: false,
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
      ...partial,
      ...(schemaLocked ? { manticoreType: prev.manticoreType, isUniqueKey: prev.isUniqueKey } : {})
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

    if (formData.isEnableHyperlink || formData.displayType === 'LINK') {
      if (!formData.hyperlinkConfig?.urlTemplate?.trim()) {
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

    const finalDisplayType: FieldMappingItem['displayType'] = formData.isEnableHyperlink ? 'LINK' : 'CONDITION_QUERY';
    const finalHyperlinkConfig = formData.isEnableHyperlink ? formData.hyperlinkConfig : undefined;

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
          sourceMetadata: structuredClone(meta),
          displayTitle: formData.displayTitle.trim(),
          displayOrder: formData.displayOrder,
          defaultDisplayOrder: formData.displayOrder,
          displayType: finalDisplayType,
          queryCapability: derivedQueryCapability,
          isQueryCondition: formData.isQueryCondition,
          isSortable: formData.isSortable,
          isDisplayInResult: formData.isDisplayInResult,
          isFulltextSearch: formData.isFulltextSearch,
          isUniqueKey: formData.isUniqueKey,
          defaultColumnWidth: formData.defaultColumnWidth,
          hyperlinkConfig: finalHyperlinkConfig,
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
        sourceMetadata: structuredClone(meta),
        unitFamily: meta.unitFamily,
        defaultUnit: meta.defaultUnit,
        manticoreField: formData.manticoreField,
        manticoreType: formData.manticoreType,
        displayTitle: formData.displayTitle.trim(),
        displayOrder: formData.displayOrder,
        defaultDisplayOrder: formData.displayOrder,
        displayType: finalDisplayType,
        queryCapability: derivedQueryCapability,
        isQueryCondition: formData.isQueryCondition,
        isSortable: formData.isSortable,
        isDisplayInResult: formData.isDisplayInResult,
        isFulltextSearch: formData.isFulltextSearch,
        isUniqueKey: formData.isUniqueKey,
        defaultColumnWidth: formData.defaultColumnWidth,
        hyperlinkConfig: finalHyperlinkConfig,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ty-overlay backdrop-blur-xs px-4 py-[60px] overflow-y-auto">
      <section role="dialog" aria-modal="true" aria-label="字段映射配置" className="bg-[var(--ty-fill-white-color)] rounded-ty-lg shadow-ty-lg border border-[var(--ty-border-color)] w-[min(1000px,calc(100vw-32px))] flex flex-col max-h-[calc(100dvh-120px)] overflow-hidden animate-in fade-in zoom-in-95 duration-150 relative">
        {/* Header (固定顶部) */}
        <div className="px-5 py-4 border-b border-[var(--ty-border-color)] flex items-center justify-between bg-[var(--ty-fill-weak-dark-color)] shrink-0">
          <div className="space-y-0.5">
            <div className="flex items-center space-x-2">
              <h2 className="text-ty-lg font-semibold text-[var(--ty-font-main-color)] flex items-center">
                <Sliders className="w-4 h-4 mr-2 text-[var(--ty-primary-color)]" />
                {isEditingExisting ? (
                  isEditingConfigured ? '修改已配置字段映射 (生成草稿)' : '编辑草稿字段映射'
                ) : (
                  '新建单个字段映射 (生成草稿)'
                )}
              </h2>
              <span className="min-h-6 px-2 inline-flex items-center text-ty-2xs font-mono font-medium rounded-ty-sm bg-[var(--ty-fill-color)] text-[var(--ty-font-main-color)] border border-[var(--ty-border-color)]">
                根类型: {formatRootTypeDisplayName(currentRootType.name, currentRootType.code)}
              </span>
            </div>
            <p className="text-ty-xs text-[var(--ty-font-sub-color)]">
              单字段直接归属根类型，配置 PLM 来源元数据、业务展示、顺序号及 Manticore 底层检索属性。
            </p>
          </div>
          <button
            type="button"
            aria-label="关闭字段映射配置"
            onClick={handleRequestClose}
            className="text-[var(--ty-font-sub-light-color)] hover:text-[var(--ty-font-main-color)] cursor-pointer p-1 rounded-ty-sm hover:bg-[var(--ty-fill-dark-color)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 来源字段下拉选择器 (仅新建时允许切换属性) */}
        {!isEditingExisting && (
          <div className="px-5 py-2 bg-[var(--ty-primary-lighter-color)]/30 border-b border-[var(--ty-border-color)] flex items-center gap-3 shrink-0">
            <label className="text-ty-xs font-semibold text-[var(--ty-font-main-color)] whitespace-nowrap">
              选择 PLM 来源属性:
            </label>
            <div className="flex-1 max-w-md">
              <select
                aria-label="选择 PLM 来源属性"
                value={formData.selectedSourceKey}
                onChange={e => handleSourceFieldSelect(e.target.value)}
                className={`w-full h-8 px-3 bg-[var(--ty-fill-white-color)] border rounded-ty-sm text-ty-xs text-[var(--ty-font-main-color)] focus:outline-hidden focus:border-[var(--ty-primary-color)] cursor-pointer ${
                  errors.sourceField ? 'border-[var(--ty-red-color)]' : 'border-[var(--ty-border-color)]'
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
              <span className="text-ty-xs text-[var(--ty-red-color)]">{errors.sourceField}</span>
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
            schemaLocked={schemaLocked}
          />
        </div>

        {/* 底部固定操作栏 */}
        <div className="px-5 py-3 border-t border-[var(--ty-border-color)] bg-[var(--ty-fill-weak-dark-color)] flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2 text-ty-xs text-[var(--ty-font-sub-color)]">
            {isDirty && (
              <span className="inline-flex items-center text-[var(--ty-font-main-light-color)] font-medium bg-[var(--ty-orange-lightest-color)] min-h-6 px-2 inline-flex items-center rounded-ty-sm border border-[var(--ty-orange-color)]/30">
                <Clock className="w-3 h-3 mr-1 text-[var(--ty-orange-color)]" />
                表单存在未保存修改
              </span>
            )}
            <span className="text-ty-2xs text-[var(--ty-font-sub-light-color)]">
              * 保存后将作为草稿写入，需生效配置后方能进入正式环境
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={handleRequestClose}
              className="h-8 px-4 border border-[var(--ty-border-color)] rounded-ty-sm text-ty-xs font-medium text-[var(--ty-font-main-color)] hover:bg-[var(--ty-fill-color)] bg-[var(--ty-fill-white-color)] cursor-pointer transition-colors"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!hasPermission}
              className={`h-8 px-4 rounded-ty-sm text-ty-xs font-medium flex items-center space-x-2 transition-colors cursor-pointer ${
                hasPermission
                  ? 'bg-[var(--ty-primary-color)] hover:opacity-90 text-[var(--ty-font-white-color)]'
                  : 'bg-[var(--ty-fill-dark-color)] text-[var(--ty-font-sub-light-color)] cursor-not-allowed'
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
          <div className="absolute inset-0 z-50 bg-ty-overlay backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-[var(--ty-fill-white-color)] rounded-ty-lg shadow-ty-lg border border-[var(--ty-border-color)] max-w-sm w-full p-4 space-y-3 animate-in zoom-in-95 duration-100">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-[var(--ty-orange-lightest-color)] border border-[var(--ty-orange-color)]/30 text-[var(--ty-orange-color)] rounded-full shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-ty-xs font-bold text-[var(--ty-font-main-color)]">未保存修改确认</h4>
                  <p className="text-ty-xs text-[var(--ty-font-sub-color)] mt-1 leading-relaxed">
                    当前表单有尚未保存的配置更改。如果退出，所做的修改将会丢失。确定要退出吗？
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-[var(--ty-border-light-color)]">
                <button
                  type="button"
                  onClick={() => setShowUnsavedConfirm(false)}
                  className="h-8 px-3 bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] text-[var(--ty-font-main-color)] hover:bg-[var(--ty-fill-weak-dark-color)] rounded-ty-sm text-ty-xs font-medium cursor-pointer"
                >
                  继续编辑
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowUnsavedConfirm(false);
                    onClose();
                  }}
                  className="h-8 px-3 bg-[var(--ty-red-color)] hover:opacity-90 text-[var(--ty-font-white-color)] rounded-ty-sm text-ty-xs font-medium cursor-pointer"
                >
                  放弃修改并退出
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
