import React, { useState, useMemo } from 'react';
import {
  Search,
  Settings2,
  Database,
  ArrowRight,
  Layers,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  Info,
  Server,
  RefreshCw,
  Sliders,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import {
  MappingObjectType,
  MappingSoftType,
  SourceSystemInfo
} from '../../stage1MappingTypes';

interface ObjectTypeListViewProps {
  sourceSystems: SourceSystemInfo[];
  mappingObjects: MappingObjectType[];
  onSelectSoftType: (rootTypeId: string, softTypeId: string) => void;
  onNavigateToSyncQuality: (batchId?: string) => void;
  hasPermission?: boolean;
}

export const ObjectTypeListView: React.FC<ObjectTypeListViewProps> = ({
  sourceSystems,
  mappingObjects,
  onSelectSoftType,
  onNavigateToSyncQuality,
  hasPermission = true
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSystemId, setSelectedSystemId] = useState<string>('ALL');
  const [showLifecycleGuide, setShowLifecycleGuide] = useState(false);

  // 聚合所有软类型行数据，供扁平化表格呈现与搜索
  const flattenedSoftTypes = useMemo(() => {
    const list: {
      root: MappingObjectType;
      soft: MappingSoftType;
    }[] = [];

    mappingObjects.forEach(root => {
      if (selectedSystemId !== 'ALL' && root.sourceSystemId !== selectedSystemId) {
        return;
      }

      root.softTypes.forEach(soft => {
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          const matchRoot = root.name.toLowerCase().includes(term) || root.code.toLowerCase().includes(term);
          const matchSoft = soft.name.toLowerCase().includes(term) || soft.code.toLowerCase().includes(term);
          if (!matchRoot && !matchSoft) return;
        }

        list.push({ root, soft });
      });
    });

    return list;
  }, [mappingObjects, selectedSystemId, searchTerm]);

  // 全局汇总统计
  const totalRootCount = mappingObjects.length;
  const totalSoftCount = mappingObjects.reduce((acc, r) => acc + r.softTypes.length, 0);
  const totalActiveFields = mappingObjects.reduce(
    (acc, r) => acc + r.softTypes.reduce((sAcc, s) => sAcc + s.activeFieldCount, 0),
    0
  );
  const totalQueryableFields = mappingObjects.reduce(
    (acc, r) => acc + r.softTypes.reduce((sAcc, s) => sAcc + s.queryableFieldCount, 0),
    0
  );
  const totalDraftWorkItems = mappingObjects.reduce(
    (acc, r) => acc + r.softTypes.reduce((sAcc, s) => sAcc + s.draftFieldCount, 0),
    0
  );

  const renderConfigStatusBadge = (status: MappingSoftType['configStatus']) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
            已配置生效
          </span>
        );
      case 'DRAFT_ONLY':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 mr-1 text-amber-600" />
            仅草稿待发布
          </span>
        );
      case 'UNCONFIGURED':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-500">
            未配置
          </span>
        );
    }
  };

  const renderSyncStatusBadge = (soft: MappingSoftType) => {
    switch (soft.syncStatus) {
      case 'SYNC_SUCCESS':
        return (
          <span className="inline-flex items-center text-[11px] font-medium text-emerald-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
            已同步 ({soft.activeQueryVersion})
          </span>
        );
      case 'PENDING_SYNC':
        return (
          <div className="space-y-0.5">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
              <Clock className="w-3 h-3 mr-1 text-amber-600" />
              待同步
            </span>
            <div className="text-[10px] text-slate-400">
              查询使用: <span className="font-mono text-blue-700">{soft.activeQueryVersion}</span>
            </div>
          </div>
        );
      case 'SYNCING':
        return (
          <span className="inline-flex items-center text-[11px] font-medium text-blue-700 animate-pulse">
            <RefreshCw className="w-3 h-3 mr-1.5 animate-spin" />
            同步执行中...
          </span>
        );
      case 'SYNC_FAILED':
        return (
          <div className="space-y-0.5">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200" title={soft.lastSyncErrorMsg}>
              <AlertTriangle className="w-3 h-3 mr-1 text-rose-600" />
              同步失败 (可重试)
            </span>
            <div className="text-[10px] text-slate-400">
              查询维持: <span className="font-mono text-blue-700">{soft.activeQueryVersion}</span>
            </div>
          </div>
        );
      case 'NO_SYNC_NEEDED':
      default:
        return <span className="text-slate-400 text-[11px]">无需同步</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. 顶部全局概览与统计卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs">
          <div className="text-slate-400 text-[11px] font-medium">接入根对象 / 软类型</div>
          <div className="mt-1 flex items-baseline space-x-1.5">
            <span className="text-lg font-bold text-slate-900 font-mono">{totalRootCount}</span>
            <span className="text-xs text-slate-400">类</span>
            <span className="text-slate-300">/</span>
            <span className="text-lg font-bold text-slate-900 font-mono">{totalSoftCount}</span>
            <span className="text-xs text-slate-400">种</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs">
          <div className="text-slate-400 text-[11px] font-medium">已生效配置字段数</div>
          <div className="mt-1 flex items-baseline space-x-1">
            <span className="text-lg font-bold text-slate-900 font-mono">{totalActiveFields}</span>
            <span className="text-xs text-slate-400">个</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs">
          <div className="text-slate-400 text-[11px] font-medium">正式可查询字段数</div>
          <div className="mt-1 flex items-baseline space-x-1">
            <span className="text-lg font-bold text-blue-700 font-mono">{totalQueryableFields}</span>
            <span className="text-xs text-slate-400">个 (已完成同步)</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs">
          <div className="text-slate-400 text-[11px] font-medium">待发布草稿工作项</div>
          <div className="mt-1 flex items-baseline space-x-1">
            <span className="text-lg font-bold text-amber-600 font-mono">{totalDraftWorkItems}</span>
            <span className="text-xs text-slate-400">项</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs col-span-2 sm:col-span-1">
          <div className="text-slate-400 text-[11px] font-medium">底层检索数据库</div>
          <div className="mt-1 flex items-center space-x-1.5 text-xs text-emerald-700 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Manticore 搜索引擎</span>
          </div>
        </div>
      </div>

      {/* 2. 权威生命周期指引折叠说明 */}
      <div className="bg-blue-50/70 border border-blue-200/80 rounded-lg p-3 text-xs text-blue-900 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="font-bold">
              一阶段核心生命周期规则 (配置与数据解耦)
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowLifecycleGuide(!showLifecycleGuide)}
            className="text-blue-700 hover:text-blue-900 font-medium flex items-center space-x-1 cursor-pointer"
          >
            <span>{showLifecycleGuide ? '收起说明' : '展开规则说明'}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showLifecycleGuide ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {showLifecycleGuide && (
          <div className="mt-2.5 pt-2.5 border-t border-blue-200/60 text-[11px] leading-relaxed text-blue-800 space-y-1.5 animate-in fade-in duration-100">
            <p>
              1. <strong>编辑与草稿</strong>：单个新建/编辑或批量发现均生成草稿，草稿字段绝不进入正式查询和数据同步。
            </p>
            <p>
              2. <strong>发布生效</strong>：发布将草稿升级为正式生效版本。纯展示变更即刻生效无需同步；包含物理字段/类型等数据影响变更，对象标记为「待同步」。
            </p>
            <p>
              3. <strong>数据同步</strong>：需按对象或软类型整体触发数据同步。同步成功前，正式查询继续读取上一成功版本；同步成功后，原子切换到最新生效可查版本。
            </p>
          </div>
        )}
      </div>

      {/* 3. 过滤与搜索工具栏 */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* 来源系统筛选下拉框 */}
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

          {/* 搜索框 */}
          <div className="relative min-w-[240px] max-w-sm flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="搜索根对象、软类型名称或代码..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1 text-xs bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-hidden focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        <div className="text-xs text-slate-500">
          共 <span className="font-semibold text-slate-900">{flattenedSoftTypes.length}</span> 个可配置软类型
        </div>
      </div>

      {/* 4. 软类型配置总览表格 */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-2.5 px-3.5 min-w-[130px]">根对象 (Root Type)</th>
                <th className="py-2.5 px-3.5 min-w-[150px]">软类型 (Soft Type)</th>
                <th className="py-2.5 px-3.5 min-w-[110px]">来源系统</th>
                <th className="py-2.5 px-2.5 text-center min-w-[80px]">生效字段</th>
                <th className="py-2.5 px-2.5 text-center min-w-[90px]">正式可查字段</th>
                <th className="py-2.5 px-2.5 text-center min-w-[80px]">草稿工作项</th>
                <th className="py-2.5 px-3.5 min-w-[90px]">生效配置版本</th>
                <th className="py-2.5 px-3.5 min-w-[100px]">正式查询底座</th>
                <th className="py-2.5 px-3.5 min-w-[110px]">配置状态</th>
                <th className="py-2.5 px-3.5 min-w-[120px]">数据状态</th>
                <th className="py-2.5 px-3.5 min-w-[120px]">最近发布时间</th>
                <th className="py-2.5 px-3.5 min-w-[120px]">最近同步时间</th>
                <th className="py-2.5 px-3.5 text-center min-w-[140px] sticky right-0 bg-slate-50">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {flattenedSoftTypes.length > 0 ? (
                flattenedSoftTypes.map(({ root, soft }) => (
                  <tr key={`${root.id}-${soft.id}`} className="hover:bg-slate-50/70 transition-colors group">
                    {/* 根对象 */}
                    <td className="py-2.5 px-3.5 font-medium text-slate-900">
                      <div className="flex items-center space-x-1.5">
                        <Layers className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>{root.name}</span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 pl-5">{root.code}</div>
                    </td>

                    {/* 软类型 */}
                    <td className="py-2.5 px-3.5">
                      <div className="font-semibold text-slate-900">{soft.name}</div>
                      <div className="text-[11px] font-mono text-slate-400">{soft.code}</div>
                    </td>

                    {/* 来源系统 */}
                    <td className="py-2.5 px-3.5 text-slate-600">
                      <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                        {root.sourceSystemName}
                      </span>
                    </td>

                    {/* 生效字段数 */}
                    <td className="py-2.5 px-2.5 text-center font-mono font-bold text-slate-800">
                      {soft.activeFieldCount}
                    </td>

                    {/* 正式可查询字段数 */}
                    <td className="py-2.5 px-2.5 text-center font-mono font-bold text-blue-700">
                      {soft.queryableFieldCount}
                    </td>

                    {/* 草稿工作项数 */}
                    <td className="py-2.5 px-2.5 text-center font-mono">
                      {soft.draftFieldCount > 0 ? (
                        <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-bold border border-amber-200">
                          {soft.draftFieldCount}
                        </span>
                      ) : (
                        <span className="text-slate-300">0</span>
                      )}
                    </td>

                    {/* 当前生效配置版本 */}
                    <td className="py-2.5 px-3.5 font-mono text-[11px] font-semibold text-slate-800">
                      {soft.activeConfigVersion}
                    </td>

                    {/* 正式查询底座版本 */}
                    <td className="py-2.5 px-3.5 font-mono text-[11px] font-bold text-blue-700">
                      {soft.activeQueryVersion}
                    </td>

                    {/* 配置状态 */}
                    <td className="py-2.5 px-3.5">
                      {renderConfigStatusBadge(soft.configStatus)}
                    </td>

                    {/* 数据状态 */}
                    <td className="py-2.5 px-3.5">
                      {renderSyncStatusBadge(soft)}
                    </td>

                    {/* 最近发布时间 */}
                    <td className="py-2.5 px-3.5 font-mono text-[11px] text-slate-500">
                      {soft.lastPublishedAt || <span className="text-slate-300 font-sans">尚未发布</span>}
                    </td>

                    {/* 最近同步时间 */}
                    <td className="py-2.5 px-3.5 font-mono text-[11px] text-slate-500">
                      {soft.lastSyncedAt || <span className="text-slate-300 font-sans">-</span>}
                    </td>

                    {/* 操作列 (粘性停靠) */}
                    <td className="py-2.5 px-3.5 text-center sticky right-0 bg-white group-hover:bg-slate-50 shadow-xs">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => onSelectSoftType(root.id, soft.id)}
                          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded font-semibold transition-colors flex items-center space-x-1 cursor-pointer"
                        >
                          <Settings2 className="w-3.5 h-3.5" />
                          <span>配置字段</span>
                        </button>

                        <button
                          onClick={() => onNavigateToSyncQuality(soft.lastSyncBatchId)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium transition-colors flex items-center space-x-1 cursor-pointer"
                          title="前往数据同步质量查看详细日志"
                        >
                          <Database className="w-3.5 h-3.5 text-slate-500" />
                          <span>同步状态</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-400">
                    <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    未找到匹配的对象与软类型配置
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
