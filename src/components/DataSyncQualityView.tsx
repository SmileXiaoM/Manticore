import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  RotateCcw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Play,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  X,
  Copy,
  Check,
  RefreshCw,
  FileText,
  ShieldAlert,
  Info,
  Layers,
  Database
} from 'lucide-react';
import {
  SyncBatch,
  SyncFailedRecord,
  SyncRootType,
  SyncStatus,
  HandlingNote,
  getSyncStatusMeta,
  getRootTypeDisplayName,
  getSyncMethodLabel,
  getTriggerTypeLabel
} from '../syncQualityTypes';
import { initialSyncBatches } from '../syncQualityData';

interface DataSyncQualityViewProps {
  initialSelectedBatchId?: string | null;
  onClearSelectedBatchId?: () => void;
}

export const DataSyncQualityView: React.FC<DataSyncQualityViewProps> = ({
  initialSelectedBatchId,
  onClearSelectedBatchId
}) => {
  // 批次数据状态
  const [batches, setBatches] = useState<SyncBatch[]>(initialSyncBatches);

  // 筛选条件：只保留根类型、同步状态、批次号或任务名称搜索、重置
  const [selectedRootType, setSelectedRootType] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // 抽屉详情选中批次
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(initialSelectedBatchId || null);

  // 折叠技术信息状态字典 (recordId -> boolean)
  const [expandedTechIds, setExpandedTechIds] = useState<Record<string, boolean>>({});

  // 复制 TraceId 状态
  const [copiedTraceId, setCopiedTraceId] = useState<string | null>(null);

  // 处理说明输入框状态
  const [newNoteContent, setNewNoteContent] = useState<string>('');

  // 重试失败数据中的 loading 状态
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const [retrySuccessBatches, setRetrySuccessBatches] = useState<Record<string, boolean>>({});

  // Toast 消息
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'warning' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'warning' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // 外部传入 initialSelectedBatchId 时响应
  useEffect(() => {
    if (initialSelectedBatchId) {
      setSelectedBatchId(initialSelectedBatchId);
      if (onClearSelectedBatchId) {
        onClearSelectedBatchId();
      }
    }
  }, [initialSelectedBatchId, onClearSelectedBatchId]);

  // 重置筛选
  const handleResetFilters = () => {
    setSelectedRootType('ALL');
    setSelectedStatus('ALL');
    setSearchKeyword('');
  };

  // 过滤后的批次列表
  const filteredBatches = useMemo(() => {
    return batches.filter(batch => {
      // 根类型筛选
      if (selectedRootType !== 'ALL') {
        if (!batch.rootTypes.includes(selectedRootType as SyncRootType)) {
          return false;
        }
      }
      // 同步状态筛选
      if (selectedStatus !== 'ALL') {
        if (batch.executionStatus !== selectedStatus) {
          return false;
        }
      }
      // 关键词搜索
      if (searchKeyword.trim()) {
        const kw = searchKeyword.trim().toLowerCase();
        const matchId = batch.id.toLowerCase().includes(kw);
        const matchJob = batch.jobName.toLowerCase().includes(kw);
        if (!matchId && !matchJob) {
          return false;
        }
      }
      return true;
    });
  }, [batches, selectedRootType, selectedStatus, searchKeyword]);

  // 顶部一行紧凑统计
  const summaryMetrics = useMemo(() => {
    const total = batches.length;
    const running = batches.filter(b => b.executionStatus === 'RUNNING').length;
    const partialSuccess = batches.filter(b => b.executionStatus === 'PARTIAL_SUCCESS').length;
    const failed = batches.filter(b => b.executionStatus === 'FAILED').length;
    return { total, running, partialSuccess, failed };
  }, [batches]);

  // 当前选中的批次详情对象
  const activeBatch = useMemo(() => {
    if (!selectedBatchId) return null;
    return batches.find(b => b.id === selectedBatchId) || null;
  }, [batches, selectedBatchId]);

  // 切换折叠技术信息
  const toggleTechDetail = (recordId: string) => {
    setExpandedTechIds(prev => ({
      ...prev,
      [recordId]: !prev[recordId]
    }));
  };

  // 复制 TraceId
  const handleCopyTraceId = (traceId: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(traceId).catch(() => {});
    }
    setCopiedTraceId(traceId);
    showToast(`已复制追踪ID: ${traceId}`, 'success');
    setTimeout(() => {
      setCopiedTraceId(prev => (prev === traceId ? null : prev));
    }, 2000);
  };

  // 添加处理说明（不改变同步状态，不自动关闭异常）
  const handleAddHandlingNote = () => {
    if (!activeBatch || !newNoteContent.trim()) return;

    const newNote: HandlingNote = {
      id: `NOTE-${Date.now()}`,
      content: newNoteContent.trim(),
      operator: '李晓华 (数据管理员)',
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
    };

    setBatches(prev =>
      prev.map(b => {
        if (b.id === activeBatch.id) {
          return {
            ...b,
            handlingNotes: [newNote, ...(b.handlingNotes || [])]
          };
        }
        return b;
      })
    );

    setNewNoteContent('');
    showToast('处理说明已成功保存', 'success');
  };

  // 重试失败数据
  const handleRetryFailedRecords = () => {
    if (!activeBatch || isRetrying) return;

    const retryableRecords = activeBatch.failedRecords.filter(r => r.retryable);
    if (retryableRecords.length === 0) {
      showToast('当前批次中无支持重试的异常数据', 'warning');
      return;
    }

    setIsRetrying(true);

    setTimeout(() => {
      setIsRetrying(false);
      setRetrySuccessBatches(prev => ({
        ...prev,
        [activeBatch.id]: true
      }));

      // 更新批次中的异常明细重试状态为 SUCCESS，并记录处理说明
      setBatches(prev =>
        prev.map(b => {
          if (b.id === activeBatch.id) {
            const updatedRecords = b.failedRecords.map(rec => {
              if (rec.retryable) {
                return {
                  ...rec,
                  latestRetryResult: 'SUCCESS' as const
                };
              }
              return rec;
            });

            const retryNote: HandlingNote = {
              id: `NOTE-RETRY-${Date.now()}`,
              content: `已成功发起对 ${retryableRecords.length} 条可重试失败数据的定向重新清洗与同步。`,
              operator: '李晓华 (数据管理员)',
              createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
            };

            return {
              ...b,
              failedRecords: updatedRecords,
              handlingNotes: [retryNote, ...(b.handlingNotes || [])]
            };
          }
          return b;
        })
      );

      showToast(`已成功重试 ${retryableRecords.length} 条失败数据，结果均已成功写入`, 'success');
    }, 1200);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f2f3f4] overflow-hidden text-slate-800 relative font-sans">
      {/* Toast 提示 */}
      {toastMessage && (
        <div className="fixed top-16 right-8 z-50 transition-all duration-300 transform translate-y-0">
          <div
            className={`px-4 py-2.5 rounded-[4px] shadow-lg text-xs font-medium flex items-center space-x-2 border ${
              toastMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : toastMessage.type === 'warning'
                ? 'bg-amber-50 text-amber-800 border-amber-300'
                : 'bg-blue-50 text-blue-800 border-blue-300'
            }`}
          >
            {toastMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
            {toastMessage.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />}
            {toastMessage.type === 'info' && <Info className="w-4 h-4 text-blue-600 shrink-0" />}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* 主工作区 */}
      <div className="flex-1 flex flex-col overflow-y-auto p-4 md:p-6 space-y-4">
        {/* 顶部标题与简短说明 (R5.1, R6.1) */}
        <div className="bg-white border border-[#d9dbde] rounded-[4px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div>
            <div className="flex items-center space-x-2">
              <Database className="w-5 h-5 text-blue-600" />
              <h1 className="text-base font-semibold text-[#010d23]">数据同步记录</h1>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-[2px] font-medium">
                一阶段检索底座
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              查看每次同步是否完成、成功和异常数量，以及需要重试的失败数据。单条数据异常不会中断整个批次；只有任务无法继续执行时才标记为同步失败。
            </p>
          </div>
        </div>

        {/* 顶部紧凑摘要卡片：一行展示 4 个关键指标 (R6.2) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white border border-[#d9dbde] rounded-[4px] p-3 flex items-center justify-between shadow-xs">
            <div>
              <span className="text-xs text-slate-500 block">批次总数</span>
              <span className="text-xl font-bold text-[#010d23] mt-0.5 block">{summaryMetrics.total}</span>
            </div>
            <div className="w-8 h-8 rounded-[4px] bg-slate-100 flex items-center justify-center text-slate-600">
              <Layers className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-white border border-[#d9dbde] rounded-[4px] p-3 flex items-center justify-between shadow-xs">
            <div>
              <span className="text-xs text-slate-500 block">同步中数量</span>
              <span className="text-xl font-bold text-blue-600 mt-0.5 block">{summaryMetrics.running}</span>
            </div>
            <div className="w-8 h-8 rounded-[4px] bg-blue-50 flex items-center justify-center text-blue-600">
              <RefreshCw className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-white border border-[#d9dbde] rounded-[4px] p-3 flex items-center justify-between shadow-xs">
            <div>
              <span className="text-xs text-slate-500 block">同步完成（有异常）</span>
              <span className="text-xl font-bold text-amber-600 mt-0.5 block">{summaryMetrics.partialSuccess}</span>
            </div>
            <div className="w-8 h-8 rounded-[4px] bg-amber-50 flex items-center justify-center text-amber-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-white border border-[#d9dbde] rounded-[4px] p-3 flex items-center justify-between shadow-xs">
            <div>
              <span className="text-xs text-slate-500 block">同步失败数量</span>
              <span className="text-xl font-bold text-rose-600 mt-0.5 block">{summaryMetrics.failed}</span>
            </div>
            <div className="w-8 h-8 rounded-[4px] bg-rose-50 flex items-center justify-center text-rose-600">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* 筛选条件栏 (R6.3: 只保留根类型、同步状态、批次号或任务名称搜索、重置) */}
        <div className="bg-white border border-[#d9dbde] rounded-[4px] p-3.5 shadow-xs flex flex-wrap items-center gap-3">
          {/* 根类型筛选 */}
          <div className="flex items-center space-x-1.5 text-xs">
            <span className="text-slate-600 font-medium whitespace-nowrap">根类型:</span>
            <select
              value={selectedRootType}
              onChange={e => setSelectedRootType(e.target.value)}
              className="bg-white border border-[#d9dbde] rounded-[4px] px-2.5 py-1.5 text-xs text-slate-700 hover:border-slate-400 focus:border-blue-500 focus:outline-hidden"
            >
              <option value="ALL">全部根类型</option>
              <option value="Part">零部件 (Part)</option>
              <option value="Document">文档 (Document)</option>
              <option value="Process">工艺路线 (Process)</option>
            </select>
          </div>

          {/* 同步状态筛选 */}
          <div className="flex items-center space-x-1.5 text-xs">
            <span className="text-slate-600 font-medium whitespace-nowrap">同步状态:</span>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="bg-white border border-[#d9dbde] rounded-[4px] px-2.5 py-1.5 text-xs text-slate-700 hover:border-slate-400 focus:border-blue-500 focus:outline-hidden"
            >
              <option value="ALL">全部状态</option>
              <option value="RUNNING">同步中</option>
              <option value="SUCCESS">同步完成</option>
              <option value="PARTIAL_SUCCESS">同步完成（有异常）</option>
              <option value="FAILED">同步失败</option>
            </select>
          </div>

          {/* 批次号或任务名称搜索 */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="搜索批次编号或任务名称..."
              value={searchKeyword}
              onChange={e => setSearchKeyword(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-[#d9dbde] rounded-[4px] focus:outline-hidden focus:border-blue-500 hover:border-slate-400 text-slate-800 placeholder-slate-400"
            />
          </div>

          {/* 重置筛选按钮 */}
          <button
            onClick={handleResetFilters}
            className="flex items-center space-x-1 px-3 py-1.5 border border-[#d9dbde] rounded-[4px] text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3 text-slate-500" />
            <span>重置</span>
          </button>

          {/* 结果数量提示 */}
          <div className="ml-auto text-xs text-slate-400">
            共 <span className="font-medium text-slate-700">{filteredBatches.length}</span> 条批次记录
          </div>
        </div>

        {/* 列表表格卡片 (R6.4) */}
        <div className="bg-white border border-[#d9dbde] rounded-[4px] shadow-xs overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse min-w-[760px]">
              <thead>
                <tr className="bg-slate-50 text-slate-600 text-xs font-semibold border-b border-[#d9dbde]">
                  <th className="py-3 px-4 w-[240px]">同步批次</th>
                  <th className="py-3 px-3 w-[160px]">根类型</th>
                  <th className="py-3 px-3 w-[170px]">同步时间</th>
                  <th className="py-3 px-3">数据结果</th>
                  <th className="py-3 px-3 w-[150px]">同步状态</th>
                  <th className="py-3 px-4 text-right w-[140px]">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ebecee]">
                {filteredBatches.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Info className="w-8 h-8 text-slate-300" />
                        <span className="text-sm font-medium">未找到符合筛选条件的同步记录</span>
                        <button
                          onClick={handleResetFilters}
                          className="text-xs text-blue-600 hover:underline mt-1 cursor-pointer"
                        >
                          清空筛选条件查看全部
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredBatches.map(batch => {
                    const statusMeta = getSyncStatusMeta(batch.executionStatus);
                    const isSelected = selectedBatchId === batch.id;

                    return (
                      <tr
                        key={batch.id}
                        onClick={() => setSelectedBatchId(batch.id)}
                        className={`transition-colors cursor-pointer hover:bg-slate-50/80 ${
                          isSelected ? 'bg-blue-50/50' : ''
                        }`}
                      >
                        {/* 1. 同步批次 */}
                        <td className="py-3 px-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-sm text-[#010d23] hover:text-blue-600 transition-colors">
                              {batch.id}
                            </span>
                            <span className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                              {batch.jobName}
                            </span>
                            <div className="flex items-center space-x-1.5 mt-1 text-[11px] text-slate-400">
                              <span>{getSyncMethodLabel(batch.syncMethod)}</span>
                              <span>·</span>
                              <span>{getTriggerTypeLabel(batch.triggerType)}</span>
                            </div>
                          </div>
                        </td>

                        {/* 2. 根类型 (多选展示) */}
                        <td className="py-3 px-3">
                          <div className="flex flex-wrap gap-1">
                            {batch.rootTypes.map(rt => (
                              <span
                                key={rt}
                                className="inline-flex items-center px-1.5 py-0.5 rounded-[2px] bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200"
                              >
                                {getRootTypeDisplayName(rt)}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* 3. 同步时间 */}
                        <td className="py-3 px-3">
                          <div className="flex flex-col text-xs">
                            <span className="text-slate-800">{batch.startTime}</span>
                            <span className="text-slate-500 mt-0.5 flex items-center">
                              <Clock className="w-3 h-3 mr-1 text-slate-400 shrink-0" />
                              {batch.executionStatus === 'RUNNING' ? '进行中' : batch.durationText || '已完成'}
                            </span>
                          </div>
                        </td>

                        {/* 4. 数据结果 (数量口径严格自洽) */}
                        <td className="py-3 px-3">
                          <div className="flex flex-col text-xs">
                            <div className="flex items-center space-x-2">
                              <span className="text-slate-700">总数: <strong>{batch.sourceDataCount.toLocaleString()}</strong></span>
                              <span className="text-emerald-700">成功: {batch.successCount.toLocaleString()}</span>
                              {batch.failedCount > 0 && (
                                <span className="text-amber-700 font-semibold">
                                  异常: {batch.failedCount.toLocaleString()}
                                </span>
                              )}
                            </div>
                            {/* 运行中展示正在处理数 */}
                            {batch.executionStatus === 'RUNNING' && (
                              <span className="text-blue-600 text-[11px] mt-0.5">
                                正在处理 {batch.sourceDataCount - batch.successCount - batch.failedCount - batch.skippedCount} 条
                              </span>
                            )}
                            {/* 跳过数不计为异常提示 */}
                            {batch.skippedCount > 0 && (
                              <span className="text-slate-500 text-[11px] mt-0.5">
                                跳过 {batch.skippedCount} 条，不计为同步异常
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 5. 同步状态 (统一业务状态) */}
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-[2px] text-xs font-medium border ${statusMeta.bgClass} ${statusMeta.textClass} ${statusMeta.borderClass}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 shrink-0 ${statusMeta.dotClass}`}></span>
                            {statusMeta.label}
                          </span>
                        </td>

                        {/* 6. 操作 */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            {batch.failedCount > 0 ? (
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  setSelectedBatchId(batch.id);
                                }}
                                className="px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-[4px] border border-amber-200 transition-colors cursor-pointer"
                              >
                                查看异常
                              </button>
                            ) : (
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  setSelectedBatchId(batch.id);
                                }}
                                className="px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-[4px] border border-blue-200 transition-colors cursor-pointer"
                              >
                                查看详情
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 单层详情抽屉 (R5.3, R9: 从上到下的顺序) */}
      {activeBatch && (
        <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/30 backdrop-blur-xs transition-opacity animate-in fade-in duration-150">
          <div className="w-full max-w-xl sm:max-w-2xl bg-white h-full shadow-2xl flex flex-col border-l border-[#d9dbde] z-50 overflow-hidden">
            {/* 抽屉头部 */}
            <div className="px-5 py-4 border-b border-[#d9dbde] flex items-center justify-between bg-slate-50/60 shrink-0">
              <div className="flex items-center space-x-2.5">
                <Database className="w-4 h-4 text-blue-600" />
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-sm font-bold text-[#010d23]">同步批次详情</h2>
                    <span className="text-xs font-mono font-medium text-slate-600">
                      {activeBatch.id}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 block mt-0.5">{activeBatch.jobName}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedBatchId(null)}
                className="w-8 h-8 rounded-[4px] text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center transition-colors cursor-pointer"
                title="关闭抽屉"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 抽屉内容区 (自上而下单层线性展示) */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-sm text-slate-800">
              {/* 1. 同步结果摘要 (R9.1) */}
              <div className="bg-slate-50/80 border border-[#d9dbde] rounded-[4px] p-4 space-y-2.5">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">同步结果摘要</h3>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white border border-[#ebecee] rounded-[4px] p-2.5 text-center">
                    <span className="text-xs text-slate-500 block">同步总数</span>
                    <span className="text-base font-bold text-slate-900 mt-0.5 block">
                      {activeBatch.sourceDataCount.toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-white border border-[#ebecee] rounded-[4px] p-2.5 text-center">
                    <span className="text-xs text-emerald-600 block">成功数量</span>
                    <span className="text-base font-bold text-emerald-700 mt-0.5 block">
                      {activeBatch.successCount.toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-white border border-[#ebecee] rounded-[4px] p-2.5 text-center">
                    <span className="text-xs text-amber-600 block">异常数量</span>
                    <span className="text-base font-bold text-amber-700 mt-0.5 block">
                      {activeBatch.failedCount.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* 跳过说明 / 正在处理说明 */}
                {activeBatch.skippedCount > 0 && (
                  <div className="text-xs text-slate-600 bg-white/70 p-2 rounded-[4px] border border-[#ebecee] flex items-center space-x-1.5">
                    <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>跳过 {activeBatch.skippedCount} 条，不计为同步异常。</span>
                  </div>
                )}
                {activeBatch.executionStatus === 'RUNNING' && (
                  <div className="text-xs text-blue-700 bg-blue-50/70 p-2 rounded-[4px] border border-blue-200 flex items-center space-x-1.5">
                    <RefreshCw className="w-3.5 h-3.5 text-blue-600 shrink-0 animate-spin" />
                    <span>
                      正在处理 {activeBatch.sourceDataCount - activeBatch.successCount - activeBatch.failedCount - activeBatch.skippedCount} 条数据...
                    </span>
                  </div>
                )}
              </div>

              {/* 2. 同步基本信息 (R9.2: 根类型、开始时间、结束时间、同步方式、触发方式、同步状态，无软类型无版本) */}
              <div className="border border-[#d9dbde] rounded-[4px] p-4 space-y-3">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">同步基本信息</h3>
                <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
                  <div>
                    <span className="text-slate-400 block">根类型:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {activeBatch.rootTypes.map(rt => (
                        <span
                          key={rt}
                          className="px-1.5 py-0.5 rounded-[2px] bg-slate-100 text-slate-700 font-medium border border-slate-200"
                        >
                          {getRootTypeDisplayName(rt)}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 block">同步状态:</span>
                    <div className="mt-1">
                      {(() => {
                        const meta = getSyncStatusMeta(activeBatch.executionStatus);
                        return (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-[2px] text-xs font-medium border ${meta.bgClass} ${meta.textClass} ${meta.borderClass}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 shrink-0 ${meta.dotClass}`}></span>
                            {meta.label}
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 block">开始时间:</span>
                    <span className="text-slate-800 font-mono mt-0.5 block">{activeBatch.startTime}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block">结束时间:</span>
                    <span className="text-slate-800 font-mono mt-0.5 block">
                      {activeBatch.endTime || '正在运行中'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block">同步方式:</span>
                    <span className="text-slate-800 mt-0.5 block">{getSyncMethodLabel(activeBatch.syncMethod)}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block">触发方式:</span>
                    <span className="text-slate-800 mt-0.5 block">{getTriggerTypeLabel(activeBatch.triggerType)}</span>
                  </div>
                </div>

                {activeBatch.statusNote && (
                  <div className="pt-2 border-t border-[#ebecee] text-xs text-slate-600 leading-relaxed">
                    <span className="text-slate-400">执行说明:</span> {activeBatch.statusNote}
                  </div>
                )}
              </div>

              {/* 3. 同步异常记录与渐进式技术信息 (R9.3) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center">
                    <span>同步异常记录</span>
                    <span className="ml-1.5 text-amber-700 font-mono">({activeBatch.failedRecords.length})</span>
                  </h3>
                  {activeBatch.failedCount > activeBatch.failedRecords.length && (
                    <span className="text-xs text-slate-500">
                      当前展示 {activeBatch.failedRecords.length} 条重点排查明细，本批次异常 {activeBatch.failedCount} 条
                    </span>
                  )}
                </div>

                {activeBatch.failedRecords.length === 0 ? (
                  <div className="border border-dashed border-slate-300 rounded-[4px] p-6 text-center text-slate-400 bg-slate-50/50">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5" />
                    <span className="text-xs">本批次没有异常数据，所有记录均已成功同步或合规跳过。</span>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {activeBatch.failedRecords.map(record => {
                      const isExpanded = !!expandedTechIds[record.id];

                      return (
                        <div
                          key={record.id}
                          className="bg-white border border-[#d9dbde] rounded-[4px] p-3.5 space-y-2 shadow-2xs hover:border-slate-300 transition-colors"
                        >
                          {/* 异常卡片头部 */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-bold text-[#010d23] font-mono bg-slate-100 px-1.5 py-0.5 rounded-[2px] border border-slate-200">
                                {record.recordKey}
                              </span>
                              <span className="text-xs text-slate-600 font-medium">
                                {getRootTypeDisplayName(record.rootType)}
                              </span>
                            </div>

                            <div className="flex items-center space-x-2">
                              {/* 是否可重试徽标 */}
                              {record.retryable ? (
                                <span className="text-[11px] px-1.5 py-0.5 rounded-[2px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                                  可重试
                                </span>
                              ) : (
                                <span className="text-[11px] px-1.5 py-0.5 rounded-[2px] bg-slate-100 text-slate-500 border border-slate-200 font-medium">
                                  不可重试
                                </span>
                              )}

                              {/* 最近重试结果 */}
                              {record.latestRetryResult === 'SUCCESS' && (
                                <span className="text-[11px] px-1.5 py-0.5 rounded-[2px] bg-emerald-100 text-emerald-800 font-semibold">
                                  重试成功
                                </span>
                              )}
                              {record.latestRetryResult === 'RETRYING' && (
                                <span className="text-[11px] px-1.5 py-0.5 rounded-[2px] bg-blue-100 text-blue-800 font-semibold animate-pulse">
                                  正在重试
                                </span>
                              )}
                              {record.latestRetryResult === 'FAILED' && (
                                <span className="text-[11px] px-1.5 py-0.5 rounded-[2px] bg-rose-100 text-rose-800 font-semibold">
                                  重试失败
                                </span>
                              )}
                            </div>
                          </div>

                          {/* 失败字段与原因 */}
                          <div className="text-xs space-y-1">
                            {record.failedField && (
                              <div>
                                <span className="text-slate-400">失败字段:</span>{' '}
                                <code className="text-amber-800 bg-amber-50 px-1 py-0.5 rounded font-mono text-[11px]">
                                  {record.failedField}
                                </code>
                              </div>
                            )}
                            <div>
                              <span className="text-slate-400">失败原因:</span>{' '}
                              <span className="text-slate-700 leading-relaxed font-medium">{record.failureReason}</span>
                            </div>
                            <div className="text-[11px] text-slate-400">
                              发生时间: {record.occurredAt}
                            </div>
                          </div>

                          {/* 4. 默认折叠的技术信息 (R9.3) */}
                          <div className="pt-2 border-t border-[#ebecee]">
                            <button
                              onClick={() => toggleTechDetail(record.id)}
                              className="text-xs text-blue-600 hover:text-blue-800 flex items-center space-x-1 font-medium cursor-pointer"
                            >
                              <span>{isExpanded ? '收起技术信息' : '展开技术信息'}</span>
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>

                            {isExpanded && (
                              <div className="mt-2 p-2.5 bg-slate-50 rounded-[4px] border border-[#d9dbde] space-y-1.5 text-xs text-slate-700 font-mono animate-in fade-in duration-100">
                                {record.errorCode && (
                                  <div>
                                    <span className="text-slate-400">错误码:</span> {record.errorCode}
                                  </div>
                                )}
                                {record.traceId && (
                                  <div className="flex items-center space-x-2">
                                    <span className="text-slate-400">Trace ID:</span>
                                    <span>{record.traceId}</span>
                                    <button
                                      onClick={() => handleCopyTraceId(record.traceId!)}
                                      className="text-slate-400 hover:text-blue-600 p-0.5 rounded transition-colors cursor-pointer"
                                      title="复制Trace ID"
                                    >
                                      {copiedTraceId === record.traceId ? (
                                        <Check className="w-3 h-3 text-emerald-600" />
                                      ) : (
                                        <Copy className="w-3 h-3" />
                                      )}
                                    </button>
                                  </div>
                                )}
                                {record.errorCategory && (
                                  <div>
                                    <span className="text-slate-400">错误分类:</span> {record.errorCategory}
                                  </div>
                                )}
                                {record.techDetail && (
                                  <div className="break-all whitespace-pre-wrap font-sans text-[11px] text-slate-600 bg-white p-1.5 rounded border border-slate-200 mt-1">
                                    <span className="text-slate-400 font-mono block mb-0.5">技术排查说明:</span>
                                    {record.techDetail}
                                  </div>
                                )}
                                {record.owner && (
                                  <div className="font-sans text-slate-500 text-[11px]">
                                    处理责任人/组: {record.owner}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 5. 人工处理说明记录 (R10.2: 仅用于记录人工处理情况，不改变同步状态) */}
              <div className="border border-[#d9dbde] rounded-[4px] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    人工处理说明 ({activeBatch.handlingNotes?.length || 0})
                  </h3>
                  <span className="text-[11px] text-slate-400">仅用于记录人工排查备忘，不影响批次状态</span>
                </div>

                {/* 历史说明列表 */}
                {activeBatch.handlingNotes && activeBatch.handlingNotes.length > 0 && (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {activeBatch.handlingNotes.map(note => (
                      <div key={note.id} className="bg-slate-50 p-2.5 rounded-[4px] border border-[#ebecee] text-xs">
                        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                          <span className="font-medium text-slate-600">{note.operator}</span>
                          <span>{note.createdAt}</span>
                        </div>
                        <p className="text-slate-700 leading-relaxed">{note.content}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* 新增说明输入框 */}
                <div className="space-y-2">
                  <textarea
                    rows={2}
                    value={newNoteContent}
                    onChange={e => setNewNoteContent(e.target.value)}
                    placeholder="输入人工排查与处理说明（如：已协调PLM网关重新下发Token）..."
                    className="w-full text-xs p-2 border border-[#d9dbde] rounded-[4px] focus:outline-hidden focus:border-blue-500 text-slate-800 placeholder-slate-400 resize-none"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={handleAddHandlingNote}
                      disabled={!newNoteContent.trim()}
                      className={`px-3 py-1 text-xs rounded-[4px] font-medium transition-colors cursor-pointer ${
                        newNoteContent.trim()
                          ? 'bg-slate-800 text-white hover:bg-slate-900'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      添加处理说明
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 抽屉底部操作栏 (R10: 唯一主操作“重试失败数据” + 关闭) */}
            <div className="px-5 py-3.5 border-t border-[#d9dbde] bg-white flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-400">
                {activeBatch.failedRecords.filter(r => r.retryable).length > 0
                  ? `本批次有 ${activeBatch.failedRecords.filter(r => r.retryable).length} 条可重试数据`
                  : '本批次无可重试失败数据'}
              </span>

              <div className="flex items-center space-x-2.5">
                <button
                  onClick={() => setSelectedBatchId(null)}
                  className="px-3.5 py-1.5 text-xs font-medium border border-[#d9dbde] rounded-[4px] text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  关闭
                </button>

                {/* 主操作：重试失败数据 (N) */}
                {activeBatch.failedRecords.length > 0 && (
                  <button
                    onClick={handleRetryFailedRecords}
                    disabled={
                      isRetrying ||
                      retrySuccessBatches[activeBatch.id] ||
                      activeBatch.failedRecords.filter(r => r.retryable).length === 0
                    }
                    className={`flex items-center space-x-1.5 px-4 py-1.5 text-xs font-semibold rounded-[4px] transition-all shadow-xs cursor-pointer ${
                      retrySuccessBatches[activeBatch.id]
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 cursor-default'
                        : activeBatch.failedRecords.filter(r => r.retryable).length > 0
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                    }`}
                  >
                    {isRetrying ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>正在重试...</span>
                      </>
                    ) : retrySuccessBatches[activeBatch.id] ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>已完成重试</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>
                          重试失败数据 (
                          {activeBatch.failedRecords.filter(r => r.retryable).length})
                        </span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
