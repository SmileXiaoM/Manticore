import React, { useState } from 'react';
import {
  X,
  Search,
  CheckCircle2,
  AlertTriangle,
  Send,
  RefreshCw,
  Eye,
  Info,
  Layers,
  ArrowRight,
  Shield,
  FileSpreadsheet
} from 'lucide-react';
import {
  FieldMappingItem,
  MappingObjectType,
  MappingSoftType,
  PublishImpactSummary,
  Stage1PreviewRecord
} from '../../stage1MappingTypes';

// ==================== 1. 发布配置影响确认弹窗 ====================
interface PublishConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRootType: MappingObjectType;
  currentSoftType: MappingSoftType;
  fields: FieldMappingItem[];
  onConfirmPublish: () => void;
}

export const PublishConfigModal: React.FC<PublishConfigModalProps> = ({
  isOpen,
  onClose,
  currentRootType,
  currentSoftType,
  fields,
  onConfirmPublish
}) => {
  if (!isOpen) return null;

  const currentFields = fields.filter(
    f => f.rootTypeId === currentRootType.id && f.softTypeId === currentSoftType.id
  );

  const draftOnlyFields = currentFields.filter(f => f.configStatus === 'DRAFT');
  const modifiedDraftFields = currentFields.filter(
    f => f.configStatus === 'ACTIVE' && f.hasDraftModification
  );

  const totalDraftCount = draftOnlyFields.length + modifiedDraftFields.length;
  // 数据影响变更：新增字段或修改了类型/查询能力
  const dataImpactingCount =
    draftOnlyFields.filter(f => f.isDataImpactingChange).length +
    modifiedDraftFields.filter(f => f.isDataImpactingChange).length;
  const displayOnlyCount = totalDraftCount - dataImpactingCount;

  // 下一个生效版本计算
  const currentVer = currentSoftType.activeConfigVersion || 'v1.0.0';
  const majorMinor = currentVer.replace('v', '').split('.');
  const nextVer = `v${majorMinor[0]}.${Number(majorMinor[1] || 0) + 1}.0`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150 space-y-4">
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">发布配置生效确认</h3>
              <p className="text-xs text-slate-500">
                将草稿配置升级为当前软类型的正式生效配置版本
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 影响摘要卡片 */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2.5 text-xs">
          <div className="flex justify-between items-center text-slate-600">
            <span>目标软类型：</span>
            <span className="font-bold text-slate-900">
              {currentRootType.name} / {currentSoftType.name}
            </span>
          </div>
          <div className="flex justify-between items-center text-slate-600">
            <span>版本变更：</span>
            <span className="font-mono text-slate-800">
              {currentVer} <span className="text-slate-400">→</span>{' '}
              <strong className="text-emerald-700">{nextVer}</strong>
            </span>
          </div>

          <div className="border-t border-slate-200 pt-2 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-slate-600">待生效草稿总数：</span>
              <span className="font-bold text-slate-900 font-mono">{totalDraftCount} 项</span>
            </div>
            <div className="flex justify-between items-center text-slate-500 text-[11px] pl-2">
              <span>- 全新新增草稿字段：</span>
              <span className="font-mono">{draftOnlyFields.length}</span>
            </div>
            <div className="flex justify-between items-center text-slate-500 text-[11px] pl-2">
              <span>- 既有生效字段草稿微调：</span>
              <span className="font-mono">{modifiedDraftFields.length}</span>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-2 grid grid-cols-2 gap-2 text-[11px]">
            <div className="bg-amber-50 p-2 rounded border border-amber-200 text-amber-900">
              <div className="font-bold text-amber-800">数据影响变更: {dataImpactingCount}</div>
              <div>发布后需执行数据同步</div>
            </div>
            <div className="bg-emerald-50 p-2 rounded border border-emerald-200 text-emerald-900">
              <div className="font-bold text-emerald-800">纯展示变更: {displayOnlyCount}</div>
              <div>发布后即刻生效，无需同步</div>
            </div>
          </div>
        </div>

        {/* 关键业务说明 */}
        <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-800 flex items-start space-x-2">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold">发布操作不会自动触发数据同步</p>
            <p className="text-[11px] text-blue-700 leading-relaxed">
              发布仅使配置元数据生效并标记为「待同步」。正式查询将继续使用上一成功版本，直至您手动执行数据同步成功。
            </p>
          </div>
        </div>

        <div className="flex justify-end space-x-2.5 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            取消
          </button>
          <button
            onClick={onConfirmPublish}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold shadow-xs flex items-center space-x-1.5 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>确认发布生效 ({nextVer})</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// ==================== 2. 手工发起数据同步模态框 ====================
interface TriggerSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRootType: MappingObjectType;
  currentSoftType: MappingSoftType;
  onConfirmSync: () => void;
  onNavigateToSyncQuality: (batchId?: string) => void;
}

export const TriggerSyncModal: React.FC<TriggerSyncModalProps> = ({
  isOpen,
  onClose,
  currentRootType,
  currentSoftType,
  onConfirmSync,
  onNavigateToSyncQuality
}) => {
  if (!isOpen) return null;

  const [syncScope, setSyncScope] = useState<'INCREMENTAL' | 'FULL'>('INCREMENTAL');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150 space-y-4">
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <div className="bg-amber-100 p-2 rounded-lg text-amber-600">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">发起数据同步 (对象级整体作用域)</h3>
              <p className="text-xs text-slate-500">
                读取当前已生效的字段映射配置，执行从 PLM 来源库至 Manticore 检索库的数据同步
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 作用域与配置信息卡片 */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2.5 text-xs">
          <div className="flex justify-between items-center text-slate-600">
            <span>同步目标作用域：</span>
            <span className="font-bold text-slate-900">
              {currentRootType.name} / {currentSoftType.name} (整体对象)
            </span>
          </div>
          <div className="flex justify-between items-center text-slate-600">
            <span>读取生效配置版本：</span>
            <span className="font-mono font-bold text-emerald-700">
              {currentSoftType.activeConfigVersion}
            </span>
          </div>

          <div className="border-t border-slate-200 pt-2 space-y-2">
            <label className="block text-slate-700 font-semibold">选择同步策略：</label>
            <div className="space-y-2">
              <label className="flex items-start space-x-2 p-2 rounded border border-slate-200 bg-white cursor-pointer hover:border-blue-400 transition-colors">
                <input
                  type="radio"
                  name="syncScope"
                  checked={syncScope === 'INCREMENTAL'}
                  onChange={() => setSyncScope('INCREMENTAL')}
                  className="mt-0.5 text-blue-600"
                />
                <div>
                  <div className="font-semibold text-slate-800">增量同步 (基于水位戳)</div>
                  <div className="text-[11px] text-slate-400">仅同步最近变更及待生效字段，耗时短</div>
                </div>
              </label>

              <label className="flex items-start space-x-2 p-2 rounded border border-slate-200 bg-white cursor-pointer hover:border-blue-400 transition-colors">
                <input
                  type="radio"
                  name="syncScope"
                  checked={syncScope === 'FULL'}
                  onChange={() => setSyncScope('FULL')}
                  className="mt-0.5 text-blue-600"
                />
                <div>
                  <div className="font-semibold text-slate-800">全量重建索引 (深度刷新)</div>
                  <div className="text-[11px] text-slate-400">对当前软类型所有历史物料全量刷新 Manticore 索引</div>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-2.5 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            取消
          </button>
          <button
            onClick={onConfirmSync}
            className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-semibold shadow-xs flex items-center space-x-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>确认发起同步</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// ==================== 3. 一阶段正式查询预览弹窗 (按 5.2 规则) ====================
interface Stage1QueryPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRootType: MappingObjectType;
  currentSoftType: MappingSoftType;
  fields: FieldMappingItem[];
  previewRecords: Stage1PreviewRecord[];
}

export const Stage1QueryPreviewModal: React.FC<Stage1QueryPreviewModalProps> = ({
  isOpen,
  onClose,
  currentRootType,
  currentSoftType,
  fields,
  previewRecords
}) => {
  if (!isOpen) return null;

  // 1. 严格过滤：仅取当前已生效且已同步的字段 (草稿与待同步字段绝不进入正式查询)
  const activeEffectiveFields = fields.filter(
    f =>
      f.rootTypeId === currentRootType.id &&
      f.softTypeId === currentSoftType.id &&
      f.configStatus === 'ACTIVE' &&
      f.dataStatus !== 'PENDING_SYNC' &&
      f.isDisplayInResult
  );

  // 待同步字段
  const pendingSyncFields = fields.filter(
    f =>
      f.rootTypeId === currentRootType.id &&
      f.softTypeId === currentSoftType.id &&
      f.configStatus === 'ACTIVE' &&
      f.dataStatus === 'PENDING_SYNC'
  );

  // 草稿字段
  const draftFields = fields.filter(
    f =>
      f.rootTypeId === currentRootType.id &&
      f.softTypeId === currentSoftType.id &&
      f.configStatus === 'DRAFT'
  );

  const [searchKeyword, setSearchKeyword] = useState('');

  const filteredData = previewRecords.filter(rec => {
    if (!searchKeyword.trim()) return true;
    const kw = searchKeyword.toLowerCase();
    return (
      (rec.partNumber && rec.partNumber.toLowerCase().includes(kw)) ||
      (rec.partName && rec.partName.toLowerCase().includes(kw)) ||
      (rec.material && rec.material.toLowerCase().includes(kw)) ||
      (rec.technicalDescription && rec.technicalDescription.toLowerCase().includes(kw))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-6xl w-full flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="space-y-0.5">
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center">
                <Eye className="w-4 h-4 mr-1.5 text-blue-600" />
                一阶段：Manticore 正式查询预览
              </h3>
              <span className="px-2 py-0.5 text-[11px] font-mono font-semibold rounded bg-blue-100 text-blue-800">
                {currentRootType.name} / {currentSoftType.name}
              </span>
              <span className="px-2 py-0.5 text-[11px] font-mono font-bold rounded bg-emerald-100 text-emerald-800">
                可查询版本: {currentSoftType.activeQueryVersion}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              只读当前已成功同步的生效版本数据。草稿及已发布但待同步的字段不进入本次正式查询条件与结果列。
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 状态与版本中性说明条 */}
        <div className="px-6 py-2.5 bg-blue-50/70 border-b border-blue-100 text-xs flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center space-x-2 text-blue-900">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              当前检索使用生效版本 <strong>{currentSoftType.activeQueryVersion}</strong> 的 Manticore 物理索引。
            </span>
          </div>

          {(pendingSyncFields.length > 0 || draftFields.length > 0) && (
            <div className="text-[11px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              {pendingSyncFields.length > 0 && (
                <span>
                  有 {pendingSyncFields.length} 个字段处于「待同步」状态（
                  {pendingSyncFields.map(f => f.displayTitle).join(', ')}），未进入本次查询。
                </span>
              )}
              {draftFields.length > 0 && (
                <span className="ml-1">草稿字段 ({draftFields.length} 个) 已自动隔离。</span>
              )}
            </div>
          )}
        </div>

        {/* 模拟查询条件工具条 */}
        <div className="px-6 py-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-2 text-xs flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="模拟全文检索或物料编码/名称关键词..."
                value={searchKeyword}
                onChange={e => setSearchKeyword(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:border-blue-500"
              />
            </div>
          </div>

          <div className="text-xs text-slate-500">
            命中 <span className="font-bold text-slate-900">{filteredData.length}</span> 条结果
          </div>
        </div>

        {/* 查询结果表格 */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold sticky top-0 z-10">
              <tr>
                {activeEffectiveFields.map(f => (
                  <th
                    key={f.id}
                    className="py-2.5 px-3 whitespace-nowrap"
                    style={{ width: f.defaultColumnWidth ? `${f.defaultColumnWidth}px` : 'auto' }}
                  >
                    {f.displayTitle}
                    <span className="text-[10px] font-mono text-slate-400 block font-normal">
                      {f.manticoreField}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredData.length > 0 ? (
                filteredData.map(row => (
                  <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                    {activeEffectiveFields.map(f => {
                      let cellVal = '-';
                      if (f.manticoreField === 'part_number') cellVal = row.partNumber;
                      else if (f.manticoreField === 'part_name') cellVal = row.partName;
                      else if (f.manticoreField === 'material') cellVal = row.material || '-';
                      else if (f.manticoreField.includes('nominal_diameter'))
                        cellVal = row.nominalDiameter ? `${row.nominalDiameter} mm` : '-';
                      else if (f.manticoreField === 'category_path')
                        cellVal = row.categoryPath || '-';
                      else if (f.manticoreField.includes('voltage'))
                        cellVal = row.ratedVoltage ? `${row.ratedVoltage} V` : '-';
                      else if (f.manticoreField.includes('capacitance'))
                        cellVal = row.capacitance ? `${row.capacitance} uF` : '-';
                      else cellVal = row[f.sourceFieldName] || '-';

                      return (
                        <td key={f.id} className="py-2.5 px-3">
                          {f.displayType === 'LINK' ? (
                            <a
                              href={`https://plm.internal.corp/view?part=${row.partNumber}`}
                              target="_blank"
                              rel="noreferrer"
                              className="font-mono font-bold text-blue-600 hover:underline"
                            >
                              {cellVal}
                            </a>
                          ) : (
                            <span className="font-mono text-slate-800">{cellVal}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={activeEffectiveFields.length || 1} className="py-12 text-center text-slate-400">
                    未查找到相关物料数据
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 底部关闭栏 */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs font-semibold shadow-xs cursor-pointer"
          >
            关闭预览
          </button>
        </div>
      </div>
    </div>
  );
};
