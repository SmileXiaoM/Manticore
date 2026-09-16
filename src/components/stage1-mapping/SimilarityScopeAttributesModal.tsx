import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Layers3, Tags, X } from 'lucide-react';
import {
  ClassificationDisplayMode,
  FieldMappingItem,
  MappingObjectType
} from '../../stage1MappingTypes';
import { HelpTooltip } from '../ui/HelpTooltip';

export interface SimilarityScopeAttributesUpdate {
  typeFieldId: string;
  classificationFieldId?: string;
  classificationDisplayMode: ClassificationDisplayMode;
}

interface SimilarityScopeAttributesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRootType: MappingObjectType;
  fields: FieldMappingItem[];
  onSave: (update: SimilarityScopeAttributesUpdate) => void;
  hasPermission?: boolean;
}

const effectiveField = (field: FieldMappingItem): FieldMappingItem => ({
  ...field,
  ...(field.draftData || {})
});

const isEligibleScopeField = (field: FieldMappingItem): boolean => {
  const effective = effectiveField(field);
  return Boolean(effective.manticoreField)
    && effective.manticoreType !== 'TEXT'
    && effective.manticoreType !== 'MULTI_VALUE'
    && effective.manticoreType !== 'JSON';
};

export const SimilarityScopeAttributesModal: React.FC<SimilarityScopeAttributesModalProps> = ({
  isOpen,
  onClose,
  currentRootType,
  fields,
  onSave,
  hasPermission = true
}) => {
  const rootFields = useMemo(
    () => fields.filter(field => field.rootTypeId === currentRootType.id).map(effectiveField).filter(isEligibleScopeField),
    [currentRootType.id, fields]
  );
  const currentTypeField = rootFields.find(field => field.similarityBusinessRole === 'TYPE_ATTRIBUTE');
  const currentClassificationField = rootFields.find(field => field.similarityBusinessRole === 'CLASSIFICATION_ATTRIBUTE');
  const [typeFieldId, setTypeFieldId] = useState('');
  const [classificationFieldId, setClassificationFieldId] = useState('');
  const [classificationDisplayMode, setClassificationDisplayMode] = useState<ClassificationDisplayMode>('FULL_PATH');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setTypeFieldId(currentTypeField?.id || '');
    setClassificationFieldId(currentClassificationField?.id || '');
    setClassificationDisplayMode(currentClassificationField?.classificationDisplayMode || 'FULL_PATH');
    setErrorMessage('');
  }, [currentClassificationField?.classificationDisplayMode, currentClassificationField?.id, currentTypeField?.id, isOpen]);

  if (!isOpen) return null;

  const typeOptions = rootFields.filter(field => field.id !== classificationFieldId);
  const classificationOptions = rootFields.filter(field => field.id !== typeFieldId);
  const selectedClassification = rootFields.find(field => field.id === classificationFieldId);

  const handleSave = () => {
    if (!typeFieldId) {
      setErrorMessage('请选择一个类型属性。类型属性用于识别零部件类型，是相似度规则的必选范围。');
      return;
    }
    if (classificationFieldId && classificationFieldId === typeFieldId) {
      setErrorMessage('同一属性不能同时作为类型属性和分类属性。');
      return;
    }
    onSave({
      typeFieldId,
      classificationFieldId: classificationFieldId || undefined,
      classificationDisplayMode
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-ty-overlay backdrop-blur-xs p-4">
      <section role="dialog" aria-modal="true" aria-labelledby="similarity-scope-attributes-title" className="w-[min(760px,calc(100vw-32px))] max-h-[calc(100dvh-48px)] overflow-hidden rounded-ty-lg border border-[var(--ty-border-color)] bg-white shadow-ty-lg flex flex-col">
        <header className="px-5 py-4 border-b border-[var(--ty-border-color)] bg-[var(--ty-fill-weak-dark-color)] flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Layers3 className="w-4 h-4 text-[var(--ty-primary-color)]" />
              <h2 id="similarity-scope-attributes-title" className="text-ty-lg font-semibold">设置类型与分类属性</h2>
              <HelpTooltip label="查看范围属性说明" content="每个根类型指定一个类型属性，并可指定一个分类属性。二阶段先按类型识别规则范围，再优先匹配分类专用规则；本页调整先保存为草稿。" />
            </div>
            <p className="mt-1 text-ty-xs text-[var(--ty-font-sub-color)]">这是当前根类型的统一设置，不需要逐个打开字段编辑。</p>
          </div>
          <button type="button" onClick={onClose} aria-label="关闭类型与分类属性设置" className="w-8 h-8 inline-flex items-center justify-center rounded-ty-sm text-[var(--ty-font-sub-light-color)] hover:bg-[var(--ty-fill-dark-color)]"><X className="w-4 h-4" /></button>
        </header>

        <div className="p-5 overflow-y-auto space-y-4">
          <section className="rounded-ty-sm border border-[var(--ty-border-color)] p-4 space-y-2">
            <label className="text-ty-xs font-semibold text-[var(--ty-font-main-color)]">类型属性 <span className="text-[var(--ty-red-color)]">*</span></label>
            <select value={typeFieldId} disabled={!hasPermission} onChange={event => { setTypeFieldId(event.target.value); setErrorMessage(''); }} className="w-full h-9 px-3 rounded-ty-sm border border-[var(--ty-border-color)] bg-white text-ty-xs disabled:bg-[var(--ty-fill-weak-dark-color)]">
              <option value="">请选择类型属性</option>
              {typeOptions.map(field => <option key={field.id} value={field.id}>{field.displayTitle}（{field.manticoreField}）</option>)}
            </select>
            <p className="text-ty-2xs text-[var(--ty-font-sub-color)]">必选且只能指定一个。例如选择“PLM 业务分类”，其值可识别为自制件、外购件等类型范围。</p>
          </section>

          <section className="rounded-ty-sm border border-[var(--ty-border-color)] p-4 space-y-3">
            <div className="space-y-2">
              <label className="text-ty-xs font-semibold text-[var(--ty-font-main-color)]">分类属性 <span className="text-[var(--ty-font-sub-light-color)]">（可选）</span></label>
              <select value={classificationFieldId} disabled={!hasPermission} onChange={event => { setClassificationFieldId(event.target.value); setErrorMessage(''); }} className="w-full h-9 px-3 rounded-ty-sm border border-[var(--ty-border-color)] bg-white text-ty-xs disabled:bg-[var(--ty-fill-weak-dark-color)]">
                <option value="">不设置分类属性</option>
                {classificationOptions.map(field => <option key={field.id} value={field.id}>{field.displayTitle}（{field.manticoreField}）</option>)}
              </select>
              <p className="text-ty-2xs text-[var(--ty-font-sub-color)]">设置后可为该属性的某个分类值建立分类专用规则；未设置时只维护类型通用规则。</p>
            </div>

            <div className={`rounded-ty-sm border p-3 space-y-2 ${classificationFieldId ? 'border-[var(--ty-primary-lighter-color)] bg-[var(--ty-primary-lightest-color)]/35' : 'border-[var(--ty-border-color)] bg-[var(--ty-fill-weak-dark-color)]'}`}>
              <label className="text-ty-xs font-semibold flex items-center gap-1.5"><Tags className="w-3.5 h-3.5 text-[var(--ty-primary-color)]" />分类显示方式</label>
              <select value={classificationDisplayMode} disabled={!hasPermission || !classificationFieldId} onChange={event => setClassificationDisplayMode(event.target.value as ClassificationDisplayMode)} className="w-full h-9 px-3 rounded-ty-sm border border-[var(--ty-border-color)] bg-white text-ty-xs disabled:bg-[var(--ty-fill-dark-color)] disabled:text-[var(--ty-font-sub-light-color)]">
                <option value="CURRENT_VALUE">当前值</option>
                <option value="FULL_PATH">完整路径</option>
                <option value="REVERSE_FULL_PATH">反向完整路径</option>
              </select>
              <p className="text-ty-2xs text-[var(--ty-font-sub-color)]">
                {classificationFieldId
                  ? <>“{selectedClassification?.displayTitle}”示例：{classificationDisplayMode === 'CURRENT_VALUE' ? '六角头螺栓' : classificationDisplayMode === 'FULL_PATH' ? '零部件 / 紧固件 / 螺栓 / 六角头螺栓' : '六角头螺栓 / 螺栓 / 紧固件 / 零部件'}</>
                  : '选择分类属性后可配置显示方式。'}
              </p>
            </div>
          </section>

          <div className="rounded-ty-sm border border-[var(--ty-orange-color)]/30 bg-[var(--ty-orange-lightest-color)] px-3 py-2 text-ty-xs text-[var(--ty-font-main-light-color)]">
            保存后形成草稿，不立即改变当前正式查询；发布配置后生效。更换类型或分类属性会影响二阶段规则范围识别。
          </div>
          {errorMessage && <div role="alert" className="rounded-ty-sm border border-[var(--ty-red-color)]/30 bg-[var(--ty-red-lightest-color)] px-3 py-2 text-ty-xs text-[var(--ty-red-color)]">{errorMessage}</div>}
        </div>

        <footer className="px-5 py-3 border-t border-[var(--ty-border-color)] bg-[var(--ty-fill-weak-dark-color)] flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-8 px-4 rounded-ty-sm border border-[var(--ty-border-color)] bg-white text-ty-xs font-medium">取消</button>
          <button type="button" onClick={handleSave} disabled={!hasPermission} className="h-8 px-4 rounded-ty-sm bg-[var(--ty-primary-color)] text-white text-ty-xs font-medium inline-flex items-center gap-1.5 disabled:opacity-40"><CheckCircle2 className="w-3.5 h-3.5" />保存为草稿</button>
        </footer>
      </section>
    </div>
  );
};
