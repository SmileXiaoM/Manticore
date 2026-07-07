import React, { useState } from 'react';
import { 
  Eye, 
  HelpCircle, 
  FileText, 
  GitCompare, 
  AlertCircle, 
  ChevronRight, 
  Clock,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileCheck2,
  X,
  Info
} from 'lucide-react';
import { queryResults } from '../data';
import { QueryResultItem } from '../types';

export const ClientFindSimilarView: React.FC = () => {
  // Use all 5 candidates from our updated queryResults
  const [candidates, setCandidates] = useState<QueryResultItem[]>(queryResults);
  
  // Track interactive states for each candidate (by objectId)
  const [actions, setActions] = useState<Record<string, {
    status: 'BORROWED' | 'REASON_SUBMITTED' | null;
    reasonText?: string;
    isInputting?: boolean;
  }>>({});

  // Reset work loop
  const handleReset = () => {
    setActions({});
    alert('🎉 已重置研发工作台三化审查进度，可重新体验闭环操作。');
  };

  // Perform borrow close loop
  const handleBorrow = (objectId: string) => {
    setActions(prev => ({
      ...prev,
      [objectId]: {
        status: 'BORROWED'
      }
    }));
  };

  // Open reason input panel
  const triggerInputReason = (objectId: string) => {
    setActions(prev => ({
      ...prev,
      [objectId]: {
        status: null,
        isInputting: true,
        reasonText: ''
      }
    }));
  };

  // Close reason input panel
  const cancelInput = (objectId: string) => {
    setActions(prev => {
      const copy = { ...prev };
      delete copy[objectId];
      return copy;
    });
  };

  // Submit reason close loop
  const submitReason = (objectId: string, text: string) => {
    if (!text.trim()) {
      alert('请先输入不复用的技术或业务理由！');
      return;
    }
    setActions(prev => ({
      ...prev,
      [objectId]: {
        status: 'REASON_SUBMITTED',
        reasonText: text,
        isInputting: false
      }
    }));
    alert(`💡 不复用申请理由提交成功。该理由已记录到 Manticore 审计追踪，单据将强制分流至标准化办进行人工二级审查。`);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 font-sans">
      
      {/* High-fidelity Business Application Header (Distinct visual theme - Emerald) */}
      <div className="bg-emerald-800 text-white px-6 py-4 shrink-0 shadow-sm flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2 text-xs text-emerald-200 mb-1">
            <span>PLM 零部件生命周期管理应用端</span>
            <ChevronRight className="w-3 h-3 text-emerald-300" />
            <span>研发设计工作台</span>
            <ChevronRight className="w-3 h-3 text-emerald-300" />
            <span className="text-white font-medium">零部件复用及去重审查</span>
          </div>
          <h1 className="text-lg font-bold">物料申请前置相似性比对（三化审核最小闭环）</h1>
          <p className="text-xs text-emerald-100/90 mt-0.5">
            在物料编码申请（新建）前运行 Manticore 规则引擎，判定物理相似件，实现去重与借用业务流的强制交互闭环。
          </p>
        </div>

        {/* Client Sync Badge */}
        <div className="flex items-center space-x-4">
          <button
            onClick={handleReset}
            className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-xs border border-emerald-500 transition-colors cursor-pointer"
          >
            重置工作台状态
          </button>
          <div className="flex items-center space-x-2 bg-emerald-950/40 border border-emerald-600 px-3 py-1.5 rounded-md text-xs font-mono text-emerald-100">
            <Clock className="w-3.5 h-3.5 text-emerald-300" />
            <span>规则环境: Manticore-v2.4.0 (PROD)</span>
          </div>
        </div>
      </div>

      {/* Main split-panel */}
      <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-5">
        
        {/* Core Warning Box explaining the business usage guidelines */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start space-x-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
          <div className="text-xs text-blue-800 space-y-1">
            <span className="font-bold text-sm block">💡 研发工作台去重业务控制点（防重闭环说明）：</span>
            <p className="leading-relaxed">
              1. <strong>算法打分只是基础</strong>：系统综合相似度分值、字段白名单、一票否决硬规则进行判断。
              <br />
              2. <strong>建议复用不代表系统自动合并</strong>：系统不会替研发直接覆盖代码或物料，而是通过强控交互闭环落实。
              <br />
              3. <strong>闭环出口</strong>：研发要么选择<strong>“直接确认借用”</strong>（申请终止），要么必须<strong>“填写具体不复用原因”</strong>（如强度计算差异）后才允许强制提报新建申请，确保审计链条完整。
            </p>
          </div>
        </div>

        {/* Upper Part: Current Source Object Summary */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-xs p-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 mb-4">
            <span className="text-xs font-bold text-slate-800 flex items-center space-x-2">
              <span className="w-1.5 h-3 bg-emerald-600 rounded-full"></span>
              <span>研发当前正提报申请新建的零件属性（源物料信息）</span>
            </span>
            <span className="text-[11px] bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-medium animate-pulse">
              PLM Manticore 系统去重审查中...
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-5 text-xs text-slate-600">
            <div>
              <span className="text-slate-400 block mb-0.5">申请流水号 (ID):</span>
              <span className="font-mono font-bold text-slate-900 text-sm">PART-2026-000100</span>
            </div>
            
            <div>
              <span className="text-slate-400 block mb-0.5">拟建字段中文名:</span>
              <span className="font-semibold text-slate-900 text-sm">内六角螺栓 M10x50 SUS304</span>
            </div>

            <div>
              <span className="text-slate-400 block mb-0.5">材质 (归一前):</span>
              <span className="font-semibold text-slate-900 font-mono text-sm">SUS304</span>
            </div>

            <div>
              <span className="text-slate-400 block mb-0.5">标称直径/螺距:</span>
              <span className="font-semibold text-slate-900 font-mono text-sm">10mm / 1.5mm</span>
            </div>

            <div>
              <span className="text-slate-400 block mb-0.5">标准分类树路径:</span>
              <span className="font-medium text-slate-800 truncate block font-mono" title="/国家标准分类/紧固件/螺栓/内六角螺栓">
                /国家标准分类/紧固件/螺栓/内六角螺栓
              </span>
            </div>

            <div>
              <span className="text-slate-400 block mb-0.5">图纸状态:</span>
              <span className="font-semibold text-emerald-700 text-sm">设计中 (In Work)</span>
            </div>
          </div>
        </div>

        {/* Lower Part: Similar items results list with Audit & Interaction */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden flex-1 flex flex-col min-h-[500px]">
          
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between shrink-0">
            <span className="text-xs font-semibold text-slate-800 flex items-center space-x-1.5">
              <Eye className="w-4 h-4 text-emerald-600" />
              <span>经由 Manticore 规则引擎检索对齐的“相似已有物料清单”（二阶段计算输出）</span>
            </span>
            <span className="text-[11px] bg-blue-100 text-blue-800 font-mono font-bold px-1.5 py-0.5 rounded">
              三化最小闭环
            </span>
          </div>

          <div className="overflow-auto flex-1">
            <table className="w-full text-left border-collapse text-xs min-w-[1200px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold font-sans">
                  <th className="px-4 py-3 text-center" style={{ width: '80px' }}>算法相似度</th>
                  <th className="px-4 py-3">三化审核决策带结论</th>
                  <th className="px-4 py-3">触发的具体校验规则</th>
                  <th className="px-4 py-3">判定支撑依据 (Reason)</th>
                  <th className="px-4 py-3">已有物料编号</th>
                  <th className="px-4 py-3">已有物料中文名称</th>
                  <th className="px-4 py-3">已有材质牌号</th>
                  <th className="px-3 py-3 text-center">生命周期</th>
                  <th className="px-4 py-3">物理不同差异点详情</th>
                  <th className="px-4 py-3 text-center" style={{ width: '220px' }}>防重选择与闭环处理 (Interaction)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {candidates.map((candidate) => {
                  const state = actions[candidate.objectId];
                  
                  // Similarity score visual styling
                  const scoreColor = candidate.similarityScore >= 90 
                    ? 'text-emerald-700 font-extrabold' 
                    : candidate.similarityScore >= 70 
                    ? 'text-blue-700 font-bold' 
                    : 'text-slate-600 font-medium';

                  return (
                    <tr key={candidate.objectId} className={`hover:bg-slate-50/60 transition-colors ${state?.status ? 'bg-slate-50/70 text-slate-400' : ''}`}>
                      
                      {/* 1. Similarity Score */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center justify-center space-y-1 font-mono">
                          <span className={`${scoreColor} text-sm`}>{candidate.similarityScore.toFixed(1)}%</span>
                          <div className="w-12 bg-slate-100 h-1 rounded-full overflow-hidden">
                            <div className={`h-full ${candidate.similarityScore >= 90 ? 'bg-emerald-500' : candidate.similarityScore >= 70 ? 'bg-blue-500' : 'bg-slate-400'}`} style={{ width: `${candidate.similarityScore}%` }}></div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Audit Suggestion Badges */}
                      <td className="px-4 py-3 font-medium">
                        {candidate.auditSuggestion === 'RECOMMEND_REUSE' ? (
                          <span className="inline-flex items-center space-x-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded px-2.5 py-1 font-bold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>建议复用已有件</span>
                          </span>
                        ) : candidate.auditSuggestion === 'RECOMMEND_REVIEW' ? (
                          <span className="inline-flex items-center space-x-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded px-2.5 py-1 font-bold text-[11px]">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            <span>建议人工复核</span>
                          </span>
                        ) : candidate.auditSuggestion === 'PROHIBIT_REUSE' ? (
                          <span className="inline-flex items-center space-x-1.5 bg-rose-100 text-rose-800 border border-rose-300 rounded px-2.5 py-1 font-extrabold text-[11px]">
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            <span>绝对禁止借用</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1.5 bg-slate-100 text-slate-700 border border-slate-300 rounded px-2.5 py-1 text-[11px]">
                            <Info className="w-3.5 h-3.5 text-slate-500" />
                            <span>允许继续新建</span>
                          </span>
                        )}
                      </td>

                      {/* 3. Triggered Rules */}
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          {(candidate.triggeredRules || []).map((rule, idx) => (
                            <span key={idx} className="block text-[10px] bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded max-w-[180px] truncate" title={rule}>
                              {rule}
                            </span>
                          ))}
                          {(candidate.triggeredRules || []).length === 0 && (
                            <span className="text-slate-400 italic">无强规触发</span>
                          )}
                        </div>
                      </td>

                      {/* 4. Audit Reason */}
                      <td className="px-4 py-3 text-slate-600 leading-relaxed max-w-[240px]" title={candidate.auditReason}>
                        {candidate.auditReason}
                      </td>

                      {/* 5. Object ID */}
                      <td className="px-4 py-3 font-mono font-bold text-slate-800">
                        {candidate.objectId}
                      </td>

                      {/* 6. Object Name */}
                      <td className="px-4 py-3 font-semibold text-slate-900 font-sans">
                        {candidate.objectName}
                      </td>

                      {/* 7. Material */}
                      <td className="px-4 py-3 font-mono text-slate-700">
                        {candidate.material}
                      </td>

                      {/* 8. Lifecycle */}
                      <td className="px-3 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-sans ${
                          candidate.lifecycleState.includes('已发布') || candidate.lifecycleState.includes('Released')
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                            : 'bg-rose-50 text-rose-800 border border-rose-100'
                        }`}>
                          {candidate.lifecycleState}
                        </span>
                      </td>

                      {/* 9. Physical differences details */}
                      <td className="px-4 py-3 text-slate-500 text-[11px]" title={candidate.differenceDetail}>
                        {candidate.differenceDetail || '无明显物理或几何差异'}
                      </td>

                      {/* 10. Core Close Loop Interactive Cell */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        
                        {/* Case 1: Already processed (Closed) */}
                        {state?.status === 'BORROWED' && (
                          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded p-2 text-left space-y-1 whitespace-normal">
                            <div className="flex items-center space-x-1 font-bold text-[11px]">
                              <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>闭环完成: 已确认复用</span>
                            </div>
                            <p className="text-[10px] text-emerald-600">
                              PLM 申请已自动挂载已有编码 <strong>{candidate.objectId}</strong>，临时申请流安全终止。
                            </p>
                          </div>
                        )}

                        {state?.status === 'REASON_SUBMITTED' && (
                          <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded p-2 text-left space-y-1 whitespace-normal">
                            <div className="flex items-center space-x-1 font-bold text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                              <span>闭环完成: 提报二级审核</span>
                            </div>
                            <p className="text-[10px] text-blue-600 font-semibold italic">
                              “{state.reasonText}”
                            </p>
                            <p className="text-[9px] text-slate-400">
                              不复用申辩已存至审计底表，通过人工二级会签后即可批准新建。
                            </p>
                          </div>
                        )}

                        {/* Case 2: Prohibit reuse (Blocked completely) */}
                        {candidate.auditSuggestion === 'PROHIBIT_REUSE' && !state?.status && (
                          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-2 rounded whitespace-normal text-left">
                            <div className="flex items-center space-x-1 font-bold text-[11px] mb-1">
                              <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                              <span>物料已被作废, 严禁借用</span>
                            </div>
                            <p className="text-[10px] text-rose-600 leading-relaxed">
                              触发 HR-003 物理作废硬控。系统已锁闭借用通道，亦不允许以此为候选进行申辩。
                            </p>
                          </div>
                        )}

                        {/* Case 3: Interactive flow controls */}
                        {!state?.status && candidate.auditSuggestion !== 'PROHIBIT_REUSE' && (
                          <div className="flex flex-col space-y-1.5 items-center justify-center">
                            
                            {/* Inputting reason state panel */}
                            {state?.isInputting ? (
                              <div className="w-48 bg-slate-50 border border-slate-300 rounded p-2 text-left flex flex-col space-y-1.5 whitespace-normal">
                                <label className="block text-[10px] font-bold text-slate-700">写明不复用理由 <span className="text-rose-500">*</span></label>
                                <textarea
                                  placeholder="如：50mm长度对强度是抗剪必须，已有45mm不满足力学安全边界。"
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
                                  className="w-full bg-white border border-slate-300 p-1 rounded text-[10px] focus:outline-hidden"
                                />
                                <div className="flex justify-end space-x-1">
                                  <button
                                    onClick={() => cancelInput(candidate.objectId)}
                                    className="p-1 text-slate-500 hover:bg-slate-200 rounded text-[9px]"
                                  >
                                    取消
                                  </button>
                                  <button
                                    onClick={() => submitReason(candidate.objectId, state.reasonText || '')}
                                    className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-[9px]"
                                  >
                                    提交
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                {/* Default buttons */}
                                <button
                                  onClick={() => handleBorrow(candidate.objectId)}
                                  className="w-full px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold transition-all shadow-xs text-[11px]"
                                >
                                  直接确认借用已有件
                                </button>
                                
                                <button
                                  onClick={() => triggerInputReason(candidate.objectId)}
                                  className="w-full px-3 py-1 border border-slate-300 text-slate-700 bg-white hover:bg-slate-100 rounded text-[10px] font-semibold transition-all"
                                >
                                  不复用，坚持提报新建
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
