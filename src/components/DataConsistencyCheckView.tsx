import React, { useState, useMemo, useEffect } from 'react';
import {
  Play,
  AlertCircle,
  Loader2,
  X,
  ArrowRight,
  Info,
  CheckCircle2,
  XCircle,
  Clock,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import {
  ConsistencyBatchRecord,
  ConsistencyObjectResult,
  ConsistencyItemStatus,
  ConsistencyCheckRequest,
  calculateConsistencyStats,
  formatLocalDateTime,
  createConsistencyBatchId,
  OBJECT_STATUS_META,
  resolveFieldDisplayName
} from '../types/consistencyCheck';
import {
  initialConsistencyBatches,
  ROOT_TYPE_SCOPE_OPTIONS,
  ROOT_TYPE_OBJECT_ID_PLACEHOLDER,
  buildComparisonFieldSnapshot,
  executeConsistencyRun,
  findLatestSuccessfulSyncBatch
} from '../data/consistencyCheckData';
import {
  initialMappingObjectTypes,
  initialFieldMappings
} from '../stage1MappingData';
import {
  MappingObjectType,
  FieldMappingItem
} from '../stage1MappingTypes';
import { SyncBatch } from '../syncQualityTypes';

interface DataConsistencyCheckViewProps {
  mappingObjects?: MappingObjectType[];
  fieldMappings?: Record<string, FieldMappingItem[]>;
  syncBatches?: SyncBatch[];
  batches?: ConsistencyBatchRecord[];
  onUpdateBatches?: (updater: ConsistencyBatchRecord[] | ((prev: ConsistencyBatchRecord[]) => ConsistencyBatchRecord[])) => void;
  onNavigateToSyncQuality?: (batchId?: string) => void;
  runOptions?: { forceTaskFailure?: boolean; delayMs?: number };
}

// 统一的核验范围模式
type CheckScopeMode = 'RANDOM_SAMPLE' | 'EXHAUSTIVE_SCOPE' | 'SPECIFIC_IDS';

// 详情抽屉内的 5 种筛选状态（拆开待复查与无法比对）
type DetailFilterState = 'ALL' | 'CONSISTENT' | 'INCONSISTENT' | 'PENDING_RECHECK' | 'UNABLE_TO_COMPARE';

export const DataConsistencyCheckView: React.FC<DataConsistencyCheckViewProps> = ({
  mappingObjects = initialMappingObjectTypes,
  fieldMappings = initialFieldMappings,
  syncBatches,
  batches: externalBatches,
  onUpdateBatches,
  onNavigateToSyncQuality,
  runOptions
}) => {
  // 1. 批次数据源：受控优先，内聚降级
  const [internalBatches, setInternalBatches] = useState<ConsistencyBatchRecord[]>(initialConsistencyBatches);
  const batches = externalBatches || internalBatches;
  const updateBatches = (updater: ConsistencyBatchRecord[] | ((prev: ConsistencyBatchRecord[]) => ConsistencyBatchRecord[])) => {
    if (onUpdateBatches) {
      onUpdateBatches(updater);
    } else {
      setInternalBatches(updater);
    }
  };

  // 2. 当前选中的根类型代码 (单选，严禁多选和全部根类型)
  const [selectedRootTypeCode, setSelectedRootTypeCode] = useState<string>('PART');

  // 3. 核验模式及配置
  const [scopeMode, setScopeMode] = useState<CheckScopeMode>('RANDOM_SAMPLE');
  const [sampleCount, setSampleCount] = useState<number>(50);
  const [selectedScopeId, setSelectedScopeId] = useState<string>('SCOPE_PART_FASTENER');
  const [inputObjectIds, setInputObjectIds] = useState<string>('P-30001, P-30002, P-30003, P-30004, P-30005');

  // 4. 选中的批次 ID 与明细弹窗状态
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [selectedObjectForCompare, setSelectedObjectForCompare] = useState<ConsistencyObjectResult | null>(null);
  const [isFieldPreviewModalOpen, setIsFieldPreviewModalOpen] = useState<boolean>(false);

  // 5. 从共享任务集判定运行态，切页返回后仍阻断重复启动。
  const isRunningCheck = batches.some(batch => batch.status === 'RUNNING');

  // 6. 批次详情抽屉内部的筛选与分页
  const [detailFilterStatus, setDetailFilterStatus] = useState<DetailFilterState>('ALL');
  const [detailPageIndex, setDetailPageIndex] = useState<number>(1);
  const detailPageSize = 10;

  // 7. 页面提示
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'warning' | 'error' } | null>(null);
  const showToast = (text: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 响应式解析当前查看的批次
  const selectedBatch = useMemo(() => {
    return batches.find(b => b.id === selectedBatchId) || null;
  }, [batches, selectedBatchId]);

  const closeBatchDetail = () => {
    setSelectedBatchId(null);
    setSelectedObjectForCompare(null);
    setDetailFilterStatus('ALL');
    setDetailPageIndex(1);
  };

  useEffect(() => {
    if (selectedBatchId && !selectedBatch) {
      setSelectedBatchId(null);
      setSelectedObjectForCompare(null);
      setDetailFilterStatus('ALL');
      setDetailPageIndex(1);
    }
  }, [selectedBatchId, selectedBatch]);

  // 获取当前选中的根类型元信息（严格匹配，若未找到返回 null 阻断启动）
  const currentRootType = useMemo(() => {
    const found = mappingObjects.find(m => m.id === selectedRootTypeCode);
    if (found) {
      return {
        ...found,
        displayName: found.name
      };
    }
    return null;
  }, [mappingObjects, selectedRootTypeCode]);

  // 获取平铺的字段映射列表用于核验字段提取
  const allFieldList = useMemo(() => {
    const list: FieldMappingItem[] = [];
    Object.values(fieldMappings).forEach(arr => {
      list.push(...arr);
    });
    return list;
  }, [fieldMappings]);

  // 根据当前选中的根类型动态推导只读核验字段快照
  const comparisonSnapshotResult = useMemo(() => {
    return buildComparisonFieldSnapshot(selectedRootTypeCode, allFieldList);
  }, [selectedRootTypeCode, allFieldList]);
  const snapshotError = comparisonSnapshotResult.uniqueKeyError || comparisonSnapshotResult.fieldsError;

  // 当前根类型可用的指定分类范围选项
  const currentScopeOptions = useMemo(() => {
    return ROOT_TYPE_SCOPE_OPTIONS[selectedRootTypeCode] || [];
  }, [selectedRootTypeCode]);

  // 当切换根类型时，同步更新默认范围和输入示例
  const handleRootTypeChange = (newRootCode: string) => {
    setSelectedRootTypeCode(newRootCode);
    const scopeOptions = ROOT_TYPE_SCOPE_OPTIONS[newRootCode] || [];
    if (scopeOptions.length > 0) {
      setSelectedScopeId(scopeOptions[0].id);
    }
    if (newRootCode === 'PART') {
      setInputObjectIds('P-30001, P-30002, P-30003, P-30004, P-30005');
    } else if (newRootCode === 'DOCUMENT') {
      setInputObjectIds('DOC-50001, DOC-50002, DOC-50003');
    } else {
      setInputObjectIds('PR-70001, PR-70002');
    }
  };

  // 解析手动输入的指定对象 ID（去重，不补位）
  const parsedIds = useMemo(() => {
    const list = inputObjectIds
      .split(/[\n,，\s]+/)
      .map(s => s.trim())
      .filter(Boolean);
    const uniqueList = Array.from(new Set(list));
    return {
      rawCount: list.length,
      uniqueIds: uniqueList,
      duplicateCount: list.length - uniqueList.length
    };
  }, [inputObjectIds]);

  // 任务一 & 任务七：当前最新任务驱动指标看板与状态
  const currentBatch = batches[0] || null;

  // 统一调用唯一统计函数计算当前任务指标
  const currentStats = useMemo(() => {
    return currentBatch ? calculateConsistencyStats(currentBatch) : null;
  }, [currentBatch]);

  // 顶部一致率指标卡名称根据当前批次动态呈现
  const consistencyRateTitle = useMemo(() => {
    if (!currentBatch) return '核验一致率';
    if (currentBatch.scopeMode === 'RANDOM_SAMPLE') return '本次抽检一致率';
    if (currentBatch.scopeMode === 'EXHAUSTIVE_SCOPE') return '本次全量核验一致率';
    return '本次定向核验一致率';
  }, [currentBatch]);

  // 判断当前首条任务状态
  const isCurrentRunning = currentBatch?.status === 'RUNNING';
  const isCurrentFailed = currentBatch?.status === 'FAILED';

  // 发起核验操作（完整异步执行生命周期，失败封闭，参数冻结）
  const handleTriggerCheck = () => {
    if (isRunningCheck) return;
    // 1. 严格校验根类型存在性
    if (!currentRootType) {
      showToast(`配置异常：未找到根类型 [${selectedRootTypeCode}] 的底座定义，无法发起核验。`, 'error');
      return;
    }

    // 2. 字段快照校验
    if (comparisonSnapshotResult.uniqueKeyError) {
      showToast(comparisonSnapshotResult.uniqueKeyError, 'warning');
      return;
    }
    if (comparisonSnapshotResult.fieldsError || !comparisonSnapshotResult.snapshot) {
      showToast(comparisonSnapshotResult.fieldsError || '当前根类型暂无正式可核验字段', 'warning');
      return;
    }

    // 3. 范围与样本校验（禁止 20/50 补位）
    let taskCount = 0;
    let targetScopeOption: { id: string; label: string; count: number } | undefined;

    if (scopeMode === 'RANDOM_SAMPLE') {
      if (!Number.isSafeInteger(sampleCount) || sampleCount <= 0) {
        showToast('请选择合法的抽检样本容量', 'warning');
        return;
      }
      taskCount = sampleCount;
    } else if (scopeMode === 'EXHAUSTIVE_SCOPE') {
      targetScopeOption = currentScopeOptions.find(o => o.id === selectedScopeId);
      if (!targetScopeOption || !Number.isSafeInteger(targetScopeOption.count) || targetScopeOption.count <= 0) {
        showToast('所选分类范围配置异常或对象数量未知，无法发起全量核验。', 'warning');
        return;
      }
      taskCount = targetScopeOption.count;
    } else {
      if (parsedIds.uniqueIds.length === 0) {
        showToast('请输入至少一个有效的对象唯一标识', 'warning');
        return;
      }
      taskCount = parsedIds.uniqueIds.length;
    }

    // 4. 任务六：核验任务与同步任务可信关联
    // 仅关联当前根类型最近一次 SUCCESS 或 PARTIAL_SUCCESS 的同步任务
    const reliableSyncBatchId = findLatestSuccessfulSyncBatch(syncBatches, selectedRootTypeCode)?.id;

    const modeLabel = scopeMode === 'RANDOM_SAMPLE' ? '抽检核验' : scopeMode === 'EXHAUSTIVE_SCOPE' ? '全量核验' : '定向核验';
    const scopeDesc = scopeMode === 'RANDOM_SAMPLE'
      ? `抽检核验（${taskCount} 个样本）`
      : scopeMode === 'EXHAUSTIVE_SCOPE'
      ? `全量核验：${targetScopeOption?.label || selectedScopeId}`
      : `定向核验：${parsedIds.uniqueIds.join(', ')}`;

    const batchId = createConsistencyBatchId();
    const nowStr = formatLocalDateTime();

    // 5. 任务十一：参数冻结（深拷贝入参，异步回调使用冻结快照）
    const frozenRequest: ConsistencyCheckRequest = {
      rootTypeCode: selectedRootTypeCode,
      rootTypeName: currentRootType.displayName,
      scopeMode,
      sampleCount: taskCount,
      scopeId: scopeMode === 'EXHAUSTIVE_SCOPE' ? selectedScopeId : undefined,
      scopeName: targetScopeOption?.label,
      scopeDescription: scopeDesc,
      requestedObjectIds: scopeMode === 'SPECIFIC_IDS' ? [...parsedIds.uniqueIds] : undefined,
      comparisonFieldSnapshot: structuredClone(comparisonSnapshotResult.snapshot),
      sourceSyncBatchId: reliableSyncBatchId,
      simulateFailure: runOptions?.forceTaskFailure
    };

    // 6. 异步生命周期开始：先插入纯净的 RUNNING 批次
    const runningBatch: ConsistencyBatchRecord = {
      id: batchId,
      planName: `${frozenRequest.rootTypeName} ${modeLabel}批次`,
      triggerType: 'MANUAL_CUSTOM',
      rootTypeCode: frozenRequest.rootTypeCode,
      rootTypeName: frozenRequest.rootTypeName,
      scopeMode: frozenRequest.scopeMode,
      scopeDescription: frozenRequest.scopeDescription,
      strategySummary: `${modeLabel}执行中...`,
      executedAt: nowStr,
      plannedCount: taskCount,
      actualCount: 0,
      consistentCount: 0,
      differenceCount: 0,
      pendingRecheckCount: 0,
      incompleteCount: 0,
      comparisonFieldSnapshot: frozenRequest.comparisonFieldSnapshot,
      frozenObjectIds: [],
      objectResults: [],
      requestedObjectIds: frozenRequest.requestedObjectIds,
      sourceSyncBatchId: frozenRequest.sourceSyncBatchId,
      status: 'RUNNING'
    };

    updateBatches(prev => [runningBatch, ...prev]);
    showToast(`已发起核验任务 [${batchId}]，正在执行比对...`, 'success');

    // 7. 模拟异步比对完成并在同一条记录上更新为最终状态（COMPLETED 或 FAILED）
    setTimeout(() => {
      // 严格使用冻结请求，绝不读取 1.2 秒后变化的 React state
      const completedBatch = executeConsistencyRun(frozenRequest, batchId);

      updateBatches(prev => prev.map(b => (b.id === batchId ? completedBatch : b)));

      if (completedBatch.status === 'FAILED') {
        showToast(`核验批次 [${batchId}] 执行失败：${completedBatch.failedReason}`, 'error');
      } else {
        showToast(`核验批次 [${batchId}] 比对完成`, 'success');
      }
    }, typeof runOptions?.delayMs === 'number' && Number.isFinite(runOptions.delayMs) && runOptions.delayMs >= 0 ? runOptions.delayMs : 1200);
  };

  // 抽屉内部 5 种状态筛选结果（任务九）
  const filteredBatchResults = useMemo(() => {
    if (!selectedBatch) return [];
    if (detailFilterStatus === 'ALL') return selectedBatch.objectResults;
    if (detailFilterStatus === 'CONSISTENT') return selectedBatch.objectResults.filter(i => i.status === 'CONSISTENT');
    if (detailFilterStatus === 'INCONSISTENT') return selectedBatch.objectResults.filter(i => i.status === 'INCONSISTENT');
    if (detailFilterStatus === 'PENDING_RECHECK') return selectedBatch.objectResults.filter(i => i.status === 'PENDING_RECHECK');
    if (detailFilterStatus === 'UNABLE_TO_COMPARE') return selectedBatch.objectResults.filter(i => i.status === 'UNABLE_TO_COMPARE');
    return selectedBatch.objectResults;
  }, [selectedBatch, detailFilterStatus]);

  const totalPages = Math.max(1, Math.ceil(filteredBatchResults.length / detailPageSize));
  const paginatedBatchResults = useMemo(() => {
    const start = (detailPageIndex - 1) * detailPageSize;
    return filteredBatchResults.slice(start, start + detailPageSize);
  }, [filteredBatchResults, detailPageIndex]);

  // 抽屉内选中批次的指标统计
  const selectedBatchStats = useMemo(() => {
    return selectedBatch ? calculateConsistencyStats(selectedBatch) : null;
  }, [selectedBatch]);

  return (
    <div className="space-y-4" id="data-consistency-check-view">
      {/* Toast 提示 */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 animate-in fade-in slide-in-from-top-2">
          <div
            className={`px-4 py-2.5 rounded-ty-sm shadow-ty-lg border flex items-center space-x-2 text-ty-xs font-medium ${
              toastMessage.type === 'success'
                ? 'bg-[var(--ty-green-lightest-color)] text-[var(--ty-green-color)] border-[var(--ty-green-color)]/30'
                : toastMessage.type === 'warning'
                ? 'bg-[var(--ty-orange-lightest-color)] text-[var(--ty-orange-color)] border-[var(--ty-orange-color)]/30'
                : 'bg-[var(--ty-red-lightest-color)] text-[var(--ty-red-color)] border-[var(--ty-red-color)]/30'
            }`}
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* 顶部标题栏（任务一 & 任务七：当前任务驱动） */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[var(--ty-border-color)]">
        <div className="min-w-0">
          <div className="flex items-center space-x-2.5">
            <h1 className="text-ty-lg font-bold text-[var(--ty-font-main-color)]">数据一致性核验</h1>
            {isCurrentRunning && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-ty-xs bg-[var(--ty-primary-lightest-color)] text-[var(--ty-primary-color)] text-ty-2xs font-semibold animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>核验执行中</span>
              </span>
            )}
            {isCurrentFailed && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-ty-xs bg-[var(--ty-red-lightest-color)] text-[var(--ty-red-color)] text-ty-2xs font-semibold">
                <XCircle className="w-3 h-3" />
                <span>核验执行失败</span>
              </span>
            )}
          </div>
          <div className="text-ty-xs text-[var(--ty-font-sub-color)] mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 break-all">
            <span>
              {isCurrentRunning
                ? `当前核验任务：${currentBatch.id} · ${currentBatch.rootTypeName}`
                : isCurrentFailed
                ? `最新核验任务：${currentBatch.id} · ${currentBatch.rootTypeName}（失败）`
                : `最近核验时间：`}
            </span>
            <span className="font-mono text-[var(--ty-font-main-color)] font-medium">
              {currentBatch?.executedAt || '--'}
            </span>
            {currentBatch && !isCurrentRunning && !isCurrentFailed && (
              <span className="text-ty-2xs text-[var(--ty-font-sub-color)]">
                ({currentBatch.id} · {currentBatch.rootTypeName})
              </span>
            )}
            {currentBatch?.sourceSyncBatchId && (
              <span className="text-ty-2xs text-[var(--ty-primary-color)] font-mono bg-[var(--ty-primary-lightest-color)] px-1.5 py-0.5 rounded-ty-xs">
                关联同步批次：{currentBatch.sourceSyncBatchId}
              </span>
            )}
          </div>
        </div>

        {/* 任务六：关联同步记录跳转 */}
        {onNavigateToSyncQuality && (
          <button
            onClick={() => onNavigateToSyncQuality(currentBatch?.sourceSyncBatchId)}
            className="inline-flex shrink-0 items-center text-ty-xs text-[var(--ty-primary-color)] hover:underline self-start sm:self-auto cursor-pointer font-medium"
            id="link-to-sync-quality"
          >
            <span>查看数据同步记录</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </button>
        )}
      </div>

      {/* 失败详情横幅（若当前最新任务失败） */}
      {isCurrentFailed && (
        <div className="p-3.5 bg-[var(--ty-red-lightest-color)] border border-[var(--ty-red-color)]/30 rounded-ty-sm text-ty-xs text-[var(--ty-red-color)] space-y-1">
          <div className="font-bold flex items-center space-x-1.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>当前任务执行失败：{currentBatch.failedReason}</span>
          </div>
          <div className="text-ty-2xs text-[var(--ty-font-sub-color)]">
            失败阶段：{currentBatch.failedStage || '数据比对'} · 批次编号：{currentBatch.id}
          </div>
        </div>
      )}

      {/* 1. 根类型与核验范围 + 2. 发起核验操作卡片 */}
      <div className="bg-[var(--ty-fill-white-color)] rounded-ty-lg border border-[var(--ty-border-color)] p-4 space-y-4" id="consistency-action-card">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--ty-border-color)]">
          <div className="flex items-center space-x-2">
            <div className="w-1.5 h-3.5 bg-[var(--ty-primary-color)] rounded-ty-xs"></div>
            <h2 className="text-ty-sm font-bold text-[var(--ty-font-main-color)]">发起一致性核验</h2>
          </div>

          {/* 任务五：紧凑的“查看字段”入口 */}
          <div className="flex items-center space-x-2 text-ty-xs">
            {snapshotError ? (
              <span className="text-[var(--ty-orange-color)] text-ty-2xs font-medium flex items-center space-x-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{snapshotError}</span>
              </span>
            ) : comparisonSnapshotResult.snapshot ? (
              <div className="flex items-center space-x-1.5">
                <span className="text-[var(--ty-font-sub-color)] text-ty-2xs">核验字段:</span>
                <span className="font-semibold text-[var(--ty-font-main-color)] text-ty-2xs">
                  {comparisonSnapshotResult.snapshot.includedFields.length} 项
                </span>
                <span className="text-ty-2xs text-[var(--ty-font-sub-light-color)]">
                  (按当前正式查询底座自动读取)
                </span>
                <button
                  type="button"
                  onClick={() => setIsFieldPreviewModalOpen(true)}
                  className="ml-1 text-[var(--ty-primary-color)] hover:underline font-medium cursor-pointer text-ty-2xs flex items-center space-x-0.5"
                  id="btn-view-comparison-fields"
                >
                  <span>查看字段</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* 1. 选择核验根类型 (单选，禁止多选，无全部根类型) */}
          <div className="lg:col-span-4 space-y-2">
            <label className="text-ty-xs font-semibold text-[var(--ty-font-main-color)] block">
              1. 选择核验根类型
            </label>
            <div className="space-y-2">
              {mappingObjects.map(rt => (
                <label
                  key={rt.id}
                  className={`flex items-center justify-between p-3 rounded-ty-sm border cursor-pointer transition-colors ${
                    selectedRootTypeCode === rt.id
                      ? 'border-[var(--ty-primary-color)] bg-[var(--ty-primary-lightest-color)]/20'
                      : 'border-[var(--ty-border-color)] bg-[var(--ty-fill-white-color)] hover:bg-[var(--ty-fill-weak-dark-color)]'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <input
                      type="radio"
                      name="root-type-selector"
                      checked={selectedRootTypeCode === rt.id}
                      onChange={() => handleRootTypeChange(rt.id)}
                      className="text-[var(--ty-primary-color)] focus:ring-0"
                    />
                    <span className={`text-ty-xs font-medium ${selectedRootTypeCode === rt.id ? 'text-[var(--ty-primary-color)] font-bold' : 'text-[var(--ty-font-main-color)]'}`}>
                      {rt.name}
                    </span>
                  </div>
                  <span className="text-ty-2xs font-mono text-[var(--ty-font-sub-color)]">
                    底座记录：{rt.manticoreDocCount != null ? `${rt.manticoreDocCount.toLocaleString()} 条` : '待获取'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* 2. 确定核验范围与模式 */}
          <div className="lg:col-span-5 space-y-2">
            <label className="text-ty-xs font-semibold text-[var(--ty-font-main-color)] block">
              2. 确定核验范围与模式
            </label>
            <div className="p-3 rounded-ty-sm border border-[var(--ty-border-color)] bg-[var(--ty-fill-weak-dark-color)]/30 space-y-3">
              {/* 模式选择按钮组 */}
              <div className="flex rounded-ty-xs bg-[var(--ty-fill-weak-dark-color)] p-0.5 border border-[var(--ty-border-color)] text-ty-2xs">
                <button
                  type="button"
                  onClick={() => setScopeMode('RANDOM_SAMPLE')}
                  className={`flex-1 py-1 px-2 rounded-ty-xs font-medium transition-colors cursor-pointer text-center ${
                    scopeMode === 'RANDOM_SAMPLE'
                      ? 'bg-[var(--ty-fill-white-color)] text-[var(--ty-primary-color)] font-bold shadow-xs'
                      : 'text-[var(--ty-font-sub-color)] hover:text-[var(--ty-font-main-color)]'
                  }`}
                >
                  抽检核验
                </button>
                <button
                  type="button"
                  onClick={() => setScopeMode('EXHAUSTIVE_SCOPE')}
                  className={`flex-1 py-1 px-2 rounded-ty-xs font-medium transition-colors cursor-pointer text-center ${
                    scopeMode === 'EXHAUSTIVE_SCOPE'
                      ? 'bg-[var(--ty-fill-white-color)] text-[var(--ty-primary-color)] font-bold shadow-xs'
                      : 'text-[var(--ty-font-sub-color)] hover:text-[var(--ty-font-main-color)]'
                  }`}
                >
                  指定范围全量核验
                </button>
                <button
                  type="button"
                  onClick={() => setScopeMode('SPECIFIC_IDS')}
                  className={`flex-1 py-1 px-2 rounded-ty-xs font-medium transition-colors cursor-pointer text-center ${
                    scopeMode === 'SPECIFIC_IDS'
                      ? 'bg-[var(--ty-fill-white-color)] text-[var(--ty-primary-color)] font-bold shadow-xs'
                      : 'text-[var(--ty-font-sub-color)] hover:text-[var(--ty-font-main-color)]'
                  }`}
                >
                  指定对象 ID
                </button>
              </div>

              {/* 模式 1：抽检核验样本量 */}
              {scopeMode === 'RANDOM_SAMPLE' && (
                <div className="space-y-1.5 pt-1 text-ty-xs">
                  <span className="text-[var(--ty-font-sub-color)] block text-ty-2xs">
                    设置单次抽查样本数量：
                  </span>
                  <div className="flex items-center space-x-2">
                    {[50, 100, 200].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setSampleCount(val)}
                        className={`px-3 py-1.5 rounded-ty-sm text-ty-xs font-mono font-semibold border transition-colors cursor-pointer ${
                          sampleCount === val
                            ? 'bg-[var(--ty-primary-color)] text-[var(--ty-font-white-color)] border-[var(--ty-primary-color)]'
                            : 'bg-[var(--ty-fill-white-color)] text-[var(--ty-font-main-color)] border-[var(--ty-border-color)] hover:border-[var(--ty-primary-color)]'
                        }`}
                      >
                        {val} 个样本
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 模式 2：指定范围全量核验 (根据根类型隔离子范围) */}
              {scopeMode === 'EXHAUSTIVE_SCOPE' && (
                <div className="space-y-1.5 pt-1 text-ty-xs">
                  <span className="text-[var(--ty-font-sub-color)] block text-ty-2xs">
                    选择具体业务子范围（全量核验该范围内全部对象）：
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {currentScopeOptions.map(opt => (
                      <label
                        key={opt.id}
                        className={`flex items-center justify-between p-2 rounded-ty-xs border text-ty-xs cursor-pointer ${
                          selectedScopeId === opt.id
                            ? 'border-[var(--ty-primary-color)] bg-[var(--ty-fill-white-color)] font-semibold text-[var(--ty-primary-color)]'
                            : 'border-[var(--ty-border-color)] bg-[var(--ty-fill-white-color)] text-[var(--ty-font-main-color)]'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name="scope-option-selector"
                            checked={selectedScopeId === opt.id}
                            onChange={() => setSelectedScopeId(opt.id)}
                            className="text-[var(--ty-primary-color)] focus:ring-0"
                          />
                          <span>{opt.label}</span>
                        </div>
                        <span className="text-ty-2xs font-mono text-[var(--ty-font-sub-color)]">
                          {opt.count} 条
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* 模式 3：指定对象 ID (占位符隔离) */}
              {scopeMode === 'SPECIFIC_IDS' && (
                <div className="space-y-1.5 pt-1 text-ty-xs">
                  <div className="flex items-center justify-between text-ty-2xs">
                    <span className="text-[var(--ty-font-sub-color)]">输入对象唯一标识（逗号/换行分隔，纯业务输入）：</span>
                    <span className="text-[var(--ty-primary-color)] font-mono font-medium">
                      已识别 {parsedIds.uniqueIds.length} 个
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    value={inputObjectIds}
                    onChange={(e) => setInputObjectIds(e.target.value)}
                    placeholder={ROOT_TYPE_OBJECT_ID_PLACEHOLDER[selectedRootTypeCode] || '输入对象编码...'}
                    className="w-full px-3 py-1.5 border border-[var(--ty-border-color)] rounded-ty-sm text-ty-xs bg-[var(--ty-fill-white-color)] font-mono resize-none focus:outline-hidden focus:border-[var(--ty-primary-color)]"
                  />
                </div>
              )}
            </div>
          </div>

          {/* 3. 执行核验操作区 */}
          <div className="lg:col-span-3 flex flex-col justify-between space-y-3">
            <div>
              <label className="text-ty-xs font-semibold text-[var(--ty-font-main-color)] block mb-2">
                3. 执行核验
              </label>
              <div className="p-3 bg-[var(--ty-fill-weak-dark-color)]/60 rounded-ty-sm border border-[var(--ty-border-color)] text-ty-2xs space-y-1.5 text-[var(--ty-font-sub-color)]">
                <div>根类型：<strong className="text-[var(--ty-font-main-color)]">{currentRootType?.displayName || '未选择'}</strong></div>
                <div>模式：<strong className="text-[var(--ty-font-main-color)]">
                  {scopeMode === 'RANDOM_SAMPLE' ? `抽检 (${sampleCount}个)` : scopeMode === 'EXHAUSTIVE_SCOPE' ? '指定范围全量' : `定向核验 (${parsedIds.uniqueIds.length}个)`}
                </strong></div>
                <div>核验状态：<strong className="text-[var(--ty-font-main-color)]">
                  {!currentRootType ? '根类型异常' : comparisonSnapshotResult.uniqueKeyError ? '无可用唯一键' : comparisonSnapshotResult.fieldsError ? '无可用字段' : '就绪'}
                </strong></div>
              </div>
            </div>

            <button
              type="button"
              disabled={isRunningCheck || !currentRootType || !!snapshotError}
              onClick={handleTriggerCheck}
              className={`w-full py-2.5 px-4 rounded-ty-sm text-ty-xs font-semibold flex items-center justify-center space-x-2 transition-colors cursor-pointer shadow-sm ${
                isRunningCheck || !currentRootType || snapshotError
                  ? 'bg-[var(--ty-fill-dark-color)] text-[var(--ty-font-sub-color)] cursor-not-allowed'
                  : 'bg-[var(--ty-primary-color)] hover:bg-[var(--ty-primary-hover-color)] active:bg-[var(--ty-primary-active-color)] text-[var(--ty-font-white-color)]'
              }`}
              id="btn-trigger-consistency-check"
            >
              {isRunningCheck ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>核验进行中...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>
                    {scopeMode === 'RANDOM_SAMPLE' && `发起抽检核验 (${sampleCount}个)`}
                    {scopeMode === 'EXHAUSTIVE_SCOPE' && '发起全量核验'}
                    {scopeMode === 'SPECIFIC_IDS' && `发起定向核验 (${parsedIds.uniqueIds.length}个)`}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 任务七 & 任务八：4 个指标卡全部由当前任务驱动，正文显示 33.3%（1 / 3），删除右上角重复值 */}
      {/* 严格遵循唯一口径：有效比对数 = 一致数 + 不一致数；待复查、无法比对不入分母；分母为0或核验中/失败显示 --（0 / 0）或 -- */}
      {currentBatch && currentStats ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="consistency-metrics-board">
        {/* 指标 1：本次核验一致率 */}
        <div className="bg-[var(--ty-fill-white-color)] rounded-ty-lg border border-[var(--ty-border-color)] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-ty-xs font-medium text-[var(--ty-font-sub-color)]">
              {consistencyRateTitle}
            </span>
            {/* 右上角已彻底移除重复分子分母 */}
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline space-x-1.5">
              <span className="text-ty-2xl font-bold font-mono text-[var(--ty-font-main-color)] tracking-tight">
                {isCurrentRunning || isCurrentFailed ? '--' : currentStats.rateText}
              </span>
              <span className="text-ty-xs text-[var(--ty-font-sub-color)] font-mono">
                {isCurrentRunning || isCurrentFailed
                  ? ''
                  : currentStats.fractionDisplay}
              </span>
            </div>
          </div>
        </div>

        {/* 指标 2：有效比对数 (一致 + 不一致) */}
        <div className="bg-[var(--ty-fill-white-color)] rounded-ty-lg border border-[var(--ty-border-color)] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-ty-xs font-medium text-[var(--ty-font-sub-color)]">
              有效比对数
            </span>
            <span className="text-ty-2xs text-[var(--ty-font-sub-color)]">一致 + 不一致</span>
          </div>
          <div className="mt-2.5 flex items-baseline space-x-1.5">
            <span className="text-ty-2xl font-bold font-mono text-[var(--ty-primary-color)] tracking-tight">
              {isCurrentRunning || isCurrentFailed ? '--' : currentStats.effectiveCount}
            </span>
            <span className="text-ty-xs text-[var(--ty-font-sub-color)]">个对象</span>
          </div>
        </div>

        {/* 指标 3：不一致数 */}
        <div className="bg-[var(--ty-fill-white-color)] rounded-ty-lg border border-[var(--ty-border-color)] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-ty-xs font-medium text-[var(--ty-font-sub-color)]">
              不一致数
            </span>
            <span className="text-ty-2xs text-[var(--ty-font-sub-color)]">双端字段差异</span>
          </div>
          <div className="mt-2.5 flex items-baseline space-x-1.5">
            <span className={`text-ty-2xl font-bold font-mono tracking-tight ${
              !isCurrentRunning && !isCurrentFailed && currentStats.inconsistentCount > 0 ? 'text-[var(--ty-red-color)]' : 'text-[var(--ty-green-color)]'
            }`}>
              {isCurrentRunning || isCurrentFailed ? '--' : currentStats.inconsistentCount}
            </span>
            <span className="text-ty-xs text-[var(--ty-font-sub-color)]">个对象</span>
          </div>
        </div>

        {/* 指标 4：待处理数 (待复查 + 无法比对) */}
        <div className="bg-[var(--ty-fill-white-color)] rounded-ty-lg border border-[var(--ty-border-color)] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-ty-xs font-medium text-[var(--ty-font-sub-color)]">
              待处理数
            </span>
            <span className="text-ty-2xs text-[var(--ty-font-sub-color)]">
              待复查 {isCurrentRunning || isCurrentFailed ? '--' : currentStats.pendingCount} · 无法比对 {isCurrentRunning || isCurrentFailed ? '--' : currentStats.unableCount}
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline space-x-1.5">
            <span className={`text-ty-2xl font-bold font-mono tracking-tight ${
              !isCurrentRunning && !isCurrentFailed && currentStats.pendingTotalCount > 0 ? 'text-[var(--ty-orange-color)]' : 'text-[var(--ty-font-main-color)]'
            }`}>
              {isCurrentRunning || isCurrentFailed ? '--' : currentStats.pendingTotalCount}
            </span>
            <span className="text-ty-xs text-[var(--ty-font-sub-color)]">个对象</span>
          </div>
        </div>
      </div> : (
        <div id="consistency-metrics-board" className="bg-[var(--ty-fill-white-color)] rounded-ty-lg border border-[var(--ty-border-color)] p-6 text-center text-ty-xs text-[var(--ty-font-sub-color)]">
          暂无核验任务，发起核验后查看结果统计
        </div>
      )}

      {/* 结果列表和差异详情 (表格卡片) */}
      <div className="bg-[var(--ty-fill-white-color)] rounded-ty-lg border border-[var(--ty-border-color)] overflow-hidden" id="consistency-batch-history-card">
        <div className="px-4 py-3 border-b border-[var(--ty-border-color)] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-1.5 h-3.5 bg-[var(--ty-primary-color)] rounded-ty-xs"></div>
            <h2 className="text-ty-sm font-bold text-[var(--ty-font-main-color)]">核验结果列表</h2>
            <span className="text-ty-2xs text-[var(--ty-font-sub-color)]">
              (共 {batches.length} 次核验记录)
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-left border-collapse text-ty-xs">
            <colgroup>
              <col className="w-[14%]" /><col className="w-[7%]" /><col className="w-[16%]" />
              <col className="w-[8%]" /><col className="w-[11%]" /><col className="w-[7%]" />
              <col className="w-[7%]" /><col className="w-[7%]" /><col className="w-[13%]" /><col className="w-[10%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-[var(--ty-border-color)] bg-[var(--ty-fill-weak-dark-color)] text-[var(--ty-font-sub-color)] font-semibold text-ty-2xs">
                <th className="py-2.5 px-3.5">批次编号</th>
                <th className="py-2.5 px-3">核验根类型</th>
                <th className="py-2.5 px-3">核验范围与模式</th>
                <th className="py-2.5 px-3 text-center">核验状态</th>
                <th className="py-2.5 px-3 text-center">核验一致率</th>
                <th className="py-2.5 px-3 text-center">有效比对数</th>
                <th className="py-2.5 px-3 text-center">不一致数</th>
                <th className="py-2.5 px-3 text-center">待处理数</th>
                <th className="py-2.5 px-3">执行时间</th>
                <th className="py-2.5 px-3.5 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--ty-border-color)]">
              {batches.map(batch => {
                const isRunning = batch.status === 'RUNNING';
                const isFailed = batch.status === 'FAILED';
                const stats = calculateConsistencyStats(batch);

                return (
                  <tr key={batch.id} className="hover:bg-[var(--ty-fill-weak-dark-color)] transition-colors">
                    <td className="py-3 px-3.5 break-all font-mono font-bold text-[var(--ty-primary-color)]" title={batch.id}>
                      {batch.id}
                    </td>
                    <td className="py-3 px-3 font-medium text-[var(--ty-font-main-color)]">
                      {batch.rootTypeName}
                    </td>
                    <td className="py-3 px-3 text-ty-2xs text-[var(--ty-font-main-color)] max-w-xs truncate" title={batch.scopeDescription}>
                      {batch.scopeDescription}
                    </td>
                    <td className="py-3 px-1.5 text-center whitespace-nowrap">
                      {isRunning ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-ty-xs bg-[var(--ty-primary-lightest-color)] text-[var(--ty-primary-color)] text-ty-2xs font-semibold">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>核验中</span>
                        </span>
                      ) : isFailed ? (
                        <span className="inline-flex px-2 py-0.5 rounded-ty-xs bg-[var(--ty-red-lightest-color)] text-[var(--ty-red-color)] text-ty-2xs font-semibold">
                          失败
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 rounded-ty-xs bg-[var(--ty-fill-weak-dark-color)] text-[var(--ty-font-sub-color)] border border-[var(--ty-border-color)] text-ty-2xs font-medium">
                          完成
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {isRunning || isFailed ? (
                        <span className="font-mono text-ty-2xs text-[var(--ty-font-sub-color)]">--</span>
                      ) : (
                        <span className="text-ty-2xs font-mono font-semibold text-[var(--ty-font-main-color)]">
                          {stats.rateDisplay}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-semibold text-[var(--ty-font-main-color)]">
                      {isRunning || isFailed ? '--' : stats.effectiveCount}
                    </td>
                    <td className="py-3 px-3 text-center font-mono">
                      {isRunning || isFailed ? (
                        '--'
                      ) : stats.inconsistentCount > 0 ? (
                        <span className="px-1.5 py-0.5 rounded-ty-xs bg-[var(--ty-red-lightest-color)] text-[var(--ty-red-color)] font-bold">
                          {stats.inconsistentCount}
                        </span>
                      ) : (
                        <span className="text-[var(--ty-green-color)] font-medium">0</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center font-mono">
                      {isRunning || isFailed ? (
                        '--'
                      ) : stats.pendingTotalCount > 0 ? (
                        <span className="px-1.5 py-0.5 rounded-ty-xs bg-[var(--ty-orange-lightest-color)] text-[var(--ty-orange-color)] font-bold">
                          {stats.pendingTotalCount}
                        </span>
                      ) : (
                        <span className="text-[var(--ty-font-sub-color)]">0</span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-ty-2xs text-[var(--ty-font-sub-color)]">
                      {batch.executedAt}
                    </td>
                    <td className="py-3 px-1.5 text-center whitespace-nowrap">
                      <button
                        type="button"
                        disabled={isRunning}
                        onClick={() => {
                          setSelectedBatchId(batch.id);
                          setDetailFilterStatus('ALL');
                          setDetailPageIndex(1);
                        }}
                        className={`px-2.5 py-1 rounded-ty-sm text-ty-2xs font-semibold transition-colors cursor-pointer border ${
                          isRunning
                            ? 'opacity-50 cursor-not-allowed bg-[var(--ty-fill-dark-color)] text-[var(--ty-font-sub-color)] border-transparent'
                            : 'bg-[var(--ty-fill-white-color)] hover:bg-[var(--ty-primary-lightest-color)] text-[var(--ty-primary-color)] border-[var(--ty-primary-color)]/30'
                        }`}
                      >
                        {isRunning ? '核验中' : '差异详情'}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {batches.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-[var(--ty-font-sub-color)]">暂无核验记录</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 差异详情抽屉（任务九：拆开待复查与无法比对） */}
      {selectedBatch && selectedBatchStats && (
        <div className="fixed inset-0 z-50 overflow-hidden" id="batch-detail-drawer-overlay">
          <div
            className="absolute inset-0 bg-ty-overlay backdrop-blur-xs transition-opacity"
            onClick={closeBatchDetail}
          />
          <div className="fixed inset-y-0 right-0 max-w-4xl w-full bg-[var(--ty-fill-white-color)] shadow-ty-lg flex flex-col z-10 animate-in slide-in-from-right duration-200">
            {/* 抽屉头部 */}
            <div className="px-6 py-4 border-b border-[var(--ty-border-color)] flex items-center justify-between bg-[var(--ty-fill-weak-dark-color)]">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-ty-sm font-bold text-[var(--ty-font-main-color)]">
                    批次核验详情：<span className="font-mono text-[var(--ty-primary-color)]">{selectedBatch.id}</span>
                  </h3>
                  <span className="px-2 py-0.5 rounded-ty-xs bg-[var(--ty-primary-lightest-color)] text-[var(--ty-primary-color)] text-ty-2xs font-semibold">
                    {selectedBatch.rootTypeName}
                  </span>
                </div>
                <span className="text-ty-2xs text-[var(--ty-font-sub-color)] mt-0.5 block">
                  执行时间: {selectedBatch.executedAt} · 范围: {selectedBatch.scopeDescription}
                </span>
              </div>
              <button
                type="button"
                onClick={closeBatchDetail}
                aria-label="关闭批次详情"
                className="p-1 rounded-ty-sm text-[var(--ty-font-sub-color)] hover:text-[var(--ty-font-main-color)] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 若任务失败展示错误信息 */}
            {selectedBatch.status === 'FAILED' && (
              <div className="mx-6 mt-4 p-3.5 bg-[var(--ty-red-lightest-color)] border border-[var(--ty-red-color)]/30 rounded-ty-sm text-ty-xs text-[var(--ty-red-color)] space-y-1">
                <div className="font-bold flex items-center space-x-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>核验任务执行失败</span>
                </div>
                <div className="text-ty-2xs text-[var(--ty-font-sub-color)]">
                  失败阶段：{selectedBatch.failedStage || '数据处理'} · 原因：{selectedBatch.failedReason || '未知异常'}
                </div>
              </div>
            )}

            {/* 抽屉统一指标栏 (统一调用 calculateConsistencyStats 且格式保持一致) */}
            <div className="px-6 py-3.5 border-b border-[var(--ty-border-color)] bg-[var(--ty-fill-white-color)] grid grid-cols-4 gap-3 text-center">
              <div>
                <span className="text-ty-2xs text-[var(--ty-font-sub-color)] block">本次一致率</span>
                <span className="text-ty-sm font-bold font-mono text-[var(--ty-font-main-color)]">
                  {selectedBatch.status === 'COMPLETED' ? selectedBatchStats.rateDisplay : '--'}
                </span>
              </div>
              <div>
                <span className="text-ty-2xs text-[var(--ty-font-sub-color)] block">有效比对数</span>
                <span className="text-ty-sm font-bold font-mono text-[var(--ty-primary-color)]">
                  {selectedBatch.status === 'COMPLETED' ? selectedBatchStats.effectiveCount : '--'}
                </span>
              </div>
              <div>
                <span className="text-ty-2xs text-[var(--ty-font-sub-color)] block">不一致数</span>
                <span className={`text-ty-sm font-bold font-mono ${
                  selectedBatchStats.inconsistentCount > 0 ? 'text-[var(--ty-red-color)]' : 'text-[var(--ty-green-color)]'
                }`}>
                  {selectedBatch.status === 'COMPLETED' ? selectedBatchStats.inconsistentCount : '--'}
                </span>
              </div>
              <div>
                <span className="text-ty-2xs text-[var(--ty-font-sub-color)] block">待处理数</span>
                <span className="text-ty-sm font-bold font-mono text-[var(--ty-orange-color)]">
                  {selectedBatch.status === 'COMPLETED' ? selectedBatchStats.pendingTotalCount : '--'}
                </span>
              </div>
            </div>

            {/* 抽屉内容列表区 */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-ty-xs">
              {/* 任务九：筛选过滤栏（5 个拆分按钮） */}
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap items-center gap-1.5 text-ty-2xs">
                  <span className="text-[var(--ty-font-sub-color)] mr-1">筛选状态:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setDetailFilterStatus('ALL');
                      setDetailPageIndex(1);
                    }}
                    className={`px-2.5 py-1 rounded-ty-xs font-medium border transition-colors cursor-pointer ${
                      detailFilterStatus === 'ALL'
                        ? 'bg-[var(--ty-primary-color)] text-[var(--ty-font-white-color)] border-[var(--ty-primary-color)] font-bold'
                        : 'bg-[var(--ty-fill-white-color)] text-[var(--ty-font-sub-color)] border-[var(--ty-border-color)] hover:border-[var(--ty-primary-color)]'
                    }`}
                  >
                    全部 ({selectedBatch.objectResults.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDetailFilterStatus('CONSISTENT');
                      setDetailPageIndex(1);
                    }}
                    className={`px-2.5 py-1 rounded-ty-xs font-medium border transition-colors cursor-pointer ${
                      detailFilterStatus === 'CONSISTENT'
                        ? 'bg-[var(--ty-green-color)] text-[var(--ty-font-white-color)] border-[var(--ty-green-color)] font-bold'
                        : 'bg-[var(--ty-green-lightest-color)] text-[var(--ty-green-color)] border-[var(--ty-green-color)]/30'
                    }`}
                  >
                    一致 ({selectedBatchStats.consistentCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDetailFilterStatus('INCONSISTENT');
                      setDetailPageIndex(1);
                    }}
                    className={`px-2.5 py-1 rounded-ty-xs font-medium border transition-colors cursor-pointer ${
                      detailFilterStatus === 'INCONSISTENT'
                        ? 'bg-[var(--ty-red-color)] text-[var(--ty-font-white-color)] border-[var(--ty-red-color)] font-bold'
                        : 'bg-[var(--ty-red-lightest-color)] text-[var(--ty-red-color)] border-[var(--ty-red-color)]/30'
                    }`}
                  >
                    不一致 ({selectedBatchStats.inconsistentCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDetailFilterStatus('PENDING_RECHECK');
                      setDetailPageIndex(1);
                    }}
                    className={`px-2.5 py-1 rounded-ty-xs font-medium border transition-colors cursor-pointer ${
                      detailFilterStatus === 'PENDING_RECHECK'
                        ? 'bg-[var(--ty-orange-color)] text-[var(--ty-font-white-color)] border-[var(--ty-orange-color)] font-bold'
                        : 'bg-[var(--ty-orange-lightest-color)] text-[var(--ty-orange-color)] border-[var(--ty-orange-color)]/30'
                    }`}
                  >
                    待复查 ({selectedBatchStats.pendingCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDetailFilterStatus('UNABLE_TO_COMPARE');
                      setDetailPageIndex(1);
                    }}
                    className={`px-2.5 py-1 rounded-ty-xs font-medium border transition-colors cursor-pointer ${
                      detailFilterStatus === 'UNABLE_TO_COMPARE'
                        ? 'bg-[var(--ty-font-sub-color)] text-[var(--ty-font-white-color)] border-[var(--ty-font-sub-color)] font-bold'
                        : 'bg-[var(--ty-fill-weak-dark-color)] text-[var(--ty-font-sub-color)] border-[var(--ty-border-color)]'
                    }`}
                  >
                    无法比对 ({selectedBatchStats.unableCount})
                  </button>
                </div>
              </div>

              {/* 对象明细表格 */}
              <div className="border border-[var(--ty-border-color)] rounded-ty-sm overflow-hidden">
                <table className="w-full text-left border-collapse text-ty-xs">
                  <thead>
                    <tr className="border-b border-[var(--ty-border-color)] bg-[var(--ty-fill-weak-dark-color)] text-[var(--ty-font-sub-color)] font-semibold text-ty-2xs">
                      <th className="py-2.5 px-3">对象标识</th>
                      <th className="py-2.5 px-3">对象业务名称</th>
                      <th className="py-2.5 px-3 text-center">核验状态</th>
                      <th className="py-2.5 px-3">比对说明</th>
                      <th className="py-2.5 px-3 text-center">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--ty-border-color)]">
                    {paginatedBatchResults.map(item => {
                      const meta = OBJECT_STATUS_META[item.status];
                      return (
                        <tr key={item.objectId} className="hover:bg-[var(--ty-fill-weak-dark-color)] transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-[var(--ty-font-main-color)]">
                            {item.objectId}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-[var(--ty-font-main-color)]">
                            {item.objectName}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {item.isTargetMissing ? (
                              <span className="px-2 py-0.5 rounded-ty-xs bg-[var(--ty-red-lightest-color)] text-[var(--ty-red-color)] border border-[var(--ty-red-color)]/30 text-ty-2xs font-bold">
                                目标记录缺失
                              </span>
                            ) : (
                              <span className={`px-2 py-0.5 rounded-ty-xs text-ty-2xs font-bold ${meta.badgeClass}`}>
                                {meta.label}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-ty-2xs text-[var(--ty-font-sub-color)] max-w-sm truncate" title={item.statusDetail}>
                            {item.statusDetail}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => setSelectedObjectForCompare(item)}
                              className="text-[var(--ty-primary-color)] hover:underline text-ty-2xs font-semibold cursor-pointer"
                            >
                              查看对比
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {paginatedBatchResults.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-[var(--ty-font-sub-color)] text-ty-xs">
                          暂无符合该筛选状态的对象记录
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* 分页控制器 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-ty-2xs text-[var(--ty-font-sub-color)]">
                    共 {filteredBatchResults.length} 条记录，第 {detailPageIndex} / {totalPages} 页
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      disabled={detailPageIndex === 1}
                      onClick={() => setDetailPageIndex(p => Math.max(1, p - 1))}
                      className="px-2.5 py-1 rounded-ty-xs border border-[var(--ty-border-color)] text-ty-2xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      上一页
                    </button>
                    <button
                      type="button"
                      disabled={detailPageIndex === totalPages}
                      onClick={() => setDetailPageIndex(p => Math.min(totalPages, p + 1))}
                      className="px-2.5 py-1 rounded-ty-xs border border-[var(--ty-border-color)] text-ty-2xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      下一页
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 任务五：核验字段清单预览只读弹窗 */}
      {isFieldPreviewModalOpen && comparisonSnapshotResult.snapshot && (
        <div className="fixed inset-0 z-60 overflow-y-auto bg-ty-overlay backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[var(--ty-fill-white-color)] rounded-ty-lg border border-[var(--ty-border-color)] shadow-ty-lg max-w-3xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--ty-border-color)]">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-ty-sm font-bold text-[var(--ty-font-main-color)]">
                    正式核验字段清单
                  </h3>
                  <span className="px-2 py-0.5 rounded-ty-xs bg-[var(--ty-primary-lightest-color)] text-[var(--ty-primary-color)] text-ty-2xs font-semibold">
                    {currentRootType?.displayName || selectedRootTypeCode}
                  </span>
                </div>
                <span className="text-ty-2xs text-[var(--ty-font-sub-color)] mt-0.5 block">
                  自动读取已入正式查询底座（isInFormalQueryBase=true）且具有确定性比对能力的字段
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsFieldPreviewModalOpen(false)}
                className="p-1 rounded-ty-sm text-[var(--ty-font-sub-color)] hover:text-[var(--ty-font-main-color)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 1. 业务唯一键信息 */}
            <div className="p-3 bg-[var(--ty-fill-weak-dark-color)]/60 rounded-ty-sm border border-[var(--ty-border-color)] text-ty-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[var(--ty-font-main-color)]">业务唯一键定位字段：</span>
                <span className="text-ty-2xs text-[var(--ty-primary-color)] font-semibold">唯一主键（不参与普通字段一致率）</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-ty-2xs text-[var(--ty-font-sub-color)] font-mono pt-1">
                <div>显示名称：<strong className="text-[var(--ty-font-main-color)] font-sans">{comparisonSnapshotResult.snapshot.uniqueKeyField.displayName}</strong></div>
                <div>来源字段：<strong className="text-[var(--ty-font-main-color)]">{comparisonSnapshotResult.snapshot.uniqueKeyField.sourceFieldKey}</strong></div>
                <div>底座字段：<strong className="text-[var(--ty-font-main-color)]">{comparisonSnapshotResult.snapshot.uniqueKeyField.manticoreField}</strong></div>
                <div>存储类型：<strong className="text-[var(--ty-font-main-color)]">{comparisonSnapshotResult.snapshot.uniqueKeyField.manticoreType || 'STRING'}</strong></div>
              </div>
            </div>

            {/* 2. 纳入核验字段表格 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-ty-xs font-semibold text-[var(--ty-font-main-color)]">
                <span>纳入核验字段列表 ({comparisonSnapshotResult.snapshot.includedFields.length} 项)</span>
              </div>
              <div className="border border-[var(--ty-border-color)] rounded-ty-sm overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-left text-ty-xs border-collapse">
                  <thead className="sticky top-0 bg-[var(--ty-fill-weak-dark-color)] z-10">
                    <tr className="text-ty-2xs text-[var(--ty-font-sub-color)] border-b border-[var(--ty-border-color)]">
                      <th className="p-2.5">字段显示名</th>
                      <th className="p-2.5">来源字段 Key</th>
                      <th className="p-2.5">底座物理字段</th>
                      <th className="p-2.5">业务类型</th>
                      <th className="p-2.5">底座类型</th>
                      <th className="p-2.5">核验比对方式</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--ty-border-color)]">
                    {comparisonSnapshotResult.snapshot.includedFields.map(field => (
                      <tr key={field.sourceFieldKey} className="hover:bg-[var(--ty-fill-weak-dark-color)]">
                        <td className="p-2.5 font-medium text-[var(--ty-font-main-color)]">
                          {field.displayName}
                        </td>
                        <td className="p-2.5 font-mono text-ty-2xs text-[var(--ty-font-sub-color)]">
                          {field.sourceFieldKey}
                        </td>
                        <td className="p-2.5 font-mono text-ty-2xs text-[var(--ty-font-sub-color)]">
                          {field.manticoreField}
                        </td>
                        <td className="p-2.5 text-ty-2xs text-[var(--ty-font-main-color)] font-mono">
                          {field.dataType}
                        </td>
                        <td className="p-2.5 text-ty-2xs text-[var(--ty-font-sub-color)] font-mono">
                          {field.manticoreType || 'STRING'}
                        </td>
                        <td className="p-2.5 text-ty-2xs text-[var(--ty-primary-color)]">
                          {field.comparisonMethod}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3. 排除字段列表（如有） */}
            {comparisonSnapshotResult.snapshot.excludedFields.length > 0 && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center space-x-1.5 text-ty-xs font-semibold text-[var(--ty-font-sub-color)]">
                  <span>排除字段说明 ({comparisonSnapshotResult.snapshot.excludedFields.length} 项未纳入)</span>
                </div>
                <div className="border border-[var(--ty-border-color)] rounded-ty-sm overflow-hidden max-h-36 overflow-y-auto">
                  <table className="w-full text-left text-ty-xs border-collapse">
                    <thead className="sticky top-0 bg-[var(--ty-fill-weak-dark-color)] z-10">
                      <tr className="text-ty-2xs text-[var(--ty-font-sub-color)] border-b border-[var(--ty-border-color)]">
                        <th className="p-2">字段显示名</th>
                        <th className="p-2">来源字段 Key</th>
                        <th className="p-2">排除原因</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--ty-border-color)]">
                      {comparisonSnapshotResult.snapshot.excludedFields.map((ex, idx) => (
                        <tr key={idx} className="hover:bg-[var(--ty-fill-weak-dark-color)]">
                          <td className="p-2 text-[var(--ty-font-main-color)]">{ex.fieldName}</td>
                          <td className="p-2 font-mono text-ty-2xs text-[var(--ty-font-sub-color)]">{ex.sourceFieldKey}</td>
                          <td className="p-2 text-ty-2xs text-[var(--ty-orange-color)]">{ex.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsFieldPreviewModalOpen(false)}
                className="px-4 py-1.5 rounded-ty-sm bg-[var(--ty-primary-color)] text-[var(--ty-font-white-color)] text-ty-xs font-medium cursor-pointer"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 对象级详细比对弹窗 (展示字段预期映射值与目标存储值对比) */}
      {selectedObjectForCompare && (
        <div className="fixed inset-0 z-60 overflow-y-auto bg-ty-overlay backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[var(--ty-fill-white-color)] rounded-ty-lg border border-[var(--ty-border-color)] shadow-ty-lg max-w-3xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--ty-border-color)]">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-ty-sm font-bold text-[var(--ty-font-main-color)]">
                    对象比对明细：<span className="font-mono text-[var(--ty-primary-color)]">{selectedObjectForCompare.objectId}</span>
                  </h3>
                  {selectedObjectForCompare.isTargetMissing ? (
                    <span className="px-2 py-0.5 rounded-ty-xs bg-[var(--ty-red-lightest-color)] text-[var(--ty-red-color)] border border-[var(--ty-red-color)]/30 text-ty-2xs font-bold">
                      目标记录缺失
                    </span>
                  ) : (
                    <span className={`px-2 py-0.5 rounded-ty-xs text-ty-2xs font-bold ${OBJECT_STATUS_META[selectedObjectForCompare.status].badgeClass}`}>
                      {OBJECT_STATUS_META[selectedObjectForCompare.status].label}
                    </span>
                  )}
                </div>
                <span className="text-ty-2xs text-[var(--ty-font-sub-color)] mt-0.5 block">
                  业务名称：{selectedObjectForCompare.objectName}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedObjectForCompare(null)}
                className="p-1 rounded-ty-sm text-[var(--ty-font-sub-color)] hover:text-[var(--ty-font-main-color)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 状态明细提示 */}
            <div className={`p-3 rounded-ty-sm border text-ty-xs space-y-1 ${
              selectedObjectForCompare.status === 'CONSISTENT'
                ? 'bg-[var(--ty-green-lightest-color)]/30 border-[var(--ty-green-color)]/30 text-[var(--ty-green-color)]'
                : selectedObjectForCompare.status === 'INCONSISTENT'
                ? 'bg-[var(--ty-red-lightest-color)]/30 border-[var(--ty-red-color)]/30 text-[var(--ty-red-color)]'
                : 'bg-[var(--ty-orange-lightest-color)]/30 border-[var(--ty-orange-color)]/30 text-[var(--ty-orange-color)]'
            }`}>
              <div className="font-semibold">比对诊断结论：</div>
              <div className="text-ty-2xs leading-relaxed">{selectedObjectForCompare.statusDetail}</div>
            </div>

            {/* 字段明细比对表 */}
            <div className="border border-[var(--ty-border-color)] rounded-ty-sm overflow-hidden">
              <table className="w-full text-left text-ty-xs border-collapse">
                <thead>
                  <tr className="bg-[var(--ty-fill-weak-dark-color)] text-ty-2xs text-[var(--ty-font-sub-color)] border-b border-[var(--ty-border-color)]">
                    <th className="p-2.5">核验字段</th>
                    <th className="p-2.5">PLM 源端原始值</th>
                    <th className="p-2.5">映射规则预期值</th>
                    <th className="p-2.5">Manticore 实际值</th>
                    <th className="p-2.5 text-center">字段比对状态</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--ty-border-color)]">
                  {selectedObjectForCompare.fields.map(f => (
                    <tr key={f.fieldCode} className="hover:bg-[var(--ty-fill-weak-dark-color)]">
                      <td className="p-2.5 font-medium text-[var(--ty-font-main-color)]">
                        <div>{f.fieldName}</div>
                        <div className="text-ty-2xs font-mono text-[var(--ty-font-sub-color)]">{f.fieldCode}</div>
                      </td>
                      <td className="p-2.5 font-mono text-ty-2xs text-[var(--ty-font-main-color)]">
                        {f.plmRawValue != null ? String(f.plmRawValue) : <span className="text-[var(--ty-font-sub-color)]">null (缺失)</span>}
                      </td>
                      <td className="p-2.5 font-mono text-ty-2xs text-[var(--ty-font-main-color)]">
                        {f.mappedExpectedValue != null ? String(f.mappedExpectedValue) : <span className="text-[var(--ty-font-sub-color)]">null</span>}
                      </td>
                      <td className="p-2.5 font-mono text-ty-2xs">
                        {f.manticoreActualValue != null ? (
                          <span className={f.matchStatus === 'MISMATCH' ? 'text-[var(--ty-red-color)] font-bold' : 'text-[var(--ty-font-main-color)]'}>
                            {String(f.manticoreActualValue)}
                          </span>
                        ) : (
                          <span className="text-[var(--ty-red-color)] font-bold">null (底座缺失)</span>
                        )}
                      </td>
                      <td className="p-2.5 text-center">
                        {f.matchStatus === 'MATCH' && (
                          <span className="px-2 py-0.5 rounded-ty-xs bg-[var(--ty-green-lightest-color)] text-[var(--ty-green-color)] text-ty-2xs font-bold">
                            一致
                          </span>
                        )}
                        {f.matchStatus === 'MISMATCH' && (
                          <span className="px-2 py-0.5 rounded-ty-xs bg-[var(--ty-red-lightest-color)] text-[var(--ty-red-color)] text-ty-2xs font-bold">
                            差异
                          </span>
                        )}
                        {f.matchStatus === 'TARGET_MISSING' && (
                          <span className="px-2 py-0.5 rounded-ty-xs bg-[var(--ty-red-lightest-color)] text-[var(--ty-red-color)] text-ty-2xs font-bold">
                            目标记录缺失
                          </span>
                        )}
                        {f.matchStatus === 'UNVERIFIABLE' && (
                          <span className="px-2 py-0.5 rounded-ty-xs bg-[var(--ty-orange-lightest-color)] text-[var(--ty-orange-color)] text-ty-2xs font-medium">
                            暂无法比对
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedObjectForCompare(null)}
                className="px-4 py-1.5 rounded-ty-sm bg-[var(--ty-primary-color)] text-[var(--ty-font-white-color)] text-ty-xs font-medium cursor-pointer"
              >
                关闭明细
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
