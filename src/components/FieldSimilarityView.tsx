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
  Clock,
  Lock
} from 'lucide-react';
import {
  FieldSimilarityRule,
  MatchConfig,
  ChangeRecord,
  isObjectRulesModified,
  TrialFeedback,
  MismatchAction
} from '../types';
import {
  rootTypeOptions,
  softTypeOptions,
  similarityGroupingDefinition,
  stage1MappedFields,
  mockUnitCatalog,
  convertToBaseUnit,
  convertFromBaseUnit,
  processEnumList,
  formatWithDisplayUnit,
  calculateFieldMatchRate
} from '../data';
import { useFeedback } from './ui/FeedbackProvider';
import { paginateRows, TablePagination } from './ui/TablePagination';
import { HelpTooltip } from './ui/HelpTooltip';

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
  const { notify, confirm } = useFeedback();
  // 二阶段相似度搜索只面向零部件。softTypeId 继续承载既有数据中的“分组属性值”。
  const selectedRootTypeId = 'PART';
  const [selectedSoftTypeId, setSelectedSoftTypeId] = useState<string>('IN_HOUSE');

  // 当前可用的软类型列表 (根据所选根类型过滤)
  const availableSoftTypes = useMemo(() => {
    return softTypeOptions.filter(st => st.rootTypeId === selectedRootTypeId);
  }, [selectedRootTypeId]);

  const currentRootTypeObj = rootTypeOptions.find(rt => rt.id === selectedRootTypeId);
  const currentSoftTypeObj = softTypeOptions.find(st => st.id === selectedSoftTypeId);

  // 2. 列表筛选状态
  const [filterKeyword, setFilterKeyword] = useState('');
  const [filterScoreActive, setFilterScoreActive] = useState('ALL');
  const [filterMismatchAction, setFilterMismatchAction] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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
  const { currentPage, rows: pageRules } = paginateRows<FieldSimilarityRule>(filteredRules, page, pageSize);

  useEffect(() => {
    setPage(1);
  }, [selectedRootTypeId, selectedSoftTypeId]);

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
  const hasSavedDraft = useMemo(() => {
    return isObjectRulesModified(savedRules, activeRules, selectedRootTypeId, selectedSoftTypeId);
  }, [savedRules, activeRules, selectedRootTypeId, selectedSoftTypeId]);

  // 一阶段可选字段 (根据当前根类型及软类型过滤)
  const availableStage1Fields = useMemo(() => {
    return stage1MappedFields.filter(
      f =>
        f.rootTypeId === selectedRootTypeId &&
        (!f.softTypeId || f.softTypeId === selectedSoftTypeId) &&
        f.enabled
    );
  }, [selectedRootTypeId, selectedSoftTypeId]);
  const eligibleStage1Fields = useMemo(
    () => availableStage1Fields.filter(field => !field.isMultiValue),
    [availableStage1Fields]
  );

  // 打开新建规则模态框
  const handleOpenCreateModal = () => {
    if (eligibleStage1Fields.length === 0) {
      notify('当前分组值暂无可用于相似度计算的单值字段。', 'warning');
      return;
    }
    // 默认选取第一个未配置的字段
    const unconfigured = eligibleStage1Fields.find(
      f => !currentScopeEditingRules.some(r => r.propertyCode === f.fieldCode)
    ) || eligibleStage1Fields[0];

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
    if (selectedField.isMultiValue) {
      notify('多值属性当前只支持同步、展示和查询，暂不支持相似度评分。', 'warning');
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
    setFormHitReasonTemplate(`${selectedField.displayName}匹配一致`);
    setFormDiffFieldsTemplate(`${selectedField.displayName}存在差异`);
  };

  // 保存规则到当前编辑态
  const handleSaveRule = () => {
    if (!formFieldName || !formPropertyCode) {
      notify('请选择有效的一阶段字段。', 'warning');
      return;
    }
    if (!Number.isFinite(formWeight) || formWeight < 0 || formWeight > 100) {
      notify('评分权重请输入 0～100 之间的数字。', 'warning');
      return;
    }
    const selectedField = availableStage1Fields.find(field => field.fieldCode === formPropertyCode);
    if (selectedField?.isMultiValue) {
      notify('多值属性暂不支持相似度评分，请选择单值属性。', 'warning');
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
  const handleDeleteRule = async (id: string) => {
    if (await confirm({ title: '删除字段规则', message: '确定要删除该字段相似度规则吗？', confirmText: '删除', tone: 'danger' })) {
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
      operator: '李晓华 (数据标准管理员)',
      time: new Date().toISOString().replace('T', ' ').slice(0, 19),
      result: 'SUCCESS'
    };
    onUpdateChangeRecords([newRecord, ...changeRecords]);
    notify('配置已保存为草稿，可在查询预览中选择“已保存版本”进行验证。', 'success');
  };

  // 发布并启用当前软类型配置
  const handlePublishActive = async () => {
    if (activeScoreRulesCount === 0 || totalScoreWeight !== 100) {
      notify(`发布失败：参与评分字段权重合计必须为 100%，当前为 ${totalScoreWeight}%。`, 'warning');
      return;
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
      operator: '李晓华 (数据标准管理员)',
      time: new Date().toISOString().replace('T', ' ').slice(0, 19),
      result: 'SUCCESS'
    };
    onUpdateChangeRecords([newRecord, ...changeRecords]);
    notify('配置已发布并生效，应用端查找相似件将应用最新规则。', 'success');
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
    <div className="space-y-4" id="field-similarity-view-container">
      {/* 顶部标题与上下文控制栏 */}
      <div className="bg-[var(--ty-fill-white-color)] rounded-ty-sm border border-[var(--ty-border-color)] p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-[var(--ty-primary-color)]" />
            <h1 className="text-ty-xl font-semibold text-[var(--ty-font-main-color)] tracking-tight">字段相似度规则</h1>
            <HelpTooltip label="查看字段相似度规则说明" content="为零部件按固定分组属性的不同取值分别定义相似度规则。" />
          </div>

          {/* 操作按钮区 */}
          <div className="flex flex-wrap items-center justify-end gap-2">
            {(isModified || hasSavedDraft) && (
              <span className="text-ty-xs font-semibold px-3 py-1 bg-[var(--ty-orange-lightest-color)] text-[var(--ty-font-main-light-color)] border border-[var(--ty-orange-color)]/30 rounded-ty-sm inline-flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-[var(--ty-orange-color)] shrink-0" />
                {isModified ? '编辑中（未保存）' : '草稿已保存（未启用）'}
              </span>
            )}
            <button
              onClick={handleSaveDraft}
              className="h-8 inline-flex items-center gap-2 px-3 text-ty-xs font-medium text-[var(--ty-font-main-color)] bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm hover:bg-[var(--ty-fill-color)] transition-colors cursor-pointer"
              id="save-draft-btn"
            >
              <Save className="w-3.5 h-3.5 text-[var(--ty-font-sub-color)]" />
              保存草稿
            </button>
            <button
              onClick={handlePublishActive}
              disabled={activeScoreRulesCount === 0 || totalScoreWeight !== 100}
              title={totalScoreWeight === 100 ? '发布并启用当前规则' : `权重合计必须为 100%，当前为 ${totalScoreWeight}%`}
              className="h-8 inline-flex items-center gap-2 px-4 text-ty-xs font-semibold text-[var(--ty-font-white-color)] bg-[var(--ty-primary-color)] rounded-ty-sm hover:opacity-90 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-45"
              id="publish-active-btn"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              发布并启用
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

        {/* 固定对象类型、分组属性定义与分组值 */}
        <div className="pt-3 border-t border-[var(--ty-border-color)] grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-ty-xs font-semibold text-[var(--ty-font-sub-color)] flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-[var(--ty-font-sub-light-color)]" />
              对象类型
            </label>
            <div id="root-type-selector" className="h-8 px-3 flex items-center justify-between border border-[var(--ty-border-color)] rounded-ty-sm bg-[var(--ty-fill-weak-dark-color)] text-ty-xs font-medium">
              <span>{currentRootTypeObj?.name}</span>
              <span className="text-ty-2xs text-[var(--ty-font-sub-color)]">固定范围</span>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-ty-xs font-semibold text-[var(--ty-font-sub-color)] flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-[var(--ty-font-sub-light-color)]" />
              规则分组属性
              <HelpTooltip
                label="查看规则分组属性说明"
                content={<span>从已发布的 Manticore 单值属性中定义一个分组维度，例如 PLM 分类、来源类型、产品族、工厂或视图。建立规则后该定义锁定；多值属性不能作为分组属性。</span>}
              />
            </label>
            <div className="h-8 px-3 flex items-center justify-between gap-2 border border-[var(--ty-border-color)] rounded-ty-sm bg-[var(--ty-fill-weak-dark-color)] text-ty-xs font-medium">
              <span className="min-w-0 truncate" title={`${similarityGroupingDefinition.propertyName} (${similarityGroupingDefinition.propertyCode})`}>
                {similarityGroupingDefinition.propertyName} <span className="font-mono text-[var(--ty-font-sub-color)]">({similarityGroupingDefinition.propertyCode})</span>
              </span>
              <span className="shrink-0 whitespace-nowrap text-ty-2xs text-[var(--ty-font-sub-color)]">已锁定</span>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-ty-xs font-semibold text-[var(--ty-font-sub-color)] flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--ty-font-sub-light-color)]" />
              分组属性值
            </label>
            <select
              value={selectedSoftTypeId}
              onChange={e => setSelectedSoftTypeId(e.target.value)}
              className="w-full h-8 text-ty-xs font-medium border border-[var(--ty-border-color)] rounded-ty-sm px-3 bg-[var(--ty-fill-white-color)] text-[var(--ty-font-main-color)] focus:border-[var(--ty-primary-color)] focus:outline-hidden"
              id="soft-type-selector"
            >
              {availableSoftTypes.map(st => (
                <option key={st.id} value={st.id}>
                  {st.name}
                </option>
              ))}
            </select>
          </div>

        </div>
        <p className="text-ty-2xs text-[var(--ty-font-sub-color)]">
          当前值：{currentSoftTypeObj?.description}。未命中已启用分组值的零部件不参与相似度搜索，不使用兜底规则。
        </p>
      </div>

      {/* 规则配置摘要看板 (Compact Summary Bar) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[var(--ty-fill-white-color)] p-4 rounded-ty-sm border border-[var(--ty-border-color)] flex items-center justify-between">
          <div>
            <span className="text-ty-2xs font-medium text-[var(--ty-font-sub-color)] block">当前规则上下文</span>
            <span className="text-ty-xs font-bold text-[var(--ty-font-main-color)] mt-0.5 block">
              {similarityGroupingDefinition.propertyName} = {currentSoftTypeObj?.name.split(' ')[0]}
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

          <button
            onClick={handleOpenCreateModal}
            className="h-8 inline-flex items-center gap-2 px-3 text-ty-xs font-semibold text-[var(--ty-font-white-color)] bg-[var(--ty-primary-color)] rounded-ty-sm hover:opacity-90 transition-colors self-start md:self-auto cursor-pointer"
            id="add-new-rule-btn"
          >
            <Plus className="w-3.5 h-3.5" />
            新建字段规则
          </button>
        </div>

        {/* 规则数据表格 / 空态 */}
        {currentScopeEditingRules.length === 0 ? (
          <div className="p-12 text-center" id="empty-soft-type-rules-container">
            <div className="w-12 h-12 rounded-full bg-[var(--ty-orange-lightest-color)] border border-[var(--ty-orange-color)]/30 text-[var(--ty-orange-color)] mx-auto flex items-center justify-center mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-ty-sm font-semibold text-[var(--ty-font-main-color)]">当前分组值尚未配置相似度规则</h3>
            <p className="text-ty-xs text-[var(--ty-font-sub-color)] max-w-md mx-auto mt-2 leading-relaxed">
              该分组值下的零部件暂不参与相似度搜索。请先配置规则并确保参与评分字段权重合计为 100%。
            </p>
            <button
              onClick={handleOpenCreateModal}
              className="mt-4 h-8 inline-flex items-center gap-2 px-4 text-ty-xs font-semibold text-[var(--ty-font-white-color)] bg-[var(--ty-primary-color)] rounded-ty-sm hover:opacity-90 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              为当前分组值配置规则
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
                  <th className="py-2 px-4 w-12 text-center">序号</th>
                  <th className="py-2 px-4">字段名称</th>
                  <th className="py-2 px-4">字段编码</th>
                  <th className="py-2 px-4">字段类型</th>
                  <th className="py-2 px-4">权重 (Weight)</th>
                  <th className="py-2 px-4">匹配方式</th>
                  <th className="py-2 px-4">不匹配处理</th>
                  <th className="py-2 px-4">缺失值处理</th>
                  <th className="py-2 px-4 text-center">参与评分</th>
                  <th className="py-2 px-4 text-right sticky right-0 z-10 bg-[var(--ty-fill-weak-dark-color)] border-l border-[var(--ty-border-color)] shadow-ty-sticky">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--ty-border-light-color)]">
                {pageRules.map((rule, idx) => {
                  const isGate = rule.mismatchAction === 'EXCLUDE_CANDIDATE';
                  return (
                    <tr
                      key={rule.id}
                      className="hover:bg-[var(--ty-fill-weak-dark-color)] transition-colors group"
                      id={`rule-row-${rule.id}`}
                    >
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
                          <span
                            className={`font-mono font-bold ${
                              rule.isScoreActive ? 'text-[var(--ty-font-main-color)]' : 'text-[var(--ty-font-sub-light-color)] line-through'
                            }`}
                          >
                            {rule.weight}%
                          </span>
                        </div>
                      </td>

                      {/* 匹配方式 */}
                      <td className="py-3 px-4 font-medium text-[var(--ty-font-main-color)]">{rule.matchType}</td>
                      <td className="py-3 px-4">
                          {isGate ? (
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
                        {rule.nullHandling || '候选缺失按 0 分'}
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
                  {similarityGroupingDefinition.propertyName} = {currentSoftTypeObj?.name}
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
                      {availableStage1Fields.map(f => (
                        <option key={f.fieldCode} value={f.fieldCode} disabled={f.isMultiValue}>
                          {f.displayName} ({f.fieldCode}) - {f.businessFieldType}{f.isMultiValue ? ' · 多值，暂不支持评分' : ''}
                        </option>
                      ))}
                    </select>
                  )}
                  <p className="text-ty-2xs text-[var(--ty-font-sub-color)] mt-1">
                    多值属性可继续同步、展示和查询；当前版本不作为分组属性或相似度评分字段。
                  </p>
                </div>

                {/* 2. 匹配方式与动态参数 */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-ty-xs font-bold text-[var(--ty-font-main-color)] block mb-1">
                      匹配方式 <span className="text-[var(--ty-red-color)]">*</span>
                    </label>
                    <select
                      value={formMatchType}
                      onChange={e => setFormMatchType(e.target.value)}
                      className="w-full h-8 text-ty-xs border border-[var(--ty-border-color)] rounded-ty-sm px-3 bg-[var(--ty-fill-white-color)] text-[var(--ty-font-main-color)] focus:border-[var(--ty-primary-color)] focus:outline-hidden"
                    >
                      {getAllowedMatchTypes(formFieldType).map(mt => (
                        <option key={mt} value={mt}>
                          {mt}
                        </option>
                      ))}
                    </select>
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
                  <div className="p-3 bg-[var(--ty-primary-lighter-color)]/20 border border-[var(--ty-primary-lighter-color)] rounded-ty-sm grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-ty-2xs font-semibold text-[var(--ty-primary-color)] block mb-1">容差类型</label>
                      <select
                        value={formToleranceType}
                        onChange={e => setFormToleranceType(e.target.value as any)}
                        className="w-full h-8 text-ty-xs border border-[var(--ty-primary-lighter-color)] rounded-ty-sm bg-[var(--ty-fill-white-color)] text-[var(--ty-font-main-color)]"
                      >
                        <option value="ABSOLUTE">绝对数值误差 (±Δ)</option>
                        <option value="PERCENTAGE">百分比相对误差 (±%)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-ty-2xs font-semibold text-[var(--ty-primary-color)] block mb-1">
                        容差值 ({formDisplayUnit || '单位'})
                      </label>
                      <input
                        type="number"
                        step="0.05"
                        value={formToleranceValue}
                        onChange={e => setFormToleranceValue(Number(e.target.value))}
                        className="w-full h-8 text-ty-xs border border-[var(--ty-primary-lighter-color)] rounded-ty-sm px-2 bg-[var(--ty-fill-white-color)] text-[var(--ty-font-main-color)] font-mono"
                      />
                    </div>
                  </div>
                )}

                {/* 3. 字段不满足匹配条件时处理 (核心规范: 单选卡片) */}
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

                {/* 4. 缺失值处理与模板 */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="text-ty-xs font-bold text-[var(--ty-font-main-color)] block mb-1">缺失值处理</label>
                    <select
                      value={formNullHandling}
                      onChange={e => setFormNullHandling(e.target.value)}
                      className="w-full h-8 text-ty-xs border border-[var(--ty-border-color)] rounded-ty-sm px-2 bg-[var(--ty-fill-white-color)] text-[var(--ty-font-main-color)]"
                    >
                      <option value="候选缺失按 0 分">候选缺失按 0 分 (计入分母)</option>
                      <option value="不参与计算 (权重均摊到其他有值项)">不参与计算 (不计入分母)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-ty-xs font-bold text-[var(--ty-font-main-color)] block mb-1">是否参与评分</label>
                    <select
                      value={formIsScoreActive ? 'YES' : 'NO'}
                      onChange={e => setFormIsScoreActive(e.target.value === 'YES')}
                      className="w-full h-8 text-ty-xs border border-[var(--ty-border-color)] rounded-ty-sm px-2 bg-[var(--ty-fill-white-color)] text-[var(--ty-font-main-color)] font-semibold"
                    >
                      <option value="YES">是 (参与相似度总分折算)</option>
                      <option value="NO">否 (仅作为展示与对比)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 右侧实时试算仿真器 (5 列) */}
              <div className="lg:col-span-5 bg-[var(--ty-fill-weak-dark-color)] p-4 rounded-ty-sm border border-[var(--ty-border-color)] flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-[var(--ty-border-color)] pb-2">
                    <span className="text-ty-xs font-bold text-[var(--ty-font-main-color)] flex items-center gap-2">
                      <HelpCircle className="w-3.5 h-3.5 text-[var(--ty-primary-color)]" />
                      实时规则试算仿真
                    </span>
                    <span className="text-ty-2xs text-[var(--ty-font-sub-light-color)]">瞬时反馈</span>
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
                        {formDisplayUnit && formDisplayUnit !== '无' && (
                          <span className="text-ty-xs text-[var(--ty-font-sub-color)] font-mono">{formDisplayUnit}</span>
                        )}
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
                        {formDisplayUnit && formDisplayUnit !== '无' && (
                          <span className="text-ty-xs text-[var(--ty-font-sub-color)] font-mono">{formDisplayUnit}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 仿真结果卡片 */}
                  <div className="p-3 rounded-ty-sm border border-[var(--ty-border-color)] bg-[var(--ty-fill-white-color)] space-y-2">
                    <div className="text-ty-2xs text-[var(--ty-font-sub-light-color)] font-semibold">试算判定结果：</div>
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

                    <div className="text-ty-2xs text-[var(--ty-font-sub-color)] space-y-1 pt-1 border-t border-[var(--ty-border-light-color)]">
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

                <p className="text-ty-2xs text-[var(--ty-font-sub-light-color)] leading-tight">
                  提示：调整左侧参数或不匹配处理模式，右侧将即时响应判定结论。
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
                disabled={!Number.isFinite(formWeight) || formWeight < 0 || formWeight > 100}
                title={!Number.isFinite(formWeight) || formWeight < 0 || formWeight > 100 ? '请先修正评分权重' : '保存字段规则'}
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
