import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  SyncErrorRecord,
  formatRootTypeDisplayName
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

  // 容器尺寸观察器：用于区分 1280px 及以下紧凑图标模式与 1440px 及以上展开文字模式
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      // 视口宽度减去侧边栏(256px)与内容区内边距(48px)预估初始值
      return Math.max(320, window.innerWidth - 304);
    }
    return 1134;
  });

  useEffect(() => {
    const el = tableContainerRef.current;
    if (!el) return;

    const updateWidth = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0) {
        setContainerWidth(rect.width);
      }
    };

    updateWidth();

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        if (width > 0) {
          setContainerWidth(width);
        }
      }
    });

    observer.observe(el);
    window.addEventListener('resize', updateWidth);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, []);

  // 宽屏模式（内容区 >= 1074px）：对应 1440px(约1134px)与1920px(约1616px)视口，操作列展开文字（锁定240px）
  // 紧凑模式（内容区 < 1074px）：对应 1280px(约974px)与820px(约516px)视口，操作列为纯图标（锁定116px），彻底消除对状态列的遮挡
  const isExpandedActions = containerWidth >= 1074;

  // 8列基础宽度定义：总和严格控制在 834px (已移除正式查询底座版本列)
  // 宽屏基础总宽 = 834 + 240 = 1074px，与 1440px 视口下 1134px 内容区完全契合，无横向滚动且有 60px 弹性扩展
  // 紧凑基础总宽 = 834 + 116 = 950px，1280px (974px) 视口下完全容纳无需横向滚动，数据状态列完全不被遮挡
  const baseColumns = {
    rootType: 148,
    sourceSystem: 80,
    configuredFields: 72,
    queryableFields: 84,
    draftFields: 60,
    configStatus: 126,
    dataStatus: 170,
    lastSyncTime: 94
  };

  const expandedActionWidth = 240;
  const compactActionWidth = 116;

  const baseContentWidth = Object.values(baseColumns).reduce(
    (sum, width) => sum + width,
    0
  );

  const expandedBaseTotal = baseContentWidth + expandedActionWidth;
  const compactBaseTotal = baseContentWidth + compactActionWidth;

  // 动态列宽分配策略：基于 W3C table-fixed 与 colgroup 规范
  // 保证操作列在 1440px 与 1920px 下均稳定在 240px
  // 1920px 下多余空间定向分配给：根类型 (35%)、来源系统 (20%)、数据状态 (45%)
  const colWidths = useMemo(() => {
    if (!isExpandedActions) {
      // 紧凑模式：基础总宽 950px (834px 内容列 + 116px 纯图标操作列)
      return {
        ...baseColumns,
        actions: compactActionWidth,
        tableMinWidth: compactBaseTotal
      };
    }

    // 宽屏模式：基准总宽 1074px (834px 内容列 + 240px 文字操作列)
    const surplus = Math.max(0, containerWidth - expandedBaseTotal);
    const rootTypeAdd = Math.round(surplus * 0.35);
    const sourceSystemAdd = Math.round(surplus * 0.20);
    const dataStatusAdd = surplus - rootTypeAdd - sourceSystemAdd;

    return {
      rootType: baseColumns.rootType + rootTypeAdd,
      sourceSystem: baseColumns.sourceSystem + sourceSystemAdd,
      configuredFields: baseColumns.configuredFields,
      queryableFields: baseColumns.queryableFields,
      draftFields: baseColumns.draftFields,
      configStatus: baseColumns.configStatus,
      dataStatus: baseColumns.dataStatus + dataStatusAdd,
      lastSyncTime: baseColumns.lastSyncTime,
      actions: expandedActionWidth,
      tableMinWidth: expandedBaseTotal
    };
  }, [isExpandedActions, containerWidth]);

  // 最近同步时间渲染：日期与时间分两行居中展示，杜绝常规桌面被截断为“2026-08-”或被操作列遮挡
  const renderSyncedAt = (timestamp?: string) => {
    if (!timestamp) {
      return <span className="text-[var(--ty-font-placeholder-color)] font-sans">-</span>;
    }
    const parts = timestamp.trim().split(' ');
    if (parts.length === 2) {
      return (
        <div className="font-mono leading-tight text-center whitespace-nowrap" title={timestamp}>
          <div className="text-ty-xs text-[var(--ty-font-sub-color)] font-medium">{parts[0]}</div>
          <div className="text-ty-2xs text-[var(--ty-font-sub-light-color)] mt-0.5">{parts[1]}</div>
        </div>
      );
    }
    return (
      <span className="font-mono text-ty-xs text-[var(--ty-font-sub-color)] whitespace-nowrap" title={timestamp}>
        {timestamp}
      </span>
    );
  };

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
          <span className="min-h-[22px] inline-flex items-center px-1.5 py-0.5 rounded-[2px] text-ty-xs font-medium whitespace-nowrap bg-[var(--ty-green-lightest-color)] text-[var(--ty-font-main-light-color)] border border-[var(--ty-green-color)]/30 shrink-0">
            <CheckCircle2 className="w-3 h-3 mr-1 text-[var(--ty-green-color)] shrink-0" />
            已配置
          </span>
        );
      case 'CONFIGURED_WITH_DRAFT':
        return (
          <span className="min-h-[22px] inline-flex items-center px-1.5 py-0.5 rounded-[2px] text-ty-xs font-medium whitespace-nowrap bg-[var(--ty-blue-lightest-color)] text-[var(--ty-font-main-light-color)] border border-[var(--ty-blue-color)]/30 shrink-0">
            <Clock className="w-3 h-3 mr-1 text-[var(--ty-blue-color)] shrink-0" />
            已配置（有草稿）
          </span>
        );
      case 'DRAFTING':
        return (
          <span className="min-h-[22px] inline-flex items-center px-1.5 py-0.5 rounded-[2px] text-ty-xs font-medium whitespace-nowrap bg-[var(--ty-orange-lightest-color)] text-[var(--ty-font-main-light-color)] border border-[var(--ty-orange-color)]/30 shrink-0">
            <Clock className="w-3 h-3 mr-1 text-[var(--ty-orange-color)] shrink-0" />
            草稿中
          </span>
        );
      case 'NOT_CONFIGURED':
      default:
        return (
          <span className="min-h-[22px] inline-flex items-center px-1.5 py-0.5 rounded-[2px] text-ty-xs font-medium whitespace-nowrap bg-[var(--ty-fill-weak-dark-color)] text-[var(--ty-font-sub-color)] shrink-0">
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
            <span className="min-h-[22px] inline-flex items-center px-1.5 py-0.5 rounded-[2px] text-ty-xs font-medium whitespace-nowrap bg-[var(--ty-green-lightest-color)] text-[var(--ty-font-main-light-color)] border border-[var(--ty-green-color)]/30">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--ty-green-color)] mr-1.5 shrink-0"></span>
              已同步
            </span>
            {root.lastSyncSuccessCount !== undefined && (
              <div className="text-ty-2xs text-[var(--ty-font-sub-color)] leading-tight whitespace-nowrap">
                成功 <span className="font-mono font-medium text-[var(--ty-green-color)]">{root.lastSyncSuccessCount.toLocaleString()}</span> 条
              </div>
            )}
          </div>
        );
      case 'COMPLETED_WITH_ERRORS':
        return (
          <div className="space-y-1">
            <span className="min-h-[22px] inline-flex items-center px-1.5 py-0.5 rounded-[2px] text-ty-xs font-medium whitespace-nowrap bg-[var(--ty-orange-lightest-color)] text-[var(--ty-font-main-light-color)] border border-[var(--ty-orange-color)]/30">
              <AlertTriangle className="w-3 h-3 mr-1 text-[var(--ty-orange-color)] shrink-0" />
              同步完成（有异常）
            </span>
            <div className="flex items-center space-x-1 text-ty-2xs leading-tight whitespace-nowrap">
              <span className="text-[var(--ty-green-color)] font-mono">成功 {root.lastSyncSuccessCount?.toLocaleString() ?? 0}</span>
              <span className="text-[var(--ty-border-color)]">|</span>
              <span className="text-[var(--ty-red-color)] font-mono font-semibold">异常 {root.lastSyncErrorCount ?? 0}</span>
              <button
                type="button"
                onClick={() => setViewingErrorsRootType(root)}
                className="text-[var(--ty-primary-color)] hover:text-[var(--ty-primary-hover-color)] underline font-medium cursor-pointer ml-0.5 whitespace-nowrap"
              >
                查看异常
              </button>
            </div>
          </div>
        );
      case 'PENDING':
        return (
          <div className="space-y-0.5">
            <span className="min-h-[22px] inline-flex items-center px-1.5 py-0.5 rounded-[2px] text-ty-xs font-medium whitespace-nowrap bg-[var(--ty-orange-lightest-color)] text-[var(--ty-font-main-light-color)] border border-[var(--ty-orange-color)]/30">
              <Clock className="w-3 h-3 mr-1 text-[var(--ty-orange-color)] shrink-0" />
              待同步
            </span>
            <div className="text-ty-2xs text-[var(--ty-font-sub-color)] leading-tight whitespace-nowrap">
              含数据影响变更待生效
            </div>
          </div>
        );
      case 'RUNNING':
        return (
          <span className="min-h-[22px] inline-flex items-center px-1.5 py-0.5 rounded-[2px] text-ty-xs font-medium whitespace-nowrap bg-[var(--ty-blue-lightest-color)] text-[var(--ty-font-main-light-color)] border border-[var(--ty-blue-color)]/30">
            <RefreshCw className="w-3 h-3 mr-1.5 animate-spin text-[var(--ty-blue-color)] shrink-0" />
            同步执行中...
          </span>
        );
      case 'FAILED':
        return (
          <div className="space-y-0.5">
            <span
              className="min-h-[22px] inline-flex items-center px-1.5 py-0.5 rounded-[2px] text-ty-xs font-medium whitespace-nowrap bg-[var(--ty-red-lightest-color)] text-[var(--ty-font-main-light-color)] border border-[var(--ty-red-color)]/30"
              title={root.lastSyncErrorMsg}
            >
              <AlertOctagon className="w-3 h-3 mr-1 text-[var(--ty-red-color)] shrink-0" />
              同步失败（任务级致命错误）
            </span>
            {root.lastSyncErrorMsg && (
              <div className="text-ty-2xs text-[var(--ty-red-color)] truncate max-w-[150px] whitespace-nowrap" title={root.lastSyncErrorMsg}>
                {root.lastSyncErrorMsg}
              </div>
            )}
            <div className="text-ty-2xs text-[var(--ty-font-sub-light-color)] whitespace-nowrap">
              正式底座维持生效前数据
            </div>
          </div>
        );
      case 'NOT_SYNCED':
      default:
        return (
          <span className="min-h-[22px] inline-flex items-center px-1.5 py-0.5 rounded-[2px] text-ty-xs font-medium whitespace-nowrap bg-[var(--ty-fill-weak-dark-color)] text-[var(--ty-font-sub-color)]">
            未同步
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. 顶部全局概览与指标卡片 (4 列响应式网格) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-[8px] p-3.5">
          <div className="text-[var(--ty-font-sub-color)] text-ty-xs font-medium">根类型接入数</div>
          <div className="mt-1 flex items-baseline space-x-1.5">
            <span className="text-xl font-bold text-[var(--ty-font-main-color)] font-mono">{totalRootCount}</span>
            <span className="text-ty-xs text-[var(--ty-font-sub-light-color)]">个根类型</span>
          </div>
          <div className="text-ty-2xs text-[var(--ty-font-sub-light-color)] mt-0.5 truncate">Part / Document / Process</div>
        </div>

        <div className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-[8px] p-3.5">
          <div className="text-[var(--ty-font-sub-color)] text-ty-xs font-medium">已配置字段总数</div>
          <div className="mt-1 flex items-baseline space-x-1.5">
            <span className="text-xl font-bold text-[var(--ty-green-color)] font-mono">{totalConfiguredFields}</span>
            <span className="text-ty-xs text-[var(--ty-font-sub-light-color)]">个</span>
          </div>
          <div className="text-ty-2xs text-[var(--ty-font-sub-light-color)] mt-0.5">当前已生效字段</div>
        </div>

        <div className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-[8px] p-3.5">
          <div className="text-[var(--ty-font-sub-color)] text-ty-xs font-medium">正式可查询字段总数</div>
          <div className="mt-1 flex items-baseline space-x-1.5">
            <span className="text-xl font-bold text-[var(--ty-blue-color)] font-mono">{totalQueryableFields}</span>
            <span className="text-ty-xs text-[var(--ty-font-sub-light-color)]">个</span>
          </div>
          <div className="text-ty-2xs text-[var(--ty-font-sub-light-color)] mt-0.5">已进入正式查询底座</div>
        </div>

        <div className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-[8px] p-3.5">
          <div className="text-[var(--ty-font-sub-color)] text-ty-xs font-medium">待发布草稿字段</div>
          <div className="mt-1 flex items-baseline space-x-1.5">
            <span className="text-xl font-bold text-[var(--ty-orange-color)] font-mono">{totalDraftFields}</span>
            <span className="text-ty-xs text-[var(--ty-font-sub-light-color)]">个草稿</span>
          </div>
          <div className="text-ty-2xs text-[var(--ty-font-sub-light-color)] mt-0.5">含新建与草稿修改</div>
        </div>
      </div>

      {/* 2. 权威生命周期与底座规则说明 (默认折叠) */}
      <div className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-[8px] p-3 text-ty-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Info className="w-4 h-4 text-[var(--ty-primary-color)] shrink-0" />
            <span className="font-semibold text-[var(--ty-font-main-color)] text-ty-xs">
              一阶段根类型映射与正式查询底座生命周期规范
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowLifecycleGuide(!showLifecycleGuide)}
            className="text-[var(--ty-primary-color)] hover:text-[var(--ty-primary-hover-color)] font-medium flex items-center space-x-1 cursor-pointer text-ty-xs"
          >
            <span>{showLifecycleGuide ? '收起说明' : '展开业务规则说明'}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${showLifecycleGuide ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {showLifecycleGuide && (
          <div className="mt-2.5 pt-2.5 border-t border-[var(--ty-border-light-color)] text-ty-xs leading-relaxed text-[var(--ty-font-sub-color)] space-y-1.5 bg-[var(--ty-fill-weak-dark-color)] p-2.5 rounded-[4px]">
            <p>
              1. <strong>根类型作用域</strong>：一阶段直接按 Part、Document、Process 三个根类型维护字段映射，不存在软类型管理概念。
            </p>
            <p>
              2. <strong>正式查询底座</strong>：不维护配置版本号。数据影响变更生效后，根类型进入「待同步」；数据同步成功后更新可查数据底座。
            </p>
            <p>
              3. <strong>容错与异常记录</strong>：单条数据转换错误仅记录异常并继续处理，任务最终呈现「同步完成（有异常）」，底座数据正常更新，异常数据可单独补偿重试。
            </p>
            <p>
              4. <strong>正式查询底座隔离</strong>：查询预览严格读取该根类型当前已同步的底座数据，即使修改了草稿或发生同步失败，也绝不影响线上既有可查字段。
            </p>
          </div>
        )}
      </div>

      {/* 3. 筛选工具栏 (统一 32px 控件高度) */}
      <div className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-[8px] p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="flex items-center space-x-2 text-ty-xs">
            <span className="text-[var(--ty-font-sub-color)] font-medium">来源系统:</span>
            <select
              value={selectedSystemId}
              onChange={e => setSelectedSystemId(e.target.value)}
              className="h-8 px-2.5 bg-[var(--ty-fill-color)] border border-[var(--ty-border-color)] rounded-[4px] text-ty-xs text-[var(--ty-font-main-color)] focus:bg-[var(--ty-fill-white-color)] focus:outline-hidden focus:border-[var(--ty-primary-color)] cursor-pointer"
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
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ty-icon-light-color)]" />
            <input
              type="text"
              placeholder="搜索根类型名称或代码..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full h-8 pl-8 pr-3 text-ty-xs bg-[var(--ty-fill-color)] border border-[var(--ty-border-color)] rounded-[4px] focus:bg-[var(--ty-fill-white-color)] focus:outline-hidden focus:border-[var(--ty-primary-color)] transition-colors"
            />
          </div>
        </div>

        <div className="text-ty-xs text-[var(--ty-font-sub-color)]">
          共 <span className="font-semibold text-[var(--ty-font-main-color)] font-mono">{filteredRootTypes.length}</span> 个根类型
        </div>
      </div>

      {/* 4. 根类型配置总表 (每个根类型一行) */}
      <div
        ref={tableContainerRef}
        className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-[8px] overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table
            className="w-full table-fixed text-left text-ty-xs"
            style={{ minWidth: colWidths.tableMinWidth }}
          >
            <colgroup>
              <col style={{ width: colWidths.rootType }} />
              <col style={{ width: colWidths.sourceSystem }} />
              <col style={{ width: colWidths.configuredFields }} />
              <col style={{ width: colWidths.queryableFields }} />
              <col style={{ width: colWidths.draftFields }} />
              <col style={{ width: colWidths.configStatus }} />
              <col style={{ width: colWidths.dataStatus }} />
              <col style={{ width: colWidths.lastSyncTime }} />
              <col style={{ width: colWidths.actions }} />
            </colgroup>
            <thead className="bg-[var(--ty-fill-weak-dark-color)] border-b border-[var(--ty-border-color)] text-[var(--ty-font-sub-color)] font-semibold sticky top-0 z-10">
              <tr>
                <th
                  style={{ width: colWidths.rootType }}
                  className="py-2.5 px-1.5 text-left whitespace-nowrap overflow-hidden"
                >
                  根类型 (Root Type)
                </th>
                <th
                  style={{ width: colWidths.sourceSystem }}
                  className="py-2.5 px-1 text-center whitespace-nowrap overflow-hidden"
                >
                  来源系统
                </th>
                <th
                  style={{ width: colWidths.configuredFields }}
                  className="py-2.5 px-0.5 text-center whitespace-nowrap overflow-hidden"
                >
                  已配置字段
                </th>
                <th
                  style={{ width: colWidths.queryableFields }}
                  className="py-2.5 px-0.5 text-center whitespace-nowrap overflow-hidden"
                >
                  正式可查字段
                </th>
                <th
                  style={{ width: colWidths.draftFields }}
                  className="py-2.5 px-0.5 text-center whitespace-nowrap overflow-hidden"
                >
                  草稿字段
                </th>
                <th
                  style={{ width: colWidths.configStatus }}
                  className="py-2.5 px-1 text-left whitespace-nowrap overflow-hidden"
                >
                  配置状态
                </th>
                <th
                  style={{ width: colWidths.dataStatus }}
                  className="py-2.5 px-1 whitespace-nowrap overflow-hidden text-left"
                >
                  数据状态
                </th>
                <th
                  style={{ width: colWidths.lastSyncTime }}
                  className="py-2.5 px-0.5 text-center whitespace-nowrap overflow-hidden"
                >
                  最近同步时间
                </th>
                <th
                  style={{
                    width: colWidths.actions,
                    minWidth: colWidths.actions,
                    maxWidth: colWidths.actions
                  }}
                  className="py-2.5 px-1 text-center sticky right-0 bg-[var(--ty-fill-weak-dark-color)] border-l border-[var(--ty-border-color)] z-10 whitespace-nowrap"
                >
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--ty-border-light-color)] text-[var(--ty-font-main-color)]">
              {filteredRootTypes.length > 0 ? (
                filteredRootTypes.map(root => (
                  <tr key={root.id} className="hover:bg-[var(--ty-fill-weak-dark-color)]/50 transition-colors group">
                    {/* 根类型 (单行完整展示中文+英文Code，编码只出现一次，彻底解决截断与重复问题) */}
                    <td
                      style={{ width: colWidths.rootType }}
                      className="py-2.5 px-1.5 font-medium text-[var(--ty-font-main-color)] overflow-hidden"
                    >
                      <div className="flex items-center space-x-1.5 whitespace-nowrap overflow-hidden">
                        <Layers className="w-3.5 h-3.5 text-[var(--ty-primary-color)] shrink-0" />
                        <span
                          className="font-semibold text-ty-xs text-[var(--ty-font-main-color)] truncate"
                          title={formatRootTypeDisplayName(root.name, root.code)}
                        >
                          {formatRootTypeDisplayName(root.name, root.code)}
                        </span>
                      </div>
                    </td>

                    {/* 来源系统 (紧凑模式下省略号截断且完整title，绝不跨列溢出) */}
                    <td
                      style={{ width: colWidths.sourceSystem }}
                      className="py-2.5 px-1 text-center text-[var(--ty-font-sub-color)] overflow-hidden"
                    >
                      <div className="flex items-center justify-center w-full overflow-hidden">
                        <span
                          className="font-mono bg-[var(--ty-fill-weak-dark-color)] text-[var(--ty-font-sub-color)] px-1.5 py-0.5 rounded-[2px] text-ty-2xs border border-[var(--ty-border-light-color)] truncate inline-block max-w-full"
                          title={root.sourceSystemName}
                        >
                          {root.sourceSystemName}
                        </span>
                      </div>
                    </td>

                    {/* 已配置字段 */}
                    <td
                      style={{ width: colWidths.configuredFields }}
                      className="py-2.5 px-0.5 text-center font-mono font-bold text-[var(--ty-font-main-color)] overflow-hidden"
                    >
                      {root.configuredFieldCount}
                    </td>

                    {/* 正式可查字段 */}
                    <td
                      style={{ width: colWidths.queryableFields }}
                      className="py-2.5 px-0.5 text-center font-mono font-bold text-[var(--ty-blue-color)] overflow-hidden"
                    >
                      {root.formalQueryableFieldCount}
                    </td>

                    {/* 草稿字段 */}
                    <td
                      style={{ width: colWidths.draftFields }}
                      className="py-2.5 px-0.5 text-center font-mono overflow-hidden"
                    >
                      {root.draftFieldCount > 0 ? (
                        <span className="px-1.5 py-0.5 rounded-[2px] bg-[var(--ty-orange-light-color)] text-[var(--ty-orange-color)] font-bold text-ty-xs">
                          {root.draftFieldCount}
                        </span>
                      ) : (
                        <span className="text-[var(--ty-font-placeholder-color)]">-</span>
                      )}
                    </td>

                    {/* 配置状态 (严格位于单元格内部，不越界、不侵入数据状态列) */}
                    <td
                      style={{ width: colWidths.configStatus }}
                      className="py-2.5 px-1 whitespace-nowrap overflow-hidden text-left"
                    >
                      <div className="flex items-center w-full overflow-hidden">
                        {renderConfigStatusBadge(root.configStatus)}
                      </div>
                    </td>

                    {/* 数据状态 */}
                    <td
                      style={{ width: colWidths.dataStatus }}
                      className="py-2.5 px-1 whitespace-nowrap overflow-hidden text-left"
                    >
                      {renderSyncStatusBadge(root)}
                    </td>

                    {/* 最近同步时间 (两行显示，完整日期+时间，不截断) */}
                    <td
                      style={{ width: colWidths.lastSyncTime }}
                      className="py-2.5 px-0.5 text-center overflow-hidden"
                    >
                      {renderSyncedAt(root.lastSyncedAt)}
                    </td>

                    {/* 操作列 (1440/1920px 展开文字且严格锁宽 240px；1280/820px 纯图标且锁定 116px) */}
                    <td
                      style={{
                        width: colWidths.actions,
                        minWidth: colWidths.actions,
                        maxWidth: colWidths.actions
                      }}
                      className="py-2.5 px-1 text-center sticky right-0 bg-[var(--ty-fill-white-color)] group-hover:bg-[var(--ty-fill-weak-dark-color)]/50 border-l border-[var(--ty-border-color)] z-10 whitespace-nowrap"
                    >
                      <div className="flex items-center justify-center space-x-1 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onSelectRootType(root.id)}
                          className={`h-7.5 ${isExpandedActions ? 'px-1.5' : 'w-7.5 justify-center'} bg-[var(--ty-primary-lighter-color)] hover:bg-[var(--ty-primary-light-color)] text-[var(--ty-primary-color)] rounded-[4px] font-medium text-ty-xs transition-colors flex items-center justify-center space-x-1 cursor-pointer whitespace-nowrap shrink-0`}
                          title="配置字段 (配置该根类型的字段映射)"
                          aria-label="配置字段"
                        >
                          <Settings2 className="w-3.5 h-3.5 shrink-0" />
                          {isExpandedActions && (
                            <span className="whitespace-nowrap">配置字段</span>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => onOpenQueryPreview(root.id)}
                          className={`h-7.5 ${isExpandedActions ? 'px-1.5' : 'w-7.5 justify-center'} bg-[var(--ty-fill-white-color)] hover:bg-[var(--ty-fill-weak-dark-color)] text-[var(--ty-font-main-color)] rounded-[4px] font-medium text-ty-xs border border-[var(--ty-border-color)] transition-colors flex items-center justify-center space-x-1 cursor-pointer whitespace-nowrap shrink-0`}
                          title="查询预览 (查看当前正式查询底座快照)"
                          aria-label="查询预览"
                        >
                          <Eye className="w-3.5 h-3.5 text-[var(--ty-icon-color)] shrink-0" />
                          {isExpandedActions && (
                            <span className="whitespace-nowrap">查询预览</span>
                          )}
                        </button>

                        {/* 数据同步触发与调试操作 */}
                        <button
                          type="button"
                          onClick={() => onTriggerSync(root.id, 'NORMAL')}
                          disabled={root.syncStatus === 'RUNNING'}
                          className={`h-7.5 ${isExpandedActions ? 'px-1.5' : 'w-7.5 justify-center'} rounded-[4px] font-medium text-ty-xs transition-colors flex items-center justify-center space-x-1 cursor-pointer whitespace-nowrap shrink-0 ${
                            root.syncStatus === 'PENDING' || root.syncStatus === 'COMPLETED_WITH_ERRORS' || root.syncStatus === 'FAILED'
                              ? 'bg-[var(--ty-primary-color)] hover:bg-[var(--ty-primary-hover-color)] active:bg-[var(--ty-primary-active-color)] text-white shadow-2xs'
                              : 'bg-[var(--ty-fill-white-color)] hover:bg-[var(--ty-fill-weak-dark-color)] text-[var(--ty-font-main-color)] border border-[var(--ty-border-color)]'
                          }`}
                          title={
                            root.syncStatus === 'FAILED' || root.syncStatus === 'COMPLETED_WITH_ERRORS'
                              ? '重试同步 (重试数据同步至 Manticore)'
                              : '数据同步 (触发根类型数据同步至 Manticore)'
                          }
                          aria-label={root.syncStatus === 'FAILED' || root.syncStatus === 'COMPLETED_WITH_ERRORS' ? '重试数据同步' : '数据同步'}
                        >
                          <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${root.syncStatus === 'RUNNING' ? 'animate-spin' : ''}`} />
                          {isExpandedActions && (
                            <span className="whitespace-nowrap">
                              {root.syncStatus === 'FAILED' || root.syncStatus === 'COMPLETED_WITH_ERRORS' ? '重试同步' : '同步'}
                            </span>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-[var(--ty-font-sub-light-color)]">
                    <FileSpreadsheet className="w-8 h-8 text-[var(--ty-icon-lighter-color)] mx-auto mb-2" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--ty-fill-darkest-color)]/60 backdrop-blur-xs p-4">
          <div className="bg-[var(--ty-fill-white-color)] rounded-[8px] shadow-ty-lg w-full max-w-2xl overflow-hidden border border-[var(--ty-border-color)] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-4 py-3 bg-[var(--ty-fill-weak-dark-color)] border-b border-[var(--ty-border-color)]">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-[var(--ty-orange-color)]" />
                <h3 className="font-semibold text-[var(--ty-font-main-color)] text-ty-sm">
                  {formatRootTypeDisplayName(viewingErrorsRootType.name, viewingErrorsRootType.code)} - 数据同步异常记录明细 (共 {viewingErrorsRootType.lastSyncErrorRecords?.length ?? 0} 条)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingErrorsRootType(null)}
                className="text-[var(--ty-icon-light-color)] hover:text-[var(--ty-icon-main-color)] p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 max-h-[60vh] overflow-y-auto space-y-3">
              <div className="text-ty-xs text-[var(--ty-font-sub-color)] bg-[var(--ty-orange-light-color)] p-2.5 rounded-[4px]">
                <strong>容错规则说明</strong>：以下单条数据异常已记录并隔离，未中止整体同步流程。正式查询底座已成功更新。您可以单独修复源端数据或重试补偿。
              </div>

              {viewingErrorsRootType.lastSyncErrorRecords && viewingErrorsRootType.lastSyncErrorRecords.length > 0 ? (
                <div className="space-y-2">
                  {viewingErrorsRootType.lastSyncErrorRecords.map(err => (
                    <div key={err.id} className="p-3 bg-[var(--ty-fill-weak-dark-color)] border border-[var(--ty-border-color)] rounded-[4px] text-ty-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="font-mono font-semibold text-[var(--ty-font-main-color)]">{err.recordKey}</div>
                        <span className="text-ty-2xs text-[var(--ty-font-sub-light-color)] font-mono">{err.timestamp}</span>
                      </div>
                      <div className="text-[var(--ty-red-color)] font-medium">
                        [{err.errorCode}] {err.errorMsg}
                      </div>
                      <div className="text-ty-xs text-[var(--ty-font-sub-color)] font-mono bg-[var(--ty-fill-white-color)] p-1.5 rounded-[2px] border border-[var(--ty-border-light-color)] overflow-x-auto">
                        源端载荷: {err.rawPayloadSummary}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-[var(--ty-font-sub-light-color)] text-ty-xs">无异常记录</div>
              )}
            </div>

            <div className="flex items-center justify-between px-4 py-3 bg-[var(--ty-fill-weak-dark-color)] border-t border-[var(--ty-border-color)]">
              <button
                type="button"
                onClick={() => {
                  onTriggerSync(viewingErrorsRootType.id, 'NORMAL');
                  setViewingErrorsRootType(null);
                }}
                className="px-3 py-1.5 bg-[var(--ty-primary-color)] hover:bg-[var(--ty-primary-hover-color)] active:bg-[var(--ty-primary-active-color)] text-white rounded-[4px] text-ty-xs font-semibold flex items-center space-x-1.5 cursor-pointer shadow-2xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>重试全部异常记录</span>
              </button>
              <button
                type="button"
                onClick={() => setViewingErrorsRootType(null)}
                className="px-3 py-1.5 bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] text-[var(--ty-font-main-color)] hover:bg-[var(--ty-fill-weak-dark-color)] rounded-[4px] text-ty-xs font-medium cursor-pointer"
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
