import React, { useState } from 'react';
import { 
  Search, 
  Play, 
  CheckCircle, 
  AlertTriangle, 
  ChevronRight, 
  Sliders, 
  Layers, 
  HelpCircle,
  Eye,
  Info,
  ChevronDown,
  ChevronUp
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
      
      {/* Title block */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0 flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2 text-xs text-slate-500 mb-1">
            <span>调试与验证</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-800 font-medium">相似度查询预览</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Manticore 二阶段相似算法沙盒预览</h1>
          <p className="text-xs text-slate-500 mt-1">
            用于对已经配置好的标准规则（支持未发布草稿池规则和历史已发布版本）进行检索跑分验证，调试命中原因和差异高亮是否符合预期。
          </p>
        </div>

        {/* Warning Badge explaining rule constraint */}
        <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-lg flex items-start space-x-2 max-w-md">
          <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <span className="text-[11px] text-amber-800 leading-normal">
            <strong>⚠️ 机制说明：</strong>查询预览可用于验证
            <span className="underline font-bold text-amber-900 mx-1">草稿规则</span>
            或已发布规则；但应用生产端检索（如物料申请防重）<strong>严格且仅</strong>拉取已发布版本。
          </span>
        </div>
      </div>

      {/* Workspace Split */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Left Side: Parameters input & Source Object Key attributes */}
        <div className="w-full lg:w-80 bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto p-4 space-y-4">
          
          {/* Query Params Card */}
          <div className="border border-slate-200 rounded-lg p-3.5 space-y-3.5">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block border-b border-slate-100 pb-1.5">
              1. 设定沙盒运行参数
            </span>

            {/* Selector: Object Type */}
            <div className="space-y-1 text-xs">
              <label className="block text-slate-600 font-medium">物料对象类型:</label>
              <select
                value={objectType}
                onChange={(e) => setObjectType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 text-xs font-medium focus:ring-1 focus:ring-blue-500"
              >
                <option value="PART_MECHANICAL">机械零件 (PART_MECHANICAL)</option>
                <option value="PART_ELECTRICAL">电气元器件 (PART_ELECTRICAL)</option>
              </select>
            </div>

            {/* Input: Object ID */}
            <div className="space-y-1 text-xs">
              <label className="block text-slate-600 font-medium">源对象标识 (ID):</label>
              <div className="flex space-x-1.5">
                <input
                  type="text"
                  value={objectId}
                  onChange={(e) => setObjectId(e.target.value)}
                  placeholder="输入物料标识号"
                  className="flex-1 bg-slate-50 border border-slate-300 rounded p-1.5 font-mono text-xs focus:ring-1 focus:ring-blue-500 font-semibold text-slate-800"
                />
              </div>
            </div>

            {/* Selector: Rule Snapshot Version */}
            <div className="space-y-1 text-xs">
              <label className="block text-slate-600 font-medium">运行规则快照版本:</label>
              <select
                value={ruleVersion}
                onChange={(e) => setRuleVersion(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 text-xs font-semibold focus:ring-1 focus:ring-blue-500"
              >
                <option value="DRAFT_POOL">DRAFT_POOL (当前草稿池 - 包含未发布规则)</option>
                <option value="v2.4.0">v2.4.0 (线上已发布生效版本)</option>
                <option value="v2.3.8">v2.3.8 (历史备份版本)</option>
              </select>
              {ruleVersion === 'DRAFT_POOL' ? (
                <span className="text-[10px] text-amber-600 font-bold block mt-1 animate-pulse">
                  ⚡ 处于未发布草稿调试态
                </span>
              ) : (
                <span className="text-[10px] text-emerald-600 font-semibold block mt-1">
                  ✔ 正在验证已发布配置
                </span>
              )}
            </div>

            {/* Run Button */}
            <button
              onClick={handleRunSearch}
              disabled={isSearching}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded text-xs font-semibold shadow-xs flex items-center justify-center space-x-1.5 transition-all disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isSearching ? '二阶段矩阵重算中...' : '运行沙盒规则匹配'}</span>
            </button>
          </div>

          {/* Source Object Key attributes card */}
          <div className="border border-slate-200 rounded-lg p-3.5 space-y-2.5 bg-slate-50">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                2. 源对象属性预览
              </span>
              <span className="text-[10px] bg-slate-200 px-1 rounded font-mono text-slate-600">
                已拉取
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 block leading-none">对象名称 (Name):</span>
                <span className="font-semibold text-slate-800 text-[11px] block mt-0.5">内六角螺栓 M10x50 SUS304</span>
              </div>
              
              <div>
                <span className="text-[10px] text-slate-500 block leading-none">分类路径 (Category):</span>
                <span className="font-mono text-slate-600 text-[10px] block mt-0.5 truncate" title="/物料分类树/标准件/紧固件/螺纹副/内六角螺栓">
                  .../标准件/紧固件/螺纹副/内六角螺栓
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-500 block leading-none">主要材质:</span>
                  <span className="font-semibold text-slate-800 block mt-0.5 font-mono">SUS304</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block leading-none">标称直径:</span>
                  <span className="font-semibold text-slate-800 block mt-0.5 font-mono">10 mm</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-500 block leading-none">螺距:</span>
                  <span className="font-semibold text-slate-800 block mt-0.5 font-mono">1.5 mm</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block leading-none">生命周期状态:</span>
                  <span className="text-emerald-700 font-semibold block mt-0.5">设计中 (In Work)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Sandbox Stats */}
          <div className="text-[10px] text-slate-400 font-mono text-center pt-2">
            <div>Manticore Compute Time: 4.8ms</div>
            <div>Scored matrix items: 4 candidates</div>
          </div>

        </div>

        {/* Right Side: High-density results & Field scoring breakdown */}
        <div className="flex-1 flex flex-col overflow-hidden p-4 space-y-4">
          
          <div className="bg-white border border-slate-200 rounded-lg p-3.5 flex items-center justify-between shrink-0">
            <span className="text-xs text-slate-500">
              运行结论: 已经使用 <strong className="text-slate-800 font-mono">DRAFT_POOL</strong> 规则快照，成功在二阶段矩阵中对源 <strong className="text-blue-700 font-mono">PART-2026-000100</strong> 进行重算跑分。结果已剔除不匹配的硬过滤，并输出命中自然语言日志。
            </span>
            <button 
              onClick={onPublishClick}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold shadow-xs transition-all shrink-0 ml-4"
            >
              一键发布测试通过草稿
            </button>
          </div>

          {/* Similarity Candidate list */}
          <div className="flex-1 overflow-y-auto">
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
              
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold font-sans">
                    <th className="px-3 py-2.5 text-center">展开得分明细</th>
                    <th className="px-4 py-2.5 text-center">相似度 (%)</th>
                    <th className="px-4 py-2.5">候选对象标识</th>
                    <th className="px-4 py-2.5">对象中文名称</th>
                    <th className="px-4 py-2.5">主要材质</th>
                    <th className="px-4 py-2.5">归一标准分类路径</th>
                    <th className="px-3 py-2.5 text-center">生命周期</th>
                    <th className="px-5 py-2.5">自然语言命中原因日志</th>
                    <th className="px-4 py-2.5 text-center">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {queryResults.map((candidate) => {
                    const isExpanded = expandedRow === candidate.objectId;
                    
                    // Style matching percentages
                    const barColor = candidate.similarityScore >= 95 
                      ? 'bg-emerald-500' 
                      : candidate.similarityScore >= 80 
                      ? 'bg-blue-500' 
                      : candidate.similarityScore >= 70 
                      ? 'bg-amber-500' 
                      : 'bg-slate-400';

                    const textColor = candidate.similarityScore >= 95 
                      ? 'text-emerald-700' 
                      : candidate.similarityScore >= 80 
                      ? 'text-blue-700' 
                      : candidate.similarityScore >= 70 
                      ? 'text-amber-700' 
                      : 'text-slate-600';

                    return (
                      <React.Fragment key={candidate.objectId}>
                        {/* Parent Candidate Row */}
                        <tr className={`hover:bg-slate-50/70 border-b border-slate-100 transition-colors ${isExpanded ? 'bg-slate-50' : ''}`}>
                          {/* Toggle cell */}
                          <td className="px-3 py-3 text-center">
                            <button
                              onClick={() => setExpandedRow(isExpanded ? null : candidate.objectId)}
                              className="p-1 hover:bg-slate-200 rounded text-slate-600"
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-blue-600" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                          </td>

                          {/* Similarity Percentage with high contrast bar */}
                          <td className="px-4 py-3 text-center font-bold font-mono">
                            <div className="flex flex-col items-center justify-center space-y-1">
                              <span className={`${textColor} text-sm font-bold`}>{candidate.similarityScore.toFixed(1)}%</span>
                              <div className="w-16 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                <div className={`${barColor} h-full`} style={{ width: `${candidate.similarityScore}%` }}></div>
                              </div>
                            </div>
                          </td>

                          {/* Candidate ID */}
                          <td className="px-4 py-3 font-mono font-semibold text-slate-800">
                            {candidate.objectId}
                          </td>

                          {/* Candidate Name */}
                          <td className="px-4 py-3 font-semibold text-slate-900 font-sans">
                            {candidate.objectName}
                          </td>

                          {/* Material */}
                          <td className="px-4 py-3 text-slate-700 whitespace-nowrap font-mono">
                            {candidate.material}
                          </td>

                          {/* Class path */}
                          <td className="px-4 py-3 text-slate-500 font-mono max-w-[180px] truncate" title={candidate.classificationPath}>
                            {candidate.classificationPath}
                          </td>

                          {/* Lifecycle */}
                          <td className="px-3 py-3 text-center whitespace-nowrap">
                            <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-sans">
                              {candidate.lifecycleState.split(' ')[0]}
                            </span>
                          </td>

                          {/* Hit reason Template output */}
                          <td className="px-5 py-3 text-slate-600 max-w-[300px] leading-relaxed">
                            <p className="line-clamp-2" title={candidate.hitReason}>{candidate.hitReason}</p>
                            
                            {/* Highlighted Difference box */}
                            {candidate.diffFields && (
                              <div className="mt-1 bg-red-50 text-red-700 border border-red-100 rounded px-1.5 py-0.5 text-[10px] font-sans">
                                <strong>💡 差异差异:</strong> {candidate.diffFields}
                              </div>
                            )}
                          </td>

                          {/* Action Entry */}
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <button
                              onClick={() => {
                                alert(`在 PLM 系统中直接对比源 ${objectId} 与相似件 ${candidate.objectId}！`);
                              }}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-300 font-medium font-sans"
                            >
                              对比零件
                            </button>
                          </td>
                        </tr>

                        {/* Child Score Detail Breakdown accordion row */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={9} className="px-8 py-4 bg-slate-50 border-y border-slate-200">
                              <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3">
                                
                                <span className="font-semibold text-slate-800 block text-xs border-b border-slate-100 pb-1.5">
                                  📊 [Manticore 矩阵跑分明细] {candidate.objectId} 的二阶段权重扣减记录：
                                </span>

                                <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5">
                                  {candidate.scoreDetail.map((scoreItem, sIdx) => {
                                    // Math computation percent
                                    const percent = (scoreItem.score / scoreItem.weight) * 100;
                                    const scoreColor = percent >= 99 
                                      ? 'text-emerald-600' 
                                      : percent >= 80 
                                      ? 'text-blue-600' 
                                      : 'text-amber-600';

                                    return (
                                      <div key={sIdx} className="bg-slate-50 border border-slate-200 rounded p-2.5 space-y-1">
                                        <span className="text-[10px] text-slate-500 block leading-none truncate" title={scoreItem.fieldName}>
                                          {scoreItem.fieldName.split(' ')[0]}
                                        </span>
                                        
                                        <div className="flex items-baseline space-x-1 font-mono">
                                          <span className={`text-base font-bold ${scoreColor}`}>
                                            {scoreItem.score.toFixed(1)}
                                          </span>
                                          <span className="text-[10px] text-slate-400">/ {scoreItem.weight}分</span>
                                        </div>

                                        <span className="text-[10px] text-slate-400 leading-none block font-mono truncate" title={scoreItem.matchInfo}>
                                          {scoreItem.matchInfo}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>

                                <span className="text-[10px] text-slate-400 block pt-1 leading-normal font-sans">
                                  💡 <strong>重算说明：</strong>该相似得分是由各属性所得分数直接累加：{candidate.scoreDetail.map(s => s.score.toFixed(1)).join(' + ')} = <strong>{candidate.similarityScore.toFixed(1)}分</strong>。一阶段全文检索不贡献本分数，二阶段计算已完全激活标准化和同义词规则集。
                                </span>

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
