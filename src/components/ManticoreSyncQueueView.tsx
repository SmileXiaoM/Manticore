import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Copy,
  Database,
  Eye,
  FileJson,
  RefreshCw,
  RotateCcw,
  Search,
  Server,
  X,
} from 'lucide-react';
import { MappingObjectType } from '../stage1MappingTypes';
import { ExecutionSchedule, scheduleLabel } from '../data/operations';
import {
  TargetSyncOperation,
  TargetSyncRecord,
  TargetSyncStatus,
  initialTargetSyncRecords,
  targetSyncOperationLabel,
  targetSyncStatusLabel,
} from '../data/targetSyncRecords';
import { formatCompactNumber, paginateRows, TablePagination } from './ui/TablePagination';

const rootName: Record<string, string> = { PART: '零部件', DOCUMENT: '文档', PROCESS: '工艺路线' };
const statusClass: Record<TargetSyncStatus, string> = {
  PENDING: 'bg-[var(--ty-orange-lightest-color)] text-[var(--ty-orange-color)] border-[var(--ty-orange-color)]/30',
  PROCESSED: 'bg-[var(--ty-green-lightest-color)] text-[var(--ty-green-color)] border-[var(--ty-green-color)]/30',
  FAILED: 'bg-[var(--ty-red-lightest-color)] text-[var(--ty-red-color)] border-[var(--ty-red-color)]/30',
};
const operationClass: Record<TargetSyncOperation, string> = {
  CREATE: 'bg-[var(--ty-green-lightest-color)] text-[var(--ty-green-color)] border-[var(--ty-green-color)]/30',
  UPDATE: 'bg-[var(--ty-primary-lightest-color)] text-[var(--ty-primary-color)] border-[var(--ty-primary-color)]/30',
  DELETE: 'bg-[var(--ty-red-lightest-color)] text-[var(--ty-red-color)] border-[var(--ty-red-color)]/30',
};

interface ManticoreSyncQueueViewProps {
  roots: MappingObjectType[];
  schedules: ExecutionSchedule[];
  records?: TargetSyncRecord[];
  initialRootTypeFilter?: string;
  onRetryRecord?: (recordId: string) => void;
}

export function ManticoreSyncQueueView({
  roots,
  schedules,
  records = initialTargetSyncRecords,
  initialRootTypeFilter = 'ALL',
  onRetryRecord,
}: ManticoreSyncQueueViewProps) {
  const [rootType, setRootType] = useState(initialRootTypeFilter);
  const [status, setStatus] = useState<'ALL' | TargetSyncStatus>('ALL');
  const [keyword, setKeyword] = useState('');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [showJson, setShowJson] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [retryConfirmId, setRetryConfirmId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const scoped = useMemo(
    () => records.filter((row) => rootType === 'ALL' || row.rootTypeCode === rootType),
    [records, rootType],
  );
  const visible = useMemo(() => scoped.filter((row) => {
    if (status !== 'ALL' && row.status !== status) return false;
    const term = keyword.trim().toLowerCase();
    return !term || [
      row.id,
      row.sourceObjectOid,
      row.businessKey,
      row.stagingTable,
      row.targetIndex,
      row.errorCode,
      row.failureReason,
      row.traceId,
    ].some((value) => value?.toLowerCase().includes(term));
  }), [scoped, status, keyword]);
  const { currentPage, rows: pageRows } = paginateRows<TargetSyncRecord>(visible, page, pageSize);

  const detail = records.find((row) => row.id === detailId);
  const count = (target: TargetSyncStatus) => scoped.filter((row) => row.status === target).length;
  const selectedRoot = roots.find((root) => root.id === rootType);
  const scopedRootIds = new Set(roots.filter((root) => rootType === 'ALL' || root.id === rootType).map((root) => root.id));
  const targetCount = roots
    .filter((root) => scopedRootIds.has(root.id))
    .reduce((sum, root) => sum + (root.manticoreDocCount || 0), 0);
  const latestProcessedAt = scoped
    .map((row) => row.processedAt)
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => b.localeCompare(a))[0] || '—';
  const activeRoots = roots.filter((root) => root.accessEnabled).length;

  useEffect(() => {
    if (!detailId) return;
    const close = (event: KeyboardEvent) => event.key === 'Escape' && setDetailId(null);
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [detailId]);

  useEffect(() => {
    setShowJson(false);
  }, [detailId]);

  const retry = (recordId: string) => {
    const record = records.find((item) => item.id === recordId);
    const root = roots.find((item) => item.id === record?.rootTypeCode);
    onRetryRecord?.(recordId);
    setRetryConfirmId(null);
    setFeedback(root?.accessEnabled
      ? '已重新入队。记录已变为待处理，将在该对象下一次同步任务执行时重试。'
      : '已重新入队，但该对象当前已停用；启用接入配置后，记录才会被调度处理。');
  };

  const copyJson = async (record: TargetSyncRecord) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(record.payload, null, 2));
      setFeedback('原始 JSON 已复制。');
    } catch {
      setFeedback('复制失败，请在 JSON 区域中手动选择复制。');
    }
  };

  const metrics = [
    { label: '未处理', value: formatCompactNumber(count('PENDING')), exactValue: count('PENDING'), icon: <Clock3 className="w-4 h-4" /> },
    { label: '中间表总数据量', value: formatCompactNumber(scoped.length), exactValue: scoped.length, icon: <Database className="w-4 h-4" /> },
    { label: '已处理成功', value: formatCompactNumber(count('PROCESSED')), exactValue: count('PROCESSED'), icon: <CheckCircle2 className="w-4 h-4" /> },
    { label: '当前失败', value: formatCompactNumber(count('FAILED')), exactValue: count('FAILED'), icon: <AlertTriangle className="w-4 h-4" /> },
    { label: '目标表当前数据量', value: formatCompactNumber(targetCount), exactValue: targetCount, icon: <Server className="w-4 h-4" /> },
    { label: '最近处理时间', value: latestProcessedAt, icon: <Clock3 className="w-4 h-4" />, time: true },
  ];

  return (
    <div className="min-w-0 space-y-4">
      <header className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-[var(--ty-primary-color)]" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-ty-xl font-semibold">Manticore 同步队列</h1>
              <span className="text-ty-2xs min-h-6 px-2 inline-flex items-center rounded-ty-xs bg-[var(--ty-fill-color)] text-[var(--ty-font-sub-color)] border border-[var(--ty-border-color)]">中间表 → Manticore</span>
            </div>
            <p className="mt-1 text-ty-xs text-[var(--ty-font-sub-color)]">同步服务轮询中间表，并按单条记录写入目标表。</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-ty-xs">
          <span className="min-h-6 px-2 inline-flex items-center rounded-ty-xs bg-[var(--ty-green-lightest-color)] text-[var(--ty-green-color)] border border-[var(--ty-green-color)]/30">
            <Server className="w-3.5 h-3.5 mr-1" />同步服务运行中
          </span>
          <span className="text-[var(--ty-font-sub-color)]">已启用 {activeRoots} / {roots.length} 个类型</span>
        </div>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-3" aria-label="同步队列概览">
        {metrics.map((metric) => (
          <div key={metric.label} className="min-w-0 bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="text-ty-xs text-[var(--ty-font-sub-color)] block">{metric.label}</span>
              <strong className={`${metric.time ? 'text-ty-xs' : 'text-ty-xl'} mt-1 block font-mono truncate`} title={metric.exactValue === undefined ? metric.value : metric.exactValue.toLocaleString('zh-CN')}>{metric.value}</strong>
            </div>
            <div className="shrink-0 w-8 h-8 rounded-ty-sm bg-[var(--ty-fill-color)] text-[var(--ty-font-sub-color)] flex items-center justify-center">{metric.icon}</div>
          </div>
        ))}
      </section>

      <section className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-3 flex flex-wrap items-end gap-3">
        <label className="text-ty-xs text-[var(--ty-font-sub-color)] space-y-1">
          <span className="block">对象类型</span>
          <select value={rootType} onChange={(event) => { setRootType(event.target.value); setPage(1); }} aria-label="同步队列对象类型" className="h-8 min-w-36 px-3 border border-[var(--ty-border-color)] rounded-ty-sm bg-[var(--ty-fill-white-color)]">
            <option value="ALL">全部类型</option>
            {roots.map((root) => <option key={root.id} value={root.id}>{rootName[root.id]}</option>)}
          </select>
        </label>
        <label className="text-ty-xs text-[var(--ty-font-sub-color)] space-y-1">
          <span className="block">处理状态</span>
          <select value={status} onChange={(event) => { setStatus(event.target.value as 'ALL' | TargetSyncStatus); setPage(1); }} aria-label="同步队列状态" className="h-8 min-w-36 px-3 border border-[var(--ty-border-color)] rounded-ty-sm bg-[var(--ty-fill-white-color)]">
            <option value="ALL">全部状态</option>
            {Object.entries(targetSyncStatusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="text-ty-xs text-[var(--ty-font-sub-color)] space-y-1 flex-1 min-w-56">
          <span className="block">记录 ID / 对象 OID / 业务唯一键 / 失败信息</span>
          <span className="relative block">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5" />
            <input aria-label="搜索同步队列" value={keyword} onChange={(event) => { setKeyword(event.target.value); setPage(1); }} placeholder="输入关键字" className="h-8 w-full pl-8 pr-2 border border-[var(--ty-border-color)] rounded-ty-sm" />
          </span>
        </label>
        <button type="button" onClick={() => { setRootType('ALL'); setStatus('ALL'); setKeyword(''); setPage(1); }} className="h-8 px-3 border border-[var(--ty-border-color)] rounded-ty-sm text-ty-xs flex items-center gap-2 hover:bg-[var(--ty-fill-weak-dark-color)]">
          <RotateCcw className="w-3.5 h-3.5" />重置
        </button>
      </section>

      <div className="bg-[var(--ty-primary-lightest-color)]/35 border border-[var(--ty-primary-color)]/20 rounded-ty-sm px-3 py-2 text-ty-xs flex flex-wrap items-center justify-between gap-2">
        <span>{selectedRoot ? `${rootName[selectedRoot.id]}：${selectedRoot.accessEnabled ? scheduleLabel(schedules.find((item) => item.rootTypeCode === selectedRoot.id), selectedRoot.pollingIntervalMinutes) : '已停用，不再轮询中间表'}` : '各对象类型按自己的检查频率轮询，队列按单条记录处理。'}</span>
        <span className="text-[var(--ty-font-sub-color)]">当前失败为尚未重试成功的记录</span>
      </div>

      {feedback && (
        <div role="status" className="bg-[var(--ty-green-lightest-color)] border border-[var(--ty-green-color)]/30 rounded-ty-sm px-3 py-2 text-ty-xs flex items-center justify-between gap-3">
          <span>{feedback}</span>
          <button type="button" aria-label="关闭操作提示" onClick={() => setFeedback('')} className="w-7 h-7 flex items-center justify-center rounded-ty-sm hover:bg-[var(--ty-fill-color)]"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      <section className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--ty-border-color)]">
          <h2 className="text-ty-sm font-semibold">同步记录</h2>
          <p className="text-ty-xs text-[var(--ty-font-sub-color)] mt-1">共 {visible.length} 条；失败记录可查看详情，并重新放回待处理队列。</p>
        </div>
        <div className="overflow-auto max-h-88">
          <table className="w-full min-w-[1720px] text-ty-xs">
            <thead className="sticky top-0 z-20 bg-[var(--ty-fill-weak-dark-color)] text-[var(--ty-font-sub-color)]">
              <tr>
                <th className="w-12 px-3 py-2 text-center">序号</th>
                <th className="px-3 py-2 text-left">状态</th>
                <th className="px-3 py-2 text-left">中间表记录 ID</th>
                <th className="px-3 py-2 text-left">源对象 ID</th>
                <th className="px-3 py-2 text-left">业务唯一键</th>
                <th className="px-3 py-2 text-left">操作类型</th>
                <th className="px-3 py-2 text-left">接收时间</th>
                <th className="px-3 py-2 text-left">处理时间</th>
                <th className="px-3 py-2 text-right">重试次数</th>
                <th className="px-3 py-2 text-left">失败信息</th>
                <th className="sticky right-0 z-30 px-3 py-2 text-center bg-[var(--ty-fill-weak-dark-color)]">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--ty-border-light-color)]">
              {pageRows.map((row, index) => (
                <tr key={row.id} className="hover:bg-[var(--ty-fill-weak-dark-color)]/50">
                  <td className="px-3 py-3 text-center text-[var(--ty-font-sub-color)]">{(currentPage - 1) * pageSize + index + 1}</td>
                  <td className="px-3 py-3">
                    <span className={`min-h-6 px-2 inline-flex items-center rounded-ty-xs border font-medium ${statusClass[row.status]}`}>{targetSyncStatusLabel[row.status]}</span>
                  </td>
                  <td className="px-3 py-3 font-mono font-medium whitespace-nowrap">{row.id}</td>
                  <td className="px-3 py-3 font-mono whitespace-nowrap">{row.sourceObjectOid}</td>
                  <td className="px-3 py-3"><span className="block max-w-72 truncate font-mono" title={row.businessKey}>{row.businessKey}</span></td>
                  <td className="px-3 py-3"><span className={`min-h-6 px-2 inline-flex items-center rounded-ty-xs border ${operationClass[row.operationType]}`}>{targetSyncOperationLabel[row.operationType]}</span></td>
                  <td className="px-3 py-3 font-mono whitespace-nowrap text-[var(--ty-font-sub-color)]">{row.receivedAt}</td>
                  <td className="px-3 py-3 font-mono whitespace-nowrap text-[var(--ty-font-sub-color)]">{row.processedAt || '—'}</td>
                  <td className="px-3 py-3 text-right font-mono">{row.retryCount}</td>
                  <td className="px-3 py-3">
                    {row.failureReason
                      ? <span className={`${row.status === 'FAILED' ? 'text-[var(--ty-red-color)]' : 'text-[var(--ty-font-sub-color)]'} block max-w-64 truncate`} title={row.failureReason}>{row.status === 'FAILED' ? row.failureReason : `上次失败：${row.failureReason}`}</span>
                      : <span className="text-[var(--ty-font-sub-light-color)]">—</span>}
                  </td>
                  <td className="sticky right-0 px-3 py-3 text-center bg-[var(--ty-fill-white-color)] whitespace-nowrap">
                    <button type="button" onClick={() => setDetailId(row.id)} className="h-8 px-2 text-[var(--ty-primary-color)] inline-flex items-center gap-1 hover:underline"><Eye className="w-3.5 h-3.5" />详情</button>
                    {row.status === 'FAILED' && <button type="button" onClick={() => setRetryConfirmId(row.id)} className="h-8 px-2 text-[var(--ty-primary-color)] inline-flex items-center gap-1 hover:underline"><RefreshCw className="w-3.5 h-3.5" />重新入队</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!visible.length && <div className="p-10 text-center text-ty-xs text-[var(--ty-font-sub-color)]">暂无数据</div>}
        <TablePagination total={visible.length} page={currentPage} pageSize={pageSize} itemLabel="条" onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
      </section>

      {detail && (
        <div className="fixed inset-0 z-50 bg-ty-overlay flex items-center justify-center px-4 py-[60px] overflow-y-auto" onMouseDown={(event) => event.target === event.currentTarget && setDetailId(null)}>
          <section role="dialog" aria-modal="true" aria-label="同步记录详情" className="w-[min(800px,calc(100vw-32px))] max-h-[calc(100dvh-120px)] flex flex-col bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-lg shadow-ty-lg overflow-hidden">
            <header className="shrink-0 px-4 py-3 bg-[var(--ty-fill-weak-dark-color)] border-b border-[var(--ty-border-color)] flex justify-between items-center">
              <div>
                <h2 className="text-ty-lg font-semibold">同步记录详情</h2>
                <p className="text-ty-xs text-[var(--ty-font-sub-color)] mt-1 font-mono">{detail.id}</p>
              </div>
              <button type="button" aria-label="关闭详情" onClick={() => setDetailId(null)} className="w-8 h-8 flex items-center justify-center rounded-ty-sm hover:bg-[var(--ty-fill-color)]"><X className="w-4 h-4" /></button>
            </header>
            <div className="min-h-0 overflow-y-auto p-4 space-y-4 text-ty-xs">
              <section>
                <h3 className="text-ty-sm font-semibold mb-3">记录信息</h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <div><span className="text-[var(--ty-font-sub-color)] block">状态</span><span className={`mt-1 min-h-6 px-2 inline-flex items-center rounded-ty-xs border ${statusClass[detail.status]}`}>{targetSyncStatusLabel[detail.status]}</span></div>
                  <div><span className="text-[var(--ty-font-sub-color)] block">对象类型</span><strong className="mt-1 block">{rootName[detail.rootTypeCode]}</strong></div>
                  <div><span className="text-[var(--ty-font-sub-color)] block">源对象 ID</span><strong className="mt-1 block font-mono break-all">{detail.sourceObjectOid}</strong></div>
                  <div><span className="text-[var(--ty-font-sub-color)] block">操作类型</span><span className={`mt-1 min-h-6 px-2 inline-flex items-center rounded-ty-xs border ${operationClass[detail.operationType]}`}>{targetSyncOperationLabel[detail.operationType]}</span></div>
                  <div className="col-span-2"><span className="text-[var(--ty-font-sub-color)] block">业务唯一键</span><strong className="mt-1 block font-mono break-all">{detail.businessKey}</strong>{detail.rootTypeCode === 'PART' && <span className="mt-1 block text-[var(--ty-font-sub-color)]">组成规则：masterOid + 视图 + 工厂</span>}</div>
                </div>
              </section>
              <section className="pt-4 border-t border-[var(--ty-border-light-color)]">
                <h3 className="text-ty-sm font-semibold mb-3">处理信息</h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <div><span className="text-[var(--ty-font-sub-color)] block">接收时间</span><strong className="mt-1 block font-mono">{detail.receivedAt}</strong></div>
                  <div><span className="text-[var(--ty-font-sub-color)] block">处理时间</span><strong className="mt-1 block font-mono">{detail.processedAt || '—'}</strong></div>
                  <div><span className="text-[var(--ty-font-sub-color)] block">重试次数</span><strong className="mt-1 block font-mono">{detail.retryCount}</strong></div>
                  <div><span className="text-[var(--ty-font-sub-color)] block">追踪编号</span><strong className="mt-1 block font-mono">{detail.traceId}</strong></div>
                  <div><span className="text-[var(--ty-font-sub-color)] block">同步链路</span><strong className="mt-1 block">{detail.stagingTable} → {detail.targetIndex}</strong></div>
                </div>
              </section>
              {detail.failureReason && (
                <section className="p-3 rounded-ty-sm bg-[var(--ty-red-lightest-color)] border border-[var(--ty-red-color)]/30">
                  <h3 className="text-ty-sm font-semibold text-[var(--ty-red-color)]">{detail.status === 'FAILED' ? '当前失败原因' : '上次失败原因'} · {detail.errorCode}</h3>
                  <p className="mt-1">{detail.failureReason}</p>
                </section>
              )}
              {showJson && (
                <section className="pt-4 border-t border-[var(--ty-border-light-color)]">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h3 className="text-ty-sm font-semibold">原始 JSON</h3>
                    <button type="button" onClick={() => copyJson(detail)} className="h-8 px-3 border border-[var(--ty-border-color)] rounded-ty-sm inline-flex items-center gap-2 hover:bg-[var(--ty-fill-weak-dark-color)]"><Copy className="w-3.5 h-3.5" />复制 JSON</button>
                  </div>
                  <pre className="max-h-56 overflow-auto p-3 rounded-ty-sm bg-[var(--ty-fill-weak-dark-color)] border border-[var(--ty-border-color)] font-mono whitespace-pre-wrap break-all">{JSON.stringify(detail.payload, null, 2)}</pre>
                </section>
              )}
            </div>
            <footer className="shrink-0 px-4 py-3 bg-[var(--ty-fill-weak-dark-color)] border-t border-[var(--ty-border-color)] flex items-center justify-between gap-3">
              <button type="button" onClick={() => setShowJson((current) => !current)} className="h-8 px-3 border border-[var(--ty-border-color)] rounded-ty-sm bg-[var(--ty-fill-white-color)] inline-flex items-center gap-2 hover:bg-[var(--ty-fill-color)]"><FileJson className="w-3.5 h-3.5" />{showJson ? '收起原始 JSON' : '查看原始 JSON'}</button>
              <div className="flex items-center gap-2">
                {detail.status === 'FAILED' && <button type="button" onClick={() => setRetryConfirmId(detail.id)} className="h-8 px-3 border border-[var(--ty-primary-color)] rounded-ty-sm text-[var(--ty-primary-color)] bg-[var(--ty-fill-white-color)] inline-flex items-center gap-2"><RefreshCw className="w-3.5 h-3.5" />重新入队</button>}
                <button type="button" className="h-8 min-w-16 px-4 border border-[var(--ty-border-color)] rounded-ty-sm bg-[var(--ty-fill-white-color)]" onClick={() => setDetailId(null)}>关闭</button>
              </div>
            </footer>
          </section>
        </div>
      )}

      {retryConfirmId && (
        <div className="fixed inset-0 z-[60] bg-ty-overlay flex items-center justify-center p-4" onMouseDown={(event) => event.target === event.currentTarget && setRetryConfirmId(null)}>
          <section role="alertdialog" aria-modal="true" aria-label="确认重新入队" className="w-[min(480px,calc(100vw-32px))] bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-lg shadow-ty-lg overflow-hidden">
            <header className="px-4 py-3 border-b border-[var(--ty-border-color)]"><h2 className="text-ty-lg font-semibold">确认重新入队</h2></header>
            <div className="p-4 text-ty-sm leading-6">
              <p>记录将变为“待处理”，并在该对象下一次同步任务执行时重试。</p>
              <p className="mt-2 text-ty-xs text-[var(--ty-font-sub-color)]">上次失败原因会保留，便于后续复盘；重新入队不会立即写入 Manticore。</p>
            </div>
            <footer className="px-4 py-3 bg-[var(--ty-fill-weak-dark-color)] border-t border-[var(--ty-border-color)] flex justify-end gap-2">
              <button type="button" className="h-8 px-4 border border-[var(--ty-border-color)] rounded-ty-sm bg-[var(--ty-fill-white-color)]" onClick={() => setRetryConfirmId(null)}>取消</button>
              <button type="button" className="h-8 px-4 border border-[var(--ty-primary-color)] rounded-ty-sm bg-[var(--ty-primary-color)] text-[var(--ty-font-white-color)]" onClick={() => retry(retryConfirmId)}>确认重新入队</button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
