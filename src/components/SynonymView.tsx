import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Save, 
  Search, 
  Edit2, 
  Trash2, 
  X, 
  Undo2, 
  ChevronRight,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { SynonymRule, ObjectType } from '../types';

interface SynonymViewProps {
  rules: SynonymRule[];
  onUpdateRules: (newRules: SynonymRule[]) => void;
}

export const SynonymView: React.FC<SynonymViewProps> = ({ 
  rules, 
  onUpdateRules 
}) => {
  const [editingRule, setEditingRule] = useState<SynonymRule | null>(null);
  const [isNew, setIsNew] = useState(false);

  // Filters state
  const [filterWord, setFilterWord] = useState('');
  const [filterProp, setFilterProp] = useState('');
  const [filterScope, setFilterScope] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Form states
  const [formPrimaryWord, setFormPrimaryWord] = useState('');
  const [formSynonyms, setFormSynonyms] = useState<string[]>([]);
  const [newSynonymInput, setNewSynonymInput] = useState(''); // Text field for typing dynamic tags
  const [formObjectType, setFormObjectType] = useState<ObjectType>('PART_MECHANICAL');
  const [formApplicableProp, setFormApplicableProp] = useState('');
  const [formScope, setFormScope] = useState<'GLOBAL' | 'OBJECT_SPECIFIC' | 'PROPERTY_SPECIFIC'>('PROPERTY_SPECIFIC');
  const [formRemarks, setFormRemarks] = useState('');

  // Switches
  const [formIsActive, setFormIsActive] = useState(true);
  const [formIsSimilarityActive, setFormIsSimilarityActive] = useState(true);
  const [formIsFullTextActive, setFormIsFullTextActive] = useState(true);

  // Filter Logic
  const filteredRules = useMemo(() => {
    return rules.filter(r => {
      const lowerWord = filterWord.toLowerCase();
      const matchWord = filterWord === '' || 
        r.primaryWord.toLowerCase().includes(lowerWord) ||
        r.synonyms.some(s => s.toLowerCase().includes(lowerWord));
      
      const matchProp = filterProp === '' || r.applicableProperty.toLowerCase().includes(filterProp.toLowerCase());
      const matchScope = filterScope === 'ALL' || r.scope === filterScope;
      const matchStatus = filterStatus === 'ALL' || 
        (filterStatus === 'ACTIVE' && r.status === 'ACTIVE') || 
        (filterStatus === 'INACTIVE' && r.status === 'INACTIVE');

      return matchWord && matchProp && matchScope && matchStatus;
    });
  }, [rules, filterWord, filterProp, filterScope, filterStatus]);

  // Handle Edit Click
  const handleEdit = (rule: SynonymRule) => {
    setEditingRule(rule);
    setIsNew(false);

    setFormPrimaryWord(rule.primaryWord);
    setFormSynonyms([...rule.synonyms]);
    setNewSynonymInput('');
    setFormObjectType(rule.applicableObjectType);
    setFormApplicableProp(rule.applicableProperty);
    setFormScope(rule.scope);
    setFormRemarks(rule.remarks || '');
    
    setFormIsActive(rule.status === 'ACTIVE');
    setFormIsSimilarityActive(rule.isSimilarityActive);
    setFormIsFullTextActive(rule.isFullTextActive);
  };

  // Handle New Click
  const handleNew = () => {
    setEditingRule(null);
    setIsNew(true);

    setFormPrimaryWord('');
    setFormSynonyms(['螺丝', '紧固件', 'Bolt']);
    setNewSynonymInput('');
    setFormObjectType('PART_MECHANICAL');
    setFormApplicableProp('spec_description');
    setFormScope('PROPERTY_SPECIFIC');
    setFormRemarks('');
    
    setFormIsActive(true);
    setFormIsSimilarityActive(true);
    setFormIsFullTextActive(true);
  };

  // Synonym chip addition
  const handleAddSynonymTag = () => {
    const trimmed = newSynonymInput.trim();
    if (trimmed && !formSynonyms.includes(trimmed)) {
      setFormSynonyms([...formSynonyms, trimmed]);
      setNewSynonymInput('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSynonymTag();
    }
  };

  const handleRemoveSynonymTag = (index: number) => {
    setFormSynonyms(formSynonyms.filter((_, i) => i !== index));
  };

  // Handle Save
  const handleSave = () => {
    if (!formPrimaryWord || formSynonyms.length === 0) {
      alert('请填写主词，并至少录入一个同义词/别名！');
      return;
    }

    const updated: SynonymRule = {
      id: isNew ? `SY-00${rules.length + 1}` : (editingRule?.id || 'SY-TMP'),
      primaryWord: formPrimaryWord,
      synonyms: formSynonyms,
      applicableObjectType: formObjectType,
      applicableProperty: formApplicableProp,
      scope: formScope,
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
    if (window.confirm(`确定要删除同义词规则 ${id} 吗？`)) {
      onUpdateRules(rules.filter(r => r.id !== id));
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
      
      {/* View Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0 flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2 text-xs text-slate-500 mb-1">
            <span>相似度配置</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-800 font-medium">同义词规则</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            {isNew ? '新建同义词匹配规则' : editingRule ? '编辑同义词匹配规则' : '属性词汇同义词关联配置'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            将业务术语别名（例如：“螺栓” ↔ “螺丝”、“不锈钢” ↔ “耐酸钢”）进行多词组多向互通，防止二阶段计算由于用词变体导致错判失分。
          </p>
        </div>

        {!editingRule && !isNew ? (
          <button
            onClick={handleNew}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新建同义词规则</span>
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
              <span>保存同义词</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {!(editingRule || isNew) ? (
        // FRAME 5: LIST VIEW
        <div className="flex-1 flex flex-col overflow-hidden">
          
          {/* Filters */}
          <div className="px-6 py-3 shrink-0 flex flex-wrap items-center gap-3 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center space-x-1.5 text-xs">
              <span className="text-slate-500">主词 / 别名:</span>
              <input
                type="text"
                value={filterWord}
                onChange={(e) => setFilterWord(e.target.value)}
                placeholder="搜索主词、或任意同义词..."
                className="bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs w-52 focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div className="flex items-center space-x-1.5 text-xs">
              <span className="text-slate-500">适用属性:</span>
              <input
                type="text"
                value={filterProp}
                onChange={(e) => setFilterProp(e.target.value)}
                placeholder="输入关联属性编码..."
                className="bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs w-40 focus:outline-hidden focus:border-blue-500 font-mono"
              />
            </div>

            <div className="flex items-center space-x-1.5 text-xs">
              <span className="text-slate-500">作用范围:</span>
              <select
                value={filterScope}
                onChange={(e) => setFilterScope(e.target.value)}
                className="bg-white border border-slate-300 rounded px-2 py-1.5 text-xs"
              >
                <option value="ALL">全部范围</option>
                <option value="GLOBAL">全局级 (GLOBAL)</option>
                <option value="OBJECT_SPECIFIC">对象级 (OBJECT_SPECIFIC)</option>
                <option value="PROPERTY_SPECIFIC">属性级 (PROPERTY_SPECIFIC)</option>
              </select>
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

            {(filterWord || filterProp || filterScope !== 'ALL' || filterStatus !== 'ALL') && (
              <button
                onClick={() => {
                  setFilterWord('');
                  setFilterProp('');
                  setFilterScope('ALL');
                  setFilterStatus('ALL');
                }}
                className="text-xs text-blue-600 hover:text-blue-800 underline pl-1"
              >
                清空过滤
              </button>
            )}
          </div>

          {/* Table display */}
          <div className="flex-1 overflow-auto px-6 pb-6 pt-4">
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm min-w-[1200px] overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 text-xs font-semibold font-sans">
                    <th className="px-3 py-2.5 border-r border-slate-200">主词 (Primary)</th>
                    <th className="px-4 py-2.5 border-r border-slate-200">同义词 / 别名芯片集 (Synonyms)</th>
                    <th className="px-3 py-2.5 border-r border-slate-200">适用对象类型</th>
                    <th className="px-3 py-2.5 border-r border-slate-200">适用属性</th>
                    <th className="px-3 py-2.5 border-r border-slate-200">作用范围</th>
                    <th className="px-3 py-2.5 border-r border-slate-200 text-center">参与相似评分</th>
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
                      {/* Primary word */}
                      <td className="px-3 py-2 border-r border-slate-200 font-bold text-slate-900 whitespace-nowrap">
                        {r.primaryWord}
                      </td>

                      {/* Chips synonyms list */}
                      <td className="px-4 py-2 border-r border-slate-200 max-w-[320px]">
                        <div className="flex flex-wrap gap-1">
                          {r.synonyms.map((syn, sIdx) => (
                            <span key={sIdx} className="bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full text-[10px] font-mono">
                              {syn}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Applicable Object Type */}
                      <td className="px-3 py-2 border-r border-slate-200 font-medium whitespace-nowrap">
                        {r.applicableObjectType === 'PART_MECHANICAL' ? (
                          <span className="bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded text-[10px]">机械零件</span>
                        ) : r.applicableObjectType === 'PART_ELECTRICAL' ? (
                          <span className="bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded text-[10px]">电气元器件</span>
                        ) : (
                          <span className="bg-slate-100 text-slate-700 border border-slate-200 px-1.5 py-0.5 rounded text-[10px]">全局/通用</span>
                        )}
                      </td>

                      {/* Property code */}
                      <td className="px-3 py-2 border-r border-slate-200 font-mono text-slate-700 whitespace-nowrap">
                        {r.applicableProperty === 'all' ? (
                          <span className="text-slate-400 italic">-- 字段无关 --</span>
                        ) : r.applicableProperty}
                      </td>

                      {/* Scope */}
                      <td className="px-3 py-2 border-r border-slate-200 whitespace-nowrap">
                        {r.scope === 'GLOBAL' ? (
                          <span className="text-slate-800 font-semibold text-[10px]">全局范围 (GLOBAL)</span>
                        ) : r.scope === 'OBJECT_SPECIFIC' ? (
                          <span className="text-blue-700 font-medium text-[10px]">对象范围 (OBJECT)</span>
                        ) : (
                          <span className="text-purple-700 font-medium text-[10px]">属性专有 (PROPERTY)</span>
                        )}
                      </td>

                      {/* Is Score Active */}
                      <td className="px-3 py-2 border-r border-slate-200 text-center whitespace-nowrap">
                        {r.isSimilarityActive ? (
                          <span className="text-emerald-600 font-semibold">启用</span>
                        ) : (
                          <span className="text-slate-300">--</span>
                        )}
                      </td>

                      {/* Is Fulltext Active */}
                      <td className="px-3 py-2 border-r border-slate-200 text-center whitespace-nowrap">
                        {r.isFullTextActive ? (
                          <span className="text-blue-600 font-semibold">启用</span>
                        ) : (
                          <span className="text-slate-300">--</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-3 py-2 border-r border-slate-200 text-center whitespace-nowrap">
                        {r.status === 'ACTIVE' ? (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-medium">启用中</span>
                        ) : (
                          <span className="bg-slate-100 text-slate-400 border border-slate-200 px-2 py-0.5 rounded font-medium">已关闭</span>
                        )}
                      </td>

                      {/* Version */}
                      <td className="px-3 py-2 border-r border-slate-200 font-mono text-slate-500 whitespace-nowrap">
                        {r.version}
                      </td>

                      {/* Editor */}
                      <td className="px-3 py-2 border-r border-slate-200 text-slate-600 whitespace-nowrap">
                        {r.lastEditor}
                      </td>

                      {/* Last edit time */}
                      <td className="px-3 py-2 border-r border-slate-200 text-slate-500 font-mono whitespace-nowrap">
                        {r.lastEditTime}
                      </td>

                      {/* Operations */}
                      <td className="px-4 py-2 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            onClick={() => handleEdit(r)}
                            className="p-1 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded transition-colors"
                            title="修改同义词"
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
        // FRAME 6: NEW / EDIT FORM VIEW
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            
            <div className="bg-slate-50 px-6 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-800">
                {isNew ? '创建新同义词 / 别名组' : `正在编辑同义词: 主词 [${formPrimaryWord}]`}
              </span>
              <span className="text-xs bg-purple-100 px-2 py-0.5 rounded border border-purple-200 font-mono text-purple-700">
                Manticore Synonym Map
              </span>
            </div>

            <div className="p-6 space-y-5 text-xs">
              
              {/* Row 1: Primary Word */}
              <div>
                <label className="block font-medium text-slate-700 mb-1.5">标准主词 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formPrimaryWord}
                  onChange={(e) => setFormPrimaryWord(e.target.value)}
                  placeholder="例如: 螺栓 (主物料词)"
                  className="w-full bg-white border border-slate-300 rounded p-2 text-xs font-semibold text-slate-900 focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">这是基准参照词汇，在系统报告或相似度匹配中作为主词呈现。</span>
              </div>

              {/* Row 2: Synonym Tag Input */}
              <div>
                <label className="block font-medium text-slate-700 mb-1.5">
                  输入同义词 / 别名集 <span className="text-red-500">*</span>
                </label>
                <div className="border border-slate-300 rounded p-2 bg-white min-h-[70px] flex flex-wrap gap-1.5 items-start content-start focus-within:ring-1 focus-within:ring-blue-500">
                  {/* Render chips */}
                  {formSynonyms.map((syn, idx) => (
                    <span 
                      key={idx} 
                      className="bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full text-xs font-mono flex items-center space-x-1"
                    >
                      <span>{syn}</span>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveSynonymTag(idx)}
                        className="text-purple-400 hover:text-purple-700 font-bold"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  
                  {/* Dynamic Input field for typing */}
                  <input
                    type="text"
                    value={newSynonymInput}
                    onChange={(e) => setNewSynonymInput(e.target.value)}
                    onKeyDown={handleKeyPress}
                    onBlur={handleAddSynonymTag}
                    placeholder="输入别名后按回车键生成标签..."
                    className="flex-1 min-w-[120px] bg-transparent border-0 outline-hidden py-0.5 text-xs focus:ring-0"
                  />
                </div>
                <div className="flex justify-between items-center mt-1 text-[10px] text-slate-400">
                  <span>例如录入：螺丝、紧固件、Bolt 等。输入后按【Enter】或失去焦点生成气泡。</span>
                  <button 
                    type="button" 
                    onClick={handleAddSynonymTag}
                    className="text-blue-600 font-medium hover:underline"
                  >
                    + 添加当前词汇
                  </button>
                </div>
              </div>

              {/* Row 3: Scope and Target Properties */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 mb-1.5">作用层级范围</label>
                  <select
                    value={formScope}
                    onChange={(e) => setFormScope(e.target.value as any)}
                    className="w-full bg-white border border-slate-300 rounded p-2 text-xs focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="GLOBAL">全局级通用 (GLOBAL)</option>
                    <option value="OBJECT_SPECIFIC">对象类型专有 (OBJECT_SPECIFIC)</option>
                    <option value="PROPERTY_SPECIFIC">特定属性专有 (PROPERTY_SPECIFIC)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1.5">适用对象类型 <span className="text-red-500">*</span></label>
                  <select
                    value={formObjectType}
                    onChange={(e) => setFormObjectType(e.target.value as ObjectType)}
                    className="w-full bg-white border border-slate-300 rounded p-2 text-xs focus:ring-1 focus:ring-blue-500 font-mono"
                    disabled={formScope === 'GLOBAL'}
                  >
                    <option value="PART_MECHANICAL">机械零件 (PART_MECHANICAL)</option>
                    <option value="PART_ELECTRICAL">电气元器件 (PART_ELECTRICAL)</option>
                    <option value="DOCUMENT">图纸文档 (DOCUMENT)</option>
                    <option value="ALL">全部通用 (ALL)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1.5">适用属性编码 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formApplicableProp}
                    onChange={(e) => setFormApplicableProp(e.target.value)}
                    placeholder="例如: spec_description"
                    className="w-full bg-white border border-slate-300 rounded p-2 text-xs focus:ring-1 focus:ring-blue-500 font-mono"
                    disabled={formScope !== 'PROPERTY_SPECIFIC'}
                  />
                </div>
              </div>

              {/* Row 4: Toggle Switches */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <span className="font-semibold text-slate-800 block mb-2.5">生效开关配置</span>
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
                      <span className="font-medium text-slate-800 block">启用此组同义词</span>
                      <span className="text-[10px] text-slate-500">是否立即进入匹配范围</span>
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
                      <span className="font-medium text-slate-800 block">参与二阶段相似度计算</span>
                      <span className="text-[10px] text-slate-500">允许别名按满分或部分权重对齐</span>
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
                      <span className="font-medium text-slate-800 block">参与一阶段搜索引擎召回</span>
                      <span className="text-[10px] text-slate-500">支持输入同义词直接索引召回源物料</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Row 5: Remarks */}
              <div>
                <label className="block font-medium text-slate-700 mb-1.5">备注说明 (词义说明映射说明)</label>
                <input
                  type="text"
                  value={formRemarks}
                  onChange={(e) => setFormRemarks(e.target.value)}
                  placeholder="提供维护背景..."
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
