import React, { useState } from 'react';
import { 
  Eye, 
  ChevronRight, 
  CheckCircle2, 
  AlertTriangle, 
  Info,
  ArrowLeftRight,
  RotateCcw,
  Search,
  X,
  FileCheck2,
  SlidersHorizontal
} from 'lucide-react';
import { queryResults } from '../data';
import { SimilarityCandidate } from '../types';

export const ClientFindSimilarView: React.FC = () => {
  // Query Filters State
  const [objectType, setObjectType] = useState('PART_MECHANICAL');
  const [reqCode, setReqCode] = useState('REQ-2026-000100');
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('ALL');
  const [lifecycle, setLifecycle] = useState('ALL');
  const [specInput, setSpecInput] = useState('');
  const [materialInput, setMaterialInput] = useState('');

  // Sandbox search / results mock
  const [candidates, setCandidates] = useState<SimilarityCandidate[]>(queryResults);
  const [selectedForCompare, setSelectedForCompare] = useState<SimilarityCandidate | null>(null);

  // Workflow decisions state
  const [actions, setActions] = useState<Record<string, {
    status: 'REUSED' | 'REVIEW_INITIATED' | 'NEW_SUBMITTED' | null;
    reasonText?: string;
    isInputting?: boolean;
    isReviewInputting?: boolean;
  }>>({});

  const handleSearch = () => {
    // Simulated query action
    if (keyword.trim()) {
      const filtered = queryResults.filter(c => 
        c.objectName.toLowerCase().includes(keyword.toLowerCase()) || 
        c.objectId.toLowerCase().includes(keyword.toLowerCase())
      );
      setCandidates(filtered);
    } else {
      setCandidates(queryResults);
    }
  };

  const handleResetFilters = () => {
    setObjectType('PART_MECHANICAL');
    setReqCode('REQ-2026-000100');
    setKeyword('');
    setCategory('ALL');
    setLifecycle('ALL');
    setSpecInput('');
    setMaterialInput('');
    setCandidates(queryResults);
  };

  const handleReset = () => {
    setActions({});
    handleResetFilters();
    setSelectedForCompare(null);
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
    if (score >= 90) return '高相似';
    if (score >= 70) return '中相似';
    return '低相似';
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
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 font-sans" id="client-similar-container">
      
      {/* 2.1 Corporate Page Header with Reset Tool (普通页面标题与工具栏) */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0 flex items-center justify-between gap-4" id="client-header">
        <div>
          <div className="flex items-center space-x-2 text-xs text-slate-500 mb-1">
            <span>研发设计工作台</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-800 font-medium font-semibold">物料去重与对齐比对</span>
          </div>
          <h1 className="text-lg font-bold text-slate-900">物料申请相似件比对（业务端）</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            在物料申请提报前，系统依据 Manticore 计算提供字段属性相似件算分与对齐，辅助工程师复用旧件或合理建新。
          </p>
        </div>

        <button
          id="btn-reset-workbench"
          onClick={handleReset}
          className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs border border-slate-700 transition-colors cursor-pointer font-semibold flex items-center space-x-1 shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>重置工作台</span>
        </button>
      </div>

      {/* Main Container Scroll area (Vertical hierarchy) */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4" id="client-scroll-area">
        
        {/* 2.2 顶部查询条件区 */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs space-y-3" id="client-query-box">
          
          {/* Row 1 Filter fields */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-700">
            <div className="flex items-center space-x-2">
              <label className="font-medium text-slate-600 shrink-0">物料对象类型:</label>
              <select
                id="client-select-objtype"
                value={objectType}
                onChange={(e) => setObjectType(e.target.value)}
                className="bg-white border border-slate-300 rounded px-2.5 py-1.5 font-semibold text-slate-700 text-xs min-w-[150px]"
              >
                <option value="PART_MECHANICAL">机械零件</option>
                <option value="PART_ELECTRICAL">电气元器件</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <label className="font-medium text-slate-600 shrink-0">申请流水号/参考编码:</label>
              <input
                id="client-input-reqcode"
                type="text"
                value={reqCode}
                onChange={(e) => setReqCode(e.target.value)}
                className="bg-white border border-slate-300 rounded px-2.5 py-1.5 font-mono text-xs text-slate-800 w-40"
              />
            </div>

            <div className="flex items-center space-x-2">
              <label className="font-medium text-slate-600 shrink-0">名称/关键词:</label>
              <input
                id="client-input-keyword"
                type="text"
                value={keyword}
                placeholder="搜索库内候选件名称..."
                onChange={(e) => setKeyword(e.target.value)}
                className="bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 w-44"
              />
            </div>

            <div className="flex items-center space-x-2">
              <label className="font-medium text-slate-600 shrink-0">计划分类:</label>
              <select
                id="client-select-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-700"
              >
                <option value="ALL">全部二级分类</option>
                <option value="BOLT">螺纹副/内六角螺栓</option>
                <option value="OTHER">其他大类</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <label className="font-medium text-slate-600 shrink-0">生命周期:</label>
              <select
                id="client-select-lifecycle"
                value={lifecycle}
                onChange={(e) => setLifecycle(e.target.value)}
                className="bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-700"
              >
                <option value="ALL">全部状态</option>
                <option value="RELEASED">已发布 (Released)</option>
                <option value="DRAFT">研究/草稿 (Draft)</option>
              </select>
            </div>
          </div>

          {/* Row 2 More conditions (Horizontal aligning) */}
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs border-t border-slate-100 pt-3">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center space-x-2">
                <label className="font-medium text-slate-500 shrink-0">规格描述/关键尺寸:</label>
                <input
                  id="client-input-spec"
                  type="text"
                  placeholder="如: M10 x 50"
                  value={specInput}
                  onChange={(e) => setSpecInput(e.target.value)}
                  className="bg-white border border-slate-300 rounded px-2.5 py-1.2 w-32 text-xs"
                />
              </div>

              <div className="flex items-center space-x-2">
                <label className="font-medium text-slate-500 shrink-0">材质要求:</label>
                <input
                  id="client-input-material"
                  type="text"
                  placeholder="如: SUS304"
                  value={materialInput}
                  onChange={(e) => setMaterialInput(e.target.value)}
                  className="bg-white border border-slate-300 rounded px-2.5 py-1.2 w-32 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                id="client-btn-search"
                onClick={handleSearch}
                className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-1.5 rounded text-xs font-semibold shadow-2xs flex items-center space-x-1 cursor-pointer transition-colors"
              >
                <Search className="w-3.5 h-3.5" />
                <span>查询相似件</span>
              </button>
              <button
                id="client-btn-clear"
                onClick={handleResetFilters}
                className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded text-xs font-medium cursor-pointer transition-colors"
              >
                <span>清空条件</span>
              </button>
            </div>
          </div>

        </div>

        {/* 2.3 待申请物料摘要区 (Compact read-only full-width summary strip) */}
        <div className="bg-slate-100 border border-slate-200 rounded-lg px-4 py-3 flex flex-wrap items-center gap-x-8 gap-y-1.5 text-xs text-slate-600 shadow-2xs" id="client-target-summary">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-800">待申请物料</span>
            <span className="text-slate-300">|</span>
          </div>
          <div>
            <span className="text-slate-400">申请流水号:</span>{' '}
            <span className="font-mono font-bold text-slate-900">{reqCode}</span>
          </div>
          <div>
            <span className="text-slate-400">申请物料名称:</span>{' '}
            <span className="font-semibold text-slate-900">内六角螺栓 M10x50 SUS304</span>
          </div>
          <div>
            <span className="text-slate-400">主要材质:</span>{' '}
            <span className="font-mono font-bold text-slate-900">SUS304</span>
          </div>
          <div>
            <span className="text-slate-400">标称直径/长度:</span>{' '}
            <span className="font-bold text-slate-900">Diameter: 10mm / Length: 50mm</span>
          </div>
          <div>
            <span className="text-slate-400">计划分类路径:</span>{' '}
            <span className="font-mono text-slate-700">/标准件/紧固件/螺纹副/内六角螺栓</span>
          </div>
        </div>

        {/* 2.4 全宽候选件结果表 (occupies full width) */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden w-full" id="client-results-box">
          
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center shrink-0">
            <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
              <Eye className="w-4 h-4 text-emerald-600" />
              <span>属性相似件检索结果 (Manticore 实时比对)</span>
            </span>
            <span className="text-xs text-slate-400 font-medium">共检索到 {candidates.length} 条相似件纪录，点击“字段对比”进行去重闭环。</span>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse text-xs min-w-[1200px]" id="client-results-table">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold">
                  <th className="px-3 py-3 text-center w-12 whitespace-nowrap">序号</th>
                  <th className="px-3 py-3 whitespace-nowrap">候选件编码</th>
                  <th className="px-4 py-3 whitespace-nowrap">名称</th>
                  <th className="px-3 py-3 whitespace-nowrap">规格/关键尺寸</th>
                  <th className="px-3 py-3 whitespace-nowrap">材料</th>
                  <th className="px-4 py-3 whitespace-nowrap">分类</th>
                  <th className="px-3 py-3 text-center whitespace-nowrap">生命周期</th>
                  <th className="px-3 py-3 text-center whitespace-nowrap">相似度</th>
                  <th className="px-3 py-3 text-center whitespace-nowrap">分档</th>
                  <th className="px-3 py-3 text-center whitespace-nowrap">覆盖率</th>
                  <th className="px-3 py-3 text-center whitespace-nowrap">命中数</th>
                  <th className="px-3 py-3 text-center whitespace-nowrap">差异数</th>
                  <th className="px-4 py-3 text-center whitespace-nowrap w-40 sticky right-0 bg-slate-100 shadow-[-4px_0_4px_-2px_rgba(0,0,0,0.05)]">操作</th>
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
                      className={`hover:bg-slate-50/50 transition-colors ${
                        state?.status ? 'bg-slate-50/70 text-slate-400' : ''
                      } ${isSelected ? 'bg-emerald-50/30' : ''}`}
                    >
                      {/* 序号 */}
                      <td className="px-3 py-3 text-center font-mono text-slate-400 whitespace-nowrap">
                        {idx + 1}
                      </td>

                      {/* 候选件编码 */}
                      <td className="px-3 py-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                        {candidate.objectId}
                      </td>

                      {/* 名称 */}
                      <td className="px-4 py-3 font-semibold text-slate-950 truncate max-w-[150px]" title={candidate.objectName}>
                        {candidate.objectName}
                      </td>

                      {/* 规格/关键尺寸 */}
                      <td className="px-3 py-3 font-semibold text-slate-800 whitespace-nowrap font-mono">
                        {getSpecification(candidate.objectId)}
                      </td>

                      {/* 材料 */}
                      <td className="px-3 py-3 font-mono text-slate-700 whitespace-nowrap">
                        {candidate.material}
                      </td>

                      {/* 分类 */}
                      <td className="px-4 py-3 text-slate-500 font-mono truncate max-w-[150px]" title={candidate.classificationPath}>
                        {candidate.classificationPath}
                      </td>

                      {/* 生命周期 */}
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[11px] ${
                          candidate.lifecycleState.includes('已发布') || candidate.lifecycleState.includes('Released')
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                            : 'bg-rose-50 text-rose-800 border border-rose-100'
                        }`}>
                          {candidate.lifecycleState.split(' ')[0]}
                        </span>
                      </td>

                      {/* 相似度 */}
                      <td className="px-3 py-3 text-center font-mono whitespace-nowrap">
                        <span className={`${scoreColor} text-xs`}>{candidate.similarityScore.toFixed(1)}%</span>
                      </td>

                      {/* 分档 */}
                      <td className="px-3 py-3 text-center font-semibold text-slate-700 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[11px] ${
                          candidate.similarityScore >= 90 ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' :
                          candidate.similarityScore >= 70 ? 'bg-blue-50 text-blue-800 border border-blue-100' :
                          'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {getTier(candidate.similarityScore)}
                        </span>
                      </td>

                      {/* 覆盖率 */}
                      <td className="px-3 py-3 text-center font-mono text-slate-600 whitespace-nowrap">
                        {getCoverage(candidate.objectId)}
                      </td>

                      {/* 命中数 */}
                      <td className="px-3 py-3 text-center font-mono text-slate-600 whitespace-nowrap">
                        {getHitCount(candidate.objectId)}
                      </td>

                      {/* 差异数 */}
                      <td className="px-3 py-3 text-center font-mono font-semibold text-red-600 whitespace-nowrap">
                        {getDiffCount(candidate.objectId)}
                      </td>

                      {/* 操作 */}
                      <td className="px-4 py-3 text-center sticky right-0 bg-white shadow-[-4px_0_4px_-2px_rgba(0,0,0,0.05)]">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedForCompare(candidate)}
                            className="px-2.5 py-1 text-xs font-bold rounded cursor-pointer border border-slate-300 text-slate-700 bg-slate-50 hover:bg-slate-100 transition-colors whitespace-nowrap"
                          >
                            字段对比
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

      {/* 2.5 属性对比抽屉 (点击拉起，默认关闭，固定在右侧覆盖而不挤压主表) */}
      {selectedForCompare && (
        <>
          {/* Drawer Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/40 z-40 transition-opacity"
            onClick={() => setSelectedForCompare(null)}
            id="client-drawer-backdrop"
          />
          
          {/* Drawer Sidebar */}
          <div 
            id="client-comparison-drawer"
            className="fixed right-0 top-0 h-full w-full max-w-[540px] bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200 transition-transform duration-300"
          >
            {/* Header */}
            <div className="bg-slate-800 text-white px-5 py-4 border-b border-slate-900 flex items-center justify-between shrink-0">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold tracking-wider text-emerald-400 uppercase flex items-center space-x-1">
                  <ArrowLeftRight className="w-3 h-3" />
                  <span>二阶段精密属性对齐看板</span>
                </span>
                <h2 className="text-sm font-bold flex items-center space-x-2">
                  <span>对齐比对:</span>
                  <span className="font-mono text-emerald-200">{selectedForCompare.objectId}</span>
                </h2>
              </div>
              
              <div className="flex items-center space-x-2.5">
                <span className="text-[11px] bg-slate-700/70 text-emerald-300 border border-slate-600 px-2 py-0.5 rounded font-mono font-bold shrink-0">
                  一/二阶段映射拉通
                </span>
                <button 
                  onClick={() => setSelectedForCompare(null)}
                  className="p-1 hover:bg-slate-700 text-slate-300 hover:text-white rounded transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs text-slate-600">
              
              {/* Reference Header Panel */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">待申请流(源) :</span>
                  <strong className="text-slate-900 font-mono">REQ-2026-000100</strong>
                </div>
                <div className="text-slate-700 font-semibold truncate leading-normal">
                  内六角螺栓 M10x50 SUS304
                </div>
                
                <div className="border-t border-slate-200/60 my-2"></div>
                
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">已有候选(目标) :</span>
                  <strong className="text-emerald-700 font-mono">{selectedForCompare.objectId}</strong>
                </div>
                <div className="text-emerald-800 font-semibold truncate leading-normal">
                  {selectedForCompare.objectName}
                </div>
              </div>

              {/* Mapped Table Comparison Details */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 flex items-center space-x-1">
                  <span>一阶段/二阶段映射字段对齐细节</span>
                </span>
                
                <div className="border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
                  <div className="grid grid-cols-3 bg-slate-100 border-b border-slate-200 p-2.5 font-semibold text-slate-700 text-xs">
                    <div>物理属性字段</div>
                    <div>待申请件</div>
                    <div>库内已有件</div>
                  </div>
                  
                  <div className="divide-y divide-slate-100 text-xs">
                    {getCompareData(selectedForCompare).map((item, idx) => (
                      <div key={idx} className="grid grid-cols-3 p-2.5 hover:bg-slate-50 transition-colors">
                        <div className="font-semibold text-slate-500">{item.name}</div>
                        <div className="font-mono text-slate-800 truncate">{item.source}</div>
                        <div className={`font-mono truncate font-medium ${
                          item.diff !== '完全一致' ? 'text-red-600 font-bold bg-red-50 px-1.5 rounded border border-red-100' : 'text-slate-800'
                        }`}>
                          {item.candidate}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Rationale and score info */}
              <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200 text-xs text-slate-600 space-y-2">
                <div className="flex justify-between items-center">
                  <strong className="text-slate-700">Manticore 计算得分:</strong>
                  <span className="text-blue-600 font-bold font-mono bg-blue-50 border border-blue-200 px-2 py-0.5 rounded text-xs">
                    {selectedForCompare.similarityScore.toFixed(1)}%相似度 ({getTier(selectedForCompare.similarityScore)})
                  </span>
                </div>
                <div>
                  <strong className="text-slate-700 block mb-0.5">属性差异诊断:</strong>
                  <p className="leading-relaxed bg-white p-2 rounded border border-slate-100 text-slate-600">
                    {selectedForCompare.diffFields || '核心材质、尺寸与螺纹螺距属性一致，匹配算分无特征冲突。'}
                  </p>
                </div>
              </div>

              {/* Core Governance Decisions (处置决策) */}
              <div className="border-t border-slate-200 pt-4 space-y-3">
                <span className="text-xs font-bold text-slate-800 flex items-center space-x-1">
                  <span>三化防重去重处置决策</span>
                </span>

                {actions[selectedForCompare.objectId]?.status ? (
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                    {actions[selectedForCompare.objectId].status === 'REUSED' && (
                      <div className="text-emerald-800 space-y-1">
                        <div className="font-bold flex items-center space-x-1 text-xs">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>已确认借用并复用该已有件</span>
                        </div>
                        <p className="text-[11px] text-emerald-600/90 leading-relaxed">
                          当前待提报物料已被安全退档，PLM申请直接关联至已有编码 {selectedForCompare.objectId}。
                        </p>
                      </div>
                    )}
                    {actions[selectedForCompare.objectId].status === 'REVIEW_INITIATED' && (
                      <div className="text-amber-800 space-y-1">
                        <div className="font-bold flex items-center space-x-1 text-xs">
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                          <span>已提起属性复核申请</span>
                        </div>
                        <p className="text-[11px] text-amber-600/90 leading-relaxed">
                          系统已成功自动分发会签任务至标准化办审核小组，进行一二阶段精细字段审核。
                        </p>
                      </div>
                    )}
                    {actions[selectedForCompare.objectId].status === 'NEW_SUBMITTED' && (
                      <div className="text-blue-800 space-y-2">
                        <div className="font-bold text-xs">已强制新建并提报，合理排除原因:</div>
                        <p className="text-[11px] text-slate-700 bg-white p-2.5 rounded border border-slate-200 italic font-mono font-semibold">
                          “{actions[selectedForCompare.objectId].reasonText}”
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {actions[selectedForCompare.objectId]?.isInputting ? (
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2.5 text-xs">
                        <label className="block font-bold text-slate-700">
                          请录入不得借用已有件、坚持新建的合理业务差异原因 <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          placeholder="例如：对公差和拉伸极限承重强度的标准要求更高，或工厂装配空间受限差异..."
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
                          className="w-full bg-white border border-slate-300 p-2.5 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none text-slate-800"
                        />
                        <div className="flex justify-end space-x-2">
                          <button 
                            onClick={() => cancelInput(selectedForCompare.objectId)} 
                            className="px-3 py-1.5 text-slate-500 hover:bg-slate-200 rounded font-semibold text-xs cursor-pointer transition-colors"
                          >
                            取消
                          </button>
                          <button 
                            onClick={() => handleContinueCreate(selectedForCompare.objectId, actions[selectedForCompare.objectId]?.reasonText || '')} 
                            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-xs cursor-pointer transition-colors"
                          >
                            提交原因
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 text-center text-xs">
                        <button
                          onClick={() => handleReuse(selectedForCompare.objectId)}
                          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold shadow-2xs cursor-pointer transition-colors"
                        >
                          复用已有件
                        </button>
                        
                        <button
                          onClick={() => handleInitiateReview(selectedForCompare.objectId)}
                          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded font-bold shadow-2xs cursor-pointer transition-colors"
                        >
                          发起属性复核
                        </button>

                        <button
                          onClick={() => triggerNewReasonInput(selectedForCompare.objectId)}
                          className="col-span-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded border border-slate-300 font-semibold cursor-pointer transition-colors"
                        >
                          继续新建并填写原因
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 shrink-0 text-right">
              <button 
                onClick={() => setSelectedForCompare(null)}
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
