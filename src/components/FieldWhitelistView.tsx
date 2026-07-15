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
  FileEdit
} from 'lucide-react';
import { FieldWhitelistItem, ObjectType } from '../types';

interface FieldWhitelistViewProps {
  whitelists: FieldWhitelistItem[];
  onUpdateWhitelists: (newItems: FieldWhitelistItem[]) => void;
}

export const FieldWhitelistView: React.FC<FieldWhitelistViewProps> = ({ 
  whitelists, 
  onUpdateWhitelists 
}) => {
  // Navigation tabs for Figma review: 'LIST' | 'EDITOR'
  const [activeTab, setActiveTab] = useState<'LIST' | 'EDITOR'>('LIST');

  // Selected item for editor
  const [editingItem, setEditingItem] = useState<FieldWhitelistItem | null>(null);
  const [isNew, setIsNew] = useState(false);

  // Filters state
  const [keyword, setKeyword] = useState('');
  const [filterObjectType, setFilterObjectType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Form states (for editor tab)
  const [formObjectType, setFormObjectType] = useState<ObjectType>('PART_MECHANICAL');
  const [formFieldName, setFormFieldName] = useState('');
  const [formPropertyCode, setFormPropertyCode] = useState('');
  const [formFieldType, setFormFieldType] = useState<'TEXT' | 'NUMBER' | 'ENUM' | 'CLASS_TREE' | 'DATE' | 'OBJECT_REF'>('TEXT');
  const [formIsEnabled, setFormIsEnabled] = useState(true);
  const [formIsFilterActive, setFormIsFilterActive] = useState(true);
  const [formIsScoreActive, setFormIsScoreActive] = useState(true);
  const [formIsTextMatchActive, setFormIsTextMatchActive] = useState(false);
  const [formIsRequiredForAudit, setFormIsRequiredForAudit] = useState(false);
  const [formShowInApp, setFormShowInApp] = useState(true);
  const [formShowDifference, setFormShowDifference] = useState(true);
  const [formDefaultMatchMethod, setFormDefaultMatchMethod] = useState('精确匹配');
  const [formDefaultWeight, setFormDefaultWeight] = useState(15);
  const [formSortOrder, setFormSortOrder] = useState(10);

  // Handle edit action
  const startEdit = (item: FieldWhitelistItem) => {
    setEditingItem(item);
    setIsNew(false);
    
    // Fill form states
    setFormObjectType(item.objectType);
    setFormFieldName(item.fieldName);
    setFormPropertyCode(item.propertyCode);
    setFormFieldType(item.fieldType);
    setFormIsEnabled(item.isEnabled);
    setFormIsFilterActive(item.isFilterActive);
    setFormIsScoreActive(item.isScoreActive);
    setFormIsTextMatchActive(item.isTextMatchActive);
    setFormIsRequiredForAudit(item.isRequiredForAudit);
    setFormShowInApp(item.showInApp);
    setFormShowDifference(item.showDifference);
    setFormDefaultMatchMethod(item.defaultMatchMethod);
    setFormDefaultWeight(item.defaultWeight);
    setFormSortOrder(item.sortOrder);

    setActiveTab('EDITOR');
  };

  // Handle start new item
  const startCreate = () => {
    setEditingItem(null);
    setIsNew(true);

    // Reset form states
    setFormObjectType('PART_MECHANICAL');
    setFormFieldName('');
    setFormPropertyCode('');
    setFormFieldType('TEXT');
    setFormIsEnabled(true);
    setFormIsFilterActive(true);
    setFormIsScoreActive(true);
    setFormIsTextMatchActive(false);
    setFormIsRequiredForAudit(false);
    setFormShowInApp(true);
    setFormShowDifference(true);
    setFormDefaultMatchMethod('精确匹配');
    setFormDefaultWeight(10);
    setFormSortOrder(10);

    setActiveTab('EDITOR');
  };

  // Save changes
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFieldName || !formPropertyCode) {
      alert('请填写字段名称和属性编码！');
      return;
    }

    const nextId = isNew ? `WL-00${whitelists.length + 1}` : (editingItem?.id || 'WL-999');
    
    const savedItem: FieldWhitelistItem = {
      id: nextId,
      objectType: formObjectType,
      fieldName: formFieldName,
      propertyCode: formPropertyCode,
      fieldType: formFieldType,
      isEnabled: formIsEnabled,
      isFilterActive: formIsFilterActive,
      isScoreActive: formIsScoreActive,
      isTextMatchActive: formIsTextMatchActive,
      isRequiredForAudit: formIsRequiredForAudit,
      showInApp: formShowInApp,
      showDifference: formShowDifference,
      defaultMatchMethod: formDefaultMatchMethod,
      defaultWeight: Number(formDefaultWeight),
      sortOrder: Number(formSortOrder),
      status: 'ACTIVE',
      lastEditor: '李晓华 (工艺数据管理员)',
      lastEditTime: new Date().toISOString().replace('T', ' ').substring(0, 19)
    };

    let updatedList: FieldWhitelistItem[] = [];
    if (isNew) {
      updatedList = [...whitelists, savedItem];
      alert(`🎉 成功添加新白名单字段 [${formFieldName}]`);
    } else {
      updatedList = whitelists.map(item => item.id === editingItem?.id ? savedItem : item);
      alert(`🎉 字段 [${formFieldName}] 修改保存成功！`);
    }

    onUpdateWhitelists(updatedList);
    setEditingItem(null);
    setIsNew(false);
    setActiveTab('LIST');
  };

  // Delete item
  const handleDelete = (id: string, name: string) => {
    if (confirm(`确定要从白名单中移除字段 [${name}] 吗？移除后该字段将不参与去重计算与审核。`)) {
      onUpdateWhitelists(whitelists.filter(item => item.id !== id));
    }
  };

  // Toggle status
  const toggleEnabled = (id: string) => {
    const updated = whitelists.map(item => {
      if (item.id === id) {
        return {
          ...item,
          isEnabled: !item.isEnabled,
          lastEditTime: new Date().toISOString().replace('T', ' ').substring(0, 19)
        };
      }
      return item;
    });
    onUpdateWhitelists(updated);
  };

  // Filtered List
  const filteredItems = useMemo(() => {
    return whitelists.filter(r => {
      const matchKeyword = keyword === '' ||
        r.fieldName.toLowerCase().includes(keyword.toLowerCase()) ||
        r.propertyCode.toLowerCase().includes(keyword.toLowerCase());
      
      const matchObjectType = filterObjectType === 'ALL' || r.objectType === filterObjectType;
      const matchStatus = filterStatus === 'ALL' || 
        (filterStatus === 'ACTIVE' && r.isEnabled) || 
        (filterStatus === 'INACTIVE' && !r.isEnabled);

      return matchKeyword && matchObjectType && matchStatus;
    });
  }, [whitelists, keyword, filterObjectType, filterStatus]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
      
      {/* View Header with Breadcrumb */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0 flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2 text-xs text-slate-500 mb-1">
            <span>相似度 / 三化配置</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-800 font-medium">字段白名单配置</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">字段白名单配置</h1>
          <p className="text-xs text-slate-500 mt-1">
            定义哪些核心工程属性参与三化（标准化、系列化、通用化）判断。未进入白名单的属性将不作为防重、不一致性强制复核或相似度评分。
          </p>
        </div>

        {/* Tab switchers specifically separated for Figma Review */}
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
            <span>白名单字段列表</span>
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
            <span>{isNew ? '新建白名单字段' : editingItem ? `编辑: ${editingItem.fieldName}` : '新建/编辑视图 (空白)'}</span>
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
              <span className="font-semibold">筛选条件:</span>
            </div>

            {/* Keyword */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="搜索字段名/属性编码..."
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
                <option value="ALL">全部对象类型</option>
                <option value="PART_MECHANICAL">机械零件 (PART_MECHANICAL)</option>
                <option value="PART_ELECTRICAL">电气元器件 (PART_ELECTRICAL)</option>
              </select>
            </div>

            {/* Status */}
            <div className="flex items-center space-x-1.5 text-xs">
              <span className="text-slate-500">白名单状态:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-white border border-slate-300 rounded px-2 py-1 text-xs font-sans text-slate-700"
              >
                <option value="ALL">全部状态</option>
                <option value="ACTIVE">已启用 (ACTIVE)</option>
                <option value="INACTIVE">已停用 (INACTIVE)</option>
              </select>
            </div>

            {/* Reset button */}
            {(keyword !== '' || filterObjectType !== 'ALL' || filterStatus !== 'ALL') && (
              <button
                onClick={() => {
                  setKeyword('');
                  setFilterObjectType('ALL');
                  setFilterStatus('ALL');
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
              <span>新增白名单属性</span>
            </button>
          </div>

          {/* High-density Horizontal Scrolling Table */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden flex-1 flex flex-col">
            <div className="overflow-auto flex-1">
              <table className="w-full text-left border-collapse text-xs min-w-max">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold sticky top-0 z-10">
                    <th className="px-4 py-2.5">对象类型</th>
                    <th className="px-4 py-2.5">字段中文名</th>
                    <th className="px-4 py-2.5">属性编码</th>
                    <th className="px-3 py-2.5 text-center">字段类型</th>
                    <th className="px-3 py-2.5 text-center">启用</th>
                    <th className="px-3 py-2.5 text-center">参与过滤</th>
                    <th className="px-3 py-2.5 text-center">参与评分</th>
                    <th className="px-3 py-2.5 text-center">文本匹配</th>
                    <th className="px-3 py-2.5 text-center">审核必填</th>
                    <th className="px-3 py-2.5 text-center">应用端展示</th>
                    <th className="px-3 py-2.5 text-center">展示差异</th>
                    <th className="px-4 py-2.5">默认匹配方式</th>
                    <th className="px-3 py-2.5 text-right">默认权重</th>
                    <th className="px-3 py-2.5 text-center">排序</th>
                    <th className="px-4 py-2.5">维护人</th>
                    <th className="px-4 py-2.5">维护时间</th>
                    <th className="px-4 py-2.5 text-center">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className={`hover:bg-slate-50/60 transition-colors ${!item.isEnabled ? 'bg-slate-50/40 text-slate-400' : ''}`}>
                      
                      {/* Object Type */}
                      <td className="px-4 py-2.5 font-mono font-bold text-slate-700">
                        {item.objectType === 'PART_MECHANICAL' ? '机械零件 (PART)' : '电气元器件 (ELEC)'}
                      </td>

                      {/* Name */}
                      <td className="px-4 py-2.5 font-semibold text-slate-900">
                        {item.fieldName}
                      </td>

                      {/* Property Code */}
                      <td className="px-4 py-2.5 font-mono text-slate-600">
                        {item.propertyCode}
                      </td>

                      {/* Field Type */}
                      <td className="px-3 py-2.5 text-center">
                        <span className="bg-slate-100 text-slate-700 border border-slate-200 rounded px-1.5 py-0.5 text-[10px] font-mono">
                          {item.fieldType}
                        </span>
                      </td>

                      {/* Enabled Toggle Switcher */}
                      <td className="px-3 py-2.5 text-center">
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

                      {/* Boolean checkboxes */}
                      <td className="px-3 py-2.5 text-center">
                        {item.isFilterActive ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : <X className="w-4 h-4 text-slate-300 mx-auto" />}
                      </td>
                      
                      <td className="px-3 py-2.5 text-center">
                        {item.isScoreActive ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : <X className="w-4 h-4 text-slate-300 mx-auto" />}
                      </td>

                      <td className="px-3 py-2.5 text-center">
                        {item.isTextMatchActive ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : <X className="w-4 h-4 text-slate-300 mx-auto" />}
                      </td>

                      <td className="px-3 py-2.5 text-center">
                        {item.isRequiredForAudit ? <span className="bg-rose-50 text-rose-700 border border-rose-100 rounded px-1.5 py-0.5 text-[10px] font-semibold">必填</span> : <span className="text-slate-300">-</span>}
                      </td>

                      <td className="px-3 py-2.5 text-center">
                        {item.showInApp ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : <X className="w-4 h-4 text-slate-300 mx-auto" />}
                      </td>

                      <td className="px-3 py-2.5 text-center">
                        {item.showDifference ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : <X className="w-4 h-4 text-slate-300 mx-auto" />}
                      </td>

                      {/* Default match method */}
                      <td className="px-4 py-2.5 text-slate-600 font-sans">
                        {item.defaultMatchMethod}
                      </td>

                      {/* Weight */}
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-800">
                        {item.defaultWeight}%
                      </td>

                      {/* Sort Order */}
                      <td className="px-3 py-2.5 text-center font-mono text-slate-500">
                        {item.sortOrder}
                      </td>

                      {/* Author */}
                      <td className="px-4 py-2.5 text-slate-500 truncate max-w-[100px]">
                        {item.lastEditor.split(' ')[0]}
                      </td>

                      {/* Time */}
                      <td className="px-4 py-2.5 text-slate-400 font-mono text-[10px]">
                        {item.lastEditTime.substring(5, 16)}
                      </td>

                      {/* Row actions */}
                      <td className="px-4 py-2.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            onClick={() => startEdit(item)}
                            className="p-1 hover:bg-blue-50 text-blue-600 rounded hover:text-blue-800 transition-colors"
                            title="编辑字段白名单详情"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          
                          <button
                            onClick={() => handleDelete(item.id, item.fieldName)}
                            className="p-1 hover:bg-rose-50 text-rose-600 rounded hover:text-rose-800 transition-colors"
                            title="删除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredItems.length === 0 && (
                    <tr>
                      <td colSpan={17} className="px-6 py-10 text-center text-slate-400 italic">
                        没有符合筛选条件的白名单字段记录。
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Statistics Banner */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex justify-between font-mono">
              <span>总配置字段数: {whitelists.length} | 启用状态: {whitelists.filter(w=>w.isEnabled).length} 激活</span>
              <span>默认权重累和: {whitelists.filter(w=>w.isEnabled && w.objectType === 'PART_MECHANICAL').reduce((sum, item) => sum + item.defaultWeight, 0)}% (机械零件)</span>
            </div>
          </div>
        </div>
      ) : (
        // Separated Figma Review Editor View Block
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
                <span className="w-1.5 h-3 bg-blue-600 rounded-full"></span>
                <span>{isNew ? '新建字段白名单规则' : `编辑规则详情 - ${editingItem?.fieldName} (${editingItem?.id})`}</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Figma Layout Spec v2.4</span>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5 text-xs text-slate-700">
              {/* Row 1: Object Type & DataType */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-slate-600 font-semibold">物料对象类型 <span className="text-rose-500">*</span></label>
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
                  <label className="block text-slate-600 font-semibold">字段数据类型 <span className="text-rose-500">*</span></label>
                  <select
                    value={formFieldType}
                    onChange={(e) => setFormFieldType(e.target.value as any)}
                    className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs focus:ring-1 focus:ring-blue-500 font-mono"
                  >
                    <option value="TEXT">单行/长文本 (TEXT)</option>
                    <option value="NUMBER">数值型 (NUMBER)</option>
                    <option value="ENUM">枚举型 (ENUM)</option>
                    <option value="CLASS_TREE">分类树路径 (CLASS_TREE)</option>
                    <option value="DATE">日期类型 (DATE)</option>
                    <option value="OBJECT_REF">关联对象引用 (OBJECT_REF)</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Field Chinese Name & Property Code */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-slate-600 font-semibold">字段中文名称 (中文显示) <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={formFieldName}
                    onChange={(e) => setFormFieldName(e.target.value)}
                    placeholder="如：标称直径、主要材质、螺距"
                    className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs focus:ring-1 focus:ring-blue-500 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-slate-600 font-semibold">物料模型属性编码 (属性Code) <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={formPropertyCode}
                    onChange={(e) => setFormPropertyCode(e.target.value)}
                    placeholder="如：nominal_diameter, core_material"
                    className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs focus:ring-1 focus:ring-blue-500 font-mono text-slate-800"
                  />
                </div>
              </div>

              {/* Row 3: Match Method & Weights */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-slate-600 font-semibold">默认匹配规则 / 方法说明</label>
                  <input
                    type="text"
                    value={formDefaultMatchMethod}
                    onChange={(e) => setFormDefaultMatchMethod(e.target.value)}
                    placeholder="精确等值匹配 / 容差误差计算..."
                    className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="block text-slate-600 font-semibold">默认分配权重 (%)</label>
                    <input
                      type="number"
                      value={formDefaultWeight}
                      onChange={(e) => setFormDefaultWeight(Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs font-mono focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="block text-slate-600 font-semibold">系统排序次序</label>
                    <input
                      type="number"
                      value={formSortOrder}
                      onChange={(e) => setFormSortOrder(Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs font-mono focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Grid: Multi-Switch Settings */}
              <div className="border border-slate-100 rounded-lg p-4 bg-slate-50 space-y-3.5">
                <span className="font-semibold text-slate-800 block text-xs pb-1 border-b border-slate-200">
                  ⚙️ 业务参与及功能开关
                </span>

                <div className="grid grid-cols-2 gap-y-3.5 gap-x-6">
                  {/* Enabled */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold block">是否激活白名单 (IsEnabled)</span>
                      <span className="text-slate-400 text-[10px] block">未激活则完全被 Manticore 评分节点剥离</span>
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

                  {/* Filter Active */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold block">参与检索一阶段过滤 (IsFilterActive)</span>
                      <span className="text-slate-400 text-[10px] block">是否作为 Manticore 的基础索引隔离维度</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormIsFilterActive(!formIsFilterActive)}
                      className={`inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-hidden ${
                        formIsFilterActive ? 'bg-blue-600' : 'bg-slate-200'
                      }`}
                    >
                      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ${formIsFilterActive ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {/* Score Active */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold block">参与相似度打分 (IsScoreActive)</span>
                      <span className="text-slate-400 text-[10px] block">是否分配权重计入最终 0-100% 评分</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormIsScoreActive(!formIsScoreActive)}
                      className={`inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-hidden ${
                        formIsScoreActive ? 'bg-blue-600' : 'bg-slate-200'
                      }`}
                    >
                      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ${formIsScoreActive ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {/* Text Match Active */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold block">参与全文文本重叠度匹配 (IsTextMatch)</span>
                      <span className="text-slate-400 text-[10px] block">是否在长文本算法节点上运行 NLP TF-IDF 分值</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormIsTextMatchActive(!formIsTextMatchActive)}
                      className={`inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-hidden ${
                        formIsTextMatchActive ? 'bg-blue-600' : 'bg-slate-200'
                      }`}
                    >
                      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ${formIsTextMatchActive ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {/* Required for Audit */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold block text-amber-700">是否为三化审核必填字段 (IsRequired)</span>
                      <span className="text-slate-400 text-[10px] block">激活后，研发进行人工复核时该字段不可为空</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormIsRequiredForAudit(!formIsRequiredForAudit)}
                      className={`inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-hidden ${
                        formIsRequiredForAudit ? 'bg-amber-600' : 'bg-slate-200'
                      }`}
                    >
                      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ${formIsRequiredForAudit ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {/* Show in App */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold block">是否在应用客户端面板中呈现</span>
                      <span className="text-slate-400 text-[10px] block">物料防重查询时，是否在明细中输出此字段</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormShowInApp(!formShowInApp)}
                      className={`inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-hidden ${
                        formShowInApp ? 'bg-blue-600' : 'bg-slate-200'
                      }`}
                    >
                      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ${formShowInApp ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {/* Show Difference */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold block">差异项高亮对比 (ShowDifference)</span>
                      <span className="text-slate-400 text-[10px] block">若两物料该字段不同，是否在结果中单独标出差异</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormShowDifference(!formShowDifference)}
                      className={`inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-hidden ${
                        formShowDifference ? 'bg-blue-600' : 'bg-slate-200'
                      }`}
                    >
                      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ${formShowDifference ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>
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
