import React, { useState } from 'react';
import {
  FileCheck2,
  Calendar,
  Sliders,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  X,
  Play,
  RotateCcw,
  Info,
  Layers,
  ArrowRight
} from 'lucide-react';
import {
  ConsistencyCheckPlan,
  ConsistencyBatchRecord,
  ConsistencyObjectResult,
  formatLocalDateTime,
  formatLocalDateCode
} from '../types/consistencyCheck';
import {
  initialConsistencyPlan,
  initialConsistencyBatches,
  demoObjectResults
} from '../data/consistencyCheckData';

interface DataConsistencyCheckViewProps {
  onNavigateToSyncQuality?: () => void;
}

// 模拟限定范围选项（临时核验-指定范围）
const SCOPE_OPTIONS = [
  { id: 'SCOPE_BOLT', name: '标准件 > 紧固件 > 螺栓 (最近7天)', count: 36, isOverLimit: false },
  { id: 'SCOPE_GEAR', name: '传动系统 > 齿轮箱部件 (最近7天)', count: 24, isOverLimit: false },
  { id: 'SCOPE_SEAL', name: '密封与弹性元件 (最近14天)', count: 18, isOverLimit: false },
  { id: 'SCOPE_ALL', name: '全品类零部件全量范围 (最近30天)', count: 128, isOverLimit: true }
];

export const DataConsistencyCheckView: React.FC<DataConsistencyCheckViewProps> = ({
  onNavigateToSyncQuality
}) => {
  // 核心状态
  const [plan, setPlan] = useState<ConsistencyCheckPlan>(initialConsistencyPlan);
  const [batches, setBatches] = useState<ConsistencyBatchRecord[]>(initialConsistencyBatches);
  const [selectedBatch, setSelectedBatch] = useState<ConsistencyBatchRecord | null>(null);
  const [selectedObjectForCompare, setSelectedObjectForCompare] = useState<ConsistencyObjectResult | null>(null);

  // 抽屉与折叠状态
  const [isPlanDrawerOpen, setIsPlanDrawerOpen] = useState(false);
  const [draftPlan, setDraftPlan] = useState<ConsistencyCheckPlan>(initialConsistencyPlan);
  const [isExplanationOpen, setIsExplanationOpen] = useState(false); // 默认收起
  const [isFieldsTooltipOpen, setIsFieldsTooltipOpen] = useState(false);
  const [isFrozenIdsExpanded, setIsFrozenIdsExpanded] = useState(false);

  // 立即核验区交互状态
  const [activeCheckTab, setActiveCheckTab] = useState<'BY_PLAN' | 'CUSTOM'>('BY_PLAN');
  const [customCheckSubMode, setCustomCheckSubMode] = useState<'SPECIFIC_IDS' | 'SPECIFIC_SCOPE'>('SPECIFIC_IDS');
  const [inputManualIds, setInputManualIds] = useState<string>('P-30001, P-30002, P-30003, P-30004, P-30005');
  const [selectedScopeId, setSelectedScopeId] = useState<string>('SCOPE_BOLT');

  // 轻量提示消息
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'warning' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'warning' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // 解析手动输入的 ID，严格去重并限制上限 50
  const parsedManualIds = React.useMemo(() => {
    const rawList = inputManualIds
      .split(/[\n,，\s]+/)
      .map(s => s.trim())
      .filter(Boolean);
    const uniqueList = Array.from(new Set(rawList));
    const duplicateCount = rawList.length - uniqueList.length;
    return {
      rawCount: rawList.length,
      uniqueIds: uniqueList,
      duplicateCount,
      isExceeded: uniqueList.length > 50
    };
  }, [inputManualIds]);

  // 生成确定性核验批次（严格保证实际样本数 = 冻结 ID 数 = 明细行数 = 状态分布合计）
  const generateBatchFromPlan = (
    targetPlan: ConsistencyCheckPlan,
    batchNum: number,
    triggerType: 'SCHEDULED' | 'MANUAL_BY_PLAN' = 'MANUAL_BY_PLAN'
  ): ConsistencyBatchRecord => {
    const now = new Date();
    const dateCode = formatLocalDateCode(now);
    const timeStr = formatLocalDateTime(now);
    const batchId = `CC-${dateCode}-${String(batchNum).padStart(3, '0')}`;

    const limit = Math.max(1, targetPlan.maxSampleLimit);
    let plannedCount = limit;
    let deduplicatedCount = 0;
    let focusCount = 0;
    let randomCount = 0;
    let strategySummary = '';

    if (targetPlan.strategy === 'FOCUS_AND_RANDOM') {
      const desiredFocus = Math.min(targetPlan.focusQuota, plannedCount);
      deduplicatedCount = limit > 50 ? 2 : (limit > 10 ? 1 : 0);
      const actualTotal = Math.max(1, plannedCount - deduplicatedCount);
      focusCount = Math.min(desiredFocus, actualTotal);
      randomCount = actualTotal - focusCount;
      strategySummary = `重点＋随机 (高频重点 ${focusCount} + 合格随机 ${randomCount}，去重剔除 ${deduplicatedCount} 个)`;
    } else if (targetPlan.strategy === 'RANDOM_SAMPLE') {
      deduplicatedCount = 0;
      focusCount = 0;
      randomCount = limit;
      strategySummary = `纯随机抽查 (全量随机 ${limit} 个，不设重点配额)`;
    } else {
      // EXHAUSTIVE_SCOPE
      deduplicatedCount = 0;
      focusCount = 0;
      randomCount = 0;
      strategySummary = `指定范围全部核验 (限定范围内合格对象共 ${limit} 个)`;
    }

    const actualCount = focusCount + randomCount || limit;

    // 状态精确分布
    let diffCount = 0;
    let pendingCount = 0;
    let incompleteCount = 0;

    if (actualCount === 1) {
      diffCount = 1;
    } else if (actualCount === 2) {
      diffCount = 1;
    } else if (actualCount === 3) {
      diffCount = 1;
      pendingCount = 1;
    } else if (actualCount === 4) {
      diffCount = 1;
      pendingCount = 1;
      incompleteCount = 1;
    } else {
      diffCount = Math.max(1, Math.min(2, Math.floor(actualCount * 0.05)));
      pendingCount = 1;
      incompleteCount = 1;
    }
    const consistentCount = actualCount - diffCount - pendingCount - incompleteCount;

    // 生成对象明细
    const objectResults: ConsistencyObjectResult[] = [];
    const statusPool: { status: 'DIFFERENCE_FOUND' | 'PENDING_RECHECK' | 'INCOMPLETE' | 'CONSISTENT'; isTargetMissing?: boolean }[] = [];

    for (let i = 0; i < diffCount; i++) {
      statusPool.push({ status: 'DIFFERENCE_FOUND', isTargetMissing: i === 1 });
    }
    for (let i = 0; i < pendingCount; i++) {
      statusPool.push({ status: 'PENDING_RECHECK' });
    }
    for (let i = 0; i < incompleteCount; i++) {
      statusPool.push({ status: 'INCOMPLETE' });
    }
    for (let i = 0; i < consistentCount; i++) {
      statusPool.push({ status: 'CONSISTENT' });
    }

    for (let i = 0; i < actualCount; i++) {
      const itemStatus = statusPool[i] || { status: 'CONSISTENT' };
      let obj: ConsistencyObjectResult;

      if (i < demoObjectResults.length && demoObjectResults[i].status === itemStatus.status) {
        obj = { ...demoObjectResults[i] };
      } else {
        const objId = `P-${30000 + i + 1}`;
        const reason = targetPlan.strategy === 'RANDOM_SAMPLE'
          ? 'RANDOM_SAMPLE'
          : (i < focusCount ? 'HIGH_FREQUENCY' : 'RANDOM_SAMPLE');

        let statusDetail = '核验通过：PLM 预期值与 Manticore 实际值逐字段一致';
        let differenceFields: string[] = [];
        let incompleteReason: string | undefined;
        let recheckReason: string | undefined;

        if (itemStatus.status === 'DIFFERENCE_FOUND') {
          if (itemStatus.isTargetMissing) {
            statusDetail = '发现差异：PLM 源端已存在发布记录，但 Manticore 目标索引库未检索到对应主键';
            differenceFields = ['版本/迭代与生命周期', '物料名称', '主要材质'];
          } else {
            statusDetail = '发现字段差异：PLM 版本为 Rev 8/已发布，而 Manticore 实际为 Rev 7/工作中';
            differenceFields = ['版本/迭代与生命周期'];
          }
        } else if (itemStatus.status === 'PENDING_RECHECK') {
          statusDetail = '待复查：PLM 源端 2 分钟前仍有活动修改，处于演示同步延迟窗口期 (5分钟演示阈值 / 待确认)';
          differenceFields = ['版本/迭代与生命周期'];
          recheckReason = 'PLM 最后变更时间距核验时刻小于 5 分钟演示缓冲阈值(待确认)';
        } else if (itemStatus.status === 'INCOMPLETE') {
          statusDetail = '检查未完成：PLM 源端批量只读接口握手超时 (504 Gateway Timeout)，无法判定一致性';
          differenceFields = ['全部待检字段'];
          incompleteReason = 'PLM 源端数据服务在批量取数时发生连接中断或超时';
        }

        obj = {
          objectId: objId,
          objectName: `零部件物料 ${objId}`,
          rootTypeCode: 'PART',
          selectedReason: reason,
          modifyCount: reason === 'HIGH_FREQUENCY' ? 12 : undefined,
          lastModifiedAt: formatLocalDateTime(new Date(Date.now() - (i + 1) * 3600000)),
          status: itemStatus.status,
          statusDetail,
          differenceFields,
          isTargetMissing: itemStatus.isTargetMissing,
          incompleteReason,
          recheckReason,
          fields: [
            {
              fieldCode: 'version_lifecycle',
              fieldName: '版本/迭代与生命周期',
              plmRawValue: itemStatus.status === 'INCOMPLETE' ? null : 'Rev 2 / 已发布',
              mappedExpectedValue: itemStatus.status === 'INCOMPLETE' ? null : 'Rev 2 / 已发布',
              manticoreActualValue: itemStatus.status === 'INCOMPLETE' ? 'Rev 2 / 已发布' : (itemStatus.status === 'DIFFERENCE_FOUND' ? 'Rev 1 / 工作中' : (itemStatus.isTargetMissing ? null : 'Rev 2 / 已发布')),
              matchStatus: itemStatus.status === 'INCOMPLETE' ? 'UNVERIFIABLE' : (itemStatus.status === 'DIFFERENCE_FOUND' ? (itemStatus.isTargetMissing ? 'TARGET_MISSING' : 'MISMATCH') : 'MATCH')
            },
            {
              fieldCode: 'part_name',
              fieldName: '物料名称',
              plmRawValue: itemStatus.status === 'INCOMPLETE' ? null : `零部件物料 ${objId}`,
              mappedExpectedValue: itemStatus.status === 'INCOMPLETE' ? null : `零部件物料 ${objId}`,
              manticoreActualValue: itemStatus.isTargetMissing ? null : `零部件物料 ${objId}`,
              matchStatus: itemStatus.status === 'INCOMPLETE' ? 'UNVERIFIABLE' : (itemStatus.isTargetMissing ? 'TARGET_MISSING' : 'MATCH')
            },
            {
              fieldCode: 'primary_material',
              fieldName: '主要材质',
              plmRawValue: itemStatus.status === 'INCOMPLETE' ? null : 'Q235-B',
              mappedExpectedValue: itemStatus.status === 'INCOMPLETE' ? null : '碳素结构钢 (Q235-B)',
              manticoreActualValue: itemStatus.isTargetMissing ? null : '碳素结构钢 (Q235-B)',
              matchStatus: itemStatus.status === 'INCOMPLETE' ? 'UNVERIFIABLE' : (itemStatus.isTargetMissing ? 'TARGET_MISSING' : 'MATCH')
            },
            {
              fieldCode: 'classification_path',
              fieldName: '分类路径',
              plmRawValue: itemStatus.status === 'INCOMPLETE' ? null : '零件 > 通用机械件',
              mappedExpectedValue: itemStatus.status === 'INCOMPLETE' ? null : '标准零件 > 通用机械件',
              manticoreActualValue: itemStatus.isTargetMissing ? null : '标准零件 > 通用机械件',
              matchStatus: itemStatus.status === 'INCOMPLETE' ? 'UNVERIFIABLE' : (itemStatus.isTargetMissing ? 'TARGET_MISSING' : 'MATCH')
            }
          ]
        };
      }

      objectResults.push(obj);
    }

    const frozenObjectIds = objectResults.map(o => o.objectId);

    // 重新根据实际明细统计数量，确保恒等式
    const finalConsistentCount = objectResults.filter(o => o.status === 'CONSISTENT').length;
    const finalDifferenceCount = objectResults.filter(o => o.status === 'DIFFERENCE_FOUND').length;
    const finalPendingRecheckCount = objectResults.filter(o => o.status === 'PENDING_RECHECK').length;
    const finalIncompleteCount = objectResults.filter(o => o.status === 'INCOMPLETE').length;

    return {
      id: batchId,
      planId: targetPlan.id,
      planName: targetPlan.name,
      triggerType,
      rootTypeCode: targetPlan.rootTypeCode,
      rootTypeName: targetPlan.rootTypeName,
      scopeDescription: `最近 ${targetPlan.timeWindowDays} 天有变更的合格零部件对象`,
      strategySummary,
      executedAt: timeStr,
      plmReadTime: `${timeStr} (固定演示)`,
      manticoreReadTime: `${timeStr} (固定演示)`,
      benchmarkSource: '固定演示数据（真实取数待接入）',
      plannedCount,
      actualCount,
      focusCount,
      randomCount,
      manualCount: 0,
      deduplicatedCount,
      quotaSupplementInfo: targetPlan.strategy === 'FOCUS_AND_RANDOM'
        ? `重点样本 ${focusCount} 个；随机样本 ${randomCount} 个，剔除重叠 ${deduplicatedCount} 个，有效样本 ${actualCount} 个`
        : `全量样本 ${actualCount} 个，按当前计划参数执行`,
      consistentCount: finalConsistentCount,
      differenceCount: finalDifferenceCount,
      pendingRecheckCount: finalPendingRecheckCount,
      incompleteCount: finalIncompleteCount,
      frozenObjectIds,
      objectResults,
      status: 'COMPLETED'
    };
  };

  // 生成临时指定核验批次
  const generateManualBatch = (
    mode: 'SPECIFIC_IDS' | 'SPECIFIC_SCOPE',
    ids: string[],
    scopeName?: string,
    batchNum: number = batches.length + 1
  ): ConsistencyBatchRecord => {
    const now = new Date();
    const dateCode = formatLocalDateCode(now);
    const timeStr = formatLocalDateTime(now);
    const batchId = `CC-${dateCode}-${String(batchNum).padStart(3, '0')}`;

    const actualCount = ids.length;
    const objectResults: ConsistencyObjectResult[] = [];

    // 根据输入的 ID 生成对应的结果对象，前 5 项若匹配 demoObjectResults 则复用
    const demoMap = new Map(demoObjectResults.map(item => [item.objectId, item]));

    ids.forEach((id, idx) => {
      if (demoMap.has(id)) {
        objectResults.push({ ...demoMap.get(id)! });
      } else {
        objectResults.push({
          objectId: id,
          objectName: `临时指定物料 ${id} (演示占位)`,
          rootTypeCode: 'PART',
          selectedReason: 'MANUAL_SPECIFIED',
          lastModifiedAt: formatLocalDateTime(new Date(Date.now() - (idx + 1) * 7200000)),
          status: 'INCOMPLETE',
          statusDetail: '检查未完成：当前演示数据未配置真实 PLM 记录 (演示占位)',
          differenceFields: ['全部待检字段'],
          incompleteReason: '当前为本地候选演示原型，该指定 ID 未在预置演示库中配置映射比对数据',
          fields: [
            {
              fieldCode: 'version_lifecycle',
              fieldName: '版本/迭代与生命周期',
              plmRawValue: null,
              mappedExpectedValue: null,
              manticoreActualValue: null,
              matchStatus: 'UNVERIFIABLE',
              note: '本地演示原型未接入真实 PLM 取数'
            },
            {
              fieldCode: 'part_name',
              fieldName: '物料名称',
              plmRawValue: null,
              mappedExpectedValue: null,
              manticoreActualValue: null,
              matchStatus: 'UNVERIFIABLE'
            },
            {
              fieldCode: 'primary_material',
              fieldName: '主要材质',
              plmRawValue: null,
              mappedExpectedValue: null,
              manticoreActualValue: null,
              matchStatus: 'UNVERIFIABLE'
            },
            {
              fieldCode: 'classification_path',
              fieldName: '分类路径',
              plmRawValue: null,
              mappedExpectedValue: null,
              manticoreActualValue: null,
              matchStatus: 'UNVERIFIABLE'
            }
          ]
        });
      }
    });

    const finalConsistentCount = objectResults.filter(o => o.status === 'CONSISTENT').length;
    const finalDifferenceCount = objectResults.filter(o => o.status === 'DIFFERENCE_FOUND').length;
    const finalPendingRecheckCount = objectResults.filter(o => o.status === 'PENDING_RECHECK').length;
    const finalIncompleteCount = objectResults.filter(o => o.status === 'INCOMPLETE').length;

    const strategySummary = mode === 'SPECIFIC_IDS'
      ? `临时指定对象 ID (指定 ${actualCount} 个对象)`
      : `临时指定范围核验 (${scopeName || '指定范围'}，共 ${actualCount} 个对象)`;

    return {
      id: batchId,
      planName: '临时手动核验',
      triggerType: 'MANUAL_CUSTOM',
      rootTypeCode: 'PART',
      rootTypeName: '零部件 (Part)',
      scopeDescription: mode === 'SPECIFIC_IDS' ? `手动临时指定 ${actualCount} 个对象 ID` : `临时指定范围：${scopeName}`,
      strategySummary,
      executedAt: timeStr,
      plmReadTime: `${timeStr} (固定演示)`,
      manticoreReadTime: `${timeStr} (固定演示)`,
      benchmarkSource: '固定演示数据（真实取数待接入）',
      plannedCount: actualCount,
      actualCount,
      focusCount: 0,
      randomCount: 0,
      manualCount: actualCount,
      deduplicatedCount: mode === 'SPECIFIC_IDS' ? parsedManualIds.duplicateCount : 0,
      quotaSupplementInfo: mode === 'SPECIFIC_IDS'
        ? `手动指定 ${actualCount} 个对象 ID，已完成解析并冻结清单`
        : `临时指定范围限定 ${actualCount} 个对象，不影响已保存计划`,
      consistentCount: finalConsistentCount,
      differenceCount: finalDifferenceCount,
      pendingRecheckCount: finalPendingRecheckCount,
      incompleteCount: finalIncompleteCount,
      frozenObjectIds: [...ids],
      objectResults,
      status: 'COMPLETED'
    };
  };

  // 立即执行：按当前计划 (同步生成，无假定时器)
  const handleExecuteByPlan = () => {
    const newBatch = generateBatchFromPlan(plan, batches.length + 1, 'MANUAL_BY_PLAN');
    setBatches([newBatch, ...batches]);
    setSelectedBatch(newBatch);
    showToast(`已生成核验批次：${newBatch.id}（固定演示数据 / 非真实执行）`, 'success');
  };

  // 立即执行：临时核验
  const handleExecuteCustomCheck = () => {
    if (customCheckSubMode === 'SPECIFIC_IDS') {
      if (parsedManualIds.uniqueIds.length === 0) {
        showToast('请输入至少 1 个有效的对象 ID', 'warning');
        return;
      }
      if (parsedManualIds.isExceeded) {
        showToast('超过单次手动指定 50 个上限，无法执行', 'warning');
        return;
      }
      const newBatch = generateManualBatch('SPECIFIC_IDS', parsedManualIds.uniqueIds, undefined, batches.length + 1);
      setBatches([newBatch, ...batches]);
      setSelectedBatch(newBatch);
      showToast(`已生成指定 ID 核验批次：${newBatch.id}（固定演示数据 / 非真实执行）`, 'success');
    } else {
      // 指定范围
      const selectedScope = SCOPE_OPTIONS.find(s => s.id === selectedScopeId);
      if (!selectedScope) return;
      if (selectedScope.isOverLimit) {
        showToast('当前指定范围超过单次上限 50 个，无法执行', 'warning');
        return;
      }
      // 为该范围生成指定数量的 mock ID
      const scopeIds = Array.from({ length: selectedScope.count }, (_, i) => `P-3000${i + 1}`);
      const newBatch = generateManualBatch('SPECIFIC_SCOPE', scopeIds, selectedScope.name, batches.length + 1);
      setBatches([newBatch, ...batches]);
      setSelectedBatch(newBatch);
      showToast(`已生成指定范围核验批次：${newBatch.id}（固定演示数据 / 非真实执行）`, 'success');
    }
  };

  // 打开计划编辑
  const handleOpenPlanDrawer = () => {
    setDraftPlan({ ...plan });
    setIsPlanDrawerOpen(true);
  };

  // 保存计划配置
  const handleSavePlan = () => {
    const updated = {
      ...draftPlan,
      updatedAt: formatLocalDateTime(new Date())
    };
    setPlan(updated);
    setIsPlanDrawerOpen(false);
    showToast('核验计划参数已更新并在前端生效（本地演示）', 'success');
  };

  const latestBatch = batches[0];

  return (
    <div className="space-y-5" id="data-consistency-check-container">
      {/* Toast 提示框 */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 animate-in fade-in slide-in-from-top-2">
          <div className={`px-4 py-2.5 rounded-ty-sm shadow-ty-lg border flex items-center space-x-2 text-ty-xs font-medium ${
            toastMessage.type === 'success'
              ? 'bg-[var(--ty-green-lightest-color)] text-[var(--ty-green-color)] border-[var(--ty-green-color)]/30'
              : toastMessage.type === 'warning'
              ? 'bg-[var(--ty-orange-lightest-color)] text-[var(--ty-orange-color)] border-[var(--ty-orange-color)]/30'
              : 'bg-[var(--ty-fill-white-color)] text-[var(--ty-font-main-color)] border-[var(--ty-border-color)]'
          }`}>
            <Info className="w-4 h-4 shrink-0" />
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* 区域 1: 页面标题区 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-[var(--ty-border-color)]">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-ty-lg font-bold text-[var(--ty-font-main-color)]">数据一致性核验</h1>
            <span className="px-2 py-0.5 rounded-ty-xs bg-[var(--ty-fill-weak-dark-color)] text-[var(--ty-font-sub-color)] border border-[var(--ty-border-color)] text-ty-2xs font-normal">
              候选原型 / 本地演示
            </span>
          </div>
          <p className="text-ty-xs text-[var(--ty-font-sub-color)] mt-1">
            核验 PLM 源端 → Manticore 实际数据，与中间表同步记录分开。
          </p>
        </div>
        {onNavigateToSyncQuality && (
          <button
            onClick={onNavigateToSyncQuality}
            className="inline-flex items-center text-ty-xs text-[var(--ty-primary-color)] hover:underline self-start sm:self-auto cursor-pointer"
            id="link-to-sync-quality"
          >
            <span>查看数据同步记录</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </button>
        )}
      </div>

      {/* 区域 2 & 区域 3: 检查计划摘要 & 立即核验区 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* 区域 2: 检查计划摘要 (lg:col-span-7) */}
        <div className="lg:col-span-7 bg-[var(--ty-fill-white-color)] rounded-ty-lg border border-[var(--ty-border-color)] p-5 space-y-4 shadow-sm flex flex-col justify-between" id="consistency-plan-summary-card">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-4 bg-[var(--ty-primary-color)] rounded-ty-xs"></div>
                <h2 className="text-ty-sm font-bold text-[var(--ty-font-main-color)]">检查计划摘要</h2>
                <span className="px-2 py-0.5 rounded-ty-xs bg-[var(--ty-primary-lightest-color)] text-[var(--ty-primary-color)] text-ty-2xs font-medium border border-[var(--ty-primary-color)]/20">
                  {plan.name}
                </span>
              </div>
              <span className="text-ty-2xs px-2 py-0.5 rounded-ty-xs bg-[var(--ty-green-lightest-color)] text-[var(--ty-green-color)] font-medium border border-[var(--ty-green-color)]/20">
                计划已启用（本地演示）
              </span>
            </div>

            {/* 计划关键信息指标网格 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-ty-sm bg-[var(--ty-fill-weak-dark-color)] border border-[var(--ty-border-color)] text-ty-xs">
              <div>
                <span className="text-[var(--ty-font-sub-color)] block text-ty-2xs">核验根类型</span>
                <span className="font-semibold text-[var(--ty-font-main-color)] mt-0.5 block">{plan.rootTypeName}</span>
              </div>
              <div>
                <span className="text-[var(--ty-font-sub-color)] block text-ty-2xs">执行频率 / 时间</span>
                <span className="font-semibold text-[var(--ty-font-main-color)] mt-0.5 block">{plan.frequencyLabel} {plan.scheduledTime}</span>
              </div>
              <div>
                <span className="text-[var(--ty-font-sub-color)] block text-ty-2xs">当前选数策略</span>
                <span className="font-semibold text-[var(--ty-font-main-color)] mt-0.5 block">
                  {plan.strategy === 'FOCUS_AND_RANDOM' && '重点＋随机'}
                  {plan.strategy === 'RANDOM_SAMPLE' && '随机抽查'}
                  {plan.strategy === 'EXHAUSTIVE_SCOPE' && '指定范围全部核验'}
                </span>
              </div>
              <div>
                <span className="text-[var(--ty-font-sub-color)] block text-ty-2xs">单次样本上限</span>
                <span className="font-mono font-bold text-[var(--ty-primary-color)] mt-0.5 block">{plan.maxSampleLimit} 个</span>
              </div>
            </div>

            {/* 策略具体参数与核验字段 */}
            <div className="flex flex-wrap items-center justify-between text-ty-xs gap-2 pt-1">
              <div className="flex items-center space-x-2 text-[var(--ty-font-sub-color)]">
                <span>策略参数：</span>
                {plan.strategy === 'FOCUS_AND_RANDOM' ? (
                  <span className="text-[var(--ty-font-main-color)] font-medium">
                    重点配额 {plan.focusQuota} 个 ({plan.focusCriteria === 'HIGH_FREQUENCY' ? '高频修改' : '近期修改'}) + 随机配额 {plan.randomQuota} 个
                  </span>
                ) : plan.strategy === 'RANDOM_SAMPLE' ? (
                  <span className="text-[var(--ty-font-main-color)] font-medium">
                    时间窗口 {plan.timeWindowDays} 天内纯随机提取
                  </span>
                ) : (
                  <span className="text-[var(--ty-font-main-color)] font-medium">
                    指定范围全量核验，超限则阻止
                  </span>
                )}
              </div>

              {/* 核验字段轻量悬浮提示 */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsFieldsTooltipOpen(!isFieldsTooltipOpen)}
                  className="text-ty-xs text-[var(--ty-primary-color)] hover:underline inline-flex items-center space-x-1 cursor-pointer"
                >
                  <span>核验字段：{plan.targetFields.length} 项</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {isFieldsTooltipOpen && (
                  <div className="absolute right-0 top-full mt-1.5 z-20 w-64 p-3 bg-[var(--ty-fill-white-color)] rounded-ty-sm shadow-ty-lg border border-[var(--ty-border-color)] text-ty-2xs space-y-1.5 animate-in fade-in zoom-in-95 duration-100">
                    <div className="font-bold text-[var(--ty-font-main-color)] pb-1 border-b border-[var(--ty-border-color)] flex items-center justify-between">
                      <span>核验字段清单</span>
                      <button onClick={() => setIsFieldsTooltipOpen(false)} className="text-[var(--ty-font-sub-color)] hover:text-[var(--ty-font-main-color)]">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {plan.targetFields.map(field => (
                      <div key={field.fieldCode} className="flex flex-col">
                        <span className="font-semibold text-[var(--ty-font-main-color)]">{field.fieldName}</span>
                        <span className="text-[var(--ty-font-sub-color)]">{field.description}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[var(--ty-border-color)] flex items-center justify-between">
            <span className="text-ty-2xs text-[var(--ty-font-sub-color)]">
              最后修改: {plan.updatedAt}
            </span>
            <button
              onClick={handleOpenPlanDrawer}
              className="px-3.5 py-1.5 border border-[var(--ty-border-color)] rounded-ty-sm bg-[var(--ty-fill-white-color)] hover:bg-[var(--ty-fill-weak-dark-color)] text-[var(--ty-font-main-color)] text-ty-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
              id="btn-configure-plan"
            >
              <Sliders className="w-3.5 h-3.5 text-[var(--ty-primary-color)]" />
              <span>配置计划</span>
            </button>
          </div>
        </div>

        {/* 区域 3: 立即核验区 (lg:col-span-5) */}
        <div className="lg:col-span-5 bg-[var(--ty-fill-white-color)] rounded-ty-lg border border-[var(--ty-border-color)] p-5 space-y-4 shadow-sm flex flex-col justify-between" id="consistency-run-trigger-card">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-4 bg-[var(--ty-primary-color)] rounded-ty-xs"></div>
                <h2 className="text-ty-sm font-bold text-[var(--ty-font-main-color)]">立即核验</h2>
              </div>
              <span className="text-ty-2xs text-[var(--ty-font-sub-color)]">
                固定演示数据 / 非真实执行
              </span>
            </div>

            {/* 核验方式双页签 */}
            <div className="flex rounded-ty-sm bg-[var(--ty-fill-weak-dark-color)] p-1 border border-[var(--ty-border-color)] text-ty-xs">
              <button
                type="button"
                onClick={() => setActiveCheckTab('BY_PLAN')}
                className={`flex-1 py-1 px-2.5 rounded-ty-xs font-medium text-center transition-all cursor-pointer ${
                  activeCheckTab === 'BY_PLAN'
                    ? 'bg-[var(--ty-fill-white-color)] text-[var(--ty-primary-color)] shadow-sm font-semibold'
                    : 'text-[var(--ty-font-sub-color)] hover:text-[var(--ty-font-main-color)]'
                }`}
              >
                按当前计划
              </button>
              <button
                type="button"
                onClick={() => setActiveCheckTab('CUSTOM')}
                className={`flex-1 py-1 px-2.5 rounded-ty-xs font-medium text-center transition-all cursor-pointer ${
                  activeCheckTab === 'CUSTOM'
                    ? 'bg-[var(--ty-fill-white-color)] text-[var(--ty-primary-color)] shadow-sm font-semibold'
                    : 'text-[var(--ty-font-sub-color)] hover:text-[var(--ty-font-main-color)]'
                }`}
              >
                临时核验
              </button>
            </div>

            {/* 页签 1 内容: 按当前计划 */}
            {activeCheckTab === 'BY_PLAN' && (
              <div className="space-y-3 py-1">
                <p className="text-ty-xs text-[var(--ty-font-sub-color)] leading-relaxed">
                  按计划参数即时核验。将从预置演示数据中依据当前选数策略提取样本并进行字段比对。
                </p>
                <div className="p-3 bg-[var(--ty-fill-weak-dark-color)] rounded-ty-sm border border-[var(--ty-border-color)] text-ty-2xs space-y-1">
                  <div className="flex justify-between text-[var(--ty-font-main-color)]">
                    <span>计划单次样本：</span>
                    <span className="font-mono font-bold">{plan.maxSampleLimit} 个</span>
                  </div>
                  <div className="flex justify-between text-[var(--ty-font-main-color)]">
                    <span>计划采用策略：</span>
                    <span className="font-medium">
                      {plan.strategy === 'FOCUS_AND_RANDOM' ? '重点＋随机 (组合)' : plan.strategy === 'RANDOM_SAMPLE' ? '随机抽查' : '指定范围全量'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleExecuteByPlan}
                  className="w-full py-2 px-4 rounded-ty-sm bg-[var(--ty-primary-color)] hover:bg-[var(--ty-primary-hover-color)] text-[var(--ty-font-white-color)] text-ty-xs font-semibold flex items-center justify-center space-x-2 transition-colors cursor-pointer shadow-sm"
                  id="btn-execute-by-plan"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>按当前计划执行 (演示)</span>
                </button>
              </div>
            )}

            {/* 页签 2 内容: 临时核验 */}
            {activeCheckTab === 'CUSTOM' && (
              <div className="space-y-3 py-1 text-ty-xs">
                {/* 临时核验内部二选一 */}
                <div className="flex items-center space-x-4 border-b border-[var(--ty-border-color)] pb-2 text-ty-2xs">
                  <label className="flex items-center space-x-1.5 cursor-pointer font-medium">
                    <input
                      type="radio"
                      name="custom-sub-mode"
                      checked={customCheckSubMode === 'SPECIFIC_IDS'}
                      onChange={() => setCustomCheckSubMode('SPECIFIC_IDS')}
                    />
                    <span className={customCheckSubMode === 'SPECIFIC_IDS' ? 'text-[var(--ty-primary-color)] font-bold' : 'text-[var(--ty-font-main-color)]'}>
                      指定对象 ID
                    </span>
                  </label>
                  <label className="flex items-center space-x-1.5 cursor-pointer font-medium">
                    <input
                      type="radio"
                      name="custom-sub-mode"
                      checked={customCheckSubMode === 'SPECIFIC_SCOPE'}
                      onChange={() => setCustomCheckSubMode('SPECIFIC_SCOPE')}
                    />
                    <span className={customCheckSubMode === 'SPECIFIC_SCOPE' ? 'text-[var(--ty-primary-color)] font-bold' : 'text-[var(--ty-font-main-color)]'}>
                      指定范围
                    </span>
                  </label>
                </div>

                {/* 子模式 1: 指定对象 ID */}
                {customCheckSubMode === 'SPECIFIC_IDS' && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-ty-2xs">
                      <label className="text-[var(--ty-font-main-color)] font-medium">
                        输入对象 ID（逗号/换行分隔，上限 50 个）：
                      </label>
                      <span className={`font-mono ${parsedManualIds.isExceeded ? 'text-[var(--ty-red-color)] font-bold' : 'text-[var(--ty-font-sub-color)]'}`}>
                        已识别 {parsedManualIds.uniqueIds.length} / 50
                      </span>
                    </div>
                    <textarea
                      rows={3}
                      value={inputManualIds}
                      onChange={(e) => setInputManualIds(e.target.value)}
                      placeholder="例如: P-30001, P-30002, P-30003"
                      className="w-full px-3 py-2 border border-[var(--ty-border-color)] rounded-ty-sm text-ty-xs font-mono bg-[var(--ty-fill-white-color)] focus:outline-none focus:border-[var(--ty-primary-color)]"
                    />

                    {parsedManualIds.isExceeded && (
                      <div className="p-2 rounded-ty-xs bg-[var(--ty-red-lightest-color)] text-[var(--ty-red-color)] text-ty-2xs border border-[var(--ty-red-color)]/30 flex items-center space-x-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>超出单次手动指定 50 个上限，当前输入 {parsedManualIds.uniqueIds.length} 个，无法执行。</span>
                      </div>
                    )}

                    {parsedManualIds.duplicateCount > 0 && !parsedManualIds.isExceeded && (
                      <p className="text-ty-2xs text-[var(--ty-orange-color)]">
                        已自动去重并剔除 {parsedManualIds.duplicateCount} 个重复 ID
                      </p>
                    )}

                    <p className="text-ty-2xs text-[var(--ty-font-sub-color)]">
                      说明：临时指定仅对本次核验生效，不影响已保存计划。
                    </p>

                    <button
                      type="button"
                      disabled={parsedManualIds.uniqueIds.length === 0 || parsedManualIds.isExceeded}
                      onClick={handleExecuteCustomCheck}
                      className={`w-full py-2 px-4 rounded-ty-sm text-ty-xs font-semibold flex items-center justify-center space-x-2 transition-colors ${
                        parsedManualIds.uniqueIds.length === 0 || parsedManualIds.isExceeded
                          ? 'bg-[var(--ty-fill-darkest-color)]/20 text-[var(--ty-font-sub-color)] cursor-not-allowed'
                          : 'bg-[var(--ty-primary-color)] hover:bg-[var(--ty-primary-hover-color)] text-[var(--ty-font-white-color)] cursor-pointer shadow-sm'
                      }`}
                      id="btn-execute-custom-ids"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>执行指定 ID 核验 ({parsedManualIds.uniqueIds.length} 个)</span>
                    </button>
                  </div>
                )}

                {/* 子模式 2: 指定范围 */}
                {customCheckSubMode === 'SPECIFIC_SCOPE' && (
                  <div className="space-y-2">
                    <label className="text-[var(--ty-font-main-color)] font-medium text-ty-2xs block">
                      选择限定范围（受单次 50 个上限约束）：
                    </label>
                    <select
                      value={selectedScopeId}
                      onChange={(e) => setSelectedScopeId(e.target.value)}
                      className="w-full px-3 py-2 border border-[var(--ty-border-color)] rounded-ty-sm text-ty-xs bg-[var(--ty-fill-white-color)] focus:outline-none focus:border-[var(--ty-primary-color)]"
                    >
                      {SCOPE_OPTIONS.map(opt => (
                        <option key={opt.id} value={opt.id}>
                          {opt.name} ({opt.count} 个对象 {opt.isOverLimit ? '- 超限' : ''})
                        </option>
                      ))}
                    </select>

                    {SCOPE_OPTIONS.find(s => s.id === selectedScopeId)?.isOverLimit && (
                      <div className="p-2 rounded-ty-xs bg-[var(--ty-red-lightest-color)] text-[var(--ty-red-color)] text-ty-2xs border border-[var(--ty-red-color)]/30 flex items-center space-x-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>当前指定范围内对象数 (128 个) 超过单次临时核验上限 (50 个)，必须缩减范围后方可执行，系统不会静默随机截断。</span>
                      </div>
                    )}

                    <p className="text-ty-2xs text-[var(--ty-font-sub-color)]">
                      说明：限定范围核验仅对本次执行生效，严格受 50 个上限约束，超限必须阻止。
                    </p>

                    <button
                      type="button"
                      disabled={Boolean(SCOPE_OPTIONS.find(s => s.id === selectedScopeId)?.isOverLimit)}
                      onClick={handleExecuteCustomCheck}
                      className={`w-full py-2 px-4 rounded-ty-sm text-ty-xs font-semibold flex items-center justify-center space-x-2 transition-colors ${
                        SCOPE_OPTIONS.find(s => s.id === selectedScopeId)?.isOverLimit
                          ? 'bg-[var(--ty-fill-darkest-color)]/20 text-[var(--ty-font-sub-color)] cursor-not-allowed'
                          : 'bg-[var(--ty-primary-color)] hover:bg-[var(--ty-primary-hover-color)] text-[var(--ty-font-white-color)] cursor-pointer shadow-sm'
                      }`}
                      id="btn-execute-custom-scope"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>执行指定范围核验 ({SCOPE_OPTIONS.find(s => s.id === selectedScopeId)?.count} 个)</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 区域 4: 最近结果摘要条 */}
      {latestBatch && (
        <div className="bg-[var(--ty-fill-white-color)] rounded-ty-lg border border-[var(--ty-border-color)] p-4 shadow-sm" id="consistency-latest-summary-card">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-ty-xs">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-[var(--ty-font-main-color)]">最近核验结果：</span>
                <span className="font-mono font-semibold text-[var(--ty-primary-color)]">{latestBatch.id}</span>
                <span className="px-1.5 py-0.5 rounded-ty-xs bg-[var(--ty-fill-weak-dark-color)] text-[var(--ty-font-sub-color)] text-ty-2xs border border-[var(--ty-border-color)]">
                  {latestBatch.triggerType === 'MANUAL_CUSTOM' ? '临时核验' : '按计划'}
                </span>
              </div>
              <div className="text-[var(--ty-font-sub-color)] text-ty-2xs">
                执行时间: <span className="font-mono">{latestBatch.executedAt}</span>
              </div>
              <div className="text-[var(--ty-font-sub-color)] text-ty-2xs">
                样本: <span className="font-mono font-bold text-[var(--ty-font-main-color)]">{latestBatch.actualCount}</span> / {latestBatch.plannedCount}
              </div>
            </div>

            {/* 状态徽章条 */}
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1.5 text-ty-2xs">
                <span className="px-2 py-0.5 rounded-ty-xs bg-[var(--ty-green-lightest-color)] text-[var(--ty-green-color)] font-bold">
                  一致 {latestBatch.consistentCount}
                </span>
                <span className={`px-2 py-0.5 rounded-ty-xs font-bold ${
                  latestBatch.differenceCount > 0
                    ? 'bg-[var(--ty-red-lightest-color)] text-[var(--ty-red-color)]'
                    : 'bg-[var(--ty-fill-weak-dark-color)] text-[var(--ty-font-sub-color)]'
                }`}>
                  差异 {latestBatch.differenceCount}
                </span>
                <span className={`px-2 py-0.5 rounded-ty-xs font-bold ${
                  latestBatch.pendingRecheckCount > 0
                    ? 'bg-[var(--ty-orange-lightest-color)] text-[var(--ty-orange-color)]'
                    : 'bg-[var(--ty-fill-weak-dark-color)] text-[var(--ty-font-sub-color)]'
                }`}>
                  待复查 {latestBatch.pendingRecheckCount}
                </span>
                <span className={`px-2 py-0.5 rounded-ty-xs font-bold ${
                  latestBatch.incompleteCount > 0
                    ? 'bg-[var(--ty-fill-weak-dark-color)] text-[var(--ty-font-sub-color)]'
                    : 'bg-[var(--ty-fill-weak-dark-color)] text-[var(--ty-font-sub-color)]'
                }`}>
                  未完成 {latestBatch.incompleteCount}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBatch(latestBatch)}
                className="px-3 py-1.5 rounded-ty-sm bg-[var(--ty-fill-white-color)] hover:bg-[var(--ty-fill-weak-dark-color)] text-[var(--ty-primary-color)] border border-[var(--ty-primary-color)]/30 text-ty-xs font-semibold cursor-pointer transition-colors"
                id="btn-view-latest-batch-detail"
              >
                查看详情
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 区域 5: 核验历史记录表 */}
      <div className="bg-[var(--ty-fill-white-color)] rounded-ty-lg border border-[var(--ty-border-color)] shadow-sm overflow-hidden" id="consistency-batch-table-card">
        <div className="px-5 py-3.5 border-b border-[var(--ty-border-color)] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-4 bg-[var(--ty-primary-color)] rounded-ty-xs"></div>
            <h2 className="text-ty-sm font-bold text-[var(--ty-font-main-color)]">核验历史记录</h2>
            <span className="text-ty-2xs text-[var(--ty-font-sub-color)]">
              (共 {batches.length} 次批次执行)
            </span>
          </div>
          <span className="text-ty-2xs text-[var(--ty-font-sub-color)]">
            数据来源: 固定演示数据（真实取数待接入）
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-ty-xs">
            <thead>
              <tr className="border-b border-[var(--ty-border-color)] bg-[var(--ty-fill-weak-dark-color)] text-[var(--ty-font-sub-color)] font-semibold text-ty-2xs">
                <th className="py-2.5 px-3">批次号</th>
                <th className="py-2.5 px-3">触发方式</th>
                <th className="py-2.5 px-3">根类型</th>
                <th className="py-2.5 px-3">选数策略摘要</th>
                <th className="py-2.5 px-3 text-center">样本数</th>
                <th className="py-2.5 px-3">结果分布 (一致 / 差异 / 待复查 / 未完成)</th>
                <th className="py-2.5 px-3">执行时间</th>
                <th className="py-2.5 px-3 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--ty-border-color)]">
              {batches.map(batch => (
                <tr key={batch.id} className="hover:bg-[var(--ty-fill-weak-dark-color)] transition-colors">
                  <td className="py-3 px-3 font-mono font-bold text-[var(--ty-primary-color)]">
                    {batch.id}
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-ty-xs text-ty-2xs font-medium border border-[var(--ty-border-color)] bg-[var(--ty-fill-white-color)]">
                      {batch.triggerType === 'SCHEDULED' && '计划执行'}
                      {batch.triggerType === 'MANUAL_BY_PLAN' && '按计划执行'}
                      {batch.triggerType === 'MANUAL_CUSTOM' && '临时手动'}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-medium text-[var(--ty-font-main-color)]">
                    {batch.rootTypeName}
                  </td>
                  <td className="py-3 px-3 text-ty-2xs text-[var(--ty-font-main-light-color)] max-w-xs truncate" title={batch.strategySummary}>
                    {batch.strategySummary}
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-bold text-[var(--ty-font-main-color)]">
                    {batch.actualCount}
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center space-x-1.5 text-ty-2xs">
                      <span className="px-1.5 py-0.5 rounded-ty-xs bg-[var(--ty-green-lightest-color)] text-[var(--ty-green-color)] font-bold">
                        {batch.consistentCount}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded-ty-xs font-bold ${
                        batch.differenceCount > 0
                          ? 'bg-[var(--ty-red-lightest-color)] text-[var(--ty-red-color)]'
                          : 'bg-[var(--ty-fill-weak-dark-color)] text-[var(--ty-font-sub-color)]'
                      }`}>
                        {batch.differenceCount}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded-ty-xs font-bold ${
                        batch.pendingRecheckCount > 0
                          ? 'bg-[var(--ty-orange-lightest-color)] text-[var(--ty-orange-color)]'
                          : 'bg-[var(--ty-fill-weak-dark-color)] text-[var(--ty-font-sub-color)]'
                      }`}>
                        {batch.pendingRecheckCount}
                      </span>
                      <span className="px-1.5 py-0.5 rounded-ty-xs bg-[var(--ty-fill-weak-dark-color)] text-[var(--ty-font-sub-color)] font-bold">
                        {batch.incompleteCount}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3 font-mono text-ty-2xs text-[var(--ty-font-sub-color)]">
                    {batch.executedAt}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => setSelectedBatch(batch)}
                      className="px-2.5 py-1 rounded-ty-sm bg-[var(--ty-fill-white-color)] hover:bg-[var(--ty-primary-lightest-color)] text-[var(--ty-primary-color)] border border-[var(--ty-primary-color)]/30 text-ty-2xs font-semibold transition-colors cursor-pointer"
                    >
                      查看详情
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 默认收起的折叠组件：「核验口径与边界说明」 */}
      <div className="bg-[var(--ty-fill-white-color)] rounded-ty-lg border border-[var(--ty-border-color)] overflow-hidden shadow-sm">
        <button
          type="button"
          onClick={() => setIsExplanationOpen(!isExplanationOpen)}
          className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-[var(--ty-fill-weak-dark-color)] transition-colors cursor-pointer"
          id="toggle-explanation-section"
        >
          <div className="space-y-0.5">
            <div className="flex items-center space-x-2">
              <Info className="w-4 h-4 text-[var(--ty-primary-color)]" />
              <h3 className="text-ty-xs font-bold text-[var(--ty-font-main-color)]">核验口径与边界说明</h3>
            </div>
            <p className="text-ty-2xs text-[var(--ty-font-sub-color)]">
              核验机制基于 PLM 单向抽样比对实际存储字段；包含 5 项待确认工程能力与 4 项覆盖边界，点击展开详情。
            </p>
          </div>
          <div className="flex items-center space-x-1 text-ty-2xs text-[var(--ty-font-sub-color)]">
            <span>{isExplanationOpen ? '收起说明' : '展开说明'}</span>
            {isExplanationOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {isExplanationOpen && (
          <div className="p-5 border-t border-[var(--ty-border-color)] bg-[var(--ty-fill-weak-dark-color)]/40 space-y-4 text-ty-xs animate-in fade-in duration-150">
            {/* 核心比对机制 */}
            <div className="p-3 bg-[var(--ty-fill-white-color)] rounded-ty-sm border border-[var(--ty-border-color)] space-y-1">
              <span className="font-bold text-[var(--ty-font-main-color)] text-ty-xs block">
                核心比对机制：
              </span>
              <p className="text-ty-2xs text-[var(--ty-font-main-light-color)] leading-relaxed">
                每次核验从 PLM 源端按策略抽取样本主键后，先通过业务有效映射规则转换为目标预期字段值，再向 Manticore 检索实际存储值进行逐字段比对。若 PLM 变更在演示同步延迟窗口内（5分钟演示阈值/待确认），标记为待复查；若发生超时握手异常，判定为检查未完成。
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 5 项未确认的工程能力 */}
              <div className="bg-[var(--ty-fill-white-color)] p-4 rounded-ty-sm border border-[var(--ty-border-color)] space-y-2.5">
                <h4 className="font-bold text-[var(--ty-font-main-color)] text-ty-xs flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-[var(--ty-orange-color)]" />
                  <span>待确认工程能力清单 (真实接入前需确认)</span>
                </h4>
                <ul className="space-y-2 text-ty-2xs text-[var(--ty-font-main-light-color)] list-disc list-inside">
                  <li>
                    <strong className="text-[var(--ty-font-main-color)]">1. PLM 源端读取通道：</strong>直连只读镜像库 vs 批量导出 vs 微服务接口，需确认连接模式与鉴权。
                  </li>
                  <li>
                    <strong className="text-[var(--ty-font-main-color)]">2. 唯一业务标识口径：</strong>物料编码 + 版本号 + 生命周期状态的三元联合主键在各端的映射一致性。
                  </li>
                  <li>
                    <strong className="text-[var(--ty-font-main-color)]">3. 批量查询与性能配额：</strong>低峰期执行时的批量并发量约束，防大事务锁表与超时机制。
                  </li>
                  <li>
                    <strong className="text-[var(--ty-font-main-color)]">4. 高频修改定义与变更审计源：</strong>需明确是依据变更历史表还是活动更新频次判定重点对象。
                  </li>
                  <li>
                    <strong className="text-[var(--ty-font-main-color)]">5. 同步时延与状态快照：</strong>设置 5 分钟演示缓冲阈值（待确认），避免将管道在途数据误报为故障。
                  </li>
                </ul>
              </div>

              {/* 4 项覆盖边界与合规约束 */}
              <div className="bg-[var(--ty-fill-white-color)] p-4 rounded-ty-sm border border-[var(--ty-border-color)] space-y-2.5">
                <h4 className="font-bold text-[var(--ty-font-main-color)] text-ty-xs flex items-center space-x-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-[var(--ty-primary-color)]" />
                  <span>覆盖边界与审计约束</span>
                </h4>
                <ul className="space-y-2 text-ty-2xs text-[var(--ty-font-main-light-color)] list-disc list-inside">
                  <li>
                    <strong className="text-[var(--ty-font-main-color)]">1. 单向核验范围：</strong>仅核验 PLM 样本在 Manticore 是否一致，无法直接发现 Manticore 中已孤立的残留脏数据。
                  </li>
                  <li>
                    <strong className="text-[var(--ty-font-main-color)]">2. 抽样非全库：</strong>抽查样本一致性通过不代表全量数据库 100% 绝对一致。
                  </li>
                  <li>
                    <strong className="text-[var(--ty-font-main-color)]">3. 严禁自动删除：</strong>核验只输出评审报告与告警，严禁自动执行物理修改或数据删除。
                  </li>
                  <li>
                    <strong className="text-[var(--ty-font-main-color)]">4. 脏数据处理：</strong>发现差异后由人工复核或专门的数据同步重试管道修复，核验不直接修改生产数据。
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 抽屉 1: 检查计划配置抽屉 (渐进展开) */}
      {isPlanDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden" id="plan-config-drawer-overlay">
          <div
            className="absolute inset-0 bg-ty-overlay backdrop-blur-xs transition-opacity"
            onClick={() => setIsPlanDrawerOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 max-w-xl w-full bg-[var(--ty-fill-white-color)] shadow-ty-lg flex flex-col z-10 animate-in slide-in-from-right duration-200">
            {/* 抽屉头部 */}
            <div className="px-5 py-4 border-b border-[var(--ty-border-color)] flex items-center justify-between bg-[var(--ty-fill-weak-dark-color)]">
              <div>
                <h3 className="text-ty-sm font-bold text-[var(--ty-font-main-color)]">配置数据一致性核验计划</h3>
                <span className="text-ty-2xs text-[var(--ty-font-sub-color)]">
                  配置对象范围、执行周期与选数策略（当前为本地演示原型）
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsPlanDrawerOpen(false)}
                className="p-1 rounded-ty-sm text-[var(--ty-font-sub-color)] hover:text-[var(--ty-font-main-color)] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 抽屉表单内容 */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-ty-xs">
              <div className="space-y-1">
                <label className="font-semibold text-[var(--ty-font-main-color)]">计划名称</label>
                <input
                  type="text"
                  value={draftPlan.name}
                  onChange={(e) => setDraftPlan({ ...draftPlan, name: e.target.value })}
                  className="w-full px-3 py-1.5 border border-[var(--ty-border-color)] rounded-ty-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-[var(--ty-font-main-color)]">执行周期</label>
                  <select
                    value={draftPlan.frequency}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      setDraftPlan({
                        ...draftPlan,
                        frequency: val,
                        frequencyLabel: val === 'DAILY' ? '每天 (低峰期)' : val === 'WEEKLY' ? '每周 (低峰期)' : '每月 (低峰期)'
                      });
                    }}
                    className="w-full px-3 py-1.5 border border-[var(--ty-border-color)] rounded-ty-sm bg-[var(--ty-fill-white-color)]"
                  >
                    <option value="DAILY">每天 (低峰期)</option>
                    <option value="WEEKLY">每周 (低峰期)</option>
                    <option value="MONTHLY">每月 (低峰期)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-[var(--ty-font-main-color)]">低峰执行时间</label>
                  <input
                    type="time"
                    value={draftPlan.scheduledTime}
                    onChange={(e) => setDraftPlan({ ...draftPlan, scheduledTime: e.target.value })}
                    className="w-full px-3 py-1.5 border border-[var(--ty-border-color)] rounded-ty-sm bg-[var(--ty-fill-white-color)]"
                  />
                </div>
              </div>

              {/* 选数策略 (三选一单选) */}
              <div className="space-y-2 border-t border-[var(--ty-border-color)] pt-3">
                <label className="font-semibold text-[var(--ty-font-main-color)] block">选数策略</label>
                <div className="grid grid-cols-3 gap-2">
                  <label className={`p-2.5 rounded-ty-sm border flex flex-col items-center text-center cursor-pointer transition-colors ${
                    draftPlan.strategy === 'FOCUS_AND_RANDOM'
                      ? 'border-[var(--ty-primary-color)] bg-[var(--ty-primary-lightest-color)]/30 font-bold text-[var(--ty-primary-color)]'
                      : 'border-[var(--ty-border-color)] bg-[var(--ty-fill-white-color)] text-[var(--ty-font-main-color)]'
                  }`}>
                    <input
                      type="radio"
                      name="plan-strategy"
                      checked={draftPlan.strategy === 'FOCUS_AND_RANDOM'}
                      onChange={() => setDraftPlan({ ...draftPlan, strategy: 'FOCUS_AND_RANDOM' })}
                      className="sr-only"
                    />
                    <span>重点＋随机</span>
                    <span className="text-ty-2xs text-[var(--ty-font-sub-color)] font-normal mt-0.5">组合推荐</span>
                  </label>

                  <label className={`p-2.5 rounded-ty-sm border flex flex-col items-center text-center cursor-pointer transition-colors ${
                    draftPlan.strategy === 'RANDOM_SAMPLE'
                      ? 'border-[var(--ty-primary-color)] bg-[var(--ty-primary-lightest-color)]/30 font-bold text-[var(--ty-primary-color)]'
                      : 'border-[var(--ty-border-color)] bg-[var(--ty-fill-white-color)] text-[var(--ty-font-main-color)]'
                  }`}>
                    <input
                      type="radio"
                      name="plan-strategy"
                      checked={draftPlan.strategy === 'RANDOM_SAMPLE'}
                      onChange={() => setDraftPlan({ ...draftPlan, strategy: 'RANDOM_SAMPLE' })}
                      className="sr-only"
                    />
                    <span>随机抽查</span>
                    <span className="text-ty-2xs text-[var(--ty-font-sub-color)] font-normal mt-0.5">全量随机</span>
                  </label>

                  <label className={`p-2.5 rounded-ty-sm border flex flex-col items-center text-center cursor-pointer transition-colors ${
                    draftPlan.strategy === 'EXHAUSTIVE_SCOPE'
                      ? 'border-[var(--ty-primary-color)] bg-[var(--ty-primary-lightest-color)]/30 font-bold text-[var(--ty-primary-color)]'
                      : 'border-[var(--ty-border-color)] bg-[var(--ty-fill-white-color)] text-[var(--ty-font-main-color)]'
                  }`}>
                    <input
                      type="radio"
                      name="plan-strategy"
                      checked={draftPlan.strategy === 'EXHAUSTIVE_SCOPE'}
                      onChange={() => setDraftPlan({ ...draftPlan, strategy: 'EXHAUSTIVE_SCOPE' })}
                      className="sr-only"
                    />
                    <span>指定范围全量</span>
                    <span className="text-ty-2xs text-[var(--ty-font-sub-color)] font-normal mt-0.5">专项排查</span>
                  </label>
                </div>
              </div>

              {/* 渐进展开：选数策略联动配置 */}
              {draftPlan.strategy === 'FOCUS_AND_RANDOM' && (
                <div className="p-3.5 bg-[var(--ty-fill-weak-dark-color)] rounded-ty-sm border border-[var(--ty-border-color)] space-y-3">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-[var(--ty-font-main-color)] text-ty-2xs">重点依据选择</label>
                    <div className="grid grid-cols-2 gap-2">
                      <label className={`p-2 rounded-ty-xs border text-ty-2xs flex items-center space-x-1.5 cursor-pointer ${
                        draftPlan.focusCriteria === 'HIGH_FREQUENCY'
                          ? 'border-[var(--ty-primary-color)] bg-[var(--ty-fill-white-color)] font-bold text-[var(--ty-primary-color)]'
                          : 'border-[var(--ty-border-color)] bg-[var(--ty-fill-white-color)] text-[var(--ty-font-sub-color)]'
                      }`}>
                        <input
                          type="radio"
                          name="focus-criteria"
                          checked={draftPlan.focusCriteria === 'HIGH_FREQUENCY'}
                          onChange={() => setDraftPlan({ ...draftPlan, focusCriteria: 'HIGH_FREQUENCY' })}
                        />
                        <span>高频修改 (变更历史审计)</span>
                      </label>
                      <label className={`p-2 rounded-ty-xs border text-ty-2xs flex items-center space-x-1.5 cursor-pointer ${
                        draftPlan.focusCriteria === 'RECENT_MODIFIED'
                          ? 'border-[var(--ty-primary-color)] bg-[var(--ty-fill-white-color)] font-bold text-[var(--ty-primary-color)]'
                          : 'border-[var(--ty-border-color)] bg-[var(--ty-fill-white-color)] text-[var(--ty-font-sub-color)]'
                      }`}>
                        <input
                          type="radio"
                          name="focus-criteria"
                          checked={draftPlan.focusCriteria === 'RECENT_MODIFIED'}
                          onChange={() => setDraftPlan({ ...draftPlan, focusCriteria: 'RECENT_MODIFIED' })}
                        />
                        <span>近期修改 (最后修改时间)</span>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-semibold text-[var(--ty-font-main-color)] text-ty-2xs">重点样本配额</label>
                      <input
                        type="number"
                        value={draftPlan.focusQuota}
                        onChange={(e) => setDraftPlan({ ...draftPlan, focusQuota: Number(e.target.value) })}
                        className="w-full px-3 py-1.5 border border-[var(--ty-border-color)] rounded-ty-sm bg-[var(--ty-fill-white-color)] font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-[var(--ty-font-main-color)] text-ty-2xs">随机样本配额</label>
                      <input
                        type="number"
                        value={draftPlan.randomQuota}
                        onChange={(e) => setDraftPlan({ ...draftPlan, randomQuota: Number(e.target.value) })}
                        className="w-full px-3 py-1.5 border border-[var(--ty-border-color)] rounded-ty-sm bg-[var(--ty-fill-white-color)] font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {draftPlan.strategy === 'RANDOM_SAMPLE' && (
                <div className="p-3 bg-[var(--ty-fill-weak-dark-color)] rounded-ty-sm border border-[var(--ty-border-color)] text-ty-2xs text-[var(--ty-font-sub-color)]">
                  随机抽查策略将按单次样本上限在时间窗口内纯随机取样，不设定重点修改配额。
                </div>
              )}

              {draftPlan.strategy === 'EXHAUSTIVE_SCOPE' && (
                <div className="p-3 bg-[var(--ty-fill-weak-dark-color)] rounded-ty-sm border border-[var(--ty-border-color)] text-ty-2xs text-[var(--ty-font-sub-color)]">
                  指定范围全量核验将对选定范围内的所有合格对象进行穷举比对。若超出单次样本上限，系统将直接报错提示，不会静默截断。
                </div>
              )}

              {/* 样本上限与时间窗口 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-[var(--ty-font-main-color)]">单次对象数量上限</label>
                  <input
                    type="number"
                    value={draftPlan.maxSampleLimit}
                    onChange={(e) => setDraftPlan({ ...draftPlan, maxSampleLimit: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-[var(--ty-border-color)] rounded-ty-sm font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-[var(--ty-font-main-color)]">修改时间统计窗口 (天)</label>
                  <input
                    type="number"
                    value={draftPlan.timeWindowDays}
                    onChange={(e) => setDraftPlan({ ...draftPlan, timeWindowDays: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-[var(--ty-border-color)] rounded-ty-sm font-mono"
                  />
                </div>
              </div>
            </div>

            {/* 抽屉底部 */}
            <div className="px-5 py-3 border-t border-[var(--ty-border-color)] bg-[var(--ty-fill-weak-dark-color)] flex items-center justify-between">
              <span className="text-ty-2xs text-[var(--ty-font-sub-color)]">保存后在前端状态即时生效</span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsPlanDrawerOpen(false)}
                  className="px-3.5 py-1.5 border border-[var(--ty-border-color)] rounded-ty-sm bg-[var(--ty-fill-white-color)] text-[var(--ty-font-main-color)] hover:bg-[var(--ty-fill-weak-dark-color)] text-ty-xs font-medium cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleSavePlan}
                  className="px-4 py-1.5 rounded-ty-sm bg-[var(--ty-primary-color)] hover:bg-[var(--ty-primary-hover-color)] text-[var(--ty-font-white-color)] text-ty-xs font-semibold cursor-pointer shadow-sm"
                  id="btn-save-plan"
                >
                  保存计划 (演示)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 抽屉 2: 核验结果批次详情抽屉 */}
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
                    核验批次详情：<span className="font-mono">{selectedBatch.id}</span>
                  </h3>
                  <span className="px-2 py-0.5 rounded-ty-xs bg-[var(--ty-primary-lightest-color)] text-[var(--ty-primary-color)] text-ty-2xs font-semibold">
                    {selectedBatch.planName}
                  </span>
                </div>
                <span className="text-ty-2xs text-[var(--ty-font-sub-color)] mt-0.5 block">
                  执行时间: {selectedBatch.executedAt} · 数据基准: {selectedBatch.benchmarkSource}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                {/* 禁用按同一批 ID 复查按钮 */}
                <button
                  type="button"
                  disabled={true}
                  className="px-3 py-1.5 rounded-ty-sm bg-[var(--ty-fill-weak-dark-color)] text-[var(--ty-font-sub-color)] border border-[var(--ty-border-color)] text-ty-xs font-semibold flex items-center space-x-1.5 opacity-60 cursor-not-allowed"
                  title="未接入真实取数环境，此功能暂不可用"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>按同一批 ID 复查 (待接入)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedBatch(null)}
                  className="p-1 rounded-ty-sm text-[var(--ty-font-sub-color)] hover:text-[var(--ty-font-main-color)] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 抽屉内容区 */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 text-ty-xs">
              {/* 批次元数据横条 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-ty-sm bg-[var(--ty-fill-weak-dark-color)] border border-[var(--ty-border-color)]">
                <div>
                  <span className="text-[var(--ty-font-sub-color)] block text-ty-2xs">样本有效数 / 计划上限</span>
                  <span className="font-mono font-bold text-[var(--ty-primary-color)] text-ty-xs mt-0.5 block">
                    {selectedBatch.actualCount} / {selectedBatch.plannedCount}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--ty-font-sub-color)] block text-ty-2xs">一致通过数</span>
                  <span className="font-mono font-bold text-[var(--ty-green-color)] text-ty-xs mt-0.5 block">
                    {selectedBatch.consistentCount} 个
                  </span>
                </div>
                <div>
                  <span className="text-[var(--ty-font-sub-color)] block text-ty-2xs">发现差异数</span>
                  <span className="font-mono font-bold text-[var(--ty-red-color)] text-ty-xs mt-0.5 block">
                    {selectedBatch.differenceCount} 个
                  </span>
                </div>
                <div>
                  <span className="text-[var(--ty-font-sub-color)] block text-ty-2xs">待复查 / 检查未完成</span>
                  <span className="font-mono font-bold text-[var(--ty-orange-color)] text-ty-xs mt-0.5 block">
                    {selectedBatch.pendingRecheckCount} / {selectedBatch.incompleteCount}
                  </span>
                </div>
              </div>

              {/* 冻结清单折叠展示 */}
              <div className="p-3 rounded-ty-sm bg-[var(--ty-fill-weak-dark-color)] border border-[var(--ty-border-color)] text-ty-2xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[var(--ty-font-main-color)]">
                    本次核验冻结 ID 清单 (共 {selectedBatch.frozenObjectIds.length} 个对象)：
                  </span>
                  {selectedBatch.frozenObjectIds.length > 10 && (
                    <button
                      type="button"
                      onClick={() => setIsFrozenIdsExpanded(!isFrozenIdsExpanded)}
                      className="text-[var(--ty-primary-color)] hover:underline cursor-pointer"
                    >
                      {isFrozenIdsExpanded ? '收起部分' : `展开全部 (${selectedBatch.frozenObjectIds.length} 个)`}
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1 font-mono">
                  {(isFrozenIdsExpanded
                    ? selectedBatch.frozenObjectIds
                    : selectedBatch.frozenObjectIds.slice(0, 10)
                  ).map(id => (
                    <span key={id} className="px-1.5 py-0.5 bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] text-[var(--ty-font-main-color)] rounded-ty-xs">
                      {id}
                    </span>
                  ))}
                  {!isFrozenIdsExpanded && selectedBatch.frozenObjectIds.length > 10 && (
                    <span className="px-1.5 py-0.5 text-[var(--ty-font-sub-color)]">
                      ... 等共 {selectedBatch.frozenObjectIds.length} 个
                    </span>
                  )}
                </div>
              </div>

              {/* 对象核验明细列表 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-[var(--ty-font-main-color)] text-ty-xs flex items-center space-x-1.5">
                    <span>对象核验比对明细</span>
                    <span className="text-ty-2xs text-[var(--ty-font-sub-color)] font-normal">
                      (共 {selectedBatch.objectResults.length} 条记录)
                    </span>
                  </h4>
                  <span className="text-ty-2xs text-[var(--ty-font-sub-color)]">
                    点击“查看对比”展开字段逐项比对详情
                  </span>
                </div>

                <div className="border border-[var(--ty-border-color)] rounded-ty-sm overflow-hidden">
                  <table className="w-full text-left border-collapse text-ty-xs">
                    <thead>
                      <tr className="border-b border-[var(--ty-border-color)] bg-[var(--ty-fill-weak-dark-color)] text-[var(--ty-font-sub-color)] font-semibold text-ty-2xs">
                        <th className="py-2.5 px-3">对象 ID</th>
                        <th className="py-2.5 px-3">物料名称</th>
                        <th className="py-2.5 px-3">选样依据</th>
                        <th className="py-2.5 px-3">核验状态判定</th>
                        <th className="py-2.5 px-3">差异/情况说明</th>
                        <th className="py-2.5 px-3 text-center">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--ty-border-color)]">
                      {selectedBatch.objectResults.map(obj => (
                        <tr key={obj.objectId} className="hover:bg-[var(--ty-fill-weak-dark-color)] transition-colors">
                          <td className="py-3 px-3 font-mono font-bold text-[var(--ty-font-main-color)]">
                            {obj.objectId}
                          </td>
                          <td className="py-3 px-3 font-medium text-[var(--ty-font-main-color)] max-w-xs truncate">
                            {obj.objectName}
                          </td>
                          <td className="py-3 px-3 text-ty-2xs">
                            {obj.selectedReason === 'HIGH_FREQUENCY' && (
                              <span className="px-1.5 py-0.5 rounded-ty-xs bg-[var(--ty-primary-lightest-color)] text-[var(--ty-primary-color)] border border-[var(--ty-primary-color)]/30 font-medium">
                                高频修改 {obj.modifyCount ? `(${obj.modifyCount}次)` : ''}
                              </span>
                            )}
                            {obj.selectedReason === 'RANDOM_SAMPLE' && (
                              <span className="px-1.5 py-0.5 rounded-ty-xs bg-[var(--ty-fill-weak-dark-color)] text-[var(--ty-font-sub-color)] border border-[var(--ty-border-color)] font-medium">
                                随机样本
                              </span>
                            )}
                            {obj.selectedReason === 'MANUAL_SPECIFIED' && (
                              <span className="px-1.5 py-0.5 rounded-ty-xs bg-[var(--ty-orange-lightest-color)] text-[var(--ty-orange-color)] border border-[var(--ty-orange-color)]/30 font-medium">
                                手动指定
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            {obj.status === 'CONSISTENT' && (
                              <span className="inline-flex items-center text-[var(--ty-green-color)] font-bold text-ty-2xs">
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1 shrink-0" />
                                一致 (通过)
                              </span>
                            )}
                            {obj.status === 'DIFFERENCE_FOUND' && (
                              <span className="inline-flex items-center text-[var(--ty-red-color)] font-bold text-ty-2xs">
                                <XCircle className="w-3.5 h-3.5 mr-1 shrink-0" />
                                {obj.isTargetMissing ? '发现差异: 目标缺失' : '发现字段差异'}
                              </span>
                            )}
                            {obj.status === 'PENDING_RECHECK' && (
                              <span className="inline-flex items-center text-[var(--ty-orange-color)] font-bold text-ty-2xs">
                                <Clock className="w-3.5 h-3.5 mr-1 shrink-0" />
                                待复查 (延迟期)
                              </span>
                            )}
                            {obj.status === 'INCOMPLETE' && (
                              <span className="inline-flex items-center text-[var(--ty-font-sub-color)] font-bold text-ty-2xs">
                                <AlertCircle className="w-3.5 h-3.5 mr-1 shrink-0" />
                                检查未完成
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-ty-2xs text-[var(--ty-font-main-light-color)] max-w-sm">
                            {obj.statusDetail}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => setSelectedObjectForCompare(obj)}
                              className="px-2 py-1 rounded-ty-sm bg-[var(--ty-fill-white-color)] hover:bg-[var(--ty-primary-lightest-color)] text-[var(--ty-primary-color)] border border-[var(--ty-primary-color)]/30 text-ty-2xs font-semibold transition-colors cursor-pointer"
                            >
                              查看对比
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* 抽屉底部 */}
            <div className="px-6 py-3 border-t border-[var(--ty-border-color)] bg-[var(--ty-fill-weak-dark-color)] flex items-center justify-between text-ty-xs">
              <span className="text-ty-2xs text-[var(--ty-font-sub-color)]">
                核验结果仅供数据质量评审与人工核实，不自动执行物理修改或数据删除
              </span>
              <button
                type="button"
                onClick={() => setSelectedBatch(null)}
                className="px-4 py-1.5 border border-[var(--ty-border-color)] rounded-ty-sm bg-[var(--ty-fill-white-color)] text-[var(--ty-font-main-color)] text-ty-xs font-semibold cursor-pointer"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 弹窗 3: 单个对象字段对比详情弹窗 */}
      {selectedObjectForCompare && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ty-overlay backdrop-blur-xs" id="field-compare-modal-overlay">
          <div className="bg-[var(--ty-fill-white-color)] rounded-ty-lg shadow-ty-lg border border-[var(--ty-border-color)] max-w-2xl w-full p-5 space-y-4 animate-in zoom-in-95 duration-150">
            {/* 头部 */}
            <div className="flex items-start justify-between border-b border-[var(--ty-border-color)] pb-3">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-ty-sm font-bold text-[var(--ty-font-main-color)] font-mono">
                    {selectedObjectForCompare.objectId}
                  </h3>
                  <span className="text-ty-xs font-semibold text-[var(--ty-font-main-color)]">
                    {selectedObjectForCompare.objectName}
                  </span>
                  {selectedObjectForCompare.status === 'CONSISTENT' && (
                    <span className="px-2 py-0.5 rounded-ty-xs bg-[var(--ty-green-lightest-color)] text-[var(--ty-green-color)] text-ty-2xs font-bold">
                      一致
                    </span>
                  )}
                  {selectedObjectForCompare.status === 'DIFFERENCE_FOUND' && (
                    <span className="px-2 py-0.5 rounded-ty-xs bg-[var(--ty-red-lightest-color)] text-[var(--ty-red-color)] text-ty-2xs font-bold">
                      {selectedObjectForCompare.isTargetMissing ? '疑似目标缺失' : '存在字段差异'}
                    </span>
                  )}
                  {selectedObjectForCompare.status === 'PENDING_RECHECK' && (
                    <span className="px-2 py-0.5 rounded-ty-xs bg-[var(--ty-orange-lightest-color)] text-[var(--ty-orange-color)] text-ty-2xs font-bold">
                      待复查
                    </span>
                  )}
                  {selectedObjectForCompare.status === 'INCOMPLETE' && (
                    <span className="px-2 py-0.5 rounded-ty-xs bg-[var(--ty-fill-weak-dark-color)] text-[var(--ty-font-sub-color)] text-ty-2xs font-bold">
                      检查未完成
                    </span>
                  )}
                </div>
                <p className="text-ty-2xs text-[var(--ty-font-sub-color)] mt-1">
                  选中原因: {selectedObjectForCompare.selectedReason === 'HIGH_FREQUENCY' ? `高频修改 (${selectedObjectForCompare.modifyCount}次)` : selectedObjectForCompare.selectedReason === 'RANDOM_SAMPLE' ? '随机抽样' : '手动指定'}
                  {selectedObjectForCompare.lastModifiedAt && ` · 最后修改: ${selectedObjectForCompare.lastModifiedAt}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedObjectForCompare(null)}
                className="p-1 rounded-ty-sm text-[var(--ty-font-sub-color)] hover:text-[var(--ty-font-main-color)] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 判定说明 */}
            <div className={`p-2.5 rounded-ty-sm text-ty-2xs border ${
              selectedObjectForCompare.status === 'CONSISTENT'
                ? 'bg-[var(--ty-green-lightest-color)] text-[var(--ty-font-main-light-color)] border-[var(--ty-green-color)]/30'
                : selectedObjectForCompare.status === 'DIFFERENCE_FOUND'
                ? 'bg-[var(--ty-red-lightest-color)] text-[var(--ty-font-main-light-color)] border-[var(--ty-red-color)]/30'
                : selectedObjectForCompare.status === 'PENDING_RECHECK'
                ? 'bg-[var(--ty-orange-lightest-color)] text-[var(--ty-font-main-light-color)] border-[var(--ty-orange-color)]/30'
                : 'bg-[var(--ty-fill-weak-dark-color)] text-[var(--ty-font-sub-color)] border-[var(--ty-border-color)]'
            }`}>
              <strong>判定说明：</strong>{selectedObjectForCompare.statusDetail}
            </div>

            {/* 逐字段比对表格 */}
            <div className="border border-[var(--ty-border-color)] rounded-ty-sm overflow-hidden">
              <table className="w-full text-left border-collapse text-ty-xs">
                <thead>
                  <tr className="border-b border-[var(--ty-border-color)] bg-[var(--ty-fill-weak-dark-color)] text-[var(--ty-font-sub-color)] font-semibold text-ty-2xs">
                    <th className="py-2 px-3">核验字段名称</th>
                    <th className="py-2 px-3">PLM 源端原始值</th>
                    <th className="py-2 px-3">映射后目标预期值</th>
                    <th className="py-2 px-3">Manticore 实际存储值</th>
                    <th className="py-2 px-3 text-center">比较判定</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--ty-border-color)] text-ty-2xs">
                  {selectedObjectForCompare.fields.map(f => (
                    <tr key={f.fieldCode} className="hover:bg-[var(--ty-fill-weak-dark-color)]">
                      <td className="py-2.5 px-3 font-semibold text-[var(--ty-font-main-color)]">
                        {f.fieldName}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[var(--ty-font-main-color)]">
                        {f.plmRawValue ?? <span className="text-[var(--ty-font-placeholder-color)] italic">(读取失败/无)</span>}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[var(--ty-font-main-color)]">
                        {f.mappedExpectedValue ?? <span className="text-[var(--ty-font-placeholder-color)] italic">-</span>}
                      </td>
                      <td className="py-2.5 px-3 font-mono">
                        {f.manticoreActualValue ? (
                          <span className="text-[var(--ty-font-main-color)]">{f.manticoreActualValue}</span>
                        ) : (
                          <span className="text-[var(--ty-red-color)] font-bold italic">未检索到记录</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {f.matchStatus === 'MATCH' && (
                          <span className="px-1.5 py-0.5 rounded-ty-xs bg-[var(--ty-green-lightest-color)] text-[var(--ty-green-color)] font-bold">
                            一致
                          </span>
                        )}
                        {f.matchStatus === 'MISMATCH' && (
                          <span className="px-1.5 py-0.5 rounded-ty-xs bg-[var(--ty-red-lightest-color)] text-[var(--ty-red-color)] font-bold">
                            不匹配
                          </span>
                        )}
                        {f.matchStatus === 'TARGET_MISSING' && (
                          <span className="px-1.5 py-0.5 rounded-ty-xs bg-[var(--ty-red-lightest-color)] text-[var(--ty-red-color)] font-bold">
                            目标缺失
                          </span>
                        )}
                        {f.matchStatus === 'UNVERIFIABLE' && (
                          <span className="px-1.5 py-0.5 rounded-ty-xs bg-[var(--ty-orange-lightest-color)] text-[var(--ty-orange-color)] font-bold">
                            不可比对
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 底部 */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-ty-2xs text-[var(--ty-font-sub-color)]">
                比较原则：根据有效映射转换规则计算目标预期值后比较，不直接使用源端编码比对
              </span>
              <button
                type="button"
                onClick={() => setSelectedObjectForCompare(null)}
                className="px-4 py-1.5 border border-[var(--ty-border-color)] rounded-ty-sm bg-[var(--ty-fill-white-color)] text-[var(--ty-font-main-color)] text-ty-xs font-semibold cursor-pointer"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
