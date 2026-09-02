import React, { useState, useMemo } from 'react';
import {
  Search,
  Settings2,
  Database,
  Layers,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Info,
  RefreshCw,
  Eye,
  ChevronDown,
  AlertOctagon,
  RotateCcw,
  X,
  Sparkles
} from 'lucide-react';
import {
  MappingObjectType,
  SourceSystemInfo,
  SyncErrorRecord
} from '../../stage1MappingTypes';

interface ObjectTypeListViewProps {
  sourceSystems: SourceSystemInfo[];
  mappingObjects: MappingObjectType[];
  onSelectRootType: (rootTypeId: string) => void;
  onOpenQueryPreview: (rootTypeId: string) => void;
  onTriggerSync: (rootTypeId: string, mode?: 'NORMAL' | 'WITH_ERRORS' | 'FATAL_FAIL') => void;
  onNavigateToSyncQuality: (batchId?: string) => void;
  hasPermission?: boolean;
}

export const ObjectTypeListView: React.FC<ObjectTypeListViewProps> = ({
  sourceSystems,
  mappingObjects,
  onSelectRootType,
  onOpenQueryPreview,
  onTriggerSync,
  onNavigateToSyncQuality,
  hasPermission = true
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSystemId, setSelectedSystemId] = useState<string>('ALL');
  const [showLifecycleGuide, setShowLifecycleGuide] = useState(false);
  const [viewingErrorsRootType, setViewingErrorsRootType] = useState<MappingObjectType | null>(null);

  // 过滤后的根类型列表
  const filteredRootTypes = useMemo(() => {
    return mappingObjects.filter(root => {
      if (selectedSystemId !== 'ALL' && root.sourceSystemId !== selectedSystemId) {
        return false;
      }
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        return (
          root.name.toLowerCase().includes(term) ||
          root.code.toLowerCase().includes(term) ||
          root.description.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [mappingObjects, selectedSystemId, searchTerm]);

  // 全局汇总统计
  const totalRootCount = mappingObjects.length;
  const totalConfiguredFields = mappingObjects.reduce((acc, r) => acc + r.configuredFieldCount, 0);
  const totalQueryableFields = mappingObjects.reduce((acc, r) => acc + r.formalQueryableFieldCount, 0);
  const totalDraftFields = mappingObjects.reduce((acc, r) => acc + r.draftFieldCount, 0);

  // 配置状态徽标
  const renderConfigStatusBadge = (status: MappingObjectType['configStatus']) => {
    switch (status) {
      case 'CONFIGURED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
            已配置
          </span>
        );
      case 'CONFIGURED_WITH_DRAFT':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3 h-3 mr-1 text-blue-600" />
            已配置（有草稿）
          </span>
        );
      case 'DRAFTING':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 mr-1 text-amber-600" />
            草稿中
          </span>
        );
      case 'NOT_CONFIGURED':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-500">
            未配置
          </span>
        );
    }
  };

  // 数据同步状态徽标
  const renderSyncStatusBadge = (root: MappingObjectType) => {
    switch (root.syncStatus) {
      case 'COMPLETED':
        return (
          <div className="space-y-0.5">
            <span className="inline-flex items-center text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
              已同步
            </span>
            {root.lastSyncSuccessCount !== undefined && (
              <div className="text-[10px] text-slate-500">
                成功 <span className="font-mono font-medium text-emerald-700">{root.lastSyncSuccessCount.toLocaleString()}</span> 条
              </div>
            )}
          </div>
        );
      case 'COMPLETED_WITH_ERRORS':
        return (
          <div className="space-y-1">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-300">
              <AlertTriangle className="w-3 h-3 mr-1 text-amber-600 shrink-0" />
              同步完成（有异常）
            </span>
            <div className="flex items-center space-x-2 text-[10px]">
              <span className="text-emerald-700">成功 {root.lastSyncSuccessCount?.toLocaleString() ?? 0}</span>
              <span className="text-rose-600 font-bold">异常 {root.lastSyncErrorCount ?? 0}</span>
              <button
                type="button"
                onClick={() => setViewingErrorsRootType(root)}
                className="text-blue-600 hover:text-blue-800 underline font-medium cursor-pointer"
              >
                查看异常
              </button>
            </div>
          </div>
        );
      case 'PENDING':
        return (
          <div className="space-y-0.5">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-900 border border-amber-300">
              <Clock className="w-3 h-3 mr-1 text-amber-700" />
              待同步
            </span>
            <div className="text-[10px] text-slate-500">
              含数据影响变更待生效
            </div>
          </div>
        );
      case 'RUNNING':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
            <RefreshCw className="w-3 h-3 mr-1.5 animate-spin text-blue-600" />
            同步执行中...
          </span>
        );
      case 'FAILED':
        return (
          <div className="space-y-1">
            <span
              className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-300"
              title={root.lastSyncErrorMsg}
            >
              <AlertOctagon className="w-3 h-3 mr-1 text-rose-600 shrink-0" />
              同步失败 (任务级致命错误)
            </span>
            {root.lastSyncErrorMsg && (
              <div className="text-[10px] text-rose-600 truncate max-w-[200px]" title={root.lastSyncErrorMsg}>
                {root.lastSyncErrorMsg}
              </div>
            )}
            <div className="text-[10px] text-slate-400">
              底座维持: <span className="font-mono text-blue-700">{root.formalQueryBaseVersion}</span>
            </div>
          </div>
        );
      case 'NOT_SYNCED':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-500">
            未同步
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. 顶部全局概览与指标卡片 (根类型 3 个) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs">
          <div className="text-slate-400 text-[11px] font-medium">根类型接入数</div>
          <div className="mt-1 flex items-baseline space-x-1.5">
            <span className="text-xl font-bold text-slate-900 font-mono">{totalRootCount}</span>
            <span className="text-xs text-slate-400">个根类型</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Part / Document / Process</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs">
          <div className="text-slate-400 text-[11px] font-medium">已配置字段总数</div>
          <div className="mt-1 flex items-baseline space-x-1">
            <span className="text-xl font-bold text-slate-900 font-mono">{totalConfiguredFields}</span>
            <span className="text-xs text-slate-400">个</span>
          </div>
          <div className="text-[10px] text-emerald-600 mt-0.5">当前已生效字段</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs">
          <div className="text-slate-400 text-[11px] font-medium">正式可查询字段总数</div>
          <div className="mt-1 flex items-baseline space-x-1">
            <span className="text-xl font-bold text-blue-700 font-mono">{totalQueryableFields}</span>
            <span className="text-xs text-slate-400">个</span>
          </div>
          <div className="text-[10px] text-blue-600 mt-0.5">已进入正式查询底座</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs">
          <div className="text-slate-400 text-[11px] font-medium">待发布草稿字段</div>
          <div className="mt-1 flex items-baseline space-x-1">
            <span className="text-xl font-bold text-amber-600 font-mono">{totalDraftFields}</span>
            <span className="text-xs text-slate-400">个草稿</span>
          </div>
          <div className="text-[10px] text-amber-600 mt-0.5">含新建与草稿修改</div>
        </div>
      </div>

      {/* 2. 权威生命周期与底座版本解耦规则说明 */}
      <div className="bg-blue-50/70 border border-blue-200/80 rounded-lg p-3 text-xs text-blue-900 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="font-bold">
              一阶段根类型映射与正式查询底座生命周期规范
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowLifecycleGuide(!showLifecycleGuide)}
            className="text-blue-700 hover:text-blue-900 font-medium flex items-center space-x-1 cursor-pointer"
          >
            <span>{showLifecycleGuide ? '收起说明' : '展开业务规则说明'}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showLifecycleGuide ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {showLifecycleGuide && (
          <div className="mt-2.5 pt-2.5 border-t border-blue-200/60 text-[11px] leading-relaxed text-blue-800 space-y-1.5">
            <p>
              1. <strong>根类型作用域</strong>：一阶段直接按 Part、Document、Process 三个根类型维护字段映射，不存在软类型管理概念。
            </p>
            <p>
              2. <strong>正式查询底座版本</strong>：不维护配置生效版本，仅维护「正式查询底座版本」。数据影响变更生效后底座版本不变，根类型进入「待同步」。
            </p>
            <p>
              3. <strong>容错与异常记录</strong>：单条数据转换错误仅记录异常并继续处理，任务最终呈现「同步完成（有异常）」，底座版本正常切换，异常数据可单独补偿重试。
            </p>
            <p>
              4. <strong>正式查询底座快照隔离</strong>：查询预览严格读取该根类型当前底座快照，即使修改了草稿或发生致命同步失败，也绝不影响线上既有可查字段。
            </p>
          </div>
        )}
      </div>

      {/* 3. 筛选工具栏 */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-500 font-medium">来源系统:</span>
            <select
              value={selectedSystemId}
              onChange={e => setSelectedSystemId(e.target.value)}
              className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:border-blue-500 cursor-pointer"
            >
              <option value="ALL">全部来源系统 ({sourceSystems.length})</option>
              {sourceSystems.map(sys => (
                <option key={sys.id} value={sys.id}>
                  {sys.name}
                </option>
              ))}
            </select>
          </div>

          <div className="relative min-w-[240px] max-w-sm flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="搜索根类型名称或代码..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1 text-xs bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-hidden focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        <div className="text-xs text-slate-500">
          共 <span className="font-semibold text-slate-900">{filteredRootTypes.length}</span> 个根类型
        </div>
      </div>

      {/* 4. 根类型配置总表 (每个根类型一行) */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-2.5 px-3.5 min-w-[150px]">根类型 (Root Type)</th>
                <th className="py-2.5 px-3.5 min-w-[120px]">来源系统</th>
                <th className="py-2.5 px-2.5 text-center min-w-[80px]">已配置字段</th>
                <th className="py-2.5 px-2.5 text-center min-w-[90px]">正式可查字段</th>
                <th className="py-2.5 px-2.5 text-center min-w-[80px]">草稿字段</th>
                <th className="py-2.5 px-3.5 min-w-[110px]">正式查询底座版本</th>
                <th className="py-2.5 px-3.5 min-w-[110px]">配置状态</th>
                <th className="py-2.5 px-3.5 min-w-[150px]">数据状态</th>
                <th className="py-2.5 px-3.5 min-w-[120px]">最近同步时间</th>
                <th className="py-2.5 px-3.5 text-center min-w-[200px] sticky right-0 bg-slate-50">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredRootTypes.length > 0 ? (
                filteredRootTypes.map(root => (
                  <tr key={root.id} className="hover:bg-slate-50/70 transition-colors group">
                    {/* 根类型 */}
                    <td className="py-3 px-3.5 font-medium text-slate-900">
                      <div className="flex items-center space-x-1.5">
                        <Layers className="w-4 h-4 text-blue-600 shrink-0" />
                        <span className="font-semibold text-sm">{root.name}</span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 pl-5.5">{root.code}</div>
                    </td>

                    {/* 来源系统 */}
                    <td className="py-3 px-3.5 text-slate-600">
                      <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                        {root.sourceSystemName}
                      </span>
                    </td>

                    {/* 已配置字段 */}
                    <td className="py-3 px-2.5 text-center font-mono font-bold text-slate-800">
                      {root.configuredFieldCount}
                    </td>

                    {/* 正式可查字段 */}
                    <td className="py-3 px-2.5 text-center font-mono font-bold text-blue-700">
                      {root.formalQueryableFieldCount}
                    </td>

                    {/* 草稿字段 */}
                    <td className="py-3 px-2.5 text-center font-mono">
                      {root.draftFieldCount > 0 ? (
                        <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-bold border border-amber-200">
                          {root.draftFieldCount}
                        </span>
                      ) : (
                        <span className="text-slate-300">0</span>
                      )}
                    </td>

                    {/* 正式查询底座版本 */}
                    <td className="py-3 px-3.5 font-mono text-[11px] font-bold text-blue-700">
                      {root.formalQueryBaseVersion}
                    </td>

                    {/* 配置状态 */}
                    <td className="py-3 px-3.5">
                      {renderConfigStatusBadge(root.configStatus)}
                    </td>

                    {/* 数据状态 */}
                    <td className="py-3 px-3.5">
                      {renderSyncStatusBadge(root)}
                    </td>

                    {/* 最近同步时间 */}
                    <td className="py-3 px-3.5 font-mono text-[11px] text-slate-500">
                      {root.lastSyncedAt || <span className="text-slate-300 font-sans">-</span>}
                    </td>

                    {/* 操作列 */}
                    <td className="py-3 px-3.5 text-center sticky right-0 bg-white group-hover:bg-slate-50 shadow-xs">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          type="button"
                          onClick={() => onSelectRootType(root.id)}
                          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded font-semibold transition-colors flex items-center space-x-1 cursor-pointer"
                        >
                          <Settings2 className="w-3.5 h-3.5" />
                          <span>字段映射</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onOpenQueryPreview(root.id)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium transition-colors flex items-center space-x-1 cursor-pointer"
                          title="查看当前正式查询底座快照"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          <span>查询预览</span>
                        </button>

                        {/* 数据同步触发与调试操作 */}
                        <button
                          type="button"
                          onClick={() => onTriggerSync(root.id, 'NORMAL')}
                          disabled={root.syncStatus === 'RUNNING'}
                          className={`px-2 py-1 rounded font-medium transition-colors flex items-center space-x-1 cursor-pointer ${
                            root.syncStatus === 'PENDING' || root.syncStatus === 'COMPLETED_WITH_ERRORS' || root.syncStatus === 'FAILED'
                              ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-2xs'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                          title="触发根类型全量/增量数据同步至 Manticore"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${root.syncStatus === 'RUNNING' ? 'animate-spin' : ''}`} />
                          <span>{root.syncStatus === 'FAILED' || root.syncStatus === 'COMPLETED_WITH_ERRORS' ? '重试同步' : '同步'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    未找到匹配的根类型配置
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. 异常记录明细弹窗 */}
      {viewingErrorsRootType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h3 className="font-semibold text-slate-900 text-sm">
                  {viewingErrorsRootType.name} - 数据同步异常记录明细 (共 {viewingErrorsRootType.lastSyncErrorRecords?.length ?? 0} 条)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingErrorsRootType(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 max-h-[60vh] overflow-y-auto space-y-3">
              <div className="text-xs text-slate-600 bg-amber-50 p-2.5 rounded border border-amber-200">
                <strong>容错规则说明</strong>：以下单条数据异常已记录并隔离，未中止整体同步流程。正式查询底座已成功切换至{' '}
                <span className="font-mono font-bold text-blue-700">{viewingErrorsRootType.formalQueryBaseVersion}</span>。您可以单独修复源端数据或重试补偿。
              </div>

              {viewingErrorsRootType.lastSyncErrorRecords && viewingErrorsRootType.lastSyncErrorRecords.length > 0 ? (
                <div className="space-y-2">
                  {viewingErrorsRootType.lastSyncErrorRecords.map(err => (
                    <div key={err.id} className="p-3 bg-slate-50 border border-slate-200 rounded text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="font-mono font-semibold text-slate-900">{err.recordKey}</div>
                        <span className="text-[10px] text-slate-400 font-mono">{err.timestamp}</span>
                      </div>
                      <div className="text-rose-700 font-medium">
                        [{err.errorCode}] {err.errorMsg}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono bg-white p-1.5 rounded border border-slate-200 overflow-x-auto">
                        源端载荷: {err.rawPayloadSummary}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs">无异常记录</div>
              )}
            </div>

            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  onTriggerSync(viewingErrorsRootType.id, 'NORMAL');
                  setViewingErrorsRootType(null);
                }}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-semibold flex items-center space-x-1.5 cursor-pointer shadow-2xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>重试全部异常记录</span>
              </button>
              <button
                type="button"
                onClick={() => setViewingErrorsRootType(null)}
                className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded text-xs font-medium cursor-pointer"
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
