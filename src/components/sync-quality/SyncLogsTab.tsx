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
  FileCode,
  ShieldCheck,
  Calendar,
  Database
} from 'lucide-react';
import {
  SyncBatch,
  SyncStatus,
  VerificationStatus,
  SyncMethod
} from '../../syncQualityTypes';

interface SyncLogsTabProps {
  batches: SyncBatch[];
  onOpenVerificationDrawer: (verificationId: string) => void;
  onOpenExceptionDrawer: (exceptionId: string) => void;
  selectedBatchId?: string | null;
  onSelectBatchId: (id: string | null) => void;
}

export const SyncLogsTab: React.FC<SyncLogsTabProps> = ({
  batches,
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
  const [searchBatchId, setSearchBatchId] = useState<string>('');

  // 详情抽屉内部页签
  const [activeDrawerTab, setActiveDrawerTab] = useState<'OVERVIEW' | 'OBJECTS' | 'FAILS' | 'VERIFICATION' | 'TRAJECTORY'>('OVERVIEW');
  // 折叠技术详情状态
  const [expandedTraceIds, setExpandedTraceIds] = useState<Record<string, boolean>>({});

  const handleResetFilters = () => {
    setSourceSystem('ALL');
    setObjectType('ALL');
    setSyncMethod('ALL');
    setExecutionStatus('ALL');
    setSearchBatchId('');
  };

  // 过滤数据
  const filteredBatches = useMemo(() => {
    return batches.filter(batch => {
      if (sourceSystem !== 'ALL' && batch.sourceSystem !== sourceSystem) return false;
      if (objectType !== 'ALL' && !batch.objectsSummary.includes(objectType)) return false;
      if (syncMethod !== 'ALL' && batch.syncMethod !== syncMethod) return false;
      if (executionStatus !== 'ALL' && batch.executionStatus !== executionStatus) return false;
      if (searchBatchId.trim() && !batch.id.toLowerCase().includes(searchBatchId.trim().toLowerCase())) return false;
      return true;
    });
  }, [batches, sourceSystem, objectType, syncMethod, executionStatus, searchBatchId]);

  // 当前选中的批次详情
  const selectedBatch = useMemo(() => {
    return batches.find(b => b.id === selectedBatchId) || null;
  }, [batches, selectedBatchId]);

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

  const renderSyncMethodLabel = (method: SyncMethod) => {
    switch (method) {
      case 'FULL':
        return <span className="text-slate-800 font-medium">全量同步</span>;
      case 'INCREMENTAL':
        return <span className="text-blue-700 font-medium">增量同步</span>;
      case 'COMPENSATION':
        return <span className="text-amber-700 font-medium">补偿同步</span>;
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
              16:20 <span className="text-xs font-normal text-blue-600 ml-1">SYNC-20260825-005 (运行中)</span>
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
              5 <span className="text-xs font-normal text-slate-500 ml-1">全量 1 / 增量 3 / 补偿 1</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3 pr-2 border-r border-slate-100 last:border-r-0">
          <div className="w-8 h-8 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-slate-400 font-medium text-[11px]">批次执行结果</div>
            <div className="text-slate-900 font-bold text-sm tracking-tight truncate">
              2 / 2 / 1 <span className="text-xs font-normal text-slate-500 ml-1">成功 / 部分成功 / 失败</span>
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
              4 <span className="text-xs font-normal text-rose-600 ml-1">高严重度 2 条</span>
            </div>
          </div>
        </div>
      </div>

      {/* 顶部横向筛选区 */}
      <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 items-end">
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

          {/* 批次编号 */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">批次编号</label>
            <div className="relative">
              <input
                type="text"
                placeholder="搜索 SYNC-..."
                value={searchBatchId}
                onChange={e => setSearchBatchId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded pl-7 pr-2.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
            </div>
          </div>

          {/* 按钮动作 */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleResetFilters}
              className="flex-1 flex items-center justify-center space-x-1 px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded text-xs font-semibold transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>重置</span>
            </button>
          </div>
        </div>
      </div>

      {/* 主表格容器 */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-3.5">批次编号</th>
                <th className="py-3 px-3">来源系统</th>
                <th className="py-3 px-3">对象范围</th>
                <th className="py-3 px-3">方式</th>
                <th className="py-3 px-3 text-right">源数据量</th>
                <th className="py-3 px-3 text-right">成功数</th>
                <th className="py-3 px-3 text-right">失败数</th>
                <th className="py-3 px-3 text-right">跳过数</th>
                <th className="py-3 px-3">开始时间</th>
                <th className="py-3 px-3">耗时</th>
                <th className="py-3 px-3">执行状态</th>
                <th className="py-3 px-3">核验状态</th>
                <th className="py-3 px-3.5 text-center sticky-ops">操作</th>
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
                    <td className="py-3 px-3.5 font-mono font-semibold text-blue-600 hover:underline cursor-pointer">
                      <button
                        onClick={() => {
                          onSelectBatchId(batch.id);
                          setActiveDrawerTab('OVERVIEW');
                        }}
                        className="text-left font-mono font-bold"
                      >
                        {batch.id}
                      </button>
                    </td>
                    <td className="py-3 px-3 text-slate-700 font-medium">{batch.sourceSystem}</td>
                    <td className="py-3 px-3">
                      <div className="flex flex-wrap gap-1">
                        {batch.objectsSummary.map(obj => (
                          <span
                            key={obj}
                            className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-mono"
                          >
                            {obj}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-3">{renderSyncMethodLabel(batch.syncMethod)}</td>
                    <td className="py-3 px-3 text-right font-mono font-medium text-slate-900">
                      {batch.sourceDataCount.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-medium text-emerald-700">
                      {batch.successCount.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-semibold">
                      {batch.failedCount > 0 ? (
                        <span className="text-rose-600 bg-rose-50 px-1 rounded">{batch.failedCount}</span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-500">
                      {batch.skippedCount > 0 ? (
                        <span className="text-amber-700 font-medium">{batch.skippedCount}</span>
                      ) : (
                        <span>0</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-600 whitespace-nowrap">{batch.startTime}</td>
                    <td className="py-3 px-3 text-slate-600 font-mono whitespace-nowrap">
                      {batch.executionStatus === 'RUNNING' ? (
                        <span className="text-blue-600 font-semibold">{batch.durationText}</span>
                      ) : (
                        batch.durationText
                      )}
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
                        查看详情
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-400">
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

      {/* 批次详情右侧抽屉 */}
      {selectedBatch && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-[760px] h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200">
            {/* 抽屉头部 */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-md bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-sm font-bold text-slate-900 font-mono">{selectedBatch.id}</h2>
                    {renderSyncStatusBadge(selectedBatch.executionStatus)}
                    {renderVerificationStatusBadge(selectedBatch.verificationStatus)}
                  </div>
                  <p className="text-xs text-slate-500">来源: {selectedBatch.sourceSystem} · 方式: {selectedBatch.syncMethod}</p>
                </div>
              </div>
              <button
                onClick={() => onSelectBatchId(null)}
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
                批次概览
              </button>
              <button
                onClick={() => setActiveDrawerTab('OBJECTS')}
                className={`py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                  activeDrawerTab === 'OBJECTS'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                对象明细 ({selectedBatch.objectDetails.length})
              </button>
              <button
                onClick={() => setActiveDrawerTab('FAILS')}
                className={`py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                  activeDrawerTab === 'FAILS'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                失败记录 ({selectedBatch.failedRecords.length})
              </button>
              <button
                onClick={() => setActiveDrawerTab('VERIFICATION')}
                className={`py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                  activeDrawerTab === 'VERIFICATION'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                关联核验
              </button>
              <button
                onClick={() => setActiveDrawerTab('TRAJECTORY')}
                className={`py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                  activeDrawerTab === 'TRAJECTORY'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                执行轨迹
              </button>
            </div>

            {/* 抽屉内容区 */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* 页签 1: 批次概览 */}
              {activeDrawerTab === 'OVERVIEW' && (
                <div className="space-y-4">
                  {/* 数据指标 4 列网格 */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
                      <div className="text-[11px] text-slate-500">源数据抽取总量</div>
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
                    <h3 className="text-xs font-bold text-slate-900">执行元信息</h3>
                    <div className="grid grid-cols-2 gap-y-2.5 text-xs">
                      <div>
                        <span className="text-slate-500">来源系统：</span>
                        <span className="font-medium text-slate-800 ml-1">{selectedBatch.sourceSystem}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">同步方式：</span>
                        <span className="font-medium text-slate-800 ml-1">{selectedBatch.syncMethod}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">开始时间：</span>
                        <span className="font-mono text-slate-800 ml-1">{selectedBatch.startTime}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">结束时间：</span>
                        <span className="font-mono text-slate-800 ml-1">{selectedBatch.endTime || '正在运行中...'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">执行状态：</span>
                        <span className="ml-1">{renderSyncStatusBadge(selectedBatch.executionStatus)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">核验状态：</span>
                        <span className="ml-1">{renderVerificationStatusBadge(selectedBatch.verificationStatus)}</span>
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

              {/* 页签 2: 对象明细 */}
              {activeDrawerTab === 'OBJECTS' && (
                <div className="space-y-3">
                  <div className="text-xs text-slate-500">
                    同一个同步批次内可包含多个根对象与软类型。下表真实体现对象级抽取与写入状态：
                  </div>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                        <tr>
                          <th className="py-2.5 px-3">对象类型</th>
                          <th className="py-2.5 px-3">软类型</th>
                          <th className="py-2.5 px-3 text-right">抽取数</th>
                          <th className="py-2.5 px-3 text-right">新增</th>
                          <th className="py-2.5 px-3 text-right">更新/替换</th>
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
                </div>
              )}

              {/* 页签 3: 失败记录 */}
              {activeDrawerTab === 'FAILS' && (
                <div className="space-y-3">
                  {selectedBatch.failedRecords.length > 0 ? (
                    selectedBatch.failedRecords.map(rec => (
                      <div key={rec.id} className="border border-rose-200 bg-rose-50/30 rounded-lg p-3.5 space-y-2 text-xs">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-bold text-rose-700">{rec.objectCode}</span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px]">
                              {rec.objectType} / {rec.softType}
                            </span>
                          </div>
                          {rec.linkedExceptionId && (
                            <button
                              onClick={() => {
                                onSelectBatchId(null);
                                onOpenExceptionDrawer(rec.linkedExceptionId!);
                              }}
                              className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                            >
                              <span>查看异常 ({rec.linkedExceptionId})</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        <div className="text-slate-800 font-medium leading-relaxed">
                          <span className="text-rose-700 font-semibold">失败原因：</span>
                          {rec.businessReason}
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-rose-100">
                          <span>跟踪编号 (Trace ID): <code className="font-mono text-slate-700">{rec.traceId}</code></span>
                          {rec.techDetail && (
                            <button
                              onClick={() => toggleTraceExpand(rec.traceId)}
                              className="text-slate-600 hover:text-slate-900 inline-flex items-center space-x-0.5 cursor-pointer"
                            >
                              <span>{expandedTraceIds[rec.traceId] ? '收起技术详情' : '展开技术详情'}</span>
                              {expandedTraceIds[rec.traceId] ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>

                        {rec.techDetail && expandedTraceIds[rec.traceId] && (
                          <div className="mt-2 bg-slate-900 text-slate-200 p-2.5 rounded font-mono text-[11px] overflow-x-auto">
                            <pre className="whitespace-pre-wrap">{rec.techDetail}</pre>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                      该批次无写入失败记录
                    </div>
                  )}
                </div>
              )}

              {/* 页签 4: 关联核验 */}
              {activeDrawerTab === 'VERIFICATION' && (
                <div className="space-y-3">
                  {selectedBatch.linkedVerificationId ? (
                    <div className="border border-slate-200 bg-white rounded-lg p-4 space-y-3 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-blue-600 text-sm">{selectedBatch.linkedVerificationId}</span>
                          {renderVerificationStatusBadge(selectedBatch.verificationStatus)}
                        </div>
                        <button
                          onClick={() => {
                            onSelectBatchId(null);
                            onOpenVerificationDrawer(selectedBatch.linkedVerificationId!);
                          }}
                          className="px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded font-semibold transition-colors inline-flex items-center space-x-1 cursor-pointer"
                        >
                          <span>进入一致性核验详情</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-slate-600 leading-relaxed">
                        该批次已自动挂载并完成一致性指纹核验。点击上方按钮可跳转至「一致性核验」页签查看详细的多对象分布与字段级对比数据。
                      </p>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      <p>当前批次尚未生成关联的一致性核验单。</p>
                      {selectedBatch.executionStatus === 'RUNNING' ? (
                        <p className="text-blue-600 mt-1">批次正在运行中，待执行完毕后可发起核验。</p>
                      ) : (
                        <p className="text-slate-500 mt-1">您可在「一致性核验」页签中点击“发起核验”对该批次进行比对。</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 页签 5: 执行轨迹 */}
              {activeDrawerTab === 'TRAJECTORY' && (
                <div className="space-y-4">
                  <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
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
              )}
            </div>

            {/* 抽屉底部操作 */}
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end space-x-3 shrink-0">
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
