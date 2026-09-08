import { ConsistencyPlanDialog } from './ConsistencyPlanDialog';
import { ConsistencyFieldSelect } from './ConsistencyFieldSelect';
import { ConsistencyScopeEditor } from './ConsistencyScopeEditor';
import { getScopeFields, newScopeDraft } from '../data/consistencyScope';
import React, { useMemo, useRef, useState } from 'react';
import { Play, Plus, X, Loader2 } from 'lucide-react';
import {
  ConsistencyBatchRecord,
  ConsistencyPlan,
  ConsistencyStrategyType,
  ConsistencyItemStatus,
  ComparisonFieldSnapshot,
  calculateConsistencyStats,
  createConsistencyBatchId,
  formatLocalDateTime,
  OBJECT_STATUS_META,
  CONSISTENCY_MODE_LABELS,
} from '../types/consistencyCheck';
import {
  initialConsistencyBatches,
  buildComparisonFieldSnapshot,
  executeConsistencyRun,
  findLatestSuccessfulSyncBatch,
  PLM_SCOPE_UNAVAILABLE,
  ROOT_TYPE_OBJECT_ID_PLACEHOLDER,
} from '../data/consistencyCheckData';
import { preparePlanRun, resolvePlanSnapshot } from '../data/consistencyPlans';
import { initialMappingObjectTypes, initialFieldMappings } from '../stage1MappingData';
import { MappingObjectType, FieldMappingItem } from '../stage1MappingTypes';
import { SyncBatch } from '../syncQualityTypes';

interface DataConsistencyCheckViewProps {
  initialRootTypeFilter?: string;
  onInspectTarget?: (root?: string) => void;
  mappingObjects?: MappingObjectType[];
  fieldMappings?: Record<string, FieldMappingItem[]>;
  syncBatches?: SyncBatch[];
  batches?: ConsistencyBatchRecord[];
  onUpdateBatches?: React.Dispatch<React.SetStateAction<ConsistencyBatchRecord[]>>;
  plans?: ConsistencyPlan[];
  onUpdatePlans?: React.Dispatch<React.SetStateAction<ConsistencyPlan[]>>;
  onNavigateToSyncQuality?: (batchId?: string) => void;
  runOptions?: { forceTaskFailure?: boolean; delayMs?: number; objectErrorIds?: string[] };
}

const modes = Object.keys(CONSISTENCY_MODE_LABELS) as ConsistencyStrategyType[];
const scopeLabel = (rule: ConsistencyPlan['scopeRule']) =>
  rule === 'ALL_ROOT' ? '根类型全部对象' : 'PLM 分类/业务范围';
const statusLabel = (batch: ConsistencyBatchRecord) =>
  ({ RUNNING: '核验中', COMPLETED: '完成', COMPLETED_WITH_ERRORS: '完成（有异常）', FAILED: '失败' })[batch.status];
const newPlan = (rootTypeCode: string): ConsistencyPlan => ({
  id: crypto.randomUUID(),
  name: '',
  rootTypeCode,
  scopeRule: 'ALL_ROOT',
  uniqueKeyFieldKey: '',
  comparisonFieldKeys: [],
  comparisonRule: 'FORMAL_MAPPING',
  allowedModes: [...modes],
  defaultMode: 'RANDOM_SAMPLE',
  schedule: {
    enabled: false,
    frequency: 'DAILY',
    intervalHours: 24,
    time: '02:00',
    weekday: 1,
    sampleCount: 50,
  },
});

const planScheduleLabel = (plan: ConsistencyPlan) => {
  const schedule = plan.schedule;
  if (!schedule?.enabled) return '未启用';
  if (schedule.frequency === 'HOURLY') return `每 ${schedule.intervalHours} 小时 · 抽样 ${schedule.sampleCount}`;
  const period = schedule.frequency === 'DAILY' ? '每天' : `每周${'日一二三四五六'[schedule.weekday]}`;
  return `${period} ${schedule.time} · 抽样 ${schedule.sampleCount}`;
};

const validatePlanSchedule = (plan: ConsistencyPlan) => {
  const schedule = plan.schedule;
  if (!schedule?.enabled) return '';
  if (!plan.allowedModes.includes('RANDOM_SAMPLE') || plan.scopeRule !== 'ALL_ROOT') return '自动核验要求方案允许抽样，且范围为根类型全部对象';
  if (!Number.isInteger(schedule.sampleCount) || schedule.sampleCount < 1 || schedule.sampleCount > 10000) return '自动核验抽样量请输入 1–10000 的整数';
  if (schedule.frequency === 'HOURLY' && (!Number.isInteger(schedule.intervalHours) || schedule.intervalHours < 1 || schedule.intervalHours > 168)) return '自动核验间隔请输入 1–168 小时的整数';
  if (schedule.frequency !== 'HOURLY' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(schedule.time)) return '请选择自动核验执行时间';
  return '';
};

function FieldName({
  field,
}: {
  field: { displayName: string; sourceFieldKey: string; isDisplayNameMissing?: boolean };
}) {
  return (
    <span>
      {field.displayName?.trim() || field.sourceFieldKey}
      {field.isDisplayNameMissing && <small className="missing-name">显示名缺失</small>}
    </span>
  );
}

function SnapshotSummary({ snapshot }: { snapshot: ComparisonFieldSnapshot }) {
  return (
    <div className="snapshot-summary">
      <div>
        <span className="muted">唯一标识属性</span>
        <strong>
          <FieldName field={snapshot.uniqueKeyField} />
        </strong>
        <code>{snapshot.uniqueKeyField.sourceFieldKey}</code>
      </div>
      <div>
        <span className="muted">固定核验属性</span>
        <div className="field-tags">
          {snapshot.includedFields.map((field) => (
            <span className="field-tag" key={field.sourceFieldKey}>
              <FieldName field={field} />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export const DataConsistencyCheckView: React.FC<DataConsistencyCheckViewProps> = ({
  initialRootTypeFilter = 'ALL',
  onInspectTarget,
  mappingObjects = initialMappingObjectTypes,
  fieldMappings = initialFieldMappings,
  syncBatches,
  batches: externalBatches,
  onUpdateBatches,
  plans: externalPlans,
  onUpdatePlans,
  onNavigateToSyncQuality,
  runOptions,
}) => {
  const [internalBatches, setInternalBatches] = useState(initialConsistencyBatches);
  const [internalPlans, setInternalPlans] = useState<ConsistencyPlan[]>([]);
  const batches = externalBatches ?? internalBatches;
  const plans = externalPlans ?? internalPlans;
  const updateBatches = onUpdateBatches ?? setInternalBatches;
  const updatePlans = onUpdatePlans ?? setInternalPlans;
  const [runOpen, setRunOpen] = useState(false);
  const [rootFilter, setRootFilter] = useState(initialRootTypeFilter);
  const [draft, setDraft] = useState<ConsistencyPlan | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [mode, setMode] = useState<ConsistencyStrategyType>('RANDOM_SAMPLE');
  const [sampleCount, setSampleCount] = useState('50');
  const [ids, setIds] = useState('');
  const [rangeScope, setRangeScope] = useState(newScopeDraft);
  const [notice, setNotice] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | ConsistencyItemStatus>('ALL');
  const [page, setPage] = useState(1);
  const [objectId, setObjectId] = useState<string | null>(null);
  const submitting = useRef(false);
  const fields = useMemo(() => Object.values(fieldMappings).flat(), [fieldMappings]);
  const rootName = (code: string) => mappingObjects.find((root) => root.id === code)?.name || code;
  const draftFormal = useMemo(
    () => (draft ? buildComparisonFieldSnapshot(draft.rootTypeCode, fields) : {}),
    [draft, fields],
  );
  const resolvedDraft = draft
    ? { ...draft, uniqueKeyFieldKey: draftFormal.snapshot?.uniqueKeyField.sourceFieldKey || '' }
    : null;
  const draftError = resolvedDraft
    ? resolvePlanSnapshot(resolvedDraft, fields).error ||
      (plans.some((plan) => plan.id !== draft.id && plan.name.trim() === draft.name.trim()) ? '方案名称已存在' : '') ||
      validatePlanSchedule(resolvedDraft)
    : '';
  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId);
  const selectedSnapshot = selectedPlan ? resolvePlanSnapshot(selectedPlan, fields) : {};
  const parsedIds: string[] = [
    ...new Set<string>(
      ids
        .split(/[\s,，]+/)
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  ];
  const prepared = selectedPlan
    ? preparePlanRun(
        selectedPlan,
        fields,
        rootName(selectedPlan.rootTypeCode),
        mode,
        Number(sampleCount),
        parsedIds,
        rangeScope,
      )
    : {};
  const running = batches.some((batch) => batch.status === 'RUNNING');
  const runError = running ? '已有核验正在执行，请等待完成' : !selectedPlan ? '请先选择核验方案' : prepared.error;
  const visiblePlans = plans.filter((plan) => rootFilter === 'ALL' || plan.rootTypeCode === rootFilter);
  const visibleBatches = batches.filter((batch) => rootFilter === 'ALL' || batch.rootTypeCode === rootFilter);
  const latest = visibleBatches[0];
  const selectedBatch = batches.find((batch) => batch.id === selectedBatchId);
  const selectedObject = selectedBatch?.objectResults.find((object) => object.objectId === objectId);
  const filteredObjects =
    selectedBatch?.objectResults.filter((object) => filter === 'ALL' || object.status === filter) || [];

  function choosePlan(planId: string) {
    const plan = plans.find((item) => item.id === planId);
    setSelectedPlanId(planId);
    setMode(plan?.defaultMode || 'RANDOM_SAMPLE');
    setIds('');
    setRangeScope(newScopeDraft());
    setSampleCount('50');
    setNotice('');
  }
  function savePlan() {
    if (!resolvedDraft || draftError) return;
    const saved = structuredClone({ ...resolvedDraft, name: resolvedDraft.name.trim() });
    updatePlans((previous) =>
      previous.some((plan) => plan.id === saved.id)
        ? previous.map((plan) => (plan.id === saved.id ? saved : plan))
        : [...previous, saved],
    );
    setDraft(null);
    setNotice('方案已保存');
    if (selectedPlanId === saved.id) {
      setMode(saved.defaultMode);
      setIds('');
      setRangeScope(newScopeDraft());
    }
  }
  function triggerRun() {
    if (submitting.current || runError || !prepared.request) return;
    submitting.current = true;
    const request = structuredClone({
      ...prepared.request,
      sourceSyncBatchId: findLatestSuccessfulSyncBatch(syncBatches, prepared.request.rootTypeCode)?.id,
      simulateFailure: runOptions?.forceTaskFailure,
      simulateObjectErrorIds: runOptions?.objectErrorIds,
    });
    const batchId = createConsistencyBatchId();
    const pending: ConsistencyBatchRecord = {
      id: batchId,
      planName: request.planSnapshot!.name,
      planSnapshot: request.planSnapshot,
      triggerType: 'MANUAL_BY_PLAN',
      rootTypeCode: request.rootTypeCode,
      rootTypeName: request.rootTypeName,
      scopeMode: request.scopeMode,
      scopeDescription: scopeLabel(request.planSnapshot!.scopeRule),
      strategySummary: '正在核验',
      executedAt: formatLocalDateTime(),
      plannedCount: request.scopeMode === 'SPECIFIC_IDS' ? request.requestedObjectIds!.length : request.sampleCount!,
      actualCount: 0,
      consistentCount: 0,
      differenceCount: 0,
      pendingRecheckCount: 0,
      incompleteCount: 0,
      comparisonFieldSnapshot: request.comparisonFieldSnapshot,
      frozenObjectIds: [],
      objectResults: [],
      requestedObjectIds: request.requestedObjectIds,
      sourceSyncBatchId: request.sourceSyncBatchId,
      status: 'RUNNING',
    };
    updateBatches((previous) => [pending, ...previous]);
    setRunOpen(false);
    setNotice('已发起核验，可在下方记录中查看进度。');
    // 回调只读取启动时冻结的请求；共享任务在切换页面后仍可完成。
    setTimeout(() => {
      const completed = executeConsistencyRun(request, batchId);
      updateBatches((previous) => previous.map((batch) => (batch.id === batchId ? completed : batch)));
      submitting.current = false;
    }, runOptions?.delayMs ?? 1200);
  }

  return (
    <div className="data-consistency-check">
      <header className="page-heading">
        <div className="page-heading-copy">
          <div className="page-title-line">
            <h1>数据一致性核验</h1>
            <span className="prototype-note">原型演示</span>
          </div>
          <p className="muted">管理核验方案，查看 PLM 与检索底座的比对结果。</p>
        </div>
        <div className="page-actions">
          {onInspectTarget && (
            <button onClick={() => onInspectTarget(rootFilter === 'ALL' ? undefined : rootFilter)}>
              目标多余数据排查
            </button>
          )}
          <button
            onClick={() => {
              setDraft(newPlan(rootFilter === 'ALL' ? '' : rootFilter));
              setNotice('');
            }}
          >
            <Plus size={16} />
            新建方案
          </button>
          <button
            className="primary"
            disabled={running}
            onClick={() => {
              choosePlan(visiblePlans.length === 1 ? visiblePlans[0].id : '');
              setRunOpen(true);
            }}
          >
            {running ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            {running ? '核验中' : '发起核验'}
          </button>
        </div>
      </header>
      <label className="root-filter">
        对象类型
        <select
          aria-label="核验对象类型筛选"
          value={rootFilter}
          onChange={(event) => {
            setRootFilter(event.target.value);
            setSelectedBatchId(null);
            choosePlan('');
          }}
        >
          <option value="ALL">全部类型</option>
          {mappingObjects.map((root) => (
            <option key={root.id} value={root.id}>
              {root.name}
            </option>
          ))}
        </select>
      </label>
      {notice && (
        <p role="status" className="notice">
          {notice}
        </p>
      )}
      <section className="panel" aria-label="核验方案定义">
        <div className="section-heading">
          <div>
            <h2>核验方案</h2>
            <p className="muted">不同根类型分别建立方案。</p>
          </div>
          <span className="muted">{visiblePlans.length} 个方案</span>
        </div>
        {visiblePlans.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>方案名称</th>
                  <th>适用根类型</th>
                  <th>范围规则</th>
                  <th>固定核验属性</th>
                  <th>默认运行方式</th>
                  <th>自动核验</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {visiblePlans.map((plan) => (
                  <tr key={plan.id}>
                    <td>{plan.name}</td>
                    <td>{rootName(plan.rootTypeCode)}</td>
                    <td>{scopeLabel(plan.scopeRule)}</td>
                    <td>{plan.comparisonFieldKeys.length} 项</td>
                    <td>{CONSISTENCY_MODE_LABELS[plan.defaultMode]}</td>
                    <td>{planScheduleLabel(plan)}</td>
                    <td>
                      <div className="actions">
                        <button
                          className="text-button"
                          onClick={() => {
                            setDraft(structuredClone(plan));
                            setNotice('');
                          }}
                        >
                          编辑
                        </button>
                        <button
                          className="text-button"
                          onClick={() => {
                            choosePlan(plan.id);
                            setRunOpen(true);
                          }}
                        >
                          发起核验
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">暂无核验方案，请新建方案并选择核验属性。</div>
        )}
      </section>

      <section className="panel" aria-label="核验结果">
        <div className="section-heading">
          <h2>核验记录</h2>
          <span className="muted">{visibleBatches.length} 次记录</span>
        </div>
        {latest ? (
          <div className="latest-summary">
            <span>最新任务：{latest.planName}</span>
            <span className={`task-status ${latest.status.toLowerCase()}`}>{statusLabel(latest)}</span>
            <span>
              一致率{' '}
              {latest.status === 'RUNNING' || latest.status === 'FAILED'
                ? '--'
                : calculateConsistencyStats(latest).rateDisplay}
            </span>
          </div>
        ) : (
          <p className="muted">暂无核验任务，发起核验后查看结果统计</p>
        )}
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>方案 / 核验时间</th>
                <th>根类型</th>
                <th>运行方式</th>
                <th>状态</th>
                <th>实际数量</th>
                <th>一致率</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {visibleBatches.map((batch) => (
                <tr key={batch.id}>
                  <td>
                    <strong>{batch.planName}</strong>
                    <small className="muted">{batch.executedAt}</small>
                  </td>
                  <td>{batch.rootTypeName}</td>
                  <td>{CONSISTENCY_MODE_LABELS[batch.scopeMode]}</td>
                  <td>
                    <span className={`task-status ${batch.status.toLowerCase()}`}>{statusLabel(batch)}</span>
                  </td>
                  <td>{batch.status === 'RUNNING' ? '--' : batch.actualCount}</td>
                  <td>
                    {batch.status === 'RUNNING' || batch.status === 'FAILED'
                      ? '--'
                      : calculateConsistencyStats(batch).rateDisplay}
                  </td>
                  <td>
                    <button
                      onClick={() => {
                        setSelectedBatchId(batch.id);
                        setObjectId(null);
                        setFilter('ALL');
                        setPage(1);
                      }}
                    >
                      查看详情
                    </button>
                  </td>
                </tr>
              ))}
              {!visibleBatches.length && (
                <tr>
                  <td colSpan={7} className="empty-state">
                    暂无核验记录
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {runOpen && (
        <ConsistencyPlanDialog title="发起核验" closeLabel="关闭发起核验弹窗" onDismiss={() => setRunOpen(false)}>
          <form
            className="plan-dialog-form"
            onSubmit={(event) => {
              event.preventDefault();
              triggerRun();
            }}
          >
            <div className="plan-dialog-body">
              <label className="plan-picker">
                核验方案
                <select
                  data-autofocus
                  aria-label="核验方案"
                  value={selectedPlanId}
                  onChange={(event) => choosePlan(event.target.value)}
                >
                  <option value="">请选择核验方案</option>
                  {visiblePlans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name}
                    </option>
                  ))}
                </select>
              </label>
              {!visiblePlans.length && (
                <div className="empty-state">
                  暂无可选方案。
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => {
                      setRunOpen(false);
                      setDraft(newPlan(rootFilter === 'ALL' ? '' : rootFilter));
                    }}
                  >
                    新建方案
                  </button>
                </div>
              )}
              {selectedPlan && (
                <>
                  <div className="run-summary" aria-label="方案摘要">
                    <p className="muted">
                      {rootName(selectedPlan.rootTypeCode)} ·{' '}
                      {mode === 'EXHAUSTIVE_SCOPE' ? '按本次范围条件筛选' : scopeLabel(selectedPlan.scopeRule)}
                    </p>
                    {selectedSnapshot.snapshot ? (
                      <dl className="run-field-summary">
                        <dt>唯一标识</dt>
                        <dd title={selectedSnapshot.snapshot.uniqueKeyField.sourceFieldKey}>
                          <FieldName field={selectedSnapshot.snapshot.uniqueKeyField} />
                        </dd>
                        <dt>核验属性</dt>
                        <dd>
                          {selectedSnapshot.snapshot.includedFields.map((field, index) => (
                            <React.Fragment key={field.sourceFieldKey}>
                              {index > 0 && '、'}
                              <span title={field.sourceFieldKey}>
                                <FieldName field={field} />
                              </span>
                            </React.Fragment>
                          ))}
                        </dd>
                      </dl>
                    ) : (
                      <p className="validation">{selectedSnapshot.error}</p>
                    )}
                  </div>
                  <fieldset>
                    <legend>本次运行方式</legend>
                    <div className="mode-options">
                      {selectedPlan.allowedModes.map((item) => (
                        <label key={item}>
                          <input type="radio" name="run-mode" checked={mode === item} onChange={() => setMode(item)} />
                          {CONSISTENCY_MODE_LABELS[item]}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  {mode === 'EXHAUSTIVE_SCOPE' && (
                    <ConsistencyScopeEditor
                      value={rangeScope}
                      fields={getScopeFields(selectedPlan.rootTypeCode, fields)}
                      onChange={setRangeScope}
                    />
                  )}
                  {mode !== 'EXHAUSTIVE_SCOPE' && selectedPlan.scopeRule === 'PLM_SCOPE' && (
                    <div className="empty-state compact">{PLM_SCOPE_UNAVAILABLE}</div>
                  )}
                  {mode === 'RANDOM_SAMPLE' && (
                    <label className="sample-input">
                      抽样量
                      <input
                        aria-label="抽样量"
                        type="number"
                        min={1}
                        max={10000}
                        step={1}
                        value={sampleCount}
                        onChange={(event) => setSampleCount(event.target.value)}
                      />
                      <small className="muted">输入 1–10000 的整数；实际数量以核验结果为准。</small>
                    </label>
                  )}
                  {mode === 'SPECIFIC_IDS' && (
                    <label>
                      对象 ID
                      <textarea
                        aria-label="对象 ID"
                        rows={3}
                        value={ids}
                        onChange={(event) => setIds(event.target.value)}
                        placeholder={ROOT_TYPE_OBJECT_ID_PLACEHOLDER[selectedPlan.rootTypeCode]}
                      />
                      <small className="muted">用逗号、空格或换行分隔，已去重 {parsedIds.length} 个 ID。</small>
                    </label>
                  )}
                </>
              )}
            </div>
            <div className="form-footer">
              <span className="validation" id="run-error">
                {runError === PLM_SCOPE_UNAVAILABLE ? '分类范围未加载，暂不能发起核验' : runError}
              </span>
              <div className="actions">
                <button type="button" onClick={() => setRunOpen(false)}>
                  取消
                </button>
                <button
                  className="primary"
                  type="submit"
                  disabled={!!runError || !prepared.request}
                  aria-describedby="run-error"
                >
                  {running ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                  {running ? '核验中' : '发起核验'}
                </button>
              </div>
            </div>
          </form>
        </ConsistencyPlanDialog>
      )}

      {draft && (
        <ConsistencyPlanDialog
          title={plans.some((plan) => plan.id === draft.id) ? '编辑方案' : '新建方案'}
          onDismiss={() => setDraft(null)}
        >
          <form
            className="plan-dialog-form"
            onSubmit={(event) => {
              event.preventDefault();
              savePlan();
            }}
          >
            <div className="plan-dialog-body">
              <div className="form-grid">
                <label>
                  方案名称
                  <input
                    data-autofocus
                    aria-label="方案名称"
                    maxLength={80}
                    value={draft.name}
                    onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                    placeholder="例如：零部件日常核验"
                  />
                </label>
                <label>
                  适用根类型
                  <select
                    aria-label="适用根类型"
                    value={draft.rootTypeCode}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        rootTypeCode: event.target.value,
                        uniqueKeyFieldKey: '',
                        comparisonFieldKeys: [],
                      })
                    }
                  >
                    <option value="">请选择根类型</option>
                    {mappingObjects.map((root) => (
                      <option key={root.id} value={root.id}>
                        {root.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <fieldset>
                <legend>固定核验属性</legend>
                <p className="muted">选择需要逐字段比对的属性。</p>
                <ConsistencyFieldSelect
                  key={draft.rootTypeCode}
                  fields={draftFormal.snapshot?.includedFields || []}
                  value={draft.comparisonFieldKeys}
                  disabled={!draftFormal.snapshot}
                  onChange={(comparisonFieldKeys) => setDraft({ ...draft, comparisonFieldKeys })}
                />
                {draft.rootTypeCode && !draftFormal.snapshot && (
                  <p className="validation">{draftFormal.uniqueKeyError || draftFormal.fieldsError}</p>
                )}
              </fieldset>
              <fieldset>
                <legend>允许的运行方式</legend>
                <div className="mode-options">
                  {modes.map((item) => (
                    <label key={item}>
                      <input
                        type="checkbox"
                        checked={draft.allowedModes.includes(item)}
                        onChange={(event) => {
                          const allowedModes = event.target.checked
                            ? [...draft.allowedModes, item]
                            : draft.allowedModes.filter((value) => value !== item);
                          setDraft({
                            ...draft,
                            allowedModes,
                            defaultMode: allowedModes.includes(draft.defaultMode)
                              ? draft.defaultMode
                              : allowedModes[0] || 'RANDOM_SAMPLE',
                          });
                        }}
                      />
                      {CONSISTENCY_MODE_LABELS[item]}
                    </label>
                  ))}
                </div>
                <label className="default-mode">
                  默认运行方式
                  <select
                    aria-label="默认运行方式"
                    value={draft.allowedModes.length ? draft.defaultMode : ''}
                    onChange={(event) =>
                      setDraft({ ...draft, defaultMode: event.target.value as ConsistencyStrategyType })
                    }
                  >
                    {!draft.allowedModes.length && <option value="">请先选择允许的运行方式</option>}
                    {draft.allowedModes.map((item) => (
                      <option key={item} value={item}>
                        {CONSISTENCY_MODE_LABELS[item]}
                      </option>
                    ))}
                  </select>
                </label>
              </fieldset>
              <fieldset>
                <legend>自动核验</legend>
                <label className="inline-control">
                  <input
                    type="checkbox"
                    checked={!!draft.schedule?.enabled}
                    onChange={(event) => setDraft({
                      ...draft,
                      scopeRule: event.target.checked ? 'ALL_ROOT' : draft.scopeRule,
                      allowedModes: event.target.checked && !draft.allowedModes.includes('RANDOM_SAMPLE') ? [...draft.allowedModes, 'RANDOM_SAMPLE'] : draft.allowedModes,
                      schedule: { ...(draft.schedule || newPlan(draft.rootTypeCode).schedule!), enabled: event.target.checked },
                    })}
                  />
                  启用该方案的自动核验
                </label>
                <p className="muted">频率随方案保存。自动任务固定按本方案的全部对象范围抽样，手动发起仍可选择其他运行方式。</p>
                {draft.schedule?.enabled && (
                  <div className="form-grid">
                    <label>
                      执行周期
                      <select value={draft.schedule.frequency} onChange={(event) => setDraft({ ...draft, schedule: { ...draft.schedule!, frequency: event.target.value as NonNullable<ConsistencyPlan['schedule']>['frequency'] } })}>
                        <option value="HOURLY">按小时间隔</option><option value="DAILY">每天</option><option value="WEEKLY">每周</option>
                      </select>
                    </label>
                    {draft.schedule.frequency === 'HOURLY' ? (
                      <label>间隔小时<input type="number" min="1" max="168" value={draft.schedule.intervalHours} onChange={(event) => setDraft({ ...draft, schedule: { ...draft.schedule!, intervalHours: Number(event.target.value) } })} /></label>
                    ) : (
                      <label>执行时间（北京时间）<input type="time" value={draft.schedule.time} onChange={(event) => setDraft({ ...draft, schedule: { ...draft.schedule!, time: event.target.value } })} /></label>
                    )}
                    {draft.schedule.frequency === 'WEEKLY' && <label>星期<select value={draft.schedule.weekday} onChange={(event) => setDraft({ ...draft, schedule: { ...draft.schedule!, weekday: Number(event.target.value) } })}>{'日一二三四五六'.split('').map((day, index) => <option key={day} value={index}>星期{day}</option>)}</select></label>}
                    <label>每次抽样量<input type="number" min="1" max="10000" value={draft.schedule.sampleCount} onChange={(event) => setDraft({ ...draft, schedule: { ...draft.schedule!, sampleCount: Number(event.target.value) } })} /></label>
                  </div>
                )}
              </fieldset>
              <details className="compact-details scope-settings">
                <summary>
                  更多设置<span className="muted">范围：{scopeLabel(draft.scopeRule)}</span>
                </summary>
                <label>
                  核验范围规则
                  <select
                    aria-label="核验范围规则"
                    value={draft.scopeRule}
                    onChange={(event) =>
                      setDraft({ ...draft, scopeRule: event.target.value as ConsistencyPlan['scopeRule'] })
                    }
                  >
                    <option value="ALL_ROOT">根类型全部对象</option>
                    <option value="PLM_SCOPE">PLM 分类/业务范围</option>
                  </select>
                </label>
                {draft.scopeRule === 'PLM_SCOPE' && <p className="muted">分类范围未加载，暂不能发起核验。</p>}
              </details>
            </div>
            <div className="form-footer">
              <span className="validation" id="plan-error">
                {draftError}
              </span>
              <div className="actions">
                <button type="button" onClick={() => setDraft(null)}>
                  取消
                </button>
                <button className="primary" type="submit" disabled={!!draftError} aria-describedby="plan-error">
                  保存方案
                </button>
              </div>
            </div>
          </form>
        </ConsistencyPlanDialog>
      )}

      {selectedBatch && (
        <div
          className="detail-overlay"
          data-testid="batch-detail-drawer-overlay"
          onClick={() => setSelectedBatchId(null)}
        >
          <section
            className="detail-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="核验任务详情"
            tabIndex={-1}
            ref={(element) => {
              if (element && !element.contains(document.activeElement)) element.focus();
            }}
            onKeyDown={(event: React.KeyboardEvent<HTMLElement>) => {
              if (event.key === 'Escape') setSelectedBatchId(null);
              if (event.key === 'Tab') {
                const focusable: HTMLElement[] = Array.from(
                  event.currentTarget.querySelectorAll<HTMLElement>(
                    'button:not(:disabled), select, input, [tabindex="0"]',
                  ),
                );
                const first = focusable[0];
                const last = focusable[focusable.length - 1];
                if (
                  event.shiftKey &&
                  (document.activeElement === first || document.activeElement === event.currentTarget)
                ) {
                  event.preventDefault();
                  last?.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                  event.preventDefault();
                  first?.focus();
                }
              }
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="section-heading">
              <div>
                <h2>{selectedBatch.planName}</h2>
                <small className="muted batch-id">{selectedBatch.id}</small>
              </div>
              <button aria-label="关闭任务详情" onClick={() => setSelectedBatchId(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="summary-line">
              <strong>{selectedBatch.rootTypeName}</strong>
              <span>{CONSISTENCY_MODE_LABELS[selectedBatch.scopeMode]}</span>
              <span className={`task-status ${selectedBatch.status.toLowerCase()}`}>{statusLabel(selectedBatch)}</span>
            </div>
            {selectedBatch.status === 'FAILED' ? (
              <p className="validation">
                {selectedBatch.failedStage}：{selectedBatch.failedReason}
              </p>
            ) : (
              <p className="muted">
                {selectedBatch.status === 'RUNNING'
                  ? '正在核验，请稍候。'
                  : `已处理 ${selectedBatch.actualCount} 个对象，一致 ${selectedBatch.consistentCount}，不一致 ${selectedBatch.differenceCount}，待复查 ${selectedBatch.pendingRecheckCount}，无法比对 ${selectedBatch.incompleteCount}。一致率 ${calculateConsistencyStats(selectedBatch).rateDisplay}`}
              </p>
            )}
            {selectedBatch.incompleteCount > 0 && <p className="notice">单条异常已记录，其余对象已继续处理。</p>}
            {selectedBatch.comparisonFieldSnapshot && (
              <details>
                <summary>本次只读快照</summary>
                <p>
                  {selectedBatch.planSnapshot
                    ? scopeLabel(selectedBatch.planSnapshot.scopeRule)
                    : selectedBatch.scopeDescription}
                </p>
                <SnapshotSummary snapshot={selectedBatch.comparisonFieldSnapshot} />
                <ul className="rule-list">
                  {selectedBatch.comparisonFieldSnapshot.includedFields.map((field) => (
                    <li key={field.sourceFieldKey}>
                      <FieldName field={field} />：{field.comparisonMethod}
                    </li>
                  ))}
                </ul>
              </details>
            )}
            {selectedBatch.sourceSyncBatchId && onNavigateToSyncQuality && (
              <button className="text-button" onClick={() => onNavigateToSyncQuality(selectedBatch.sourceSyncBatchId)}>
                查看关联同步任务
              </button>
            )}
            <label className="result-filter">
              对象状态
              <select
                aria-label="对象状态"
                value={filter}
                onChange={(event) => {
                  setFilter(event.target.value as typeof filter);
                  setPage(1);
                  setObjectId(null);
                }}
              >
                <option value="ALL">全部</option>
                {Object.entries(OBJECT_STATUS_META).map(([key, meta]) => (
                  <option key={key} value={key}>
                    {meta.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>对象 ID</th>
                    <th>对象名称</th>
                    <th>状态</th>
                    <th>原因</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredObjects.slice((page - 1) * 10, page * 10).map((object) => (
                    <tr key={object.objectId}>
                      <td>{object.objectId}</td>
                      <td>{object.objectName}</td>
                      <td>
                        {OBJECT_STATUS_META[object.status].label}
                        {object.isTargetMissing && <small className="muted">目标记录缺失</small>}
                      </td>
                      <td>{object.statusDetail}</td>
                      <td>
                        <button onClick={() => setObjectId(object.objectId)}>字段明细</button>
                      </td>
                    </tr>
                  ))}
                  {!filteredObjects.length && (
                    <tr>
                      <td colSpan={5} className="empty-state">
                        暂无对象记录
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="pagination">
              <span>共 {filteredObjects.length} 个对象</span>
              <button
                disabled={page <= 1}
                onClick={() => {
                  setPage(page - 1);
                  setObjectId(null);
                }}
              >
                上一页
              </button>
              <span>
                {page} / {Math.max(1, Math.ceil(filteredObjects.length / 10))}
              </span>
              <button
                disabled={page * 10 >= filteredObjects.length}
                onClick={() => {
                  setPage(page + 1);
                  setObjectId(null);
                }}
              >
                下一页
              </button>
            </div>
            {selectedObject && (
              <section className="object-detail">
                <div className="section-heading">
                  <h3>字段明细：{selectedObject.objectId}</h3>
                  <button onClick={() => setObjectId(null)}>收起</button>
                </div>
                <p>{selectedObject.statusDetail}</p>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>核验字段</th>
                        <th>PLM 原始值</th>
                        <th>映射预期值</th>
                        <th>Manticore 实际值</th>
                        <th>比较结果</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedObject.fields.map((field) => (
                        <tr key={field.fieldCode}>
                          <td>
                            <FieldName
                              field={{
                                displayName: field.fieldName,
                                sourceFieldKey: field.fieldCode,
                                isDisplayNameMissing: field.isDisplayNameMissing,
                              }}
                            />
                            <code>{field.fieldCode}</code>
                          </td>
                          <td>{field.plmRawValue ?? '--'}</td>
                          <td>{field.mappedExpectedValue ?? '--'}</td>
                          <td>{field.manticoreActualValue ?? '--'}</td>
                          <td>
                            {
                              {
                                MATCH: '一致',
                                MISMATCH: '差异',
                                TARGET_MISSING: '目标记录缺失',
                                UNVERIFIABLE: '无法比对',
                              }[field.matchStatus]
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </section>
        </div>
      )}
    </div>
  );
};
