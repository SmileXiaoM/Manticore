import React, { useState } from 'react';
import {
  MappingObjectType,
  FieldMappingItem,
  SourceFieldMeta
} from '../stage1MappingTypes';
import {
  initialSourceSystems,
  initialMappingObjectTypes,
  initialFieldMappings,
  mockSourceFieldMetas,
  mockStage1PreviewRecords
} from '../stage1MappingData';
import { ObjectTypeListView } from './stage1-mapping/ObjectTypeListView';
import { FieldMappingListView } from './stage1-mapping/FieldMappingListView';
import { SingleFieldEditModal } from './stage1-mapping/SingleFieldEditModal';
import { BatchImportModal } from './stage1-mapping/BatchImportModal';
import {
  PublishConfigModal,
  TriggerSyncModal,
  Stage1QueryPreviewModal,
  FieldDetailModal
} from './stage1-mapping/Stage1Modals';

interface Stage1MappingConfigViewProps {
  onNavigateToSyncQuality: (batchId?: string) => void;
  hasPermission?: boolean;
}

export const Stage1MappingConfigView: React.FC<Stage1MappingConfigViewProps> = ({
  onNavigateToSyncQuality,
  hasPermission = true
}) => {
  // 1. 核心数据状态
  const [sourceSystems] = useState(initialSourceSystems);
  const [mappingObjects, setMappingObjects] = useState<MappingObjectType[]>(initialMappingObjectTypes);
  const [fieldMappings, setFieldMappings] = useState<FieldMappingItem[]>(
    () => Object.values(initialFieldMappings).flat()
  );

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

  // 4. 当前上下文对应的根类型实体
  const currentRootType = mappingObjects.find(r => r.id === selectedRootTypeId) || mappingObjects[0];

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

        return {
          ...root,
          configuredFieldCount: configuredCount,
          formalQueryableFieldCount: formalQueryCount,
          draftWorkItemCount: draftCount,
          configStatus: configuredCount > 0 ? 'CONFIGURED' : draftCount > 0 ? 'DRAFT_ONLY' : 'UNCONFIGURED'
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
            // 纯草稿未同步前，不进入正式查询底座
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
            // 如果改动了核心物理结构，等待下一次同步进入最新底座
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
          draftWorkItemCount: 0,
          configStatus: 'CONFIGURED' as const,
          syncStatus: hasDataImpacting ? 'PENDING' : root.syncStatus,
          hasPendingSyncChanges: hasDataImpacting
        };
      })
    );

    setIsPublishModalOpen(false);
  };

  // 执行手工数据同步 (以根类型为权威实体，单条数据异常不中断整体任务)
  const handleConfirmDataSync = (syncScope: 'INCREMENTAL' | 'FULL') => {
    setIsTriggerSyncModalOpen(false);

    // 1. 设置为正在运行
    setMappingObjects(prev =>
      prev.map(root => {
        if (root.id !== currentRootType.id) return root;
        return {
          ...root,
          syncStatus: 'RUNNING'
        };
      })
    );

    // 2. 1.2 秒后模拟同步完成
    setTimeout(() => {
      const nowTime = '2026-09-02 10:35:00';
      const batchId = `SYNC-BATCH-${Date.now().toString().slice(-6)}`;

      // 所有当前已配置的字段正式进入查询底座
      let nextFields: FieldMappingItem[] = [];
      setFieldMappings(prev => {
        nextFields = prev.map(f => {
          if (f.rootTypeId !== currentRootType.id) return f;
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
          if (root.id !== currentRootType.id) return root;
          const formalCount = nextFields.filter(
            f => f.rootTypeId === root.id && f.configStatus === 'CONFIGURED' && f.isInFormalQueryBase && f.isDisplayInResult
          ).length;

          // 模拟若有异常数据则标记为 COMPLETED_WITH_ERRORS，否则 COMPLETED
          const hasMinorErrors = root.id === 'DOCUMENT'; // 模拟 Document 含有部分单条异常

          return {
            ...root,
            syncStatus: hasMinorErrors ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED',
            lastSyncedAt: nowTime,
            lastSyncBatchId: batchId,
            formalQueryableFieldCount: formalCount,
            hasPendingSyncChanges: false,
            syncErrorRecords: hasMinorErrors ? root.syncErrorRecords : []
          };
        })
      );
    }, 1200);
  };

  // 触发单根类型快速同步
  const handleTriggerQuickSync = (rootId: string) => {
    setSelectedRootTypeId(rootId);
    setIsTriggerSyncModalOpen(true);
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
          onOpenQueryPreview={() => setIsQueryPreviewOpen(true)}
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

      {/* 模态框 4：手工发起数据同步 */}
      <TriggerSyncModal
        isOpen={isTriggerSyncModalOpen}
        onClose={() => setIsTriggerSyncModalOpen(false)}
        currentRootType={currentRootType}
        onConfirmSync={handleConfirmDataSync}
        onNavigateToSyncQuality={onNavigateToSyncQuality}
      />

      {/* 模态框 5：一阶段正式查询预览 */}
      <Stage1QueryPreviewModal
        isOpen={isQueryPreviewOpen}
        onClose={() => setIsQueryPreviewOpen(false)}
        currentRootType={currentRootType}
        fields={fieldMappings}
        previewRecords={
          mockStage1PreviewRecords[currentRootType.id] ||
          mockStage1PreviewRecords['PART'] ||
          []
        }
      />

      {/* 模态框 6：字段详情查看 */}
      <FieldDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        field={detailTargetField}
      />
    </div>
  );
};
