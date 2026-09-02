import React, { useState } from 'react';
import {
  ArrowLeft,
  Search,
  Plus,
  Send,
  RefreshCw,
  Eye,
  HelpCircle,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronDown,
  Edit2,
  ListFilter,
  ExternalLink,
  Shield,
  Layers,
  ArrowRight,
  Database,
  SlidersHorizontal,
  Info
} from 'lucide-react';
import {
  FieldMappingItem,
  MappingObjectType,
  MappingSoftType,
  PublishImpactSummary
} from '../../stage1MappingTypes';

interface FieldMappingListViewProps {
  currentRootType: MappingObjectType;
  currentSoftType: MappingSoftType;
  fields: FieldMappingItem[];
  onBackToOverview: () => void;
  onOpenCreateSingle: () => void;
  onOpenBatchImport: () => void;
  onEditField: (field: FieldMappingItem) => void;
  onViewFieldDetail: (field: FieldMappingItem) => void;
  onPublishConfig: () => void;
  onTriggerDataSync: () => void;
  onOpenQueryPreview: () => void;
  onNavigateToSyncQuality: (batchId?: string) => void;
  hasPermission?: boolean;
}

export const FieldMappingListView: React.FC<FieldMappingListViewProps> = ({
  currentRootType,
  currentSoftType,
  fields,
  onBackToOverview,
  onOpenCreateSingle,
  onOpenBatchImport,
  onEditField,
  onViewFieldDetail,
  onPublishConfig,
  onTriggerDataSync,
  onOpenQueryPreview,
  onNavigateToSyncQuality,
  hasPermission = true
}) => {
  // 筛选与搜索
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'DRAFT'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateDropdown, setShowCreateDropdown] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // 过滤当前软类型的字段列表
  const softTypeFields = fields.filter(
    f => f.rootTypeId === currentRootType.id && f.softTypeId === currentSoftType.id
  );

  const filteredFields = softTypeFields.filter(f => {
    // 状态过滤 (严格按照 全部 / 生效 / 草稿)
    if (statusFilter === 'ACTIVE' && f.configStatus !== 'ACTIVE') return false;
    if (statusFilter === 'DRAFT' && f.configStatus !== 'DRAFT') return false;

    // 搜索覆盖：源字段、显示名称、Manticore 字段
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchSource =
        f.sourceFieldName.toLowerCase().includes(term) ||
        f.sourceFieldKey.toLowerCase().includes(term) ||
        f.sourceDisplayName.toLowerCase().includes(term);
      const matchDisplay = f.displayTitle.toLowerCase().includes(term);
      const matchManticore = f.manticoreField.toLowerCase().includes(term);
      if (!matchSource && !matchDisplay && !matchManticore) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filteredFields.length / pageSize) || 1;
  const paginatedFields = filteredFields.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // 统计可发布草稿数量
  const draftOnlyCount = softTypeFields.filter(f => f.configStatus === 'DRAFT').length;
  const modifiedDraftCount = softTypeFields.filter(
    f => f.configStatus === 'ACTIVE' && f.hasDraftModification
  ).length;
  const totalPublishableCount = draftOnlyCount + modifiedDraftCount;

  // 是否有待同步的数据
  const hasPendingSync = currentSoftType.syncStatus === 'PENDING_SYNC' || currentSoftType.hasPendingSyncFields;

  const renderConfigStatusBadge = (field: FieldMappingItem) => {
    if (field.configStatus === 'ACTIVE') {
      if (field.hasDraftModification) {
        return (
          <div className="space-y-0.5">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
              已生效
            </span>
            <div className="text-[10px] text-amber-600 font-medium">存在草稿修改</div>
          </div>
        );
      }
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
          已生效
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        <Clock className="w-3 h-3 mr-1 text-amber-600" />
        草稿
      </span>
    );
  };

  const renderDataStatusBadge = (field: FieldMappingItem) => {
    if (field.configStatus === 'DRAFT') {
      return <span className="text-slate-400 text-[11px]">-</span>;
    }
    if (!field.isDataImpactingChange && field.dataStatus !== 'PENDING_SYNC') {
      return <span className="text-slate-400 text-[11px]">无需同步</span>;
    }
    switch (field.dataStatus) {
      case 'SYNC_SUCCESS':
        return (
          <span className="inline-flex items-center text-[11px] font-medium text-emerald-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1"></span>
            已同步
          </span>
        );
      case 'PENDING_SYNC':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3 mr-1 text-amber-600" />
            待同步
          </span>
        );
      case 'SYNCING':
        return (
          <span className="inline-flex items-center text-[11px] font-medium text-blue-700 animate-pulse">
            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
            同步中
          </span>
        );
      case 'SYNC_FAILED':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle className="w-3 h-3 mr-1 text-rose-600" />
            同步失败
          </span>
        );
      case 'NO_SYNC_NEEDED':
      default:
        return <span className="text-slate-400 text-[11px]">无需同步</span>;
    }
  };

  const renderDisplayTypeBadge = (displayType: FieldMappingItem['displayType']) => {
    switch (displayType) {
      case 'LINK':
        return <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[11px] font-medium">超链接跳转</span>;
      case 'FULLTEXT':
        return <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 text-[11px] font-medium">全文检索</span>;
      case 'CATEGORY_PATH':
        return <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[11px] font-medium">分类树路径</span>;
      case 'ENUM_BADGE':
        return <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[11px] font-medium">枚举标签</span>;
      case 'HIDDEN':
        return <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[11px]">不展示</span>;
      case 'CONDITION_QUERY':
      default:
        return <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px]">标准条件</span>;
    }
  };

  const renderQueryCapabilityBadge = (cap: FieldMappingItem['queryCapability']) => {
    switch (cap) {
      case 'BOTH':
        return <span className="font-semibold text-slate-800 text-[11px]">条件 + 全文</span>;
      case 'FULLTEXT_SEARCH':
        return <span className="text-purple-700 text-[11px] font-medium">全文大字段</span>;
      case 'QUERY_CONDITION':
        return <span className="text-slate-700 text-[11px]">条件查询</span>;
      case 'NONE':
      default:
        return <span className="text-slate-400 text-[11px]">仅作展示</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* 顶部面包屑与返回导航 */}
      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-4 py-2.5 shadow-2xs">
        <div className="flex items-center space-x-2 text-xs">
          <button
            onClick={onBackToOverview}
            className="text-slate-500 hover:text-blue-600 flex items-center font-medium cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            <span>接入配置总入口</span>
          </button>
          <span className="text-slate-300">/</span>
          <span className="text-slate-600 font-medium">{currentRootType.name}</span>
          <span className="text-slate-300">/</span>
          <span className="text-slate-900 font-bold bg-slate-100 px-2 py-0.5 rounded">
            {currentSoftType.name}
          </span>
          <span className="text-slate-300">/</span>
          <span className="text-slate-500">字段映射配置</span>
        </div>

        {/* 当前生效版本与可查询版本指示 */}
        <div className="flex items-center space-x-3 text-xs">
          <div className="text-slate-500">
            生效版本: <span className="font-mono font-bold text-slate-800">{currentSoftType.activeConfigVersion}</span>
          </div>
          <div className="text-slate-500">
            正式查询底座: <span className="font-mono font-bold text-blue-700">{currentSoftType.activeQueryVersion}</span>
          </div>
        </div>
      </div>

      {/* 页面主标题与提示区 */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <h2 className="text-sm font-bold text-slate-900 flex items-center">
              {currentSoftType.name} - 字段配置列表
            </h2>
            <div className="relative">
              <button
                type="button"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                onClick={() => setShowTooltip(!showTooltip)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-0.5 rounded"
                title="查看配置与数据生命周期说明"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>

              {/* 问号浮层说明 (唯一权威口径) */}
              {showTooltip && (
                <div className="absolute left-0 top-6 z-30 w-80 p-3 bg-slate-900 text-white rounded-lg shadow-xl text-xs leading-relaxed space-y-1.5">
                  <div className="font-bold flex items-center text-amber-400">
                    <Info className="w-3.5 h-3.5 mr-1" />
                    配置与数据生命周期说明
                  </div>
                  <p className="text-slate-300">
                    草稿字段不参与正式查询和数据同步。发布后配置生效；数据影响变更仍需单独执行数据同步，成功前正式查询继续使用上一成功版本。
                  </p>
                </div>
              )}
            </div>
          </div>
          <p className="text-xs text-slate-500">
            管理当前软类型在 Manticore 检索库中的字段结构。支持单个新增、PLM 批量发现、配置发布生效与对象级数据同步。
          </p>
        </div>

        {/* 顶部快捷操作工具栏 */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 查询预览 (按 5.2 规则：只读当前成功版本，不因草稿弹确认) */}
          <button
            onClick={onOpenQueryPreview}
            className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-slate-500" />
            <span>查询预览</span>
          </button>

          {/* 数据同步 (仅按当前对象或软类型整体发起) */}
          <button
            onClick={onTriggerDataSync}
            disabled={!hasPendingSync || !hasPermission}
            className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer ${
              hasPendingSync && hasPermission
                ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
            }`}
            title={
              !hasPendingSync
                ? '当前生效配置无需同步或已全部同步完成'
                : '按当前软类型发起全量或增量数据同步'
            }
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>数据同步</span>
            {hasPendingSync && <span className="w-1.5 h-1.5 rounded-full bg-white ml-0.5"></span>}
          </button>

          {/* 发布配置 */}
          <button
            onClick={onPublishConfig}
            disabled={totalPublishableCount === 0 || !hasPermission}
            className={`px-3.5 py-1.5 rounded text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer ${
              totalPublishableCount > 0 && hasPermission
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
            }`}
            title={
              totalPublishableCount === 0
                ? '当前没有待发布的草稿修改'
                : `发布 ${totalPublishableCount} 项草稿配置`
            }
          >
            <Send className="w-3.5 h-3.5" />
            <span>发布配置</span>
            {totalPublishableCount > 0 && (
              <span className="bg-emerald-800 text-emerald-100 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                {totalPublishableCount}
              </span>
            )}
          </button>

          {/* 新建 (单一带下拉菜单的入口) */}
          <div className="relative">
            <button
              onClick={() => setShowCreateDropdown(!showCreateDropdown)}
              disabled={!hasPermission}
              className={`px-3.5 py-1.5 rounded text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer ${
                hasPermission
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新建</span>
              <ChevronDown className="w-3 h-3 ml-0.5" />
            </button>

            {showCreateDropdown && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-30 text-xs text-slate-700 animate-in fade-in zoom-in duration-100">
                <button
                  onClick={() => {
                    setShowCreateDropdown(false);
                    onOpenCreateSingle();
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center space-x-2 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-blue-600" />
                  <span>单个新建映射</span>
                </button>
                <button
                  onClick={() => {
                    setShowCreateDropdown(false);
                    onOpenBatchImport();
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center space-x-2 cursor-pointer border-t border-slate-100"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>从 PLM 批量选择</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 筛选与搜索工具条 (横向区域，状态筛选仅为 全部 / 生效 / 草稿) */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* 状态筛选 Tabs */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded text-xs font-medium">
            <button
              onClick={() => {
                setStatusFilter('ALL');
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              全部 ({softTypeFields.length})
            </button>
            <button
              onClick={() => {
                setStatusFilter('ACTIVE');
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                statusFilter === 'ACTIVE'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              生效 ({softTypeFields.filter(f => f.configStatus === 'ACTIVE').length})
            </button>
            <button
              onClick={() => {
                setStatusFilter('DRAFT');
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                statusFilter === 'DRAFT'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              草稿 ({softTypeFields.filter(f => f.configStatus === 'DRAFT').length})
            </button>
          </div>

          {/* 搜索框 */}
          <div className="relative min-w-[260px] max-w-sm flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="搜索源字段、显示名称、Manticore 字段..."
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-3 py-1 text-xs bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-hidden focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        {/* 提示信息 */}
        <div className="text-xs text-slate-500">
          显示 <span className="font-semibold text-slate-800">{filteredFields.length}</span> 个配置项
        </div>
      </div>

      {/* 字段配置主表格 */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-2.5 px-3 min-w-[140px]">源字段</th>
                <th className="py-2.5 px-3 min-w-[130px]">显示名称</th>
                <th className="py-2.5 px-3 min-w-[110px]">业务类型</th>
                <th className="py-2.5 px-3 min-w-[130px]">Manticore 字段</th>
                <th className="py-2.5 px-3 min-w-[100px]">Manticore 类型</th>
                <th className="py-2.5 px-3 min-w-[90px]">展示类型</th>
                <th className="py-2.5 px-3 min-w-[90px]">查询能力</th>
                <th className="py-2.5 px-2.5 text-center">排序</th>
                <th className="py-2.5 px-2.5 text-center">展示</th>
                <th className="py-2.5 px-3">配置状态</th>
                <th className="py-2.5 px-3">数据状态</th>
                <th className="py-2.5 px-3 text-center min-w-[100px] sticky right-0 bg-slate-50">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {paginatedFields.length > 0 ? (
                paginatedFields.map(field => (
                  <tr key={field.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* 源字段 */}
                    <td className="py-2.5 px-3">
                      <div className="font-mono font-bold text-slate-900">{field.sourceFieldName}</div>
                      <div className="text-[11px] text-slate-400">{field.sourceDisplayName}</div>
                    </td>

                    {/* 显示名称 */}
                    <td className="py-2.5 px-3 font-medium text-slate-900">
                      {field.hasDraftModification && field.draftData?.displayTitle ? (
                        <div>
                          <span className="text-slate-800">{field.displayTitle}</span>
                          <div className="text-[10px] text-amber-600 font-normal">
                            草稿: {field.draftData.displayTitle}
                          </div>
                        </div>
                      ) : (
                        field.displayTitle
                      )}
                    </td>

                    {/* 业务类型 */}
                    <td className="py-2.5 px-3 text-slate-600">
                      <span>{field.sourceDataTypeLabel}</span>
                      {field.defaultUnit && (
                        <span className="text-[10px] font-mono text-slate-400 ml-1">({field.defaultUnit})</span>
                      )}
                    </td>

                    {/* Manticore 字段 */}
                    <td className="py-2.5 px-3 font-mono font-medium text-blue-700">
                      {field.manticoreField}
                    </td>

                    {/* Manticore 类型 */}
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                      {field.manticoreType}
                    </td>

                    {/* 展示类型 */}
                    <td className="py-2.5 px-3">
                      {renderDisplayTypeBadge(field.displayType)}
                    </td>

                    {/* 查询能力 */}
                    <td className="py-2.5 px-3">
                      {renderQueryCapabilityBadge(field.queryCapability)}
                    </td>

                    {/* 允许排序 */}
                    <td className="py-2.5 px-2.5 text-center">
                      {field.isSortable ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mx-auto" />
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    {/* 结果展示 */}
                    <td className="py-2.5 px-2.5 text-center">
                      {field.isDisplayInResult ? (
                        <span className="text-emerald-700 font-semibold text-[11px]">是</span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">否</span>
                      )}
                    </td>

                    {/* 配置状态 */}
                    <td className="py-2.5 px-3">
                      {renderConfigStatusBadge(field)}
                    </td>

                    {/* 数据状态 */}
                    <td className="py-2.5 px-3">
                      {renderDataStatusBadge(field)}
                    </td>

                    {/* 操作列 (粘性吸附) */}
                    <td className="py-2.5 px-3 text-center sticky right-0 bg-white group-hover:bg-slate-50">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          onClick={() => onViewFieldDetail(field)}
                          className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs transition-colors cursor-pointer"
                        >
                          详情
                        </button>
                        <button
                          onClick={() => onEditField(field)}
                          disabled={!hasPermission}
                          className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors cursor-pointer ${
                            hasPermission
                              ? 'bg-blue-50 hover:bg-blue-100 text-blue-700'
                              : 'bg-slate-50 text-slate-300 cursor-not-allowed'
                          }`}
                        >
                          编辑
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    未找到符合条件的字段映射记录
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 分页控制栏 */}
        <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div>
            共 <span className="font-semibold text-slate-900">{filteredFields.length}</span> 条映射记录，每页 {pageSize} 条
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 border border-slate-300 rounded bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              上一页
            </button>
            <span className="font-mono text-slate-800">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 border border-slate-300 rounded bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              下一页
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
