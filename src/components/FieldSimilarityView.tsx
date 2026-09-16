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
  ArrowRight,
  Clock
} from 'lucide-react';
import {
  FieldSimilarityRule,
  MatchConfig,
  ChangeRecord,
  SimilarityGroupConfigStatus,
  SimilarityTierConfigMap,
  isObjectRulesModified,
  restoreObjectRules,
  TrialFeedback,
  MismatchAction
} from '../types';
import {
  rootTypeOptions,
  softTypeOptions,
  similarityClassificationOptions,
  buildSimilarityRuleScopeKey,
  parseSimilarityRuleScopeKey,
  getSimilarityRuleScopeLabel,
  stage1MappedFields,
  mockUnitCatalog,
  convertToBaseUnit,
  convertFromBaseUnit,
  processEnumList,
  formatWithDisplayUnit,
  calculateFieldMatchRate,
  isSimilarityValueMissing
} from '../data';
import { useFeedback } from './ui/FeedbackProvider';
import { paginateRows, TablePagination } from './ui/TablePagination';
import { HelpTooltip } from './ui/HelpTooltip';
import {
  createSimilarityVersionSignature,
  formatSimilarityTierRange,
  getSimilarityTierConfig,
  validateSimilarityTierConfig
} from '../similarityTier';

interface FieldSimilarityViewProps {
  editingRules: FieldSimilarityRule[];
  onUpdateEditingRules: (newRules: FieldSimilarityRule[]) => void;
  savedRules: FieldSimilarityRule[];
  onUpdateSavedRules: (newRules: FieldSimilarityRule[]) => void;
  activeRules: FieldSimilarityRule[];
  onUpdateActiveRules: (newRules: FieldSimilarityRule[]) => void;
  changeRecords: ChangeRecord[];
  onUpdateChangeRecords: (newRecords: ChangeRecord[]) => void;
  objectConfigStatus: Record<string, SimilarityGroupConfigStatus>;
  onUpdateConfigStatus: (status: Record<string, SimilarityGroupConfigStatus>) => void;
  editingTierConfigs: SimilarityTierConfigMap;
  onUpdateEditingTierConfigs: (configs: SimilarityTierConfigMap) => void;
  savedTierConfigs: SimilarityTierConfigMap;
  onUpdateSavedTierConfigs: (configs: SimilarityTierConfigMap) => void;
  activeTierConfigs: SimilarityTierConfigMap;
  onUpdateActiveTierConfigs: (configs: SimilarityTierConfigMap) => void;
  previewedSavedSignatures: Record<string, string>;
  canManageConfig?: boolean;
  onNavigate?: (view: string) => void;
}

const getAllowedMatchTypes = (fieldType: string): string[] => {
  const typeUpper = (fieldType || '').toUpperCase();
  if (typeUpper.includes('LONG_TEXT')) {
    return ['精确值匹配'];
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

type BatchRuleSetting = 'SCORE_ACTIVE' | 'MISMATCH_ACTION' | 'NULL_HANDLING';

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
  editingTierConfigs,
  onUpdateEditingTierConfigs,
  savedTierConfigs,
  onUpdateSavedTierConfigs,
  activeTierConfigs,
  onUpdateActiveTierConfigs,
  previewedSavedSignatures,
  canManageConfig = true,
  onNavigate
}) => {
  const { notify, confirm } = useFeedback();
  // 二阶段相似度搜索只面向零部件。softTypeId 作为规则集范围键：类型通用或分类专用。
  const selectedRootTypeId = 'PART';
  const [selectedSoftTypeId, setSelectedSoftTypeId] = useState<string>('IN_HOUSE');
  const [ruleSetTypeFilter, setRuleSetTypeFilter] = useState('ALL');
  const [ruleSetKindFilter, setRuleSetKindFilter] = useState<'ALL' | 'TYPE_GENERIC' | 'CLASSIFICATION_SPECIFIC'>('ALL');
  const [ruleSetStatusFilter, setRuleSetStatusFilter] = useState<'ALL' | 'ENABLED' | 'DISABLED' | 'UNCONFIGURED'>('ALL');

  const ruleTypeOptions = useMemo(() => softTypeOptions.filter(option => option.rootTypeId === selectedRootTypeId), [selectedRootTypeId]);
  const currentScope = parseSimilarityRuleScopeKey(selectedSoftTypeId);
  const currentTypeObj = ruleTypeOptions.find(option => option.id === currentScope.typeId);
  const currentClassification = similarityClassificationOptions.find(option => option.typeId === currentScope.typeId && option.id === currentScope.classificationId);
  const currentScopeLabel = getSimilarityRuleScopeLabel(selectedSoftTypeId);
  const availableClassifications = similarityClassificationOptions.filter(option => option.typeId === currentScope.typeId);
  const availableSoftTypes = useMemo(() => {
    const scopes = ruleTypeOptions.flatMap(type => [
      { ...type, id: type.id, name: getSimilarityRuleScopeLabel(type.id) },
      ...similarityClassificationOptions.filter(item => item.typeId === type.id).map(item => ({
        id: buildSimilarityRuleScopeKey(type.id, item.id),
        rootTypeId: selectedRootTypeId,
        code: item.code,
        name: getSimilarityRuleScopeLabel(buildSimilarityRuleScopeKey(type.id, item.id)),
        description: item.path
      }))
    ]);
    return scopes;
  }, [ruleTypeOptions, selectedRootTypeId]);
  const visibleRuleScopes = useMemo(() => availableSoftTypes.filter(scope => {
    const parsed = parseSimilarityRuleScopeKey(scope.id);
    if (ruleSetTypeFilter !== 'ALL' && parsed.typeId !== ruleSetTypeFilter) return false;
    if (ruleSetKindFilter === 'TYPE_GENERIC' && parsed.classificationId) return false;
    if (ruleSetKindFilter === 'CLASSIFICATION_SPECIFIC' && !parsed.classificationId) return false;
    const ruleCount = editingRules.filter(rule => rule.rootTypeId === selectedRootTypeId && rule.softTypeId === scope.id).length;
    const status = objectConfigStatus[scope.id];
    if (ruleSetStatusFilter === 'ENABLED' && !status?.enabled) return false;
    if (ruleSetStatusFilter === 'DISABLED' && (status?.enabled || !status?.configVersion || status.configVersion === '-')) return false;
    if (ruleSetStatusFilter === 'UNCONFIGURED' && ruleCount > 0) return false;
    return true;
  }), [availableSoftTypes, editingRules, objectConfigStatus, ruleSetKindFilter, ruleSetStatusFilter, ruleSetTypeFilter, selectedRootTypeId]);

  const currentRootTypeObj = rootTypeOptions.find(rt => rt.id === selectedRootTypeId);
  const currentSoftTypeObj = availableSoftTypes.find(st => st.id === selectedSoftTypeId);
  const currentGroupStatus = objectConfigStatus[selectedSoftTypeId] || { enabled: false, configVersion: '-', lastModifiedAt: '-' };
  const currentTierConfig = getSimilarityTierConfig(editingTierConfigs, selectedSoftTypeId);
  const currentSavedTierConfig = getSimilarityTierConfig(savedTierConfigs, selectedSoftTypeId);
  const currentActiveTierConfig = getSimilarityTierConfig(activeTierConfigs, selectedSoftTypeId);

  // 2. 列表筛选状态
  const [filterKeyword, setFilterKeyword] = useState('');
  const [filterScoreActive, setFilterScoreActive] = useState('ALL');
  const [filterMismatchAction, setFilterMismatchAction] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedRuleIds, setSelectedRuleIds] = useState<string[]>([]);
  const [isBatchSettingOpen, setIsBatchSettingOpen] = useState(false);
  const [batchRuleSetting, setBatchRuleSetting] = useState<BatchRuleSetting>('SCORE_ACTIVE');
  const [batchScoreActive, setBatchScoreActive] = useState<'ENABLE' | 'DISABLE'>('ENABLE');
  const [batchMismatchAction, setBatchMismatchAction] = useState<MismatchAction>('ZERO_AND_CONTINUE');
  const [batchNullHandling, setBatchNullHandling] = useState<'计0分' | '不参与本次计算（跳过）'>('计0分');

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
  const [formNullHandling, setFormNullHandling] = useState('计0分');
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
    setIsBatchSettingOpen(false);
    setSelectedRuleIds([]);
  }, [selectedRootTypeId, selectedSoftTypeId]);

  useEffect(() => {
    if (!availableSoftTypes.some(option => option.id === selectedSoftTypeId)) setSelectedSoftTypeId('IN_HOUSE');
  }, [availableSoftTypes, selectedSoftTypeId]);

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
  const { currentPage, rows: pageRules } = paginateRows<FieldSimilarityRule>(filteredRules, page, pageSize);

  const selectedRules = useMemo(
    () => currentScopeEditingRules.filter(rule => selectedRuleIds.includes(rule.id)),
    [currentScopeEditingRules, selectedRuleIds]
  );
  const filteredRuleIds = useMemo(() => filteredRules.map(rule => rule.id), [filteredRules]);
  const allFilteredRulesSelected = filteredRuleIds.length > 0 && filteredRuleIds.every(id => selectedRuleIds.includes(id));
  const someFilteredRulesSelected = filteredRuleIds.some(id => selectedRuleIds.includes(id));

  useEffect(() => {
    const currentIds = new Set(currentScopeEditingRules.map(rule => rule.id));
    setSelectedRuleIds(previous => previous.filter(id => currentIds.has(id)));
  }, [currentScopeEditingRules]);

  useEffect(() => {
    setPage(1);
  }, [selectedRootTypeId, selectedSoftTypeId]);

  // 统计指标
  const activeScoreRulesCount = currentScopeEditingRules.filter(r => r.isScoreActive && r.enabled).length;
  const gateRulesCount = currentScopeEditingRules.filter(r => r.mismatchAction === 'EXCLUDE_CANDIDATE' && r.isScoreActive && r.enabled).length;
  const totalScoreWeight = currentScopeEditingRules
    .filter(r => r.isScoreActive && r.enabled)
    .reduce((sum, r) => sum + r.weight, 0);
  const tierConfigError = validateSimilarityTierConfig(currentTierConfig);
  const matchConfigError = useMemo(() => {
    if (!formIsScoreActive) return '';
    if (formMatchType === '文本相似匹配 (非 AI)' && (!Number.isFinite(formTextThreshold) || formTextThreshold < 0 || formTextThreshold > 100)) return '文本相似度阈值请输入 0～100。';
    if (formMatchType === '数值容差匹配' && (!Number.isFinite(formToleranceValue) || formToleranceValue < 0)) return '容差值必须大于或等于 0。';
    if (formMatchType === '数值距离衰减') {
      if (!Number.isFinite(formDecayFullRange) || formDecayFullRange < 0) return '满分允许偏差必须大于或等于 0。';
      if (!Number.isFinite(formDecayZeroBoundary) || formDecayZeroBoundary <= formDecayFullRange) return '降至零分的偏差必须大于满分允许偏差。';
    }
    if (formMatchType === '层级关系匹配') {
      if (!Number.isInteger(formHierarchyMaxGap) || formHierarchyMaxGap < 1) return '最大层级差必须是大于或等于 1 的整数。';
      if (!Number.isFinite(formHierarchyDeduction) || formHierarchyDeduction < 0 || formHierarchyDeduction > 100) return '每级扣减请输入 0～100。';
    }
    return '';
  }, [formDecayFullRange, formDecayZeroBoundary, formHierarchyDeduction, formHierarchyMaxGap, formIsScoreActive, formMatchType, formTextThreshold, formToleranceValue]);

  // 检查是否有未保存修改
  const isModified = useMemo(() => {
    const tierChanged = currentTierConfig.highStart !== currentSavedTierConfig.highStart || currentTierConfig.mediumStart !== currentSavedTierConfig.mediumStart;
    return tierChanged || isObjectRulesModified(editingRules, savedRules, selectedRootTypeId, selectedSoftTypeId);
  }, [currentSavedTierConfig.highStart, currentSavedTierConfig.mediumStart, currentTierConfig.highStart, currentTierConfig.mediumStart, editingRules, savedRules, selectedRootTypeId, selectedSoftTypeId]);
  const hasSavedDraft = useMemo(() => {
    const tierChanged = currentSavedTierConfig.highStart !== currentActiveTierConfig.highStart || currentSavedTierConfig.mediumStart !== currentActiveTierConfig.mediumStart;
    return tierChanged || isObjectRulesModified(savedRules, activeRules, selectedRootTypeId, selectedSoftTypeId);
  }, [savedRules, activeRules, currentSavedTierConfig.highStart, currentSavedTierConfig.mediumStart, currentActiveTierConfig.highStart, currentActiveTierConfig.mediumStart, selectedRootTypeId, selectedSoftTypeId]);
  const currentScopeSavedRules = useMemo(() => savedRules.filter(rule => rule.rootTypeId === selectedRootTypeId && rule.softTypeId === selectedSoftTypeId), [savedRules, selectedRootTypeId, selectedSoftTypeId]);
  const savedScoreRulesCount = currentScopeSavedRules.filter(rule => rule.enabled && rule.isScoreActive).length;
  const savedScoreWeight = currentScopeSavedRules.filter(rule => rule.enabled && rule.isScoreActive).reduce((sum, rule) => sum + rule.weight, 0);
  const savedVersionSignature = useMemo(
    () => createSimilarityVersionSignature(savedRules, selectedRootTypeId, selectedSoftTypeId, currentSavedTierConfig, 'stage1_type_and_classification_roles'),
    [savedRules, selectedRootTypeId, selectedSoftTypeId, currentSavedTierConfig]
  );
  const isSavedPreviewValid = previewedSavedSignatures[selectedSoftTypeId] === savedVersionSignature;
  const isCurrentDraftPreviewValid = !isModified && isSavedPreviewValid;
  const hasPublishedVersion = currentGroupStatus.configVersion !== '-' && activeRules.some(rule => rule.rootTypeId === selectedRootTypeId && rule.softTypeId === selectedSoftTypeId);
  const publishDisabled = !canManageConfig || Boolean(tierConfigError) || isModified || !hasSavedDraft || savedScoreRulesCount === 0 || savedScoreWeight !== 100 || !isSavedPreviewValid;
  const publishButtonLabel = !hasPublishedVersion ? '发布规则' : currentGroupStatus.enabled ? '发布更新' : '发布规则';
  const publishButtonTitle = isModified
    ? '请先保存当前编辑'
    : !hasSavedDraft
    ? '当前没有待发布草稿'
    : savedScoreWeight !== 100
    ? `草稿版本权重合计必须为 100%，当前为 ${savedScoreWeight}%`
    : !isSavedPreviewValid
    ? '请先预览草稿版本'
    : '发布已保存且预览成功的草稿版本';
  const draftStatusLabel = isModified
    ? '编辑中（请先保存）'
    : !hasSavedDraft
    ? ''
    : tierConfigError
    ? `草稿分档配置有误：${tierConfigError}`
    : savedScoreRulesCount === 0
    ? '草稿没有参与评分字段'
    : savedScoreWeight !== 100
    ? `草稿权重 ${savedScoreWeight}%（需调整为 100%）`
    : !isSavedPreviewValid
    ? '草稿待预览（通过后可发布）'
    : '草稿已预览（可以发布）';
  const draftStatusReady = hasSavedDraft && !isModified && !tierConfigError && savedScoreRulesCount > 0 && savedScoreWeight === 100 && isSavedPreviewValid;

  // 一阶段可选字段 (根据当前根类型及软类型过滤)
  const availableStage1Fields = useMemo(() => {
    const fields = stage1MappedFields.filter(field => {
      if (field.rootTypeId !== selectedRootTypeId || !field.enabled) return false;
      return !field.softTypeId || field.softTypeId === currentScope.typeId;
    });
    return Array.from(new Map(fields.map(field => [field.fieldCode, field])).values());
  }, [selectedRootTypeId, currentScope.typeId]);
  const unconfiguredStage1Fields = useMemo(
    () => availableStage1Fields.filter(
      field => !currentScopeEditingRules.some(rule => rule.propertyCode === field.fieldCode)
    ),
    [availableStage1Fields, currentScopeEditingRules]
  );
  const selectedFormField = availableStage1Fields.find(field => field.fieldCode === formPropertyCode);
  const formFieldScoreUnsupported = selectedFormField?.isMultiValue === true;

  // 打开新建规则模态框
  const handleOpenCreateModal = () => {
    const unconfigured = unconfiguredStage1Fields[0];
    if (!unconfigured) {
      notify('当前规则集的可展示对比字段均已配置，不能重复新增同一字段规则。', 'warning');
      return;
    }

    setEditingRuleId(null);
    setFormFieldId(unconfigured.fieldId);
    setFormFieldName(unconfigured.displayName);
    setFormPropertyCode(unconfigured.fieldCode);
    setFormFieldType(unconfigured.businessFieldType);
    setFormWeight(20);
    setFormMatchType(getAllowedMatchTypes(unconfigured.businessFieldType)[0]);
    setFormNullHandling('计0分');
    setFormMismatchAction('ZERO_AND_CONTINUE');
    setFormIsScoreActive(false);
    setFormShowHitReason(true);
    setFormShowDiffFields(true);
    setFormHitReasonTemplate(`${unconfigured.displayName}匹配一致`);
    setFormDiffFieldsTemplate(`${unconfigured.displayName}存在差异`);
    setFormUnitFamily(unconfigured.unitFamily || '无');
    setFormBaseUnit(unconfigured.baseUnit || '无');
    setFormDisplayUnit(unconfigured.displayUnit || '无');

    // 默认试算值
    if (unconfigured.businessFieldType.includes('NUMBER')) {
      setFormToleranceType('PERCENTAGE');
      setFormToleranceValue(2);
      setFormToleranceDirection('BOTH');
      if (unconfigured.unitFamily === '长度') {
        setTrialSrcVal('1');
        setTrialCandVal('102');
        setTrialSrcUnit('m');
        setTrialCandUnit('cm');
      } else {
        setTrialSrcVal('10');
        setTrialCandVal('10.1');
        setTrialSrcUnit(unconfigured.baseUnit || unconfigured.displayUnit || '');
        setTrialCandUnit(unconfigured.displayUnit || unconfigured.baseUnit || '');
      }
    } else {
      setTrialSrcVal(unconfigured.fieldCode === 'core_material' ? '不锈钢 SUS304' : 'ABC');
      setTrialCandVal(unconfigured.fieldCode === 'core_material' ? '合金钢 42CrMo' : ' ABC ');
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
    setFormNullHandling(rule.nullHandling || '计0分');
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
      if (rule.unitFamily === '长度' && rule.matchConfig?.kind === 'NUMERIC_TOLERANCE' && rule.matchConfig.toleranceType === 'PERCENTAGE') {
        setTrialSrcVal('1');
        setTrialCandVal('102');
        setTrialSrcUnit('m');
        setTrialCandUnit('cm');
      } else {
        setTrialSrcVal('10');
        setTrialCandVal('10.15');
        setTrialSrcUnit(rule.displayUnit || rule.baseUnit || '');
        setTrialCandUnit(rule.displayUnit || rule.baseUnit || '');
      }
    } else {
      if (rule.matchType === '精确值匹配' && rule.fieldType.toUpperCase().includes('TEXT')) {
        setTrialSrcVal('ABC');
        setTrialCandVal(' ABC ');
      } else {
        setTrialSrcVal(rule.propertyCode === 'core_material' ? '不锈钢 SUS304' : 'SUS304');
        setTrialCandVal(rule.propertyCode === 'core_material' ? '合金钢 42CrMo' : 'A2-70');
      }
      setTrialSrcUnit('');
      setTrialCandUnit('');
    }

    setIsModalOpen(true);
  };

  // 字段选择器变更
  const handleFieldSelectChange = (fieldCode: string) => {
    const selectedField = availableStage1Fields.find(f => f.fieldCode === fieldCode);
    if (!selectedField) return;
    if (currentScopeEditingRules.some(rule => rule.id !== editingRuleId && rule.propertyCode === fieldCode)) {
      notify('该字段已经配置过规则，不能重复添加。', 'warning');
      return;
    }
    setFormFieldId(selectedField.fieldId);
    setFormFieldName(selectedField.displayName);
    setFormPropertyCode(selectedField.fieldCode);
    setFormFieldType(selectedField.businessFieldType);
    setFormMatchType(getAllowedMatchTypes(selectedField.businessFieldType)[0]);
    setFormUnitFamily(selectedField.unitFamily || '无');
    setFormBaseUnit(selectedField.baseUnit || '无');
    setFormDisplayUnit(selectedField.displayUnit || '无');
    setFormIsScoreActive(false);
    setFormHitReasonTemplate(`${selectedField.displayName}匹配一致`);
    setFormDiffFieldsTemplate(`${selectedField.displayName}存在差异`);
    if (selectedField.businessFieldType.includes('NUMBER')) {
      setFormToleranceType('PERCENTAGE');
      setFormToleranceValue(2);
      setFormToleranceDirection('BOTH');
      if (selectedField.unitFamily === '长度') {
        setTrialSrcVal('1');
        setTrialCandVal('102');
        setTrialSrcUnit('m');
        setTrialCandUnit('cm');
      }
    } else if (selectedField.fieldCode === 'core_material') {
      setTrialSrcVal('不锈钢 SUS304');
      setTrialCandVal('合金钢 42CrMo');
      setTrialSrcUnit('');
      setTrialCandUnit('');
    } else {
      setTrialSrcVal('ABC');
      setTrialCandVal(' ABC ');
      setTrialSrcUnit('');
      setTrialCandUnit('');
    }
  };

  // 保存规则到当前编辑态
  const handleSaveRule = () => {
    if (!formFieldName || !formPropertyCode) {
      notify('请选择有效的一阶段字段。', 'warning');
      return;
    }
    if (formIsScoreActive && (!Number.isFinite(formWeight) || formWeight < 0 || formWeight > 100)) {
      notify('评分权重请输入 0～100 之间的数字。', 'warning');
      return;
    }
    if (matchConfigError) {
      notify(matchConfigError, 'warning');
      return;
    }
    if (currentScopeEditingRules.some(rule => rule.id !== editingRuleId && rule.propertyCode === formPropertyCode)) {
      notify('保存失败：同一规则集下，一个字段只能配置一条规则。', 'warning');
      return;
    }
    const selectedField = availableStage1Fields.find(field => field.fieldCode === formPropertyCode);
    if (selectedField?.isMultiValue && formIsScoreActive) {
      notify('多值属性当前只能作为展示对比字段，不能参与相似度评分。', 'warning');
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
      softTypeName: currentScopeLabel,
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
  const handleDeleteRule = async (id: string) => {
    if (await confirm({ title: '删除字段规则', message: '确定要删除该字段相似度规则吗？', confirmText: '删除', tone: 'danger' })) {
      const updatedRules = editingRules.filter(r => r.id !== id);
      onUpdateEditingRules(updatedRules);
    }
  };

  const handleToggleRuleSelection = (ruleId: string) => {
    setSelectedRuleIds(previous =>
      previous.includes(ruleId) ? previous.filter(id => id !== ruleId) : [...previous, ruleId]
    );
  };

  const handleToggleSelectFilteredRules = () => {
    setSelectedRuleIds(previous => {
      if (allFilteredRulesSelected) {
        return previous.filter(id => !filteredRuleIds.includes(id));
      }
      return Array.from(new Set([...previous, ...filteredRuleIds]));
    });
  };

  const handleApplyBatchRuleSetting = () => {
    if (!canManageConfig) {
      notify('仅配置管理员可批量修改相似度规则。', 'warning');
      return;
    }
    if (selectedRuleIds.length === 0) {
      notify('请先选择需要设置的字段规则。', 'warning');
      return;
    }

    let skippedMultiValueCount = 0;
    const updatedRules = editingRules.map(rule => {
      if (!selectedRuleIds.includes(rule.id)) return rule;

      if (batchRuleSetting === 'SCORE_ACTIVE') {
        const shouldEnable = batchScoreActive === 'ENABLE';
        const selectedField = availableStage1Fields.find(field => field.fieldCode === rule.propertyCode);
        if (shouldEnable && selectedField?.isMultiValue) {
          skippedMultiValueCount += 1;
          return rule;
        }
        return { ...rule, isScoreActive: shouldEnable };
      }
      if (batchRuleSetting === 'MISMATCH_ACTION') {
        return { ...rule, mismatchAction: batchMismatchAction };
      }
      return { ...rule, nullHandling: batchNullHandling };
    });

    onUpdateEditingRules(updatedRules);
    setIsBatchSettingOpen(false);
    setSelectedRuleIds([]);

    const appliedCount = selectedRules.length - skippedMultiValueCount;
    if (skippedMultiValueCount > 0) {
      notify(`已更新 ${appliedCount} 条规则；${skippedMultiValueCount} 个多值字段不能参与评分，已跳过。`, 'warning');
    } else {
      notify(`已批量更新 ${appliedCount} 条字段规则；请保存草稿并重新预览。`, 'success');
    }
  };

  // 快速切换参与评分开关
  const handleToggleScoreActive = (rule: FieldSimilarityRule) => {
    if (!rule.isScoreActive) {
      const selectedField = availableStage1Fields.find(field => field.fieldCode === rule.propertyCode);
      if (selectedField?.isMultiValue) {
        notify('该字段为多值属性，当前只能展示对比，不能参与相似度评分。', 'warning');
        return;
      }
      handleOpenEditModal(rule);
      setFormIsScoreActive(true);
      notify('请确认评分参数后保存；恢复参与评分时会重新校验。', 'info');
      return;
    }

    const updated = editingRules.map(r => {
      if (r.id === rule.id) {
        return { ...r, isScoreActive: false };
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

  // 保存当前规则集配置（保存草稿）
  const handleSaveDraft = () => {
    if (!canManageConfig) {
      notify('仅配置管理员可修改并保存相似度规则。', 'warning');
      return;
    }
    if (tierConfigError) {
      notify(`保存失败：${tierConfigError}`, 'warning');
      return;
    }
    const savedAt = new Date().toISOString().replace('T', ' ').slice(0, 19);
    // 将当前规则集的 editingRules 同步到 savedRules
    const otherSavedRules = savedRules.filter(
      r => !(r.rootTypeId === selectedRootTypeId && r.softTypeId === selectedSoftTypeId)
    );
    const thisSavedRules = currentScopeEditingRules.map(r => ({
      ...r,
      configVersion: 'v2.5.0-saved',
      lastEditTime: savedAt
    }));
    const newSavedRules = [...otherSavedRules, ...thisSavedRules];

    onUpdateSavedRules(newSavedRules);
    onUpdateSavedTierConfigs({
      ...savedTierConfigs,
      [selectedSoftTypeId]: { ...currentTierConfig, configVersion: 'v2.5.0-saved', lastModifiedAt: savedAt }
    });

    // 记录变更
    const tierChanged = currentTierConfig.highStart !== currentSavedTierConfig.highStart || currentTierConfig.mediumStart !== currentSavedTierConfig.mediumStart;
    const newRecord: ChangeRecord = {
      id: `CR-${Date.now()}`,
      objectType: `${currentRootTypeObj?.name.split(' ')[0]} / ${currentSoftTypeObj?.name.split(' ')[0]}`,
      rootTypeId: selectedRootTypeId,
      groupValueId: selectedSoftTypeId,
      groupValueName: currentSoftTypeObj?.name.split(' ')[0],
      configVersion: 'v2.5.0-saved',
      operationType: '保存',
      summary: `保存了【${currentScopeLabel}】的 ${thisSavedRules.length} 项字段规则${tierChanged ? '及相似度分档' : ''}。保存草稿不影响当前应用版本。`,
      beforeSummary: tierChanged ? `相似度分档：${formatSimilarityTierRange(currentSavedTierConfig)}` : undefined,
      afterSummary: tierChanged ? `相似度分档：${formatSimilarityTierRange(currentTierConfig)}` : undefined,
      operator: '李晓华 (数据标准管理员)',
      time: savedAt,
      result: 'SUCCESS'
    };
    onUpdateChangeRecords([newRecord, ...changeRecords]);
    notify('配置已保存为草稿，可在查询预览中选择“草稿版本”进行验证。', 'success');
  };

  // 发布已保存且预览成功的当前规则集版本
  const handlePublishActive = async () => {
    if (!canManageConfig) {
      notify('仅配置管理员可发布相似度规则。', 'warning');
      return;
    }
    if (isModified) {
      notify('请先保存当前编辑内容，再对“草稿版本”重新预览。', 'warning');
      return;
    }
    if (!hasSavedDraft) {
      notify('当前没有待发布的已保存草稿。', 'warning');
      return;
    }
    const savedTierError = validateSimilarityTierConfig(currentSavedTierConfig);
    if (savedTierError) {
      notify(`发布失败：${savedTierError}`, 'warning');
      return;
    }
    if (savedScoreRulesCount === 0 || savedScoreWeight !== 100) {
      notify(`发布失败：草稿版本的参与评分字段权重合计必须为 100%，当前为 ${savedScoreWeight}%。`, 'warning');
      return;
    }
    if (!isSavedPreviewValid) {
      notify('发布前需在查询预览中选择“草稿版本”并成功试算。', 'warning');
      return;
    }

    const otherActiveRules = activeRules.filter(
      r => !(r.rootTypeId === selectedRootTypeId && r.softTypeId === selectedSoftTypeId)
    );
    const publishedAt = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const thisActiveRules = currentScopeSavedRules.map(r => ({
      ...r,
      configVersion: 'v2.5.0-release',
      lastEditTime: publishedAt
    }));
    const newActiveRules = [...otherActiveRules, ...thisActiveRules];

    onUpdateActiveRules(newActiveRules);
    onUpdateActiveTierConfigs({
      ...activeTierConfigs,
      [selectedSoftTypeId]: { ...currentSavedTierConfig, configVersion: 'v2.5.0-release', lastModifiedAt: publishedAt }
    });
    const remainsEnabled = hasPublishedVersion ? currentGroupStatus.enabled : false;
    onUpdateConfigStatus({
      ...objectConfigStatus,
      [selectedSoftTypeId]: { enabled: remainsEnabled, configVersion: 'v2.5.0-release', lastModifiedAt: publishedAt }
    });

    // 记录发布变更
    const newRecord: ChangeRecord = {
      id: `CR-${Date.now()}`,
      objectType: `${currentRootTypeObj?.name.split(' ')[0]} / ${currentSoftTypeObj?.name.split(' ')[0]}`,
      rootTypeId: selectedRootTypeId,
      groupValueId: selectedSoftTypeId,
      groupValueName: currentSoftTypeObj?.name.split(' ')[0],
      configVersion: 'v2.5.0-release',
      operationType: '发布',
      summary: `发布了【${currentScopeLabel}】的草稿版本（${savedScoreRulesCount} 个评分字段）；${remainsEnabled ? '已启用规则持续生效' : hasPublishedVersion ? '保持停用' : '首次发布后保持停用，需手动启用'}。`,
      beforeSummary: `当前应用分档：${formatSimilarityTierRange(currentActiveTierConfig)}`,
      afterSummary: `新发布分档：${formatSimilarityTierRange(currentSavedTierConfig)}`,
      operator: '李晓华 (数据标准管理员)',
      time: new Date().toISOString().replace('T', ' ').slice(0, 19),
      result: 'SUCCESS'
    };
    onUpdateChangeRecords([newRecord, ...changeRecords]);
    notify(remainsEnabled ? '配置已发布，应用端已使用最新版本。' : '配置已发布并保持停用，手动启用后才会用于应用端查询。', 'success');
  };

  const handleToggleGroupStatus = async () => {
    if (currentGroupStatus.enabled) {
      const accepted = await confirm({
        title: `停用“${currentSoftTypeObj?.name.split(' ')[0]}”相似度规则`,
        message: currentScope.classificationId ? '停用后，该分类专用规则不再使用；查询时仍可按优先级回退到同类型通用规则。配置会继续保留。' : '停用后，该类型通用规则不再使用；没有可用分类专用规则的对象将无法执行相似度搜索。配置会继续保留。',
        confirmText: '确认停用',
        tone: 'danger'
      });
      if (!accepted) return;
    } else {
      const activeScopeRules = activeRules.filter(rule => rule.rootTypeId === selectedRootTypeId && rule.softTypeId === selectedSoftTypeId && rule.isScoreActive && rule.enabled);
      const activeWeight = activeScopeRules.reduce((sum, rule) => sum + rule.weight, 0);
      if (!activeScopeRules.length || activeWeight !== 100) {
        notify('当前规则集没有可直接启用的完整正式规则，请先将评分权重配置为 100% 并发布。', 'warning');
        return;
      }
    }

    const nextEnabled = !currentGroupStatus.enabled;
    const changedAt = new Date().toISOString().replace('T', ' ').slice(0, 19);
    onUpdateConfigStatus({
      ...objectConfigStatus,
      [selectedSoftTypeId]: { ...currentGroupStatus, enabled: nextEnabled, lastModifiedAt: changedAt }
    });
    const newRecord: ChangeRecord = {
      id: `CR-${Date.now()}`,
      objectType: `${currentRootTypeObj?.name.split(' ')[0]} / ${currentSoftTypeObj?.name.split(' ')[0]}`,
      rootTypeId: selectedRootTypeId,
      groupValueId: selectedSoftTypeId,
      groupValueName: currentSoftTypeObj?.name.split(' ')[0],
      configVersion: currentGroupStatus.configVersion,
      operationType: nextEnabled ? '启用' : '停用',
      summary: `${nextEnabled ? '启用' : '停用'}【${currentScopeLabel}】相似度规则。`,
      beforeSummary: nextEnabled ? '停用，不参与计算' : '启用，按正式规则参与计算',
      afterSummary: nextEnabled ? '启用，按正式规则参与计算' : '停用，不参与计算且不兜底',
      operator: '李晓华 (数据标准管理员)',
      time: changedAt,
      result: 'SUCCESS'
    };
    onUpdateChangeRecords([newRecord, ...changeRecords]);
    notify(nextEnabled ? '规则集已启用，将按正式规则参与相似度搜索。' : '规则集已停用，应用端将重新按优先级解析可用规则。', 'success');
  };

  const handleChangeGroupValue = async (nextGroupValue: string) => {
    if (nextGroupValue === selectedSoftTypeId) return;
    if (isModified) {
      const accepted = await confirm({
        title: '切换规则集',
        message: '当前规则集存在未保存编辑。切换后这些临时修改将被放弃，已保存草稿和正式规则不会受到影响。',
        confirmText: '放弃并切换',
        tone: 'danger'
      });
      if (!accepted) return;
      onUpdateEditingRules(restoreObjectRules(editingRules, savedRules, selectedRootTypeId, selectedSoftTypeId));
      onUpdateEditingTierConfigs({
        ...editingTierConfigs,
        [selectedSoftTypeId]: { ...currentSavedTierConfig }
      });
    }
    setSelectedSoftTypeId(nextGroupValue);
  };

  // 模态框实时试算结果
  const modalTrialResult = useMemo(() => {
    if (!formIsScoreActive) {
      return {
        matchRate: 0,
        weightedScore: 0,
        outcomeText: '不参与评分，仅展示两侧值及差异',
        outcomeType: 'SUCCESS' as const
      };
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

    const sourceMissing = isSimilarityValueMissing(trialSrcVal);
    const candidateMissing = isSimilarityValueMissing(trialCandVal);
    const skipCandidateMissing = formNullHandling === '不参与本次计算（跳过）' || formNullHandling === '不参与计算' || formNullHandling === '不参与计算 (权重均摊到其他有值项)';
    const matchRate = calculateFieldMatchRate(tempRule, trialSrcVal, trialCandVal, mockCand, mockRef);
    const weightedScore = Number((formWeight * matchRate).toFixed(2));

    let outcomeText = '';
    let outcomeType: 'SUCCESS' | 'PARTIAL' | 'ZERO_CONTINUE' | 'EXCLUDED' = 'SUCCESS';

    if (sourceMissing) {
      outcomeText = '基准值未填写，本字段本次不比较（不计入评分分母）';
      outcomeType = 'PARTIAL';
    } else if (candidateMissing) {
      outcomeText = skipCandidateMissing
        ? '候选未填写：不参与本次计算（跳过），本次不计入该字段权重'
        : '候选未填写：计0分，该字段得0分并保留其评分权重';
      outcomeType = skipCandidateMissing ? 'PARTIAL' : 'ZERO_CONTINUE';
    } else if (matchRate === 1.0) {
      outcomeText = formMatchType === '数值容差匹配' || formMatchType === '数值距离衰减'
        ? `满足满分条件（字段贡献 ${formWeight.toFixed(2)} 分；两侧数值可以不同）`
        : `精确匹配（字段贡献 ${formWeight.toFixed(2)} 分）`;
      outcomeType = 'SUCCESS';
    } else if (matchRate > 0) {
      outcomeText = `部分吻合（字段原始分 ${(matchRate * 100).toFixed(2)}，字段贡献 ${weightedScore.toFixed(2)} 分）`;
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
  const isTextExactMatch = formMatchType === '精确值匹配' && formFieldType.toUpperCase().includes('TEXT');
  const trialUnitOptions = useMemo(() => {
    if (!formUnitFamily || formUnitFamily === '无') return [];
    const normalizedFamily = formUnitFamily.toUpperCase();
    return mockUnitCatalog.quantities.find(quantity => quantity.name === formUnitFamily || quantity.code === normalizedFamily)?.units || [];
  }, [formUnitFamily]);

  return (
    <div className="space-y-4" id="field-similarity-view-container">
      {/* 顶部标题与上下文控制栏 */}
      <div className="bg-[var(--ty-fill-white-color)] rounded-ty-sm border border-[var(--ty-border-color)] p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-[var(--ty-primary-color)]" />
            <h1 className="text-ty-xl font-semibold text-[var(--ty-font-main-color)] tracking-tight">字段相似度规则</h1>
            <HelpTooltip label="查看字段相似度规则说明" content="类型属性确定必选范围，分类属性可进一步建立分类专用规则。分类专用优先，同类型通用规则作为兜底；管理员修改先保存为草稿。" />
          </div>

          {/* 操作按钮区 */}
          <div className="flex flex-wrap items-center justify-end gap-2">
            {(isModified || hasSavedDraft) && (
              <span
                className={`text-ty-xs font-semibold px-3 py-1 rounded-ty-sm inline-flex items-center gap-2 border ${
                  draftStatusReady
                    ? 'bg-[var(--ty-green-lightest-color)] text-[var(--ty-font-main-light-color)] border-[var(--ty-green-color)]/30'
                    : savedScoreWeight !== 100 && !isModified
                    ? 'bg-[var(--ty-red-lightest-color)] text-[var(--ty-red-color)] border-[var(--ty-red-color)]/30'
                    : 'bg-[var(--ty-orange-lightest-color)] text-[var(--ty-font-main-light-color)] border-[var(--ty-orange-color)]/30'
                }`}
                title={publishButtonTitle}
              >
                <Clock className={`w-3.5 h-3.5 shrink-0 ${draftStatusReady ? 'text-[var(--ty-green-color)]' : savedScoreWeight !== 100 && !isModified ? 'text-[var(--ty-red-color)]' : 'text-[var(--ty-orange-color)]'}`} />
                {draftStatusLabel}
              </span>
            )}
            <button
              onClick={handleSaveDraft}
              disabled={!canManageConfig || Boolean(tierConfigError)}
              title={!canManageConfig ? '仅配置管理员可保存' : tierConfigError || '保存当前规则集草稿'}
              className="h-8 inline-flex items-center gap-2 px-3 text-ty-xs font-medium text-[var(--ty-font-main-color)] bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm hover:bg-[var(--ty-fill-color)] transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-45"
              id="save-draft-btn"
            >
              <Save className="w-3.5 h-3.5 text-[var(--ty-font-sub-color)]" />
              保存草稿
            </button>
            <button
              onClick={handlePublishActive}
              disabled={publishDisabled}
              title={publishButtonTitle}
              className="h-8 inline-flex items-center gap-2 px-4 text-ty-xs font-semibold text-[var(--ty-font-white-color)] bg-[var(--ty-primary-color)] rounded-ty-sm hover:opacity-90 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-45"
              id="publish-active-btn"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {publishButtonLabel}
            </button>
            {onNavigate && (
              <button
                onClick={() => onNavigate('query-preview')}
                className="h-8 inline-flex items-center gap-2 px-3 text-ty-xs font-medium text-[var(--ty-font-main-light-color)] hover:text-[var(--ty-primary-color)] bg-[var(--ty-fill-weak-dark-color)] hover:bg-[var(--ty-primary-lightest-color)] border border-[var(--ty-border-color)] rounded-ty-sm transition-colors cursor-pointer"
                id="goto-query-preview-btn"
              >
                前往查询预览
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* 规则集总览：跨类型、跨分类集中查看并进入维护 */}
        <div className="pt-3 border-t border-[var(--ty-border-color)] space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-ty-sm font-semibold text-[var(--ty-font-main-color)]">规则集总览</h2>
              <p className="text-ty-2xs text-[var(--ty-font-sub-color)] mt-0.5">类型为必选范围；分类可选。分类专用规则优先，未命中时使用同类型通用规则，两者不叠加。</p>
            </div>
            <span className="text-ty-2xs text-[var(--ty-font-sub-color)]">当前显示 {visibleRuleScopes.length} / {availableSoftTypes.length} 个范围</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={ruleSetTypeFilter} onChange={event => setRuleSetTypeFilter(event.target.value)} className="h-8 min-w-44 px-3 rounded-ty-sm border border-[var(--ty-border-color)] bg-[var(--ty-fill-white-color)] text-ty-xs">
              <option value="ALL">全部类型</option>
              {ruleTypeOptions.map(type => <option key={type.id} value={type.id}>{type.name}</option>)}
            </select>
            <select value={ruleSetKindFilter} onChange={event => setRuleSetKindFilter(event.target.value as typeof ruleSetKindFilter)} className="h-8 min-w-40 px-3 rounded-ty-sm border border-[var(--ty-border-color)] bg-[var(--ty-fill-white-color)] text-ty-xs">
              <option value="ALL">全部规则性质</option><option value="TYPE_GENERIC">类型通用</option><option value="CLASSIFICATION_SPECIFIC">分类专用</option>
            </select>
            <select value={ruleSetStatusFilter} onChange={event => setRuleSetStatusFilter(event.target.value as typeof ruleSetStatusFilter)} className="h-8 min-w-40 px-3 rounded-ty-sm border border-[var(--ty-border-color)] bg-[var(--ty-fill-white-color)] text-ty-xs">
              <option value="ALL">全部状态</option><option value="ENABLED">已启用</option><option value="DISABLED">已停用</option><option value="UNCONFIGURED">未配置</option>
            </select>
          </div>
          <div className="rounded-ty-sm border border-[var(--ty-border-color)] overflow-x-auto">
            <table className="ty-data-table w-full min-w-[760px] text-left text-ty-xs border-collapse">
              <thead><tr className="bg-[var(--ty-fill-weak-dark-color)] border-b border-[var(--ty-border-color)] text-[var(--ty-font-sub-color)] font-semibold">
                <th className="py-2 px-3">类型</th><th className="py-2 px-3">分类范围</th><th className="py-2 px-3 w-28">规则性质</th><th className="py-2 px-3 w-24">字段规则</th><th className="py-2 px-3 w-24">状态</th><th className="py-2 px-3 w-20 text-right">操作</th>
              </tr></thead>
              <tbody className="divide-y divide-[var(--ty-border-light-color)]">
                {visibleRuleScopes.map(scope => {
                  const parsed = parseSimilarityRuleScopeKey(scope.id);
                  const type = ruleTypeOptions.find(item => item.id === parsed.typeId);
                  const classification = similarityClassificationOptions.find(item => item.id === parsed.classificationId);
                  const ruleCount = editingRules.filter(rule => rule.rootTypeId === selectedRootTypeId && rule.softTypeId === scope.id).length;
                  const status = objectConfigStatus[scope.id];
                  return <tr key={scope.id} className={scope.id === selectedSoftTypeId ? 'bg-[var(--ty-primary-lightest-color)]/50' : 'hover:bg-[var(--ty-fill-weak-dark-color)]'}>
                    <td className="py-2 px-3 font-semibold">{type?.name || parsed.typeId}</td>
                    <td className="py-2 px-3">{classification?.name || '全部分类'}</td>
                    <td className="py-2 px-3"><span className="min-h-6 px-2 inline-flex items-center rounded-ty-xs bg-[var(--ty-fill-color)] border border-[var(--ty-border-color)]">{classification ? '分类专用' : '类型通用'}</span></td>
                    <td className="py-2 px-3 font-mono">{ruleCount} 项</td>
                    <td className="py-2 px-3"><span className={status?.enabled ? 'text-[var(--ty-green-color)]' : status?.configVersion && status.configVersion !== '-' ? 'text-[var(--ty-orange-color)]' : 'text-[var(--ty-font-sub-light-color)]'}>{status?.enabled ? '已启用' : status?.configVersion && status.configVersion !== '-' ? '已停用' : ruleCount ? '草稿' : '未配置'}</span></td>
                    <td className="py-2 px-3 text-right"><button type="button" onClick={() => void handleChangeGroupValue(scope.id)} className="text-[var(--ty-primary-color)] font-medium cursor-pointer">{scope.id === selectedSoftTypeId ? '当前' : ruleCount ? '维护' : '新建'}</button></td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 当前规则集范围 */}
        <div className="pt-3 border-t border-[var(--ty-border-color)] grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-ty-xs font-semibold text-[var(--ty-font-sub-color)] flex items-center gap-1"><Layers className="w-3.5 h-3.5 text-[var(--ty-font-sub-light-color)]" />对象类型</label>
            <div id="root-type-selector" className="h-8 px-3 flex items-center justify-between border border-[var(--ty-border-color)] rounded-ty-sm bg-[var(--ty-fill-weak-dark-color)] text-ty-xs font-medium"><span>{currentRootTypeObj?.name}</span><span className="text-ty-2xs text-[var(--ty-font-sub-color)]">固定范围</span></div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-ty-xs font-semibold text-[var(--ty-font-sub-color)] flex items-center gap-1"><SlidersHorizontal className="w-3.5 h-3.5 text-[var(--ty-font-sub-light-color)]" />类型属性值 <span className="text-[var(--ty-red-color)]">*</span></label>
            <select value={currentScope.typeId} onChange={event => void handleChangeGroupValue(event.target.value)} className="w-full h-8 text-ty-xs font-medium border border-[var(--ty-border-color)] rounded-ty-sm px-3 bg-[var(--ty-fill-white-color)] focus:border-[var(--ty-primary-color)] focus:outline-hidden" id="rule-type-selector">
              {ruleTypeOptions.map(type => <option key={type.id} value={type.id}>{type.name}</option>)}
            </select>
            <span className="text-ty-2xs text-[var(--ty-font-sub-color)]">来自一阶段标记的“类型属性”，规则集必须选择。</span>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-ty-xs font-semibold text-[var(--ty-font-sub-color)] flex items-center gap-1"><SlidersHorizontal className="w-3.5 h-3.5 text-[var(--ty-font-sub-light-color)]" />分类属性值（可选）</label>
            <div className="flex items-center gap-2">
              <select value={currentScope.classificationId || ''} onChange={event => void handleChangeGroupValue(buildSimilarityRuleScopeKey(currentScope.typeId, event.target.value || undefined))} className="min-w-0 flex-1 h-8 text-ty-xs font-medium border border-[var(--ty-border-color)] rounded-ty-sm px-3 bg-[var(--ty-fill-white-color)] focus:border-[var(--ty-primary-color)] focus:outline-hidden" id="rule-classification-selector">
                <option value="">不限定分类（类型通用）</option>
                {availableClassifications.map(item => <option key={item.id} value={item.id}>{item.name} ({item.code})</option>)}
              </select>
              <button type="button" disabled={!hasPublishedVersion} onClick={handleToggleGroupStatus} className={`h-8 min-w-20 px-3 rounded-ty-sm border text-ty-xs font-medium disabled:cursor-not-allowed ${!hasPublishedVersion ? 'border-[var(--ty-border-color)] text-[var(--ty-font-sub-light-color)] bg-[var(--ty-fill-weak-dark-color)]' : currentGroupStatus.enabled ? 'border-[var(--ty-orange-color)] text-[var(--ty-orange-color)] bg-[var(--ty-fill-white-color)]' : 'border-[var(--ty-primary-color)] text-[var(--ty-primary-color)] bg-[var(--ty-fill-white-color)]'}`}>{!hasPublishedVersion ? '未发布' : currentGroupStatus.enabled ? '停用' : '启用'}</button>
            </div>
            <span className={`text-ty-2xs ${hasPublishedVersion && currentGroupStatus.enabled ? 'text-[var(--ty-green-color)]' : 'text-[var(--ty-font-sub-color)]'}`}>{currentClassification ? `限定路径：${currentClassification.path}` : '未选分类时覆盖该类型下全部分类。'} {!hasPublishedVersion ? '配置并发布后方可启用。' : currentGroupStatus.enabled ? '正式规则已启用。' : '正式规则已停用。'}</span>
          </div>
        </div>
        <div className="px-3 py-2 rounded-ty-sm border border-[var(--ty-primary-color)]/20 bg-[var(--ty-primary-lightest-color)]/40 text-ty-2xs text-[var(--ty-font-sub-color)]">
          当前维护：<strong className="text-[var(--ty-font-main-color)]">{currentScopeLabel}</strong>。应用端先查找同类型同分类的专用规则；没有可用专用规则时再使用类型通用规则。
        </div>

        {/* 规则集相似度分档：跟随当前范围和规则版本 */}
        <div className="pt-3 border-t border-[var(--ty-border-color)] flex flex-col xl:flex-row xl:items-start gap-3">
          <div className="xl:w-64 shrink-0">
            <div className="flex items-center gap-1">
              <span className="text-ty-xs font-semibold text-[var(--ty-font-main-color)]">相似度分档</span>
              <HelpTooltip
                label="查看相似度分档说明"
                content="按保留两位小数后的展示分数判定标签。分档只改变标签，不改变得分、排序或候选资格。"
              />
            </div>
            <p className="mt-1 text-ty-2xs text-[var(--ty-font-sub-color)]">跟随当前类型/分类范围和规则版本；仅配置管理员可修改。</p>
          </div>
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="text-ty-xs text-[var(--ty-font-sub-color)] space-y-1">
              <span className="block font-medium">高相似起始分数</span>
              <div className="relative">
                <input
                  id="high-similarity-threshold"
                  type="number"
                  min="0.01"
                  max="100"
                  step="0.01"
                  value={currentTierConfig.highStart}
                  disabled={!canManageConfig}
                  onChange={event => onUpdateEditingTierConfigs({ ...editingTierConfigs, [selectedSoftTypeId]: { ...currentTierConfig, highStart: Number(event.target.value) } })}
                  className={`w-full h-8 px-3 pr-9 rounded-ty-sm border bg-[var(--ty-fill-white-color)] font-mono font-semibold text-[var(--ty-font-main-color)] focus:outline-hidden disabled:bg-[var(--ty-fill-weak-dark-color)] disabled:text-[var(--ty-font-sub-color)] ${tierConfigError ? 'border-[var(--ty-red-color)]' : 'border-[var(--ty-border-color)] focus:border-[var(--ty-primary-color)]'}`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ty-2xs text-[var(--ty-font-sub-light-color)]">分</span>
              </div>
            </label>
            <label className="text-ty-xs text-[var(--ty-font-sub-color)] space-y-1">
              <span className="block font-medium">中相似起始分数</span>
              <div className="relative">
                <input
                  id="medium-similarity-threshold"
                  type="number"
                  min="0.01"
                  max="99.99"
                  step="0.01"
                  value={currentTierConfig.mediumStart}
                  disabled={!canManageConfig}
                  onChange={event => onUpdateEditingTierConfigs({ ...editingTierConfigs, [selectedSoftTypeId]: { ...currentTierConfig, mediumStart: Number(event.target.value) } })}
                  className={`w-full h-8 px-3 pr-9 rounded-ty-sm border bg-[var(--ty-fill-white-color)] font-mono font-semibold text-[var(--ty-font-main-color)] focus:outline-hidden disabled:bg-[var(--ty-fill-weak-dark-color)] disabled:text-[var(--ty-font-sub-color)] ${tierConfigError ? 'border-[var(--ty-red-color)]' : 'border-[var(--ty-border-color)] focus:border-[var(--ty-primary-color)]'}`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ty-2xs text-[var(--ty-font-sub-light-color)]">分</span>
              </div>
            </label>
            <div className="text-ty-xs text-[var(--ty-font-sub-color)] space-y-1">
              <span className="block font-medium">低相似范围（自动）</span>
              <div id="low-similarity-range" className="h-8 px-3 flex items-center rounded-ty-sm border border-[var(--ty-border-color)] bg-[var(--ty-fill-weak-dark-color)] font-mono font-semibold text-[var(--ty-font-main-color)]">
                0.00–&lt;{Number.isFinite(currentTierConfig.mediumStart) ? currentTierConfig.mediumStart.toFixed(2) : '--'} 分
              </div>
            </div>
          </div>
        </div>
        {tierConfigError ? (
          <div role="alert" className="px-3 py-2 rounded-ty-sm bg-[var(--ty-red-lightest-color)] border border-[var(--ty-red-color)]/30 text-ty-2xs text-[var(--ty-red-color)]">
            {tierConfigError}
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2 text-ty-2xs text-[var(--ty-font-sub-color)]">
            <span>当前分档：{formatSimilarityTierRange(currentTierConfig)}</span>
            {(hasSavedDraft || isModified) && <span className={isCurrentDraftPreviewValid ? 'text-[var(--ty-green-color)]' : 'text-[var(--ty-orange-color)]'}>{isCurrentDraftPreviewValid ? '草稿版本已通过预览' : isModified ? '当前修改已使原预览失效，请保存后重新预览' : '草稿版本待重新预览'}</span>}
          </div>
        )}
      </div>

      {/* 规则配置摘要看板 (Compact Summary Bar) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[var(--ty-fill-white-color)] p-4 rounded-ty-sm border border-[var(--ty-border-color)] flex items-center justify-between">
          <div>
            <span className="text-ty-2xs font-medium text-[var(--ty-font-sub-color)] block">当前规则上下文</span>
            <span className="text-ty-xs font-bold text-[var(--ty-font-main-color)] mt-0.5 block">
              {currentScopeLabel}
            </span>
          </div>
          <span className="min-h-6 px-2 inline-flex items-center text-ty-2xs font-semibold bg-[var(--ty-fill-color)] text-[var(--ty-font-main-color)] rounded-ty-sm border border-[var(--ty-border-color)]">
            {currentScopeEditingRules.length} 条规则
          </span>
        </div>

        <div className="bg-[var(--ty-fill-white-color)] p-4 rounded-ty-sm border border-[var(--ty-border-color)] flex items-center justify-between">
          <div>
            <span className="text-ty-2xs font-medium text-[var(--ty-font-sub-color)] block">参与评分字段数</span>
            <span className="text-ty-sm font-bold text-[var(--ty-primary-color)] mt-0.5 block font-mono">
              {activeScoreRulesCount} 项
            </span>
          </div>
          <span className="text-ty-2xs text-[var(--ty-font-sub-light-color)]">已启用参与计算</span>
        </div>

        <div className="bg-[var(--ty-fill-white-color)] p-4 rounded-ty-sm border border-[var(--ty-border-color)] flex items-center justify-between">
          <div>
            <span className="text-ty-2xs font-medium text-[var(--ty-font-sub-color)] block">候选门槛字段数</span>
            <span className="text-ty-sm font-bold text-[var(--ty-orange-color)] mt-0.5 block font-mono">
              {gateRulesCount} 项
            </span>
          </div>
          <span className="min-h-6 px-2 inline-flex items-center text-ty-2xs font-semibold bg-[var(--ty-orange-lightest-color)] text-[var(--ty-font-main-light-color)] rounded-ty-sm border border-[var(--ty-orange-color)]/30">
            不满足即排除候选
          </span>
        </div>

        <div className="bg-[var(--ty-fill-white-color)] p-4 rounded-ty-sm border border-[var(--ty-border-color)] flex items-center justify-between">
          <div>
            <span className="text-ty-2xs font-medium text-[var(--ty-font-sub-color)] block">评分权重合计</span>
            <span
              className={`text-ty-sm font-bold mt-0.5 block font-mono ${
                totalScoreWeight === 100 ? 'text-[var(--ty-green-color)]' : 'text-[var(--ty-red-color)]'
              }`}
            >
              {totalScoreWeight}%
            </span>
          </div>
          <span
            className={`min-h-6 px-2 inline-flex items-center text-ty-2xs font-semibold rounded-ty-sm border ${
              totalScoreWeight === 100
                ? 'bg-[var(--ty-green-lightest-color)] text-[var(--ty-font-main-light-color)] border-[var(--ty-green-color)]/30'
                : 'bg-[var(--ty-red-lightest-color)] text-[var(--ty-font-main-light-color)] border-[var(--ty-red-color)]/30'
            }`}
          >
            {totalScoreWeight === 100 ? '权重已配平' : '未配平，禁止发布'}
          </span>
        </div>
      </div>

      {/* 规则列表区域 */}
      <div className="bg-[var(--ty-fill-white-color)] rounded-ty-sm border border-[var(--ty-border-color)] overflow-hidden">
        {/* 表格头部搜索与新建条 */}
        <div className="p-3 border-b border-[var(--ty-border-color)] flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[var(--ty-fill-weak-dark-color)]">
          <div className="flex flex-wrap items-center gap-2">
            {/* 搜索 */}
            <div className="relative w-56">
              <Search className="w-3.5 h-3.5 text-[var(--ty-font-sub-light-color)] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="搜索字段名或编码..."
                value={filterKeyword}
                onChange={e => { setFilterKeyword(e.target.value); setPage(1); }}
                className="w-full h-8 pl-8 pr-3 text-ty-xs border border-[var(--ty-border-color)] rounded-ty-sm bg-[var(--ty-fill-white-color)] text-[var(--ty-font-main-color)] placeholder-[var(--ty-font-sub-light-color)] focus:outline-hidden focus:border-[var(--ty-primary-color)]"
                id="filter-rules-keyword-input"
              />
            </div>

            {/* 参与评分过滤 */}
            <select
              value={filterScoreActive}
              onChange={e => { setFilterScoreActive(e.target.value); setPage(1); }}
              className="h-8 text-ty-xs border border-[var(--ty-border-color)] rounded-ty-sm px-3 bg-[var(--ty-fill-white-color)] text-[var(--ty-font-main-color)] focus:outline-hidden"
              id="filter-score-active-select"
            >
              <option value="ALL">全部评分状态</option>
              <option value="YES">仅参与评分</option>
              <option value="NO">不参与评分</option>
            </select>

            {/* 不满足处理方式过滤 */}
            <select
              value={filterMismatchAction}
              onChange={e => { setFilterMismatchAction(e.target.value); setPage(1); }}
              className="h-8 text-ty-xs border border-[var(--ty-border-color)] rounded-ty-sm px-3 bg-[var(--ty-fill-white-color)] text-[var(--ty-font-main-color)] focus:outline-hidden"
              id="filter-mismatch-action-select"
            >
              <option value="ALL">全部不匹配处理</option>
              <option value="ZERO_AND_CONTINUE">记 0 分继续计算</option>
              <option value="EXCLUDE_CANDIDATE">排除整个候选 (门槛)</option>
            </select>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              type="button"
              onClick={() => setIsBatchSettingOpen(true)}
              disabled={!canManageConfig || selectedRuleIds.length === 0}
              className="h-8 inline-flex items-center gap-2 px-3 text-ty-xs font-semibold border border-[var(--ty-border-color)] bg-[var(--ty-fill-white-color)] text-[var(--ty-font-main-color)] rounded-ty-sm hover:border-[var(--ty-primary-color)] hover:text-[var(--ty-primary-color)] transition-colors disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
              id="batch-set-rules-btn"
              title={selectedRuleIds.length === 0 ? '请先勾选字段规则' : `批量设置已选 ${selectedRuleIds.length} 条规则`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              批量设置{selectedRuleIds.length > 0 ? `（${selectedRuleIds.length}）` : ''}
            </button>
            <button
              onClick={handleOpenCreateModal}
              className="h-8 inline-flex items-center gap-2 px-3 text-ty-xs font-semibold text-[var(--ty-font-white-color)] bg-[var(--ty-primary-color)] rounded-ty-sm hover:opacity-90 transition-colors cursor-pointer"
              id="add-new-rule-btn"
            >
              <Plus className="w-3.5 h-3.5" />
              新建字段规则
            </button>
          </div>
        </div>

        {/* 规则数据表格 / 空态 */}
        {currentScopeEditingRules.length === 0 ? (
          <div className="p-12 text-center" id="empty-soft-type-rules-container">
            <div className="w-12 h-12 rounded-full bg-[var(--ty-orange-lightest-color)] border border-[var(--ty-orange-color)]/30 text-[var(--ty-orange-color)] mx-auto flex items-center justify-center mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-ty-sm font-semibold text-[var(--ty-font-main-color)]">当前规则集尚未配置字段规则</h3>
            <p className="text-ty-xs text-[var(--ty-font-sub-color)] max-w-md mx-auto mt-2 leading-relaxed">
              “{currentScopeLabel}”暂无字段规则。分类专用与类型通用规则分别维护，请确保当前规则集参与评分字段权重合计为 100%。
            </p>
            <button
              onClick={handleOpenCreateModal}
              className="mt-4 h-8 inline-flex items-center gap-2 px-4 text-ty-xs font-semibold text-[var(--ty-font-white-color)] bg-[var(--ty-primary-color)] rounded-ty-sm hover:opacity-90 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              为当前规则集配置规则
            </button>
          </div>
        ) : filteredRules.length === 0 ? (
          <div className="p-8 text-center text-ty-xs text-[var(--ty-font-sub-color)]">
            没有符合当前筛选条件的字段规则
          </div>
        ) : (
          <>
          <div className="overflow-x-auto">
            <table className="ty-data-table w-full min-w-[1320px] text-left text-ty-xs border-collapse">
              <thead>
                <tr className="bg-[var(--ty-fill-weak-dark-color)] border-b border-[var(--ty-border-color)] text-[var(--ty-font-sub-color)] font-semibold">
                  <th className="py-2 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={allFilteredRulesSelected}
                      ref={element => { if (element) element.indeterminate = someFilteredRulesSelected && !allFilteredRulesSelected; }}
                      onChange={handleToggleSelectFilteredRules}
                      aria-label="全选当前筛选结果"
                      className="w-4 h-4 accent-[var(--ty-primary-color)] cursor-pointer"
                      id="select-all-filtered-rules"
                    />
                  </th>
                  <th className="py-2 px-4 w-12 text-center">序号</th>
                  <th className="py-2 px-4">字段名称</th>
                  <th className="py-2 px-4">字段编码</th>
                  <th className="py-2 px-4">字段类型</th>
                  <th className="py-2 px-4">权重 (Weight)</th>
                  <th className="py-2 px-4">匹配方式</th>
                  <th className="py-2 px-4">不匹配处理</th>
                  <th className="py-2 px-4">候选值缺失时</th>
                  <th className="py-2 px-4 text-center">参与评分</th>
                  <th className="py-2 px-4 text-right sticky right-0 z-10 bg-[var(--ty-fill-weak-dark-color)] border-l border-[var(--ty-border-color)] shadow-ty-sticky">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--ty-border-light-color)]">
                {pageRules.map((rule, idx) => {
                  const isGate = rule.isScoreActive && rule.mismatchAction === 'EXCLUDE_CANDIDATE';
                  return (
                    <tr
                      key={rule.id}
                      className={`${selectedRuleIds.includes(rule.id) ? 'bg-[var(--ty-primary-lighter-color)]/20' : ''} hover:bg-[var(--ty-fill-weak-dark-color)] transition-colors group`}
                      id={`rule-row-${rule.id}`}
                    >
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedRuleIds.includes(rule.id)}
                          onChange={() => handleToggleRuleSelection(rule.id)}
                          aria-label={`选择${rule.fieldName}规则`}
                          className="w-4 h-4 accent-[var(--ty-primary-color)] cursor-pointer"
                          id={`select-rule-${rule.id}`}
                        />
                      </td>
                      <td className="py-3 px-4 text-center text-[var(--ty-font-sub-light-color)] font-mono text-ty-2xs">
                        {(currentPage - 1) * pageSize + idx + 1}
                      </td>

                      {/* 字段名称 */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-[var(--ty-font-main-color)] flex items-center gap-2">
                          {rule.fieldName}
                          {rule.displayUnit && rule.displayUnit !== '无' && (
                            <span className="text-ty-2xs font-normal text-[var(--ty-font-sub-color)] bg-[var(--ty-fill-color)] px-1 rounded-ty-xs">
                              {rule.displayUnit}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[var(--ty-font-sub-color)]">{rule.propertyCode}</td>

                      {/* 字段类型 */}
                      <td className="py-3 px-4">
                        <span className="inline-block min-h-6 px-2 inline-flex items-center text-ty-2xs font-medium bg-[var(--ty-fill-color)] text-[var(--ty-font-main-color)] rounded-ty-sm border border-[var(--ty-border-color)]">
                          {rule.fieldType}
                        </span>
                      </td>

                      {/* 权重 */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`font-mono font-bold ${rule.isScoreActive ? 'text-[var(--ty-font-main-color)]' : 'text-[var(--ty-font-sub-light-color)]'}`}>
                            {rule.isScoreActive ? `${rule.weight}%` : '—'}
                          </span>
                        </div>
                      </td>

                      {/* 匹配方式 */}
                      <td className="py-3 px-4 font-medium text-[var(--ty-font-main-color)]">{rule.isScoreActive ? rule.matchType : '—'}</td>
                      <td className="py-3 px-4">
                          {!rule.isScoreActive ? (
                            <span className="text-[var(--ty-font-sub-light-color)]">—</span>
                          ) : isGate ? (
                            <span
                              className="inline-flex items-center gap-1 min-h-6 px-2 inline-flex items-center text-ty-2xs font-bold bg-[var(--ty-orange-lightest-color)] text-[var(--ty-font-main-light-color)] border border-[var(--ty-orange-color)]/40 rounded-ty-xs"
                              title="门槛字段：不满足时直接排除整个候选"
                            >
                              <ShieldAlert className="w-3 h-3 text-[var(--ty-orange-color)]" />
                              候选门槛 (不满足排除)
                            </span>
                          ) : (
                            <span className="inline-block text-ty-2xs font-normal text-[var(--ty-font-sub-color)] bg-[var(--ty-fill-color)] px-2 py-0.2 rounded-ty-xs">
                              记 0 分继续计算
                            </span>
                          )}
                      </td>

                      {/* 缺失值处理 */}
                      <td className="py-3 px-4 text-[var(--ty-font-sub-color)] text-ty-2xs">
                        {rule.isScoreActive ? rule.nullHandling || '计0分' : '—'}
                      </td>

                      {/* 参与评分开关 */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggleScoreActive(rule)}
                          className={`w-10 h-6 inline-flex items-center rounded-full transition-colors p-1 cursor-pointer ${
                            rule.isScoreActive ? 'bg-[var(--ty-primary-color)]' : 'bg-[var(--ty-border-color)]'
                          }`}
                          aria-label={rule.isScoreActive ? `停用${rule.fieldName}评分` : `启用${rule.fieldName}评分`}
                          id={`toggle-score-active-${rule.id}`}
                        >
                          <span
                            className={`w-4 h-4 rounded-full bg-[var(--ty-fill-white-color)] transition-transform ${
                              rule.isScoreActive ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </td>

                      {/* 操作 */}
                      <td className="py-3 px-4 text-right sticky right-0 z-10 bg-[var(--ty-fill-white-color)] border-l border-[var(--ty-border-color)] shadow-ty-sticky">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEditModal(rule)}
                            className="h-8 w-8 inline-flex items-center justify-center text-[var(--ty-font-sub-color)] hover:text-[var(--ty-primary-color)] hover:bg-[var(--ty-primary-lighter-color)]/30 rounded-ty-sm transition-colors cursor-pointer"
                            aria-label={`编辑${rule.fieldName}规则`}
                            id={`edit-rule-${rule.id}`}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteRule(rule.id)}
                            className="h-8 w-8 inline-flex items-center justify-center text-[var(--ty-font-sub-color)] hover:text-[var(--ty-red-color)] hover:bg-[var(--ty-red-lightest-color)] rounded-ty-sm transition-colors cursor-pointer"
                            aria-label={`删除${rule.fieldName}规则`}
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
          <TablePagination total={filteredRules.length} page={currentPage} pageSize={pageSize} itemLabel="条" onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
          </>
        )}
      </div>

      {isBatchSettingOpen && (
        <div
          className="fixed inset-0 z-50 bg-ty-overlay backdrop-blur-xs flex items-center justify-center px-4 py-[60px]"
          role="presentation"
          onMouseDown={event => { if (event.target === event.currentTarget) setIsBatchSettingOpen(false); }}
          id="batch-rule-setting-backdrop"
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="batch-rule-setting-title"
            className="bg-[var(--ty-fill-white-color)] rounded-ty-lg border border-[var(--ty-border-color)] shadow-ty-lg w-full max-w-[560px] overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-[var(--ty-border-color)] bg-[var(--ty-fill-weak-dark-color)] flex items-start justify-between gap-4">
              <div>
                <h2 id="batch-rule-setting-title" className="text-ty-lg font-semibold text-[var(--ty-font-main-color)]">批量设置字段规则</h2>
                <p className="text-ty-xs text-[var(--ty-font-sub-color)] mt-1">已选择 {selectedRules.length} 条规则；每次只修改一个设置项。</p>
              </div>
              <button type="button" onClick={() => setIsBatchSettingOpen(false)} className="w-8 h-8 inline-flex items-center justify-center rounded-ty-sm text-[var(--ty-font-sub-color)] hover:bg-[var(--ty-fill-color)] cursor-pointer" aria-label="关闭批量设置">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <label className="block text-ty-xs font-semibold text-[var(--ty-font-main-color)]">
                设置项
                <select
                  value={batchRuleSetting}
                  onChange={event => setBatchRuleSetting(event.target.value as BatchRuleSetting)}
                  className="mt-1.5 w-full h-9 px-3 border border-[var(--ty-border-color)] rounded-ty-sm bg-[var(--ty-fill-white-color)] text-ty-xs focus:outline-hidden focus:border-[var(--ty-primary-color)]"
                  id="batch-rule-setting-select"
                >
                  <option value="SCORE_ACTIVE">是否参与评分</option>
                  <option value="NULL_HANDLING">候选值缺失时</option>
                  <option value="MISMATCH_ACTION">字段有值但不符合时</option>
                </select>
              </label>

              {batchRuleSetting === 'SCORE_ACTIVE' && (
                <fieldset className="space-y-2">
                  <legend className="text-ty-xs font-semibold text-[var(--ty-font-main-color)] mb-2">统一设置为</legend>
                  <label className={`flex items-start gap-3 p-3 border rounded-ty-sm cursor-pointer ${batchScoreActive === 'ENABLE' ? 'border-[var(--ty-primary-color)] bg-[var(--ty-primary-lighter-color)]/20' : 'border-[var(--ty-border-color)]'}`}>
                    <input type="radio" name="batch-score-active" checked={batchScoreActive === 'ENABLE'} onChange={() => setBatchScoreActive('ENABLE')} className="mt-0.5 accent-[var(--ty-primary-color)]" />
                    <span><strong className="block text-ty-xs text-[var(--ty-font-main-color)]">参与评分</strong><span className="block mt-1 text-ty-2xs text-[var(--ty-font-sub-color)]">保留各字段原有权重和匹配参数；多值字段自动跳过。</span></span>
                  </label>
                  <label className={`flex items-start gap-3 p-3 border rounded-ty-sm cursor-pointer ${batchScoreActive === 'DISABLE' ? 'border-[var(--ty-primary-color)] bg-[var(--ty-primary-lighter-color)]/20' : 'border-[var(--ty-border-color)]'}`}>
                    <input type="radio" name="batch-score-active" checked={batchScoreActive === 'DISABLE'} onChange={() => setBatchScoreActive('DISABLE')} className="mt-0.5 accent-[var(--ty-primary-color)]" />
                    <span><strong className="block text-ty-xs text-[var(--ty-font-main-color)]">不参与评分</strong><span className="block mt-1 text-ty-2xs text-[var(--ty-font-sub-color)]">字段继续用于展示和对比，不进入总分计算。</span></span>
                  </label>
                </fieldset>
              )}

              {batchRuleSetting === 'NULL_HANDLING' && (
                <label className="block text-ty-xs font-semibold text-[var(--ty-font-main-color)]">
                  候选值缺失时
                  <select value={batchNullHandling} onChange={event => setBatchNullHandling(event.target.value as '计0分' | '不参与本次计算（跳过）')} className="mt-1.5 w-full h-9 px-3 border border-[var(--ty-border-color)] rounded-ty-sm bg-[var(--ty-fill-white-color)] text-ty-xs focus:outline-hidden focus:border-[var(--ty-primary-color)]">
                    <option value="计0分">计0分</option>
                    <option value="不参与本次计算（跳过）">不参与本次计算（跳过）</option>
                  </select>
                </label>
              )}

              {batchRuleSetting === 'MISMATCH_ACTION' && (
                <label className="block text-ty-xs font-semibold text-[var(--ty-font-main-color)]">
                  字段有值但不符合时
                  <select value={batchMismatchAction} onChange={event => setBatchMismatchAction(event.target.value as MismatchAction)} className="mt-1.5 w-full h-9 px-3 border border-[var(--ty-border-color)] rounded-ty-sm bg-[var(--ty-fill-white-color)] text-ty-xs focus:outline-hidden focus:border-[var(--ty-primary-color)]">
                    <option value="ZERO_AND_CONTINUE">该字段记0分，候选继续计算</option>
                    <option value="EXCLUDE_CANDIDATE">排除整个候选</option>
                  </select>
                </label>
              )}

              <div className="px-3 py-2.5 rounded-ty-sm border border-[var(--ty-border-color)] bg-[var(--ty-fill-weak-dark-color)] text-ty-2xs text-[var(--ty-font-sub-color)] leading-relaxed">
                批量设置只修改当前选择项，不自动调整权重，也不直接影响已发布版本。应用后需要保存草稿并重新预览。
              </div>
            </div>

            <div className="px-5 py-3 border-t border-[var(--ty-border-color)] bg-[var(--ty-fill-weak-dark-color)] flex justify-end gap-2">
              <button type="button" onClick={() => setIsBatchSettingOpen(false)} className="h-9 px-4 rounded-ty-sm border border-[var(--ty-border-color)] bg-[var(--ty-fill-white-color)] text-ty-xs font-semibold text-[var(--ty-font-main-color)] hover:bg-[var(--ty-fill-color)] cursor-pointer">取消</button>
              <button type="button" onClick={handleApplyBatchRuleSetting} className="h-9 px-4 rounded-ty-sm bg-[var(--ty-primary-color)] text-[var(--ty-font-white-color)] text-ty-xs font-semibold hover:opacity-90 cursor-pointer" id="apply-batch-rule-setting">应用到 {selectedRules.length} 条规则</button>
            </div>
          </section>
        </div>
      )}

      {/* 规则新建 / 编辑模态抽屉 */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-ty-overlay backdrop-blur-xs flex items-center justify-center px-4 py-[60px] overflow-y-auto"
          id="rule-modal-backdrop"
          role="presentation"
          onMouseDown={event => { if (event.target === event.currentTarget) setIsModalOpen(false); }}
        >
          <section role="dialog" aria-modal="true" aria-labelledby="field-rule-dialog-title" className="standard-form-dialog bg-[var(--ty-fill-white-color)] rounded-ty-lg border border-[var(--ty-border-color)] shadow-ty-lg w-full max-w-[800px] max-h-[calc(100dvh-120px)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* 模态框顶部 */}
            <div className="px-4 py-3 border-b border-[var(--ty-border-color)] flex items-center justify-between bg-[var(--ty-fill-weak-dark-color)]">
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <h2 id="field-rule-dialog-title" className="text-ty-lg font-semibold text-[var(--ty-font-main-color)]">
                  {editingRuleId ? '编辑字段相似度规则' : '新建字段相似度规则'}
                </h2>
                <span className="min-h-6 px-2 inline-flex items-center rounded-ty-sm bg-[var(--ty-fill-color)] text-ty-2xs text-[var(--ty-font-main-color)] border border-[var(--ty-border-color)]">
                  {currentRootTypeObj?.name}
                </span>
                <span className="min-h-6 px-2 inline-flex items-center rounded-ty-sm bg-[var(--ty-fill-color)] text-ty-2xs text-[var(--ty-font-main-color)] border border-[var(--ty-border-color)]">
                  {currentScopeLabel}
                </span>
              </div>
              <button
                aria-label="关闭字段规则弹窗"
                onClick={() => setIsModalOpen(false)}
                className="h-7 w-7 flex items-center justify-center text-[var(--ty-font-sub-light-color)] hover:text-[var(--ty-font-main-color)] hover:bg-[var(--ty-fill-color)] rounded-ty-sm transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 模态框内容区：左侧表单配置 + 右侧实时反馈 */}
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* 左侧主要配置表单 (7 列) */}
              <div className="lg:col-span-7 space-y-4">
                {/* 1. 字段选择 */}
                <div>
                  <label className="text-ty-xs font-bold text-[var(--ty-font-main-color)] block mb-1">
                    一阶段已映射字段 <span className="text-[var(--ty-red-color)]">*</span>
                  </label>
                  {editingRuleId ? (
                    <div className="p-3 bg-[var(--ty-fill-weak-dark-color)] rounded-ty-sm border border-[var(--ty-border-color)] text-ty-xs font-semibold text-[var(--ty-font-main-color)] flex items-center justify-between">
                      <span>{formFieldName} ({formPropertyCode})</span>
                      <span className="text-ty-2xs text-[var(--ty-font-sub-color)] bg-[var(--ty-fill-white-color)] min-h-6 px-2 inline-flex items-center rounded-ty-xs border border-[var(--ty-border-color)]">
                        {formFieldType}
                      </span>
                    </div>
                  ) : (
                    <select
                      value={formPropertyCode}
                      onChange={e => handleFieldSelectChange(e.target.value)}
                      className="w-full h-8 text-ty-xs border border-[var(--ty-border-color)] rounded-ty-sm px-3 bg-[var(--ty-fill-white-color)] text-[var(--ty-font-main-color)] focus:border-[var(--ty-primary-color)] focus:outline-hidden"
                    >
                      {availableStage1Fields.map(f => {
                        const alreadyConfigured = currentScopeEditingRules.some(rule => rule.propertyCode === f.fieldCode);
                        return (
                          <option key={f.fieldCode} value={f.fieldCode} disabled={alreadyConfigured}>
                            {f.displayName} ({f.fieldCode}) - {f.businessFieldType}
                            {alreadyConfigured ? ' · 已配置' : f.isMultiValue ? ' · 仅支持展示对比' : ''}
                          </option>
                        );
                      })}
                    </select>
                  )}
                  <p className="text-ty-2xs text-[var(--ty-font-sub-color)] mt-1">
                    新增字段默认仅用于展示对比，不增加评分权重；同一规则集下一个字段只能配置一条规则。多值属性当前不能参与评分。
                  </p>
                  {formPropertyCode === 'core_material' && (
                    <p className="text-ty-2xs text-[var(--ty-font-sub-color)] mt-1">
                      材料示例使用具体牌号名称；只有 PLM 元数据明确提供枚举定义时才按稳定码匹配，不默认将所有材料设为枚举。
                    </p>
                  )}
                </div>

                {/* 2. 先确定字段用途，再展示适用的评分参数 */}
                <div className="p-3 rounded-ty-sm border border-[var(--ty-border-color)] bg-[var(--ty-fill-weak-dark-color)]/50">
                  <label className="text-ty-xs font-bold text-[var(--ty-font-main-color)] block mb-1">
                    是否参与评分 <span className="text-[var(--ty-red-color)]">*</span>
                  </label>
                  <select
                    value={formIsScoreActive ? 'YES' : 'NO'}
                    onChange={e => setFormIsScoreActive(e.target.value === 'YES')}
                    className="w-full h-8 text-ty-xs border border-[var(--ty-border-color)] rounded-ty-sm px-2 bg-[var(--ty-fill-white-color)] text-[var(--ty-font-main-color)] font-semibold"
                    id="field-score-active-select"
                  >
                    <option value="YES" disabled={formFieldScoreUnsupported}>是，参与相似度评分{formFieldScoreUnsupported ? '（当前字段不支持）' : ''}</option>
                    <option value="NO">否，不参与评分（仅展示对比）</option>
                  </select>
                  <p className="mt-1 text-ty-2xs text-[var(--ty-font-sub-color)]">
                    {formFieldScoreUnsupported
                      ? '当前字段为多值属性，只展示两侧值及差异，不能参与相似度评分。'
                      : formIsScoreActive
                      ? '继续配置评分权重、匹配方式、候选缺失及不匹配处理。'
                      : '该属性只展示两侧值及差异，不进入总分、覆盖率、评分命中数或差异数。'}
                  </p>
                </div>

                {formIsScoreActive ? (
                <>
                {/* 3. 匹配方式与动态参数 */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-ty-xs font-bold text-[var(--ty-font-main-color)] block mb-1">
                      <span className="inline-flex items-center gap-1">
                        匹配方式 <span className="text-[var(--ty-red-color)]">*</span>
                        {isTextExactMatch && (
                          <HelpTooltip
                            label="查看文本精确匹配说明"
                            content="比较前去除双方文本首尾空格，保留中间空格并区分大小写；全为空格按缺失值处理，不会因形式相同获得满分。不修改 PLM 源数据。"
                          />
                        )}
                      </span>
                    </label>
                    <select
                      value={formMatchType}
                      onChange={e => {
                        const nextMatchType = e.target.value;
                        setFormMatchType(nextMatchType);
                        if (nextMatchType === '精确值匹配' && formFieldType.toUpperCase().includes('TEXT')) {
                          setTrialSrcVal('ABC');
                          setTrialCandVal(' ABC ');
                        }
                      }}
                      className="w-full h-8 text-ty-xs border border-[var(--ty-border-color)] rounded-ty-sm px-3 bg-[var(--ty-fill-white-color)] text-[var(--ty-font-main-color)] focus:border-[var(--ty-primary-color)] focus:outline-hidden"
                    >
                      {getAllowedMatchTypes(formFieldType).map(mt => (
                        <option key={mt} value={mt}>
                          {mt}
                        </option>
                      ))}
                    </select>
                    {isTextExactMatch && (
                      <p className="mt-1 text-ty-2xs text-[var(--ty-font-sub-color)]">即时示例：ABC 与“ ABC ”相同；ABC 与 abc 不同。</p>
                    )}
                  </div>

                  <div>
                    <label className="text-ty-xs font-bold text-[var(--ty-font-main-color)] block mb-1">
                      评分权重 (0 - 100%) <span className="text-[var(--ty-red-color)]">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={formWeight}
                        onChange={e => setFormWeight(Number(e.target.value))}
                        aria-invalid={!Number.isFinite(formWeight) || formWeight < 0 || formWeight > 100}
                        className={`w-full h-8 text-ty-xs font-mono font-bold border rounded-ty-sm px-3 pr-8 bg-[var(--ty-fill-white-color)] text-[var(--ty-font-main-color)] focus:outline-hidden ${!Number.isFinite(formWeight) || formWeight < 0 || formWeight > 100 ? 'border-[var(--ty-red-color)] focus:border-[var(--ty-red-color)]' : 'border-[var(--ty-border-color)] focus:border-[var(--ty-primary-color)]'}`}
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ty-xs text-[var(--ty-font-sub-light-color)] font-bold">
                        %
                      </span>
                    </div>
                    {(!Number.isFinite(formWeight) || formWeight < 0 || formWeight > 100) && (
                      <p className="text-ty-2xs text-[var(--ty-red-color)] mt-1">请输入 0～100 之间的数字。</p>
                    )}
                  </div>
                </div>

                {/* 动态参数配置区 */}
                {formMatchType === '文本相似匹配 (非 AI)' && (
                  <div className="p-3 bg-[var(--ty-primary-lighter-color)]/20 border border-[var(--ty-primary-lighter-color)] rounded-ty-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-ty-xs font-semibold text-[var(--ty-primary-color)]">文本相似度下限阈值</span>
                      <span className="text-ty-xs font-bold text-[var(--ty-primary-color)] font-mono">{formTextThreshold}%</span>
                    </div>
                    <input
                      type="range"
                      min="30"
                      max="90"
                      step="5"
                      value={formTextThreshold}
                      onChange={e => setFormTextThreshold(Number(e.target.value))}
                      className="w-full accent-[var(--ty-primary-color)]"
                    />
                    <p className="text-ty-2xs text-[var(--ty-primary-color)]">低于此阈值时判定为不匹配，按不满足规则处理。</p>
                  </div>
                )}

                {formMatchType === '数值容差匹配' && (
                  <div className="p-3 bg-[var(--ty-primary-lighter-color)]/20 border border-[var(--ty-primary-lighter-color)] rounded-ty-sm grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-ty-2xs font-semibold text-[var(--ty-primary-color)] block mb-1">容差类型</label>
                      <select
                        value={formToleranceType}
                        onChange={e => {
                          const nextType = e.target.value as 'ABSOLUTE' | 'PERCENTAGE';
                          setFormToleranceType(nextType);
                          if (nextType === 'PERCENTAGE') setFormToleranceValue(2);
                        }}
                        className="w-full h-8 text-ty-xs border border-[var(--ty-primary-lighter-color)] rounded-ty-sm bg-[var(--ty-fill-white-color)] text-[var(--ty-font-main-color)]"
                      >
                        <option value="ABSOLUTE">绝对数值误差 (±Δ)</option>
                        <option value="PERCENTAGE">百分比相对误差 (±%)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-ty-2xs font-semibold text-[var(--ty-primary-color)] block mb-1">
                        容差值（{formToleranceType === 'PERCENTAGE' ? '%' : formDisplayUnit || '单位'}）
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.05"
                        value={formToleranceValue}
                        onChange={e => setFormToleranceValue(Number(e.target.value))}
                        aria-invalid={formToleranceValue < 0}
                        className={`w-full h-8 text-ty-xs border rounded-ty-sm px-2 bg-[var(--ty-fill-white-color)] text-[var(--ty-font-main-color)] font-mono ${formToleranceValue < 0 ? 'border-[var(--ty-red-color)]' : 'border-[var(--ty-primary-lighter-color)]'}`}
                      />
                    </div>
                    <div>
                      <label className="text-ty-2xs font-semibold text-[var(--ty-primary-color)] block mb-1">允许方向</label>
                      <select value={formToleranceDirection} onChange={e => setFormToleranceDirection(e.target.value as 'BOTH' | 'HIGHER' | 'LOWER')} className="w-full h-8 text-ty-xs border border-[var(--ty-primary-lighter-color)] rounded-ty-sm bg-[var(--ty-fill-white-color)]">
                        <option value="BOTH">双向</option><option value="HIGHER">仅允许偏高</option><option value="LOWER">仅允许偏低</option>
                      </select>
                    </div>
                    {formUnitFamily === '长度' && formToleranceType === 'PERCENTAGE' && formToleranceDirection === 'BOTH' && formToleranceValue === 2 && (
                      <div className="sm:col-span-3 px-3 py-2 bg-[var(--ty-fill-white-color)] border border-[var(--ty-primary-lighter-color)] rounded-ty-sm text-ty-2xs text-[var(--ty-primary-color)] leading-relaxed">
                        主单位换算示例：基准 1 m，双向容差 2%；候选 102 cm 命中满分，候选 1.021 m 不命中。温度等带偏移单位需单独验证边界。
                      </div>
                    )}
                  </div>
                )}

                {formMatchType === '数值距离衰减' && (
                  <div className="p-3 bg-[var(--ty-primary-lighter-color)]/20 border border-[var(--ty-primary-lighter-color)] rounded-ty-sm grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <label className="text-ty-2xs font-semibold text-[var(--ty-primary-color)]">满分允许偏差<input type="number" min="0" step="0.05" value={formDecayFullRange} onChange={e => setFormDecayFullRange(Number(e.target.value))} className="mt-1 w-full h-8 text-ty-xs border border-[var(--ty-primary-lighter-color)] rounded-ty-sm px-2 bg-[var(--ty-fill-white-color)] font-mono" /></label>
                    <label className="text-ty-2xs font-semibold text-[var(--ty-primary-color)]">降至零分的偏差<input type="number" min="0" step="0.05" value={formDecayZeroBoundary} onChange={e => setFormDecayZeroBoundary(Number(e.target.value))} className="mt-1 w-full h-8 text-ty-xs border border-[var(--ty-primary-lighter-color)] rounded-ty-sm px-2 bg-[var(--ty-fill-white-color)] font-mono" /></label>
                    <label className="text-ty-2xs font-semibold text-[var(--ty-primary-color)]">允许方向<select value={formToleranceDirection} onChange={e => setFormToleranceDirection(e.target.value as 'BOTH' | 'HIGHER' | 'LOWER')} className="mt-1 w-full h-8 text-ty-xs border border-[var(--ty-primary-lighter-color)] rounded-ty-sm bg-[var(--ty-fill-white-color)]"><option value="BOTH">双向</option><option value="HIGHER">仅允许偏高</option><option value="LOWER">仅允许偏低</option></select></label>
                  </div>
                )}

                {formMatchType === '层级关系匹配' && (
                  <div className="p-3 bg-[var(--ty-primary-lighter-color)]/20 border border-[var(--ty-primary-lighter-color)] rounded-ty-sm grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="text-ty-2xs font-semibold text-[var(--ty-primary-color)]">最大层级差<input type="number" min="1" step="1" value={formHierarchyMaxGap} onChange={e => setFormHierarchyMaxGap(Number(e.target.value))} className="mt-1 w-full h-8 text-ty-xs border border-[var(--ty-primary-lighter-color)] rounded-ty-sm px-2 bg-[var(--ty-fill-white-color)] font-mono" /></label>
                    <label className="text-ty-2xs font-semibold text-[var(--ty-primary-color)]">每级扣减（%）<input type="number" min="0" max="100" step="1" value={formHierarchyDeduction} onChange={e => setFormHierarchyDeduction(Number(e.target.value))} className="mt-1 w-full h-8 text-ty-xs border border-[var(--ty-primary-lighter-color)] rounded-ty-sm px-2 bg-[var(--ty-fill-white-color)] font-mono" /></label>
                  </div>
                )}

                {matchConfigError && <p role="alert" className="text-ty-2xs text-[var(--ty-red-color)]">{matchConfigError}</p>}

                {/* 4. 字段不满足匹配条件时处理 (核心规范: 单选卡片) */}
                <div className="space-y-2 pt-2 border-t border-[var(--ty-border-color)]">
                  <label className="text-ty-xs font-bold text-[var(--ty-font-main-color)] block">
                    字段不满足匹配条件时处理 <span className="text-[var(--ty-red-color)]">*</span>
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* 选项 1: ZERO_AND_CONTINUE */}
                    <div
                      onClick={() => setFormMismatchAction('ZERO_AND_CONTINUE')}
                      className={`p-3 rounded-ty-sm border cursor-pointer transition-all ${
                        formMismatchAction === 'ZERO_AND_CONTINUE'
                          ? 'border-[var(--ty-primary-color)] bg-[var(--ty-primary-lighter-color)]/20 ring-1 ring-[var(--ty-primary-color)]'
                          : 'border-[var(--ty-border-color)] bg-[var(--ty-fill-white-color)] hover:border-[var(--ty-border-dark-color)]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="mismatchAction"
                          checked={formMismatchAction === 'ZERO_AND_CONTINUE'}
                          onChange={() => setFormMismatchAction('ZERO_AND_CONTINUE')}
                          className="accent-[var(--ty-primary-color)]"
                        />
                        <span className="text-ty-xs font-bold text-[var(--ty-font-main-color)]">
                          该字段记 0 分，候选继续计算
                        </span>
                      </div>
                      <p className="text-ty-2xs text-[var(--ty-font-sub-color)] mt-2 leading-relaxed pl-5">
                        该字段不命中时仅失去本字段得分，候选仍参与其他字段评分和最终排序。
                      </p>
                    </div>

                    {/* 选项 2: EXCLUDE_CANDIDATE */}
                    <div
                      onClick={() => setFormMismatchAction('EXCLUDE_CANDIDATE')}
                      className={`p-3 rounded-ty-sm border cursor-pointer transition-all ${
                        formMismatchAction === 'EXCLUDE_CANDIDATE'
                          ? 'border-[var(--ty-orange-color)] bg-[var(--ty-orange-light-color)]/40 ring-1 ring-[var(--ty-orange-color)]'
                          : 'border-[var(--ty-border-color)] bg-[var(--ty-fill-white-color)] hover:border-[var(--ty-border-dark-color)]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="mismatchAction"
                          checked={formMismatchAction === 'EXCLUDE_CANDIDATE'}
                          onChange={() => setFormMismatchAction('EXCLUDE_CANDIDATE')}
                          className="accent-[var(--ty-orange-color)]"
                        />
                        <span className="text-ty-xs font-bold text-[var(--ty-font-main-color)]">
                          排除整个候选 (门槛字段)
                        </span>
                      </div>
                      <p className="text-ty-2xs text-[var(--ty-font-sub-color)] mt-2 leading-relaxed pl-5">
                        该字段将成为候选门槛，不满足时该候选不再评分，也不会进入应用端结果。
                      </p>
                    </div>
                  </div>

                  {/* 门槛黄色警示横幅 */}
                  {formMismatchAction === 'EXCLUDE_CANDIDATE' && (
                    <div className="p-3 bg-[var(--ty-orange-lightest-color)] border border-[var(--ty-orange-color)]/40 rounded-ty-sm text-[var(--ty-font-main-light-color)] text-ty-xs flex items-start gap-2 animate-in fade-in">
                      <AlertTriangle className="w-4 h-4 text-[var(--ty-orange-color)] shrink-0 mt-0.5" />
                      <p className="leading-relaxed">
                        该设置会缩小候选范围。多个字段均设置为“排除整个候选”时，任一字段不满足即排除候选。建议先通过查询预览验证。
                      </p>
                    </div>
                  )}
                </div>

                {/* 5. 基准缺失口径与候选缺失策略 */}
                <div className="space-y-3 pt-2 border-t border-[var(--ty-border-color)]">
                  <div className="px-3 py-2 rounded-ty-sm bg-[var(--ty-fill-weak-dark-color)] border border-[var(--ty-border-color)] text-ty-2xs text-[var(--ty-font-sub-color)]">
                    <strong className="text-[var(--ty-font-main-color)]">基准值缺失：</strong>本字段本次不比较，不计入分母。
                  </div>
                  <div>
                    <label className="text-ty-xs font-bold text-[var(--ty-font-main-color)] block mb-1">
                      <span className="inline-flex items-center gap-1">
                        候选值缺失时
                        <HelpTooltip
                          label="查看候选值缺失处理说明"
                          content="计0分：该字段得0分，保留其评分权重。不参与本次计算：本次不计入该字段权重，按其余评分字段重新计算总分。候选缺失不等同于双方有值时的不匹配，也不会自动触发候选排除。"
                        />
                      </span>
                    </label>
                    <select
                      value={formNullHandling}
                      onChange={e => setFormNullHandling(e.target.value)}
                      className="w-full h-8 text-ty-xs border border-[var(--ty-border-color)] rounded-ty-sm px-2 bg-[var(--ty-fill-white-color)] text-[var(--ty-font-main-color)]"
                    >
                      <option value="计0分">计0分</option>
                      <option value="不参与本次计算（跳过）">不参与本次计算（跳过）</option>
                    </select>
                  </div>
                </div>
                </>
                ) : (
                  <div className="p-4 rounded-ty-sm border border-[var(--ty-border-color)] bg-[var(--ty-fill-weak-dark-color)] text-ty-xs text-[var(--ty-font-sub-color)] space-y-2" id="display-only-rule-summary">
                    <div className="font-bold text-[var(--ty-font-main-color)]">展示对比属性</div>
                    <p>结果详情仍显示基准值、候选值及是否存在差异。</p>
                    <p>评分权重、匹配方式、容差或衰减参数、候选值缺失策略和不匹配处理均不适用。</p>
                  </div>
                )}
              </div>

              {/* 右侧实时试算仿真器 (5 列) */}
              <div className="lg:col-span-5 bg-[var(--ty-fill-weak-dark-color)] p-4 rounded-ty-sm border border-[var(--ty-border-color)] flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-[var(--ty-border-color)] pb-2">
                    <span className="text-ty-xs font-bold text-[var(--ty-font-main-color)] flex items-center gap-2">
                      <HelpCircle className="w-3.5 h-3.5 text-[var(--ty-primary-color)]" />
                      {formIsScoreActive ? '实时规则试算仿真' : '展示对比预览'}
                    </span>
                    <span className="text-ty-2xs text-[var(--ty-font-sub-light-color)]">{formIsScoreActive ? '瞬时反馈' : '不计分'}</span>
                  </div>

                  {/* 模拟输入对 */}
                  <div className="space-y-2 text-ty-xs">
                    <div>
                      <span className="text-ty-2xs font-semibold text-[var(--ty-font-sub-color)] block mb-0.5">
                        基准参考值 (源值)
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={trialSrcVal}
                          onChange={e => setTrialSrcVal(e.target.value)}
                          className="flex-1 h-8 text-ty-xs border border-[var(--ty-border-color)] rounded-ty-sm px-2 bg-[var(--ty-fill-white-color)] text-[var(--ty-font-main-color)]"
                          placeholder="例如: 10 或 SUS304"
                        />
                        {trialUnitOptions.length > 0 ? (
                          <select
                            value={trialSrcUnit}
                            onChange={e => setTrialSrcUnit(e.target.value)}
                            aria-label="基准值单位"
                            className="h-8 w-24 text-ty-xs border border-[var(--ty-border-color)] rounded-ty-sm px-2 bg-[var(--ty-fill-white-color)] text-[var(--ty-font-main-color)] font-mono"
                          >
                            {trialUnitOptions.map(unit => <option key={unit.code} value={unit.code}>{unit.code}</option>)}
                          </select>
                        ) : formDisplayUnit && formDisplayUnit !== '无' ? (
                          <span className="text-ty-xs text-[var(--ty-font-sub-color)] font-mono">{formDisplayUnit}</span>
                        ) : null}
                      </div>
                    </div>

                    <div>
                      <span className="text-ty-2xs font-semibold text-[var(--ty-font-sub-color)] block mb-0.5">
                        候选对象值 (目标值)
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={trialCandVal}
                          onChange={e => setTrialCandVal(e.target.value)}
                          className="flex-1 h-8 text-ty-xs border border-[var(--ty-border-color)] rounded-ty-sm px-2 bg-[var(--ty-fill-white-color)] text-[var(--ty-font-main-color)]"
                          placeholder="例如: 16 或 A2-70"
                        />
                        {trialUnitOptions.length > 0 ? (
                          <select
                            value={trialCandUnit}
                            onChange={e => setTrialCandUnit(e.target.value)}
                            aria-label="候选值单位"
                            className="h-8 w-24 text-ty-xs border border-[var(--ty-border-color)] rounded-ty-sm px-2 bg-[var(--ty-fill-white-color)] text-[var(--ty-font-main-color)] font-mono"
                          >
                            {trialUnitOptions.map(unit => <option key={unit.code} value={unit.code}>{unit.code}</option>)}
                          </select>
                        ) : formDisplayUnit && formDisplayUnit !== '无' ? (
                          <span className="text-ty-xs text-[var(--ty-font-sub-color)] font-mono">{formDisplayUnit}</span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* 仿真结果卡片 */}
                  <div className="p-3 rounded-ty-sm border border-[var(--ty-border-color)] bg-[var(--ty-fill-white-color)] space-y-2">
                    <div className="text-ty-2xs text-[var(--ty-font-sub-light-color)] font-semibold">{formIsScoreActive ? '试算判定结果：' : '展示说明：'}</div>
                    <div
                      className={`p-3 rounded-ty-sm text-ty-xs font-bold flex items-center gap-2 ${
                        modalTrialResult.outcomeType === 'SUCCESS'
                          ? 'bg-[var(--ty-green-lightest-color)] text-[var(--ty-font-main-light-color)] border border-[var(--ty-green-color)]/30'
                          : modalTrialResult.outcomeType === 'PARTIAL'
                          ? 'bg-[var(--ty-primary-lightest-color)] text-[var(--ty-font-main-light-color)] border border-[var(--ty-primary-color)]/30'
                          : modalTrialResult.outcomeType === 'EXCLUDED'
                          ? 'bg-[var(--ty-red-lightest-color)] text-[var(--ty-font-main-light-color)] border border-[var(--ty-red-color)]/30'
                          : 'bg-[var(--ty-fill-color)] text-[var(--ty-font-main-color)] border border-[var(--ty-border-color)]'
                      }`}
                    >
                      {modalTrialResult.outcomeType === 'EXCLUDED' ? (
                        <ShieldAlert className="w-4 h-4 text-[var(--ty-red-color)] shrink-0" />
                      ) : modalTrialResult.outcomeType === 'SUCCESS' ? (
                        <CheckCircle2 className="w-4 h-4 text-[var(--ty-green-color)] shrink-0" />
                      ) : (
                        <Info className="w-4 h-4 text-[var(--ty-primary-color)] shrink-0" />
                      )}
                      <span>{modalTrialResult.outcomeText}</span>
                    </div>

                    {formIsScoreActive ? (
                    <div className="text-ty-2xs text-[var(--ty-font-sub-color)] space-y-1 pt-1 border-t border-[var(--ty-border-light-color)]">
                      <div className="flex justify-between">
                        <span>字段原始分：</span>
                        <span className="font-mono font-semibold">{(modalTrialResult.matchRate * 100).toFixed(2)} 分</span>
                      </div>
                      <div className="flex justify-between">
                        <span>字段贡献：</span>
                        <span className="font-mono font-semibold">{modalTrialResult.weightedScore.toFixed(2)} 分</span>
                      </div>
                      <p className="pt-1 border-t border-[var(--ty-border-light-color)]">字段贡献 = 字段原始分 × 权重，参与综合相似度计算。</p>
                    </div>
                    ) : (
                      <p className="text-ty-2xs text-[var(--ty-font-sub-color)] pt-1 border-t border-[var(--ty-border-light-color)]">保存后仅在对比详情展示两侧值及差异，不生成字段得分或扣分原因。</p>
                    )}
                  </div>
                </div>

                <p className="text-ty-2xs text-[var(--ty-font-sub-light-color)] leading-tight">
                  {formIsScoreActive ? '提示：调整左侧参数或不匹配处理模式，右侧将即时响应判定结论。' : '提示：当前字段仅用于展示对比，隐藏的评分参数不会参与计算或校验。'}
                </p>
              </div>
            </div>

            {/* 模态框底部操作 */}
            <div className="px-4 py-3 border-t border-[var(--ty-border-color)] bg-[var(--ty-fill-weak-dark-color)] flex items-center justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="h-8 min-w-[68px] px-4 text-ty-xs font-medium text-[var(--ty-font-main-color)] bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm hover:bg-[var(--ty-fill-color)] transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={handleSaveRule}
                disabled={formIsScoreActive && (!Number.isFinite(formWeight) || formWeight < 0 || formWeight > 100 || Boolean(matchConfigError))}
                title={formIsScoreActive && (!Number.isFinite(formWeight) || formWeight < 0 || formWeight > 100) ? '请先修正评分权重' : matchConfigError || '保存字段规则'}
                className="h-8 min-w-[68px] px-4 text-ty-xs font-semibold text-[var(--ty-font-white-color)] bg-[var(--ty-primary-color)] rounded-ty-sm hover:opacity-90 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-45"
              >
                保存规则
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
