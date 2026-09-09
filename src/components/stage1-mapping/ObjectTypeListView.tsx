import { useMemo, useState } from 'react';
import { AlertTriangle, Clock3, Database, Eye, FileSpreadsheet, Layers, PauseCircle, PlayCircle, Search, Settings2 } from 'lucide-react';
import { MappingObjectType, SourceSystemInfo, formatRootTypeDisplayName } from '../../stage1MappingTypes';
import { ExecutionSchedule, scheduleLabel } from '../../data/operations';
import { FloatingMoreMenu } from './FloatingMoreMenu';

interface ObjectTypeListViewProps {
  sourceSystems: SourceSystemInfo[];
  mappingObjects: MappingObjectType[];
  schedules: ExecutionSchedule[];
  onSelectRootType: (rootTypeId: string) => void;
  onOpenQueryPreview: (rootTypeId: string) => void;
  onToggleAccess: (rootTypeId: string) => void;
  onConfigurePolling: (rootTypeId: string) => void;
  onResetAccess: (rootTypeId: string) => void;
  onNavigateToSyncQuality: () => void;
  hasPermission?: boolean;
}

export const ObjectTypeListView = ({ sourceSystems, mappingObjects, schedules, onSelectRootType, onOpenQueryPreview, onToggleAccess, onConfigurePolling, onResetAccess, onNavigateToSyncQuality, hasPermission = true }: ObjectTypeListViewProps) => {
  const [source, setSource] = useState('ALL');
  const [keyword, setKeyword] = useState('');
  const rows = useMemo(() => mappingObjects.filter((root) => {
    if (source !== 'ALL' && root.sourceSystemId !== source) return false;
    const term = keyword.trim().toLowerCase();
    return !term || [root.name, root.code, root.description].some((value) => value.toLowerCase().includes(term));
  }), [mappingObjects, source, keyword]);
  const enabled = mappingObjects.filter((root) => root.accessEnabled).length;
  const configured = mappingObjects.reduce((sum, root) => sum + root.configuredFieldCount, 0);
  const drafts = mappingObjects.reduce((sum, root) => sum + root.draftFieldCount, 0);

  return <div className="space-y-4">
    <section className="grid grid-cols-2 xl:grid-cols-4 gap-3">{[
      ['对象类型', mappingObjects.length, '按根类型独立接入'],
      ['已启用', enabled, '停用后不再轮询'],
      ['已配置字段', configured, '当前生效字段'],
      ['待发布草稿', drafts, '新增与草稿修改'],
    ].map(([label, value, note]) => <div key={String(label)} className="bg-white border border-[var(--ty-border-color)] rounded-ty-sm p-4"><span className="text-ty-xs text-[var(--ty-font-sub-color)]">{label}</span><strong className="block text-ty-xl font-mono mt-1">{value}</strong><span className="block text-ty-2xs text-[var(--ty-font-sub-color)] mt-1">{note}</span></div>)}</section>
    <section className="bg-white border border-[var(--ty-border-color)] rounded-ty-sm p-3 flex flex-wrap items-center gap-3"><label className="text-ty-xs text-[var(--ty-font-sub-color)] flex items-center gap-2">来源系统<select value={source} onChange={(e) => setSource(e.target.value)} className="h-8 min-w-48 px-3 bg-white border border-[var(--ty-border-color)] rounded-ty-sm"><option value="ALL">全部来源系统</option>{sourceSystems.map((system) => <option key={system.id} value={system.id}>{system.name}</option>)}</select></label><label className="relative flex-1 min-w-60"><Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[var(--ty-font-sub-color)]" /><input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="搜索对象类型" aria-label="搜索对象类型" className="h-8 w-full pl-8 pr-3 border border-[var(--ty-border-color)] rounded-ty-sm" /></label><span className="text-ty-xs text-[var(--ty-font-sub-color)]">共 {rows.length} 个类型</span></section>
    <section className="bg-white border border-[var(--ty-border-color)] rounded-ty-sm overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[1120px] text-ty-xs"><thead className="bg-[var(--ty-fill-weak-dark-color)] text-[var(--ty-font-sub-color)]"><tr><th className="px-3 py-2 text-left">对象类型</th><th className="px-3 py-2 text-left">来源系统</th><th className="px-3 py-2 text-left">接入状态</th><th className="px-3 py-2 text-left">中间表检查频率</th><th className="px-3 py-2 text-center">已配置 / 草稿</th><th className="px-3 py-2 text-left">配置状态</th><th className="px-3 py-2 text-left">最近处理</th><th className="px-3 py-2 text-center">操作</th></tr></thead><tbody className="divide-y divide-[var(--ty-border-light-color)]">{rows.map((root) => <tr key={root.id} className="hover:bg-[var(--ty-fill-weak-dark-color)]/50"><td className="px-3 py-3"><div className="flex gap-2"><Layers className="w-4 h-4 mt-0.5 text-[var(--ty-primary-color)]" /><div><strong>{formatRootTypeDisplayName(root.name, root.code)}</strong><span className="block mt-1 text-[var(--ty-font-sub-color)]">{root.description}</span></div></div></td><td className="px-3 py-3"><span className="inline-flex min-h-6 px-2 items-center rounded-ty-xs bg-[var(--ty-fill-color)] border border-[var(--ty-border-color)]"><Database className="w-3 h-3 mr-1" />{root.sourceSystemName}</span></td><td className="px-3 py-3"><span className={`inline-flex min-h-6 px-2 items-center rounded-ty-xs border font-medium ${root.accessEnabled ? 'bg-[var(--ty-green-lightest-color)] text-[var(--ty-green-color)] border-[var(--ty-green-color)]/30' : 'bg-[var(--ty-fill-weak-dark-color)] text-[var(--ty-font-sub-color)] border-[var(--ty-border-color)]'}`}>{root.accessEnabled ? <PlayCircle className="w-3.5 h-3.5 mr-1" /> : <PauseCircle className="w-3.5 h-3.5 mr-1" />}{root.accessEnabled ? '已启用' : '已停用'}</span><span className="block mt-1 text-ty-2xs text-[var(--ty-font-sub-color)]">{root.serviceStarted ? '同步服务已接入' : '首次发布后接入服务'}</span></td><td className="px-3 py-3"><strong>{root.accessEnabled ? scheduleLabel(schedules.find((item) => item.rootTypeCode === root.id), root.pollingIntervalMinutes) : '不轮询'}</strong><button className="block mt-1 text-[var(--ty-primary-color)]" onClick={() => onConfigurePolling(root.id)}>设置频率</button></td><td className="px-3 py-3 text-center"><strong className="font-mono">{root.configuredFieldCount}</strong><span className="text-[var(--ty-border-color)] mx-2">/</span><strong className="font-mono text-[var(--ty-orange-color)]">{root.draftFieldCount}</strong></td><td className="px-3 py-3"><span className="inline-flex min-h-6 px-2 items-center rounded-ty-xs bg-[var(--ty-fill-color)] border border-[var(--ty-border-color)]">{root.configStatus === 'CONFIGURED' ? '已配置' : root.configStatus === 'CONFIGURED_WITH_DRAFT' ? '已配置（有草稿）' : root.configStatus === 'DRAFTING' ? '草稿中' : '未配置'}</span>{root.serviceStarted && <span className="block mt-1 text-ty-2xs text-[var(--ty-font-sub-color)]">字段类型与唯一键已锁定</span>}</td><td className="px-3 py-3"><strong>{root.lastSyncedAt || '—'}</strong><button className="block mt-1 text-[var(--ty-primary-color)]" onClick={onNavigateToSyncQuality}>查看同步队列</button></td><td className="px-3 py-3"><div className="flex items-center justify-center gap-1"><button onClick={() => onSelectRootType(root.id)} className="h-8 px-2 inline-flex items-center gap-1 rounded-ty-sm bg-[var(--ty-primary-lighter-color)] text-[var(--ty-primary-color)]"><Settings2 className="w-3.5 h-3.5" />配置字段</button><button onClick={() => onToggleAccess(root.id)} disabled={!hasPermission || !root.serviceStarted} title={!root.serviceStarted ? '请先发布配置并接入同步服务' : root.accessEnabled ? '停用后该类型不再轮询中间表' : '启用后恢复轮询中间表'} className="h-8 px-2 inline-flex items-center gap-1 rounded-ty-sm border border-[var(--ty-border-color)] disabled:opacity-40">{root.accessEnabled ? <PauseCircle className="w-3.5 h-3.5" /> : <PlayCircle className="w-3.5 h-3.5" />}{root.accessEnabled ? '停用' : '启用'}</button><button onClick={() => onOpenQueryPreview(root.id)} className="w-8 h-8 inline-flex items-center justify-center rounded-ty-sm border border-[var(--ty-border-color)]" title="查询预览"><Eye className="w-3.5 h-3.5" /></button><FloatingMoreMenu items={[{ id: `reset-${root.id}`, label: '重置接入', description: '清空正式查询数据并转为草稿', icon: <AlertTriangle className="w-3.5 h-3.5 text-[var(--ty-red-color)]" />, danger: true, disabled: !hasPermission, onClick: () => onResetAccess(root.id) }]} /></div></td></tr>)}</tbody></table></div>{!rows.length && <div className="p-12 text-center text-[var(--ty-font-sub-color)]"><FileSpreadsheet className="w-8 h-8 mx-auto mb-2" />未找到匹配的对象类型</div>}</section>
  </div>;
};
