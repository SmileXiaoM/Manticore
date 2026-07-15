import React, { useState } from 'react';
import { 
  Eye, 
  HelpCircle, 
  AlertCircle, 
  ChevronRight, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  FileCheck2, 
  Info,
  Layers,
  ArrowLeftRight,
  ArrowRight
} from 'lucide-react';
import { queryResults } from '../data';
import { SimilarityCandidate } from '../types';

export const ClientFindSimilarView: React.FC = () => {
  const [candidates, setCandidates] = useState<SimilarityCandidate[]>(queryResults);
  const [selectedForCompare, setSelectedForCompare] = useState<SimilarityCandidate | null>(queryResults[0]);
  const [actions, setActions] = useState<Record<string, {
    status: 'REUSED' | 'REVIEW_INITIATED' | 'NEW_SUBMITTED' | null;
    reasonText?: string;
    isInputting?: boolean;
    isReviewInputting?: boolean;
  }>>({});

  const handleReset = () => {
    setActions({});
    alert('已重置研发工作台，可以重新体验字段比对和去重闭环。');
  };

  const handleReuse = (objectId: string) => {
    setActions(prev => ({
      ...prev,
      [objectId]: { status: 'REUSED' }
    }));
    alert(`借用确认！临时申请流已终止，PLM申请件已自动关联至库内已有编码 ${objectId}。`);
  };

  const handleInitiateReview = (objectId: string) => {
    setActions(prev => ({
      ...prev,
      [objectId]: { status: 'REVIEW_INITIATED' }
    }));
    alert(`属性复核流程已发起！单据已分流至标准化办会签组进行属性审查。`);
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
      alert('请填写不借用已有件、坚持新建的属性与业务合理原因！');
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
    alert(`不复用理由提交成功。该原因已记录审核。可以继续提报新建流程。`);
  };

  // Helper properties to fulfill the specific columns requested
  const getSpecification = (id: string) => {
    if (id === 'PART-2026-000105') return 'M8 x 50';
    return 'M10 x 50';
  };

  const getTier = (score: number) => {
    if (score >= 90) return '第一档 (极高相似)';
    if (score >= 70) return '第二档 (一般相似)';
    return '第三档 (轻微相似)';
  };

  const getCoverage = (id: string) => {
    if (id === 'PART-2026-000104') return '100%';
    if (id === 'PART-2026-000105') return '60%';
    return '80%';
  };

  const getHitCount = (id: string) => {
    if (id === 'PART-2026-000104') return '5 / 5';
    if (id === 'PART-2026-000105') return '3 / 5';
    return '4 / 5';
  };

  const getDiffCount = (id: string) => {
    if (id === 'PART-2026-000104') return '0';
    if (id === 'PART-2026-000105') return '2';
    return '1';
  };

  // Hardcoded comparison attributes for standard Manticore parts
  const getCompareData = (cand: SimilarityCandidate) => {
    const isM8 = cand.objectId === 'PART-2026-000105';
    const is316 = cand.objectId === 'PART-2026-000106';
    const isCarbon = cand.objectId === 'PART-2026-000107';

    return [
      {
        name: '物料计划分类',
        source: '/紧固件/螺纹副/内六角螺栓',
        candidate: cand.classificationPath,
        diff: '完全一致'
      },
      {
        name: '主要材质牌号',
        source: 'SUS304',
        candidate: cand.material,
        diff: is316 ? '材质差异 (304 vs 316)' : isCarbon ? '材质差异 (304 vs 碳钢)' : '完全一致'
      },
      {
        name: '标称直径 (Diameter)',
        source: '10 mm',
        candidate: isM8 ? '8 mm' : '10 mm',
        diff: isM8 ? '尺寸异常 (10mm vs 8mm)' : '完全一致'
      },
      {
        name: '螺距 (Thread Pitch)',
        source: '1.5 mm',
        candidate: isM8 ? '1.25 mm' : '1.5 mm',
        diff: isM8 ? '螺距差异 (1.5 vs 1.25)' : '完全一致'
      },
      {
        name: '长度 (Length)',
        source: '50 mm',
        candidate: '50 mm',
        diff: '完全一致'
      }
    ];
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 font-sans">
      
      {/* Sleek Header for Client Application (Clean Green Vibe) */}
      <div className="bg-emerald-800 text-white px-6 py-4 shrink-0 shadow-sm flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2 text-xs text-emerald-200 mb-1">
            <span>研发设计工作台</span>
            <ChevronRight className="w-3 h-3 text-emerald-300" />
            <span className="text-white font-medium">零部件去重与字段对齐比对</span>
          </div>
          <h1 className="text-lg font-bold">物料申请相似件比对（业务端）</h1>
          <p className="text-xs text-emerald-100/90 mt-0.5">
            在物料申请提报前，系统依据 Manticore 计算提供字段属性相似件算分与对齐，辅助工程师复用旧件或合理建新。
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleReset}
            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-xs border border-emerald-500 transition-colors cursor-pointer font-semibold"
          >
            重置工作台
          </button>
          <div className="bg-emerald-950/40 border border-emerald-600 px-3 py-1.5 rounded-md text-xs font-mono text-emerald-100 font-bold">
            <span>一阶段/二阶段映射已拉通</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* Notice explaining non-automatic decision logic */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
          <div className="text-xs text-blue-800 space-y-1">
            <span className="font-bold text-sm block">二阶段去重闭环机制：</span>
            <p className="leading-relaxed">
              系统仅提供属性比对匹配算分与差异提示，<strong>不进行自动拦截</strong>。研发工程师可点击<strong>“在对齐看板中对比”</strong>或<strong>“属性比对”</strong>查看各属性对齐细节，自主完成<strong>“复用已有件”</strong>、<strong>“发起属性复核”</strong>或<strong>“继续新建并填写原因”</strong>。
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
            <span className="text-xs bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-medium">
              二阶段防重检测中
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
              <span className="text-slate-400 block mb-0.5">一阶段属性对齐值:</span>
              <span className="font-semibold text-slate-900 font-mono text-sm block">主要材质: SUS304</span>
              <span className="font-semibold text-slate-900 font-mono text-xs block">标称直径: 10mm / 长度: 50mm</span>
            </div>

            <div>
              <span className="text-slate-400 block mb-0.5">分类树路径:</span>
              <span className="font-mono text-slate-600 truncate block">
                /标准件/紧固件/螺纹副/内六角螺栓
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 2: 候选相似件列表 + 对齐看板 */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* Left Table Panel */}
          <div className="xl:col-span-2 bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden flex flex-col">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-800 flex items-center space-x-1.5">
                <Eye className="w-4 h-4 text-emerald-600" />
                <span>属性相似件检索结果 (Manticore)</span>
              </span>
              <span className="text-xs text-slate-400">点击行或“对比”按钮拉起对齐看板</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs min-w-[1000px]">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold font-sans">
                    <th className="px-3 py-3 text-center w-12">序号</th>
                    <th className="px-3 py-3">候选件编码</th>
                    <th className="px-3 py-3">名称</th>
                    <th className="px-3 py-3">规格/关键尺寸</th>
                    <th className="px-3 py-3">材料</th>
                    <th className="px-3 py-3">分类</th>
                    <th className="px-3 py-3 text-center">生命周期</th>
                    <th className="px-3 py-3 text-center">相似度</th>
                    <th className="px-3 py-3 text-center">分档</th>
                    <th className="px-3 py-3 text-center">覆盖率</th>
                    <th className="px-3 py-3 text-center">命中数</th>
                    <th className="px-3 py-3 text-center">差异数</th>
                    <th className="px-3 py-3 text-center w-24">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {candidates.map((candidate, idx) => {
                    const state = actions[candidate.objectId];
                    const isSelected = selectedForCompare?.objectId === candidate.objectId;
                    const scoreColor = candidate.similarityScore >= 90 
                      ? 'text-emerald-700 font-extrabold' 
                      : candidate.similarityScore >= 70 
                      ? 'text-blue-700 font-bold' 
                      : 'text-slate-600 font-medium';

                    return (
                      <tr 
                        key={candidate.objectId} 
                        onClick={() => setSelectedForCompare(candidate)}
                        className={`hover:bg-slate-50/50 transition-colors cursor-pointer ${
                          state?.status ? 'bg-slate-50/70 text-slate-400' : ''
                        } ${isSelected ? 'bg-emerald-50/40 font-medium' : ''}`}
                      >
                        {/* 序号 */}
                        <td className="px-3 py-3 text-center font-mono text-slate-400">
                          {idx + 1}
                        </td>

                        {/* 候选件编码 */}
                        <td className="px-3 py-3 font-mono font-bold text-slate-800">
                          {candidate.objectId}
                        </td>

                        {/* 名称 */}
                        <td className="px-3 py-3 font-semibold text-slate-900 truncate max-w-[110px]" title={candidate.objectName}>
                          {candidate.objectName}
                        </td>

                        {/* 规格/关键尺寸 */}
                        <td className="px-3 py-3 font-semibold text-slate-800">
                          {getSpecification(candidate.objectId)}
                        </td>

                        {/* 材料 */}
                        <td className="px-3 py-3 font-mono text-slate-700">
                          {candidate.material}
                        </td>

                        {/* 分类 */}
                        <td className="px-3 py-3 text-slate-500 font-mono truncate max-w-[120px]" title={candidate.classificationPath}>
                          {candidate.classificationPath}
                        </td>

                        {/* 生命周期 */}
                        <td className="px-3 py-3 text-center whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            candidate.lifecycleState.includes('已发布') || candidate.lifecycleState.includes('Released')
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                              : 'bg-rose-50 text-rose-800 border border-rose-100'
                          }`}>
                            {candidate.lifecycleState.split(' ')[0]}
                          </span>
                        </td>

                        {/* 相似度 */}
                        <td className="px-3 py-3 text-center font-mono">
                          <span className={`${scoreColor} text-xs`}>{candidate.similarityScore.toFixed(1)}%</span>
                        </td>

                        {/* 分档 */}
                        <td className="px-3 py-3 text-center font-semibold text-slate-700 whitespace-nowrap">
                          {getTier(candidate.similarityScore)}
                        </td>

                        {/* 覆盖率 */}
                        <td className="px-3 py-3 text-center font-mono text-slate-600">
                          {getCoverage(candidate.objectId)}
                        </td>

                        {/* 命中数 */}
                        <td className="px-3 py-3 text-center font-mono text-slate-600">
                          {getHitCount(candidate.objectId)}
                        </td>

                        {/* 差异数 */}
                        <td className="px-3 py-3 text-center font-mono font-semibold text-red-600">
                          {getDiffCount(candidate.objectId)}
                        </td>

                        {/* 操作 */}
                        <td className="px-3 py-3 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedForCompare(candidate);
                            }}
                            className={`px-2.5 py-1 text-xs font-bold rounded cursor-pointer ${
                              isSelected ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            属性比对
                          </button>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Comparison Dashboard (对齐看板) */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden flex flex-col">
            <div className="bg-slate-800 text-white px-4 py-3 border-b border-slate-900 flex items-center justify-between">
              <span className="text-xs font-bold flex items-center space-x-1.5">
                <ArrowLeftRight className="w-4 h-4 text-emerald-400" />
                <span>一二阶段字段属性对齐看板</span>
              </span>
              {selectedForCompare && (
                <span className="font-mono text-xs bg-emerald-950 text-emerald-200 px-2 py-0.5 rounded font-bold">
                  {selectedForCompare.objectId}
                </span>
              )}
            </div>

            {selectedForCompare ? (
              <div className="p-4 space-y-4 flex-1 flex flex-col justify-between">
                
                {/* Core Header Comparison */}
                <div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1 mb-4 text-xs text-slate-600">
                    <div className="flex justify-between items-center">
                      <span>待申请物料:</span>
                      <strong className="text-slate-800">REQ-2026-000100</strong>
                    </div>
                    <div className="text-slate-400 font-semibold truncate">内六角螺栓 M10x50 SUS304</div>
                    <div className="border-t border-slate-200/60 my-1.5"></div>
                    <div className="flex justify-between items-center">
                      <span>库内已有件:</span>
                      <strong className="text-slate-800">{selectedForCompare.objectId}</strong>
                    </div>
                    <div className="text-emerald-700 font-semibold truncate">{selectedForCompare.objectName}</div>
                  </div>

                  {/* Attributes Table */}
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    标准一阶段字段值映射对齐明细
                  </span>
                  
                  <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                    <div className="grid grid-cols-3 bg-slate-100 border-b border-slate-200 p-2 font-semibold text-slate-700">
                      <div>属性名称</div>
                      <div>待申请件</div>
                      <div>库内已有件</div>
                    </div>
                    
                    <div className="divide-y divide-slate-100">
                      {getCompareData(selectedForCompare).map((item, idx) => (
                        <div key={idx} className="grid grid-cols-3 p-2 hover:bg-slate-50 transition-colors">
                          <div className="font-medium text-slate-500">{item.name}</div>
                          <div className="font-mono text-slate-900 truncate">{item.source}</div>
                          <div className={`font-mono truncate ${
                            item.diff !== '完全一致' ? 'text-red-600 font-semibold bg-red-50/50 px-1 rounded' : 'text-slate-900'
                          }`}>
                            {item.candidate}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Similarity breakdown text */}
                  <div className="mt-3.5 bg-slate-50 rounded-lg p-3 border border-slate-100 text-xs text-slate-600 space-y-1">
                    <div className="flex justify-between">
                      <strong>字段相似度:</strong>
                      <span className="text-blue-600 font-bold font-mono">{selectedForCompare.similarityScore}%</span>
                    </div>
                    <p className="leading-relaxed">
                      <strong>属性差异标注:</strong> {selectedForCompare.diffFields || '核心材质/螺距属性完全一致，匹配无特征冲突。'}
                    </p>
                  </div>
                </div>

                {/* Workflow Resolution Actions */}
                <div className="border-t border-slate-100 pt-4 mt-4">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    防重去重处置决策
                  </span>

                  {actions[selectedForCompare.objectId]?.status ? (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                      {actions[selectedForCompare.objectId].status === 'REUSED' && (
                        <div className="text-emerald-800 space-y-1">
                          <div className="font-bold flex items-center space-x-1">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>该行候选件已被确认借用复用</span>
                          </div>
                          <p className="text-xs text-emerald-600/90 leading-relaxed">申请提交流已安全拦截并闭环，自动关联已有编码。</p>
                        </div>
                      )}
                      {actions[selectedForCompare.objectId].status === 'REVIEW_INITIATED' && (
                        <div className="text-amber-800 space-y-1">
                          <div className="font-bold flex items-center space-x-1">
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                            <span>已对该候选件提起属性复核</span>
                          </div>
                          <p className="text-xs text-amber-600/90 leading-relaxed">系统已将属性差异分流至标准化会签小组开展会审。</p>
                        </div>
                      )}
                      {actions[selectedForCompare.objectId].status === 'NEW_SUBMITTED' && (
                        <div className="text-blue-800 space-y-1">
                          <div className="font-bold">工程师已确认不借用，录入理由继续提报:</div>
                          <p className="text-xs text-slate-600 bg-white p-2 rounded border border-slate-200 italic font-semibold font-mono">
                            “{actions[selectedForCompare.objectId].reasonText}”
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {actions[selectedForCompare.objectId]?.isInputting ? (
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2 text-xs">
                          <label className="block font-bold text-slate-700">请录入不得不新建的属性差异原因 <span className="text-red-500">*</span></label>
                          <textarea
                            placeholder="如：标称公差或承载极限要求不同"
                            value={actions[selectedForCompare.objectId]?.reasonText || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setActions(prev => ({
                                ...prev,
                                [selectedForCompare.objectId]: {
                                  ...prev[selectedForCompare.objectId],
                                  reasonText: val
                                }
                              }));
                            }}
                            rows={3}
                            className="w-full bg-white border border-slate-300 p-2 rounded text-xs focus:outline-none"
                          />
                          <div className="flex justify-end space-x-2">
                            <button 
                              onClick={() => cancelInput(selectedForCompare.objectId)} 
                              className="px-2.5 py-1 text-slate-500 hover:bg-slate-200 rounded font-semibold text-xs cursor-pointer"
                            >
                              取消
                            </button>
                            <button 
                              onClick={() => handleContinueCreate(selectedForCompare.objectId, actions[selectedForCompare.objectId]?.reasonText || '')} 
                              className="px-3 py-1 bg-blue-600 text-white rounded font-bold text-xs cursor-pointer"
                            >
                              提交原因
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2 text-center text-xs">
                          <button
                            onClick={() => handleReuse(selectedForCompare.objectId)}
                            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold shadow-xs cursor-pointer"
                          >
                            复用已有件
                          </button>
                          
                          <button
                            onClick={() => handleInitiateReview(selectedForCompare.objectId)}
                            className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded font-bold shadow-xs cursor-pointer"
                          >
                            发起属性复核
                          </button>

                          <button
                            onClick={() => triggerNewReasonInput(selectedForCompare.objectId)}
                            className="col-span-2 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded border border-slate-300 font-semibold cursor-pointer"
                          >
                            继续新建并填写原因
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                </div>

              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs flex-1 flex flex-col justify-center items-center">
                <Info className="w-8 h-8 text-slate-300 mb-2" />
                <span>请从左侧列表中选择一行相似件，拉起属性对齐比对看板。</span>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};
