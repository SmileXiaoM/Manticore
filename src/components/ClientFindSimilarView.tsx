import React, { useState, useMemo } from 'react';
import {
  Search,
  RotateCcw,
  Download,
  ChevronRight,
  Info,
  Layers,
  SlidersHorizontal,
  FileText,
  X,
  Eye,
  FileCheck2,
  List,
  LayoutGrid,
  Package,
  ImageOff
} from 'lucide-react';
import {
  rootTypeOptions,
  softTypeOptions,
  resolveSimilarityRuleScope,
  parseSimilarityRuleScopeKey,
  mockFormBaselines,
  mockPartDatabase,
  stage1MappedFields,
  runSimilaritySearch,
  formatFieldWithFallback
} from '../data';
import {
  FieldSimilarityRule,
  ScoredCandidate,
  SearchRunResult,
  SimilarityBaseline,
  SimilarityGroupConfigStatus,
  SimilarityTierConfigMap,
  SimilarityRuntimeConfig
} from '../types';
import { useFeedback } from './ui/FeedbackProvider';
import { HelpTooltip } from './ui/HelpTooltip';
import { TablePagination } from './ui/TablePagination';
import { getSimilarityTierConfig } from '../similarityTier';
import { SimilarityRunSummary } from './SimilarityRunSummary';

interface ClientFindSimilarViewProps {
  rules: FieldSimilarityRule[];
  objectConfigStatus: Record<string, SimilarityGroupConfigStatus>;
  tierConfigs: SimilarityTierConfigMap;
  runtimeConfig: SimilarityRuntimeConfig;
  onNavigate?: (view: string) => void;
}

type ApplicationQueryMode = 'EXISTING_OBJECT' | 'ATTRIBUTES';
type ResultViewMode = 'LIST' | 'GRID';

const getApplicationAttributeSeed = (softTypeId: string) => {
  const form = mockFormBaselines.find(item => item.rootTypeId === 'PART' && item.softTypeId === softTypeId);
  if (form) {
    return { values: { ...form.values }, units: { ...(form.units || {}) } };
  }
  const part = mockPartDatabase.find(item => item.rootTypeId === 'PART' && item.softTypeId === softTypeId);
  return { values: { ...(part?.attributes || {}) }, units: { ...(part?.units || {}) } };
};

export const ClientFindSimilarView: React.FC<ClientFindSimilarViewProps> = ({
  rules,
  objectConfigStatus,
  tierConfigs,
  runtimeConfig,
  onNavigate
}) => {
  const { notify } = useFeedback();
  // 1. 查询条件
  const rootTypeId = 'PART';
  const [queryMode, setQueryMode] = useState<ApplicationQueryMode>('EXISTING_OBJECT');
  const [softTypeId, setSoftTypeId] = useState<string>('IN_HOUSE');
  const [existingPartId, setExistingPartId] = useState<string>('PART-2026-000100');
  const [attributeSoftTypeId, setAttributeSoftTypeId] = useState<string>('IN_HOUSE');
  const [attributeValues, setAttributeValues] = useState<Record<string, any>>(() => getApplicationAttributeSeed('IN_HOUSE').values);
  const [attributeUnits, setAttributeUnits] = useState<Record<string, string>>(() => getApplicationAttributeSeed('IN_HOUSE').units);
  const [selectedFormId, setSelectedFormId] = useState<string>('FORM-001');
  const [isFormExampleOpen, setIsFormExampleOpen] = useState(false);
  const [isFormSearching, setIsFormSearching] = useState(false);
  const [isFormResultOpen, setIsFormResultOpen] = useState(false);
  const [formSearchResult, setFormSearchResult] = useState<SearchRunResult | null>(null);

  // 分页状态
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState(20);

  // 搜索加载与结果
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchRunResult | null>(null);

  // 选中的对比物料 (侧边/抽屉业务对比)
  const [selectedForCompare, setSelectedForCompare] = useState<ScoredCandidate | null>(null);
  const [resultViewMode, setResultViewMode] = useState<ResultViewMode>('LIST');
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);

  const runApplicationSearch = (baseline: SimilarityBaseline, detectedSoftTypeId: string) => {
    setIsSearching(true);
    setSelectedForCompare(null);
    setSelectedCandidateIds([]);
    setSoftTypeId(detectedSoftTypeId);

    setTimeout(() => {
      const res = runSimilaritySearch(rootTypeId, detectedSoftTypeId, baseline, rules, undefined, getSimilarityTierConfig(tierConfigs, detectedSoftTypeId), runtimeConfig);
      setSearchResult(res);
      setIsSearching(false);
      setCurrentPage(1);
    }, 200);
  };

  const handleExistingSearch = () => {
    const lookup = existingPartId.trim().toUpperCase();
    if (!lookup) {
      notify('请输入物料编码或对象 OID。', 'warning');
      return;
    }
    const matchedPart = mockPartDatabase.find(part =>
      part.rootTypeId === rootTypeId &&
      (part.objectId.toUpperCase() === lookup || part.requestCode.toUpperCase() === lookup)
    );
    if (!matchedPart) {
      setSearchResult({
        reference: null,
        baselineType: 'EXISTING_PART',
        scoredCandidates: [],
        excludedCandidates: [],
        errorCode: 'REFERENCE_NOT_FOUND',
        errorMessage: `未找到物料编码或对象 OID 为 [${existingPartId.trim()}] 的零部件。`
      });
      setSelectedForCompare(null);
      setCurrentPage(1);
      notify('未找到对应的已有物料。', 'warning');
      return;
    }
    const resolvedScope = resolveSimilarityRuleScope(matchedPart.softTypeId, matchedPart.classificationPath, rules, objectConfigStatus);
    if (!resolvedScope) {
      setSoftTypeId(matchedPart.softTypeId);
      setSearchResult({ reference: matchedPart, baselineType: 'EXISTING_PART', scoredCandidates: [], excludedCandidates: [], errorCode: 'NO_RULES', errorMessage: '该物料的类型及分类均没有可用的已发布规则。' });
      notify('未解析到可用规则，因此不执行相似度搜索。', 'warning');
      return;
    }
    runApplicationSearch({ type: 'EXISTING_PART', objectId: matchedPart.objectId }, resolvedScope.scopeKey);
  };

  const handleAttributeSearch = () => {
    const resolvedScope = resolveSimilarityRuleScope(attributeSoftTypeId, String(attributeValues.category_path || ''), rules, objectConfigStatus);
    if (!resolvedScope) {
      setSoftTypeId(attributeSoftTypeId);
      setSearchResult({ reference: null, baselineType: 'FORM_VALUES', scoredCandidates: [], excludedCandidates: [], errorCode: 'NO_RULES', errorMessage: '所填类型及分类均没有可用的已发布规则。' });
      notify('未解析到可用规则，因此不能按属性查询。', 'warning');
      return;
    }
    runApplicationSearch({
      type: 'FORM_VALUES',
      requestNo: '属性条件查询',
      temporaryNo: 'ATTRIBUTE-QUERY',
      rootTypeId,
      softTypeId: attributeSoftTypeId,
      values: attributeValues,
      units: attributeUnits
    }, resolvedScope.scopeKey);
  };

  const handleFormSearch = () => {
    const formItem = mockFormBaselines.find(form => form.id === selectedFormId && form.rootTypeId === rootTypeId);
    if (!formItem) {
      notify('当前业务表单数据不可用。', 'warning');
      return;
    }
    const resolvedScope = resolveSimilarityRuleScope(formItem.softTypeId, String(formItem.values.category_path || ''), rules, objectConfigStatus);
    if (!resolvedScope) {
      notify('当前表单的类型及分类均没有可用规则；这不影响保存表单。', 'warning');
      return;
    }
    const baseline: SimilarityBaseline = {
      type: 'FORM_VALUES',
      requestNo: formItem.requestNo,
      temporaryNo: formItem.temporaryNo,
      rootTypeId: formItem.rootTypeId,
      softTypeId: formItem.softTypeId,
      values: formItem.values,
      units: formItem.units
    };
    setIsFormSearching(true);
    setTimeout(() => {
      const result = runSimilaritySearch(rootTypeId, resolvedScope.scopeKey, baseline, rules, undefined, getSimilarityTierConfig(tierConfigs, resolvedScope.scopeKey), runtimeConfig);
      setFormSearchResult(result);
      setIsFormSearching(false);
      setIsFormResultOpen(true);
    }, 200);
  };

  const handleQueryModeChange = (mode: ApplicationQueryMode) => {
    setQueryMode(mode);
    setSearchResult(null);
    setSelectedForCompare(null);
    setSelectedCandidateIds([]);
    setCurrentPage(1);
  };

  const handleAttributeGroupChange = (nextSoftTypeId: string) => {
    const seed = getApplicationAttributeSeed(nextSoftTypeId);
    setAttributeSoftTypeId(nextSoftTypeId);
    setAttributeValues(seed.values);
    setAttributeUnits(seed.units);
    setSearchResult(null);
    setSelectedForCompare(null);
    setSelectedCandidateIds([]);
    setCurrentPage(1);
  };

  const handleCloseFormExample = () => {
    setIsFormResultOpen(false);
    setIsFormExampleOpen(false);
  };

  const handleConfirmForm = () => {
    notify(`申请单 ${currentForm?.requestNo || ''} 已按示意保存；是否存在相似度规则不影响业务表单保存。`, 'success');
    handleCloseFormExample();
  };

  const handleReset = () => {
    setSoftTypeId('IN_HOUSE');
    setExistingPartId('PART-2026-000100');
    setAttributeSoftTypeId('IN_HOUSE');
    const seed = getApplicationAttributeSeed('IN_HOUSE');
    setAttributeValues(seed.values);
    setAttributeUnits(seed.units);
    setSelectedFormId('FORM-001');
    setSearchResult(null);
    setSelectedForCompare(null);
    setSelectedCandidateIds([]);
    setCurrentPage(1);
    notify('已重置已有对象查询条件；已保存规则未修改。', 'success');
  };

  // 动态展示列 (由一阶段已映射关键字段驱动)
  const keyDisplayColumns = useMemo(() => {
    const displayTypeId = parseSimilarityRuleScopeKey(softTypeId).typeId;
    return stage1MappedFields.filter(
      f =>
        f.rootTypeId === rootTypeId &&
        (!f.softTypeId || f.softTypeId === displayTypeId) &&
        f.isKeyDisplayColumn
    );
  }, [rootTypeId, softTypeId]);
  const compactDisplayColumns = useMemo(
    () => keyDisplayColumns.filter(column => ['core_material', 'nominal_diameter', 'length'].includes(column.fieldCode)),
    [keyDisplayColumns]
  );

  // 导出功能
  const handleExport = () => {
    if (!searchResult || searchResult.scoredCandidates.length === 0) return;

    const refCode =
      searchResult.reference?.objectId ||
      searchResult.reference?.requestCode ||
      'SIMILAR_PARTS';
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const fileName = `${refCode}_相似件查询_${dateStr}.xlsx`;

    // 构造 CSV 内容模拟下载
    const headers = [
      '序号',
      '物料编码',
      '物料名称',
      ...keyDisplayColumns.map(c => c.displayName),
      '生命周期状态',
      '相似度得分',
      '相似度等级',
      '属性覆盖率'
    ];

    const rows = searchResult.scoredCandidates.map((c, i) => [
      i + 1,
      c.objectId,
      c.objectName,
      ...keyDisplayColumns.map(col => c.customAttributes?.[col.fieldCode] ?? '--'),
      c.lifecycleState,
      `${c.similarityScore.toFixed(2)}%`,
      c.similarityTier,
      `${c.coverageRate}%`
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map(r => r.map(x => `"${x}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    notify(`已导出当前条件下全量相似件数据（${searchResult.scoredCandidates.length} 条）。`, 'success');
  };

  const currentRootTypeObj = rootTypeOptions.find(rt => rt.id === rootTypeId);
  const currentForm = mockFormBaselines.find(form => form.id === selectedFormId);
  const availableFormBaselines = mockFormBaselines.filter(form => form.rootTypeId === rootTypeId);
  const availableGroupValues = softTypeOptions.filter(option => option.rootTypeId === rootTypeId);
  const detectedExistingPart = mockPartDatabase.find(part => {
    const lookup = existingPartId.trim().toUpperCase();
    return part.rootTypeId === rootTypeId && Boolean(lookup) && (part.objectId.toUpperCase() === lookup || part.requestCode.toUpperCase() === lookup);
  });
  const detectedSoftType = softTypeOptions.find(option => option.id === detectedExistingPart?.softTypeId);
  const formSoftType = softTypeOptions.find(option => option.id === currentForm?.softTypeId);
  const existingResolvedScope = detectedExistingPart ? resolveSimilarityRuleScope(detectedExistingPart.softTypeId, detectedExistingPart.classificationPath, rules, objectConfigStatus) : null;
  const formResolvedScope = currentForm ? resolveSimilarityRuleScope(currentForm.softTypeId, String(currentForm.values.category_path || ''), rules, objectConfigStatus) : null;
  const attributeResolvedScope = resolveSimilarityRuleScope(attributeSoftTypeId, String(attributeValues.category_path || ''), rules, objectConfigStatus);
  const formGroupEnabled = Boolean(formResolvedScope);
  const attributeGroupEnabled = Boolean(attributeResolvedScope);
  const attributeInputRules = Array.from(new Map<string, FieldSimilarityRule>(
    rules
      .filter(rule => rule.rootTypeId === rootTypeId && rule.softTypeId === attributeResolvedScope?.scopeKey && rule.enabled && rule.isAppEndActive)
      .map(rule => [rule.propertyCode, rule])
  ).values());
  const formInputRules = Array.from(new Map<string, FieldSimilarityRule>(
    rules
      .filter(rule => rule.rootTypeId === rootTypeId && rule.softTypeId === formResolvedScope?.scopeKey && rule.enabled && rule.isAppEndActive)
      .map(rule => [rule.propertyCode, rule])
  ).values());

  const paginatedCandidates = useMemo(() => {
    if (!searchResult) return [];
    const start = (currentPage - 1) * pageSize;
    return searchResult.scoredCandidates.slice(start, start + pageSize);
  }, [searchResult, currentPage, pageSize]);
  const toggleCandidateSelection = (objectId: string) => setSelectedCandidateIds(previous => previous.includes(objectId) ? previous.filter(id => id !== objectId) : [...previous, objectId]);

  return (
    <div className="space-y-4" id="client-find-similar-view-container">
      {/* 应用端独立查询：按已有对象或按属性 */}
      <div className="bg-[var(--ty-fill-white-color)] rounded-ty-sm border border-[var(--ty-border-color)] p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 border-b border-[var(--ty-border-color)] pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-[var(--ty-primary-color)]" />
            <h1 className="text-ty-xl font-semibold text-[var(--ty-font-main-color)] tracking-tight">应用端查找相似件</h1>
            <span className="min-h-6 px-2 inline-flex items-center rounded-ty-xs bg-[var(--ty-fill-color)] text-[var(--ty-font-sub-color)] border border-[var(--ty-border-color)] text-ty-2xs">应用端独立查询</span>
            <HelpTooltip label="查看查找相似件说明" content="可按已有对象查询，也可直接填写属性条件查询；两种方式均只应用对应分组已发布且启用的规则。" />
          </div>
          <button
            type="button"
            onClick={() => setIsFormExampleOpen(true)}
            className="h-8 inline-flex items-center gap-2 px-3 text-ty-xs font-medium text-[var(--ty-font-main-color)] bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm hover:bg-[var(--ty-fill-color)] transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-[var(--ty-primary-color)]" />
            查看新建/编辑表单入口
          </button>
        </div>

        <div className="inline-flex items-center p-1 rounded-ty-sm border border-[var(--ty-border-color)] bg-[var(--ty-fill-weak-dark-color)]" role="tablist" aria-label="应用端查询方式">
          <button
            type="button"
            role="tab"
            aria-selected={queryMode === 'EXISTING_OBJECT'}
            onClick={() => handleQueryModeChange('EXISTING_OBJECT')}
            className={`h-7 px-4 rounded-ty-xs text-ty-xs font-medium cursor-pointer ${queryMode === 'EXISTING_OBJECT' ? 'bg-[var(--ty-fill-white-color)] text-[var(--ty-primary-color)] shadow-sm font-semibold' : 'text-[var(--ty-font-sub-color)]'}`}
          >
            按已有对象查询
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={queryMode === 'ATTRIBUTES'}
            onClick={() => handleQueryModeChange('ATTRIBUTES')}
            className={`h-7 px-4 rounded-ty-xs text-ty-xs font-medium cursor-pointer ${queryMode === 'ATTRIBUTES' ? 'bg-[var(--ty-fill-white-color)] text-[var(--ty-primary-color)] shadow-sm font-semibold' : 'text-[var(--ty-font-sub-color)]'}`}
          >
            按属性条件查询
          </button>
        </div>

        {queryMode === 'EXISTING_OBJECT' ? (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(360px,1fr)_minmax(300px,0.8fr)] gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-ty-xs font-semibold text-[var(--ty-font-sub-color)] flex items-center gap-1"><Layers className="w-3.5 h-3.5 text-[var(--ty-font-sub-light-color)]" />对象类型</label>
                <div className="h-8 px-3 flex items-center rounded-ty-sm border border-[var(--ty-border-color)] bg-[var(--ty-fill-weak-dark-color)] text-ty-xs font-medium">{currentRootTypeObj?.name}</div>
              </div>
              <label className="flex flex-col gap-1">
                <span className="text-ty-xs font-semibold text-[var(--ty-font-sub-color)]">物料编码 / 对象 OID</span>
                <input value={existingPartId} onChange={event => setExistingPartId(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') handleExistingSearch(); }} className="h-8 px-3 rounded-ty-sm border border-[var(--ty-border-color)] bg-[var(--ty-fill-white-color)] text-ty-xs font-mono text-[var(--ty-font-main-color)] focus:border-[var(--ty-primary-color)] focus:outline-hidden" placeholder="例如 PART-2026-000100" id="client-existing-part-input" />
              </label>
              <div className="flex flex-col gap-1">
                <span className="text-ty-xs font-semibold text-[var(--ty-font-sub-color)] flex items-center gap-1"><SlidersHorizontal className="w-3.5 h-3.5 text-[var(--ty-font-sub-light-color)]" />识别到的规则范围</span>
                <div className="h-8 px-3 flex items-center gap-2 rounded-ty-sm border border-[var(--ty-border-color)] bg-[var(--ty-fill-weak-dark-color)] text-ty-xs">
                  {detectedExistingPart ? <><strong>{existingResolvedScope?.label || detectedSoftType?.name || detectedExistingPart.softTypeId}</strong><span className={`ml-auto min-h-6 px-2 inline-flex items-center rounded-ty-xs border ${existingResolvedScope ? 'bg-[var(--ty-green-lightest-color)] text-[var(--ty-green-color)] border-[var(--ty-green-color)]/30' : 'bg-[var(--ty-fill-color)] text-[var(--ty-font-sub-color)] border-[var(--ty-border-color)]'}`}>{existingResolvedScope ? existingResolvedScope.kind === 'CLASSIFICATION_SPECIFIC' ? '分类专用' : '类型通用' : '无可用规则'}</span></> : <span className="text-[var(--ty-font-sub-light-color)]">—</span>}
                </div>
              </div>
            </div>
            <div className="px-3 py-2 bg-[var(--ty-fill-weak-dark-color)] border border-[var(--ty-border-color)] rounded-ty-sm flex flex-wrap items-center justify-between gap-2">
              <HelpTooltip label="查看已有对象查询说明" content="系统读取已有对象的已索引属性作为查询基准，不修改对象数据。" />
              <div className="flex items-center gap-2">
                <button onClick={handleReset} className="h-8 inline-flex items-center gap-2 px-3 text-ty-xs font-medium text-[var(--ty-font-sub-color)] bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm hover:bg-[var(--ty-fill-color)] cursor-pointer"><RotateCcw className="w-3.5 h-3.5" />重置</button>
                <button onClick={handleExistingSearch} disabled={isSearching || !existingPartId.trim()} className="h-8 inline-flex items-center gap-2 px-4 text-ty-xs font-semibold text-[var(--ty-font-white-color)] bg-[var(--ty-primary-color)] rounded-ty-sm hover:opacity-90 disabled:opacity-50 cursor-pointer" id="client-search-btn"><Search className="w-3.5 h-3.5" />{isSearching ? '正在查找...' : '查找相似件'}</button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-ty-xs font-semibold text-[var(--ty-font-sub-color)] flex items-center gap-1"><Layers className="w-3.5 h-3.5 text-[var(--ty-font-sub-light-color)]" />对象类型</label>
                <div className="h-8 px-3 flex items-center rounded-ty-sm border border-[var(--ty-border-color)] bg-[var(--ty-fill-weak-dark-color)] text-ty-xs font-medium">{currentRootTypeObj?.name}</div>
              </div>
              <label className="flex flex-col gap-1">
                <span className="text-ty-xs font-semibold text-[var(--ty-font-sub-color)] flex items-center gap-1"><SlidersHorizontal className="w-3.5 h-3.5 text-[var(--ty-font-sub-light-color)]" />类型属性值</span>
                <select value={attributeSoftTypeId} onChange={event => handleAttributeGroupChange(event.target.value)} className="h-8 px-3 rounded-ty-sm border border-[var(--ty-border-color)] bg-[var(--ty-fill-white-color)] text-ty-xs text-[var(--ty-font-main-color)] focus:border-[var(--ty-primary-color)] focus:outline-hidden">
                  {availableGroupValues.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
                </select>
              </label>
            </div>
            <div className="rounded-ty-sm border border-[var(--ty-border-color)] overflow-hidden">
              <div className="px-3 py-2 bg-[var(--ty-fill-weak-dark-color)] border-b border-[var(--ty-border-color)] flex items-center justify-between gap-2">
                <span className="text-ty-xs font-semibold text-[var(--ty-font-main-color)]">查询属性</span>
                <span className={`min-h-6 px-2 inline-flex items-center rounded-ty-xs border text-ty-2xs ${attributeGroupEnabled ? 'bg-[var(--ty-green-lightest-color)] text-[var(--ty-green-color)] border-[var(--ty-green-color)]/30' : 'bg-[var(--ty-fill-color)] text-[var(--ty-font-sub-color)] border-[var(--ty-border-color)]'}`}>{attributeResolvedScope ? `将使用：${attributeResolvedScope.kind === 'CLASSIFICATION_SPECIFIC' ? '分类专用规则' : '类型通用规则'}` : '无可用规则'}</span>
              </div>
              {attributeInputRules.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-4 gap-y-3 p-3">
                  {attributeInputRules.map(rule => {
                    const isNumeric = rule.matchConfig?.kind === 'NUMERIC_TOLERANCE' || rule.matchConfig?.kind === 'NUMERIC_DECAY';
                    const unit = rule.displayUnit && rule.displayUnit !== '无' ? rule.displayUnit : '';
                    return <label key={rule.propertyCode} className="min-w-0"><span className="mb-1 flex items-center justify-between gap-2 text-ty-2xs text-[var(--ty-font-sub-color)]"><span>{rule.fieldName}</span><span className={rule.isScoreActive ? 'text-[var(--ty-primary-color)]' : 'text-[var(--ty-font-sub-light-color)]'}>{rule.isScoreActive ? '参与评分' : '仅展示对比'}</span></span><div className="relative"><input type={isNumeric ? 'number' : 'text'} step={isNumeric ? 'any' : undefined} value={attributeValues[rule.propertyCode] ?? ''} onChange={event => setAttributeValues(values => ({ ...values, [rule.propertyCode]: event.target.value }))} className={`w-full h-8 rounded-ty-sm border border-[var(--ty-border-color)] bg-[var(--ty-fill-white-color)] px-3 text-ty-xs text-[var(--ty-font-main-color)] focus:border-[var(--ty-primary-color)] focus:outline-hidden ${unit ? 'pr-12' : ''}`} placeholder={`输入${rule.fieldName}`} />{unit && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ty-2xs text-[var(--ty-font-sub-light-color)]">{unit}</span>}</div></label>;
                  })}
                </div>
              ) : <div className="p-6 text-center text-ty-xs text-[var(--ty-font-sub-color)]">当前类型及分类尚无可用的已发布字段规则。</div>}
            </div>
            <div className="px-3 py-2 bg-[var(--ty-fill-weak-dark-color)] border border-[var(--ty-border-color)] rounded-ty-sm flex flex-wrap items-center justify-between gap-2">
              <HelpTooltip label="查看按属性查询说明" content="直接使用填写的属性作为查询基准，不创建或修改业务对象。" />
              <div className="flex items-center gap-2">
                <button onClick={handleReset} className="h-8 inline-flex items-center gap-2 px-3 text-ty-xs font-medium text-[var(--ty-font-sub-color)] bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm hover:bg-[var(--ty-fill-color)] cursor-pointer"><RotateCcw className="w-3.5 h-3.5" />重置</button>
                <button onClick={handleAttributeSearch} disabled={isSearching || !attributeGroupEnabled || attributeInputRules.length === 0} title={attributeGroupEnabled ? '按填写的属性条件查找相似件' : '当前类型及分类没有可用规则'} className="h-8 inline-flex items-center gap-2 px-4 text-ty-xs font-semibold text-[var(--ty-font-white-color)] bg-[var(--ty-primary-color)] rounded-ty-sm hover:opacity-90 disabled:opacity-50 cursor-pointer" id="client-attribute-search-btn"><Search className="w-3.5 h-3.5" />{isSearching ? '正在查找...' : '查找相似件'}</button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 结果区域 */}
      {isSearching ? (
        <div className="bg-[var(--ty-fill-white-color)] rounded-ty-sm border border-[var(--ty-border-color)] p-12 text-center">
          <div className="inline-block animate-spin text-[var(--ty-primary-color)] mb-3">
            <RotateCcw className="w-6 h-6" />
          </div>
          <h3 className="text-ty-sm font-bold text-[var(--ty-font-main-color)]">正在查询相似物料，请稍候...</h3>
        </div>
      ) : !searchResult ? (
        <div className="bg-[var(--ty-fill-white-color)] rounded-ty-sm border border-[var(--ty-border-color)] p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-[var(--ty-primary-lighter-color)]/30 text-[var(--ty-primary-color)] mx-auto flex items-center justify-center mb-3">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-ty-sm font-bold text-[var(--ty-font-main-color)]">{queryMode === 'EXISTING_OBJECT' ? '输入已有对象并点击“查找相似件”' : '填写属性条件并点击“查找相似件”'}</h3>
        </div>
      ) : searchResult.errorCode === 'NO_RULES' ? (
        <div className="bg-[var(--ty-fill-white-color)] rounded-ty-sm border border-[var(--ty-border-color)] p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-[var(--ty-orange-lightest-color)] border border-[var(--ty-orange-color)]/30 text-[var(--ty-orange-color)] mx-auto flex items-center justify-center mb-3">
            <Info className="w-6 h-6" />
          </div>
          <h3 className="text-ty-sm font-bold text-[var(--ty-font-main-color)]">当前类型及分类没有可用规则</h3>
          <p className="text-ty-xs text-[var(--ty-font-sub-color)] max-w-md mx-auto mt-1 leading-relaxed">
            {searchResult.errorMessage}
          </p>
        </div>
      ) : searchResult.errorCode === 'REFERENCE_NOT_FOUND' ? (
        <div className="bg-[var(--ty-fill-white-color)] rounded-ty-sm border border-[var(--ty-border-color)] p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-[var(--ty-red-lightest-color)] border border-[var(--ty-red-color)]/30 text-[var(--ty-red-color)] mx-auto flex items-center justify-center mb-3"><Info className="w-6 h-6" /></div>
          <h3 className="text-ty-sm font-bold text-[var(--ty-font-main-color)]">未找到基准物料</h3>
          <p className="text-ty-xs text-[var(--ty-font-sub-color)] max-w-md mx-auto mt-1 leading-relaxed">{searchResult.errorMessage || '请检查物料编码或对象 OID 后重新查询。'}</p>
        </div>
      ) : searchResult.scoredCandidates.length === 0 ? (
        <div className="bg-[var(--ty-fill-white-color)] rounded-ty-sm border border-[var(--ty-border-color)] p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-[var(--ty-fill-color)] text-[var(--ty-font-sub-color)] mx-auto flex items-center justify-center mb-3">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-ty-sm font-bold text-[var(--ty-font-main-color)]">未找到符合当前条件的相似件</h3>
        </div>
      ) : (
        <div className="bg-[var(--ty-fill-white-color)] rounded-ty-sm border border-[var(--ty-border-color)] overflow-hidden space-y-0">
          {/* 基准物料信息与导出操作条 */}
          <div className="p-4 bg-[var(--ty-fill-weak-dark-color)] border-b border-[var(--ty-border-color)] flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-ty-sm bg-[var(--ty-primary-color)] text-[var(--ty-font-white-color)] flex items-center justify-center font-bold text-ty-sm">
                基准
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[var(--ty-font-main-color)] text-ty-sm">
                    {searchResult.baselineType === 'FORM_VALUES' && queryMode === 'ATTRIBUTES'
                      ? '属性条件查询基准'
                      : searchResult.reference?.objectName}
                  </span>
                  <span className="text-ty-xs font-mono min-h-6 px-2 inline-flex items-center bg-[var(--ty-primary-lightest-color)] text-[var(--ty-font-main-light-color)] border border-[var(--ty-primary-color)]/30 rounded-ty-xs font-semibold">
                    {searchResult.baselineType === 'FORM_VALUES' && queryMode === 'ATTRIBUTES'
                      ? '本次输入'
                      : searchResult.reference?.objectId}
                  </span>
                  <span className="text-ty-2xs min-h-6 px-2 inline-flex items-center bg-[var(--ty-fill-color)] text-[var(--ty-font-main-color)] rounded-ty-xs font-medium border border-[var(--ty-border-color)]">
                    {searchResult.baselineType === 'FORM_VALUES' ? '属性条件' : '已有物料'}
                  </span>
                </div>
                <div className="text-ty-xs text-[var(--ty-font-sub-color)] flex flex-wrap items-center gap-3 mt-1">
                  <span>
                    规格：
                    <strong className="text-[var(--ty-font-main-color)] font-medium">
                      {searchResult.reference?.specification || '--'}
                    </strong>
                  </span>
                  <span>
                    材质：
                    <strong className="text-[var(--ty-font-main-color)] font-medium">
                      {searchResult.reference?.material || '--'}
                    </strong>
                  </span>
                  <span>
                    分类：
                    <strong className="text-[var(--ty-font-main-color)] font-medium">
                      {searchResult.reference?.classificationPath}
                    </strong>
                  </span>
                </div>
              </div>
            </div>

            {/* 导出按钮 */}
            <div className="flex flex-wrap items-center justify-end gap-3">
              <div className="text-right">
                <div className="text-ty-xs text-[var(--ty-font-sub-color)]">共找到 {searchResult.scoredCount ?? searchResult.scoredCandidates.length} 条有效候选，当前展示相似度最高的 {searchResult.returnedCount ?? searchResult.scoredCandidates.length} 条。</div>
                <SimilarityRunSummary result={searchResult} className="mt-1 justify-end" />
              </div>
              {selectedCandidateIds.length > 0 && <span className="text-ty-2xs text-[var(--ty-font-sub-color)]">已选择 {selectedCandidateIds.length} 件</span>}
              <div className="inline-flex h-8 items-center rounded-ty-sm border border-[var(--ty-border-color)] bg-[var(--ty-fill-white-color)] p-0.5" role="group" aria-label="结果展示方式">
                <button type="button" onClick={() => setResultViewMode('LIST')} aria-label="列表视图" title="列表视图" className={`h-6 w-7 inline-flex items-center justify-center rounded-ty-xs cursor-pointer ${resultViewMode === 'LIST' ? 'bg-[var(--ty-primary-lightest-color)] text-[var(--ty-primary-color)]' : 'text-[var(--ty-font-sub-color)] hover:bg-[var(--ty-fill-color)]'}`}><List className="w-3.5 h-3.5" /></button>
                <button type="button" onClick={() => setResultViewMode('GRID')} aria-label="缩略卡片视图" title="缩略卡片视图" className={`h-6 w-7 inline-flex items-center justify-center rounded-ty-xs cursor-pointer ${resultViewMode === 'GRID' ? 'bg-[var(--ty-primary-lightest-color)] text-[var(--ty-primary-color)]' : 'text-[var(--ty-font-sub-color)] hover:bg-[var(--ty-fill-color)]'}`}><LayoutGrid className="w-3.5 h-3.5" /></button>
              </div>
              <button
                onClick={handleExport}
                className="h-8 inline-flex items-center gap-2 px-3 text-ty-xs font-semibold text-[var(--ty-font-sub-color)] bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm hover:bg-[var(--ty-fill-color)] transition-colors cursor-pointer"
                title="导出当前条件下全量相似件数据 (XLSX/CSV)"
                id="client-export-btn"
              >
                <Download className="w-3.5 h-3.5 text-[var(--ty-font-sub-color)]" />
                导出查询结果
              </button>
            </div>
          </div>

          {resultViewMode === 'LIST' ? (
          /* 嵌入式业务结果列表 (按一阶段动态展示列呈现) */
          <div className="overflow-x-auto">
            <table className="ty-data-table w-full min-w-[1120px] text-left text-ty-xs border-collapse">
              <thead>
                <tr className="bg-[var(--ty-fill-weak-dark-color)] border-b border-[var(--ty-border-color)] text-[var(--ty-font-sub-color)] font-semibold">
                  <th className="py-2 px-4 w-12 text-center">选择</th>
                  <th className="py-2 px-4 w-12 text-center">序号</th>
                  <th className="py-2 px-4 w-56">物料名称</th>
                  <th className="py-2 px-4 w-36">物料编码</th>
                  <th className="py-2 px-4 w-24">相似度</th>
                  <th className="py-2 px-4 w-24">相似等级</th>
                  <th className="py-2 px-4 w-20">覆盖率</th>
                  {compactDisplayColumns.map(col => (
                    <th key={col.fieldCode} className="py-2 px-4">
                      {col.displayName}
                    </th>
                  ))}
                  <th className="py-2 px-4 w-24">状态</th>
                  <th className="py-2 px-4 text-right sticky right-0 z-10 bg-[var(--ty-fill-weak-dark-color)] border-l border-[var(--ty-border-color)] shadow-ty-sticky">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--ty-border-light-color)]">
                {paginatedCandidates.map((cand, idx) => (
                  <tr
                    key={cand.objectId}
                    className="hover:bg-[var(--ty-fill-weak-dark-color)] transition-colors"
                    id={`client-cand-row-${cand.objectId}`}
                  >
                    <td className="py-3 px-4 text-center"><input type="checkbox" aria-label={`选择 ${cand.objectId}`} checked={selectedCandidateIds.includes(cand.objectId)} onChange={() => toggleCandidateSelection(cand.objectId)} /></td>
                    <td className="py-3 px-4 text-center font-mono text-[var(--ty-font-sub-light-color)] font-medium">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </td>

                    <td className="py-3 px-4 font-bold text-[var(--ty-font-main-color)]"><div className="max-w-56 truncate" title={cand.objectName}>{cand.objectName}</div></td>
                    <td className="py-3 px-4 text-[var(--ty-font-sub-color)] font-mono whitespace-nowrap">{cand.objectId}</td>

                    {/* 相似度得分 (四舍五入保留2位小数，原始浮点排序) */}
                    <td className="py-3 px-4">
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
                    </td>

                    {/* 等级 */}
                    <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.2 text-ty-2xs font-bold rounded-ty-xs ${
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

                    {/* 紧凑业务属性列，完整属性进入对比详情 */}
                    {compactDisplayColumns.map(col => {
                      const val = cand.customAttributes?.[col.fieldCode] ?? (cand as any)[col.fieldCode] ?? '--';
                      return (
                        <td key={col.fieldCode} className="py-3 px-4 text-[var(--ty-font-main-color)] font-medium whitespace-nowrap">
                          {String(val)}
                        </td>
                      );
                    })}

                    <td className="py-3 px-4">
                      <span className="inline-flex items-center min-h-6 px-2 text-ty-2xs font-medium bg-[var(--ty-green-lightest-color)] text-[var(--ty-font-main-light-color)] border border-[var(--ty-green-color)]/30 rounded-ty-xs whitespace-nowrap">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--ty-green-color)] mr-1"></span>
                        {cand.lifecycleState}
                      </span>
                    </td>

                    {/* 操作 */}
                    <td className="py-3 px-4 text-right sticky right-0 z-10 bg-[var(--ty-fill-white-color)] border-l border-[var(--ty-border-color)] shadow-ty-sticky">
                      <button
                        onClick={() => setSelectedForCompare(cand)}
                        className="h-7 min-w-20 inline-flex items-center justify-center gap-1 px-3 text-ty-xs font-semibold whitespace-nowrap text-[var(--ty-font-main-light-color)] hover:text-[var(--ty-primary-color)] bg-[var(--ty-fill-weak-dark-color)] hover:bg-[var(--ty-primary-lightest-color)] border border-[var(--ty-border-color)] rounded-ty-sm transition-colors cursor-pointer"
                        id={`client-view-compare-${cand.objectId}`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        对比分析
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 p-4">
              {paginatedCandidates.map((cand, index) => {
                const hasPreview = index % 3 !== 2;
                return <article key={cand.objectId} className="relative border border-[var(--ty-border-color)] rounded-ty-sm bg-[var(--ty-fill-white-color)] overflow-hidden hover:border-[var(--ty-primary-color)]/50 transition-colors">
                  <label className="absolute top-2 left-2 z-10 h-6 px-1.5 rounded-ty-xs bg-[var(--ty-fill-white-color)]/95 border border-[var(--ty-border-color)] inline-flex items-center gap-1 text-ty-2xs cursor-pointer"><input type="checkbox" aria-label={`选择 ${cand.objectId}`} checked={selectedCandidateIds.includes(cand.objectId)} onChange={() => toggleCandidateSelection(cand.objectId)} />选择</label>
                  <div className="h-28 bg-[var(--ty-fill-weak-dark-color)] border-b border-[var(--ty-border-color)] flex items-center justify-center">
                    {hasPreview ? <Package className="w-9 h-9 text-[var(--ty-primary-color)]" aria-label="零部件缩略图示意" /> : <div className="flex flex-col items-center gap-1 text-[var(--ty-font-sub-light-color)]"><ImageOff className="w-7 h-7" /><span className="text-ty-2xs">暂无缩略图</span></div>}
                  </div>
                  <div className="p-3 space-y-2">
                    <div className="min-w-0"><div className="truncate font-semibold text-ty-xs text-[var(--ty-font-main-color)]" title={cand.objectName}>{cand.objectName}</div><div className="mt-0.5 text-ty-2xs font-mono text-[var(--ty-font-sub-color)]">{cand.objectId}</div></div>
                    <div className="grid grid-cols-2 gap-2 text-ty-2xs"><span className="text-[var(--ty-font-sub-color)]">材质 <strong className="text-[var(--ty-font-main-color)]">{cand.material || '--'}</strong></span><span className="text-[var(--ty-font-sub-color)]">覆盖率 <strong className="text-[var(--ty-font-main-color)]">{cand.coverageRate}%</strong></span></div>
                    <div className="flex items-center justify-between"><span className="font-mono font-bold text-[var(--ty-primary-color)]">{cand.similarityScore.toFixed(2)}%</span><span className="min-h-6 px-2 inline-flex items-center rounded-ty-xs bg-[var(--ty-fill-color)] text-[var(--ty-font-sub-color)] text-ty-2xs">{cand.similarityTier}</span></div>
                    <button onClick={() => setSelectedForCompare(cand)} className="w-full h-8 inline-flex items-center justify-center gap-1 rounded-ty-sm border border-[var(--ty-border-color)] bg-[var(--ty-fill-white-color)] text-ty-xs font-semibold text-[var(--ty-primary-color)] hover:bg-[var(--ty-primary-lightest-color)] cursor-pointer"><Eye className="w-3.5 h-3.5" />查看详情与对比</button>
                  </div>
                </article>;
              })}
            </div>
          )}

          <TablePagination
            total={searchResult.scoredCandidates.length}
            page={currentPage}
            pageSize={pageSize}
            itemLabel="条"
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
          />
        </div>
      )}

      {/* 第三个入口：新建/编辑业务表单底部的查找相似件 */}
      {isFormExampleOpen && (
        <div
          className="fixed inset-0 z-50 bg-ty-overlay backdrop-blur-xs flex items-center justify-center p-4"
          role="presentation"
          onMouseDown={event => { if (event.target === event.currentTarget) handleCloseFormExample(); }}
        >
          <section role="dialog" aria-modal="true" aria-labelledby="form-similar-entry-title" className="w-[min(980px,96vw)] max-h-[88vh] bg-[var(--ty-fill-white-color)] rounded-ty-sm shadow-ty-lg border border-[var(--ty-border-color)] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-[var(--ty-border-color)] bg-[var(--ty-fill-weak-dark-color)] flex items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-[var(--ty-primary-color)]" />
                <h2 id="form-similar-entry-title" className="text-ty-lg font-semibold text-[var(--ty-font-main-color)]">新建零部件</h2>
                <span className="min-h-6 px-2 inline-flex items-center rounded-ty-xs bg-[var(--ty-fill-color)] text-[var(--ty-font-sub-color)] border border-[var(--ty-border-color)] text-ty-2xs">业务表单内嵌示意</span>
              </div>
              <button aria-label="关闭新建零部件示意" onClick={handleCloseFormExample} className="p-2 text-[var(--ty-font-sub-light-color)] hover:text-[var(--ty-font-main-color)] rounded-ty-sm cursor-pointer"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <label className="block max-w-xl">
                <span className="block mb-1 text-ty-xs font-semibold text-[var(--ty-font-sub-color)]">示例业务申请单</span>
                <select
                  value={selectedFormId}
                  onChange={event => { setSelectedFormId(event.target.value); setFormSearchResult(null); setIsFormResultOpen(false); }}
                  className="w-full h-8 px-3 rounded-ty-sm border border-[var(--ty-border-color)] bg-[var(--ty-fill-white-color)] text-ty-xs text-[var(--ty-font-main-color)] focus:border-[var(--ty-primary-color)] focus:outline-hidden"
                >
                  {availableFormBaselines.map(form => <option key={form.id} value={form.id}>{form.title}</option>)}
                </select>
              </label>

              <div className="px-3 py-2 bg-[var(--ty-fill-weak-dark-color)] border border-[var(--ty-border-color)] rounded-ty-sm flex flex-wrap items-center gap-x-6 gap-y-1 text-ty-xs">
                <span className="inline-flex items-center gap-1.5"><Layers className="w-3.5 h-3.5 text-[var(--ty-font-sub-light-color)]" /><span className="text-[var(--ty-font-sub-color)]">当前对象：</span><strong>{currentRootTypeObj?.name}</strong></span>
                <span className="inline-flex items-center gap-1.5"><SlidersHorizontal className="w-3.5 h-3.5 text-[var(--ty-font-sub-light-color)]" /><span className="text-[var(--ty-font-sub-color)]">类型属性值：</span><strong>{formSoftType?.name || currentForm?.softTypeId || '--'}</strong></span>
                <span className="text-[var(--ty-font-sub-color)]">由当前表单的类型与分类自动解析</span>
                <span className={`min-h-6 px-2 inline-flex items-center rounded-ty-xs border ${formGroupEnabled ? 'bg-[var(--ty-green-lightest-color)] text-[var(--ty-green-color)] border-[var(--ty-green-color)]/30' : 'bg-[var(--ty-fill-color)] text-[var(--ty-font-sub-color)] border-[var(--ty-border-color)]'}`}>{formResolvedScope ? `将使用：${formResolvedScope.kind === 'CLASSIFICATION_SPECIFIC' ? '分类专用规则' : '类型通用规则'}` : '无可用规则 · 仍可保存'}</span>
              </div>

              <div className="rounded-ty-sm border border-[var(--ty-border-color)] overflow-hidden">
                <div className="px-3 py-2 bg-[var(--ty-fill-weak-dark-color)] border-b border-[var(--ty-border-color)] flex items-center justify-between gap-2 text-ty-xs">
                  <span className="font-semibold inline-flex items-center gap-2"><FileText className="w-3.5 h-3.5 text-[var(--ty-primary-color)]" />当前表单字段</span>
                  <span className="text-[var(--ty-font-sub-color)]">申请单：<strong className="font-mono text-[var(--ty-font-main-color)]">{currentForm?.requestNo || '--'}</strong></span>
                </div>
                {formInputRules.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-3 p-4">
                    {formInputRules.map(rule => (
                      <label key={rule.propertyCode} className="min-w-0">
                        <span className="block text-ty-2xs text-[var(--ty-font-sub-color)] mb-1">{rule.fieldName}</span>
                        <input
                          readOnly
                          value={formatFieldWithFallback(currentForm?.values[rule.propertyCode], currentForm?.units?.[rule.propertyCode], rule.propertyCode, rootTypeId, currentForm?.softTypeId || '', rules)}
                          className="w-full h-8 px-3 rounded-ty-sm border border-[var(--ty-border-color)] bg-[var(--ty-fill-white-color)] text-ty-xs font-medium text-[var(--ty-font-main-color)]"
                        />
                      </label>
                    ))}
                  </div>
                ) : <div className="p-6 text-center text-ty-xs text-[var(--ty-font-sub-color)]">当前表单没有可用字段规则；可以继续保存，但不显示查找相似件入口。</div>}
              </div>
            </div>

            <div className="p-3 border-t border-[var(--ty-border-color)] bg-[var(--ty-fill-weak-dark-color)] flex flex-wrap items-center justify-between gap-3">
              <span className="text-ty-2xs text-[var(--ty-font-sub-color)]">查找相似件只读取当前已填写字段；确认按钮按正常业务表单保存。</span>
              <div className="flex items-center gap-2">
                <button onClick={handleCloseFormExample} className="h-8 px-4 text-ty-xs font-medium text-[var(--ty-font-main-color)] bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm hover:bg-[var(--ty-fill-color)] cursor-pointer">取消</button>
                <button onClick={handleConfirmForm} className="h-8 px-4 text-ty-xs font-semibold text-[var(--ty-font-main-color)] bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm hover:bg-[var(--ty-fill-color)] cursor-pointer">确认</button>
                {formResolvedScope && formInputRules.length > 0 && <button
                  onClick={handleFormSearch}
                  disabled={isFormSearching || !formGroupEnabled || formInputRules.length === 0}
                  title="使用当前表单字段查找相似件"
                  className="h-8 inline-flex items-center gap-2 px-4 text-ty-xs font-semibold text-[var(--ty-font-white-color)] bg-[var(--ty-primary-color)] rounded-ty-sm hover:opacity-90 disabled:opacity-50 cursor-pointer"
                  id="form-embedded-search-btn"
                >
                  <Search className="w-3.5 h-3.5" />
                  {isFormSearching ? '正在查找...' : '查找相似件'}
                </button>}
              </div>
            </div>
          </section>
        </div>
      )}

      {isFormExampleOpen && isFormResultOpen && formSearchResult && (
        <div
          className="fixed inset-0 z-[60] bg-ty-overlay backdrop-blur-xs flex items-center justify-center p-4"
          role="presentation"
          onMouseDown={event => { if (event.target === event.currentTarget) setIsFormResultOpen(false); }}
        >
          <section role="dialog" aria-modal="true" aria-labelledby="form-similar-result-title" className="w-[min(1120px,96vw)] max-h-[86vh] bg-[var(--ty-fill-white-color)] rounded-ty-sm shadow-ty-lg border border-[var(--ty-border-color)] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-[var(--ty-border-color)] bg-[var(--ty-fill-weak-dark-color)] flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Search className="w-5 h-5 text-[var(--ty-primary-color)]" />
                  <h2 id="form-similar-result-title" className="text-ty-lg font-semibold text-[var(--ty-font-main-color)]">相似件查询结果</h2>
                  <span className="min-h-6 px-2 inline-flex items-center rounded-ty-xs bg-[var(--ty-fill-color)] text-[var(--ty-font-sub-color)] border border-[var(--ty-border-color)] text-ty-2xs">来自当前新建/编辑表单</span>
                </div>
                <p className="mt-1 text-ty-xs text-[var(--ty-font-sub-color)]">申请单 {currentForm?.requestNo || '--'} · {formSoftType?.name || currentForm?.softTypeId || '--'} · 使用已发布且启用规则</p>
              </div>
              <button aria-label="关闭相似件查询结果" onClick={() => setIsFormResultOpen(false)} className="p-2 text-[var(--ty-font-sub-light-color)] hover:text-[var(--ty-font-main-color)] rounded-ty-sm cursor-pointer"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex-1 overflow-auto p-4">
              {formSearchResult.errorCode ? (
                <div className="p-10 text-center">
                  <Info className="w-8 h-8 mx-auto text-[var(--ty-orange-color)] mb-3" />
                  <h3 className="text-ty-sm font-semibold text-[var(--ty-font-main-color)]">暂不能查询</h3>
                  <p className="mt-1 text-ty-xs text-[var(--ty-font-sub-color)]">{formSearchResult.errorMessage}</p>
                </div>
              ) : formSearchResult.scoredCandidates.length === 0 ? (
                <div className="p-10 text-center text-ty-xs text-[var(--ty-font-sub-color)]">未找到符合当前表单属性的相似件。</div>
              ) : (
                <div className="rounded-ty-sm border border-[var(--ty-border-color)] overflow-x-auto">
                  <table className="ty-data-table w-full min-w-[820px] text-left text-ty-xs border-collapse">
                    <thead>
                      <tr className="bg-[var(--ty-fill-weak-dark-color)] border-b border-[var(--ty-border-color)] text-[var(--ty-font-sub-color)] font-semibold">
                        <th className="py-2 px-3 w-12 text-center">序号</th>
                        <th className="py-2 px-3">物料名称</th>
                        <th className="py-2 px-3 w-40">物料编码</th>
                        <th className="py-2 px-3 w-24">相似度</th>
                        <th className="py-2 px-3 w-24">相似等级</th>
                        <th className="py-2 px-3 w-24">覆盖率</th>
                        <th className="py-2 px-3 w-24 text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--ty-border-light-color)]">
                      {formSearchResult.scoredCandidates.map((candidate, index) => (
                        <tr key={candidate.objectId} className="hover:bg-[var(--ty-fill-weak-dark-color)]">
                          <td className="py-3 px-3 text-center font-mono text-[var(--ty-font-sub-light-color)]">{index + 1}</td>
                          <td className="py-3 px-3 font-semibold text-[var(--ty-font-main-color)]">{candidate.objectName}</td>
                          <td className="py-3 px-3 font-mono text-[var(--ty-font-sub-color)]">{candidate.objectId}</td>
                          <td className="py-3 px-3 font-mono font-bold text-[var(--ty-primary-color)]">{candidate.similarityScore.toFixed(2)}%</td>
                          <td className="py-3 px-3"><span className="min-h-6 px-2 inline-flex items-center rounded-ty-xs bg-[var(--ty-fill-color)] text-[var(--ty-font-main-color)]">{candidate.similarityTier}</span></td>
                          <td className="py-3 px-3 font-mono">{candidate.coverageRate}%</td>
                          <td className="py-3 px-3 text-right"><button onClick={() => setSelectedForCompare(candidate)} className="h-7 px-3 inline-flex items-center gap-1 rounded-ty-sm border border-[var(--ty-border-color)] bg-[var(--ty-fill-white-color)] text-[var(--ty-primary-color)] font-medium cursor-pointer"><Eye className="w-3.5 h-3.5" />对比分析</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="p-3 border-t border-[var(--ty-border-color)] bg-[var(--ty-fill-weak-dark-color)] flex items-center justify-between gap-3">
              <SimilarityRunSummary result={formSearchResult} />
              <button onClick={() => setIsFormResultOpen(false)} className="h-8 px-4 text-ty-xs font-medium text-[var(--ty-font-main-color)] bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm hover:bg-[var(--ty-fill-color)] cursor-pointer">返回表单</button>
            </div>
          </section>
        </div>
      )}

      {/* 业务端对比分析抽屉 (业务友好语言说明，屏蔽技术公式) */}
      {selectedForCompare && (
        <div
          className="fixed inset-0 z-[70] bg-ty-overlay backdrop-blur-xs flex justify-end"
          id="client-compare-drawer-backdrop"
          role="presentation"
          onMouseDown={event => { if (event.target === event.currentTarget) setSelectedForCompare(null); }}
        >
          <section role="dialog" aria-modal="true" aria-labelledby="client-compare-drawer-title" className="w-[min(800px,100vw)] bg-[var(--ty-fill-white-color)] h-full shadow-ty-lg flex flex-col overflow-hidden animate-in slide-in-from-right duration-200 border-l border-[var(--ty-border-color)]">
            {/* 抽屉头部 */}
            <div className="p-4 border-b border-[var(--ty-border-color)] bg-[var(--ty-fill-weak-dark-color)] flex items-center justify-between">
              <div>
                <h2 id="client-compare-drawer-title" className="text-ty-lg font-semibold text-[var(--ty-font-main-color)] flex items-center gap-2">
                  <span>物料属性差异对比</span>
                  <span className="text-ty-sm font-mono text-[var(--ty-primary-color)] font-bold">
                    综合匹配度 {selectedForCompare.similarityScore.toFixed(2)}%
                  </span>
                </h2>
                <p className="text-ty-xs text-[var(--ty-font-sub-color)] mt-0.5 font-mono">
                  {selectedForCompare.objectId} - {selectedForCompare.objectName}
                </p>
              </div>
              <button
                aria-label="关闭物料属性差异对比"
                onClick={() => setSelectedForCompare(null)}
                className="p-2 text-[var(--ty-font-sub-light-color)] hover:text-[var(--ty-font-main-color)] rounded-ty-sm transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 抽屉对比内容 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="flex justify-end"><HelpTooltip label="查看评分口径" content="相似度仅依据参与评分的字段计算。仅展示属性即使不同，也不会影响相似度得分。" /></div>
              <div className="space-y-3">
                {selectedForCompare.compareFields.map(f => {
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
                      <span className="font-bold text-[var(--ty-font-main-color)]">{f.fieldLabel}</span>
                      <div className="flex items-center gap-2">
                      {f.isScoreActive && (
                        <span className="font-mono text-ty-2xs font-semibold text-[var(--ty-font-sub-color)]">
                          字段贡献 {f.missingSide === 'REFERENCE' || f.candidateMissingHandling === 'SKIP' ? '—' : `${f.weightedScore.toFixed(2)} 分`}
                        </span>
                      )}
                      <span
                        className={`font-semibold min-h-6 max-w-[220px] px-2 inline-flex items-center text-center whitespace-normal leading-4 rounded-ty-xs text-ty-2xs ${
                          !f.isScoreActive
                            ? 'bg-[var(--ty-fill-color)] text-[var(--ty-font-sub-color)] border border-[var(--ty-border-color)]'
                            : f.status === 'FULL'
                            ? 'bg-[var(--ty-green-lightest-color)] text-[var(--ty-font-main-light-color)] border border-[var(--ty-green-color)]/30'
                            : f.status === 'PARTIAL'
                            ? 'bg-[var(--ty-primary-lightest-color)] text-[var(--ty-font-main-light-color)] border border-[var(--ty-primary-color)]/30'
                            : 'bg-[var(--ty-fill-color)] text-[var(--ty-font-sub-color)]'
                        }`}
                      >
                        {!f.isScoreActive
                          ? '不参与评分'
                          : candidateMissingLabel
                          ? candidateMissingLabel
                          : f.status === 'FULL'
                          ? '满分命中'
                          : f.status === 'PARTIAL'
                          ? '部分得分'
                          : '存在差异/缺失'}
                      </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 bg-[var(--ty-fill-white-color)] p-3 rounded-ty-sm border border-[var(--ty-border-color)] text-ty-xs">
                       <div>
                         <span className="text-ty-2xs text-[var(--ty-font-sub-light-color)] block mb-0.5">基准物料值</span>
                         <span className="font-semibold text-[var(--ty-font-main-color)]">
                           {String(f.sourceValue ?? '--')}
                         </span>
                       </div>
                       <div>
                         <span className="text-ty-2xs text-[var(--ty-font-sub-light-color)] block mb-0.5">候选物料值</span>
                         <span className="font-semibold text-[var(--ty-font-main-color)]">
                           {f.missingSide === 'CANDIDATE' ? '未填写' : String(f.candidateValue ?? '--')}
                         </span>
                       </div>
                     </div>

                    {/* 业务解释 */}
                    <div className="text-ty-xs text-[var(--ty-font-sub-color)] leading-relaxed pt-1">
                      {f.isScoreActive
                        ? `${f.reason}；字段原始分 ${f.missingSide === 'REFERENCE' || f.candidateMissingHandling === 'SKIP' ? '—' : `${(f.matchRate * 100).toFixed(2)} 分`}`
                        : f.hasDifference ? '值不同' : '值相同'}
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>

            {/* 抽屉底部 */}
            <div className="p-3 border-t border-[var(--ty-border-color)] bg-[var(--ty-fill-weak-dark-color)] flex justify-end">
              <button
                onClick={() => setSelectedForCompare(null)}
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
