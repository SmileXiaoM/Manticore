import React, { useMemo } from 'react';
import {
  Link,
  Shield,
  AlertTriangle,
  HelpCircle,
  Hash,
  Sliders,
  Type,
  Database
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* 1. PLM 来源元数据 (只读展示) */}
      <div className="bg-slate-50/90 border border-slate-200 rounded-[8px] p-4 space-y-3.5 flex flex-col">
        <div className="flex items-center space-x-2 border-b border-slate-200 pb-2.5">
          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
            1
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">PLM 来源元数据</h4>
            <p className="text-[11px] text-slate-500">源系统与对象属性定义 (只读)</p>
          </div>
        </div>

        {sourceMeta ? (
          <div className="bg-white border border-slate-200 rounded-[6px] p-3 text-xs space-y-2.5 flex-1">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                PLM 属性标识与编码
              </span>
              <div className="font-mono text-xs font-bold text-slate-900 bg-slate-50 p-2 rounded border border-slate-200 break-all">
                {sourceMeta.sourceFieldName}
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                Key: {sourceMeta.sourceFieldKey}
              </div>
            </div>

            {/* PLM 显示名状态 */}
            <div className="space-y-1 pt-1 border-t border-slate-100">
              <span className="text-slate-500 text-[11px] block">PLM 原始显示名:</span>
              <div className="flex items-center space-x-1.5">
                <span className="font-medium text-slate-800">
                  {sourceMeta.sourceDisplayName && sourceMeta.sourceDisplayName.trim().length > 0
                    ? sourceMeta.sourceDisplayName
                    : '(未定义)'}
                </span>
                {displayNameResolved.isMissing && (
                  <span className="px-1.5 py-0.5 rounded-[4px] bg-amber-100 text-amber-800 text-[10px] font-medium border border-amber-200">
                    已按字段名兜底
                  </span>
                )}
              </div>
            </div>

            {displayNameResolved.isMissing && (
              <div className="bg-amber-50 border border-amber-200 rounded-[6px] p-2 text-[11px] text-amber-800 space-y-0.5">
                <div className="flex items-center space-x-1 font-semibold">
                  <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                  <span>元数据未提供显示名</span>
                </div>
                <p className="text-amber-700 leading-tight">
                  系统已按字段编码自动兜底，请在右侧“前台显示名称”确认或补充标准业务名称。
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-100">
              <div>
                <span className="text-slate-400 block">PLM 业务类型:</span>
                <span className="font-medium text-slate-800">
                  {sourceMeta.sourceDataTypeLabel}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">必填校验:</span>
                <span className={sourceMeta.isRequired ? 'text-rose-600 font-semibold' : 'text-slate-600'}>
                  {sourceMeta.isRequired ? '必填' : '选填'}
                </span>
              </div>
            </div>

            {sourceMeta.defaultUnit && (
              <div className="text-[11px] pt-1 border-t border-slate-100">
                <span className="text-slate-400 block">单位族 / 默认单位:</span>
                <span className="font-medium text-blue-700">
                  {sourceMeta.unitFamily || '标量'} ({sourceMeta.defaultUnit})
                </span>
              </div>
            )}

            {sourceMeta.enumOptions && sourceMeta.enumOptions.length > 0 && (
              <div className="text-[11px] pt-1 border-t border-slate-100">
                <span className="text-slate-400 block mb-1">受控枚举 ({sourceMeta.enumOptions.length}):</span>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                  {sourceMeta.enumOptions.map(opt => (
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
        ) : (
          <div className="bg-white border border-slate-200 rounded-[6px] p-6 text-center text-slate-400 text-xs flex-1 flex flex-col items-center justify-center">
            <AlertTriangle className="w-6 h-6 mb-2 text-slate-300" />
            <span>请先选择 PLM 来源属性</span>
          </div>
        )}
      </div>

      {/* 2. 映射与业务展示 */}
      <div className="bg-slate-50/90 border border-slate-200 rounded-[8px] p-4 space-y-3.5 flex flex-col">
        <div className="flex items-center space-x-2 border-b border-slate-200 pb-2.5">
          <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
            2
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">映射与业务展示</h4>
            <p className="text-[11px] text-slate-500">前台显示名称、顺序号与列宽</p>
          </div>
        </div>

        {/* 前台显示名称 */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-700">
            前台显示名称 <span className="text-rose-500">* (必填)</span>
          </label>
          <input
            type="text"
            value={formData.displayTitle}
            onChange={e => onChange({ displayTitle: e.target.value })}
            placeholder="例如：物料编码 / 规格型号"
            className={`w-full h-8 px-2.5 bg-white border rounded-[6px] text-xs text-slate-800 focus:outline-hidden focus:border-blue-500 ${
              errors.displayTitle ? 'border-rose-400' : 'border-slate-300'
            }`}
          />
          {errors.displayTitle && (
            <p className="text-[11px] text-rose-500">{errors.displayTitle}</p>
          )}
        </div>

        {/* 顺序号 (displayOrder) 数字输入框 */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-slate-700">
              顺序号 (displayOrder) <span className="text-rose-500">*</span>
            </label>
            <span className="text-[10px] text-slate-400">控制结果列展示排位</span>
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
              className={`w-full h-8 pl-3 pr-8 bg-white border rounded-[6px] text-xs font-mono font-semibold text-slate-800 focus:outline-hidden focus:border-blue-500 ${
                errors.displayOrder ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'
              }`}
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-mono">
              位
            </span>
          </div>
          {errors.displayOrder ? (
            <p className="text-[11px] text-rose-500 font-medium">{errors.displayOrder}</p>
          ) : (
            <p className="text-[10px] text-slate-400">
              大于 0 的整数，在当前根类型内唯一。查询结果列将从小到大排列。
            </p>
          )}
        </div>

        {/* 默认表格列宽 */}
        <div className="space-y-1 pt-1">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-700">默认表格列宽 (px)</span>
            <span className="font-mono text-slate-600">{formData.defaultColumnWidth} px</span>
          </div>
          <input
            type="range"
            min="80"
            max="350"
            step="10"
            value={formData.defaultColumnWidth}
            onChange={e => onChange({ defaultColumnWidth: Number(e.target.value) })}
            className="w-full accent-blue-600 cursor-pointer"
          />
        </div>
      </div>

      {/* 3. Manticore 底层配置 */}
      <div className="bg-slate-50/90 border border-slate-200 rounded-[8px] p-4 space-y-3.5 flex flex-col">
        <div className="flex items-center space-x-2 border-b border-slate-200 pb-2.5">
          <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
            3
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Manticore 底层配置</h4>
            <p className="text-[11px] text-slate-500">检索物理字段与检索展示能力</p>
          </div>
        </div>

        {/* Manticore 物理字段名 */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-700">
            Manticore 物理字段名 <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={formData.manticoreField}
            onChange={e => onChange({ manticoreField: e.target.value.toLowerCase() })}
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
            value={formData.manticoreType}
            onChange={e => onChange({ manticoreType: e.target.value as ManticoreFieldType })}
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

        {/* 检索与展示能力配置 */}
        <div className="bg-white border border-slate-200 rounded-[6px] p-3 space-y-2.5 flex-1">
          <div className="text-[11px] font-semibold text-slate-700 mb-1 flex items-center">
            <Shield className="w-3.5 h-3.5 mr-1 text-purple-600" />
            检索、展示与超链接能力配置
          </div>

          <div className="space-y-1.5 text-xs">
            <label className="flex items-center space-x-2 cursor-pointer hover:bg-slate-50 p-1 rounded-[4px] transition-colors">
              <input
                type="checkbox"
                checked={formData.isDisplayInResult}
                onChange={e => onChange({ isDisplayInResult: e.target.checked })}
                className="rounded text-blue-600 cursor-pointer"
              />
              <span className="text-slate-800">在正式查询表格结果列展示</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer hover:bg-slate-50 p-1 rounded-[4px] transition-colors">
              <input
                type="checkbox"
                checked={formData.isFulltextSearch}
                onChange={e => onChange({ isFulltextSearch: e.target.checked })}
                className="rounded text-purple-600 cursor-pointer"
              />
              <span className="text-slate-800">加入全局全文分词检索</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer hover:bg-slate-50 p-1 rounded-[4px] transition-colors">
              <input
                type="checkbox"
                checked={formData.isQueryCondition}
                onChange={e => onChange({ isQueryCondition: e.target.checked })}
                className="rounded text-blue-600 cursor-pointer"
              />
              <span className="text-slate-800">允许作为精确/范围查询条件</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer hover:bg-slate-50 p-1 rounded-[4px] transition-colors">
              <input
                type="checkbox"
                checked={formData.isSortable}
                disabled={formData.manticoreType === 'TEXT'}
                onChange={e => onChange({ isSortable: e.target.checked })}
                className="rounded text-blue-600 cursor-pointer disabled:opacity-40"
              />
              <span className={formData.manticoreType === 'TEXT' ? 'text-slate-400' : 'text-slate-800'}>
                支持排序 (非 TEXT)
              </span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer hover:bg-slate-50 p-1 rounded-[4px] transition-colors">
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
                className="rounded text-blue-600 cursor-pointer"
              />
              <span className="text-slate-800 font-medium flex items-center">
                <Link className="w-3 h-3 mr-1 text-blue-600" />
                字段值启用超链接 (跳转 PLM)
              </span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer hover:bg-slate-50 p-1 rounded-[4px] transition-colors">
              <input
                type="checkbox"
                checked={formData.isUniqueKey}
                onChange={e => onChange({ isUniqueKey: e.target.checked })}
                className="rounded text-amber-600 cursor-pointer"
              />
              <span className="text-slate-800 font-medium">作为业务唯一键 (Unique Key)</span>
            </label>
          </div>

          {/* 超链接参数配置区 (启用超链接后展开) */}
          {formData.isEnableHyperlink && (
            <div className="bg-blue-50/50 border border-blue-200 rounded-[6px] p-2.5 space-y-2 text-xs mt-2 animate-in fade-in">
              <div className="flex items-center justify-between text-blue-900 font-semibold text-[11px] pb-1 border-b border-blue-100">
                <span className="flex items-center">
                  <Link className="w-3 h-3 mr-1 text-blue-600" />
                  超链接参数配置
                </span>
                <span className="text-[10px] text-blue-600 font-normal">
                  支持 {'{oid}'} 和 {'{otype}'} 动态占位符
                </span>
              </div>

              <div className="space-y-0.5">
                <label className="text-[11px] text-slate-700 font-medium block">
                  URL 模板 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={hyperlink.urlTemplate}
                  onChange={e => updateHyperlink({ urlTemplate: e.target.value })}
                  placeholder="https://plm.internal.corp/app/view?oid={oid}&type={otype}"
                  className={`w-full h-7 px-2 bg-white border rounded-[4px] text-[11px] font-mono text-slate-800 focus:outline-hidden focus:border-blue-500 ${
                    errors.urlTemplate ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                  }`}
                />
                {errors.urlTemplate && (
                  <p className="text-[10px] text-rose-500">{errors.urlTemplate}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-600">{'{oid}'} 来源字段:</span>
                  <input
                    type="text"
                    value={hyperlink.oidSourceField}
                    onChange={e => updateHyperlink({ oidSourceField: e.target.value })}
                    placeholder="master_oid"
                    className="w-full h-7 px-2 bg-white border border-slate-300 rounded-[4px] font-mono text-slate-800 mt-0.5 focus:outline-hidden focus:border-blue-500"
                  />
                </div>
                <div>
                  <span className="text-slate-600">{'{otype}'} 来源字段:</span>
                  <input
                    type="text"
                    value={hyperlink.otypeSourceField}
                    onChange={e => updateHyperlink({ otypeSourceField: e.target.value })}
                    placeholder="object_type_code"
                    className="w-full h-7 px-2 bg-white border border-slate-300 rounded-[4px] font-mono text-slate-800 mt-0.5 focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-blue-100">
                <div>
                  <span className="text-slate-600">打开方式:</span>
                  <select
                    value={hyperlink.openTarget || '_blank'}
                    onChange={e => updateHyperlink({ openTarget: e.target.value as '_blank' | '_self' })}
                    className="w-full h-7 px-2 bg-white border border-slate-300 rounded-[4px] text-[11px] text-slate-800 mt-0.5 focus:outline-hidden focus:border-blue-500 cursor-pointer"
                  >
                    <option value="_blank">新标签页打开 (_blank)</option>
                    <option value="_self">当前窗口跳转 (_self)</option>
                  </select>
                </div>
                <div>
                  <span className="text-slate-600">缺少参数时的处理方式:</span>
                  <select
                    value={hyperlink.onMissingParam || 'HIDE_LINK_SHOW_TEXT'}
                    onChange={e => updateHyperlink({ onMissingParam: e.target.value as any })}
                    className="w-full h-7 px-2 bg-white border border-slate-300 rounded-[4px] text-[11px] text-slate-800 mt-0.5 focus:outline-hidden focus:border-blue-500 cursor-pointer"
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
  );
};
