import React, { useState, useMemo } from 'react';
import { 
  Settings, 
  Search, 
  SlidersHorizontal,
  Info,
  HelpCircle,
  Plus,
  Edit2,
  Trash2
} from 'lucide-react';
import { StandardizationRule, SynonymRule, ClassificationAlignmentRule } from '../types';

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

  // Local state for basic adding/editing of simple rows for UCD review
  const [isAdding, setIsAdding] = useState(false);
  
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

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
      
      {/* Header Area */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
              <Settings className="w-5 h-5 text-slate-500" />
              <span>数据处理规则</span>
            </h1>
            <p className="text-xs text-amber-600 mt-1 flex items-center space-x-1 font-medium">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>重要说明：这些规则用于字段算分前的清洗、扩展和归一，不直接配置相似度权重。</span>
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400 bg-slate-100 border border-slate-200 px-2 py-1 rounded font-mono">
              参数处理期：算分前预处理层
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
            onClick={() => alert('UCD 评审版已简化规则增删流，主要用于信息层级和列表呈现评审。')}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-slate-900 text-white hover:bg-slate-800 rounded-md text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>
              {activeTab === 'standard' ? '添加标准化' : activeTab === 'synonym' ? '添加同义词' : '添加类型归一'}
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
                  <th className="px-4 py-3">映射前数据</th>
                  <th className="px-4 py-3">映射后(标准值)</th>
                  <th className="px-4 py-3">匹配模式</th>
                  <th className="px-4 py-3">状态</th>
                  <th className="px-4 py-3 text-center">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredStandard.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-slate-900">{r.ruleName}</td>
                    <td className="px-4 py-3">
                      <span className="bg-blue-50 text-blue-700 border border-blue-100 px-1.5 py-0.5 rounded text-[10px]">
                        {r.applicableObjectType === 'PART_MECHANICAL' ? '机械零件' : '电气元器件'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600">{r.applicableProperty}</td>
                    <td className="px-4 py-3 text-slate-500 max-w-xs truncate" title={r.rawValue}>
                      {r.rawValue.replace(/\n/g, ' | ')}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{r.standardValue}</td>
                    <td className="px-4 py-3">
                      <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-mono">
                        {r.ruleMethod === 'MAP' ? '多对一映射' : '正则提取'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        r.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {r.status === 'ACTIVE' ? '启用中' : '禁用'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button onClick={() => alert('此页面仅作为数据清洗归一规范展示，无需深度编辑。')} className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-blue-600">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => alert('请在正式管理版中进行删除操作。')} className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-red-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'synonym' && (
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 text-xs font-semibold">
                  <th className="px-4 py-3">主词</th>
                  <th className="px-4 py-3">同义词别名集</th>
                  <th className="px-4 py-3">作用范围</th>
                  <th className="px-4 py-3">适用对象类型</th>
                  <th className="px-4 py-3">适用属性</th>
                  <th className="px-4 py-3">状态</th>
                  <th className="px-4 py-3 text-center">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredSynonym.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-semibold text-slate-900">{r.primaryWord}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {r.synonyms.map((s, idx) => (
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
                        {r.applicableObjectType === 'PART_MECHANICAL' ? '机械零件' : '电气元器件'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-500">{r.applicableProperty || '全部'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        r.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {r.status === 'ACTIVE' ? '启用中' : '禁用'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button onClick={() => alert('此页面仅作为数据同义词词库展示，无需深度编辑。')} className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-blue-600">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => alert('请在正式管理版中进行删除操作。')} className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-red-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
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
                  <th className="px-4 py-3">源系统分类/类型路径</th>
                  <th className="px-4 py-3">归一映射到标准路径</th>
                  <th className="px-4 py-3">层级相似度折扣</th>
                  <th className="px-4 py-3">适用对象类型</th>
                  <th className="px-4 py-3">状态</th>
                  <th className="px-4 py-3 text-center">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredAlign.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-700">
                        {r.ruleType === 'CLASSIFICATION' ? '分类归一' : '类型归一'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-red-600 font-medium font-mono">{r.sourcePath}</td>
                    <td className="px-4 py-3 text-emerald-600 font-semibold font-mono">{r.standardPath}</td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-800">
                      {r.similarityDiscount * 100}% <span className="text-[10px] text-slate-400 font-normal">(退避系数)</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="bg-blue-50 text-blue-700 border border-blue-100 px-1.5 py-0.5 rounded text-[10px]">
                        {r.applicableObjectType === 'PART_MECHANICAL' ? '机械零件' : '电气元器件'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        r.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {r.status === 'ACTIVE' ? '启用中' : '禁用'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button onClick={() => alert('此页面仅作为数据源与标准路径归一对齐展示，无需深度编辑。')} className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-blue-600">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => alert('请在正式管理版中进行删除操作。')} className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-red-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

    </div>
  );
};
