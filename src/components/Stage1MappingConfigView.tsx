import React, { useRef, useState } from 'react';
import { Database } from 'lucide-react';
import {
  MappingObjectType,
  FieldMappingItem,
  SourceFieldMeta,
  RootTypeConfigStatus
} from '../stage1MappingTypes';
import {
  initialSourceSystems,
  initialMappingObjectTypes,
  initialFieldMappings,
  mockSourceFieldMetas,
  mockStage1PreviewRecords
} from '../stage1MappingData';
import { SyncBatch, formatLocalDateTime, toSyncRootType } from '../syncQualityTypes';
import {
  Stage1RuntimeState, Stage1TaskRequest, SyncRunOptions, ResetRunOptions,
  validateStage1TaskStart, beginStage1Task, completeStage1Task
} from '../stage1SyncExecution';
import { initialSyncBatches } from '../syncQualityData';
import { ExecutionSchedule } from '../data/operations';
import { ObjectTypeListView } from './stage1-mapping/ObjectTypeListView';
import { FieldMappingListView } from './stage1-mapping/FieldMappingListView';
import { SingleFieldEditModal } from './stage1-mapping/SingleFieldEditModal';
import { BatchImportModal } from './stage1-mapping/BatchImportModal';
import { BatchDisplayOrderModal } from './stage1-mapping/BatchDisplayOrderModal';
import {
  PublishConfigModal,
  Stage1QueryPreviewModal,
  FieldDetailModal,
  ResetAccessModal
} from './stage1-mapping/Stage1Modals';

interface Stage1MappingConfigViewProps {
  batches?: SyncBatch[];
  onUpdateBatches?: React.Dispatch<React.SetStateAction<SyncBatch[]>> | ((updater: SyncBatch[] | ((prev: SyncBatch[]) => SyncBatch[])) => void);
  onNavigateToSyncQuality: (batchId?: string) => void;
  hasPermission?: boolean;
  onCommitStage1State?: React.Dispatch<React.SetStateAction<Stage1RuntimeState>>;
  syncRunOptions?: SyncRunOptions;
  resetRunOptions?: ResetRunOptions;
  mappingObjects?: MappingObjectType[];
  onUpdateMappingObjects?: React.Dispatch<React.SetStateAction<MappingObjectType[]>>;
  fieldMappings?: FieldMappingItem[];
  onUpdateFieldMappings?: React.Dispatch<React.SetStateAction<FieldMappingItem[]>>;
  syncSchedules?: ExecutionSchedule[];
  onConfigureSyncSchedule?: (rootTypeCode: string) => void;
}

export const Stage1MappingConfigView: React.FC<Stage1MappingConfigViewProps> = ({
  batches,
  onUpdateBatches,
  onNavigateToSyncQuality,
  hasPermission = true,
  mappingObjects: externalMappingObjects,
  onUpdateMappingObjects,
  fieldMappings: externalFieldMappings,
  onUpdateFieldMappings,
  onCommitStage1State,
  syncRunOptions,
  resetRunOptions,
  syncSchedules = [],
  onConfigureSyncSchedule
}) => {
  // 1. 核心数据状态
  const [sourceSystems] = useState(initialSourceSystems);
  const [internalMappingObjects, setInternalMappingObjects] = useState<MappingObjectType[]>(initialMappingObjectTypes);
  const [internalFieldMappings, setInternalFieldMappings] = useState<FieldMappingItem[]>(
    () => Object.values(initialFieldMappings).flat()
  );

  const mappingObjects = externalMappingObjects || internalMappingObjects;
  const setMappingObjects = onUpdateMappingObjects || setInternalMappingObjects;
  const fieldMappings = externalFieldMappings || internalFieldMappings;
  const setFieldMappings = onUpdateFieldMappings || setInternalFieldMappings;

  const [internalBatches, setInternalBatches] = useState<SyncBatch[]>(initialSyncBatches);
  const currentBatches = batches || internalBatches;
  const updateBatches = onUpdateBatches || setInternalBatches;

  const runtimeState: Stage1RuntimeState = { mappingObjects, fieldMappings, batches: currentBatches };
  const latestRuntime = useRef(runtimeState);
  latestRuntime.current = runtimeState;
  const [operationMessage, setOperationMessage] = useState('');
  const [lastCreatedBatchId, setLastCreatedBatchId] = useState<string>();
  const commitRuntime = (updater: (previous: Stage1RuntimeState) => Stage1RuntimeState) => {
    if (onCommitStage1State) {
      onCommitStage1State(updater);
      return;
    }
    // Standalone component fallback; React batches the three owned setters together.
    const next = updater(latestRuntime.current);
    latestRuntime.current = next;
    setMappingObjects(next.mappingObjects);
    setFieldMappings(next.fieldMappings);
    updateBatches(next.batches);
  };
  const displayMappingObjects = mappingObjects.map(root => {
    const syncRootType = toSyncRootType(root.id);
    const active = syncRootType && currentBatches.find(batch => batch.executionStatus === 'RUNNING' && batch.rootTypes.includes(syncRootType));
    return active ? { ...root, syncStatus: active.taskType === 'RESET' ? 'RESETTING' as const : 'RUNNING' as const } : root;
  });

  // 2. 当前视图层级 (OVERVIEW: 根类型总览入口, DETAIL: 根类型字段配置列表)
  const [currentLevel, setCurrentLevel] = useState<'OVERVIEW' | 'DETAIL'>('OVERVIEW');
  const [selectedRootTypeId, setSelectedRootTypeId] = useState<string>('PART');

  // 3. 模态框控制状态
  const [isSingleEditOpen, setIsSingleEditOpen] = useState(false);
  const [editingTargetField, setEditingTargetField] = useState<FieldMappingItem | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailTargetField, setDetailTargetField] = useState<FieldMappingItem | null>(null);

  const [isBatchImportOpen, setIsBatchImportOpen] = useState(false);
  const [isBatchDisplayOrderOpen, setIsBatchDisplayOrderOpen] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isQueryPreviewOpen, setIsQueryPreviewOpen] = useState(false);

  // 重置相关模态框状态
  const [isResetAccessModalOpen, setIsResetAccessModalOpen] = useState(false);
  const [resetTargetRootTypeId, setResetTargetRootTypeId] = useState<string>('PART');

  // 4. 当前上下文对应的根类型实体
  const currentRootType = displayMappingObjects.find(r => r.id === selectedRootTypeId) || displayMappingObjects[0];
  const resetTargetRoot = mappingObjects.find(r => r.id === resetTargetRootTypeId) || currentRootType;

  // 来源元数据池
  const availablePlmFields: SourceFieldMeta[] =
    currentRootType ? mockSourceFieldMetas[currentRootType.id] || [] : [];

  // ==================== 业务交互动作 ====================

  // 选择根类型进入字段配置列表
  const handleSelectRootType = (rootId: string) => {
    setSelectedRootTypeId(rootId);
    setCurrentLevel('DETAIL');
  };

  // 返回总入口
  const handleBackToOverview = () => {
    setCurrentLevel('OVERVIEW');
  };

  // 打开单个新建
  const handleOpenCreateSingle = () => {
    setEditingTargetField(null);
    setIsSingleEditOpen(true);
  };

  // 打开编辑字段
  const handleEditField = (field: FieldMappingItem) => {
    setEditingTargetField(field);
    setIsSingleEditOpen(true);
  };

  // 查看字段详情
  const handleViewFieldDetail = (field: FieldMappingItem) => {
    setDetailTargetField(field);
    setIsDetailModalOpen(true);
  };

  // 辅助重新计算根类型统计数据
  const updateRootTypeStats = (rootId: string, currentFields: FieldMappingItem[]) => {
    setMappingObjects(prev =>
      prev.map(root => {
        if (root.id !== rootId) return root;
        const targetFields = currentFields.filter(f => f.rootTypeId === rootId);
        const configuredCount = targetFields.filter(f => f.configStatus === 'CONFIGURED').length;
        const draftCount = targetFields.filter(
          f => f.configStatus === 'DRAFT' || (f.configStatus === 'CONFIGURED' && f.hasDraftModification)
        ).length;
        const formalQueryCount = targetFields.filter(
          f => f.configStatus === 'CONFIGURED' && f.isInFormalQueryBase && f.isDisplayInResult
        ).length;

        let derivedStatus: RootTypeConfigStatus = 'NOT_CONFIGURED';
        if (configuredCount > 0 && draftCount > 0) {
          derivedStatus = 'CONFIGURED_WITH_DRAFT';
        } else if (configuredCount > 0) {
          derivedStatus = 'CONFIGURED';
        } else if (draftCount > 0) {
          derivedStatus = 'DRAFTING';
        }

        return {
          ...root,
          configuredFieldCount: configuredCount,
          formalQueryableFieldCount: formalQueryCount,
          draftFieldCount: draftCount,
          configStatus: derivedStatus
        };
      })
    );
  };

  // 保存单个草稿 (包括对已配置字段的草稿微调)
  const handleSaveDraft = (savedField: FieldMappingItem) => {
    let nextMappings: FieldMappingItem[] = [];
    setFieldMappings(prev => {
      const existsIndex = prev.findIndex(f => f.id === savedField.id);
      if (existsIndex >= 0) {
        nextMappings = [...prev];
        nextMappings[existsIndex] = savedField;
      } else {
        nextMappings = [...prev, savedField];
      }
      return nextMappings;
    });

    updateRootTypeStats(savedField.rootTypeId, nextMappings);
  };

  // 批量生成草稿
  const handleSaveBatchDrafts = (newDrafts: FieldMappingItem[]) => {
    let nextMappings: FieldMappingItem[] = [];
    setFieldMappings(prev => {
      nextMappings = [...prev, ...newDrafts];
      return nextMappings;
    });

    if (newDrafts.length > 0) {
      updateRootTypeStats(newDrafts[0].rootTypeId, nextMappings);
    }
  };

  // 批量调整已有属性的展示顺序。展示顺序只影响前台排列，不改变底层字段结构。
  const handleBatchUpdateDisplayOrder = (fieldIds: string[], displayOrder: number) => {
    const selectedIds = new Set(fieldIds);
    let nextMappings: FieldMappingItem[] = [];

    setFieldMappings(previous => {
      nextMappings = previous.map(field => {
        if (field.rootTypeId !== currentRootType.id || !selectedIds.has(field.id)) return field;

        if (field.configStatus === 'CONFIGURED') {
          return {
            ...field,
            hasDraftModification: true,
            draftData: {
              ...(field.draftData || {}),
              displayOrder,
              defaultDisplayOrder: displayOrder
            },
            updatedAt: '刚刚 (批量调整顺序)',
            updatedBy: '当前用户'
          };
        }

        return {
          ...field,
          displayOrder,
          defaultDisplayOrder: displayOrder,
          updatedAt: '刚刚 (批量调整顺序)',
          updatedBy: '当前用户'
        };
      });
      return nextMappings;
    });

    updateRootTypeStats(currentRootType.id, nextMappings);
    setOperationMessage(`已将 ${fieldIds.length} 个属性的展示顺序统一调整为 ${displayOrder}，并保存为草稿。`);
  };

  // 执行生效配置 (草稿生效，不生成配置版本；如果有数据影响变更，根类型标记为 PENDING 待同步)
  const handleConfirmPublish = (startService: boolean) => {
    const nowTime = '刚刚';
    let hasDataImpacting = false;

    let nextFields: FieldMappingItem[] = [];
    setFieldMappings(prev => {
      nextFields = prev.map(f => {
        if (f.rootTypeId !== currentRootType.id) return f;

        // 纯草稿生效
        if (f.configStatus === 'DRAFT') {
          if (f.isDataImpactingChange) hasDataImpacting = true;
          return {
            ...f,
            configStatus: 'CONFIGURED' as const,
            hasDraftModification: false,
            isInFormalQueryBase: false,
            updatedAt: nowTime,
            updatedBy: '当前用户 (生效发布)'
          };
        }

        // 已配置字段的草稿修改生效
        if (f.configStatus === 'CONFIGURED' && f.hasDraftModification && f.draftData) {
          if (f.isDataImpactingChange) hasDataImpacting = true;
          return {
            ...f,
            ...f.draftData,
            hasDraftModification: false,
            draftData: undefined,
            isInFormalQueryBase: f.isDataImpactingChange ? false : f.isInFormalQueryBase,
            updatedAt: nowTime,
            updatedBy: '当前用户 (生效发布)'
          };
        }

        return f;
      });
      return nextFields;
    });

    setMappingObjects(prev =>
      prev.map(root => {
        if (root.id !== currentRootType.id) return root;
        const configuredCount = nextFields.filter(f => f.rootTypeId === root.id && f.configStatus === 'CONFIGURED').length;
        const formalCount = nextFields.filter(f => f.rootTypeId === root.id && f.configStatus === 'CONFIGURED' && f.isInFormalQueryBase).length;
        return {
          ...root,
          configuredFieldCount: configuredCount,
          formalQueryableFieldCount: formalCount,
          draftFieldCount: 0,
          configStatus: 'CONFIGURED' as const,
          syncStatus: hasDataImpacting ? 'PENDING' : root.syncStatus,
          hasPendingSyncChanges: hasDataImpacting,
          serviceStarted: root.serviceStarted || startService,
          accessEnabled: root.serviceStarted ? root.accessEnabled : startService
        };
      })
    );

    setIsPublishModalOpen(false);
    setOperationMessage(startService && !currentRootType.serviceStarted
      ? '配置已发布，同步服务已接入并开始按检查频率轮询中间表。'
      : '配置已发布；同步服务将按当前检查频率处理新增记录。');
  };

  const handleToggleAccess = (rootTypeId: string) => {
    setMappingObjects(previous => previous.map(root => root.id === rootTypeId
      ? { ...root, accessEnabled: !root.accessEnabled }
      : root));
    const root = mappingObjects.find(item => item.id === rootTypeId);
    setOperationMessage(root?.accessEnabled
      ? `${root.name} 已停用，常驻服务将跳过该类型的中间表。`
      : `${root?.name || rootTypeId} 已启用，将按配置频率恢复轮询。`);
  };

  const checkTaskStart = (rootTypeId: string, confirmedCode?: string) => {
    const result = validateStage1TaskStart(latestRuntime.current, { rootTypeId, hasPermission, confirmedCode });
    if (result.ok === false) setOperationMessage(result.reason);
    return result;
  };

  const startTask = (taskType: 'SYNC' | 'RESET', rootTypeId: string, confirmedCode?: string) => {
    if (!checkTaskStart(rootTypeId, confirmedCode).ok) return;
    const request: Stage1TaskRequest = {
      id: `${taskType}-${crypto.randomUUID()}`,
      taskType, rootTypeId, hasPermission, confirmedCode,
      startTime: formatLocalDateTime()
    };
    // Freeze execution options at submission; only code parameters can inject failures.
    const options = { ...(taskType === 'RESET' ? resetRunOptions : syncRunOptions) };
    commitRuntime(previous => beginStage1Task(previous, request));
    setLastCreatedBatchId(request.id);
    setOperationMessage(`${taskType === 'RESET' ? '重置' : '同步'}任务已提交。`);
    setIsResetAccessModalOpen(false);
    const delayMs = typeof options.delayMs === 'number' && Number.isFinite(options.delayMs) && options.delayMs >= 0
      ? options.delayMs : 1200;
    // The App transaction setter remains valid after this page unmounts.
    setTimeout(() => {
      const completedAt = new Date();
      commitRuntime(previous => completeStage1Task(previous, request, options, completedAt));
    }, delayMs);
  };

  const handleOpenQueryPreview = (rootTypeId?: string) => {
    if (rootTypeId) setSelectedRootTypeId(rootTypeId);
    setIsQueryPreviewOpen(true);
  };

  const handleRequestResetAccess = (rootId: string) => {
    if (!checkTaskStart(rootId).ok) return;
    setResetTargetRootTypeId(rootId);
    setIsResetAccessModalOpen(true);
  };

  const handleConfirmReset = (confirmedCode: string) => {
    startTask('RESET', resetTargetRootTypeId, confirmedCode);
  };

  if (!currentRootType) {
    return <div className="p-8 text-center text-[var(--ty-font-sub-color)]">暂无可用根类型配置</div>;
  }

  return (
    <div className="space-y-4">
      <header className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Database className="w-5 h-5 shrink-0 text-[var(--ty-primary-color)]" />
          <div className="min-w-0">
            <h1 className="text-ty-xl font-semibold">接入配置</h1>
            <p className="mt-1 text-ty-xs text-[var(--ty-font-sub-color)]">维护字段映射、接入启停与中间表检查频率；常驻服务逐条写入 Manticore。</p>
          </div>
        </div>
        <span className="text-ty-xs text-[var(--ty-font-sub-color)]">配置范围按根类型隔离</span>
      </header>
      {operationMessage && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-ty-sm border border-[var(--ty-border-color)] bg-[var(--ty-fill-weak-dark-color)] px-3 py-2 text-ty-xs">
          <span>{operationMessage}</span>
          {lastCreatedBatchId && currentBatches.some(batch => batch.id === lastCreatedBatchId) && (
            <button type="button" onClick={() => onNavigateToSyncQuality(lastCreatedBatchId)} className="text-[var(--ty-primary-color)] cursor-pointer hover:underline">查看同步记录</button>
          )}
        </div>
      )}
      {/* 视图分发：根类型总览 vs 根类型字段映射列表 */}
      {currentLevel === 'OVERVIEW' ? (
        <ObjectTypeListView
          sourceSystems={sourceSystems}
          mappingObjects={displayMappingObjects}
          schedules={syncSchedules}
          onSelectRootType={handleSelectRootType}
          onOpenQueryPreview={handleOpenQueryPreview}
          onToggleAccess={handleToggleAccess}
          onConfigurePolling={(rootId) => onConfigureSyncSchedule?.(rootId)}
          onResetAccess={handleRequestResetAccess}
          onNavigateToSyncQuality={() => onNavigateToSyncQuality()}
          hasPermission={hasPermission}
        />
      ) : (
        <FieldMappingListView
          currentRootType={currentRootType}
          fields={fieldMappings}
          onBackToOverview={handleBackToOverview}
          onOpenCreateSingle={handleOpenCreateSingle}
          onOpenBatchImport={() => setIsBatchImportOpen(true)}
          onOpenBatchDisplayOrder={() => setIsBatchDisplayOrderOpen(true)}
          onEditField={handleEditField}
          onViewFieldDetail={handleViewFieldDetail}
          onPublishConfig={() => setIsPublishModalOpen(true)}
          onToggleAccess={() => handleToggleAccess(currentRootType.id)}
          onResetAccess={() => handleRequestResetAccess(currentRootType.id)}
          onOpenQueryPreview={() => handleOpenQueryPreview(currentRootType.id)}
          syncSchedule={syncSchedules.find(schedule => schedule.rootTypeCode === currentRootType.id)}
          onConfigureSyncSchedule={() => onConfigureSyncSchedule?.(currentRootType.id)}
          hasPermission={hasPermission}
        />
      )}

      {/* 模态框 1：单个新建 / 编辑字段映射 */}
      <SingleFieldEditModal
        isOpen={isSingleEditOpen}
        onClose={() => setIsSingleEditOpen(false)}
        currentRootType={currentRootType}
        availablePlmFields={availablePlmFields}
        existingFields={fieldMappings}
        editingField={editingTargetField}
        onSaveDraft={handleSaveDraft}
        hasPermission={hasPermission}
      />

      {/* 模态框 2：从 PLM 批量选择属性 */}
      <BatchImportModal
        isOpen={isBatchImportOpen}
        onClose={() => setIsBatchImportOpen(false)}
        currentRootType={currentRootType}
        availablePlmFields={availablePlmFields}
        existingFieldMappings={fieldMappings}
        onSaveBatchDrafts={handleSaveBatchDrafts}
        onEditField={handleEditField}
        hasPermission={hasPermission}
      />

      {/* 模态框 3：批量调整已有属性展示顺序 */}
      <BatchDisplayOrderModal
        isOpen={isBatchDisplayOrderOpen}
        onClose={() => setIsBatchDisplayOrderOpen(false)}
        currentRootType={currentRootType}
        fields={fieldMappings}
        onSave={handleBatchUpdateDisplayOrder}
        hasPermission={hasPermission}
      />

      {/* 模态框 4：生效配置影响确认 */}
      <PublishConfigModal
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
        currentRootType={currentRootType}
        fields={fieldMappings}
        onConfirmPublish={handleConfirmPublish}
      />

      {/* 模态框 4：一阶段正式查询预览 (正式底座快照保护) */}
      <Stage1QueryPreviewModal
        isOpen={isQueryPreviewOpen}
        onClose={() => setIsQueryPreviewOpen(false)}
        currentRootType={currentRootType}
        fields={fieldMappings}
        previewRecords={
          mockStage1PreviewRecords[currentRootType.id] || []
        }
      />

      {/* 模态框 6：字段详情查看 */}
      <FieldDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        field={detailTargetField}
      />

      {/* 模态框 7：重置接入高危二次确认 */}
      <ResetAccessModal
        isOpen={isResetAccessModalOpen && mappingObjects.some(root => root.id === resetTargetRootTypeId)}
        onClose={() => setIsResetAccessModalOpen(false)}
        currentRootType={resetTargetRoot}
        fields={fieldMappings}
        onConfirmReset={handleConfirmReset}
      />

    </div>
  );
};
