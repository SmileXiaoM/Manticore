import {
  FieldMappingItem,
  MappingObjectType,
  determineSyncStrategy,
  SYNC_STRATEGY_LABELS
} from './stage1MappingTypes';
import { SyncBatch, SyncRootType, formatLocalDateTime, toSyncRootType } from './syncQualityTypes';

export interface Stage1RuntimeState {
  mappingObjects: MappingObjectType[];
  fieldMappings: FieldMappingItem[];
  batches: SyncBatch[];
}

export interface SyncRunOptions {
  forceTaskFailure?: boolean;
  sourceDataCount?: number;
  targetDataCount?: number;
  recordFailure?: boolean;
  delayMs?: number;
}

export interface ResetRunOptions {
  forceTaskFailure?: boolean;
  delayMs?: number;
}

export interface Stage1TaskRequest {
  id: string;
  rootTypeId: string;
  taskType: 'SYNC' | 'RESET';
  hasPermission: boolean;
  confirmedCode?: string;
  startTime: string;
}

type StartValidation =
  | { ok: true; target: MappingObjectType; syncRootType: SyncRootType }
  | { ok: false; reason: string };

// The same gate is used before opening a confirmation and inside the state transaction.
export function validateStage1TaskStart(
  state: Stage1RuntimeState,
  request: Pick<Stage1TaskRequest, 'rootTypeId' | 'hasPermission' | 'confirmedCode'>
): StartValidation {
  const target = state.mappingObjects.find(root => root.id === request.rootTypeId);
  const syncRootType = toSyncRootType(request.rootTypeId);
  if (!target || !syncRootType) return { ok: false, reason: '根类型不存在或不支持，无法启动任务。' };
  if (!request.hasPermission) return { ok: false, reason: '当前用户没有接入配置操作权限。' };
  if (request.confirmedCode !== undefined && request.confirmedCode !== target.id) {
    return { ok: false, reason: '确认码必须与根类型编码完全一致且区分大小写。' };
  }
  const hasRunningTask = state.batches.some(batch =>
    batch.executionStatus === 'RUNNING' && batch.rootTypes.includes(syncRootType)
  );
  if (target.syncStatus === 'RUNNING' || target.syncStatus === 'RESETTING' || hasRunningTask) {
    return { ok: false, reason: '当前根类型有同步或重置任务正在执行，请等待任务结束。' };
  }
  return { ok: true, target, syncRootType };
}

const knownCount = (value: number | null | undefined): number | undefined =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : undefined;

export function beginStage1Task(state: Stage1RuntimeState, request: Stage1TaskRequest): Stage1RuntimeState {
  const validation = validateStage1TaskStart(state, request);
  if (!validation.ok || state.batches.some(batch => batch.id === request.id)) return state;
  // RESET cannot bypass code confirmation even when called outside the UI.
  if (request.taskType === 'RESET' && request.confirmedCode !== request.rootTypeId) return state;
  const { target, syncRootType } = validation;
  const { strategy, reason } = determineSyncStrategy(target, state.fieldMappings);
  const isReset = request.taskType === 'RESET';
  const batch: SyncBatch = {
    id: request.id,
    jobName: `${target.name} ${isReset ? '接入重置' : '数据同步'}任务`,
    taskType: request.taskType,
    rootTypes: [syncRootType],
    triggerType: 'MANUAL',
    startTime: request.startTime,
    executionStatus: 'RUNNING',
    sourceDataCount: undefined,
    failedRecords: [],
    statusNote: isReset ? '正在执行接入重置，成功后提交字段及底座变化。' : '正在读取源端数据',
    ...(isReset ? {
      resetAuditDetail: {
        operator: '接入管理员',
        confirmedInputCode: request.confirmedCode!,
        beforeConfiguredCount: target.configuredFieldCount,
        beforeDraftCount: target.draftFieldCount,
        beforeFormalQueryableCount: target.formalQueryableFieldCount,
        beforeDocCount: knownCount(target.manticoreDocCount),
        deletedDocCount: undefined,
        retainedDraftCount: state.fieldMappings.filter(field => field.rootTypeId === target.id).length
      }
    } : {
      syncMethod: strategy === 'INITIAL_REBUILD' ? 'FULL' : strategy === 'RETRY_COMPENSATION' ? 'COMPENSATION' : 'INCREMENTAL',
      actualStrategy: SYNC_STRATEGY_LABELS[strategy],
      strategyReason: reason,
      successCount: 0,
      failedCount: 0,
      skippedCount: 0
    })
  };
  // Running state lives in the task collection; no business state is mutated before success.
  return { ...state, batches: [batch, ...state.batches] };
}

export function completeStage1Task(
  state: Stage1RuntimeState,
  request: Stage1TaskRequest,
  options: SyncRunOptions | ResetRunOptions = {},
  completedAt = new Date()
): Stage1RuntimeState {
  const batch = state.batches.find(item => item.id === request.id);
  if (!batch || batch.executionStatus !== 'RUNNING') return state;
  const target = state.mappingObjects.find(root => root.id === request.rootTypeId);
  const syncRootType = toSyncRootType(request.rootTypeId);
  const endTime = formatLocalDateTime(completedAt);
  const durationMs = completedAt.getTime() - new Date(request.startTime.replace(' ', 'T')).getTime();
  const durationText = Number.isFinite(durationMs) ? `${Math.max(0, durationMs / 1000).toFixed(1)}s` : undefined;
  const fail = (reason: string): Stage1RuntimeState => ({
    ...state,
    batches: state.batches.map(item => item.id !== request.id ? item : {
      ...item,
      executionStatus: 'FAILED',
      endTime,
      durationText,
      statusNote: reason,
      taskFailureDetail: { failureReason: reason, failureStage: '提交前校验', errorCode: `${request.taskType}_EXECUTION_FAILED` },
      ...(item.resetAuditDetail ? {
        resetAuditDetail: {
          ...item.resetAuditDetail,
          deletedDocCount: 0,
          failureStage: '提交前校验',
          failureReason: reason,
          needsAdminIntervention: true
        }
      } : {})
    })
  });
  if (batch.taskType !== request.taskType || batch.rootTypes.length !== 1 || batch.rootTypes[0] !== syncRootType
    || batch.startTime !== request.startTime) {
    return fail('任务编号与根类型、任务类型或启动时间不匹配，未提交字段和底座变化。');
  }
  if (!target || !syncRootType) return fail('根类型不存在或不支持，任务已终止，未提交字段和底座变化。');
  if (options.forceTaskFailure) return fail(`${request.taskType === 'RESET' ? '重置' : '同步'}执行失败，未提交字段和底座变化。`);

  if (request.taskType === 'RESET') {
    if (!batch.resetAuditDetail) return fail('缺少重置审计信息，任务已终止。');
    const nextFields: FieldMappingItem[] = state.fieldMappings.map(field => field.rootTypeId !== target.id ? field : {
      ...field,
      configStatus: 'DRAFT',
      hasDraftModification: false,
      draftData: undefined,
      isInFormalQueryBase: false,
      isDataImpactingChange: true,
      updatedAt: endTime,
      updatedBy: '接入管理员'
    });
    const retainedDraftCount = nextFields.filter(field => field.rootTypeId === target.id).length;
    return {
      fieldMappings: nextFields,
      mappingObjects: state.mappingObjects.map(root => root.id !== target.id ? root : {
        ...root,
        configStatus: retainedDraftCount > 0 ? 'DRAFTING' : 'NOT_CONFIGURED',
        configuredFieldCount: 0,
        formalQueryableFieldCount: 0,
        draftFieldCount: retainedDraftCount,
        syncStatus: 'NOT_SYNCED',
        manticoreDocCount: 0,
        hasPendingSyncChanges: false,
        lastSyncedAt: undefined,
        lastSyncBatchId: undefined,
        lastSyncSuccessCount: undefined,
        lastSyncErrorCount: undefined,
        lastSyncErrorMsg: undefined,
        lastSyncErrorRecords: []
      }),
      batches: state.batches.map(item => item.id !== request.id ? item : {
        ...item,
        executionStatus: 'SUCCESS',
        endTime,
        durationText,
        statusNote: `已完成接入重置：清空正式查询数据，保留 ${retainedDraftCount} 个字段映射并转为草稿。`,
        resetAuditDetail: {
          ...batch.resetAuditDetail!,
          deletedDocCount: knownCount(batch.resetAuditDetail.beforeDocCount),
          retainedDraftCount
        }
      })
    };
  }

  const syncOptions: SyncRunOptions = options;
  if ((syncOptions.sourceDataCount !== undefined && knownCount(syncOptions.sourceDataCount) === undefined)
    || (syncOptions.targetDataCount !== undefined && knownCount(syncOptions.targetDataCount) === undefined)) {
    return fail('同步结果数量无效，未提交字段和底座变化。');
  }
  // Each fixture belongs to this task and its execution window; historical failures are never copied.
  const hasRecordFailure = syncOptions.recordFailure ?? target.id === 'DOCUMENT';
  const failedRecords: SyncBatch['failedRecords'] = hasRecordFailure ? [{
    id: `${request.id}-ERROR-1`,
    recordKey: `${syncRootType}-${request.id}-1`,
    rootType: syncRootType,
    failedField: 'name',
    failureReason: '本次读取记录的名称字段为空，未写入底座。',
    occurredAt: endTime,
    retryable: true,
    latestRetryResult: 'NONE',
    errorCode: 'SYNC_REQUIRED_FIELD',
    traceId: `${request.id}-TRACE-1`
  }] : [];
  const sourceDataCount = knownCount(syncOptions.sourceDataCount);
  if (sourceDataCount !== undefined && sourceDataCount < failedRecords.length) return fail('同步结果总数小于异常数，未提交字段和底座变化。');
  const successCount = sourceDataCount === undefined ? undefined : sourceDataCount - failedRecords.length;
  const nextFields = state.fieldMappings.map(field => field.rootTypeId !== target.id || field.configStatus !== 'CONFIGURED' ? field : {
    ...field, isInFormalQueryBase: true, isDataImpactingChange: false, hasDraftModification: false
  });
  const { strategy, reason } = determineSyncStrategy(target, state.fieldMappings);
  return {
    fieldMappings: nextFields,
    mappingObjects: state.mappingObjects.map(root => root.id !== target.id ? root : {
      ...root,
      syncStatus: failedRecords.length ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED',
      lastSyncedAt: endTime,
      lastSyncBatchId: request.id,
      formalQueryableFieldCount: nextFields.filter(field => field.rootTypeId === root.id && field.configStatus === 'CONFIGURED' && field.isInFormalQueryBase && field.isDisplayInResult).length,
      hasPendingSyncChanges: false,
      manticoreDocCount: knownCount(syncOptions.targetDataCount),
      lastSyncSuccessCount: successCount,
      lastSyncErrorCount: failedRecords.length,
      lastSyncErrorMsg: undefined,
      lastSyncExecutionStrategy: strategy,
      lastSyncStrategyReason: reason,
      lastSyncErrorRecords: failedRecords.map(record => ({
        id: record.id, recordKey: record.recordKey, sourceSystemId: root.sourceSystemId,
        rootTypeId: root.id, errorField: record.failedField, errorCode: record.errorCode!,
        errorMsg: record.failureReason, rawPayloadSummary: record.failureReason,
        timestamp: record.occurredAt, status: 'UNRESOLVED'
      }))
    }),
    batches: state.batches.map(item => item.id !== request.id ? item : {
      ...item, endTime, durationText,
      executionStatus: failedRecords.length ? 'PARTIAL_SUCCESS' : 'SUCCESS',
      sourceDataCount, successCount, failedCount: failedRecords.length, skippedCount: 0,
      statusNote: failedRecords.length ? `同步完成，本次产生 ${failedRecords.length} 条异常。` : '数据同步成功，正式查询底座已更新。',
      failedRecords
    })
  };
}
