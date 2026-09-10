import { useState } from 'react';
import { ArrowLeft, Database, Info, Search } from 'lucide-react';
import { MappingObjectType } from '../stage1MappingTypes';
import { PresenceSnapshot, classifyPresence } from '../data/operations';
import { paginateRows, TablePagination } from './ui/TablePagination';

export function TargetPresenceView({ roots, initialRoot = 'PART', onBack, onSync, evidence = [] }: {
  roots: MappingObjectType[];
  initialRoot?: string;
  onBack: () => void;
  onSync: (root: string) => void;
  evidence?: PresenceSnapshot[];
}) {
  const [root, setRoot] = useState(initialRoot);
  const [example, setExample] = useState(true);
  const [scenario, setScenario] = useState('COMPLETE');
  const [filter, setFilter] = useState('ALL');
  const [selected, setSelected] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const snapshot: PresenceSnapshot | undefined = example ? {
    rootTypeCode: root, snapshotId: `EXAMPLE-PRESENCE-${root}`, capturedAt: '2026-09-08T01:00:00Z',
    sourceComplete: scenario === 'COMPLETE', sameScope: true, authoritative: scenario === 'COMPLETE', targetComplete: true,
    records: [
      { objectId: `${root}-EXAMPLE-01`, targetId: '1001', sourceResult: 'FOUND' },
      { objectId: `${root}-EXAMPLE-02`, targetId: '1002', sourceResult: scenario === 'ERROR' ? 'ERROR' : scenario === 'FORBIDDEN' ? 'FORBIDDEN' : 'NOT_FOUND', note: '需结合源端删除、失效及同步记录确认。' },
      { objectId: `${root}-EXAMPLE-03`, targetId: '1003', sourceResult: 'FOUND' },
    ],
  } : evidence.filter((item) => item.rootTypeCode === root).sort((a, b) => Date.parse(b.capturedAt) - Date.parse(a.capturedAt))[0];
  const results = snapshot?.records.map((row) => ({ ...row, ...classifyPresence(snapshot, row) })) || [];
  const visible = results.filter((row) => filter === 'ALL' || row.status === filter);
  const { currentPage, rows: pageRows } = paginateRows(visible, page, pageSize);
  const detail = results.find((row) => row.targetId === selected);
  const badge = (status: string) => status === 'EXTRA'
    ? 'bg-[var(--ty-red-lightest-color)] text-[var(--ty-red-color)] border-[var(--ty-red-color)]/30'
    : status === 'PRESENT'
      ? 'bg-[var(--ty-green-lightest-color)] text-[var(--ty-green-color)] border-[var(--ty-green-color)]/30'
      : 'bg-[var(--ty-orange-lightest-color)] text-[var(--ty-orange-color)] border-[var(--ty-orange-color)]/30';

  return (
    <div className="min-w-0 space-y-4">
      <header className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <button onClick={onBack} className="text-ty-xs text-[var(--ty-font-sub-color)] inline-flex items-center gap-1 hover:text-[var(--ty-primary-color)]"><ArrowLeft className="w-3.5 h-3.5" />返回上一页</button>
          <div className="flex items-center gap-2 mt-2"><Database className="w-5 h-5 text-[var(--ty-primary-color)]" /><h1 className="text-ty-xl font-semibold">目标端多余数据排查</h1><span className="text-ty-2xs min-h-6 px-2 inline-flex items-center rounded-ty-xs bg-[var(--ty-fill-color)] text-[var(--ty-font-sub-color)] border border-[var(--ty-border-color)]">Manticore → 源端反查</span>{example && <span className="text-ty-2xs min-h-6 px-2 inline-flex items-center rounded-ty-xs bg-[var(--ty-orange-lightest-color)] text-[var(--ty-orange-color)] border border-[var(--ty-orange-color)]/30">模拟结果</span>}</div>
          <p className="text-ty-xs text-[var(--ty-font-sub-color)] mt-1">按对象标识反查源端存在性，在证据完整后确认多余数据。</p>
        </div>
        <button onClick={() => { setExample(!example); setSelected(null); setFilter('ALL'); setPage(1); }} className="h-8 px-3 border border-[var(--ty-border-color)] rounded-ty-sm text-ty-xs hover:bg-[var(--ty-fill-weak-dark-color)]">{example ? '查看实际接入状态' : '查看模拟结果'}</button>
      </header>

      <div className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-4 flex flex-wrap items-end gap-3">
        <label className="text-ty-xs text-[var(--ty-font-sub-color)] space-y-1"><span className="block">对象类型</span><select aria-label="排查对象类型" value={root} onChange={(event) => { setRoot(event.target.value); setSelected(null); setFilter('ALL'); setPage(1); }} className="h-8 min-w-40 px-3 border border-[var(--ty-border-color)] rounded-ty-sm bg-[var(--ty-fill-white-color)] text-[var(--ty-font-main-color)]">{roots.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        {example && <label className="text-ty-xs text-[var(--ty-font-sub-color)] space-y-1"><span className="block">示例场景</span><select aria-label="排查示例场景" value={scenario} onChange={(event) => { setScenario(event.target.value); setSelected(null); }} className="h-8 min-w-52 px-3 border border-[var(--ty-border-color)] rounded-ty-sm bg-[var(--ty-fill-white-color)] text-[var(--ty-font-main-color)]"><option value="COMPLETE">完整查询：确认多余</option><option value="INCOMPLETE">源端查询不完整</option><option value="FORBIDDEN">源端权限不足</option><option value="ERROR">源端读取失败</option></select></label>}
        <button disabled={!example} title={example ? '按当前模拟场景刷新结果' : '源端与目标端存在性查询未接入'} onClick={() => { setSelected(null); setFilter('ALL'); setPage(1); }} className="h-8 px-3 rounded-ty-sm text-ty-xs bg-[var(--ty-primary-color)] text-[var(--ty-font-white-color)] disabled:bg-[var(--ty-primary-lighter-color)] disabled:text-[var(--ty-font-sub-light-color)] disabled:cursor-not-allowed inline-flex items-center gap-2"><Search className="w-3.5 h-3.5" />{example ? '刷新模拟结果' : '开始排查'}</button>
        <span className="text-ty-xs text-[var(--ty-font-sub-color)]">{example ? '当前内容仅用于方案评审和截图展示' : '实际查询能力待接入'}</span>
      </div>

      <div className="bg-[var(--ty-fill-weak-dark-color)] border border-[var(--ty-border-color)] rounded-ty-sm px-4 py-3 text-ty-xs flex items-start gap-2"><Info className="w-4 h-4 text-[var(--ty-primary-color)] shrink-0 mt-0.5" /><p><strong>目标数量更多只是排查线索。</strong><span className="text-[var(--ty-font-sub-color)] ml-1">同根类型、同范围、完整且有权限的源端查询未找到对象后，才可确认多余。</span></p></div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">{[
        ['已检查目标对象', snapshot ? results.length : undefined], ['确认多余', snapshot ? results.filter((row) => row.status === 'EXTRA').length : undefined], ['待确认 / 读取异常', snapshot ? results.filter((row) => row.status === 'UNKNOWN').length : undefined], ['源端存在', snapshot ? results.filter((row) => row.status === 'PRESENT').length : undefined],
      ].map(([label, count]) => <div key={String(label)} className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-4"><span className="text-ty-xs text-[var(--ty-font-sub-color)] block">{label}</span><strong className="text-ty-xl mt-1 block">{count ?? '待获取'}</strong></div>)}</div>

      <section className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--ty-border-color)] flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-ty-sm font-semibold">排查明细</h2><p className="text-ty-xs text-[var(--ty-font-sub-color)] mt-1">{snapshot ? `快照 ${snapshot.snapshotId} · ${snapshot.capturedAt}` : '存在性查询未接入，暂无可确认结果。'}</p></div><label className="text-ty-xs text-[var(--ty-font-sub-color)] space-y-1"><span className="block">排查结果</span><select aria-label="排查结果" value={filter} onChange={(event) => { setFilter(event.target.value); setSelected(null); setPage(1); }} className="h-8 min-w-40 px-3 border border-[var(--ty-border-color)] rounded-ty-sm bg-[var(--ty-fill-white-color)] text-[var(--ty-font-main-color)]"><option value="ALL">全部</option><option value="EXTRA">确认多余</option><option value="UNKNOWN">待确认 / 读取异常</option><option value="PRESENT">源端存在</option></select></label></div>
        {visible.length ? <div className="overflow-x-auto"><table className="ty-data-table w-full min-w-[900px] text-left text-ty-xs border-collapse"><thead><tr className="bg-[var(--ty-fill-color)] text-[var(--ty-font-sub-color)]"><th className="w-12 px-2 py-2 text-center font-medium">序号</th><th className="px-4 py-2 font-medium">目标对象标识</th><th className="px-4 py-2 font-medium">目标记录 ID</th><th className="px-4 py-2 font-medium">源端查询</th><th className="px-4 py-2 font-medium">结论</th><th className="px-4 py-2 font-medium">操作</th></tr></thead><tbody>{pageRows.map((row, index) => <tr key={row.targetId} className="border-t border-[var(--ty-border-light-color)]"><td className="w-12 px-2 py-3 text-center text-[var(--ty-font-sub-color)]">{(currentPage - 1) * pageSize + index + 1}</td><td className="px-4 py-3 font-mono">{row.objectId}</td><td className="px-4 py-3 font-mono">{row.targetId}</td><td className="px-4 py-3">{{ FOUND: '已找到', NOT_FOUND: '未找到', FORBIDDEN: '权限不足', ERROR: '读取失败' }[row.sourceResult]}</td><td className="px-4 py-3"><span className={`inline-flex min-h-6 px-2 items-center rounded-ty-xs border ${badge(row.status)}`}>{row.label}</span></td><td className="px-4 py-3"><button className="text-[var(--ty-primary-color)]" onClick={() => setSelected(row.targetId)}>查看依据</button></td></tr>)}</tbody></table></div> : <div className="p-10 text-center text-ty-xs text-[var(--ty-font-sub-color)]">{snapshot ? '暂无数据' : '等待接入源端与目标端存在性查询'}</div>}
        <TablePagination total={visible.length} page={currentPage} pageSize={pageSize} itemLabel="条" onPageChange={(nextPage) => { setPage(nextPage); setSelected(null); }} onPageSizeChange={(size) => { setPageSize(size); setPage(1); setSelected(null); }} />
        {detail && <div className="m-4 p-4 bg-[var(--ty-fill-weak-dark-color)] border border-[var(--ty-border-color)] rounded-ty-sm text-ty-xs space-y-2"><div className="flex items-center justify-between"><h3 className="font-semibold">{detail.objectId} · 排查依据</h3><button className="text-[var(--ty-primary-color)]" onClick={() => setSelected(null)}>收起</button></div><p>{detail.reason}</p><p className="text-[var(--ty-font-sub-color)]">{detail.note || '继续核查唯一标识、查询范围和同步时点。'}</p><ol className="list-decimal pl-5 space-y-1"><li>确认源端对象是否删除、失效或移出同步范围。</li><li>分别检查中间表写入日志和 Manticore 同步记录。</li><li>源端完成处理后，重新同步并发起一致性核验。</li></ol>{!example && <button className="text-[var(--ty-primary-color)]" onClick={() => onSync(root)}>查看该类型同步记录</button>}</div>}
      </section>
    </div>
  );
}
