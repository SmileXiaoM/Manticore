import React, { useState, useMemo, useRef, useEffect } from 'react';
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
import { FieldSimilarityRule, ObjectType, MatchConfig, ChangeRecord, isObjectRulesModified } from '../types';
import { stage1MappedFields, mockUnitCatalog, convertToBaseUnit, convertFromBaseUnit } from '../data';

interface FieldSimilarityViewProps {
  editingRules: FieldSimilarityRule[];
  onUpdateEditingRules: (newRules: FieldSimilarityRule[]) => void;
  savedRules: FieldSimilarityRule[];
  onUpdateSavedRules: (newRules: FieldSimilarityRule[]) => void;
  activeRules: FieldSimilarityRule[];
  onUpdateActiveRules: (newRules: FieldSimilarityRule[]) => void;
  changeRecords: ChangeRecord[];
  onUpdateChangeRecords: (newRecords: ChangeRecord[]) => void;
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
  activeObjectType?: ObjectType;
  setActiveObjectType?: (type: ObjectType) => void;
}

const getAllowedMatchTypes = (fieldType: string): string[] => {
  const typeUpper = (fieldType || '').toUpperCase();
  if (typeUpper.includes('LONG_TEXT')) {
    return ['精确值匹配', '文本相似匹配 (非 AI)'];
  }
  if (typeUpper.includes('TEXT')) {
    return ['精确值匹配'];
  }
  if (typeUpper.includes('ENUM')) {
    return ['精确值匹配'];
  }
  if (typeUpper.includes('NUMBER')) {
    return ['精确值匹配', '数值容差匹配', '数值距离衰减'];
  }
  if (typeUpper.includes('DATE')) {
    return ['精确值匹配'];
  }
  if (typeUpper.includes('CLASS_TREE')) {
    return ['精确值匹配', '层级关系匹配'];
  }
  return ['精确值匹配'];
};

const getDefaultMatchType = (fieldType: string): string => {
  return '精确值匹配';
};

const getFieldEligibility = (
  field: any,
  objectType: string,
  editingRules: any[],
  currentRuleId?: string
): { eligible: boolean; reason?: string } => {
  if (field.objectType !== objectType) {
    return { eligible: false, reason: '对象类型不匹配' };
  }
  if (field.enabled !== true) {
    return { eligible: false, reason: '字段已停用' };
  }
  if (field.indexStatus !== '已索引') {
    return { eligible: false, reason: '未索引' };
  }
  const supportedTypes = [
    '文本 (TEXT)',
    '长文本 (LONG_TEXT)',
    '枚举 (ENUM)',
    '数值 (NUMBER)',
    '带单位数值 (NUMBER_WITH_UNIT)',
    '日期 (DATE)',
    '分类树 (CLASS_TREE)'
  ];
  if (!supportedTypes.includes(field.businessFieldType)) {
    return { eligible: false, reason: '字段类型暂不支持' };
  }
  const hasDuplicate = editingRules.some(
    rule =>
      rule.objectType === objectType &&
      rule.propertyCode === field.fieldCode &&
      rule.id !== currentRuleId
  );
  if (hasDuplicate) {
    return { eligible: false, reason: '当前对象已配置' };
  }
  return { eligible: true };
};

export const FieldSimilarityView: React.FC<FieldSimilarityViewProps> = ({
  editingRules,
  onUpdateEditingRules,
  savedRules,
  onUpdateSavedRules,
  activeRules,
  onUpdateActiveRules,
  changeRecords,
  onUpdateChangeRecords,
  objectConfigStatus,
  onUpdateConfigStatus,
  onNavigate,
  activeObjectType: propActiveObjectType,
  setActiveObjectType: propSetActiveObjectType
}) => {
  // Active ObjectType Selector Context (Default: PART_MECHANICAL)
  const [localActiveObjectType, localSetActiveObjectType] = useState<ObjectType>('PART_MECHANICAL');
  const activeObjectType = propActiveObjectType || localActiveObjectType;
  const setActiveObjectType = propSetActiveObjectType || localSetActiveObjectType;

  // Editor state
  const [editingRule, setEditingRule] = useState<FieldSimilarityRule | null>(null);
  const [isNew, setIsNew] = useState(false);

  // Filters State
  const [filterFieldName, setFilterFieldName] = useState('');
  const [filterIsScoreActive, setFilterIsScoreActive] = useState<string>('ALL');
  const [filterMatchType, setFilterMatchType] = useState<string>('ALL');

  // Form State variables
  const [formFieldName, setFormFieldName] = useState('');
  const [formPropertyCode, setFormPropertyCode] = useState('');
  const [formFieldType, setFormFieldType] = useState<string>('带单位数值 (NUMBER_WITH_UNIT)');
  const [formWeight, setFormWeight] = useState<number>(15);
  const [formMatchTypeState, setFormMatchTypeState] = useState<string>('数值容差匹配');
  const [formNullHandling, setFormNullHandling] = useState<string>('候选缺失按 0 分');
  const [formIsScoreActive, setFormIsScoreActive] = useState<boolean>(true);
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

  // Searchable Unit dropdown states
  const [unitSearchText, setUnitSearchText] = useState<string>('');
  const [isUnitDropdownOpen, setIsUnitDropdownOpen] = useState<boolean>(false);

  // Load selected Unit Quantity units
  const currentQuantityData = useMemo(() => {
    return mockUnitCatalog.quantities.find(q => q.code === formUnitFamily || q.name === formUnitFamily);
  }, [formUnitFamily]);

  // Object types display map
  const objectTypeNameMap: Record<string, string> = {
    'PART_MECHANICAL': '机械零件 (PART_MECHANICAL)',
    'PART_ELECTRICAL': '电气元器件 (PART_ELECTRICAL)',
    'PART_HYDRAULIC': '液压元件 (PART_HYDRAULIC)',
    'PART_PNEUMATIC': '气动元件 (PART_PNEUMATIC)',
    'PART_OPTICAL': '光学元件 (PART_OPTICAL)'
  };

  // Find mapped fields for selection dropdown
  const availableFields = useMemo(() => {
    return stage1MappedFields.filter(f => f.objectType === activeObjectType);
  }, [activeObjectType]);

  const handleFieldChange = (fieldCode: string) => {
    const selectedField = availableFields.find(f => f.fieldCode === fieldCode);
    if (selectedField) {
      const fieldType = selectedField.businessFieldType;
      setFormFieldName(selectedField.displayName);
      setFormPropertyCode(selectedField.fieldCode);
      setFormFieldType(fieldType);

      // Reset Match Type to default
      const defMatch = getDefaultMatchType(fieldType);
      setFormMatchTypeState(defMatch);

      // Reset matchConfig dynamic parameters
      setParamMinTextThreshold(60);
      setParamNumToleranceType('ABSOLUTE');
      setParamNumToleranceVal(0.2);
      setParamNumToleranceDirection('BOTH');
      setParamDecayFullScore(0.1);
      setParamDecayZeroBoundary(1.0);
      setParamDecayDirection('BOTH');
      setParamHierarchyMaxDiff(3);
      setParamHierarchyRequirement('ANCESTOR_DESCENDANT');
      setParamHierarchyDeduction(5);
      setParamDateToleranceVal(7);
      setParamDateToleranceUnit('DAY');
      setParamDateToleranceDirection('BOTH');

      // Reset units
      if (fieldType === '带单位数值 (NUMBER_WITH_UNIT)') {
        setFormUnitFamily(selectedField.unitFamily);
        setFormBaseUnit(selectedField.baseUnit);

        // Find default display unit from selectedField or catalog
        if (selectedField.displayUnit) {
          setFormDisplayUnit(selectedField.displayUnit);
        } else {
          const quant = mockUnitCatalog.quantities.find(q => q.name === selectedField.unitFamily || q.code === selectedField.unitFamily);
          if (quant && quant.units.length > 0) {
            setFormDisplayUnit(quant.units[0].code);
          }
        }
      } else {
        setFormUnitFamily('无');
        setFormBaseUnit('无');
        setFormDisplayUnit('无');
      }

      // Reset interactive simulator values synchronously to avoid DATE warning on render
      const typeUpper = (fieldType || '').toUpperCase();
      if (typeUpper.includes('DATE') || fieldType.includes('日期')) {
        setPreviewSrcVal('2026-01-01');
        setPreviewTgtVal('2026-01-15');
      } else if (typeUpper.includes('CLASS_TREE') || fieldType.includes('层级')) {
        setPreviewSrcVal('/电子元器件/继电器/直流继电器');
        setPreviewTgtVal('/电子元器件/继电器');
      } else if (typeUpper.includes('ENUM') || fieldType.includes('枚举')) {
        setPreviewSrcVal('有效');
        setPreviewTgtVal('待发布');
      } else if (typeUpper.includes('TEXT') || fieldType.includes('文本')) {
        setPreviewSrcVal('Manticore');
        setPreviewTgtVal('Manticore Pro');
      } else {
        setPreviewSrcVal('10.0');
        setPreviewTgtVal('10.2');
      }
    } else {
      setFormFieldName('');
      setFormPropertyCode('');
      setFormFieldType('文本 (TEXT)');
      setFormMatchTypeState('精确值匹配');
      setFormUnitFamily('无');
      setFormBaseUnit('无');
      setFormDisplayUnit('无');

      setPreviewSrcVal('Manticore');
      setPreviewTgtVal('Manticore Pro');
    }
  };

  const isCurrentTypeEnabled = useMemo(() => {
    return objectConfigStatus[activeObjectType]?.enabled ?? false;
  }, [objectConfigStatus, activeObjectType]);

  const isEditingModified = useMemo(() => {
    return isObjectRulesModified(editingRules, savedRules, activeObjectType);
  }, [editingRules, savedRules, activeObjectType]);

  // Weight summary check for EDITING rules
  const weightSummary = useMemo(() => {
    const subset = editingRules.filter(r => r.objectType === activeObjectType);
    const scoreRules = subset.filter(r => r.isScoreActive);
    const total = scoreRules.reduce((sum, r) => sum + r.weight, 0);
    const detailList = scoreRules.map(r => `${r.fieldName}(${r.weight}%)`);
    const details = detailList.length > 0 ? detailList.join(' + ') : '无';
    return {
      total,
      details,
      isValid: total === 100,
      scoreCount: scoreRules.length
    };
  }, [editingRules, activeObjectType]);

  // Saved rules weight summary
  const savedWeightSummary = useMemo(() => {
    const subset = savedRules.filter(r => r.objectType === activeObjectType);
    const scoreRules = subset.filter(r => r.isScoreActive);
    const total = scoreRules.reduce((sum, r) => sum + r.weight, 0);
    return {
      total,
      isValid: total === 100,
      scoreCount: scoreRules.length
    };
  }, [savedRules, activeObjectType]);

  // Object types available with counters
  const objectTypeOptions = [
    { value: 'PART_MECHANICAL', label: '机械零件 (PART_MECHANICAL)' },
    { value: 'PART_ELECTRICAL', label: '电气元器件 (PART_ELECTRICAL)' },
    { value: 'PART_HYDRAULIC', label: '液压元件 (PART_HYDRAULIC)' },
    { value: 'PART_PNEUMATIC', label: '气动元件 (PART_PNEUMATIC)' },
    { value: 'PART_OPTICAL', label: '光学元件 (PART_OPTICAL)' }
  ];

  // Search input and selector filtering based on EDITING rules
  const filteredRules = useMemo(() => {
    return editingRules.filter(r => {
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

      // Filter by Match Type
      if (filterMatchType !== 'ALL') {
        if (r.matchType !== filterMatchType) return false;
      }

      return true;
    }).sort((a, b) => a.propertyCode.localeCompare(b.propertyCode));
  }, [editingRules, activeObjectType, filterFieldName, filterIsScoreActive, filterMatchType]);

  // Reset Filters
  const handleResetFilters = () => {
    setFilterFieldName('');
    setFilterIsScoreActive('ALL');
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

  // 保存配置
  const handleSaveCurrentConfig = () => {
    const operatorName = '李晓华 (数据标准管理员)';
    const timeStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const objectLabel = objectTypeNameMap[activeObjectType] || activeObjectType;
    const currentConf = objectConfigStatus[activeObjectType] || { enabled: false, configVersion: 'v2.5.0', lastModifiedAt: '' };

    if (!weightSummary.isValid) {
      // 100% weight validation failed! Show alert & save log
      const failRecord: ChangeRecord = {
        id: `CR-F-${Date.now()}`,
        objectType: objectLabel,
        configVersion: currentConf.configVersion,
        operationType: '保存',
        summary: `保存配置失败。当前编辑中字段累计权重为 ${weightSummary.total}%，未能满足 100% 配平约束。`,
        operator: operatorName,
        time: timeStr,
        result: 'FAILED',
        failureReason: `参与评分字段权重合计为 ${weightSummary.total}%，不满足 100% 满分校验规则。`
      };
      onUpdateChangeRecords([failRecord, ...changeRecords]);
      alert(`保存失败！当前对象类型的评分项权重总和为 ${weightSummary.total}%，不等于 100%。\n请确保参与加权评分的字段权重合计精确等于 100% 才能保存！\n该失败记录已被审计归档。`);
      return;
    }

    // R9-BLK-02 Isolation: Only replace activeObjectType rules in savedRules
    const otherSavedRules = savedRules.filter(r => r.objectType !== activeObjectType);
    const currentEditingRules = editingRules.filter(r => r.objectType === activeObjectType);
    onUpdateSavedRules([...otherSavedRules, ...currentEditingRules]);

    const isEnabled = currentConf.enabled;
    if (isEnabled) {
      // R11-BLK-01: Also update activeRules (currently active snapshot)
      const otherActiveRules = activeRules.filter(r => r.objectType !== activeObjectType);
      onUpdateActiveRules([...otherActiveRules, ...currentEditingRules]);
    }

    // R9-BLK-04: Version increments on SAVE
    const nextVersion = incrementVersion(currentConf.configVersion);
    const nextStatus = {
      ...objectConfigStatus,
      [activeObjectType]: {
        ...currentConf,
        configVersion: nextVersion,
        lastModifiedAt: timeStr
      }
    };
    onUpdateConfigStatus(nextStatus);

    const successRecord: ChangeRecord = {
      id: `CR-S-${Date.now()}`,
      objectType: objectLabel,
      configVersion: nextVersion,
      operationType: '保存',
      summary: isEnabled
        ? `成功保存并同步当前启用配置。参与加权字段共 ${weightSummary.scoreCount} 个，权重累计达到 100%。`
        : `成功保存并校验属性相似度规则配置。参与加权字段共 ${weightSummary.scoreCount} 个，权重累计达到 100%。`,
      operator: operatorName,
      time: timeStr,
      result: 'SUCCESS'
    };
    onUpdateChangeRecords([successRecord, ...changeRecords]);

    if (isEnabled) {
      alert(`[ ${objectLabel} ] 已保存并同步当前启用配置！\n参与评分的字段权重合计为 100%，已通过合规校验。\n当前生效版本和已保存版本已同步升级至 ${nextVersion}。`);
    } else {
      alert(`[ ${objectLabel} ] 相似度配置保存成功！\n参与评分的字段权重合计为 100%，已通过合规校验。\n当前草稿版本已升级至 ${nextVersion}。\n您可以点击“启用”按钮使此最新配置生效。`);
    }
  };

  // 启用配置
  const handleEnableConfig = () => {
    const operatorName = '李晓华 (数据标准管理员)';
    const timeStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const objectLabel = objectTypeNameMap[activeObjectType] || activeObjectType;
    const currentConf = objectConfigStatus[activeObjectType] || { enabled: false, configVersion: 'v2.5.0', lastModifiedAt: '' };

    // R11-BLK-01: Idempotency check. If already enabled, return immediately without doing anything.
    if (currentConf.enabled) {
      return;
    }

    // Validate Saved Rules before enabling
    if (!savedWeightSummary.isValid) {
      const failRecord: ChangeRecord = {
        id: `CR-E-${Date.now()}`,
        objectType: objectLabel,
        configVersion: currentConf.configVersion,
        operationType: '启用',
        summary: `启用失败。已保存配置的累计权重为 ${savedWeightSummary.total}%，未能满足 100% 生效约束。`,
        operator: operatorName,
        time: timeStr,
        result: 'FAILED',
        failureReason: `已保存规则集权重之和不为 100%`
      };
      onUpdateChangeRecords([failRecord, ...changeRecords]);
      alert(`启用失败！已保存的配置权重总和为 ${savedWeightSummary.total}%，不满足 100% 强约束。\n请先配平权重、保存配置后再行启用。`);
      return;
    }

    // Promote savedRules to activeRules for activeObjectType
    const otherActiveRules = activeRules.filter(r => r.objectType !== activeObjectType);
    const promotedRules = savedRules.filter(r => r.objectType === activeObjectType);
    onUpdateActiveRules([...otherActiveRules, ...promotedRules]);

    // R9-BLK-04: Version does NOT increment on enable
    const nextStatus = {
      ...objectConfigStatus,
      [activeObjectType]: {
        enabled: true,
        configVersion: currentConf.configVersion,
        lastModifiedAt: timeStr
      }
    };
    onUpdateConfigStatus(nextStatus);

    const successRecord: ChangeRecord = {
      id: `CR-A-${Date.now()}`,
      objectType: objectLabel,
      configVersion: currentConf.configVersion,
      operationType: '启用',
      summary: `成功推广并启用最新相似度计算规则集。属性比分即时对业务应用端生效。`,
      operator: operatorName,
      time: timeStr,
      result: 'SUCCESS'
    };
    onUpdateChangeRecords([successRecord, ...changeRecords]);
    alert(`[ ${objectLabel} ] 属性相似度规则集已成功启用上线！\n当前生效版本为 ${currentConf.configVersion}。属性去重比分即时生效。`);
  };

  // 停用配置
  const handleDisableConfig = () => {
    const operatorName = '李晓华 (数据标准管理员)';
    const timeStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const objectLabel = objectTypeNameMap[activeObjectType] || activeObjectType;
    const currentConf = objectConfigStatus[activeObjectType] || { enabled: false, configVersion: 'v2.5.0', lastModifiedAt: '' };

    const nextStatus = {
      ...objectConfigStatus,
      [activeObjectType]: {
        ...currentConf,
        enabled: false,
        lastModifiedAt: timeStr
      }
    };
    onUpdateConfigStatus(nextStatus);

    const disableRecord: ChangeRecord = {
      id: `CR-D-${Date.now()}`,
      objectType: objectLabel,
      configVersion: currentConf.configVersion,
      operationType: '停用',
      summary: `下线停用属性比分计算，引擎暂停对业务端提供该类型属性去重的算分反馈。`,
      operator: operatorName,
      time: timeStr,
      result: 'SUCCESS'
    };
    onUpdateChangeRecords([disableRecord, ...changeRecords]);
    alert(`[ ${objectLabel} ] 属性相似度配置已成功下线停用！\n业务去重工作台将不再对该类型物料执行字段评分。`);
  };

  // Delete Rule
  const handleDeleteRule = (id: string) => {
    if (window.confirm('您确定要彻底删除该属性相似度比分规则吗？此操作将立即调整算分权重配平。')) {
      const updated = editingRules.filter(r => r.id !== id);
      onUpdateEditingRules(updated);
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
    setFormHitReasonTemplate(rule.hitReasonTemplate || '');
    setFormDiffFieldsTemplate(rule.diffFieldsTemplate || '');

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
    if ((rule.fieldType || '').toUpperCase().includes('DATE')) {
      setPreviewSrcVal('2026-01-01');
      setPreviewTgtVal('2026-01-15');
    } else {
      setPreviewSrcVal('10.0');
      setPreviewTgtVal('10.2');
    }
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
    const typeUpper = (formFieldType || '').toUpperCase();
    const isDateField = typeUpper.includes('DATE') || formFieldType.includes('日期');
    const isClassTree = typeUpper.includes('CLASS_TREE') || formFieldType.includes('层级');
    const isEnumField = typeUpper.includes('ENUM') || formFieldType.includes('枚举');

    if (isDateField) {
      const t1 = new Date(previewSrcVal).getTime();
      const t2 = new Date(previewTgtVal).getTime();
      if (isNaN(t1) || isNaN(t2)) return 0;
      const diffMs = t2 - t1;
      const factor = paramDateToleranceUnit === 'DAY' ? (1000 * 60 * 60 * 24) : (1000 * 60 * 60);
      const diff = diffMs / factor;

      if (paramDateToleranceDirection === 'HIGHER' && diff < 0) return 0;
      if (paramDateToleranceDirection === 'LOWER' && diff > 0) return 0;

      return Math.abs(diff) <= paramDateToleranceVal ? 100 : 0;
    }

    if (isClassTree) {
      const p1 = String(previewSrcVal).replace(/^\/|\/$/g, '').split('/');
      const p2 = String(previewTgtVal).replace(/^\/|\/$/g, '').split('/');

      let c = 0;
      const limit = Math.min(p1.length, p2.length);
      for (let i = 0; i < limit; i++) {
        if (p1[i] === p2[i]) {
          c++;
        } else {
          break;
        }
      }

      const refDist = p1.length - c;
      const candDist = p2.length - c;
      const gap = refDist + candDist;

      if (paramHierarchyRequirement === 'PARENT_CHILD') {
        const isParentChild = (refDist === 1 && candDist === 0) || (refDist === 0 && candDist === 1);
        if (!isParentChild) return 0;
      } else if (paramHierarchyRequirement === 'ANCESTOR_DESCENDANT') {
        const isAncestorDescendant = (refDist === 0 || candDist === 0);
        if (!isAncestorDescendant) return 0;
      }

      if (gap > paramHierarchyMaxDiff) {
        return 0;
      }

      const score = 100 - (gap * paramHierarchyDeduction);
      return Math.max(0, Math.min(100, Math.round(score)));
    }

    if (isEnumField) {
      return previewSrcVal.trim() === previewTgtVal.trim() ? 100 : 0;
    }

    const srcNum = parseFloat(previewSrcVal);
    const tgtNum = parseFloat(previewTgtVal);

    if (formMatchTypeState === '精确值匹配') {
      return previewSrcVal.trim() === previewTgtVal.trim() ? 100 : 0;
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

    return 100;
  }, [
    formFieldType, formMatchTypeState, previewSrcVal, previewTgtVal,
    paramMinTextThreshold, paramNumToleranceType, paramNumToleranceVal, paramNumToleranceDirection,
    paramDecayFullScore, paramDecayZeroBoundary, paramDecayDirection,
    paramHierarchyRequirement, paramHierarchyMaxDiff, paramHierarchyDeduction,
    paramDateToleranceUnit, paramDateToleranceDirection, paramDateToleranceVal
  ]);

  // Handle Form Submit
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formFieldName.trim() || !formPropertyCode.trim()) {
      alert('请完整填写字段名称与属性编码！');
      return;
    }

    // Defensive Check: Field eligibility validation
    const targetField = stage1MappedFields.find(f => f.fieldCode === formPropertyCode && f.objectType === activeObjectType);
    if (!targetField) {
      alert('保存失败！一阶段中未找到该属性映射字段。');
      return;
    }

    const eligibility = getFieldEligibility(targetField, activeObjectType, editingRules, editingRule?.id);
    if (!eligibility.eligible) {
      alert(`保存失败！字段【${targetField.displayName}】一阶段资质校验未通过，原因：${eligibility.reason}。`);
      return;
    }

    // Validate compatibility of field type and match type
    const allowedMatchTypes = getAllowedMatchTypes(formFieldType);
    if (!allowedMatchTypes.includes(formMatchTypeState)) {
      alert(`保存失败！字段类型与匹配方式不兼容，请重新选择匹配方式。字段类型: ${formFieldType}, 匹配方式: ${formMatchTypeState}`);
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

    // Defensive check: matchType must match matchConfig.kind
    const kindMap: Record<string, string> = {
      '精确值匹配': 'EXACT',
      '文本相似匹配 (非 AI)': 'TEXT_SIMILARITY',
      '数值容差匹配': 'NUMERIC_TOLERANCE',
      '数值距离衰减': 'NUMERIC_DECAY',
      '层级关系匹配': 'NATIVE_HIERARCHY',
      '日期容差匹配': 'DATE_TOLERANCE'
    };

    if (kindMap[formMatchTypeState] !== matchConfig.kind) {
      alert(`保存失败！算法配置内部不一致：匹配方式为 [${formMatchTypeState}] 但算法内部类型为 [${matchConfig.kind}]，请重新确认！`);
      return;
    }

    // Ensure unit details are cleaned up if plain number
    const finalFieldType = formFieldType;
    const isUnitType = finalFieldType === '带单位数值 (NUMBER_WITH_UNIT)';

    if (isUnitType) {
      const activeUnits = currentQuantityData?.units.filter(u => !u.status || u.status === 'ACTIVE') || [];
      const isValidUnit = activeUnits.some(u => u.code === formDisplayUnit);
      if (!isValidUnit) {
        alert(`保存失败！首选显示配置单位 [${formDisplayUnit}] 在外部 JSON 单位目录中未找到或不处于 ACTIVE 状态。请选择有效单位！`);
        return;
      }
    }

    const updatedRule: FieldSimilarityRule = {
      id: isNew ? `F-00${editingRules.length + 1}` : (editingRule?.id || 'F-TMP'),
      objectType: activeObjectType,
      fieldName: formFieldName,
      propertyCode: formPropertyCode,
      fieldType: finalFieldType,
      weight: formIsScoreActive ? Number(formWeight) : 0,
      matchType: formMatchTypeState,
      nullHandling: formNullHandling,
      isScoreActive: formIsScoreActive,
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
      onUpdateEditingRules([...editingRules, updatedRule]);
    } else {
      onUpdateEditingRules(editingRules.map(r => r.id === updatedRule.id ? updatedRule : r));
    }

    setEditingRule(null);
    setIsNew(false);
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
            {isNew ? '新建字段相似度规则' : editingRule ? '配置相似度对比属性' : '属性相似度：字段规则管理'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            精准配平 Manticore 属性级多维度加权比分权重，自动适配度量衡单位转换及区间偏差退让评分。
          </p>
        </div>

        {/* Save & Reset Panel on top right */}
        {!(editingRule || isNew) && (
          <div className="flex items-center space-x-2">
            {isEditingModified && (
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
                  const performSwitch = () => {
                    setActiveObjectType(targetType);
                    // R20-UI-06: Reset all Form temporary states to prevent cross-contamination
                    setFormFieldName('');
                    setFormPropertyCode('');
                    setFormFieldType('文本 (TEXT)');
                    setFormWeight(10);
                    setFormMatchTypeState('精确值匹配');
                    setFormNullHandling('候选缺失按 0 分');
                    setFormIsScoreActive(true);
                    setFormHitReasonTemplate('');
                    setFormDiffFieldsTemplate('');
                    setFormUnitFamily('无');
                    setFormBaseUnit('无');
                    setFormDisplayUnit('无');
                    setPreviewSrcVal('Manticore');
                    setPreviewTgtVal('Manticore Pro');
                    setEditingRule(null);
                    setIsNew(false);
                  };

                  if (isEditingModified) {
                    if (window.confirm('当前配置存在未保存修改，切换对象类型将丢失并重置该类型的编辑草稿，是否确认切换？')) {
                      // Discard: restore current activeObjectType editingRules from savedRules
                      const otherEditingRules = editingRules.filter(r => r.objectType !== activeObjectType);
                      const restoredRules = savedRules.filter(r => r.objectType === activeObjectType);
                      onUpdateEditingRules([...otherEditingRules, ...restoredRules]);
                      performSwitch();
                    }
                  } else {
                    performSwitch();
                  }
                }}
                className="text-xs border border-slate-200 rounded-md px-3 py-1.5 bg-slate-50 text-slate-800 font-bold outline-hidden cursor-pointer"
              >
                {objectTypeOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Read-only Unit Catalog Source Details */}
            <div className="text-slate-400 text-[11px] font-medium flex items-center space-x-1.5 ml-auto" id="unit-catalog-status">
              <span>外部 JSON 单位目录:</span>
              <span className="text-slate-600 font-mono bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded font-bold">
                {mockUnitCatalog.catalogVersion} · 已加载
              </span>
            </div>
          </div>

          {/* New Compact 3-State Configuration Status Bar */}
          <div className="px-6 pt-3 shrink-0">
            <div className="bg-white border border-slate-200 rounded-lg px-4 py-2 flex flex-wrap items-center justify-between gap-4 text-xs shadow-xs" style={{ minHeight: '38px' }}>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 overflow-x-auto scrollbar-none">
                <span className="font-bold text-slate-700 flex items-center space-x-1 shrink-0">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-blue-500" />
                  <span>配置状态组:</span>
                </span>

                {/* Stage 1: 编辑中 */}
                <div className="flex items-center space-x-1.5 shrink-0 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1" title="编辑中 (Draft) 状态。增改规则仅在此暂存。">
                  <span className={`w-2 h-2 rounded-full ${isEditingModified ? 'bg-amber-500 animate-pulse' : 'bg-slate-300'}`}></span>
                  <span className="text-[11px] font-semibold text-slate-600">
                    编辑中: {isEditingModified ? '存在未保存草稿' : '草稿同步'}
                  </span>
                </div>

                {/* Stage 2: 已保存 */}
                <div className="flex items-center space-x-1.5 shrink-0 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1" title="已保存 (Saved) 状态。只有权重配平（=100%）的配置才能通过校验并保存。">
                  <span className={`w-2 h-2 rounded-full ${savedWeightSummary.isValid ? 'bg-emerald-500' : 'bg-rose-400'}`}></span>
                  <span className="text-[11px] font-semibold text-slate-600">
                    已保存: {savedWeightSummary.isValid ? `通过校验 (100%)` : `校验未过 (${savedWeightSummary.total}%)`}
                  </span>
                </div>

                {/* Stage 3: 生效中 */}
                <div className="flex items-center space-x-1.5 shrink-0 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1" title="当前生效 (Active) 状态。计算引擎执行此生效配置。">
                  <span className={`w-2 h-2 rounded-full ${isCurrentTypeEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></span>
                  <span className="text-[11px] font-semibold text-slate-600">
                    生效中: {isCurrentTypeEnabled ? '已全局启用' : '已停用'}
                  </span>
                </div>

                {/* Version & Mod Time */}
                <div className="text-slate-400 text-[11px] flex items-center space-x-2 shrink-0">
                  <span>|</span>
                  <span>配置版本: <strong className="font-mono text-slate-800 font-bold">{objectConfigStatus[activeObjectType]?.configVersion || 'v1.0.0'}</strong></span>
                  <span>|</span>
                  <span>变更时间: <strong className="font-mono text-slate-700">{objectConfigStatus[activeObjectType]?.lastModifiedAt || '无'}</strong></span>
                </div>
              </div>

              {/* Actions: Enable / Disable buttons */}
              <div className="flex items-center space-x-2 shrink-0 ml-auto">
                <button
                  onClick={handleEnableConfig}
                  disabled={isCurrentTypeEnabled || !savedWeightSummary.isValid}
                  className={`px-3 py-1 rounded text-xs font-bold border transition-all cursor-pointer ${
                    isCurrentTypeEnabled
                      ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
                      : !savedWeightSummary.isValid
                      ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700 hover:border-emerald-700 shadow-xs'
                  }`}
                  title={savedWeightSummary.isValid ? '将已保存的校验配置启用' : '已保存的规则集权重不足100%，无法启用'}
                >
                  启用
                </button>
                <button
                  onClick={handleDisableConfig}
                  disabled={!isCurrentTypeEnabled}
                  className={`px-3 py-1 rounded text-xs font-bold border transition-all cursor-pointer ${
                    !isCurrentTypeEnabled
                      ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-rose-50 border-rose-300 text-rose-700 hover:bg-rose-100 hover:border-rose-300 shadow-xs'
                  }`}
                >
                  停用
                </button>
              </div>
            </div>

            {/* Formula Expression */}
            <div className="mt-2 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-xs text-slate-600 flex items-center justify-between shadow-xs">
              <span className="font-semibold text-slate-700 shrink-0">属性级评分引擎公式:</span>
              <span className="font-mono text-slate-500 truncate max-w-4xl px-3 flex-1 text-left">{weightSummary.details}</span>
              <span className="text-slate-400 text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded font-mono font-semibold">
                Manticore Engine
              </span>
            </div>
          </div>

          {!editingRules.some(r => r.objectType === activeObjectType) ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50/50">
              <div className="max-w-md text-center p-6 bg-white border border-slate-200 rounded-xl shadow-xs space-y-4">
                <SlidersHorizontal className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-slate-800">该类型尚未配置相似度比分规则</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  当前对象分类 [{objectTypeNameMap[activeObjectType]}] 暂未定义任何属性相似度比分与过滤映射规则。您可以点击右上角的“添加字段规则”开始创建。
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
                          <th className="px-4 py-3 text-center">管理操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-sans">
                        {filteredRules.length > 0 ? (
                          filteredRules.map((rule) => {
                            const isScore = rule.isScoreActive;

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
                            <td colSpan={8} className="text-center py-10 text-slate-400">
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
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">

          {/* Main Scrollable editor */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">

            <form onSubmit={handleSaveForm} className="space-y-6">

              {/* Card 1: Base properties */}
              <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
                  第一部分：基础映射与类型区分
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  {/* Select Mapped Field Dropdown */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">选择一阶段已映射字段 *</label>
                    <select
                      value={formPropertyCode}
                      onChange={(e) => handleFieldChange(e.target.value)}
                      disabled={!isNew}
                      className={`w-full text-xs border border-slate-300 rounded px-3 py-1.5 text-slate-800 font-bold outline-hidden focus:ring-1 focus:ring-blue-500 ${
                        !isNew ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white cursor-pointer'
                      }`}
                      required
                    >
                      <option value="">-- 请选择一阶段已映射物理字段 --</option>
                      {availableFields.map(f => {
                        const eligibility = getFieldEligibility(f, activeObjectType, editingRules, editingRule?.id);
                        const labelSuffix = eligibility.eligible ? '' : ` [${eligibility.reason}]`;
                        return (
                          <option key={f.fieldCode} value={f.fieldCode} disabled={!eligibility.eligible}>
                            {f.displayName} ({f.fieldCode} - {f.businessFieldType}){labelSuffix}
                          </option>
                        );
                      })}
                    </select>
                    {!isNew ? (
                      (() => {
                        const originalField = stage1MappedFields.find(f => f.fieldCode === formPropertyCode && f.objectType === activeObjectType);
                        let originalFieldEligibleResult: { eligible: boolean; reason?: string } = { eligible: true, reason: '' };
                        if (originalField) {
                          originalFieldEligibleResult = getFieldEligibility(originalField, activeObjectType, editingRules, editingRule?.id);
                        } else {
                          originalFieldEligibleResult = { eligible: false, reason: '字段不存在' };
                        }

                        return !originalFieldEligibleResult.eligible ? (
                          <div className="mt-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-xs">
                            <span className="font-bold">⚠️ 字段映射已失效:</span>
                            <span className="ml-1">该字段一阶段映射可能不存在、已被停用、未索引或类型暂不支持。原因:【{originalFieldEligibleResult.reason}】。禁止继续保存！</span>
                          </div>
                        ) : (
                          <p className="text-[10px] text-amber-600 mt-1 font-semibold">
                            ⚠️ 已有规则的映射字段不可变更；如需更换字段，请新建规则。
                          </p>
                        );
                      })()
                    ) : (
                      <p className="text-[10px] text-slate-400 mt-1">
                        属性相似度规则必须严格来自已映射的物理属性字段。
                      </p>
                    )}
                  </div>

                  {/* Field name (Read Only) */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">字段显示名称 (只读)</label>
                    <input
                      type="text"
                      value={formFieldName}
                      disabled
                      placeholder="请从上方下拉列表选择物理字段"
                      className="w-full text-xs border border-slate-200 rounded px-3 py-1.5 bg-slate-100 text-slate-500 font-medium outline-hidden cursor-not-allowed"
                    />
                  </div>

                  {/* Property Code (Read Only) */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">属性编码 / Manticore 字段名 (只读)</label>
                    <input
                      type="text"
                      value={formPropertyCode}
                      disabled
                      placeholder="请从上方下拉列表选择物理字段"
                      className="w-full text-xs border border-slate-200 rounded px-3 py-1.5 font-mono bg-slate-100 text-slate-500 outline-hidden cursor-not-allowed"
                    />
                  </div>

                  {/* Field Type selector (Read Only) */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                      字段类型区分 (自动锁定只读)
                    </label>
                    <input
                      type="text"
                      value={formFieldType}
                      disabled
                      className="w-full text-xs border border-slate-200 rounded px-3 py-1.5 bg-slate-100 text-slate-500 font-bold outline-hidden cursor-not-allowed"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      物理类型已与一阶段结构体严格对齐解耦。
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
                      <option value="候选缺失按 0 分">候选缺失按 0 分</option>
                      <option value="不参与计算">不参与计算 (权重均摊到其他有值项)</option>
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
                      <span>参与属性级相似度加权评分</span>
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

                    {/* Measurement Category (Locked) */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">物理测量量 (Quantity - 只读锁定)</label>
                      <input
                        type="text"
                        value={formUnitFamily}
                        disabled
                        className="w-full text-xs border border-slate-200 rounded px-3 py-1.5 bg-slate-100 text-slate-500 font-bold outline-hidden cursor-not-allowed"
                      />
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
                      <div className="relative" id="unit-display-combobox">
                        <div className="flex border border-slate-200 rounded overflow-hidden bg-slate-50 focus-within:ring-1 focus-within:ring-blue-500">
                          <input
                            type="text"
                            id="unit-display-search"
                            value={unitSearchText}
                            onChange={(e) => {
                              setUnitSearchText(e.target.value);
                              setIsUnitDropdownOpen(true);
                            }}
                            onFocus={() => {
                              setIsUnitDropdownOpen(true);
                            }}
                            placeholder={formDisplayUnit ? `当前选中: ${formDisplayUnit}` : "输入编码、中文、英文或别名检索..."}
                            className="w-full text-xs px-3 py-1.5 bg-white text-slate-800 outline-hidden border-r border-slate-100 font-bold"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setIsUnitDropdownOpen(!isUnitDropdownOpen);
                              if (!isUnitDropdownOpen) {
                                setUnitSearchText('');
                              }
                            }}
                            className="px-2.5 text-slate-500 hover:bg-slate-100 text-xs focus:outline-hidden"
                          >
                            ▼
                          </button>
                        </div>
                        
                        {isUnitDropdownOpen && (
                          <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded shadow-lg max-h-48 overflow-y-auto" id="unit-display-options">
                            {(() => {
                              const unitsList = currentQuantityData?.units || [];
                              const filtered = unitsList.filter(u => {
                                if (u.status && u.status !== 'ACTIVE') return false;
                                const searchLower = unitSearchText.toLowerCase().trim();
                                if (!searchLower) return true;
                                return (
                                  u.code.toLowerCase().includes(searchLower) ||
                                  u.name.toLowerCase().includes(searchLower) ||
                                  (u.aliases && u.aliases.some(alias => alias.toLowerCase().includes(searchLower)))
                                );
                              });

                              if (filtered.length === 0) {
                                return (
                                  <div className="p-3 text-xs text-slate-400 text-center font-medium bg-slate-50/50" id="unit-display-empty">
                                    未找到可用单位，请维护外部单位目录
                                  </div>
                                );
                              }

                              return filtered.map(u => {
                                const isSelected = u.code === formDisplayUnit;
                                return (
                                  <button
                                    type="button"
                                    key={u.code}
                                    onClick={() => {
                                      setFormDisplayUnit(u.code);
                                      setUnitSearchText('');
                                      setIsUnitDropdownOpen(false);
                                    }}
                                    className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 transition-colors flex justify-between items-center ${
                                      isSelected ? 'bg-blue-50 font-bold text-blue-700' : 'text-slate-700'
                                    }`}
                                  >
                                    <div className="flex flex-col">
                                      <span className="font-semibold">{u.name} ({u.code})</span>
                                      {u.aliases && u.aliases.length > 0 && (
                                        <span className="text-[10px] text-slate-400">别名: {u.aliases.join(', ')}</span>
                                      )}
                                    </div>
                                    {isSelected && <span className="text-blue-600 font-bold">✓</span>}
                                  </button>
                                );
                              });
                            })()}
                          </div>
                        )}
                        {/* Outside click handler simulation using an invisible backdrop when open */}
                        {isUnitDropdownOpen && (
                          <div 
                            className="fixed inset-0 z-40 cursor-default" 
                            onClick={() => {
                              setIsUnitDropdownOpen(false);
                              setUnitSearchText('');
                            }}
                          />
                        )}
                      </div>
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
                      {getAllowedMatchTypes(formFieldType).map((mt) => {
                        let label = mt;
                        if (mt === '精确值匹配') label = '精确值匹配 (EXACT)';
                        else if (mt === '数值容差匹配') label = '数值容差匹配 (NUMERIC_TOLERANCE)';
                        else if (mt === '数值距离衰减') label = '数值距离衰减 (NUMERIC_DECAY)';
                        else if (mt === '文本相似匹配 (非 AI)') label = '文本相似匹配 (非 AI)';
                        else if (mt === '层级关系匹配') label = '层级关系匹配 (NATIVE_HIERARCHY)';
                        return (
                          <option key={mt} value={mt}>
                            {label}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                {/* Sub-panels for dynamic matchType parameters */}
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">

                  {/* PANEL 1: Exact Match */}
                  {formMatchTypeState === '精确值匹配' && (
                    <div className="text-xs text-slate-500 space-y-1">
                      <p className="font-bold text-slate-700 mb-1">精确等值算法 (EXACT)</p>
                      {(formFieldType || '').toUpperCase().includes('DATE') ? (
                        <p>● 日期源属性值与目标属性在标准化后必须绝对一致。</p>
                      ) : (
                        <p>● 源属性值与目标属性值在转换为相同单位后必须绝对等值 (如 10mm 与 1cm 相同)。</p>
                      )}
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
                  第四部分：规则比对命中原因与差异反馈模板
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
          <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-slate-200 bg-white overflow-y-auto p-5 shrink-0 space-y-5 h-auto md:h-full">
            <h3 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center space-x-1.5">
              <SlidersHorizontal className="w-4 h-4 text-blue-600" />
              <span>所选算法即时算分反馈</span>
            </h3>

            {(() => {
              const typeUpper = (formFieldType || '').toUpperCase();
              const isDateField = typeUpper.includes('DATE') || formFieldType.includes('日期');
              const isUnitField = formFieldType === '带单位数值 (NUMBER_WITH_UNIT)';
              const isEnumField = typeUpper.includes('ENUM') || formFieldType.includes('枚举');
              const isClassTree = typeUpper.includes('CLASS_TREE') || formFieldType.includes('层级');
              const isTextField = typeUpper.includes('TEXT') || formFieldType.includes('文本');
              const isNumberField = typeUpper.includes('NUMBER') || formFieldType.includes('数值');

              const getEnumOptions = (propertyCode: string) => {
                if (propertyCode === 'lifecycle_state' || propertyCode === 'lifecycleState') {
                  return ['有效', '待发布', '废弃'];
                }
                if (propertyCode === 'core_material' || propertyCode === 'material') {
                  return ['SUS304', 'Q235', 'S136', '45#', '塑料/铜', '陶瓷'];
                }
                return ['有效', '待发布', '废弃'];
              };

              let sourceLabel = '检索输入 (Source Value)';
              let targetLabel = '基准数值 (Target Value)';

              if (isUnitField) {
                sourceLabel = '检索输入 (源物理属性值)';
                targetLabel = '基准数值 (对准已有属性值)';
              } else if (isDateField) {
                sourceLabel = '检索输入 (源日期)';
                targetLabel = '基准数值 (对准已有日期)';
              } else if (isEnumField) {
                sourceLabel = '检索输入 (源枚举项)';
                targetLabel = '基准数值 (对准已有枚举项)';
              } else if (isTextField) {
                sourceLabel = '检索输入 (源文本)';
                targetLabel = '基准数值 (对准已有文本)';
              } else if (isNumberField) {
                sourceLabel = '检索输入 (源数值)';
                targetLabel = '基准数值 (对准已有数值)';
              } else if (isClassTree) {
                sourceLabel = '检索输入 (源层级路径)';
                targetLabel = '基准数值 (对准已有层级)';
              }

              if (isDateField && !formIsScoreActive) {
                return (
                  <div className="bg-slate-50 rounded-lg p-5 border border-slate-200 text-center space-y-2" id="preview-date-only-filter-placeholder">
                    <div className="text-slate-500 font-bold text-xs">📅 日期字段评分未启用</div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      该属性当前未启用参与相似度评分计算。
                    </p>
                  </div>
                );
              }

              return (
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-3.5" id="preview-sim-interactive-inputs">
                  <span className="text-[11px] font-bold text-slate-600 block">
                    输入比对模拟数值 (自适应当前配置)
                  </span>

                  {/* Source val */}
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                      {sourceLabel}
                    </label>
                    <div className="relative">
                      {isEnumField ? (
                        <select
                          value={previewSrcVal}
                          onChange={(e) => setPreviewSrcVal(e.target.value)}
                          className="w-full text-xs border border-slate-200 rounded px-2.5 py-1.5 bg-white font-semibold text-slate-800"
                        >
                          {getEnumOptions(formPropertyCode).map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={isDateField ? 'date' : 'text'}
                          value={previewSrcVal}
                          onChange={(e) => setPreviewSrcVal(e.target.value)}
                          className="w-full text-xs border border-slate-200 rounded px-2.5 py-1 bg-white font-mono font-semibold"
                          placeholder={isClassTree ? "如: /电子元器件/继电器" : ""}
                        />
                      )}
                      {isUnitField && (
                        <span className="text-[10px] text-slate-400 font-mono absolute right-2.5 top-1.5">
                          {formDisplayUnit}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Target val */}
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                      {targetLabel}
                    </label>
                    <div className="relative">
                      {isEnumField ? (
                        <select
                          value={previewTgtVal}
                          onChange={(e) => setPreviewTgtVal(e.target.value)}
                          className="w-full text-xs border border-slate-200 rounded px-2.5 py-1.5 bg-white font-semibold text-slate-800"
                        >
                          {getEnumOptions(formPropertyCode).map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={isDateField ? 'date' : 'text'}
                          value={previewTgtVal}
                          onChange={(e) => setPreviewTgtVal(e.target.value)}
                          className="w-full text-xs border border-slate-200 rounded px-2.5 py-1 bg-white font-mono font-semibold"
                          placeholder={isClassTree ? "如: /电子元器件/继电器/直流继电器" : ""}
                        />
                      )}
                      {isUnitField && (
                        <span className="text-[10px] text-slate-400 font-mono absolute right-2.5 top-1.5">
                          {formDisplayUnit}
                        </span>
                      )}
                    </div>
                  </div>

                  {isDateField && (
                    <p className="text-[10px] text-slate-400 leading-normal font-medium" id="date-match-tip-msg">
                      说明：在指定容差天数或小时数内偏离计算，超出阻断或按天数衰减。
                    </p>
                  )}
                  {isClassTree && (
                    <p className="text-[10px] text-slate-400 leading-normal font-medium" id="tree-match-tip-msg">
                      说明：支持 / 分隔路径。若相同前缀层级不满足关系（子类/后代）或差值过大扣减得分。
                    </p>
                  )}
                  {isEnumField && (
                    <p className="text-[10px] text-slate-400 leading-normal font-medium" id="enum-match-tip-msg">
                      说明：枚举字段精确值匹配，内容完全一致时得 100 分，不一致得 0 分。
                    </p>
                  )}

                  {/* Real-time score calculator feedback */}
                  <div className="pt-2 border-t border-slate-200 flex flex-col items-center">
                    <span className="text-[10px] text-slate-400 block font-semibold mb-1">对齐结果得分 (即时比算)</span>
                    <div className="flex items-baseline space-x-1 justify-center">
                      <span className={`text-4xl font-black font-mono ${realTimePreviewScore > 80 ? 'text-emerald-600' : realTimePreviewScore > 50 ? 'text-blue-600' : 'text-red-500'}`}>
                        {realTimePreviewScore}
                      </span>
                      <span className="text-xs text-slate-400 font-semibold">/ 100 分</span>
                    </div>

                    {isUnitField && !isNaN(parseFloat(previewSrcVal)) && !isNaN(parseFloat(previewTgtVal)) && (
                      <div className="text-[10px] text-slate-500 text-center mt-2 bg-white px-2 py-1 rounded border border-slate-100 w-full font-sans">
                        对齐物理差值: <span className="font-mono font-bold text-slate-700">{Math.abs(parseFloat(previewSrcVal) - parseFloat(previewTgtVal)).toFixed(2)} {formDisplayUnit}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Instruction about calculated formula process */}
            <div className="text-[11px] text-slate-500 leading-normal space-y-2">
              <span className="font-bold text-slate-700 block">换算说明：</span>
              {formFieldType === '带单位数值 (NUMBER_WITH_UNIT)' ? (
                <>
                  <p>1. 算分前将根据单位目录将输入的换算单位，统一折算至底层 SI 标准基准量再进行偏差或距离计算。</p>
                  <p>2. 数值距离衰减和容差在基准物理量数值（如米、伏）的基础上进行判断。</p>
                </>
              ) : (
                <>
                  <p>1. 当前字段类型不带单位，不涉及物理单位与 SI 标准基准量纲的换算。</p>
                  <p>2. 对齐计算将直接对文本、枚举或纯数值进行内容或范围精确匹配。</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
