import React, { useState, useMemo, useRef } from 'react';
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
  SlidersHorizontal,
  ChevronRight,
  Info,
  Check,
  AlertTriangle,
  FolderOpen
} from 'lucide-react';
import { FieldSimilarityRule, ObjectType } from '../types';

interface FieldSimilarityViewProps {
  rules: FieldSimilarityRule[];
  onUpdateRules: (newRules: FieldSimilarityRule[]) => void;
  onPublish: () => void;
}

// 一阶段已映射字段目录 (Metadata directory from Stage 1)
const STAGE_1_FIELDS = [
  {
    fieldName: '名称',
    propertyCode: 'spec_name',
    fieldType: '文本 (TEXT)',
    manticoreType: 'VARCHAR',
    source: '无',
    unitFamily: '无',
    baseUnit: '无',
    indexStatus: '已索引'
  },
  {
    fieldName: '长度',
    propertyCode: 'length',
    fieldType: '数字 (NUMBER)',
    manticoreType: 'DOUBLE',
    source: '无',
    unitFamily: '长度',
    baseUnit: 'm',
    indexStatus: '已索引'
  },
  {
    fieldName: '主要材质',
    propertyCode: 'core_material',
    fieldType: '枚举 (ENUM)',
    manticoreType: 'VARCHAR',
    source: '物料材质牌号字典',
    unitFamily: '无',
    baseUnit: '无',
    indexStatus: '已索引'
  },
  {
    fieldName: '分类路径',
    propertyCode: 'category_path',
    fieldType: '分类树 (CLASS_TREE)',
    manticoreType: 'VARCHAR',
    source: 'PLM原生分类树',
    unitFamily: '无',
    baseUnit: '无',
    indexStatus: '已索引'
  },
  {
    fieldName: '生命周期状态',
    propertyCode: 'lifecycle_state',
    fieldType: '枚举 (ENUM)',
    manticoreType: 'VARCHAR',
    source: '生命周期状态枚举',
    unitFamily: '无',
    baseUnit: '无',
    indexStatus: '已索引'
  }
];

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
  const [formNullHandling, setFormNullHandling] = useState('候选缺失按 0 分');
  const [manticoreType, setManticoreType] = useState('VARCHAR');
  const [enumOrCategorySource, setEnumOrCategorySource] = useState('无');
  const [unitFamily, setUnitFamily] = useState('无');
  const [baseUnit, setBaseUnit] = useState('无');
  const [indexStatus, setIndexStatus] = useState('已索引');
  
  // New States for Segmented values & Display Unit selector & Interactive Example
  const [formDisplayUnit, setFormDisplayUnit] = useState('mm');
  
  // Interactive Example Values
  const [exampleRefVal, setExampleRefVal] = useState('50.0');
  const [exampleCandVal, setExampleCandVal] = useState('50.1');

  // Match Type Parameter States
  const [paramMinTextThreshold, setParamMinTextThreshold] = useState(60);
  const [paramNumToleranceType, setParamNumToleranceType] = useState<'ABSOLUTE' | 'PERCENTAGE'>('ABSOLUTE');
  const [paramNumToleranceVal, setParamNumToleranceVal] = useState(0.2);
  const [paramNumToleranceDirection, setParamNumToleranceDirection] = useState<'BOTH' | 'HIGHER' | 'LOWER'>('BOTH');

  const [paramDecayFullScore, setParamDecayFullScore] = useState(0.1);
  const [paramDecayZeroBoundary, setParamDecayZeroBoundary] = useState(1.0);
  const [paramDecayDirection, setParamDecayDirection] = useState<'BOTH' | 'HIGHER' | 'LOWER'>('BOTH');

  const [paramDateToleranceVal, setParamDateToleranceVal] = useState(7);
  const [paramDateToleranceUnit, setParamDateToleranceUnit] = useState<'DAY' | 'HOUR'>('DAY');
  const [paramDateToleranceDirection, setParamDateToleranceDirection] = useState<'BOTH' | 'HIGHER' | 'LOWER'>('BOTH');

  const [paramHierarchyMaxDiff, setParamHierarchyMaxDiff] = useState(3);
  const [paramHierarchyRequirement, setParamHierarchyRequirement] = useState<'PARENT_CHILD' | 'ANCESTOR_DESCENDANT'>('ANCESTOR_DESCENDANT');
  const [paramHierarchyDeduction, setParamHierarchyDeduction] = useState(5);

  // Switches states
  const [formIsScoreActive, setFormIsScoreActive] = useState(true);
  const [formIsFilterCondition, setFormIsFilterCondition] = useState(false);
  const [formHitReasonTemplate, setFormHitReasonTemplate] = useState('');
  const [formDiffFieldsTemplate, setFormDiffFieldsTemplate] = useState('');

  // Field Selection Modal state
  const [showFieldSelector, setShowFieldSelector] = useState(false);
  const [showVariableGuide, setShowVariableGuide] = useState(false);

  // Refs for cursor insertion
  const hitReasonRef = useRef<HTMLTextAreaElement>(null);
  const diffFieldsRef = useRef<HTMLTextAreaElement>(null);

  // Helper to generate live template preview with mock data
  const getPreviewText = (template: string, fieldType: string) => {
    let src = "内六角螺栓 M10";
    let tgt = "六角螺栓 M10";
    let diff = "0.2mm";
    let match = "精确匹配";
    let score = "85";
    let cat = "紧固件/螺栓";

    if (fieldType.includes("数字") || fieldType.includes("NUMBER") || fieldType.includes("数值")) {
      src = "50 mm";
      tgt = "50.2 mm";
      diff = "0.2 mm";
      match = "数值容差匹配";
      score = "100";
    } else if (fieldType.includes("分类") || fieldType.includes("CLASS_TREE") || fieldType.includes("分类树")) {
      src = "紧固件/螺栓";
      tgt = "标准件/螺栓/内六角螺栓";
      diff = "1层级";
      match = "层级深度折扣匹配";
      score = "90";
      cat = "紧固件/螺栓";
    } else if (fieldType.includes("枚举") || fieldType.includes("ENUM")) {
      src = "SUS304";
      tgt = "Q235";
      diff = "不同材质";
      match = "值精确匹配";
      score = "0";
    }

    return template
      .replace(/\{score\}/g, score)
      .replace(/\{source_val\}/g, src)
      .replace(/\{target_val\}/g, tgt)
      .replace(/\{match\}/g, match)
      .replace(/\{diff_val\}/g, diff)
      .replace(/\{category\}/g, cat);
  };

  // Helper to check for invalid/unknown variables
  const getInvalidVariables = (text: string) => {
    const matches = text.match(/\{[^{}]*\}/g) || [];
    const validVars = ['{score}', '{source_val}', '{target_val}', '{match}', '{diff_val}', '{category}'];
    const invalid = matches.filter(v => !validVars.includes(v));
    return invalid;
  };

  // Click insert helper at cursor position
  const handleInsertVariable = (
    textareaRef: React.RefObject<HTMLTextAreaElement | null>,
    value: string,
    setter: React.Dispatch<React.SetStateAction<string>>
  ) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setter(prev => prev + value);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);

    setter(before + value + after);

    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = start + value.length;
      textarea.selectionEnd = start + value.length;
    }, 0);
  };

  const getAvailableVariablesForType = (fieldType: string) => {
    const common = ['{score}', '{source_val}', '{target_val}'];
    if (fieldType.includes('TEXT') || fieldType.includes('文本')) {
      return [...common, '{match}'];
    }
    if (fieldType.includes('NUMBER') || fieldType.includes('数字')) {
      return [...common, '{diff_val}'];
    }
    if (fieldType.includes('CLASS_TREE') || fieldType.includes('分类')) {
      return [...common, '{category}'];
    }
    if (fieldType.includes('ENUM') || fieldType.includes('枚举')) {
      return [...common, '{match}'];
    }
    return common;
  };

  // Filter list logic
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

  // Weight Statistics
  const weightSummary = useMemo(() => {
    const activeRules = rules.filter(r => r.isScoreActive && r.objectType === 'PART_MECHANICAL');
    const totalWeight = activeRules.reduce((sum, r) => sum + r.weight, 0);
    const details = activeRules.map(r => `${r.fieldName.split(' ')[0]}(${r.weight}%)`).join(' + ');
    
    return {
      mechTotal: totalWeight,
      mechDetails: details || '无配置'
    };
  }, [rules]);

  // Handle Edit click
  const handleEdit = (rule: FieldSimilarityRule) => {
    setEditingRule(rule);
    setIsNew(false);

    // Find Stage 1 Meta
    const meta = STAGE_1_FIELDS.find(f => f.propertyCode === rule.propertyCode) || {
      manticoreType: 'VARCHAR',
      source: '无',
      unitFamily: '无',
      baseUnit: '无',
      indexStatus: '已索引'
    };

    setManticoreType(meta.manticoreType);
    setEnumOrCategorySource(meta.source);
    setUnitFamily(meta.unitFamily);
    setBaseUnit(meta.baseUnit);
    setIndexStatus(meta.indexStatus);

    // Populate form
    setFormObjectType(rule.objectType);
    setFormFieldName(rule.fieldName);
    setFormPropertyCode(rule.propertyCode);
    setFormFieldType(rule.fieldType);
    setFormWeight(rule.weight);
    setFormMatchType(rule.matchType);
    setFormNullHandling(rule.nullHandling || '候选缺失按 0 分');
    
    setFormIsScoreActive(rule.isScoreActive);
    setFormIsFilterCondition(rule.isFilterCondition);
    setFormHitReasonTemplate(rule.hitReasonTemplate || '字段比对，源值「{source_val}」与候选值「{target_val}」通过 {match}，得分 {score}');
    setFormDiffFieldsTemplate(rule.diffFieldsTemplate || '物理差异：源「{source_val}」与候选「{target_val}」不一致');

    // Default dynamic mock states
    if (rule.fieldType.includes('NUMBER')) {
      setFormDisplayUnit('mm');
      setParamNumToleranceVal(0.2);
      setExampleRefVal('50.0');
      setExampleCandVal('50.1');
    } else {
      setExampleRefVal('SUS304');
      setExampleCandVal('SUS304');
    }
  };

  // Handle New Click
  const handleNew = () => {
    setEditingRule(null);
    setIsNew(true);

    // Clear form to allow first picking
    setFormObjectType('PART_MECHANICAL');
    setFormFieldName('');
    setFormPropertyCode('');
    setFormFieldType('');
    setFormWeight(10);
    setFormMatchType('精确值匹配');
    setFormNullHandling('候选缺失按 0 分');
    setManticoreType('--');
    setEnumOrCategorySource('--');
    setUnitFamily('--');
    setBaseUnit('--');
    setIndexStatus('--');
    
    setFormIsScoreActive(true);
    setFormIsFilterCondition(false);
    setFormHitReasonTemplate('字段比对，源值「{source_val}」与候选值「{target_val}」通过 {match}，得分 {score}');
    setFormDiffFieldsTemplate('物理差异：源「{source_val}」与候选「{target_val}」不一致');

    // Trigger modal immediately to keep flow smooth
    setShowFieldSelector(true);
  };

  // Selection from Stage 1 Mapped Fields
  const handleSelectFieldFromStage1 = (f: typeof STAGE_1_FIELDS[0]) => {
    setFormFieldName(f.fieldName);
    setFormPropertyCode(f.propertyCode);
    setFormFieldType(f.fieldType);
    setManticoreType(f.manticoreType);
    setEnumOrCategorySource(f.source);
    setUnitFamily(f.unitFamily);
    setBaseUnit(f.baseUnit);
    setIndexStatus(f.indexStatus);

    // Set matching method defaults based on field type
    if (f.fieldType.includes('NUMBER')) {
      setFormMatchType('数值容差匹配');
      setFormDisplayUnit('mm');
      setExampleRefVal('50.0');
      setExampleCandVal('50.1');
    } else if (f.fieldType.includes('TEXT')) {
      setFormMatchType('文本相似匹配 (非 AI)');
      setExampleRefVal('六角法兰面螺栓');
      setExampleCandVal('内六角法兰面螺栓');
    } else if (f.fieldType.includes('CLASS_TREE')) {
      setFormMatchType('层级关系匹配');
      setExampleRefVal('/紧固件/螺栓');
      setExampleCandVal('/紧固件/螺栓/内六角螺栓');
    } else {
      setFormMatchType('精确值匹配');
      setExampleRefVal('SUS304');
      setExampleCandVal('Q235');
    }

    setShowFieldSelector(false);
  };

  // Handle Delete
  const handleDelete = (id: string) => {
    if (window.confirm(`确定要删除规则 ${id} 吗？`)) {
      onUpdateRules(rules.filter(r => r.id !== id));
    }
  };

  // Save form
  const handleSaveForm = (asDraft: boolean) => {
    if (!formFieldName || !formPropertyCode) {
      alert('请先从一阶段映射列表中选择字段！');
      return;
    }

    // Constraints Validation: At least one score active or filter condition must be set
    if (!formIsScoreActive && !formIsFilterCondition) {
      alert('【校验提示】字段配置必须至少开启“参与相似度评分”或“作为候选强过滤条件”之一！');
      return;
    }

    // Check unknown templates
    const hitReasonInvalid = getInvalidVariables(formHitReasonTemplate);
    const diffFieldsInvalid = getInvalidVariables(formDiffFieldsTemplate);

    if (hitReasonInvalid.length > 0) {
      alert(`【命中原因解释文字模板】存在未知变量: ${hitReasonInvalid.join(', ')}。请使用系统预置合法的模板变量！`);
      return;
    }
    if (diffFieldsInvalid.length > 0) {
      alert(`【物理差异标注文字模板】存在未知变量: ${diffFieldsInvalid.join(', ')}。请使用系统预置合法的模板变量！`);
      return;
    }

    const updated: FieldSimilarityRule = {
      id: isNew ? `F-00${rules.length + 1}` : (editingRule?.id || 'F-TMP'),
      objectType: formObjectType,
      fieldName: formFieldName,
      propertyCode: formPropertyCode,
      fieldType: formFieldType,
      weight: formIsScoreActive ? Number(formWeight) : 0,
      matchType: formMatchType,
      nullHandling: formNullHandling,
      
      // Hidden properties default / fallback for old types integration
      standardizationRuleSet: '无',
      synonymRuleSet: '无',
      categoryAlignmentStrategy: '无',
      isScoreActive: formIsScoreActive,
      isFilterCondition: formIsFilterCondition,
      isQueryPreviewAvailable: true,
      isAppEndActive: true,
      showHitReason: true,
      showDiffFields: true,
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

    setIsNew(false);
    setEditingRule(null);
  };

  // Dynamic Matching Calculations for Instant Previews in the configuration panel
  const computedInstantScore = useMemo(() => {
    if (formMatchType === '精确值匹配') {
      return exampleRefVal === exampleCandVal ? 100 : 0;
    }

    if (formMatchType === '文本相似匹配 (非 AI)') {
      // Simulate simple TF-IDF character overlap for the high fidelity mock
      if (!exampleRefVal || !exampleCandVal) return 0;
      const refChars = new Set(exampleRefVal.split(''));
      const candChars = exampleCandVal.split('');
      const overlap = candChars.filter(c => refChars.has(c)).length;
      const sim = Math.round((overlap / Math.max(exampleRefVal.length, exampleCandVal.length)) * 100);
      return sim >= paramMinTextThreshold ? sim : 0;
    }

    if (formMatchType === '数值容差匹配') {
      const ref = parseFloat(exampleRefVal);
      const cand = parseFloat(exampleCandVal);
      if (isNaN(ref) || isNaN(cand)) return 0;
      
      const diff = Math.abs(ref - cand);
      let limit = paramNumToleranceVal;
      if (paramNumToleranceType === 'PERCENTAGE') {
        limit = (ref * paramNumToleranceVal) / 100;
      }

      // Direction check
      if (paramNumToleranceDirection === 'HIGHER' && cand < ref) return 0;
      if (paramNumToleranceDirection === 'LOWER' && cand > ref) return 0;

      return diff <= limit ? 100 : 0;
    }

    if (formMatchType === '数值距离衰减') {
      const ref = parseFloat(exampleRefVal);
      const cand = parseFloat(exampleCandVal);
      if (isNaN(ref) || isNaN(cand)) return 0;

      const diff = Math.abs(ref - cand);
      if (diff <= paramDecayFullScore) return 100;
      if (diff >= paramDecayZeroBoundary) return 0;

      // Linear decay calculation
      const score = 100 * (1 - (diff - paramDecayFullScore) / (paramDecayZeroBoundary - paramDecayFullScore));
      return Math.round(Math.max(0, Math.min(100, score)));
    }

    if (formMatchType === '日期容差匹配') {
      // Default to 100 for dummy view if date diff within range
      return 100;
    }

    if (formMatchType === '层级关系匹配') {
      return 90;
    }

    return 100;
  }, [
    formMatchType, exampleRefVal, exampleCandVal, 
    paramMinTextThreshold, paramNumToleranceType, paramNumToleranceVal, paramNumToleranceDirection,
    paramDecayFullScore, paramDecayZeroBoundary, paramDecayDirection
  ]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 font-sans">
      
      {/* Platform Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0 flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2 text-xs text-slate-500 mb-1">
            <span>相似度配置</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-800 font-medium">二阶段：字段属性相似度</span>
          </div>
          <h1 className="text-lg font-bold text-slate-900">
            {isNew ? '新建字段相似度规则' : editingRule ? '编辑字段相似度规则' : '字段相似度规则管理（二阶段）'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            配置 Manticore 二阶段精确物理属性对比规则，由系统计算各字段匹配比重得分，自动形成命中原理解释与物理差异标注。
          </p>
        </div>

        {/* Global Action controls */}
        {!editingRule && !isNew ? (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                alert('已保存当前修改至本地草稿。');
              }}
              className="flex items-center space-x-1.5 px-3 py-1.5 border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 rounded text-xs font-semibold transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>保存草稿</span>
            </button>
            <button
              onClick={onPublish}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded text-xs font-semibold shadow-xs transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>发布配置到检索集群</span>
            </button>
            <button
              onClick={handleNew}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-slate-900 text-white hover:bg-slate-800 rounded text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>添加字段规则</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => { setEditingRule(null); setIsNew(false); }}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 rounded text-xs font-semibold transition-colors"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>返回规则列表</span>
            </button>
            <button
              onClick={() => handleSaveForm(true)}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded text-xs font-semibold transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>保存草稿</span>
            </button>
            <button
              onClick={() => handleSaveForm(false)}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded text-xs font-semibold shadow-xs transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>确定并提交</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Container */}
      {!(editingRule || isNew) ? (
        // LIST VIEW FRAME
        <div className="flex-1 flex flex-col overflow-hidden">
          
          {/* Top Info metrics */}
          <div className="px-6 pt-4 shrink-0 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-lg p-3 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-[11px] text-slate-400 block font-semibold">机械零件 (PART_MECHANICAL) 评分权重和</span>
                <div className="flex items-baseline space-x-1.5 mt-1">
                  <span className={`text-xl font-bold font-mono ${weightSummary.mechTotal === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {weightSummary.mechTotal}%
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {weightSummary.mechTotal === 100 ? '已配平(100%满分)' : '未配平，各算分项权重之和须等于100%'}
                  </span>
                </div>
              </div>
              <div className="p-1.5 bg-slate-50 rounded text-slate-500">
                <SlidersHorizontal className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-3 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-[11px] text-slate-400 block font-semibold">待发布草稿变更</span>
                <div className="flex items-baseline space-x-1.5 mt-1">
                  <span className="text-xl font-bold text-amber-600 font-mono">2</span>
                  <span className="text-[10px] text-slate-500">材质及长度物理差异模板已做修改</span>
                </div>
              </div>
              <div className="p-1.5 bg-amber-50 rounded text-amber-600">
                <AlertCircle className="w-4 h-4 animate-pulse" />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-3 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-[11px] text-slate-400 block font-semibold">Manticore 端生效配置</span>
                <div className="flex items-baseline space-x-1.5 mt-1">
                  <span className="text-xl font-bold text-slate-800 font-mono">v2.4.0</span>
                  <span className="text-[10px] text-slate-500">2026-07-02 全量同步</span>
                </div>
              </div>
              <div className="p-1.5 bg-emerald-50 rounded text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
          </div>

          <div className="px-6 pt-3 shrink-0">
            <div className="bg-slate-100/80 border border-slate-200/80 rounded px-3 py-1.5 text-xs text-slate-600 flex items-center justify-between">
              <span className="font-semibold text-slate-700 shrink-0">当前评分公式 (仅限启用的评分字段):</span>
              <span className="font-mono text-slate-500 truncate max-w-2xl px-2">{weightSummary.mechDetails}</span>
              <span className="text-slate-400 text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded font-mono">
                Formula Engine
              </span>
            </div>
          </div>

          {/* Table Search Filter row */}
          <div className="px-6 py-3 shrink-0 flex flex-wrap items-center gap-3">
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索字段名称 / 物理编码 / 修改人"
                className="w-full pl-8 pr-3 py-1 bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:outline-hidden font-medium text-slate-700"
              />
            </div>

            <div className="flex items-center space-x-1.5 text-xs">
              <span className="text-slate-500">适用物料:</span>
              <select
                value={filterObjectType}
                onChange={(e) => setFilterObjectType(e.target.value)}
                className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs text-slate-700 font-medium"
              >
                <option value="ALL">全部</option>
                <option value="PART_MECHANICAL">机械零件</option>
                <option value="PART_ELECTRICAL">电气元器件</option>
              </select>
            </div>

            <div className="flex items-center space-x-1.5 text-xs">
              <span className="text-slate-500">评分项:</span>
              <select
                value={filterScore}
                onChange={(e) => setFilterScore(e.target.value)}
                className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs text-slate-700 font-medium"
              >
                <option value="ALL">全部</option>
                <option value="TRUE">是</option>
                <option value="FALSE">否</option>
              </select>
            </div>

            <div className="flex items-center space-x-1.5 text-xs">
              <span className="text-slate-500">强过滤:</span>
              <select
                value={filterFilter}
                onChange={(e) => setFilterFilter(e.target.value)}
                className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs text-slate-700 font-medium"
              >
                <option value="ALL">全部</option>
                <option value="TRUE">是</option>
                <option value="FALSE">否</option>
              </select>
            </div>

            {/* Clear Filters */}
            {(keyword !== '' || filterObjectType !== 'ALL' || filterScore !== 'ALL' || filterFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setKeyword('');
                  setFilterObjectType('ALL');
                  setFilterScore('ALL');
                  setFilterFilter('ALL');
                }}
                className="text-xs text-blue-600 hover:text-blue-800 underline font-medium"
              >
                清空过滤
              </button>
            )}
          </div>

          {/* Rules Table */}
          <div className="flex-1 overflow-auto px-6 pb-6">
            <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold font-sans">
                    <th className="px-4 py-2.5 border-r border-slate-200">适用物料类型</th>
                    <th className="px-4 py-2.5 border-r border-slate-200">字段显示名称</th>
                    <th className="px-4 py-2.5 border-r border-slate-200">物理属性编码</th>
                    <th className="px-4 py-2.5 border-r border-slate-200">字段数据类型</th>
                    <th className="px-3 py-2.5 border-r border-slate-200 text-center" style={{ width: '100px' }}>评分权重 (%)</th>
                    <th className="px-4 py-2.5 border-r border-slate-200">物理匹配算法方式</th>
                    <th className="px-4 py-2.5 border-r border-slate-200">缺失空值处理策略</th>
                    <th className="px-3 py-2.5 border-r border-slate-200 text-center" style={{ width: '80px' }}>评分</th>
                    <th className="px-3 py-2.5 border-r border-slate-200 text-center" style={{ width: '80px' }}>强过滤</th>
                    <th className="px-4 py-2.5 border-r border-slate-200" style={{ maxWidth: '220px' }}>命中描述模板 (占位符)</th>
                    <th className="px-3 py-2.5 border-r border-slate-200 text-center">状态</th>
                    <th className="px-3 py-2.5 border-r border-slate-200">最后编辑时间</th>
                    <th className="px-4 py-2.5 text-center">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150">
                  {filteredRules.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-2.5 border-r border-slate-200 whitespace-nowrap">
                        {r.objectType === 'PART_MECHANICAL' ? (
                          <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium border border-blue-100 text-[10px]">机械零件</span>
                        ) : r.objectType === 'PART_ELECTRICAL' ? (
                          <span className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-medium border border-purple-100 text-[10px]">电气元器件</span>
                        ) : (
                          <span className="bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded font-medium border border-slate-150 text-[10px]">全局/通用</span>
                        )}
                      </td>
                      
                      <td className="px-4 py-2.5 border-r border-slate-200 font-bold text-slate-800 whitespace-nowrap">
                        {r.fieldName}
                      </td>

                      <td className="px-4 py-2.5 border-r border-slate-200 font-mono font-bold text-slate-700 whitespace-nowrap">
                        {r.propertyCode}
                      </td>

                      <td className="px-4 py-2.5 border-r border-slate-200 text-slate-500 whitespace-nowrap">
                        {r.fieldType}
                      </td>

                      <td className="px-3 py-2.5 border-r border-slate-200 text-center font-mono font-bold text-slate-800">
                        {r.isScoreActive ? `${r.weight}%` : '--'}
                      </td>

                      <td className="px-4 py-2.5 border-r border-slate-200 font-semibold text-slate-700 whitespace-nowrap">
                        {r.matchType}
                      </td>

                      <td className="px-4 py-2.5 border-r border-slate-200 text-slate-600">
                        {r.nullHandling || '候选缺失按 0 分'}
                      </td>

                      <td className="px-3 py-2.5 border-r border-slate-200 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${r.isScoreActive ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-400'}`}>
                          {r.isScoreActive ? '是' : '否'}
                        </span>
                      </td>

                      <td className="px-3 py-2.5 border-r border-slate-200 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${r.isFilterCondition ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-slate-100 text-slate-400'}`}>
                          {r.isFilterCondition ? '是' : '否'}
                        </span>
                      </td>

                      <td className="px-4 py-2.5 border-r border-slate-200 text-slate-500 max-w-xs truncate" title={r.hitReasonTemplate}>
                        {r.hitReasonTemplate || <span className="text-slate-300 italic">未配置</span>}
                      </td>

                      <td className="px-3 py-2.5 border-r border-slate-200 text-center whitespace-nowrap">
                        {r.status === 'PUBLISHED' ? (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-bold">已发布</span>
                        ) : (
                          <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded font-bold">变更草稿</span>
                        )}
                      </td>

                      <td className="px-3 py-2.5 border-r border-slate-200 font-mono text-slate-500 whitespace-nowrap">
                        {r.lastEditTime}
                      </td>

                      <td className="px-4 py-2.5 text-center">
                        <div className="flex items-center justify-center space-x-2">
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

          {/* UCD Specification footer */}
          <div className="mx-6 mb-6 p-4 bg-slate-100 border border-slate-200 rounded-lg">
            <span className="text-xs font-bold text-slate-700 block mb-1">📐 设计/评审说明 (UCD Specification)</span>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              本页面展示的是 PLM 物料库二阶段物理属性相似度计算的底层逻辑配置。本评审版通过整合二阶段的“白名单字段”与“相似度评分规则”，删除了无关的高级处理。
              注意：本标记与评审说明在真实生产环境打包时，将移动至 Figma 注释，不会呈现在最终业务产品中。
            </p>
          </div>
        </div>
      ) : (
        // FORM EDITOR VIEW
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
            
            {/* Header */}
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  {isNew ? '创建字段相似度配置规则' : `正在修改规则: [${editingRule?.id}] ${formFieldName}`}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">配置字段级比对物理算法和展示模板，Manticore 根据其自动进行相似度打分计算。</p>
              </div>
              <span className="text-[10px] font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200 font-bold">
                二阶段原子规则配置
              </span>
            </div>

            {/* Form body */}
            <div className="p-6 space-y-6 text-xs">
              
              {/* BLOCK 1: Field Metadata */}
              <div className="border border-slate-200 rounded-lg p-4 space-y-4 bg-slate-50/40">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                    <span className="w-1 h-3.5 bg-blue-600 rounded"></span>
                    <span>1. 一阶段对齐元数据 (只读回填)</span>
                  </span>
                  
                  {isNew && (
                    <button
                      type="button"
                      onClick={() => setShowFieldSelector(true)}
                      className="flex items-center space-x-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded text-[11px] font-bold transition-all"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span>从已对齐字段目录中选择...</span>
                    </button>
                  )}
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-slate-500 mb-1 font-semibold">适用物料类型</label>
                    <select
                      value={formObjectType}
                      onChange={(e) => setFormObjectType(e.target.value as ObjectType)}
                      className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs font-semibold focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="PART_MECHANICAL">机械零件</option>
                      <option value="PART_ELECTRICAL">电气元器件</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-500 mb-1 font-semibold">字段中文显示名</label>
                    <input
                      type="text"
                      value={formFieldName}
                      readOnly
                      placeholder="请选择一阶段映射字段"
                      className="w-full bg-slate-100/80 border border-slate-300 rounded p-1.5 text-xs font-bold text-slate-800 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 mb-1 font-semibold">属性物理编码 (Manticore)</label>
                    <input
                      type="text"
                      value={formPropertyCode}
                      readOnly
                      placeholder="自动带入"
                      className="w-full bg-slate-100/80 border border-slate-300 rounded p-1.5 text-xs font-mono font-bold text-slate-700 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 mb-1 font-semibold">字段物理数据类型</label>
                    <input
                      type="text"
                      value={formFieldType || ''}
                      readOnly
                      placeholder="自动带入"
                      className="w-full bg-slate-100/80 border border-slate-300 rounded p-1.5 text-xs font-semibold text-slate-600 cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Additional Readonly meta */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-2 text-[10px] text-slate-500 border-t border-slate-150">
                  <div><strong>Manticore数据类型:</strong> <span className="font-mono text-slate-700">{manticoreType}</span></div>
                  <div><strong>数据字典/分类源:</strong> <span className="text-slate-700">{enumOrCategorySource}</span></div>
                  <div><strong>单位族:</strong> <span className="text-slate-700">{unitFamily}</span></div>
                  <div><strong>默认基准单位:</strong> <span className="font-mono text-slate-700">{baseUnit}</span></div>
                  <div><strong>二阶段索引状态:</strong> <span className="bg-emerald-50 text-emerald-800 px-1 py-0.5 rounded font-bold border border-emerald-100">{indexStatus}</span></div>
                </div>
              </div>

              {/* BLOCK 2: Scoring parameters */}
              <div className="border border-slate-200 rounded-lg p-4 space-y-4">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block border-b border-slate-200 pb-2 flex items-center space-x-1.5">
                  <span className="w-1 h-3.5 bg-blue-600 rounded"></span>
                  <span>2. 相似度算分与物理比对算法规则</span>
                </span>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Score Switch and Filter switch */}
                  <div className="col-span-1 space-y-3 bg-slate-50 p-3 rounded border border-slate-200">
                    <span className="font-semibold text-slate-700 block mb-1">二阶段核心流向控制</span>
                    
                    <label className="flex items-start space-x-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formIsScoreActive}
                        onChange={(e) => setFormIsScoreActive(e.target.checked)}
                        className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                      <div>
                        <span className="font-bold text-slate-800 block">参与相似度评分 (Score Active)</span>
                        <span className="text-[10px] text-slate-400">若开启，此字段的比对得分将乘以权重计入总分</span>
                      </div>
                    </label>

                    <label className="flex items-start space-x-2.5 cursor-pointer pt-2 border-t border-slate-200">
                      <input
                        type="checkbox"
                        checked={formIsFilterCondition}
                        onChange={(e) => setFormIsFilterCondition(e.target.checked)}
                        className="mt-0.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500 w-4 h-4"
                      />
                      <div>
                        <span className="font-bold text-slate-800 block">候选强过滤条件 (Hard Filter)</span>
                        <span className="text-[10px] text-slate-400">若不匹配则直接否决，不在推荐列表呈现</span>
                      </div>
                    </label>
                  </div>

                  {/* Weight Input (If score active) */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">计算权重占比 (%)</label>
                    <div className="space-y-1.5">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={formIsScoreActive ? formWeight : 0}
                        disabled={!formIsScoreActive}
                        onChange={(e) => setFormWeight(Number(e.target.value))}
                        className={`w-full border border-slate-300 rounded p-1.5 font-mono font-bold text-xs focus:ring-1 focus:ring-blue-500 ${!formIsScoreActive ? 'bg-slate-100/80 text-slate-400 cursor-not-allowed' : 'bg-white text-slate-800'}`}
                      />
                      <span className="text-[10px] text-slate-400 block leading-normal">
                        机械零件默认权重：规格 35%、材质 25%、标称直径 15%、分类路径 15%、螺距 10%
                      </span>
                    </div>
                  </div>

                  {/* Null Value treatment */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">缺失空值比对处理策略</label>
                    <select
                      value={formNullHandling}
                      onChange={(e) => setFormNullHandling(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs font-semibold focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="候选缺失按 0 分">候选缺失按 0 分（默认）</option>
                      <option value="跳过缺失字段并重算权重">跳过缺失字段并重算权重</option>
                    </select>
                    <p className="text-[10px] text-slate-400 mt-1.5">二阶段不推荐使用固定扣减或阻断，应通过一阶段清洗保障属性高保真度。</p>
                  </div>
                </div>

                {/* Display Unit and Scale Configuration for帶單位數值 (NUMBER) fields */}
                {formFieldType.includes('NUMBER') && (
                  <div className="bg-amber-50/50 border border-amber-200 rounded p-3.5 space-y-3">
                    <div className="flex items-center space-x-2">
                      <SlidersHorizontal className="w-4 h-4 text-amber-600" />
                      <span className="font-bold text-amber-900">5.4 带单位数值物理换算</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <span className="block text-slate-500 mb-0.5">基准单位 (只读)</span>
                        <span className="font-mono font-bold text-slate-800 bg-white border border-slate-200 px-2 py-1 rounded block">{baseUnit}</span>
                      </div>
                      <div>
                        <span className="block text-slate-500 mb-0.5">业务展示单位</span>
                        <select
                          value={formDisplayUnit}
                          onChange={(e) => setFormDisplayUnit(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded p-1 text-xs font-semibold font-mono"
                        >
                          <option value="m">m (米)</option>
                          <option value="cm">cm (厘米)</option>
                          <option value="mm">mm (毫米)</option>
                        </select>
                      </div>
                      <div className="flex flex-col justify-center">
                        <span className="text-[10px] text-slate-500 leading-normal">
                          换算说明：索引与评分统一换算为基准单位 <strong className="font-mono text-slate-700">{baseUnit}</strong>，页面填写和展示按 <strong className="font-mono text-slate-700">{formDisplayUnit}</strong> 进行。
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Match Type Details based on field type */}
                <div className="border border-slate-200 rounded-lg overflow-hidden mt-4">
                  <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                      <span className="font-bold text-slate-800">匹配算法与参数配置 (6.1 - 6.6)</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">Dynamic Parameters Panel</span>
                  </div>

                  <div className="p-4 bg-white space-y-4">
                    <div className="w-full md:w-1/2">
                      <label className="block font-semibold text-slate-700 mb-1">选择匹配算法方式</label>
                      <select
                        value={formMatchType}
                        onChange={(e) => setFormMatchType(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs font-semibold focus:ring-1 focus:ring-blue-500 text-blue-700"
                      >
                        {formFieldType.includes('TEXT') && (
                          <>
                            <option value="精确值匹配">精确值匹配 (Exact Match)</option>
                            <option value="文本相似匹配 (非 AI)">文本相似匹配 (非 AI)</option>
                          </>
                        )}
                        {formFieldType.includes('NUMBER') && (
                          <>
                            <option value="精确值匹配">精确值匹配 (Exact Match)</option>
                            <option value="数值容差匹配">数值容差匹配</option>
                            <option value="数值距离衰减">数值距离衰减</option>
                          </>
                        )}
                        {formFieldType.includes('CLASS_TREE') && (
                          <>
                            <option value="精确值匹配">精确值匹配 (Exact Match)</option>
                            <option value="层级关系匹配">层级关系匹配</option>
                          </>
                        )}
                        {formFieldType.includes('ENUM') && (
                          <option value="精确值匹配">精确值匹配 (Exact Match)</option>
                        )}
                        {!formFieldType && (
                          <option value="精确值匹配">精确值匹配 (Exact Match)</option>
                        )}
                      </select>
                    </div>

                    {/* DYNAMIC PARAMETER BLOCKS */}
                    
                    {/* 6.1 精确匹配 */}
                    {formMatchType === '精确值匹配' && (
                      <div className="bg-slate-50 p-3 rounded border border-slate-200 text-slate-600 leading-relaxed">
                        <span className="font-bold text-slate-800 block mb-1">精确匹配机制</span>
                        <p className="text-[10px]">算法逻辑：只有源参考值与候选属性的归一清洗值完全一致时（区分大小写和首尾空格，系统已自动剔除冗余修饰），得满分；任何不一致均得 0 分。</p>
                      </div>
                    )}

                    {/* 6.2 文本相似匹配 (非 AI) */}
                    {formMatchType === '文本相似匹配 (非 AI)' && (
                      <div className="bg-slate-50 p-3.5 rounded border border-slate-200 space-y-3">
                        <span className="font-bold text-slate-800 block">文本相似匹配参数 (非 AI 检索算法)</span>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-slate-600 mb-1 font-semibold">最低文本匹配阈值 (0 - 100)</label>
                            <div className="flex items-center space-x-2">
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={paramMinTextThreshold}
                                onChange={(e) => setParamMinTextThreshold(Number(e.target.value))}
                                className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                              />
                              <span className="font-mono font-bold text-slate-800 text-xs shrink-0 w-12 text-center bg-white px-2 py-0.5 border border-slate-200 rounded">{paramMinTextThreshold}%</span>
                            </div>
                            <span className="text-[10px] text-slate-400 block mt-1">低于此阈值直接判定不命中，该字段得 0 分。</span>
                          </div>

                          <div className="flex items-center">
                            <span className="text-[10px] text-slate-500 bg-white p-2 border border-slate-200 rounded leading-relaxed">
                              💡 <strong>算法提示：</strong> 依靠 Manticore 内置的经典权重分析词条进行字符集重叠度交叉计算，保证在不依赖大算力模型的前提下实现亚毫秒级精密物理检索。
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 6.3 数值容差匹配 */}
                    {formMatchType === '数值容差匹配' && (
                      <div className="bg-slate-50 p-3.5 rounded border border-slate-200 space-y-3">
                        <span className="font-bold text-slate-800 block">数值容差物理参数</span>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <span className="block text-slate-600 mb-1 font-semibold">容差方式</span>
                            <div className="grid grid-cols-2 bg-slate-200 p-0.5 rounded-md text-center font-bold">
                              <button
                                type="button"
                                onClick={() => setParamNumToleranceType('ABSOLUTE')}
                                className={`py-1 text-[10px] rounded ${paramNumToleranceType === 'ABSOLUTE' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500'}`}
                              >
                                绝对值
                              </button>
                              <button
                                type="button"
                                onClick={() => setParamNumToleranceType('PERCENTAGE')}
                                className={`py-1 text-[10px] rounded ${paramNumToleranceType === 'PERCENTAGE' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500'}`}
                              >
                                百分比 (%)
                              </button>
                            </div>
                          </div>

                          <div>
                            <span className="block text-slate-600 mb-1 font-semibold">容差值</span>
                            <div className="flex items-center space-x-1.5">
                              <input
                                type="number"
                                step="0.1"
                                value={paramNumToleranceVal}
                                onChange={(e) => setParamNumToleranceVal(Number(e.target.value))}
                                className="w-full bg-white border border-slate-300 rounded p-1 font-mono font-bold text-xs"
                              />
                              <span className="font-mono text-slate-500 text-[10px] font-semibold">{paramNumToleranceType === 'PERCENTAGE' ? '%' : formDisplayUnit}</span>
                            </div>
                            <span className="text-[9px] text-slate-400 mt-1 block">
                              等价于基准单位：
                              <span className="font-mono font-semibold text-slate-600">
                                {paramNumToleranceType === 'PERCENTAGE' 
                                  ? `${paramNumToleranceVal}%` 
                                  : `${(formDisplayUnit === 'mm' ? paramNumToleranceVal/1000 : formDisplayUnit === 'cm' ? paramNumToleranceVal/100 : paramNumToleranceVal).toFixed(6)} m`
                                }
                              </span>
                            </span>
                          </div>

                          <div>
                            <span className="block text-slate-600 mb-1 font-semibold">允许数值偏差方向</span>
                            <select
                              value={paramNumToleranceDirection}
                              onChange={(e) => setParamNumToleranceDirection(e.target.value as any)}
                              className="w-full bg-white border border-slate-300 rounded p-1.5 font-semibold text-slate-700 text-xs"
                            >
                              <option value="BOTH">双向偏差 (±)</option>
                              <option value="HIGHER">仅允许高于参考值</option>
                              <option value="LOWER">仅允许低于参考值</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 6.4 数值距离衰减 */}
                    {formMatchType === '数值距离衰减' && (
                      <div className="bg-slate-50 p-3.5 rounded border border-slate-200 space-y-3">
                        <span className="font-bold text-slate-800 block">二阶段数值线性距离衰减 (固定使用线性衰减)</span>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <span className="block text-slate-600 mb-1 font-semibold">满分范围 (得分=100)</span>
                            <div className="flex items-center space-x-1.5">
                              <input
                                type="number"
                                step="0.05"
                                value={paramDecayFullScore}
                                onChange={(e) => setParamDecayFullScore(Number(e.target.value))}
                                className="w-full bg-white border border-slate-300 p-1 rounded font-mono font-bold text-xs"
                              />
                              <span className="font-mono text-[10px]">{formDisplayUnit}</span>
                            </div>
                          </div>

                          <div>
                            <span className="block text-slate-600 mb-1 font-semibold">零分边界 (超出则得分=0)</span>
                            <div className="flex items-center space-x-1.5">
                              <input
                                type="number"
                                step="0.1"
                                value={paramDecayZeroBoundary}
                                onChange={(e) => setParamDecayZeroBoundary(Number(e.target.value))}
                                className="w-full bg-white border border-slate-300 p-1 rounded font-mono font-bold text-xs"
                              />
                              <span className="font-mono text-[10px]">{formDisplayUnit}</span>
                            </div>
                          </div>

                          <div>
                            <span className="block text-slate-600 mb-1 font-semibold">偏差衰减方向</span>
                            <select
                              value={paramDecayDirection}
                              onChange={(e) => setParamDecayDirection(e.target.value as any)}
                              className="w-full bg-white border border-slate-300 p-1 text-xs font-semibold text-slate-700"
                            >
                              <option value="BOTH">双向衰减 (±)</option>
                              <option value="HIGHER">仅允许高于参考值</option>
                              <option value="LOWER">仅允许低于参考值</option>
                            </select>
                          </div>
                        </div>

                        {/* Line chart mockup for linear decay */}
                        <div className="border border-slate-200/80 rounded bg-white p-2 text-[10px] text-slate-500">
                          <span className="font-semibold text-slate-600 block mb-1">📉 线性评分衰减机制示意：</span>
                          <div className="flex items-center space-x-3 font-mono">
                            <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">相差 &lt;= {paramDecayFullScore} {formDisplayUnit} 得 100分</span>
                            <span className="text-slate-400">→</span>
                            <span className="text-slate-600">按公式线性退让扣分</span>
                            <span className="text-slate-400">→</span>
                            <span className="bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded font-bold">相差 &gt;= {paramDecayZeroBoundary} {formDisplayUnit} 得 0分</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 6.5 日期容差匹配 */}
                    {formMatchType === '日期容差匹配' && (
                      <div className="bg-slate-50 p-3.5 rounded border border-slate-200 space-y-3">
                        <span className="font-bold text-slate-800 block">日期容差偏差参数</span>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <span className="block text-slate-600 mb-1 font-semibold">容差值</span>
                            <div className="flex items-center space-x-1.5">
                              <input
                                type="number"
                                value={paramDateToleranceVal}
                                onChange={(e) => setParamDateToleranceVal(Number(e.target.value))}
                                className="w-full bg-white border border-slate-300 p-1 rounded font-mono font-bold text-xs"
                              />
                              <select
                                value={paramDateToleranceUnit}
                                onChange={(e) => setParamDateToleranceUnit(e.target.value as any)}
                                className="bg-white border border-slate-300 rounded text-xs py-0.5"
                              >
                                <option value="DAY">天</option>
                                <option value="HOUR">小时</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <span className="block text-slate-600 mb-1 font-semibold">允许方向</span>
                            <select
                              value={paramDateToleranceDirection}
                              onChange={(e) => setParamDateToleranceDirection(e.target.value as any)}
                              className="w-full bg-white border border-slate-300 p-1 text-xs"
                            >
                              <option value="BOTH">双向 (±)</option>
                              <option value="HIGHER">仅晚于参考时间</option>
                              <option value="LOWER">仅早于参考时间</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 6.6 层级关系匹配 */}
                    {formMatchType === '层级关系匹配' && (
                      <div className="bg-slate-50 p-3.5 rounded border border-slate-200 space-y-3">
                        <span className="font-bold text-slate-800 block">分类深度折扣参数</span>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <span className="block text-slate-600 mb-1 font-semibold">最大允许层级差</span>
                            <input
                              type="number"
                              value={paramHierarchyMaxDiff}
                              onChange={(e) => setParamHierarchyMaxDiff(Number(e.target.value))}
                              className="w-full bg-white border border-slate-300 p-1 rounded font-mono font-bold text-xs"
                            />
                          </div>

                          <div>
                            <span className="block text-slate-600 mb-1 font-semibold">关系硬性限定</span>
                            <select
                              value={paramHierarchyRequirement}
                              onChange={(e) => setParamHierarchyRequirement(e.target.value as any)}
                              className="w-full bg-white border border-slate-300 p-1 text-xs"
                            >
                              <option value="PARENT_CHILD">仅允许父子层级关系</option>
                              <option value="ANCESTOR_DESCENDANT">允许祖先后代任意跨度</option>
                            </select>
                          </div>

                          <div>
                            <span className="block text-slate-600 mb-1 font-semibold">每级惩罚扣减分</span>
                            <input
                              type="number"
                              value={paramHierarchyDeduction}
                              onChange={(e) => setParamHierarchyDeduction(Number(e.target.value))}
                              className="w-full bg-white border border-slate-300 p-1 rounded font-mono text-xs font-bold"
                            />
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-400">💡 <strong>温馨提示：</strong> 此算法只处理 PLM 自带的物理分类。不涉及跨系统的分类归一策略。</p>
                      </div>
                    )}

                    {/* INTERACTIVE INSTANT EXAMPLE GAUGE (即时示例) */}
                    {formFieldName && (
                      <div className="mt-4 border border-blue-200 rounded-lg p-3.5 bg-blue-50/50 space-y-3 animate-fadeIn">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-blue-900 flex items-center">
                            <Info className="w-4 h-4 mr-1.5 text-blue-600" />
                            <span>二阶段匹配即时示例计算 (Instant Simulator)</span>
                          </span>
                          <span className="text-[10px] font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold border border-blue-200">
                            算法仿真测试
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-slate-600 mb-1 font-semibold">
                              源物理参考值 {formFieldType.includes('NUMBER') && `(${formDisplayUnit})`}
                            </label>
                            <input
                              type="text"
                              value={exampleRefVal}
                              onChange={(e) => setExampleRefVal(e.target.value)}
                              className="w-full bg-white border border-slate-300 rounded p-1 font-mono font-bold text-xs"
                            />
                          </div>

                          <div>
                            <label className="block text-slate-600 mb-1 font-semibold">
                              目标候选对齐值 {formFieldType.includes('NUMBER') && `(${formDisplayUnit})`}
                            </label>
                            <input
                              type="text"
                              value={exampleCandVal}
                              onChange={(e) => setExampleCandVal(e.target.value)}
                              className="w-full bg-white border border-slate-300 rounded p-1 font-mono font-bold text-xs"
                            />
                          </div>

                          {/* Calculated Diff display */}
                          <div className="flex flex-col justify-end p-1">
                            <span className="text-[10px] text-slate-400 block font-semibold">计算所得差值:</span>
                            <span className="font-mono font-bold text-slate-700 text-xs">
                              {formFieldType.includes('NUMBER') ? (
                                isNaN(parseFloat(exampleRefVal)) || isNaN(parseFloat(exampleCandVal)) ? '无效数值' : `${Math.abs(parseFloat(exampleRefVal) - parseFloat(exampleCandVal)).toFixed(3)} ${formDisplayUnit}`
                              ) : (
                                exampleRefVal === exampleCandVal ? '一致 (无偏差)' : '不一致'
                              )}
                            </span>
                          </div>

                          {/* Computed Score bar */}
                          <div className="bg-white p-2 border border-blue-200/60 rounded flex flex-col justify-center">
                            <span className="text-[10px] text-slate-400 font-bold block mb-1">仿真测算得分:</span>
                            <div className="flex items-center space-x-2">
                              <span className={`text-base font-bold font-mono ${computedInstantScore >= 90 ? 'text-emerald-600' : computedInstantScore >= 60 ? 'text-blue-600' : 'text-rose-600'}`}>
                                {computedInstantScore}分
                              </span>
                              <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div className={`h-full ${computedInstantScore >= 90 ? 'bg-emerald-500' : computedInstantScore >= 60 ? 'bg-blue-500' : 'bg-rose-500'}`} style={{ width: `${computedInstantScore}%` }}></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              </div>

              {/* BLOCK 4: Explanation text templates (The Focus area of the revision) */}
              <div className="border border-slate-200 rounded-lg p-4 bg-white space-y-4 shadow-xs">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block border-b border-slate-200 pb-2 flex items-center space-x-1.5">
                  <span className="w-1 h-3.5 bg-blue-600 rounded"></span>
                  <span>3. 命中原理解释与物理差异模板 (二阶段展示配置)</span>
                </span>

                {/* Variable explaination helper panel */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700 flex items-center">
                      <HelpCircle className="w-4 h-4 text-slate-500 mr-1.5" />
                      📋 可插入模板变量及规范指引
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowVariableGuide(!showVariableGuide)}
                      className="text-xs text-blue-600 hover:text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded border border-blue-100 transition-colors"
                    >
                      {showVariableGuide ? '隐藏规则指南 ↑' : '展开规则指南 ↓'}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    <strong className="text-slate-800">⚠️ 特别提示：</strong> 下方的大括号变量是固定提供给系统动态解析并自动注入属性比对数据的。配置人员<strong className="text-rose-600 font-semibold underline">禁止在输入区域随便填写 Manticore 物理编码字段</strong>，系统会根据大括号变量自动带入。
                  </p>
                  
                  {showVariableGuide && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-2 border-t border-slate-200 text-[10px] text-slate-600">
                      <div className="bg-white p-2 rounded border border-slate-200">
                        <code className="text-blue-600 font-semibold bg-blue-50 px-1 py-0.5 rounded font-mono font-bold text-[10.5px]">{`{score}`}</code>
                        <span className="ml-1 text-slate-500">：当前字段测算总得分 (如 100)</span>
                      </div>
                      <div className="bg-white p-2 rounded border border-slate-200">
                        <code className="text-blue-600 font-semibold bg-blue-50 px-1 py-0.5 rounded font-mono font-bold text-[10.5px]">{`{source_val}`}</code>
                        <span className="ml-1 text-slate-500">：源申请物理数值 (如 50 mm)</span>
                      </div>
                      <div className="bg-white p-2 rounded border border-slate-200">
                        <code className="text-blue-600 font-semibold bg-blue-50 px-1 py-0.5 rounded font-mono font-bold text-[10.5px]">{`{target_val}`}</code>
                        <span className="ml-1 text-slate-500">：目标候选物理对齐值 (如 50.1 mm)</span>
                      </div>
                      <div className="bg-white p-2 rounded border border-slate-200">
                        <code className="text-blue-600 font-semibold bg-blue-50 px-1 py-0.5 rounded font-mono font-bold text-[10.5px]">{`{match}`}</code>
                        <span className="ml-1 text-slate-500">：算法名称结论 (如 数值容差匹配)</span>
                      </div>
                      <div className="bg-white p-2 rounded border border-slate-200">
                        <code className="text-blue-600 font-semibold bg-blue-50 px-1 py-0.5 rounded font-mono font-bold text-[10.5px]">{`{diff_val}`}</code>
                        <span className="ml-1 text-slate-500">：数值具体差值 (如 0.1 mm)</span>
                      </div>
                      <div className="bg-white p-2 rounded border border-slate-200">
                        <code className="text-blue-600 font-semibold bg-blue-50 px-1 py-0.5 rounded font-mono font-bold text-[10.5px]">{`{category}`}</code>
                        <span className="ml-1 text-slate-500">：路径比对结果段 (如 紧固件)</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Templates input textareas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Hit Reason Template */}
                  <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/20 space-y-3 flex flex-col">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700 block text-xs">A. 命中原理解释文字模板</span>
                      <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-200 font-semibold">
                        二阶段核心展示
                      </span>
                    </div>

                    <div className="relative flex-1">
                      <textarea
                        ref={hitReasonRef}
                        rows={2.5}
                        value={formHitReasonTemplate}
                        onChange={(e) => setFormHitReasonTemplate(e.target.value)}
                        placeholder="例如: 字段比对，源值「{source_val}」与候选值「{target_val}」通过 {match}，得分 {score}"
                        className="w-full border border-slate-300 rounded p-2 text-xs font-mono bg-white text-slate-800 transition-colors focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    {/* Unknown variable check warning */}
                    {getInvalidVariables(formHitReasonTemplate).length > 0 && (
                      <div className="text-[10px] text-rose-700 bg-rose-50 p-2 rounded border border-rose-100 flex items-start space-x-1.5 font-sans leading-relaxed">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                        <span>
                          <strong>⚠️ 变量错误:</strong> 输入了未知变量 <strong className="font-mono text-rose-800">{getInvalidVariables(formHitReasonTemplate).join(', ')}</strong>。系统无法解析。请双击下方变量重新插入！
                        </span>
                      </div>
                    )}

                    {/* Insert dynamic badges */}
                    <div className="flex items-center space-x-1.5 flex-wrap">
                      <span className="text-[10px] text-slate-400 font-semibold">可插入变量:</span>
                      {getAvailableVariablesForType(formFieldType).map(v => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => handleInsertVariable(hitReasonRef, v, setFormHitReasonTemplate)}
                          className="px-2 py-0.5 rounded text-[10px] font-mono border bg-blue-50/50 hover:bg-blue-50 text-blue-600 border-blue-200 hover:scale-95 transition-all font-semibold"
                        >
                          {v}
                        </button>
                      ))}
                    </div>

                    {/* Instant render preview box */}
                    <div className="p-2.5 rounded border border-slate-200 bg-slate-100/50">
                      <span className="text-[10px] font-bold text-slate-400 block mb-1">实时渲染预览 (给研发端业务看)：</span>
                      <p className="text-xs break-all leading-normal text-slate-600 font-mono italic">
                        {formHitReasonTemplate ? getPreviewText(formHitReasonTemplate, formFieldType) : <span className="text-slate-300">请输入模板文本...</span>}
                      </p>
                    </div>
                  </div>

                  {/* Diff Fields Template */}
                  <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/20 space-y-3 flex flex-col">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700 block text-xs">B. 物理差异标注文字模板</span>
                      <span className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded border border-amber-200 font-semibold">
                        二阶段物理差异
                      </span>
                    </div>

                    <div className="relative flex-1">
                      <textarea
                        ref={diffFieldsRef}
                        rows={2.5}
                        value={formDiffFieldsTemplate}
                        onChange={(e) => setFormDiffFieldsTemplate(e.target.value)}
                        placeholder="例如: 物理差异：源「{source_val}」与候选「{target_val}」不一致"
                        className="w-full border border-slate-300 rounded p-2 text-xs font-mono bg-white text-slate-800 transition-colors focus:ring-1 focus:ring-amber-500"
                      />
                    </div>

                    {/* Unknown variable check warning */}
                    {getInvalidVariables(formDiffFieldsTemplate).length > 0 && (
                      <div className="text-[10px] text-rose-700 bg-rose-50 p-2 rounded border border-rose-100 flex items-start space-x-1.5 font-sans leading-relaxed">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                        <span>
                          <strong>⚠️ 变量错误:</strong> 输入了未知变量 <strong className="font-mono text-rose-800">{getInvalidVariables(formDiffFieldsTemplate).join(', ')}</strong>。系统无法解析。请双击下方变量重新插入！
                        </span>
                      </div>
                    )}

                    {/* Insert dynamic badges */}
                    <div className="flex items-center space-x-1.5 flex-wrap">
                      <span className="text-[10px] text-slate-400 font-semibold">可插入变量:</span>
                      {getAvailableVariablesForType(formFieldType).map(v => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => handleInsertVariable(diffFieldsRef, v, setFormDiffFieldsTemplate)}
                          className="px-2 py-0.5 rounded text-[10px] font-mono border bg-amber-50/50 hover:bg-amber-50 text-amber-600 border-amber-200 hover:scale-95 transition-all font-semibold"
                        >
                          {v}
                        </button>
                      ))}
                    </div>

                    {/* Instant render preview box */}
                    <div className="p-2.5 rounded border border-slate-200 bg-slate-100/50">
                      <span className="text-[10px] font-bold text-slate-400 block mb-1">实时渲染预览 (给研发端业务看)：</span>
                      <p className="text-xs break-all leading-normal text-slate-600 font-mono italic">
                        {formDiffFieldsTemplate ? getPreviewText(formDiffFieldsTemplate, formFieldType) : <span className="text-slate-300">请输入模板文本...</span>}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Actions */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => { setEditingRule(null); setIsNew(false); }}
                className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 rounded text-xs font-semibold text-slate-700 transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => handleSaveForm(true)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded text-xs font-bold text-slate-800 transition-colors"
              >
                保存为草稿 (不发布)
              </button>
              <button
                type="button"
                onClick={() => handleSaveForm(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-xs font-bold text-white shadow-xs transition-colors"
              >
                确定并提交
              </button>
            </div>

          </div>
        </div>
      )}

      {/* STAGE 1 FIELDS SELECTION DIALOG (字段选择弹窗) */}
      {showFieldSelector && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
            
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-900">一阶段已映射字段对齐目录</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">请从已完成一阶段对齐的底层字段中选择，系统将锁死并自动填充元数据。</p>
              </div>
              <button 
                type="button"
                onClick={() => {
                  if (!formFieldName) {
                    alert('请先选择一个字段完成初始化！');
                    return;
                  }
                  setShowFieldSelector(false);
                }}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded p-3 text-[11px] text-blue-800 leading-relaxed">
                💡 <strong>二阶段设计要求：</strong> 所有字段元数据统一源于一阶段映射结构。在此处仅配置与去重打分、强过滤以及换算单位直接相关的二阶段核心规则。
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 font-semibold text-slate-700">
                      <th className="px-3 py-2">字段显示名</th>
                      <th className="px-3 py-2">Manticore 物理编码</th>
                      <th className="px-3 py-2">字段物理类型</th>
                      <th className="px-3 py-2">单位族</th>
                      <th className="px-3 py-2">索引状态</th>
                      <th className="px-3 py-2 text-center">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {STAGE_1_FIELDS.map((f, i) => {
                      const isUsed = rules.some(r => r.propertyCode === f.propertyCode && r.objectType === formObjectType);
                      return (
                        <tr key={i} className={`hover:bg-slate-50 transition-colors ${isUsed ? 'opacity-55' : ''}`}>
                          <td className="px-3 py-2.5 font-bold text-slate-900">{f.fieldName}</td>
                          <td className="px-3 py-2.5 font-mono text-slate-600">{f.propertyCode}</td>
                          <td className="px-3 py-2.5 text-slate-500">{f.fieldType}</td>
                          <td className="px-3 py-2.5 font-mono text-slate-600">{f.unitFamily}</td>
                          <td className="px-3 py-2.5 text-center">
                            <span className="bg-emerald-50 text-emerald-800 border border-emerald-100 px-1.5 py-0.5 rounded font-bold text-[9px]">{f.indexStatus}</span>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {isUsed ? (
                              <span className="text-slate-400 font-semibold">当前类型已使用</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSelectFieldFromStage1(f)}
                                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-[10px]"
                              >
                                选择该字段
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  if (!formFieldName) {
                    alert('请先选择一个字段完成初始化！');
                    return;
                  }
                  setShowFieldSelector(false);
                }}
                className="px-4 py-1.5 bg-slate-900 text-white text-xs font-bold rounded"
              >
                关闭
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
