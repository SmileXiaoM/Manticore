import React, { useState, useMemo } from 'react';
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
  ArrowRight,
  Database,
  Info,
  RotateCcw,
  AlertCircle
} from 'lucide-react';
import {
  FieldMappingItem,
  MappingObjectType,
  formatRootTypeDisplayName
} from '../../stage1MappingTypes';

interface FieldMappingListViewProps {
  currentRootType: MappingObjectType;
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
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CONFIGURED' | 'DRAFT'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateDropdown, setShowCreateDropdown] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // 过滤当前根类型的字段列表
  const rootTypeFields = useMemo(() => {
    return fields.filter(f => f.rootTypeId === currentRootType.id);
  }, [fields, currentRootType.id]);

  // 统计数值 (纯草稿 vs 已配置字段存在草稿修改)
  const draftOnlyCount = useMemo(() => {
    return rootTypeFields.filter(f => f.configStatus === 'DRAFT').length;
  }, [rootTypeFields]);

  const modifiedDraftCount = useMemo(() => {
    return rootTypeFields.filter(f => f.configStatus === 'CONFIGURED' && f.hasDraftModification).length;
  }, [rootTypeFields]);

  const totalDraftWorkItemCount = draftOnlyCount + modifiedDraftCount;
  const configuredCount = rootTypeFields.filter(f => f.configStatus === 'CONFIGURED').length;

  // 列表筛选过滤
  const filteredFields = useMemo(() => {
    return rootTypeFields.filter(f => {
      if (statusFilter === 'CONFIGURED') {
        if (f.configStatus !== 'CONFIGURED') return false;
      } else if (statusFilter === 'DRAFT') {
        const isDraftWorkItem = f.configStatus === 'DRAFT' || (f.configStatus === 'CONFIGURED' && f.hasDraftModification);
        if (!isDraftWorkItem) return false;
      }

      // 搜索覆盖：源字段标识、源字段名、源显示名、目标字段、前台显示名称
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchSource =
          f.sourceFieldName.toLowerCase().includes(term) ||
          f.sourceFieldKey.toLowerCase().includes(term) ||
          f.sourceDisplayName.toLowerCase().includes(term);
        const matchDisplay =
          f.displayTitle.toLowerCase().includes(term) ||
          (f.draftData?.displayTitle && f.draftData.displayTitle.toLowerCase().includes(term));
        const matchManticore = f.manticoreField.toLowerCase().includes(term);
        if (!matchSource && !matchDisplay && !matchManticore) return false;
      }
      return true;
    });
  }, [rootTypeFields, statusFilter, searchTerm]);

  const totalPages = Math.ceil(filteredFields.length / pageSize) || 1;
  const paginatedFields = useMemo(() => {
    return filteredFields.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [filteredFields, currentPage, pageSize]);

  // 同步按钮状态判定
  const canTriggerSync =
    currentRootType.configuredFieldCount > 0 &&
    hasPermission &&
    currentRootType.syncStatus !== 'RUNNING';

  const isSyncFailed = currentRootType.syncStatus === 'FAILED';
  const isSyncError = currentRootType.syncStatus === 'COMPLETED_WITH_ERRORS';
  const hasPendingSync = currentRootType.syncStatus === 'PENDING' || currentRootType.hasPendingSyncChanges;

  const renderConfigStatusBadge = (field: FieldMappingItem) => {
    if (field.configStatus === 'CONFIGURED') {
      if (field.hasDraftModification) {
        return (
          <div className="space-y-1">
            <span className="min-h-[24px] inline-flex items-center px-2 py-0.5 rounded-[4px] text-[11px] font-medium whitespace-nowrap bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600 shrink-0" />
              已配置
            </span>
            <div className="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-[4px] border border-blue-200 font-medium flex items-center whitespace-nowrap">
              <Clock className="w-2.5 h-2.5 mr-1 text-blue-600 shrink-0" />
              <span>有草稿修改</span>
              {field.isDataImpactingChange && (
                <span className="ml-1 text-[9px] text-amber-800 bg-amber-100 px-1 rounded font-normal shrink-0">
                  含数据影响
                </span>
              )}
            </div>
          </div>
        );
      }
      return (
        <span className="min-h-[24px] inline-flex items-center px-2 py-0.5 rounded-[4px] text-[11px] font-medium whitespace-nowrap bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600 shrink-0" />
          已配置
        </span>
      );
    }
    return (
      <div className="space-y-1">
        <span className="min-h-[24px] inline-flex items-center px-2 py-0.5 rounded-[4px] text-[11px] font-medium whitespace-nowrap bg-amber-50 text-amber-700 border border-amber-200">
          <Clock className="w-3 h-3 mr-1 text-amber-600 shrink-0" />
          草稿
        </span>
        {field.isDataImpactingChange && (
          <div className="text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded-[4px] border border-amber-200 font-medium whitespace-nowrap">
            生效后需同步
          </div>
        )}
      </div>
    );
  };

  // 底座归属与数据影响提示 (不使用字段级 SYNCING 状态，根类型是唯一权威)
  const renderBaseStatusBadge = (field: FieldMappingItem) => {
    if (field.configStatus === 'DRAFT') {
      return (
        <span className="text-slate-400 text-[11px] italic whitespace-nowrap" title="草稿未生效，不进入正式查询底座">
          - (草稿未生效)
        </span>
      );
    }

    if (field.isInFormalQueryBase) {
      if (field.hasDraftModification && field.isDataImpactingChange) {
        return (
          <div className="space-y-0.5">
            <span className="min-h-[24px] inline-flex items-center text-[11px] font-medium whitespace-nowrap text-blue-700 bg-blue-50 px-2 py-0.5 rounded-[4px] border border-blue-200">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5 shrink-0"></span>
              已在正式底座
            </span>
            <div className="text-[10px] text-amber-700 font-medium leading-tight whitespace-nowrap">
              新修改待生效同步
            </div>
          </div>
        );
      }
      return (
        <span className="min-h-[24px] inline-flex items-center text-[11px] font-medium whitespace-nowrap text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-[4px] border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 shrink-0"></span>
          已在正式底座
        </span>
      );
    }

    return (
      <span className="min-h-[24px] inline-flex items-center px-2 py-0.5 rounded-[4px] text-[11px] font-medium whitespace-nowrap bg-amber-50 text-amber-800 border border-amber-300">
        <AlertTriangle className="w-3 h-3 mr-1 text-amber-600 shrink-0" />
        待进入正式底座
      </span>
    );
  };

  const renderDisplayTypeBadge = (displayType: FieldMappingItem['displayType']) => {
    switch (displayType) {
      case 'LINK':
        return <span className="h-5 inline-flex items-center px-1.5 py-0.5 rounded-[4px] bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-medium">超链接</span>;
      case 'FULLTEXT':
        return <span className="h-5 inline-flex items-center px-1.5 py-0.5 rounded-[4px] bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-medium">全文检索</span>;
      case 'CATEGORY_PATH':
        return <span className="h-5 inline-flex items-center px-1.5 py-0.5 rounded-[4px] bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-medium">分类树路径</span>;
      case 'ENUM_BADGE':
        return <span className="h-5 inline-flex items-center px-1.5 py-0.5 rounded-[4px] bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-medium">枚举标签</span>;
      case 'HIDDEN':
        return <span className="h-5 inline-flex items-center px-1.5 py-0.5 rounded-[4px] bg-slate-100 text-slate-500 border border-slate-200 text-[11px]">不展示</span>;
      case 'CONDITION_QUERY':
      default:
        return <span className="h-5 inline-flex items-center px-1.5 py-0.5 rounded-[4px] bg-slate-100 text-slate-700 border border-slate-200 text-[11px]">标准条件</span>;
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
      <div className="flex flex-wrap items-center justify-between bg-white border border-slate-200 rounded-[8px] px-4 py-2.5 shadow-2xs gap-2">
        <div className="flex items-center space-x-2 text-xs">
          <button
            type="button"
            onClick={onBackToOverview}
            className="text-slate-500 hover:text-blue-600 flex items-center font-medium cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            <span>接入配置总入口</span>
          </button>
          <span className="text-slate-300">/</span>
          <span className="text-slate-900 font-bold bg-slate-100 px-2 py-0.5 rounded-[4px] border border-slate-200">
            {currentRootType.name}
          </span>
          <span className="text-slate-300">/</span>
          <span className="text-slate-500">字段映射配置</span>
        </div>

        {/* 仅保留正式查询底座版本 */}
        <div className="flex items-center space-x-3 text-xs">
          <div className="text-slate-500">
            正式查询底座版本: <span className="font-mono font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{currentRootType.formalQueryBaseVersion}</span>
          </div>
          <div className="text-slate-500">
            底座可查字段: <span className="font-mono font-bold text-slate-800">{currentRootType.formalQueryableFieldCount}</span> 个
          </div>
        </div>
      </div>

      {/* 页面主标题与操作区 */}
      <div className="bg-white border border-slate-200 rounded-[8px] p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shadow-2xs">
        <div className="space-y-0.5">
          <div className="flex items-center space-x-2">
            <h2 className="text-sm font-bold text-slate-900 flex items-center">
              {formatRootTypeDisplayName(currentRootType.name, currentRootType.code)} - 字段配置明细
            </h2>
            <div className="relative">
              <button
                type="button"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                onClick={() => setShowTooltip(!showTooltip)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-0.5 rounded"
                title="查看根类型映射业务规则"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>

              {showTooltip && (
                <div className="absolute left-0 top-6 z-30 w-80 p-3 bg-slate-900 text-white rounded-[8px] shadow-xl text-xs leading-relaxed space-y-1.5">
                  <div className="font-bold flex items-center text-amber-400">
                    <Info className="w-3.5 h-3.5 mr-1" />
                    根类型字段映射规则说明
                  </div>
                  <p className="text-slate-300">
                    1. 映射以一条条字段为基本单元，直接归属根类型。
                  </p>
                  <p className="text-slate-300">
                    2. 生效保存不生成配置版本；仅当数据同步执行成功后，才原子替换「正式查询底座快照与版本」。
                  </p>
                </div>
              )}
            </div>
          </div>
          <p className="text-xs text-slate-500">
            已配置生效 <span className="font-mono font-semibold text-slate-800">{currentRootType.configuredFieldCount}</span> 个 | 正式可查 <span className="font-mono font-semibold text-blue-700">{currentRootType.formalQueryableFieldCount}</span> 个 | 草稿项 <span className="font-mono font-semibold text-amber-700">{totalDraftWorkItemCount}</span> 项
          </p>
        </div>

        {/* 顶部快捷操作工具栏 (统一 32px 高度，严格顺序：新建字段映射 -> 生效配置 -> 数据同步 -> 查询预览) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 1. 新建字段映射 (带下拉菜单) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowCreateDropdown(!showCreateDropdown)}
              disabled={!hasPermission}
              className={`h-8 px-3 rounded-[6px] text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                hasPermission
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
              }`}
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span className="whitespace-nowrap">新建字段映射</span>
              <ChevronDown className="w-3 h-3 ml-0.5 shrink-0" />
            </button>

            {showCreateDropdown && (
              <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-1 w-44 bg-white border border-slate-200 rounded-[6px] shadow-lg py-1 z-30 text-xs text-slate-700 animate-in fade-in zoom-in duration-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateDropdown(false);
                    onOpenCreateSingle();
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center space-x-2 cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>单个新建映射</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateDropdown(false);
                    onOpenBatchImport();
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center space-x-2 cursor-pointer border-t border-slate-100 whitespace-nowrap"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>从 PLM 批量选择</span>
                </button>
              </div>
            )}
          </div>

          {/* 2. 生效发布配置 */}
          <button
            type="button"
            onClick={onPublishConfig}
            disabled={totalDraftWorkItemCount === 0 || !hasPermission}
            className={`h-8 px-3 rounded-[6px] text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              totalDraftWorkItemCount > 0 && hasPermission
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
            }`}
            title={
              totalDraftWorkItemCount === 0
                ? '当前没有待生效的草稿修改'
                : `生效 ${totalDraftWorkItemCount} 项草稿配置`
            }
          >
            <Send className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">生效配置</span>
            {totalDraftWorkItemCount > 0 && (
              <span className="bg-emerald-800 text-emerald-100 text-[10px] px-1.5 py-0.2 rounded-full font-mono font-semibold shrink-0">
                {totalDraftWorkItemCount}
              </span>
            )}
          </button>

          {/* 3. 数据同步触发 */}
          <button
            type="button"
            onClick={onTriggerDataSync}
            disabled={!canTriggerSync}
            className={`h-8 px-3 rounded-[6px] text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              isSyncFailed || isSyncError
                ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-2xs'
                : hasPendingSync
                ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-2xs'
                : canTriggerSync
                ? 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300'
                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
            }`}
            title={
              !canTriggerSync
                ? '当前根类型无已配置字段或正处于同步中'
                : isSyncFailed
                ? '上一同步批次存在致命失败，点击重试'
                : isSyncError
                ? '上一同步有异常记录，点击重试同步'
                : hasPendingSync
                ? '存在待同步的数据影响变更'
                : '按当前生效配置执行数据同步'
            }
          >
            {isSyncFailed || isSyncError ? (
              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5 shrink-0" />
            )}
            <span className="whitespace-nowrap">{isSyncFailed || isSyncError ? '重试数据同步' : '数据同步'}</span>
            {hasPendingSync && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 ml-0.5 shrink-0"></span>}
          </button>

          {/* 4. 查询预览 */}
          <button
            type="button"
            onClick={onOpenQueryPreview}
            className="h-8 px-3 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-[6px] text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Eye className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="whitespace-nowrap">查询预览</span>
          </button>
        </div>
      </div>

      {/* 筛选与搜索工具条 (统一 32px 控件高度) */}
      <div className="bg-white border border-slate-200 rounded-[8px] p-3 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* 状态筛选 Tabs */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-[6px] text-xs font-medium h-8">
            <button
              type="button"
              onClick={() => {
                setStatusFilter('ALL');
                setCurrentPage(1);
              }}
              className={`h-7 px-3 rounded-[4px] transition-colors cursor-pointer flex items-center ${
                statusFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              全部 ({rootTypeFields.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setStatusFilter('CONFIGURED');
                setCurrentPage(1);
              }}
              className={`h-7 px-3 rounded-[4px] transition-colors cursor-pointer flex items-center ${
                statusFilter === 'CONFIGURED'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              已配置 ({configuredCount})
            </button>
            <button
              type="button"
              onClick={() => {
                setStatusFilter('DRAFT');
                setCurrentPage(1);
              }}
              className={`h-7 px-3 rounded-[4px] transition-colors cursor-pointer flex items-center ${
                statusFilter === 'DRAFT'
                  ? 'bg-white text-amber-800 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              草稿项 ({totalDraftWorkItemCount})
            </button>
          </div>

          {/* 搜索框 */}
          <div className="relative min-w-[260px] max-w-sm flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="搜索源字段、前台显示名称、Manticore 字段..."
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-8 pl-8 pr-3 text-xs bg-slate-50 border border-slate-300 rounded-[6px] focus:bg-white focus:outline-hidden focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        <div className="text-xs text-slate-500">
          显示 <span className="font-semibold text-slate-900 font-mono">{filteredFields.length}</span> 条字段映射
        </div>
      </div>

      {/* 字段配置主表格 (PLM 来源字段与 Manticore 检索字段相邻排列) */}
      <div className="bg-white border border-slate-200 rounded-[8px] overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold sticky top-0 z-10">
              <tr>
                <th className="py-2.5 px-3 min-w-[150px] whitespace-nowrap">PLM 来源字段</th>
                <th className="py-2.5 px-3 min-w-[150px] whitespace-nowrap">Manticore 检索字段</th>
                <th className="py-2.5 px-3 min-w-[140px] whitespace-nowrap">前台显示名称</th>
                <th className="py-2.5 px-3 min-w-[100px] whitespace-nowrap">PLM 业务类型</th>
                <th className="py-2.5 px-3 min-w-[90px] whitespace-nowrap">底层类型</th>
                <th className="py-2.5 px-3 min-w-[90px] whitespace-nowrap">展示方式</th>
                <th className="py-2.5 px-3 min-w-[90px] whitespace-nowrap">查询能力</th>
                <th className="py-2.5 px-2.5 text-center min-w-[60px] whitespace-nowrap">排序</th>
                <th className="py-2.5 px-2.5 text-center min-w-[70px] whitespace-nowrap">结果展示</th>
                <th className="py-2.5 px-3 min-w-[130px] whitespace-nowrap">配置状态</th>
                <th className="py-2.5 px-3 min-w-[130px] whitespace-nowrap">底座状态</th>
                <th className="py-2.5 px-3 text-center min-w-[120px] sticky right-0 bg-slate-50 border-l border-slate-200/80 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.03)] z-10 whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {paginatedFields.length > 0 ? (
                paginatedFields.map(field => (
                  <tr key={field.id} className="hover:bg-slate-50/70 transition-colors group">
                    {/* 1. PLM 来源字段 */}
                    <td className="py-2.5 px-3">
                      <div className="font-mono font-semibold text-slate-900">{field.sourceFieldName}</div>
                      <div className="text-[11px] text-slate-500 flex items-center mt-0.5">
                        <span>{field.sourceDisplayName}</span>
                        {field.isDisplayNameMissing && (
                          <span className="ml-1 text-[9px] text-amber-800 bg-amber-100 px-1 rounded font-normal" title="PLM 未返回显示名，已按字段名兜底">
                            显示名兜底
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 2. Manticore 检索字段 (紧邻源字段) */}
                    <td className="py-2.5 px-3 font-mono font-semibold text-blue-700">
                      <div className="flex items-center space-x-1">
                        <ArrowRight className="w-3 h-3 text-slate-300 shrink-0" />
                        <span>{field.manticoreField}</span>
                      </div>
                    </td>

                    {/* 3. 前台显示名称 */}
                    <td className="py-2.5 px-3 font-medium text-slate-900">
                      {field.hasDraftModification && field.draftData?.displayTitle ? (
                        <div>
                          <span className="text-slate-800">{field.displayTitle}</span>
                          <div className="text-[10px] text-blue-700 font-semibold flex items-center mt-0.5">
                            草稿修改: {field.draftData.displayTitle}
                          </div>
                        </div>
                      ) : (
                        field.displayTitle
                      )}
                    </td>

                    {/* 4. PLM 业务类型 */}
                    <td className="py-2.5 px-3 text-slate-600">
                      <span>{field.sourceDataTypeLabel}</span>
                      {field.defaultUnit && (
                        <span className="text-[10px] font-mono text-slate-400 ml-1">({field.defaultUnit})</span>
                      )}
                    </td>

                    {/* 5. Manticore 底层存储类型 */}
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                      {field.manticoreType}
                    </td>

                    {/* 6. 展示方式 */}
                    <td className="py-2.5 px-3">
                      {renderDisplayTypeBadge(
                        field.hasDraftModification && field.draftData?.displayType
                          ? field.draftData.displayType
                          : field.displayType
                      )}
                    </td>

                    {/* 7. 查询能力 */}
                    <td className="py-2.5 px-3">
                      {renderQueryCapabilityBadge(
                        field.hasDraftModification && field.draftData?.queryCapability
                          ? field.draftData.queryCapability
                          : field.queryCapability
                      )}
                    </td>

                    {/* 8. 允许排序 */}
                    <td className="py-2.5 px-2.5 text-center">
                      {(field.hasDraftModification && field.draftData?.isSortable !== undefined
                        ? field.draftData.isSortable
                        : field.isSortable) ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mx-auto" />
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    {/* 9. 结果展示 */}
                    <td className="py-2.5 px-2.5 text-center">
                      {(field.hasDraftModification && field.draftData?.isDisplayInResult !== undefined
                        ? field.draftData.isDisplayInResult
                        : field.isDisplayInResult) ? (
                        <span className="text-emerald-700 font-semibold text-[11px]">是</span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">否</span>
                      )}
                    </td>

                    {/* 10. 配置状态 */}
                    <td className="py-2.5 px-3">
                      {renderConfigStatusBadge(field)}
                    </td>

                    {/* 11. 底座状态 */}
                    <td className="py-2.5 px-3">
                      {renderBaseStatusBadge(field)}
                    </td>

                    {/* 12. 操作列 (粘性吸附) */}
                    <td className="py-2.5 px-3 text-center sticky right-0 bg-white group-hover:bg-slate-50 border-l border-slate-200/80 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.03)] z-10 min-w-[120px] whitespace-nowrap">
                      <div className="flex items-center justify-center space-x-1.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onViewFieldDetail(field)}
                          className="h-7 px-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-[4px] text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
                        >
                          详情
                        </button>
                        <button
                          type="button"
                          onClick={() => onEditField(field)}
                          disabled={!hasPermission}
                          className={`h-7 px-2 rounded-[4px] text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                            hasPermission
                              ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/60'
                              : 'bg-slate-50 text-slate-300 border border-slate-200 cursor-not-allowed'
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
        <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
          <div>
            共 <span className="font-semibold text-slate-900 font-mono">{filteredFields.length}</span> 条字段映射，每页 {pageSize} 条
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-7 px-2.5 border border-slate-300 rounded-[4px] bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              上一页
            </button>
            <span className="font-mono text-slate-800 text-xs">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="h-7 px-2.5 border border-slate-300 rounded-[4px] bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              下一页
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
