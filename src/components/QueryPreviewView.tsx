import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Play,
  ChevronRight,
  Info,
  RotateCcw,
  X,
  CheckCircle2,
  AlertTriangle,
  Layers,
  SlidersHorizontal,
  ShieldAlert,
  HelpCircle,
  Clock,
  Eye
} from 'lucide-react';
import {
  rootTypeOptions,
  buildSimilarityRuleScopeKey,
  parseSimilarityRuleScopeKey,
  getSimilarityRuleScopeLabel,
  mockFormBaselines,
  runSimilaritySearch,
  formatFieldWithFallback
} from '../data';
import {
  FieldSimilarityRule,
  ScoredCandidate,
  ExcludedCandidate,
  SearchRunResult,
  SimilarityBaseline,
  ObjectType,
  SimilarityGroupConfigStatus,
  SimilarityTierConfig,
  SimilarityTierConfigMap,
  SimilarityRuntimeConfig
} from '../types';
import { useFeedback } from './ui/FeedbackProvider';
import { paginateRows, TablePagination } from './ui/TablePagination';
import { HelpTooltip } from './ui/HelpTooltip';
import { createSimilarityVersionSignature, formatSimilarityTierRange, getSimilarityTierConfig } from '../similarityTier';
import { SimilarityRunSummary } from './SimilarityRunSummary';

interface QueryPreviewViewProps {
  savedRules: FieldSimilarityRule[];
  activeRules: FieldSimilarityRule[];
  objectConfigStatus: Record<string, SimilarityGroupConfigStatus>;
  savedTierConfigs: SimilarityTierConfigMap;
  activeTierConfigs: SimilarityTierConfigMap;
  runtimeConfig: SimilarityRuntimeConfig;
  onPreviewSuccess?: (groupValueId: string, signature: string) => void;
  onNavigate?: (view: string) => void;
  initialSoftTypeId?: string;
  onReturnToRuleSet?: (scopeId: string) => void;
}

interface LastRunContext {
  rootTypeId: string;
  softTypeId: string;
  ruleVersion: 'DRAFT' | 'PUBLISHED';
  baseline: SimilarityBaseline;
  runTime: string;
  rulesSnapshot: FieldSimilarityRule[];
  tierSnapshot: SimilarityTierConfig;
  searchResult: SearchRunResult;
}

const getManualBaselineSeed = (softTypeId: string) => {
  const { typeId } = parseSimilarityRuleScopeKey(softTypeId);
  const example = mockFormBaselines.find(item => item.rootTypeId === 'PART' && item.softTypeId === typeId);
  return {
    values: { ...(example?.values || {}) },
    units: { ...(example?.units || {}) }
  };
};

export const QueryPreviewView: React.FC<QueryPreviewViewProps> = ({
  savedRules,
  activeRules,
  objectConfigStatus,
  savedTierConfigs,
  activeTierConfigs,
  runtimeConfig,
  onPreviewSuccess,
  onNavigate,
  initialSoftTypeId,
  onReturnToRuleSet
}) => {
  const { notify } = useFeedback();
  // 1. 查询条件状态
  const rootTypeId = 'PART';
  const initialPreviewScopeId = initialSoftTypeId || buildSimilarityRuleScopeKey('IN_HOUSE', 'HEX_HEAD_BOLT');
  const [softTypeId, setSoftTypeId] = useState<string>(initialPreviewScopeId);
  const [manualValues, setManualValues] = useState<Record<string, any>>(() => getManualBaselineSeed(initialPreviewScopeId).values);
  const [manualUnits, setManualUnits] = useState<Record<string, string>>(() => getManualBaselineSeed(initialPreviewScopeId).units);

  // 调试规则版本
  const [ruleVersion, setRuleVersion] = useState<'DRAFT' | 'PUBLISHED'>('DRAFT');

  // 运行加载态与上一次运行上下文快照
  const [isSearching, setIsSearching] = useState(false);
  const [lastRunContext, setLastRunContext] = useState<LastRunContext | null>(null);

  // 结果区 Tab: 参与评分候选 vs 已排除候选
  const [activeTab, setActiveTab] = useState<'SCORED' | 'EXCLUDED'>('SCORED');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // 算分明细抽屉选中的候选件
  const [selectedCandidate, setSelectedCandidate] = useState<ScoredCandidate | null>(null);
  const scoredPage = paginateRows<ScoredCandidate>(lastRunContext?.searchResult.scoredCandidates || [], page, pageSize);
  const excludedPage = paginateRows<ExcludedCandidate>(lastRunContext?.searchResult.excludedCandidates || [], page, pageSize);

  const availableSoftTypes = useMemo(() => {
    const sourceRules = ruleVersion === 'DRAFT' ? savedRules : activeRules;
    const keys = Array.from(new Set<string>(sourceRules.filter(rule => rule.rootTypeId === rootTypeId).map(rule => rule.softTypeId)));
    return keys.map(id => ({ id, name: getSimilarityRuleScopeLabel(id) }));
  }, [activeRules, ruleVersion, savedRules]);

  // 切换分组值或版本时，重新载入该上下文的手工试算示例值。
  useEffect(() => {
    if (!availableSoftTypes.some(option => option.id === softTypeId)) {
      setSoftTypeId(availableSoftTypes[0]?.id || '');
      return;
    }
    const seed = getManualBaselineSeed(softTypeId);
    setManualValues(seed.values);
    setManualUnits(seed.units);
    setLastRunContext(null);
    setSelectedCandidate(null);
  }, [availableSoftTypes, ruleVersion, softTypeId]);

  // 获取对应版本规则
  const getRulesForVersion = (version: 'DRAFT' | 'PUBLISHED') => version === 'DRAFT' ? savedRules : activeRules;
  const getTierConfigForVersion = (version: 'DRAFT' | 'PUBLISHED') => version === 'DRAFT'
    ? getSimilarityTierConfig(savedTierConfigs, softTypeId)
    : getSimilarityTierConfig(activeTierConfigs, softTypeId);

  const currentRules = getRulesForVersion(ruleVersion);
  const currentTierConfig = getTierConfigForVersion(ruleVersion);
  const currentScopeRules = currentRules.filter(
    r => (r.rootTypeId === rootTypeId || r.objectType === rootTypeId) && r.softTypeId === softTypeId
  );
  const groupEnabled = objectConfigStatus[softTypeId]?.enabled === true;
  const publishedVersionUnavailable = ruleVersion === 'PUBLISHED' && (
    objectConfigStatus[softTypeId]?.configVersion === '-' || currentScopeRules.length === 0
  );

  // 执行沙盒试算
  const handleRunTrial = () => {
    if (publishedVersionUnavailable) {
      notify('当前规则集尚无已发布版本，请切换到草稿版本进行沙盒试算。', 'warning');
      return;
    }
    const scoreWeight = currentScopeRules
      .filter(rule => rule.isScoreActive && rule.enabled)
      .reduce((sum, rule) => sum + rule.weight, 0);
    if (scoreWeight !== 100) {
      notify(`暂不能试算：参与评分字段权重合计必须为 100%，当前为 ${scoreWeight}%。`, 'warning');
      return;
    }
    const invalidRelativeDeviationReference = currentScopeRules.find(rule => {
      if (!rule.enabled || !rule.isScoreActive || rule.matchConfig?.kind !== 'RELATIVE_DEVIATION_DECAY') return false;
      const value = manualValues[rule.propertyCode];
      return value === undefined || value === null || String(value).trim() === '' || !Number.isFinite(Number(value)) || Number(value) === 0;
    });
    if (invalidRelativeDeviationReference) {
      setLastRunContext(null);
      notify('参考值必须为非零有效数字，无法计算相对偏差。', 'warning');
      return;
    }
    const { typeId } = parseSimilarityRuleScopeKey(softTypeId);
    const baseline: SimilarityBaseline = {
      type: 'FORM_VALUES',
      requestNo: '手工属性试算',
      rootTypeId,
      softTypeId: typeId,
      values: manualValues,
      units: manualUnits
    };

    setIsSearching(true);
    setSelectedCandidate(null);

    setTimeout(() => {
      const result = runSimilaritySearch(rootTypeId, softTypeId, baseline, currentRules, undefined, currentTierConfig, runtimeConfig);
      const snapshot: LastRunContext = {
        rootTypeId,
        softTypeId,
        ruleVersion,
        baseline,
        runTime: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
        rulesSnapshot: [...currentScopeRules],
        tierSnapshot: { ...currentTierConfig },
        searchResult: result
      };

      if (ruleVersion === 'DRAFT' && !result.errorCode) {
        onPreviewSuccess?.(
          softTypeId,
          createSimilarityVersionSignature(savedRules, rootTypeId, softTypeId, currentTierConfig, 'stage1_type_and_classification_roles')
        );
        notify('草稿版本试算成功，可返回规则集发布更新。', 'success');
      }

      setLastRunContext(snapshot);
      setIsSearching(false);
      setPage(1);
      // 默认聚焦有结果的 Tab
      if (result.scoredCandidates.length === 0 && result.excludedCandidates.length > 0) {
        setActiveTab('EXCLUDED');
      } else {
        setActiveTab('SCORED');
      }
    }, 280);
  };

  // 重置条件
  const handleReset = () => {
    setSoftTypeId('IN_HOUSE');
    const seed = getManualBaselineSeed('IN_HOUSE');
    setManualValues(seed.values);
    setManualUnits(seed.units);
    setRuleVersion('DRAFT');
    setLastRunContext(null);
    setSelectedCandidate(null);
    notify('已重置本页临时试算条件；已保存草稿和正式规则未修改。', 'success');
  };

  const currentRootTypeObj = rootTypeOptions.find(rt => rt.id === rootTypeId);
  const currentSoftTypeObj = availableSoftTypes.find(st => st.id === softTypeId);

  const activeScoreFieldsCount = currentScopeRules.filter(r => r.isScoreActive && r.enabled).length;
  const gateFieldsCount = currentScopeRules.filter(
    r => r.mismatchAction === 'EXCLUDE_CANDIDATE' && r.isScoreActive && r.enabled
  ).length;
  const totalWeight = currentScopeRules
    .filter(r => r.isScoreActive && r.enabled)
    .reduce((sum, r) => sum + r.weight, 0);
  const previewInputRules = Array.from(
    new Map<string, FieldSimilarityRule>(currentScopeRules.map(rule => [rule.propertyCode, rule])).values()
  );
  const draftPreviewSucceeded = lastRunContext?.ruleVersion === 'DRAFT' && !lastRunContext.searchResult.errorCode;

  return (
    <div className="space-y-4" id="query-preview-view-container">
      {/* 顶部控制面板 */}
      <div className="bg-[var(--ty-fill-white-color)] rounded-ty-sm border border-[var(--ty-border-color)] p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 border-b border-[var(--ty-border-color)] pb-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Search className="w-5 h-5 text-[var(--ty-primary-color)]" />
              <h1 className="text-ty-xl font-semibold text-[var(--ty-font-main-color)] tracking-tight">相似度查询预览</h1>
              <HelpTooltip label="查看相似度查询预览说明" content="手工录入属性值并选择草稿或已发布规则版本，验证候选召回、相似度计算与门槛排除效果。" />
              <span className="text-ty-2xs min-h-6 px-2 inline-flex items-center rounded-ty-xs bg-[var(--ty-fill-color)] text-[var(--ty-font-sub-color)] border border-[var(--ty-border-color)] font-normal">沙盒试算</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {draftPreviewSucceeded && onReturnToRuleSet && (
              <button
                type="button"
                onClick={() => onReturnToRuleSet(lastRunContext.softTypeId)}
                className="h-8 inline-flex items-center gap-2 px-3 text-ty-xs font-semibold text-[var(--ty-primary-color)] bg-[var(--ty-primary-lightest-color)] border border-[var(--ty-primary-color)] rounded-ty-sm hover:opacity-90 cursor-pointer"
                id="return-to-rule-set-publish-btn"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                返回规则集发布
              </button>
            )}
            <button
              onClick={handleReset}
              title="仅重置本页临时试算条件，不修改已保存规则"
              className="h-8 inline-flex items-center gap-2 px-3 text-ty-xs font-medium text-[var(--ty-font-sub-color)] bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm hover:bg-[var(--ty-fill-color)] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              重置试算条件
            </button>
            <button
              onClick={handleRunTrial}
              disabled={isSearching || totalWeight !== 100 || currentScopeRules.length === 0 || publishedVersionUnavailable}
              title={publishedVersionUnavailable ? '当前规则范围尚无已发布版本' : totalWeight === 100 ? '按所选规则版本进行试算' : `权重合计必须为 100%，当前为 ${totalWeight}%`}
              className="h-8 inline-flex items-center gap-2 px-4 text-ty-xs font-semibold text-[var(--ty-font-white-color)] bg-[var(--ty-primary-color)] rounded-ty-sm hover:opacity-90 transition-colors disabled:opacity-50 cursor-pointer"
              id="run-trial-btn"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {isSearching ? '正在试算...' : '启动沙盒试算'}
            </button>
          </div>
        </div>

        {/* 沙盒上下文 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* 1. 固定根类型 */}
          <div className="flex flex-col gap-1">
            <label className="text-ty-xs font-semibold text-[var(--ty-font-sub-color)] flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-[var(--ty-font-sub-light-color)]" />
              对象类型
            </label>
            <div id="preview-root-type-select" className="w-full h-8 px-3 flex items-center justify-between text-ty-xs font-medium border border-[var(--ty-border-color)] rounded-ty-sm bg-[var(--ty-fill-weak-dark-color)]">
              <span>{currentRootTypeObj?.name}</span>
            </div>
          </div>

          {/* 2. 规则集范围 */}
          <div className="flex flex-col gap-1">
            <label className="text-ty-xs font-semibold text-[var(--ty-font-sub-color)] flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--ty-font-sub-light-color)]" />
              规则集范围
            </label>
            <select
              value={softTypeId}
              onChange={e => setSoftTypeId(e.target.value)}
              className="w-full h-8 text-ty-xs font-medium border border-[var(--ty-border-color)] rounded-ty-sm px-3 bg-[var(--ty-fill-white-color)] text-[var(--ty-font-main-color)] focus:border-[var(--ty-primary-color)] focus:outline-hidden"
              id="preview-soft-type-select"
            >
              {availableSoftTypes.map(st => (
                <option key={st.id} value={st.id}>
                  {st.name}
                </option>
              ))}
            </select>
          </div>

          {/* 3. 调试规则版本 */}
          <div className="flex flex-col gap-1">
            <label className="text-ty-xs font-semibold text-[var(--ty-font-sub-color)] flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[var(--ty-font-sub-light-color)]" />
              规则版本
            </label>
            <select
              value={ruleVersion}
              onChange={e => setRuleVersion(e.target.value as any)}
              className="w-full h-8 text-ty-xs font-semibold border border-[var(--ty-border-color)] rounded-ty-sm px-3 bg-[var(--ty-fill-white-color)] text-[var(--ty-font-main-color)] focus:border-[var(--ty-primary-color)] focus:outline-hidden"
              id="preview-rule-version-select"
            >
              <option value="DRAFT">草稿版本</option>
              <option value="PUBLISHED">已发布版本</option>
            </select>
          </div>
        </div>

        <div className="rounded-ty-sm border border-[var(--ty-border-color)] overflow-hidden">
          <div className="px-3 py-2 bg-[var(--ty-fill-weak-dark-color)] border-b border-[var(--ty-border-color)] flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <span className="text-ty-xs font-semibold text-[var(--ty-font-main-color)]">试算属性</span>
              <HelpTooltip label="查看试算属性说明" content="手工输入仅用于本次沙盒试算，不修改业务对象或表单。" />
            </div>
            <span className="text-ty-2xs text-[var(--ty-font-sub-light-color)]">共 {previewInputRules.length} 个对比字段</span>
          </div>
          {previewInputRules.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-4 gap-y-3 p-3">
              {previewInputRules.map(rule => {
                const isNumeric = rule.matchConfig?.kind === 'NUMERIC_TOLERANCE' || rule.matchConfig?.kind === 'NUMERIC_DECAY' || rule.matchConfig?.kind === 'RELATIVE_DEVIATION_DECAY';
                const unit = rule.displayUnit && rule.displayUnit !== '无' ? rule.displayUnit : '';
                return (
                  <label key={rule.propertyCode} className="min-w-0">
                    <span className="mb-1 flex items-center justify-between gap-2 text-ty-2xs text-[var(--ty-font-sub-color)]">
                      <span className="truncate" title={`${rule.fieldName} (${rule.propertyCode})`}>{rule.fieldName}</span>
                      <span className={`shrink-0 ${rule.isScoreActive ? 'text-[var(--ty-primary-color)]' : 'text-[var(--ty-font-sub-light-color)]'}`}>
                        {rule.isScoreActive ? `参与评分 · ${rule.weight}%` : '仅展示对比'}
                      </span>
                    </span>
                    <div className="relative">
                      <input
                        type={isNumeric ? 'number' : 'text'}
                        step={isNumeric ? 'any' : undefined}
                        value={manualValues[rule.propertyCode] ?? ''}
                        onChange={event => setManualValues(values => ({ ...values, [rule.propertyCode]: event.target.value }))}
                        className={`w-full h-8 rounded-ty-sm border border-[var(--ty-border-color)] bg-[var(--ty-fill-white-color)] px-3 text-ty-xs text-[var(--ty-font-main-color)] focus:border-[var(--ty-primary-color)] focus:outline-hidden ${unit ? 'pr-12' : ''}`}
                        placeholder={`输入${rule.fieldName}`}
                      />
                      {unit && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ty-2xs text-[var(--ty-font-sub-light-color)]">{unit}</span>}
                    </div>
                  </label>
                );
              })}
            </div>
          ) : (
            <div className="p-6 text-center text-ty-xs text-[var(--ty-font-sub-color)]">当前规则集尚未配置可试算字段。</div>
          )}
        </div>

        {/* 紧凑规则上下文摘要行 (Compact Rule Summary Bar) */}
        <div className="p-3 bg-[var(--ty-fill-weak-dark-color)] border border-[var(--ty-border-color)] rounded-ty-sm flex flex-wrap items-center justify-between gap-3 text-ty-xs">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <span className="text-[var(--ty-font-sub-light-color)]">上下文：</span>
              <span className="font-bold text-[var(--ty-font-main-color)]">
                {currentRootTypeObj?.name.split(' ')[0]} / {currentSoftTypeObj?.name}
              </span>
              <span className={`ml-2 min-h-6 px-2 inline-flex items-center rounded-ty-xs border ${groupEnabled ? 'bg-[var(--ty-green-lightest-color)] text-[var(--ty-green-color)] border-[var(--ty-green-color)]/30' : 'bg-[var(--ty-fill-color)] text-[var(--ty-font-sub-color)] border-[var(--ty-border-color)]'}`}>{groupEnabled ? '已启用' : '已停用'}</span>
            </div>
            <div>
              <span className="text-[var(--ty-font-sub-light-color)]">规则版本：</span>
              <span className="font-semibold text-[var(--ty-primary-color)]">
                {ruleVersion === 'DRAFT' ? '草稿版本' : '已发布版本'}
              </span>
            </div>
            <div>
              <span className="text-[var(--ty-font-sub-light-color)]">相似度分档：</span>
              <span className="font-medium text-[var(--ty-font-main-color)] font-mono">
                {currentTierConfig.highStart.toFixed(2)} / {currentTierConfig.mediumStart.toFixed(2)}
              </span>
              <HelpTooltip label="查看当前分档" content={formatSimilarityTierRange(currentTierConfig)} />
            </div>
            <div>
              <span className="text-[var(--ty-font-sub-light-color)]">参与评分字段：</span>
              <span className="font-bold text-[var(--ty-font-main-color)] font-mono">{activeScoreFieldsCount} 项</span>
            </div>
            <div>
              <span className="text-[var(--ty-font-sub-light-color)]">门槛字段：</span>
              <span className="font-bold text-[var(--ty-orange-color)] font-mono">{gateFieldsCount} 项</span>
            </div>
            <div>
              <span className="text-[var(--ty-font-sub-light-color)]">权重合计：</span>
              <span
                className={`font-bold font-mono ${
                  totalWeight === 100 ? 'text-[var(--ty-green-color)]' : 'text-[var(--ty-red-color)]'
                }`}
              >
                {totalWeight}%
              </span>
            </div>
          </div>

          {lastRunContext && (
            <span className="text-ty-2xs text-[var(--ty-font-sub-light-color)]">
              试算时间：<span className="font-mono">{lastRunContext.runTime}</span>
            </span>
          )}
        </div>
        {totalWeight !== 100 && currentScopeRules.length > 0 && (
          <div className="px-3 py-2 bg-[var(--ty-red-lightest-color)] border border-[var(--ty-red-color)]/30 rounded-ty-sm text-ty-xs text-[var(--ty-red-color)] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            当前版本权重未配平，暂不能生成相似度试算结果。请返回字段相似度规则调整至 100%。
          </div>
        )}
      </div>

      {/* 试算结果区域 */}
      {isSearching ? (
        <div className="bg-[var(--ty-fill-white-color)] rounded-ty-sm border border-[var(--ty-border-color)] p-12 text-center">
          <div className="inline-block animate-spin text-[var(--ty-primary-color)] mb-3">
            <RotateCcw className="w-6 h-6" />
          </div>
          <h3 className="text-ty-sm font-bold text-[var(--ty-font-main-color)]">正在执行沙盒相似度试算...</h3>
        </div>
      ) : publishedVersionUnavailable ? (
        <div className="bg-[var(--ty-fill-white-color)] rounded-ty-sm border border-[var(--ty-border-color)] p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-[var(--ty-orange-lightest-color)] border border-[var(--ty-orange-color)]/30 text-[var(--ty-orange-color)] mx-auto flex items-center justify-center mb-3">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-ty-sm font-semibold text-[var(--ty-font-main-color)]">尚无已发布版本</h3>
        </div>
      ) : !lastRunContext ? (
        <div className="bg-[var(--ty-fill-white-color)] rounded-ty-sm border border-[var(--ty-border-color)] p-12 text-center" id="initial-guide-container">
          <div className="w-12 h-12 rounded-full bg-[var(--ty-primary-lighter-color)]/30 text-[var(--ty-primary-color)] mx-auto flex items-center justify-center mb-3">
            <Play className="w-6 h-6 fill-current ml-0.5" />
          </div>
          <h3 className="text-ty-sm font-bold text-[var(--ty-font-main-color)]">点击“启动沙盒试算”开始验证</h3>
        </div>
      ) : lastRunContext.searchResult.errorCode === 'NO_RULES' ? (
        <div className="bg-[var(--ty-fill-white-color)] rounded-ty-sm border border-[var(--ty-border-color)] p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-[var(--ty-orange-lightest-color)] border border-[var(--ty-orange-color)]/30 text-[var(--ty-orange-color)] mx-auto flex items-center justify-center mb-3">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-ty-sm font-semibold text-[var(--ty-font-main-color)]">当前规则集尚未配置相似度规则</h3>
          <p className="text-ty-xs text-[var(--ty-font-sub-color)] max-w-md mx-auto mt-1 leading-relaxed">
            {lastRunContext.searchResult.errorMessage}
          </p>
          {onNavigate && (
            <button
              onClick={() => onNavigate('field-rules')}
              className="mt-4 h-8 inline-flex items-center gap-2 px-4 text-ty-xs font-semibold text-[var(--ty-font-white-color)] bg-[var(--ty-primary-color)] rounded-ty-sm hover:opacity-90 transition-colors cursor-pointer"
            >
              前往配置规则
            </button>
          )}
        </div>
      ) : lastRunContext.searchResult.errorCode === 'REFERENCE_NOT_FOUND' ? (
        <div className="bg-[var(--ty-fill-white-color)] rounded-ty-sm border border-[var(--ty-border-color)] p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-[var(--ty-red-lightest-color)] border border-[var(--ty-red-color)]/30 text-[var(--ty-red-color)] mx-auto flex items-center justify-center mb-3"><AlertTriangle className="w-6 h-6" /></div>
          <h3 className="text-ty-sm font-semibold text-[var(--ty-font-main-color)]">试算属性不可用</h3>
          <p className="text-ty-xs text-[var(--ty-font-sub-color)] max-w-md mx-auto mt-1 leading-relaxed">{lastRunContext.searchResult.errorMessage || '请检查已填写的试算属性后重新运行。'}</p>
        </div>
      ) : lastRunContext.searchResult.errorCode ? (
        <div className="bg-[var(--ty-fill-white-color)] rounded-ty-sm border border-[var(--ty-border-color)] p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-[var(--ty-orange-lightest-color)] border border-[var(--ty-orange-color)]/30 text-[var(--ty-orange-color)] mx-auto flex items-center justify-center mb-3"><AlertTriangle className="w-6 h-6" /></div>
          <h3 className="text-ty-sm font-semibold text-[var(--ty-font-main-color)]">试算条件不可用</h3>
          <p className="text-ty-xs text-[var(--ty-font-sub-color)] max-w-md mx-auto mt-1 leading-relaxed">{lastRunContext.searchResult.errorMessage || '请检查试算条件后重新运行。'}</p>
        </div>
      ) : (
        <div className="bg-[var(--ty-fill-white-color)] rounded-ty-sm border border-[var(--ty-border-color)] overflow-hidden space-y-0">
          {/* 基准参考信息头卡片 */}
          {lastRunContext.searchResult.reference && (
            <div className="p-4 bg-[var(--ty-fill-weak-dark-color)] border-b border-[var(--ty-border-color)] flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-ty-sm bg-[var(--ty-primary-color)] text-[var(--ty-font-white-color)] flex items-center justify-center font-bold text-ty-sm">
                  REF
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[var(--ty-font-main-color)] text-ty-sm">
                      {lastRunContext.searchResult.reference.objectName}
                    </span>
                    <span className="text-ty-xs font-mono min-h-6 px-2 inline-flex items-center bg-[var(--ty-primary-lighter-color)]/30 text-[var(--ty-primary-color)] border border-[var(--ty-primary-lighter-color)] rounded-ty-xs font-semibold">
                      {lastRunContext.searchResult.reference.objectId}
                    </span>
                    <span className="text-ty-2xs min-h-6 px-2 inline-flex items-center bg-[var(--ty-fill-color)] text-[var(--ty-font-main-color)] rounded-ty-xs font-medium border border-[var(--ty-border-color)]">
                      手工属性基准
                    </span>
                  </div>
                  <div className="text-ty-xs text-[var(--ty-font-sub-color)] flex flex-wrap items-center gap-3 mt-1">
                    <span>
                      规格：
                      <strong className="text-[var(--ty-font-main-color)] font-medium">
                        {lastRunContext.searchResult.reference.specification || '--'}
                      </strong>
                    </span>
                    <span>
                      材质：
                      <strong className="text-[var(--ty-font-main-color)] font-medium">
                        {lastRunContext.searchResult.reference.material || '--'}
                      </strong>
                    </span>
                    <span>
                      分类：
                      <strong className="text-[var(--ty-font-main-color)] font-medium">
                        {lastRunContext.searchResult.reference.classificationPath}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>

              <SimilarityRunSummary result={lastRunContext.searchResult} className="justify-end text-right" />
            </div>
          )}

          {/* 结果分栏 Tabs */}
          <div className="border-b border-[var(--ty-border-color)] px-4 flex items-center gap-4 bg-[var(--ty-fill-white-color)]">
            <button
              onClick={() => { setActiveTab('SCORED'); setPage(1); }}
              className={`py-3 text-ty-xs font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
                activeTab === 'SCORED'
                  ? 'border-[var(--ty-primary-color)] text-[var(--ty-primary-color)]'
                  : 'border-transparent text-[var(--ty-font-sub-color)] hover:text-[var(--ty-font-main-color)]'
              }`}
              id="tab-scored-candidates"
            >
              <span>参与评分的候选</span>
              <span
                className={`min-h-6 px-2 inline-flex items-center rounded-full text-ty-2xs ${
                  activeTab === 'SCORED' ? 'bg-[var(--ty-primary-lighter-color)]/50 text-[var(--ty-primary-color)]' : 'bg-[var(--ty-fill-color)] text-[var(--ty-font-sub-color)]'
                }`}
              >
                {lastRunContext.searchResult.scoredCandidates.length}
              </span>
            </button>

            <button
              onClick={() => { setActiveTab('EXCLUDED'); setPage(1); }}
              className={`py-3 text-ty-xs font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
                activeTab === 'EXCLUDED'
                  ? 'border-[var(--ty-orange-color)] text-[var(--ty-orange-color)]'
                  : 'border-transparent text-[var(--ty-font-sub-color)] hover:text-[var(--ty-font-main-color)]'
              }`}
              id="tab-excluded-candidates"
            >
              <span className="flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-[var(--ty-orange-color)]" />
                已排除候选 (门槛未满足)
              </span>
              <span
                className={`min-h-6 px-2 inline-flex items-center rounded-full text-ty-2xs ${
                  activeTab === 'EXCLUDED' ? 'bg-[var(--ty-orange-lightest-color)] text-[var(--ty-font-main-light-color)] border border-[var(--ty-orange-color)]/30' : 'bg-[var(--ty-fill-color)] text-[var(--ty-font-sub-color)]'
                }`}
              >
                {lastRunContext.searchResult.excludedCandidates.length}
              </span>
            </button>
          </div>

          {/* Tab 1 内容：参与评分的候选件列表 */}
          {activeTab === 'SCORED' && (
            <div>
              {lastRunContext.searchResult.scoredCandidates.length === 0 ? (
                <div className="p-12 text-center text-ty-xs text-[var(--ty-font-sub-color)]">
                  未找到符合当前评分条件的相似件
                </div>
              ) : (
                <>
                <div className="overflow-x-auto">
                  <table className="ty-data-table w-full min-w-[1600px] text-left text-ty-xs border-collapse">
                    <thead>
                      <tr className="bg-[var(--ty-fill-weak-dark-color)] border-b border-[var(--ty-border-color)] text-[var(--ty-font-sub-color)] font-semibold">
                        <th className="py-2 px-4 w-12 text-center">排序</th>
                        <th className="py-2 px-4">对象名称</th>
                        <th className="py-2 px-4">对象标识</th>
                        <th className="py-2 px-4">规格参数</th>
                        <th className="py-2 px-4">材质</th>
                        <th className="py-2 px-4">分类路径</th>
                        <th className="py-2 px-4">相似度得分</th>
                        <th className="py-2 px-4">相似等级</th>
                        <th className="py-2 px-4">覆盖率</th>
                        <th className="py-2 px-4">命中</th>
                        <th className="py-2 px-4">差异</th>
                        <th className="py-2 px-4 text-right sticky right-0 z-10 bg-[var(--ty-fill-weak-dark-color)] border-l border-[var(--ty-border-color)] shadow-ty-sticky">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--ty-border-light-color)]">
                      {scoredPage.rows.map((cand, idx) => (
                        <tr
                          key={cand.objectId}
                          className="hover:bg-[var(--ty-fill-weak-dark-color)] transition-colors"
                          id={`candidate-row-${cand.objectId}`}
                        >
                          <td className="py-3 px-4 text-center font-mono font-bold text-[var(--ty-font-sub-light-color)]">
                            {(scoredPage.currentPage - 1) * pageSize + idx + 1}
                          </td>

                          <td className="py-3 px-4 font-bold text-[var(--ty-font-main-color)]">{cand.objectName}</td>
                          <td className="py-3 px-4 text-[var(--ty-font-sub-color)] font-mono">{cand.objectId}</td>

                          {/* 规格 */}
                          <td className="py-3 px-4 text-[var(--ty-font-main-color)] font-medium">
                            {cand.specification || '--'}
                          </td>

                          {/* 材质 */}
                          <td className="py-3 px-4 text-[var(--ty-font-main-color)] font-medium">
                            {cand.material || '--'}
                          </td>

                          {/* 分类路径 */}
                          <td className="py-3 px-4 text-[var(--ty-font-sub-color)] text-ty-2xs truncate max-w-xs">
                            {cand.classificationPath}
                          </td>

                          {/* 相似度得分 (四舍五入保留两位小数展示，按原始未舍入浮点排序) */}
                          <td className="py-3 px-4">
                            <div className="flex items-baseline gap-2">
                              <span
                                className={`text-ty-md font-bold font-mono ${
                                  cand.similarityTier === '高相似'
                                    ? 'text-[var(--ty-green-color)]'
                                    : cand.similarityTier === '中相似'
                                    ? 'text-[var(--ty-primary-color)]'
                                    : 'text-[var(--ty-font-sub-color)]'
                                }`}
                              >
                                {cand.similarityScore.toFixed(2)}%
                              </span>
                            </div>
                            <HelpTooltip label="查看未舍入相似度" content={`未舍入值：${cand.rawSimilarityScore.toFixed(4)}%；排序按未舍入值计算。`} />
                          </td>

                          {/* 分级 */}
                          <td className="py-3 px-4">
                              <span
                                className={`min-h-6 px-2 inline-flex items-center text-ty-2xs font-bold rounded-ty-xs ${
                                  cand.similarityTier === '高相似'
                                    ? 'bg-[var(--ty-green-lightest-color)] text-[var(--ty-font-main-light-color)] border border-[var(--ty-green-color)]/30'
                                    : cand.similarityTier === '中相似'
                                    ? 'bg-[var(--ty-primary-lightest-color)] text-[var(--ty-font-main-light-color)] border border-[var(--ty-primary-color)]/30'
                                    : 'bg-[var(--ty-fill-color)] text-[var(--ty-font-sub-color)]'
                                }`}
                              >
                                {cand.similarityTier}
                              </span>
                          </td>
                          <td className="py-3 px-4 font-mono">{cand.coverageRate}%</td>

                          <td className="py-3 px-4 text-[var(--ty-green-color)] font-semibold">{cand.fullHitCount}</td>
                          <td className="py-3 px-4 text-[var(--ty-red-color)] font-semibold">{cand.differenceCount}</td>

                          {/* 操作 */}
                          <td className="py-3 px-4 text-right sticky right-0 z-10 bg-[var(--ty-fill-white-color)] border-l border-[var(--ty-border-color)] shadow-ty-sticky">
                            <button
                              onClick={() => setSelectedCandidate(cand)}
                              className="h-7 min-w-16 inline-flex items-center gap-1 px-3 text-ty-xs font-semibold text-[var(--ty-primary-color)] hover:opacity-80 hover:bg-[var(--ty-primary-lighter-color)]/20 rounded-ty-sm transition-colors cursor-pointer"
                              id={`view-detail-${cand.objectId}`}
                            >
                              <Eye className="w-3.5 h-3.5" />
                              算分明细
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <TablePagination total={lastRunContext.searchResult.scoredCandidates.length} page={scoredPage.currentPage} pageSize={pageSize} itemLabel="条" onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
                </>
              )}
            </div>
          )}

          {/* Tab 2 内容：已排除候选 (门槛未满足) 列表 */}
          {activeTab === 'EXCLUDED' && (
            <div>
              {lastRunContext.searchResult.excludedCandidates.length === 0 ? (
                <div className="p-12 text-center text-ty-xs text-[var(--ty-font-sub-color)]">
                  当前试算未发现被门槛规则排除的候选件
                </div>
              ) : (
                <>
                <div className="overflow-x-auto">
                  <table className="ty-data-table w-full min-w-[1200px] text-left text-ty-xs border-collapse">
                    <thead>
                      <tr className="bg-[var(--ty-orange-light-color)]/30 border-b border-[var(--ty-orange-color)]/20 text-[var(--ty-font-main-color)] font-semibold">
                        <th className="py-2 px-4 w-12 text-center">序号</th>
                        <th className="py-2 px-4">对象名称</th>
                        <th className="py-2 px-4">对象标识</th>
                        <th className="py-2 px-4">被排除门槛字段</th>
                        <th className="py-2 px-4">基准值 (源值)</th>
                        <th className="py-2 px-4">候选值 (目标值)</th>
                        <th className="py-2 px-4">门槛匹配要求</th>
                        <th className="py-2 px-4">排除原因说明</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--ty-border-light-color)]">
                      {excludedPage.rows.map((exc, idx) => (
                        <tr
                          key={exc.objectId}
                          className="hover:bg-[var(--ty-orange-light-color)]/20 transition-colors"
                          id={`excluded-row-${exc.objectId}`}
                        >
                          <td className="py-3 px-4 text-center font-mono text-[var(--ty-font-sub-light-color)]">
                            {(excludedPage.currentPage - 1) * pageSize + idx + 1}
                          </td>

                          <td className="py-3 px-4 font-bold text-[var(--ty-font-main-color)]">{exc.objectName}</td>
                          <td className="py-3 px-4 text-[var(--ty-font-sub-color)] font-mono">{exc.objectId}</td>

                          {/* 门槛字段 */}
                          <td className="py-3 px-4">
                            <span className="font-bold text-[var(--ty-font-main-light-color)] bg-[var(--ty-orange-lightest-color)] min-h-6 px-2 inline-flex items-center rounded-ty-xs border border-[var(--ty-orange-color)]/30 inline-flex items-center gap-1">
                              <ShieldAlert className="w-3 h-3 text-[var(--ty-orange-color)]" />
                              {exc.fieldLabel} ({exc.excludedByField})
                            </span>
                          </td>

                          {/* 基准值 */}
                          <td className="py-3 px-4 font-mono font-semibold text-[var(--ty-font-main-color)]">
                            {String(exc.sourceValue ?? '--')}
                          </td>

                          {/* 候选值 */}
                          <td className="py-3 px-4 font-mono font-semibold text-[var(--ty-red-color)]">
                            {String(exc.candidateValue ?? '--')}
                          </td>

                          {/* 门槛匹配要求 */}
                          <td className="py-3 px-4 text-[var(--ty-font-main-color)]">
                            {exc.matchingRequirement}
                          </td>

                          {/* 排除说明 */}
                          <td className="py-3 px-4 text-[var(--ty-font-sub-color)] text-ty-2xs">
                            {exc.excludeReason}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <TablePagination total={lastRunContext.searchResult.excludedCandidates.length} page={excludedPage.currentPage} pageSize={pageSize} itemLabel="条" onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* 算分明细抽屉 (Score Details Drawer) */}
      {selectedCandidate && (
        <div
          className="fixed inset-0 z-50 bg-ty-overlay backdrop-blur-xs flex justify-end"
          id="score-detail-drawer-backdrop"
          role="presentation"
          onMouseDown={event => { if (event.target === event.currentTarget) setSelectedCandidate(null); }}
        >
          <section role="dialog" aria-modal="true" aria-labelledby="score-detail-drawer-title" className="w-[min(800px,100vw)] bg-[var(--ty-fill-white-color)] h-full shadow-ty-lg flex flex-col overflow-hidden animate-in slide-in-from-right duration-200 border-l border-[var(--ty-border-color)]">
            {/* 抽屉头部 */}
            <div className="p-4 border-b border-[var(--ty-border-color)] bg-[var(--ty-fill-weak-dark-color)] flex items-center justify-between">
              <div>
                <h2 id="score-detail-drawer-title" className="text-ty-lg font-semibold text-[var(--ty-font-main-color)] flex items-center gap-2">
                  <span>算分明细与属性比对</span>
                  <span className="text-ty-sm font-mono text-[var(--ty-primary-color)] font-bold">
                    {selectedCandidate.similarityScore.toFixed(2)}%
                  </span>
                </h2>
                <p className="text-ty-xs text-[var(--ty-font-sub-color)] mt-0.5 font-mono">
                  {selectedCandidate.objectId} - {selectedCandidate.objectName}
                </p>
              </div>
              <button
                aria-label="关闭算分明细"
                onClick={() => setSelectedCandidate(null)}
                className="p-2 text-[var(--ty-font-sub-light-color)] hover:text-[var(--ty-font-main-color)] rounded-ty-sm transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 抽屉内容列表 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="flex items-center gap-1 text-ty-xs font-bold text-[var(--ty-font-main-color)]">
                <span>评分与属性对比明细 ({selectedCandidate.compareFields.length} 项)</span>
                <HelpTooltip label="查看明细口径" content="相似度仅依据参与评分的字段计算。仅展示属性即使不同，也不会影响相似度得分。" />
              </div>

              <div className="space-y-3">
                {selectedCandidate.compareFields.map(f => {
                  const isGate = f.isScoreActive && f.mismatchAction === 'EXCLUDE_CANDIDATE';
                  const candidateMissingLabel = f.missingSide === 'CANDIDATE'
                    ? f.candidateMissingHandling === 'SKIP'
                      ? '候选未填写 · 不参与本次计算（跳过）'
                      : '候选未填写 · 计0分'
                    : '';
                  return (
                    <div
                      key={f.fieldKey}
                      className="p-3 rounded-ty-sm border border-[var(--ty-border-color)] bg-[var(--ty-fill-weak-dark-color)]/50 space-y-2 text-ty-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[var(--ty-font-main-color)]">{f.fieldLabel}</span>
                          <span className="text-ty-2xs text-[var(--ty-font-sub-light-color)] font-mono">({f.fieldKey})</span>
                          {isGate && (
                            <span className="max-w-[220px] text-center whitespace-normal leading-4 text-ty-2xs font-bold bg-[var(--ty-orange-lightest-color)] text-[var(--ty-font-main-light-color)] border border-[var(--ty-orange-color)]/30 px-2 py-0.5 rounded-ty-xs">
                              门槛字段
                            </span>
                          )}
                          {candidateMissingLabel && (
                            <span className="text-ty-2xs font-bold bg-[var(--ty-orange-lightest-color)] text-[var(--ty-font-main-light-color)] border border-[var(--ty-orange-color)]/30 px-2 py-0.2 rounded-ty-xs">
                              {candidateMissingLabel}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {f.isScoreActive ? (
                            <>
                              <span className="text-[var(--ty-font-sub-color)]">配置权重 {f.weight}%</span>
                              <span className={`font-mono font-bold ${f.status === 'FULL' ? 'text-[var(--ty-green-color)]' : f.status === 'PARTIAL' ? 'text-[var(--ty-primary-color)]' : 'text-[var(--ty-font-sub-light-color)]'}`}>
                                字段贡献：{f.missingSide === 'REFERENCE' || f.candidateMissingHandling === 'SKIP' ? '—' : `${f.weightedScore.toFixed(2)} 分`}
                              </span>
                            </>
                          ) : (
                            <span className="min-h-6 px-2 inline-flex items-center rounded-ty-xs bg-[var(--ty-fill-color)] border border-[var(--ty-border-color)] text-ty-2xs font-semibold text-[var(--ty-font-sub-color)]">不参与评分</span>
                          )}
                        </div>
                      </div>

                      {/* 源值 vs 候选值 */}
                      <div className="grid grid-cols-2 gap-3 bg-[var(--ty-fill-white-color)] p-3 rounded-ty-sm border border-[var(--ty-border-color)]">
                        <div>
                          <span className="text-ty-2xs text-[var(--ty-font-sub-light-color)] block mb-0.5">基准值 (源)</span>
                          <span className="font-semibold text-[var(--ty-font-main-color)] font-mono">
                            {String(f.sourceValue ?? '--')}
                          </span>
                        </div>
                        <div>
                          <span className="text-ty-2xs text-[var(--ty-font-sub-light-color)] block mb-0.5">候选值 (目标)</span>
                          <span className="font-semibold text-[var(--ty-font-main-color)] font-mono">
                            {f.missingSide === 'CANDIDATE' ? '未填写' : String(f.candidateValue ?? '--')}
                          </span>
                        </div>
                      </div>

                      {/* 结论说明 */}
                      <div className="text-ty-2xs text-[var(--ty-font-sub-color)] leading-relaxed flex items-center justify-between pt-1">
                        {f.isScoreActive ? (
                          <>
                            <span>{f.reason}</span>
                            <span className="font-mono font-semibold">
                              字段原始分：{f.missingSide === 'REFERENCE' || f.candidateMissingHandling === 'SKIP' ? '—' : `${(f.matchRate * 100).toFixed(2)} 分`}
                            </span>
                          </>
                        ) : <span>{f.hasDifference ? '值不同' : '值相同'}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 抽屉底部 */}
            <div className="p-3 border-t border-[var(--ty-border-color)] bg-[var(--ty-fill-weak-dark-color)] flex justify-end">
              <button
                onClick={() => setSelectedCandidate(null)}
                className="h-8 min-w-[68px] px-4 text-ty-xs font-medium text-[var(--ty-font-main-color)] bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm hover:bg-[var(--ty-fill-color)] cursor-pointer"
              >
                关闭
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
