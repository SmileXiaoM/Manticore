import React, { useState } from 'react';
import {
  Layers,
  ArrowRight,
  RefreshCw,
  Database,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  Shield,
  FileSpreadsheet,
  Settings2,
  Search,
  Filter
} from 'lucide-react';
import { MappingObjectType, MappingSoftType } from '../../stage1MappingTypes';

interface ObjectTypeListViewProps {
  mappingObjects: MappingObjectType[];
  onSelectSoftType: (rootTypeId: string, softTypeId: string) => void;
  onNavigateToSyncQuality: (batchId?: string) => void;
  hasPermission?: boolean;
}

export const ObjectTypeListView: React.FC<ObjectTypeListViewProps> = ({
  mappingObjects,
  onSelectSoftType,
  onNavigateToSyncQuality,
  hasPermission = true
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState('ALL');

  // 扁平化根对象 + 软类型表格行
  const flattenedRows: {
    root: MappingObjectType;
    soft: MappingSoftType;
  }[] = [];

  mappingObjects.forEach(root => {
    root.softTypes.forEach(soft => {
      flattenedRows.push({ root, soft });
    });
  });

  const filteredRows = flattenedRows.filter(row => {
    const matchSearch =
      row.root.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.soft.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.root.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.soft.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchSource =
      sourceFilter === 'ALL' || row.root.sourceSystemId === sourceFilter;
    return matchSearch && matchSource;
  });

  const renderConfigStatusBadge = (status: MappingSoftType['configStatus']) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
            已生效
          </span>
        );
      case 'DRAFT_ONLY':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 mr-1 text-amber-600" />
            仅草稿
          </span>
        );
      case 'UNCONFIGURED':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-normal bg-slate-100 text-slate-500 border border-slate-200">
            未配置
          </span>
        );
    }
  };

  const renderSyncStatusBadge = (soft: MappingSoftType) => {
    switch (soft.syncStatus) {
      case 'SYNC_SUCCESS':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
            同步成功
          </span>
        );
      case 'PENDING_SYNC':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5"></span>
            待同步
          </span>
        );
      case 'SYNCING':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 animate-pulse">
            <RefreshCw className="w-3 h-3 mr-1 animate-spin text-blue-600" />
            同步中
          </span>
        );
      case 'SYNC_FAILED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-50 text-rose-700" title={soft.lastSyncErrorMsg}>
            <AlertTriangle className="w-3 h-3 mr-1 text-rose-600" />
            同步失败
          </span>
        );
      case 'NO_SYNC_NEEDED':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-normal text-slate-500">
            无需同步
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* 顶部标题与简要说明 */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <h1 className="text-base font-bold text-slate-900 flex items-center">
              <Layers className="w-4 h-4 mr-2 text-blue-600" />
              一阶段：对象与字段映射配置
            </h1>
            <span className="px-2 py-0.5 text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded">
              检索底座接入
            </span>
          </div>
          <p className="text-xs text-slate-500">
            定义 PLM 来源系统对象及软类型在 Manticore 检索底座中的字段映射结构、检索能力与数据同步生命周期。
          </p>
        </div>

        {/* 权限状态标识 */}
        {!hasPermission && (
          <div className="bg-amber-50 border border-amber-200 rounded px-3 py-1.5 flex items-center text-xs text-amber-800">
            <Shield className="w-3.5 h-3.5 text-amber-600 mr-1.5 shrink-0" />
            <span>当前为只读权限，无法发布或保存新草稿。</span>
          </div>
        )}
      </div>

      {/* 搜索与来源过滤工具栏 */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative min-w-[240px] max-w-sm flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="搜索根对象、软类型名称或编码..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-hidden focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-500 flex items-center">
              <Filter className="w-3 h-3 mr-1" />
              来源系统:
            </span>
            <select
              value={sourceFilter}
              onChange={e => setSourceFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs text-slate-700 focus:outline-hidden focus:border-blue-500"
            >
              <option value="ALL">全部来源系统</option>
              <option value="IntePLM_V21">IntePLM V21 (企业研发)</option>
              <option value="ERP_SAP_S4">SAP S/4HANA (物料主数据)</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-500">
          共 <span className="font-semibold text-slate-800">{filteredRows.length}</span> 个可配置软类型
        </div>
      </div>

      {/* 主数据对象列表表格 */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-2.5 px-3.5 min-w-[140px]">根对象类型</th>
                <th className="py-2.5 px-3.5 min-w-[150px]">软类型</th>
                <th className="py-2.5 px-3.5 min-w-[120px]">来源系统</th>
                <th className="py-2.5 px-3 text-right">生效字段</th>
                <th className="py-2.5 px-3 text-right">草稿字段</th>
                <th className="py-2.5 px-3.5">配置状态</th>
                <th className="py-2.5 px-3.5">数据同步状态</th>
                <th className="py-2.5 px-3.5 min-w-[130px]">最近发布生效</th>
                <th className="py-2.5 px-3.5 min-w-[130px]">最近同步时间</th>
                <th className="py-2.5 px-3.5 text-center min-w-[150px] sticky right-0 bg-slate-50">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredRows.length > 0 ? (
                filteredRows.map(({ root, soft }) => (
                  <tr key={`${root.id}-${soft.id}`} className="hover:bg-slate-50/70 transition-colors">
                    {/* 根对象类型 */}
                    <td className="py-2.5 px-3.5">
                      <div className="font-semibold text-slate-900">{root.name}</div>
                      <div className="font-mono text-[11px] text-slate-400">{root.code}</div>
                    </td>

                    {/* 软类型 */}
                    <td className="py-2.5 px-3.5">
                      <div className="font-semibold text-blue-700 flex items-center">
                        <span className="hover:underline cursor-pointer" onClick={() => onSelectSoftType(root.id, soft.id)}>
                          {soft.name}
                        </span>
                      </div>
                      <div className="font-mono text-[11px] text-slate-400">{soft.code}</div>
                    </td>

                    {/* 来源系统 */}
                    <td className="py-2.5 px-3.5 text-slate-600">
                      {root.sourceSystemName}
                    </td>

                    {/* 生效字段数 */}
                    <td className="py-2.5 px-3 text-right font-mono font-medium text-emerald-700">
                      {soft.activeFieldCount}
                    </td>

                    {/* 草稿字段数 */}
                    <td className="py-2.5 px-3 text-right font-mono">
                      {soft.draftFieldCount > 0 ? (
                        <span className="font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                          +{soft.draftFieldCount}
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
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
                    <td className="py-2.5 px-3.5 text-center sticky right-0 bg-white group-hover:bg-slate-50">
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
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium transition-colors flex items-center space-x-1 cursor-pointer"
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
                  <td colSpan={10} className="py-12 text-center text-slate-400">
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
