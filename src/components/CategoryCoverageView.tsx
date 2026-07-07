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
  FolderTree,
  Network,
  GitFork
} from 'lucide-react';
import { CategoryCoverage } from '../types';

interface CategoryCoverageViewProps {
  coverages: CategoryCoverage[];
  onUpdateCoverages: (newCoverages: CategoryCoverage[]) => void;
}

export const CategoryCoverageView: React.FC<CategoryCoverageViewProps> = ({ 
  coverages, 
  onUpdateCoverages 
}) => {
  // Navigation tabs for Figma review: 'LIST' | 'EDITOR'
  const [activeTab, setActiveTab] = useState<'LIST' | 'EDITOR'>('LIST');

  // Selected item for editor
  const [editingItem, setEditingItem] = useState<CategoryCoverage | null>(null);
  const [isNew, setIsNew] = useState(false);

  // Filters state
  const [keyword, setKeyword] = useState('');
  const [filterInherit, setFilterInherit] = useState<string>('ALL');

  // Form states (for editor tab)
  const [formCategoryPath, setFormCategoryPath] = useState('');
  const [formObjectType, setFormObjectType] = useState('PART_MECHANICAL');
  const [formWhitelistId, setFormWhitelistId] = useState('');
  const [formSimilarityRuleSetId, setFormSimilarityRuleSetId] = useState('');
  const [formThresholdRuleId, setFormThresholdRuleId] = useState('');
  const [formHardRuleSetIdsString, setFormHardRuleSetIdsString] = useState('');
  const [formWeightOverrideInfo, setFormWeightOverrideInfo] = useState('');
  const [formInheritParent, setFormInheritParent] = useState(true);
  const [formIsEnabled, setFormIsEnabled] = useState(true);

  // Handle edit action
  const startEdit = (item: CategoryCoverage) => {
    setEditingItem(item);
    setIsNew(false);
    
    // Fill form states
    setFormCategoryPath(item.categoryPath);
    setFormObjectType(item.objectType);
    setFormWhitelistId(item.whitelistId);
    setFormSimilarityRuleSetId(item.similarityRuleSetId);
    setFormThresholdRuleId(item.thresholdRuleId);
    setFormHardRuleSetIdsString(item.hardRuleSetIds.join(', '));
    setFormWeightOverrideInfo(item.weightOverrideInfo || '');
    setFormInheritParent(item.inheritParent);
    setFormIsEnabled(item.isEnabled);

    setActiveTab('EDITOR');
  };

  // Handle start new item
  const startCreate = () => {
    setEditingItem(null);
    setIsNew(true);

    // Reset form states
    setFormCategoryPath('');
    setFormObjectType('PART_MECHANICAL');
    setFormWhitelistId('WL-001, WL-002, WL-003');
    setFormSimilarityRuleSetId('紧固件专用精密评分参数集');
    setFormThresholdRuleId('TR-001 (紧固件大类三化准则)');
    setFormHardRuleSetIdsString('HR-001, HR-002, HR-003');
    setFormWeightOverrideInfo('继承全局默认');
    setFormInheritParent(true);
    setFormIsEnabled(true);

    setActiveTab('EDITOR');
  };

  // Save changes
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCategoryPath) {
      alert('请填写分类路径！');
      return;
    }

    const nextId = isNew ? `CC-00${coverages.length + 1}` : (editingItem?.id || 'CC-999');
    
    const savedItem: CategoryCoverage = {
      id: nextId,
      categoryPath: formCategoryPath,
      objectType: formObjectType,
      whitelistId: formWhitelistId,
      similarityRuleSetId: formSimilarityRuleSetId,
      thresholdRuleId: formThresholdRuleId,
      hardRuleSetIds: formHardRuleSetIdsString.split(',').map(s => s.trim()).filter(Boolean),
      weightOverrideInfo: formWeightOverrideInfo,
      inheritParent: formInheritParent,
      isEnabled: formIsEnabled,
      version: 'v2.4.0'
    };

    let updatedList: CategoryCoverage[] = [];
    if (isNew) {
      updatedList = [...coverages, savedItem];
      alert(`🎉 成功对分类 [${formCategoryPath}] 建立三化覆盖覆盖链`);
    } else {
      updatedList = coverages.map(item => item.id === editingItem?.id ? savedItem : item);
      alert(`🎉 分类覆盖配置 [${formCategoryPath}] 修改保存成功！`);
    }

    onUpdateCoverages(updatedList);
    setEditingItem(null);
    setIsNew(false);
    setActiveTab('LIST');
  };

  // Delete item
  const handleDelete = (id: string, path: string) => {
    if (confirm(`确定要删除分类 [${path}] 的独立覆盖规则吗？删除后该分类下所有物料申请将自动完全继承父类规则。`)) {
      onUpdateCoverages(coverages.filter(item => item.id !== id));
    }
  };

  // Toggle status
  const toggleEnabled = (id: string) => {
    const updated = coverages.map(item => {
      if (item.id === id) {
        return { ...item, isEnabled: !item.isEnabled };
      }
      return item;
    });
    onUpdateCoverages(updated);
  };

  // Filtered List
  const filteredItems = useMemo(() => {
    return coverages.filter(r => {
      const matchKeyword = keyword === '' ||
        r.categoryPath.toLowerCase().includes(keyword.toLowerCase()) ||
        r.whitelistId.toLowerCase().includes(keyword.toLowerCase());
      
      const matchInherit = filterInherit === 'ALL' || 
        (filterInherit === 'YES' && r.inheritParent) || 
        (filterInherit === 'NO' && !r.inheritParent);

      return matchKeyword && matchInherit;
    });
  }, [coverages, keyword, filterInherit]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
      
      {/* View Header with Breadcrumb */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0 flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2 text-xs text-slate-500 mb-1">
            <span>相似度 / 三化配置</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-800 font-medium">分类覆盖绑定配置</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">分类覆盖配置</h1>
          <p className="text-xs text-slate-500 mt-1">
            总览与配置特定 PLM 树目录分支（如紧固件大类下属螺栓子类）与各子规则（白名单、相似度打分参数、阈值段、一票否决强控）的绑定关系，支持向上集成继承或局部覆盖。
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
            <span>分类覆盖列表</span>
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
            <span>{isNew ? '新建分类覆盖' : editingItem ? `编辑: ${editingItem.categoryPath}` : '新建/编辑视图 (空白)'}</span>
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
              <span className="font-semibold">覆盖层级过滤:</span>
            </div>

            {/* Keyword */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="搜索分类路径/白名单..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="bg-white border border-slate-300 rounded pl-8 pr-2.5 py-1 text-xs w-48 font-sans text-slate-700 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Inherit Toggle */}
            <div className="flex items-center space-x-1.5 text-xs">
              <span className="text-slate-500">是否继承父级:</span>
              <select
                value={filterInherit}
                onChange={(e) => setFilterInherit(e.target.value)}
                className="bg-white border border-slate-300 rounded px-2 py-1 text-xs font-sans text-slate-700"
              >
                <option value="ALL">全部层级类型</option>
                <option value="YES">是 (仅看完全继承项)</option>
                <option value="NO">否 (仅看独立重载覆盖项)</option>
              </select>
            </div>

            {/* Reset button */}
            {(keyword !== '' || filterInherit !== 'ALL') && (
              <button
                onClick={() => {
                  setKeyword('');
                  setFilterInherit('ALL');
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
              <span>新建独立覆盖关系</span>
            </button>
          </div>

          {/* High-density Horizontal Scrolling Table */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden flex-1 flex flex-col">
            <div className="overflow-auto flex-1">
              <table className="w-full text-left border-collapse text-xs min-w-max font-sans">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold sticky top-0 z-10">
                    <th className="px-4 py-3">分类目录路径 (PLM)</th>
                    <th className="px-4 py-3">物料大类</th>
                    <th className="px-4 py-3">字段白名单集</th>
                    <th className="px-4 py-3">物理相似度算法集</th>
                    <th className="px-4 py-3">三化阈值准则</th>
                    <th className="px-4 py-3">硬性一票否决规则集</th>
                    <th className="px-4 py-3">继承父类</th>
                    <th className="px-4 py-3">局部重载与说明</th>
                    <th className="px-3 py-3 text-center">覆盖生效</th>
                    <th className="px-4 py-3">匹配版本</th>
                    <th className="px-4 py-3 text-center">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className={`hover:bg-slate-50/60 transition-colors ${!item.isEnabled ? 'bg-slate-50/40 text-slate-400' : ''}`}>
                      
                      {/* Category Path */}
                      <td className="px-4 py-3 font-mono text-slate-900 font-semibold flex items-center space-x-1.5">
                        <FolderTree className="w-3.5 h-3.5 text-slate-400" />
                        <span>{item.categoryPath}</span>
                      </td>

                      {/* Object Type */}
                      <td className="px-4 py-3 font-mono text-slate-600">
                        {item.objectType === 'ALL' ? '全局通用 (ALL)' : item.objectType === 'PART_MECHANICAL' ? '机械 (PART)' : '电气 (ELEC)'}
                      </td>

                      {/* Whitelist ID */}
                      <td className="px-4 py-3">
                        <span className="bg-slate-100 text-slate-700 border border-slate-200 rounded px-1.5 py-0.5 text-[10px] font-mono">
                          {item.whitelistId}
                        </span>
                      </td>

                      {/* Similarity ruleset */}
                      <td className="px-4 py-3 font-sans text-slate-600">
                        {item.similarityRuleSetId}
                      </td>

                      {/* Threshold ruleset */}
                      <td className="px-4 py-3 text-slate-800 font-medium">
                        {item.thresholdRuleId}
                      </td>

                      {/* Hard ruleset list */}
                      <td className="px-4 py-3 font-mono text-[10px] text-slate-500">
                        {item.hardRuleSetIds.join(', ')}
                      </td>

                      {/* Inherit Parent Indicator */}
                      <td className="px-4 py-3">
                        {item.inheritParent ? (
                          <span className="inline-flex items-center space-x-1 text-emerald-700 bg-emerald-50 rounded px-1.5 py-0.5 font-medium">
                            <Check className="w-3 h-3" />
                            <span>向上继承</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-blue-700 bg-blue-50 rounded px-1.5 py-0.5 font-bold">
                            <GitFork className="w-3 h-3" />
                            <span>局部覆盖</span>
                          </span>
                        )}
                      </td>

                      {/* Weight Overrides description */}
                      <td className="px-4 py-3 text-slate-500 max-w-[200px] truncate" title={item.weightOverrideInfo}>
                        {item.weightOverrideInfo}
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

                      {/* version */}
                      <td className="px-4 py-3 font-mono text-slate-400">
                        {item.version}
                      </td>

                      {/* actions */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            onClick={() => startEdit(item)}
                            className="p-1 hover:bg-blue-50 text-blue-600 rounded hover:text-blue-800 transition-colors"
                            title="修改"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          
                          <button
                            onClick={() => handleDelete(item.id, item.categoryPath)}
                            className="p-1 hover:bg-rose-50 text-rose-600 rounded hover:text-rose-800 transition-colors"
                            title="物理删除覆盖规则"
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

            {/* aggregation */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex justify-between font-mono">
              <span>独立分类覆盖绑定数: {coverages.length} 组</span>
              <span>默认总线: RESTful API 同步完毕</span>
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
                <span>{isNew ? '新建分类规则绑定覆盖关系' : `编辑分类覆盖关系 - ${editingItem?.categoryPath}`}</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Figma Mapping Spec v2.4</span>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5 text-xs text-slate-700">
              
              {/* Row 1: Category path and Object Type */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-slate-600 font-semibold">PLM 分类树节点物理路径 (前缀强匹配) <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={formCategoryPath}
                    onChange={(e) => setFormCategoryPath(e.target.value)}
                    placeholder="如：/国家标准分类/紧固件/螺栓"
                    className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs focus:ring-1 focus:ring-blue-500 font-mono font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-slate-600 font-semibold">限制适用物料类型</label>
                  <select
                    value={formObjectType}
                    onChange={(e) => setFormObjectType(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="ALL">ALL (全部通用)</option>
                    <option value="PART_MECHANICAL">PART_MECHANICAL (机械零件)</option>
                    <option value="PART_ELECTRICAL">PART_ELECTRICAL (电气元器件)</option>
                  </select>
                </div>
              </div>

              {/* Grid: Connected rules (Whitelist, Similarity, Threshold, Hard Rules) */}
              <div className="border border-slate-100 rounded-lg p-4 bg-slate-50 space-y-4">
                <span className="font-semibold text-slate-800 block text-xs pb-1 border-b border-slate-200 flex items-center space-x-1">
                  <Network className="w-3.5 h-3.5 text-blue-600" />
                  <span>⛓️ 绑定规则链路分配</span>
                </span>

                <div className="grid grid-cols-2 gap-4">
                  {/* Whitelist mapping */}
                  <div className="space-y-1">
                    <label className="block text-slate-600 font-semibold">1. 字段白名单集 (Whitelist IDs)</label>
                    <input
                      type="text"
                      value={formWhitelistId}
                      onChange={(e) => setFormWhitelistId(e.target.value)}
                      placeholder="如：WL-001, WL-002, WL-003, WL-004"
                      className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs focus:ring-1 focus:ring-blue-500 font-mono"
                    />
                  </div>

                  {/* Similarity configuration */}
                  <div className="space-y-1">
                    <label className="block text-slate-600 font-semibold">2. 物理相似度算法评分集</label>
                    <input
                      type="text"
                      value={formSimilarityRuleSetId}
                      onChange={(e) => setFormSimilarityRuleSetId(e.target.value)}
                      placeholder="输入相似度评分套件名"
                      className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Threshold mapping */}
                  <div className="space-y-1">
                    <label className="block text-slate-600 font-semibold">3. 三化阈值准则 (Decision Threshold)</label>
                    <input
                      type="text"
                      value={formThresholdRuleId}
                      onChange={(e) => setFormThresholdRuleId(e.target.value)}
                      placeholder="TR-001 (紧固件大类三化准则)..."
                      className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* Hard rules mappings */}
                  <div className="space-y-1">
                    <label className="block text-slate-600 font-semibold">4. 一票强控规则集 (Hard Rules IDs)</label>
                    <input
                      type="text"
                      value={formHardRuleSetIdsString}
                      onChange={(e) => setFormHardRuleSetIdsString(e.target.value)}
                      placeholder="以逗号分隔，如：HR-001, HR-002, HR-003"
                      className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs focus:ring-1 focus:ring-blue-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Row 4: Weight Overrides Details */}
              <div className="space-y-1">
                <label className="block text-slate-600 font-semibold">独立字段权重重载及参数修正详情说明 (Weight Overrides)</label>
                <textarea
                  value={formWeightOverrideInfo}
                  onChange={(e) => setFormWeightOverrideInfo(e.target.value)}
                  rows={2}
                  placeholder="写明此分类是否重载了默认白名单权重，如：螺距权重上调至 15%, 标称直径权重上调至 20%"
                  className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs focus:ring-1 focus:ring-blue-500 text-slate-700"
                />
              </div>

              {/* Grid: Inherit Settings & Enabled toggle */}
              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold block text-slate-700">继承父级分类设定 (InheritParent)</span>
                    <span className="text-slate-400 text-[10px] block">开启后未注明的规则项默认自动沿用上级参数</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormInheritParent(!formInheritParent)}
                    className={`inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-hidden ${
                      formInheritParent ? 'bg-blue-600' : 'bg-slate-200'
                    }`}
                  >
                    <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ${formInheritParent ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold block text-slate-700">是否激活该覆盖条目</span>
                    <span className="text-slate-400 text-[10px] block">若关闭，三化计算时此独立覆盖段将不生效</span>
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
                  <span>保存覆盖绑定</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
