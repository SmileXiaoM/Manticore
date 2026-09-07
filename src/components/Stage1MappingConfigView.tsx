import React, { useState } from 'react';
import {
  MappingObjectType,
  FieldMappingItem,
  SourceFieldMeta,
  RootTypeConfigStatus,
  determineSyncStrategy,
  SYNC_STRATEGY_LABELS
} from '../stage1MappingTypes';
import {
  initialSourceSystems,
  initialMappingObjectTypes,
  initialFieldMappings,
  mockSourceFieldMetas,
  mockStage1PreviewRecords
} from '../stage1MappingData';
import { SyncBatch, toSyncRootType } from '../syncQualityTypes';
import { initialSyncBatches } from '../syncQualityData';
import { ObjectTypeListView } from './stage1-mapping/ObjectTypeListView';
import { FieldMappingListView } from './stage1-mapping/FieldMappingListView';
import { SingleFieldEditModal } from './stage1-mapping/SingleFieldEditModal';
import { BatchImportModal } from './stage1-mapping/BatchImportModal';
import {
  PublishConfigModal,
  TriggerSyncModal,
  Stage1QueryPreviewModal,
  FieldDetailModal,
  ResetAccessModal,
  ResetBlockModal
} from './stage1-mapping/Stage1Modals';

interface Stage1MappingConfigViewProps {
  batches?: SyncBatch[];
  onUpdateBatches?: React.Dispatch<React.SetStateAction<SyncBatch[]>> | ((updater: SyncBatch[] | ((prev: SyncBatch[]) => SyncBatch[])) => void);
  onNavigateToSyncQuality: (batchId?: string) => void;
  hasPermission?: boolean;
}

export const Stage1MappingConfigView: React.FC<Stage1MappingConfigViewProps> = ({
  batches,
  onUpdateBatches,
  onNavigateToSyncQuality,
  hasPermission = true
}) => {
  // 1. 核心数据状态
  const [sourceSystems] = useState(initialSourceSystems);
  const [mappingObjects, setMappingObjects] = useState<MappingObjectType[]>(initialMappingObjectTypes);
  const [fieldMappings, setFieldMappings] = useState<FieldMappingItem[]>(
    () => Object.values(initialFieldMappings).flat()
  );
  const [internalBatches, setInternalBatches] = useState<SyncBatch[]>(initialSyncBatches);
  const currentBatches = batches || internalBatches;
  const updateBatches = onUpdateBatches || setInternalBatches;

  // 2. 当前视图层级 (OVERVIEW: 根类型总览入口, DETAIL: 根类型字段配置列表)
  const [currentLevel, setCurrentLevel] = useState<'OVERVIEW' | 'DETAIL'>('OVERVIEW');
  const [selectedRootTypeId, setSelectedRootTypeId] = useState<string>('PART');

  // 3. 模态框控制状态
  const [isSingleEditOpen, setIsSingleEditOpen] = useState(false);
  const [editingTargetField, setEditingTargetField] = useState<FieldMappingItem | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailTargetField, setDetailTargetField] = useState<FieldMappingItem | null>(null);

  const [isBatchImportOpen, setIsBatchImportOpen] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isTriggerSyncModalOpen, setIsTriggerSyncModalOpen] = useState(false);
  const [isQueryPreviewOpen, setIsQueryPreviewOpen] = useState(false);

  // 重置相关模态框状态
  const [isResetAccessModalOpen, setIsResetAccessModalOpen] = useState(false);
  const [isResetBlockModalOpen, setIsResetBlockModalOpen] = useState(false);
  const [resetTargetRootTypeId, setResetTargetRootTypeId] = useState<string>('PART');

  // 4. 当前上下文对应的根类型实体
  const currentRootType = mappingObjects.find(r => r.id === selectedRootTypeId) || mappingObjects[0];
  const resetTargetRoot = mappingObjects.find(r => r.id === resetTargetRootTypeId) || currentRootType;

  // 来源元数据池
  const availablePlmFields: SourceFieldMeta[] =
    mockSourceFieldMetas[currentRootType.id] || mockSourceFieldMetas['PART'] || [];

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

  // 执行生效配置 (草稿生效，不生成配置版本；如果有数据影响变更，根类型标记为 PENDING 待同步)
  const handleConfirmPublish = () => {
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
          hasPendingSyncChanges: hasDataImpacting
        };
      })
    );

    setIsPublishModalOpen(false);
  };

  // 执行数据同步 (系统自动选择实际执行方式，单条数据异常不中断整体任务)
  const handleConfirmDataSync = () => {
    setIsTriggerSyncModalOpen(false);
    const target = currentRootType;
    if (!target) return;

    // 前置阻断校验：无权限或任务运行中
    if (!hasPermission || target.syncStatus === 'RUNNING' || target.syncStatus === 'RESETTING') {
      return;
    }

    // 系统自动确定同步执行方式与原因
    const { strategy, reason } = determineSyncStrategy(target, fieldMappings);
    const strategyLabel = SYNC_STRATEGY_LABELS[strategy] || '增量追平';

    const now = new Date();
    const startTimeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const batchId = `SYNC-${Date.now().toString().slice(-8)}`;
    const syncRootType = toSyncRootType(target.id);

    // 1. 设置根类型为正在运行
    setMappingObjects(prev =>
      prev.map(root => {
        if (root.id !== target.id) return root;
        return {
          ...root,
          syncStatus: 'RUNNING',
          lastSyncExecutionStrategy: strategy,
          lastSyncStrategyReason: reason
        };
      })
    );

    // 2. 立即创建 RUNNING 同步记录并插入 syncBatches 前部！实时更新任务总数与进行中指标
    const initialBatch: SyncBatch = {
      id: batchId,
      jobName: `${target.name} 数据同步任务`,
      taskType: 'SYNC',
      rootTypes: [syncRootType],
      syncMethod: strategy === 'INITIAL_REBUILD' ? 'FULL' : 'INCREMENTAL',
      triggerType: 'MANUAL',
      startTime: startTimeStr,
      sourceDataCount: target.manticoreDocCount ?? 0,
      successCount: 0,
      failedCount: 0,
      skippedCount: 0,
      executionStatus: 'RUNNING',
      actualStrategy: strategyLabel,
      strategyReason: reason,
      statusNote: `系统自动判定执行方式为【${strategyLabel}】（原因：${reason}），任务已启动，正在读取 PLM 数据并同步至底座...`,
      failedRecords: []
    };

    updateBatches(prev => [initialBatch, ...prev]);

    // 3. 1.2 秒后异步完成，更新同一条任务记录，绝不新建第二条！
    setTimeout(() => {
      const finishDate = new Date();
      const endTimeStr = `${finishDate.getFullYear()}-${String(finishDate.getMonth() + 1).padStart(2, '0')}-${String(finishDate.getDate()).padStart(2, '0')} ${String(finishDate.getHours()).padStart(2, '0')}:${String(finishDate.getMinutes()).padStart(2, '0')}:${String(finishDate.getSeconds()).padStart(2, '0')}`;

      // 字段全部标记为正式进入查询底座
      let nextFields: FieldMappingItem[] = [];
      setFieldMappings(prev => {
        nextFields = prev.map(f => {
          if (f.rootTypeId !== target.id) return f;
          if (f.configStatus === 'CONFIGURED') {
            return {
              ...f,
              isInFormalQueryBase: true,
              isDataImpactingChange: false,
              hasDraftModification: false
            };
          }
          return f;
        });
        return nextFields;
      });

      // 模拟是否存在记录级轻微错误（仅 DOCUMENT 样例有轻微错误）
      const hasMinorErrors = target.id === 'DOCUMENT';
      const docCount = target.manticoreDocCount || (target.id === 'PART' ? 38400 : target.id === 'DOCUMENT' ? 52000 : 19200);
      const rawErrors = hasMinorErrors ? (target.lastSyncErrorRecords || []) : [];
      const errorRecords: SyncBatch['failedRecords'] = rawErrors.map((err, idx) => ({
        id: err.id || `FAIL-${idx + 1}`,
        recordKey: err.recordKey || `DOC-${idx + 1}`,
        rootType: syncRootType,
        failedField: err.errorField,
        failureReason: err.errorMsg,
        occurredAt: err.timestamp || endTimeStr,
        retryable: true,
        errorCode: err.errorCode,
        techDetail: err.errorMsg
      }));
      const finalSuccessCount = hasMinorErrors ? Math.max(0, docCount - errorRecords.length) : docCount;

      // 更新同一个任务记录
      updateBatches(prev =>
        prev.map(b => {
          if (b.id !== batchId) return b;
          return {
            ...b,
            endTime: endTimeStr,
            durationText: '1.2s',
            executionStatus: hasMinorErrors ? 'PARTIAL_SUCCESS' : 'SUCCESS',
            sourceDataCount: docCount,
            successCount: finalSuccessCount,
            failedCount: errorRecords.length,
            statusNote: hasMinorErrors
              ? `同步完成，检测到 ${errorRecords.length} 条数据存在字段校验或格式异常，底座已同步成功 ${finalSuccessCount.toLocaleString()} 条。`
              : `数据同步成功，正式查询底座已更新，共生效 ${finalSuccessCount.toLocaleString()} 条数据。`,
            failedRecords: errorRecords
          };
        })
      );

      // 更新根类型状态
      setMappingObjects(prev =>
        prev.map(root => {
          if (root.id !== target.id) return root;
          const formalCount = nextFields.filter(
            f => f.rootTypeId === root.id && f.configStatus === 'CONFIGURED' && f.isInFormalQueryBase && f.isDisplayInResult
          ).length;

          return {
            ...root,
            syncStatus: hasMinorErrors ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED',
            lastSyncedAt: endTimeStr,
            lastSyncBatchId: batchId,
            formalQueryableFieldCount: formalCount,
            hasPendingSyncChanges: false,
            manticoreDocCount: docCount,
            lastSyncSuccessCount: finalSuccessCount,
            lastSyncErrorCount: rawErrors.length,
            lastSyncErrorRecords: rawErrors
          };
        })
      );
    }, 1200);
  };

  // 打开正式查询底座预览
  const handleOpenQueryPreview = (rootTypeId?: string) => {
    if (rootTypeId) {
      setSelectedRootTypeId(rootTypeId);
    }
    setIsQueryPreviewOpen(true);
  };

  // 触发根类型同步弹窗
  const handleTriggerQuickSync = (rootId: string) => {
    setSelectedRootTypeId(rootId);
    setIsTriggerSyncModalOpen(true);
  };

  // 发起重置接入请求（带阻断前置校验）
  const handleRequestResetAccess = (rootId: string) => {
    const target = mappingObjects.find(r => r.id === rootId);
    if (!target) return;
    setResetTargetRootTypeId(rootId);

    // 阻断检查：若任务正在执行中（RUNNING / RESETTING），严禁进行重置
    if (target.syncStatus === 'RUNNING' || target.syncStatus === 'RESETTING') {
      setIsResetBlockModalOpen(true);
      return;
    }

    setIsResetAccessModalOpen(true);
  };

  // 确认执行重置接入
  const handleConfirmReset = (confirmedCode: string) => {
    const rootId = resetTargetRootTypeId;
    const target = mappingObjects.find(r => r.id === rootId);
    if (!target) return;

    // 二次提交校验：权限、根类型完全一致、确认码区分大小写匹配大写 rootId、无运行中任务
    const isTargetMatched = confirmedCode.trim().toUpperCase() === target.id.toUpperCase();
    if (!hasPermission || !isTargetMatched || target.syncStatus === 'RUNNING' || target.syncStatus === 'RESETTING') {
      return; // 严密阻断，不发起任何操作
    }

    const beforeDocCount = target.manticoreDocCount; // 未知时为 undefined，严禁虚构
    const targetFields = fieldMappings.filter(f => f.rootTypeId === rootId);

    const now = new Date();
    const startTimeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const resetBatchId = `RESET-${Date.now().toString().slice(-8)}`;
    const syncRootType = toSyncRootType(rootId);

    // 1. 关闭弹窗并标记根类型状态为 RESETTING (重置中)
    setIsResetAccessModalOpen(false);
    setMappingObjects(prev =>
      prev.map(r => (r.id === rootId ? { ...r, syncStatus: 'RESETTING' } : r))
    );

    // 2. 立即在数据同步记录创建 RUNNING 重置任务！
    const initialResetBatch: SyncBatch = {
      id: resetBatchId,
      taskType: 'RESET',
      jobName: `${target.name} 接入重置任务`,
      rootTypes: [syncRootType],
      syncMethod: 'FULL',
      triggerType: 'MANUAL',
      startTime: startTimeStr,
      sourceDataCount: beforeDocCount ?? 0,
      successCount: 0,
      failedCount: 0,
      skippedCount: 0,
      executionStatus: 'RUNNING',
      statusNote: `正在执行 ${target.name} 接入重置：清空正式查询底座数据，保留字段映射并转为草稿...`,
      failedRecords: [],
      resetAuditDetail: {
        operator: '接入管理员',
        confirmedInputCode: confirmedCode,
        beforeConfiguredCount: target.configuredFieldCount,
        beforeDraftCount: target.draftFieldCount,
        beforeFormalQueryableCount: target.formalQueryableFieldCount,
        beforeDocCount: beforeDocCount,
        deletedDocCount: beforeDocCount,
        retainedDraftCount: targetFields.length
      }
    };

    updateBatches(prev => [initialResetBatch, ...prev]);

    // 3. 1.2 秒后重置完成，更新同一条任务记录为 SUCCESS
    setTimeout(() => {
      const finishDate = new Date();
      const endTimeStr = `${finishDate.getFullYear()}-${String(finishDate.getMonth() + 1).padStart(2, '0')}-${String(finishDate.getDate()).padStart(2, '0')} ${String(finishDate.getHours()).padStart(2, '0')}:${String(finishDate.getMinutes()).padStart(2, '0')}:${String(finishDate.getSeconds()).padStart(2, '0')}`;

      // 字段全部转为草稿态
      setFieldMappings(prev =>
        prev.map(f => {
          if (f.rootTypeId !== rootId) return f;
          return {
            ...f,
            configStatus: 'DRAFT',
            hasDraftModification: false,
            isInFormalQueryBase: false,
            isDataImpactingChange: true,
            updatedAt: '刚刚 (重置转草稿)',
            updatedBy: '接入管理员'
          };
        })
      );

      // 更新根类型状态
      setMappingObjects(prev =>
        prev.map(r => {
          if (r.id !== rootId) return r;
          return {
            ...r,
            configStatus: targetFields.length > 0 ? 'DRAFTING' : 'NOT_CONFIGURED',
            configuredFieldCount: 0,
            formalQueryableFieldCount: 0,
            draftFieldCount: targetFields.length,
            syncStatus: 'NOT_SYNCED',
            manticoreDocCount: 0,
            hasPendingSyncChanges: false,
            lastSyncedAt: undefined,
            lastSyncBatchId: undefined,
            lastSyncErrorRecords: []
          };
        })
      );

      // 更新同一个重置任务记录为完成
      updateBatches(prev =>
        prev.map(b => {
          if (b.id !== resetBatchId) return b;
          return {
            ...b,
            endTime: endTimeStr,
            durationText: '1.2s',
            executionStatus: 'SUCCESS',
            statusNote: `已完成 ${target.name} 接入重置：清空正式查询数据，保留 ${targetFields.length} 个字段映射并转为草稿。`,
            resetAuditDetail: {
              ...b.resetAuditDetail!,
              deletedDocCount: beforeDocCount,
              retainedDraftCount: targetFields.length
            }
          };
        })
      );
    }, 1200);
  };

  return (
    <div className="space-y-4">
      {/* 视图分发：根类型总览 vs 根类型字段映射列表 */}
      {currentLevel === 'OVERVIEW' ? (
        <ObjectTypeListView
          sourceSystems={sourceSystems}
          mappingObjects={mappingObjects}
          onSelectRootType={handleSelectRootType}
          onOpenQueryPreview={handleOpenQueryPreview}
          onTriggerSync={handleTriggerQuickSync}
          onResetAccess={handleRequestResetAccess}
          onNavigateToSyncQuality={onNavigateToSyncQuality}
          hasPermission={hasPermission}
        />
      ) : (
        <FieldMappingListView
          currentRootType={currentRootType}
          fields={fieldMappings}
          onBackToOverview={handleBackToOverview}
          onOpenCreateSingle={handleOpenCreateSingle}
          onOpenBatchImport={() => setIsBatchImportOpen(true)}
          onEditField={handleEditField}
          onViewFieldDetail={handleViewFieldDetail}
          onPublishConfig={() => setIsPublishModalOpen(true)}
          onTriggerDataSync={() => setIsTriggerSyncModalOpen(true)}
          onResetAccess={() => handleRequestResetAccess(currentRootType.id)}
          onOpenQueryPreview={() => handleOpenQueryPreview(currentRootType.id)}
          onNavigateToSyncQuality={onNavigateToSyncQuality}
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

      {/* 模态框 3：生效配置影响确认 */}
      <PublishConfigModal
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
        currentRootType={currentRootType}
        fields={fieldMappings}
        onConfirmPublish={handleConfirmPublish}
      />

      {/* 模态框 4：发起数据同步 (系统自动选择执行策略) */}
      <TriggerSyncModal
        isOpen={isTriggerSyncModalOpen}
        onClose={() => setIsTriggerSyncModalOpen(false)}
        currentRootType={currentRootType}
        fields={fieldMappings}
        onConfirmSync={handleConfirmDataSync}
        onNavigateToSyncQuality={onNavigateToSyncQuality}
      />

      {/* 模态框 5：一阶段正式查询预览 (正式底座快照保护) */}
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
        isOpen={isResetAccessModalOpen}
        onClose={() => setIsResetAccessModalOpen(false)}
        currentRootType={resetTargetRoot}
        fields={fieldMappings}
        onConfirmReset={handleConfirmReset}
      />

      {/* 模态框 8：正在执行任务时的重置阻断提示 */}
      <ResetBlockModal
        isOpen={isResetBlockModalOpen}
        onClose={() => setIsResetBlockModalOpen(false)}
        currentRootType={resetTargetRoot}
      />
    </div>
  );
};
