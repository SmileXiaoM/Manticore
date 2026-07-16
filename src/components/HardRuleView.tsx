import React, { useState, useMemo } from 'react';
import {
  Plus,
  Save,
  Search,
  Filter,
  Edit2,
  Trash2,
  Check,
  X,
  ChevronRight,
  List,
  FileEdit,
  ShieldAlert,
  Octagon,
  AlertTriangle,
  Info
} from 'lucide-react';
import { HardRule, ObjectType } from '../types';

interface HardRuleViewProps {
  hardRules: HardRule[];
  onUpdateHardRules: (newRules: HardRule[]) => void;
}

export const HardRuleView: React.FC<HardRuleViewProps> = ({
  hardRules,
  onUpdateHardRules
}) => {
  // Navigation tabs for Figma review: 'LIST' | 'EDITOR'
  const [activeTab, setActiveTab] = useState<'LIST' | 'EDITOR'>('LIST');

  // Selected item for editor
  const [editingItem, setEditingItem] = useState<HardRule | null>(null);
  const [isNew, setIsNew] = useState(false);

  // Filters state
  const [keyword, setKeyword] = useState('');
  const [filterRuleType, setFilterRuleType] = useState<string>('ALL');

  // Form states (for editor tab)
  const [formRuleName, setFormRuleName] = useState('');
  const [formRuleType, setFormRuleType] = useState<'FORCE_REVIEW' | 'NON_REUSABLE' | 'RISK_ALERT'>('FORCE_REVIEW');
  const [formObjectType, setFormObjectType] = useState<string>('PART_MECHANICAL');
  const [formCategory, setFormCategory] = useState('ALL');
  const [formTriggerField, setFormTriggerField] = useState('');
  const [formTriggerCondition, setFormTriggerCondition] = useState('');
  const [formTriggerExample, setFormTriggerExample] = useState('');
  const [formAction, setFormAction] = useState<'RECOMMEND_REVIEW' | 'PROHIBIT_REUSE' | 'ONLY_ALERT'>('RECOMMEND_REVIEW');
  const [formPriority, setFormPriority] = useState(1);
  const [formIsEnabled, setFormIsEnabled] = useState(true);
  const [formRemarks, setFormRemarks] = useState('');

  // Handle edit action
  const startEdit = (item: HardRule) => {
    setEditingItem(item);
    setIsNew(false);

    // Fill form states
    setFormRuleName(item.ruleName);
    setFormRuleType(item.ruleType);
    setFormObjectType(item.applicableObjectType);
    setFormCategory(item.applicableCategory);
    setFormTriggerField(item.triggerField);
    setFormTriggerCondition(item.triggerCondition);
    setFormTriggerExample(item.triggerExample || '');
    setFormAction(item.actionAfterTrigger);
    setFormPriority(item.priority);
    setFormIsEnabled(item.isEnabled);
    setFormRemarks(item.remarks || '');

    setActiveTab('EDITOR');
  };

  // Handle start new item
  const startCreate = () => {
    setEditingItem(null);
    setIsNew(true);

    // Reset form states
    setFormRuleName('');
    setFormRuleType('FORCE_REVIEW');
    setFormObjectType('PART_MECHANICAL');
    setFormCategory('ALL');
    setFormTriggerField('');
    setFormTriggerCondition('');
    setFormTriggerExample('');
    setFormAction('RECOMMEND_REVIEW');
    setFormPriority(3);
    setFormIsEnabled(true);
    setFormRemarks('');

    setActiveTab('EDITOR');
  };

  // Save changes
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRuleName || !formTriggerField || !formTriggerCondition) {
      alert('请填写规则名称、触发属性字段与触发条件！');
      return;
    }

    const nextId = isNew ? `HR-00${hardRules.length + 1}` : (editingItem?.id || 'HR-999');

    const savedItem: HardRule = {
      id: nextId,
      ruleName: formRuleName,
      ruleType: formRuleType,
      applicableObjectType: formObjectType,
      applicableCategory: formCategory,
      triggerField: formTriggerField,
      triggerCondition: formTriggerCondition,
      triggerExample: formTriggerExample,
      actionAfterTrigger: formAction,
      priority: Number(formPriority),
      isEnabled: formIsEnabled,
      remarks: formRemarks
    };

    let updatedList: HardRule[] = [];
    if (isNew) {
      updatedList = [...hardRules, savedItem];
      alert(`🎉 成功添加新硬性控制规则 [${formRuleName}]`);
    } else {
      updatedList = hardRules.map(item => item.id === editingItem?.id ? savedItem : item);
      alert(`🎉 硬规则 [${formRuleName}] 修改保存成功！`);
    }

    onUpdateHardRules(updatedList);
    setEditingItem(null);
    setIsNew(false);
    setActiveTab('LIST');
  };

  // Delete item
  const handleDelete = (id: string, name: string) => {
    if (confirm(`确定要移除硬规则 [${name}] 吗？移除后将不再执行此项一票强控校验。`)) {
      onUpdateHardRules(hardRules.filter(item => item.id !== id));
    }
  };

  // Toggle status
  const toggleEnabled = (id: string) => {
    const updated = hardRules.map(item => {
      if (item.id === id) {
        return { ...item, isEnabled: !item.isEnabled };
      }
      return item;
    });
    onUpdateHardRules(updated);
  };

  // Filtered List
  const filteredItems = useMemo(() => {
    return hardRules.filter(r => {
      const matchKeyword = keyword === '' ||
        r.ruleName.toLowerCase().includes(keyword.toLowerCase()) ||
        r.triggerField.toLowerCase().includes(keyword.toLowerCase()) ||
        r.triggerCondition.toLowerCase().includes(keyword.toLowerCase());

      const matchRuleType = filterRuleType === 'ALL' || r.ruleType === filterRuleType;

      return matchKeyword && matchRuleType;
    });
  }, [hardRules, keyword, filterRuleType]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">

      {/* View Header with Breadcrumb */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0 flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2 text-xs text-slate-500 mb-1">
            <span>相似度 / 三化配置</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-800 font-medium">一票否决与强控规则</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">强制复核 / 不可复用规则配置</h1>
          <p className="text-xs text-slate-500 mt-1">
            建立在相似度打分之上的“绝对阀门”。对物料全生命周期状态（已作废、不可回收）、材质大类不重合、标称参数过大等工程禁区实行一票否定或强制人工复审。
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            onClick={() => setActiveTab('LIST')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'LIST'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/50'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>硬规则列表</span>
          </button>

          <button
            onClick={() => {
              if (!editingItem && activeTab === 'LIST') {
                startCreate();
              } else {
                setActiveTab('EDITOR');
              }
            }}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'EDITOR'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/50'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <FileEdit className="w-3.5 h-3.5" />
            <span>{isNew ? '新建硬性控制规则' : editingItem ? `编辑: ${editingItem.ruleName}` : '新建/编辑视图 (空白)'}</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Frame */}
      {activeTab === 'LIST' ? (
        // List View Block
        <div className="flex-1 flex flex-col overflow-hidden p-6 space-y-4">

          {/* Filters Bar */}
          <div className="bg-white border border-slate-200 rounded-lg p-3.5 flex flex-wrap items-center gap-4 shrink-0 shadow-xs">
            <div className="flex items-center space-x-1.5 text-xs text-slate-600">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold">规则筛选:</span>
            </div>

            {/* Keyword */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="搜索规则名/触发字段..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="bg-white border border-slate-300 rounded pl-8 pr-2.5 py-1 text-xs w-48 font-sans text-slate-700 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Rule Type */}
            <div className="flex items-center space-x-1.5 text-xs">
              <span className="text-slate-500">规则类型:</span>
              <select
                value={filterRuleType}
                onChange={(e) => setFilterRuleType(e.target.value)}
                className="bg-white border border-slate-300 rounded px-2 py-1 text-xs font-sans text-slate-700"
              >
                <option value="ALL">全部控制动作</option>
                <option value="FORCE_REVIEW">一票强制复核 (FORCE_REVIEW)</option>
                <option value="NON_REUSABLE">绝对不可复用 (NON_REUSABLE)</option>
                <option value="RISK_ALERT">仅高亮风险提示 (RISK_ALERT)</option>
              </select>
            </div>

            {/* Reset button */}
            {(keyword !== '' || filterRuleType !== 'ALL') && (
              <button
                onClick={() => {
                  setKeyword('');
                  setFilterRuleType('ALL');
                }}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
              >
                重置
              </button>
            )}

            {/* Create Action */}
            <button
              onClick={startCreate}
              className="ml-auto flex items-center space-x-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新增硬规则</span>
            </button>
          </div>

          {/* High-density Horizontal Scrolling Table */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden flex-1 flex flex-col">
            <div className="overflow-auto flex-1">
              <table className="w-full text-left border-collapse text-xs min-w-max">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold sticky top-0 z-10">
                    <th className="px-4 py-3 text-center" style={{ width: '60px' }}>优先级</th>
                    <th className="px-4 py-3">规则名称</th>
                    <th className="px-4 py-3">规则类型</th>
                    <th className="px-4 py-3 text-center">适用大类</th>
                    <th className="px-4 py-3">触发属性字段</th>
                    <th className="px-5 py-3">触发条件表达式</th>
                    <th className="px-5 py-3">测试场景示例</th>
                    <th className="px-4 py-3">触发后业务阻拦动作</th>
                    <th className="px-3 py-3 text-center">状态</th>
                    <th className="px-5 py-3">工艺部规则备注</th>
                    <th className="px-4 py-3 text-center">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className={`hover:bg-slate-50/60 transition-colors ${!item.isEnabled ? 'bg-slate-50/40 text-slate-400' : ''}`}>

                      {/* Priority Code */}
                      <td className="px-4 py-3 text-center">
                        <span className="bg-slate-100 border border-slate-200 text-slate-800 rounded-full font-mono font-bold w-5 h-5 flex items-center justify-center mx-auto text-[10px]">
                          {item.priority}
                        </span>
                      </td>

                      {/* Rule Name */}
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {item.ruleName}
                      </td>

                      {/* Rule Type Badges */}
                      <td className="px-4 py-3">
                        {item.ruleType === 'FORCE_REVIEW' ? (
                          <span className="inline-flex items-center space-x-1 bg-amber-50 text-amber-800 border border-amber-200 rounded px-1.5 py-0.5 font-semibold text-[10px]">
                            <ShieldAlert className="w-3 h-3 text-amber-600" />
                            <span>一票强制复核</span>
                          </span>
                        ) : item.ruleType === 'NON_REUSABLE' ? (
                          <span className="inline-flex items-center space-x-1 bg-rose-100 text-rose-800 border border-rose-300 rounded px-1.5 py-0.5 font-bold text-[10px]">
                            <Octagon className="w-3 h-3 text-rose-600" />
                            <span>绝对禁止借用</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 bg-blue-50 text-blue-800 border border-blue-200 rounded px-1.5 py-0.5 text-[10px]">
                            <AlertTriangle className="w-3 h-3 text-blue-500" />
                            <span>仅风险强高亮</span>
                          </span>
                        )}
                      </td>

                      {/* Object Type */}
                      <td className="px-4 py-3 text-center font-mono font-bold text-slate-500">
                        {item.applicableObjectType === 'ALL' ? 'ALL (全局)' : item.applicableObjectType === 'PART_MECHANICAL' ? '机械 (PART)' : '电气 (ELEC)'}
                      </td>

                      {/* Trigger Field */}
                      <td className="px-4 py-3 font-mono text-slate-700 font-bold">
                        {item.triggerField}
                      </td>

                      {/* Condition Expression */}
                      <td className="px-5 py-3 text-slate-600 font-sans italic">
                        {item.triggerCondition}
                      </td>

                      {/* Trigger Example */}
                      <td className="px-5 py-3 text-slate-400 font-mono text-[10px]">
                        {item.triggerExample || '-'}
                      </td>

                      {/* Trigger Action */}
                      <td className="px-4 py-3">
                        {item.actionAfterTrigger === 'RECOMMEND_REVIEW' ? (
                          <span className="text-amber-700 font-semibold">推荐人工复核 (Audit)</span>
                        ) : item.actionAfterTrigger === 'PROHIBIT_REUSE' ? (
                          <span className="text-rose-700 font-extrabold">绝对禁选报错 (Error)</span>
                        ) : (
                          <span className="text-blue-600 font-medium">气泡卡片警示 (Alert)</span>
                        )}
                      </td>

                      {/* Switch */}
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={() => toggleEnabled(item.id)}
                          className={`inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-hidden ${
                            item.isEnabled ? 'bg-blue-600' : 'bg-slate-200'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ${
                              item.isEnabled ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </td>

                      {/* Remarks */}
                      <td className="px-5 py-3 text-slate-500 truncate max-w-[150px]" title={item.remarks}>
                        {item.remarks || '-'}
                      </td>

                      {/* Action buttons */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            onClick={() => startEdit(item)}
                            className="p-1 hover:bg-blue-50 text-blue-600 rounded hover:text-blue-800 transition-colors"
                            title="编辑"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDelete(item.id, item.ruleName)}
                            className="p-1 hover:bg-rose-50 text-rose-600 rounded hover:text-rose-800 transition-colors"
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

            {/* aggregate info */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex justify-between font-mono">
              <span>硬规则控制节点: {hardRules.length} 个 | 一票否决生效中: {hardRules.filter(h=>h.isEnabled && h.ruleType === 'NON_REUSABLE').length} 个</span>
              <span>数据一致性审查: Manticore-v2.4.0-Schema 匹配良好</span>
            </div>
          </div>
        </div>
      ) : (
        // Separated Form Editor View Block
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
                <span className="w-1.5 h-3 bg-blue-600 rounded-full"></span>
                <span>{isNew ? '新建硬性控制/一票否决规则' : `编辑规则详情 - ${editingItem?.ruleName}`}</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Figma Rule Spec v2.4</span>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5 text-xs text-slate-700">

              {/* Row 1: Rule Name & Rule Type */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-slate-600 font-semibold">硬规则名称 <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={formRuleName}
                    onChange={(e) => setFormRuleName(e.target.value)}
                    placeholder="如：已停用生命周期物料严禁引入"
                    className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs focus:ring-1 focus:ring-blue-500 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-slate-600 font-semibold">控制动作类型 <span className="text-rose-500">*</span></label>
                  <select
                    value={formRuleType}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      setFormRuleType(val);
                      if (val === 'NON_REUSABLE') {
                        setFormAction('PROHIBIT_REUSE');
                      } else if (val === 'RISK_ALERT') {
                        setFormAction('ONLY_ALERT');
                      } else {
                        setFormAction('RECOMMEND_REVIEW');
                      }
                    }}
                    className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs focus:ring-1 focus:ring-blue-500 font-bold"
                  >
                    <option value="FORCE_REVIEW">一票强制复核 (FORCE_REVIEW) - 触发人工审查流</option>
                    <option value="NON_REUSABLE">绝对不可复用 (NON_REUSABLE) - 阻断借用并报错</option>
                    <option value="RISK_ALERT">仅高亮风险提示 (RISK_ALERT) - 仅做警告无硬性制约</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Target Object Type & Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-slate-600 font-semibold">适用物料类型</label>
                  <select
                    value={formObjectType}
                    onChange={(e) => setFormObjectType(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="ALL">ALL (全局适用)</option>
                    <option value="PART_MECHANICAL">PART_MECHANICAL (机械零件)</option>
                    <option value="PART_ELECTRICAL">PART_ELECTRICAL (电气元器件)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-slate-600 font-semibold">执行校验优先级 <span className="text-rose-500">*</span></label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formPriority}
                    onChange={(e) => setFormPriority(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs font-mono focus:ring-1 focus:ring-blue-500"
                  />
                  <span className="text-[10px] text-slate-400 block">数字越小优先级越高 (如 1 优先于 5 校验)</span>
                </div>
              </div>

              {/* Row 3: Trigger Field & Trigger Condition */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-slate-600 font-semibold">触发字段属性编码 (Property Code) <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={formTriggerField}
                    onChange={(e) => setFormTriggerField(e.target.value)}
                    placeholder="如：lifecycle_state 或 nominal_diameter"
                    className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs focus:ring-1 focus:ring-blue-500 font-mono text-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-slate-600 font-semibold">触发条件表达式/描述 <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={formTriggerCondition}
                    onChange={(e) => setFormTriggerCondition(e.target.value)}
                    placeholder="如：状态为已停用/已作废"
                    className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs focus:ring-1 focus:ring-blue-500 text-slate-700"
                  />
                </div>
              </div>

              {/* Grid: Trigger Example & Action after Trigger */}
              <div className="grid grid-cols-2 gap-4 border border-slate-100 rounded-lg p-3 bg-slate-50">
                <div className="space-y-1">
                  <label className="block text-slate-600 font-semibold">测试用例/触发场景示例</label>
                  <input
                    type="text"
                    value={formTriggerExample}
                    onChange={(e) => setFormTriggerExample(e.target.value)}
                    placeholder="如：源: 10mm vs 候选: 12mm"
                    className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs focus:ring-1 focus:ring-blue-500 font-mono text-slate-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-slate-600 font-semibold">执行动作映射 (系统级 Action)</label>
                  <select
                    disabled
                    value={formAction}
                    className="w-full bg-slate-100 border border-slate-300 rounded p-1.5 text-xs font-mono text-slate-500 cursor-not-allowed"
                  >
                    <option value="RECOMMEND_REVIEW">RECOMMEND_REVIEW (强制人工复核)</option>
                    <option value="PROHIBIT_REUSE">PROHIBIT_REUSE (不可借用报错阻断)</option>
                    <option value="ONLY_ALERT">ONLY_ALERT (轻量气泡卡高亮警告)</option>
                  </select>
                </div>
              </div>

              {/* Form Input: Remarks */}
              <div className="space-y-1">
                <label className="block text-slate-600 font-semibold">规则制定背景及业务约束说明</label>
                <textarea
                  value={formRemarks}
                  onChange={(e) => setFormRemarks(e.target.value)}
                  rows={3}
                  placeholder="请输入该规则详细的业务制订原委，供其他工艺规划工程师及研发参考..."
                  className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs focus:ring-1 focus:ring-blue-500 text-slate-700"
                />
              </div>

              {/* Form Switch: Enabled */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <div>
                  <span className="font-semibold block text-slate-700">是否激活此硬规则校验节点</span>
                  <span className="text-slate-400 text-[10px] block">若不启用，该规则对应的阻断或强制复审功能将被临时豁免</span>
                </div>
                <button
                  type="button"
                  onClick={() => setFormIsEnabled(!formIsEnabled)}
                  className={`inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-hidden ${
                    formIsEnabled ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                >
                  <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ${formIsEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Form Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setEditingItem(null);
                    setIsNew(false);
                    setActiveTab('LIST');
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold font-sans border border-slate-300 transition-all"
                >
                  取消并返回列表
                </button>

                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold font-sans shadow-xs flex items-center space-x-1.5 transition-all"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>保存规则配置</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
