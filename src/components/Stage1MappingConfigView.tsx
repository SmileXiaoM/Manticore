import React, { useState } from 'react';
import {
  MappingObjectType,
  FieldMappingItem,
  SourceFieldMeta,
  RootTypeConfigStatus,
  determineSyncStrategy
} from '../stage1MappingTypes';
import {
  initialSourceSystems,
  initialMappingObjectTypes,
  initialFieldMappings,
  mockSourceFieldMetas,
  mockStage1PreviewRecords
} from '../stage1MappingData';
import { SyncBatch } from '../syncQualityTypes';
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

    // 系统自动确定同步执行方式与原因
    const { strategy, reason } = determineSyncStrategy(target, fieldMappings);

    // 1. 设置为正在运行，记录当前策略
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

    // 2. 1.2 秒后模拟同步完成
    setTimeout(() => {
      const nowTime = new Date().toISOString().replace('T', ' ').substring(0, 19);
      const batchId = `SYNC-${target.id}-${Date.now().toString().slice(-6)}`;

      // 所有当前已配置的字段正式进入查询底座
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

      // 更新根类型状态 (只更新数据状态、正式可查字段数、最近同步时间，并清空待同步状态，绝不含版本)
      setMappingObjects(prev =>
        prev.map(root => {
          if (root.id !== target.id) return root;
          const formalCount = nextFields.filter(
            f => f.rootTypeId === root.id && f.configStatus === 'CONFIGURED' && f.isInFormalQueryBase && f.isDisplayInResult
          ).length;

          // 模拟若有记录级异常（如 DOCUMENT 含有部分异常）
          const hasMinorErrors = root.id === 'DOCUMENT';

          const restoredDocCount =
            root.manticoreDocCount === 0 || !root.manticoreDocCount
              ? root.id === 'PART'
                ? 38400
                : root.id === 'DOCUMENT'
                ? 52000
                : 19200
              : root.manticoreDocCount;

          return {
            ...root,
            syncStatus: hasMinorErrors ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED',
            lastSyncedAt: nowTime,
            lastSyncBatchId: batchId,
            formalQueryableFieldCount: formalCount,
            hasPendingSyncChanges: false,
            manticoreDocCount: restoredDocCount,
            lastSyncErrorRecords: hasMinorErrors ? root.lastSyncErrorRecords : []
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

  // 查看重置接入审计记录（统一定位至数据同步与质量中心）
  const handleOpenResetAudit = (rootId: string) => {
    // 优先定位该根类型的最新重置记录
    const latestResetBatch = currentBatches.find(
      b => b.taskType === 'RESET' && b.rootTypes.includes(rootId as any)
    );
    onNavigateToSyncQuality(latestResetBatch?.id);
  };

  // 模拟致命失败（用于检验底座保护机制）
  const handleSimulateFatalFail = (rootId: string) => {
    setMappingObjects(prev =>
      prev.map(root => {
        if (root.id !== rootId) return root;
        return {
          ...root,
          syncStatus: 'FAILED',
          lastSyncErrorMsg: 'PLM 中间库 CDC 二进制日志同步断开，任务中止 (正式底座已受保护)'
        };
      })
    );
  };

  // 确认执行重置接入
  const handleConfirmReset = (confirmedCode: string) => {
    const rootId = resetTargetRootTypeId;
    const target = mappingObjects.find(r => r.id === rootId);
    if (!target) return;

    const beforeDocCount = target.manticoreDocCount ?? 38400;
    const targetFields = fieldMappings.filter(f => f.rootTypeId === rootId);

    // 1. 关闭弹窗并标记根类型状态为 RESETTING
    setIsResetAccessModalOpen(false);
    setMappingObjects(prev =>
      prev.map(r => (r.id === rootId ? { ...r, syncStatus: 'RESETTING' } : r))
    );

    // 2. 模拟异步重置过程（1 秒后完成物理索引清空与草稿转换）
    setTimeout(() => {
      const nowTime = new Date().toISOString().replace('T', ' ').substring(0, 19);
      const auditBatchId = `RESET-${Date.now().toString().slice(-8)}`;

      // 字段映射全部保留，但转为草稿（退出正式查询底座）
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
            updatedBy: '接入管理员 (重置)'
          };
        })
      );

      // 根类型更新：物理索引清空，已配置为0，草稿为保留字段数，数据状态为未同步
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

      // 新增一条不可篡改的统一 SyncBatch 审计记录 (taskType: 'RESET')
      const newResetBatch: SyncBatch = {
        id: auditBatchId,
        taskType: 'RESET',
        jobName: `接入重置 - ${target.name} 底座清理与草稿归档`,
        rootTypes: [rootId as any],
        syncMethod: 'FULL',
        triggerType: 'MANUAL',
        startTime: nowTime,
        endTime: nowTime,
        durationText: '1.2s',
        executionStatus: 'SUCCESS',
        sourceDataCount: beforeDocCount,
        successCount: beforeDocCount,
        failedCount: 0,
        skippedCount: 0,
        statusNote: `高危二次校验输入确认码【${confirmedCode}】校验通过，物理索引清空（${beforeDocCount.toLocaleString()} 条已清空），保留 ${targetFields.length} 个字段映射转为草稿态。`,
        failedRecords: [],
        handlingNotes: [
          {
            id: `note-${Date.now()}`,
            content: `执行人完成接入重置，已清空检索底座，保留${targetFields.length}个配置字段为草稿状态。`,
            operator: '当前用户 (接入管理员)',
            createdAt: nowTime
          }
        ],
        resetAuditDetail: {
          operator: '当前用户 (接入管理员)',
          confirmedInputCode: confirmedCode,
          beforeConfiguredCount: target.configuredFieldCount,
          beforeDraftCount: target.draftFieldCount,
          beforeFormalQueryableCount: target.formalQueryableFieldCount,
          beforeDocCount: beforeDocCount,
          deletedDocCount: beforeDocCount,
          retainedDraftCount: targetFields.length,
          manticoreSchemaRetentionNote: '保持底座表结构完整，TRUNCATE 清空已有文档'
        }
      };

      updateBatches(prev => [newResetBatch, ...prev]);
    }, 1000);
  };

  return (
    <div className="space-y-4">
      {/* 视图分发：根类型总览 vs 根类型字段映射列表 */}
      {currentLevel === 'OVERVIEW' ? (
        <ObjectTypeListView
          sourceSystems={sourceSystems}
          mappingObjects={mappingObjects}
          onSelectRootType={handleSelectRootType}
          onTriggerSync={handleTriggerQuickSync}
          onResetAccess={handleRequestResetAccess}
          onOpenResetAudit={handleOpenResetAudit}
          onSimulateFatalFail={handleSimulateFatalFail}
          onOpenQueryPreview={handleOpenQueryPreview}
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
          onOpenResetAudit={() => handleOpenResetAudit(currentRootType.id)}
          onSimulateFatalFail={() => handleSimulateFatalFail(currentRootType.id)}
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
