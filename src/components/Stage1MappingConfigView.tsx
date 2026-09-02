import React, { useState } from 'react';
import {
  MappingObjectType,
  MappingSoftType,
  FieldMappingItem,
  SourceFieldMeta
} from '../stage1MappingTypes';
import {
  initialSourceSystems,
  initialMappingObjects,
  initialFieldMappings,
  mockPlmSourceMetadataPool,
  mockStage1PreviewData
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
  const [mappingObjects, setMappingObjects] = useState<MappingObjectType[]>(initialMappingObjects);
  const [fieldMappings, setFieldMappings] = useState<FieldMappingItem[]>(initialFieldMappings);

  // 2. 当前视图层级 (OVERVIEW: 根对象总入口, DETAIL: 软类型字段列表)
  const [currentLevel, setCurrentLevel] = useState<'OVERVIEW' | 'DETAIL'>('OVERVIEW');
  const [selectedRootTypeId, setSelectedRootTypeId] = useState<string>('PART');
  const [selectedSoftTypeId, setSelectedSoftTypeId] = useState<string>('PART_MECHANICAL');

  // 3. 模态框控制状态
  const [isSingleEditOpen, setIsSingleEditOpen] = useState(false);
  const [editingTargetField, setEditingTargetField] = useState<FieldMappingItem | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailTargetField, setDetailTargetField] = useState<FieldMappingItem | null>(null);

  const [isBatchImportOpen, setIsBatchImportOpen] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isTriggerSyncModalOpen, setIsTriggerSyncModalOpen] = useState(false);
  const [isQueryPreviewOpen, setIsQueryPreviewOpen] = useState(false);

  // 4. 当前上下文对应的实体
  const currentRootType = mappingObjects.find(r => r.id === selectedRootTypeId) || mappingObjects[0];
  const currentSoftType =
    currentRootType.softTypes.find(s => s.id === selectedSoftTypeId) || currentRootType.softTypes[0];

  // 来源元数据池
  const availablePlmFields: SourceFieldMeta[] =
    mockPlmSourceMetadataPool[currentSoftType.id] || mockPlmSourceMetadataPool['PART_MECHANICAL'] || [];

  // ==================== 业务交互动作 ====================

  // 进入字段配置列表
  const handleSelectSoftType = (rootId: string, softId: string) => {
    setSelectedRootTypeId(rootId);
    setSelectedSoftTypeId(softId);
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

  // 保存单个草稿 (包括对已生效字段的草稿微调)
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

    // 重新计算并更新软类型的草稿数与生效数统计
    updateSoftTypeStats(savedField.rootTypeId, savedField.softTypeId, nextMappings);
  };

  // 批量生成草稿
  const handleSaveBatchDrafts = (newDrafts: FieldMappingItem[]) => {
    let nextMappings: FieldMappingItem[] = [];
    setFieldMappings(prev => {
      nextMappings = [...prev, ...newDrafts];
      return nextMappings;
    });

    if (newDrafts.length > 0) {
      updateSoftTypeStats(newDrafts[0].rootTypeId, newDrafts[0].softTypeId, nextMappings);
    }
  };

  // 辅助更新软类型统计数据
  const updateSoftTypeStats = (
    rootId: string,
    softId: string,
    sourceFields?: FieldMappingItem[]
  ) => {
    const list = sourceFields || fieldMappings;
    setMappingObjects(prev =>
      prev.map(root => {
        if (root.id !== rootId) return root;
        return {
          ...root,
          softTypes: root.softTypes.map(soft => {
            if (soft.id !== softId) return soft;
            const softFields = list.filter(
              f => f.rootTypeId === rootId && f.softTypeId === softId
            );
            const activeCount = softFields.filter(f => f.configStatus === 'ACTIVE').length;
            const draftCount = softFields.filter(
              f => f.configStatus === 'DRAFT' || (f.configStatus === 'ACTIVE' && f.hasDraftModification)
            ).length;
            const queryableCount = softFields.filter(
              f => f.configStatus === 'ACTIVE' && f.dataStatus === 'SYNC_SUCCESS' && f.isDisplayInResult
            ).length;

            return {
              ...soft,
              activeFieldCount: activeCount,
              queryableFieldCount: queryableCount,
              draftFieldCount: draftCount,
              configStatus: activeCount > 0 ? 'ACTIVE' : draftCount > 0 ? 'DRAFT_ONLY' : 'UNCONFIGURED'
            };
          })
        };
      })
    );
  };

  // 执行发布配置 (严格按照 2.2 口径：让草稿成为生效，数据状态变为待同步，不自动同步，正式查询继续使用上一版本)
  const handleConfirmPublish = () => {
    const currentVer = currentSoftType.activeConfigVersion || 'v1.0.0';
    const majorMinor = currentVer.replace('v', '').split('.');
    const nextVer = `v${majorMinor[0]}.${Number(majorMinor[1] || 0) + 1}.0`;
    const nowTime = '2026-09-02 10:30:00';

    let hasDataImpacting = false;

    // 1. 更新当前软类型下的字段状态
    setFieldMappings(prev =>
      prev.map(f => {
        if (f.rootTypeId !== currentRootType.id || f.softTypeId !== currentSoftType.id) return f;

        // 如果是纯草稿
        if (f.configStatus === 'DRAFT') {
          if (f.isDataImpactingChange) hasDataImpacting = true;
          return {
            ...f,
            configStatus: 'ACTIVE',
            hasDraftModification: false,
            dataStatus: f.isDataImpactingChange ? 'PENDING_SYNC' : 'NO_SYNC_NEEDED',
            lastConfigVersion: nextVer,
            updatedAt: nowTime,
            updatedBy: '当前登录用户 (发布生效)'
          };
        }

        // 如果是已生效字段且存在草稿修改
        if (f.configStatus === 'ACTIVE' && f.hasDraftModification && f.draftData) {
          if (f.isDataImpactingChange) hasDataImpacting = true;
          return {
            ...f,
            ...f.draftData,
            hasDraftModification: false,
            draftData: undefined,
            dataStatus: f.isDataImpactingChange ? 'PENDING_SYNC' : f.dataStatus,
            lastConfigVersion: nextVer,
            updatedAt: nowTime,
            updatedBy: '当前登录用户 (发布生效)'
          };
        }

        return f;
      })
    );

    // 2. 更新软类型配置状态与版本 (注意：activeQueryVersion 保持上一版本不变，直至同步成功)
    setMappingObjects(prev =>
      prev.map(root => {
        if (root.id !== currentRootType.id) return root;
        return {
          ...root,
          softTypes: root.softTypes.map(soft => {
            if (soft.id !== currentSoftType.id) return soft;
            const updatedActiveCount = fieldMappings.filter(
              f => f.rootTypeId === root.id && f.softTypeId === soft.id
            ).length;
            return {
              ...soft,
              activeConfigVersion: nextVer,
              lastPublishedAt: nowTime,
              draftFieldCount: 0,
              activeFieldCount: updatedActiveCount,
              configStatus: 'ACTIVE',
              syncStatus: hasDataImpacting ? 'PENDING_SYNC' : soft.syncStatus,
              hasPendingSyncFields: hasDataImpacting
            };
          })
        };
      })
    );

    setIsPublishModalOpen(false);
  };

  // 执行手工数据同步 (严格按照 2.2 口径：按对象/软类型整体发起，同步成功后原子切换最新可查询版本)
  const handleConfirmDataSync = (syncScope: 'INCREMENTAL' | 'FULL') => {
    setIsTriggerSyncModalOpen(false);

    // 模拟同步中状态
    setMappingObjects(prev =>
      prev.map(root => {
        if (root.id !== currentRootType.id) return root;
        return {
          ...root,
          softTypes: root.softTypes.map(soft => {
            if (soft.id !== currentSoftType.id) return soft;
            return {
              ...soft,
              syncStatus: 'SYNCING'
            };
          })
        };
      })
    );

    // 1.2 秒后同步完成，原子切换 activeQueryVersion 为当前 activeConfigVersion
    setTimeout(() => {
      const targetVersion = currentSoftType.activeConfigVersion;
      const nowTime = '2026-09-02 10:35:00';
      const batchId = `BATCH-${Date.now().toString().slice(-8)}`;

      setFieldMappings(prev =>
        prev.map(f => {
          if (f.rootTypeId !== currentRootType.id || f.softTypeId !== currentSoftType.id) return f;
          return {
            ...f,
            dataStatus: 'SYNC_SUCCESS'
          };
        })
      );

      setMappingObjects(prev =>
        prev.map(root => {
          if (root.id !== currentRootType.id) return root;
          return {
            ...root,
            softTypes: root.softTypes.map(soft => {
              if (soft.id !== currentSoftType.id) return soft;
              const syncedFields = fieldMappings.filter(
                f => f.rootTypeId === root.id && f.softTypeId === soft.id && f.configStatus === 'ACTIVE'
              );
              return {
                ...soft,
                syncStatus: 'SYNC_SUCCESS',
                lastSyncedAt: nowTime,
                lastSyncBatchId: batchId,
                activeQueryVersion: targetVersion, // 原子切换最新成功查询版本！
                queryableFieldCount: syncedFields.length,
                hasPendingSyncFields: false,
                lastSyncErrorMsg: undefined
              };
            })
          };
        })
      );
    }, 1200);
  };

  return (
    <div className="space-y-4">
      {/* 视图分发：总入口 vs 字段列表 */}
      {currentLevel === 'OVERVIEW' ? (
        <ObjectTypeListView
          sourceSystems={sourceSystems}
          mappingObjects={mappingObjects}
          onSelectSoftType={handleSelectSoftType}
          onNavigateToSyncQuality={onNavigateToSyncQuality}
          hasPermission={hasPermission}
        />
      ) : (
        <FieldMappingListView
          currentRootType={currentRootType}
          currentSoftType={currentSoftType}
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
        currentSoftType={currentSoftType}
        availablePlmFields={availablePlmFields}
        existingFieldMappings={fieldMappings}
        editingField={editingTargetField}
        onSaveDraft={handleSaveDraft}
        hasPermission={hasPermission}
      />

      {/* 模态框 2：从 PLM 批量选择属性 */}
      <BatchImportModal
        isOpen={isBatchImportOpen}
        onClose={() => setIsBatchImportOpen(false)}
        currentRootType={currentRootType}
        currentSoftType={currentSoftType}
        availablePlmFields={availablePlmFields}
        existingFieldMappings={fieldMappings}
        onSaveBatchDrafts={handleSaveBatchDrafts}
        hasPermission={hasPermission}
      />

      {/* 模态框 3：发布配置影响确认 */}
      <PublishConfigModal
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
        currentRootType={currentRootType}
        currentSoftType={currentSoftType}
        fields={fieldMappings}
        onConfirmPublish={handleConfirmPublish}
      />

      {/* 模态框 4：手工发起数据同步 */}
      <TriggerSyncModal
        isOpen={isTriggerSyncModalOpen}
        onClose={() => setIsTriggerSyncModalOpen(false)}
        currentRootType={currentRootType}
        currentSoftType={currentSoftType}
        onConfirmSync={handleConfirmDataSync}
        onNavigateToSyncQuality={onNavigateToSyncQuality}
      />

      {/* 模态框 5：一阶段正式查询预览 */}
      <Stage1QueryPreviewModal
        isOpen={isQueryPreviewOpen}
        onClose={() => setIsQueryPreviewOpen(false)}
        currentRootType={currentRootType}
        currentSoftType={currentSoftType}
        fields={fieldMappings}
        previewRecords={
          mockStage1PreviewData[currentSoftType.id] ||
          mockStage1PreviewData['PART_MECHANICAL'] ||
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
