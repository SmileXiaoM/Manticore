import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  RotateCcw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronUp,
  X,
  Copy,
  Check,
  RefreshCw,
  Info,
  Layers,
  Database,
  ArrowRight,
  FileSearch
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
  getTriggerTypeLabel,
  formatLocalDateTime
} from '../syncQualityTypes';
import { initialSyncBatches } from '../syncQualityData';

interface DataSyncQualityViewProps {
  initialSelectedBatchId?: string | null;
  onClearSelectedBatchId?: () => void;
  onNavigateToConsistencyCheck?: () => void;
}

export const DataSyncQualityView: React.FC<DataSyncQualityViewProps> = ({
  initialSelectedBatchId,
  onClearSelectedBatchId,
  onNavigateToConsistencyCheck
}) => {
  // 批次数据状态（支持新增重试批次）
  const [batches, setBatches] = useState<SyncBatch[]>(initialSyncBatches);

  // 筛选条件：根类型、同步状态、批次号或任务名称搜索、重置
  const [selectedRootType, setSelectedRootType] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // 抽屉详情选中的批次 ID
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(initialSelectedBatchId || null);

  // 折叠技术信息状态字典 (recordId -> boolean)
  const [expandedTechIds, setExpandedTechIds] = useState<Record<string, boolean>>({});

  // 任务级失败技术信息折叠状态
  const [isTaskTechExpanded, setIsTaskTechExpanded] = useState<boolean>(false);

  // 复制 TraceId 状态
  const [copiedTraceId, setCopiedTraceId] = useState<string | null>(null);

  // 处理说明输入框状态
  const [newNoteContent, setNewNoteContent] = useState<string>('');

  // 重试中的 loading 状态
  const [isRetrying, setIsRetrying] = useState<boolean>(false);

  // 记录刚刚生成的重试批次 ID
  const [lastGeneratedBatchId, setLastGeneratedBatchId] = useState<string | null>(null);

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

  // 重置筛选条件
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

  // 当前选中的批次对象
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

  // 添加处理说明（仅用于记录人工备忘，不改变同步状态）
  const handleAddHandlingNote = () => {
    if (!activeBatch || !newNoteContent.trim()) return;

    const newNote: HandlingNote = {
      id: `NOTE-${Date.now()}`,
      content: newNoteContent.trim(),
      operator: '李晓华 (数据管理员)',
      createdAt: formatLocalDateTime(new Date())
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

  // 执行重试（支持数据级重试与任务级重试，生成真实重试批次留痕）
  const handleExecuteRetry = () => {
    if (!activeBatch || isRetrying) return;

    const targetBatchId = activeBatch.id;
    const isTaskFailureInitial = activeBatch.executionStatus === 'FAILED';
    const retryableDataRecordsInitial = activeBatch.failedRecords.filter(r => r.retryable);

    if (!isTaskFailureInitial && retryableDataRecordsInitial.length === 0) {
      showToast('当前批次无可重试的数据', 'warning');
      return;
    }

    setIsRetrying(true);

    setTimeout(() => {
      setIsRetrying(false);

      const now = new Date();
      const startTimeStr = formatLocalDateTime(now);
      const endTimeObj = new Date(now.getTime() + 75 * 1000);
      const endTimeStr = formatLocalDateTime(endTimeObj);

      let generatedBatchId = '';
      let isTaskFailureMode = false;
      let finalRetryCount = 0;

      // 使用函数式状态更新，避免使用旧闭包 batches 覆盖重试等待期间用户提交的处理说明
      setBatches(prev => {
        // 基于 prev 中的最新批次计算重试编号，防止重复
        let newBatchId = `${targetBatchId}-R1`;
        let retrySuffixIndex = 1;
        while (prev.some(b => b.id === newBatchId)) {
          retrySuffixIndex++;
          newBatchId = `${targetBatchId}-R${retrySuffixIndex}`;
        }
        generatedBatchId = newBatchId;

        // 获取原批次最新数据（包含重试等待期间用户新增的 handlingNotes）
        const currentTargetBatch = prev.find(b => b.id === targetBatchId);
        if (!currentTargetBatch) return prev;

        const isTaskFailure = currentTargetBatch.executionStatus === 'FAILED';
        isTaskFailureMode = isTaskFailure;
        const retryableDataRecords = currentTargetBatch.failedRecords.filter(r => r.retryable);
        const retryCount = isTaskFailure ? currentTargetBatch.sourceDataCount : retryableDataRecords.length;
        finalRetryCount = retryCount;

        // 1. 创建全新的重试批次，作为独立记录入库留痕
        const newRetryBatch: SyncBatch = {
          id: newBatchId,
          jobName: `${currentTargetBatch.jobName} - 失败重试`,
          parentBatchId: currentTargetBatch.id,
          rootTypes: [...currentTargetBatch.rootTypes],
          syncMethod: 'COMPENSATION',
          triggerType: 'RETRY',
          startTime: startTimeStr,
          endTime: endTimeStr,
          durationText: '1分15秒',
          sourceDataCount: retryCount,
          successCount: retryCount,
          failedCount: 0,
          skippedCount: 0,
          executionStatus: 'SUCCESS',
          failedRecords: [],
          statusNote: isTaskFailure
            ? `重试任务在 PLM 网关认证凭证更新后重新执行，已顺利完成全批次 ${retryCount} 条数据读取并全部成功写入。`
            : `重试批次对原批次 ${currentTargetBatch.id} 中 ${retryCount} 条可重试失败记录重新执行清洗与同步，全部成功写入。`,
          handlingNotes: [
            {
              id: `NOTE-RETRY-${Date.now()}`,
              content: isTaskFailure
                ? `针对原任务级失败批次 ${currentTargetBatch.id} 发起全量任务重试，已生成新批次 ${newBatchId} 并成功完成。`
                : `针对原批次 ${currentTargetBatch.id} 中 ${retryCount} 条可重试异常数据发起定向重试，已生成新批次 ${newBatchId}。`,
              operator: '李晓华 (数据管理员)',
              createdAt: startTimeStr
            }
          ]
        };

        // 2. 更新原批次：保持原始历史状态和统计数据不变，但将可重试明细标记为重试成功并追加处理备忘
        // 关键：保留 b.handlingNotes，确保重试等待期间用户保存的处理说明完整存在
        const updatedBatches = prev.map(b => {
          if (b.id === targetBatchId) {
            const updatedRecords = b.failedRecords.map(rec => {
              if (rec.retryable) {
                return {
                  ...rec,
                  latestRetryResult: 'SUCCESS' as const
                };
              }
              return rec;
            });

            const linkedNote: HandlingNote = {
              id: `NOTE-LINK-${Date.now()}`,
              content: isTaskFailure
                ? `已针对本失败任务发起重试，生成新批次 ${newBatchId}，执行结果：同步完成。`
                : `已针对本批次 ${retryCount} 条失败数据发起重试，生成新批次 ${newBatchId}，执行结果：同步完成。`,
              operator: '李晓华 (数据管理员)',
              createdAt: startTimeStr
            };

            return {
              ...b,
              failedRecords: updatedRecords,
              handlingNotes: [linkedNote, ...(b.handlingNotes || [])]
            };
          }
          return b;
        });

        // 将新重试批次插入到列表最前部，实现列表留痕
        return [newRetryBatch, ...updatedBatches];
      });

      if (generatedBatchId) {
        setLastGeneratedBatchId(generatedBatchId);
        showToast(
          isTaskFailureMode
            ? `任务重试成功，已生成新批次 ${generatedBatchId}`
            : `已成功重试 ${finalRetryCount} 条失败数据，已生成新批次 ${generatedBatchId}`,
          'success'
        );
      }
    }, 1200);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--ty-fill-color)] overflow-hidden text-[var(--ty-font-main-color)] relative font-sans">
      {/* Toast 消息提示 */}
      {toastMessage && (
        <div className="fixed top-16 right-8 z-50 transition-all duration-300 transform translate-y-0">
          <div
            className={`px-4 py-2.5 rounded-ty-sm shadow-ty-lg text-ty-xs font-medium flex items-center space-x-2 border ${
              toastMessage.type === 'success'
                ? 'bg-[var(--ty-green-lightest-color)] text-[var(--ty-font-main-light-color)] border-[var(--ty-green-color)]/30'
                : toastMessage.type === 'warning'
                ? 'bg-[var(--ty-orange-lightest-color)] text-[var(--ty-font-main-light-color)] border-[var(--ty-orange-color)]/30'
                : 'bg-[var(--ty-blue-lightest-color)] text-[var(--ty-font-main-light-color)] border-[var(--ty-blue-color)]/30'
            }`}
          >
            {toastMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-[var(--ty-green-color)] shrink-0" />}
            {toastMessage.type === 'warning' && <AlertTriangle className="w-4 h-4 text-[var(--ty-orange-color)] shrink-0" />}
            {toastMessage.type === 'info' && <Info className="w-4 h-4 text-[var(--ty-blue-color)] shrink-0" />}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* 主页面工作区 */}
      <div className="flex-1 flex flex-col overflow-y-auto p-4 md:p-6 space-y-4">
        {/* 顶部标题与简要说明 */}
        <div className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <Database className="w-5 h-5 text-[var(--ty-primary-color)]" />
              <h1 className="text-ty-md font-semibold text-[var(--ty-font-main-color)]">数据同步记录</h1>
              <span className="text-ty-xs bg-[var(--ty-fill-color)] text-[var(--ty-font-sub-color)] px-2 py-0.5 rounded-ty-xs font-medium border border-[var(--ty-border-color)]">
                一阶段检索底座
              </span>
            </div>
            <p className="text-ty-xs text-[var(--ty-font-sub-color)] mt-1.5 leading-relaxed">
              查看每次同步是否完成、成功和异常数量，以及需要重试的失败数据。单条数据异常不会中断整个批次；只有任务无法继续执行时才标记为同步失败。
            </p>
          </div>

          {onNavigateToConsistencyCheck && (
            <button
              onClick={onNavigateToConsistencyCheck}
              className="px-3 py-2 rounded-ty-sm bg-[var(--ty-primary-lightest-color)] hover:bg-[var(--ty-primary-color)] hover:text-[var(--ty-font-white-color)] text-[var(--ty-primary-color)] border border-[var(--ty-primary-color)]/30 text-ty-xs font-semibold flex items-center space-x-1.5 shrink-0 transition-colors cursor-pointer"
              title="前往 PLM 与 Manticore 实际数据一致性核验 (候选原型)"
              id="btn-goto-consistency-check"
            >
              <FileSearch className="w-3.5 h-3.5" />
              <span>数据一致性核验 [候选]</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* 顶部紧凑指标摘要：一行展示 4 个关键指标 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-3 flex items-center justify-between">
            <div>
              <span className="text-ty-xs text-[var(--ty-font-sub-color)] block">批次总数</span>
              <span className="text-ty-xl font-bold text-[var(--ty-font-main-color)] mt-0.5 block">{summaryMetrics.total}</span>
            </div>
            <div className="w-8 h-8 rounded-ty-sm bg-[var(--ty-fill-color)] flex items-center justify-center text-[var(--ty-font-sub-color)]">
              <Layers className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-3 flex items-center justify-between">
            <div>
              <span className="text-ty-xs text-[var(--ty-font-sub-color)] block">同步中数量</span>
              <span className="text-ty-xl font-bold text-[var(--ty-primary-color)] mt-0.5 block">{summaryMetrics.running}</span>
            </div>
            <div className="w-8 h-8 rounded-ty-sm bg-[var(--ty-primary-lighter-color)]/30 flex items-center justify-center text-[var(--ty-primary-color)]">
              <RefreshCw className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-3 flex items-center justify-between">
            <div>
              <span className="text-ty-xs text-[var(--ty-font-sub-color)] block">同步完成（有异常）</span>
              <span className="text-ty-xl font-bold text-[var(--ty-orange-color)] mt-0.5 block">{summaryMetrics.partialSuccess}</span>
            </div>
            <div className="w-8 h-8 rounded-ty-sm bg-[var(--ty-orange-lightest-color)] border border-[var(--ty-orange-color)]/30 flex items-center justify-center text-[var(--ty-orange-color)]">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-3 flex items-center justify-between">
            <div>
              <span className="text-ty-xs text-[var(--ty-font-sub-color)] block">同步失败数量</span>
              <span className="text-ty-xl font-bold text-[var(--ty-red-color)] mt-0.5 block">{summaryMetrics.failed}</span>
            </div>
            <div className="w-8 h-8 rounded-ty-sm bg-[var(--ty-red-lightest-color)] border border-[var(--ty-red-color)]/30 flex items-center justify-center text-[var(--ty-red-color)]">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* 筛选条件栏：仅保留根类型、状态、搜索框与重置 */}
        <div className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-3.5 flex flex-wrap items-center gap-3">
          {/* 根类型筛选 */}
          <div className="flex items-center space-x-1.5 text-ty-xs">
            <span className="text-[var(--ty-font-main-color)] font-medium whitespace-nowrap">根类型:</span>
            <select
              value={selectedRootType}
              onChange={e => setSelectedRootType(e.target.value)}
              className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm px-2.5 py-1 text-ty-xs text-[var(--ty-font-main-color)] hover:border-[var(--ty-border-color)] focus:border-[var(--ty-primary-color)] focus:outline-hidden"
            >
              <option value="ALL">全部根类型</option>
              <option value="Part">零部件 (Part)</option>
              <option value="Document">文档 (Document)</option>
              <option value="Process">工艺路线 (Process)</option>
            </select>
          </div>

          {/* 同步状态筛选 */}
          <div className="flex items-center space-x-1.5 text-ty-xs">
            <span className="text-[var(--ty-font-main-color)] font-medium whitespace-nowrap">同步状态:</span>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm px-2.5 py-1 text-ty-xs text-[var(--ty-font-main-color)] hover:border-[var(--ty-border-color)] focus:border-[var(--ty-primary-color)] focus:outline-hidden"
            >
              <option value="ALL">全部状态</option>
              <option value="RUNNING">同步中</option>
              <option value="SUCCESS">同步完成</option>
              <option value="PARTIAL_SUCCESS">同步完成（有异常）</option>
              <option value="FAILED">同步失败</option>
            </select>
          </div>

          {/* 搜索框 */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-3.5 h-3.5 text-[var(--ty-font-sub-light-color)] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="搜索批次编号或任务名称..."
              value={searchKeyword}
              onChange={e => setSearchKeyword(e.target.value)}
              className="w-full pl-8 pr-3 py-1 text-ty-xs border border-[var(--ty-border-color)] rounded-ty-sm focus:outline-hidden focus:border-[var(--ty-primary-color)] text-[var(--ty-font-main-color)] placeholder:text-[var(--ty-font-placeholder-color)] bg-[var(--ty-fill-white-color)]"
            />
          </div>

          {/* 重置按钮 */}
          <button
            onClick={handleResetFilters}
            className="flex items-center space-x-1 px-3 py-1 border border-[var(--ty-border-color)] rounded-ty-sm text-ty-xs text-[var(--ty-font-sub-color)] hover:text-[var(--ty-font-main-color)] hover:bg-[var(--ty-fill-color)] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3 text-[var(--ty-font-sub-light-color)]" />
            <span>重置</span>
          </button>

          {/* 结果条数提示 */}
          <div className="ml-auto text-ty-xs text-[var(--ty-font-sub-color)]">
            共 <span className="font-medium text-[var(--ty-font-main-color)]">{filteredBatches.length}</span> 条批次记录
          </div>
        </div>

        {/* 批次表格卡片：表头与主要信息默认 14px，辅助信息 12px */}
        <div className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1100px]">
              <thead>
                <tr className="bg-[var(--ty-fill-weak-dark-color)] text-[var(--ty-font-main-color)] text-ty-sm font-semibold border-b border-[var(--ty-border-color)]">
                  <th className="py-3 px-4 min-w-[240px]">同步批次</th>
                  <th className="py-3 px-3 min-w-[160px]">根类型</th>
                  <th className="py-3 px-3 min-w-[180px]">同步时间</th>
                  <th className="py-3 px-3 min-w-[260px]">数据结果</th>
                  <th className="py-3 px-3 min-w-[150px] whitespace-nowrap">同步状态</th>
                  <th className="py-3 px-4 text-right min-w-[110px] whitespace-nowrap">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--ty-border-light-color)]">
                {filteredBatches.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[var(--ty-font-sub-light-color)]">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Info className="w-8 h-8 text-[var(--ty-font-sub-light-color)]" />
                        <span className="text-ty-sm font-medium">未找到符合筛选条件的同步记录</span>
                        <button
                          onClick={handleResetFilters}
                          className="text-ty-xs text-[var(--ty-primary-color)] hover:underline mt-1 cursor-pointer"
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
                    const isNewlyCreated = lastGeneratedBatchId === batch.id;

                    return (
                      <tr
                        key={batch.id}
                        onClick={() => setSelectedBatchId(batch.id)}
                        className={`transition-colors cursor-pointer hover:bg-[var(--ty-fill-weak-dark-color)] ${
                          isSelected ? 'bg-[var(--ty-primary-lighter-color)]/20' : ''
                        } ${isNewlyCreated ? 'bg-[var(--ty-green-light-color)]/20' : ''}`}
                      >
                        {/* 1. 同步批次：批次编号 14px 加粗，任务名称 14px */}
                        <td className="py-3 px-4">
                          <div className="flex flex-col">
                            <div className="flex items-center space-x-1.5">
                              <span className="font-semibold text-ty-sm text-[var(--ty-font-main-color)] hover:text-[var(--ty-primary-color)] transition-colors">
                                {batch.id}
                              </span>
                              {batch.triggerType === 'RETRY' && (
                                <span className="text-ty-2xs px-1.5 py-0.2 rounded-ty-xs bg-[var(--ty-primary-lightest-color)] text-[var(--ty-font-main-light-color)] border border-[var(--ty-primary-color)]/30 font-semibold whitespace-nowrap">
                                  重试批次
                                </span>
                              )}
                            </div>
                            <span className="text-ty-sm text-[var(--ty-font-main-color)] mt-0.5 line-clamp-1">
                              {batch.jobName}
                            </span>
                            <div className="flex items-center space-x-1.5 mt-1 text-ty-xs text-[var(--ty-font-sub-color)]">
                              <span>{getSyncMethodLabel(batch.syncMethod)}</span>
                              <span>·</span>
                              <span>{getTriggerTypeLabel(batch.triggerType)}</span>
                              {batch.parentBatchId && (
                                <>
                                  <span>·</span>
                                  <span className="text-[var(--ty-font-sub-light-color)]">关联原批次: {batch.parentBatchId}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 2. 根类型：标签展示 */}
                        <td className="py-3 px-3">
                          <div className="flex flex-wrap gap-1">
                            {batch.rootTypes.map(rt => (
                              <span
                                key={rt}
                                className="inline-flex items-center px-1.5 py-0.5 rounded-ty-xs bg-[var(--ty-fill-color)] text-[var(--ty-font-main-color)] text-ty-xs font-medium border border-[var(--ty-border-color)]"
                              >
                                {getRootTypeDisplayName(rt)}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* 3. 同步时间：12px 说明 */}
                        <td className="py-3 px-3">
                          <div className="flex flex-col text-ty-xs">
                            <span className="text-[var(--ty-font-main-color)] font-mono">{batch.startTime}</span>
                            <span className="text-[var(--ty-font-sub-color)] mt-0.5 flex items-center">
                              <Clock className="w-3 h-3 mr-1 text-[var(--ty-font-sub-light-color)] shrink-0" />
                              {batch.executionStatus === 'RUNNING' ? '进行中' : batch.durationText || '已完成'}
                            </span>
                          </div>
                        </td>

                        {/* 4. 数据结果：主要数量 14px，自洽展示 */}
                        <td className="py-3 px-3">
                          <div className="flex flex-col">
                            <div className="flex items-center space-x-2 text-ty-sm">
                              <span className="text-[var(--ty-font-main-color)]">总数: <strong className="text-[var(--ty-font-main-color)]">{batch.sourceDataCount.toLocaleString()}</strong></span>
                              <span className="text-[var(--ty-green-color)] font-medium">成功: {batch.successCount.toLocaleString()}</span>
                              {batch.failedCount > 0 && (
                                <span className={batch.executionStatus === 'FAILED' ? 'text-[var(--ty-red-color)] font-semibold' : 'text-[var(--ty-orange-color)] font-semibold'}>
                                  异常: {batch.failedCount.toLocaleString()}
                                </span>
                              )}
                            </div>
                            {/* 运行中展示正在处理数 */}
                            {batch.executionStatus === 'RUNNING' && (
                              <span className="text-[var(--ty-primary-color)] text-ty-xs mt-0.5">
                                正在处理 {batch.sourceDataCount - batch.successCount - batch.failedCount - batch.skippedCount} 条
                              </span>
                            )}
                            {/* 跳过数不计为异常提示 */}
                            {batch.skippedCount > 0 && (
                              <span className="text-[var(--ty-font-sub-color)] text-ty-xs mt-0.5">
                                跳过 {batch.skippedCount} 条，不计为同步异常
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 5. 同步状态：规范状态标签 12px */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-ty-xs text-ty-xs font-medium border whitespace-nowrap ${statusMeta.bgClass} ${statusMeta.textClass} ${statusMeta.borderClass}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 shrink-0 ${statusMeta.dotClass}`}></span>
                            {statusMeta.label}
                          </span>
                        </td>

                        {/* 6. 操作按钮 */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            {batch.executionStatus === 'FAILED' ? (
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  setSelectedBatchId(batch.id);
                                }}
                                className="px-2.5 py-1 text-ty-xs font-medium text-[var(--ty-font-main-light-color)] bg-[var(--ty-red-lightest-color)] hover:bg-[var(--ty-red-light-color)] rounded-ty-sm border border-[var(--ty-red-color)]/30 transition-colors cursor-pointer"
                              >
                                查看失败
                              </button>
                            ) : batch.failedCount > 0 ? (
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  setSelectedBatchId(batch.id);
                                }}
                                className="px-2.5 py-1 text-ty-xs font-medium text-[var(--ty-font-main-light-color)] bg-[var(--ty-orange-lightest-color)] hover:bg-[var(--ty-orange-light-color)] rounded-ty-sm border border-[var(--ty-orange-color)]/30 transition-colors cursor-pointer"
                              >
                                查看异常
                              </button>
                            ) : (
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  setSelectedBatchId(batch.id);
                                }}
                                className="px-2.5 py-1 text-ty-xs font-medium text-[var(--ty-font-main-light-color)] hover:text-[var(--ty-primary-color)] bg-[var(--ty-primary-lightest-color)] hover:bg-[var(--ty-primary-light-color)] rounded-ty-sm border border-[var(--ty-primary-color)]/30 transition-colors cursor-pointer"
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

      {/* 单层详情抽屉：8px 圆角容器，线性自上而下展示 */}
      {activeBatch && (
        <div className="fixed inset-0 z-40 flex justify-end bg-ty-overlay backdrop-blur-xs transition-opacity animate-in fade-in duration-150">
          <div className="w-full max-w-xl sm:max-w-2xl bg-[var(--ty-fill-white-color)] h-full shadow-ty-lg flex flex-col border-l border-[var(--ty-border-color)] rounded-l-lg z-50 overflow-hidden">
            {/* 抽屉头部 */}
            <div className="px-5 py-4 border-b border-[var(--ty-border-color)] flex items-center justify-between bg-[var(--ty-fill-weak-dark-color)] shrink-0">
              <div className="flex items-center space-x-2.5">
                <Database className="w-4 h-4 text-[var(--ty-primary-color)]" />
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-ty-sm font-bold text-[var(--ty-font-main-color)]">同步批次详情</h2>
                    <span className="text-ty-xs font-mono font-medium text-[var(--ty-font-main-color)]">
                      {activeBatch.id}
                    </span>
                    {activeBatch.parentBatchId && (
                      <span className="text-ty-xs text-[var(--ty-font-sub-light-color)]">
                        (重试自: {activeBatch.parentBatchId})
                      </span>
                    )}
                  </div>
                  <span className="text-ty-xs text-[var(--ty-font-sub-color)] block mt-0.5">{activeBatch.jobName}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedBatchId(null)}
                className="w-8 h-8 rounded-ty-sm text-[var(--ty-font-sub-light-color)] hover:text-[var(--ty-font-main-color)] hover:bg-[var(--ty-fill-color)] flex items-center justify-center transition-colors cursor-pointer"
                title="关闭抽屉"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 抽屉内容主体区：自上而下顺序展示 */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-ty-sm text-[var(--ty-font-main-color)]">
              {/* 1. 同步结果摘要 */}
              <div className="bg-[var(--ty-fill-weak-dark-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-4 space-y-2.5">
                <h3 className="text-ty-xs font-bold text-[var(--ty-font-main-color)] uppercase tracking-wider">同步结果摘要</h3>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-light-color)] rounded-ty-sm p-2.5 text-center">
                    <span className="text-ty-xs text-[var(--ty-font-sub-color)] block">同步总数</span>
                    <span className="text-ty-md font-bold text-[var(--ty-font-main-color)] mt-0.5 block">
                      {activeBatch.sourceDataCount.toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-light-color)] rounded-ty-sm p-2.5 text-center">
                    <span className="text-ty-xs text-[var(--ty-green-color)] block">成功数量</span>
                    <span className="text-ty-md font-bold text-[var(--ty-green-color)] mt-0.5 block">
                      {activeBatch.successCount.toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-light-color)] rounded-ty-sm p-2.5 text-center">
                    <span className="text-ty-xs text-[var(--ty-orange-color)] block">异常数量</span>
                    <span className={`text-ty-md font-bold mt-0.5 block ${activeBatch.executionStatus === 'FAILED' ? 'text-[var(--ty-red-color)]' : 'text-[var(--ty-orange-color)]'}`}>
                      {activeBatch.failedCount.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* 跳过说明 / 正在处理说明 */}
                {activeBatch.skippedCount > 0 && (
                  <div className="text-ty-xs text-[var(--ty-font-main-color)] bg-[var(--ty-fill-white-color)]/70 p-2 rounded-ty-sm border border-[var(--ty-border-light-color)] flex items-center space-x-1.5">
                    <Info className="w-3.5 h-3.5 text-[var(--ty-primary-color)] shrink-0" />
                    <span>跳过 {activeBatch.skippedCount} 条，不计为同步异常。</span>
                  </div>
                )}
                {activeBatch.executionStatus === 'RUNNING' && (
                  <div className="text-ty-xs text-[var(--ty-font-main-light-color)] bg-[var(--ty-primary-lightest-color)] p-2 rounded-ty-sm border border-[var(--ty-primary-color)]/30 flex items-center space-x-1.5">
                    <RefreshCw className="w-3.5 h-3.5 text-[var(--ty-primary-color)] shrink-0 animate-spin" />
                    <span>
                      正在处理 {activeBatch.sourceDataCount - activeBatch.successCount - activeBatch.failedCount - activeBatch.skippedCount} 条数据...
                    </span>
                  </div>
                )}
              </div>

              {/* 2. 同步基本信息：无软类型无版本概念 */}
              <div className="border border-[var(--ty-border-color)] rounded-ty-sm p-4 space-y-3">
                <h3 className="text-ty-xs font-bold text-[var(--ty-font-main-color)] uppercase tracking-wider">同步基本信息</h3>
                <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-ty-xs">
                  <div>
                    <span className="text-[var(--ty-font-sub-color)] block">根类型:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {activeBatch.rootTypes.map(rt => (
                        <span
                          key={rt}
                          className="px-1.5 py-0.5 rounded-ty-xs bg-[var(--ty-fill-color)] text-[var(--ty-font-main-color)] font-medium border border-[var(--ty-border-color)]"
                        >
                          {getRootTypeDisplayName(rt)}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-[var(--ty-font-sub-color)] block">同步状态:</span>
                    <div className="mt-1">
                      {(() => {
                        const meta = getSyncStatusMeta(activeBatch.executionStatus);
                        return (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-ty-xs text-ty-xs font-medium border ${meta.bgClass} ${meta.textClass} ${meta.borderClass}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 shrink-0 ${meta.dotClass}`}></span>
                            {meta.label}
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  <div>
                    <span className="text-[var(--ty-font-sub-color)] block">开始时间:</span>
                    <span className="text-[var(--ty-font-main-color)] font-mono mt-0.5 block">{activeBatch.startTime}</span>
                  </div>

                  <div>
                    <span className="text-[var(--ty-font-sub-color)] block">结束时间:</span>
                    <span className="text-[var(--ty-font-main-color)] font-mono mt-0.5 block">
                      {activeBatch.endTime || '正在运行中'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[var(--ty-font-sub-color)] block">同步方式:</span>
                    <span className="text-[var(--ty-font-main-color)] mt-0.5 block">{getSyncMethodLabel(activeBatch.syncMethod)}</span>
                  </div>

                  <div>
                    <span className="text-[var(--ty-font-sub-color)] block">触发方式:</span>
                    <span className="text-[var(--ty-font-main-color)] mt-0.5 block">{getTriggerTypeLabel(activeBatch.triggerType)}</span>
                  </div>
                </div>

                {activeBatch.statusNote && (
                  <div className="pt-2 border-t border-[var(--ty-border-light-color)] text-ty-xs text-[var(--ty-font-main-color)] leading-relaxed">
                    <span className="text-[var(--ty-font-sub-color)]">执行说明:</span> {activeBatch.statusNote}
                  </div>
                )}
              </div>

              {/* 3. 任务级失败专属模块 vs 数据级异常记录列表 (区分任务级失败与数据级异常) */}
              {activeBatch.executionStatus === 'FAILED' ? (
                /* 任务级失败专属展示：不伪装成单条业务数据异常 */
                <div className="border border-[var(--ty-red-color)]/30 bg-[var(--ty-red-lightest-color)] rounded-ty-sm p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-ty-xs font-bold text-[var(--ty-red-color)] uppercase tracking-wider flex items-center">
                      <XCircle className="w-4 h-4 text-[var(--ty-red-color)] mr-1.5 shrink-0" />
                      <span>任务级中断根因与排查信息</span>
                    </h3>
                    <span className="text-ty-xs bg-[var(--ty-red-lightest-color)] text-[var(--ty-font-main-light-color)] px-2 py-0.5 rounded-ty-xs font-semibold border border-[var(--ty-red-color)]/30">
                      任务无法继续执行
                    </span>
                  </div>

                  <div className="space-y-2 text-ty-xs">
                    <div>
                      <span className="text-[var(--ty-font-sub-color)]">中断根因:</span>{' '}
                      <span className="text-[var(--ty-font-main-color)] font-medium leading-relaxed">
                        {activeBatch.taskFailureDetail?.failureReason || activeBatch.statusNote}
                      </span>
                    </div>

                    {activeBatch.taskFailureDetail?.failureStage && (
                      <div>
                        <span className="text-[var(--ty-font-sub-color)]">发生环节:</span>{' '}
                        <span className="text-[var(--ty-font-main-color)] font-medium">{activeBatch.taskFailureDetail.failureStage}</span>
                      </div>
                    )}

                    <div>
                      <span className="text-[var(--ty-font-sub-color)]">影响范围:</span>{' '}
                      <span className="text-[var(--ty-font-main-color)] font-medium">
                        全批次 {activeBatch.sourceDataCount} 条记录无法建立连接并写入
                      </span>
                    </div>
                  </div>

                  {/* 默认折叠的任务技术信息 */}
                  <div className="pt-2 border-t border-[var(--ty-red-color)]/20">
                    <button
                      onClick={() => setIsTaskTechExpanded(!isTaskTechExpanded)}
                      className="text-ty-xs text-[var(--ty-primary-color)] hover:opacity-80 flex items-center space-x-1 font-medium cursor-pointer"
                    >
                      <span>{isTaskTechExpanded ? '收起技术排查信息' : '展开技术排查信息'}</span>
                      {isTaskTechExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>

                    {isTaskTechExpanded && (
                      <div className="mt-2 p-2.5 bg-[var(--ty-fill-white-color)] rounded-ty-sm border border-[var(--ty-red-color)]/20 space-y-1.5 text-ty-xs text-[var(--ty-font-main-color)] font-mono animate-in fade-in duration-100">
                        {activeBatch.taskFailureDetail?.errorCode && (
                          <div>
                            <span className="text-[var(--ty-font-sub-light-color)]">错误码:</span> {activeBatch.taskFailureDetail.errorCode}
                          </div>
                        )}
                        {activeBatch.taskFailureDetail?.traceId && (
                          <div className="flex items-center space-x-2">
                            <span className="text-[var(--ty-font-sub-light-color)]">Trace ID:</span>
                            <span>{activeBatch.taskFailureDetail.traceId}</span>
                            <button
                              onClick={() => handleCopyTraceId(activeBatch.taskFailureDetail!.traceId!)}
                              className="text-[var(--ty-font-sub-light-color)] hover:text-[var(--ty-primary-color)] p-0.5 rounded transition-colors cursor-pointer"
                              title="复制Trace ID"
                            >
                              {copiedTraceId === activeBatch.taskFailureDetail.traceId ? (
                                <Check className="w-3 h-3 text-[var(--ty-green-color)]" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        )}
                        {activeBatch.taskFailureDetail?.errorCategory && (
                          <div>
                            <span className="text-[var(--ty-font-sub-light-color)]">错误分类:</span> {activeBatch.taskFailureDetail.errorCategory}
                          </div>
                        )}
                        {activeBatch.taskFailureDetail?.techDetail && (
                          <div className="break-all whitespace-pre-wrap font-sans text-ty-xs text-[var(--ty-font-sub-color)] bg-[var(--ty-fill-weak-dark-color)] p-2 rounded border border-[var(--ty-border-color)] mt-1">
                            <span className="text-[var(--ty-font-sub-light-color)] font-mono block mb-0.5">技术排查详情:</span>
                            {activeBatch.taskFailureDetail.techDetail}
                          </div>
                        )}
                        {activeBatch.taskFailureDetail?.owner && (
                          <div className="font-sans text-[var(--ty-font-sub-color)] text-ty-xs">
                            处理责任人/组: {activeBatch.taskFailureDetail.owner}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* 数据级异常记录列表 */
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-ty-xs font-bold text-[var(--ty-font-main-color)] uppercase tracking-wider flex items-center">
                      <span>同步异常记录</span>
                      <span className="ml-1.5 text-[var(--ty-orange-color)] font-mono">({activeBatch.failedRecords.length})</span>
                    </h3>
                    <span className="text-ty-xs text-[var(--ty-font-sub-color)]">
                      展示 {activeBatch.failedRecords.length} 条异常明细
                    </span>
                  </div>

                  {activeBatch.failedRecords.length === 0 ? (
                    <div className="border border-dashed border-[var(--ty-border-color)] rounded-ty-sm p-6 text-center text-[var(--ty-font-sub-light-color)] bg-[var(--ty-fill-weak-dark-color)]/50">
                      <CheckCircle2 className="w-6 h-6 text-[var(--ty-green-color)] mx-auto mb-1.5" />
                      <span className="text-ty-xs">本批次没有异常数据，所有记录均已成功同步或合规跳过。</span>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {activeBatch.failedRecords.map(record => {
                        const isExpanded = !!expandedTechIds[record.id];

                        return (
                          <div
                            key={record.id}
                            className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-3.5 space-y-2 hover:border-[var(--ty-primary-lighter-color)] transition-colors"
                          >
                            {/* 异常卡片头部 */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <span className="text-ty-xs font-bold text-[var(--ty-font-main-color)] font-mono bg-[var(--ty-fill-color)] px-1.5 py-0.5 rounded-ty-xs border border-[var(--ty-border-color)]">
                                  {record.recordKey}
                                </span>
                                <span className="text-ty-xs text-[var(--ty-font-main-color)] font-medium">
                                  {getRootTypeDisplayName(record.rootType)}
                                </span>
                              </div>

                              <div className="flex items-center space-x-2">
                                {/* 是否可重试状态 */}
                                {record.retryable ? (
                                  <span className="text-ty-xs px-1.5 py-0.5 rounded-ty-xs bg-[var(--ty-green-lightest-color)] text-[var(--ty-font-main-light-color)] border border-[var(--ty-green-color)]/30 font-medium inline-flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--ty-green-color)] shrink-0" />
                                    可重试
                                  </span>
                                ) : (
                                  <span className="text-ty-xs px-1.5 py-0.5 rounded-ty-xs bg-[var(--ty-fill-color)] text-[var(--ty-font-sub-light-color)] border border-[var(--ty-border-color)] font-medium">
                                    不可重试
                                  </span>
                                )}

                                {/* 最近重试状态 */}
                                {record.latestRetryResult === 'SUCCESS' && (
                                  <span className="text-ty-xs px-1.5 py-0.5 rounded-ty-xs bg-[var(--ty-green-lightest-color)] text-[var(--ty-font-main-light-color)] border border-[var(--ty-green-color)]/30 font-semibold inline-flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--ty-green-color)] shrink-0" />
                                    重试成功
                                  </span>
                                )}
                                {record.latestRetryResult === 'RETRYING' && (
                                  <span className="text-ty-xs px-1.5 py-0.5 rounded-ty-xs bg-[var(--ty-primary-lightest-color)] text-[var(--ty-font-main-light-color)] border border-[var(--ty-primary-color)]/30 font-semibold animate-pulse inline-flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--ty-primary-color)] shrink-0" />
                                    正在重试
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* 失败字段与原因 */}
                            <div className="text-ty-xs space-y-1">
                              {record.failedField && (
                                <div>
                                  <span className="text-[var(--ty-font-sub-color)]">失败字段:</span>{' '}
                                  <code className="text-[var(--ty-font-main-light-color)] bg-[var(--ty-orange-lightest-color)] border border-[var(--ty-orange-color)]/30 px-1 py-0.5 rounded-ty-xs font-mono text-ty-xs font-semibold">
                                    {record.failedField}
                                  </code>
                                </div>
                              )}
                              <div>
                                <span className="text-[var(--ty-font-sub-color)]">失败原因:</span>{' '}
                                <span className="text-[var(--ty-font-main-color)] leading-relaxed font-medium">{record.failureReason}</span>
                              </div>
                              <div className="text-ty-xs text-[var(--ty-font-sub-color)]">
                                发生时间: {record.occurredAt}
                              </div>
                            </div>

                            {/* 默认折叠的技术排查信息 */}
                            <div className="pt-2 border-t border-[var(--ty-border-light-color)]">
                              <button
                                onClick={() => toggleTechDetail(record.id)}
                                className="text-ty-xs text-[var(--ty-primary-color)] hover:opacity-80 flex items-center space-x-1 font-medium cursor-pointer"
                              >
                                <span>{isExpanded ? '收起技术信息' : '展开技术信息'}</span>
                                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </button>

                              {isExpanded && (
                                <div className="mt-2 p-2.5 bg-[var(--ty-fill-weak-dark-color)] rounded-ty-sm border border-[var(--ty-border-color)] space-y-1.5 text-ty-xs text-[var(--ty-font-main-color)] font-mono animate-in fade-in duration-100">
                                  {record.errorCode && (
                                    <div>
                                      <span className="text-[var(--ty-font-sub-light-color)]">错误码:</span> {record.errorCode}
                                    </div>
                                  )}
                                  {record.traceId && (
                                    <div className="flex items-center space-x-2">
                                      <span className="text-[var(--ty-font-sub-light-color)]">Trace ID:</span>
                                      <span>{record.traceId}</span>
                                      <button
                                        onClick={() => handleCopyTraceId(record.traceId!)}
                                        className="text-[var(--ty-font-sub-light-color)] hover:text-[var(--ty-primary-color)] p-0.5 rounded transition-colors cursor-pointer"
                                        title="复制Trace ID"
                                      >
                                        {copiedTraceId === record.traceId ? (
                                          <Check className="w-3 h-3 text-[var(--ty-green-color)]" />
                                        ) : (
                                          <Copy className="w-3 h-3" />
                                        )}
                                      </button>
                                    </div>
                                  )}
                                  {record.errorCategory && (
                                    <div>
                                      <span className="text-[var(--ty-font-sub-light-color)]">错误分类:</span> {record.errorCategory}
                                    </div>
                                  )}
                                  {record.techDetail && (
                                    <div className="break-all whitespace-pre-wrap font-sans text-ty-xs text-[var(--ty-font-sub-color)] bg-[var(--ty-fill-white-color)] p-2 rounded border border-[var(--ty-border-color)] mt-1">
                                      <span className="text-[var(--ty-font-sub-light-color)] font-mono block mb-0.5">技术排查说明:</span>
                                      {record.techDetail}
                                    </div>
                                  )}
                                  {record.owner && (
                                    <div className="font-sans text-[var(--ty-font-sub-color)] text-ty-xs">
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
              )}

              {/* 4. 人工处理说明记录 */}
              <div className="border border-[var(--ty-border-color)] rounded-ty-sm p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-ty-xs font-bold text-[var(--ty-font-main-color)] uppercase tracking-wider">
                    人工处理说明 ({activeBatch.handlingNotes?.length || 0})
                  </h3>
                  <span className="text-ty-xs text-[var(--ty-font-sub-color)]">仅用于记录人工备忘，不影响批次状态</span>
                </div>

                {/* 历史说明列表 */}
                {activeBatch.handlingNotes && activeBatch.handlingNotes.length > 0 && (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {activeBatch.handlingNotes.map(note => (
                      <div key={note.id} className="bg-[var(--ty-fill-weak-dark-color)] p-2.5 rounded-ty-sm border border-[var(--ty-border-light-color)] text-ty-xs">
                        <div className="flex items-center justify-between text-ty-xs text-[var(--ty-font-sub-color)] mb-1">
                          <span className="font-medium text-[var(--ty-font-main-color)]">{note.operator}</span>
                          <span>{note.createdAt}</span>
                        </div>
                        <p className="text-[var(--ty-font-main-color)] leading-relaxed">{note.content}</p>
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
                    placeholder="输入人工排查与处理说明（如：已协调网关团队重新下发凭证）..."
                    className="w-full text-ty-xs p-2 border border-[var(--ty-border-color)] rounded-ty-sm focus:outline-hidden focus:border-[var(--ty-primary-color)] text-[var(--ty-font-main-color)] placeholder:text-[var(--ty-font-placeholder-color)] resize-none bg-[var(--ty-fill-white-color)]"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={handleAddHandlingNote}
                      disabled={!newNoteContent.trim()}
                      className={`px-3 py-1 text-ty-xs rounded-ty-sm font-medium transition-colors cursor-pointer ${
                        newNoteContent.trim()
                          ? 'bg-[var(--ty-font-main-color)] text-[var(--ty-font-white-color)] hover:opacity-90'
                          : 'bg-[var(--ty-fill-color)] text-[var(--ty-font-sub-light-color)] cursor-not-allowed'
                      }`}
                    >
                      添加处理说明
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 抽屉底部操作栏：主操作根据批次性质区分文案，生成新批次留痕 */}
            <div className="px-5 py-3.5 border-t border-[var(--ty-border-color)] bg-[var(--ty-fill-white-color)] flex items-center justify-between shrink-0">
              <div className="text-ty-xs text-[var(--ty-font-sub-color)]">
                {activeBatch.executionStatus === 'FAILED' ? (
                  <span>任务级中断，支持重新执行整个同步任务</span>
                ) : (
                  <span>
                    本批次共 {activeBatch.failedRecords.length} 条异常，
                    可重试 {activeBatch.failedRecords.filter(r => r.retryable).length} 条
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2.5">
                <button
                  onClick={() => setSelectedBatchId(null)}
                  className="px-3.5 py-1.5 text-ty-xs font-medium border border-[var(--ty-border-color)] rounded-ty-sm text-[var(--ty-font-main-color)] hover:bg-[var(--ty-fill-color)] transition-colors cursor-pointer"
                >
                  关闭
                </button>

                {/* 任务级失败重试按钮 */}
                {activeBatch.executionStatus === 'FAILED' && (
                  <button
                    onClick={handleExecuteRetry}
                    disabled={isRetrying}
                    className="flex items-center space-x-1.5 px-4 py-1.5 text-ty-xs font-semibold rounded-ty-sm bg-[var(--ty-primary-color)] text-[var(--ty-font-white-color)] hover:bg-[var(--ty-primary-hover-color)] active:bg-[var(--ty-primary-active-color)] transition-all cursor-pointer"
                  >
                    {isRetrying ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>正在重试同步任务...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>重试同步任务</span>
                      </>
                    )}
                  </button>
                )}

                {/* 数据级异常重试按钮 */}
                {activeBatch.executionStatus === 'PARTIAL_SUCCESS' && activeBatch.failedRecords.length > 0 && (
                  <button
                    onClick={handleExecuteRetry}
                    disabled={
                      isRetrying ||
                      activeBatch.failedRecords.filter(r => r.retryable).length === 0
                    }
                    className={`flex items-center space-x-1.5 px-4 py-1.5 text-ty-xs font-semibold rounded-ty-sm transition-all cursor-pointer ${
                      activeBatch.failedRecords.filter(r => r.retryable).length > 0
                        ? 'bg-[var(--ty-primary-color)] hover:bg-[var(--ty-primary-hover-color)] active:bg-[var(--ty-primary-active-color)] text-[var(--ty-font-white-color)]'
                        : 'bg-[var(--ty-fill-color)] text-[var(--ty-font-sub-light-color)] border border-[var(--ty-border-color)] cursor-not-allowed'
                    }`}
                  >
                    {isRetrying ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>正在重试...</span>
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
