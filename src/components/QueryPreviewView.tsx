import React, { useState } from 'react';
import { 
  Search, 
  Play, 
  CheckCircle2, 
  AlertTriangle, 
  ChevronRight, 
  Sliders, 
  Layers, 
  HelpCircle,
  Eye,
  Info,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  XCircle,
  TrendingUp,
  FileText
} from 'lucide-react';
import { queryResults } from '../data';

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

  // Score detail drawer/accordion toggle
  const [expandedRow, setExpandedRow] = useState<string | null>('PART-2026-000104');

  const handleRunSearch = () => {
    setIsSearching(true);
    setTimeout(() => {
      setIsSearching(false);
      setHasSearched(true);
    }, 400);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
      
      {/* Title Block - Clean & Jargon-free */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs text-slate-500 mb-1">
            <span>验证与应用</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-800 font-medium">相似度查询预览</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">相似度与决策查询预览</h1>
          <p className="text-xs text-slate-500 mt-1">
            管理端沙盒验证工具：同时验证二阶段相似度算分与三阶段三化决策推荐，提供全链条模拟对齐。
          </p>
        </div>

        {/* Selected Config Info Box */}
        <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex flex-col space-y-1 text-[11px] text-slate-600 max-w-md">
          <div className="flex items-center justify-between space-x-4">
            <span><strong>字段相似度规则版本:</strong> <span className="font-mono text-blue-600 font-bold">{ruleVersion === 'DRAFT_POOL' ? '草稿池(最新)' : 'v2.4.0'}</span></span>
            <span><strong>三化决策规则版本:</strong> <span className="font-mono text-amber-600 font-bold">v2.4.0</span></span>
          </div>
          <div className="flex items-center justify-between space-x-4">
            <span><strong>建议复用阈值线:</strong> <span className="font-mono text-emerald-600 font-bold">&gt;= 86%</span></span>
            <span><strong>强控机制验证:</strong> <span className="text-emerald-600 font-semibold">已启用</span></span>
          </div>
        </div>
      </div>

      {/* Main Sandbox Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Left Control Panel */}
        <div className="w-full lg:w-80 bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto p-4 space-y-4">
          
          <div className="border border-slate-200 rounded-lg p-3.5 space-y-3.5 bg-slate-50/50">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block border-b border-slate-200 pb-1.5">
              1. 设定模拟查询源
            </span>

            {/* Object Type */}
            <div className="space-y-1 text-xs">
              <label className="block text-slate-600 font-medium">物料对象类型:</label>
              <select
                value={objectType}
                onChange={(e) => setObjectType(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs font-semibold focus:ring-1 focus:ring-blue-500"
              >
                <option value="PART_MECHANICAL">机械零件 (PART_MECHANICAL)</option>
                <option value="PART_ELECTRICAL">电气元器件 (PART_ELECTRICAL)</option>
              </select>
            </div>

            {/* Object ID */}
            <div className="space-y-1 text-xs">
              <label className="block text-slate-600 font-medium">源物料代码 (模拟输入):</label>
              <input
                type="text"
                value={objectId}
                onChange={(e) => setObjectId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded p-1.5 font-mono text-xs font-bold text-slate-800"
              />
            </div>

            {/* Rule Snapshot */}
            <div className="space-y-1 text-xs">
              <label className="block text-slate-600 font-medium">调试规则版本:</label>
              <select
                value={ruleVersion}
                onChange={(e) => setRuleVersion(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs font-semibold"
              >
                <option value="DRAFT_POOL">当前草稿池规则 (含未发布更改)</option>
                <option value="v2.4.0">线上已发布规则 (v2.4.0)</option>
              </select>
            </div>

            {/* Run button */}
            <button
              onClick={handleRunSearch}
              disabled={isSearching}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white p-2 rounded text-xs font-semibold shadow-xs flex items-center justify-center space-x-1.5 transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isSearching ? '计算模拟结果中...' : '启动沙盒试算'}</span>
            </button>
          </div>

          {/* Core Properties Preview of source part */}
          <div className="border border-slate-200 rounded-lg p-3.5 space-y-2.5 bg-slate-50/50">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block border-b border-slate-200 pb-1.5">
              2. 源物料申请信息
            </span>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block">拟申请名称:</span>
                <span className="font-semibold text-slate-800 block">内六角螺栓 M10x50 SUS304</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">计划分类:</span>
                <span className="text-slate-600 font-mono block text-[10px] truncate">
                  /紧固件/螺纹副/内六角螺栓
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-400 block">主要材质:</span>
                  <span className="font-bold text-slate-800 block">SUS304</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">标称直径:</span>
                  <span className="font-bold text-slate-800 block">10 mm</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Panel: Results & Breakdown */}
        <div className="flex-1 flex flex-col overflow-hidden p-4 space-y-4">
          
          {/* Top Info Alert */}
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex items-center justify-between shrink-0 text-xs text-amber-800">
            <div className="flex items-center space-x-2">
              <Info className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>沙盒试算结论:</strong> 模拟申请件与底层库相似匹配完成。测试命中 <strong className="text-slate-900 font-mono">4</strong> 个候选件，已匹配三化决策规则。
              </span>
            </div>
            
            <div className="flex items-center space-x-2 shrink-0 ml-4">
              <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                沙盒独立验证中
              </span>
              <button 
                onClick={() => {
                  alert("📋 已提交发布申请！沙盒验证相似度与决策模型契合预期。系统已生成发布申请，即将跳转至发布历史说明页进行审计。");
                  onPublishClick();
                }}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold transition-colors shadow-sm"
              >
                提交发布申请
              </button>
            </div>
          </div>

          {/* Results Table */}
          <div className="flex-1 overflow-y-auto">
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold">
                    <th className="px-3 py-2.5 text-center">得分明细</th>
                    <th className="px-4 py-2.5 text-center">相似度</th>
                    <th className="px-4 py-2.5">三化建议</th>
                    <th className="px-4 py-2.5">候选物料编号</th>
                    <th className="px-4 py-2.5">候选物料名称</th>
                    <th className="px-4 py-2.5">主要材质</th>
                    <th className="px-4 py-2.5">分类路径</th>
                    <th className="px-3 py-2.5">生命周期</th>
                    <th className="px-4 py-2.5">命中原因</th>
                    <th className="px-4 py-2.5">差异字段</th>
                    <th className="px-4 py-2.5">触发规则</th>
                    <th className="px-3 py-2.5 text-center">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {queryResults.map((candidate) => {
                    const isExpanded = expandedRow === candidate.objectId;
                    
                    // Determine colors for suggestions and similarities
                    let suggestionBadge = '';
                    let isHitException = false;
                    
                    if (candidate.auditSuggestion === 'RECOMMEND_REUSE') {
                      suggestionBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                    } else if (candidate.auditSuggestion === 'RECOMMEND_REVIEW') {
                      suggestionBadge = 'bg-amber-50 text-amber-700 border-amber-200';
                      isHitException = (candidate.forceReviewReasons || []).length > 0;
                    } else if (candidate.auditSuggestion === 'PROHIBIT_REUSE') {
                      suggestionBadge = 'bg-red-50 text-red-700 border-red-200';
                      isHitException = true;
                    } else {
                      suggestionBadge = 'bg-slate-50 text-slate-600 border-slate-200';
                    }

                    return (
                      <React.Fragment key={candidate.objectId}>
                        <tr className={`hover:bg-slate-50/50 border-b border-slate-100 transition-colors ${isExpanded ? 'bg-slate-50' : ''}`}>
                          {/* Toggle cell */}
                          <td className="px-3 py-3 text-center">
                            <button
                              onClick={() => setExpandedRow(isExpanded ? null : candidate.objectId)}
                              className="p-1 hover:bg-slate-200 rounded text-slate-600 flex items-center justify-center mx-auto"
                              title="查看字段打分明细"
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-blue-600" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                          </td>

                          {/* Similarity Score */}
                          <td className="px-4 py-3 text-center font-bold font-mono text-slate-800">
                            <span className="text-[13px]">{candidate.similarityScore.toFixed(1)}%</span>
                          </td>

                          {/* Three-Standardization Recommendation */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded border font-bold text-[10px] ${suggestionBadge}`}>
                              {candidate.auditSuggestion === 'RECOMMEND_REUSE' ? '建议复用' :
                               candidate.auditSuggestion === 'RECOMMEND_REVIEW' ? '建议复核' :
                               candidate.auditSuggestion === 'PROHIBIT_REUSE' ? '禁止复用' : '允许新建'}
                            </span>
                          </td>

                          {/* Candidate Code */}
                          <td className="px-4 py-3 font-mono font-semibold text-slate-700">
                            {candidate.objectId}
                          </td>

                          {/* Candidate Name */}
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            {candidate.objectName}
                          </td>

                          {/* Material */}
                          <td className="px-4 py-3 font-mono text-slate-600">{candidate.material}</td>

                          {/* Category path */}
                          <td className="px-4 py-3 text-slate-500 font-mono truncate max-w-[120px]" title={candidate.classificationPath}>
                            {candidate.classificationPath}
                          </td>

                          {/* Lifecycle */}
                          <td className="px-3 py-3 whitespace-nowrap">
                            <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px]">
                              {candidate.lifecycleState.split(' ')[0]}
                            </span>
                          </td>

                          {/* Hit reason */}
                          <td className="px-4 py-3 text-slate-600 max-w-xs truncate" title={candidate.hitReason}>
                            {candidate.hitReason}
                          </td>

                          {/* Diff fields */}
                          <td className="px-4 py-3 text-red-600 font-medium max-w-xs truncate" title={candidate.diffFields}>
                            {candidate.diffFields || <span className="text-slate-300 italic">无</span>}
                          </td>

                          {/* Triggered rule */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex flex-wrap gap-1">
                              {(candidate.triggeredRules || []).map((rule, index) => (
                                <span key={index} className="bg-slate-100 text-slate-700 border border-slate-200 px-1 py-0.5 rounded font-mono text-[10px]">
                                  {rule}
                                </span>
                              ))}
                            </div>
                          </td>

                          {/* Comparison action */}
                          <td className="px-3 py-3 text-center">
                            <button
                              onClick={() => alert(`在对齐看板中对比: ${objectId} vs ${candidate.objectId}`)}
                              className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded border border-slate-300 font-medium whitespace-nowrap"
                            >
                              对比明细
                            </button>
                          </td>
                        </tr>

                        {/* score breakdown drawer detail row */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={12} className="px-6 py-4 bg-slate-50 border-y border-slate-200">
                              <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-4">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                  <span className="font-bold text-slate-800 text-xs">
                                    📊 [二阶段字段得分分解与匹配规则跟踪] {candidate.objectId} 的运行明细：
                                  </span>
                                  {isHitException && (
                                    <span className="text-red-600 font-bold text-[10px] bg-red-50 px-2 py-0.5 rounded border border-red-100 flex items-center space-x-1">
                                      <AlertTriangle className="w-3 h-3" />
                                      <span>命中一票否决/强控红线</span>
                                    </span>
                                  )}
                                </div>

                                {/* Score Cards */}
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                  {candidate.scoreDetail.map((item, idx) => {
                                    const scorePct = (item.score / item.weight) * 100;
                                    const pctColor = scorePct >= 100 ? 'text-emerald-600' : scorePct >= 70 ? 'text-blue-600' : 'text-amber-600';
                                    return (
                                      <div key={idx} className="bg-slate-50 border border-slate-200 rounded p-2.5">
                                        <span className="text-[10px] text-slate-400 block truncate" title={item.fieldName}>{item.fieldName}</span>
                                        <div className="flex items-baseline space-x-1 font-mono mt-0.5">
                                          <span className={`text-base font-bold ${pctColor}`}>{item.score.toFixed(1)}</span>
                                          <span className="text-[10px] text-slate-400">/ {item.weight}分</span>
                                        </div>
                                        <span className="text-[10px] text-slate-400 truncate block mt-1 leading-none font-mono" title={item.matchInfo}>
                                          {item.matchInfo}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* Decision summary and Rationale */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans mt-2">
                                  <div className="border border-slate-100 rounded-lg p-3 bg-slate-50/50 space-y-1.5">
                                    <span className="font-bold text-slate-700 block">三化决策链依据:</span>
                                    <p className="text-slate-600 text-[11px] leading-relaxed">
                                      {candidate.auditReason}
                                    </p>
                                    <div className="text-[10px] text-slate-400 border-t border-slate-200/60 pt-1.5 mt-1.5">
                                      <strong>物理材质工艺差异:</strong> {candidate.differenceDetail || '核心几何参数一致，属于同一特征螺纹系列'}
                                    </div>
                                  </div>

                                  <div className="border border-slate-100 rounded-lg p-3 bg-slate-50/50 space-y-1.5">
                                    <span className="font-bold text-slate-700 block">触发强控异常或规则明细:</span>
                                    <div className="space-y-1 text-[11px]">
                                      {(candidate.forceReviewReasons || []).length > 0 && (
                                        <div className="bg-amber-50 text-amber-800 border border-amber-200 rounded p-2">
                                          <strong className="block text-amber-900 mb-0.5">强制降级因素:</strong>
                                          <ul className="list-disc pl-4 space-y-0.5">
                                            {candidate.forceReviewReasons?.map((r, i) => <li key={i}>{r}</li>)}
                                          </ul>
                                        </div>
                                      )}
                                      {(candidate.nonReusableReasons || []).length > 0 && (
                                        <div className="bg-red-50 text-red-800 border border-red-200 rounded p-2">
                                          <strong className="block text-red-900 mb-0.5">绝对禁用指标:</strong>
                                          <ul className="list-disc pl-4 space-y-0.5">
                                            {candidate.nonReusableReasons?.map((r, i) => <li key={i}>{r}</li>)}
                                          </ul>
                                        </div>
                                      )}
                                      {(candidate.forceReviewReasons || []).length === 0 && (candidate.nonReusableReasons || []).length === 0 && (
                                        <span className="text-emerald-700 font-semibold flex items-center space-x-1">
                                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                          <span>未触发任何一票否决指标，完全基于相似度数值计算决策。</span>
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
