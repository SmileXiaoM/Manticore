import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Search,
  Plus,
  Send,
  PlayCircle,
  PauseCircle,
  Eye,
  FileSpreadsheet,
  ListOrdered,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  Database,
  RotateCcw,
  AlertCircle,
  Link,
  Undo2
} from 'lucide-react';
import { ExecutionSchedule, scheduleLabel } from '../../data/operations';
import {
  FieldMappingItem,
  MappingObjectType,
  formatRootTypeDisplayName
} from '../../stage1MappingTypes';
import { isFieldHyperlinkValid } from '../../stage1HyperlinkUtils';
import { FloatingMoreMenu } from './FloatingMoreMenu';
import { HelpTooltip } from '../ui/HelpTooltip';
import { TablePagination } from '../ui/TablePagination';

interface FieldMappingListViewProps {
  currentRootType: MappingObjectType;
  fields: FieldMappingItem[];
  onBackToOverview: () => void;
  onOpenCreateSingle: () => void;
  onOpenBatchImport: () => void;
  onOpenBatchDisplayOrder: () => void;
  onEditField: (field: FieldMappingItem) => void;
  onViewFieldDetail: (field: FieldMappingItem) => void;
  onDiscardDraft: (field: FieldMappingItem) => void;
  onPublishConfig: () => void;
  onToggleAccess: () => void;
  onResetAccess: () => void;
  onOpenQueryPreview: () => void;
  syncSchedule?: ExecutionSchedule;
  onConfigureSyncSchedule: () => void;
  hasPermission?: boolean;
}

export const FieldMappingListView: React.FC<FieldMappingListViewProps> = ({
  currentRootType,
  fields,
  onBackToOverview,
  onOpenCreateSingle,
  onOpenBatchImport,
  onOpenBatchDisplayOrder,
  onEditField,
  onViewFieldDetail,
  onDiscardDraft,
  onPublishConfig,
  onToggleAccess,
  onResetAccess,
  onOpenQueryPreview,
  syncSchedule,
  onConfigureSyncSchedule,
  hasPermission = true
}) => {
  // 筛选与搜索
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CONFIGURED' | 'DRAFT'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // 按展示顺序从小到大排列；相同值依靠稳定排序保持原有相对顺序并相邻展示
  const rootTypeFields = useMemo(() => {
    return [...fields.filter(f => f.rootTypeId === currentRootType.id)].sort((a, b) => {
      const orderA = a.draftData?.displayOrder ?? a.draftData?.defaultDisplayOrder ?? a.displayOrder ?? a.defaultDisplayOrder ?? 999;
      const orderB = b.draftData?.displayOrder ?? b.draftData?.defaultDisplayOrder ?? b.displayOrder ?? b.defaultDisplayOrder ?? 999;
      return orderA - orderB;
    });
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

  const paginatedFields = useMemo(() => {
    return filteredFields.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [filteredFields, currentPage, pageSize]);

  const renderConfigStatusBadge = (field: FieldMappingItem) => {
    if (field.configStatus === 'CONFIGURED') {
      return (
        <span className="h-6 inline-flex items-center px-2 rounded-ty-xs text-ty-xs font-medium whitespace-nowrap bg-[var(--ty-green-lightest-color)] text-[var(--ty-font-main-light-color)] border border-[var(--ty-green-color)]/30">
          <CheckCircle2 className="w-3 h-3 mr-1 text-[var(--ty-green-color)] shrink-0" />
          {field.hasDraftModification ? '已配置 · 有草稿' : '已配置'}
        </span>
      );
    }
    return (
      <span className="h-6 inline-flex items-center px-2 rounded-ty-xs text-ty-xs font-medium whitespace-nowrap bg-[var(--ty-orange-lightest-color)] text-[var(--ty-font-main-light-color)] border border-[var(--ty-orange-color)]/30">
        <Clock className="w-3 h-3 mr-1 text-[var(--ty-orange-color)] shrink-0" />
        {field.isDataImpactingChange ? '草稿 · 数据影响' : '草稿'}
      </span>
    );
  };

  // 底座归属与数据影响提示 (不使用字段级 SYNCING 状态，根类型是唯一权威)
  const renderBaseStatusBadge = (field: FieldMappingItem) => {
    if (field.configStatus === 'DRAFT') {
      return (
        <span className="text-[var(--ty-font-sub-light-color)] text-ty-xs whitespace-nowrap">
          草稿未生效
        </span>
      );
    }

    if (field.isInFormalQueryBase) {
      if (field.hasDraftModification && field.isDataImpactingChange) {
        return (
          <span className="h-6 inline-flex items-center text-ty-xs font-medium whitespace-nowrap text-[var(--ty-font-main-light-color)] bg-[var(--ty-blue-lightest-color)] border border-[var(--ty-blue-color)]/30 px-2 rounded-ty-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--ty-blue-color)] mr-2 shrink-0"></span>
            正式底座 · 待更新
          </span>
        );
      }
      return (
        <span className="h-6 inline-flex items-center text-ty-xs font-medium whitespace-normal max-w-full text-[var(--ty-font-main-light-color)] bg-[var(--ty-green-lightest-color)] border border-[var(--ty-green-color)]/30 min-h-6 px-2 inline-flex items-center rounded-ty-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--ty-green-color)] mr-2 shrink-0"></span>
          已在正式底座
        </span>
      );
    }

    return (
      <span className="h-6 inline-flex items-center min-h-6 px-2 inline-flex items-center rounded-ty-xs text-ty-xs font-medium whitespace-normal max-w-full bg-[var(--ty-orange-lightest-color)] text-[var(--ty-font-main-light-color)] border border-[var(--ty-orange-color)]/30">
        <AlertTriangle className="w-3 h-3 mr-1 text-[var(--ty-orange-color)] shrink-0" />
        待进入正式底座
      </span>
    );
  };

  const renderQueryCapabilityBadge = (cap: FieldMappingItem['queryCapability']) => {
    switch (cap) {
      case 'BOTH':
        return <span className="font-semibold text-[var(--ty-font-main-color)] text-ty-xs">条件 + 全文</span>;
      case 'FULLTEXT_SEARCH':
        return <span className="text-[var(--ty-primary-color)] text-ty-xs font-medium">全文大字段</span>;
      case 'QUERY_CONDITION':
        return <span className="text-[var(--ty-font-sub-color)] text-ty-xs">条件查询</span>;
      case 'NONE':
      default:
        return <span className="text-[var(--ty-font-sub-light-color)] text-ty-xs">仅作展示</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* 顶部面包屑与返回导航 */}
      <div className="flex flex-wrap items-center justify-between bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm px-4 py-2 gap-2">
        <div className="flex items-center space-x-2 text-ty-xs">
          <button
            type="button"
            onClick={onBackToOverview}
            className="text-[var(--ty-font-sub-color)] hover:text-[var(--ty-primary-color)] flex items-center font-medium cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            <span>接入配置总入口</span>
          </button>
          <span className="text-[var(--ty-border-color)]">/</span>
          <span className="text-[var(--ty-font-main-color)] font-bold bg-[var(--ty-fill-weak-dark-color)] min-h-6 px-2 inline-flex items-center rounded-ty-sm border border-[var(--ty-border-color)]">
            {currentRootType.name}
          </span>
          <span className="text-[var(--ty-border-color)]">/</span>
          <span className="text-[var(--ty-font-sub-color)]">字段映射配置</span>
        </div>

        {/* 根类型正式底座可查字段数统计 */}
        <div className="flex items-center space-x-3 text-ty-xs">
          <div className="text-[var(--ty-font-sub-color)]">
            正式底座可查字段: <span className="font-mono font-bold text-[var(--ty-font-main-color)] bg-[var(--ty-fill-weak-dark-color)] min-h-6 px-2 inline-flex items-center rounded-ty-sm border border-[var(--ty-border-color)]">{currentRootType.formalQueryableFieldCount}</span> 个
          </div>
        </div>
      </div>

      {/* 页面主标题与操作区 */}
      <div className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-4 flex flex-col xl:flex-row xl:flex-wrap xl:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center space-x-2">
            <h2 className="text-ty-sm font-bold text-[var(--ty-font-main-color)] flex items-center">
              {formatRootTypeDisplayName(currentRootType.name, currentRootType.code)} - 字段配置明细
            </h2>
            <HelpTooltip
              label="查看根类型映射业务规则"
              content="字段映射直接归属根类型；配置发布后，由常驻服务按检查频率轮询中间表并逐条写入 Manticore。"
            />
          </div>
          <p className="text-ty-xs text-[var(--ty-font-sub-color)]">
            已配置生效 <span className="font-mono font-semibold text-[var(--ty-font-main-color)]">{currentRootType.configuredFieldCount}</span> 个 | 正式可查 <span className="font-mono font-semibold text-[var(--ty-blue-color)]">{currentRootType.formalQueryableFieldCount}</span> 个 | 草稿项 <span className="font-mono font-semibold text-[var(--ty-orange-color)]">{totalDraftWorkItemCount}</span> 项
          </p>
        </div>

        {/* 顶部快捷操作工具栏 */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpenCreateSingle}
            disabled={!hasPermission}
            className={`h-8 px-3 rounded-ty-sm text-ty-xs font-medium flex items-center gap-2 transition-colors whitespace-nowrap ${hasPermission ? 'bg-[var(--ty-primary-color)] hover:bg-[var(--ty-primary-hover-color)] text-[var(--ty-font-white-color)]' : 'bg-[var(--ty-fill-weak-dark-color)] text-[var(--ty-font-sub-light-color)] border border-[var(--ty-border-color)] cursor-not-allowed'}`}
          >
            <Plus className="w-3.5 h-3.5" />新建属性
          </button>
          <button
            type="button"
            onClick={onOpenBatchImport}
            disabled={!hasPermission}
            className="h-8 px-3 rounded-ty-sm text-ty-xs font-medium flex items-center gap-2 border border-[var(--ty-border-color)] bg-[var(--ty-fill-white-color)] hover:bg-[var(--ty-fill-weak-dark-color)] disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[var(--ty-green-color)]" />批量同步属性
          </button>
          <button
            type="button"
            onClick={onOpenBatchDisplayOrder}
            disabled={!hasPermission || rootTypeFields.length === 0}
            className="h-8 px-3 rounded-ty-sm text-ty-xs font-medium flex items-center gap-2 border border-[var(--ty-border-color)] bg-[var(--ty-fill-white-color)] hover:bg-[var(--ty-fill-weak-dark-color)] disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            title="选择多个已有属性并调整展示顺序与列宽"
          >
            <ListOrdered className="w-3.5 h-3.5 text-[var(--ty-primary-color)]" />批量调整顺序/列宽
          </button>

          {/* 2. 发布配置 */}
          <button
            type="button"
            onClick={onPublishConfig}
            disabled={totalDraftWorkItemCount === 0 || !hasPermission}
            className={`h-8 px-3 rounded-ty-sm text-ty-xs font-medium flex items-center space-x-2 transition-colors cursor-pointer whitespace-nowrap ${
              totalDraftWorkItemCount > 0 && hasPermission
                ? 'bg-[var(--ty-green-color)] hover:opacity-90 active:opacity-100 text-[var(--ty-font-white-color)]'
                : 'bg-[var(--ty-fill-weak-dark-color)] text-[var(--ty-font-sub-light-color)] border border-[var(--ty-border-color)] cursor-not-allowed'
            }`}
            title={
              totalDraftWorkItemCount === 0
                ? '当前没有待发布的草稿修改'
                : `发布 ${totalDraftWorkItemCount} 项草稿配置`
            }
          >
            <Send className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">发布配置</span>
            {totalDraftWorkItemCount > 0 && (
              <span className="bg-[var(--ty-fill-white-color)]/20 text-[var(--ty-font-white-color)] text-ty-2xs min-h-6 px-2 inline-flex items-center rounded-ty-xs font-mono font-semibold shrink-0">
                {totalDraftWorkItemCount}
              </span>
            )}
          </button>

          {/* 3. 根类型接入启停：停用后常驻服务跳过该中间表 */}
          <button
            type="button"
            onClick={onToggleAccess}
            disabled={!hasPermission || !currentRootType.serviceStarted}
            className="h-8 px-3 rounded-ty-sm text-ty-xs font-medium flex items-center gap-2 border border-[var(--ty-border-color)] bg-[var(--ty-fill-white-color)] hover:bg-[var(--ty-fill-weak-dark-color)] disabled:opacity-40 disabled:cursor-not-allowed"
            title={!currentRootType.serviceStarted ? '首次发布并开启同步服务后可控制接入状态' : currentRootType.accessEnabled ? '停用后不再轮询该类型中间表' : '启用后恢复轮询该类型中间表'}
          >
            {currentRootType.accessEnabled ? <PauseCircle className="w-3.5 h-3.5" /> : <PlayCircle className="w-3.5 h-3.5" />}
            <span>{currentRootType.accessEnabled ? '停用接入' : '启用接入'}</span>
          </button>

          <button
            type="button"
            onClick={onConfigureSyncSchedule}
            className="h-8 px-3 border border-[var(--ty-border-color)] bg-[var(--ty-fill-white-color)] hover:bg-[var(--ty-fill-weak-dark-color)] text-[var(--ty-font-main-color)] rounded-ty-sm text-ty-xs font-medium flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
            title="设置常驻服务检查当前根类型中间表的间隔"
          >
            <Clock className="w-3.5 h-3.5 text-[var(--ty-icon-color)]" />
            <span>检查频率：{currentRootType.accessEnabled ? scheduleLabel(syncSchedule, currentRootType.pollingIntervalMinutes) : '已停用'}</span>
          </button>

          {/* 4. 查询预览 */}
          <button
            type="button"
            onClick={onOpenQueryPreview}
            className="h-8 px-3 border border-[var(--ty-border-color)] bg-[var(--ty-fill-white-color)] hover:bg-[var(--ty-fill-weak-dark-color)] text-[var(--ty-font-main-color)] rounded-ty-sm text-ty-xs font-medium flex items-center space-x-2 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Eye className="w-3.5 h-3.5 text-[var(--ty-icon-color)] shrink-0" />
            <span className="whitespace-nowrap">查询预览</span>
          </button>

          {/* 5. 更多操作下拉菜单 (重置接入 / 使用 FloatingMoreMenu 传送至 body 防止裁切) */}
          <FloatingMoreMenu
            buttonClassName="h-8 w-8 rounded-ty-sm border border-[var(--ty-border-color)] flex items-center justify-center transition-colors cursor-pointer shrink-0"
            items={[
              {
                id: `reset-access-${currentRootType.id}`,
                label: '重置接入',
                description: '清空正式查询数据并转为草稿',
                icon: <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-[var(--ty-red-color)]" />,
                danger: true,
                disabled: !hasPermission || currentRootType.syncStatus === 'RUNNING' || currentRootType.syncStatus === 'RESETTING',
                onClick: onResetAccess
              }
            ]}
          />
        </div>
      </div>

      {/* 筛选与搜索工具条 (统一 32px 控件高度) */}
      <div className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* 状态筛选 Tabs */}
          <div className="flex items-center bg-[var(--ty-fill-weak-dark-color)] p-0.5 rounded-ty-sm text-ty-xs font-medium h-8">
            <button
              type="button"
              onClick={() => {
                setStatusFilter('ALL');
                setCurrentPage(1);
              }}
              className={`h-7 px-3 rounded-ty-sm transition-colors cursor-pointer flex items-center ${
                statusFilter === 'ALL'
                  ? 'bg-[var(--ty-fill-white-color)] text-[var(--ty-font-main-color)] font-semibold'
                  : 'text-[var(--ty-font-sub-color)] hover:text-[var(--ty-font-main-color)]'
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
              className={`h-7 px-3 rounded-ty-sm transition-colors cursor-pointer flex items-center ${
                statusFilter === 'CONFIGURED'
                  ? 'bg-[var(--ty-fill-white-color)] text-[var(--ty-font-main-color)] font-semibold'
                  : 'text-[var(--ty-font-sub-color)] hover:text-[var(--ty-font-main-color)]'
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
              className={`h-7 px-3 rounded-ty-sm transition-colors cursor-pointer flex items-center ${
                statusFilter === 'DRAFT'
                  ? 'bg-[var(--ty-fill-white-color)] text-[var(--ty-orange-color)] font-semibold'
                  : 'text-[var(--ty-font-sub-color)] hover:text-[var(--ty-font-main-color)]'
              }`}
            >
              草稿项 ({totalDraftWorkItemCount})
            </button>
          </div>

          {/* 搜索框 */}
          <div className="relative min-w-[260px] max-w-sm flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ty-icon-light-color)]" />
            <input
              type="text"
              placeholder="搜索源字段、前台显示名称、Manticore 字段..."
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-8 pl-8 pr-3 text-ty-xs bg-[var(--ty-fill-color)] border border-[var(--ty-border-color)] rounded-ty-sm focus:bg-[var(--ty-fill-white-color)] focus:outline-hidden focus:border-[var(--ty-primary-color)] transition-colors"
            />
          </div>
        </div>

        <div className="text-ty-xs text-[var(--ty-font-sub-color)]">
          显示 <span className="font-semibold text-[var(--ty-font-main-color)] font-mono">{filteredFields.length}</span> 条字段映射
        </div>
      </div>

      {/* 字段配置主表格 (PLM 来源字段与 Manticore 检索字段相邻排列) */}
      <div className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="ty-data-table w-full min-w-[1540px] text-left text-ty-xs">
            <thead className="bg-[var(--ty-fill-weak-dark-color)] border-b border-[var(--ty-border-color)] text-[var(--ty-font-sub-color)] font-semibold sticky top-0 z-10">
              <tr>
                <th className="w-12 py-2 px-2 text-center">序号</th>
                <th className="min-w-40 py-2 px-2">PLM 来源字段</th>
                <th className="min-w-44 py-2 px-2">Manticore 检索字段</th>
                <th className="min-w-40 py-2 px-2">前台显示名称</th>
                <th className="min-w-24 py-2 px-2 text-center"><span className="inline-flex items-center gap-1">展示顺序<HelpTooltip label="查看展示顺序规则" content="数字越小越靠前；允许相同顺序号，相同顺序的属性会相邻展示。" /></span></th>
                <th className="min-w-32 py-2 px-2">PLM 业务类型</th>
                <th className="min-w-24 py-2 px-2">底层类型</th>
                <th className="min-w-28 py-2 px-2">查询能力</th>
                <th className="w-16 py-2 px-2 text-center">排序</th>
                <th className="min-w-28 py-2 px-2 text-center">结果展示</th>
                <th className="min-w-36 py-2 px-2">配置状态</th>
                <th className="min-w-36 py-2 px-2">底座状态</th>
                <th className="min-w-32 py-2 px-2 text-center sticky right-0 bg-[var(--ty-fill-weak-dark-color)] border-l border-[var(--ty-border-color)] z-10">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--ty-border-light-color)] text-[var(--ty-font-main-color)]">
              {paginatedFields.length > 0 ? (
                paginatedFields.map((field, index) => (
                  <tr key={field.id} className="hover:bg-[var(--ty-fill-weak-dark-color)]/50 transition-colors group">
                    <td className="py-2 px-2 text-center text-[var(--ty-font-sub-color)]">{(currentPage - 1) * pageSize + index + 1}</td>
                    {/* 1. PLM 来源字段 */}
                    <td className="py-2 px-2 break-words">
                      <div className="font-mono font-semibold break-all text-[var(--ty-font-main-color)] inline-flex items-center gap-1">
                        <span>{field.sourceFieldName}</span>
                        <HelpTooltip label={`查看${field.sourceFieldName}来源定义`} content={`PLM 显示名：${field.sourceDisplayName}；源字段 Key：${field.sourceFieldKey}${field.isDisplayNameMissing ? '；PLM 未返回显示名，当前按字段名兜底' : ''}`} />
                      </div>
                    </td>

                    {/* 2. Manticore 检索字段 (紧邻源字段) */}
                    <td className="py-2 px-2 break-words font-mono font-semibold text-[var(--ty-blue-color)]">
                      <div className="flex items-center space-x-1">
                        <ArrowRight className="w-3 h-3 text-[var(--ty-border-color)] shrink-0" />
                        <span className="min-w-0 break-all">{field.manticoreField}</span>
                      </div>
                    </td>

                    {/* 3. 前台显示名称 */}
                    <td className="py-2 px-2 break-words font-medium text-[var(--ty-font-main-color)]">
                      {field.hasDraftModification && field.draftData?.displayTitle ? (
                        <span className="inline-flex items-center gap-1">
                          <span className="text-[var(--ty-font-main-color)]">{field.displayTitle}</span>
                          <HelpTooltip label="查看显示名称草稿" content={`草稿拟修改为：${field.draftData.displayTitle}`} />
                        </span>
                      ) : (
                        field.displayTitle
                      )}
                    </td>

                    {/* 展示顺序 */}
                    <td className="py-2 px-2 text-center">
                      {field.hasDraftModification && field.draftData?.displayOrder !== undefined ? (
                        <span className="font-mono font-bold text-[var(--ty-font-main-color)] inline-flex items-center gap-1">
                          <span className="min-h-6 px-2 inline-flex items-center rounded-ty-xs bg-[var(--ty-blue-lightest-color)] text-[var(--ty-font-main-light-color)] border border-[var(--ty-blue-color)]/30 text-ty-xs">
                            {field.draftData.displayOrder}
                          </span>
                          {field.draftData.displayOrder !== field.displayOrder && (
                            <HelpTooltip label="查看正式展示顺序" content={`当前正式顺序：${field.displayOrder ?? field.defaultDisplayOrder ?? '-'}；发布后采用草稿顺序。`} />
                          )}
                        </span>
                      ) : (
                        <span className="font-mono font-semibold break-all text-[var(--ty-font-main-color)] min-h-6 px-2 inline-flex items-center rounded-ty-xs bg-[var(--ty-fill-weak-dark-color)] border border-[var(--ty-border-light-color)] text-ty-xs">
                          {field.displayOrder ?? field.defaultDisplayOrder ?? '-'}
                        </span>
                      )}
                    </td>

                    {/* 4. PLM 业务类型 */}
                    <td className="py-2 px-2 break-words text-[var(--ty-font-sub-color)]">
                      <span>{field.sourceDataTypeLabel}</span>
                      {field.defaultUnit && (
                        <span className="text-ty-2xs font-mono text-[var(--ty-font-sub-light-color)] ml-1">({field.defaultUnit})</span>
                      )}
                    </td>

                    {/* 5. Manticore 底层存储类型 */}
                    <td className="py-2 px-2 break-words font-mono text-ty-xs text-[var(--ty-font-sub-color)]">
                      {field.manticoreType}
                    </td>

                    {/* 6. 查询能力 */}
                    <td className="py-2 px-2 break-words">
                      {renderQueryCapabilityBadge(
                        field.hasDraftModification && field.draftData?.queryCapability
                          ? field.draftData.queryCapability
                          : field.queryCapability
                      )}
                    </td>

                    {/* 7. 允许排序 */}
                    <td className="py-2 px-2 text-center">
                      {(field.hasDraftModification && field.draftData?.isSortable !== undefined
                        ? field.draftData.isSortable
                        : field.isSortable) ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[var(--ty-green-color)] mx-auto" />
                      ) : (
                        <span className="text-[var(--ty-font-placeholder-color)]">-</span>
                      )}
                    </td>

                    {/* 8. 结果展示 (支持超链接标记，复用统一有效超链接判定口径) */}
                    <td className="py-2 px-2 text-center">
                      {(() => {
                        if (!field.isDisplayInResult) {
                          return <span className="text-[var(--ty-font-sub-light-color)] text-ty-xs">否</span>;
                        }

                        const hasValidLink = isFieldHyperlinkValid(field);

                        if (hasValidLink) {
                          return (
                            <span
                              className="inline-flex items-center min-h-6 px-2 inline-flex items-center rounded-ty-xs bg-[var(--ty-blue-lightest-color)] text-[var(--ty-font-main-light-color)] border border-[var(--ty-blue-color)]/30 text-ty-xs font-semibold whitespace-normal max-w-full"
                              title="在查询结果中以源系统超链接形式展示 (配置完整有效)"
                            >
                              <Link className="w-2.5 h-2.5 mr-1 text-[var(--ty-blue-color)] shrink-0" />
                              是 · 超链接
                            </span>
                          );
                        }

                        return <span className="text-[var(--ty-green-color)] font-semibold text-ty-xs">是</span>;
                      })()}
                    </td>

                    {/* 9. 配置状态 */}
                    <td className="py-2 px-2 break-words">
                      {renderConfigStatusBadge(field)}
                    </td>

                    {/* 11. 底座状态 */}
                    <td className="py-2 px-2 break-words">
                      {renderBaseStatusBadge(field)}
                    </td>

                    {/* 12. 操作列 (粘性吸附) */}
                    <td className="py-2 px-2 break-words text-center sticky right-0 bg-[var(--ty-fill-white-color)] group-hover:bg-[var(--ty-fill-weak-dark-color)]/50 border-l border-[var(--ty-border-color)] z-10 whitespace-nowrap">
                      <div className="flex items-center justify-center space-x-2 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onViewFieldDetail(field)}
                          className="h-7 px-2 bg-[var(--ty-fill-white-color)] hover:bg-[var(--ty-fill-weak-dark-color)] text-[var(--ty-font-main-color)] border border-[var(--ty-border-color)] rounded-ty-sm text-ty-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
                        >
                          详情
                        </button>
                        <button
                          type="button"
                          onClick={() => onEditField(field)}
                          disabled={!hasPermission}
                          className={`h-7 px-2 rounded-ty-sm text-ty-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                            hasPermission
                              ? 'bg-[var(--ty-primary-lighter-color)] hover:bg-[var(--ty-primary-light-color)] text-[var(--ty-primary-color)]'
                              : 'bg-[var(--ty-fill-weak-dark-color)] text-[var(--ty-font-sub-light-color)] border border-[var(--ty-border-color)] cursor-not-allowed'
                          }`}
                        >
                          编辑
                        </button>
                        {(field.configStatus === 'DRAFT' || field.hasDraftModification) && (
                          <FloatingMoreMenu
                            buttonTitle={`${field.displayTitle}更多操作`}
                            buttonClassName="h-7 w-7 rounded-ty-sm border border-[var(--ty-border-color)] bg-[var(--ty-fill-white-color)] hover:bg-[var(--ty-fill-weak-dark-color)] inline-flex items-center justify-center"
                            items={[{
                              id: `discard-draft-${field.id}`,
                              label: field.configStatus === 'DRAFT' ? '删除草稿' : '放弃草稿修改',
                              description: field.configStatus === 'DRAFT' ? '移除尚未发布的字段' : '恢复并继续使用正式配置',
                              icon: <Undo2 className="w-3.5 h-3.5" />,
                              danger: true,
                              disabled: !hasPermission,
                              onClick: () => onDiscardDraft(field)
                            }]}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-[var(--ty-font-sub-light-color)]">
                    <FileSpreadsheet className="w-8 h-8 text-[var(--ty-icon-lighter-color)] mx-auto mb-2" />
                    未找到符合条件的字段映射记录
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          total={filteredFields.length}
          page={currentPage}
          pageSize={pageSize}
          itemLabel="条字段映射"
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
        />
      </div>
    </div>
  );
};
