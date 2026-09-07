import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  Sliders,
  Database,
  ArrowRight,
  Info,
  Eye,
  X,
  Play,
  Check,
  AlertCircle,
  FileSearch,
  ShieldCheck,
  ShieldAlert,
  Layers,
  HelpCircle,
  Sparkles,
  Search
} from 'lucide-react';
import {
  ConsistencyCheckPlan,
  ConsistencyBatchRecord,
  ConsistencyObjectResult,
  ConsistencyStrategyType,
  FocusCriteriaType,
  ConsistencyItemStatus
} from '../types/consistencyCheck';
import {
  initialConsistencyPlan,
  initialConsistencyBatches,
  pendingConfirmations,
  coverageBoundaries,
  demoObjectResults
} from '../data/consistencyCheckData';

interface DataConsistencyCheckViewProps {
  onNavigateToSyncQuality?: () => void;
}

export const DataConsistencyCheckView: React.FC<DataConsistencyCheckViewProps> = ({
  onNavigateToSyncQuality
}) => {
  // 1. 当前检查计划 (保存在本地演示状态，明确提示仅本地演示)
  const [plan, setPlan] = useState<ConsistencyCheckPlan>(initialConsistencyPlan);
  const [batches, setBatches] = useState<ConsistencyBatchRecord[]>(initialConsistencyBatches);

  // 2. 交互状态
  const [activeTab, setActiveTab] = useState<'BY_PLAN' | 'CUSTOM_ID'>('BY_PLAN');
  const [customIdsInput, setCustomIdsInput] = useState<string>('P-30001, P-30002, P-30003, P-30004, P-30005, P-30001');
  const [isRunning, setIsRunning] = useState(false);
  const [runningStepText, setRunningStepText] = useState<string>('');
  
  // 3. 抽屉与弹窗控制
  const [isPlanDrawerOpen, setIsPlanDrawerOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<ConsistencyBatchRecord | null>(null);
  const [selectedObjectForCompare, setSelectedObjectForCompare] = useState<ConsistencyObjectResult | null>(null);
  
  // 4. Toast / 通知
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'warning' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'warning' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // 5. 计划编辑抽屉的临时表单状态
  const [draftPlan, setDraftPlan] = useState<ConsistencyCheckPlan>(plan);

  const handleOpenPlanDrawer = () => {
    setDraftPlan({ ...plan });
    setIsPlanDrawerOpen(true);
  };

  const handleSavePlan = () => {
    setPlan({
      ...draftPlan,
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
    });
    setIsPlanDrawerOpen(false);
    showToast('检查计划已更新 (仅保存在当前本地演示环境，未接入后台定时任务)', 'success');
  };

  // 6. 手动临时指定 ID 解析与去重计算
  const parsedCustomIds = useMemo(() => {
    const rawList = customIdsInput
      .split(/[\n,;\s]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
    const uniqueSet = Array.from(new Set(rawList));
    const duplicatesCount = rawList.length - uniqueSet.length;
    return {
      rawCount: rawList.length,
      uniqueIds: uniqueSet,
      duplicatesCount,
      isExceeded: uniqueSet.length > 50
    };
  }, [customIdsInput]);

  // 7. 执行核验逻辑 (模拟过程，可解释、不伪造)
  const handleRunCheck = (isCustom: boolean) => {
    if (isCustom && parsedCustomIds.isExceeded) {
      showToast('单次指定对象数量不能超过 50 个上限，请缩减后重试', 'warning');
      return;
    }
    if (isCustom && parsedCustomIds.uniqueIds.length === 0) {
      showToast('请输入至少一个有效的对象唯一标识', 'warning');
      return;
    }

    setIsRunning(true);
    setRunningStepText('步骤 1/4: 从 PLM 源端查询候选唯一标识并按策略冻结名单...');

    setTimeout(() => {
      setRunningStepText('步骤 2/4: 按唯一标识分别批量读取 PLM 当前值与 Manticore 实际数据...');
    }, 400);

    setTimeout(() => {
      setRunningStepText('步骤 3/4: 执行一阶段字段映射规则转换与比对分析...');
    }, 800);

    setTimeout(() => {
      setRunningStepText('步骤 4/4: 排除合理延迟窗口，生成核验结果记录...');
      
      const now = new Date();
      const nowStr = now.toISOString().replace('T', ' ').substring(0, 19);
      const batchId = `CC-${now.toISOString().substring(0, 10).replace(/-/g, '')}-${String(batches.length + 1).padStart(3, '0')}`;
      
      let newBatch: ConsistencyBatchRecord;

      if (isCustom) {
        // 临时指定模式
        const customObjResults: ConsistencyObjectResult[] = parsedCustomIds.uniqueIds.slice(0, 5).map((id, index) => {
          const matchDemo = demoObjectResults.find(d => d.objectId === id);
          if (matchDemo) {
            return { ...matchDemo, selectedReason: 'MANUAL_SPECIFIED' };
          }
          return {
            ...demoObjectResults[index % demoObjectResults.length],
            objectId: id,
            selectedReason: 'MANUAL_SPECIFIED'
          };
        });

        newBatch = {
          id: batchId,
          planName: '手动临时指定核验',
          triggerType: 'MANUAL_CUSTOM',
          rootTypeCode: plan.rootTypeCode,
          rootTypeName: plan.rootTypeName,
          scopeDescription: `定向指定 ${parsedCustomIds.uniqueIds.length} 个对象 ID`,
          strategySummary: `手动临时指定 (去重后共 ${parsedCustomIds.uniqueIds.length} 个，不参与随机抽查)`,
          executedAt: nowStr,
          plmReadTime: `${nowStr} (耗时 0.8s)`,
          manticoreReadTime: `${nowStr} (耗时 0.4s)`,
          benchmarkSource: 'PLM 源端实时主记录',
          plannedCount: parsedCustomIds.uniqueIds.length,
          actualCount: parsedCustomIds.uniqueIds.length,
          focusCount: 0,
          randomCount: 0,
          manualCount: parsedCustomIds.uniqueIds.length,
          deduplicatedCount: parsedCustomIds.duplicatesCount,
          quotaSupplementInfo: `本次为纯手动定向指定，输入去重前 ${parsedCustomIds.rawCount} 项，去除重复项 ${parsedCustomIds.duplicatesCount} 个`,
          consistentCount: customObjResults.filter(o => o.status === 'CONSISTENT').length,
          differenceCount: customObjResults.filter(o => o.status === 'DIFFERENCE_FOUND').length,
          pendingRecheckCount: customObjResults.filter(o => o.status === 'PENDING_RECHECK').length,
          incompleteCount: customObjResults.filter(o => o.status === 'INCOMPLETE').length,
          frozenObjectIds: parsedCustomIds.uniqueIds,
          objectResults: customObjResults,
          status: 'COMPLETED'
        };
      } else {
        // 按计划执行模式
        newBatch = {
          id: batchId,
          planId: plan.id,
          planName: plan.name,
          triggerType: 'MANUAL_BY_PLAN',
          rootTypeCode: plan.rootTypeCode,
          rootTypeName: plan.rootTypeName,
          scopeDescription: `最近 ${plan.timeWindowDays} 天有变更的合格 ${plan.rootTypeName} 对象`,
          strategySummary: `${plan.strategy === 'FOCUS_AND_RANDOM' ? '重点＋随机' : plan.strategy === 'RANDOM_SAMPLE' ? '随机抽查' : '指定范围全部核验'} (高频前 ${plan.focusQuota} + 随机 ${plan.randomQuota})`,
          executedAt: nowStr,
          plmReadTime: `${nowStr} (耗时 2.0s)`,
          manticoreReadTime: `${nowStr} (耗时 1.0s)`,
          benchmarkSource: 'PLM 源端实时主记录 (只读镜像)',
          plannedCount: plan.maxSampleLimit,
          actualCount: plan.maxSampleLimit - 2,
          focusCount: plan.focusQuota,
          randomCount: plan.randomQuota - 2,
          manualCount: 0,
          deduplicatedCount: 2,
          quotaSupplementInfo: `高频修改筛选 ${plan.focusQuota} 个；合格随机样本提取 ${plan.randomQuota} 个，去重剔除 2 个重叠对象，实际样本 ${plan.maxSampleLimit - 2} 个`,
          consistentCount: 194,
          differenceCount: 2,
          pendingRecheckCount: 1,
          incompleteCount: 1,
          frozenObjectIds: ['P-30001', 'P-30002', 'P-30003', 'P-30004', 'P-30005'],
          objectResults: demoObjectResults,
          status: 'COMPLETED'
        };
      }

      setBatches([newBatch, ...batches]);
      setIsRunning(false);
      setSelectedBatch(newBatch);
      showToast(`核验完成，批次号：${newBatch.id}，已冻结 ${newBatch.actualCount} 个核验对象`, 'success');
    }, 1200);
  };

  // 最近一次批次摘要
  const latestBatch = batches[0];

  return (
    <div className="space-y-5" id="data-consistency-check-container">
      {/* Toast 提示框 */}
      {toastMessage && (
        <div className="fixed top-4 right-6 z-50 animate-in fade-in slide-in-from-top-3 duration-200">
          <div className={`px-4 py-2.5 rounded-ty-sm shadow-ty-lg border flex items-center space-x-2 text-ty-xs font-medium ${
            toastMessage.type === 'success'
              ? 'bg-[var(--ty-green-lightest-color)] text-[var(--ty-font-main-light-color)] border-[var(--ty-green-color)]/30'
              : toastMessage.type === 'warning'
              ? 'bg-[var(--ty-orange-lightest-color)] text-[var(--ty-font-main-light-color)] border-[var(--ty-orange-color)]/30'
              : 'bg-[var(--ty-fill-white-color)] text-[var(--ty-font-main-color)] border-[var(--ty-border-color)]'
          }`}>
            {toastMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-[var(--ty-green-color)]" />}
            {toastMessage.type === 'warning' && <AlertTriangle className="w-4 h-4 text-[var(--ty-orange-color)]" />}
            {toastMessage.type === 'info' && <Info className="w-4 h-4 text-[var(--ty-primary-color)]" />}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* 1. 顶部明确提示横幅与边界声明 */}
      <div className="bg-[var(--ty-primary-lightest-color)] border border-[var(--ty-primary-color)]/30 rounded-ty-lg p-4 space-y-2 shadow-ty-sm" id="consistency-boundary-banner">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 rounded-ty-sm bg-[var(--ty-primary-color)] text-[var(--ty-font-white-color)] flex items-center justify-center shrink-0 mt-0.5">
              <FileSearch className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h2 className="text-ty-sm font-bold text-[var(--ty-font-main-color)]">
                  PLM — Manticore 数据一致性核验
                </h2>
                <span className="px-2 py-0.5 rounded-ty-xs bg-[var(--ty-primary-color)] text-[var(--ty-font-white-color)] text-ty-2xs font-semibold tracking-wider">
                  候选原型 / 本地模拟 / 待接入
                </span>
                <span className="px-1.5 py-0.5 rounded-ty-xs bg-[var(--ty-fill-white-color)] text-[var(--ty-font-sub-color)] border border-[var(--ty-border-color)] text-ty-2xs font-mono">
                  链路: PLM 源端 → Manticore 实际存储
                </span>
              </div>
              <p className="text-ty-xs text-[var(--ty-font-main-light-color)] mt-1 leading-relaxed">
                <strong className="text-[var(--ty-primary-color)]">核心定位：</strong>
                本页核验 PLM 源端与 Manticore 实际数据是否一致，与“中间表 → Manticore 主表”的同步任务、失败记录及重试分开。
                核验名单直接源自 PLM 业务范围，用于主动发现属性字段差异、源端存在但目标缺失等静默不同步问题。
              </p>
            </div>
          </div>
          {onNavigateToSyncQuality && (
            <button
              onClick={onNavigateToSyncQuality}
              className="px-3 py-1.5 rounded-ty-sm bg-[var(--ty-fill-white-color)] hover:bg-[var(--ty-fill-weak-dark-color)] text-[var(--ty-font-sub-color)] hover:text-[var(--ty-font-main-color)] border border-[var(--ty-border-color)] text-ty-xs font-medium flex items-center space-x-1.5 shrink-0 transition-colors cursor-pointer"
              title="跳转至中间表同步任务记录"
            >
              <Database className="w-3.5 h-3.5 text-[var(--ty-primary-color)]" />
              <span>查看中间表同步记录</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* 2. 检查计划摘要 + 立即核验操作区 (Grid 双列布局) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* 左侧：已保存检查计划摘要卡片 (7 Cols) */}
        <div className="lg:col-span-7 bg-[var(--ty-fill-white-color)] rounded-ty-lg border border-[var(--ty-border-color)] p-5 space-y-4 shadow-ty-xs flex flex-col justify-between" id="consistency-plan-summary-card">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--ty-border-color)] pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-4 bg-[var(--ty-primary-color)] rounded-ty-2xs"></div>
                <h3 className="text-ty-sm font-bold text-[var(--ty-font-main-color)]">
                  检查计划摘要：{plan.name}
                </h3>
                <span className="px-2 py-0.5 rounded-ty-xs bg-[var(--ty-orange-lightest-color)] text-[var(--ty-font-main-light-color)] border border-[var(--ty-orange-color)]/30 text-ty-2xs font-medium">
                  演示参数 / 待确认
                </span>
                {plan.enabled ? (
                  <span className="px-2 py-0.5 rounded-ty-xs bg-[var(--ty-green-lightest-color)] text-[var(--ty-font-main-light-color)] border border-[var(--ty-green-color)]/30 text-ty-2xs font-semibold flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--ty-green-color)]"></span>
                    <span>运行中</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-ty-xs bg-[var(--ty-fill-weak-dark-color)] text-[var(--ty-font-sub-color)] text-ty-2xs font-medium">
                    已暂停
                  </span>
                )}
              </div>
              <button
                onClick={handleOpenPlanDrawer}
                className="px-3 py-1.5 bg-[var(--ty-fill-white-color)] hover:bg-[var(--ty-primary-lightest-color)] text-[var(--ty-primary-color)] border border-[var(--ty-primary-color)]/30 rounded-ty-sm text-ty-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
                id="btn-edit-plan"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>配置计划</span>
              </button>
            </div>

            {/* 参数矩阵 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[var(--ty-fill-weak-dark-color)] p-3.5 rounded-ty-sm border border-[var(--ty-border-color)] text-ty-xs">
              <div>
                <span className="text-[var(--ty-font-sub-color)] block">对象根类型</span>
                <span className="font-bold text-[var(--ty-font-main-color)] mt-0.5 block">{plan.rootTypeName}</span>
              </div>
              <div>
                <span className="text-[var(--ty-font-sub-color)] block">执行频率/时间</span>
                <span className="font-bold text-[var(--ty-font-main-color)] mt-0.5 block">{plan.frequencyLabel} {plan.scheduledTime}</span>
              </div>
              <div>
                <span className="text-[var(--ty-font-sub-color)] block">统计时间窗口</span>
                <span className="font-bold text-[var(--ty-font-main-color)] mt-0.5 block">最近 {plan.timeWindowDays} 天有变更</span>
              </div>
              <div>
                <span className="text-[var(--ty-font-sub-color)] block">单次样本上限</span>
                <span className="font-bold text-[var(--ty-primary-color)] font-mono mt-0.5 block">{plan.maxSampleLimit} 个</span>
              </div>
            </div>

            {/* 策略与配额说明 */}
            <div className="space-y-1.5 text-ty-xs">
              <div className="flex items-center space-x-1.5 font-medium text-[var(--ty-font-main-color)]">
                <span className="text-[var(--ty-font-sub-color)]">选数策略：</span>
                <span className="px-2 py-0.5 rounded-ty-xs bg-[var(--ty-primary-lightest-color)] text-[var(--ty-primary-color)] border border-[var(--ty-primary-color)]/30 font-semibold">
                  重点＋随机组合策略
                </span>
                <span className="text-ty-2xs text-[var(--ty-font-sub-color)]">
                  (高频修改前 {plan.focusQuota} 个 ＋ 其余合格对象随机 {plan.randomQuota} 个)
                </span>
              </div>

              <div className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-2.5 text-ty-2xs text-[var(--ty-font-sub-color)] space-y-1">
                <div className="flex items-center space-x-1 text-[var(--ty-font-main-light-color)] font-medium">
                  <Info className="w-3 h-3 text-[var(--ty-primary-color)] shrink-0" />
                  <span>内置选数与配额规则说明：</span>
                </div>
                <p>
                  1. 先按有效修改频次降序选出重点样本前 100 个，再从其余合格对象中随机选样 100 个。<br />
                  2. 系统在提取后<strong>内置唯一 ID 去重</strong>，确保最终核验样本总数严格不超过 200 个。<br />
                  3. 若高频对象不足 100 个，系统自动从其余合格对象中补足；总体合格对象不足时按实际可用数量核验。
                </p>
              </div>

              {/* 字段集合 */}
              <div className="pt-1">
                <span className="text-[var(--ty-font-sub-color)] text-ty-2xs block mb-1">本次核验字段集合 (4项)：</span>
                <div className="flex flex-wrap gap-1.5">
                  {plan.targetFields.map(f => (
                    <span
                      key={f.fieldCode}
                      className="px-2 py-0.5 rounded-ty-xs bg-[var(--ty-fill-weak-dark-color)] text-[var(--ty-font-main-light-color)] border border-[var(--ty-border-color)] text-ty-2xs font-mono"
                      title={f.description}
                    >
                      {f.fieldName} ({f.fieldCode})
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[var(--ty-border-color)] flex items-center justify-between text-ty-2xs text-[var(--ty-font-sub-color)]">
            <span>最后更新时间：{plan.updatedAt}</span>
            <span className="text-[var(--ty-font-sub-color)]">提示：本地演示状态，不创建真实后台 Cron 任务</span>
          </div>
        </div>

        {/* 右侧：“立即核验”触发操作区 (5 Cols) */}
        <div className="lg:col-span-5 bg-[var(--ty-fill-white-color)] rounded-ty-lg border border-[var(--ty-border-color)] p-5 space-y-4 shadow-ty-xs flex flex-col justify-between" id="consistency-run-trigger-card">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--ty-border-color)] pb-3">
              <div className="flex items-center space-x-2">
                <Play className="w-4 h-4 text-[var(--ty-green-color)]" />
                <h3 className="text-ty-sm font-bold text-[var(--ty-font-main-color)]">
                  执行数据核验 (主动抽样)
                </h3>
              </div>
              <span className="text-ty-2xs text-[var(--ty-font-sub-color)]">自动抽查 ≠ 自动修复</span>
            </div>

            {/* 触发方式选项卡 */}
            <div className="flex rounded-ty-sm bg-[var(--ty-fill-weak-dark-color)] p-1 border border-[var(--ty-border-color)] text-ty-xs">
              <button
                type="button"
                onClick={() => setActiveTab('BY_PLAN')}
                className={`flex-1 py-1.5 rounded-ty-xs font-semibold text-center transition-colors cursor-pointer ${
                  activeTab === 'BY_PLAN'
                    ? 'bg-[var(--ty-fill-white-color)] text-[var(--ty-primary-color)] shadow-ty-xs'
                    : 'text-[var(--ty-font-sub-color)] hover:text-[var(--ty-font-main-color)]'
                }`}
              >
                方式一：按已保存计划执行
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('CUSTOM_ID')}
                className={`flex-1 py-1.5 rounded-ty-xs font-semibold text-center transition-colors cursor-pointer ${
                  activeTab === 'CUSTOM_ID'
                    ? 'bg-[var(--ty-fill-white-color)] text-[var(--ty-primary-color)] shadow-ty-xs'
                    : 'text-[var(--ty-font-sub-color)] hover:text-[var(--ty-font-main-color)]'
                }`}
              >
                方式二：临时指定对象 ID
              </button>
            </div>

            {/* 选项卡一：按计划执行 */}
            {activeTab === 'BY_PLAN' && (
              <div className="space-y-3 text-ty-xs">
                <div className="p-3 rounded-ty-sm bg-[var(--ty-fill-weak-dark-color)] border border-[var(--ty-border-color)] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[var(--ty-font-main-color)]">计划名称：{plan.name}</span>
                    <span className="text-ty-2xs text-[var(--ty-primary-color)] font-mono">上限 200 样本</span>
                  </div>
                  <p className="text-ty-2xs text-[var(--ty-font-sub-color)] leading-relaxed">
                    复用当前保存的抽样策略，即时从 PLM 抽取高频与随机样本，生成全新冻结核验批次，并在列表与详情中呈现比对结果。
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleRunCheck(false)}
                  disabled={isRunning}
                  className={`w-full py-2.5 rounded-ty-sm text-ty-xs font-bold flex items-center justify-center space-x-2 transition-colors cursor-pointer ${
                    isRunning
                      ? 'bg-[var(--ty-border-color)] text-[var(--ty-font-sub-color)] cursor-not-allowed'
                      : 'bg-[var(--ty-primary-color)] hover:bg-[var(--ty-primary-hover-color)] text-[var(--ty-font-white-color)] shadow-ty-xs'
                  }`}
                  id="btn-run-by-plan"
                >
                  {isRunning ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>正在执行模拟核验...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>按当前计划立即模拟执行一次</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* 选项卡二：临时指定对象 ID */}
            {activeTab === 'CUSTOM_ID' && (
              <div className="space-y-3 text-ty-xs">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-ty-2xs font-semibold text-[var(--ty-font-main-color)]">
                      输入对象唯一标识列表 (支持换行/逗号分隔)：
                    </label>
                    <span className="text-ty-2xs text-[var(--ty-font-sub-color)] font-mono">
                      去重后: {parsedCustomIds.uniqueIds.length} / 上限 50
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    value={customIdsInput}
                    onChange={(e) => setCustomIdsInput(e.target.value)}
                    placeholder="例如: P-30001, P-30002, P-30003"
                    className="w-full px-3 py-2 text-ty-xs font-mono bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm focus:outline-hidden focus:border-[var(--ty-primary-color)] transition-colors"
                  />
                  {parsedCustomIds.duplicatesCount > 0 && (
                    <div className="mt-1 text-ty-2xs text-[var(--ty-orange-color)] flex items-center space-x-1">
                      <AlertTriangle className="w-3 h-3" />
                      <span>输入中检测到 {parsedCustomIds.duplicatesCount} 个重复 ID，系统已自动完成去重处理。</span>
                    </div>
                  )}
                  {parsedCustomIds.isExceeded && (
                    <div className="mt-1 text-ty-2xs text-[var(--ty-red-color)] flex items-center space-x-1 font-semibold">
                      <XCircle className="w-3 h-3" />
                      <span>超出单次手动指定 50 个上限，当前输入 {parsedCustomIds.uniqueIds.length} 个，无法执行。</span>
                    </div>
                  )}
                </div>

                <div className="bg-[var(--ty-fill-weak-dark-color)] p-2 rounded-ty-sm text-ty-2xs text-[var(--ty-font-sub-color)]">
                  提示：临时指定仅对本次核验生效，<strong>不会修改已保存的自动检查计划</strong>，所指定的 ID 不再参与随机抽样。
                </div>

                <button
                  type="button"
                  onClick={() => handleRunCheck(true)}
                  disabled={isRunning || parsedCustomIds.isExceeded || parsedCustomIds.uniqueIds.length === 0}
                  className={`w-full py-2.5 rounded-ty-sm text-ty-xs font-bold flex items-center justify-center space-x-2 transition-colors cursor-pointer ${
                    isRunning || parsedCustomIds.isExceeded || parsedCustomIds.uniqueIds.length === 0
                      ? 'bg-[var(--ty-border-color)] text-[var(--ty-font-sub-color)] cursor-not-allowed'
                      : 'bg-[var(--ty-primary-color)] hover:bg-[var(--ty-primary-hover-color)] text-[var(--ty-font-white-color)] shadow-ty-xs'
                  }`}
                  id="btn-run-custom-id"
                >
                  {isRunning ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>正在定向核验...</span>
                    </>
                  ) : (
                    <>
                      <FileSearch className="w-4 h-4" />
                      <span>对指定 {parsedCustomIds.uniqueIds.length} 个对象执行定向核验</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* 执行中状态浮层 */}
            {isRunning && (
              <div className="p-2.5 rounded-ty-sm bg-[var(--ty-primary-lightest-color)] border border-[var(--ty-primary-color)]/30 text-ty-xs text-[var(--ty-font-main-light-color)] space-y-1 animate-pulse">
                <div className="flex items-center space-x-1.5 font-bold text-[var(--ty-primary-color)]">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>核验执行流程：</span>
                </div>
                <p className="text-ty-2xs font-mono">{runningStepText}</p>
              </div>
            )}
          </div>

          <div className="pt-2 text-ty-2xs text-[var(--ty-font-sub-color)]">
            <span>安全约束：核验操作仅为只读抽检比对，绝不向 PLM 源端或 Manticore 写入变更。</span>
          </div>
        </div>
      </div>

      {/* 3. 取数与判断全链路可解释路径卡片 */}
      <div className="bg-[var(--ty-fill-white-color)] rounded-ty-lg border border-[var(--ty-border-color)] p-4 shadow-ty-xs space-y-3" id="consistency-explanation-flow-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-[var(--ty-primary-color)]" />
            <h4 className="text-ty-xs font-bold text-[var(--ty-font-main-color)]">
              核验取数与比对分析路径 (完整可解释链路)
            </h4>
          </div>
          <span className="text-ty-2xs text-[var(--ty-font-sub-color)]">
            Manticore 查询口径：按对象唯一标识查询目标实际存储字段 (严禁关键词模糊猜测)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 text-ty-2xs">
          <div className="p-2 rounded-ty-sm bg-[var(--ty-fill-weak-dark-color)] border border-[var(--ty-border-color)] space-y-1">
            <span className="font-bold text-[var(--ty-primary-color)] block">1. 源端选数</span>
            <p className="text-[var(--ty-font-sub-color)]">从 PLM 源端查询符合范围的业务对象唯一标识。</p>
          </div>
          <div className="p-2 rounded-ty-sm bg-[var(--ty-fill-weak-dark-color)] border border-[var(--ty-border-color)] space-y-1">
            <span className="font-bold text-[var(--ty-primary-color)] block">2. 策略筛选</span>
            <p className="text-[var(--ty-font-sub-color)]">按高频修改/近期修改/随机样本确定名单。</p>
          </div>
          <div className="p-2 rounded-ty-sm bg-[var(--ty-fill-weak-dark-color)] border border-[var(--ty-border-color)] space-y-1">
            <span className="font-bold text-[var(--ty-primary-color)] block">3. 样本去重冻结</span>
            <p className="text-[var(--ty-font-sub-color)]">去重并固化本次批次的对象唯一 ID 清单。</p>
          </div>
          <div className="p-2 rounded-ty-sm bg-[var(--ty-fill-weak-dark-color)] border border-[var(--ty-border-color)] space-y-1">
            <span className="font-bold text-[var(--ty-primary-color)] block">4. 分别批量读取</span>
            <p className="text-[var(--ty-font-sub-color)]">按相同 ID 分别读取 PLM 当前值与 Manticore 存储值。</p>
          </div>
          <div className="p-2 rounded-ty-sm bg-[var(--ty-fill-weak-dark-color)] border border-[var(--ty-border-color)] space-y-1">
            <span className="font-bold text-[var(--ty-primary-color)] block">5. 规则映射转换</span>
            <p className="text-[var(--ty-font-sub-color)]">根据一阶段字段规则把 PLM 原始值转换为目标预期值。</p>
          </div>
          <div className="p-2 rounded-ty-sm bg-[var(--ty-fill-weak-dark-color)] border border-[var(--ty-border-color)] space-y-1">
            <span className="font-bold text-[var(--ty-primary-color)] block">6. 精准逐字段比对</span>
            <p className="text-[var(--ty-font-sub-color)]">将映射预期值与实际值比较，发现值差异或目标缺失。</p>
          </div>
          <div className="p-2 rounded-ty-sm bg-[var(--ty-fill-weak-dark-color)] border border-[var(--ty-border-color)] space-y-1">
            <span className="font-bold text-[var(--ty-primary-color)] block">7. 排除合理延迟</span>
            <p className="text-[var(--ty-font-sub-color)]">排除仍在编辑期或合理同步窗口延迟，标记待复查。</p>
          </div>
        </div>
      </div>

      {/* 4. 最近一次核验结果摘要大卡片 */}
      {latestBatch && (
        <div className="bg-[var(--ty-fill-white-color)] rounded-ty-lg border border-[var(--ty-border-color)] p-5 space-y-4 shadow-ty-xs" id="consistency-latest-summary-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--ty-border-color)] pb-3">
            <div className="flex items-center space-x-2.5">
              <span className="px-2 py-0.5 rounded-ty-xs bg-[var(--ty-primary-color)] text-[var(--ty-font-white-color)] text-ty-2xs font-bold">
                最近一次核验
              </span>
              <h4 className="text-ty-sm font-bold text-[var(--ty-font-main-color)] font-mono">
                批次号: {latestBatch.id}
              </h4>
              <span className="text-ty-xs text-[var(--ty-font-sub-color)]">
                ({latestBatch.planName} · 执行于 {latestBatch.executedAt})
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setSelectedBatch(latestBatch)}
                className="px-3 py-1 bg-[var(--ty-primary-lightest-color)] hover:bg-[var(--ty-primary-color)] hover:text-[var(--ty-font-white-color)] text-[var(--ty-primary-color)] rounded-ty-sm text-ty-xs font-semibold border border-[var(--ty-primary-color)]/30 transition-colors cursor-pointer"
                id="btn-view-latest-batch-detail"
              >
                查看批次结果详情
              </button>
            </div>
          </div>

          {/* 状态统计 4 大指标卡 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* 1. 一致 */}
            <div className="p-3 rounded-ty-sm bg-[var(--ty-green-lightest-color)] border border-[var(--ty-green-color)]/30 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-ty-xs font-medium text-[var(--ty-font-main-light-color)]">一致 (通过)</span>
                <CheckCircle2 className="w-4 h-4 text-[var(--ty-green-color)]" />
              </div>
              <div className="text-ty-xl font-bold font-mono text-[var(--ty-font-main-color)]">
                {latestBatch.consistentCount}
                <span className="text-ty-2xs font-normal text-[var(--ty-font-sub-color)] ml-1">
                  / {latestBatch.actualCount}
                </span>
              </div>
              <span className="text-ty-2xs text-[var(--ty-font-sub-color)] block">
                映射后与实际值完全吻合
              </span>
            </div>

            {/* 2. 发现差异 */}
            <div className="p-3 rounded-ty-sm bg-[var(--ty-red-lightest-color)] border border-[var(--ty-red-color)]/30 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-ty-xs font-medium text-[var(--ty-font-main-light-color)]">发现差异</span>
                <XCircle className="w-4 h-4 text-[var(--ty-red-color)]" />
              </div>
              <div className="text-ty-xl font-bold font-mono text-[var(--ty-red-color)]">
                {latestBatch.differenceCount}
              </div>
              <span className="text-ty-2xs text-[var(--ty-font-sub-color)] block">
                含字段差异或疑似目标缺失
              </span>
            </div>

            {/* 3. 待复查 */}
            <div className="p-3 rounded-ty-sm bg-[var(--ty-orange-lightest-color)] border border-[var(--ty-orange-color)]/30 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-ty-xs font-medium text-[var(--ty-font-main-light-color)]">待复查 (延迟期)</span>
                <Clock className="w-4 h-4 text-[var(--ty-orange-color)]" />
              </div>
              <div className="text-ty-xl font-bold font-mono text-[var(--ty-font-main-color)]">
                {latestBatch.pendingRecheckCount}
              </div>
              <span className="text-ty-2xs text-[var(--ty-font-sub-color)] block">
                仍在编辑期或处同步延迟窗
              </span>
            </div>

            {/* 4. 检查未完成 */}
            <div className="p-3 rounded-ty-sm bg-[var(--ty-fill-weak-dark-color)] border border-[var(--ty-border-color)] space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-ty-xs font-medium text-[var(--ty-font-main-light-color)]">检查未完成</span>
                <AlertCircle className="w-4 h-4 text-[var(--ty-font-sub-color)]" />
              </div>
              <div className="text-ty-xl font-bold font-mono text-[var(--ty-font-main-color)]">
                {latestBatch.incompleteCount}
              </div>
              <span className="text-ty-2xs text-[var(--ty-font-sub-color)] block">
                读取超时或权限受限 (非错误)
              </span>
            </div>
          </div>

          {/* 样本分布与去重信息 */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-ty-sm bg-[var(--ty-fill-weak-dark-color)] border border-[var(--ty-border-color)] text-ty-xs">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[var(--ty-font-sub-color)]">选数结构：</span>
              <span className="font-semibold text-[var(--ty-font-main-color)]">
                高频修改: <strong className="font-mono text-[var(--ty-primary-color)]">{latestBatch.focusCount}</strong>
              </span>
              <span className="font-semibold text-[var(--ty-font-main-color)]">
                随机样本: <strong className="font-mono text-[var(--ty-primary-color)]">{latestBatch.randomCount}</strong>
              </span>
              <span className="font-semibold text-[var(--ty-font-main-color)]">
                去重剔除: <strong className="font-mono text-[var(--ty-orange-color)]">{latestBatch.deduplicatedCount}</strong>
              </span>
              <span className="font-semibold text-[var(--ty-font-main-color)]">
                实际核验: <strong className="font-mono text-[var(--ty-font-main-color)]">{latestBatch.actualCount}</strong>
              </span>
            </div>
            <div className="text-ty-2xs text-[var(--ty-font-sub-color)]">
              {latestBatch.quotaSupplementInfo}
            </div>
          </div>
        </div>
      )}

      {/* 5. 历史核验记录列表表格 (支持窄屏横向平滑滚动) */}
      <div className="bg-[var(--ty-fill-white-color)] rounded-ty-lg border border-[var(--ty-border-color)] shadow-ty-xs overflow-hidden" id="consistency-batch-table-card">
        <div className="px-5 py-3.5 border-b border-[var(--ty-border-color)] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Database className="w-4 h-4 text-[var(--ty-primary-color)]" />
            <h4 className="text-ty-sm font-bold text-[var(--ty-font-main-color)]">
              核验历史记录列表 ({batches.length} 个批次)
            </h4>
          </div>
          <span className="text-ty-2xs text-[var(--ty-font-sub-color)]">
            单向抽检无法发现目标端已删残留数据 · 抽样无差异不代表全库绝对一致
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-ty-xs min-w-[860px]">
            <thead>
              <tr className="border-b border-[var(--ty-border-color)] bg-[var(--ty-fill-weak-dark-color)] text-[var(--ty-font-sub-color)] font-semibold text-ty-2xs">
                <th className="py-2.5 px-4">批次号</th>
                <th className="py-2.5 px-3">触发方式</th>
                <th className="py-2.5 px-3">对象类型</th>
                <th className="py-2.5 px-3">选数策略摘要</th>
                <th className="py-2.5 px-3 text-center">样本配比 (实际/计划)</th>
                <th className="py-2.5 px-3 text-center">核验结果分布</th>
                <th className="py-2.5 px-3">执行时间</th>
                <th className="py-2.5 px-4 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--ty-border-color)]">
              {batches.map(b => (
                <tr key={b.id} className="hover:bg-[var(--ty-fill-weak-dark-color)] transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-[var(--ty-font-main-color)]">
                    {b.id}
                  </td>
                  <td className="py-3 px-3">
                    {b.triggerType === 'SCHEDULED' && (
                      <span className="px-2 py-0.5 rounded-ty-xs bg-[var(--ty-fill-weak-dark-color)] text-[var(--ty-font-sub-color)] border border-[var(--ty-border-color)] text-ty-2xs">
                        自动定时计划
                      </span>
                    )}
                    {b.triggerType === 'MANUAL_BY_PLAN' && (
                      <span className="px-2 py-0.5 rounded-ty-xs bg-[var(--ty-primary-lightest-color)] text-[var(--ty-primary-color)] border border-[var(--ty-primary-color)]/30 text-ty-2xs font-medium">
                        手动按计划
                      </span>
                    )}
                    {b.triggerType === 'MANUAL_CUSTOM' && (
                      <span className="px-2 py-0.5 rounded-ty-xs bg-[var(--ty-orange-lightest-color)] text-[var(--ty-font-main-light-color)] border border-[var(--ty-orange-color)]/30 text-ty-2xs font-medium">
                        手动临时指定
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-[var(--ty-font-main-color)]">
                    {b.rootTypeName}
                  </td>
                  <td className="py-3 px-3 text-[var(--ty-font-sub-color)] max-w-xs truncate" title={b.strategySummary}>
                    {b.strategySummary}
                  </td>
                  <td className="py-3 px-3 text-center font-mono">
                    <span className="font-bold text-[var(--ty-font-main-color)]">{b.actualCount}</span>
                    <span className="text-[var(--ty-font-sub-color)]"> / {b.plannedCount}</span>
                    {b.deduplicatedCount > 0 && (
                      <span className="ml-1 text-ty-2xs text-[var(--ty-orange-color)]" title={`内置去重剔除 ${b.deduplicatedCount} 个重复 ID`}>
                        (-{b.deduplicatedCount}重)
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <div className="inline-flex items-center gap-1.5 text-ty-2xs">
                      <span className="px-1.5 py-0.5 rounded-ty-xs bg-[var(--ty-green-lightest-color)] text-[var(--ty-green-color)] font-mono font-bold" title="一致数量">
                        {b.consistentCount}
                      </span>
                      <span className="px-1.5 py-0.5 rounded-ty-xs bg-[var(--ty-red-lightest-color)] text-[var(--ty-red-color)] font-mono font-bold" title="差异数量">
                        {b.differenceCount}
                      </span>
                      <span className="px-1.5 py-0.5 rounded-ty-xs bg-[var(--ty-orange-lightest-color)] text-[var(--ty-orange-color)] font-mono font-bold" title="待复查">
                        {b.pendingRecheckCount}
                      </span>
                      <span className="px-1.5 py-0.5 rounded-ty-xs bg-[var(--ty-fill-weak-dark-color)] text-[var(--ty-font-sub-color)] font-mono font-bold" title="未完成">
                        {b.incompleteCount}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3 font-mono text-[var(--ty-font-sub-color)] text-ty-2xs">
                    {b.executedAt}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => setSelectedBatch(b)}
                      className="px-2.5 py-1 rounded-ty-sm bg-[var(--ty-primary-lightest-color)] hover:bg-[var(--ty-primary-color)] hover:text-[var(--ty-font-white-color)] text-[var(--ty-primary-color)] border border-[var(--ty-primary-color)]/30 text-ty-xs font-semibold transition-colors cursor-pointer"
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

      {/* 6. 底部权威帮助说明：待确认真实能力 & 覆盖边界与审计责任 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2" id="consistency-footer-info-grid">
        {/* 5 项真实能力待确认说明卡片 */}
        <div className="bg-[var(--ty-fill-white-color)] rounded-ty-lg border border-[var(--ty-border-color)] p-4 space-y-3 shadow-ty-xs">
          <div className="flex items-center space-x-2 border-b border-[var(--ty-border-color)] pb-2.5">
            <AlertTriangle className="w-4 h-4 text-[var(--ty-orange-color)]" />
            <h4 className="text-ty-xs font-bold text-[var(--ty-font-main-color)]">
              真实环境能力待确认清单 (当前仅为本地原型)
            </h4>
          </div>
          <div className="space-y-2 text-ty-2xs">
            {pendingConfirmations.map((item, idx) => (
              <div key={idx} className="p-2 rounded-ty-sm bg-[var(--ty-fill-weak-dark-color)] border border-[var(--ty-border-color)] space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[var(--ty-font-main-color)]">{idx + 1}. {item.title}</span>
                  <span className="px-1.5 py-0.2 rounded-ty-xs bg-[var(--ty-orange-lightest-color)] text-[var(--ty-font-main-light-color)] border border-[var(--ty-orange-color)]/30 font-medium">
                    {item.status}
                  </span>
                </div>
                <p className="text-[var(--ty-font-sub-color)]">{item.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 覆盖边界与审计合规卡片 */}
        <div className="bg-[var(--ty-fill-white-color)] rounded-ty-lg border border-[var(--ty-border-color)] p-4 space-y-3 shadow-ty-xs">
          <div className="flex items-center space-x-2 border-b border-[var(--ty-border-color)] pb-2.5">
            <ShieldCheck className="w-4 h-4 text-[var(--ty-primary-color)]" />
            <h4 className="text-ty-xs font-bold text-[var(--ty-font-main-color)]">
              覆盖边界与审计合规约束 (业务必读)
            </h4>
          </div>
          <div className="space-y-2 text-ty-2xs">
            {coverageBoundaries.map((item, idx) => (
              <div key={idx} className="p-2 rounded-ty-sm bg-[var(--ty-fill-weak-dark-color)] border border-[var(--ty-border-color)] space-y-0.5">
                <div className="flex items-center space-x-1.5 font-semibold text-[var(--ty-font-main-color)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--ty-primary-color)]"></span>
                  <span>{item.title}</span>
                </div>
                <p className="text-[var(--ty-font-sub-color)] leading-relaxed">{item.content}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ----------------- 弹窗与抽屉 ----------------- */}

      {/* 抽屉 1: 检查计划配置抽屉 */}
      {isPlanDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden" id="plan-drawer-overlay">
          <div
            className="absolute inset-0 bg-ty-overlay backdrop-blur-xs transition-opacity"
            onClick={() => setIsPlanDrawerOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 max-w-xl w-full bg-[var(--ty-fill-white-color)] shadow-ty-lg flex flex-col z-10 animate-in slide-in-from-right duration-200">
            {/* 抽屉头部 */}
            <div className="px-5 py-4 border-b border-[var(--ty-border-color)] flex items-center justify-between bg-[var(--ty-fill-weak-dark-color)]">
              <div className="flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-[var(--ty-primary-color)]" />
                <h3 className="text-ty-sm font-bold text-[var(--ty-font-main-color)]">
                  配置数据一致性核验计划 (本地演示)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPlanDrawerOpen(false)}
                className="p-1 rounded-ty-sm text-[var(--ty-font-sub-color)] hover:text-[var(--ty-font-main-color)] hover:bg-[var(--ty-fill-darkest-color)]/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 抽屉表单内容 */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-ty-xs">
              <div className="p-3 rounded-ty-sm bg-[var(--ty-orange-lightest-color)] border border-[var(--ty-orange-color)]/30 text-ty-2xs text-[var(--ty-font-main-light-color)] space-y-1">
                <div className="flex items-center space-x-1 font-semibold text-[var(--ty-orange-color)]">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>本地演示原型提示：</span>
                </div>
                <p>
                  此处修改仅保存在浏览器当前运行状态中，用于业务评审页面配置字段与策略联动逻辑，<strong>不会在后台真实创建定时任务</strong>。
                </p>
              </div>

              {/* 计划名称 */}
              <div className="space-y-1">
                <label className="font-semibold text-[var(--ty-font-main-color)]">计划名称</label>
                <input
                  type="text"
                  value={draftPlan.name}
                  onChange={(e) => setDraftPlan({ ...draftPlan, name: e.target.value })}
                  className="w-full px-3 py-1.5 border border-[var(--ty-border-color)] rounded-ty-sm focus:outline-hidden focus:border-[var(--ty-primary-color)]"
                />
              </div>

              {/* 对象根类型 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-[var(--ty-font-main-color)]">对象根类型</label>
                  <select
                    value={draftPlan.rootTypeCode}
                    onChange={(e) => {
                      const code = e.target.value;
                      const name = code === 'PART' ? '零部件 (Part)' : code === 'FASTENER' ? '紧固件 (Fastener)' : '电气件 (Electrical)';
                      setDraftPlan({ ...draftPlan, rootTypeCode: code, rootTypeName: name });
                    }}
                    className="w-full px-3 py-1.5 border border-[var(--ty-border-color)] rounded-ty-sm bg-[var(--ty-fill-white-color)]"
                  >
                    <option value="PART">零部件 (Part)</option>
                    <option value="FASTENER">紧固件 (Fastener)</option>
                    <option value="ELECTRICAL">电气元器件 (Electrical)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[var(--ty-font-main-color)]">是否启用</label>
                  <div className="pt-1 flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="draft-plan-enabled"
                      checked={draftPlan.enabled}
                      onChange={(e) => setDraftPlan({ ...draftPlan, enabled: e.target.checked })}
                      className="rounded-ty-xs text-[var(--ty-primary-color)] focus:ring-[var(--ty-primary-color)] w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor="draft-plan-enabled" className="text-[var(--ty-font-main-color)] cursor-pointer">
                      启用此自动检查计划
                    </label>
                  </div>
                </div>
              </div>

              {/* 执行频率与低峰时间 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-[var(--ty-font-main-color)]">执行频率</label>
                  <select
                    value={draftPlan.frequency}
                    onChange={(e) => {
                      const f = e.target.value as any;
                      setDraftPlan({
                        ...draftPlan,
                        frequency: f,
                        frequencyLabel: f === 'DAILY' ? '每天 (低峰期)' : f === 'WEEKLY' ? '每周' : '每月'
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

              {/* 选数策略 (联动控制) */}
              <div className="space-y-2 border-t border-[var(--ty-border-color)] pt-3">
                <label className="font-semibold text-[var(--ty-font-main-color)] block">选数策略 (三选一)</label>
                <div className="space-y-2">
                  {/* 策略一：随机抽查 */}
                  <label className={`p-3 rounded-ty-sm border flex items-start space-x-2.5 cursor-pointer transition-colors ${
                    draftPlan.strategy === 'RANDOM_SAMPLE'
                      ? 'border-[var(--ty-primary-color)] bg-[var(--ty-primary-lightest-color)]/40'
                      : 'border-[var(--ty-border-color)] bg-[var(--ty-fill-white-color)]'
                  }`}>
                    <input
                      type="radio"
                      name="plan-strategy"
                      checked={draftPlan.strategy === 'RANDOM_SAMPLE'}
                      onChange={() => setDraftPlan({ ...draftPlan, strategy: 'RANDOM_SAMPLE' })}
                      className="mt-1"
                    />
                    <div>
                      <span className="font-bold text-[var(--ty-font-main-color)] block">策略一：随机抽查</span>
                      <p className="text-ty-2xs text-[var(--ty-font-sub-color)]">
                        从指定时间窗口内合格对象中纯随机选样。不设重点配额，单次样本上限即为计划样本数。
                      </p>
                    </div>
                  </label>

                  {/* 策略二：重点＋随机 (组合) */}
                  <label className={`p-3 rounded-ty-sm border flex items-start space-x-2.5 cursor-pointer transition-colors ${
                    draftPlan.strategy === 'FOCUS_AND_RANDOM'
                      ? 'border-[var(--ty-primary-color)] bg-[var(--ty-primary-lightest-color)]/40'
                      : 'border-[var(--ty-border-color)] bg-[var(--ty-fill-white-color)]'
                  }`}>
                    <input
                      type="radio"
                      name="plan-strategy"
                      checked={draftPlan.strategy === 'FOCUS_AND_RANDOM'}
                      onChange={() => setDraftPlan({ ...draftPlan, strategy: 'FOCUS_AND_RANDOM' })}
                      className="mt-1"
                    />
                    <div>
                      <span className="font-bold text-[var(--ty-font-main-color)] block">策略二：重点＋随机 (组合策略 - 推荐)</span>
                      <p className="text-ty-2xs text-[var(--ty-font-sub-color)]">
                        优先选出重点关注对象（如高频修改或近期修改），剩余配额从其他合格对象中随机抽样，系统自动完成唯一 ID 去重与不足补齐。
                      </p>
                    </div>
                  </label>

                  {/* 策略三：指定范围全部核验 */}
                  <label className={`p-3 rounded-ty-sm border flex items-start space-x-2.5 cursor-pointer transition-colors ${
                    draftPlan.strategy === 'EXHAUSTIVE_SCOPE'
                      ? 'border-[var(--ty-primary-color)] bg-[var(--ty-primary-lightest-color)]/40'
                      : 'border-[var(--ty-border-color)] bg-[var(--ty-fill-white-color)]'
                  }`}>
                    <input
                      type="radio"
                      name="plan-strategy"
                      checked={draftPlan.strategy === 'EXHAUSTIVE_SCOPE'}
                      onChange={() => setDraftPlan({ ...draftPlan, strategy: 'EXHAUSTIVE_SCOPE' })}
                      className="mt-1"
                    />
                    <div>
                      <span className="font-bold text-[var(--ty-font-main-color)] block">策略三：指定范围全部核验 (专项排查)</span>
                      <p className="text-ty-2xs text-[var(--ty-font-sub-color)]">
                        用于特定批次或专项范围的穷举全量比对。严格受对象数量上限约束，若范围内超出上限将报错提示，不静默降级为抽样。
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* 联动配置区域 */}
              {draftPlan.strategy === 'FOCUS_AND_RANDOM' && (
                <div className="p-3 bg-[var(--ty-fill-weak-dark-color)] rounded-ty-sm border border-[var(--ty-border-color)] space-y-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-[var(--ty-font-main-color)]">重点依据选择 (二选一)</label>
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
                        <span>高频修改 (变更历史/审计)</span>
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
                    <div className="p-2 rounded-ty-xs bg-[var(--ty-orange-lightest-color)] text-[var(--ty-font-main-light-color)] text-ty-2xs border border-[var(--ty-orange-color)]/30">
                      <strong>业务口径提示：</strong>“近期修改过”不等于“修改频次高”。高频修改需依据 PLM 审计记录与有效修改次数，当前高频修改能力待真实环境接入，仅使用演示数据。
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

              {/* 单次对象数量上限 */}
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
              <span className="text-ty-2xs text-[var(--ty-font-sub-color)]">保存后即时在前端状态中生效</span>
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
                  className="px-4 py-1.5 rounded-ty-sm bg-[var(--ty-primary-color)] hover:bg-[var(--ty-primary-hover-color)] text-[var(--ty-font-white-color)] text-ty-xs font-semibold cursor-pointer shadow-ty-xs"
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
                <button
                  onClick={() => {
                    showToast(`正在对批次 ${selectedBatch.id} 冻结的 ${selectedBatch.frozenObjectIds.length} 个 ID 发起复查 (本地模拟 / 待接入)`, 'info');
                  }}
                  className="px-3 py-1.5 rounded-ty-sm bg-[var(--ty-fill-white-color)] hover:bg-[var(--ty-primary-lightest-color)] text-[var(--ty-primary-color)] border border-[var(--ty-primary-color)]/30 text-ty-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
                  title="使用同一批冻结的 ID 重新核验比对"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>按同一批 ID 复查 (模拟/待接入)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedBatch(null)}
                  className="p-1 rounded-ty-sm text-[var(--ty-font-sub-color)] hover:text-[var(--ty-font-main-color)] hover:bg-[var(--ty-fill-darkest-color)]/10 transition-colors cursor-pointer"
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
                  <span className="text-[var(--ty-font-sub-color)] block text-ty-2xs">PLM 读取耗时</span>
                  <span className="font-mono font-bold text-[var(--ty-font-main-color)] text-ty-xs mt-0.5 block">
                    {selectedBatch.plmReadTime}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--ty-font-sub-color)] block text-ty-2xs">Manticore 读取耗时</span>
                  <span className="font-mono font-bold text-[var(--ty-font-main-color)] text-ty-xs mt-0.5 block">
                    {selectedBatch.manticoreReadTime}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--ty-font-sub-color)] block text-ty-2xs">样本有效数/计划上限</span>
                  <span className="font-mono font-bold text-[var(--ty-primary-color)] text-ty-xs mt-0.5 block">
                    {selectedBatch.actualCount} / {selectedBatch.plannedCount}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--ty-font-sub-color)] block text-ty-2xs">内置去重剔除</span>
                  <span className="font-mono font-bold text-[var(--ty-orange-color)] text-ty-xs mt-0.5 block">
                    {selectedBatch.deduplicatedCount} 个重叠 ID
                  </span>
                </div>
              </div>

              {/* 冻结 ID 与复查说明 */}
              <div className="p-3 rounded-ty-sm bg-[var(--ty-primary-lightest-color)] border border-[var(--ty-primary-color)]/30 text-ty-2xs text-[var(--ty-font-main-light-color)] space-y-1">
                <div className="flex items-center space-x-1.5 font-bold text-[var(--ty-primary-color)]">
                  <Info className="w-3.5 h-3.5" />
                  <span>样本冻结与复查机制：</span>
                </div>
                <p>
                  本次执行已将 {selectedBatch.frozenObjectIds.length} 个对象 ID 进行清单冻结。
                  “再次复查”功能将严格使用该批冻结 ID 进行二次验证，确保核验结果可复现、问题可定位；
                  “新的抽查”才会基于策略重新生成新样本。冻结 ID 不代表创建自动同步修复任务。
                </p>
                <div className="pt-1 flex flex-wrap gap-1 font-mono">
                  {selectedBatch.frozenObjectIds.map(id => (
                    <span key={id} className="px-1.5 py-0.2 bg-[var(--ty-fill-white-color)] border border-[var(--ty-primary-color)]/30 text-[var(--ty-font-main-color)] rounded-ty-xs">
                      {id}
                    </span>
                  ))}
                </div>
              </div>

              {/* 对象核验明细列表 (包含 5 项确定演示数据) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-[var(--ty-font-main-color)] text-ty-xs flex items-center space-x-1.5">
                    <span>对象核验比对明细</span>
                    <span className="text-ty-2xs text-[var(--ty-font-sub-color)] font-normal">
                      (共 {selectedBatch.objectResults.length} 条详细记录)
                    </span>
                  </h4>
                  <span className="text-ty-2xs text-[var(--ty-font-sub-color)]">
                    点击“查看对比”展开 PLM 原始值、预期值与实际值
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
                                高频修改 ({obj.modifyCount || 10}次)
                              </span>
                            )}
                            {obj.selectedReason === 'RANDOM_SAMPLE' && (
                              <span className="px-1.5 py-0.5 rounded-ty-xs bg-[var(--ty-fill-weak-dark-color)] text-[var(--ty-font-sub-color)] border border-[var(--ty-border-color)] font-medium">
                                随机样本
                              </span>
                            )}
                            {obj.selectedReason === 'MANUAL_SPECIFIED' && (
                              <span className="px-1.5 py-0.5 rounded-ty-xs bg-[var(--ty-orange-lightest-color)] text-[var(--ty-font-main-light-color)] border border-[var(--ty-orange-color)]/30 font-medium">
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

            {/* 判定提示说明 */}
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
