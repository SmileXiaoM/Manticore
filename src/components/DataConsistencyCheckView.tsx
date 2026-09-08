import React, { useState, useMemo } from 'react';
import {
  Play,
  AlertCircle,
  Loader2,
  X,
  ArrowRight
} from 'lucide-react';
import {
  ConsistencyBatchRecord,
  ConsistencyObjectResult,
  ConsistencyItemStatus,
  calculateConsistencyStats,
  formatLocalDateTime,
  formatLocalDateCode,
  OBJECT_STATUS_META
} from '../types/consistencyCheck';
import {
  initialConsistencyBatches,
  ROOT_TYPE_SCOPE_OPTIONS,
  ROOT_TYPE_OBJECT_ID_PLACEHOLDER,
  buildComparisonFieldSnapshot,
  executeConsistencyRun
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
  onNavigateToSyncQuality?: (batchId?: string) => void;
}

// 统一的核验范围模式
type CheckScopeMode = 'RANDOM_SAMPLE' | 'EXHAUSTIVE_SCOPE' | 'SPECIFIC_IDS';

export const DataConsistencyCheckView: React.FC<DataConsistencyCheckViewProps> = ({
  mappingObjects = initialMappingObjectTypes,
  fieldMappings = initialFieldMappings,
  syncBatches,
  onNavigateToSyncQuality
}) => {
  // 1. 当前选中的根类型代码 (单选，严禁多选和全部根类型)
  const [selectedRootTypeCode, setSelectedRootTypeCode] = useState<string>('PART');

  // 2. 核验模式及配置
  const [scopeMode, setScopeMode] = useState<CheckScopeMode>('RANDOM_SAMPLE');
  const [sampleCount, setSampleCount] = useState<number>(50);
  const [selectedScopeId, setSelectedScopeId] = useState<string>('SCOPE_PART_FASTENER');
  const [inputObjectIds, setInputObjectIds] = useState<string>('P-30001, P-30002, P-30003, P-30004, P-30005');

  // 3. 核验历史批次与当前查看的批次、对比明细
  const [batches, setBatches] = useState<ConsistencyBatchRecord[]>(initialConsistencyBatches);
  const [selectedBatch, setSelectedBatch] = useState<ConsistencyBatchRecord | null>(null);
  const [selectedObjectForCompare, setSelectedObjectForCompare] = useState<ConsistencyObjectResult | null>(null);

  // 4. 发起核验中的运行状态
  const [isRunningCheck, setIsRunningCheck] = useState<boolean>(false);

  // 5. 批次详情抽屉内部的筛选与分页
  const [detailFilterStatus, setDetailFilterStatus] = useState<'ALL' | ConsistencyItemStatus>('ALL');
  const [detailPageIndex, setDetailPageIndex] = useState<number>(1);
  const detailPageSize = 10;

  // 6. 页面提示
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'warning' | 'error' } | null>(null);
  const showToast = (text: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 获取当前选中的根类型元信息
  const currentRootType = useMemo(() => {
    const found = mappingObjects.find(m => m.id === selectedRootTypeCode);
    if (found) {
      return {
        ...found,
        displayName: found.name
      };
    }
    const defaultName = selectedRootTypeCode === 'PART' ? '零部件 (Part)' : selectedRootTypeCode === 'DOCUMENT' ? '文档 (Document)' : '工艺路线 (Process)';
    return {
      id: selectedRootTypeCode,
      name: defaultName,
      displayName: defaultName,
      sourceSystemId: 'PLM_WINCHILL',
      sourceSystemName: 'Windchill PLM',
      description: '',
      configuredFieldCount: 0,
      formalQueryableFieldCount: 0,
      draftFieldCount: 0,
      manticoreDocCount: 0,
      configStatus: 'CONFIGURED' as const,
      syncStatus: 'NOT_SYNCED' as const
    };
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

  // 解析手动输入的指定对象
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

  // 获取最近一次完成的批次（用于顶部看板，若无则使用首条批次）
  const latestBatch = useMemo(() => {
    return batches.find(b => b.status === 'COMPLETED') || batches[0] || null;
  }, [batches]);

  // 统一调用唯一统计函数计算指标（保证顶部指标、历史列表、详情抽屉完全同一套算法）
  const latestStats = useMemo(() => {
    return calculateConsistencyStats(latestBatch);
  }, [latestBatch]);

  // 顶部一致率指标卡名称根据最近批次动态呈现
  const consistencyRateTitle = useMemo(() => {
    if (!latestBatch) return '核验一致率';
    if (latestBatch.scopeMode === 'RANDOM_SAMPLE') return '本次抽检一致率';
    if (latestBatch.scopeMode === 'EXHAUSTIVE_SCOPE') return '本次全量核验一致率';
    return '本次定向核验一致率';
  }, [latestBatch]);

  // 发起核验操作（完整异步执行生命周期）
  const handleTriggerCheck = () => {
    // 1. 前置校验：检查字段快照
    if (comparisonSnapshotResult.uniqueKeyError) {
      showToast(comparisonSnapshotResult.uniqueKeyError, 'warning');
      return;
    }
    if (comparisonSnapshotResult.fieldsError || !comparisonSnapshotResult.snapshot) {
      showToast(comparisonSnapshotResult.fieldsError || '当前根类型暂无正式可核验字段', 'warning');
      return;
    }
    if (scopeMode === 'SPECIFIC_IDS' && parsedIds.uniqueIds.length === 0) {
      showToast('请输入至少一个有效的对象唯一标识', 'warning');
      return;
    }

    const snapshot = comparisonSnapshotResult.snapshot;
    const targetScopeOption = scopeMode === 'EXHAUSTIVE_SCOPE'
      ? currentScopeOptions.find(o => o.id === selectedScopeId)
      : undefined;

    const taskCount =
      scopeMode === 'RANDOM_SAMPLE'
        ? sampleCount
        : scopeMode === 'EXHAUSTIVE_SCOPE'
        ? targetScopeOption?.count || 20
        : parsedIds.uniqueIds.length;

    const modeLabel = scopeMode === 'RANDOM_SAMPLE' ? '抽检核验' : scopeMode === 'EXHAUSTIVE_SCOPE' ? '全量核验' : '定向核验';
    const scopeDesc = scopeMode === 'RANDOM_SAMPLE'
      ? `抽检核验（${sampleCount} 个样本）`
      : scopeMode === 'EXHAUSTIVE_SCOPE'
      ? `全量核验：${targetScopeOption?.label || selectedScopeId}`
      : `定向核验：${parsedIds.uniqueIds.join(', ')}`;

    const batchId = `CC-${formatLocalDateCode()}-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 90 + 10)}`;
    const nowStr = formatLocalDateTime();

    // 2. 异步生命周期开始：先插入纯净的 RUNNING 批次
    const runningBatch: ConsistencyBatchRecord = {
      id: batchId,
      planName: `${currentRootType.displayName} ${modeLabel}批次`,
      triggerType: 'MANUAL_CUSTOM',
      rootTypeCode: selectedRootTypeCode,
      rootTypeName: currentRootType.displayName,
      scopeMode,
      scopeDescription: scopeDesc,
      strategySummary: `${modeLabel}执行中...`,
      executedAt: nowStr,
      plannedCount: taskCount,
      actualCount: 0,
      consistentCount: 0,
      differenceCount: 0,
      pendingRecheckCount: 0,
      incompleteCount: 0,
      comparisonFieldSnapshot: snapshot,
      frozenObjectIds: [],
      objectResults: [],
      requestedObjectIds: scopeMode === 'SPECIFIC_IDS' ? parsedIds.uniqueIds : undefined,
      sourceSyncBatchId: syncBatches?.[0]?.id,
      status: 'RUNNING'
    };

    setIsRunningCheck(true);
    setBatches(prev => [runningBatch, ...prev]);
    showToast(`已发起核验任务 [${batchId}]，正在执行比对...`, 'success');

    // 3. 模拟异步比对完成并在同一条记录上更新为最终状态（COMPLETED 或 FAILED）
    setTimeout(() => {
      const completedBatch = executeConsistencyRun({
        rootTypeCode: selectedRootTypeCode,
        rootTypeName: currentRootType.displayName,
        scopeMode,
        sampleCount: taskCount,
        scopeId: selectedScopeId,
        scopeName: targetScopeOption?.label,
        requestedObjectIds: scopeMode === 'SPECIFIC_IDS' ? parsedIds.uniqueIds : undefined,
        comparisonFieldSnapshot: snapshot,
        sourceSyncBatchId: syncBatches?.[0]?.id
      }, batchId);

      setBatches(prev => prev.map(b => (b.id === batchId ? completedBatch : b)));
      setIsRunningCheck(false);

      if (completedBatch.status === 'FAILED') {
        showToast(`核验批次 [${batchId}] 执行失败：${completedBatch.failedReason}`, 'error');
      } else {
        showToast(`核验批次 [${batchId}] 比对完成`, 'success');
      }
    }, 1200);
  };

  // 抽屉内部筛选结果
  const filteredBatchResults = useMemo(() => {
    if (!selectedBatch) return [];
    if (detailFilterStatus === 'ALL') return selectedBatch.objectResults;
    if (detailFilterStatus === 'PENDING_RECHECK') {
      return selectedBatch.objectResults.filter(
        item => item.status === 'PENDING_RECHECK' || item.status === 'UNABLE_TO_COMPARE'
      );
    }
    return selectedBatch.objectResults.filter(item => item.status === detailFilterStatus);
  }, [selectedBatch, detailFilterStatus]);

  const totalPages = Math.max(1, Math.ceil(filteredBatchResults.length / detailPageSize));
  const paginatedBatchResults = useMemo(() => {
    const start = (detailPageIndex - 1) * detailPageSize;
    return filteredBatchResults.slice(start, start + detailPageSize);
  }, [filteredBatchResults, detailPageIndex]);

  // 判断最新批次是否正在核验中
  const isLatestRunning = latestBatch?.status === 'RUNNING';

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

      {/* 顶部标题栏 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[var(--ty-border-color)]">
        <div>
          <h1 className="text-ty-lg font-bold text-[var(--ty-font-main-color)]">数据一致性核验</h1>
          <div className="text-ty-xs text-[var(--ty-font-sub-color)] mt-1 flex items-center space-x-2">
            <span>最近核验时间：</span>
            <span className="font-mono text-[var(--ty-font-main-color)] font-medium">
              {latestBatch?.executedAt || '--'}
            </span>
            {latestBatch && (
              <span className="text-ty-2xs text-[var(--ty-font-sub-color)]">
                ({latestBatch.id} · {latestBatch.rootTypeName})
              </span>
            )}
          </div>
        </div>
        {onNavigateToSyncQuality && (
          <button
            onClick={() => onNavigateToSyncQuality(latestBatch?.sourceSyncBatchId)}
            className="inline-flex items-center text-ty-xs text-[var(--ty-primary-color)] hover:underline self-start sm:self-auto cursor-pointer"
            id="link-to-sync-quality"
          >
            <span>查看数据同步记录</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </button>
        )}
      </div>

      {/* 1. 根类型与核验范围 + 2. 发起核验 */}
      <div className="bg-[var(--ty-fill-white-color)] rounded-ty-lg border border-[var(--ty-border-color)] p-4 space-y-4" id="consistency-action-card">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--ty-border-color)]">
          <div className="flex items-center space-x-2">
            <div className="w-1.5 h-3.5 bg-[var(--ty-primary-color)] rounded-ty-xs"></div>
            <h2 className="text-ty-sm font-bold text-[var(--ty-font-main-color)]">发起一致性核验</h2>
          </div>
          {comparisonSnapshotResult.fieldsError ? (
            <span className="text-[var(--ty-orange-color)] text-ty-2xs font-medium flex items-center space-x-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{comparisonSnapshotResult.fieldsError}</span>
            </span>
          ) : comparisonSnapshotResult.snapshot ? (
            <span className="text-ty-2xs text-[var(--ty-font-sub-color)]">
              核验字段：<strong className="text-[var(--ty-font-main-color)]">{comparisonSnapshotResult.snapshot.includedFields.length} 项</strong>
            </span>
          ) : null}
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
                    <span className="text-[var(--ty-font-sub-color)]">输入对象标识（逗号/换行分隔）：</span>
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
                <div>根类型：<strong className="text-[var(--ty-font-main-color)]">{currentRootType.displayName}</strong></div>
                <div>模式：<strong className="text-[var(--ty-font-main-color)]">
                  {scopeMode === 'RANDOM_SAMPLE' ? `抽检 (${sampleCount}个)` : scopeMode === 'EXHAUSTIVE_SCOPE' ? '指定范围全量' : '指定对象ID'}
                </strong></div>
                <div>核验状态：<strong className="text-[var(--ty-font-main-color)]">
                  {comparisonSnapshotResult.fieldsError ? '无可用字段' : '就绪'}
                </strong></div>
              </div>
            </div>

            <button
              type="button"
              disabled={isRunningCheck || !!comparisonSnapshotResult.fieldsError}
              onClick={handleTriggerCheck}
              className={`w-full py-2.5 px-4 rounded-ty-sm text-ty-xs font-semibold flex items-center justify-center space-x-2 transition-colors cursor-pointer shadow-sm ${
                isRunningCheck || comparisonSnapshotResult.fieldsError
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

      {/* 3. 本次核验一致率 与 4. 有效比对数、不一致数、待处理数 看板卡片 */}
      {/* 严格遵循唯一口径：有效比对数 = 一致数 + 不一致数；待复查、无法比对不入分母；分母为0或核验中显示 -- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="consistency-metrics-board">
        {/* 指标 1：本次核验一致率 */}
        <div className="bg-[var(--ty-fill-white-color)] rounded-ty-lg border border-[var(--ty-border-color)] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-ty-xs font-medium text-[var(--ty-font-sub-color)]">
              {consistencyRateTitle}
            </span>
            <span className="text-ty-2xs text-[var(--ty-font-sub-color)] font-mono">
              {isLatestRunning ? '--' : latestStats.fractionWithoutParens}
            </span>
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline space-x-2">
              <span className="text-ty-2xl font-bold font-mono text-[var(--ty-font-main-color)] tracking-tight">
                {isLatestRunning ? '--' : latestStats.rateText}
              </span>
              {!isLatestRunning && latestStats.rateText !== '--' && (
                <span className="text-ty-xs text-[var(--ty-font-sub-color)] font-mono">
                  ({latestStats.fractionWithoutParens})
                </span>
              )}
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
              {isLatestRunning ? '--' : latestStats.effectiveCount}
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
              !isLatestRunning && latestStats.inconsistentCount > 0 ? 'text-[var(--ty-red-color)]' : 'text-[var(--ty-green-color)]'
            }`}>
              {isLatestRunning ? '--' : latestStats.inconsistentCount}
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
            <span className="text-ty-2xs text-[var(--ty-font-sub-color)]">待复查 + 无法比对</span>
          </div>
          <div className="mt-2.5 flex items-baseline space-x-1.5">
            <span className={`text-ty-2xl font-bold font-mono tracking-tight ${
              !isLatestRunning && latestStats.pendingTotalCount > 0 ? 'text-[var(--ty-orange-color)]' : 'text-[var(--ty-font-main-color)]'
            }`}>
              {isLatestRunning ? '--' : latestStats.pendingTotalCount}
            </span>
            <span className="text-ty-xs text-[var(--ty-font-sub-color)]">个对象</span>
          </div>
        </div>
      </div>

      {/* 5. 结果列表和差异详情 (表格卡片) */}
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
          <table className="w-full text-left border-collapse text-ty-xs">
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
                    <td className="py-3 px-3.5 font-mono font-bold text-[var(--ty-primary-color)]">
                      {batch.id}
                    </td>
                    <td className="py-3 px-3 font-medium text-[var(--ty-font-main-color)]">
                      {batch.rootTypeName}
                    </td>
                    <td className="py-3 px-3 text-ty-2xs text-[var(--ty-font-main-color)] max-w-xs truncate" title={batch.scopeDescription}>
                      {batch.scopeDescription}
                    </td>
                    <td className="py-3 px-3 text-center">
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
                        <div className="inline-flex items-center space-x-1 text-ty-2xs font-mono font-semibold text-[var(--ty-font-main-color)]">
                          <span>{stats.rateText}</span>
                          {stats.rateText !== '--' && (
                            <span className="text-[var(--ty-font-sub-color)] font-normal">({stats.fractionWithoutParens})</span>
                          )}
                        </div>
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
                    <td className="py-3 px-3.5 text-center">
                      <button
                        type="button"
                        disabled={isRunning}
                        onClick={() => {
                          setSelectedBatch(batch);
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
            </tbody>
          </table>
        </div>
      </div>

      {/* 差异详情抽屉 */}
      {selectedBatch && (
        <div className="fixed inset-0 z-50 overflow-hidden" id="batch-detail-drawer-overlay">
          <div
            className="absolute inset-0 bg-ty-overlay backdrop-blur-xs transition-opacity"
            onClick={() => setSelectedBatch(null)}
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
                onClick={() => setSelectedBatch(null)}
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

            {/* 抽屉统一指标栏 (统一调用 calculateConsistencyStats) */}
            {(() => {
              const bStats = calculateConsistencyStats(selectedBatch);
              return (
                <div className="px-6 py-3.5 border-b border-[var(--ty-border-color)] bg-[var(--ty-fill-white-color)] grid grid-cols-4 gap-3 text-center">
                  <div>
                    <span className="text-ty-2xs text-[var(--ty-font-sub-color)] block">本次一致率</span>
                    <span className="text-ty-sm font-bold font-mono text-[var(--ty-font-main-color)]">
                      {bStats.rateText} {bStats.rateText !== '--' && <span className="text-ty-2xs text-[var(--ty-font-sub-color)] font-normal">({bStats.fractionWithoutParens})</span>}
                    </span>
                  </div>
                  <div>
                    <span className="text-ty-2xs text-[var(--ty-font-sub-color)] block">有效比对数</span>
                    <span className="text-ty-sm font-bold font-mono text-[var(--ty-primary-color)]">
                      {bStats.effectiveCount}
                    </span>
                  </div>
                  <div>
                    <span className="text-ty-2xs text-[var(--ty-font-sub-color)] block">不一致数</span>
                    <span className={`text-ty-sm font-bold font-mono ${
                      bStats.inconsistentCount > 0 ? 'text-[var(--ty-red-color)]' : 'text-[var(--ty-green-color)]'
                    }`}>
                      {bStats.inconsistentCount}
                    </span>
                  </div>
                  <div>
                    <span className="text-ty-2xs text-[var(--ty-font-sub-color)] block">待处理数</span>
                    <span className="text-ty-sm font-bold font-mono text-[var(--ty-orange-color)]">
                      {bStats.pendingTotalCount}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* 抽屉内容列表区 */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-ty-xs">
              {/* 筛选过滤栏 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5 text-ty-2xs">
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
                        : 'bg-[var(--ty-fill-white-color)] text-[var(--ty-font-sub-color)] border-[var(--ty-border-color)]'
                    }`}
                  >
                    全部 ({selectedBatch.objectResults.length})
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
                    不一致 ({selectedBatch.differenceCount})
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
                    待处理 ({(selectedBatch.pendingRecheckCount || 0) + (selectedBatch.incompleteCount || 0)})
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
                    一致 ({selectedBatch.consistentCount})
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
