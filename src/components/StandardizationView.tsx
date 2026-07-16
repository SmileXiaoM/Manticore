import React, { useState, useMemo } from 'react';
import {
  Plus,
  Save,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Undo2,
  ChevronRight,
  HelpCircle,
  Hash
} from 'lucide-react';
import { StandardizationRule, ObjectType } from '../types';

interface StandardizationViewProps {
  rules: StandardizationRule[];
  onUpdateRules: (newRules: StandardizationRule[]) => void;
}

export const StandardizationView: React.FC<StandardizationViewProps> = ({
  rules,
  onUpdateRules
}) => {
  const [editingRule, setEditingRule] = useState<StandardizationRule | null>(null);
  const [isNew, setIsNew] = useState(false);

  // Filters state
  const [filterName, setFilterName] = useState('');
  const [filterProp, setFilterProp] = useState('');
  const [filterStdVal, setFilterStdVal] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Form states
  const [formRuleName, setFormRuleName] = useState('');
  const [formObjectType, setFormObjectType] = useState<ObjectType>('PART_MECHANICAL');
  const [formApplicableProp, setFormApplicableProp] = useState('');
  const [formPropertyType, setFormPropertyType] = useState('枚举 (ENUM)');
  const [formRawValue, setFormRawValue] = useState('');
  const [formStandardValue, setFormStandardValue] = useState('');
  const [formRuleMethod, setFormRuleMethod] = useState<'MAP' | 'REGEX' | 'REPLACE'>('MAP');
  const [formMatchPriority, setFormMatchPriority] = useState(1);
  const [formRemarks, setFormRemarks] = useState('');

  // Switches states
  const [formIsActive, setFormIsActive] = useState(true);
  const [formIsSimilarityActive, setFormIsSimilarityActive] = useState(true);
  const [formIsFullTextActive, setFormIsFullTextActive] = useState(true);

  // Filter Logic
  const filteredRules = useMemo(() => {
    return rules.filter(r => {
      const matchName = filterName === '' || r.ruleName.toLowerCase().includes(filterName.toLowerCase());
      const matchProp = filterProp === '' || r.applicableProperty.toLowerCase().includes(filterProp.toLowerCase());
      const matchStd = filterStdVal === '' || r.standardValue.toLowerCase().includes(filterStdVal.toLowerCase());
      const matchStatus = filterStatus === 'ALL' ||
        (filterStatus === 'ACTIVE' && r.status === 'ACTIVE') ||
        (filterStatus === 'INACTIVE' && r.status === 'INACTIVE');

      return matchName && matchProp && matchStd && matchStatus;
    });
  }, [rules, filterName, filterProp, filterStdVal, filterStatus]);

  // Handle Edit Click
  const handleEdit = (rule: StandardizationRule) => {
    setEditingRule(rule);
    setIsNew(false);

    setFormRuleName(rule.ruleName);
    setFormObjectType(rule.applicableObjectType);
    setFormApplicableProp(rule.applicableProperty);
    setFormPropertyType(rule.propertyType);
    setFormRawValue(rule.rawValue);
    setFormStandardValue(rule.standardValue);
    setFormRuleMethod(rule.ruleMethod);
    setFormMatchPriority(rule.matchPriority);
    setFormRemarks(rule.remarks || '');

    setFormIsActive(rule.status === 'ACTIVE');
    setFormIsSimilarityActive(rule.isSimilarityActive);
    setFormIsFullTextActive(rule.isFullTextActive);
  };

  // Handle New Click
  const handleNew = () => {
    setEditingRule(null);
    setIsNew(true);

    setFormRuleName('');
    setFormObjectType('PART_MECHANICAL');
    setFormApplicableProp('');
    setFormPropertyType('枚举 (ENUM)');
    setFormRawValue('SUS304\n304不锈钢\n304SS\n白钢');
    setFormStandardValue('304 (06Cr19Ni10)');
    setFormRuleMethod('MAP');
    setFormMatchPriority(1);
    setFormRemarks('');

    setFormIsActive(true);
    setFormIsSimilarityActive(true);
    setFormIsFullTextActive(true);
  };

  // Handle Save
  const handleSave = () => {
    if (!formRuleName || !formApplicableProp || !formStandardValue) {
      alert('请填写所有必填字段（规则名称、适用属性、标准值）！');
      return;
    }

    const updated: StandardizationRule = {
      id: isNew ? `S-00${rules.length + 1}` : (editingRule?.id || 'S-TMP'),
      ruleName: formRuleName,
      applicableObjectType: formObjectType,
      applicableProperty: formApplicableProp,
      propertyType: formPropertyType,
      rawValue: formRawValue,
      standardValue: formStandardValue,
      ruleMethod: formRuleMethod,
      matchPriority: Number(formMatchPriority),
      isSimilarityActive: formIsSimilarityActive,
      isFullTextActive: formIsFullTextActive,
      status: formIsActive ? 'ACTIVE' : 'INACTIVE',
      version: isNew ? 'v1.0.0' : (editingRule?.version || 'v1.0.0'),
      lastEditor: '李晓华 (数据标准管理员)',
      lastEditTime: new Date().toISOString().replace('T', ' ').substring(0, 19),
      remarks: formRemarks
    };

    if (isNew) {
      onUpdateRules([...rules, updated]);
    } else {
      onUpdateRules(rules.map(r => r.id === updated.id ? updated : r));
    }

    setIsNew(false);
    setEditingRule(null);
  };

  // Handle Delete
  const handleDelete = (id: string) => {
    if (window.confirm(`确定要删除标准化规则 ${id} 吗？`)) {
      onUpdateRules(rules.filter(r => r.id !== id));
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">

      {/* Title block */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0 flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2 text-xs text-slate-500 mb-1">
            <span>相似度配置</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-800 font-medium">标准化规则</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            {isNew ? '新建数据标准化规则' : editingRule ? '编辑数据标准化规则' : '属性值标准化规则'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            规范零组件属性俗称、别名与多国标代号。提取原始混合文本映射至受控的标准主数据值，确保二阶段相似比对完全对齐。
          </p>
        </div>

        {!editingRule && !isNew ? (
          <button
            onClick={handleNew}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新建标准化规则</span>
          </button>
        ) : (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => { setEditingRule(null); setIsNew(false); }}
              className="flex items-center space-x-1.5 px-3.5 py-2 border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 rounded-md text-xs font-medium transition-colors"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>返回列表</span>
            </button>
            <button
              onClick={handleSave}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md text-xs font-semibold shadow-xs transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>保存规则</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Container */}
      {!(editingRule || isNew) ? (
        // FRAME 3: LIST VIEW
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Filters Area */}
          <div className="px-6 py-3 shrink-0 flex flex-wrap items-center gap-3 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center space-x-1.5 text-xs">
              <span className="text-slate-500">规则名称:</span>
              <input
                type="text"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                placeholder="搜索规则名称..."
                className="bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs w-48 focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div className="flex items-center space-x-1.5 text-xs">
              <span className="text-slate-500">适用属性:</span>
              <input
                type="text"
                value={filterProp}
                onChange={(e) => setFilterProp(e.target.value)}
                placeholder="输入属性编码..."
                className="bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs w-40 focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div className="flex items-center space-x-1.5 text-xs">
              <span className="text-slate-500">标准值:</span>
              <input
                type="text"
                value={filterStdVal}
                onChange={(e) => setFilterStdVal(e.target.value)}
                placeholder="输入收敛标准值..."
                className="bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs w-40 focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div className="flex items-center space-x-1.5 text-xs">
              <span className="text-slate-500">状态:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-white border border-slate-300 rounded px-2 py-1.5 text-xs"
              >
                <option value="ALL">全部状态</option>
                <option value="ACTIVE">启用 (ACTIVE)</option>
                <option value="INACTIVE">禁用 (INACTIVE)</option>
              </select>
            </div>

            {(filterName || filterProp || filterStdVal || filterStatus !== 'ALL') && (
              <button
                onClick={() => {
                  setFilterName('');
                  setFilterProp('');
                  setFilterStdVal('');
                  setFilterStatus('ALL');
                }}
                className="text-xs text-blue-600 hover:text-blue-800 underline pl-1"
              >
                清除筛选
              </button>
            )}
          </div>

          {/* High density Table area with horizontal scroll bar */}
          <div className="flex-1 overflow-auto px-6 pb-6 pt-4">
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm min-w-[1400px] overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 text-xs font-semibold font-sans">
                    <th className="px-3 py-2.5 border-r border-slate-200">规则名称</th>
                    <th className="px-3 py-2.5 border-r border-slate-200">适用对象类型</th>
                    <th className="px-3 py-2.5 border-r border-slate-200">适用属性</th>
                    <th className="px-3 py-2.5 border-r border-slate-200">属性类型</th>
                    <th className="px-4 py-2.5 border-r border-slate-200">原始俗称/牌号映射 (多行)</th>
                    <th className="px-3 py-2.5 border-r border-slate-200">收敛至标准值</th>
                    <th className="px-3 py-2.5 border-r border-slate-200">规则方式</th>
                    <th className="px-3 py-2.5 border-r border-slate-200 text-center">优先级</th>
                    <th className="px-3 py-2.5 border-r border-slate-200 text-center">参与相似度</th>
                    <th className="px-3 py-2.5 border-r border-slate-200 text-center">参与全文检索</th>
                    <th className="px-3 py-2.5 border-r border-slate-200 text-center">状态</th>
                    <th className="px-3 py-2.5 border-r border-slate-200">版本</th>
                    <th className="px-3 py-2.5 border-r border-slate-200">最后维护人</th>
                    <th className="px-3 py-2.5 border-r border-slate-200">最后维护时间</th>
                    <th className="px-4 py-2.5 text-center">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs font-sans">
                  {filteredRules.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3 py-2 border-r border-slate-200 font-semibold text-slate-900 whitespace-nowrap">
                        {r.ruleName}
                      </td>
                      <td className="px-3 py-2 border-r border-slate-200 whitespace-nowrap">
                        {r.applicableObjectType === 'PART_MECHANICAL' ? (
                          <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[10px]">机械零件</span>
                        ) : r.applicableObjectType === 'PART_ELECTRICAL' ? (
                          <span className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded text-[10px]">电气元器件</span>
                        ) : (
                          <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px]">全局/全部</span>
                        )}
                      </td>
                      <td className="px-3 py-2 border-r border-slate-200 font-mono text-slate-800 whitespace-nowrap">
                        {r.applicableProperty}
                      </td>
                      <td className="px-3 py-2 border-r border-slate-200 text-slate-600 whitespace-nowrap">
                        {r.propertyType}
                      </td>
                      <td className="px-4 py-2 border-r border-slate-200 text-slate-500 max-w-[220px]">
                        <div className="flex flex-wrap gap-1">
                          {r.rawValue.split('\n').map((val, idx) => (
                            <span key={idx} className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] border border-slate-200 font-mono">
                              {val}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-2 border-r border-slate-200 font-bold text-emerald-700 whitespace-nowrap font-mono">
                        → {r.standardValue}
                      </td>
                      <td className="px-3 py-2 border-r border-slate-200 whitespace-nowrap">
                        <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-1.5 py-0.5 rounded text-[10px] font-mono">
                          {r.ruleMethod === 'MAP' ? '键值对照 (MAP)' : r.ruleMethod === 'REGEX' ? '正则清洗 (REGEX)' : '文本替换'}
                        </span>
                      </td>
                      <td className="px-3 py-2 border-r border-slate-200 text-center font-bold text-slate-700 font-mono">
                        {r.matchPriority}
                      </td>
                      <td className="px-3 py-2 border-r border-slate-200 text-center whitespace-nowrap">
                        {r.isSimilarityActive ? <span className="text-emerald-600 font-bold">是</span> : <span className="text-slate-300">--</span>}
                      </td>
                      <td className="px-3 py-2 border-r border-slate-200 text-center whitespace-nowrap">
                        {r.isFullTextActive ? <span className="text-blue-600 font-bold">是</span> : <span className="text-slate-300">--</span>}
                      </td>
                      <td className="px-3 py-2 border-r border-slate-200 text-center whitespace-nowrap">
                        {r.status === 'ACTIVE' ? (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-medium">启用中</span>
                        ) : (
                          <span className="bg-slate-100 text-slate-400 border border-slate-200 px-2 py-0.5 rounded font-medium">已禁用</span>
                        )}
                      </td>
                      <td className="px-3 py-2 border-r border-slate-200 font-mono text-slate-500 whitespace-nowrap">
                        {r.version}
                      </td>
                      <td className="px-3 py-2 border-r border-slate-200 text-slate-600 whitespace-nowrap">
                        {r.lastEditor}
                      </td>
                      <td className="px-3 py-2 border-r border-slate-200 text-slate-500 font-mono whitespace-nowrap">
                        {r.lastEditTime}
                      </td>
                      <td className="px-4 py-2 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            onClick={() => handleEdit(r)}
                            className="p-1 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded transition-colors"
                            title="编辑映射规则"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(r.id)}
                            className="p-1 text-slate-600 hover:text-red-600 hover:bg-slate-100 rounded transition-colors"
                            title="删除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        // FRAME 4: CREATE / EDIT FORM VIEW
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">

            <div className="bg-slate-50 px-6 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-800">
                {isNew ? '创建新属性值标准化映射规则' : `正在编辑规则: [${editingRule?.id}]`}
              </span>
              <span className="text-xs bg-slate-200 px-2 py-0.5 rounded border border-slate-300 font-mono text-slate-600">
                Drizzle schema map
              </span>
            </div>

            <div className="p-6 space-y-5 text-xs">

              {/* Row 1: Rule Name & Priority */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block font-medium text-slate-700 mb-1.5">规则名称 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formRuleName}
                    onChange={(e) => setFormRuleName(e.target.value)}
                    placeholder="输入便于记忆的描述名称，例如：不锈钢材质标准化映射"
                    className="w-full bg-white border border-slate-300 rounded p-2 text-xs focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1.5">匹配优先级 (数字越小越优先)</label>
                  <div className="flex items-center space-x-2">
                    <Hash className="w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="number"
                      min="1"
                      max="99"
                      value={formMatchPriority}
                      onChange={(e) => setFormMatchPriority(Number(e.target.value))}
                      className="w-20 bg-white border border-slate-300 rounded p-2 text-xs font-mono text-center focus:ring-1 focus:ring-blue-500"
                    />
                    <span className="text-[11px] text-slate-500">Manticore 比对次序</span>
                  </div>
                </div>
              </div>

              {/* Row 2: Applicable object, property and type */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 mb-1.5">适用对象类型 <span className="text-red-500">*</span></label>
                  <select
                    value={formObjectType}
                    onChange={(e) => setFormObjectType(e.target.value as ObjectType)}
                    className="w-full bg-white border border-slate-300 rounded p-2 text-xs focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="PART_MECHANICAL">机械零件 (PART_MECHANICAL)</option>
                    <option value="PART_ELECTRICAL">电气元器件 (PART_ELECTRICAL)</option>
                    <option value="DOCUMENT">图纸文档 (DOCUMENT)</option>
                    <option value="ALL">全部对象通用 (ALL)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1.5">适用属性编码 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formApplicableProp}
                    onChange={(e) => setFormApplicableProp(e.target.value)}
                    placeholder="例如: core_material 或 spec_length"
                    className="w-full bg-white border border-slate-300 rounded p-2 text-xs focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1.5">属性字段数据类型</label>
                  <select
                    value={formPropertyType}
                    onChange={(e) => setFormPropertyType(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded p-2 text-xs focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="枚举 (ENUM)">枚举 (ENUM)</option>
                    <option value="数字 (NUMBER)">数字 (NUMBER)</option>
                    <option value="文本 (TEXT)">文本 (TEXT)</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Rule Method & Target Standard Value */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 mb-1.5">映射规则方式</label>
                  <select
                    value={formRuleMethod}
                    onChange={(e) => setFormRuleMethod(e.target.value as 'MAP' | 'REGEX' | 'REPLACE')}
                    className="w-full bg-white border border-slate-300 rounded p-2 text-xs focus:ring-1 focus:ring-blue-500 font-mono"
                  >
                    <option value="MAP">硬映射 (精确多对一值对照 MAP)</option>
                    <option value="REGEX">正则提取并替换 (REGEX)</option>
                    <option value="REPLACE">纯字符直接置换 (REPLACE)</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block font-medium text-slate-700 mb-1.5">收敛至标准值 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formStandardValue}
                    onChange={(e) => setFormStandardValue(e.target.value)}
                    placeholder="例如: 304 (06Cr19Ni10)"
                    className="w-full bg-white border border-slate-300 rounded p-2 text-xs font-semibold text-emerald-700 font-mono focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Row 4: Raw Values Textarea - Supports multi-line input mapping */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-medium text-slate-700">
                    输入需要标准化的原始值 / 别名俗称集 (支持批量多行录入) <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400">一行为一条独立原始俗称</span>
                </div>
                <textarea
                  rows={4}
                  value={formRawValue}
                  onChange={(e) => setFormRawValue(e.target.value)}
                  placeholder="例如输入:&#10;SUS304&#10;304不锈钢&#10;06Cr19Ni10&#10;白钢"
                  className="w-full bg-white border border-slate-300 rounded p-2 text-xs font-mono focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-[10px] text-slate-400 leading-normal mt-1 block">
                  💡 映射生效后，当一阶段检索召回的候选零件中此属性值包含以上任一内容时，在二阶段对齐计算前会被 Manticore 主动标准化重置为 <strong className="text-emerald-700 font-semibold font-mono">{formStandardValue || '指定标准值'}</strong>。
                </span>
              </div>

              {/* Row 5: Switch/Toggle Area */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <span className="font-semibold text-slate-800 block mb-2.5">生效范围及属性行为</span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Toggle: Is Active */}
                  <label className="flex items-center space-x-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <div>
                      <span className="font-medium text-slate-800 block">立即启用规则</span>
                      <span className="text-[10px] text-slate-500">是否立即处于活动状态</span>
                    </div>
                  </label>

                  {/* Toggle: Is Similarity Active */}
                  <label className="flex items-center space-x-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIsSimilarityActive}
                      onChange={(e) => setFormIsSimilarityActive(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <div>
                      <span className="font-medium text-slate-800 block">参与相似度评分比对</span>
                      <span className="text-[10px] text-slate-500">允许在二阶段权重比对中生效</span>
                    </div>
                  </label>

                  {/* Toggle: Is Fulltext Active */}
                  <label className="flex items-center space-x-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIsFullTextActive}
                      onChange={(e) => setFormIsFullTextActive(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <div>
                      <span className="font-medium text-slate-800 block">参与一阶段全文检索召回</span>
                      <span className="text-[10px] text-slate-500">支持在全文索引召回中完成别名命中</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Row 6: Remarks */}
              <div>
                <label className="block font-medium text-slate-700 mb-1.5">规则维护备注 (适用于后续审计)</label>
                <input
                  type="text"
                  value={formRemarks}
                  onChange={(e) => setFormRemarks(e.target.value)}
                  placeholder="说明规则制定的历史依据或标准引用文档 (如 GB/T 3098.1)..."
                  className="w-full bg-white border border-slate-300 rounded p-2 text-xs focus:ring-1 focus:ring-blue-500"
                />
              </div>

            </div>

            {/* Form footer */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end space-x-3">
              <button
                onClick={() => { setEditingRule(null); setIsNew(false); }}
                className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 rounded text-xs font-medium text-slate-700 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-xs font-semibold text-white shadow-xs transition-colors"
              >
                保存配置并生效
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
