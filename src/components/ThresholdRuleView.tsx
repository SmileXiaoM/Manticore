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
  HelpCircle,
  SlidersHorizontal,
  ChevronRight,
  List,
  FileEdit,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { ThresholdRule, ObjectType } from '../types';

interface ThresholdRuleViewProps {
  thresholdRules: ThresholdRule[];
  onUpdateThresholdRules: (newRules: ThresholdRule[]) => void;
}

export const ThresholdRuleView: React.FC<ThresholdRuleViewProps> = ({ 
  thresholdRules, 
  onUpdateThresholdRules 
}) => {
  // Navigation tabs for Figma review: 'LIST' | 'EDITOR'
  const [activeTab, setActiveTab] = useState<'LIST' | 'EDITOR'>('LIST');

  // Selected item for editor
  const [editingItem, setEditingItem] = useState<ThresholdRule | null>(null);
  const [isNew, setIsNew] = useState(false);

  // Filters state
  const [keyword, setKeyword] = useState('');
  const [filterObjectType, setFilterObjectType] = useState<string>('ALL');

  // Form states (for editor tab)
  const [formRuleName, setFormRuleName] = useState('');
  const [formObjectType, setFormObjectType] = useState<ObjectType>('PART_MECHANICAL');
  const [formCategory, setFormCategory] = useState('');
  const [formReuseThreshold, setFormReuseThreshold] = useState(86);
  const [formReviewThresholdMin, setFormReviewThresholdMin] = useState(68);
  const [formIsEnabled, setFormIsEnabled] = useState(true);
  const [formRemarks, setFormRemarks] = useState('');

  // Handle edit action
  const startEdit = (item: ThresholdRule) => {
    setEditingItem(item);
    setIsNew(false);
    
    // Fill form states
    setFormRuleName(item.ruleName);
    setFormObjectType(item.applicableObjectType);
    setFormCategory(item.applicableCategory);
    setFormReuseThreshold(item.reuseThreshold);
    setFormReviewThresholdMin(item.reviewThresholdMin);
    setFormIsEnabled(item.isEnabled);
    setFormRemarks(item.remarks);

    setActiveTab('EDITOR');
  };

  // Handle start new item
  const startCreate = () => {
    setEditingItem(null);
    setIsNew(true);

    // Reset form states
    setFormRuleName('');
    setFormObjectType('PART_MECHANICAL');
    setFormCategory('');
    setFormReuseThreshold(85);
    setFormReviewThresholdMin(65);
    setFormIsEnabled(true);
    setFormRemarks('');

    setActiveTab('EDITOR');
  };

  // Save changes
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRuleName || !formCategory) {
      alert('请填写规则名称和适用分类！');
      return;
    }

    if (Number(formReviewThresholdMin) >= Number(formReuseThreshold)) {
      alert('⚠️ 校验失败: 建议复核下限必须小于建议复用上限阈值！');
      return;
    }

    const nextId = isNew ? `TR-00${thresholdRules.length + 1}` : (editingItem?.id || 'TR-999');
    
    const savedItem: ThresholdRule = {
      id: nextId,
      ruleName: formRuleName,
      applicableObjectType: formObjectType,
      applicableCategory: formCategory,
      reuseThreshold: Number(formReuseThreshold),
      reviewThresholdMin: Number(formReviewThresholdMin),
      reviewThresholdMax: Number(formReuseThreshold),
      isEnabled: formIsEnabled,
      version: 'v2.4.0',
      remarks: formRemarks
    };

    let updatedList: ThresholdRule[] = [];
    if (isNew) {
      updatedList = [...thresholdRules, savedItem];
      alert(`🎉 成功添加新阈值决策规则 [${formRuleName}]`);
    } else {
      updatedList = thresholdRules.map(item => item.id === editingItem?.id ? savedItem : item);
      alert(`🎉 规则 [${formRuleName}] 修改保存成功！`);
    }

    onUpdateThresholdRules(updatedList);
    setEditingItem(null);
    setIsNew(false);
    setActiveTab('LIST');
  };

  // Delete item
  const handleDelete = (id: string, name: string) => {
    if (confirm(`确定要移除阈值规则 [${name}] 吗？移除后相关分类将自动回退到全局默认阈值区间进行三化审核。`)) {
      onUpdateThresholdRules(thresholdRules.filter(item => item.id !== id));
    }
  };

  // Toggle status
  const toggleEnabled = (id: string) => {
    const updated = thresholdRules.map(item => {
      if (item.id === id) {
        return { ...item, isEnabled: !item.isEnabled };
      }
      return item;
    });
    onUpdateThresholdRules(updated);
  };

  // Filtered List
  const filteredItems = useMemo(() => {
    return thresholdRules.filter(r => {
      const matchKeyword = keyword === '' ||
        r.ruleName.toLowerCase().includes(keyword.toLowerCase()) ||
        r.applicableCategory.toLowerCase().includes(keyword.toLowerCase());
      
      const matchObjectType = filterObjectType === 'ALL' || r.applicableObjectType === filterObjectType;

      return matchKeyword && matchObjectType;
    });
  }, [thresholdRules, keyword, filterObjectType]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
      
      {/* View Header with Breadcrumb */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0 flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2 text-xs text-slate-500 mb-1">
            <span>相似度 / 三化配置</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-800 font-medium">阈值规则配置</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">阈值规则配置</h1>
          <p className="text-xs text-slate-500 mt-1">
            将 Manticore 评分节点算出的 0-100% 字段属性相似度，根据业务规则划分三大去重决策带。从而指导研发借用、标准化审查以及自由新建。
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
            <span>阈值规则列表</span>
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
            <span>{isNew ? '新建阈值规则' : editingItem ? `编辑: ${editingItem.ruleName}` : '新建/编辑视图 (空白)'}</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Frame */}
      {activeTab === 'LIST' ? (
        // List View Block
        <div className="flex-1 flex flex-col overflow-hidden p-6 space-y-4">
          
          {/* Layman Explanation Guidebox */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-start space-x-3 shadow-xs">
            <AlertCircle className="w-5 h-5 text-emerald-700 mt-0.5 shrink-0" />
            <div className="text-xs text-emerald-800 space-y-1">
              <span className="font-bold text-sm block">💡 极简业务阈值决策轴线设计（外行友好）：</span>
              <p className="leading-relaxed">
                算法打分只是基础分值。通过配置阈值线，系统直接将分值重译为对具体研发、采购行为的清晰业务建议：
              </p>
              <div className="flex items-center space-x-2 pt-1 font-sans">
                <span className="bg-slate-200 text-slate-800 px-2 py-1 rounded font-bold">低于新建阈值 (&lt; 68%)</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="bg-amber-100 text-amber-800 border border-amber-300 px-2 py-1 rounded font-bold">建议复核区间 (68% - 86%)</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="bg-emerald-600 text-white px-2 py-1 rounded font-bold">建议复用区间 (&gt;= 86%)</span>
              </div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-white border border-slate-200 rounded-lg p-3.5 flex flex-wrap items-center gap-4 shrink-0 shadow-xs">
            <div className="flex items-center space-x-1.5 text-xs text-slate-600">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold">筛选过滤:</span>
            </div>

            {/* Keyword */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="搜索规则名称/适用分类..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="bg-white border border-slate-300 rounded pl-8 pr-2.5 py-1 text-xs w-48 font-sans text-slate-700 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Object Type */}
            <div className="flex items-center space-x-1.5 text-xs">
              <span className="text-slate-500">对象类型:</span>
              <select
                value={filterObjectType}
                onChange={(e) => setFilterObjectType(e.target.value)}
                className="bg-white border border-slate-300 rounded px-2 py-1 text-xs font-sans text-slate-700"
              >
                <option value="ALL">全部类型</option>
                <option value="PART_MECHANICAL">机械零件</option>
                <option value="PART_ELECTRICAL">电气元器件</option>
              </select>
            </div>

            {/* Reset button */}
            {(keyword !== '' || filterObjectType !== 'ALL') && (
              <button
                onClick={() => {
                  setKeyword('');
                  setFilterObjectType('ALL');
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
              <span>新增阈值规则</span>
            </button>
          </div>

          {/* High-density Horizontal Scrolling Table */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden flex-1 flex flex-col">
            <div className="overflow-auto flex-1">
              <table className="w-full text-left border-collapse text-xs min-w-max">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold sticky top-0 z-10">
                    <th className="px-4 py-3">规则名称</th>
                    <th className="px-4 py-3">适用对象类型</th>
                    <th className="px-5 py-3">适用分类路径</th>
                    <th className="px-6 py-3" style={{ width: '280px' }}>三化决策轴可视化 (低于: 新建 | 介于: 复核 | 高于: 复用)</th>
                    <th className="px-4 py-3 text-center">允许新建阈值</th>
                    <th className="px-4 py-3 text-center">建议复核区间</th>
                    <th className="px-4 py-3 text-center">建议复用阈值</th>
                    <th className="px-3 py-3 text-center">是否启用</th>
                    <th className="px-4 py-3">生效版本</th>
                    <th className="px-5 py-3">备注说明</th>
                    <th className="px-4 py-3 text-center">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {filteredItems.map((item) => {
                    const min = item.reviewThresholdMin;
                    const max = item.reuseThreshold;

                    return (
                      <tr key={item.id} className={`hover:bg-slate-50/60 transition-colors ${!item.isEnabled ? 'bg-slate-50/40 text-slate-400' : ''}`}>
                        
                        {/* Name */}
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {item.ruleName}
                        </td>

                        {/* Object Type */}
                        <td className="px-4 py-3 font-mono font-bold text-slate-700">
                          {item.applicableObjectType === 'PART_MECHANICAL' ? '机械零件 (PART)' : '电气元器件 (ELEC)'}
                        </td>

                        {/* Category Path */}
                        <td className="px-5 py-3 font-mono text-slate-600 font-medium">
                          {item.applicableCategory}
                        </td>

                        {/* Visual Segmented Slider (Extremely understandable for laymen) */}
                        <td className="px-6 py-3">
                          <div className="space-y-1.5" style={{ width: '280px' }}>
                            <div className="h-2.5 rounded-full bg-slate-100 flex overflow-hidden border border-slate-200">
                              {/* Allow Create block */}
                              <div className="bg-slate-400" style={{ width: `${min}%` }} title={`小于 ${min}%: 允许自由新建`} />
                              {/* Review block */}
                              <div className="bg-amber-400" style={{ width: `${max - min}%` }} title={`介于 ${min}% 和 ${max}%: 必须提报人工复核`} />
                              {/* Reuse block */}
                              <div className="bg-emerald-500" style={{ width: `${100 - max}%` }} title={`大于等于 ${max}%: 强烈建议直接借用/复用`} />
                            </div>
                            
                            {/* Label markers */}
                            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                              <span>0%</span>
                              <span className="text-slate-600 font-bold">{min}%</span>
                              <span className="text-emerald-700 font-bold">{max}%</span>
                              <span>100%</span>
                            </div>
                          </div>
                        </td>

                        {/* Allow Create */}
                        <td className="px-4 py-3 text-center">
                          <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono font-semibold">
                            &lt; {min}%
                          </span>
                        </td>

                        {/* Review Range */}
                        <td className="px-4 py-3 text-center">
                          <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-mono font-bold">
                            {min}% - {max}%
                          </span>
                        </td>

                        {/* Recommend Reuse */}
                        <td className="px-4 py-3 text-center">
                          <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-mono font-extrabold">
                            &gt;= {max}%
                          </span>
                        </td>

                        {/* Is Enabled switch */}
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

                        {/* Version */}
                        <td className="px-4 py-3 font-mono text-slate-500 font-medium">
                          {item.version}
                        </td>

                        {/* Remarks */}
                        <td className="px-5 py-3 text-slate-500 truncate max-w-[200px]" title={item.remarks}>
                          {item.remarks}
                        </td>

                        {/* Actions */}
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
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom aggregate stats */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex justify-between font-mono">
              <span>总配置三化阈值准则: {thresholdRules.length} 条</span>
              <span>同步版本: Manticore-v2.4 已完成静态编译</span>
            </div>
          </div>
        </div>
      ) : (
        // Separated Editor View Block
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
                <span className="w-1.5 h-3 bg-blue-600 rounded-full"></span>
                <span>{isNew ? '新建三化阈值决策规则' : `编辑规则详情 - ${editingItem?.ruleName} (${editingItem?.id})`}</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Figma Rule Spec v2.4</span>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5 text-xs text-slate-700">
              
              {/* Form Input: Rule Name */}
              <div className="space-y-1">
                <label className="block text-slate-600 font-semibold">规则名称 <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={formRuleName}
                  onChange={(e) => setFormRuleName(e.target.value)}
                  placeholder="如：标准紧固件三化审核推荐准则"
                  className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs focus:ring-1 focus:ring-blue-500 font-semibold text-slate-800"
                />
              </div>

              {/* Grid: Object Type & Applicable Category */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-slate-600 font-semibold">适用对象类型 <span className="text-rose-500">*</span></label>
                  <select
                    value={formObjectType}
                    onChange={(e) => setFormObjectType(e.target.value as ObjectType)}
                    className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="PART_MECHANICAL">机械零件 (PART_MECHANICAL)</option>
                    <option value="PART_ELECTRICAL">电气元器件 (PART_ELECTRICAL)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-slate-600 font-semibold">适用 PLM 分类树路径 (前缀匹配) <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="如：/国家标准分类/紧固件 或 ALL"
                    className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs focus:ring-1 focus:ring-blue-500 font-mono text-slate-700"
                  />
                </div>
              </div>

              {/* Grid: Threshold configurations with Slider Visualization */}
              <div className="border border-slate-100 rounded-lg p-4 bg-slate-50 space-y-4">
                <span className="font-semibold text-slate-800 block text-xs pb-1 border-b border-slate-200">
                  📈 阈值刻度设定 (0% - 100% 相似度比例)
                </span>

                <div className="grid grid-cols-2 gap-4">
                  {/* Lower bound threshold */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-baseline">
                      <label className="block text-slate-600 font-semibold">建议复核阈值下限 (%)</label>
                      <span className="text-[10px] text-slate-400">低于此线允许自由新建</span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formReviewThresholdMin}
                      onChange={(e) => setFormReviewThresholdMin(Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs font-mono font-bold text-slate-800 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* Upper bound reuse threshold */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-baseline">
                      <label className="block text-slate-600 font-semibold">建议借用/复用阈值 (%)</label>
                      <span className="text-[10px] text-slate-400">高于此线建议直接复用已有件</span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formReuseThreshold}
                      onChange={(e) => setFormReuseThreshold(Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs font-mono font-bold text-slate-800 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Simulated interactive scale based on input */}
                <div className="space-y-1 pt-1.5">
                  <span className="text-[10px] text-slate-500 font-bold block">实时规则决策轴预览:</span>
                  <div className="h-5 rounded-full bg-slate-200 flex overflow-hidden text-[9px] text-white font-bold font-sans text-center items-center shadow-xs">
                    <div className="bg-slate-400 h-full flex items-center justify-center" style={{ width: `${formReviewThresholdMin}%` }}>
                      &lt; {formReviewThresholdMin}% 自由新建
                    </div>
                    
                    <div className="bg-amber-400 h-full flex items-center justify-center text-slate-800" style={{ width: `${formReuseThreshold - formReviewThresholdMin}%` }}>
                      {formReviewThresholdMin}% - {formReuseThreshold}% 人工复核
                    </div>
                    
                    <div className="bg-emerald-500 h-full flex items-center justify-center" style={{ width: `${100 - formReuseThreshold}%` }}>
                      &gt;= {formReuseThreshold}% 直接借用
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Input: Remarks */}
              <div className="space-y-1">
                <label className="block text-slate-600 font-semibold">规则备注与说明</label>
                <textarea
                  value={formRemarks}
                  onChange={(e) => setFormRemarks(e.target.value)}
                  rows={3}
                  placeholder="写明为什么制定该套阈值规则，如：紧固件为大批量采购品，需强制高借用率以收敛库存，因此设为86%。"
                  className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs focus:ring-1 focus:ring-blue-500 text-slate-700"
                />
              </div>

              {/* Form Input: Enabled */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <div>
                  <span className="font-semibold block text-slate-700">是否立即启用该阈值判定集 (IsEnabled)</span>
                  <span className="text-slate-400 text-[10px] block">若不启用，三化审查引擎将跳过该规则</span>
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
