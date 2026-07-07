import React, { useState } from 'react';
import { 
  Eye, 
  HelpCircle, 
  FileText, 
  AlertCircle, 
  ChevronRight, 
  Clock,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileCheck2,
  Info
} from 'lucide-react';
import { queryResults } from '../data';
import { QueryResultItem } from '../types';

export const ClientFindSimilarView: React.FC = () => {
  const [candidates, setCandidates] = useState<QueryResultItem[]>(queryResults);
  const [actions, setActions] = useState<Record<string, {
    status: 'REUSED' | 'REVIEW_INITIATED' | 'NEW_SUBMITTED' | null;
    reasonText?: string;
    isInputting?: boolean;
    isReviewInputting?: boolean;
  }>>({});

  const handleReset = () => {
    setActions({});
    alert('🎉 已重置研发工作台三化审查进度，可重新体验流程。');
  };

  const handleReuse = (objectId: string) => {
    setActions(prev => ({
      ...prev,
      [objectId]: {
        status: 'REUSED'
      }
    }));
    alert(`🎉 借用确认！临时申请流已安全终止，PLM申请件已自动关联至已有编码 ${objectId}。`);
  };

  const handleInitiateReview = (objectId: string) => {
    setActions(prev => ({
      ...prev,
      [objectId]: {
        status: 'REVIEW_INITIATED'
      }
    }));
    alert(`⚡ 复核流程已发起！单据已分流至标准化办会签组进行人工比对复核。`);
  };

  const triggerNewReasonInput = (objectId: string) => {
    setActions(prev => ({
      ...prev,
      [objectId]: {
        status: null,
        isInputting: true,
        reasonText: ''
      }
    }));
  };

  const cancelInput = (objectId: string) => {
    setActions(prev => {
      const copy = { ...prev };
      delete copy[objectId];
      return copy;
    });
  };

  const handleContinueCreate = (objectId: string, text: string) => {
    if (!text.trim()) {
      alert('请填写不借用已有件、坚持新建的技术/业务合理原因！');
      return;
    }
    setActions(prev => ({
      ...prev,
      [objectId]: {
        status: 'NEW_SUBMITTED',
        reasonText: text,
        isInputting: false
      }
    }));
    alert(`✔ 不复用理由提交成功。该原因已记录审计。可以继续提报新建流程。`);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 font-sans">
      
      {/* Sleek Header for Client Application (Clean Green Vibe) */}
      <div className="bg-emerald-800 text-white px-6 py-4 shrink-0 shadow-sm flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2 text-xs text-emerald-200 mb-1">
            <span>研发设计工作台</span>
            <ChevronRight className="w-3 h-3 text-emerald-300" />
            <span className="text-white font-medium">零部件复用与去重审核</span>
          </div>
          <h1 className="text-lg font-bold">物料申请相似件比对（业务端）</h1>
          <p className="text-xs text-emerald-100/90 mt-0.5">
            在物料申请提报前，系统依据 Manticore 计算提供去重评估，辅助研发复用旧件或合理建新。
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleReset}
            className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-xs border border-emerald-500 transition-colors"
          >
            重置工作台状态
          </button>
          <div className="bg-emerald-950/40 border border-emerald-600 px-3 py-1.5 rounded-md text-xs font-mono text-emerald-100">
            <span>规则配置: 2.4.0 线上版本</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* Notice explaining non-automatic decision logic */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
          <div className="text-xs text-blue-800 space-y-1">
            <span className="font-bold text-sm block">💡 业务端审核机制（三化决策闭环）：</span>
            <p className="leading-relaxed">
              系统仅提供比对建议，<strong>不进行自动拦截或覆盖</strong>。若发现高度相似件，研发工程师可选择<strong>“借用已有件”</strong>或<strong>“发起人工复核”</strong>，如认为仍需新建，可点击<strong>“继续新建并填写原因”</strong>，确保审计溯源透明。
            </p>
          </div>
        </div>

        {/* SECTION 1: 待申请新物料信息 */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-xs p-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 mb-4">
            <span className="text-xs font-bold text-slate-800 flex items-center space-x-2">
              <span className="w-1.5 h-3 bg-emerald-600 rounded-full"></span>
              <span>待申请新物料信息</span>
            </span>
            <span className="text-[11px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-medium">
              防重比对中
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs text-slate-600">
            <div>
              <span className="text-slate-400 block mb-0.5">申请流水号:</span>
              <span className="font-mono font-bold text-slate-900 text-sm">REQ-2026-000100</span>
            </div>
            
            <div>
              <span className="text-slate-400 block mb-0.5">申请物料名称:</span>
              <span className="font-semibold text-slate-900 text-sm">内六角螺栓 M10x50 SUS304</span>
            </div>

            <div>
              <span className="text-slate-400 block mb-0.5">材质 / 标称尺寸:</span>
              <span className="font-semibold text-slate-900 font-mono text-sm">SUS304 / 10mm * 50mm</span>
            </div>

            <div>
              <span className="text-slate-400 block mb-0.5">物料计划分类:</span>
              <span className="font-mono text-slate-600 truncate block">
                /标准件/紧固件/螺纹副/内六角螺栓
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 2: 候选相似件列表 */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
          
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
            <span className="text-xs font-semibold text-slate-800 flex items-center space-x-1.5">
              <Eye className="w-4 h-4 text-emerald-600" />
              <span>检测到的相似件列表</span>
            </span>
          </div>

          <div className="overflow-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold">
                  <th className="px-4 py-3 text-center" style={{ width: '80px' }}>相似度</th>
                  <th className="px-4 py-3" style={{ width: '130px' }}>三化建议</th>
                  <th className="px-5 py-3">建议原因</th>
                  <th className="px-4 py-3">差异点</th>
                  <th className="px-4 py-3">已有物料编号</th>
                  <th className="px-4 py-3">已有物料名称</th>
                  <th className="px-4 py-3">材质牌号</th>
                  <th className="px-3 py-3 text-center">生命周期</th>
                  <th className="px-4 py-3 text-center" style={{ width: '220px' }}>防重选择与闭环处理</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {candidates.map((candidate) => {
                  const state = actions[candidate.objectId];
                  const scoreColor = candidate.similarityScore >= 90 
                    ? 'text-emerald-700 font-extrabold' 
                    : candidate.similarityScore >= 70 
                    ? 'text-blue-700 font-bold' 
                    : 'text-slate-600 font-medium';

                  return (
                    <tr key={candidate.objectId} className={`hover:bg-slate-50/50 transition-colors ${state?.status ? 'bg-slate-50/70 text-slate-400' : ''}`}>
                      
                      {/* Similarity */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center justify-center space-y-1 font-mono">
                          <span className={`${scoreColor} text-sm`}>{candidate.similarityScore.toFixed(1)}%</span>
                          <div className="w-12 bg-slate-100 h-1 rounded-full overflow-hidden">
                            <div className={`h-full ${candidate.similarityScore >= 90 ? 'bg-emerald-500' : candidate.similarityScore >= 70 ? 'bg-blue-500' : 'bg-slate-400'}`} style={{ width: `${candidate.similarityScore}%` }}></div>
                          </div>
                        </div>
                      </td>

                      {/* Recommendation */}
                      <td className="px-4 py-3 font-medium">
                        {candidate.auditSuggestion === 'RECOMMEND_REUSE' ? (
                          <span className="inline-flex items-center space-x-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded px-2.5 py-1 font-bold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>建议复用</span>
                          </span>
                        ) : candidate.auditSuggestion === 'RECOMMEND_REVIEW' ? (
                          <span className="inline-flex items-center space-x-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded px-2.5 py-1 font-bold text-[11px]">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            <span>建议复核</span>
                          </span>
                        ) : candidate.auditSuggestion === 'PROHIBIT_REUSE' ? (
                          <span className="inline-flex items-center space-x-1.5 bg-rose-100 text-rose-800 border border-rose-300 rounded px-2.5 py-1 font-extrabold text-[11px]">
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            <span>禁止复用</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1.5 bg-slate-100 text-slate-700 border border-slate-300 rounded px-2.5 py-1 text-[11px]">
                            <Info className="w-3.5 h-3.5 text-slate-500" />
                            <span>允许新建</span>
                          </span>
                        )}
                      </td>

                      {/* Rationale / Recommended reason */}
                      <td className="px-5 py-3 text-slate-600 leading-relaxed max-w-xs" title={candidate.auditReason}>
                        {candidate.auditReason}
                      </td>

                      {/* Diff point */}
                      <td className="px-4 py-3 text-slate-700 font-medium">
                        {candidate.differenceDetail || <span className="text-slate-300 italic">核心物理几何参数一致</span>}
                      </td>

                      {/* Existing ID */}
                      <td className="px-4 py-3 font-mono font-bold text-slate-800">
                        {candidate.objectId}
                      </td>

                      {/* Existing Name */}
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {candidate.objectName}
                      </td>

                      {/* Existing Material */}
                      <td className="px-4 py-3 font-mono text-slate-700">
                        {candidate.material}
                      </td>

                      {/* Lifecycle */}
                      <td className="px-3 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] ${
                          candidate.lifecycleState.includes('已发布') || candidate.lifecycleState.includes('Released')
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                            : 'bg-rose-50 text-rose-800 border border-rose-100'
                        }`}>
                          {candidate.lifecycleState}
                        </span>
                      </td>

                      {/* Interaction Actions */}
                      <td className="px-4 py-3 text-center">
                        {state?.status === 'REUSED' && (
                          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded p-2 text-left space-y-0.5">
                            <span className="font-bold flex items-center space-x-1 text-[11px]">
                              <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>已确认复用已有件</span>
                            </span>
                            <span className="text-[10px] text-emerald-600 block">申请流程终止。</span>
                          </div>
                        )}

                        {state?.status === 'REVIEW_INITIATED' && (
                          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded p-2 text-left space-y-0.5">
                            <span className="font-bold flex items-center space-x-1 text-[11px]">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                              <span>已发起人工复核</span>
                            </span>
                            <span className="text-[10px] text-amber-600 block">分流至标准化办。</span>
                          </div>
                        )}

                        {state?.status === 'NEW_SUBMITTED' && (
                          <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded p-2 text-left space-y-1">
                            <span className="font-bold text-[11px] block">已申辩新建并录入原因:</span>
                            <span className="text-[10px] text-slate-600 font-semibold italic block">“{state.reasonText}”</span>
                          </div>
                        )}

                        {candidate.auditSuggestion === 'PROHIBIT_REUSE' && !state?.status && (
                          <div className="bg-red-50 border border-red-200 text-red-800 p-2 rounded text-left">
                            <span className="font-bold text-[10px] block">该件已失效, 无法借用</span>
                          </div>
                        )}

                        {!state?.status && candidate.auditSuggestion !== 'PROHIBIT_REUSE' && (
                          <div className="flex flex-col space-y-1.5">
                            {state?.isInputting ? (
                              <div className="bg-slate-50 border border-slate-300 rounded p-2 text-left flex flex-col space-y-1.5">
                                <label className="block text-[10px] font-bold text-slate-700">不借用说明 <span className="text-red-500">*</span></label>
                                <textarea
                                  placeholder="请描述不得不新建的技术原因（如公差或强度不同）"
                                  value={state.reasonText || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setActions(prev => ({
                                      ...prev,
                                      [candidate.objectId]: {
                                        ...prev[candidate.objectId],
                                        reasonText: val
                                      }
                                    }));
                                  }}
                                  rows={2}
                                  className="w-full bg-white border border-slate-300 p-1 rounded text-[10px] focus:outline-none"
                                />
                                <div className="flex justify-end space-x-1">
                                  <button onClick={() => cancelInput(candidate.objectId)} className="px-1.5 py-0.5 text-[9px] hover:bg-slate-200 text-slate-500 rounded">取消</button>
                                  <button onClick={() => handleContinueCreate(candidate.objectId, state.reasonText || '')} className="px-2 py-0.5 bg-blue-600 text-white rounded text-[9px] font-semibold">提交</button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleReuse(candidate.objectId)}
                                  className="w-full px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[11px]"
                                >
                                  复用已有件
                                </button>
                                
                                <button
                                  onClick={() => handleInitiateReview(candidate.objectId)}
                                  className="w-full px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded font-bold text-[11px]"
                                >
                                  发起人工复核
                                </button>

                                <button
                                  onClick={() => triggerNewReasonInput(candidate.objectId)}
                                  className="w-full px-2.5 py-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded text-[10px]"
                                >
                                  继续新建并填写原因
                                </button>
                              </>
                            )}
                          </div>
                        )}
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
