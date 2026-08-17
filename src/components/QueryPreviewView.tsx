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
  FileText,
  ShieldAlert,
  HelpCircle,
  Clock,
  Eye
} from 'lucide-react';
import {
  rootTypeOptions,
  softTypeOptions,
  mockFormBaselines,
  mockPartDatabase,
  runSimilaritySearch,
  formatFieldWithFallback
} from '../data';
import {
  FieldSimilarityRule,
  ScoredCandidate,
  ExcludedCandidate,
  SearchRunResult,
  SimilarityBaseline,
  ObjectType
} from '../types';

interface QueryPreviewViewProps {
  editingRules: FieldSimilarityRule[];
  savedRules: FieldSimilarityRule[];
  activeRules: FieldSimilarityRule[];
  objectConfigStatus: Record<string, {
    enabled: boolean;
    configVersion: string;
    lastModifiedAt: string;
  }>;
  onNavigate?: (view: string) => void;
}

interface LastRunContext {
  rootTypeId: string;
  softTypeId: string;
  ruleVersion: 'DRAFT_POOL' | 'SAVED_DRAFT' | 'ACTIVE_RELEASE';
  baseline: SimilarityBaseline;
  runTime: string;
  rulesSnapshot: FieldSimilarityRule[];
  searchResult: SearchRunResult;
}

export const QueryPreviewView: React.FC<QueryPreviewViewProps> = ({
  editingRules,
  savedRules,
  activeRules,
  objectConfigStatus,
  onNavigate
}) => {
  // 1. 查询条件状态
  const [rootTypeId, setRootTypeId] = useState<string>('PART');
  const [softTypeId, setSoftTypeId] = useState<string>('IN_HOUSE');

  // 基准来源：已有件 vs 表单字段值
  const [baselineSourceType, setBaselineSourceType] = useState<'EXISTING_PART' | 'FORM_VALUES'>('EXISTING_PART');

  // 已有件基准选择
  const [existingPartId, setExistingPartId] = useState<string>('PART-2026-000100');

  // 表单基准选择
  const [selectedFormId, setSelectedFormId] = useState<string>('FORM-001');

  // 调试规则版本
  const [ruleVersion, setRuleVersion] = useState<'DRAFT_POOL' | 'SAVED_DRAFT' | 'ACTIVE_RELEASE'>('DRAFT_POOL');

  // 运行加载态与上一次运行上下文快照
  const [isSearching, setIsSearching] = useState(false);
  const [lastRunContext, setLastRunContext] = useState<LastRunContext | null>(null);

  // 结果区 Tab: 参与评分候选 vs 已排除候选
  const [activeTab, setActiveTab] = useState<'SCORED' | 'EXCLUDED'>('SCORED');

  // 算分明细抽屉选中的候选件
  const [selectedCandidate, setSelectedCandidate] = useState<ScoredCandidate | null>(null);

  // 根类型变更响应
  const handleRootTypeChange = (newRootId: string) => {
    setRootTypeId(newRootId);
    const softs = softTypeOptions.filter(st => st.rootTypeId === newRootId);
    if (softs.length > 0) {
      setSoftTypeId(softs[0].id);
    } else {
      setSoftTypeId('');
    }
  };

  const availableSoftTypes = useMemo(() => {
    return softTypeOptions.filter(st => st.rootTypeId === rootTypeId);
  }, [rootTypeId]);

  // 当前可选已有件列表 (按当前根类型和软类型过滤)
  const availableExistingParts = useMemo(() => {
    return mockPartDatabase.filter(p => p.rootTypeId === rootTypeId && p.softTypeId === softTypeId);
  }, [rootTypeId, softTypeId]);

  // 当前可选模拟表单列表 (按当前根类型和软类型过滤)
  const availableFormBaselines = useMemo(() => {
    return mockFormBaselines.filter(f => f.rootTypeId === rootTypeId && f.softTypeId === softTypeId);
  }, [rootTypeId, softTypeId]);

  // 当切换软类型时重置默认选中的基准
  useEffect(() => {
    if (availableExistingParts.length > 0) {
      setExistingPartId(availableExistingParts[0].objectId);
    } else {
      setExistingPartId('');
    }

    if (availableFormBaselines.length > 0) {
      setSelectedFormId(availableFormBaselines[0].id);
    } else {
      setSelectedFormId('');
    }

    // 清理旧运行结果
    setLastRunContext(null);
    setSelectedCandidate(null);
  }, [rootTypeId, softTypeId, baselineSourceType]);

  // 获取对应版本规则
  const getRulesForVersion = (version: 'DRAFT_POOL' | 'SAVED_DRAFT' | 'ACTIVE_RELEASE') => {
    if (version === 'DRAFT_POOL') return editingRules;
    if (version === 'SAVED_DRAFT') return savedRules;
    return activeRules;
  };

  const currentRules = getRulesForVersion(ruleVersion);
  const currentScopeRules = currentRules.filter(
    r => (r.rootTypeId === rootTypeId || r.objectType === rootTypeId) && r.softTypeId === softTypeId
  );

  // 执行沙盒试算
  const handleRunTrial = () => {
    let baseline: SimilarityBaseline;

    if (baselineSourceType === 'EXISTING_PART') {
      if (!existingPartId) {
        alert('请选择或输入基准已有件对象标识！');
        return;
      }
      baseline = {
        type: 'EXISTING_PART',
        objectId: existingPartId
      };
    } else {
      const formItem = mockFormBaselines.find(f => f.id === selectedFormId);
      if (!formItem) {
        alert('请选择有效的业务表单基准！');
        return;
      }
      baseline = {
        type: 'FORM_VALUES',
        requestNo: formItem.requestNo,
        temporaryNo: formItem.temporaryNo,
        rootTypeId: formItem.rootTypeId,
        softTypeId: formItem.softTypeId,
        values: formItem.values,
        units: formItem.units
      };
    }

    setIsSearching(true);
    setSelectedCandidate(null);

    setTimeout(() => {
      const result = runSimilaritySearch(rootTypeId, softTypeId, baseline, currentRules);
      const snapshot: LastRunContext = {
        rootTypeId,
        softTypeId,
        ruleVersion,
        baseline,
        runTime: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
        rulesSnapshot: [...currentScopeRules],
        searchResult: result
      };

      setLastRunContext(snapshot);
      setIsSearching(false);
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
    setRootTypeId('PART');
    setSoftTypeId('IN_HOUSE');
    setBaselineSourceType('EXISTING_PART');
    setExistingPartId('PART-2026-000100');
    setRuleVersion('DRAFT_POOL');
    setLastRunContext(null);
    setSelectedCandidate(null);
  };

  const currentRootTypeObj = rootTypeOptions.find(rt => rt.id === rootTypeId);
  const currentSoftTypeObj = softTypeOptions.find(st => st.id === softTypeId);

  const activeScoreFieldsCount = currentScopeRules.filter(r => r.isScoreActive && r.enabled).length;
  const gateFieldsCount = currentScopeRules.filter(
    r => r.mismatchAction === 'EXCLUDE_CANDIDATE' && r.isScoreActive && r.enabled
  ).length;
  const totalWeight = currentScopeRules
    .filter(r => r.isScoreActive && r.enabled)
    .reduce((sum, r) => sum + r.weight, 0);

  return (
    <div className="space-y-6" id="query-preview-view-container">
      {/* 顶部控制面板 */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <Search className="w-5 h-5 text-blue-600" />
              查询预览与沙盒试算
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              验证不同规则版本（编辑中/已保存/启用发布）在已有件或表单字段值基准下的算分与门槛排除效果
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              重置参数
            </button>
            <button
              onClick={handleRunTrial}
              disabled={isSearching}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors shadow-xs disabled:opacity-50"
              id="run-trial-btn"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {isSearching ? '正在试算...' : '启动沙盒试算'}
            </button>
          </div>
        </div>

        {/* 6 大查询条件配置行 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
          {/* 1. 根类型 */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              1. 根类型
            </label>
            <select
              value={rootTypeId}
              onChange={e => handleRootTypeChange(e.target.value)}
              className="w-full h-9 text-xs font-medium border border-slate-300 rounded-md px-2.5 bg-white text-slate-800 focus:ring-1 focus:ring-blue-500"
              id="preview-root-type-select"
            >
              {rootTypeOptions.map(rt => (
                <option key={rt.id} value={rt.id}>
                  {rt.name}
                </option>
              ))}
            </select>
          </div>

          {/* 2. 软类型 */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              2. 软类型
            </label>
            <select
              value={softTypeId}
              onChange={e => setSoftTypeId(e.target.value)}
              className="w-full h-9 text-xs font-medium border border-slate-300 rounded-md px-2.5 bg-white text-slate-800 focus:ring-1 focus:ring-blue-500"
              id="preview-soft-type-select"
            >
              {availableSoftTypes.map(st => (
                <option key={st.id} value={st.id}>
                  {st.name}
                </option>
              ))}
            </select>
          </div>

          {/* 3. 基准来源 */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              3. 基准来源
            </label>
            <select
              value={baselineSourceType}
              onChange={e => setBaselineSourceType(e.target.value as any)}
              className="w-full h-9 text-xs font-semibold border border-slate-300 rounded-md px-2.5 bg-white text-blue-700 focus:ring-1 focus:ring-blue-500"
              id="preview-baseline-source-select"
            >
              <option value="EXISTING_PART">已有件作为基准</option>
              <option value="FORM_VALUES">新建/编辑表单字段值</option>
            </select>
          </div>

          {/* 4. 基准参考对象选择 */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600 block">
              {baselineSourceType === 'EXISTING_PART' ? '4. 基准已有件' : '4. 业务申请表单'}
            </label>
            {baselineSourceType === 'EXISTING_PART' ? (
              availableExistingParts.length > 0 ? (
                <select
                  value={existingPartId}
                  onChange={e => setExistingPartId(e.target.value)}
                  className="w-full h-9 text-xs font-medium border border-slate-300 rounded-md px-2 bg-white text-slate-800 focus:ring-1 focus:ring-blue-500"
                >
                  {availableExistingParts.map(p => (
                    <option key={p.objectId} value={p.objectId}>
                      {p.objectId} - {p.objectName}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={existingPartId}
                  onChange={e => setExistingPartId(e.target.value)}
                  placeholder="输入件号..."
                  className="w-full h-9 text-xs border border-slate-300 rounded-md px-2.5 bg-white"
                />
              )
            ) : availableFormBaselines.length > 0 ? (
              <select
                value={selectedFormId}
                onChange={e => setSelectedFormId(e.target.value)}
                className="w-full h-9 text-xs font-medium border border-slate-300 rounded-md px-2 bg-white text-slate-800 focus:ring-1 focus:ring-blue-500"
              >
                {availableFormBaselines.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.requestNo} ({f.temporaryNo})
                  </option>
                ))}
              </select>
            ) : (
              <div className="h-9 px-2 flex items-center text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-md">
                暂无预置表单
              </div>
            )}
          </div>

          {/* 5. 调试规则版本 */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              5. 调试规则版本
            </label>
            <select
              value={ruleVersion}
              onChange={e => setRuleVersion(e.target.value as any)}
              className="w-full h-9 text-xs font-semibold border border-slate-300 rounded-md px-2.5 bg-white text-slate-800 focus:ring-1 focus:ring-blue-500"
              id="preview-rule-version-select"
            >
              <option value="DRAFT_POOL">当前编辑中内容 (Draft Pool)</option>
              <option value="SAVED_DRAFT">已保存配置 (Saved Draft)</option>
              <option value="ACTIVE_RELEASE">当前启用配置 (Active Release)</option>
            </select>
          </div>
        </div>

        {/* 紧凑规则上下文摘要行 (Compact Rule Summary Bar) */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-md flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <span className="text-slate-400">上下文：</span>
              <span className="font-bold text-slate-800">
                {currentRootTypeObj?.name.split(' ')[0]} / {currentSoftTypeObj?.name.split(' ')[0]}
              </span>
            </div>
            <div>
              <span className="text-slate-400">规则版本：</span>
              <span className="font-semibold text-blue-700">
                {ruleVersion === 'DRAFT_POOL'
                  ? '当前编辑中内容'
                  : ruleVersion === 'SAVED_DRAFT'
                  ? '已保存配置'
                  : '当前启用配置'}
              </span>
            </div>
            <div>
              <span className="text-slate-400">参与评分字段：</span>
              <span className="font-bold text-slate-800 font-mono">{activeScoreFieldsCount} 项</span>
            </div>
            <div>
              <span className="text-slate-400">门槛字段：</span>
              <span className="font-bold text-amber-700 font-mono">{gateFieldsCount} 项</span>
            </div>
            <div>
              <span className="text-slate-400">权重合计：</span>
              <span
                className={`font-bold font-mono ${
                  totalWeight === 100 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {totalWeight}%
              </span>
            </div>
          </div>

          {lastRunContext && (
            <span className="text-[11px] text-slate-400">
              试算时间：<span className="font-mono">{lastRunContext.runTime}</span>
            </span>
          )}
        </div>
      </div>

      {/* 试算结果区域 */}
      {isSearching ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center shadow-sm">
          <div className="inline-block animate-spin text-blue-600 mb-3">
            <RotateCcw className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">正在执行沙盒相似度试算...</h3>
          <p className="text-xs text-slate-500 mt-1">计算属性差异、评估门槛过滤与相似度综合得分</p>
        </div>
      ) : !lastRunContext ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center shadow-sm" id="initial-guide-container">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 mx-auto flex items-center justify-center mb-3">
            <Play className="w-6 h-6 fill-current ml-0.5" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">点击“启动沙盒试算”开始验证</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
            选择对应的根类型、软类型以及基准对象，系统将基于所选规则版本进行候选件召回、门槛过滤与算分模拟。
          </p>
        </div>
      ) : lastRunContext.searchResult.errorCode === 'NO_RULES' ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 mx-auto flex items-center justify-center mb-3">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">当前软类型尚未配置相似度规则</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
            {lastRunContext.searchResult.errorMessage}
          </p>
          {onNavigate && (
            <button
              onClick={() => onNavigate('field-rules')}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors shadow-2xs"
            >
              前往配置规则
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden space-y-0">
          {/* 基准参考信息头卡片 */}
          {lastRunContext.searchResult.reference && (
            <div className="p-4 bg-slate-50/90 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-2xs">
                  REF
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">
                      {lastRunContext.searchResult.reference.objectName}
                    </span>
                    <span className="text-xs font-mono px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded font-semibold">
                      {lastRunContext.searchResult.reference.objectId}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 bg-slate-200 text-slate-700 rounded font-medium">
                      {lastRunContext.searchResult.baselineType === 'FORM_VALUES'
                        ? '表单录入基准'
                        : '已有件基准'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 flex flex-wrap items-center gap-3 mt-1">
                    <span>
                      规格：
                      <strong className="text-slate-700 font-medium">
                        {lastRunContext.searchResult.reference.specification || '--'}
                      </strong>
                    </span>
                    <span>
                      材质：
                      <strong className="text-slate-700 font-medium">
                        {lastRunContext.searchResult.reference.material || '--'}
                      </strong>
                    </span>
                    <span>
                      分类：
                      <strong className="text-slate-700 font-medium">
                        {lastRunContext.searchResult.reference.classificationPath}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right text-xs">
                <span className="text-slate-400 block">候选召回池</span>
                <span className="font-semibold text-slate-800">
                  共召回{' '}
                  {lastRunContext.searchResult.scoredCandidates.length +
                    lastRunContext.searchResult.excludedCandidates.length}{' '}
                  项候选件
                </span>
              </div>
            </div>
          )}

          {/* 结果分栏 Tabs */}
          <div className="border-b border-slate-200 px-4 flex items-center gap-4 bg-white">
            <button
              onClick={() => setActiveTab('SCORED')}
              className={`py-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'SCORED'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
              id="tab-scored-candidates"
            >
              <span>参与评分的候选</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  activeTab === 'SCORED' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {lastRunContext.searchResult.scoredCandidates.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('EXCLUDED')}
              className={`py-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'EXCLUDED'
                  ? 'border-amber-600 text-amber-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
              id="tab-excluded-candidates"
            >
              <span className="flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                已排除候选 (门槛未满足)
              </span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  activeTab === 'EXCLUDED' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
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
                <div className="p-12 text-center text-xs text-slate-500">
                  未找到符合当前评分条件的相似件
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                        <th className="py-2.5 px-4 w-12 text-center">排序</th>
                        <th className="py-2.5 px-4">对象标识 / 名称</th>
                        <th className="py-2.5 px-4">规格参数</th>
                        <th className="py-2.5 px-4">材质</th>
                        <th className="py-2.5 px-4">分类路径</th>
                        <th className="py-2.5 px-4">相似度得分</th>
                        <th className="py-2.5 px-4">分级与覆盖率</th>
                        <th className="py-2.5 px-4">命中 / 差异</th>
                        <th className="py-2.5 px-4 text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {lastRunContext.searchResult.scoredCandidates.map((cand, idx) => (
                        <tr
                          key={cand.objectId}
                          className="hover:bg-blue-50/30 transition-colors"
                          id={`candidate-row-${cand.objectId}`}
                        >
                          <td className="py-3 px-4 text-center font-mono font-bold text-slate-500">
                            {idx + 1}
                          </td>

                          {/* 标识与名称 */}
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{cand.objectName}</div>
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                              {cand.objectId}
                            </div>
                          </td>

                          {/* 规格 */}
                          <td className="py-3 px-4 text-slate-700 font-medium">
                            {cand.specification || '--'}
                          </td>

                          {/* 材质 */}
                          <td className="py-3 px-4 text-slate-700 font-medium">
                            {cand.material || '--'}
                          </td>

                          {/* 分类路径 */}
                          <td className="py-3 px-4 text-slate-500 text-[11px] truncate max-w-xs">
                            {cand.classificationPath}
                          </td>

                          {/* 相似度得分 (四舍五入保留两位小数展示，按原始未舍入浮点排序) */}
                          <td className="py-3 px-4">
                            <div className="flex items-baseline gap-1.5">
                              <span
                                className={`text-base font-bold font-mono ${
                                  cand.similarityScore >= 85
                                    ? 'text-emerald-600'
                                    : cand.similarityScore >= 70
                                    ? 'text-blue-600'
                                    : 'text-slate-600'
                                }`}
                              >
                                {cand.similarityScore.toFixed(2)}%
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              原始: {cand.rawSimilarityScore.toFixed(4)}%
                            </div>
                          </td>

                          {/* 分级与覆盖率 */}
                          <td className="py-3 px-4">
                            <div className="flex flex-col gap-1 items-start">
                              <span
                                className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                                  cand.similarityTier === '高相似'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : cand.similarityTier === '中相似'
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {cand.similarityTier}
                              </span>
                              <span className="text-[11px] text-slate-500">
                                覆盖率: {cand.coverageRate}%
                              </span>
                            </div>
                          </td>

                          {/* 命中 / 差异 */}
                          <td className="py-3 px-4">
                            <div className="text-[11px]">
                              <span className="text-emerald-600 font-semibold">
                                全中 {cand.fullHitCount}
                              </span>
                              {' / '}
                              <span className="text-rose-600 font-semibold">
                                差异 {cand.differenceCount}
                              </span>
                            </div>
                          </td>

                          {/* 操作 */}
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => setSelectedCandidate(cand)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
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
              )}
            </div>
          )}

          {/* Tab 2 内容：已排除候选 (门槛未满足) 列表 */}
          {activeTab === 'EXCLUDED' && (
            <div>
              {lastRunContext.searchResult.excludedCandidates.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-500">
                  当前试算未发现被门槛规则排除的候选件
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-amber-50/60 border-b border-amber-200 text-slate-700 font-semibold">
                        <th className="py-2.5 px-4 w-12 text-center">序号</th>
                        <th className="py-2.5 px-4">被排除对象</th>
                        <th className="py-2.5 px-4">被排除门槛字段</th>
                        <th className="py-2.5 px-4">基准值 (源值)</th>
                        <th className="py-2.5 px-4">候选值 (目标值)</th>
                        <th className="py-2.5 px-4">门槛匹配要求</th>
                        <th className="py-2.5 px-4">排除原因说明</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {lastRunContext.searchResult.excludedCandidates.map((exc, idx) => (
                        <tr
                          key={exc.objectId}
                          className="hover:bg-amber-50/30 transition-colors"
                          id={`excluded-row-${exc.objectId}`}
                        >
                          <td className="py-3 px-4 text-center font-mono text-slate-400">
                            {idx + 1}
                          </td>

                          {/* 被排除对象 */}
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{exc.objectName}</div>
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                              {exc.objectId}
                            </div>
                          </td>

                          {/* 门槛字段 */}
                          <td className="py-3 px-4">
                            <span className="font-bold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded border border-amber-200 inline-flex items-center gap-1">
                              <ShieldAlert className="w-3 h-3 text-amber-600" />
                              {exc.fieldLabel} ({exc.excludedByField})
                            </span>
                          </td>

                          {/* 基准值 */}
                          <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                            {String(exc.sourceValue ?? '--')}
                          </td>

                          {/* 候选值 */}
                          <td className="py-3 px-4 font-mono font-semibold text-rose-600">
                            {String(exc.candidateValue ?? '--')}
                          </td>

                          {/* 门槛匹配要求 */}
                          <td className="py-3 px-4 text-slate-700">
                            {exc.matchingRequirement}
                          </td>

                          {/* 排除说明 */}
                          <td className="py-3 px-4 text-slate-500 text-[11px]">
                            {exc.excludeReason}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 算分明细抽屉 (Score Details Drawer) */}
      {selectedCandidate && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end"
          id="score-detail-drawer-backdrop"
        >
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            {/* 抽屉头部 */}
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>算分明细与属性比对</span>
                  <span className="text-sm font-mono text-blue-600 font-bold">
                    {selectedCandidate.similarityScore.toFixed(2)}%
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 font-mono">
                  {selectedCandidate.objectId} - {selectedCandidate.objectName}
                </p>
              </div>
              <button
                onClick={() => setSelectedCandidate(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 抽屉内容列表 */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="text-xs font-bold text-slate-800">
                参与计算字段逐项明细 ({selectedCandidate.compareFields.length} 项)
              </div>

              <div className="space-y-3">
                {selectedCandidate.compareFields.map(f => {
                  const isGate = f.mismatchAction === 'EXCLUDE_CANDIDATE';
                  return (
                    <div
                      key={f.fieldKey}
                      className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{f.fieldLabel}</span>
                          <span className="text-[10px] text-slate-400 font-mono">({f.fieldKey})</span>
                          {isGate && (
                            <span className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.2 rounded">
                              门槛字段
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">权重 {f.weight}%</span>
                          <span
                            className={`font-mono font-bold ${
                              f.status === 'FULL'
                                ? 'text-emerald-600'
                                : f.status === 'PARTIAL'
                                ? 'text-blue-600'
                                : 'text-slate-400'
                            }`}
                          >
                            得分: {f.weightedScore} 分
                          </span>
                        </div>
                      </div>

                      {/* 源值 vs 候选值 */}
                      <div className="grid grid-cols-2 gap-3 bg-white p-2.5 rounded border border-slate-200">
                        <div>
                          <span className="text-[10px] text-slate-400 block mb-0.5">基准值 (源)</span>
                          <span className="font-semibold text-slate-800 font-mono">
                            {String(f.sourceValue ?? '--')}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block mb-0.5">候选值 (目标)</span>
                          <span className="font-semibold text-slate-800 font-mono">
                            {String(f.candidateValue ?? '--')}
                          </span>
                        </div>
                      </div>

                      {/* 结论说明 */}
                      <div className="text-[11px] text-slate-500 leading-relaxed flex items-center justify-between pt-1">
                        <span>{f.reason}</span>
                        <span className="font-mono font-semibold">
                          匹配率: {(f.matchRate * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 抽屉底部 */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedCandidate(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
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
