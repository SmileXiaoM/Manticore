import React, { useState, useEffect } from 'react';
import {
  Search,
  Play,
  ChevronRight,
  Info,
  Send,
  RotateCcw,
  X,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { runSimilaritySearch } from '../data';
import { FieldSimilarityRule, ScoredCandidate, SearchRunResult, ObjectType, isObjectRulesModified } from '../types';

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
  objectType: string;
  objectId: string;
  ruleVersion: string; // DRAFT_POOL, SAVED_DRAFT, or ACTIVE_RELEASE
  configVersion: string;
  lastModifiedAt: string;
  ruleUpdatedAt: string; // R13-BLK-02
  scoreFieldsCount: number;
  totalWeight: number;
  candidateDataSource: string;
  thresholds: { high: number; medium: number };
  unitCatalogVersion: string;
  unitCatalogStatus: string; // R13-BLK-02
  rulesSnapshot: FieldSimilarityRule[];
  searchResult: SearchRunResult;
  runTime: string; // 试算时间 (R12-BLK-02)
}

export const QueryPreviewView: React.FC<QueryPreviewViewProps> = ({
  editingRules,
  savedRules,
  activeRules,
  objectConfigStatus,
  onNavigate
}) => {
  // Query parameters
  const [objectType, setObjectType] = useState('PART_MECHANICAL');
  const [objectId, setObjectId] = useState('REQ-2026-000100'); // default is REQ-2026-000100
  const [ruleVersion, setRuleVersion] = useState('SAVED_DRAFT'); // default is SAVED_DRAFT
  const [isSnapshotExpanded, setIsSnapshotExpanded] = useState(false);

  // Result loading state simulation
  const [isSearching, setIsSearching] = useState(false);

  // Last Run Context holds the immutable snapshot of a search run
  const [lastRunContext, setLastRunContext] = useState<LastRunContext | null>(null);

  const isSecondPhaseEnabled = objectConfigStatus[objectType]?.enabled ?? true;

  // Selected candidate for detail drawer
  const [selectedCandidate, setSelectedCandidate] = useState<ScoredCandidate | null>(null);

  // R13-BLK-02: Clear old snapshot, results, and drawer when input query parameters change
  useEffect(() => {
    setLastRunContext(null);
    setSelectedCandidate(null);
  }, [objectType, objectId, ruleVersion]);

  const getRulesForVersion = (version: string) => {
    if (version === 'DRAFT_POOL') return editingRules;
    if (version === 'SAVED_DRAFT') return savedRules;
    return activeRules;
  };

  const renderSnapshotDashboard = (ctx: LastRunContext) => {
    const sourceStr = ctx.ruleVersion === 'DRAFT_POOL' ? '当前编辑内容' : ctx.ruleVersion === 'SAVED_DRAFT' ? '已保存配置' : '当前启用配置';
    const objectTypeStr = ctx.objectType === 'PART_MECHANICAL' ? '机械零件' : '电气元器件';
    const thresholdsStr = `高相似 85 / 中相似 70`;

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-3 p-4 bg-slate-50 border-b border-slate-100" id="snapshot-9-metrics-grid">
        {/* 1. 配置来源 */}
        <div className="bg-white p-3 rounded border border-slate-200 flex flex-col justify-between shadow-2xs">
          <span className="text-[10px] text-slate-400 font-semibold block mb-1">1. 配置来源</span>
          <span className="text-xs font-bold text-slate-800 leading-tight" id="snapshot-source">{sourceStr}</span>
        </div>

        {/* 2. 配置版本 */}
        <div className="bg-white p-3 rounded border border-slate-200 flex flex-col justify-between shadow-2xs">
          <span className="text-[10px] text-slate-400 font-semibold block mb-1">2. 配置版本</span>
          <span className="text-xs font-bold text-slate-800 leading-tight font-mono" id="snapshot-version">{ctx.configVersion}</span>
        </div>

        {/* 3. 对象类型 */}
        <div className="bg-white p-3 rounded border border-slate-200 flex flex-col justify-between shadow-2xs">
          <span className="text-[10px] text-slate-400 font-semibold block mb-1">3. 对象类型</span>
          <span className="text-xs font-bold text-slate-800 leading-tight" id="snapshot-object-type">{objectTypeStr}</span>
        </div>

        {/* 4. 规则更新时间 */}
        <div className="bg-white p-3 rounded border border-slate-200 flex flex-col justify-between shadow-2xs">
          <span className="text-[10px] text-slate-400 font-semibold block mb-1">4. 规则更新时间</span>
          <span className="text-xs font-bold text-slate-800 leading-tight font-mono" id="snapshot-rule-updated-at">{ctx.ruleUpdatedAt}</span>
        </div>

        {/* 5. 参与评分字段数 */}
        <div className="bg-white p-3 rounded border border-slate-200 flex flex-col justify-between shadow-2xs">
          <span className="text-[10px] text-slate-400 font-semibold block mb-1">5. 参与评分字段数</span>
          <span className="text-xs font-bold text-blue-600 font-mono" id="snapshot-score-fields">{ctx.scoreFieldsCount} 项</span>
        </div>

        {/* 6. 评分权重合计 */}
        <div className="bg-white p-3 rounded border border-slate-200 flex flex-col justify-between shadow-2xs">
          <span className="text-[10px] text-slate-400 font-semibold block mb-1">6. 评分权重合计</span>
          <span className="text-xs font-bold text-slate-800 font-mono" id="snapshot-total-weight">{ctx.totalWeight}%</span>
        </div>

        {/* 7. 候选集数据源 */}
        <div className="bg-white p-3 rounded border border-slate-200 flex flex-col justify-between shadow-2xs">
          <span className="text-[10px] text-slate-400 font-semibold block mb-1">7. 候选集数据源</span>
          <span className="text-xs font-bold text-emerald-600 font-medium" id="snapshot-candidate-datasource">{ctx.candidateDataSource}</span>
        </div>

        {/* 8. 分档阈值 */}
        <div className="bg-white p-3 rounded border border-slate-200 flex flex-col justify-between shadow-2xs">
          <span className="text-[10px] text-slate-400 font-semibold block mb-1">8. 分档阈值</span>
          <span className="text-xs font-bold text-slate-800 leading-tight" id="snapshot-thresholds">{thresholdsStr}</span>
        </div>

        {/* 9. 单位目录 */}
        <div className="bg-white p-3 rounded border border-slate-200 flex flex-col justify-between shadow-2xs">
          <span className="text-[10px] text-slate-400 font-semibold block mb-1">9. 单位目录</span>
          <div className="text-xs font-bold text-slate-800 leading-tight flex flex-col gap-0.5" id="snapshot-unit-catalog">
            <div>版本：{ctx.unitCatalogVersion}</div>
            <div className="text-emerald-600 font-medium text-[10px] flex items-center gap-1 mt-0.5">
              <span className="inline-block w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              加载状态：{ctx.unitCatalogStatus}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleRunSearch = () => {
    const curTime = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const ruleUpAt = objectConfigStatus[objectType]?.lastModifiedAt || '无';
    if (objectId.trim() === '') {
      alert('请输入基准对象编码');
      setLastRunContext(null);
      setSelectedCandidate(null);
      return;
    }

    setIsSearching(true);
    setTimeout(() => {
      setIsSearching(false);
      const rulesToUse = getRulesForVersion(ruleVersion);
      const rulesSnapshot = JSON.parse(JSON.stringify(rulesToUse.filter(r => r.objectType === objectType)));
      const res = runSimilaritySearch(objectType, objectId, rulesToUse);

      const isEditingModified = isObjectRulesModified(editingRules, savedRules, objectType as ObjectType);
      const configVer = ruleVersion === 'DRAFT_POOL' && isEditingModified
        ? '未保存修改'
        : (objectConfigStatus[objectType]?.configVersion || 'v2.5.0');

      setLastRunContext({
        objectType,
        objectId,
        ruleVersion,
        configVersion: configVer,
        lastModifiedAt: ruleUpAt,
        ruleUpdatedAt: ruleUpAt,
        scoreFieldsCount: rulesSnapshot.filter((r: any) => r.isScoreActive && r.enabled).length,
        totalWeight: rulesSnapshot.filter((r: any) => r.isScoreActive && r.enabled).reduce((sum: number, r: any) => sum + r.weight, 0),
        candidateDataSource: '一阶段有效索引（仅有效件）',
        thresholds: { high: 85, medium: 70 },
        unitCatalogVersion: 'Windchill 2026-07-15',
        unitCatalogStatus: '已加载',
        rulesSnapshot,
        searchResult: res,
        runTime: curTime
      });
    }, 400);
  };

  const handleReset = () => {
    setObjectType('PART_MECHANICAL');
    setObjectId('REQ-2026-000100');
    setRuleVersion('SAVED_DRAFT');
    setLastRunContext(null);
    setSelectedCandidate(null);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 font-sans" id="query-preview-container">

      {/* 1. Page Header (页面标题与工具栏) */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0 flex items-center justify-between gap-4" id="preview-header">
        <div>
          <div className="flex items-center space-x-2 text-xs text-slate-500 mb-1">
            <span>验证与应用</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-800 font-medium">相似度查询预览</span>
          </div>
          <h1 className="text-lg font-bold text-slate-900">相似度查询预览</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            管理端沙盒验证工具：验证各字段属性相似度算分、命中原因解释与字段差异标注，提供全链条模拟对齐。
          </p>
        </div>

        {/* Selected Config Info Box */}
        <div className="flex items-center space-x-3 shrink-0">
          <div className="hidden md:flex flex-col space-y-0.5 text-right text-xs text-slate-500 mr-2">
            <div>
              <span className="text-slate-400">相似度规则版本:</span>{' '}
              <span className="font-mono text-blue-600 font-bold">
                {lastRunContext ? lastRunContext.configVersion : (objectConfigStatus[objectType]?.configVersion || 'v2.5.0')}
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              {lastRunContext ? '本次试算引用快照版本' : '待试算（版本未加载）'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Sandbox Content (Vertical layout) */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4" id="preview-scroll-content">

        {/* 1.1 顶部查询条件区 */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs" id="preview-filter-section">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 text-xs text-slate-700 items-end">

            {/* Object Type */}
            <div className="flex flex-col space-y-1.5 w-full">
              <label className="font-semibold text-slate-600">物料对象类型:</label>
              <select
                id="select-object-type"
                value={objectType}
                onChange={(e) => {
                  const newType = e.target.value;
                  setObjectType(newType);
                  setObjectId(newType === 'PART_ELECTRICAL' ? 'ELEC-2026-000100' : 'REQ-2026-000100');
                  setLastRunContext(null);
                  setSelectedCandidate(null);
                }}
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-semibold text-slate-700 focus:ring-1 focus:ring-blue-500 text-xs"
              >
                <option value="PART_MECHANICAL">机械零件 (PART_MECHANICAL)</option>
                <option value="PART_ELECTRICAL">电气元器件 (PART_ELECTRICAL)</option>
              </select>
            </div>

            {/* Object ID */}
            <div className="flex flex-col space-y-1.5 w-full">
              <label className="font-semibold text-slate-600">基准对象编码:</label>
              <input
                id="input-object-id"
                type="text"
                value={objectId}
                onChange={(e) => {
                  setObjectId(e.target.value);
                  setLastRunContext(null);
                  setSelectedCandidate(null);
                }}
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-mono text-xs font-bold text-slate-800 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Rule Snapshot */}
            <div className="flex flex-col space-y-1.5 w-full">
              <label className="font-semibold text-slate-600">调试规则版本:</label>
              <select
                id="select-rule-version"
                value={ruleVersion}
                onChange={(e) => {
                  setRuleVersion(e.target.value);
                  setLastRunContext(null);
                  setSelectedCandidate(null);
                }}
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:ring-1 focus:ring-blue-500"
              >
                <option value="DRAFT_POOL">当前编辑内容</option>
                <option value="SAVED_DRAFT">已保存配置</option>
                <option value="ACTIVE_RELEASE">当前启用配置</option>
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2 md:justify-end xl:justify-end w-full">
              <button
                id="btn-run-sandbox"
                onClick={handleRunSearch}
                disabled={isSearching}
                className="flex-1 md:flex-initial bg-slate-900 hover:bg-slate-800 text-white px-4 py-1.5 rounded text-xs font-semibold shadow-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer h-[34px]"
              >
                <Play className="w-3.5 h-3.5 fill-current shrink-0" />
                <span>{isSearching ? '计算中...' : '启动沙盒试算'}</span>
              </button>
              <button
                id="btn-reset-sandbox"
                onClick={handleReset}
                className="flex-1 md:flex-initial bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded text-xs font-medium flex items-center justify-center space-x-1 transition-all cursor-pointer h-[34px]"
              >
                <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                <span>重置</span>
              </button>
            </div>

          </div>
        </div>

        {/* 1.15 本次试算或准备就绪提示 */}
        {!lastRunContext ? (
          <div className="bg-white border border-slate-200 rounded-lg p-12 text-center space-y-4 shadow-2xs" id="sandbox-initial-placeholder">
            <div className="w-12 h-12 bg-slate-50 border border-slate-150 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <Search className="w-5 h-5 animate-pulse" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">试算就绪，等待启动</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              当前暂无计算结果。请在顶部配置“物料对象类型”、“基准对象编码”及比对使用的“调试规则版本”后，点击右侧<strong>「启动沙盒试算」</strong>按钮，开始模拟 Manticore 检索算分。
            </p>
          </div>
        ) : (
          <>
            {/* 1.15 本次试算规则快照 */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden" id="trial-rules-snapshot-panel">
              <button
                type="button"
                onClick={() => setIsSnapshotExpanded(!isSnapshotExpanded)}
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100 hover:bg-slate-100/70 transition-all text-xs font-semibold text-slate-700"
                id="btn-toggle-snapshot"
              >
                <div className="flex items-center space-x-2">
                  <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-sm font-mono text-[10px]">SNAPSHOT</span>
                  <span>本次试算规则快照 ({lastRunContext.rulesSnapshot.length} 项配置)</span>
                  <span className="text-slate-400 font-normal">| 试算依据：{
                    lastRunContext.ruleVersion === 'DRAFT_POOL' ? '当前编辑内容' : lastRunContext.ruleVersion === 'SAVED_DRAFT' ? '已保存配置' : '当前启用配置'
                  } ({lastRunContext.configVersion})</span>
                </div>
                <div className="flex items-center space-x-1.5 text-blue-600">
                  <span className="text-[11px] font-normal">{isSnapshotExpanded ? '收起明细' : '展开明细'}</span>
                  <ChevronRight className={`w-3.5 h-3.5 transform transition-transform duration-200 ${isSnapshotExpanded ? 'rotate-90' : ''}`} />
                </div>
              </button>

              {renderSnapshotDashboard(lastRunContext)}

              {isSnapshotExpanded && (
                <div className="p-4 bg-slate-50/30" id="snapshot-content-grid">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[...lastRunContext.rulesSnapshot].sort((a, b) => a.propertyCode.localeCompare(b.propertyCode)).map((rule) => {
                      const isScoreActive = rule.isScoreActive;

                      return (
                        <div key={rule.id} className={`p-3 rounded-md border ${rule.enabled ? 'bg-white border-slate-200' : 'bg-slate-50/50 border-slate-200/50 opacity-60'} flex flex-col justify-between text-xs`}>
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div className="font-bold text-slate-800 flex items-center space-x-1">
                              <span>{rule.fieldName}</span>
                              <span className="text-[10px] font-mono text-slate-400 font-normal">({rule.propertyCode})</span>
                            </div>
                            <div className="flex items-center space-x-1 shrink-0">

                              {isScoreActive && (
                                <span className="bg-sky-50 text-sky-600 border border-sky-100 text-[10px] px-1 py-0.2 rounded font-medium">参算评分</span>
                              )}
                              {!rule.enabled && (
                                <span className="bg-slate-100 text-slate-400 text-[10px] px-1 py-0.2 rounded font-medium">已禁用</span>
                              )}
                            </div>
                          </div>

                          <div className="space-y-1 text-slate-500 text-[11px]">
                            <div className="flex justify-between">
                              <span>匹配策略:</span>
                              <span className="font-medium text-slate-700">{rule.matchType}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>配置权重:</span>
                              <span className="font-bold text-blue-600">{rule.weight}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span>空值处理:</span>
                              <span className="text-slate-600 truncate max-w-[150px]" title={rule.nullHandling}>{rule.nullHandling}</span>
                            </div>

                            {rule.matchConfig && (
                              <div className="mt-1.5 pt-1.5 border-t border-dashed border-slate-100 text-[10px] text-slate-400 flex flex-wrap gap-x-2">
                                {rule.matchConfig.kind === 'NUMERIC_TOLERANCE' && (
                                  <>
                                    <span>容差: ±{(rule.matchConfig as any).toleranceValue}{rule.displayUnit}</span>
                                    <span>类型: {(rule.matchConfig as any).toleranceType === 'PERCENTAGE' ? '百分比' : '绝对值'}</span>
                                  </>
                                )}
                                {rule.matchConfig.kind === 'NUMERIC_DECAY' && (
                                  <>
                                    <span>无损区: ±{(rule.matchConfig as any).fullScoreRange}{rule.displayUnit}</span>
                                    <span>归零界: ±{(rule.matchConfig as any).zeroScoreBoundary}{rule.displayUnit}</span>
                                  </>
                                )}
                                {rule.matchConfig.kind === 'TEXT_SIMILARITY' && (
                                  <>
                                    <span>最小阈值: {(rule.matchConfig as any).threshold}%</span>
                                  </>
                                )}
                                {rule.matchConfig.kind === 'NATIVE_HIERARCHY' && (
                                  <>
                                    <span>最大层级偏差: {(rule.matchConfig as any).maxLevelGap}</span>
                                    <span>扣分/级: {(rule.matchConfig as any).deductionPerLevel}%</span>
                                  </>
                                )}
                                {rule.matchConfig.kind === 'EXACT' && (
                                  <span>精确匹配</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 1.2 源物料摘要区 */}
            {lastRunContext.searchResult.reference ? (
              <div className="bg-slate-100/80 border border-slate-200/80 rounded-lg px-4 py-2.5 flex flex-wrap items-center gap-x-8 gap-y-1.5 text-xs text-slate-600 shadow-2xs" id="source-summary-stripe">
                <div className="flex items-center space-x-1.5">
                  <span className="font-bold text-slate-800">基准对象属性摘要</span>
                  <span className="text-slate-300">|</span>
                </div>
                <div>
                  <span className="text-slate-400">对象名称:</span>{' '}
                  <span className="font-semibold text-slate-900">{lastRunContext.searchResult.reference.objectName}</span>
                </div>
                <div>
                  <span className="text-slate-400">计划分类:</span>{' '}
                  <span className="font-mono text-slate-800">{lastRunContext.searchResult.reference.classificationPath}</span>
                </div>
                {lastRunContext.searchResult.reference.objectType === 'PART_MECHANICAL' ? (
                  <>
                    <div>
                      <span className="text-slate-400">主要材质:</span>{' '}
                      <span className="font-bold text-slate-900">{lastRunContext.searchResult.reference.attributes.core_material}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">标称直径:</span>{' '}
                      <span className="font-bold text-slate-900">{lastRunContext.searchResult.reference.attributes.nominal_diameter} mm</span>
                    </div>
                    <div>
                      <span className="text-slate-400">标称长度:</span>{' '}
                      <span className="font-bold text-slate-900">
                        {lastRunContext.searchResult.reference.attributes.nominal_length !== undefined && lastRunContext.searchResult.reference.attributes.nominal_length !== null
                          ? `${lastRunContext.searchResult.reference.attributes.nominal_length} ${lastRunContext.searchResult.reference.units?.nominal_length || 'mm'}`
                          : '--'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">螺距:</span>{' '}
                      <span className="font-mono text-slate-800">{lastRunContext.searchResult.reference.attributes.thread_pitch} mm</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <span className="text-slate-400">工作电压:</span>{' '}
                      <span className="font-bold text-slate-900">{lastRunContext.searchResult.reference.attributes.working_voltage} V</span>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 px-4 py-2.5 rounded-lg text-xs text-red-800" id="source-error-stripe">
                {lastRunContext.objectId.trim() === '' ? (
                  <span>请输入基准对象编码</span>
                ) : (
                  <>未找到基准零部件: <strong className="font-mono">{lastRunContext.objectId}</strong> (可试用机械: REQ-2026-000100, 电气: ELEC-2026-000100)</>
                )}
              </div>
            )}

            {/* 1.3 试算结果摘要条 */}
            {!isSecondPhaseEnabled && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs text-red-800 shadow-2xs">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4.5 h-4.5 text-red-600 shrink-0" />
                  <span>
                    <strong>⚠️ 相似度计算受限：</strong>当前选择的物料分类 [{lastRunContext.objectType === 'PART_MECHANICAL' ? '机械零件' : '电气元器件'}] 处于<strong>「已全局停用比分 (计算关闭)」</strong>状态。一阶段检索始终激活，但属性相似度算分、量纲对齐及匹配差异分析已关闭，计算结果归零。
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate?.('field-rules')}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded font-bold transition-colors cursor-pointer shrink-0 text-xs"
                >
                  前往配置端启用
                </button>
              </div>
            )}

            {lastRunContext.searchResult.reference && (
              <div className="bg-amber-50/80 border border-amber-200/80 px-4 py-2.5 rounded-lg flex items-center justify-between text-xs text-amber-800 shadow-2xs" id="sandbox-summary-stripe">
                <div className="flex items-center space-x-2">
                  <Info className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    {isSecondPhaseEnabled ? (
                      <>
                        <strong>沙盒试算结论:</strong> 基准对象与底层库字段属性匹配完成。测试共计算并输出 <strong className="text-slate-950 font-mono">{lastRunContext.searchResult.scoredCandidates.length}</strong> 个属性相似的候选件。其中高相似档 {lastRunContext.searchResult.scoredCandidates.filter(c => c.similarityScore >= 85).length} 个，中相似档 {lastRunContext.searchResult.scoredCandidates.filter(c => c.similarityScore >= 70 && c.similarityScore < 85).length} 个，低相似档 {lastRunContext.searchResult.scoredCandidates.filter(c => c.similarityScore < 70).length} 个。
                      </>
                    ) : (
                      <>
                        <strong>沙盒试算结论：</strong>一阶段检索返回 <strong className="text-slate-950 font-mono">{lastRunContext.searchResult.scoredCandidates.length}</strong> 个有效候选；二阶段相似度计算已停用，本次不输出相似度分数和分档。
                      </>
                    )}
                  </span>
                </div>
                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-semibold shrink-0">
                  沙盒独立验证中
                </span>
              </div>
            )}

            {/* 1.4 全宽候选件结果表 */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden w-full" id="preview-results-container">
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse text-xs min-w-[1250px] xl:min-w-0 xl:w-full" id="preview-results-table">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold font-sans">
                      <th className="px-4 py-3 whitespace-nowrap">候选件编码</th>
                      <th className="px-4 py-3 whitespace-nowrap">名称</th>
                      <th className="px-4 py-3 whitespace-nowrap aux-col-spec">规格/关键尺寸</th>
                      <th className="px-4 py-3 whitespace-nowrap aux-col-mat">材料</th>
                      <th className="px-4 py-3 whitespace-nowrap aux-col-class">分类</th>
                      <th className="px-3 py-3 whitespace-nowrap">生命周期</th>
                      <th className="px-4 py-3 text-center whitespace-nowrap">相似度</th>
                      <th className="px-4 py-3 text-center whitespace-nowrap">分档</th>
                      <th className="px-4 py-3 text-center whitespace-nowrap">覆盖率</th>
                      <th className="px-4 py-3 text-center whitespace-nowrap">命中数</th>
                      <th className="px-4 py-3 text-center whitespace-nowrap">差异数</th>
                      <th className="px-4 py-3 text-center whitespace-nowrap w-32 sticky-ops">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lastRunContext.searchResult.scoredCandidates.map((candidate) => {
                      const isSelected = selectedCandidate?.objectId === candidate.objectId;
                      const scoreColor = !isSecondPhaseEnabled
                        ? 'text-slate-400 font-medium'
                        : candidate.similarityScore >= 85
                        ? 'text-emerald-700 font-extrabold'
                        : candidate.similarityScore >= 70
                        ? 'text-blue-700 font-bold'
                        : 'text-slate-600 font-medium';

                      return (
                        <tr
                          key={candidate.objectId}
                          className={`hover:bg-slate-50/50 transition-colors ${isSelected ? 'bg-blue-50/30' : ''} ${!isSecondPhaseEnabled ? 'opacity-85' : ''}`}
                        >
                          {/* 候选件编码 */}
                          <td className="px-4 py-3 font-mono font-semibold text-slate-700 whitespace-nowrap">
                            {candidate.objectId}
                          </td>

                          {/* 名称 */}
                          <td className="px-4 py-3 font-semibold text-slate-900 truncate max-w-[160px] whitespace-nowrap" title={candidate.objectName}>
                            {candidate.objectName}
                          </td>

                          {/* 规格/关键尺寸 */}
                          <td className="px-4 py-3 font-mono text-slate-800 whitespace-nowrap aux-col-spec">
                            {candidate.specification}
                          </td>

                          {/* 材料 */}
                          <td className="px-4 py-3 font-mono text-slate-600 whitespace-nowrap aux-col-mat">
                            {candidate.material}
                          </td>

                          {/* 分类 */}
                          <td className="px-4 py-3 text-slate-500 font-mono truncate max-w-[160px] whitespace-nowrap aux-col-class" title={candidate.classificationPath}>
                            {candidate.classificationPath}
                          </td>

                          {/* 生命周期 */}
                          <td className="px-3 py-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-xs border ${
                              candidate.lifecycleState === '有效' || candidate.lifecycleState.includes('已发布') || candidate.lifecycleState.includes('Released')
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200/60'
                                : candidate.lifecycleState === '已作废' || candidate.lifecycleState.includes('作废') || candidate.lifecycleState.includes('失效')
                                ? 'bg-rose-50 text-rose-800 border-rose-200/60'
                                : candidate.lifecycleState === '设计中' || candidate.lifecycleState.includes('草稿')
                                ? 'bg-blue-50 text-blue-800 border-blue-200/60'
                                : 'bg-slate-50 text-slate-600 border-slate-200'
                            }`}>
                              {candidate.lifecycleState}
                            </span>
                          </td>

                          {/* 相似度 */}
                          <td className="px-4 py-3 text-center font-bold font-mono whitespace-nowrap">
                            {isSecondPhaseEnabled ? (
                              <span className={`${scoreColor} text-xs`}>{candidate.similarityScore.toFixed(1)}%</span>
                            ) : (
                              <span className="text-slate-400 text-xs font-semibold">0.0%（计算关闭）</span>
                            )}
                          </td>

                          {/* 分档 */}
                          <td className="px-4 py-3 text-center whitespace-nowrap font-medium">
                            {isSecondPhaseEnabled ? (
                              <span className={`px-2 py-0.5 rounded text-[11px] ${
                                candidate.similarityScore >= 85 ? 'bg-emerald-50 text-emerald-800 border border-emerald-100 font-extrabold' :
                                candidate.similarityScore >= 70 ? 'bg-blue-50 text-blue-800 border border-blue-100 font-bold' :
                                'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}>
                                {candidate.similarityScore >= 85 ? '高相似' : candidate.similarityScore >= 70 ? '中相似' : '低相似'}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-400 border border-slate-200 font-normal">
                                计算已停用
                              </span>
                            )}
                          </td>

                          {/* 覆盖率 */}
                          <td className="px-4 py-3 text-center font-mono text-slate-600 whitespace-nowrap">
                            {isSecondPhaseEnabled ? `${candidate.coverageRate}%` : '-'}
                          </td>

                          {/* 命中数 */}
                          <td className="px-4 py-3 text-center font-mono text-slate-600 whitespace-nowrap">
                            {isSecondPhaseEnabled ? `${candidate.fullHitCount} / ${candidate.compareFields.length}` : '-'}
                          </td>

                          {/* 差异数 */}
                          <td className="px-4 py-3 text-center font-mono font-bold text-red-600 whitespace-nowrap">
                            {isSecondPhaseEnabled ? candidate.differenceCount : '-'}
                          </td>

                          {/* 操作 */}
                          <td className="px-4 py-3 text-center whitespace-nowrap sticky-ops">
                            <button
                              type="button"
                              onClick={() => setSelectedCandidate(candidate)}
                              className="px-3 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded border border-slate-300 font-semibold whitespace-nowrap cursor-pointer text-xs transition-colors"
                            >
                              得分明细
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

      </div>

      {/* 1.5 右侧得分明细抽屉（点击后打开） */}
      {selectedCandidate && lastRunContext && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 z-40 transition-opacity"
            onClick={() => setSelectedCandidate(null)}
            id="preview-drawer-backdrop"
          />

          {/* Drawer Element */}
          <div
            id="preview-score-drawer"
            className="fixed right-0 top-0 h-full w-full max-w-[500px] bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200 transition-transform duration-300"
          >
            {/* Drawer Header */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
              <div>
                <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase block">SANDBOX SIMULATION BREAKDOWN</span>
                <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2 mt-0.5">
                  <span>得分明细 - </span>
                  <span className="font-mono text-blue-600 ml-1">{selectedCandidate.objectId}</span>
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCandidate(null)}
                className="p-1 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs text-slate-600">

              {/* Target & Candidate Summary Block */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">模拟源：</span>
                  <strong className="text-slate-800">{lastRunContext.searchResult.reference?.objectName}</strong>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">对比相似候选件：</span>
                  <strong className="text-emerald-700">{selectedCandidate.objectName}</strong>
                </div>
                <div className="border-t border-slate-200/60 my-2"></div>
                <div className="flex justify-between items-center text-xs font-mono">
                  <span>属性相似度总评分:</span>
                  {isSecondPhaseEnabled ? (
                    <span className="text-blue-600 font-extrabold text-sm">{selectedCandidate.similarityScore.toFixed(1)}%</span>
                  ) : (
                    <span className="text-slate-400 font-bold text-xs">0.0% (计算关闭)</span>
                  )}
                </div>
              </div>

              {!isSecondPhaseEnabled ? (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 text-center space-y-3">
                   <AlertTriangle className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="font-bold text-slate-700 text-xs">属性比分不可用</p>
                  <p className="text-slate-500 text-[11px] leading-relaxed">
                    当前分类的属性相似度比分规则在配置端已被管理员关闭（停用）。物理缺口分析和加权分数明细已关闭，仅执行基础检索召回。
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCandidate(null);
                      onNavigate?.('field-rules');
                    }}
                    className="mt-2 inline-flex items-center space-x-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-[11px] cursor-pointer"
                  >
                    <span>去配置端启用该分类</span>
                  </button>
                </div>
              ) : (
                <>
                  {/* Score Breakdown Cards */}
                  <div className="space-y-2.5">
                    <h3 className="font-bold text-slate-800 text-xs flex items-center space-x-1 border-b border-slate-100 pb-1">
                      <span>属性算分拆解 (Stage 2 Attributes)</span>
                    </h3>

                    <div className="grid grid-cols-1 gap-2">
                      {selectedCandidate.compareFields.map((item, idx) => {
                        const scorePct = (item.weightedScore / item.weight) * 100;
                        const pctColor = scorePct >= 100 ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : scorePct >= 70 ? 'text-blue-600 bg-blue-50 border-blue-200' : 'text-amber-600 bg-amber-50 border-amber-200';
                        return (
                          <div key={idx} className="bg-white border border-slate-200 rounded p-2.5 flex items-center justify-between">
                            <div className="space-y-0.5">
                              <span className="font-bold text-slate-800 block text-xs">{item.fieldLabel}</span>
                              <span className="text-slate-400 text-[11px] block leading-normal" title={item.reason}>
                                比对机制: {item.reason}
                              </span>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-mono text-xs font-bold block text-slate-800">
                                {item.weightedScore.toFixed(1)} <span className="text-slate-400 text-[11px] font-normal">/ {item.weight}分</span>
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Matching reasons & Physical differences */}
                  <div className="space-y-2.5">
                    <h3 className="font-bold text-slate-800 text-xs border-b border-slate-100 pb-1">
                      物理属性差异说明
                    </h3>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2.5">
                      <div>
                        <span className="text-slate-400 block mb-0.5">属性匹配分析：</span>
                        <p className="text-slate-700 leading-relaxed font-medium">
                          {selectedCandidate.compareFields
                            .filter(f => f.status !== 'FULL')
                            .map(f => `${f.fieldLabel}: ${f.reason}`)
                            .join('; ') || '核心几何特征参数完全对齐，均属于同一特征螺栓系列规格副。'}
                        </p>
                      </div>
                      <div className="border-t border-slate-200/60 my-2"></div>
                      <div>
                        <span className="text-slate-400 block mb-0.5">命中及相似原因说明：</span>
                        <p className="text-slate-600 leading-relaxed">
                          {selectedCandidate.compareFields
                            .filter(f => f.status === 'FULL')
                            .map(f => `「${f.fieldLabel}」完全一致（值: ${f.sourceValue}）`)
                            .join('、') || '无完全匹配的物理属性'}
                        </p>
                      </div>
                      <div className="border-t border-slate-200/60 my-2"></div>
                      <div className="text-[11px] text-slate-400 flex justify-between">
                        <span>Manticore 检索算分耗时: 3.4 ms</span>
                        <span>规则集状态: 活动</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 shrink-0 text-right">
              <button
                type="button"
                onClick={() => setSelectedCandidate(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold cursor-pointer transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </>
      )}

    </div>
  );
};
