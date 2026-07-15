import React, { useState } from 'react';
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
import { queryResults } from '../data';
import { QueryResultItem } from '../types';

interface QueryPreviewViewProps {
  onPublishClick: () => void;
}

export const QueryPreviewView: React.FC<QueryPreviewViewProps> = ({ onPublishClick }) => {
  // Query parameters
  const [objectType, setObjectType] = useState('PART_MECHANICAL');
  const [objectId, setObjectId] = useState('PART-2026-000100');
  const [ruleVersion, setRuleVersion] = useState('DRAFT_POOL'); // DRAFT_POOL vs v2.4.0

  // Result loading state simulation
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(true);

  // Filtered sandbox candidates
  const [candidates, setCandidates] = useState<QueryResultItem[]>(queryResults);

  // Selected candidate for detail drawer
  const [selectedCandidate, setSelectedCandidate] = useState<QueryResultItem | null>(null);

  const handleRunSearch = () => {
    setIsSearching(true);
    setTimeout(() => {
      setIsSearching(false);
      setHasSearched(true);

      let filtered = [...queryResults];

      // Filter by objectType
      if (objectType && objectType !== 'ALL') {
        filtered = filtered.filter(c => c.sourceObjectType === objectType);
      }

      // Filter by objectId / keyword matching candidate code or name
      if (objectId.trim()) {
        const idLower = objectId.toLowerCase();
        filtered = filtered.filter(c => 
          c.objectId.toLowerCase().includes(idLower) ||
          c.objectName.toLowerCase().includes(idLower)
        );
      }

      setCandidates(filtered);
    }, 400);
  };

  const handleReset = () => {
    setObjectType('PART_MECHANICAL');
    setObjectId('PART-2026-000100');
    setRuleVersion('DRAFT_POOL');
    setCandidates(queryResults);
    setHasSearched(true);
  };

  // Helper properties to match columns dynamically
  const getSpecification = (cand: QueryResultItem) => {
    const match = cand.objectName.match(/M\d+x\d+/i);
    if (match) {
      return match[0].toUpperCase().replace('X', ' x ');
    }
    return 'M10 x 50';
  };

  const getTier = (score: number) => {
    if (score >= 90) return '高相似';
    if (score >= 70) return '中相似';
    return '低相似';
  };

  const getCoverage = (cand: QueryResultItem) => {
    if (!cand.scoreDetail || cand.scoreDetail.length === 0) return '80%';
    const scoredFieldsCount = cand.scoreDetail.filter(detail => detail.score > 0).length;
    const percentage = Math.round((scoredFieldsCount / cand.scoreDetail.length) * 100);
    return `${percentage}%`;
  };

  const getHitCount = (cand: QueryResultItem) => {
    if (!cand.scoreDetail || cand.scoreDetail.length === 0) return '4 / 5';
    const scoredFieldsCount = cand.scoreDetail.filter(detail => detail.score > 0).length;
    return `${scoredFieldsCount} / ${cand.scoreDetail.length}`;
  };

  const getDiffCount = (cand: QueryResultItem) => {
    if (!cand.scoreDetail || cand.scoreDetail.length === 0) return '1';
    const diffFieldsCount = cand.scoreDetail.filter(detail => detail.score === 0).length;
    return `${diffFieldsCount}`;
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
            管理端沙盒验证工具：验证二阶段各字段属性相似度算分、命中原因解释与字段差异标注，提供全链条模拟对齐。
          </p>
        </div>

        {/* Selected Config Info Box & Publish Button */}
        <div className="flex items-center space-x-3 shrink-0">
          <div className="hidden md:flex flex-col space-y-0.5 text-right text-xs text-slate-500 mr-2">
            <div>
              <span className="text-slate-400">相似度规则版本:</span>{' '}
              <span className="font-mono text-blue-600 font-bold">{ruleVersion === 'DRAFT_POOL' ? '草稿池(最新)' : 'v2.4.0'}</span>
            </div>
            <div className="text-[11px] text-slate-400">
              5 个活动指标已加入检索权重
            </div>
          </div>
          <button 
            id="btn-publish-config"
            onClick={onPublishClick}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold transition-colors shadow-xs cursor-pointer flex items-center space-x-1"
          >
            <Send className="w-3.5 h-3.5" />
            <span>正式发布</span>
          </button>
        </div>
      </div>

      {/* Main Sandbox Content (Vertical layout) */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4" id="preview-scroll-content">
        
        {/* 1.1 顶部查询条件区 */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs" id="preview-filter-section">
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-700">
            
            {/* Object Type */}
            <div className="flex items-center space-x-2">
              <label className="font-medium text-slate-600 shrink-0">物料对象类型:</label>
              <select
                id="select-object-type"
                value={objectType}
                onChange={(e) => setObjectType(e.target.value)}
                className="bg-white border border-slate-300 rounded px-2.5 py-1.5 font-semibold text-slate-700 focus:ring-1 focus:ring-blue-500 text-xs min-w-[180px]"
              >
                <option value="PART_MECHANICAL">机械零件 (PART_MECHANICAL)</option>
                <option value="PART_ELECTRICAL">电气元器件 (PART_ELECTRICAL)</option>
              </select>
            </div>

            {/* Object ID */}
            <div className="flex items-center space-x-2">
              <label className="font-medium text-slate-600 shrink-0">源物料代码:</label>
              <input
                id="input-object-id"
                type="text"
                value={objectId}
                onChange={(e) => setObjectId(e.target.value)}
                className="bg-white border border-slate-300 rounded px-2.5 py-1.5 font-mono text-xs font-bold text-slate-800 focus:ring-1 focus:ring-blue-500 w-44"
              />
            </div>

            {/* Rule Snapshot */}
            <div className="flex items-center space-x-2">
              <label className="font-medium text-slate-600 shrink-0">调试规则版本:</label>
              <select
                id="select-rule-version"
                value={ruleVersion}
                onChange={(e) => setRuleVersion(e.target.value)}
                className="bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:ring-1 focus:ring-blue-500 min-w-[180px]"
              >
                <option value="DRAFT_POOL">当前草稿池规则 (含未发布更改)</option>
                <option value="v2.4.0">线上已发布规则 (v2.4.0)</option>
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2 ml-auto">
              <button
                id="btn-run-sandbox"
                onClick={handleRunSearch}
                disabled={isSearching}
                className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-1.5 rounded text-xs font-semibold shadow-xs flex items-center space-x-1.5 transition-all cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{isSearching ? '计算中...' : '启动沙盒试算'}</span>
              </button>
              <button
                id="btn-reset-sandbox"
                onClick={handleReset}
                className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded text-xs font-medium flex items-center space-x-1 transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>重置</span>
              </button>
            </div>

          </div>
        </div>

        {/* 1.2 源物料摘要区 */}
        <div className="bg-slate-100/80 border border-slate-200/80 rounded-lg px-4 py-2.5 flex flex-wrap items-center gap-x-8 gap-y-1.5 text-xs text-slate-600 shadow-2xs" id="source-summary-stripe">
          <div className="flex items-center space-x-1.5">
            <span className="font-bold text-slate-800">源物料申请信息</span>
            <span className="text-slate-300">|</span>
          </div>
          <div>
            <span className="text-slate-400">申请名称:</span>{' '}
            <span className="font-semibold text-slate-900">内六角螺栓 M10x50 SUS304</span>
          </div>
          <div>
            <span className="text-slate-400">计划分类:</span>{' '}
            <span className="font-mono text-slate-800">/紧固件/螺纹副/内六角螺栓</span>
          </div>
          <div>
            <span className="text-slate-400">主要材质:</span>{' '}
            <span className="font-bold text-slate-900">SUS304</span>
          </div>
          <div>
            <span className="text-slate-400">标称直径:</span>{' '}
            <span className="font-bold text-slate-900">10 mm</span>
          </div>
          <div>
            <span className="text-slate-400">标称长度:</span>{' '}
            <span className="font-bold text-slate-900">50 mm</span>
          </div>
          <div>
            <span className="text-slate-400">螺距:</span>{' '}
            <span className="font-mono text-slate-800">1.5 mm</span>
          </div>
        </div>

        {/* 1.3 试算结果摘要条 */}
        {hasSearched && (
          <div className="bg-amber-50/80 border border-amber-200/80 px-4 py-2.5 rounded-lg flex items-center justify-between text-xs text-amber-800 shadow-2xs" id="sandbox-summary-stripe">
            <div className="flex items-center space-x-2">
              <Info className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>沙盒试算结论:</strong> 模拟申请件与底层库字段属性匹配完成。测试共命中 <strong className="text-slate-950 font-mono">4</strong> 个属性相似的候选件。其中高相似档 1 个，中相似档 2 个，低相似档 1 个。
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
            <table className="w-full text-left border-collapse text-xs min-w-[1100px]" id="preview-results-table">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold">
                  <th className="px-4 py-3 whitespace-nowrap">候选件编码</th>
                  <th className="px-4 py-3 whitespace-nowrap">名称</th>
                  <th className="px-4 py-3 whitespace-nowrap">规格/关键尺寸</th>
                  <th className="px-4 py-3 whitespace-nowrap">材料</th>
                  <th className="px-4 py-3 whitespace-nowrap">分类</th>
                  <th className="px-3 py-3 whitespace-nowrap">生命周期</th>
                  <th className="px-4 py-3 text-center whitespace-nowrap">相似度</th>
                  <th className="px-4 py-3 text-center whitespace-nowrap">分档</th>
                  <th className="px-4 py-3 text-center whitespace-nowrap">覆盖率</th>
                  <th className="px-4 py-3 text-center whitespace-nowrap">命中数</th>
                  <th className="px-4 py-3 text-center whitespace-nowrap">差异数</th>
                  <th className="px-4 py-3 text-center whitespace-nowrap w-32 sticky right-0 bg-slate-100 shadow-[-4px_0_4px_-2px_rgba(0,0,0,0.05)]">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {candidates.map((candidate) => {
                  const isSelected = selectedCandidate?.objectId === candidate.objectId;
                  const scoreColor = candidate.similarityScore >= 90 
                    ? 'text-emerald-700 font-extrabold' 
                    : candidate.similarityScore >= 70 
                    ? 'text-blue-700 font-bold' 
                    : 'text-slate-600 font-medium';

                  return (
                    <tr 
                      key={candidate.objectId} 
                      className={`hover:bg-slate-50/50 transition-colors ${isSelected ? 'bg-blue-50/30' : ''}`}
                    >
                      {/* 候选件编码 */}
                      <td className="px-4 py-3 font-mono font-semibold text-slate-700">
                        {candidate.objectId}
                      </td>

                      {/* 名称 */}
                      <td className="px-4 py-3 font-semibold text-slate-900 truncate max-w-[160px]" title={candidate.objectName}>
                        {candidate.objectName}
                      </td>

                      {/* 规格/关键尺寸 */}
                      <td className="px-4 py-3 font-mono text-slate-800">
                        {getSpecification(candidate)}
                      </td>

                      {/* 材料 */}
                      <td className="px-4 py-3 font-mono text-slate-600">
                        {candidate.material}
                      </td>

                      {/* 分类 */}
                      <td className="px-4 py-3 text-slate-500 font-mono truncate max-w-[160px]" title={candidate.classificationPath}>
                        {candidate.classificationPath}
                      </td>

                      {/* 生命周期 */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs border border-slate-200">
                          {candidate.lifecycleState.split(' ')[0]}
                        </span>
                      </td>

                      {/* 相似度 */}
                      <td className="px-4 py-3 text-center font-bold font-mono">
                        <span className={`${scoreColor} text-xs`}>{candidate.similarityScore.toFixed(1)}%</span>
                      </td>

                      {/* 分档 */}
                      <td className="px-4 py-3 text-center whitespace-nowrap font-medium">
                        <span className={`px-2 py-0.5 rounded text-[11px] ${
                          candidate.similarityScore >= 90 ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' :
                          candidate.similarityScore >= 70 ? 'bg-blue-50 text-blue-800 border border-blue-100' :
                          'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {getTier(candidate.similarityScore)}
                        </span>
                      </td>

                      {/* 覆盖率 */}
                      <td className="px-4 py-3 text-center font-mono text-slate-600">
                        {getCoverage(candidate)}
                      </td>

                      {/* 命中数 */}
                      <td className="px-4 py-3 text-center font-mono text-slate-600">
                        {getHitCount(candidate)}
                      </td>

                      {/* 差异数 */}
                      <td className="px-4 py-3 text-center font-mono font-bold text-red-600">
                        {getDiffCount(candidate)}
                      </td>

                      {/* 操作 */}
                      <td className="px-4 py-3 text-center sticky right-0 bg-white shadow-[-4px_0_4px_-2px_rgba(0,0,0,0.05)] group-hover:bg-slate-50/50">
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

      </div>

      {/* 1.5 右侧得分明细抽屉（点击后打开） */}
      {selectedCandidate && (
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
                  <strong className="text-slate-800">内六角螺栓 M10x50 SUS304</strong>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">对比相似候选件：</span>
                  <strong className="text-emerald-700">{selectedCandidate.objectName}</strong>
                </div>
                <div className="border-t border-slate-200/60 my-2"></div>
                <div className="flex justify-between items-center text-xs font-mono">
                  <span>二阶段相似度总评分:</span>
                  <span className="text-blue-600 font-extrabold text-sm">{selectedCandidate.similarityScore.toFixed(1)}%</span>
                </div>
              </div>

              {/* Score Breakdown Cards */}
              <div className="space-y-2.5">
                <h3 className="font-bold text-slate-800 text-xs flex items-center space-x-1 border-b border-slate-100 pb-1">
                  <span>属性算分拆解 (Stage 2 Attributes)</span>
                </h3>

                <div className="grid grid-cols-1 gap-2">
                  {selectedCandidate.scoreDetail.map((item, idx) => {
                    const scorePct = (item.score / item.weight) * 100;
                    const pctColor = scorePct >= 100 ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : scorePct >= 70 ? 'text-blue-600 bg-blue-50 border-blue-200' : 'text-amber-600 bg-amber-50 border-amber-200';
                    return (
                      <div key={idx} className="bg-white border border-slate-200 rounded p-2.5 flex items-center justify-between">
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-800 block text-xs">{item.fieldName}</span>
                          <span className="text-slate-400 text-[11px] block leading-normal" title={item.matchInfo}>
                            比对机制: {item.matchInfo}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono text-xs font-bold block text-slate-800">
                            {item.score.toFixed(1)} <span className="text-slate-400 text-[11px] font-normal">/ {item.weight}分</span>
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
                    <span className="text-slate-400 block mb-0.5">二阶段属性匹配分析：</span>
                    <p className="text-slate-700 leading-relaxed font-medium">
                      {selectedCandidate.differenceDetail || '核心几何特征参数完全对齐，均属于同一特征螺栓系列规格副。'}
                    </p>
                  </div>
                  <div className="border-t border-slate-200/60 my-2"></div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">命中及相似原因说明：</span>
                    <p className="text-slate-600 leading-relaxed">
                      {selectedCandidate.hitReason}
                    </p>
                  </div>
                  <div className="border-t border-slate-200/60 my-2"></div>
                  <div className="text-[11px] text-slate-400 flex justify-between">
                    <span>Manticore 检索耗时: 3.4 ms</span>
                    <span>规则集状态: 活动</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 shrink-0 text-right">
              <button 
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
