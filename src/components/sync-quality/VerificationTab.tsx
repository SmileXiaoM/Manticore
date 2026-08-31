import React, { useState, useMemo, useRef } from 'react';
import {
  Search,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Play,
  ArrowRight,
  ExternalLink,
  Plus,
  X,
  Layers,
  Database,
  Fingerprint,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  VerificationRecord,
  VerificationStatus,
  VerificationMethod,
  VerificationObjectDistribution,
  SyncBatch,
  FieldDifference
} from '../../syncQualityTypes';
import { checkTimeRange } from '../../syncQualityData';

interface VerificationTabProps {
  verifications: VerificationRecord[];
  batches: SyncBatch[];
  onOpenBatchDrawer: (batchId: string) => void;
  onOpenExceptionDrawer: (exceptionId: string) => void;
  onAddVerification: (newRecord: VerificationRecord) => void;
  onUpdateVerificationResult?: (
    verificationId: string,
    result: VerificationStatus,
    updates?: Partial<VerificationRecord>
  ) => void;
  selectedVerificationId?: string | null;
  onSelectVerificationId: (id: string | null) => void;
  onShowToast: (message: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

export const VerificationTab: React.FC<VerificationTabProps> = ({
  verifications,
  batches,
  onOpenBatchDrawer,
  onOpenExceptionDrawer,
  onAddVerification,
  onUpdateVerificationResult,
  selectedVerificationId,
  onSelectVerificationId,
  onShowToast
}) => {
  // 筛选状态
  const [sourceSystem, setSourceSystem] = useState<string>('ALL');
  const [objectType, setObjectType] = useState<string>('ALL');
  const [method, setMethod] = useState<string>('ALL');
  const [resultStatus, setResultStatus] = useState<string>('ALL');
  const [timeRange, setTimeRange] = useState<string>('ALL');
  const [searchBatchId, setSearchBatchId] = useState<string>('');

  // 抽屉内部页签
  const [activeDrawerTab, setActiveDrawerTab] = useState<'OVERVIEW' | 'DISTRIBUTION' | 'EXCEPTIONS' | 'DIFFS' | 'STRATEGY'>('OVERVIEW');

  // 发起核验对话框
  const [showInitiateModal, setShowInitiateModal] = useState(false);
  const [newBatchId, setNewBatchId] = useState<string>(batches[0]?.id || '');
  const [newScope, setNewScope] = useState<string>('ALL');
  const [newMethod, setNewMethod] = useState<VerificationMethod>('STANDARDIZED_HASH');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  // 展开长文本状态
  const [expandedDiffIds, setExpandedDiffIds] = useState<Record<string, boolean>>({});

  const handleResetFilters = () => {
    setSourceSystem('ALL');
    setObjectType('ALL');
    setMethod('ALL');
    setResultStatus('ALL');
    setTimeRange('ALL');
    setSearchBatchId('');
  };

  // 动态派生摘要指标（R4 规则：加权计算已完成核验单的完整率与一致率）
  const summaryMetrics = useMemo(() => {
    const completed = verifications.filter(v => v.result !== 'CHECKING');
    const totalSample = completed.reduce((acc, v) => acc + (v.sampleSize || 0), 0);

    let weightedIntegrity = 0;
    let weightedConsistency = 0;

    if (totalSample > 0) {
      weightedIntegrity = completed.reduce((acc, v) => acc + v.integrityRate * v.sampleSize, 0) / totalSample;
      weightedConsistency = completed.reduce((acc, v) => acc + v.fieldConsistencyRate * v.sampleSize, 0) / totalSample;
    }

    const totalExceptions = verifications.reduce((acc, v) => acc + v.exceptionCount, 0);

    return {
      totalVerifications: verifications.length,
      integrityRateStr: totalSample > 0 ? `${weightedIntegrity.toFixed(2)}%` : '--',
      consistencyRateStr: totalSample > 0 ? `${weightedConsistency.toFixed(2)}%` : '--',
      totalExceptions
    };
  }, [verifications]);

  // 过滤核验列表
  const filteredVerifications = useMemo(() => {
    return verifications.filter(item => {
      if (sourceSystem !== 'ALL' && item.sourceSystem !== sourceSystem) return false;
      if (objectType !== 'ALL' && !item.objectsSummary.includes(objectType)) return false;
      if (method !== 'ALL' && item.method !== method) return false;
      if (resultStatus !== 'ALL' && item.result !== resultStatus) return false;
      if (searchBatchId.trim() && !item.linkedBatchId.toLowerCase().includes(searchBatchId.trim().toLowerCase()) && !item.id.toLowerCase().includes(searchBatchId.trim().toLowerCase())) return false;

      // 统一时间范围筛选
      if (!checkTimeRange(item.executedAt, timeRange)) return false;

      return true;
    });
  }, [verifications, sourceSystem, objectType, method, resultStatus, timeRange, searchBatchId]);

  // 当前选中的核验记录
  const selectedVerification = useMemo(() => {
    return verifications.find(v => v.id === selectedVerificationId) || null;
  }, [verifications, selectedVerificationId]);

  // 检查选择的批次是否正在运行中
  const selectedBatchForModal = useMemo(() => {
    return batches.find(b => b.id === newBatchId) || null;
  }, [batches, newBatchId]);

  const isBatchRunning = selectedBatchForModal?.executionStatus === 'RUNNING';

  // 当选择的批次变更时，若新批次不包含当前所选的对象范围，重置为 ALL
  const availableBatchObjects = selectedBatchForModal?.objectsSummary || [];

  const handleBatchChangeInModal = (batchId: string) => {
    setNewBatchId(batchId);
    const target = batches.find(b => b.id === batchId);
    if (target && newScope !== 'ALL' && !target.objectsSummary.includes(newScope)) {
      setNewScope('ALL');
    }
  };

  const handleInitiateVerification = () => {
    // 提交防重守卫：若正在提交中则立即阻断
    if (isSubmittingRef.current || isSubmitting) {
      return;
    }

    if (!newBatchId) {
      onShowToast('请选择关联同步批次', 'warning');
      return;
    }
    if (isBatchRunning) {
      onShowToast('该批次处于“运行中”状态，数据写入尚未收敛，暂不允许发起核验', 'error');
      return;
    }

    const targetBatch = batches.find(b => b.id === newBatchId);
    if (!targetBatch) return;

    // 同步加锁并更新 UI 禁用态
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      // 从所选批次的 objectDetails 派生真实的 objectDistributions (R2)
      const targetDetails = newScope === 'ALL'
        ? targetBatch.objectDetails
        : targetBatch.objectDetails.filter(d => d.objectType === newScope);

      const derivedDistributions: VerificationObjectDistribution[] = targetDetails.length > 0
        ? targetDetails.map(d => ({
            objectType: d.objectType,
            softType: d.softType || '未细分软类型',
            checkedCount: d.extractedCount,
            exceptionCount: 0,
            status: 'CHECKING' as const
          }))
        : (newScope === 'ALL' ? targetBatch.objectsSummary : [newScope]).map(obj => ({
            objectType: obj,
            softType: '未细分软类型',
            checkedCount: targetBatch.sourceDataCount,
            exceptionCount: 0,
            status: 'CHECKING' as const
          }));

      const sampleSize = derivedDistributions.reduce((sum, d) => sum + d.checkedCount, 0);
      const scopeSummary = Array.from(new Set(derivedDistributions.map(d => d.objectType)));

      const isFullBatch = newScope === 'ALL' && scopeSummary.length === targetBatch.objectsSummary.length;
      const verificationScope: 'FULL_BATCH' | 'OBJECT_SCOPE' = isFullBatch ? 'FULL_BATCH' : 'OBJECT_SCOPE';

      // 集中、可验证不重复的生成器 (R2.8)
      const nextSeq = verifications.length + 1;
      const generatedId = `CHK-20260825-${String(nextSeq).padStart(3, '0')}-${String(Date.now()).slice(-4)}`;

      const methodLabels: Record<VerificationMethod, string> = {
        COUNT: '数量核验',
        UNIQUE_KEY: '唯一键核验',
        VERSION_UPDATECOUNT: '版本/updatecount 核验',
        STANDARDIZED_HASH: '标准化哈希核验',
        STRATIFIED_RANDOM: '分层随机抽样',
        RISK_TARGETED: '风险定向抽样'
      };

      const tempRecord: VerificationRecord = {
        id: generatedId,
        linkedBatchId: newBatchId,
        sourceSystem: 'IntePLM V21',
        objectsSummary: scopeSummary,
        method: newMethod,
        methodLabel: methodLabels[newMethod],
        sampleSize,
        integrityRate: 0,
        fieldConsistencyRate: 0,
        timelinessRate: 0,
        exceptionCount: 0,
        result: 'CHECKING',
        executedAt: '刚刚 (2026-08-25 16:30)',
        executor: '李晓华 (数据标准管理员)',
        verificationScope,
        strategyNotes: `手动发起针对批次 ${newBatchId} 的 ${methodLabels[newMethod]}，覆盖对象: ${scopeSummary.join(', ')}。`,
        objectDistributions: derivedDistributions,
        linkedExceptionIds: [],
        fieldDifferences: []
      };

      onAddVerification(tempRecord);
      setShowInitiateModal(false);
      onShowToast(`已成功发起核验任务 ${generatedId}，正在调度比对...`, 'info');

      // 对话框关闭后安全复位防重锁
      setTimeout(() => {
        isSubmittingRef.current = false;
        setIsSubmitting(false);
      }, 400);

      // 2.5秒后通过回调不可变更新核验结果状态
      setTimeout(() => {
        const completedDistributions: VerificationObjectDistribution[] = derivedDistributions.map(d => ({
          ...d,
          status: 'PASSED' as const
        }));

        if (onUpdateVerificationResult) {
          onUpdateVerificationResult(generatedId, 'PASSED', {
            integrityRate: 100,
            fieldConsistencyRate: 100,
            timelinessRate: 100,
            objectDistributions: completedDistributions
          });
        }
        onShowToast(`核验任务 ${generatedId} 比对完成：指标全部一致，结果为“通过”`, 'success');
      }, 2500);
    } catch (err) {
      // 发生异常时恢复可操作状态
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      onShowToast('发起核验失败，请重试', 'error');
    }
  };

  const renderVerificationStatusBadge = (status: VerificationStatus) => {
    switch (status) {
      case 'PASSED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            通过
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            预警
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-600" />
            失败
          </span>
        );
      case 'CHECKING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Play className="w-3 h-3 text-blue-600 animate-spin" />
            核验中
          </span>
        );
      case 'UNCHECKED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
            未核验
          </span>
        );
    }
  };

  const toggleDiffExpand = (diffId: string) => {
    setExpandedDiffIds(prev => ({
      ...prev,
      [diffId]: !prev[diffId]
    }));
  };

  return (
    <div className="space-y-4">
      {/* 顶部紧凑摘要带 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-white p-3.5 rounded-lg border border-slate-200 text-xs shadow-2xs">
        <div className="flex items-center space-x-3 pr-2 border-r border-slate-100 last:border-r-0">
          <div className="w-8 h-8 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Fingerprint className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-slate-400 font-medium text-[11px]">核验单总量</div>
            <div className="text-slate-900 font-bold text-sm tracking-tight truncate">
              {summaryMetrics.totalVerifications} <span className="text-xs font-normal text-slate-500 ml-1">个已核验批次</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3 pr-2 border-r border-slate-100 last:border-r-0">
          <div className="w-8 h-8 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-slate-400 font-medium text-[11px]">全局数据完整率</div>
            <div className="text-slate-900 font-bold text-sm tracking-tight truncate font-mono">
              {summaryMetrics.integrityRateStr} <span className="text-xs font-normal text-emerald-600 ml-1">加权数量对齐</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3 pr-2 border-r border-slate-100 last:border-r-0">
          <div className="w-8 h-8 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-slate-400 font-medium text-[11px]">全局字段一致率</div>
            <div className="text-slate-900 font-bold text-sm tracking-tight truncate font-mono">
              {summaryMetrics.consistencyRateStr} <span className="text-xs font-normal text-slate-500 ml-1">加权哈希比对</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-md bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-slate-400 font-medium text-[11px]">发现不一致记录</div>
            <div className="text-slate-900 font-bold text-sm tracking-tight truncate">
              {summaryMetrics.totalExceptions} <span className="text-xs font-normal text-rose-600 ml-1">条字段/对象差异</span>
            </div>
          </div>
        </div>
      </div>

      {/* 顶部横向筛选区 */}
      <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-2.5 items-end">
          {/* 来源系统 */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">来源系统</label>
            <select
              value={sourceSystem}
              onChange={e => setSourceSystem(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all cursor-pointer"
            >
              <option value="ALL">全部来源系统</option>
              <option value="IntePLM V21">IntePLM V21</option>
            </select>
          </div>

          {/* 对象类型 */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">对象类型</label>
            <select
              value={objectType}
              onChange={e => setObjectType(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all cursor-pointer"
            >
              <option value="ALL">全部对象</option>
              <option value="Part">零部件 (Part)</option>
              <option value="Document">文档 (Document)</option>
              <option value="Process">工艺对象 (Process)</option>
            </select>
          </div>

          {/* 核验方式 */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">核验方式</label>
            <select
              value={method}
              onChange={e => setMethod(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all cursor-pointer"
            >
              <option value="ALL">全部核验方式</option>
              <option value="COUNT">数量核验</option>
              <option value="UNIQUE_KEY">唯一键核验</option>
              <option value="VERSION_UPDATECOUNT">版本/updatecount 核验</option>
              <option value="STANDARDIZED_HASH">标准化哈希核验</option>
              <option value="STRATIFIED_RANDOM">分层随机抽样</option>
              <option value="RISK_TARGETED">风险定向抽样</option>
            </select>
          </div>

          {/* 核验结果 */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">核验结果</label>
            <select
              value={resultStatus}
              onChange={e => setResultStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all cursor-pointer"
            >
              <option value="ALL">全部核验结果</option>
              <option value="CHECKING">核验中</option>
              <option value="PASSED">通过</option>
              <option value="WARNING">预警</option>
              <option value="FAILED">失败</option>
            </select>
          </div>

          {/* 时间范围筛选 */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">时间范围</label>
            <select
              value={timeRange}
              onChange={e => setTimeRange(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all cursor-pointer"
            >
              <option value="ALL">全部时间</option>
              <option value="TODAY">今天 (2026-08-25)</option>
              <option value="LAST_24H">最近 24 小时</option>
              <option value="LAST_7D">最近 7 天</option>
            </select>
          </div>

          {/* 关联批次 */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">关联批次 / 编号</label>
            <div className="relative">
              <input
                type="text"
                placeholder="搜索 CHK-... 或 SYNC-..."
                value={searchBatchId}
                onChange={e => setSearchBatchId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded pl-7 pr-2.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
            </div>
          </div>

          {/* 动作区 */}
          <div className="col-span-2 sm:col-span-1 md:col-span-2 lg:col-span-2 xl:col-span-1 flex items-center space-x-2">
            <button
              onClick={handleResetFilters}
              className="flex-1 flex items-center justify-center space-x-1 px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
              <span>重置</span>
            </button>
            <button
              onClick={() => {
                isSubmittingRef.current = false;
                setIsSubmitting(false);
                setShowInitiateModal(true);
              }}
              className="flex-1 flex items-center justify-center space-x-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold shadow-2xs whitespace-nowrap transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>发起核验</span>
            </button>
          </div>
        </div>
      </div>

      {/* 主表格容器 */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-full lg:min-w-[1000px]">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-2.5 sm:px-3 whitespace-nowrap">核验编号</th>
                <th className="py-2.5 px-2 whitespace-nowrap">关联批次</th>
                <th className="py-2.5 px-2 min-w-[90px]">对象范围</th>
                <th className="py-2.5 px-2 whitespace-nowrap">核验方式</th>
                <th className="py-2.5 px-2 text-right whitespace-nowrap">样本量</th>
                <th className="py-2.5 px-2 text-right whitespace-nowrap">完整率</th>
                <th className="py-2.5 px-2 text-right whitespace-nowrap">一致率</th>
                <th className="py-2.5 px-2 text-right whitespace-nowrap">时效达标</th>
                <th className="py-2.5 px-2 text-right whitespace-nowrap">异常数</th>
                <th className="py-2.5 px-2 whitespace-nowrap">核验结果</th>
                <th className="py-2.5 px-2 whitespace-nowrap">执行时间</th>
                <th className="py-2.5 px-3 text-center sticky-ops whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredVerifications.length > 0 ? (
                filteredVerifications.map(item => (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      selectedVerificationId === item.id ? 'bg-blue-50/40' : ''
                    }`}
                  >
                    <td className="py-2.5 px-2.5 sm:px-3 font-mono font-semibold text-blue-600 hover:underline cursor-pointer whitespace-nowrap">
                      <button
                        onClick={() => {
                          onSelectVerificationId(item.id);
                          setActiveDrawerTab('OVERVIEW');
                        }}
                        className="text-left font-mono font-bold"
                      >
                        {item.id}
                      </button>
                    </td>
                    <td className="py-2.5 px-2 font-mono whitespace-nowrap">
                      <button
                        onClick={() => onOpenBatchDrawer(item.linkedBatchId)}
                        className="text-slate-700 hover:text-blue-600 hover:underline flex items-center space-x-1"
                      >
                        <span>{item.linkedBatchId}</span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </button>
                    </td>
                    <td className="py-2.5 px-2">
                      <div className="flex flex-wrap gap-1">
                        {item.objectsSummary.map(obj => (
                          <span
                            key={obj}
                            className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-mono whitespace-nowrap"
                          >
                            {obj}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-slate-800 font-medium whitespace-nowrap">{item.methodLabel}</td>
                    <td className="py-2.5 px-2 text-right font-mono font-medium text-slate-900 whitespace-nowrap">
                      {item.sampleSize.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono font-semibold text-slate-800 whitespace-nowrap">
                      {item.result === 'CHECKING' ? (
                        <span className="text-slate-400 font-normal">--</span>
                      ) : (
                        `${item.integrityRate.toFixed(2)}%`
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono font-semibold text-slate-800 whitespace-nowrap">
                      {item.result === 'CHECKING' ? (
                        <span className="text-slate-400 font-normal">--</span>
                      ) : (
                        `${item.fieldConsistencyRate.toFixed(2)}%`
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono text-slate-600 whitespace-nowrap">
                      {item.result === 'CHECKING' ? (
                        <span className="text-slate-400 font-normal">--</span>
                      ) : (
                        `${item.timelinessRate.toFixed(2)}%`
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono font-bold whitespace-nowrap">
                      {item.exceptionCount > 0 ? (
                        <span className="text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">{item.exceptionCount}</span>
                      ) : (
                        <span className="text-slate-400 font-normal">0</span>
                      )}
                    </td>
                    <td className="py-2.5 px-2 whitespace-nowrap">{renderVerificationStatusBadge(item.result)}</td>
                    <td className="py-2.5 px-2 text-slate-600 whitespace-nowrap">{item.executedAt}</td>
                    <td className="py-2.5 px-3 text-center sticky-ops whitespace-nowrap">
                      <button
                        onClick={() => {
                          onSelectVerificationId(item.id);
                          setActiveDrawerTab('OVERVIEW');
                        }}
                        className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                      >
                        查看详情
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Fingerprint className="w-8 h-8 text-slate-300" />
                      <p className="text-xs font-medium text-slate-500">未找到符合当前筛选条件的一致性核验记录</p>
                      <button
                        onClick={handleResetFilters}
                        className="text-xs text-blue-600 hover:underline font-medium"
                      >
                        重置所有筛选条件
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 发起核验参数对话框 */}
      {showInitiateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-2xs animate-in fade-in duration-150 p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Fingerprint className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">发起一致性核验任务</h3>
              </div>
              <button
                onClick={() => {
                  if (!isSubmittingRef.current) {
                    setShowInitiateModal(false);
                    isSubmittingRef.current = false;
                    setIsSubmitting(false);
                  }
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* 关联批次 */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  关联同步批次 <span className="text-rose-500">*</span>
                </label>
                <select
                  value={newBatchId}
                  onChange={e => handleBatchChangeInModal(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all cursor-pointer font-mono"
                >
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.id} ({b.syncMethod} · {b.objectsSummary.join(', ')} · {b.executionStatus})
                    </option>
                  ))}
                </select>
              </div>

              {/* 批次运行中警示 */}
              {isBatchRunning && (
                <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded text-xs flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">批次处于运行中状态：</span>
                    <p className="mt-0.5 text-amber-800">
                      批次 {newBatchId} 仍在执行抽取和写入，索引数据尚未收敛，不能在此阶段发起核验。
                    </p>
                  </div>
                </div>
              )}

              {/* 对象范围 - 严格限定为所选批次包含的对象 */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  对象核验范围 <span className="text-slate-400 font-normal">(已限制为所选批次包含对象)</span>
                </label>
                <select
                  value={newScope}
                  onChange={e => setNewScope(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all cursor-pointer"
                >
                  <option value="ALL">全部对象 (继承所选批次: {availableBatchObjects.join(', ') || '全部'})</option>
                  {availableBatchObjects.includes('Part') && (
                    <option value="Part">仅零部件 (Part)</option>
                  )}
                  {availableBatchObjects.includes('Document') && (
                    <option value="Document">仅文档 (Document)</option>
                  )}
                  {availableBatchObjects.includes('Process') && (
                    <option value="Process">仅工艺对象 (Process)</option>
                  )}
                  {availableBatchObjects.filter(obj => !['Part', 'Document', 'Process'].includes(obj)).map(obj => (
                    <option key={obj} value={obj}>仅 {obj}</option>
                  ))}
                </select>
              </div>

              {/* 核验方式 */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">核验方式</label>
                <select
                  value={newMethod}
                  onChange={e => setNewMethod(e.target.value as VerificationMethod)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all cursor-pointer"
                >
                  <option value="STANDARDIZED_HASH">标准化哈希核验 (全字段指纹深度比对)</option>
                  <option value="COUNT">数量核验 (主键总数对齐)</option>
                  <option value="VERSION_UPDATECOUNT">版本/updatecount 核验 (版本号增量对齐)</option>
                  <option value="RISK_TARGETED">风险定向抽样 (状态频繁变更/大文本对象)</option>
                  <option value="STRATIFIED_RANDOM">分层随机抽样 (按软类型比例抽样)</option>
                  <option value="UNIQUE_KEY">唯一键核验 (全局唯一约束核验)</option>
                </select>
              </div>

              <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded border border-slate-200">
                核验任务将在后台多线程执行 PLM 源库与 Manticore 检索库字段对账。
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                disabled={isSubmitting}
                onClick={() => {
                  if (!isSubmittingRef.current) {
                    setShowInitiateModal(false);
                    isSubmittingRef.current = false;
                    setIsSubmitting(false);
                  }
                }}
                className={`px-3.5 py-1.5 border border-slate-300 rounded text-xs font-semibold text-slate-700 transition-colors ${
                  isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50 cursor-pointer'
                }`}
              >
                取消
              </button>
              <button
                disabled={isBatchRunning || isSubmitting}
                onClick={handleInitiateVerification}
                className={`px-4 py-1.5 rounded text-xs font-bold text-white transition-colors flex items-center space-x-1.5 ${
                  isBatchRunning || isSubmitting
                    ? 'bg-slate-300 cursor-not-allowed text-slate-500'
                    : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Play className="w-3.5 h-3.5 animate-spin shrink-0" />
                    <span className="whitespace-nowrap">调度中...</span>
                  </>
                ) : (
                  <span className="whitespace-nowrap">确认发起核验</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 核验详情右侧抽屉 */}
      {selectedVerification && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-[760px] h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200">
            {/* 抽屉头部 */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-md bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                  <Fingerprint className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-sm font-bold text-slate-900 font-mono">{selectedVerification.id}</h2>
                    {renderVerificationStatusBadge(selectedVerification.result)}
                  </div>
                  <p className="text-xs text-slate-500">
                    关联批次: <span className="font-mono">{selectedVerification.linkedBatchId}</span> · 方式: {selectedVerification.methodLabel}
                  </p>
                </div>
              </div>
              <button
                onClick={() => onSelectVerificationId(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 抽屉页签导航 */}
            <div className="px-5 border-b border-slate-200 flex space-x-4 bg-white shrink-0 overflow-x-auto">
              <button
                onClick={() => setActiveDrawerTab('OVERVIEW')}
                className={`py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                  activeDrawerTab === 'OVERVIEW'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                结果概览
              </button>
              <button
                onClick={() => setActiveDrawerTab('DISTRIBUTION')}
                className={`py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                  activeDrawerTab === 'DISTRIBUTION'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                对象分布 ({selectedVerification.objectDistributions.length})
              </button>
              <button
                onClick={() => setActiveDrawerTab('EXCEPTIONS')}
                className={`py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                  activeDrawerTab === 'EXCEPTIONS'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                异常记录 ({selectedVerification.linkedExceptionIds.length})
              </button>
              <button
                onClick={() => setActiveDrawerTab('DIFFS')}
                className={`py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                  activeDrawerTab === 'DIFFS'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                字段对比 ({selectedVerification.fieldDifferences.length})
              </button>
              <button
                onClick={() => setActiveDrawerTab('STRATEGY')}
                className={`py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                  activeDrawerTab === 'STRATEGY'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                核验范围与策略
              </button>
            </div>

            {/* 抽屉内容区 */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* 页签 1: 结果概览 */}
              {activeDrawerTab === 'OVERVIEW' && (
                <div className="space-y-4">
                  {/* 4 列指标 */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
                      <div className="text-[11px] text-slate-500">完整率</div>
                      <div className="text-lg font-bold text-slate-900 font-mono mt-1">
                        {selectedVerification.result === 'CHECKING' ? '--' : `${selectedVerification.integrityRate.toFixed(2)}%`}
                      </div>
                    </div>
                    <div className="bg-indigo-50/60 border border-indigo-200 p-3 rounded-lg">
                      <div className="text-[11px] text-indigo-800">字段一致率</div>
                      <div className="text-lg font-bold text-indigo-700 font-mono mt-1">
                        {selectedVerification.result === 'CHECKING' ? '--' : `${selectedVerification.fieldConsistencyRate.toFixed(2)}%`}
                      </div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
                      <div className="text-[11px] text-slate-500">时效达标率</div>
                      <div className="text-lg font-bold text-slate-800 font-mono mt-1">
                        {selectedVerification.result === 'CHECKING' ? '--' : `${selectedVerification.timelinessRate.toFixed(2)}%`}
                      </div>
                    </div>
                    <div className="bg-rose-50/60 border border-rose-200 p-3 rounded-lg">
                      <div className="text-[11px] text-rose-800">发现异常数</div>
                      <div className="text-lg font-bold text-rose-600 font-mono mt-1">
                        {selectedVerification.exceptionCount}
                      </div>
                    </div>
                  </div>

                  {/* 基础详情卡片 */}
                  <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 text-xs">
                    <h3 className="text-xs font-bold text-slate-900">核验基础信息</h3>
                    <div className="grid grid-cols-2 gap-y-2.5">
                      <div>
                        <span className="text-slate-500">关联批次：</span>
                        <button
                          onClick={() => {
                            onSelectVerificationId(null);
                            onOpenBatchDrawer(selectedVerification.linkedBatchId);
                          }}
                          className="font-mono text-blue-600 hover:underline font-semibold ml-1 inline-flex items-center space-x-0.5"
                        >
                          <span>{selectedVerification.linkedBatchId}</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                      <div>
                        <span className="text-slate-500">核验方式：</span>
                        <span className="font-medium text-slate-800 ml-1">{selectedVerification.methodLabel}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">样本数据量：</span>
                        <span className="font-mono text-slate-800 ml-1">{selectedVerification.sampleSize.toLocaleString()} 条</span>
                      </div>
                      <div>
                        <span className="text-slate-500">核验结果：</span>
                        <span className="ml-1">{renderVerificationStatusBadge(selectedVerification.result)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">执行人员：</span>
                        <span className="text-slate-800 ml-1">{selectedVerification.executor}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">执行时间：</span>
                        <span className="font-mono text-slate-800 ml-1">{selectedVerification.executedAt}</span>
                      </div>
                    </div>
                  </div>

                  {/* 策略说明 */}
                  <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-lg text-xs space-y-1">
                    <div className="font-bold text-slate-800 flex items-center space-x-1.5">
                      <Info className="w-3.5 h-3.5 text-blue-600" />
                      <span>核验策略说明</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">{selectedVerification.strategyNotes}</p>
                  </div>
                </div>
              )}

              {/* 页签 2: 对象分布 */}
              {activeDrawerTab === 'DISTRIBUTION' && (
                <div className="space-y-3">
                  <div className="text-xs text-slate-500">
                    按根对象/软类型展示核验样本数量与异常数量，定位异常集中分布的业务对象：
                  </div>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                        <tr>
                          <th className="py-2.5 px-3">对象类型</th>
                          <th className="py-2.5 px-3">软类型</th>
                          <th className="py-2.5 px-3 text-right">核验样本量</th>
                          <th className="py-2.5 px-3 text-right">异常记录数</th>
                          <th className="py-2.5 px-3">状态</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedVerification.objectDistributions.map((dist, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/60">
                            <td className="py-2.5 px-3 font-medium text-slate-800">{dist.objectType}</td>
                            <td className="py-2.5 px-3 text-slate-600">{dist.softType}</td>
                            <td className="py-2.5 px-3 text-right font-mono">{dist.checkedCount.toLocaleString()}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold">
                              {dist.exceptionCount > 0 ? (
                                <span className="text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">{dist.exceptionCount}</span>
                              ) : (
                                <span className="text-slate-400 font-normal">0</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">{renderVerificationStatusBadge(dist.status)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 页签 3: 异常记录 */}
              {activeDrawerTab === 'EXCEPTIONS' && (
                <div className="space-y-3">
                  {selectedVerification.linkedExceptionIds.length > 0 ? (
                    selectedVerification.linkedExceptionIds.map(exId => (
                      <div key={exId} className="border border-slate-200 bg-white rounded-lg p-3.5 flex items-center justify-between text-xs hover:border-blue-300 transition-colors">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-bold text-slate-900 text-sm">{exId}</span>
                            <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 font-semibold text-[11px]">
                              不一致异常单
                            </span>
                          </div>
                          <p className="text-slate-500">已自动注册入库，可在异常处置中心进行重试、人工补偿与复核关闭。</p>
                        </div>
                        <button
                          onClick={() => {
                            onSelectVerificationId(null);
                            onOpenExceptionDrawer(exId);
                          }}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded font-semibold transition-colors inline-flex items-center space-x-1 cursor-pointer shrink-0 ml-3"
                        >
                          <span>去处置</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                      该核验记录未发现任何字段级或数量级异常
                    </div>
                  )}
                </div>
              )}

              {/* 页签 4: 字段对比 */}
              {activeDrawerTab === 'DIFFS' && (
                <div className="space-y-3">
                  <div className="text-xs text-slate-500">
                    核验引擎比对 PLM 源库值、一阶段映射预期值与 Manticore 检索库实际值的字段明细：
                  </div>
                  {selectedVerification.fieldDifferences.length > 0 ? (
                    selectedVerification.fieldDifferences.map(diff => (
                      <div key={diff.id} className="border border-slate-200 bg-white rounded-lg p-3.5 space-y-2.5 text-xs shadow-2xs">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono font-bold text-slate-900">{diff.objectCode}</span>
                            <span className="text-slate-600 font-medium">{diff.objectName}</span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px]">
                              {diff.objectType} / {diff.softType}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 font-mono font-bold text-[11px] border border-blue-100">
                              比对字段: {diff.fieldName}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1.5">
                            <span
                              className={`px-2 py-0.5 rounded font-semibold text-[11px] ${
                                diff.result === 'MISMATCH'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : diff.result === 'MISSING'
                                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              }`}
                            >
                              {diff.diffType}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                                diff.result === 'MATCH'
                                  ? 'bg-emerald-600 text-white'
                                  : diff.result === 'MISMATCH'
                                  ? 'bg-amber-600 text-white'
                                  : 'bg-rose-600 text-white'
                              }`}
                            >
                              {diff.result === 'MATCH' ? '一致' : diff.result === 'MISMATCH' ? '不一致' : '缺失'}
                            </span>
                          </div>
                        </div>

                        {/* 三方比对网格 */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                          {/* PLM 源值 */}
                          <div className="bg-slate-50 p-2.5 rounded border border-slate-200 space-y-1">
                            <div className="text-[11px] font-semibold text-slate-500">IntePLM V21 源值</div>
                            <div className="font-mono text-slate-900 break-all leading-relaxed">
                              {diff.plmSourceValue.length > 60 && !expandedDiffIds[diff.id] ? (
                                <>
                                  {diff.plmSourceValue.slice(0, 60)}...
                                  <button
                                    onClick={() => toggleDiffExpand(diff.id)}
                                    className="text-blue-600 ml-1 hover:underline cursor-pointer"
                                  >
                                    展开
                                  </button>
                                </>
                              ) : (
                                <>
                                  {diff.plmSourceValue}
                                  {diff.plmSourceValue.length > 60 && (
                                    <button
                                      onClick={() => toggleDiffExpand(diff.id)}
                                      className="text-blue-600 ml-1 hover:underline cursor-pointer"
                                    >
                                      收起
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>

                          {/* 映射后预期值 */}
                          <div className="bg-blue-50/40 p-2.5 rounded border border-blue-100 space-y-1">
                            <div className="text-[11px] font-semibold text-blue-700">映射后预期值</div>
                            <div className="font-mono text-blue-900 break-all leading-relaxed">
                              {diff.mappedExpectedValue.length > 60 && !expandedDiffIds[diff.id] ? (
                                <>
                                  {diff.mappedExpectedValue.slice(0, 60)}...
                                  <button
                                    onClick={() => toggleDiffExpand(diff.id)}
                                    className="text-blue-600 ml-1 hover:underline cursor-pointer"
                                  >
                                    展开
                                  </button>
                                </>
                              ) : (
                                <>
                                  {diff.mappedExpectedValue}
                                  {diff.mappedExpectedValue.length > 60 && (
                                    <button
                                      onClick={() => toggleDiffExpand(diff.id)}
                                      className="text-blue-600 ml-1 hover:underline cursor-pointer"
                                    >
                                      收起
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>

                          {/* Manticore 检索库实际值 */}
                          <div
                            className={`p-2.5 rounded border space-y-1 ${
                              diff.result === 'MISSING'
                                ? 'bg-rose-50/60 border-rose-200'
                                : diff.result === 'MISMATCH'
                                ? 'bg-amber-50/60 border-amber-200'
                                : 'bg-emerald-50/50 border-emerald-200'
                            }`}
                          >
                            <div
                              className={`text-[11px] font-semibold ${
                                diff.result === 'MISSING'
                                  ? 'text-rose-700'
                                  : diff.result === 'MISMATCH'
                                  ? 'text-amber-700'
                                  : 'text-emerald-700'
                              }`}
                            >
                              Manticore 实际值
                            </div>
                            <div
                              className={`font-mono break-all leading-relaxed font-bold ${
                                diff.result === 'MISSING'
                                  ? 'text-rose-800'
                                  : diff.result === 'MISMATCH'
                                  ? 'text-amber-900'
                                  : 'text-emerald-900'
                              }`}
                            >
                              {diff.manticoreActualValue.length > 60 && !expandedDiffIds[diff.id] ? (
                                <>
                                  {diff.manticoreActualValue.slice(0, 60)}...
                                  <button
                                    onClick={() => toggleDiffExpand(diff.id)}
                                    className="text-blue-600 ml-1 hover:underline cursor-pointer"
                                  >
                                    展开
                                  </button>
                                </>
                              ) : (
                                <>
                                  {diff.manticoreActualValue}
                                  {diff.manticoreActualValue.length > 60 && (
                                    <button
                                      onClick={() => toggleDiffExpand(diff.id)}
                                      className="text-blue-600 ml-1 hover:underline cursor-pointer"
                                    >
                                      收起
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      该核验无字段差异记录
                    </div>
                  )}
                </div>
              )}

              {/* 页签 5: 核验范围和策略 */}
              {activeDrawerTab === 'STRATEGY' && (
                <div className="space-y-4 text-xs">
                  <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
                    <h3 className="text-xs font-bold text-slate-900">核验范围定义</h3>
                    <div className="grid grid-cols-2 gap-y-2">
                      <div>
                        <span className="text-slate-500">来源系统：</span>
                        <span className="font-medium text-slate-800 ml-1">{selectedVerification.sourceSystem}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">关联批次：</span>
                        <span className="font-mono text-slate-800 ml-1">{selectedVerification.linkedBatchId}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">涵盖对象：</span>
                        <span className="font-medium text-slate-800 ml-1">{selectedVerification.objectsSummary.join(', ')}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">核验算法：</span>
                        <span className="font-medium text-slate-800 ml-1">{selectedVerification.methodLabel}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2">
                    <h3 className="text-xs font-bold text-slate-900">执行策略说明 (只读)</h3>
                    <p className="text-slate-600 leading-relaxed">{selectedVerification.strategyNotes}</p>
                  </div>
                </div>
              )}
            </div>

            {/* 抽屉底部操作 */}
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end space-x-3 shrink-0">
              <button
                onClick={() => onSelectVerificationId(null)}
                className="px-4 py-1.5 border border-slate-300 hover:bg-slate-100 rounded text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
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
