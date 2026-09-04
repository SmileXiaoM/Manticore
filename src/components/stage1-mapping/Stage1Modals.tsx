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
  FileSpreadsheet,
  Link,
  Clock,
  RotateCcw,
  Database
} from 'lucide-react';
import {
  FieldMappingItem,
  MappingObjectType,
  Stage1PreviewRecord,
  formatRootTypeDisplayName
} from '../../stage1MappingTypes';

// ==================== 1. 生效配置影响确认弹窗 (无配置版本，草稿生效) ====================
interface PublishConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRootType: MappingObjectType;
  fields: FieldMappingItem[];
  onConfirmPublish: () => void;
}

export const PublishConfigModal: React.FC<PublishConfigModalProps> = ({
  isOpen,
  onClose,
  currentRootType,
  fields,
  onConfirmPublish
}) => {
  const currentFields = fields.filter(f => f.rootTypeId === currentRootType.id);

  const draftOnlyFields = currentFields.filter(f => f.configStatus === 'DRAFT');
  const modifiedDraftFields = currentFields.filter(
    f => f.configStatus === 'CONFIGURED' && f.hasDraftModification
  );

  const totalDraftCount = draftOnlyFields.length + modifiedDraftFields.length;
  // 数据影响变更：新增字段或修改了底层物理字段/类型/查询能力
  const dataImpactingCount =
    draftOnlyFields.filter(f => f.isDataImpactingChange).length +
    modifiedDraftFields.filter(f => f.isDataImpactingChange).length;
  const displayOnlyCount = totalDraftCount - dataImpactingCount;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-[8px] shadow-xl border border-slate-200 max-w-lg w-full p-5 animate-in fade-in zoom-in-95 duration-150 space-y-4">
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="bg-emerald-50 p-2 rounded-[6px] text-emerald-600 border border-emerald-200">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">生效配置确认</h3>
              <p className="text-xs text-slate-500">
                将草稿配置项正式生效为当前根类型的配置
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-[4px] hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 影响摘要卡片 */}
        <div className="bg-slate-50 border border-slate-200 rounded-[6px] p-3.5 space-y-2.5 text-xs">
          <div className="flex justify-between items-center text-slate-600">
            <span>目标根类型：</span>
            <span className="font-bold text-slate-900">
              {formatRootTypeDisplayName(currentRootType.name, currentRootType.code)}
            </span>
          </div>

          <div className="border-t border-slate-200 pt-2 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-slate-600">待生效草稿总数：</span>
              <span className="font-bold text-slate-900 font-mono">{totalDraftCount} 项</span>
            </div>
            <div className="flex justify-between items-center text-slate-500 text-[11px] pl-2">
              <span>- 全新新增草稿字段：</span>
              <span className="font-mono font-semibold">{draftOnlyFields.length} 项</span>
            </div>
            <div className="flex justify-between items-center text-slate-500 text-[11px] pl-2">
              <span>- 既有已配置字段草稿修改：</span>
              <span className="font-mono font-semibold">{modifiedDraftFields.length} 项</span>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-2 grid grid-cols-2 gap-2 text-[11px]">
            <div className="bg-amber-50 p-2.5 rounded-[6px] border border-amber-200 text-amber-900">
              <div className="font-bold text-amber-800">数据影响变更: {dataImpactingCount} 项</div>
              <div className="text-[10px] text-amber-700 mt-0.5">
                {dataImpactingCount > 0 ? '生效后根类型转为「待同步」' : '无数据底层变更'}
              </div>
            </div>
            <div className="bg-emerald-50 p-2.5 rounded-[6px] border border-emerald-200 text-emerald-900">
              <div className="font-bold text-emerald-800">纯展示变更: {displayOnlyCount} 项</div>
              <div className="text-[10px] text-emerald-700 mt-0.5">即刻生效，无需同步</div>
            </div>
          </div>
        </div>

        {/* 权威生命周期说明 */}
        <div className="bg-blue-50 border border-blue-200 rounded-[6px] p-3 text-xs text-blue-800 flex items-start space-x-2">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold">生效操作不生成配置版本，不会自动触发数据同步</p>
            <p className="text-[11px] text-blue-700 leading-relaxed">
              {dataImpactingCount > 0
                ? '本次包含数据影响变更，生效后标记根类型为「待同步」。正式查询将继续使用当前正式底座数据，直至触发数据同步执行成功。'
                : '本次仅包含纯展示名称或样式变更，生效后即刻生效，无需执行数据同步。'}
            </p>
          </div>
        </div>

        <div className="flex justify-end space-x-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-4 border border-slate-300 rounded-[6px] text-xs font-medium text-slate-700 hover:bg-slate-50 bg-white cursor-pointer transition-colors shadow-2xs"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirmPublish}
            className="h-8 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[6px] text-xs font-medium shadow-2xs flex items-center space-x-1.5 cursor-pointer transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span>确认生效配置 ({totalDraftCount} 项)</span>
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
  onConfirmSync: (syncScope: 'INCREMENTAL' | 'FULL') => void;
  onNavigateToSyncQuality: (batchId?: string) => void;
}

export const TriggerSyncModal: React.FC<TriggerSyncModalProps> = ({
  isOpen,
  onClose,
  currentRootType,
  onConfirmSync,
  onNavigateToSyncQuality
}) => {
  const [syncScope, setSyncScope] = useState<'INCREMENTAL' | 'FULL'>('INCREMENTAL');

  if (!isOpen) return null;

  const isFailedRetry = currentRootType.syncStatus === 'FAILED' || currentRootType.syncStatus === 'COMPLETED_WITH_ERRORS';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-[8px] shadow-xl border border-slate-200 max-w-lg w-full p-5 animate-in fade-in zoom-in-95 duration-150 space-y-4">
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className={`p-2 rounded-[6px] border ${isFailedRetry ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>
              {isFailedRetry ? <RotateCcw className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {isFailedRetry ? '重试数据同步 (以根类型为权威实体)' : '发起数据同步 (根类型权威实体)'}
              </h3>
              <p className="text-xs text-slate-500">
                按当前已生效的字段映射配置，执行 PLM 来源库至 Manticore 检索底座的数据同步
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-[4px] hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 异常提示 (如果处于异常或失败状态) */}
        {isFailedRetry && currentRootType.syncErrorRecords && currentRootType.syncErrorRecords.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-[6px] p-3 text-xs text-amber-900 space-y-1.5">
            <div className="font-bold flex items-center">
              <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-700" />
              上一批次同步有 {currentRootType.syncErrorRecords.length} 条异常记录 (未中断整体任务):
            </div>
            <div className="max-h-24 overflow-y-auto space-y-1 text-[11px] font-mono text-amber-800 bg-white/80 p-1.5 rounded-[4px] border border-amber-200">
              {currentRootType.syncErrorRecords.map(err => (
                <div key={err.id}>• [{err.recordBusinessKey}] {err.fieldDisplayName || err.fieldKey}: {err.errorMessage}</div>
              ))}
            </div>
          </div>
        )}

        {/* 作用域与配置信息卡片 */}
        <div className="bg-slate-50 border border-slate-200 rounded-[6px] p-3.5 space-y-2.5 text-xs">
          <div className="flex justify-between items-center text-slate-600">
            <span>同步目标根类型：</span>
            <span className="font-bold text-slate-900">
              {formatRootTypeDisplayName(currentRootType.name, currentRootType.code)}
            </span>
          </div>
          <div className="flex justify-between items-center text-slate-600">
            <span>已生效字段总数：</span>
            <span className="font-mono font-bold text-emerald-700">
              {currentRootType.configuredFieldCount} 个
            </span>
          </div>
          <div className="flex justify-between items-center text-slate-600">
            <span>正式底座可查字段：</span>
            <span className="font-mono font-bold text-blue-700">
              {currentRootType.formalQueryableFieldCount} 个
            </span>
          </div>

          <div className="border-t border-slate-200 pt-2 space-y-2">
            <label className="block text-slate-700 font-semibold">选择同步策略：</label>
            <div className="space-y-2">
              <label className="flex items-start space-x-2 p-2 rounded-[6px] border border-slate-200 bg-white cursor-pointer hover:border-blue-400 transition-colors">
                <input
                  type="radio"
                  name="syncScope"
                  checked={syncScope === 'INCREMENTAL'}
                  onChange={() => setSyncScope('INCREMENTAL')}
                  className="mt-0.5 text-blue-600"
                />
                <div>
                  <div className="font-semibold text-slate-800">增量同步 (基于水位戳)</div>
                  <div className="text-[11px] text-slate-500">
                    同步最近变更及待生效字段数据，单条数据异常不中止任务
                  </div>
                </div>
              </label>

              <label className="flex items-start space-x-2 p-2 rounded-[6px] border border-slate-200 bg-white cursor-pointer hover:border-blue-400 transition-colors">
                <input
                  type="radio"
                  name="syncScope"
                  checked={syncScope === 'FULL'}
                  onChange={() => setSyncScope('FULL')}
                  className="mt-0.5 text-blue-600"
                />
                <div>
                  <div className="font-semibold text-slate-800">全量重建索引 (深度刷新索引)</div>
                  <div className="text-[11px] text-slate-500">
                    对当前根类型历史数据全量重建 Manticore 底座索引并原子更新数据
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-4 border border-slate-300 rounded-[6px] text-xs font-medium text-slate-700 hover:bg-slate-50 bg-white cursor-pointer transition-colors shadow-2xs"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => onConfirmSync(syncScope)}
            className="h-8 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-[6px] text-xs font-medium shadow-2xs flex items-center space-x-1.5 cursor-pointer transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{isFailedRetry ? '重试发起同步' : '确认发起同步'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// ==================== 3. 一阶段正式查询预览弹窗 (仅展示已在正式底座的字段) ====================
interface Stage1QueryPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRootType: MappingObjectType;
  fields: FieldMappingItem[];
  previewRecords: Stage1PreviewRecord[];
}

export const Stage1QueryPreviewModal: React.FC<Stage1QueryPreviewModalProps> = ({
  isOpen,
  onClose,
  currentRootType,
  fields,
  previewRecords
}) => {
  const [searchKeyword, setSearchKeyword] = useState('');

  // 1. 严格过滤：仅取当前根类型下已进入正式底座可查的字段，并严格按顺序号 (displayOrder) 从小到大排列
  const formalQueryFields = fields
    .filter(
      f =>
        f.rootTypeId === currentRootType.id &&
        f.configStatus === 'CONFIGURED' &&
        f.isInFormalQueryBase &&
        f.isDisplayInResult
    )
    .sort((a, b) => {
      const orderA = a.displayOrder ?? a.defaultDisplayOrder ?? 999;
      const orderB = b.displayOrder ?? b.defaultDisplayOrder ?? 999;
      return orderA - orderB;
    });

  // 待进入底座字段 (待同步)
  const pendingSyncFields = fields.filter(
    f =>
      f.rootTypeId === currentRootType.id &&
      f.configStatus === 'CONFIGURED' &&
      !f.isInFormalQueryBase
  );

  // 草稿字段
  const draftFields = fields.filter(
    f => f.rootTypeId === currentRootType.id && f.configStatus === 'DRAFT'
  );

  const filteredData = (previewRecords || []).filter(rec => {
    if (!searchKeyword.trim()) return true;
    const kw = searchKeyword.toLowerCase();
    return (
      (rec.partNumber && rec.partNumber.toLowerCase().includes(kw)) ||
      (rec.partName && rec.partName.toLowerCase().includes(kw)) ||
      (rec.material && rec.material.toLowerCase().includes(kw)) ||
      (rec.fastenerCode && rec.fastenerCode.toLowerCase().includes(kw)) ||
      (rec.docNumber && rec.docNumber.toLowerCase().includes(kw)) ||
      (rec.drawingNo && rec.drawingNo.toLowerCase().includes(kw)) ||
      (rec.technicalDescription && rec.technicalDescription.toLowerCase().includes(kw))
    );
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-[8px] shadow-xl border border-slate-200 max-w-6xl w-full flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="space-y-0.5">
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center">
                <Eye className="w-4 h-4 mr-1.5 text-blue-600" />
                正式查询底座数据预览
              </h3>
              <span className="px-2 py-0.5 text-[11px] font-mono font-medium rounded-[4px] bg-slate-100 text-slate-800 border border-slate-200">
                {formatRootTypeDisplayName(currentRootType.name, currentRootType.code)}
              </span>
              <span className="px-2 py-0.5 text-[11px] font-mono font-semibold rounded-[4px] bg-emerald-50 text-emerald-800 border border-emerald-200">
                底座可查字段: {formalQueryFields.length} 个
              </span>
            </div>
            <p className="text-xs text-slate-500">
              只读当前已成功同步的正式查询底座数据。草稿及已生效但待同步的字段不进入本次正式查询条件与结果列。
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-[4px] hover:bg-slate-200 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 状态与底座说明条 */}
        <div className="px-5 py-2.5 bg-blue-50/70 border-b border-blue-100 text-xs flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center space-x-2 text-blue-900">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              当前正式查询底座包含 <strong>{formalQueryFields.length}</strong> 个可查字段，结果列已按顺序号从小到大排列。
            </span>
          </div>

          {(pendingSyncFields.length > 0 || draftFields.length > 0) && (
            <div className="text-[11px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded-[4px] border border-amber-200">
              {pendingSyncFields.length > 0 && (
                <span>
                  有 {pendingSyncFields.length} 个字段待进入正式底座（
                  {pendingSyncFields.map(f => f.displayTitle).join(', ')}），未进入本次查询。
                </span>
              )}
              {draftFields.length > 0 && (
                <span className="ml-1">草稿项 ({draftFields.length} 个) 已自动隔离。</span>
              )}
            </div>
          )}
        </div>

        {/* 模拟查询条件工具条 (32px 高度) */}
        <div className="px-5 py-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-2 text-xs flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="模拟全文检索或编码/名称关键词..."
                value={searchKeyword}
                onChange={e => setSearchKeyword(e.target.value)}
                className="w-full h-8 pl-7 pr-3 bg-slate-50 border border-slate-300 rounded-[6px] text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:border-blue-500"
              />
            </div>
          </div>

          <div className="text-xs text-slate-500">
            命中 <span className="font-bold text-slate-900 font-mono">{filteredData.length}</span> 条记录
          </div>
        </div>

        {/* 查询结果表格 */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold sticky top-0 z-10">
              <tr>
                {formalQueryFields.length > 0 ? (
                  formalQueryFields.map(f => (
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
                  ))
                ) : (
                  <th className="py-2.5 px-3">无正式可查字段</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {formalQueryFields.length > 0 && filteredData.length > 0 ? (
                filteredData.map(row => (
                  <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                    {formalQueryFields.map(f => {
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
                      else if (f.manticoreField === 'fastener_code')
                        cellVal = row.fastenerCode || '-';
                      else if (f.manticoreField === 'standard_spec')
                        cellVal = row.standardSpec || '-';
                      else if (f.manticoreField === 'thread_spec')
                        cellVal = row.threadSpec || '-';
                      else if (f.manticoreField === 'doc_number')
                        cellVal = row.docNumber || '-';
                      else if (f.manticoreField === 'doc_title')
                        cellVal = row.docTitle || '-';
                      else if (f.manticoreField === 'drawing_no')
                        cellVal = row.drawingNo || '-';
                      else if (f.manticoreField === 'sheet_size')
                        cellVal = row.sheetSize || '-';
                      else cellVal = row[f.sourceFieldName] || '-';

                      return (
                        <td key={f.id} className="py-2.5 px-3">
                          {f.displayType === 'LINK' ? (
                            <a
                              href={`https://plm.internal.corp/view?part=${cellVal}`}
                              target="_blank"
                              rel="noreferrer"
                              className="font-mono font-semibold text-blue-600 hover:underline inline-flex items-center"
                            >
                              <span>{cellVal}</span>
                              <Link className="w-2.5 h-2.5 ml-1 text-blue-400" />
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
                  <td colSpan={formalQueryFields.length || 1} className="py-12 text-center text-slate-400">
                    <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    {formalQueryFields.length === 0
                      ? '当前根类型尚未同步任何可查询字段'
                      : '未查找到相关数据'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 底部关闭栏 */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-[6px] text-xs font-medium shadow-2xs cursor-pointer transition-colors"
          >
            关闭预览
          </button>
        </div>
      </div>
    </div>
  );
};

// ==================== 4. 字段映射详情查看弹窗 ====================
interface FieldDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  field: FieldMappingItem | null;
}

export const FieldDetailModal: React.FC<FieldDetailModalProps> = ({
  isOpen,
  onClose,
  field
}) => {
  if (!isOpen || !field) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-[8px] shadow-xl border border-slate-200 max-w-lg w-full p-5 animate-in fade-in zoom-in-95 duration-150 space-y-4">
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">字段映射详细定义</h3>
            <p className="text-xs font-mono text-blue-700">{field.manticoreField} ({field.displayTitle})</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-[4px] hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          {/* PLM 来源 */}
          <div className="bg-slate-50 p-3 rounded-[6px] border border-slate-200 space-y-1.5">
            <div className="font-semibold text-slate-700">1. PLM 来源元数据</div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div><span className="text-slate-400">源字段 Key:</span> <span className="font-mono font-medium">{field.sourceFieldKey}</span></div>
              <div><span className="text-slate-400">源字段名称:</span> <span className="font-mono font-medium">{field.sourceFieldName}</span></div>
              <div>
                <span className="text-slate-400">来源显示名:</span>{' '}
                <span className="font-medium">{field.sourceDisplayName}</span>
                {field.isDisplayNameMissing && (
                  <span className="ml-1 text-[9px] text-amber-800 bg-amber-100 px-1 rounded-[4px]">已兜底</span>
                )}
              </div>
              <div><span className="text-slate-400">业务类型:</span> <span className="font-medium">{field.sourceDataTypeLabel}</span></div>
              <div><span className="text-slate-400">默认单位:</span> <span className="font-mono">{field.defaultUnit || '-'}</span></div>
            </div>
          </div>

          {/* Manticore 底层 */}
          <div className="bg-slate-50 p-3 rounded-[6px] border border-slate-200 space-y-1.5">
            <div className="font-semibold text-slate-700">2. Manticore 底层配置</div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div><span className="text-slate-400">物理字段:</span> <span className="font-mono font-semibold text-blue-700">{field.manticoreField}</span></div>
              <div><span className="text-slate-400">数据类型:</span> <span className="font-mono font-semibold">{field.manticoreType}</span></div>
              <div><span className="text-slate-400">顺序号:</span> <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{field.displayOrder ?? field.defaultDisplayOrder ?? '-'}</span></div>
              <div><span className="text-slate-400">唯一主键:</span> <span>{field.isUniqueKey ? '是' : '否'}</span></div>
              <div><span className="text-slate-400">排序支持:</span> <span>{field.isSortable ? '支持' : '不支持'}</span></div>
            </div>
          </div>

          {/* 状态与生命周期 */}
          <div className="bg-slate-50 p-3 rounded-[6px] border border-slate-200 space-y-1.5">
            <div className="font-semibold text-slate-700">3. 配置与底座归属</div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div><span className="text-slate-400">配置状态:</span> <span className="font-medium">{field.configStatus}</span></div>
              <div>
                <span className="text-slate-400">正式底座归属:</span>{' '}
                <span className={field.isInFormalQueryBase ? 'text-emerald-700 font-medium' : 'text-amber-700 font-medium'}>
                  {field.isInFormalQueryBase ? '已在正式底座' : '待进入正式底座'}
                </span>
              </div>
              <div><span className="text-slate-400">含数据影响:</span> <span>{field.isDataImpactingChange ? '是' : '否'}</span></div>
              <div><span className="text-slate-400">更新时间:</span> <span>{field.updatedAt}</span></div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-[6px] text-xs font-medium cursor-pointer transition-colors shadow-2xs"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
