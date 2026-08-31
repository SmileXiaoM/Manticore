import React, { useState, useMemo } from 'react';
import {
  Search,
  RotateCcw,
  Clock,
  Layers,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Play,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  X,
  ShieldCheck,
  Database,
  Copy,
  Check,
  GitBranch,
  FileSpreadsheet,
  Cpu,
  Code2,
  Calendar,
  Activity,
  History
} from 'lucide-react';
import {
  SyncBatch,
  VerificationRecord,
  SyncException,
  SyncStatus,
  VerificationStatus,
  SyncMethod,
  TriggerType,
  ReconciliationStatus
} from '../../syncQualityTypes';
import { checkTimeRange } from '../../syncQualityData';

interface SyncLogsTabProps {
  batches: SyncBatch[];
  verifications: VerificationRecord[];
  exceptions: SyncException[];
  onOpenVerificationDrawer: (verificationId: string) => void;
  onOpenExceptionDrawer: (exceptionId: string) => void;
  selectedBatchId?: string | null;
  onSelectBatchId: (id: string | null) => void;
}

type DrawerTabKey =
  | 'OVERVIEW'
  | 'SCOPE_EXECUTION'
  | 'RECONCILIATION_VERIFICATION'
  | 'EXCEPTIONS_EVIDENCE';

export const SyncLogsTab: React.FC<SyncLogsTabProps> = ({
  batches,
  verifications,
  exceptions,
  onOpenVerificationDrawer,
  onOpenExceptionDrawer,
  selectedBatchId,
  onSelectBatchId
}) => {
  // 筛选状态
  const [sourceSystem, setSourceSystem] = useState<string>('ALL');
  const [objectType, setObjectType] = useState<string>('ALL');
  const [syncMethod, setSyncMethod] = useState<string>('ALL');
  const [executionStatus, setExecutionStatus] = useState<string>('ALL');
  const [triggerType, setTriggerType] = useState<string>('ALL');
  const [timeRange, setTimeRange] = useState<string>('ALL');
  const [searchBatchId, setSearchBatchId] = useState<string>('');

  // 详情抽屉内部 4 个规范页签
  const [activeDrawerTab, setActiveDrawerTab] = useState<DrawerTabKey>('OVERVIEW');
  // 折叠技术详情状态
  const [expandedTraceIds, setExpandedTraceIds] = useState<Record<string, boolean>>({});
  // 复制 TraceId 反馈
  const [copiedTraceId, setCopiedTraceId] = useState<string | null>(null);

  const handleResetFilters = () => {
    setSourceSystem('ALL');
    setObjectType('ALL');
    setSyncMethod('ALL');
    setExecutionStatus('ALL');
    setTriggerType('ALL');
    setTimeRange('ALL');
    setSearchBatchId('');
  };

  // 复制 TraceID
  const handleCopyTraceId = (traceId: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(traceId).catch(() => {});
    }
    setCopiedTraceId(traceId);
    setTimeout(() => {
      setCopiedTraceId(prev => (prev === traceId ? null : prev));
    }, 2000);
  };

  // 动态派生摘要指标
  const metrics = useMemo(() => {
    const sorted = [...batches].sort((a, b) => b.startTime.localeCompare(a.startTime));
    const latest = sorted[0];

    const todayBatches = batches.filter(b => checkTimeRange(b.startTime, 'TODAY'));
    const todayFull = todayBatches.filter(b => b.syncMethod === 'FULL').length;
    const todayInc = todayBatches.filter(b => b.syncMethod === 'INCREMENTAL').length;
    const todayComp = todayBatches.filter(b => b.syncMethod === 'COMPENSATION').length;

    const todaySuccess = todayBatches.filter(b => b.executionStatus === 'SUCCESS').length;
    const todayPartial = todayBatches.filter(b => b.executionStatus === 'PARTIAL_SUCCESS').length;
    const todayFailed = todayBatches.filter(b => b.executionStatus === 'FAILED').length;
    const todayRunning = todayBatches.filter(b => b.executionStatus === 'RUNNING').length;

    const pendingExceptions = exceptions.filter(e => e.status === 'PENDING');
    const highPending = pendingExceptions.filter(e => e.severity === 'HIGH').length;

    return {
      latestTimeText: latest ? latest.startTime.split(' ')[1]?.slice(0, 5) || latest.startTime : '--',
      latestBatchId: latest ? latest.id : '--',
      latestStatus: latest ? latest.executionStatus : 'SUCCESS',
      todayCount: todayBatches.length,
      todayFull,
      todayInc,
      todayComp,
      todaySuccess,
      todayPartial,
      todayFailed,
      todayRunning,
      pendingCount: pendingExceptions.length,
      highPendingCount: highPending
    };
  }, [batches, exceptions]);

  // 过滤数据
  const filteredBatches = useMemo(() => {
    return batches.filter(batch => {
      if (sourceSystem !== 'ALL' && batch.sourceSystem !== sourceSystem) return false;
      if (objectType !== 'ALL' && !batch.objectsSummary.includes(objectType)) return false;
      if (syncMethod !== 'ALL' && batch.syncMethod !== syncMethod) return false;
      if (executionStatus !== 'ALL' && batch.executionStatus !== executionStatus) return false;
      if (triggerType !== 'ALL' && batch.triggerType !== triggerType) return false;
      if (searchBatchId.trim()) {
        const q = searchBatchId.trim().toLowerCase();
        const matchId = batch.id.toLowerCase().includes(q);
        const matchJob = batch.jobCode?.toLowerCase().includes(q);
        if (!matchId && !matchJob) return false;
      }
      if (!checkTimeRange(batch.startTime, timeRange)) return false;
      return true;
    });
  }, [batches, sourceSystem, objectType, syncMethod, executionStatus, triggerType, timeRange, searchBatchId]);

  // 当前选中的批次详情
  const selectedBatch = useMemo(() => {
    return batches.find(b => b.id === selectedBatchId) || null;
  }, [batches, selectedBatchId]);

  // 该批次关联的所有核验记录
  const linkedVerifications = useMemo(() => {
    if (!selectedBatch) return [];
    return verifications.filter(v => v.linkedBatchId === selectedBatch.id);
  }, [verifications, selectedBatch]);

  // 查找与当前批次相关的重试子批次或父批次
  const lineageBatches = useMemo(() => {
    if (!selectedBatch) return { parent: null, children: [] as SyncBatch[] };
    const parent = selectedBatch.lineage?.parentExecutionId
      ? batches.find(b => b.id === selectedBatch.lineage?.parentExecutionId) || null
      : null;
    const children = batches.filter(b => b.lineage?.parentExecutionId === selectedBatch.id);
    return { parent, children };
  }, [batches, selectedBatch]);

  // 状态渲染辅助
  const renderSyncStatusBadge = (status: SyncStatus) => {
    switch (status) {
      case 'RUNNING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Play className="w-3 h-3 text-blue-600 animate-pulse fill-blue-600" />
            运行中
          </span>
        );
      case 'SUCCESS':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            成功
          </span>
        );
      case 'PARTIAL_SUCCESS':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            部分成功
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-600" />
            失败
          </span>
        );
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

  const renderTriggerTypeBadge = (type: TriggerType) => {
    switch (type) {
      case 'SCHEDULED':
        return <span className="text-slate-600 text-[11px] font-medium">定时调度</span>;
      case 'MANUAL':
        return <span className="text-blue-700 text-[11px] font-medium">手动触发</span>;
      case 'RETRY':
        return <span className="text-purple-700 text-[11px] font-semibold bg-purple-50 px-1 py-0.2 rounded border border-purple-200">重试执行</span>;
      case 'MANUAL_COMPENSATION':
        return <span className="text-amber-700 text-[11px] font-semibold bg-amber-50 px-1 py-0.2 rounded border border-amber-200">人工补偿</span>;
    }
  };

  const renderReconciliationBadge = (reconciliation?: { status: ReconciliationStatus; differenceCount: number }) => {
    if (!reconciliation) {
      return <span className="text-slate-400 text-xs">-</span>;
    }
    switch (reconciliation.status) {
      case 'BALANCED':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            已平衡
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
            <Clock className="w-3 h-3 text-blue-600 animate-pulse" />
            计算中
          </span>
        );
      case 'MISMATCH':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            差额 ({reconciliation.differenceCount})
          </span>
        );
      case 'NOT_APPLICABLE':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap">
            不适用
          </span>
        );
    }
  };

  const renderSyncMethodLabel = (method: SyncMethod) => {
    switch (method) {
      case 'FULL':
        return <span className="text-slate-800 font-medium whitespace-nowrap">全量同步</span>;
      case 'INCREMENTAL':
        return <span className="text-blue-700 font-medium whitespace-nowrap">增量同步</span>;
      case 'COMPENSATION':
        return <span className="text-amber-700 font-medium whitespace-nowrap">补偿同步</span>;
    }
  };

  const toggleTraceExpand = (traceId: string) => {
    setExpandedTraceIds(prev => ({
      ...prev,
      [traceId]: !prev[traceId]
    }));
  };

  return (
    <div className="space-y-4">
      {/* 顶部紧凑摘要带 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-white p-3.5 rounded-lg border border-slate-200 text-xs shadow-2xs">
        <div className="flex items-center space-x-3 pr-2 border-r border-slate-100 last:border-r-0">
          <div className="w-8 h-8 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-slate-400 font-medium text-[11px]">最近同步时间</div>
            <div className="text-slate-900 font-bold text-sm tracking-tight truncate">
              {metrics.latestTimeText}{' '}
              <span className="text-xs font-normal text-blue-600 ml-1">
                {metrics.latestBatchId} ({metrics.latestStatus === 'RUNNING' ? '运行中' : metrics.latestStatus === 'SUCCESS' ? '成功' : metrics.latestStatus === 'PARTIAL_SUCCESS' ? '部分成功' : '失败'})
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3 pr-2 border-r border-slate-100 last:border-r-0">
          <div className="w-8 h-8 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-slate-400 font-medium text-[11px]">今日同步批次数</div>
            <div className="text-slate-900 font-bold text-sm tracking-tight truncate">
              {metrics.todayCount}{' '}
              <span className="text-xs font-normal text-slate-500 ml-1">
                全量 {metrics.todayFull} / 增量 {metrics.todayInc} / 补偿 {metrics.todayComp}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3 pr-2 border-r border-slate-100 last:border-r-0">
          <div className="w-8 h-8 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-slate-400 font-medium text-[11px]">今日执行结果</div>
            <div className="text-slate-900 font-bold text-sm tracking-tight truncate">
              {metrics.todaySuccess} / {metrics.todayPartial} / {metrics.todayFailed}
              {metrics.todayRunning > 0 ? ` (+${metrics.todayRunning}运行中)` : ''}{' '}
              <span className="text-xs font-normal text-slate-500 ml-1">成功 / 部分 / 失败</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-md bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-slate-400 font-medium text-[11px]">待处理异常总数</div>
            <div className="text-slate-900 font-bold text-sm tracking-tight truncate">
              {metrics.pendingCount}{' '}
              <span className="text-xs font-normal text-rose-600 ml-1">高严重度 {metrics.highPendingCount} 条</span>
            </div>
          </div>
        </div>
      </div>

      {/* 顶部横向筛选区 */}
      <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5 items-end">
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

          {/* 同步方式 */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">同步方式</label>
            <select
              value={syncMethod}
              onChange={e => setSyncMethod(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all cursor-pointer"
            >
              <option value="ALL">全部同步方式</option>
              <option value="FULL">全量同步</option>
              <option value="INCREMENTAL">增量同步</option>
              <option value="COMPENSATION">补偿同步</option>
            </select>
          </div>

          {/* 触发方式 */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">触发方式</label>
            <select
              value={triggerType}
              onChange={e => setTriggerType(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all cursor-pointer"
            >
              <option value="ALL">全部触发方式</option>
              <option value="SCHEDULED">定时调度</option>
              <option value="MANUAL">手动触发</option>
              <option value="RETRY">重试执行</option>
              <option value="MANUAL_COMPENSATION">人工补偿</option>
            </select>
          </div>

          {/* 执行状态 */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">执行状态</label>
            <select
              value={executionStatus}
              onChange={e => setExecutionStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all cursor-pointer"
            >
              <option value="ALL">全部执行状态</option>
              <option value="RUNNING">运行中</option>
              <option value="SUCCESS">成功</option>
              <option value="PARTIAL_SUCCESS">部分成功</option>
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

          {/* 搜索与重置 */}
          <div className="flex items-center space-x-1.5">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="搜索批次/任务..."
                value={searchBatchId}
                onChange={e => setSearchBatchId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded pl-7 pr-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
            </div>
            <button
              onClick={handleResetFilters}
              title="重置筛选条件"
              className="p-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded transition-colors cursor-pointer shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 主表格容器 */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[1000px]">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-3.5 whitespace-nowrap">批次/执行编号</th>
                <th className="py-3 px-3 whitespace-nowrap">任务 / 来源系统</th>
                <th className="py-3 px-3 min-w-[120px]">对象范围</th>
                <th className="py-3 px-3 min-w-[76px] whitespace-nowrap">同步方式</th>
                <th className="py-3 px-3 min-w-[160px]">处理结果</th>
                <th className="py-3 px-3 whitespace-nowrap">开始时间 / 耗时</th>
                <th className="py-3 px-3 whitespace-nowrap">执行状态</th>
                <th className="py-3 px-3 whitespace-nowrap">核验状态</th>
                <th className="py-3 px-3.5 text-center sticky-ops whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBatches.length > 0 ? (
                filteredBatches.map(batch => (
                  <tr
                    key={batch.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      selectedBatchId === batch.id ? 'bg-blue-50/40' : ''
                    }`}
                  >
                    <td className="py-3 px-3.5 font-mono font-semibold text-blue-600 whitespace-nowrap">
                      <button
                        onClick={() => {
                          onSelectBatchId(batch.id);
                          setActiveDrawerTab('OVERVIEW');
                        }}
                        className="text-left font-mono font-bold hover:underline cursor-pointer flex items-center space-x-1"
                      >
                        <span>{batch.id}</span>
                        {batch.lineage?.parentExecutionId && (
                          <span className="px-1 py-0.2 rounded bg-purple-100 text-purple-800 text-[10px] font-sans font-semibold">
                            R{batch.lineage.attemptNo - 1}
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="font-mono text-[11px] font-semibold text-slate-800">{batch.jobCode}</div>
                      <div className="flex items-center space-x-1.5 mt-0.5">
                        <span className="text-slate-600 text-[11px]">{batch.sourceSystem}</span>
                        <span className="text-slate-300">·</span>
                        {renderTriggerTypeBadge(batch.triggerType)}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-wrap gap-1">
                        {batch.objectsSummary.map(obj => (
                          <span
                            key={obj}
                            className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-mono whitespace-nowrap"
                          >
                            {obj}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-3 min-w-[76px] whitespace-nowrap">{renderSyncMethodLabel(batch.syncMethod)}</td>
                    <td className="py-3 px-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-1 text-slate-700">
                          <span className="text-slate-400 text-[11px]">源:</span>
                          <span className="font-mono font-semibold">{batch.sourceDataCount.toLocaleString()}</span>
                          {batch.reconciliation?.status === 'MISMATCH' && (
                            <span className="px-1 py-0.2 rounded bg-rose-50 text-rose-700 font-semibold text-[10px] border border-rose-200">
                              数量不一致
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          <span className="text-emerald-700 font-medium">成 {batch.successCount.toLocaleString()}</span>
                          <span className="mx-1 text-slate-300">/</span>
                          <span className={batch.failedCount > 0 ? 'text-rose-600 font-bold' : 'text-slate-400'}>
                            败 {batch.failedCount}
                          </span>
                          <span className="mx-1 text-slate-300">/</span>
                          <span className={batch.skippedCount > 0 ? 'text-amber-700' : 'text-slate-400'}>
                            跳 {batch.skippedCount}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="text-slate-700">{batch.startTime}</div>
                      <div className="text-slate-400 font-mono text-[11px]">{batch.durationText}</div>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">{renderSyncStatusBadge(batch.executionStatus)}</td>
                    <td className="py-3 px-3 whitespace-nowrap">{renderVerificationStatusBadge(batch.verificationStatus)}</td>
                    <td className="py-3 px-3.5 text-center sticky-ops whitespace-nowrap">
                      <button
                        onClick={() => {
                          onSelectBatchId(batch.id);
                          setActiveDrawerTab('OVERVIEW');
                        }}
                        className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                      >
                        证据详情
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Database className="w-8 h-8 text-slate-300" />
                      <p className="text-xs font-medium text-slate-500">未找到符合当前筛选条件的同步批次记录</p>
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

      {/* 批次详情右侧抽屉 (重构为 4 个规范页签) */}
      {selectedBatch && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-[800px] h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200">
            {/* 抽屉头部 */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-md bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center space-x-2 flex-wrap">
                    <h2 className="text-sm font-bold text-slate-900 font-mono">{selectedBatch.id}</h2>
                    {renderSyncStatusBadge(selectedBatch.executionStatus)}
                    {renderReconciliationBadge(selectedBatch.reconciliation)}
                    {renderVerificationStatusBadge(selectedBatch.verificationStatus)}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    任务: <span className="font-mono font-medium text-slate-700">{selectedBatch.jobCode}</span> · 来源: {selectedBatch.sourceSystem} · 方式: {selectedBatch.syncMethod}
                  </p>
                </div>
              </div>
              <button
                onClick={() => onSelectBatchId(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 抽屉 4 个规范页签导航 (无数字编号) */}
            <div className="px-5 border-b border-slate-200 flex space-x-4 bg-white shrink-0 overflow-x-auto">
              <button
                onClick={() => setActiveDrawerTab('OVERVIEW')}
                className={`py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                  activeDrawerTab === 'OVERVIEW'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                执行概览
              </button>
              <button
                onClick={() => setActiveDrawerTab('SCOPE_EXECUTION')}
                className={`py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                  activeDrawerTab === 'SCOPE_EXECUTION'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                范围与执行
              </button>
              <button
                onClick={() => setActiveDrawerTab('RECONCILIATION_VERIFICATION')}
                className={`py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                  activeDrawerTab === 'RECONCILIATION_VERIFICATION'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                对账与核验 ({selectedBatch.objectDetails.length})
              </button>
              <button
                onClick={() => setActiveDrawerTab('EXCEPTIONS_EVIDENCE')}
                className={`py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer flex items-center space-x-1 ${
                  activeDrawerTab === 'EXCEPTIONS_EVIDENCE'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>异常与证据</span>
                {selectedBatch.failedRecords.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">
                    {selectedBatch.failedRecords.length}
                  </span>
                )}
              </button>
            </div>

            {/* 抽屉内容区 */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* 页签 1: 执行概览 */}
              {activeDrawerTab === 'OVERVIEW' && (
                <div className="space-y-4">
                  {/* 数据指标 4 列网格 */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
                      <div className="text-[11px] text-slate-500">源数据抽取数</div>
                      <div className="text-lg font-bold text-slate-900 font-mono mt-1">
                        {selectedBatch.sourceDataCount.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-emerald-50/60 border border-emerald-200 p-3 rounded-lg">
                      <div className="text-[11px] text-emerald-800">成功写入数量</div>
                      <div className="text-lg font-bold text-emerald-700 font-mono mt-1">
                        {selectedBatch.successCount.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-rose-50/60 border border-rose-200 p-3 rounded-lg">
                      <div className="text-[11px] text-rose-800">执行失败数量</div>
                      <div className="text-lg font-bold text-rose-600 font-mono mt-1">
                        {selectedBatch.failedCount}
                      </div>
                    </div>
                    <div className="bg-amber-50/60 border border-amber-200 p-3 rounded-lg">
                      <div className="text-[11px] text-amber-800">过滤跳过数量</div>
                      <div className="text-lg font-bold text-amber-700 font-mono mt-1">
                        {selectedBatch.skippedCount}
                      </div>
                    </div>
                  </div>

                  {/* 详细元信息 */}
                  <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
                    <h3 className="text-xs font-bold text-slate-900">执行身份与环境元信息</h3>
                    <div className="grid grid-cols-2 gap-y-2.5 text-xs">
                      <div>
                        <span className="text-slate-500">任务编码 (jobCode)：</span>
                        <span className="font-mono font-semibold text-slate-800 ml-1">{selectedBatch.jobCode}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">执行编号 (executionId)：</span>
                        <span className="font-mono font-semibold text-blue-600 ml-1">{selectedBatch.id}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">来源系统：</span>
                        <span className="font-medium text-slate-800 ml-1">{selectedBatch.sourceSystem}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">触发方式：</span>
                        <span className="ml-1">{renderTriggerTypeBadge(selectedBatch.triggerType)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">同步方式：</span>
                        <span className="font-medium text-slate-800 ml-1">{renderSyncMethodLabel(selectedBatch.syncMethod)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">对账状态：</span>
                        <span className="ml-1">{renderReconciliationBadge(selectedBatch.reconciliation)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">执行状态：</span>
                        <span className="ml-1">{renderSyncStatusBadge(selectedBatch.executionStatus)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">核验状态：</span>
                        <span className="ml-1">{renderVerificationStatusBadge(selectedBatch.verificationStatus)}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-500">对象范围：</span>
                        <span className="font-mono text-slate-800 ml-1">
                          {selectedBatch.objectsSummary.join(', ')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 状态边界明确说明 */}
                  {selectedBatch.statusNote && (
                    <div className="bg-blue-50/80 border border-blue-200 p-3.5 rounded-lg text-xs text-blue-900 flex items-start space-x-2">
                      <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">状态独立判断声明：</span>
                        <p className="mt-0.5 text-blue-800 leading-relaxed">{selectedBatch.statusNote}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 页签 2: 范围与执行 */}
              {activeDrawerTab === 'SCOPE_EXECUTION' && (
                <div className="space-y-4">
                  {/* 区块 1: 同步范围与水位 */}
                  <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 text-xs">
                    <h3 className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <span>同步数据范围与业务水位合同</span>
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-y-3 pt-1">
                      {/* 全量同步范围证据反馈 */}
                      {selectedBatch.syncMethod === 'FULL' && (
                        <>
                          {selectedBatch.sourceDataCutoffAt && (
                            <div className="col-span-2 bg-slate-50 p-2.5 rounded border border-slate-200">
                              <span className="text-slate-500">数据截止时间 (sourceDataCutoffAt)：</span>
                              <span className="font-mono font-semibold text-slate-900 ml-1">{selectedBatch.sourceDataCutoffAt}</span>
                            </div>
                          )}

                          {selectedBatch.sourceSnapshotAt && (
                            <div className="col-span-2 bg-slate-50 p-2.5 rounded border border-slate-200">
                              <span className="text-slate-500">源端一致性快照点 (sourceSnapshotAt)：</span>
                              <span className="font-mono font-semibold text-slate-900 ml-1">{selectedBatch.sourceSnapshotAt}</span>
                            </div>
                          )}

                          {!selectedBatch.sourceDataCutoffAt && !selectedBatch.sourceSnapshotAt && (
                            <div className="col-span-2 bg-amber-50/70 border border-amber-200 p-3 rounded-lg text-amber-900 space-y-1">
                              <div className="font-bold flex items-center space-x-1.5 text-amber-800">
                                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                                <span>范围证据缺失</span>
                              </div>
                              <p className="text-[11px] text-amber-700 leading-relaxed">
                                该批次未记录数据截止时间或源端一致性快照点，无法完整确认本次全量同步的数据边界。
                              </p>
                            </div>
                          )}
                        </>
                      )}

                      {/* 增量/补偿同步范围与水位证据反馈 */}
                      {selectedBatch.syncMethod !== 'FULL' && (
                        <>
                          {selectedBatch.dataWindowStart && (
                            <div>
                              <span className="text-slate-500">增量窗口起始 (dataWindowStart)：</span>
                              <div className="font-mono font-semibold text-slate-800 mt-0.5">{selectedBatch.dataWindowStart}</div>
                            </div>
                          )}

                          {selectedBatch.dataWindowEnd && (
                            <div>
                              <span className="text-slate-500">增量窗口截止 (dataWindowEnd)：</span>
                              <div className="font-mono font-semibold text-slate-800 mt-0.5">{selectedBatch.dataWindowEnd}</div>
                            </div>
                          )}

                          {selectedBatch.watermarkType && (
                            <div>
                              <span className="text-slate-500">增量水位类型 (watermarkType)：</span>
                              <div className="font-mono font-bold text-purple-700 mt-0.5">{selectedBatch.watermarkType}</div>
                            </div>
                          )}

                          {(selectedBatch.watermarkStart || selectedBatch.watermarkEnd) && (
                            <div>
                              <span className="text-slate-500">起止水位区间：</span>
                              <div className="font-mono font-bold text-blue-700 mt-0.5">
                                {selectedBatch.watermarkStart || '-'} <span className="text-slate-400">至</span> {selectedBatch.watermarkEnd || '-'}
                              </div>
                            </div>
                          )}

                          {(!selectedBatch.dataWindowStart || !selectedBatch.dataWindowEnd || !selectedBatch.watermarkType || (!selectedBatch.watermarkStart && !selectedBatch.watermarkEnd)) && (
                            <div className="col-span-2 bg-amber-50/70 border border-amber-200 p-3 rounded-lg text-amber-900 space-y-1">
                              <div className="font-bold flex items-center space-x-1.5 text-amber-800">
                                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                                <span>增量范围证据缺失</span>
                              </div>
                              <p className="text-[11px] text-amber-700 leading-relaxed">
                                该批次未记录完整的时间窗口或增量业务水位，无法追溯增量抽取范围与连续性。
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                      <div className="font-semibold text-slate-700 mb-1.5">涵盖根对象与软类型分布：</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {selectedBatch.objectDetails.map((od, i) => (
                          <div key={i} className="bg-slate-50 p-2 rounded border border-slate-200 flex items-center justify-between text-xs">
                            <div>
                              <span className="font-semibold text-slate-900">{od.objectType}</span>
                              <span className="text-slate-500 ml-1">({od.softType})</span>
                            </div>
                            <span className="font-mono text-slate-600 text-[11px]">{od.extractedCount.toLocaleString()} 条</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 区块 2: 执行时间、血缘与轨迹 */}
                  <div className="bg-white border border-slate-200 rounded-lg p-4 text-xs space-y-3">
                    <h3 className="font-bold text-slate-900 flex items-center space-x-1.5">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <span>执行时间与重试血缘</span>
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div>
                        <span className="text-slate-400">计划调度时间：</span>
                        <div className="font-mono font-medium text-slate-800">{selectedBatch.scheduledAt || '-'}</div>
                      </div>
                      <div>
                        <span className="text-slate-400">实际开始时间：</span>
                        <div className="font-mono font-medium text-slate-800">{selectedBatch.startTime}</div>
                      </div>
                      <div>
                        <span className="text-slate-400">实际结束时间：</span>
                        <div className="font-mono font-medium text-slate-800">{selectedBatch.endTime || '运行中...'}</div>
                      </div>
                      <div>
                        <span className="text-slate-400">累计执行耗时：</span>
                        <div className="font-mono font-bold text-blue-700">{selectedBatch.durationText}</div>
                      </div>
                    </div>

                    {/* 重试血缘卡片 */}
                    {selectedBatch.lineage && (
                      <div className="bg-purple-50/50 border border-purple-200 rounded-lg p-3 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-purple-900 flex items-center space-x-1.5">
                            <GitBranch className="w-3.5 h-3.5 text-purple-700" />
                            <span>重试执行血缘 (RetryLineage)</span>
                          </h4>
                          <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-semibold text-[11px]">
                            第 {selectedBatch.lineage.attemptNo} 次执行
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-purple-950">
                          <div>
                            <span className="text-purple-700">根执行编号 (rootExecutionId)：</span>
                            <span className="font-mono font-bold ml-1">{selectedBatch.lineage.rootExecutionId}</span>
                          </div>
                          <div>
                            <span className="text-purple-700">触发操作人：</span>
                            <span className="font-medium ml-1">{selectedBatch.lineage.triggeredBy}</span>
                          </div>
                          {selectedBatch.lineage.parentExecutionId && (
                            <div className="col-span-2 flex items-center space-x-2 pt-1 border-t border-purple-200/60">
                              <span className="text-purple-700">来源父执行：</span>
                              <button
                                onClick={() => {
                                  onSelectBatchId(selectedBatch.lineage!.parentExecutionId!);
                                  setActiveDrawerTab('SCOPE_EXECUTION');
                                }}
                                className="font-mono font-bold text-blue-600 hover:underline cursor-pointer inline-flex items-center space-x-1"
                              >
                                <span>{selectedBatch.lineage.parentExecutionId}</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>
                              {selectedBatch.lineage.triggerReason && (
                                <span className="text-slate-600 ml-2">({selectedBatch.lineage.triggerReason})</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 如果是父批次且有重试子批次 */}
                    {lineageBatches.children.length > 0 && (
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-2">
                        <div className="font-bold text-slate-800 flex items-center space-x-1">
                          <History className="w-3.5 h-3.5 text-purple-600" />
                          <span>已衍生重试子执行 ({lineageBatches.children.length})：</span>
                        </div>
                        {lineageBatches.children.map(child => (
                          <div key={child.id} className="bg-white p-2.5 rounded border border-slate-200 flex items-center justify-between">
                            <div>
                              <span className="font-mono font-bold text-purple-700">{child.id}</span>
                              <span className="text-slate-500 text-[11px] ml-2">第 {child.lineage?.attemptNo} 次执行 · {child.startTime}</span>
                            </div>
                            <button
                              onClick={() => {
                                onSelectBatchId(child.id);
                                setActiveDrawerTab('OVERVIEW');
                              }}
                              className="text-blue-600 hover:underline font-semibold cursor-pointer"
                            >
                              查看子执行 &rarr;
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 阶段时间线 */}
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <h4 className="font-bold text-slate-900">执行阶段时间线</h4>
                      <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                        {selectedBatch.timeline.map((step, idx) => (
                          <div key={idx} className="relative text-xs">
                            <div
                              className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                step.status === 'DONE'
                                  ? 'bg-emerald-600 text-white'
                                  : step.status === 'CURRENT'
                                  ? 'bg-blue-600 text-white animate-pulse'
                                  : step.status === 'ERROR'
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-slate-200 text-slate-500'
                              }`}
                            >
                              {idx + 1}
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900">{step.step}</span>
                              <span className="font-mono text-slate-400 text-[11px]">{step.timestamp}</span>
                            </div>
                            <p className="text-slate-600 mt-0.5 leading-relaxed">{step.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 区块 3: 配置版本快照 */}
                  <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                        <Code2 className="w-4 h-4 text-purple-600" />
                        <span>同步执行配置快照 (不可变证据)</span>
                      </h3>
                      {selectedBatch.configSnapshotId ? (
                        <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-mono font-bold text-[11px] border border-purple-200">
                          {selectedBatch.configSnapshotId}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-bold text-[11px] border border-amber-200 flex items-center space-x-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span>快照编号缺失</span>
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      <div className="bg-slate-50 p-3 rounded border border-slate-200 flex flex-col justify-between">
                        <div className="text-slate-400 text-[11px]">对象映射版本</div>
                        {selectedBatch.objectMappingVersion ? (
                          <div className="font-mono font-bold text-slate-800 text-sm mt-1">
                            {selectedBatch.objectMappingVersion}
                          </div>
                        ) : (
                          <div className="mt-1">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              配置证据缺失
                            </span>
                            <p className="text-[10px] text-amber-600 mt-1 leading-tight">
                              该批次未记录对应配置版本，无法完整追溯历史执行口径。
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="bg-slate-50 p-3 rounded border border-slate-200 flex flex-col justify-between">
                        <div className="text-slate-400 text-[11px]">字段映射版本</div>
                        {selectedBatch.fieldMappingVersion ? (
                          <div className="font-mono font-bold text-slate-800 text-sm mt-1">
                            {selectedBatch.fieldMappingVersion}
                          </div>
                        ) : (
                          <div className="mt-1">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              配置证据缺失
                            </span>
                            <p className="text-[10px] text-amber-600 mt-1 leading-tight">
                              该批次未记录对应配置版本，无法完整追溯历史执行口径。
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="bg-slate-50 p-3 rounded border border-slate-200 flex flex-col justify-between">
                        <div className="text-slate-400 text-[11px]">同步引擎配置版本</div>
                        {selectedBatch.syncConfigVersion ? (
                          <div className="font-mono font-bold text-slate-800 text-sm mt-1">
                            {selectedBatch.syncConfigVersion}
                          </div>
                        ) : (
                          <div className="mt-1">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              配置证据缺失
                            </span>
                            <p className="text-[10px] text-amber-600 mt-1 leading-tight">
                              该批次未记录对应配置版本，无法完整追溯历史执行口径。
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 页签 3: 对账与核验 */}
              {activeDrawerTab === 'RECONCILIATION_VERIFICATION' && (
                <div className="space-y-4">
                  {/* 对账汇总卡片 */}
                  <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                        <span>批次数量对账结论</span>
                      </h3>
                      {renderReconciliationBadge(selectedBatch.reconciliation)}
                    </div>

                    {selectedBatch.reconciliation?.formula && (
                      <div className="bg-emerald-50/70 border border-emerald-200 p-3 rounded-lg text-emerald-950 font-mono text-xs">
                        <span className="font-bold">对账平衡公式：</span>
                        <div className="mt-1 font-semibold text-emerald-800">{selectedBatch.reconciliation.formula}</div>
                      </div>
                    )}

                    {selectedBatch.reconciliation?.explanation && (
                      <div className="bg-blue-50/70 border border-blue-200 p-3 rounded-lg text-blue-950 text-xs">
                        <span className="font-bold">对账说明：</span>
                        <div className="mt-1 text-blue-800">{selectedBatch.reconciliation.explanation}</div>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-2 text-center pt-1">
                      <div className="bg-slate-50 p-2 rounded border border-slate-200">
                        <div className="text-[11px] text-slate-500">新增 (Inserted)</div>
                        <div className="font-mono font-bold text-emerald-700 mt-0.5">{selectedBatch.insertedCount.toLocaleString()}</div>
                      </div>
                      <div className="bg-slate-50 p-2 rounded border border-slate-200">
                        <div className="text-[11px] text-slate-500">更新/替换 (Updated)</div>
                        <div className="font-mono font-bold text-blue-700 mt-0.5">{selectedBatch.updatedCount.toLocaleString()}</div>
                      </div>
                      <div className="bg-slate-50 p-2 rounded border border-slate-200">
                        <div className="text-[11px] text-slate-500">删除 (Deleted)</div>
                        <div className="font-mono font-bold text-slate-600 mt-0.5">{selectedBatch.deletedCount.toLocaleString()}</div>
                      </div>
                    </div>
                  </div>

                  {/* 对象级明细表格 */}
                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                    <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800">
                      对象与软类型级数量分布
                    </div>
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold">
                        <tr>
                          <th className="py-2.5 px-3">对象类型</th>
                          <th className="py-2.5 px-3">软类型</th>
                          <th className="py-2.5 px-3 text-right">抽取数</th>
                          <th className="py-2.5 px-3 text-right">新增</th>
                          <th className="py-2.5 px-3 text-right">更新</th>
                          <th className="py-2.5 px-3 text-right">删除</th>
                          <th className="py-2.5 px-3 text-right">失败</th>
                          <th className="py-2.5 px-3 text-right">跳过</th>
                          <th className="py-2.5 px-3">状态</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedBatch.objectDetails.map((obj, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/60">
                            <td className="py-2.5 px-3 font-medium text-slate-800">{obj.objectType}</td>
                            <td className="py-2.5 px-3 text-slate-600">{obj.softType}</td>
                            <td className="py-2.5 px-3 text-right font-mono">{obj.extractedCount.toLocaleString()}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-emerald-700">{obj.insertedCount.toLocaleString()}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-blue-700">{obj.updatedCount.toLocaleString()}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-500">{obj.deletedCount}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-semibold">
                              {obj.failedCount > 0 ? (
                                <span className="text-rose-600">{obj.failedCount}</span>
                              ) : (
                                <span className="text-slate-400">0</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-500">{obj.skippedCount}</td>
                            <td className="py-2.5 px-3">{renderSyncStatusBadge(obj.status)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* 关联核验卡片 */}
                  {linkedVerifications.length > 0 && (
                    <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-2 text-xs">
                      <div className="font-bold text-slate-800 flex items-center space-x-1.5">
                        <ShieldCheck className="w-4 h-4 text-blue-600" />
                        <span>挂载的一致性核验单 ({linkedVerifications.length})：</span>
                      </div>
                      {linkedVerifications.map(ver => (
                        <div key={ver.id} className="bg-slate-50 p-2.5 rounded border border-slate-200 flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-bold text-blue-600">{ver.id}</span>
                            <span className="px-1.5 py-0.5 rounded bg-white text-slate-700 text-[11px] border border-slate-200">
                              {ver.methodLabel}
                            </span>
                            {renderVerificationStatusBadge(ver.result)}
                          </div>
                          <button
                            onClick={() => {
                              onSelectBatchId(null);
                              onOpenVerificationDrawer(ver.id);
                            }}
                            className="text-blue-600 hover:text-blue-800 font-semibold cursor-pointer inline-flex items-center space-x-1"
                          >
                            <span>查看核验 &rarr;</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 页签 4: 异常与证据 */}
              {activeDrawerTab === 'EXCEPTIONS_EVIDENCE' && (
                <div className="space-y-3">
                  {selectedBatch.failedRecords.length > 0 ? (
                    selectedBatch.failedRecords.map(rec => (
                      <div key={rec.id} className="border border-rose-200 bg-rose-50/30 rounded-lg p-4 space-y-2.5 text-xs">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-2 flex-wrap">
                            <span className="font-mono font-bold text-rose-700 text-sm">{rec.objectCode}</span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px]">
                              {rec.objectType} / {rec.softType}
                            </span>
                            {rec.errorCode && (
                              <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-mono font-semibold text-[11px]">
                                {rec.errorCode}
                              </span>
                            )}
                            {rec.retryable !== undefined && (
                              <span className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${rec.retryable ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                                {rec.retryable ? '可重试' : '不可自动重试'}
                              </span>
                            )}
                          </div>
                          {rec.linkedExceptionId && (
                            <button
                              onClick={() => {
                                onSelectBatchId(null);
                                onOpenExceptionDrawer(rec.linkedExceptionId!);
                              }}
                              className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                            >
                              <span>跳转异常单 ({rec.linkedExceptionId})</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        <div className="text-slate-800 font-medium leading-relaxed">
                          <span className="text-rose-700 font-semibold">业务失败原因：</span>
                          {rec.businessReason}
                        </div>

                        {rec.owner && (
                          <div className="text-slate-600 text-[11px]">
                            <span className="text-slate-400">责任人/责任组：</span>
                            <span className="font-medium text-slate-800 ml-1">{rec.owner}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-rose-100">
                          <div className="flex items-center space-x-2">
                            <span>Trace ID:</span>
                            <code className="font-mono text-slate-800 font-semibold bg-white px-1.5 py-0.5 rounded border border-slate-200">
                              {rec.traceId}
                            </code>
                            <button
                              onClick={() => handleCopyTraceId(rec.traceId)}
                              title="复制 Trace ID"
                              className="p-1 hover:bg-slate-200/70 rounded transition-colors text-slate-600 cursor-pointer"
                            >
                              {copiedTraceId === rec.traceId ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                            {copiedTraceId === rec.traceId && (
                              <span className="text-emerald-600 text-[10px] font-semibold">已复制</span>
                            )}
                          </div>

                          {rec.techDetail && (
                            <button
                              onClick={() => toggleTraceExpand(rec.traceId)}
                              className="text-slate-600 hover:text-slate-900 inline-flex items-center space-x-0.5 cursor-pointer font-medium"
                            >
                              <span>{expandedTraceIds[rec.traceId] ? '收起高级技术信息' : '展开高级技术信息'}</span>
                              {expandedTraceIds[rec.traceId] ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>

                        {rec.techDetail && expandedTraceIds[rec.traceId] && (
                          <div className="mt-2 bg-slate-900 text-slate-200 p-3 rounded font-mono text-[11px] overflow-x-auto shadow-inner">
                            <pre className="whitespace-pre-wrap">{rec.techDetail}</pre>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="py-12 text-center text-slate-400 text-xs">
                      <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto mb-1.5" />
                      本批次未产生同步异常，所有数据项处理正常
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 抽屉底部操作 */}
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <div className="text-xs text-slate-500">
                不可变配置快照：<span className="font-mono text-slate-700">{selectedBatch.configSnapshotId || '未记录'}</span>
              </div>
              <button
                onClick={() => onSelectBatchId(null)}
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
