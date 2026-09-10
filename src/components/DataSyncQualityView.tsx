import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  ShieldCheck,
  Trash2,
  FileText,
  Lock,
  ArrowUpRight
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
  formatLocalDateTime,
  formatSyncCount,
  isKnownSyncCount,
  getSyncProgressText
} from '../syncQualityTypes';
import { initialSyncBatches } from '../syncQualityData';

interface DataSyncQualityViewProps {
  initialSelectedBatchId?: string | null;
  onClearSelectedBatchId?: () => void;
  batches?: SyncBatch[];
  onUpdateBatches?: React.Dispatch<React.SetStateAction<SyncBatch[]>>;
  initialRootTypeFilter?: string;
}

export const DataSyncQualityView: React.FC<DataSyncQualityViewProps> = ({
  initialSelectedBatchId,
  onClearSelectedBatchId,
  batches: propBatches,
  onUpdateBatches,
  initialRootTypeFilter
}) => {
  // 批次数据状态（支持外部托管或内部状态）
  const [internalBatches, setInternalBatches] = useState<SyncBatch[]>(initialSyncBatches);
  const batches = propBatches || internalBatches;
  const batchesRef = useRef(batches);
  batchesRef.current = batches;

  const setBatches = (updater: SyncBatch[] | ((prev: SyncBatch[]) => SyncBatch[])) => {
    if (onUpdateBatches) {
      onUpdateBatches(updater);
    } else {
      setInternalBatches(updater);
    }
  };

  // 筛选条件：根类型、执行状态、任务编号或任务名称搜索、重置
  const [selectedRootType, setSelectedRootType] = useState<string>(initialRootTypeFilter || 'ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // 抽屉详情选中的批次 ID
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(initialSelectedBatchId || null);
  const [selectionNotice, setSelectionNotice] = useState<string | null>(null);

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
      const exists = batches.some(batch => batch.id === initialSelectedBatchId);
      setSelectedBatchId(exists ? initialSelectedBatchId : null);
      setSelectionNotice(exists ? null : `未找到任务 ${initialSelectedBatchId}，已返回同步记录列表。`);
      const selectedBatch = batches.find(batch => batch.id === initialSelectedBatchId);
      setSelectedRootType(
        initialRootTypeFilter && selectedBatch?.rootTypes.includes(initialRootTypeFilter as SyncRootType)
          ? initialRootTypeFilter
          : 'ALL',
      );
      setSelectedStatus('ALL');
      setSearchKeyword('');
      if (onClearSelectedBatchId) {
        onClearSelectedBatchId();
      }
    }
  }, [initialSelectedBatchId, initialRootTypeFilter, onClearSelectedBatchId, batches]);

  useEffect(() => {
    if (selectedBatchId && !batches.some(batch => batch.id === selectedBatchId)) {
      setSelectionNotice(`任务 ${selectedBatchId} 已不存在，已返回同步记录列表。`);
      setSelectedBatchId(null);
      setSelectedRootType('ALL');
      setSelectedStatus('ALL');
      setSearchKeyword('');
    }
  }, [batches, selectedBatchId]);

  // 重置筛选条件
  const handleResetFilters = () => {
    setSelectedRootType('ALL');
    setSelectedStatus('ALL');
    setSearchKeyword('');
  };

  // 过滤后的任务列表
  const filteredBatches = useMemo(() => {
    return batches.filter(batch => {
      // 根类型筛选
      if (selectedRootType !== 'ALL') {
        if (!batch.rootTypes.includes(selectedRootType as SyncRootType)) {
          return false;
        }
      }
      // 执行状态筛选
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

  // 顶部关键指标收敛为 3 个：任务总数 / 进行中 / 待处理异常
  const summaryMetrics = useMemo(() => {
    const total = batches.length;
    const running = batches.filter(b => b.executionStatus === 'RUNNING').length;
    const pendingIssues = batches.filter(
      b => b.executionStatus === 'FAILED' || b.executionStatus === 'PARTIAL_SUCCESS'
    ).length;
    return { total, running, pendingIssues };
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
      id: `NOTE-${crypto.randomUUID()}`,
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

  // 重试范围必须来自已取得的源端数量或本批次可重试异常记录。
  const handleExecuteRetry = () => {
    if (!activeBatch || isRetrying || activeBatch.taskType === 'RESET') return;
    const targetBatchId = activeBatch.id;
    const initialTaskFailure = activeBatch.executionStatus === 'FAILED';
    if (initialTaskFailure && !isKnownSyncCount(activeBatch.sourceDataCount)) {
      showToast('源端数量待获取，暂不能确定任务重试范围', 'warning');
      return;
    }
    if (!initialTaskFailure && !activeBatch.failedRecords.some(record => record.retryable)) {
      showToast('当前批次无可重试的数据', 'warning');
      return;
    }

    setIsRetrying(true);
    const startedAt = new Date();
    const newBatchId = `SYNC-RETRY-${crypto.randomUUID()}`;

    setTimeout(() => {
      setIsRetrying(false);
      const currentTargetBatch = batchesRef.current.find(batch => batch.id === targetBatchId);
      if (!currentTargetBatch || currentTargetBatch.taskType === 'RESET') {
        showToast('原同步任务已不存在，无法重试', 'warning');
        return;
      }
      const isTaskFailure = currentTargetBatch.executionStatus === 'FAILED';
      const retryableDataRecords = currentTargetBatch.failedRecords.filter(record => record.retryable);
      const retryCount = isTaskFailure ? currentTargetBatch.sourceDataCount : retryableDataRecords.length;
      if (!isKnownSyncCount(retryCount) || (!isTaskFailure && retryCount === 0)) {
        showToast('未取得有效重试范围，未创建重试任务', 'warning');
        return;
      }

      const completedAt = new Date();
      const startTime = formatLocalDateTime(startedAt);
      const endTime = formatLocalDateTime(completedAt);
      const newRetryBatch: SyncBatch = {
        id: newBatchId,
        taskType: 'SYNC',
        jobName: `${currentTargetBatch.jobName} - 失败重试`,
        parentBatchId: currentTargetBatch.id,
        rootTypes: [...currentTargetBatch.rootTypes],
        syncMethod: 'COMPENSATION',
        triggerType: 'RETRY',
        startTime,
        endTime,
        durationText: `${Math.max(1, Math.round((completedAt.getTime() - startedAt.getTime()) / 1000))}秒`,
        sourceDataCount: retryCount,
        successCount: retryCount,
        failedCount: 0,
        skippedCount: 0,
        executionStatus: 'SUCCESS',
        failedRecords: [],
        statusNote: isTaskFailure
          ? `重新执行原同步任务，完成 ${formatSyncCount(retryCount)} 条数据同步。`
          : `对原批次 ${currentTargetBatch.id} 中 ${formatSyncCount(retryCount)} 条可重试异常数据重新同步，全部成功写入。`
      };
      const linkedNote: HandlingNote = {
        id: `NOTE-${crypto.randomUUID()}`,
        content: `已发起重试，生成新批次 ${newBatchId}，执行结果：同步完成。`,
        operator: '李晓华 (数据管理员)',
        createdAt: endTime
      };

      // 仅更新目标批次并插入新任务，保留等待期间其他任务和人工说明的变化。
      setBatches(prev => {
        if (!prev.some(batch => batch.id === targetBatchId)) return prev;
        return [newRetryBatch, ...prev.map(batch => batch.id === targetBatchId ? {
          ...batch,
          failedRecords: batch.failedRecords.map(record => retryableDataRecords.some(retry => retry.id === record.id)
            ? { ...record, latestRetryResult: 'SUCCESS' as const }
            : record),
          handlingNotes: [linkedNote, ...(batch.handlingNotes || [])]
        } : batch)];
      });
      setLastGeneratedBatchId(newBatchId);
      showToast(`已成功重试 ${formatSyncCount(retryCount)} 条数据，已生成新批次 ${newBatchId}`, 'success');
    }, 1200);
  };

  return (
    <div className="min-w-0 text-[var(--ty-font-main-color)] relative font-sans">
      {/* Toast 消息提示 */}
      {toastMessage && (
        <div className="fixed top-[60px] left-1/2 -translate-x-1/2 z-50 w-[min(800px,calc(100vw-32px))] transition-all duration-300">
          <div
            className={`px-4 py-2 rounded-ty-sm shadow-ty-lg text-ty-xs font-medium flex items-center space-x-2 border ${
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
      <div className="space-y-4">
        {/* 顶部标题 */}
        <div className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Database className="w-5 h-5 text-[var(--ty-primary-color)]" />
            <h1 className="text-ty-xl font-semibold text-[var(--ty-font-main-color)]">数据同步记录</h1>
            <span className="text-ty-xs bg-[var(--ty-fill-color)] text-[var(--ty-font-sub-color)] min-h-6 px-2 inline-flex items-center rounded-ty-xs font-medium border border-[var(--ty-border-color)]">
              一阶段检索底座
            </span>
          </div>
        </div>

        {/* 顶部紧凑指标摘要：收敛为 3 个关键指标 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-4 flex items-center justify-between">
            <div>
              <span className="text-ty-xs text-[var(--ty-font-sub-color)] block">任务总数</span>
              <span className="text-ty-xl font-bold text-[var(--ty-font-main-color)] mt-0.5 block">{summaryMetrics.total}</span>
            </div>
            <div className="w-9 h-9 rounded-ty-sm bg-[var(--ty-fill-color)] flex items-center justify-center text-[var(--ty-font-sub-color)]">
              <Layers className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-4 flex items-center justify-between">
            <div>
              <span className="text-ty-xs text-[var(--ty-font-sub-color)] block">进行中</span>
              <span className="text-ty-xl font-bold text-[var(--ty-primary-color)] mt-0.5 block">{summaryMetrics.running}</span>
            </div>
            <div className="w-9 h-9 rounded-ty-sm bg-[var(--ty-primary-lighter-color)]/30 flex items-center justify-center text-[var(--ty-primary-color)]">
              <RefreshCw className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-4 flex items-center justify-between">
            <div>
              <span className="text-ty-xs text-[var(--ty-font-sub-color)] block">待处理异常</span>
              <span className="text-ty-xl font-bold text-[var(--ty-orange-color)] mt-0.5 block">{summaryMetrics.pendingIssues}</span>
            </div>
            <div className="w-9 h-9 rounded-ty-sm bg-[var(--ty-orange-lightest-color)] border border-[var(--ty-orange-color)]/30 flex items-center justify-center text-[var(--ty-orange-color)]">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* 筛选条件栏：根类型、执行状态、搜索框与重置 */}
        <div className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-4 flex flex-wrap items-center gap-3">
          {/* 根类型筛选 */}
          <div className="flex items-center space-x-2 text-ty-xs">
            <span className="text-[var(--ty-font-main-color)] font-medium whitespace-nowrap">根类型:</span>
            <select
              value={selectedRootType}
              onChange={e => setSelectedRootType(e.target.value)}
              className="h-8 bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm px-3 text-ty-xs text-[var(--ty-font-main-color)] hover:border-[var(--ty-border-color)] focus:border-[var(--ty-primary-color)] focus:outline-hidden"
            >
              <option value="ALL">全部根类型</option>
              <option value="Part">零部件 (Part)</option>
              <option value="Document">文档 (Document)</option>
              <option value="Process">工艺路线 (Process)</option>
            </select>
          </div>

          {/* 执行状态筛选 */}
          <div className="flex items-center space-x-2 text-ty-xs">
            <span className="text-[var(--ty-font-main-color)] font-medium whitespace-nowrap">执行状态:</span>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="h-8 bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm px-3 text-ty-xs text-[var(--ty-font-main-color)] hover:border-[var(--ty-border-color)] focus:border-[var(--ty-primary-color)] focus:outline-hidden"
            >
              <option value="ALL">全部状态</option>
              <option value="RUNNING">进行中</option>
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
              placeholder="搜索任务编号或任务名称..."
              value={searchKeyword}
              onChange={e => setSearchKeyword(e.target.value)}
              className="w-full h-8 pl-8 pr-3 text-ty-xs border border-[var(--ty-border-color)] rounded-ty-sm focus:outline-hidden focus:border-[var(--ty-primary-color)] text-[var(--ty-font-main-color)] placeholder:text-[var(--ty-font-placeholder-color)] bg-[var(--ty-fill-white-color)]"
            />
          </div>

          {/* 重置按钮 */}
          <button
            onClick={handleResetFilters}
            className="h-8 flex items-center space-x-1 px-3 border border-[var(--ty-border-color)] rounded-ty-sm text-ty-xs text-[var(--ty-font-sub-color)] hover:text-[var(--ty-font-main-color)] hover:bg-[var(--ty-fill-color)] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3 text-[var(--ty-font-sub-light-color)]" />
            <span>重置</span>
          </button>

          {/* 结果条数提示 */}
          <div className="ml-auto text-ty-xs text-[var(--ty-font-sub-color)]">
            共 <span className="font-medium text-[var(--ty-font-main-color)]">{filteredBatches.length}</span> 条任务记录
          </div>
        </div>

        {selectionNotice && (
          <div role="status" className="flex items-start gap-2 p-3 rounded-ty-sm border border-[var(--ty-orange-color)]/30 bg-[var(--ty-orange-lightest-color)] text-ty-xs">
            <Info className="w-4 h-4 shrink-0" />
            <span className="min-w-0 break-all">{selectionNotice}</span>
          </div>
        )}

        {/* 任务表格卡片：长任务 ID 在单元格内换行，状态与操作保持可见 */}
        <div className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="ty-data-table w-full min-w-[1560px] text-left border-collapse">
              <thead>
                <tr className="bg-[var(--ty-fill-weak-dark-color)] text-[var(--ty-font-main-color)] text-ty-sm font-semibold border-b border-[var(--ty-border-color)]">
                  <th className="py-3 px-2 w-12 text-center">序号</th>
                  <th className="py-3 px-3 min-w-44">任务编号</th>
                  <th className="py-3 px-3 min-w-44">任务名称</th>
                  <th className="py-3 px-2 min-w-28">对象类型</th>
                  <th className="py-3 px-2 min-w-24">任务类型</th>
                  <th className="py-3 px-2 min-w-28">执行方式</th>
                  <th className="py-3 px-2 min-w-24">触发方式</th>
                  <th className="py-3 px-2 min-w-40">开始时间</th>
                  <th className="py-3 px-2 min-w-24">耗时</th>
                  <th className="py-3 px-2 min-w-64">数据结果</th>
                  <th className="py-3 px-2 min-w-28 whitespace-nowrap">执行状态</th>
                  <th className="py-3 px-2 min-w-24 text-right whitespace-nowrap">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--ty-border-light-color)]">
                {filteredBatches.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-[var(--ty-font-sub-light-color)]">
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
                  filteredBatches.map((batch, index) => {
                    const statusMeta = getSyncStatusMeta(batch.executionStatus, batch.taskType);
                    const isSelected = selectedBatchId === batch.id;
                    const isNewlyCreated = lastGeneratedBatchId === batch.id;
                    const isResetBatch = batch.taskType === 'RESET';

                    return (
                      <tr
                        key={batch.id}
                        onClick={() => setSelectedBatchId(batch.id)}
                        className={`transition-colors cursor-pointer hover:bg-[var(--ty-fill-weak-dark-color)] ${
                          isSelected ? 'bg-[var(--ty-primary-lighter-color)]/20' : ''
                        } ${isNewlyCreated ? 'bg-[var(--ty-green-light-color)]/20' : ''}`}
                      >
                        <td className="py-3 px-2 text-center text-ty-xs text-[var(--ty-font-sub-color)]">{index + 1}</td>
                        <td className="py-3 px-3 break-all font-mono font-semibold" title={batch.parentBatchId ? `原任务：${batch.parentBatchId}` : undefined}>{batch.id}</td>
                        <td className="py-3 px-3">{batch.jobName}</td>
                        <td className="py-3 px-2"><span className="inline-flex flex-wrap gap-1">{batch.rootTypes.map(rt => <span key={rt} className="min-h-6 px-2 inline-flex items-center rounded-ty-xs bg-[var(--ty-fill-color)] border border-[var(--ty-border-color)]">{getRootTypeDisplayName(rt)}</span>)}</span></td>
                        <td className="py-3 px-2">{isResetBatch ? '接入重置' : batch.triggerType === 'RETRY' ? '重试任务' : '同步任务'}</td>
                        <td className="py-3 px-2">{isResetBatch ? '清空检索底座' : batch.actualStrategy || getSyncMethodLabel(batch.syncMethod)}</td>
                        <td className="py-3 px-2">{getTriggerTypeLabel(batch.triggerType)}</td>
                        <td className="py-3 px-2 font-mono whitespace-nowrap">{batch.startTime}</td>
                        <td className="py-3 px-2 text-[var(--ty-font-sub-color)] whitespace-nowrap">{batch.executionStatus === 'RUNNING' ? '进行中' : batch.durationText || '已完成'}</td>

                        {/* 3. 数据结果 / 影响 */}
                        <td className="py-3 px-2">
                          {isResetBatch ? (
                            <div className="flex flex-col">
                              <div className="flex flex-wrap items-center gap-x-2 text-ty-sm">
                                <span className="text-[var(--ty-font-main-color)]">
                                  清空底座: <strong className="text-[var(--ty-red-color)] font-semibold">
                                    {isKnownSyncCount(batch.resetAuditDetail?.deletedDocCount)
                                      ? `${batch.resetAuditDetail.deletedDocCount.toLocaleString()} 条`
                                      : '待获取'}
                                  </strong>
                                </span>
                              </div>
                              <span className="text-[var(--ty-font-sub-color)] text-ty-xs mt-0.5">
                                {batch.executionStatus === 'FAILED'
                                  ? '字段配置保持原状'
                                  : batch.executionStatus === 'RUNNING'
                                  ? '字段处理结果待获取'
                                  : <>保留草稿映射: <strong>{formatSyncCount(batch.resetAuditDetail?.retainedDraftCount)}</strong> 个字段</>}
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col">
                              <div className="flex flex-wrap items-center gap-x-2 text-ty-sm">
                                <span className="text-[var(--ty-font-main-color)]">总数: <strong className="text-[var(--ty-font-main-color)]">{formatSyncCount(batch.sourceDataCount)}</strong></span>
                                <span className="text-[var(--ty-green-color)] font-medium">成功: {formatSyncCount(batch.successCount)}</span>
                                {(!isKnownSyncCount(batch.failedCount) || batch.failedCount > 0) && (
                                  <span className={batch.executionStatus === 'FAILED' ? 'text-[var(--ty-red-color)] font-semibold' : 'text-[var(--ty-orange-color)] font-semibold'}>
                                    异常: {formatSyncCount(batch.failedCount)}
                                  </span>
                                )}
                              </div>
                              {batch.executionStatus === 'RUNNING' && (
                                <span className="text-[var(--ty-primary-color)] text-ty-xs mt-0.5">
                                  {getSyncProgressText(batch)}
                                </span>
                              )}
                              {(!isKnownSyncCount(batch.skippedCount) || batch.skippedCount > 0) && (
                                <span className="text-[var(--ty-font-sub-color)] text-ty-xs mt-0.5">
                                  {isKnownSyncCount(batch.skippedCount) ? `跳过 ${formatSyncCount(batch.skippedCount)} 条，不计为同步异常` : '跳过数量: 待获取'}
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* 4. 执行状态 */}
                        <td className="py-3 px-2 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center min-h-6 px-2 inline-flex items-center rounded-ty-xs text-ty-xs font-medium border whitespace-nowrap ${statusMeta.bgClass} ${statusMeta.textClass} ${statusMeta.borderClass}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full mr-2 shrink-0 ${statusMeta.dotClass}`}></span>
                            {statusMeta.label}
                          </span>
                        </td>

                        {/* 5. 操作 */}
                        <td className="py-3 px-2 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end space-x-2">
                            {isResetBatch ? (
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  setSelectedBatchId(batch.id);
                                }}
                                className="h-7 min-w-16 px-3 text-ty-xs font-medium text-[var(--ty-font-main-light-color)] bg-[var(--ty-fill-color)] hover:bg-[var(--ty-fill-weak-dark-color)] rounded-ty-sm border border-[var(--ty-border-color)] transition-colors cursor-pointer"
                              >
                                查看详情
                              </button>
                            ) : batch.executionStatus === 'FAILED' ? (
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  setSelectedBatchId(batch.id);
                                }}
                                className="h-7 min-w-16 px-3 text-ty-xs font-medium text-[var(--ty-font-main-light-color)] bg-[var(--ty-red-lightest-color)] hover:bg-[var(--ty-red-light-color)] rounded-ty-sm border border-[var(--ty-red-color)]/30 transition-colors cursor-pointer"
                              >
                                查看失败
                              </button>
                            ) : isKnownSyncCount(batch.failedCount) && batch.failedCount > 0 ? (
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  setSelectedBatchId(batch.id);
                                }}
                                className="h-7 min-w-16 px-3 text-ty-xs font-medium text-[var(--ty-font-main-light-color)] bg-[var(--ty-orange-lightest-color)] hover:bg-[var(--ty-orange-light-color)] rounded-ty-sm border border-[var(--ty-orange-color)]/30 transition-colors cursor-pointer"
                              >
                                查看异常
                              </button>
                            ) : (
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  setSelectedBatchId(batch.id);
                                }}
                                className="h-7 min-w-16 px-3 text-ty-xs font-medium text-[var(--ty-font-main-light-color)] hover:text-[var(--ty-primary-color)] bg-[var(--ty-primary-lightest-color)] hover:bg-[var(--ty-primary-light-color)] rounded-ty-sm border border-[var(--ty-primary-color)]/30 transition-colors cursor-pointer"
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
          <section role="dialog" aria-modal="true" aria-labelledby="sync-task-drawer-title" className="w-[min(800px,100vw)] bg-[var(--ty-fill-white-color)] h-full shadow-ty-lg flex flex-col border-l border-[var(--ty-border-color)] z-50 overflow-hidden">
            {/* 抽屉头部 */}
            <div className="px-5 py-4 border-b border-[var(--ty-border-color)] flex items-center justify-between bg-[var(--ty-fill-weak-dark-color)] shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                {activeBatch.taskType === 'RESET' ? (
                  <RotateCcw className="w-4 h-4 text-[var(--ty-red-color)]" />
                ) : (
                  <Database className="w-4 h-4 text-[var(--ty-primary-color)]" />
                )}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <h2 id="sync-task-drawer-title" className="text-ty-lg font-semibold text-[var(--ty-font-main-color)]">
                      {activeBatch.taskType === 'RESET' ? '接入重置任务详情' : '同步任务详情'}
                    </h2>
                    <span className="text-ty-xs font-mono font-medium break-all text-[var(--ty-font-main-color)]">
                      {activeBatch.id}
                    </span>
                    {activeBatch.taskType === 'RESET' ? (
                      <span className="text-ty-2xs min-h-6 px-2 inline-flex items-center rounded-ty-xs bg-[var(--ty-red-lightest-color)] text-[var(--ty-font-main-light-color)] border border-[var(--ty-red-color)]/30 font-semibold">
                        接入重置
                      </span>
                    ) : activeBatch.parentBatchId ? (
                      <span className="text-ty-xs break-all text-[var(--ty-font-sub-light-color)]">
                        (重试自: {activeBatch.parentBatchId})
                      </span>
                    ) : null}
                  </div>
                  <span className="text-ty-xs text-[var(--ty-font-sub-color)] block mt-0.5">{activeBatch.jobName}</span>
                </div>
              </div>
              <button
                type="button"
                aria-label="关闭同步任务详情"
                onClick={() => setSelectedBatchId(null)}
                className="w-8 h-8 shrink-0 rounded-ty-sm text-[var(--ty-font-sub-light-color)] hover:text-[var(--ty-font-main-color)] hover:bg-[var(--ty-fill-color)] flex items-center justify-center transition-colors cursor-pointer"
                title="关闭抽屉"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 抽屉内容主体区：自上而下顺序展示 */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-ty-sm text-[var(--ty-font-main-color)]">
              {activeBatch.taskType === 'RESET' ? (
                /* === 接入重置详情 (严格精简版) === */
                <div className="space-y-4">
                  {/* 1. 重置基本信息 */}
                  <div className="border border-[var(--ty-border-color)] rounded-ty-sm p-4 space-y-3">
                    <h3 className="text-ty-xs font-bold text-[var(--ty-font-main-color)] uppercase tracking-wider">重置任务信息</h3>
                    <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-ty-xs">
                      <div>
                        <span className="text-[var(--ty-font-sub-color)] block">任务编号:</span>
                        <span className="text-[var(--ty-font-main-color)] font-mono font-medium mt-0.5 block break-all">{activeBatch.id}</span>
                      </div>
                      <div>
                        <span className="text-[var(--ty-font-sub-color)] block">目标根类型:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {activeBatch.rootTypes.map(rt => (
                            <span key={rt} className="min-h-6 px-2 inline-flex items-center rounded-ty-xs bg-[var(--ty-fill-color)] text-[var(--ty-font-main-color)] font-medium border border-[var(--ty-border-color)]">
                              {getRootTypeDisplayName(rt)} ({rt})
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-[var(--ty-font-sub-color)] block">执行状态:</span>
                        <div className="mt-1">
                          {(() => {
                            const meta = getSyncStatusMeta(activeBatch.executionStatus, activeBatch.taskType);
                            return (
                              <span className={`inline-flex items-center min-h-6 px-2 inline-flex items-center rounded-ty-xs text-ty-xs font-medium border ${meta.bgClass} ${meta.textClass} ${meta.borderClass}`}>
                                <span className={`w-1.5 h-1.5 rounded-full mr-2 shrink-0 ${meta.dotClass}`}></span>
                                {meta.label}
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                      <div>
                        <span className="text-[var(--ty-font-sub-color)] block">操作人:</span>
                        <span className="text-[var(--ty-font-main-color)] font-medium mt-0.5 block">
                          {activeBatch.resetAuditDetail?.operator || '接入管理员'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[var(--ty-font-sub-color)] block">开始时间:</span>
                        <span className="text-[var(--ty-font-main-color)] font-mono mt-0.5 block">{activeBatch.startTime}</span>
                      </div>
                      <div>
                        <span className="text-[var(--ty-font-sub-color)] block">结束时间:</span>
                        <span className="text-[var(--ty-font-main-color)] font-mono mt-0.5 block">{activeBatch.endTime || '正在重置中'}</span>
                      </div>
                    </div>
                  </div>

                  {/* 2. 实际清理与保留结果 */}
                  <div className="bg-[var(--ty-fill-weak-dark-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-4 space-y-3">
                    <h3 className="text-ty-xs font-bold text-[var(--ty-font-main-color)] uppercase tracking-wider">执行影响与处理结果</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-light-color)] rounded-ty-sm p-3 text-center">
                        <span className="text-ty-xs text-[var(--ty-font-sub-color)] block">已清空检索底座数据</span>
                        <span className="text-ty-md font-bold text-[var(--ty-red-color)] mt-1 block">
                          {isKnownSyncCount(activeBatch.resetAuditDetail?.deletedDocCount)
                            ? `${activeBatch.resetAuditDetail.deletedDocCount.toLocaleString()} 条`
                            : '待获取'}
                        </span>
                      </div>
                      <div className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-light-color)] rounded-ty-sm p-3 text-center">
                        <span className="text-ty-xs text-[var(--ty-font-sub-color)] block">字段处理结果</span>
                        <span className="text-ty-md font-bold text-[var(--ty-primary-color)] mt-1 block">
                          {activeBatch.executionStatus === 'FAILED'
                            ? '保持原状'
                            : activeBatch.executionStatus === 'RUNNING'
                            ? '待获取'
                            : `保留转草稿 ${formatSyncCount(activeBatch.resetAuditDetail?.retainedDraftCount)} 个`}
                        </span>
                      </div>
                    </div>
                    {/* 一句恢复路径 */}
                    <div className="pt-2 text-ty-xs text-[var(--ty-font-sub-color)] flex items-center space-x-2">
                      <Info className="w-3.5 h-3.5 text-[var(--ty-primary-color)] shrink-0" />
                      <span>{activeBatch.executionStatus === 'FAILED'
                        ? '重置失败，字段配置、底座数据和根类型状态均保持原状。'
                        : activeBatch.executionStatus === 'RUNNING'
                        ? '重置正在执行，处理结果待获取。'
                        : '恢复路径：重新生效字段配置并同步成功后恢复查询。'}</span>
                    </div>
                  </div>

                  {/* 3. 若重置失败，展示失败阶段、原因与管理员介入标识 */}
                  {activeBatch.executionStatus === 'FAILED' && (
                    <div className="border border-[var(--ty-red-color)]/30 bg-[var(--ty-red-lightest-color)] rounded-ty-sm p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-ty-xs font-bold text-[var(--ty-red-color)] flex items-center space-x-2">
                          <XCircle className="w-4 h-4 text-[var(--ty-red-color)] shrink-0" />
                          <span>重置执行失败</span>
                        </h3>
                        {activeBatch.resetAuditDetail?.needsAdminIntervention && (
                          <span className="text-ty-2xs min-h-6 px-2 inline-flex items-center rounded-ty-xs bg-[var(--ty-red-color)] text-[var(--ty-font-white-color)] font-semibold">
                            需要系统管理员介入
                          </span>
                        )}
                      </div>
                      <div className="space-y-2 text-ty-xs text-[var(--ty-font-main-color)]">
                        <div>
                          <span className="text-[var(--ty-font-sub-color)]">失败阶段:</span>{' '}
                          <span className="font-medium">{activeBatch.resetAuditDetail?.failureStage || activeBatch.taskFailureDetail?.failureStage || '待获取'}</span>
                        </div>
                        <div>
                          <span className="text-[var(--ty-font-sub-color)]">失败原因:</span>{' '}
                          <span className="font-medium">{activeBatch.resetAuditDetail?.failureReason || activeBatch.taskFailureDetail?.failureReason || activeBatch.statusNote || '待获取'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* 1. 同步结果摘要 */}
              <div className="bg-[var(--ty-fill-weak-dark-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-4 space-y-3">
                <h3 className="text-ty-xs font-bold text-[var(--ty-font-main-color)] uppercase tracking-wider">同步结果摘要</h3>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-light-color)] rounded-ty-sm p-3 text-center">
                    <span className="text-ty-xs text-[var(--ty-font-sub-color)] block">同步总数</span>
                    <span className="text-ty-md font-bold text-[var(--ty-font-main-color)] mt-0.5 block">
                      {formatSyncCount(activeBatch.sourceDataCount)}
                    </span>
                  </div>
                  <div className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-light-color)] rounded-ty-sm p-3 text-center">
                    <span className="text-ty-xs text-[var(--ty-green-color)] block">成功数量</span>
                    <span className="text-ty-md font-bold text-[var(--ty-green-color)] mt-0.5 block">
                      {formatSyncCount(activeBatch.successCount)}
                    </span>
                  </div>
                  <div className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-light-color)] rounded-ty-sm p-3 text-center">
                    <span className="text-ty-xs text-[var(--ty-orange-color)] block">异常数量</span>
                    <span className={`text-ty-md font-bold mt-0.5 block ${activeBatch.executionStatus === 'FAILED' ? 'text-[var(--ty-red-color)]' : 'text-[var(--ty-orange-color)]'}`}>
                      {formatSyncCount(activeBatch.failedCount)}
                    </span>
                  </div>
                </div>

                {/* 跳过说明 / 正在处理说明 */}
                {(!isKnownSyncCount(activeBatch.skippedCount) || activeBatch.skippedCount > 0) && (
                  <div className="text-ty-xs text-[var(--ty-font-main-color)] bg-[var(--ty-fill-white-color)]/70 p-2 rounded-ty-sm border border-[var(--ty-border-light-color)] flex items-center space-x-2">
                    <Info className="w-3.5 h-3.5 text-[var(--ty-primary-color)] shrink-0" />
                    <span>{isKnownSyncCount(activeBatch.skippedCount) ? `跳过 ${formatSyncCount(activeBatch.skippedCount)} 条，不计为同步异常。` : '跳过数量: 待获取'}</span>
                  </div>
                )}
                {activeBatch.executionStatus === 'RUNNING' && (
                  <div className="text-ty-xs text-[var(--ty-font-main-light-color)] bg-[var(--ty-primary-lightest-color)] p-2 rounded-ty-sm border border-[var(--ty-primary-color)]/30 flex items-center space-x-2">
                    <RefreshCw className="w-3.5 h-3.5 text-[var(--ty-primary-color)] shrink-0 animate-spin" />
                    <span>
                      {getSyncProgressText(activeBatch)}
                    </span>
                  </div>
                )}
              </div>

              {/* 2. 同步基本信息：含实际执行方式与判定原因 */}
              <div className="border border-[var(--ty-border-color)] rounded-ty-sm p-4 space-y-3">
                <h3 className="text-ty-xs font-bold text-[var(--ty-font-main-color)] uppercase tracking-wider">同步任务信息</h3>
                <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-ty-xs">
                  <div>
                    <span className="text-[var(--ty-font-sub-color)] block">目标根类型:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {activeBatch.rootTypes.map(rt => (
                        <span
                          key={rt}
                          className="min-h-6 px-2 inline-flex items-center rounded-ty-xs bg-[var(--ty-fill-color)] text-[var(--ty-font-main-color)] font-medium border border-[var(--ty-border-color)]"
                        >
                          {getRootTypeDisplayName(rt)}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-[var(--ty-font-sub-color)] block">执行状态:</span>
                    <div className="mt-1">
                      {(() => {
                        const meta = getSyncStatusMeta(activeBatch.executionStatus, activeBatch.taskType);
                        return (
                          <span
                            className={`inline-flex items-center min-h-6 px-2 inline-flex items-center rounded-ty-xs text-ty-xs font-medium border ${meta.bgClass} ${meta.textClass} ${meta.borderClass}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full mr-2 shrink-0 ${meta.dotClass}`}></span>
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
                    <span className="text-[var(--ty-font-sub-color)] block">实际执行方式:</span>
                    <span className="text-[var(--ty-font-main-color)] font-medium mt-0.5 block">
                      {activeBatch.actualStrategy || getSyncMethodLabel(activeBatch.syncMethod)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[var(--ty-font-sub-color)] block">触发方式:</span>
                    <span className="text-[var(--ty-font-main-color)] mt-0.5 block">{getTriggerTypeLabel(activeBatch.triggerType)}</span>
                  </div>

                  {activeBatch.strategyReason && (
                    <div className="col-span-2 bg-[var(--ty-fill-weak-dark-color)] p-2 rounded-ty-sm border border-[var(--ty-border-light-color)]">
                      <span className="text-[var(--ty-font-sub-color)] block">判定原因:</span>
                      <span className="text-[var(--ty-font-main-color)] mt-0.5 block">{activeBatch.strategyReason}</span>
                    </div>
                  )}
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
                      <XCircle className="w-4 h-4 text-[var(--ty-red-color)] mr-2 shrink-0" />
                      <span>任务级中断根因与排查信息</span>
                    </h3>
                    <span className="text-ty-xs bg-[var(--ty-red-lightest-color)] text-[var(--ty-font-main-light-color)] min-h-6 px-2 inline-flex items-center rounded-ty-xs font-semibold border border-[var(--ty-red-color)]/30">
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
                        {isKnownSyncCount(activeBatch.sourceDataCount) ? `全批次 ${formatSyncCount(activeBatch.sourceDataCount)} 条记录未完成同步` : '源端数据总数待获取，影响数量待确认'}
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
                      <div className="mt-2 p-3 bg-[var(--ty-fill-white-color)] rounded-ty-sm border border-[var(--ty-red-color)]/20 space-y-2 text-ty-xs text-[var(--ty-font-main-color)] font-mono animate-in fade-in duration-100">
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
                      <span className="ml-2 text-[var(--ty-orange-color)] font-mono">({activeBatch.failedRecords.length})</span>
                    </h3>
                    <span className="text-ty-xs text-[var(--ty-font-sub-color)]">
                      展示 {activeBatch.failedRecords.length} 条异常明细
                    </span>
                  </div>

                  {activeBatch.failedRecords.length === 0 ? (
                    <div className="border border-dashed border-[var(--ty-border-color)] rounded-ty-sm p-6 text-center text-[var(--ty-font-sub-light-color)] bg-[var(--ty-fill-weak-dark-color)]/50">
                      <CheckCircle2 className="w-6 h-6 text-[var(--ty-green-color)] mx-auto mb-2" />
                      <span className="text-ty-xs">本批次没有异常数据，所有记录均已成功同步或合规跳过。</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activeBatch.failedRecords.map(record => {
                        const isExpanded = !!expandedTechIds[record.id];

                        return (
                          <div
                            key={record.id}
                            className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-4 space-y-2 hover:border-[var(--ty-primary-lighter-color)] transition-colors"
                          >
                            {/* 异常卡片头部 */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <span className="text-ty-xs font-bold text-[var(--ty-font-main-color)] font-mono bg-[var(--ty-fill-color)] min-h-6 px-2 inline-flex items-center rounded-ty-xs border border-[var(--ty-border-color)]">
                                  {record.recordKey}
                                </span>
                                <span className="text-ty-xs text-[var(--ty-font-main-color)] font-medium">
                                  {getRootTypeDisplayName(record.rootType)}
                                </span>
                              </div>

                              <div className="flex items-center space-x-2">
                                {/* 是否可重试状态 */}
                                {record.retryable ? (
                                  <span className="text-ty-xs min-h-6 px-2 inline-flex items-center rounded-ty-xs bg-[var(--ty-green-lightest-color)] text-[var(--ty-font-main-light-color)] border border-[var(--ty-green-color)]/30 font-medium inline-flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--ty-green-color)] shrink-0" />
                                    可重试
                                  </span>
                                ) : (
                                  <span className="text-ty-xs min-h-6 px-2 inline-flex items-center rounded-ty-xs bg-[var(--ty-fill-color)] text-[var(--ty-font-sub-light-color)] border border-[var(--ty-border-color)] font-medium">
                                    不可重试
                                  </span>
                                )}

                                {/* 最近重试状态 */}
                                {record.latestRetryResult === 'SUCCESS' && (
                                  <span className="text-ty-xs min-h-6 px-2 inline-flex items-center rounded-ty-xs bg-[var(--ty-green-lightest-color)] text-[var(--ty-font-main-light-color)] border border-[var(--ty-green-color)]/30 font-semibold inline-flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--ty-green-color)] shrink-0" />
                                    重试成功
                                  </span>
                                )}
                                {record.latestRetryResult === 'RETRYING' && (
                                  <span className="text-ty-xs min-h-6 px-2 inline-flex items-center rounded-ty-xs bg-[var(--ty-primary-lightest-color)] text-[var(--ty-font-main-light-color)] border border-[var(--ty-primary-color)]/30 font-semibold animate-pulse inline-flex items-center gap-1">
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
                                <div className="mt-2 p-3 bg-[var(--ty-fill-weak-dark-color)] rounded-ty-sm border border-[var(--ty-border-color)] space-y-2 text-ty-xs text-[var(--ty-font-main-color)] font-mono animate-in fade-in duration-100">
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
                </>
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
                      <div key={note.id} className="bg-[var(--ty-fill-weak-dark-color)] p-3 rounded-ty-sm border border-[var(--ty-border-light-color)] text-ty-xs">
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
                      className={`h-7 min-w-16 px-3 text-ty-xs rounded-ty-sm font-medium transition-colors cursor-pointer ${
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
            <div className="px-5 py-4 border-t border-[var(--ty-border-color)] bg-[var(--ty-fill-white-color)] flex items-center justify-between shrink-0">
              <div className="text-ty-xs text-[var(--ty-font-sub-color)]">
                {activeBatch.taskType === 'RESET' ? (
                  <span className="text-[var(--ty-font-sub-color)] flex items-center space-x-1">
                    <Info className="w-3.5 h-3.5 text-[var(--ty-primary-color)] shrink-0" />
                    <span>{activeBatch.executionStatus === 'SUCCESS'
                      ? '恢复路径：重新生效字段配置并同步成功后恢复查询。'
                      : activeBatch.executionStatus === 'FAILED'
                      ? '重置失败，字段与底座保持原状。'
                      : '重置正在执行，处理结果待获取。'}</span>
                  </span>
                ) : activeBatch.executionStatus === 'FAILED' ? (
                  <span>{isKnownSyncCount(activeBatch.sourceDataCount) ? '任务级中断，支持重新执行整个同步任务' : '源端数量待获取，暂不能确定任务重试范围'}</span>
                ) : (
                  <span>
                    本批次共 {activeBatch.failedRecords.length} 条异常，
                    可重试 {activeBatch.failedRecords.filter(r => r.retryable).length} 条
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setSelectedBatchId(null)}
                  className="h-8 min-w-[68px] px-4 text-ty-xs font-medium border border-[var(--ty-border-color)] rounded-ty-sm text-[var(--ty-font-main-color)] hover:bg-[var(--ty-fill-color)] transition-colors cursor-pointer"
                >
                  关闭
                </button>

                {/* 仅常规数据同步支持重试操作 */}
                {activeBatch.taskType !== 'RESET' && (
                  <>
                    {/* 任务级失败重试按钮 */}
                    {activeBatch.executionStatus === 'FAILED' && (
                      <button
                        onClick={handleExecuteRetry}
                        disabled={isRetrying || !isKnownSyncCount(activeBatch.sourceDataCount)}
                        title={!isKnownSyncCount(activeBatch.sourceDataCount) ? '源端数量待获取，暂不能确定任务重试范围' : '重试整个同步任务'}
                        className="h-8 min-w-[68px] flex items-center space-x-2 px-4 text-ty-xs font-semibold rounded-ty-sm bg-[var(--ty-primary-color)] text-[var(--ty-font-white-color)] hover:bg-[var(--ty-primary-hover-color)] active:bg-[var(--ty-primary-active-color)] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
                        className={`h-8 min-w-[68px] flex items-center space-x-2 px-4 text-ty-xs font-semibold rounded-ty-sm transition-all cursor-pointer ${
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
                  </>
                )}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
