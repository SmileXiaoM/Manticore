import React, { useState, useMemo, useEffect } from 'react';
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
  HelpCircle,
  ShieldAlert,
  Layers,
  ArrowRight
} from 'lucide-react';
import {
  FieldSimilarityRule,
  ObjectType,
  MatchConfig,
  ChangeRecord,
  isObjectRulesModified,
  TrialFeedback,
  MismatchAction
} from '../types';
import {
  rootTypeOptions,
  softTypeOptions,
  stage1MappedFields,
  mockUnitCatalog,
  convertToBaseUnit,
  convertFromBaseUnit,
  processEnumList,
  formatWithDisplayUnit,
  calculateFieldMatchRate
} from '../data';

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
    return ['精确值匹配', '文本相似匹配 (非 AI)'];
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
  onNavigate
}) => {
  // 1. 根类型与软类型上下文选择器 (默认: 零部件 PART + 自制件 IN_HOUSE)
  const [selectedRootTypeId, setSelectedRootTypeId] = useState<string>('PART');
  const [selectedSoftTypeId, setSelectedSoftTypeId] = useState<string>('IN_HOUSE');

  // 当前可用的软类型列表 (根据所选根类型过滤)
  const availableSoftTypes = useMemo(() => {
    return softTypeOptions.filter(st => st.rootTypeId === selectedRootTypeId);
  }, [selectedRootTypeId]);

  // 当切换根类型时，默认选中该根类型下的第一个软类型
  const handleRootTypeChange = (newRootId: string) => {
    setSelectedRootTypeId(newRootId);
    const softs = softTypeOptions.filter(st => st.rootTypeId === newRootId);
    if (softs.length > 0) {
      setSelectedSoftTypeId(softs[0].id);
    } else {
      setSelectedSoftTypeId('');
    }
  };

  const currentRootTypeObj = rootTypeOptions.find(rt => rt.id === selectedRootTypeId);
  const currentSoftTypeObj = softTypeOptions.find(st => st.id === selectedSoftTypeId);

  // 2. 列表筛选状态
  const [filterKeyword, setFilterKeyword] = useState('');
  const [filterScoreActive, setFilterScoreActive] = useState('ALL');
  const [filterMismatchAction, setFilterMismatchAction] = useState('ALL');

  // 3. 模态框/编辑抽屉状态
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

  // 表单状态
  const [formFieldId, setFormFieldId] = useState('');
  const [formFieldName, setFormFieldName] = useState('');
  const [formPropertyCode, setFormPropertyCode] = useState('');
  const [formFieldType, setFormFieldType] = useState('');
  const [formWeight, setFormWeight] = useState<number>(20);
  const [formMatchType, setFormMatchType] = useState('精确值匹配');
  const [formNullHandling, setFormNullHandling] = useState('候选缺失按 0 分');
  const [formMismatchAction, setFormMismatchAction] = useState<MismatchAction>('ZERO_AND_CONTINUE');
  const [formIsScoreActive, setFormIsScoreActive] = useState(true);
  const [formShowHitReason, setFormShowHitReason] = useState(true);
  const [formShowDiffFields, setFormShowDiffFields] = useState(true);
  const [formHitReasonTemplate, setFormHitReasonTemplate] = useState('');
  const [formDiffFieldsTemplate, setFormDiffFieldsTemplate] = useState('');
  const [formUnitFamily, setFormUnitFamily] = useState('无');
  const [formBaseUnit, setFormBaseUnit] = useState('无');
  const [formDisplayUnit, setFormDisplayUnit] = useState('无');

  // MatchConfig dynamic form parameters
  const [formTextThreshold, setFormTextThreshold] = useState(60);
  const [formToleranceType, setFormToleranceType] = useState<'ABSOLUTE' | 'PERCENTAGE'>('ABSOLUTE');
  const [formToleranceValue, setFormToleranceValue] = useState(0.2);
  const [formToleranceDirection, setFormToleranceDirection] = useState<'BOTH' | 'HIGHER' | 'LOWER'>('BOTH');
  const [formDecayFullRange, setFormDecayFullRange] = useState(0.1);
  const [formDecayZeroBoundary, setFormDecayZeroBoundary] = useState(1.0);
  const [formHierarchyMaxGap, setFormHierarchyMaxGap] = useState(3);
  const [formHierarchyDeduction, setFormHierarchyDeduction] = useState(5);

  // 实时试算预览输入状态 (抽屉右侧)
  const [trialSrcVal, setTrialSrcVal] = useState('10');
  const [trialCandVal, setTrialCandVal] = useState('16');
  const [trialSrcUnit, setTrialSrcUnit] = useState('mm');
  const [trialCandUnit, setTrialCandUnit] = useState('mm');

  // 切换根类型或软类型时关闭可能打开的表单
  useEffect(() => {
    setIsModalOpen(false);
    setEditingRuleId(null);
  }, [selectedRootTypeId, selectedSoftTypeId]);

  // 当前上下文下的编辑中规则列表
  const currentScopeEditingRules = useMemo(() => {
    return editingRules.filter(
      r =>
        (r.rootTypeId === selectedRootTypeId || r.objectType === selectedRootTypeId) &&
        r.softTypeId === selectedSoftTypeId
    );
  }, [editingRules, selectedRootTypeId, selectedSoftTypeId]);

  // 过滤后的规则列表
  const filteredRules = useMemo(() => {
    return currentScopeEditingRules.filter(r => {
      if (filterKeyword) {
        const kw = filterKeyword.toLowerCase();
        const matchName = r.fieldName.toLowerCase().includes(kw);
        const matchCode = r.propertyCode.toLowerCase().includes(kw);
        if (!matchName && !matchCode) return false;
      }
      if (filterScoreActive !== 'ALL') {
        const boolVal = filterScoreActive === 'YES';
        if (r.isScoreActive !== boolVal) return false;
      }
      if (filterMismatchAction !== 'ALL') {
        if (r.mismatchAction !== filterMismatchAction) return false;
      }
      return true;
    });
  }, [currentScopeEditingRules, filterKeyword, filterScoreActive, filterMismatchAction]);

  // 统计指标
  const activeScoreRulesCount = currentScopeEditingRules.filter(r => r.isScoreActive && r.enabled).length;
  const gateRulesCount = currentScopeEditingRules.filter(r => r.mismatchAction === 'EXCLUDE_CANDIDATE' && r.isScoreActive && r.enabled).length;
  const totalScoreWeight = currentScopeEditingRules
    .filter(r => r.isScoreActive && r.enabled)
    .reduce((sum, r) => sum + r.weight, 0);

  // 检查是否有未保存修改
  const isModified = useMemo(() => {
    return isObjectRulesModified(editingRules, savedRules, selectedRootTypeId, selectedSoftTypeId);
  }, [editingRules, savedRules, selectedRootTypeId, selectedSoftTypeId]);

  // 一阶段可选字段 (根据当前根类型及软类型过滤)
  const availableStage1Fields = useMemo(() => {
    return stage1MappedFields.filter(
      f =>
        f.rootTypeId === selectedRootTypeId &&
        (!f.softTypeId || f.softTypeId === selectedSoftTypeId) &&
        f.enabled
    );
  }, [selectedRootTypeId, selectedSoftTypeId]);

  // 打开新建规则模态框
  const handleOpenCreateModal = () => {
    if (availableStage1Fields.length === 0) {
      alert('当前软类型下一阶段暂无可配置的已映射字段！');
      return;
    }
    // 默认选取第一个未配置的字段
    const unconfigured = availableStage1Fields.find(
      f => !currentScopeEditingRules.some(r => r.propertyCode === f.fieldCode)
    ) || availableStage1Fields[0];

    setEditingRuleId(null);
    setFormFieldId(unconfigured.fieldId);
    setFormFieldName(unconfigured.displayName);
    setFormPropertyCode(unconfigured.fieldCode);
    setFormFieldType(unconfigured.businessFieldType);
    setFormWeight(20);
    setFormMatchType(getAllowedMatchTypes(unconfigured.businessFieldType)[0]);
    setFormNullHandling('候选缺失按 0 分');
    setFormMismatchAction('ZERO_AND_CONTINUE');
    setFormIsScoreActive(true);
    setFormShowHitReason(true);
    setFormShowDiffFields(true);
    setFormHitReasonTemplate(`${unconfigured.displayName}匹配一致`);
    setFormDiffFieldsTemplate(`${unconfigured.displayName}存在差异`);
    setFormUnitFamily(unconfigured.unitFamily || '无');
    setFormBaseUnit(unconfigured.baseUnit || '无');
    setFormDisplayUnit(unconfigured.displayUnit || '无');

    // 默认试算值
    if (unconfigured.businessFieldType.includes('NUMBER')) {
      setTrialSrcVal('10');
      setTrialCandVal('10.1');
      setTrialSrcUnit(unconfigured.displayUnit || 'mm');
      setTrialCandUnit(unconfigured.displayUnit || 'mm');
    } else {
      setTrialSrcVal('SUS304');
      setTrialCandVal('SUS304');
      setTrialSrcUnit('');
      setTrialCandUnit('');
    }

    setIsModalOpen(true);
  };

  // 打开编辑规则模态框
  const handleOpenEditModal = (rule: FieldSimilarityRule) => {
    setEditingRuleId(rule.id);
    setFormFieldId(rule.fieldId || '');
    setFormFieldName(rule.fieldName);
    setFormPropertyCode(rule.propertyCode);
    setFormFieldType(rule.fieldType);
    setFormWeight(rule.weight);
    setFormMatchType(rule.matchType);
    setFormNullHandling(rule.nullHandling || '候选缺失按 0 分');
    setFormMismatchAction(rule.mismatchAction || 'ZERO_AND_CONTINUE');
    setFormIsScoreActive(rule.isScoreActive);
    setFormShowHitReason(rule.showHitReason);
    setFormShowDiffFields(rule.showDiffFields);
    setFormHitReasonTemplate(rule.hitReasonTemplate || '');
    setFormDiffFieldsTemplate(rule.diffFieldsTemplate || '');
    setFormUnitFamily(rule.unitFamily || '无');
    setFormBaseUnit(rule.baseUnit || '无');
    setFormDisplayUnit(rule.displayUnit || '无');

    // MatchConfig
    if (rule.matchConfig) {
      const cfg = rule.matchConfig;
      if (cfg.kind === 'TEXT_SIMILARITY') setFormTextThreshold(cfg.threshold);
      if (cfg.kind === 'NUMERIC_TOLERANCE') {
        setFormToleranceType(cfg.toleranceType);
        setFormToleranceValue(cfg.toleranceValue);
        setFormToleranceDirection(cfg.direction);
      }
      if (cfg.kind === 'NUMERIC_DECAY') {
        setFormDecayFullRange(cfg.fullScoreRange);
        setFormDecayZeroBoundary(cfg.zeroScoreBoundary);
      }
      if (cfg.kind === 'NATIVE_HIERARCHY') {
        setFormHierarchyMaxGap(cfg.maxLevelGap);
        setFormHierarchyDeduction(cfg.deductionPerLevel);
      }
    }

    // 预填试算数据
    if (rule.fieldType.includes('NUMBER')) {
      setTrialSrcVal('10');
      setTrialCandVal('10.15');
      setTrialSrcUnit(rule.displayUnit || 'mm');
      setTrialCandUnit(rule.displayUnit || 'mm');
    } else {
      setTrialSrcVal('SUS304');
      setTrialCandVal('A2-70');
      setTrialSrcUnit('');
      setTrialCandUnit('');
    }

    setIsModalOpen(true);
  };

  // 字段选择器变更
  const handleFieldSelectChange = (fieldCode: string) => {
    const selectedField = availableStage1Fields.find(f => f.fieldCode === fieldCode);
    if (!selectedField) return;

    setFormFieldId(selectedField.fieldId);
    setFormFieldName(selectedField.displayName);
    setFormPropertyCode(selectedField.fieldCode);
    setFormFieldType(selectedField.businessFieldType);
    setFormMatchType(getAllowedMatchTypes(selectedField.businessFieldType)[0]);
    setFormUnitFamily(selectedField.unitFamily || '无');
    setFormBaseUnit(selectedField.baseUnit || '无');
    setFormDisplayUnit(selectedField.displayUnit || '无');
    setFormHitReasonTemplate(`${selectedField.displayName}匹配一致`);
    setFormDiffFieldsTemplate(`${selectedField.displayName}存在差异`);
  };

  // 保存规则到当前编辑态
  const handleSaveRule = () => {
    if (!formFieldName || !formPropertyCode) {
      alert('请选择有效的一阶段字段！');
      return;
    }

    let matchConfig: MatchConfig | undefined = undefined;
    if (formMatchType === '精确值匹配') {
      matchConfig = { kind: 'EXACT' };
    } else if (formMatchType === '文本相似匹配 (非 AI)') {
      matchConfig = { kind: 'TEXT_SIMILARITY', threshold: formTextThreshold };
    } else if (formMatchType === '数值容差匹配') {
      matchConfig = {
        kind: 'NUMERIC_TOLERANCE',
        toleranceType: formToleranceType,
        toleranceValue: formToleranceValue,
        direction: formToleranceDirection
      };
    } else if (formMatchType === '数值距离衰减') {
      matchConfig = {
        kind: 'NUMERIC_DECAY',
        fullScoreRange: formDecayFullRange,
        zeroScoreBoundary: formDecayZeroBoundary,
        direction: formToleranceDirection
      };
    } else if (formMatchType === '层级关系匹配') {
      matchConfig = {
        kind: 'NATIVE_HIERARCHY',
        maxLevelGap: formHierarchyMaxGap,
        relation: 'ANCESTOR_DESCENDANT',
        deductionPerLevel: formHierarchyDeduction
      };
    }

    const newRule: FieldSimilarityRule = {
      id: editingRuleId || `R-${selectedSoftTypeId}-${Date.now().toString().slice(-4)}`,
      rootTypeId: selectedRootTypeId,
      rootTypeName: currentRootTypeObj?.name.split(' ')[0] || selectedRootTypeId,
      softTypeId: selectedSoftTypeId,
      softTypeName: currentSoftTypeObj?.name.split(' ')[0] || selectedSoftTypeId,
      fieldName: formFieldName,
      propertyCode: formPropertyCode,
      fieldType: formFieldType,
      weight: formWeight,
      matchType: formMatchType,
      nullHandling: formNullHandling,
      mismatchAction: formMismatchAction,
      isScoreActive: formIsScoreActive,
      isQueryPreviewAvailable: true,
      isAppEndActive: true,
      showHitReason: formShowHitReason,
      showDiffFields: formShowDiffFields,
      hitReasonTemplate: formHitReasonTemplate,
      diffFieldsTemplate: formDiffFieldsTemplate,
      enabled: true,
      configVersion: 'v2.5.0-draft',
      lastEditor: '系统当前操作员',
      lastEditTime: new Date().toISOString().replace('T', ' ').slice(0, 19),
      fieldId: formFieldId,
      unitFamily: formUnitFamily,
      baseUnit: formBaseUnit,
      displayUnit: formDisplayUnit,
      matchConfig
    };

    let updatedRules: FieldSimilarityRule[];
    if (editingRuleId) {
      updatedRules = editingRules.map(r => (r.id === editingRuleId ? newRule : r));
    } else {
      updatedRules = [...editingRules, newRule];
    }

    onUpdateEditingRules(updatedRules);
    setIsModalOpen(false);
  };

  // 删除单条规则
  const handleDeleteRule = (id: string) => {
    if (confirm('确定要删除该字段相似度规则吗？')) {
      const updatedRules = editingRules.filter(r => r.id !== id);
      onUpdateEditingRules(updatedRules);
    }
  };

  // 快速切换参与评分开关
  const handleToggleScoreActive = (rule: FieldSimilarityRule) => {
    const updated = editingRules.map(r => {
      if (r.id === rule.id) {
        return { ...r, isScoreActive: !r.isScoreActive };
      }
      return r;
    });
    onUpdateEditingRules(updated);
  };

  // 快速切换门槛/0分策略
  const handleToggleMismatchAction = (rule: FieldSimilarityRule) => {
    const nextAction: MismatchAction =
      rule.mismatchAction === 'EXCLUDE_CANDIDATE' ? 'ZERO_AND_CONTINUE' : 'EXCLUDE_CANDIDATE';
    const updated = editingRules.map(r => {
      if (r.id === rule.id) {
        return { ...r, mismatchAction: nextAction };
      }
      return r;
    });
    onUpdateEditingRules(updated);
  };

  // 保存当前软类型的配置 (保存草稿)
  const handleSaveDraft = () => {
    // 将当前软类型的 editingRules 同步到 savedRules
    const otherSavedRules = savedRules.filter(
      r => !(r.rootTypeId === selectedRootTypeId && r.softTypeId === selectedSoftTypeId)
    );
    const thisSavedRules = currentScopeEditingRules.map(r => ({
      ...r,
      configVersion: 'v2.5.0-saved',
      lastEditTime: new Date().toISOString().replace('T', ' ').slice(0, 19)
    }));
    const newSavedRules = [...otherSavedRules, ...thisSavedRules];

    onUpdateSavedRules(newSavedRules);

    // 记录变更
    const newRecord: ChangeRecord = {
      id: `CR-${Date.now()}`,
      objectType: `${selectedRootTypeId} / ${selectedSoftTypeId}`,
      configVersion: 'v2.5.0-saved',
      operationType: '保存',
      summary: `保存了【${currentRootTypeObj?.name} - ${currentSoftTypeObj?.name}】下的 ${thisSavedRules.length} 项字段相似度规则`,
      operator: '系统管理员',
      time: new Date().toISOString().replace('T', ' ').slice(0, 19),
      result: 'SUCCESS'
    };
    onUpdateChangeRecords([newRecord, ...changeRecords]);
    alert('配置已成功保存为已保存草稿！可在查询预览中选择“已保存配置”进行验证。');
  };

  // 发布并启用当前软类型配置
  const handlePublishActive = () => {
    if (totalScoreWeight !== 100) {
      if (!confirm(`当前参与评分字段权重合计为 ${totalScoreWeight}%（非 100%），确定要发布启用吗？`)) {
        return;
      }
    }

    const otherActiveRules = activeRules.filter(
      r => !(r.rootTypeId === selectedRootTypeId && r.softTypeId === selectedSoftTypeId)
    );
    const thisActiveRules = currentScopeEditingRules.map(r => ({
      ...r,
      configVersion: 'v2.5.0-release',
      lastEditTime: new Date().toISOString().replace('T', ' ').slice(0, 19)
    }));
    const newActiveRules = [...otherActiveRules, ...thisActiveRules];

    onUpdateActiveRules(newActiveRules);
    onUpdateSavedRules(newActiveRules);

    // 记录发布变更
    const newRecord: ChangeRecord = {
      id: `CR-${Date.now()}`,
      objectType: `${selectedRootTypeId} / ${selectedSoftTypeId}`,
      configVersion: 'v2.5.0-release',
      operationType: '启用',
      summary: `发布并启用了【${currentRootTypeObj?.name} - ${currentSoftTypeObj?.name}】的规则集（包含 ${activeScoreRulesCount} 个评分字段，${gateRulesCount} 个门槛字段）`,
      operator: '系统管理员',
      time: new Date().toISOString().replace('T', ' ').slice(0, 19),
      result: 'SUCCESS'
    };
    onUpdateChangeRecords([newRecord, ...changeRecords]);
    alert('配置已成功发布并生效！应用端查找相似件将实时应用此最新规则。');
  };

  // 模态框实时试算结果
  const modalTrialResult = useMemo(() => {
    let matchConfig: MatchConfig | undefined = undefined;
    if (formMatchType === '精确值匹配') {
      matchConfig = { kind: 'EXACT' };
    } else if (formMatchType === '文本相似匹配 (非 AI)') {
      matchConfig = { kind: 'TEXT_SIMILARITY', threshold: formTextThreshold };
    } else if (formMatchType === '数值容差匹配') {
      matchConfig = {
        kind: 'NUMERIC_TOLERANCE',
        toleranceType: formToleranceType,
        toleranceValue: formToleranceValue,
        direction: formToleranceDirection
      };
    } else if (formMatchType === '数值距离衰减') {
      matchConfig = {
        kind: 'NUMERIC_DECAY',
        fullScoreRange: formDecayFullRange,
        zeroScoreBoundary: formDecayZeroBoundary,
        direction: formToleranceDirection
      };
    } else if (formMatchType === '层级关系匹配') {
      matchConfig = {
        kind: 'NATIVE_HIERARCHY',
        maxLevelGap: formHierarchyMaxGap,
        relation: 'ANCESTOR_DESCENDANT',
        deductionPerLevel: formHierarchyDeduction
      };
    }

    const tempRule: FieldSimilarityRule = {
      id: 'TEMP',
      rootTypeId: selectedRootTypeId,
      rootTypeName: '',
      softTypeId: selectedSoftTypeId,
      softTypeName: '',
      fieldName: formFieldName,
      propertyCode: formPropertyCode,
      fieldType: formFieldType,
      weight: formWeight,
      matchType: formMatchType,
      nullHandling: formNullHandling,
      mismatchAction: formMismatchAction,
      isScoreActive: formIsScoreActive,
      isQueryPreviewAvailable: true,
      isAppEndActive: true,
      showHitReason: true,
      showDiffFields: true,
      hitReasonTemplate: formHitReasonTemplate,
      diffFieldsTemplate: formDiffFieldsTemplate,
      enabled: true,
      configVersion: '',
      lastEditor: '',
      lastEditTime: '',
      unitFamily: formUnitFamily,
      displayUnit: formDisplayUnit,
      matchConfig
    };

    const mockRef = {
      attributes: { [formPropertyCode]: trialSrcVal },
      units: { [formPropertyCode]: trialSrcUnit }
    };
    const mockCand = {
      attributes: { [formPropertyCode]: trialCandVal },
      units: { [formPropertyCode]: trialCandUnit }
    };

    const matchRate = calculateFieldMatchRate(tempRule, trialSrcVal, trialCandVal, mockCand, mockRef);
    const weightedScore = Number((formWeight * matchRate).toFixed(2));

    let outcomeText = '';
    let outcomeType: 'SUCCESS' | 'PARTIAL' | 'ZERO_CONTINUE' | 'EXCLUDED' = 'SUCCESS';

    if (matchRate === 1.0) {
      outcomeText = `完全匹配（得满分 ${formWeight} 分）`;
      outcomeType = 'SUCCESS';
    } else if (matchRate > 0) {
      outcomeText = `部分吻合（匹配度 ${(matchRate * 100).toFixed(1)}%，得分 ${weightedScore} 分）`;
      outcomeType = 'PARTIAL';
    } else {
      if (formMismatchAction === 'EXCLUDE_CANDIDATE') {
        outcomeText = '候选被排除，不进入评分与应用端结果';
        outcomeType = 'EXCLUDED';
      } else {
        outcomeText = '本字段 0 分，候选继续计算';
        outcomeType = 'ZERO_CONTINUE';
      }
    }

    return {
      matchRate,
      weightedScore,
      outcomeText,
      outcomeType
    };
  }, [
    formMatchType,
    formTextThreshold,
    formToleranceType,
    formToleranceValue,
    formToleranceDirection,
    formDecayFullRange,
    formDecayZeroBoundary,
    formHierarchyMaxGap,
    formHierarchyDeduction,
    selectedRootTypeId,
    selectedSoftTypeId,
    formFieldName,
    formPropertyCode,
    formFieldType,
    formWeight,
    formNullHandling,
    formMismatchAction,
    formIsScoreActive,
    formHitReasonTemplate,
    formDiffFieldsTemplate,
    formUnitFamily,
    formDisplayUnit,
    trialSrcVal,
    trialCandVal,
    trialSrcUnit,
    trialCandUnit
  ]);

  return (
    <div className="space-y-6" id="field-similarity-view-container">
      {/* 顶部标题与上下文控制栏 */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <SlidersHorizontal className="w-5 h-5 text-blue-600" />
              字段相似度规则配置
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              按【根类型 + 软类型】业务上下文定义二阶段属性相似度权重、匹配方式与门槛排除策略
            </p>
          </div>

          {/* 操作按钮区 */}
          <div className="flex items-center gap-2.5">
            {isModified && (
              <span className="text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-md animate-pulse">
                存在未保存草稿
              </span>
            )}
            <button
              onClick={handleSaveDraft}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors shadow-2xs"
              id="save-draft-btn"
            >
              <Save className="w-3.5 h-3.5 text-slate-600" />
              保存草稿
            </button>
            <button
              onClick={handlePublishActive}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors shadow-xs"
              id="publish-active-btn"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              发布并启用
            </button>
            {onNavigate && (
              <button
                onClick={() => onNavigate('query-preview')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors shadow-2xs"
                id="goto-query-preview-btn"
              >
                前往查询预览
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* 根类型与软类型上下文切换条 */}
        <div className="pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* 1. 根类型选择器 */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              1. 根类型 (一阶段元数据)
            </label>
            <select
              value={selectedRootTypeId}
              onChange={e => handleRootTypeChange(e.target.value)}
              className="w-full h-9 text-xs font-medium border border-slate-300 rounded-md px-2.5 bg-white text-slate-800 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              id="root-type-selector"
            >
              {rootTypeOptions.map(rt => (
                <option key={rt.id} value={rt.id}>
                  {rt.name}
                </option>
              ))}
            </select>
          </div>

          {/* 2. 软类型选择器 */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              2. 软类型 (只读选择)
            </label>
            <select
              value={selectedSoftTypeId}
              onChange={e => setSelectedSoftTypeId(e.target.value)}
              className="w-full h-9 text-xs font-medium border border-slate-300 rounded-md px-2.5 bg-white text-slate-800 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              id="soft-type-selector"
            >
              {availableSoftTypes.map(st => (
                <option key={st.id} value={st.id}>
                  {st.name} {st.id === 'STAMPING_UNCONFIGURED' ? '(空态测试)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* 3. 软类型说明与特征 */}
          <div className="flex flex-col justify-center bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
            <span className="text-[11px] text-slate-500 font-medium">当前业务口径重点：</span>
            <span className="text-xs font-semibold text-slate-800 truncate">
              {currentSoftTypeObj?.exampleFieldsHint || '标准属性配置'}
            </span>
          </div>
        </div>
      </div>

      {/* 规则配置摘要看板 (Compact Summary Bar) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[11px] font-medium text-slate-500 block">当前规则上下文</span>
            <span className="text-xs font-bold text-slate-900 mt-0.5 block">
              {currentRootTypeObj?.name.split(' ')[0]} / {currentSoftTypeObj?.name.split(' ')[0]}
            </span>
          </div>
          <span className="px-2 py-0.5 text-[11px] font-semibold bg-slate-100 text-slate-700 rounded border border-slate-200">
            {currentScopeEditingRules.length} 条规则
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-slate-200 flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[11px] font-medium text-slate-500 block">参与评分字段数</span>
            <span className="text-sm font-bold text-blue-600 mt-0.5 block font-mono">
              {activeScoreRulesCount} 项
            </span>
          </div>
          <span className="text-xs text-slate-400">已启用参与计算</span>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-slate-200 flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[11px] font-medium text-slate-500 block">候选门槛字段数</span>
            <span className="text-sm font-bold text-amber-600 mt-0.5 block font-mono">
              {gateRulesCount} 项
            </span>
          </div>
          <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-50 text-amber-700 rounded border border-amber-200">
            不满足即排除候选
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-slate-200 flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[11px] font-medium text-slate-500 block">评分权重合计</span>
            <span
              className={`text-sm font-bold mt-0.5 block font-mono ${
                totalScoreWeight === 100 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {totalScoreWeight}%
            </span>
          </div>
          <span
            className={`px-2 py-0.5 text-[10px] font-semibold rounded border ${
              totalScoreWeight === 100
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}
          >
            {totalScoreWeight === 100 ? '权重已配平' : '建议调整为 100%'}
          </span>
        </div>
      </div>

      {/* 规则列表区域 */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        {/* 表格头部搜索与新建条 */}
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/70">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* 搜索 */}
            <div className="relative w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="搜索字段名或编码..."
                value={filterKeyword}
                onChange={e => setFilterKeyword(e.target.value)}
                className="w-full h-8 pl-8 pr-3 text-xs border border-slate-300 rounded-md bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                id="filter-rules-keyword-input"
              />
            </div>

            {/* 参与评分过滤 */}
            <select
              value={filterScoreActive}
              onChange={e => setFilterScoreActive(e.target.value)}
              className="h-8 text-xs border border-slate-300 rounded-md px-2.5 bg-white text-slate-700"
              id="filter-score-active-select"
            >
              <option value="ALL">全部评分状态</option>
              <option value="YES">仅参与评分</option>
              <option value="NO">不参与评分</option>
            </select>

            {/* 不满足处理方式过滤 */}
            <select
              value={filterMismatchAction}
              onChange={e => setFilterMismatchAction(e.target.value)}
              className="h-8 text-xs border border-slate-300 rounded-md px-2.5 bg-white text-slate-700"
              id="filter-mismatch-action-select"
            >
              <option value="ALL">全部不匹配处理</option>
              <option value="ZERO_AND_CONTINUE">记 0 分继续计算</option>
              <option value="EXCLUDE_CANDIDATE">排除整个候选 (门槛)</option>
            </select>
          </div>

          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors shadow-2xs self-start md:self-auto"
            id="add-new-rule-btn"
          >
            <Plus className="w-3.5 h-3.5" />
            新建字段规则
          </button>
        </div>

        {/* 规则数据表格 / 空态 */}
        {currentScopeEditingRules.length === 0 ? (
          <div className="p-12 text-center" id="empty-soft-type-rules-container">
            <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 text-amber-600 mx-auto flex items-center justify-center mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">当前软类型尚未配置相似度规则</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1.5 leading-relaxed">
              当前软类型尚未配置相似度规则。是否回退使用根类型规则仍待业务确认，请先新建本软类型规则。
            </p>
            <button
              onClick={handleOpenCreateModal}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              立即为该软类型配置规则
            </button>
          </div>
        ) : filteredRules.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            没有符合当前筛选条件的字段规则
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-2.5 px-4 w-12 text-center">序号</th>
                  <th className="py-2.5 px-4">字段名称 / 编码</th>
                  <th className="py-2.5 px-4">字段类型</th>
                  <th className="py-2.5 px-4">权重 (Weight)</th>
                  <th className="py-2.5 px-4">匹配方式与门槛处理</th>
                  <th className="py-2.5 px-4">缺失值处理</th>
                  <th className="py-2.5 px-4 text-center">参与评分</th>
                  <th className="py-2.5 px-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredRules.map((rule, idx) => {
                  const isGate = rule.mismatchAction === 'EXCLUDE_CANDIDATE';
                  return (
                    <tr
                      key={rule.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                      id={`rule-row-${rule.id}`}
                    >
                      <td className="py-3 px-4 text-center text-slate-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>

                      {/* 字段名称 / 编码 */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          {rule.fieldName}
                          {rule.displayUnit && rule.displayUnit !== '无' && (
                            <span className="text-[10px] font-normal text-slate-500 bg-slate-100 px-1 rounded">
                              {rule.displayUnit}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {rule.propertyCode}
                        </div>
                      </td>

                      {/* 字段类型 */}
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 text-[11px] font-medium bg-slate-100 text-slate-700 rounded border border-slate-200">
                          {rule.fieldType}
                        </span>
                      </td>

                      {/* 权重 */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono font-bold ${
                              rule.isScoreActive ? 'text-slate-900' : 'text-slate-400 line-through'
                            }`}
                          >
                            {rule.weight}%
                          </span>
                        </div>
                      </td>

                      {/* 匹配方式与门槛处理 */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="font-medium text-slate-800 text-[11px]">
                            {rule.matchType}
                          </span>
                          {isGate ? (
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-300 rounded"
                              title="门槛字段：不满足时直接排除整个候选"
                            >
                              <ShieldAlert className="w-3 h-3 text-amber-600" />
                              候选门槛 (不满足排除)
                            </span>
                          ) : (
                            <span className="inline-block text-[10px] font-normal text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                              记 0 分继续计算
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 缺失值处理 */}
                      <td className="py-3 px-4 text-slate-600 text-[11px]">
                        {rule.nullHandling || '候选缺失按 0 分'}
                      </td>

                      {/* 参与评分开关 */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggleScoreActive(rule)}
                          className={`w-9 h-5 inline-flex items-center rounded-full transition-colors p-0.5 ${
                            rule.isScoreActive ? 'bg-blue-600' : 'bg-slate-300'
                          }`}
                          title={rule.isScoreActive ? '点击停用评分' : '点击启用评分'}
                          id={`toggle-score-active-${rule.id}`}
                        >
                          <span
                            className={`w-4 h-4 rounded-full bg-white transition-transform ${
                              rule.isScoreActive ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </td>

                      {/* 操作 */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(rule)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="编辑规则"
                            id={`edit-rule-${rule.id}`}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteRule(rule.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title="删除规则"
                            id={`delete-rule-${rule.id}`}
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
        )}
      </div>

      {/* 规则新建 / 编辑模态抽屉 */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          id="rule-modal-backdrop"
        >
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* 模态框顶部 */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingRuleId ? '编辑字段相似度规则' : '新建字段相似度规则'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  当前上下文：
                  <span className="font-semibold text-slate-700">
                    {currentRootTypeObj?.name} &gt; {currentSoftTypeObj?.name}
                  </span>
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 模态框内容区：左侧表单配置 + 右侧实时反馈 */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* 左侧主要配置表单 (7 列) */}
              <div className="lg:col-span-7 space-y-4">
                {/* 1. 字段选择 */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    一阶段已映射字段 <span className="text-rose-500">*</span>
                  </label>
                  {editingRuleId ? (
                    <div className="p-2.5 bg-slate-100 rounded-md border border-slate-200 text-xs font-semibold text-slate-800 flex items-center justify-between">
                      <span>{formFieldName} ({formPropertyCode})</span>
                      <span className="text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {formFieldType}
                      </span>
                    </div>
                  ) : (
                    <select
                      value={formPropertyCode}
                      onChange={e => handleFieldSelectChange(e.target.value)}
                      className="w-full h-9 text-xs border border-slate-300 rounded-md px-2.5 bg-white text-slate-800 focus:ring-1 focus:ring-blue-500"
                    >
                      {availableStage1Fields.map(f => (
                        <option key={f.fieldCode} value={f.fieldCode}>
                          {f.displayName} ({f.fieldCode}) - {f.businessFieldType}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* 2. 匹配方式与动态参数 */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      匹配方式 <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formMatchType}
                      onChange={e => setFormMatchType(e.target.value)}
                      className="w-full h-9 text-xs border border-slate-300 rounded-md px-2.5 bg-white text-slate-800 focus:ring-1 focus:ring-blue-500"
                    >
                      {getAllowedMatchTypes(formFieldType).map(mt => (
                        <option key={mt} value={mt}>
                          {mt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      评分权重 (0 - 100%) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={formWeight}
                        onChange={e => setFormWeight(Math.max(0, Math.min(100, Number(e.target.value))))}
                        className="w-full h-9 text-xs font-mono font-bold border border-slate-300 rounded-md px-2.5 pr-8 bg-white text-slate-800 focus:ring-1 focus:ring-blue-500"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">
                        %
                      </span>
                    </div>
                  </div>
                </div>

                {/* 动态参数配置区 */}
                {formMatchType === '文本相似匹配 (非 AI)' && (
                  <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-md space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-blue-900">文本相似度下限阈值</span>
                      <span className="text-xs font-bold text-blue-700 font-mono">{formTextThreshold}%</span>
                    </div>
                    <input
                      type="range"
                      min="30"
                      max="90"
                      step="5"
                      value={formTextThreshold}
                      onChange={e => setFormTextThreshold(Number(e.target.value))}
                      className="w-full accent-blue-600"
                    />
                    <p className="text-[11px] text-blue-600">低于此阈值时判定为不匹配，按不满足规则处理。</p>
                  </div>
                )}

                {formMatchType === '数值容差匹配' && (
                  <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-md grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-blue-900 block mb-1">容差类型</label>
                      <select
                        value={formToleranceType}
                        onChange={e => setFormToleranceType(e.target.value as any)}
                        className="w-full h-8 text-xs border border-blue-300 rounded bg-white"
                      >
                        <option value="ABSOLUTE">绝对数值误差 (±Δ)</option>
                        <option value="PERCENTAGE">百分比相对误差 (±%)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-blue-900 block mb-1">
                        容差值 ({formDisplayUnit || '单位'})
                      </label>
                      <input
                        type="number"
                        step="0.05"
                        value={formToleranceValue}
                        onChange={e => setFormToleranceValue(Number(e.target.value))}
                        className="w-full h-8 text-xs border border-blue-300 rounded px-2 bg-white font-mono"
                      />
                    </div>
                  </div>
                )}

                {/* 3. 字段不满足匹配条件时处理 (核心规范: 单选卡片) */}
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <label className="text-xs font-bold text-slate-800 block">
                    字段不满足匹配条件时处理 <span className="text-rose-500">*</span>
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* 选项 1: ZERO_AND_CONTINUE */}
                    <div
                      onClick={() => setFormMismatchAction('ZERO_AND_CONTINUE')}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        formMismatchAction === 'ZERO_AND_CONTINUE'
                          ? 'border-blue-600 bg-blue-50/40 ring-1 ring-blue-600'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="mismatchAction"
                          checked={formMismatchAction === 'ZERO_AND_CONTINUE'}
                          onChange={() => setFormMismatchAction('ZERO_AND_CONTINUE')}
                          className="accent-blue-600"
                        />
                        <span className="text-xs font-bold text-slate-900">
                          该字段记 0 分，候选继续计算
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed pl-5">
                        该字段不命中时仅失去本字段得分，候选仍参与其他字段评分和最终排序。
                      </p>
                    </div>

                    {/* 选项 2: EXCLUDE_CANDIDATE */}
                    <div
                      onClick={() => setFormMismatchAction('EXCLUDE_CANDIDATE')}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        formMismatchAction === 'EXCLUDE_CANDIDATE'
                          ? 'border-amber-600 bg-amber-50/40 ring-1 ring-amber-600'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="mismatchAction"
                          checked={formMismatchAction === 'EXCLUDE_CANDIDATE'}
                          onChange={() => setFormMismatchAction('EXCLUDE_CANDIDATE')}
                          className="accent-amber-600"
                        />
                        <span className="text-xs font-bold text-slate-900">
                          排除整个候选 (门槛字段)
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed pl-5">
                        该字段将成为候选门槛，不满足时该候选不再评分，也不会进入应用端结果。
                      </p>
                    </div>
                  </div>

                  {/* 门槛黄色警示横幅 */}
                  {formMismatchAction === 'EXCLUDE_CANDIDATE' && (
                    <div className="p-3 bg-amber-50 border border-amber-300 rounded-md text-amber-800 text-xs flex items-start gap-2 animate-in fade-in">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <p className="leading-relaxed">
                        该设置会缩小候选范围。多个字段均设置为“排除整个候选”时，任一字段不满足即排除候选。建议先通过查询预览验证。
                      </p>
                    </div>
                  )}
                </div>

                {/* 4. 缺失值处理与模板 */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">缺失值处理</label>
                    <select
                      value={formNullHandling}
                      onChange={e => setFormNullHandling(e.target.value)}
                      className="w-full h-8 text-xs border border-slate-300 rounded-md px-2 bg-white text-slate-800"
                    >
                      <option value="候选缺失按 0 分">候选缺失按 0 分 (计入分母)</option>
                      <option value="不参与计算 (权重均摊到其他有值项)">不参与计算 (不计入分母)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">是否参与评分</label>
                    <select
                      value={formIsScoreActive ? 'YES' : 'NO'}
                      onChange={e => setFormIsScoreActive(e.target.value === 'YES')}
                      className="w-full h-8 text-xs border border-slate-300 rounded-md px-2 bg-white text-slate-800 font-semibold"
                    >
                      <option value="YES">是 (参与相似度总分折算)</option>
                      <option value="NO">否 (仅作为展示与对比)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 右侧实时试算仿真器 (5 列) */}
              <div className="lg:col-span-5 bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                      实时规则试算仿真
                    </span>
                    <span className="text-[10px] text-slate-400">瞬时反馈</span>
                  </div>

                  {/* 模拟输入对 */}
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-[11px] font-semibold text-slate-600 block mb-0.5">
                        基准参考值 (源值)
                      </span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={trialSrcVal}
                          onChange={e => setTrialSrcVal(e.target.value)}
                          className="flex-1 h-8 text-xs border border-slate-300 rounded px-2 bg-white"
                          placeholder="例如: 10 或 SUS304"
                        />
                        {formDisplayUnit && formDisplayUnit !== '无' && (
                          <span className="text-xs text-slate-500 font-mono">{formDisplayUnit}</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] font-semibold text-slate-600 block mb-0.5">
                        候选对象值 (目标值)
                      </span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={trialCandVal}
                          onChange={e => setTrialCandVal(e.target.value)}
                          className="flex-1 h-8 text-xs border border-slate-300 rounded px-2 bg-white"
                          placeholder="例如: 16 或 A2-70"
                        />
                        {formDisplayUnit && formDisplayUnit !== '无' && (
                          <span className="text-xs text-slate-500 font-mono">{formDisplayUnit}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 仿真结果卡片 */}
                  <div className="p-3 rounded-lg border bg-white space-y-2">
                    <div className="text-[11px] text-slate-400 font-semibold">试算判定结果：</div>
                    <div
                      className={`p-2.5 rounded-md text-xs font-bold flex items-center gap-2 ${
                        modalTrialResult.outcomeType === 'SUCCESS'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : modalTrialResult.outcomeType === 'PARTIAL'
                          ? 'bg-blue-50 text-blue-800 border border-blue-200'
                          : modalTrialResult.outcomeType === 'EXCLUDED'
                          ? 'bg-rose-50 text-rose-800 border border-rose-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {modalTrialResult.outcomeType === 'EXCLUDED' ? (
                        <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                      ) : modalTrialResult.outcomeType === 'SUCCESS' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <Info className="w-4 h-4 text-blue-600 shrink-0" />
                      )}
                      <span>{modalTrialResult.outcomeText}</span>
                    </div>

                    <div className="text-[11px] text-slate-500 space-y-1 pt-1 border-t border-slate-100">
                      <div className="flex justify-between">
                        <span>匹配率：</span>
                        <span className="font-mono font-semibold">{(modalTrialResult.matchRate * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>折算分值：</span>
                        <span className="font-mono font-semibold">{modalTrialResult.weightedScore} 分</span>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 leading-tight">
                  提示：调整左侧参数或不匹配处理模式，右侧将即时响应判定结论。
                </p>
              </div>
            </div>

            {/* 模态框底部操作 */}
            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveRule}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors shadow-2xs"
              >
                保存规则
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
