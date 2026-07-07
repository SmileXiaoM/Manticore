import React, { useState, useMemo } from 'react';
import { 
  Settings, 
  Search, 
  Info, 
  Plus, 
  Edit2, 
  Trash2,
  X,
  HelpCircle,
  ToggleLeft,
  ToggleRight,
  Check,
  AlertCircle
} from 'lucide-react';
import { StandardizationRule, SynonymRule, ClassificationAlignmentRule, ObjectType } from '../types';

interface DataProcessingViewProps {
  standardizationRules: StandardizationRule[];
  onUpdateStandardizationRules: (rules: StandardizationRule[]) => void;
  synonymRules: SynonymRule[];
  onUpdateSynonymRules: (rules: SynonymRule[]) => void;
  alignmentRules: ClassificationAlignmentRule[];
  onUpdateAlignmentRules: (rules: ClassificationAlignmentRule[]) => void;
}

export const DataProcessingView: React.FC<DataProcessingViewProps> = ({
  standardizationRules,
  onUpdateStandardizationRules,
  synonymRules,
  onUpdateSynonymRules,
  alignmentRules,
  onUpdateAlignmentRules
}) => {
  const [activeTab, setActiveTab] = useState<'standard' | 'synonym' | 'align'>('standard');
  const [keyword, setKeyword] = useState('');

  // Editing modal state
  const [editingRule, setEditingRule] = useState<{
    type: 'standard' | 'synonym' | 'align';
    isNew: boolean;
    item: any;
  } | null>(null);

  // 1. Filter logic for each tab
  const filteredStandard = useMemo(() => {
    return standardizationRules.filter(r => 
      keyword === '' || 
      r.ruleName.toLowerCase().includes(keyword.toLowerCase()) ||
      r.applicableProperty.toLowerCase().includes(keyword.toLowerCase()) ||
      r.standardValue.toLowerCase().includes(keyword.toLowerCase())
    );
  }, [standardizationRules, keyword]);

  const filteredSynonym = useMemo(() => {
    return synonymRules.filter(r => 
      keyword === '' || 
      r.primaryWord.toLowerCase().includes(keyword.toLowerCase()) ||
      r.synonyms.some(s => s.toLowerCase().includes(keyword.toLowerCase())) ||
      r.applicableProperty.toLowerCase().includes(keyword.toLowerCase())
    );
  }, [synonymRules, keyword]);

  const filteredAlign = useMemo(() => {
    return alignmentRules.filter(r => 
      keyword === '' || 
      r.sourcePath.toLowerCase().includes(keyword.toLowerCase()) ||
      r.standardPath.toLowerCase().includes(keyword.toLowerCase())
    );
  }, [alignmentRules, keyword]);

  // CRUD operation handlers
  const handleEdit = (type: 'standard' | 'synonym' | 'align', item: any) => {
    setEditingRule({
      type,
      isNew: false,
      item: JSON.parse(JSON.stringify(item)) // deep clone for modal edits
    });
  };

  const handleAddNew = (type: 'standard' | 'synonym' | 'align') => {
    let defaultItem: any = {};
    if (type === 'standard') {
      defaultItem = {
        ruleName: '',
        applicableObjectType: 'PART_MECHANICAL' as ObjectType,
        applicableProperty: '',
        propertyType: 'TEXT',
        rawValue: '',
        standardValue: '',
        ruleMethod: 'MAP',
        matchPriority: 1,
        isSimilarityActive: true,
        isFullTextActive: true,
        status: 'ACTIVE',
        remarks: ''
      };
    } else if (type === 'synonym') {
      defaultItem = {
        primaryWord: '',
        synonyms: [],
        applicableObjectType: 'PART_MECHANICAL' as ObjectType,
        applicableProperty: '',
        scope: 'GLOBAL',
        isSimilarityActive: true,
        isFullTextActive: true,
        status: 'ACTIVE',
        remarks: ''
      };
    } else {
      defaultItem = {
        ruleType: 'CLASSIFICATION',
        sourceSystem: 'ERP',
        sourceObjectType: 'PART',
        sourcePath: '',
        standardPath: '',
        hierarchyStrategy: 'ALIGN_STANDARD',
        similarityDiscount: 0.9,
        applicableObjectType: 'PART_MECHANICAL' as ObjectType,
        status: 'ACTIVE',
        remarks: '',
        isSimilarityActive: true
      };
    }

    setEditingRule({
      type,
      isNew: true,
      item: defaultItem
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule) return;

    const { type, isNew, item } = editingRule;

    if (type === 'standard') {
      if (!item.ruleName || !item.applicableProperty || !item.standardValue) {
        alert('请填入必填项：规则名称、适用属性及标准值。');
        return;
      }
      let updated: StandardizationRule[];
      if (isNew) {
        const newRule: StandardizationRule = {
          ...item,
          id: 'std_' + Date.now(),
          version: 'V' + (standardizationRules.length + 1) + '.0',
          lastEditor: '评审员',
          lastEditTime: new Date().toISOString().split('T')[0]
        };
        updated = [...standardizationRules, newRule];
      } else {
        updated = standardizationRules.map(r => r.id === item.id ? {
          ...r,
          ...item,
          lastEditor: '评审员',
          lastEditTime: new Date().toISOString().split('T')[0]
        } : r);
      }
      onUpdateStandardizationRules(updated);
    } else if (type === 'synonym') {
      if (!item.primaryWord || !item.synonyms || item.synonyms.length === 0) {
        alert('请填入必填项：主词以及至少一个同义词别名。');
        return;
      }
      let updated: SynonymRule[];
      if (isNew) {
        const newRule: SynonymRule = {
          ...item,
          id: 'syn_' + Date.now(),
          version: 'V' + (synonymRules.length + 1) + '.0',
          lastEditor: '评审员',
          lastEditTime: new Date().toISOString().split('T')[0]
        };
        updated = [...synonymRules, newRule];
      } else {
        updated = synonymRules.map(r => r.id === item.id ? {
          ...r,
          ...item,
          lastEditor: '评审员',
          lastEditTime: new Date().toISOString().split('T')[0]
        } : r);
      }
      onUpdateSynonymRules(updated);
    } else if (type === 'align') {
      if (!item.sourcePath || !item.standardPath) {
        alert('请填入必填项：源路径以及标准路径。');
        return;
      }
      let updated: ClassificationAlignmentRule[];
      if (isNew) {
        const newRule: ClassificationAlignmentRule = {
          ...item,
          id: 'ali_' + Date.now(),
          version: 'V' + (alignmentRules.length + 1) + '.0',
          lastEditor: '评审员',
          lastEditTime: new Date().toISOString().split('T')[0]
        };
        updated = [...alignmentRules, newRule];
      } else {
        updated = alignmentRules.map(r => r.id === item.id ? {
          ...r,
          ...item,
          lastEditor: '评审员',
          lastEditTime: new Date().toISOString().split('T')[0]
        } : r);
      }
      onUpdateAlignmentRules(updated);
    }

    setEditingRule(null);
  };

  const handleDelete = (type: 'standard' | 'synonym' | 'align', id: string) => {
    if (window.confirm('确定要删除这条数据预处理规则吗？(评审原型支持即时生效)')) {
      if (type === 'standard') {
        onUpdateStandardizationRules(standardizationRules.filter(r => r.id !== id));
      } else if (type === 'synonym') {
        onUpdateSynonymRules(synonymRules.filter(r => r.id !== id));
      } else if (type === 'align') {
        onUpdateAlignmentRules(alignmentRules.filter(r => r.id !== id));
      }
    }
  };

  const handleStatusToggle = (type: 'standard' | 'synonym' | 'align', item: any) => {
    const newStatus = item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    if (type === 'standard') {
      onUpdateStandardizationRules(standardizationRules.map(r => r.id === item.id ? { ...r, status: newStatus } : r));
    } else if (type === 'synonym') {
      onUpdateSynonymRules(synonymRules.map(r => r.id === item.id ? { ...r, status: newStatus } : r));
    } else if (type === 'align') {
      onUpdateAlignmentRules(alignmentRules.map(r => r.id === item.id ? { ...r, status: newStatus } : r));
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 relative">
      
      {/* Header Area */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
                <Settings className="w-5 h-5 text-slate-500" />
                <span>数据处理规则 (算分前置清洗)</span>
              </h1>
              <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-semibold border border-blue-200">
                [正式系统界面]
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1.5 flex items-center">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 mr-2"></span>
              数据处理规则：用于字段相似度计算前的单位、格式、同义词和分类归一，不直接配置字段权重。
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[11px] text-slate-400 font-mono">
              v2.4.0 (生产同步中)
            </span>
          </div>
        </div>

        {/* Tab Headers */}
        <div className="flex border-b border-slate-200 mt-4 -mb-4">
          <button
            onClick={() => { setActiveTab('standard'); setKeyword(''); }}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'standard'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            标准化规则 ({filteredStandard.length})
          </button>
          <button
            onClick={() => { setActiveTab('synonym'); setKeyword(''); }}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'synonym'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            同义词规则 ({filteredSynonym.length})
          </button>
          <button
            onClick={() => { setActiveTab('align'); setKeyword(''); }}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'align'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            分类 / 类型归一 ({filteredAlign.length})
          </button>
        </div>
      </div>

      {/* Control filters */}
      <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 shrink-0 flex items-center justify-between">
        <div className="relative w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={
              activeTab === 'standard' 
                ? "搜索规则名称、适用属性..." 
                : activeTab === 'synonym'
                  ? "搜索主词、同义词或属性..."
                  : "搜索源路径、标准路径..."
            }
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <button
            onClick={() => handleAddNew(activeTab)}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded-md text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>
              {activeTab === 'standard' ? '新建标准化规则' : activeTab === 'synonym' ? '新建同义词匹配' : '新建类型路径归一'}
            </span>
          </button>
        </div>
      </div>

      {/* Grid Content */}
      <div className="flex-1 overflow-auto p-6">
        
        {activeTab === 'standard' && (
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 text-xs font-semibold">
                  <th className="px-4 py-3">规则名称</th>
                  <th className="px-4 py-3">适用对象类型</th>
                  <th className="px-4 py-3">适用属性</th>
                  <th className="px-4 py-3">映射前原始值</th>
                  <th className="px-4 py-3">清洗后(标准值)</th>
                  <th className="px-4 py-3">匹配模式</th>
                  <th className="px-4 py-3">状态</th>
                  <th className="px-4 py-3 text-center animate-pulse">操作(原型支持编辑)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredStandard.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-400">暂无符合条件的标准化规则</td>
                  </tr>
                ) : (
                  filteredStandard.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-900">{r.ruleName}</td>
                      <td className="px-4 py-3">
                        <span className="bg-blue-50 text-blue-700 border border-blue-100 px-1.5 py-0.5 rounded text-[10px]">
                          {r.applicableObjectType === 'PART_MECHANICAL' ? '机械零件' : r.applicableObjectType === 'PART_ELECTRICAL' ? '电气元器件' : '通用件'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600">{r.applicableProperty}</td>
                      <td className="px-4 py-3 text-slate-500 max-w-xs truncate" title={r.rawValue}>
                        {r.rawValue ? r.rawValue.replace(/\n/g, ' | ') : '任意/匹配所有'}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{r.standardValue}</td>
                      <td className="px-4 py-3">
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-mono">
                          {r.ruleMethod === 'MAP' ? '多对一映射' : r.ruleMethod === 'REGEX' ? '正则提取' : '文本替换'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleStatusToggle('standard', r)}
                          title="点击快速启用/禁用"
                          className="flex items-center space-x-1"
                        >
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                            r.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-400 border border-slate-200'
                          }`}>
                            {r.status === 'ACTIVE' ? '启用中' : '已禁用'}
                          </span>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button onClick={() => handleEdit('standard', r)} className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-blue-600 transition-all" title="编辑规则">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete('standard', r.id)} className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-red-600 transition-all" title="删除规则">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'synonym' && (
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 text-xs font-semibold">
                  <th className="px-4 py-3">主词 (唯一推荐名)</th>
                  <th className="px-4 py-3">同义词别名集 (触发拉平)</th>
                  <th className="px-4 py-3">作用范围</th>
                  <th className="px-4 py-3">适用对象类型</th>
                  <th className="px-4 py-3">适用属性</th>
                  <th className="px-4 py-3">状态</th>
                  <th className="px-4 py-3 text-center">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredSynonym.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">暂无符合条件的同义词规则</td>
                  </tr>
                ) : (
                  filteredSynonym.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-semibold text-slate-900">{r.primaryWord}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {r.synonyms && r.synonyms.map((s, idx) => (
                            <span key={idx} className="bg-purple-50 text-purple-700 border border-purple-100 px-1.5 py-0.5 rounded text-[11px]">
                              {s}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-slate-600 font-medium">
                          {r.scope === 'GLOBAL' ? '全局通用' : r.scope === 'OBJECT_SPECIFIC' ? '对象专用' : '特定属性'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="bg-blue-50 text-blue-700 border border-blue-100 px-1.5 py-0.5 rounded text-[10px]">
                          {r.applicableObjectType === 'PART_MECHANICAL' ? '机械零件' : r.applicableObjectType === 'PART_ELECTRICAL' ? '电气元器件' : '通用件'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-500">{r.applicableProperty || '全部/不限'}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleStatusToggle('synonym', r)}
                          title="点击快速启用/禁用"
                          className="flex items-center space-x-1"
                        >
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                            r.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-400 border border-slate-200'
                          }`}>
                            {r.status === 'ACTIVE' ? '启用中' : '已禁用'}
                          </span>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button onClick={() => handleEdit('synonym', r)} className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-blue-600 transition-all" title="编辑规则">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete('synonym', r.id)} className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-red-600 transition-all" title="删除规则">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'align' && (
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 text-xs font-semibold">
                  <th className="px-4 py-3">类型</th>
                  <th className="px-4 py-3">源系统分类/类型路径 (未清洗源)</th>
                  <th className="px-4 py-3">标准归一分类/类型路径</th>
                  <th className="px-4 py-3">层级匹配相似度折扣 (退避退水系数)</th>
                  <th className="px-4 py-3">适用对象</th>
                  <th className="px-4 py-3">状态</th>
                  <th className="px-4 py-3 text-center">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredAlign.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">暂无符合条件的分类/类型归一规则</td>
                  </tr>
                ) : (
                  filteredAlign.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-700">
                          {r.ruleType === 'CLASSIFICATION' ? '分类路径映射' : r.ruleType === 'TYPE' ? '对象类型归一' : '属性对照'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-red-600 font-medium font-mono">{r.sourcePath}</td>
                      <td className="px-4 py-3 text-emerald-600 font-semibold font-mono">{r.standardPath}</td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-800">
                        {r.similarityDiscount * 100}% <span className="text-[10px] text-slate-400 font-normal">({r.similarityDiscount < 1.0 ? '跨级损耗' : '完全拉平'})</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="bg-blue-50 text-blue-700 border border-blue-100 px-1.5 py-0.5 rounded text-[10px]">
                          {r.applicableObjectType === 'PART_MECHANICAL' ? '机械零件' : r.applicableObjectType === 'PART_ELECTRICAL' ? '电气元器件' : '通用件'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleStatusToggle('align', r)}
                          title="点击快速启用/禁用"
                          className="flex items-center space-x-1"
                        >
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                            r.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-400 border border-slate-200'
                          }`}>
                            {r.status === 'ACTIVE' ? '启用中' : '已禁用'}
                          </span>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button onClick={() => handleEdit('align', r)} className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-blue-600 transition-all" title="编辑规则">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete('align', r.id)} className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-red-600 transition-all" title="删除规则">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* ⬇️ [设计/评审说明] 区域 (非产品正式操作界面) ⬇️ */}
      <div className="mx-6 mb-6 p-4 bg-amber-500/5 border-2 border-dashed border-amber-300 rounded-lg shrink-0">
        <div className="flex items-center space-x-2 mb-2">
          <span className="px-2 py-0.5 bg-amber-500 text-white rounded text-[10px] font-bold">
            [设计/评审说明]
          </span>
          <h4 className="text-xs font-bold text-slate-800">UCD 评审要点与二阶段说明</h4>
        </div>
        <div className="text-[11px] text-slate-600 space-y-2 leading-relaxed">
          <p>
            <span className="font-semibold text-slate-700">💡 重要业务导读：</span>
            此模块属于<strong>二阶段（字段属性相似度算分）的前置辅助清洗与归一</strong>。在对候选件和拟建件各字段进行比对评分之前，通过本页规则对单位、格式、书写习惯以及同义术语进行统合（如将 "φ", "D", "直直径" 映射清洗为规范规格，或进行同义词主副匹配），不在此直接设置或修改相似度权重，以保证评分前数据的高保真度与同义拉平。
          </p>
          <div className="pt-1.5 border-t border-slate-200 flex flex-wrap items-center gap-4 text-slate-500">
            <span><strong>算分完整链路方案：</strong> 1. [前置数据清洗] (当前页) → 2. [主算分引擎] → 3. [三化决策输出]</span>
            <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded text-[10px] font-medium">二阶段辅助预处理层</span>
          </div>
        </div>
      </div>

      {/* RENDER MODAL POPUP FOR CRUD */}
      {editingRule && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-xl w-full border border-slate-200 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-lg shrink-0">
              <div className="flex items-center space-x-2">
                <Settings className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-slate-900">
                  {editingRule.isNew ? '新建' : '编辑'}
                  {editingRule.type === 'standard' ? '标准化处理规则' : editingRule.type === 'synonym' ? '同义词映射词典' : '分类/类型归一策略'}
                </h3>
              </div>
              <button onClick={() => setEditingRule(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-150">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSave} className="flex-1 overflow-auto p-6 space-y-4">
              
              {/* Common Information Alert */}
              <div className="p-2.5 bg-amber-50 rounded text-[11px] text-amber-800 flex items-start space-x-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>原型提示：</strong>当前编辑的数据预处理参数仅影响算分前的统一性，不直接决定物料字段权重（权重需在《字段相似度规则》中设置）。
                </span>
              </div>

              {/* Standard Form Fields */}
              {editingRule.type === 'standard' && (
                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">规则名称 <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      required
                      value={editingRule.item.ruleName}
                      onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, ruleName: e.target.value }})}
                      placeholder="例如: 螺纹/孔径单位规范化"
                      className="w-full bg-white border border-slate-300 rounded p-2 text-xs focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">适用对象类型</label>
                      <select 
                        value={editingRule.item.applicableObjectType}
                        onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, applicableObjectType: e.target.value as ObjectType }})}
                        className="w-full bg-white border border-slate-300 rounded p-2 text-xs focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="PART_MECHANICAL">机械零件</option>
                        <option value="PART_ELECTRICAL">电气元器件</option>
                        <option value="ALL">全部大类</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">适用属性英文编码 <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        required
                        value={editingRule.item.applicableProperty}
                        onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, applicableProperty: e.target.value }})}
                        placeholder="如: thread_specification"
                        className="w-full bg-white border border-slate-300 rounded p-2 text-xs focus:ring-1 focus:ring-blue-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">处理模式</label>
                      <select 
                        value={editingRule.item.ruleMethod}
                        onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, ruleMethod: e.target.value as any }})}
                        className="w-full bg-white border border-slate-300 rounded p-2 text-xs focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="MAP">多对一静态映射 (Map)</option>
                        <option value="REGEX">正则表达式匹配提取 (Regex)</option>
                        <option value="REPLACE">纯文本替换 (Replace)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">匹配优先级 (数字越小越优先)</label>
                      <input 
                        type="number" 
                        min="1"
                        max="100"
                        value={editingRule.item.matchPriority}
                        onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, matchPriority: parseInt(e.target.value) || 1 }})}
                        className="w-full bg-white border border-slate-300 rounded p-2 text-xs focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">映射前原始值 (多行文本，一行代表一个匹配源)</label>
                    <textarea 
                      rows={3}
                      value={editingRule.item.rawValue}
                      onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, rawValue: e.target.value }})}
                      placeholder="φ&#10;D&#10;直径&#10;直直径"
                      className="w-full bg-white border border-slate-300 rounded p-2 text-xs focus:ring-1 focus:ring-blue-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">清洗映射后(标准值) <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      required
                      value={editingRule.item.standardValue}
                      onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, standardValue: e.target.value }})}
                      placeholder="M"
                      className="w-full bg-white border border-slate-300 rounded p-2 text-xs focus:ring-1 focus:ring-blue-500 font-mono"
                    />
                  </div>

                  <div className="flex items-center space-x-6 bg-slate-50 p-2.5 rounded border border-slate-200">
                    <label className="flex items-center space-x-1.5 font-semibold text-slate-700">
                      <input 
                        type="checkbox"
                        checked={editingRule.item.isSimilarityActive}
                        onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, isSimilarityActive: e.target.checked }})}
                        className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                      />
                      <span>参与算分清洗</span>
                    </label>

                    <label className="flex items-center space-x-1.5 font-semibold text-slate-700">
                      <input 
                        type="checkbox"
                        checked={editingRule.item.isFullTextActive}
                        onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, isFullTextActive: e.target.checked }})}
                        className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                      />
                      <span>参与全局检索清洗</span>
                    </label>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">状态</label>
                    <select 
                      value={editingRule.item.status}
                      onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, status: e.target.value as any }})}
                      className="w-full bg-white border border-slate-300 rounded p-2 text-xs focus:ring-1 focus:ring-blue-500 font-semibold"
                    >
                      <option value="ACTIVE" className="text-emerald-600">启用中 (ACTIVE)</option>
                      <option value="INACTIVE" className="text-slate-400">已禁用 (INACTIVE)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">备注/说明 (对齐逻辑使用)</label>
                    <input 
                      type="text"
                      value={editingRule.item.remarks || ''}
                      onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, remarks: e.target.value }})}
                      placeholder="解释此物理参数映射的业务背景"
                      className="w-full bg-white border border-slate-300 rounded p-2 text-xs focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* Synonym Form Fields */}
              {editingRule.type === 'synonym' && (
                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">主词 (唯一推荐标准名) <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      required
                      value={editingRule.item.primaryWord}
                      onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, primaryWord: e.target.value }})}
                      placeholder="例如: 芯片"
                      className="w-full bg-white border border-slate-300 rounded p-2 text-xs focus:ring-1 focus:ring-blue-500 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">同义词别名集 (多个别名，用中文、英文逗号或空格分隔) <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      required
                      value={editingRule.item.synonyms ? editingRule.item.synonyms.join(', ') : ''}
                      onChange={(e) => {
                        const splitWords = e.target.value.split(/[,,，，\s]+/).filter(Boolean);
                        setEditingRule({ ...editingRule, item: { ...editingRule.item, synonyms: splitWords }});
                      }}
                      placeholder="例如: 集成电路, IC, 微处理器, chip"
                      className="w-full bg-white border border-slate-300 rounded p-2 text-xs focus:ring-1 focus:ring-blue-500"
                    />
                    <span className="text-[10px] text-slate-400 block mt-1">系统将把别名集的词自动指向并拉平至主词计算相似度。</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">作用范围</label>
                      <select 
                        value={editingRule.item.scope}
                        onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, scope: e.target.value as any }})}
                        className="w-full bg-white border border-slate-300 rounded p-2 text-xs focus:ring-1 focus:ring-blue-500 font-medium"
                      >
                        <option value="GLOBAL">全局通用 (GLOBAL)</option>
                        <option value="OBJECT_SPECIFIC">对象专用 (OBJECT_SPECIFIC)</option>
                        <option value="PROPERTY_SPECIFIC">特定属性约束 (PROPERTY_SPECIFIC)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">适用对象类型</label>
                      <select 
                        value={editingRule.item.applicableObjectType}
                        onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, applicableObjectType: e.target.value as ObjectType }})}
                        className="w-full bg-white border border-slate-300 rounded p-2 text-xs focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="PART_MECHANICAL">机械零件</option>
                        <option value="PART_ELECTRICAL">电气元器件</option>
                        <option value="ALL">全部大类</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">适用特定属性 (仅在“作用范围”为特定属性时生效)</label>
                    <input 
                      type="text" 
                      value={editingRule.item.applicableProperty || ''}
                      onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, applicableProperty: e.target.value }})}
                      placeholder="如: material_name, 如果全局不限请留空"
                      className="w-full bg-white border border-slate-300 rounded p-2 text-xs focus:ring-1 focus:ring-blue-500 font-mono"
                    />
                  </div>

                  <div className="flex items-center space-x-6 bg-slate-50 p-2.5 rounded border border-slate-200">
                    <label className="flex items-center space-x-1.5 font-semibold text-slate-700">
                      <input 
                        type="checkbox"
                        checked={editingRule.item.isSimilarityActive}
                        onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, isSimilarityActive: e.target.checked }})}
                        className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                      />
                      <span>计算相似度拉平</span>
                    </label>

                    <label className="flex items-center space-x-1.5 font-semibold text-slate-700">
                      <input 
                        type="checkbox"
                        checked={editingRule.item.isFullTextActive}
                        onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, isFullTextActive: e.target.checked }})}
                        className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                      />
                      <span>全文分词联想拉平</span>
                    </label>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">启用状态</label>
                    <select 
                      value={editingRule.item.status}
                      onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, status: e.target.value as any }})}
                      className="w-full bg-white border border-slate-300 rounded p-2 text-xs focus:ring-1 focus:ring-blue-500 font-semibold"
                    >
                      <option value="ACTIVE" className="text-emerald-600">已启用 (ACTIVE)</option>
                      <option value="INACTIVE" className="text-slate-400">已停用 (INACTIVE)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Path Alignment Form Fields */}
              {editingRule.type === 'align' && (
                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">对照规则类型</label>
                    <select 
                      value={editingRule.item.ruleType}
                      onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, ruleType: e.target.value as any }})}
                      className="w-full bg-white border border-slate-300 rounded p-2 text-xs focus:ring-1 focus:ring-blue-500 font-semibold"
                    >
                      <option value="CLASSIFICATION">分类映射关系 (Classification Path)</option>
                      <option value="TYPE">对象类型归一 (Object Type Mapping)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">外部/源分类路径 (未规范源数据路径) <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      required
                      value={editingRule.item.sourcePath}
                      onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, sourcePath: e.target.value }})}
                      placeholder="例如: ERP/五金件/紧固件"
                      className="w-full bg-white border border-slate-300 rounded p-2 text-xs focus:ring-1 focus:ring-blue-500 font-mono text-red-600 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">对照归一到标准分类路径 (Manticore 内部) <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      required
                      value={editingRule.item.standardPath}
                      onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, standardPath: e.target.value }})}
                      placeholder="例如: PLM/标准件/螺栓螺钉/六角螺母"
                      className="w-full bg-white border border-slate-300 rounded p-2 text-xs focus:ring-1 focus:ring-blue-500 font-mono text-emerald-600 font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">分类层级匹配退避相似度折扣 (0.00 ~ 1.00)</label>
                      <input 
                        type="number" 
                        step="0.05"
                        min="0"
                        max="1"
                        value={editingRule.item.similarityDiscount}
                        onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, similarityDiscount: parseFloat(e.target.value) || 0.9 }})}
                        className="w-full bg-white border border-slate-300 rounded p-2 text-xs focus:ring-1 focus:ring-blue-500 font-mono font-bold text-slate-800"
                      />
                      <span className="text-[10px] text-slate-400 block mt-1">例如 0.9 代表映射成功后，基础评分扣减 10% 做惩罚退水。</span>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">适用对象类型</label>
                      <select 
                        value={editingRule.item.applicableObjectType}
                        onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, applicableObjectType: e.target.value as ObjectType }})}
                        className="w-full bg-white border border-slate-300 rounded p-2 text-xs focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="PART_MECHANICAL">机械零件</option>
                        <option value="PART_ELECTRICAL">电气元器件</option>
                        <option value="ALL">全部大类</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">映射启用状态</label>
                    <select 
                      value={editingRule.item.status}
                      onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, status: e.target.value as any }})}
                      className="w-full bg-white border border-slate-300 rounded p-2 text-xs focus:ring-1 focus:ring-blue-500 font-semibold"
                    >
                      <option value="ACTIVE" className="text-emerald-600">启用对照关系 (ACTIVE)</option>
                      <option value="INACTIVE" className="text-slate-400">禁用对照关系 (INACTIVE)</option>
                    </select>
                  </div>
                </div>
              )}

            </form>

            {/* Modal Actions */}
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end space-x-3 bg-slate-50 rounded-b-lg shrink-0">
              <button
                type="button"
                onClick={() => setEditingRule(null)}
                className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-100 rounded text-xs font-semibold text-slate-700 transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-xs font-semibold text-white shadow-xs transition-colors"
              >
                保存规则 (立即生效)
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
