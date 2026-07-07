import React from 'react';
import { 
  Eye, 
  HelpCircle, 
  FileText, 
  GitCompare, 
  AlertCircle, 
  ChevronRight, 
  RefreshCw,
  Clock,
  ArrowRight
} from 'lucide-react';
import { queryResults } from '../data';

export const ClientFindSimilarView: React.FC = () => {
  // Client side strictly uses published v2.4.0 results.
  // We exclude the draft/unconfirmed items, showing clean, finalized comparisons.
  const clientQueryResults = queryResults.filter(r => r.similarityScore >= 70);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 font-sans">
      
      {/* High-fidelity Business Application Header (Distinct visual theme) */}
      <div className="bg-emerald-700 text-white px-6 py-4 shrink-0 shadow-sm flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2 text-xs text-emerald-200 mb-1">
            <span>PLM 零部件生命周期管理应用端</span>
            <ChevronRight className="w-3 h-3 text-emerald-300" />
            <span>研发设计工作台</span>
            <ChevronRight className="w-3 h-3 text-emerald-300" />
            <span className="text-white font-medium">零部件复用及去重审查</span>
          </div>
          <h1 className="text-lg font-bold">物料申请前置相似性比对</h1>
          <p className="text-xs text-emerald-100/90 mt-0.5">
            通过 Manticore 二阶段精确相似矩阵快速审查相似件，倡导标准件借用，严格限制不规则一物多码。
          </p>
        </div>

        {/* Client Sync Badge */}
        <div className="flex items-center space-x-2 bg-emerald-800 border border-emerald-600 px-3 py-1.5 rounded-md text-xs font-mono text-emerald-100">
          <Clock className="w-3.5 h-3.5 text-emerald-300" />
          <span>规则运行环境: 生产 Manticore-v2.4.0</span>
        </div>
      </div>

      {/* Main split-panel */}
      <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-5">
        
        {/* Core Warning Box explaining the business usage guidelines */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start space-x-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
          <div className="text-xs text-blue-800 space-y-1">
            <span className="font-bold text-sm block">💡 业务复用指导规则：</span>
            <p className="leading-relaxed">
              1. 相似件结果由二阶段引擎精确评分输出，仅作为设计时的<strong>“借用复用参考”</strong>，系统<strong>绝不自动</strong>判定或强制删除重复件，最终选型责任仍由设计申请人承担。
              <br />
              2. <strong>数据时效提示：</strong>若存在同步时差，或源物料属性刚刚被修改，请以源设计系统（如 Windchill 或 SAP 节点）中的最新数据为准。
            </p>
          </div>
        </div>

        {/* Upper Part: Current Source Object Summary */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-xs p-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 mb-4">
            <span className="text-xs font-bold text-slate-800 flex items-center space-x-2">
              <span className="w-1.5 h-3 bg-emerald-600 rounded-full"></span>
              <span>待申请新建的物料基本信息摘要 (源对象)</span>
            </span>
            <span className="text-[11px] bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-medium">
              申请去重中
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 text-xs text-slate-600">
            <div>
              <span className="text-slate-400 block mb-0.5">申请临时标识 (ID):</span>
              <span className="font-mono font-bold text-slate-900 text-sm">PART-2026-000100</span>
            </div>
            
            <div>
              <span className="text-slate-400 block mb-0.5">拟新建物料名称:</span>
              <span className="font-semibold text-slate-900 text-sm">内六角螺栓 M10x50 SUS304</span>
            </div>

            <div>
              <span className="text-slate-400 block mb-0.5">主要材质 (归一前):</span>
              <span className="font-semibold text-slate-900 font-mono text-sm">SUS304</span>
            </div>

            <div>
              <span className="text-slate-400 block mb-0.5">标准分类树路径:</span>
              <span className="font-medium text-slate-800 truncate block font-mono" title="/国家标准分类/紧固件/螺栓/内六角螺栓">
                /国家标准分类/紧固件/螺栓/内六角螺栓
              </span>
            </div>

            <div>
              <span className="text-slate-400 block mb-0.5">设计状态 (Lifecycle):</span>
              <span className="font-semibold text-emerald-700 text-sm">设计中 (In Work)</span>
            </div>
          </div>
        </div>

        {/* Lower Part: Similar items results list */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden flex-1 flex flex-col min-h-[400px]">
          
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between shrink-0">
            <span className="text-xs font-semibold text-slate-800 flex items-center space-x-1.5">
              <Eye className="w-4 h-4 text-emerald-600" />
              <span>发现的可能相似物料列表 (已根据 v2.4.0 线上引擎对齐过滤)</span>
            </span>
            <span className="text-[11px] text-slate-500 font-mono">包含命中原因及物理差异详情</span>
          </div>

          <div className="overflow-auto flex-1">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold font-sans">
                  <th className="px-4 py-3 text-center">匹配相似度</th>
                  <th className="px-4 py-3">已有物料编号</th>
                  <th className="px-4 py-3">物料中文名称</th>
                  <th className="px-4 py-3">物料材质 (牌号)</th>
                  <th className="px-4 py-3">所属标准分类路径</th>
                  <th className="px-3 py-3 text-center">生命周期</th>
                  <th className="px-5 py-3">相似命中原因及物理判定说明</th>
                  <th className="px-4 py-3">核心不同差异点字段</th>
                  <th className="px-4 py-3 text-center">防重选择操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clientQueryResults.map((candidate) => {
                  
                  // Progress dial styles
                  const barColor = candidate.similarityScore >= 95 
                    ? 'bg-emerald-500' 
                    : candidate.similarityScore >= 80 
                    ? 'bg-blue-500' 
                    : 'bg-amber-500';

                  const textStyle = candidate.similarityScore >= 95 
                    ? 'text-emerald-700 font-extrabold' 
                    : candidate.similarityScore >= 80 
                    ? 'text-blue-700 font-bold' 
                    : 'text-amber-700 font-bold';

                  return (
                    <tr key={candidate.objectId} className="hover:bg-slate-50/60 transition-colors">
                      {/* Score cell */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center justify-center space-y-1">
                          <span className={`${textStyle} text-sm font-mono`}>{candidate.similarityScore.toFixed(1)}%</span>
                          <div className="w-16 bg-slate-100 h-1 rounded-full overflow-hidden">
                            <div className={`${barColor} h-full`} style={{ width: `${candidate.similarityScore}%` }}></div>
                          </div>
                        </div>
                      </td>

                      {/* Code */}
                      <td className="px-4 py-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                        {candidate.objectId}
                      </td>

                      {/* Name */}
                      <td className="px-4 py-3 font-semibold text-slate-900 font-sans">
                        {candidate.objectName}
                      </td>

                      {/* Material */}
                      <td className="px-4 py-3 font-mono text-slate-700 whitespace-nowrap">
                        {candidate.material}
                      </td>

                      {/* Path */}
                      <td className="px-4 py-3 text-slate-500 font-mono max-w-[150px] truncate" title={candidate.classificationPath}>
                        {candidate.classificationPath}
                      </td>

                      {/* Lifecycle */}
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-sans font-medium">
                          {candidate.lifecycleState.split(' ')[0]}
                        </span>
                      </td>

                      {/* Natural hit reasons */}
                      <td className="px-5 py-3 text-slate-600 leading-relaxed max-w-[280px]">
                        {candidate.hitReason}
                      </td>

                      {/* Differences */}
                      <td className="px-4 py-3">
                        {candidate.diffFields ? (
                          <div className="bg-red-50 text-red-800 border border-red-100 p-2 rounded text-[10px] leading-relaxed">
                            <strong>差异点:</strong> {candidate.diffFields}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">无明显材质或几何差异</span>
                        )}
                      </td>

                      {/* Action cell */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <div className="flex flex-col space-y-1.5 items-center justify-center">
                          <button
                            onClick={() => {
                              alert(`成功！已选择借用已有物料 [${candidate.objectId}]，系统将终止此次临时申请流程。`);
                            }}
                            className="w-full px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold transition-colors"
                          >
                            直接借用此件 (提效)
                          </button>
                          
                          <button
                            onClick={() => {
                              alert(`进入申请流程说明。您需要写明为什么不复用 [${candidate.objectId}]（例如：45mm长度不满足抗剪强度设计计算要求）。`);
                            }}
                            className="w-full px-2.5 py-1 border border-slate-300 text-slate-600 bg-white hover:bg-slate-50 rounded text-[10px] transition-colors"
                          >
                            写明理由继续申请
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
};
