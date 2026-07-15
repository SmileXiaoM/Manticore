import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Play, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp, 
  SlidersHorizontal,
  Info,
  Send,
  Eye
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
          <h1 className="text-xl font-bold text-slate-900">相似度查询预览</h1>
          <p className="text-xs text-slate-500 mt-1">
            管理端沙盒验证工具：验证二阶段各字段属性相似度算分、命中原因解释与字段差异标注，提供全链条模拟对齐。
          </p>
        </div>

        {/* Selected Config Info Box */}
        <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex flex-col space-y-1 text-xs text-slate-600 max-w-sm">
          <div className="flex items-center justify-between space-x-4">
            <span><strong>字段相似度规则版本:</strong> <span className="font-mono text-blue-600 font-bold">{ruleVersion === 'DRAFT_POOL' ? '草稿池(最新)' : 'v2.4.0'}</span></span>
          </div>
          <div className="flex items-center justify-between space-x-4">
            <span><strong>活动字段算分规则:</strong> <span className="font-bold text-slate-800">5 个活动指标已加入检索权重</span></span>
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
                className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs font-semibold focus:ring-1 focus:ring-blue-500 text-slate-700"
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
                className="w-full bg-white border border-slate-300 rounded p-1.5 font-mono text-xs font-bold text-slate-800 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Rule Snapshot */}
            <div className="space-y-1 text-xs">
              <label className="block text-slate-600 font-medium">调试规则版本:</label>
              <select
                value={ruleVersion}
                onChange={(e) => setRuleVersion(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs font-semibold text-slate-700 focus:ring-1 focus:ring-blue-500"
              >
                <option value="DRAFT_POOL">当前草稿池规则 (含未发布更改)</option>
                <option value="v2.4.0">线上已发布规则 (v2.4.0)</option>
              </select>
            </div>

            {/* Run button */}
            <button
              onClick={handleRunSearch}
              disabled={isSearching}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white p-2 rounded text-xs font-semibold shadow-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
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
                <span className="text-xs text-slate-400 block">拟申请名称:</span>
                <span className="font-semibold text-slate-800 block">内六角螺栓 M10x50 SUS304</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">计划分类:</span>
                <span className="text-slate-600 font-mono block text-xs truncate">
                  /紧固件/螺纹副/内六角螺栓
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-xs text-slate-400 block">主要材质:</span>
                  <span className="font-bold text-slate-800 block">SUS304</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">标称直径:</span>
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
                <strong>沙盒试算结论:</strong> 模拟申请件与底层库字段属性匹配完成。测试共命中 <strong className="text-slate-900 font-mono">4</strong> 个属性相似的候选件。
              </span>
            </div>
            
            <div className="flex items-center space-x-2 shrink-0 ml-4">
              <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                沙盒独立验证中
              </span>
              <button 
                onClick={onPublishClick}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold transition-colors shadow-sm cursor-pointer flex items-center space-x-1"
              >
                <Send className="w-3 h-3" />
                <span>正式发布</span>
              </button>
            </div>
          </div>

          {/* Results Table */}
          <div className="flex-1 overflow-x-auto overflow-y-auto">
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden min-w-[1000px]">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold">
                    <th className="px-3 py-2.5 text-center w-14">得分明细</th>
                    <th className="px-4 py-2.5 text-center w-20">相似度</th>
                    <th className="px-4 py-2.5 w-32">候选物料编号</th>
                    <th className="px-4 py-2.5 w-48">候选物料名称</th>
                    <th className="px-4 py-2.5 w-24">主要材质</th>
                    <th className="px-4 py-2.5 w-48">分类路径</th>
                    <th className="px-3 py-2.5 w-20">生命周期</th>
                    <th className="px-4 py-2.5">命中原因说明</th>
                    <th className="px-4 py-2.5 w-48">字段差异标注</th>
                    <th className="px-3 py-2.5 text-center w-24">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {queryResults.map((candidate) => {
                    const isExpanded = expandedRow === candidate.objectId;

                    return (
                      <React.Fragment key={candidate.objectId}>
                        <tr className={`hover:bg-slate-50/50 border-b border-slate-100 transition-colors ${isExpanded ? 'bg-slate-50' : ''}`}>
                          {/* Toggle cell */}
                          <td className="px-3 py-3 text-center">
                            <button
                              onClick={() => setExpandedRow(isExpanded ? null : candidate.objectId)}
                              className="p-1 hover:bg-slate-200 rounded text-slate-600 flex items-center justify-center mx-auto cursor-pointer"
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
                            <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-xs">
                              {candidate.lifecycleState.split(' ')[0]}
                            </span>
                          </td>

                          {/* Hit reason */}
                          <td className="px-4 py-3 text-slate-600 text-xs" title={candidate.hitReason}>
                            {candidate.hitReason}
                          </td>

                          {/* Diff fields */}
                          <td className="px-4 py-3 text-red-600 font-medium text-xs" title={candidate.diffFields}>
                            {candidate.diffFields || <span className="text-slate-300 italic">无</span>}
                          </td>

                          {/* Comparison action */}
                          <td className="px-3 py-3 text-center">
                            <button
                              onClick={() => alert(`在对齐看板中对比: ${objectId} vs ${candidate.objectId}`)}
                              className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded border border-slate-300 font-medium whitespace-nowrap cursor-pointer text-xs"
                            >
                              属性比对
                            </button>
                          </td>
                        </tr>

                        {/* score breakdown drawer detail row */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={10} className="px-6 py-4 bg-slate-50 border-y border-slate-200">
                              <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-4">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                  <span className="font-bold text-slate-800 text-xs">
                                    [二阶段字段属性算分拆解] {candidate.objectId} 的运行明细：
                                  </span>
                                </div>

                                {/* Score Cards */}
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                  {candidate.scoreDetail.map((item, idx) => {
                                    const scorePct = (item.score / item.weight) * 100;
                                    const pctColor = scorePct >= 100 ? 'text-emerald-600' : scorePct >= 70 ? 'text-blue-600' : 'text-amber-600';
                                    return (
                                      <div key={idx} className="bg-slate-50 border border-slate-200 rounded p-2.5">
                                        <span className="text-xs text-slate-400 block truncate" title={item.fieldName}>{item.fieldName}</span>
                                        <div className="flex items-baseline space-x-1 font-mono mt-0.5">
                                          <span className={`text-base font-bold ${pctColor}`}>{item.score.toFixed(1)}</span>
                                          <span className="text-xs text-slate-400">/ {item.weight}分</span>
                                        </div>
                                        <span className="text-xs text-slate-400 truncate block mt-1 leading-none font-mono" title={item.matchInfo}>
                                          {item.matchInfo}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* Simplified physical attribute difference rationale block */}
                                <div className="border border-slate-100 rounded-lg p-3 bg-slate-50/50 text-xs">
                                  <span className="font-bold text-slate-700 block mb-1">二阶段属性相似度匹配比对说明 (Stage 2):</span>
                                  <p className="text-slate-600 text-xs leading-relaxed">
                                    {candidate.differenceDetail || '核心几何参数一致，属于同一特征螺纹系列。'}
                                  </p>
                                  <div className="text-xs text-slate-400 border-t border-slate-100 pt-1.5 mt-1.5 flex justify-between">
                                    <span><strong>命中匹配说明:</strong> {candidate.hitReason}</span>
                                    <span><strong>Manticore检索耗时:</strong> 3.4 ms</span>
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
