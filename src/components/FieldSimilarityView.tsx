import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Save, 
  Send, 
  Search, 
  Filter, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle,
  Undo2,
  Copy,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import { FieldSimilarityRule, ObjectType } from '../types';

interface FieldSimilarityViewProps {
  rules: FieldSimilarityRule[];
  onUpdateRules: (newRules: FieldSimilarityRule[]) => void;
  onPublish: () => void;
}

export const FieldSimilarityView: React.FC<FieldSimilarityViewProps> = ({ 
  rules, 
  onUpdateRules,
  onPublish
}) => {
  // State for editor toggle
  const [editingRule, setEditingRule] = useState<FieldSimilarityRule | null>(null);
  const [isNew, setIsNew] = useState(false);

  // Filters state
  const [keyword, setKeyword] = useState('');
  const [filterObjectType, setFilterObjectType] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterScore, setFilterScore] = useState<string>('ALL');
  const [filterFilter, setFilterFilter] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Form states (for editor)
  const [formObjectType, setFormObjectType] = useState<ObjectType>('PART_MECHANICAL');
  const [formFieldName, setFormFieldName] = useState('');
  const [formPropertyCode, setFormPropertyCode] = useState('');
  const [formFieldType, setFormFieldType] = useState('文本 (TEXT)');
  const [formWeight, setFormWeight] = useState(10);
  const [formMatchType, setFormMatchType] = useState('精确值匹配');
  const [formNullHandling, setFormNullHandling] = useState('设为默认空值 (不扣分)');
  const [formStandardSet, setFormStandardSet] = useState('无');
  const [formSynonymSet, setFormSynonymSet] = useState('无');
  const [formCategoryAlign, setFormCategoryAlign] = useState('无');
  
  // Switches states
  const [formIsScoreActive, setFormIsScoreActive] = useState(true);
  const [formIsFilterCondition, setFormIsFilterCondition] = useState(false);
  const [formIsQueryPreviewAvailable, setFormIsQueryPreviewAvailable] = useState(true);
  const [formIsAppEndActive, setFormIsAppEndActive] = useState(true);
  const [formShowHitReason, setFormShowHitReason] = useState(true);
  const [formShowDiffFields, setFormShowDiffFields] = useState(true);
  const [formHitReasonTemplate, setFormHitReasonTemplate] = useState('');
  const [formDiffFieldsTemplate, setFormDiffFieldsTemplate] = useState('');
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  // 1. List Filter Logic
  const filteredRules = useMemo(() => {
    return rules.filter(r => {
      const matchKeyword = keyword === '' || 
        r.fieldName.toLowerCase().includes(keyword.toLowerCase()) ||
        r.propertyCode.toLowerCase().includes(keyword.toLowerCase()) ||
        r.lastEditor.toLowerCase().includes(keyword.toLowerCase());
      
      const matchObjectType = filterObjectType === 'ALL' || r.objectType === filterObjectType;
      
      const matchType = filterType === 'ALL' || r.fieldType.includes(filterType);
      
      const matchScore = filterScore === 'ALL' || 
        (filterScore === 'TRUE' && r.isScoreActive) || 
        (filterScore === 'FALSE' && !r.isScoreActive);

      const matchFilter = filterFilter === 'ALL' || 
        (filterFilter === 'TRUE' && r.isFilterCondition) || 
        (filterFilter === 'FALSE' && !r.isFilterCondition);

      const matchStatus = filterStatus === 'ALL' || r.status === filterStatus;

      return matchKeyword && matchObjectType && matchType && matchScore && matchFilter && matchStatus;
    });
  }, [rules, keyword, filterObjectType, filterType, filterScore, filterFilter, filterStatus]);

  // 2. Weight Statistics
  const weightSummary = useMemo(() => {
    // Only count active scoring items for the mechanical part by default (most items are mechanical)
    const activeMechRules = rules.filter(r => r.isScoreActive && r.objectType === 'PART_MECHANICAL');
    const totalMechWeight = activeMechRules.reduce((sum, r) => sum + r.weight, 0);
    const details = activeMechRules.map(r => `${r.fieldName.split(' ')[0]}(${r.weight}%)`).join(' + ');
    
    return {
      mechTotal: totalMechWeight,
      mechDetails: details || '无配置'
    };
  }, [rules]);

  // Handle Edit click
  const handleEdit = (rule: FieldSimilarityRule) => {
    setEditingRule(rule);
    setIsNew(false);

    // Populate form
    setFormObjectType(rule.objectType);
    setFormFieldName(rule.fieldName);
    setFormPropertyCode(rule.propertyCode);
    setFormFieldType(rule.fieldType);
    setFormWeight(rule.weight);
    setFormMatchType(rule.matchType);
    setFormNullHandling(rule.nullHandling);
    setFormStandardSet(rule.standardizationRuleSet);
    setFormSynonymSet(rule.synonymRuleSet);
    setFormCategoryAlign(rule.categoryAlignmentStrategy);
    
    setFormIsScoreActive(rule.isScoreActive);
    setFormIsFilterCondition(rule.isFilterCondition);
    setFormIsQueryPreviewAvailable(rule.isQueryPreviewAvailable);
    setFormIsAppEndActive(rule.isAppEndActive);
    setFormShowHitReason(rule.showHitReason);
    setFormShowDiffFields(rule.showDiffFields);
    setFormHitReasonTemplate(rule.hitReasonTemplate);
    setFormDiffFieldsTemplate(rule.diffFieldsTemplate);
  };

  // Handle New Click
  const handleNew = () => {
    setEditingRule(null);
    setIsNew(true);

    // Clear form
    setFormObjectType('PART_MECHANICAL');
    setFormFieldName('');
    setFormPropertyCode('');
    setFormFieldType('文本 (TEXT)');
    setFormWeight(10);
    setFormMatchType('精确匹配');
    setFormNullHandling('设为默认空值 (不扣分)');
    setFormStandardSet('无');
    setFormSynonymSet('无');
    setFormCategoryAlign('无');
    
    setFormIsScoreActive(true);
    setFormIsFilterCondition(false);
    setFormIsQueryPreviewAvailable(true);
    setFormIsAppEndActive(true);
    setFormShowHitReason(true);
    setFormShowDiffFields(true);
    setFormHitReasonTemplate('字段匹配，得 {score}分');
    setFormDiffFieldsTemplate('字段值差异: 源[{source_val}] vs 目标[{target_val}]');
  };

  // Handle Delete
  const handleDelete = (id: string) => {
    if (window.confirm(`确定要删除规则 ${id} 吗？`)) {
      onUpdateRules(rules.filter(r => r.id !== id));
    }
  };

  // Save draft
  const handleSaveForm = (asDraft: boolean) => {
    if (!formFieldName || !formPropertyCode) {
      alert('请输入字段显示名称和属性编码！');
      return;
    }

    const updated: FieldSimilarityRule = {
      id: isNew ? `F-00${rules.length + 1}` : (editingRule?.id || 'F-TMP'),
      objectType: formObjectType,
      fieldName: formFieldName,
      propertyCode: formPropertyCode,
      fieldType: formFieldType,
      weight: Number(formWeight),
      matchType: formMatchType,
      nullHandling: formNullHandling,
      standardizationRuleSet: formStandardSet,
      synonymRuleSet: formSynonymSet,
      categoryAlignmentStrategy: formCategoryAlign,
      
      isScoreActive: formIsScoreActive,
      isFilterCondition: formIsFilterCondition,
      isQueryPreviewAvailable: formIsQueryPreviewAvailable,
      isAppEndActive: formIsAppEndActive,
      showHitReason: formShowHitReason,
      showDiffFields: formShowDiffFields,
      hitReasonTemplate: formHitReasonTemplate,
      diffFieldsTemplate: formDiffFieldsTemplate,
      
      status: asDraft ? 'CHANGED' : 'PUBLISHED',
      publishVersion: asDraft ? '草稿未发布' : 'v2.4.0',
      lastEditor: '李晓华 (工艺数据管理员)',
      lastEditTime: new Date().toISOString().replace('T', ' ').substring(0, 19)
    };

    if (isNew) {
      onUpdateRules([...rules, updated]);
    } else {
      onUpdateRules(rules.map(r => r.id === updated.id ? updated : r));
    }

    // Reset state
    setIsNew(false);
    setEditingRule(null);
  };

  // Insert template variable helper
  const insertVariable = (variable: string, target: 'hit' | 'diff') => {
    if (target === 'hit') {
      setFormHitReasonTemplate(prev => prev + variable);
    } else {
      setFormDiffFieldsTemplate(prev => prev + variable);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
      
      {/* Dynamic Header Frame Selector & Subtitle */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0 flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2 text-xs text-slate-500 mb-1">
            <span>相似度配置</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-800 font-medium">字段相似度规则</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            {isNew ? '新建字段相似度规则' : editingRule ? '编辑字段相似度规则' : '字段相似度规则配置'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            定义 PLM 物料核心数据在一阶段全文检索后，进入 Manticore 二阶段精准相似度矩阵的分值比重和匹配逻辑。
          </p>
        </div>

        {/* Action controls */}
        {!editingRule && !isNew ? (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                alert('草稿配置已保存！可在此界面点击“发布配置”正式将其推送到生产 Manticore 节点。');
              }}
              className="flex items-center space-x-1.5 px-3.5 py-2 border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 rounded-md text-xs font-medium transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>保存当前草稿</span>
            </button>
            <button
              onClick={onPublish}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md text-xs font-semibold shadow-sm transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>发布配置到引擎</span>
            </button>
            <button
              onClick={handleNew}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-md text-xs font-semibold shadow-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新建规则</span>
            </button>
          </div>
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
              onClick={() => handleSaveForm(true)}
              className="flex items-center space-x-1.5 px-3.5 py-2 border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md text-xs font-medium transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>保存草稿</span>
            </button>
            <button
              onClick={() => handleSaveForm(false)}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md text-xs font-semibold shadow-sm transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>保存并生效 (草稿)</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {!(editingRule || isNew) ? (
        // FRAME 1: LIST VIEW
        <div className="flex-1 flex flex-col overflow-hidden">
          
          {/* Status KPI Indicators */}
          <div className="px-6 pt-4 shrink-0 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-lg p-3.5 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-xs text-slate-500 block">机械零件 (PART_MECHANICAL) 权重合计</span>
                <div className="flex items-baseline space-x-1.5 mt-1">
                  <span className={`text-2xl font-bold font-mono ${weightSummary.mechTotal === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {weightSummary.mechTotal}%
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {weightSummary.mechTotal === 100 ? '已配平(100%满分)' : '未配平，需等于100%'}
                  </span>
                </div>
              </div>
              <div className="p-2 bg-slate-50 rounded text-slate-600">
                <SlidersHorizontal className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-3.5 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-xs text-slate-500 block">当前草稿池未发布变更</span>
                <div className="flex items-baseline space-x-1.5 mt-1">
                  <span className="text-2xl font-bold text-amber-600 font-mono">2</span>
                  <span className="text-[11px] text-slate-500">包含材质、工作电压规则</span>
                </div>
              </div>
              <div className="p-2 bg-amber-50 rounded text-amber-600">
                <AlertCircle className="w-5 h-5 animate-pulse" />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-3.5 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-xs text-slate-500 block">Manticore 端生效版本</span>
                <div className="flex items-baseline space-x-1.5 mt-1">
                  <span className="text-2xl font-bold text-slate-800 font-mono">v2.4.0</span>
                  <span className="text-[11px] text-slate-500">2026-07-02 同步完成</span>
                </div>
              </div>
              <div className="p-2 bg-emerald-50 rounded text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Quick detailed display of weight formula */}
          <div className="px-6 pt-3 shrink-0">
            <div className="bg-slate-100/80 border border-slate-200/80 rounded-md px-3 py-2 text-xs text-slate-600 flex items-center justify-between">
              <span className="font-medium text-slate-700">机械物料二阶段评分公式:</span>
              <span className="font-mono text-slate-500 truncate max-w-xl">{weightSummary.mechDetails}</span>
              <span className="text-slate-400 text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                Manticore 实时解析
              </span>
            </div>
          </div>

          {/* Filter Area */}
          <div className="px-6 py-3 shrink-0 flex flex-wrap items-center gap-3 bg-slate-50">
            {/* keyword search */}
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索字段名称 / 编码 / 修改人"
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-hidden focus:border-blue-500"
              />
            </div>

            {/* Object Type Select */}
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
                <option value="DOCUMENT">图纸文档 (DOCUMENT)</option>
                <option value="CAD_MODEL">CAD模型实体 (CAD_MODEL)</option>
              </select>
            </div>

            {/* Field Type Select */}
            <div className="flex items-center space-x-1.5 text-xs">
              <span className="text-slate-500">字段类型:</span>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-white border border-slate-300 rounded px-2 py-1 text-xs"
              >
                <option value="ALL">全部类型</option>
                <option value="LONG_TEXT">长文本 (LONG_TEXT)</option>
                <option value="NUMBER">数字 (NUMBER)</option>
                <option value="ENUM">枚举 (ENUM)</option>
                <option value="CLASS_TREE">分类树 (CLASS_TREE)</option>
              </select>
            </div>

            {/* Score Switch */}
            <div className="flex items-center space-x-1.5 text-xs">
              <span className="text-slate-500">参与评分:</span>
              <select
                value={filterScore}
                onChange={(e) => setFilterScore(e.target.value)}
                className="bg-white border border-slate-300 rounded px-2 py-1 text-xs"
              >
                <option value="ALL">全部</option>
                <option value="TRUE">是</option>
                <option value="FALSE">否</option>
              </select>
            </div>

            {/* Filter Condition Switch */}
            <div className="flex items-center space-x-1.5 text-xs">
              <span className="text-slate-500">作为过滤:</span>
              <select
                value={filterFilter}
                onChange={(e) => setFilterFilter(e.target.value)}
                className="bg-white border border-slate-300 rounded px-2 py-1 text-xs"
              >
                <option value="ALL">全部</option>
                <option value="TRUE">是</option>
                <option value="FALSE">否</option>
              </select>
            </div>

            {/* Status Select */}
            <div className="flex items-center space-x-1.5 text-xs">
              <span className="text-slate-500">状态:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-white border border-slate-300 rounded px-2 py-1 text-xs"
              >
                <option value="ALL">全部</option>
                <option value="PUBLISHED">已发布 (PUBLISHED)</option>
                <option value="CHANGED">草稿变更中 (CHANGED)</option>
                <option value="DRAFT">未发布草稿 (DRAFT)</option>
              </select>
            </div>

            {/* Reset Filters button */}
            {(keyword !== '' || filterObjectType !== 'ALL' || filterType !== 'ALL' || filterScore !== 'ALL' || filterFilter !== 'ALL' || filterStatus !== 'ALL') && (
              <button
                onClick={() => {
                  setKeyword('');
                  setFilterObjectType('ALL');
                  setFilterType('ALL');
                  setFilterScore('ALL');
                  setFilterFilter('ALL');
                  setFilterStatus('ALL');
                }}
                className="text-xs text-blue-600 hover:text-blue-800 underline pl-1"
              >
                重置筛选
              </button>
            )}
          </div>

          {/* High-density grid container with horizontal scrolling */}
          <div className="flex-1 overflow-auto px-6 pb-6">
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm min-w-[2000px] overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 text-xs font-semibold font-sans">
                    <th className="px-3 py-2.5 border-r border-slate-200">对象类型</th>
                    <th className="px-3 py-2.5 border-r border-slate-200 sticky left-0 bg-slate-100 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">字段显示名称</th>
                    <th className="px-3 py-2.5 border-r border-slate-200">属性编码 / Manticore 字段</th>
                    <th className="px-3 py-2.5 border-r border-slate-200">字段类型</th>
                    <th className="px-3 py-2.5 border-r border-slate-200 text-center">权重 (%)</th>
                    <th className="px-3 py-2.5 border-r border-slate-200">匹配方式</th>
                    <th className="px-3 py-2.5 border-r border-slate-200">空值处理</th>
                    <th className="px-3 py-2.5 border-r border-slate-200">标准化规则集</th>
                    <th className="px-3 py-2.5 border-r border-slate-200">同义词规则集</th>
                    <th className="px-3 py-2.5 border-r border-slate-200">分类/类型归一策略</th>
                    <th className="px-3 py-2.5 border-r border-slate-200 text-center">评分</th>
                    <th className="px-3 py-2.5 border-r border-slate-200 text-center">过滤</th>
                    <th className="px-3 py-2.5 border-r border-slate-200 text-center">预览</th>
                    <th className="px-3 py-2.5 border-r border-slate-200 text-center">生效</th>
                    <th className="px-3 py-2.5 border-r border-slate-200 text-center">命中原因</th>
                    <th className="px-3 py-2.5 border-r border-slate-200 text-center">差异字段</th>
                    <th className="px-4 py-2.5 border-r border-slate-200">命中原因模板 (动态)</th>
                    <th className="px-4 py-2.5 border-r border-slate-200">差异字段模板 (动态)</th>
                    <th className="px-3 py-2.5 border-r border-slate-200 text-center">状态</th>
                    <th className="px-3 py-2.5 border-r border-slate-200">版本</th>
                    <th className="px-3 py-2.5 border-r border-slate-200">最后编辑人</th>
                    <th className="px-3 py-2.5 border-r border-slate-200">最后编辑时间</th>
                    <th className="px-4 py-2.5 text-center sticky right-0 bg-slate-100 z-10 shadow-[-2px_0_5px_rgba(0,0,0,0.05)]">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs font-sans">
                  {filteredRules.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Object Type */}
                      <td className="px-3 py-2 border-r border-slate-200 font-medium text-slate-700 whitespace-nowrap">
                        {r.objectType === 'PART_MECHANICAL' ? (
                          <span className="bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded">机械零件</span>
                        ) : r.objectType === 'PART_ELECTRICAL' ? (
                          <span className="bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded">电气元器件</span>
                        ) : (
                          <span className="bg-slate-100 text-slate-700 border border-slate-200 px-1.5 py-0.5 rounded">全局/通用</span>
                        )}
                      </td>

                      {/* Name - sticky left to avoid losing context */}
                      <td className="px-3 py-2 border-r border-slate-200 font-semibold text-slate-900 whitespace-nowrap sticky left-0 bg-white group-hover:bg-slate-50 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                        {r.fieldName}
                      </td>

                      {/* Property Code */}
                      <td className="px-3 py-2 border-r border-slate-200 font-mono text-slate-600 whitespace-nowrap">
                        {r.propertyCode}
                      </td>

                      {/* Field Type */}
                      <td className="px-3 py-2 border-r border-slate-200 text-slate-600 whitespace-nowrap">
                        {r.fieldType}
                      </td>

                      {/* Weight */}
                      <td className="px-3 py-2 border-r border-slate-200 font-bold text-center text-slate-800 whitespace-nowrap font-mono">
                        {r.weight}%
                      </td>

                      {/* Match Type */}
                      <td className="px-3 py-2 border-r border-slate-200 text-slate-600 truncate max-w-[150px]" title={r.matchType}>
                        {r.matchType}
                      </td>

                      {/* Null Handling */}
                      <td className="px-3 py-2 border-r border-slate-200 text-slate-600 whitespace-nowrap">
                        {r.nullHandling}
                      </td>

                      {/* Standardization Ruleset */}
                      <td className="px-3 py-2 border-r border-slate-200 text-slate-600 whitespace-nowrap">
                        {r.standardizationRuleSet === '无' ? (
                          <span className="text-slate-400 font-normal">--</span>
                        ) : (
                          <span className="text-blue-600 hover:underline cursor-pointer">{r.standardizationRuleSet}</span>
                        )}
                      </td>

                      {/* Synonym Ruleset */}
                      <td className="px-3 py-2 border-r border-slate-200 text-slate-600 whitespace-nowrap">
                        {r.synonymRuleSet === '无' ? (
                          <span className="text-slate-400 font-normal">--</span>
                        ) : (
                          <span className="text-purple-600 hover:underline cursor-pointer">{r.synonymRuleSet}</span>
                        )}
                      </td>

                      {/* Alignment Strategy */}
                      <td className="px-3 py-2 border-r border-slate-200 text-slate-600 whitespace-nowrap">
                        {r.categoryAlignmentStrategy === '无' ? (
                          <span className="text-slate-400 font-normal">--</span>
                        ) : (
                          <span className="text-emerald-600 hover:underline cursor-pointer">{r.categoryAlignmentStrategy}</span>
                        )}
                      </td>

                      {/* Checkbox columns: Is Score Active */}
                      <td className="px-3 py-2 border-r border-slate-200 text-center whitespace-nowrap">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${r.isScoreActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                          {r.isScoreActive ? '启用' : '禁用'}
                        </span>
                      </td>

                      {/* Is Filter Condition */}
                      <td className="px-3 py-2 border-r border-slate-200 text-center whitespace-nowrap">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${r.isFilterCondition ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-400'}`}>
                          {r.isFilterCondition ? '是' : '否'}
                        </span>
                      </td>

                      {/* Is Query Preview Available */}
                      <td className="px-3 py-2 border-r border-slate-200 text-center whitespace-nowrap">
                        {r.isQueryPreviewAvailable ? <span className="text-emerald-500">✔</span> : <span className="text-slate-300">--</span>}
                      </td>

                      {/* Is App End Active */}
                      <td className="px-3 py-2 border-r border-slate-200 text-center whitespace-nowrap">
                        {r.isAppEndActive ? <span className="text-blue-500 font-semibold">✔</span> : <span className="text-slate-300">--</span>}
                      </td>

                      {/* Show Hit Reason */}
                      <td className="px-3 py-2 border-r border-slate-200 text-center whitespace-nowrap">
                        {r.showHitReason ? <span className="text-slate-600">✔</span> : <span className="text-slate-300">--</span>}
                      </td>

                      {/* Show Diff Fields */}
                      <td className="px-3 py-2 border-r border-slate-200 text-center whitespace-nowrap">
                        {r.showDiffFields ? <span className="text-slate-600">✔</span> : <span className="text-slate-300">--</span>}
                      </td>

                      {/* Hit Reason Template */}
                      <td className="px-4 py-2 border-r border-slate-200 text-slate-500 max-w-[240px] truncate" title={r.hitReasonTemplate}>
                        {r.hitReasonTemplate || <span className="text-slate-300 italic">未配置</span>}
                      </td>

                      {/* Diff Fields Template */}
                      <td className="px-4 py-2 border-r border-slate-200 text-slate-500 max-w-[240px] truncate" title={r.diffFieldsTemplate}>
                        {r.diffFieldsTemplate || <span className="text-slate-300 italic">未配置</span>}
                      </td>

                      {/* Status */}
                      <td className="px-3 py-2 border-r border-slate-200 text-center whitespace-nowrap">
                        {r.status === 'PUBLISHED' ? (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-medium">已发布</span>
                        ) : r.status === 'CHANGED' ? (
                          <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded font-medium">变更草稿</span>
                        ) : (
                          <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded font-medium">草稿</span>
                        )}
                      </td>

                      {/* Publish Version */}
                      <td className="px-3 py-2 border-r border-slate-200 font-mono text-slate-600 whitespace-nowrap">
                        {r.publishVersion}
                      </td>

                      {/* Last Editor */}
                      <td className="px-3 py-2 border-r border-slate-200 text-slate-600 whitespace-nowrap">
                        {r.lastEditor}
                      </td>

                      {/* Last Edit Time */}
                      <td className="px-3 py-2 border-r border-slate-200 text-slate-500 font-mono whitespace-nowrap">
                        {r.lastEditTime}
                      </td>

                      {/* Action buttons - sticky right */}
                      <td className="px-4 py-2 text-center whitespace-nowrap sticky right-0 bg-white z-10 shadow-[-2px_0_5px_rgba(0,0,0,0.02)]">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            onClick={() => handleEdit(r)}
                            className="p-1 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded transition-colors"
                            title="修改配置"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(r.id)}
                            className="p-1 text-slate-600 hover:text-red-600 hover:bg-slate-100 rounded transition-colors"
                            title="删除规则"
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
        // FRAME 2: NEW / EDIT FORM VIEW
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            
            {/* Form Segment Header */}
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {isNew ? '创建字段相似度规则' : `正在编辑规则：[${editingRule?.id}] ${formFieldName}`}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">配置二阶段属性对比规则，供相似度算法在沙盒或业务端调用打分。</p>
              </div>
              <span className="text-xs font-mono bg-white px-2 py-1 rounded border border-slate-200 text-slate-500 font-semibold">
                Manticore 二阶段规则
              </span>
            </div>

            {/* Form Content */}
            <div className="p-6 space-y-6 text-xs">
              
              {/* BLOCK 1: 基础信息 */}
              <div className="bg-slate-50/50 border border-slate-200 rounded-lg p-4 space-y-4">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block border-b border-slate-200 pb-2 flex items-center space-x-1.5">
                  <span className="w-1 h-3.5 bg-blue-600 rounded"></span>
                  <span>1. 字段基础信息 (元数据)</span>
                </span>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">适用物料类型 <span className="text-red-500">*</span></label>
                    <select
                      value={formObjectType}
                      onChange={(e) => setFormObjectType(e.target.value as ObjectType)}
                      className="w-full bg-white border border-slate-300 rounded p-2 text-xs font-medium focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="PART_MECHANICAL">机械零件 (PART_MECHANICAL)</option>
                      <option value="PART_ELECTRICAL">电气元器件 (PART_ELECTRICAL)</option>
                      <option value="DOCUMENT">图纸文档 (DOCUMENT)</option>
                      <option value="CAD_MODEL">CAD模型实体 (CAD_MODEL)</option>
                      <option value="ALL">全部通用类型 (ALL)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">字段中文名 <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={formFieldName}
                      onChange={(e) => setFormFieldName(e.target.value)}
                      placeholder="例如：主要材质"
                      className="w-full bg-white border border-slate-300 rounded p-2 text-xs font-medium focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">属性物理编码 <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={formPropertyCode}
                      onChange={(e) => setFormPropertyCode(e.target.value)}
                      placeholder="例如：core_material"
                      className="w-full bg-white border border-slate-300 rounded p-2 text-xs focus:ring-1 focus:ring-blue-500 font-mono font-bold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">字段数据类型</label>
                    <select
                      value={formFieldType}
                      onChange={(e) => setFormFieldType(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded p-2 text-xs font-medium"
                    >
                      <option value="文本 (TEXT)">文本 (TEXT)</option>
                      <option value="长文本 (LONG_TEXT)">长文本 (LONG_TEXT)</option>
                      <option value="数字 (NUMBER)">数字 (NUMBER)</option>
                      <option value="枚举 (ENUM)">枚举 (ENUM)</option>
                      <option value="日期 (DATE)">日期 (DATE)</option>
                      <option value="分类树 (CLASS_TREE)">分类树 (CLASS_TREE)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* BLOCK 2: 算分规则 */}
              <div className="bg-slate-50/50 border border-slate-200 rounded-lg p-4 space-y-4">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block border-b border-slate-200 pb-2 flex items-center space-x-1.5">
                  <span className="w-1 h-3.5 bg-blue-600 rounded"></span>
                  <span>2. 相似度算分规则</span>
                </span>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">计算权重 (%) <span className="text-red-500">*</span></label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={formWeight}
                        onChange={(e) => setFormWeight(Number(e.target.value))}
                        className="w-full bg-white border border-slate-300 rounded p-2 text-xs font-mono font-bold focus:ring-1 focus:ring-blue-500"
                      />
                      <span className="text-[10px] text-slate-400 shrink-0">满分权重：100%</span>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">物理匹配算法</label>
                    <select
                      value={formMatchType}
                      onChange={(e) => setFormMatchType(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded p-2 text-xs font-medium focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="精确值匹配">精确值匹配 (Exact Match)</option>
                      <option value="TF-IDF 文本相似度 / Manticore 权重词匹配">TF-IDF 文本相似度 / Manticore 权重词匹配</option>
                      <option value="数值范围容差匹配 (+/- 0.2mm)">数值范围容差匹配 (+/- 0.2mm)</option>
                      <option value="数值范围退让比对">数值范围退让比对</option>
                      <option value="层级深度折扣匹配">层级深度折扣匹配</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">缺失空值比对处理</label>
                    <select
                      value={formNullHandling}
                      onChange={(e) => setFormNullHandling(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded p-2 text-xs font-medium focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="设为默认空字符串 (不扣分)">设为默认空字符串 (不扣分)</option>
                      <option value="缺失判定为不匹配 (扣减该项全额权重)">缺失判定为不匹配 (扣减该项全额权重)</option>
                      <option value="缺失不参与计算 (分摊到其他字段)">缺失不参与计算 (分摊到其他字段)</option>
                      <option value="视为不匹配 (固定扣减10分)">视为不匹配 (固定扣减10分)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* BLOCK 3: 算分前处理 (高级处理 - Default Collapsed) */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                  className="w-full bg-slate-50 px-4 py-3 border-b border-slate-200 hover:bg-slate-100 flex items-center justify-between text-left transition-colors"
                >
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                    <span className="w-1 h-3.5 bg-purple-600 rounded"></span>
                    <span>3. 算分前处理规约 (高级处理 - 选填)</span>
                  </span>
                  <div className="flex items-center space-x-2 text-[11px] text-slate-500">
                    <span>{isAdvancedOpen ? '收起配置' : '展开标准化及扩展集'}</span>
                    {isAdvancedOpen ? <span className="text-xs">▲</span> : <span className="text-xs">▼</span>}
                  </div>
                </button>

                {isAdvancedOpen && (
                  <div className="p-4 bg-white space-y-4 border-b border-slate-200 animate-fadeIn">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1 text-[11px]">关联标准化规则集</label>
                        <select
                          value={formStandardSet}
                          onChange={(e) => setFormStandardSet(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded p-2 text-xs font-semibold text-blue-700 focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="无">-- 暂不挂载规则 --</option>
                          <option value="机械物料规格标准化规则集">机械物料规格标准化规则集</option>
                          <option value="不锈钢/碳钢牌号归一规则">不锈钢/碳钢牌号归一规则</option>
                          <option value="螺纹尺寸标准化映射">螺纹尺寸标准化映射</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1 text-[11px]">关联同义词扩展规则集</label>
                        <select
                          value={formSynonymSet}
                          onChange={(e) => setFormSynonymSet(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded p-2 text-xs font-semibold text-purple-700 focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="无">-- 暂不挂载规则 --</option>
                          <option value="紧固件规格同义词规则集">紧固件规格同义词规则集</option>
                          <option value="金属材料等级同义词集">金属材料等级同义词集</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1 text-[11px]">关联分类/类型归一策略</label>
                        <select
                          value={formCategoryAlign}
                          onChange={(e) => setFormCategoryAlign(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded p-2 text-xs font-semibold text-emerald-700 focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="无">-- 暂不挂载规则 --</option>
                          <option value="分类继承归一策略">分类继承归一策略</option>
                          <option value="材料层级关系退避策略">材料层级关系退避策略</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* BLOCK 4: 展示解释 */}
              <div className="bg-slate-50/50 border border-slate-200 rounded-lg p-4 space-y-4">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block border-b border-slate-200 pb-2 flex items-center space-x-1.5">
                  <span className="w-1 h-3.5 bg-blue-600 rounded"></span>
                  <span>4. 展现行为与审计开关配置</span>
                </span>
                
                {/* Switch list */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-slate-200 pb-4">
                  {/* Score active */}
                  <label className="flex items-start space-x-3 cursor-pointer p-2 bg-white rounded border border-slate-200">
                    <input
                      type="checkbox"
                      checked={formIsScoreActive}
                      onChange={(e) => setFormIsScoreActive(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <div>
                      <span className="font-semibold text-slate-800 block">参与相似度评分</span>
                      <span className="text-[10px] text-slate-400">此字段的比对得分是否贡献给总相似评分</span>
                    </div>
                  </label>

                  {/* Hard filter */}
                  <label className="flex items-start space-x-3 cursor-pointer p-2 bg-white rounded border border-slate-200">
                    <input
                      type="checkbox"
                      checked={formIsFilterCondition}
                      onChange={(e) => setFormIsFilterCondition(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <div>
                      <span className="font-semibold text-slate-800 block">参与索引强过滤</span>
                      <span className="text-[10px] text-slate-400">作为硬匹配条件（不匹配时一票否决/强制剔除）</span>
                    </div>
                  </label>

                  {/* App end active / display */}
                  <label className="flex items-start space-x-3 cursor-pointer p-2 bg-white rounded border border-slate-200">
                    <input
                      type="checkbox"
                      checked={formIsAppEndActive}
                      onChange={(e) => setFormIsAppEndActive(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <div>
                      <span className="font-semibold text-slate-800 block">在应用端展示</span>
                      <span className="text-[10px] text-slate-400">开启后此字段才会在研发端物料相似列表中陈列</span>
                    </div>
                  </label>

                  {/* Show hit reason */}
                  <label className="flex items-start space-x-3 cursor-pointer p-2 bg-white rounded border border-slate-200">
                    <input
                      type="checkbox"
                      checked={formShowHitReason}
                      onChange={(e) => setFormShowHitReason(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <div>
                      <span className="font-semibold text-slate-800 block">生成命中原因日志</span>
                      <span className="text-[10px] text-slate-400">在审计和沙盒验证中输出该字段的比对文字分析</span>
                    </div>
                  </label>

                  {/* Show diff fields */}
                  <label className="flex items-start space-x-3 cursor-pointer p-2 bg-white rounded border border-slate-200">
                    <input
                      type="checkbox"
                      checked={formShowDiffFields}
                      onChange={(e) => setFormShowDiffFields(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <div>
                      <span className="font-semibold text-slate-800 block">计算并展示物理差异</span>
                      <span className="text-[10px] text-slate-400">当分值不为满分时，输出高亮且详细的差异文本</span>
                    </div>
                  </label>

                  {/* Is Required for Audit (审核必填 placeholder) */}
                  <label className="flex items-start space-x-3 cursor-pointer p-2 bg-white rounded border border-slate-200">
                    <input
                      type="checkbox"
                      defaultChecked={true}
                      className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <div>
                      <span className="font-semibold text-slate-800 block">提报审核必填校验</span>
                      <span className="text-[10px] text-slate-400">申请人在业务端填写属性时此属性为必填项</span>
                    </div>
                  </label>
                </div>

                {/* Templates Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Hit Reason Template */}
                  <div className="border border-slate-200 rounded-lg p-3 bg-white space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700 text-[11px]">1. 命中原理解释文字模板</span>
                      <span className="text-[10px] text-slate-400">开启[生成命中原因]时激活</span>
                    </div>
                    <textarea
                      rows={2}
                      value={formHitReasonTemplate}
                      onChange={(e) => setFormHitReasonTemplate(e.target.value)}
                      placeholder="例如: 属性比对通过，相似算分 {score}分"
                      className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs font-mono"
                      disabled={!formShowHitReason}
                    />
                    <div className="flex items-center space-x-1 flex-wrap">
                      <span className="text-[10px] text-slate-400">标签:</span>
                      {['{score}', '{match}', '{source_val}', '{target_val}'].map(v => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => {
                            setFormHitReasonTemplate(prev => prev + v);
                          }}
                          disabled={!formShowHitReason}
                          className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[9px] font-mono"
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Diff Fields Template */}
                  <div className="border border-slate-200 rounded-lg p-3 bg-white space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700 text-[11px]">2. 物理差异标注文字模板</span>
                      <span className="text-[10px] text-slate-400">开启[计算并展示差异]时激活</span>
                    </div>
                    <textarea
                      rows={2}
                      value={formDiffFieldsTemplate}
                      onChange={(e) => setFormDiffFieldsTemplate(e.target.value)}
                      placeholder="例如: 材质不符，原[{source_val}] 现[{target_val}]"
                      className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs font-mono"
                      disabled={!formShowDiffFields}
                    />
                    <div className="flex items-center space-x-1 flex-wrap">
                      <span className="text-[10px] text-slate-400">标签:</span>
                      {['{source_val}', '{target_val}', '{score}'].map(v => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => {
                            setFormDiffFieldsTemplate(prev => prev + v);
                          }}
                          disabled={!formShowDiffFields}
                          className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[9px] font-mono"
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

              </div>

            </div>

            {/* Bottom Form Actions */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end space-x-3">
              <button
                onClick={() => { setEditingRule(null); setIsNew(false); }}
                className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 rounded text-xs font-medium text-slate-700 transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => handleSaveForm(true)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded text-xs font-semibold text-slate-800 transition-colors"
              >
                保存为草稿 (不发布)
              </button>
              <button
                onClick={() => handleSaveForm(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-xs font-semibold text-white shadow-xs transition-colors"
              >
                确定提交 (草稿池)
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
