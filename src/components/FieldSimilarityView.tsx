import React, { useState, useMemo, useRef } from 'react';
import { 
  SlidersHorizontal,
  Plus,
  Search,
  Info,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Edit2,
  Save,
  RefreshCw,
  X,
  ChevronRight,
  HelpCircle
} from 'lucide-react';
import { FieldSimilarityRule, ObjectType, MatchConfig } from '../types';
import { stage1MappedFields, mockUnitCatalog, convertToBaseUnit, convertFromBaseUnit } from '../data';

interface FieldSimilarityViewProps {
  rules: FieldSimilarityRule[];
  onUpdateRules: (newRules: FieldSimilarityRule[]) => void;
  objectConfigStatus: Record<string, {
    enabled: boolean;
    configVersion: string;
    lastModifiedAt: string;
  }>;
  onUpdateConfigStatus: (status: Record<string, {
    enabled: boolean;
    configVersion: string;
    lastModifiedAt: string;
  }>) => void;
  onNavigate?: (view: string) => void;
}

export const FieldSimilarityView: React.FC<FieldSimilarityViewProps> = ({ 
  rules, 
  onUpdateRules,
  objectConfigStatus,
  onUpdateConfigStatus,
  onNavigate
}) => {
  // Active ObjectType Selector Context (Default: PART_MECHANICAL)
  const [activeObjectType, setActiveObjectType] = useState<ObjectType>('PART_MECHANICAL');
  
  // Editor state
  const [editingRule, setEditingRule] = useState<FieldSimilarityRule | null>(null);
  const [isNew, setIsNew] = useState(false);

  // Filters State
  const [filterFieldName, setFilterFieldName] = useState('');
  const [filterIsScoreActive, setFilterIsScoreActive] = useState<string>('ALL');
  const [filterIsFilterCondition, setFilterIsFilterCondition] = useState<string>('ALL');
  const [filterMatchType, setFilterMatchType] = useState<string>('ALL');

  // Form State variables
  const [formFieldName, setFormFieldName] = useState('');
  const [formPropertyCode, setFormPropertyCode] = useState('');
  const [formFieldType, setFormFieldType] = useState<string>('带单位数值 (NUMBER_WITH_UNIT)');
  const [formWeight, setFormWeight] = useState<number>(15);
  const [formMatchTypeState, setFormMatchTypeState] = useState<string>('数值容差匹配');
  const [formNullHandling, setFormNullHandling] = useState<string>('候选缺失按 0 分');
  const [formIsScoreActive, setFormIsScoreActive] = useState<boolean>(true);
  const [formIsFilterCondition, setFormIsFilterCondition] = useState<boolean>(false);
  const [formHitReasonTemplate, setFormHitReasonTemplate] = useState<string>('');
  const [formDiffFieldsTemplate, setFormDiffFieldsTemplate] = useState<string>('');

  // Unit catalog fields
  const [formUnitFamily, setFormUnitFamily] = useState<string>('长度');
  const [formBaseUnit, setFormBaseUnit] = useState<string>('m');
  const [formDisplayUnit, setFormDisplayUnit] = useState<string>('mm');

  // Interactive unit calculator states
  const [calcInput, setCalcInput] = useState<string>('50');

  // Dynamic parameters state
  // 1. Text Similarity
  const [paramMinTextThreshold, setParamMinTextThreshold] = useState<number>(60);
  // 2. Numeric Tolerance
  const [paramNumToleranceType, setParamNumToleranceType] = useState<'ABSOLUTE' | 'PERCENTAGE'>('ABSOLUTE');
  const [paramNumToleranceVal, setParamNumToleranceVal] = useState<number>(0.2);
  const [paramNumToleranceDirection, setParamNumToleranceDirection] = useState<'BOTH' | 'HIGHER' | 'LOWER'>('BOTH');
  // 3. Numeric Decay
  const [paramDecayFullScore, setParamDecayFullScore] = useState<number>(0.1);
  const [paramDecayZeroBoundary, setParamDecayZeroBoundary] = useState<number>(1.0);
  const [paramDecayDirection, setParamDecayDirection] = useState<'BOTH' | 'HIGHER' | 'LOWER'>('BOTH');
  // 4. Native Hierarchy
  const [paramHierarchyMaxDiff, setParamHierarchyMaxDiff] = useState<number>(3);
  const [paramHierarchyRequirement, setParamHierarchyRequirement] = useState<'PARENT_CHILD' | 'ANCESTOR_DESCENDANT'>('ANCESTOR_DESCENDANT');
  const [paramHierarchyDeduction, setParamHierarchyDeduction] = useState<number>(5);
  // 5. Date Tolerance
  const [paramDateToleranceVal, setParamDateToleranceVal] = useState<number>(7);
  const [paramDateToleranceUnit, setParamDateToleranceUnit] = useState<'DAY' | 'HOUR'>('DAY');
  const [paramDateToleranceDirection, setParamDateToleranceDirection] = useState<'BOTH' | 'HIGHER' | 'LOWER'>('BOTH');

  // Interactive Score Preview states
  const [previewSrcVal, setPreviewSrcVal] = useState<string>('10.0');
  const [previewTgtVal, setPreviewTgtVal] = useState<string>('10.1');

  // Local unsaved tag
  const [isModified, setIsModified] = useState(false);

  // Load selected Unit Quantity units
  const currentQuantityData = useMemo(() => {
    return mockUnitCatalog.quantities.find(q => q.code === formUnitFamily || q.name === formUnitFamily);
  }, [formUnitFamily]);

  // Handle active Object Type toggle enabled state
  const isCurrentTypeEnabled = useMemo(() => {
    return objectConfigStatus[activeObjectType]?.enabled ?? false;
  }, [objectConfigStatus, activeObjectType]);

  const handleToggleObjectTypeEnabled = () => {
    const nextEnabled = !isCurrentTypeEnabled;
    const nextStatus = {
      ...objectConfigStatus,
      [activeObjectType]: {
        ...objectConfigStatus[activeObjectType],
        enabled: nextEnabled,
        lastModifiedAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
      }
    };
    onUpdateConfigStatus(nextStatus);
    setIsModified(true);
  };

  // Weight summary check
  const weightSummary = useMemo(() => {
    const subset = rules.filter(r => r.objectType === activeObjectType);
    const scoreRules = subset.filter(r => r.isScoreActive);
    const total = scoreRules.reduce((sum, r) => sum + r.weight, 0);
    const detailList = scoreRules.map(r => `${r.fieldName}(${r.weight}%)`);
    const details = detailList.length > 0 ? detailList.join(' + ') : '无';
    return {
      total,
      details,
      isValid: total === 100,
      scoreCount: scoreRules.length,
      filterCount: subset.filter(r => r.isFilterCondition).length
    };
  }, [rules, activeObjectType]);

  // Object types available with counters
  const objectTypeOptions = [
    { value: 'PART_MECHANICAL', label: '机械零件 (PART_MECHANICAL)' },
    { value: 'PART_ELECTRICAL', label: '电气元器件 (PART_ELECTRICAL)' },
    { value: 'PART_HYDRAULIC', label: '液压元件 (PART_HYDRAULIC)' },
    { value: 'PART_PNEUMATIC', label: '气动元件 (PART_PNEUMATIC)' },
    { value: 'PART_OPTICAL', label: '光学元件 (PART_OPTICAL)' }
  ];

  // Map of Object types display
  const objectTypeNameMap: Record<string, string> = {
    'PART_MECHANICAL': '机械零件 (PART_MECHANICAL)',
    'PART_ELECTRICAL': '电气元器件 (PART_ELECTRICAL)',
    'PART_HYDRAULIC': '液压元件 (PART_HYDRAULIC)',
    'PART_PNEUMATIC': '气动元件 (PART_PNEUMATIC)',
    'PART_OPTICAL': '光学元件 (PART_OPTICAL)'
  };

  // Search input and selector filtering
  const filteredRules = useMemo(() => {
    return rules.filter(r => {
      if (r.objectType !== activeObjectType) return false;

      // Filter by Keyword
      if (filterFieldName.trim()) {
        const query = filterFieldName.toLowerCase();
        const nameMatch = r.fieldName.toLowerCase().includes(query);
        const codeMatch = r.propertyCode.toLowerCase().includes(query);
        if (!nameMatch && !codeMatch) return false;
      }

      // Filter by Score Active
      if (filterIsScoreActive !== 'ALL') {
        const target = filterIsScoreActive === 'TRUE';
        if (r.isScoreActive !== target) return false;
      }

      // Filter by Filter Active
      if (filterIsFilterCondition !== 'ALL') {
        const target = filterIsFilterCondition === 'TRUE';
        if (r.isFilterCondition !== target) return false;
      }

      // Filter by Match Type
      if (filterMatchType !== 'ALL') {
        if (r.matchType !== filterMatchType) return false;
      }

      return true;
    });
  }, [rules, activeObjectType, filterFieldName, filterIsScoreActive, filterIsFilterCondition, filterMatchType]);

  // Reset Filters
  const handleResetFilters = () => {
    setFilterFieldName('');
    setFilterIsScoreActive('ALL');
    setFilterIsFilterCondition('ALL');
    setFilterMatchType('ALL');
  };

  const incrementVersion = (version: string) => {
    const match = version.match(/^v(\d+)\.(\d+)\.(\d+)$/);
    if (match) {
      const major = parseInt(match[1]);
      const minor = parseInt(match[2]);
      const patch = parseInt(match[3]);
      return `v${major}.${minor}.${patch + 1}`;
    }
    return version + '.1';
  };

  // Save changes to local memory state & localstorage (Simulating instant config save)
  const handleSaveCurrentConfig = () => {
    if (!weightSummary.isValid) {
      alert(`保存失败！当前对象类型的评分项权重总和为 ${weightSummary.total}%，不等于 100%。请确保参与加权评分的字段权重合计精确等于 100% 才能保存生效！`);
      return;
    }

    const currentConf = objectConfigStatus[activeObjectType] || { enabled: true, configVersion: 'v2.5.0', lastModifiedAt: '' };
    const nextVersion = incrementVersion(currentConf.configVersion);
    const nextStatus = {
      ...objectConfigStatus,
      [activeObjectType]: {
        ...currentConf,
        configVersion: nextVersion,
        lastModifiedAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
      }
    };
    onUpdateConfigStatus(nextStatus);
    alert(`[ ${objectTypeNameMap[activeObjectType]} ] 二阶段相似度规则集已成功保存！\n版本已自动升级至 ${nextVersion}，直接对应用端生效。`);
    setIsModified(false);
  };

  // Delete Rule
  const handleDeleteRule = (id: string) => {
    if (window.confirm('您确定要彻底删除该属性相似度比分规则吗？此操作将立即调整算分权重配平。')) {
      const updated = rules.filter(r => r.id !== id);
      onUpdateRules(updated);
      setIsModified(true);
    }
  };

  // Handle Edit Action
  const handleEditRule = (rule: FieldSimilarityRule) => {
    setEditingRule(rule);
    setIsNew(false);

    // Sync form variables
    setFormFieldName(rule.fieldName);
    setFormPropertyCode(rule.propertyCode);
    setFormFieldType(rule.fieldType);
    setFormWeight(rule.weight);
    setFormMatchTypeState(rule.matchType);
    setFormNullHandling(rule.nullHandling);
    setFormIsScoreActive(rule.isScoreActive);
    setFormIsFilterCondition(rule.isFilterCondition);
    setFormHitReasonTemplate(rule.hitReasonTemplate);
    setFormDiffFieldsTemplate(rule.diffFieldsTemplate);

    setFormUnitFamily(rule.unitFamily || '长度');
    setFormBaseUnit(rule.baseUnit || 'm');
    setFormDisplayUnit(rule.displayUnit || 'mm');

    // Sync dynamic matching config params
    if (rule.matchConfig) {
      const config = rule.matchConfig;
      if (config.kind === 'TEXT_SIMILARITY') {
        setParamMinTextThreshold(config.threshold);
      } else if (config.kind === 'NUMERIC_TOLERANCE') {
        setParamNumToleranceType(config.toleranceType);
        setParamNumToleranceVal(config.toleranceValue);
        setParamNumToleranceDirection(config.direction);
      } else if (config.kind === 'NUMERIC_DECAY') {
        setParamDecayFullScore(config.fullScoreRange);
        setParamDecayZeroBoundary(config.zeroScoreBoundary);
        setParamDecayDirection(config.direction);
      } else if (config.kind === 'NATIVE_HIERARCHY') {
        setParamHierarchyMaxDiff(config.maxLevelGap);
        setParamHierarchyRequirement(config.relation);
        setParamHierarchyDeduction(config.deductionPerLevel);
      } else if (config.kind === 'DATE_TOLERANCE') {
        setParamDateToleranceVal(config.toleranceValue);
        setParamDateToleranceUnit(config.toleranceUnit);
        setParamDateToleranceDirection(config.direction);
      }
    }
    
    // Default interactive test values
    setPreviewSrcVal('10.0');
    setPreviewTgtVal('10.2');
  };

  // Trigger New Rule Form
  const handleCreateNewRule = () => {
    setIsNew(true);
    setEditingRule(null);

    setFormFieldName('');
    setFormPropertyCode('');
    setFormFieldType('带单位数值 (NUMBER_WITH_UNIT)');
    setFormWeight(10);
    setFormMatchTypeState('精确值匹配');
    setFormNullHandling('候选缺失按 0 分');
    setFormIsScoreActive(true);
    setFormIsFilterCondition(false);
    setFormHitReasonTemplate('');
    setFormDiffFieldsTemplate('');

    setFormUnitFamily('长度');
    setFormBaseUnit('m');
    setFormDisplayUnit('mm');

    setCalcInput('50');
    setPreviewSrcVal('10.0');
    setPreviewTgtVal('10.2');
  };

  // Quantity Change -> Update SI Unit & Display Unit
  const handleQuantityChange = (quantityName: string) => {
    setFormUnitFamily(quantityName);
    const qty = mockUnitCatalog.quantities.find(q => q.name === quantityName || q.code === quantityName);
    if (qty) {
      setFormBaseUnit(qty.baseUnit);
      if (qty.units.length > 0) {
        setFormDisplayUnit(qty.units[0].code);
      } else {
        setFormDisplayUnit('无');
      }
    }
  };

  // Convert on fly for calculator
  const calcResult = useMemo(() => {
    const inputVal = parseFloat(calcInput);
    if (isNaN(inputVal)) return { formula: '输入非法数值', value: '-' };

    // Find scale & offset from Catalog
    const qty = mockUnitCatalog.quantities.find(q => q.name === formUnitFamily || q.code === formUnitFamily);
    if (!qty) return { formula: '未知度量衡', value: calcInput };
    const unit = qty.units.find(u => u.code === formDisplayUnit);
    if (!unit) return { formula: '未找到选定显示单位', value: calcInput };

    const baseVal = inputVal * unit.scale + unit.offset;
    const formulaStr = `${calcInput} ${formDisplayUnit} × ${unit.scale} + ${unit.offset} = ${baseVal.toFixed(4)} ${qty.baseUnit}`;
    return {
      formula: formulaStr,
      value: `${baseVal.toFixed(4)} ${qty.baseUnit}`
    };
  }, [calcInput, formUnitFamily, formDisplayUnit]);

  // Real-time Preview Score Calculation
  const realTimePreviewScore = useMemo(() => {
    const srcNum = parseFloat(previewSrcVal);
    const tgtNum = parseFloat(previewTgtVal);

    if (formMatchTypeState === '精确值匹配') {
      return previewSrcVal === previewTgtVal ? 100 : 0;
    }

    if (formMatchTypeState === '文本相似匹配 (非 AI)') {
      if (!previewSrcVal || !previewTgtVal) return 0;
      const srcChars = new Set(previewSrcVal.split(''));
      const tgtChars = previewTgtVal.split('');
      const overlap = tgtChars.filter(c => srcChars.has(c)).length;
      const sim = Math.round((overlap / Math.max(previewSrcVal.length, previewTgtVal.length)) * 100);
      return sim >= paramMinTextThreshold ? sim : 0;
    }

    if (formMatchTypeState === '数值容差匹配') {
      if (isNaN(srcNum) || isNaN(tgtNum)) return 0;
      const diff = Math.abs(srcNum - tgtNum);
      let limit = paramNumToleranceVal;
      if (paramNumToleranceType === 'PERCENTAGE') {
        limit = (srcNum * paramNumToleranceVal) / 100;
      }

      // Direction check
      if (paramNumToleranceDirection === 'HIGHER' && tgtNum < srcNum) return 0;
      if (paramNumToleranceDirection === 'LOWER' && tgtNum > srcNum) return 0;

      return diff <= limit ? 100 : 0;
    }

    if (formMatchTypeState === '数值距离衰减') {
      if (isNaN(srcNum) || isNaN(tgtNum)) return 0;
      const diff = Math.abs(srcNum - tgtNum);

      // Direction check
      if (paramDecayDirection === 'HIGHER' && tgtNum < srcNum) return 0;
      if (paramDecayDirection === 'LOWER' && tgtNum > srcNum) return 0;

      if (diff <= paramDecayFullScore) return 100;
      if (diff >= paramDecayZeroBoundary) return 0;

      const score = 100 * (1 - (diff - paramDecayFullScore) / (paramDecayZeroBoundary - paramDecayFullScore));
      return Math.round(Math.max(0, Math.min(100, score)));
    }

    if (formMatchTypeState === '层级关系匹配') {
      // Simulate level depth deduction
      const score = 100 - (paramHierarchyDeduction * 1.5);
      return Math.max(0, score);
    }

    if (formMatchTypeState === '日期容差匹配') {
      return 100;
    }

    return 100;
  }, [
    formMatchTypeState, previewSrcVal, previewTgtVal,
    paramMinTextThreshold, paramNumToleranceType, paramNumToleranceVal, paramNumToleranceDirection,
    paramDecayFullScore, paramDecayZeroBoundary, paramDecayDirection,
    paramHierarchyDeduction
  ]);

  // Handle Form Submit
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formFieldName.trim() || !formPropertyCode.trim()) {
      alert('请完整填写字段名称与属性编码！');
      return;
    }

    // Build MatchConfig
    let matchConfig: MatchConfig = { kind: 'EXACT' };
    if (formMatchTypeState === '文本相似匹配 (非 AI)') {
      matchConfig = { kind: 'TEXT_SIMILARITY', threshold: paramMinTextThreshold };
    } else if (formMatchTypeState === '数值容差匹配') {
      matchConfig = {
        kind: 'NUMERIC_TOLERANCE',
        toleranceType: paramNumToleranceType,
        toleranceValue: paramNumToleranceVal,
        direction: paramNumToleranceDirection
      };
    } else if (formMatchTypeState === '数值距离衰减') {
      matchConfig = {
        kind: 'NUMERIC_DECAY',
        fullScoreRange: paramDecayFullScore,
        zeroScoreBoundary: paramDecayZeroBoundary,
        direction: paramDecayDirection
      };
    } else if (formMatchTypeState === '层级关系匹配') {
      matchConfig = {
        kind: 'NATIVE_HIERARCHY',
        maxLevelGap: paramHierarchyMaxDiff,
        relation: paramHierarchyRequirement,
        deductionPerLevel: paramHierarchyDeduction
      };
    } else if (formMatchTypeState === '日期容差匹配') {
      matchConfig = {
        kind: 'DATE_TOLERANCE',
        toleranceValue: paramDateToleranceVal,
        toleranceUnit: paramDateToleranceUnit,
        direction: paramDateToleranceDirection
      };
    }

    // Ensure unit details are cleaned up if plain number
    const finalFieldType = formFieldType;
    const isUnitType = finalFieldType === '带单位数值 (NUMBER_WITH_UNIT)';

    const updatedRule: FieldSimilarityRule = {
      id: isNew ? `F-00${rules.length + 1}` : (editingRule?.id || 'F-TMP'),
      objectType: activeObjectType,
      fieldName: formFieldName,
      propertyCode: formPropertyCode,
      fieldType: finalFieldType,
      weight: formIsScoreActive ? Number(formWeight) : 0,
      matchType: formMatchTypeState,
      nullHandling: formNullHandling,
      isScoreActive: formIsScoreActive,
      isFilterCondition: formIsFilterCondition,
      isQueryPreviewAvailable: true,
      isAppEndActive: true,
      showHitReason: formHitReasonTemplate.trim().length > 0,
      showDiffFields: formDiffFieldsTemplate.trim().length > 0,
      hitReasonTemplate: formHitReasonTemplate,
      diffFieldsTemplate: formDiffFieldsTemplate,
      enabled: isCurrentTypeEnabled, // inherit object type enabled state
      configVersion: editingRule?.configVersion || 'v2.5.0',
      lastEditor: '李晓华 (数据标准管理员)',
      lastEditTime: new Date().toISOString().replace('T', ' ').substring(0, 19),
      unitFamily: isUnitType ? formUnitFamily : '无',
      baseUnit: isUnitType ? formBaseUnit : '无',
      displayUnit: isUnitType ? formDisplayUnit : '无',
      matchConfig: matchConfig
    };

    if (isNew) {
      onUpdateRules([...rules, updatedRule]);
    } else {
      onUpdateRules(rules.map(r => r.id === updatedRule.id ? updatedRule : r));
    }

    setEditingRule(null);
    setIsNew(false);
    setIsModified(true);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 font-sans">
      
      {/* View Title */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0 flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2 text-xs text-slate-500 mb-1">
            <span>相似度配置</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-800 font-medium">字段相似度规则</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            {isNew ? '新建字段相似度规则' : editingRule ? '配置相似度对比属性' : '二阶段：字段相似度规则管理'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            精准配平 Manticore 二阶段多维度加权比分权重，自动适配度量衡单位转换及区间偏差退让评分。
          </p>
        </div>

        {/* Save & Reset Panel on top right */}
        {!(editingRule || isNew) && (
          <div className="flex items-center space-x-2">
            {isModified && (
              <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded font-medium border border-amber-200 animate-pulse">
                ● 存在未保存变更
              </span>
            )}
            <button
              onClick={handleSaveCurrentConfig}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>保存当前配置</span>
            </button>
            <button
              onClick={handleCreateNewRule}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 text-white hover:bg-slate-800 rounded text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>添加字段规则</span>
            </button>
          </div>
        )}
      </div>

      {!(editingRule || isNew) ? (
        // ------------------------- RULE LIST LAYOUT -------------------------
        <div className="flex-1 flex flex-col overflow-hidden">
          
          {/* Top Selection Context & Summary Row */}
          <div className="bg-white border-b border-slate-200 px-6 py-3 shrink-0 flex flex-wrap items-center justify-between gap-4">
            
            {/* Active Object Type Selection */}
            <div className="flex items-center space-x-3">
              <span className="text-xs font-bold text-slate-700 shrink-0">当前对象类型:</span>
              <select
                value={activeObjectType}
                onChange={(e) => {
                  const targetType = e.target.value as ObjectType;
                  if (isModified) {
                    if (window.confirm('当前配置存在未保存修改，切换对象类型将丢失这些修改，是否确认切换？')) {
                      setActiveObjectType(targetType);
                      setIsModified(false);
                    }
                  } else {
                    setActiveObjectType(targetType);
                  }
                }}
                className="text-xs border border-slate-200 rounded-md px-3 py-1.5 bg-slate-50 text-slate-800 font-bold outline-hidden cursor-pointer"
              >
                {objectTypeOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Enable/Disable active type switcher */}
            <div className="flex items-center space-x-2.5 bg-slate-100 border border-slate-200/80 px-3 py-1 rounded-md">
              <span className="text-xs font-semibold text-slate-700">整套规则总开关:</span>
              <button
                onClick={handleToggleObjectTypeEnabled}
                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  isCurrentTypeEnabled ? 'bg-emerald-600' : 'bg-slate-400'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    isCurrentTypeEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className={`text-[11px] font-bold ${isCurrentTypeEnabled ? 'text-emerald-700' : 'text-slate-500'}`}>
                {isCurrentTypeEnabled ? '已启用该类规则' : '已停用该类规则'}
              </span>
            </div>

            {/* Read-only Unit Catalog Source Details */}
            <div className="text-slate-400 text-[11px] font-medium flex items-center space-x-1.5 ml-auto">
              <span>只读单位目录加载正常:</span>
              <span className="text-slate-600 font-mono bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded font-bold">
                {mockUnitCatalog.catalogVersion} ({mockUnitCatalog.sourceSystem})
              </span>
            </div>
          </div>

          {/* Compact Overview Bar (Replaces 3 Cards) */}
          <div className="px-6 pt-3 shrink-0">
            <div className={`border rounded-lg px-4 py-2.5 flex flex-wrap items-center gap-6 justify-between text-xs ${
              isCurrentTypeEnabled 
                ? 'bg-slate-900 text-white border-slate-800 shadow-sm' 
                : 'bg-slate-100 border-slate-200 text-slate-500'
            }`}>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
                <span className="font-bold tracking-wide text-sm flex items-center space-x-1.5">
                  <SlidersHorizontal className="w-4 h-4 text-blue-400" />
                  <span>{objectTypeNameMap[activeObjectType]}</span>
                </span>
                <span className="text-slate-400">|</span>
                <span className="flex items-center space-x-1">
                  <span className={`w-2 h-2 rounded-full ${isCurrentTypeEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`}></span>
                  <strong className={isCurrentTypeEnabled ? 'text-emerald-400' : 'text-slate-500'}>
                    {isCurrentTypeEnabled ? '已全局启用二阶段计算' : '已全局停用比分'}
                  </strong>
                </span>
                <span className="text-slate-400">|</span>
                <span>参与评分: <strong className="font-mono text-blue-400 text-sm">{weightSummary.scoreCount}</strong> 个字段</span>
                <span className="text-slate-400">|</span>
                <span>强过滤: <strong className="font-mono text-orange-400 text-sm">{weightSummary.filterCount}</strong> 个条件</span>
                <span className="text-slate-400">|</span>
                <span>当前算分项权重总和: 
                  <strong className={`font-mono ml-1 text-sm ${weightSummary.isValid ? 'text-emerald-400' : 'text-red-400 underline font-bold'}`}>
                    {weightSummary.total}%
                  </strong>
                </span>
                <span className="text-slate-400">|</span>
                <span className="font-mono text-[10px] text-slate-300">
                  配置版本: {objectConfigStatus[activeObjectType]?.configVersion ?? 'v1.0.0'}
                </span>
              </div>

              {/* Weight Warnings */}
              {!weightSummary.isValid && isCurrentTypeEnabled && (
                <span className="bg-red-500/20 text-red-200 border border-red-500/40 px-2 py-0.5 rounded font-medium flex items-center space-x-1 text-[11px] animate-pulse">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                  <span>权重之和({weightSummary.total}%)不等于100%! 请编辑配平。</span>
                </span>
              )}
            </div>
            
            {/* Formula Expression */}
            {isCurrentTypeEnabled && (
              <div className="mt-2 bg-slate-100 border border-slate-200 rounded px-3 py-1.5 text-xs text-slate-600 flex items-center justify-between">
                <span className="font-semibold text-slate-700 shrink-0">二阶段评分引擎公式:</span>
                <span className="font-mono text-slate-500 truncate max-w-4xl px-3 flex-1 text-left">{weightSummary.details}</span>
                <span className="text-slate-400 text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded font-mono font-medium">
                  Formula Engine
                </span>
              </div>
            )}
          </div>

          {!rules.some(r => r.objectType === activeObjectType) ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50/50">
              <div className="max-w-md text-center p-6 bg-white border border-slate-200 rounded-xl shadow-xs space-y-4">
                <SlidersHorizontal className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-slate-800">该类型尚未配置相似度比分规则</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  当前对象分类 [{objectTypeNameMap[activeObjectType]}] 暂未定义任何二阶段属性比分与过滤映射规则。您可以点击右上角的“添加字段规则”开始创建。
                </p>
                <div className="flex justify-center pt-2">
                  <button
                    onClick={handleCreateNewRule}
                    className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>添加第一条字段规则</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Table Filters area */}
              <div className="px-6 py-3.5 shrink-0 flex flex-wrap items-center gap-3.5">
                {/* Field query */}
                <div className="relative w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={filterFieldName}
                    onChange={(e) => setFilterFieldName(e.target.value)}
                    placeholder="搜索字段名称 / 属性编码..."
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:outline-hidden font-medium text-slate-700"
                  />
                </div>

                {/* Score toggle filter */}
                <div className="flex items-center space-x-1.5 text-xs">
                  <span className="text-slate-500 font-medium">参与评分:</span>
                  <select
                    value={filterIsScoreActive}
                    onChange={(e) => setFilterIsScoreActive(e.target.value)}
                    className="bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-700 font-medium cursor-pointer"
                  >
                    <option value="ALL">全部</option>
                    <option value="TRUE">是</option>
                    <option value="FALSE">否</option>
                  </select>
                </div>

                {/* Filter condition toggle */}
                <div className="flex items-center space-x-1.5 text-xs">
                  <span className="text-slate-500 font-medium">作为过滤条件:</span>
                  <select
                    value={filterIsFilterCondition}
                    onChange={(e) => setFilterIsFilterCondition(e.target.value)}
                    className="bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-700 font-medium cursor-pointer"
                  >
                    <option value="ALL">全部</option>
                    <option value="TRUE">是</option>
                    <option value="FALSE">否</option>
                  </select>
                </div>

                {/* Match type filter */}
                <div className="flex items-center space-x-1.5 text-xs">
                  <span className="text-slate-500 font-medium">匹配方式:</span>
                  <select
                    value={filterMatchType}
                    onChange={(e) => setFilterMatchType(e.target.value)}
                    className="bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-700 font-medium cursor-pointer"
                  >
                    <option value="ALL">全部方式</option>
                    <option value="精确值匹配">精确值匹配</option>
                    <option value="数值容差匹配">数值容差匹配</option>
                    <option value="数值距离衰减">数值距离衰减</option>
                    <option value="文本相似匹配 (非 AI)">文本相似匹配</option>
                    <option value="层级关系匹配">层级关系匹配</option>
                  </select>
                </div>

                {/* Reset Filters */}
                <button
                  onClick={handleResetFilters}
                  className="px-3 py-1.5 text-xs bg-slate-200 text-slate-600 hover:bg-slate-300 rounded font-bold transition-colors cursor-pointer"
                >
                  重置
                </button>
              </div>

              {/* Main compact table */}
              <div className="flex-1 px-6 pb-6 overflow-hidden flex flex-col">
                <div className="bg-white border border-slate-200 rounded-lg shadow-xs flex-1 flex flex-col overflow-hidden">
                  <div className="overflow-auto flex-1">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="sticky top-0 bg-slate-50 z-10">
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold font-sans">
                          <th className="px-4 py-3">字段显示名称 & 属性编码</th>
                          <th className="px-4 py-3">字段类型 (严格区分)</th>
                          <th className="px-3 py-3 text-center">算分权重</th>
                          <th className="px-4 py-3">比对匹配方式</th>
                          <th className="px-4 py-3">比对参数规格摘要</th>
                          <th className="px-4 py-3">空值回退策略</th>
                          <th className="px-3 py-3 text-center">评分</th>
                          <th className="px-3 py-3 text-center">过滤</th>
                          <th className="px-4 py-3 text-center">管理操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-sans">
                        {filteredRules.length > 0 ? (
                          filteredRules.map((rule) => {
                            const isScore = rule.isScoreActive;
                            const isFilter = rule.isFilterCondition;
                            
                            // Parameter Summary builder
                            let paramSummary = '无特殊匹配参数';
                            if (rule.matchConfig) {
                              const config = rule.matchConfig;
                              if (config.kind === 'TEXT_SIMILARITY') {
                                paramSummary = `文本匹配阈值 ≥ ${config.threshold}%`;
                              } else if (config.kind === 'NUMERIC_TOLERANCE') {
                                const unitLabel = rule.displayUnit !== '无' ? rule.displayUnit : '';
                                const dirLabel = config.direction === 'BOTH' ? '双向' : config.direction === 'HIGHER' ? '仅偏高' : '仅偏低';
                                const typeLabel = config.toleranceType === 'PERCENTAGE' ? '%' : unitLabel;
                                paramSummary = `容差 ±${config.toleranceValue}${typeLabel} (${dirLabel})`;
                              } else if (config.kind === 'NUMERIC_DECAY') {
                                const unitLabel = rule.displayUnit !== '无' ? rule.displayUnit : '';
                                const dirLabel = config.direction === 'BOTH' ? '双向' : config.direction === 'HIGHER' ? '仅偏高' : '仅偏低';
                                paramSummary = `无损距离:${config.fullScoreRange}${unitLabel}, 极限零分:${config.zeroScoreBoundary}${unitLabel} (${dirLabel})`;
                              } else if (config.kind === 'NATIVE_HIERARCHY') {
                                paramSummary = `最大层级偏移:${config.maxLevelGap}层, 每层扣减:${config.deductionPerLevel}分`;
                              } else if (config.kind === 'DATE_TOLERANCE') {
                                const unitLabel = config.toleranceUnit === 'DAY' ? '天' : '小时';
                                const dirLabel = config.direction === 'BOTH' ? '双向' : config.direction === 'HIGHER' ? '仅偏高' : '仅偏低';
                                paramSummary = `容差 ±${config.toleranceValue}${unitLabel} (${dirLabel})`;
                              }
                            }

                            // Determine field type styling badge
                            const isUnitType = rule.fieldType === '带单位数值 (NUMBER_WITH_UNIT)';
                            
                            return (
                              <tr 
                                key={rule.id} 
                                className={`hover:bg-slate-50/50 transition-colors ${
                                  !isCurrentTypeEnabled ? 'text-slate-400 bg-slate-50/50' : 'text-slate-800'
                                }`}
                              >
                                {/* Display Name & Property Code */}
                                <td className="px-4 py-2.5">
                                  <div className="font-semibold text-slate-900">{rule.fieldName}</div>
                                  <div className="font-mono text-[10.5px] text-slate-500 mt-0.5">{rule.propertyCode}</div>
                                </td>

                                {/* Field Type (strictly separated) */}
                                <td className="px-4 py-2.5">
                                  {isUnitType ? (
                                    <div className="flex flex-col items-start">
                                      <span className="text-[10.5px] bg-blue-50 text-blue-800 border border-blue-200 px-1.5 py-0.5 rounded font-bold">
                                        带单位数值_WITH_UNIT
                                      </span>
                                      <span className="text-[10px] text-slate-500 mt-0.5 font-sans">
                                        量纲: {rule.unitFamily} ({rule.displayUnit} → 基准 {rule.baseUnit})
                                      </span>
                                    </div>
                                  ) : rule.fieldType === '数值 (NUMBER)' ? (
                                    <span className="text-[10.5px] bg-slate-100 text-slate-800 border border-slate-300 px-1.5 py-0.5 rounded font-semibold">
                                      纯数值_NUMBER
                                    </span>
                                  ) : (
                                    <span className="text-[10.5px] text-slate-600 font-medium">
                                      {rule.fieldType}
                                    </span>
                                  )}
                                </td>

                                {/* Weight */}
                                <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-800">
                                  {isScore ? `${rule.weight}%` : <span className="text-slate-400">-</span>}
                                </td>

                                {/* Match Type */}
                                <td className="px-4 py-2.5 font-medium text-slate-700">
                                  {rule.matchType}
                                </td>

                                {/* Parameters Summary */}
                                <td className="px-4 py-2.5 text-slate-600 font-medium leading-relaxed">
                                  {paramSummary}
                                </td>

                                {/* Null Handling */}
                                <td className="px-4 py-2.5 text-slate-500">
                                  {rule.nullHandling}
                                </td>

                                {/* Score Toggle Switch */}
                                <td className="px-3 py-2.5 text-center">
                                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                    isScore 
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                      : 'bg-slate-100 text-slate-500 border border-slate-200'
                                  }`}>
                                    {isScore ? '评分中' : '不参与'}
                                  </span>
                                </td>

                                {/* Filter Toggle Switch */}
                                <td className="px-3 py-2.5 text-center">
                                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                    isFilter 
                                      ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                                      : 'bg-slate-100 text-slate-500 border border-slate-200'
                                  }`}>
                                    {isFilter ? '过滤中' : '不参与'}
                                  </span>
                                </td>

                                {/* Actions */}
                                <td className="px-4 py-2.5 text-center">
                                  <div className="flex items-center justify-center space-x-2">
                                    <button
                                      onClick={() => handleEditRule(rule)}
                                      className="text-blue-600 hover:text-blue-800 text-xs font-bold flex items-center space-x-0.5 px-1.5 py-1 rounded hover:bg-blue-50 transition-colors cursor-pointer"
                                      title="配置规则算法和量纲换算"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                      <span>配置</span>
                                    </button>
                                    <button
                                      onClick={() => handleDeleteRule(rule.id)}
                                      className="text-slate-400 hover:text-red-600 text-xs font-medium flex items-center space-x-0.5 px-1.5 py-1 rounded hover:bg-red-50 transition-colors cursor-pointer"
                                      title="删除此规则"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={9} className="text-center py-10 text-slate-400">
                              未搜索到匹配的字段对比规则。
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        // ------------------------- EDITOR / FORM LAYOUT -------------------------
        <div className="flex-1 flex overflow-hidden">
          
          {/* Main Scrollable editor */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            <form onSubmit={handleSaveForm} className="space-y-6">
              
              {/* Card 1: Base properties */}
              <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
                  第一部分：基础映射与类型区分
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Field name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">字段显示名称 *</label>
                    <input 
                      type="text"
                      value={formFieldName}
                      onChange={(e) => setFormFieldName(e.target.value)}
                      placeholder="例如：标称直径、螺距"
                      className="w-full text-xs border border-slate-200 rounded px-3 py-1.5 outline-hidden focus:ring-1 focus:ring-blue-500 font-medium"
                      required
                    />
                  </div>

                  {/* Property Code */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">属性编码 / Manticore字段名 *</label>
                    <input 
                      type="text"
                      value={formPropertyCode}
                      onChange={(e) => setFormPropertyCode(e.target.value)}
                      placeholder="例如：nominal_diameter"
                      className="w-full text-xs border border-slate-200 rounded px-3 py-1.5 font-mono outline-hidden focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>

                  {/* Field Type selector */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      字段类型区分（严格解耦）
                    </label>
                    <select
                      value={formFieldType}
                      onChange={(e) => setFormFieldType(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded px-3 py-1.5 bg-slate-50 text-slate-800 font-bold outline-hidden cursor-pointer"
                    >
                      <option value="带单位数值 (NUMBER_WITH_UNIT)">带单位数值 (NUMBER_WITH_UNIT)</option>
                      <option value="数值 (NUMBER)">数值 (NUMBER - 纯数字无量纲)</option>
                      <option value="长文本 (LONG_TEXT)">长文本 (LONG_TEXT)</option>
                      <option value="分类树 (CLASS_TREE)">分类树 (CLASS_TREE)</option>
                      <option value="枚举 (ENUM)">枚举 (ENUM)</option>
                      <option value="文本 (TEXT)">文本 (TEXT)</option>
                    </select>
                    <p className="text-[10px] text-slate-400 mt-1">
                      带单位数值类型支持多物理量转换计算；纯数值类型不关联量纲，无法选择单位族。
                    </p>
                  </div>

                  {/* Null value handling */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">空值退让回退策略</label>
                    <select
                      value={formNullHandling}
                      onChange={(e) => setFormNullHandling(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded px-3 py-1.5 bg-slate-50 text-slate-800 outline-hidden cursor-pointer font-medium"
                    >
                      <option value="候选缺失按 0 分">候选缺失按 0 分 (一票否决)</option>
                      <option value="不参与计算">不参与计算 (权重均摊到其他有值项)</option>
                      <option value="设为默认中位值">设为默认中位值 (不扣分)</option>
                      <option value="按50%算分">缺失按默认 50% 基础分退让</option>
                    </select>
                  </div>
                </div>

                {/* Score Switch and Weight */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                  <div className="flex items-center space-x-4 py-2">
                    <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={formIsScoreActive}
                        onChange={(e) => setFormIsScoreActive(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>参与二阶段相似度加权评分</span>
                    </label>

                    <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={formIsFilterCondition}
                        onChange={(e) => setFormIsFilterCondition(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>作为严格过滤一票否决条件 (Filter)</span>
                    </label>
                  </div>

                  {formIsScoreActive && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        评分加权权重 (%) *
                      </label>
                      <div className="flex items-center space-x-2">
                        <input 
                          type="number"
                          value={formWeight}
                          onChange={(e) => setFormWeight(Number(e.target.value))}
                          min={1}
                          max={100}
                          className="w-24 text-xs border border-slate-200 rounded px-3 py-1.5 font-bold outline-hidden focus:ring-1 focus:ring-blue-500"
                          required
                        />
                        <span className="text-xs text-slate-500">权重会影响整体配平 (当前剩余可分配权重: {100 - weightSummary.total + (editingRule ? editingRule.weight : 0)}%)</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Card 2: Unit Catalog Selection & Calculator (ONLY for NUMBER_WITH_UNIT) */}
              {formFieldType === '带单位数值 (NUMBER_WITH_UNIT)' && (
                <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4 border-l-4 border-l-blue-600">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h3 className="text-sm font-bold text-slate-800">
                      第二部分：测量量与 SI 基准单位转换配置
                    </h3>
                    <span className="text-[10px] text-slate-400 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded font-mono">
                      Unit Catalog v1.0
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    
                    {/* Measurement Category */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">物理测量量选择 (Quantity)</label>
                      <select
                        value={formUnitFamily}
                        onChange={(e) => handleQuantityChange(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded px-3 py-1.5 bg-slate-50 text-slate-800 outline-hidden cursor-pointer font-bold"
                      >
                        {mockUnitCatalog.quantities.map(q => (
                          <option key={q.code} value={q.name}>{q.name} ({q.code})</option>
                        ))}
                      </select>
                    </div>

                    {/* SI Base Unit */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">SI 国际标定基准单位 (Base Unit - 只读)</label>
                      <input 
                        type="text"
                        value={formBaseUnit}
                        disabled
                        className="w-full text-xs border border-slate-200 rounded px-3 py-1.5 bg-slate-100 text-slate-500 font-bold font-mono outline-hidden cursor-not-allowed"
                      />
                    </div>

                    {/* Display Unit selection */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">首选显示配置单位 (Display Unit)</label>
                      <select
                        value={formDisplayUnit}
                        onChange={(e) => setFormDisplayUnit(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded px-3 py-1.5 bg-slate-50 text-slate-800 font-bold outline-hidden cursor-pointer"
                      >
                        {currentQuantityData?.units.map(u => (
                          <option key={u.code} value={u.code}>{u.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Unit conversion specifications table */}
                  <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200">
                    <span className="text-[11px] font-bold text-slate-700 block mb-2">
                      量纲单位转换目录：基准值 = 输入值 × scale + offset
                    </span>
                    <table className="w-full text-left text-[11px] border-collapse bg-white border border-slate-200/80 rounded">
                      <thead>
                        <tr className="bg-slate-100/50 text-slate-500 font-semibold border-b border-slate-200">
                          <th className="px-3 py-1.5">单位编码</th>
                          <th className="px-3 py-1.5">显示名称</th>
                          <th className="px-3 py-1.5 text-center font-mono">换算系数 (scale)</th>
                          <th className="px-3 py-1.5 text-center font-mono">温度偏置 (offset)</th>
                          <th className="px-3 py-1.5">物理换算范例说明</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150">
                        {currentQuantityData?.units.map((u) => {
                          const isSelected = u.code === formDisplayUnit;
                          return (
                            <tr key={u.code} className={isSelected ? 'bg-blue-50/50 font-semibold text-blue-900' : 'text-slate-600'}>
                              <td className="px-3 py-1.5 font-mono">{u.code}</td>
                              <td className="px-3 py-1.5">{u.name}</td>
                              <td className="px-3 py-1.5 text-center font-mono">{u.scale}</td>
                              <td className="px-3 py-1.5 text-center font-mono">{u.offset}</td>
                              <td className="px-3 py-1.5 text-slate-500">
                                {`100 ${u.code} = 100 × ${u.scale} + ${u.offset} = ${(100 * u.scale + u.offset).toFixed(3)} ${currentQuantityData.baseUnit}`}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {/* Interactive conversion calculator */}
                    <div className="mt-4 bg-blue-50/50 border border-blue-100 rounded-lg p-3 flex flex-wrap items-center gap-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-blue-800">实时换算公式模拟器:</span>
                        <input 
                          type="number"
                          value={calcInput}
                          onChange={(e) => setCalcInput(e.target.value)}
                          className="w-20 text-xs border border-blue-200 rounded px-2.5 py-1 bg-white font-mono text-center outline-hidden"
                        />
                        <span className="text-xs font-bold text-slate-700">{formDisplayUnit}</span>
                      </div>
                      
                      <div className="text-xs text-slate-500">
                        →
                      </div>

                      <div className="text-xs text-slate-800 flex items-center space-x-1.5">
                        <span className="bg-slate-200 px-2 py-0.5 rounded font-mono font-semibold">
                          {calcResult.formula}
                        </span>
                        <span className="text-blue-700 font-bold">
                          (基准比分值: {calcResult.value})
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Card 3: Dynamic matching config based on matchType */}
              <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
                  第三部分：规则算法配置与动态阈值参数
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Match Type Select */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">比对匹配算法种类</label>
                    <select
                      value={formMatchTypeState}
                      onChange={(e) => setFormMatchTypeState(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded px-3 py-1.5 bg-slate-50 text-slate-800 font-bold outline-hidden cursor-pointer"
                    >
                      <option value="精确值匹配">精确值匹配 (EXACT)</option>
                      {formFieldType === '带单位数值 (NUMBER_WITH_UNIT)' && (
                        <>
                          <option value="数值容差匹配">数值容差匹配 (NUMERIC_TOLERANCE)</option>
                          <option value="数值距离衰减">数值距离衰减 (NUMERIC_DECAY)</option>
                        </>
                      )}
                      {formFieldType === '数值 (NUMBER)' && (
                        <>
                          <option value="数值容差匹配">数值容差匹配 (NUMERIC_TOLERANCE)</option>
                          <option value="数值距离衰减">数值距离衰减 (NUMERIC_DECAY)</option>
                        </>
                      )}
                      {formFieldType === '长文本 (LONG_TEXT)' && (
                        <option value="文本相似匹配 (非 AI)">文本相似匹配 (非 AI)</option>
                      )}
                      {formFieldType === '分类树 (CLASS_TREE)' && (
                        <option value="层级关系匹配">层级关系匹配 (NATIVE_HIERARCHY)</option>
                      )}
                    </select>
                  </div>
                </div>

                {/* Sub-panels for dynamic matchType parameters */}
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  
                  {/* PANEL 1: Exact Match */}
                  {formMatchTypeState === '精确值匹配' && (
                    <div className="text-xs text-slate-500 space-y-1">
                      <p className="font-bold text-slate-700 mb-1">精确等值算法 (EXACT)</p>
                      <p>● 源属性值与目标属性值在转换为相同单位后必须绝对等值 (如 10mm 与 1cm 相同)。</p>
                      <p>● 适用于离散螺距、螺栓表面处理、物料大类、标准件级别等无浮动公差的强规则约束。</p>
                    </div>
                  )}

                  {/* PANEL 2: Numeric Tolerance */}
                  {formMatchTypeState === '数值容差匹配' && (
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2 border-b border-slate-200/50 pb-2">
                        <span className="text-xs font-bold text-slate-800">数值区间绝对/百分比偏差容差比对参数</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Tolerance Type */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">容差类型</label>
                          <select
                            value={paramNumToleranceType}
                            onChange={(e) => setParamNumToleranceType(e.target.value as any)}
                            className="w-full text-xs border border-slate-200 rounded px-2.5 py-1 bg-white text-slate-800 outline-hidden font-medium cursor-pointer"
                          >
                            <option value="ABSOLUTE">绝对数值偏差 (ABSOLUTE)</option>
                            <option value="PERCENTAGE">百分比相对偏差 (PERCENTAGE)</option>
                          </select>
                        </div>

                        {/* Tolerance Value */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">容差偏差最大限制</label>
                          <div className="relative">
                            <input 
                              type="number"
                              value={paramNumToleranceVal}
                              onChange={(e) => setParamNumToleranceVal(Number(e.target.value))}
                              step={0.01}
                              className="w-full text-xs border border-slate-200 rounded pl-2.5 pr-8 py-1 bg-white font-bold outline-hidden"
                            />
                            <span className="text-[10px] text-slate-400 font-mono absolute right-2.5 top-1.5">
                              {paramNumToleranceType === 'PERCENTAGE' ? '%' : formDisplayUnit}
                            </span>
                          </div>
                        </div>

                        {/* Tolerance Direction */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">偏差约束方向</label>
                          <select
                            value={paramNumToleranceDirection}
                            onChange={(e) => setParamNumToleranceDirection(e.target.value as any)}
                            className="w-full text-xs border border-slate-200 rounded px-2.5 py-1 bg-white text-slate-800 outline-hidden font-medium cursor-pointer"
                          >
                            <option value="BOTH">双向偏离对称比对 (BOTH)</option>
                            <option value="HIGHER">仅限偏高误差退让 (HIGHER)</option>
                            <option value="LOWER">仅限偏低误差退让 (LOWER)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PANEL 3: Numeric Decay */}
                  {formMatchTypeState === '数值距离衰减' && (
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2 border-b border-slate-200/50 pb-2">
                        <span className="text-xs font-bold text-slate-800">数值距离连续线性得分衰减比对参数</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Decay Full score */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">无损得分偏差极限</label>
                          <div className="relative">
                            <input 
                              type="number"
                              value={paramDecayFullScore}
                              onChange={(e) => setParamDecayFullScore(Number(e.target.value))}
                              step={0.01}
                              className="w-full text-xs border border-slate-200 rounded pl-2.5 pr-8 py-1 bg-white font-bold outline-hidden"
                            />
                            <span className="text-[10px] text-slate-400 font-mono absolute right-2.5 top-1.5">{formDisplayUnit}</span>
                          </div>
                          <span className="text-[10px] text-slate-400">小于等于此偏差，仍获100分</span>
                        </div>

                        {/* Decay zero boundary */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">极限零分偏差边界</label>
                          <div className="relative">
                            <input 
                              type="number"
                              value={paramDecayZeroBoundary}
                              onChange={(e) => setParamDecayZeroBoundary(Number(e.target.value))}
                              step={0.1}
                              className="w-full text-xs border border-slate-200 rounded pl-2.5 pr-8 py-1 bg-white font-bold outline-hidden"
                            />
                            <span className="text-[10px] text-slate-400 font-mono absolute right-2.5 top-1.5">{formDisplayUnit}</span>
                          </div>
                          <span className="text-[10px] text-slate-400">大于等于此偏差，直接得0分</span>
                        </div>

                        {/* Decay Direction */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">衰减适用偏离方向</label>
                          <select
                            value={paramDecayDirection}
                            onChange={(e) => setParamDecayDirection(e.target.value as any)}
                            className="w-full text-xs border border-slate-200 rounded px-2.5 py-1 bg-white text-slate-800 outline-hidden font-medium cursor-pointer"
                          >
                            <option value="BOTH">双向误差对称衰减 (BOTH)</option>
                            <option value="HIGHER">仅支持偏高属性算分 (HIGHER)</option>
                            <option value="LOWER">仅支持偏低属性算分 (LOWER)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PANEL 4: Text Similarity */}
                  {formMatchTypeState === '文本相似匹配 (非 AI)' && (
                    <div className="space-y-3">
                      <span className="text-xs font-bold text-slate-800 block">
                        基于字词匹配率的非智能文本比分策略 (TEXT_SIMILARITY)
                      </span>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">最低匹配字比率限制 (%)</label>
                        <div className="flex items-center space-x-2">
                          <input 
                            type="number"
                            value={paramMinTextThreshold}
                            onChange={(e) => setParamMinTextThreshold(Number(e.target.value))}
                            min={10}
                            max={100}
                            className="w-24 text-xs border border-slate-200 rounded px-2.5 py-1 bg-white font-bold outline-hidden"
                          />
                          <span className="text-xs text-slate-500">低于此匹配字比率，得分直接判为 0</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PANEL 5: Native Hierarchy */}
                  {formMatchTypeState === '层级关系匹配' && (
                    <div className="space-y-4">
                      <span className="text-xs font-bold text-slate-800 block">PLM原生树层级距离扣分规则</span>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">最大允许层级差</label>
                          <input 
                            type="number"
                            value={paramHierarchyMaxDiff}
                            onChange={(e) => setParamHierarchyMaxDiff(Number(e.target.value))}
                            className="w-full text-xs border border-slate-200 rounded px-2.5 py-1 bg-white font-bold outline-hidden"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">关系约束</label>
                          <select
                            value={paramHierarchyRequirement}
                            onChange={(e) => setParamHierarchyRequirement(e.target.value as any)}
                            className="w-full text-xs border border-slate-200 rounded px-2.5 py-1 bg-white text-slate-800 outline-hidden font-medium cursor-pointer"
                          >
                            <option value="ANCESTOR_DESCENDANT">祖先-子孙关系均可算分</option>
                            <option value="PARENT_CHILD">仅限直接父子关系</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">层级递增每层扣除分数</label>
                          <input 
                            type="number"
                            value={paramHierarchyDeduction}
                            onChange={(e) => setParamHierarchyDeduction(Number(e.target.value))}
                            className="w-full text-xs border border-slate-200 rounded px-2.5 py-1 bg-white font-bold outline-hidden"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Card 4: Action reasoning template tags */}
              <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
                  第四部分：业务语义命中间隙原因说明模板
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">命中原因反馈提示模板</label>
                    <textarea 
                      value={formHitReasonTemplate}
                      onChange={(e) => setFormHitReasonTemplate(e.target.value)}
                      placeholder="例如：直径完全匹配，源[{source_val}mm] 与 候选[{target_val}mm] 一致。"
                      rows={3}
                      className="w-full text-xs border border-slate-200 rounded p-2.5 outline-hidden focus:ring-1 focus:ring-blue-500 font-sans"
                    />
                    <span className="text-[10px] text-slate-400">可用占位符: {'{source_val}'}, {'{target_val}'}, {'{diff_val}'}, {'{score}'}</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">差异标注原因反馈提示模板</label>
                    <textarea 
                      value={formDiffFieldsTemplate}
                      onChange={(e) => setFormDiffFieldsTemplate(e.target.value)}
                      placeholder="例如：规格描述不一致，原：{source_val} 候选：{target_val}"
                      rows={3}
                      className="w-full text-xs border border-slate-200 rounded p-2.5 outline-hidden focus:ring-1 focus:ring-blue-500 font-sans"
                    />
                    <span className="text-[10px] text-slate-400">可用占位符: {'{source_val}'}, {'{target_val}'}</span>
                  </div>
                </div>
              </div>

              {/* Hidden Actions for submit */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => { setEditingRule(null); setIsNew(false); }}
                  className="px-4 py-2 border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 rounded text-xs font-bold transition-colors cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  确认保存变更
                </button>
              </div>
            </form>
          </div>

          {/* Right-Side Instant Preview Panel (即时试算卡片) */}
          <div className="w-80 border-l border-slate-200 bg-white overflow-y-auto p-5 shrink-0 space-y-5">
            <h3 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center space-x-1.5">
              <SlidersHorizontal className="w-4 h-4 text-blue-600" />
              <span>所选算法即时算分反馈</span>
            </h3>

            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-3.5">
              <span className="text-[11px] font-bold text-slate-600 block">
                输入比对模拟数值 (自适应当前配置)
              </span>

              {/* Source val */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-1">源物理属性数值 (Source Value)</label>
                <div className="relative">
                  <input 
                    type="text"
                    value={previewSrcVal}
                    onChange={(e) => setPreviewSrcVal(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded px-2.5 py-1 bg-white font-mono"
                  />
                  <span className="text-[10px] text-slate-400 font-mono absolute right-2.5 top-1.5">
                    {formFieldType === '带单位数值 (NUMBER_WITH_UNIT)' ? formDisplayUnit : ''}
                  </span>
                </div>
              </div>

              {/* Target val */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-1">候选件对比属性数值 (Target Value)</label>
                <div className="relative">
                  <input 
                    type="text"
                    value={previewTgtVal}
                    onChange={(e) => setPreviewTgtVal(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded px-2.5 py-1 bg-white font-mono"
                  />
                  <span className="text-[10px] text-slate-400 font-mono absolute right-2.5 top-1.5">
                    {formFieldType === '带单位数值 (NUMBER_WITH_UNIT)' ? formDisplayUnit : ''}
                  </span>
                </div>
              </div>

              {/* Real-time score calculator feedback */}
              <div className="pt-2 border-t border-slate-200 flex flex-col items-center">
                <span className="text-[10px] text-slate-400 block font-semibold mb-1">即时比算匹配结果得分</span>
                <div className="flex items-baseline space-x-1 justify-center">
                  <span className={`text-4xl font-black font-mono ${realTimePreviewScore > 80 ? 'text-emerald-600' : realTimePreviewScore > 50 ? 'text-blue-600' : 'text-red-500'}`}>
                    {realTimePreviewScore}
                  </span>
                  <span className="text-xs text-slate-400 font-semibold">/ 100 分</span>
                </div>
              </div>
            </div>

            {/* Instruction about calculated formula process */}
            <div className="text-[11px] text-slate-500 leading-normal space-y-2">
              <span className="font-bold text-slate-700 block">换算说明：</span>
              <p>1. 如果是“带单位数值”，算分前将根据单位目录先将输入的换算单位，均统一折算至底层 SI 标准基准物理量再进行偏差或距离计算。</p>
              <p>2. 数值距离衰减和容差均是在基准物理量数值（如米、伏、开尔文）的基础上进行差值容差判断。</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
