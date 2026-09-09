import React, { useMemo } from 'react';
import { SourceAttributeDetails } from './SourceAttributeDetails';
import {
  Link,
  Shield
} from 'lucide-react';
import {
  SourceFieldMeta,
  MappingObjectType,
  FieldMappingItem,
  ManticoreFieldType,
  HyperlinkConfig,
  resolveSourceDisplayName
} from '../../stage1MappingTypes';

export interface FieldMappingFormData {
  selectedSourceKey: string;
  displayTitle: string;
  displayOrder: number;
  defaultColumnWidth: number;
  manticoreField: string;
  manticoreType: ManticoreFieldType;
  isQueryCondition: boolean;
  isSortable: boolean;
  isDisplayInResult: boolean;
  isFulltextSearch: boolean;
  isUniqueKey: boolean;
  isEnableHyperlink: boolean;
  hyperlinkConfig?: HyperlinkConfig;
  displayType?: FieldMappingItem['displayType'];
}

export interface FieldMappingFormProps {
  currentRootType: MappingObjectType;
  sourceMeta: SourceFieldMeta | null;
  formData: FieldMappingFormData;
  onChange: (updated: Partial<FieldMappingFormData>) => void;
  errors: Record<string, string>;
  isEditingConfigured?: boolean;
  sourceReadonly?: boolean;
}

export const FieldMappingForm: React.FC<FieldMappingFormProps> = ({
  currentRootType,
  sourceMeta,
  formData,
  onChange,
  errors,
  isEditingConfigured = false,
  sourceReadonly = false
}) => {
  // 解析显示名与兜底判断
  const displayNameResolved = useMemo(() => {
    if (!sourceMeta) return { resolvedName: '', isMissing: false };
    return resolveSourceDisplayName(
      sourceMeta.sourceDisplayName,
      sourceMeta.sourceFieldName,
      sourceMeta.sourceFieldKey
    );
  }, [sourceMeta]);

  const hyperlink = formData.hyperlinkConfig || {
    urlTemplate: 'https://plm.internal.corp/app/view?oid={oid}&type={otype}',
    oidSourceField: 'master_oid',
    otypeSourceField: 'object_type_code',
    displayTextSource: 'FIELD_VALUE',
    staticLabel: '查看源数据',
    openTarget: '_blank',
    onMissingParam: 'HIDE_LINK_SHOW_TEXT'
  };

  const updateHyperlink = (partial: Partial<HyperlinkConfig>) => {
    onChange({
      hyperlinkConfig: {
        ...hyperlink,
        ...partial
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* 1. PLM 来源定义：只读摘要，避免与目标配置争抢页面空间 */}
      <div className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-lg p-3">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-[var(--ty-primary-lighter-color)] text-[var(--ty-primary-color)] flex items-center justify-center font-bold text-ty-xs">1</div><div><h4 className="text-ty-xs font-bold">PLM 来源定义</h4><p className="text-ty-2xs text-[var(--ty-font-sub-color)]">随所选来源属性自动带出，只读</p></div></div>
          {sourceMeta?.isExampleMetadata && <span className="text-ty-2xs min-h-6 px-2 inline-flex items-center bg-[var(--ty-fill-color)] text-[var(--ty-font-sub-color)] rounded-ty-xs">示例元数据</span>}
        </div>
        {sourceMeta ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 rounded-ty-sm bg-[var(--ty-fill-weak-dark-color)] border border-[var(--ty-border-light-color)] px-3 py-2 text-ty-xs">
            <div><span className="text-ty-2xs text-[var(--ty-font-sub-color)] block">属性</span><strong>{sourceMeta.sourceDisplayName?.trim() || sourceMeta.sourceFieldName}</strong><code className="text-ty-2xs text-[var(--ty-font-sub-color)] block">{sourceMeta.sourceFieldName} · {sourceMeta.sourceFieldKey}</code>{displayNameResolved.isMissing && <span className="text-ty-2xs text-[var(--ty-orange-color)]">显示名已按字段名兜底</span>}</div>
            <div><span className="text-ty-2xs text-[var(--ty-font-sub-color)] block">PLM 类型</span><strong>{sourceMeta.sourceDataTypeLabel}</strong><span className="text-ty-2xs text-[var(--ty-font-sub-color)] block">{sourceMeta.isRequired ? '必填' : '选填'}{sourceMeta.defaultUnit ? ` · ${sourceMeta.defaultUnit}` : ''}</span></div>
            <div className="md:col-span-2"><span className="text-ty-2xs text-[var(--ty-font-sub-color)] block">来源属性特征</span><SourceAttributeDetails meta={sourceMeta} compact /></div>
          </div>
        ) : <div className="rounded-ty-sm bg-[var(--ty-fill-weak-dark-color)] border border-[var(--ty-border-light-color)] p-3 text-center text-ty-xs text-[var(--ty-font-sub-color)]">请先选择 PLM 来源属性</div>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* 2. 映射与业务展示 */}
      <div className="bg-[var(--ty-fill-weak-dark-color)] border border-[var(--ty-border-color)] rounded-ty-lg p-4 space-y-4 flex flex-col">
        <div className="flex items-center space-x-2 border-b border-[var(--ty-border-color)] pb-2">
          <div className="w-6 h-6 rounded-full bg-[var(--ty-green-lightest-color)] border border-[var(--ty-green-color)]/30 text-[var(--ty-green-color)] flex items-center justify-center font-bold text-ty-xs">
            2
          </div>
          <div>
            <h4 className="text-ty-xs font-bold text-[var(--ty-font-main-color)]">映射与业务展示</h4>
            <p className="text-ty-2xs text-[var(--ty-font-sub-color)]">前台显示名称、顺序号与列宽</p>
          </div>
        </div>

        {/* 前台显示名称 */}
        <div className="space-y-1">
          <label className="block text-ty-xs font-semibold text-[var(--ty-font-main-color)]">
            前台显示名称 <span className="text-[var(--ty-red-color)]">* (必填)</span>
          </label>
          <input
            type="text"
            value={formData.displayTitle}
            onChange={e => onChange({ displayTitle: e.target.value })}
            placeholder="例如：物料编码 / 规格型号"
            className={`w-full h-8 px-3 bg-[var(--ty-fill-white-color)] border rounded-ty-sm text-ty-xs text-[var(--ty-font-main-color)] focus:outline-hidden focus:border-[var(--ty-primary-color)] ${
              errors.displayTitle ? 'border-[var(--ty-red-color)]' : 'border-[var(--ty-border-color)]'
            }`}
          />
          {errors.displayTitle && (
            <p className="text-ty-2xs text-[var(--ty-red-color)]">{errors.displayTitle}</p>
          )}
        </div>

        {/* 顺序号 (displayOrder) 数字输入框 */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="block text-ty-xs font-semibold text-[var(--ty-font-main-color)]">
              顺序号 (displayOrder) <span className="text-[var(--ty-red-color)]">*</span>
            </label>
            <span className="text-ty-2xs text-[var(--ty-font-sub-light-color)]">控制结果列展示排位</span>
          </div>
          <div className="relative">
            <input
              type="number"
              min="1"
              step="1"
              value={formData.displayOrder || ''}
              onChange={e => {
                const val = parseInt(e.target.value, 10);
                onChange({ displayOrder: isNaN(val) ? 0 : val });
              }}
              placeholder="请输入正整数，如 1、2、3..."
              className={`w-full h-8 pl-3 pr-8 bg-[var(--ty-fill-white-color)] border rounded-ty-sm text-ty-xs font-mono font-semibold text-[var(--ty-font-main-color)] focus:outline-hidden focus:border-[var(--ty-primary-color)] ${
                errors.displayOrder ? 'border-[var(--ty-red-color)] bg-[var(--ty-red-light-color)]/20' : 'border-[var(--ty-border-color)]'
              }`}
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ty-2xs text-[var(--ty-font-sub-light-color)] font-mono">
              位
            </span>
          </div>
          {errors.displayOrder ? (
            <p className="text-ty-2xs text-[var(--ty-red-color)] font-medium">{errors.displayOrder}</p>
          ) : (
            <p className="text-ty-2xs text-[var(--ty-font-sub-light-color)]">
              大于 0 的整数，在当前根类型内唯一。查询结果列将从小到大排列。
            </p>
          )}
        </div>

        {/* 默认表格列宽 */}
        <div className="space-y-1 pt-1">
          <div className="flex justify-between items-center text-ty-xs">
            <span className="font-semibold text-[var(--ty-font-main-color)]">默认表格列宽 (px)</span>
            <span className="font-mono text-[var(--ty-font-sub-color)]">{formData.defaultColumnWidth} px</span>
          </div>
          <input
            type="range"
            min="80"
            max="350"
            step="10"
            value={formData.defaultColumnWidth}
            onChange={e => onChange({ defaultColumnWidth: Number(e.target.value) })}
            className="w-full accent-[var(--ty-primary-color)] cursor-pointer"
          />
        </div>
      </div>

      {/* 3. Manticore 底层配置 */}
      <div className="bg-[var(--ty-fill-weak-dark-color)] border border-[var(--ty-border-color)] rounded-ty-lg p-4 space-y-4 flex flex-col">
        <div className="flex items-center space-x-2 border-b border-[var(--ty-border-color)] pb-2">
          <div className="w-6 h-6 rounded-full bg-[var(--ty-primary-lighter-color)] text-[var(--ty-primary-color)] flex items-center justify-center font-bold text-ty-xs">
            3
          </div>
          <div>
            <h4 className="text-ty-xs font-bold text-[var(--ty-font-main-color)]">Manticore 底层配置</h4>
            <p className="text-ty-2xs text-[var(--ty-font-sub-color)]">检索物理字段与检索展示能力</p>
          </div>
        </div>

        {/* Manticore 物理字段名 */}
        <div className="space-y-1">
          <label className="block text-ty-xs font-semibold text-[var(--ty-font-main-color)]">
            Manticore 物理字段名 <span className="text-[var(--ty-red-color)]">*</span>
          </label>
          <input
            type="text"
            value={formData.manticoreField}
            onChange={e => onChange({ manticoreField: e.target.value.toLowerCase() })}
            disabled={isEditingConfigured}
            placeholder="例如：part_number"
            className={`w-full h-8 px-3 bg-[var(--ty-fill-white-color)] border rounded-ty-sm text-ty-xs font-mono text-[var(--ty-primary-color)] font-semibold focus:outline-hidden focus:border-[var(--ty-primary-color)] ${
              errors.manticoreField ? 'border-[var(--ty-red-color)]' : 'border-[var(--ty-border-color)]'
            } ${isEditingConfigured ? 'bg-[var(--ty-fill-weak-dark-color)] cursor-not-allowed opacity-80' : ''}`}
          />
          {errors.manticoreField && (
            <p className="text-ty-2xs text-[var(--ty-red-color)]">{errors.manticoreField}</p>
          )}
          {isEditingConfigured && (
            <p className="text-ty-2xs text-[var(--ty-font-sub-light-color)]">已配置字段的物理名称不可更改</p>
          )}
        </div>

        {/* Manticore 存储类型 */}
        <div className="space-y-1">
          <label className="block text-ty-xs font-semibold text-[var(--ty-font-main-color)]">
            Manticore 存储类型
          </label>
          <select
            value={formData.manticoreType}
            onChange={e => onChange({ manticoreType: e.target.value as ManticoreFieldType })}
            disabled={isEditingConfigured}
            className={`w-full h-8 px-3 bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm text-ty-xs font-mono text-[var(--ty-font-main-color)] focus:outline-hidden focus:border-[var(--ty-primary-color)] ${
              isEditingConfigured ? 'bg-[var(--ty-fill-weak-dark-color)] cursor-not-allowed opacity-80' : 'cursor-pointer'
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

        {/* 检索与展示能力配置 */}
        <div className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-3 space-y-3 flex-1">
          <div className="text-ty-xs font-semibold text-[var(--ty-font-main-color)] mb-1 flex items-center">
            <Shield className="w-3.5 h-3.5 mr-1 text-[var(--ty-primary-color)]" />
            检索、展示与超链接能力配置
          </div>

          <div className="space-y-2 text-ty-xs">
            <label className="flex items-center space-x-2 cursor-pointer hover:bg-[var(--ty-fill-weak-dark-color)] p-1 rounded-ty-sm transition-colors">
              <input
                type="checkbox"
                checked={formData.isDisplayInResult}
                onChange={e => onChange({ isDisplayInResult: e.target.checked })}
                className="rounded text-[var(--ty-primary-color)] cursor-pointer"
              />
              <span className="text-[var(--ty-font-main-color)]">在正式查询表格结果列展示</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer hover:bg-[var(--ty-fill-weak-dark-color)] p-1 rounded-ty-sm transition-colors">
              <input
                type="checkbox"
                checked={formData.isFulltextSearch}
                onChange={e => onChange({ isFulltextSearch: e.target.checked })}
                className="rounded text-[var(--ty-primary-color)] cursor-pointer"
              />
              <span className="text-[var(--ty-font-main-color)]">加入全局全文分词检索</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer hover:bg-[var(--ty-fill-weak-dark-color)] p-1 rounded-ty-sm transition-colors">
              <input
                type="checkbox"
                checked={formData.isQueryCondition}
                onChange={e => onChange({ isQueryCondition: e.target.checked })}
                className="rounded text-[var(--ty-primary-color)] cursor-pointer"
              />
              <span className="text-[var(--ty-font-main-color)]">允许作为精确/范围查询条件</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer hover:bg-[var(--ty-fill-weak-dark-color)] p-1 rounded-ty-sm transition-colors">
              <input
                type="checkbox"
                checked={formData.isSortable}
                disabled={formData.manticoreType === 'TEXT'}
                onChange={e => onChange({ isSortable: e.target.checked })}
                className="rounded text-[var(--ty-primary-color)] cursor-pointer disabled:opacity-40"
              />
              <span className={formData.manticoreType === 'TEXT' ? 'text-[var(--ty-font-sub-light-color)]' : 'text-[var(--ty-font-main-color)]'}>
                支持排序 (非 TEXT)
              </span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer hover:bg-[var(--ty-fill-weak-dark-color)] p-1 rounded-ty-sm transition-colors">
              <input
                type="checkbox"
                checked={formData.isEnableHyperlink}
                onChange={e => {
                  const checked = e.target.checked;
                  onChange({
                    isEnableHyperlink: checked,
                    displayType: checked ? 'LINK' : 'CONDITION_QUERY'
                  });
                }}
                className="rounded text-[var(--ty-primary-color)] cursor-pointer"
              />
              <span className="text-[var(--ty-font-main-color)] font-medium flex items-center">
                <Link className="w-3 h-3 mr-1 text-[var(--ty-primary-color)]" />
                字段值启用超链接 (跳转 PLM)
              </span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer hover:bg-[var(--ty-fill-weak-dark-color)] p-1 rounded-ty-sm transition-colors">
              <input
                type="checkbox"
                checked={formData.isUniqueKey}
                onChange={e => onChange({ isUniqueKey: e.target.checked })}
                className="rounded text-[var(--ty-orange-color)] cursor-pointer"
              />
              <span className="text-[var(--ty-font-main-color)] font-medium">作为业务唯一键 (Unique Key)</span>
            </label>
          </div>

          {/* 超链接参数配置区 (启用超链接后展开) */}
          {formData.isEnableHyperlink && (
            <div className="bg-[var(--ty-primary-lighter-color)]/40 border border-[var(--ty-primary-lighter-color)] rounded-ty-sm p-3 space-y-2 text-ty-xs mt-2 animate-in fade-in">
              <div className="flex items-center justify-between text-[var(--ty-primary-color)] font-semibold text-ty-2xs pb-1 border-b border-[var(--ty-primary-lighter-color)]">
                <span className="flex items-center">
                  <Link className="w-3 h-3 mr-1 text-[var(--ty-primary-color)]" />
                  超链接参数配置
                </span>
                <span className="text-ty-2xs text-[var(--ty-primary-color)] font-normal">
                  支持 {'{oid}'} 和 {'{otype}'} 动态占位符
                </span>
              </div>

              <div className="space-y-0.5">
                <label className="text-ty-2xs text-[var(--ty-font-main-color)] font-medium block">
                  URL 模板 <span className="text-[var(--ty-red-color)]">*</span>
                </label>
                <input
                  type="text"
                  value={hyperlink.urlTemplate}
                  onChange={e => updateHyperlink({ urlTemplate: e.target.value })}
                  placeholder="https://plm.internal.corp/app/view?oid={oid}&type={otype}"
                  className={`w-full h-7 px-2 bg-[var(--ty-fill-white-color)] border rounded-ty-sm text-ty-2xs font-mono text-[var(--ty-font-main-color)] focus:outline-hidden focus:border-[var(--ty-primary-color)] ${
                    errors.urlTemplate ? 'border-[var(--ty-red-color)] bg-[var(--ty-red-light-color)]/30' : 'border-[var(--ty-border-color)]'
                  }`}
                />
                {errors.urlTemplate && (
                  <p className="text-ty-2xs text-[var(--ty-red-color)]">{errors.urlTemplate}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-ty-2xs">
                <div>
                  <span className="text-[var(--ty-font-sub-color)]">{'{oid}'} 来源字段:</span>
                  <input
                    type="text"
                    value={hyperlink.oidSourceField}
                    onChange={e => updateHyperlink({ oidSourceField: e.target.value })}
                    placeholder="master_oid"
                    className="w-full h-7 px-2 bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm font-mono text-[var(--ty-font-main-color)] mt-0.5 focus:outline-hidden focus:border-[var(--ty-primary-color)]"
                  />
                </div>
                <div>
                  <span className="text-[var(--ty-font-sub-color)]">{'{otype}'} 来源字段:</span>
                  <input
                    type="text"
                    value={hyperlink.otypeSourceField}
                    onChange={e => updateHyperlink({ otypeSourceField: e.target.value })}
                    placeholder="object_type_code"
                    className="w-full h-7 px-2 bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm font-mono text-[var(--ty-font-main-color)] mt-0.5 focus:outline-hidden focus:border-[var(--ty-primary-color)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-ty-2xs pt-1 border-t border-[var(--ty-primary-lighter-color)]">
                <div>
                  <span className="text-[var(--ty-font-sub-color)]">打开方式:</span>
                  <select
                    value={hyperlink.openTarget || '_blank'}
                    onChange={e => updateHyperlink({ openTarget: e.target.value as '_blank' | '_self' })}
                    className="w-full h-7 px-2 bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm text-ty-2xs text-[var(--ty-font-main-color)] mt-0.5 focus:outline-hidden focus:border-[var(--ty-primary-color)] cursor-pointer"
                  >
                    <option value="_blank">新标签页打开 (_blank)</option>
                    <option value="_self">当前窗口跳转 (_self)</option>
                  </select>
                </div>
                <div>
                  <span className="text-[var(--ty-font-sub-color)]">缺少参数时的处理方式:</span>
                  <select
                    value={hyperlink.onMissingParam || 'HIDE_LINK_SHOW_TEXT'}
                    onChange={e => updateHyperlink({ onMissingParam: e.target.value as any })}
                    className="w-full h-7 px-2 bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm text-ty-2xs text-[var(--ty-font-main-color)] mt-0.5 focus:outline-hidden focus:border-[var(--ty-primary-color)] cursor-pointer"
                  >
                    <option value="HIDE_LINK_SHOW_TEXT">隐藏超链接，仅展示普通文本</option>
                    <option value="SHOW_DISABLED_LINK">置灰且不可点击</option>
                    <option value="HIDE_ENTIRE_COLUMN">隐藏整列</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
};
