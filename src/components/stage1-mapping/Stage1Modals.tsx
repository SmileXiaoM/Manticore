import React, { useState, useEffect } from 'react';
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
  Database,
  Trash2,
  AlertOctagon,
  ShieldAlert,
  FileText,
  Check
} from 'lucide-react';
import {
  FieldMappingItem,
  MappingObjectType,
  Stage1PreviewRecord,
  ResetAuditRecord,
  formatRootTypeDisplayName,
  determineSyncStrategy,
  SYNC_STRATEGY_LABELS
} from '../../stage1MappingTypes';
import {
  resolveFieldHyperlink,
  isFieldColumnHiddenByMissingParam,
  isFieldHyperlinkValid
} from '../../stage1HyperlinkUtils';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ty-overlay backdrop-blur-xs p-4">
      <div className="bg-[var(--ty-fill-white-color)] rounded-ty-lg shadow-ty-lg border border-[var(--ty-border-color)] max-w-lg w-full p-5 animate-in fade-in zoom-in-95 duration-150 space-y-4">
        <div className="flex items-start justify-between border-b border-[var(--ty-border-light-color)] pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="bg-[var(--ty-green-lightest-color)] p-2 rounded-ty-sm text-[var(--ty-green-color)] border border-[var(--ty-green-color)]/30">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-ty-sm font-bold text-[var(--ty-font-main-color)]">生效配置确认</h3>
              <p className="text-ty-xs text-[var(--ty-font-sub-color)]">
                将草稿配置项正式生效为当前根类型的配置
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-[var(--ty-font-sub-light-color)] hover:text-[var(--ty-font-main-color)] cursor-pointer p-1 rounded-ty-sm hover:bg-[var(--ty-fill-dark-color)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 影响摘要卡片 */}
        <div className="bg-[var(--ty-fill-weak-dark-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-3.5 space-y-2.5 text-ty-xs">
          <div className="flex justify-between items-center text-[var(--ty-font-sub-color)]">
            <span>目标根类型：</span>
            <span className="font-bold text-[var(--ty-font-main-color)]">
              {formatRootTypeDisplayName(currentRootType.name, currentRootType.code)}
            </span>
          </div>

          <div className="border-t border-[var(--ty-border-color)] pt-2 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-[var(--ty-font-sub-color)]">待生效草稿总数：</span>
              <span className="font-bold text-[var(--ty-font-main-color)] font-mono">{totalDraftCount} 项</span>
            </div>
            <div className="flex justify-between items-center text-[var(--ty-font-sub-light-color)] text-ty-2xs pl-2">
              <span>- 全新新增草稿字段：</span>
              <span className="font-mono font-semibold text-[var(--ty-font-main-color)]">{draftOnlyFields.length} 项</span>
            </div>
            <div className="flex justify-between items-center text-[var(--ty-font-sub-light-color)] text-ty-2xs pl-2">
              <span>- 既有已配置字段草稿修改：</span>
              <span className="font-mono font-semibold text-[var(--ty-font-main-color)]">{modifiedDraftFields.length} 项</span>
            </div>
          </div>

          <div className="border-t border-[var(--ty-border-color)] pt-2 grid grid-cols-2 gap-2 text-ty-2xs">
            <div className="bg-[var(--ty-orange-lightest-color)] p-2.5 rounded-ty-sm border border-[var(--ty-orange-color)]/30 text-[var(--ty-font-main-light-color)]">
              <div className="font-bold text-[var(--ty-orange-color)]">数据影响变更: {dataImpactingCount} 项</div>
              <div className="text-ty-2xs opacity-80 mt-0.5">
                {dataImpactingCount > 0 ? '生效后根类型转为「待同步」' : '无数据底层变更'}
              </div>
            </div>
            <div className="bg-[var(--ty-green-lightest-color)] p-2.5 rounded-ty-sm border border-[var(--ty-green-color)]/30 text-[var(--ty-font-main-light-color)]">
              <div className="font-bold text-[var(--ty-green-color)]">纯展示变更: {displayOnlyCount} 项</div>
              <div className="text-ty-2xs opacity-80 mt-0.5">即刻生效，无需同步</div>
            </div>
          </div>
        </div>

        {/* 权威生命周期说明 */}
        <div className="bg-[var(--ty-primary-lighter-color)]/30 border border-[var(--ty-primary-lighter-color)] rounded-ty-sm p-3 text-ty-xs text-[var(--ty-primary-color)] flex items-start space-x-2">
          <Info className="w-4 h-4 text-[var(--ty-primary-color)] shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold">生效操作不生成配置版本，不会自动触发数据同步</p>
            <p className="text-ty-2xs opacity-90 leading-relaxed">
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
            className="h-8 px-4 border border-[var(--ty-border-color)] rounded-ty-sm text-ty-xs font-medium text-[var(--ty-font-main-color)] hover:bg-[var(--ty-fill-color)] bg-[var(--ty-fill-white-color)] cursor-pointer transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirmPublish}
            className="h-8 px-4 bg-[var(--ty-green-color)] hover:opacity-90 text-[var(--ty-font-white-color)] rounded-ty-sm text-ty-xs font-medium flex items-center space-x-1.5 cursor-pointer transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span>确认生效配置 ({totalDraftCount} 项)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// ==================== 2. 手工发起数据同步模态框 (统一简化入口，取消技术方式选择) ====================
interface TriggerSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRootType: MappingObjectType;
  fields: FieldMappingItem[];
  onConfirmSync: () => void;
  onNavigateToSyncQuality?: (batchId?: string) => void;
}

export const TriggerSyncModal: React.FC<TriggerSyncModalProps> = ({
  isOpen,
  onClose,
  currentRootType,
  fields,
  onConfirmSync,
  onNavigateToSyncQuality
}) => {
  if (!isOpen) return null;

  // 系统自动判定实际执行方式与原因，无随机数，前端不提供选择
  const { strategyLabel, reason } = determineSyncStrategy(currentRootType, fields);

  // 检查是否有待同步的数据影响变更
  const hasPendingChanges = Boolean(
    currentRootType.hasPendingSyncChanges ||
    fields.some(f => f.rootTypeId === currentRootType.id && f.configStatus === 'CONFIGURED' && !f.isInFormalQueryBase)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ty-overlay backdrop-blur-xs p-4">
      <div className="bg-[var(--ty-fill-white-color)] rounded-ty-lg shadow-ty-lg border border-[var(--ty-border-color)] max-w-lg w-full p-5 animate-in fade-in zoom-in-95 duration-150 space-y-4">
        <div className="flex items-start justify-between border-b border-[var(--ty-border-light-color)] pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-ty-sm border bg-[var(--ty-primary-lightest-color)] text-[var(--ty-primary-color)] border-[var(--ty-primary-color)]/30">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-ty-sm font-bold text-[var(--ty-font-main-color)]">
                确认同步“{formatRootTypeDisplayName(currentRootType.name, currentRootType.code)}”数据？
              </h3>
              <p className="text-ty-xs text-[var(--ty-font-sub-color)]">
                按当前已生效字段同步当前根类型的数据，系统将自动选择执行方式。
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--ty-font-sub-light-color)] hover:text-[var(--ty-font-main-color)] cursor-pointer p-1 rounded-ty-sm hover:bg-[var(--ty-fill-dark-color)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 异常提示 (如果上一批次存在未中断整体任务的记录级异常) */}
        {currentRootType.lastSyncErrorRecords && currentRootType.lastSyncErrorRecords.length > 0 && (
          <div className="bg-[var(--ty-orange-lightest-color)] border border-[var(--ty-orange-color)]/30 rounded-ty-sm p-3 text-ty-xs text-[var(--ty-font-main-light-color)] space-y-1.5">
            <div className="font-bold flex items-center text-[var(--ty-orange-color)]">
              <AlertTriangle className="w-3.5 h-3.5 mr-1 text-[var(--ty-orange-color)]" />
              上一批次同步有 {currentRootType.lastSyncErrorRecords.length} 条异常记录 (本次同步将自动执行补偿处理):
            </div>
            <div className="max-h-20 overflow-y-auto space-y-1 text-ty-2xs font-mono text-[var(--ty-font-main-light-color)] bg-[var(--ty-fill-white-color)]/80 p-1.5 rounded-ty-sm border border-[var(--ty-orange-color)]/30">
              {currentRootType.lastSyncErrorRecords.map(err => (
                <div key={err.id}>• [{err.recordKey}] {err.errorField || '未知字段'}: {err.errorMsg}</div>
              ))}
            </div>
          </div>
        )}

        {/* 确认核心信息卡片 */}
        <div className="bg-[var(--ty-fill-weak-dark-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-3.5 space-y-2.5 text-ty-xs">
          <div className="flex justify-between items-center text-[var(--ty-font-sub-color)]">
            <span>当前根类型：</span>
            <span className="font-bold text-[var(--ty-font-main-color)]">
              {formatRootTypeDisplayName(currentRootType.name, currentRootType.code)}
            </span>
          </div>
          <div className="flex justify-between items-center text-[var(--ty-font-sub-color)]">
            <span>当前已生效字段数：</span>
            <span className="font-mono font-bold text-[var(--ty-green-color)]">
              {currentRootType.configuredFieldCount} 个
            </span>
          </div>
          <div className="flex justify-between items-center text-[var(--ty-font-sub-color)]">
            <span>当前正式可查字段数：</span>
            <span className="font-mono font-bold text-[var(--ty-primary-color)]">
              {currentRootType.formalQueryableFieldCount} 个
            </span>
          </div>
          <div className="flex justify-between items-center text-[var(--ty-font-sub-color)]">
            <span>当前草稿字段数：</span>
            <span className="font-mono font-medium text-[var(--ty-orange-color)] flex items-center space-x-1">
              <span>{currentRootType.draftFieldCount} 个</span>
              <span className="text-ty-2xs text-[var(--ty-font-sub-color)] font-normal">（草稿字段不参与本次同步）</span>
            </span>
          </div>

          {/* 若存在待同步的数据影响变更 */}
          {hasPendingChanges && (
            <div className="bg-[var(--ty-primary-lightest-color)]/60 border border-[var(--ty-primary-color)]/30 rounded-ty-sm p-2 text-ty-2xs text-[var(--ty-primary-color)] flex items-center space-x-1.5 font-medium">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>检测到存在待同步的数据影响变更，同步成功后更新正式查询底座。</span>
            </div>
          )}

          {/* 系统自动判定执行策略展示 */}
          <div className="border-t border-[var(--ty-border-color)] pt-2.5 space-y-1">
            <div className="flex items-center justify-between text-ty-xs">
              <span className="text-[var(--ty-font-sub-color)]">系统判定执行方式：</span>
              <span className="px-2 py-0.5 rounded-ty-sm text-ty-2xs font-bold bg-[var(--ty-primary-color)]/10 text-[var(--ty-primary-color)] border border-[var(--ty-primary-color)]/30">
                {strategyLabel}
              </span>
            </div>
            <div className="text-ty-2xs text-[var(--ty-font-sub-color)] leading-relaxed">
              原因：{reason}
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center pt-2">
          <span className="text-ty-2xs text-[var(--ty-font-sub-color)]">
            注：单条数据异常不中止同步任务
          </span>
          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-4 border border-[var(--ty-border-color)] rounded-ty-sm text-ty-xs font-medium text-[var(--ty-font-main-color)] hover:bg-[var(--ty-fill-color)] bg-[var(--ty-fill-white-color)] cursor-pointer transition-colors"
            >
              取消
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirmSync();
                onClose();
              }}
              className="h-8 px-4 bg-[var(--ty-primary-color)] hover:opacity-90 text-[var(--ty-font-white-color)] rounded-ty-sm text-ty-xs font-medium flex items-center space-x-1.5 cursor-pointer transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>开始同步</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== 2.1 重置接入危险确认弹窗 (低频危险操作) ====================
interface ResetAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRootType: MappingObjectType;
  fields: FieldMappingItem[];
  onConfirmReset: (confirmedCode: string) => void;
}

export const ResetAccessModal: React.FC<ResetAccessModalProps> = ({
  isOpen,
  onClose,
  currentRootType,
  fields,
  onConfirmReset
}) => {
  const [confirmInput, setConfirmInput] = useState('');

  // 弹窗打开或根类型切换时清空输入
  useEffect(() => {
    if (isOpen) {
      setConfirmInput('');
    }
  }, [isOpen, currentRootType.id]);

  if (!isOpen) return null;

  const currentFields = fields.filter(f => f.rootTypeId === currentRootType.id);
  const targetCode = currentRootType.id; // PART / DOCUMENT / PROCESS
  const isCodeMatched = confirmInput.trim() === targetCode;

  const docCountText = currentRootType.manticoreDocCount !== undefined
    ? `${currentRootType.manticoreDocCount.toLocaleString()} 条`
    : '待获取';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ty-overlay backdrop-blur-xs p-4">
      <div className="bg-[var(--ty-fill-white-color)] rounded-ty-lg shadow-ty-lg border border-[var(--ty-danger-color)]/30 max-w-lg w-full p-5 animate-in fade-in zoom-in-95 duration-150 space-y-4">
        {/* 头部危险警示 */}
        <div className="flex items-start justify-between border-b border-[var(--ty-danger-color)]/20 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-ty-sm border bg-[var(--ty-danger-lightest-color)] text-[var(--ty-danger-color)] border-[var(--ty-danger-color)]/30">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-ty-sm font-bold text-[var(--ty-danger-color)]">
                确认重置“{formatRootTypeDisplayName(currentRootType.name, currentRootType.code)}”接入？
              </h3>
              <p className="text-ty-xs text-[var(--ty-font-sub-color)]">
                高危管理操作：重置当前根类型在检索底座的数据与配置状态
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--ty-font-sub-light-color)] hover:text-[var(--ty-font-main-color)] cursor-pointer p-1 rounded-ty-sm hover:bg-[var(--ty-fill-dark-color)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 影响说明 */}
        <div className="bg-[var(--ty-danger-lightest-color)]/40 border border-[var(--ty-danger-color)]/20 rounded-ty-sm p-3.5 space-y-2 text-ty-xs">
          <div className="font-bold text-[var(--ty-danger-color)] flex items-center space-x-1">
            <AlertOctagon className="w-4 h-4 mr-1 shrink-0" />
            <span>执行重置将产生以下影响（本操作不可撤销）：</span>
          </div>
          <ul className="space-y-1.5 text-[var(--ty-font-main-color)] pl-5 list-disc leading-relaxed text-ty-xs">
            <li>
              将<strong>清空并删除</strong>当前根类型在 Manticore 中的{' '}
              <strong className="text-[var(--ty-danger-color)] font-mono">{docCountText}</strong> 索引数据。
            </li>
            <li>
              将<strong>保留已有的 {currentFields.length} 个字段映射定义</strong>，但全部转为<strong>草稿状态</strong>（已生效变为 0，正式可查变为 0）。
            </li>
            <li>
              当前根类型将<strong>立即停止参与正式查询</strong>。
            </li>
            <li className="text-[var(--ty-font-sub-color)]">
              不会删除 PLM 源系统数据，也不会删除中间表数据，历史同步与审计记录完整保留。
            </li>
          </ul>
        </div>

        {/* 架构说明与恢复路径 */}
        <div className="space-y-2 text-ty-xs">
          <div className="bg-[var(--ty-fill-weak-dark-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-2.5 text-ty-2xs space-y-1.5">
            <div className="text-[var(--ty-font-sub-color)] flex items-center space-x-1 font-medium">
              <Info className="w-3.5 h-3.5 text-[var(--ty-primary-color)] shrink-0" />
              <span>恢复路径：</span>
            </div>
            <div className="text-[var(--ty-font-main-color)] pl-4">
              重置完成后，需要重新检查并<strong>生效字段配置</strong>，再执行“<strong>同步数据</strong>”，才能重新生成索引并恢复查询。
            </div>
            <div className="text-[var(--ty-font-sub-color)] pl-4 border-t border-[var(--ty-border-light-color)] pt-1 text-[var(--ty-font-sub-light-color)]">
              架构说明：重置后 Manticore 物理列、物理表结构或 Schema 是否保留，当前标记为「<strong>待确认</strong>」（尚未接入底层 DDL 删除接口）。
            </div>
          </div>
        </div>

        {/* 输入确认验证 */}
        <div className="border border-[var(--ty-border-color)] rounded-ty-sm p-3 bg-[var(--ty-fill-white-color)] space-y-2">
          <label className="block text-ty-xs font-semibold text-[var(--ty-font-main-color)]">
            安全验证：请输入根类型编码 <span className="font-mono text-[var(--ty-danger-color)] font-bold">{targetCode}</span> 以确认
          </label>
          <input
            type="text"
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value)}
            placeholder={`请输入 ${targetCode}`}
            className="w-full h-8 px-2.5 border border-[var(--ty-border-color)] rounded-ty-sm text-ty-xs font-mono focus:border-[var(--ty-danger-color)] focus:ring-1 focus:ring-[var(--ty-danger-color)] outline-none"
            autoFocus
          />
          <div className="flex items-center justify-between text-ty-2xs">
            <span className={isCodeMatched ? 'text-[var(--ty-green-color)] font-medium flex items-center' : 'text-[var(--ty-font-sub-color)]'}>
              {isCodeMatched ? (
                <>
                  <Check className="w-3 h-3 mr-0.5" /> 编码验证匹配通过
                </>
              ) : (
                '输入必须完全匹配且区分大小写'
              )}
            </span>
            <span className="text-[var(--ty-danger-color)] font-medium">不可撤销</span>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-end space-x-2.5 pt-2 border-t border-[var(--ty-border-light-color)]">
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-4 border border-[var(--ty-border-color)] rounded-ty-sm text-ty-xs font-medium text-[var(--ty-font-main-color)] hover:bg-[var(--ty-fill-color)] bg-[var(--ty-fill-white-color)] cursor-pointer transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            disabled={!isCodeMatched}
            onClick={() => {
              if (isCodeMatched) {
                onConfirmReset(confirmInput.trim());
                onClose();
              }
            }}
            className={`h-8 px-4 rounded-ty-sm text-ty-xs font-medium flex items-center space-x-1.5 transition-colors ${
              isCodeMatched
                ? 'bg-[var(--ty-danger-color)] hover:opacity-90 text-[var(--ty-font-white-color)] cursor-pointer'
                : 'bg-[var(--ty-danger-color)]/30 text-[var(--ty-font-white-color)]/60 cursor-not-allowed'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>重置接入</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// ==================== 2.2 重置阻断提示弹窗 (存在运行中任务时) ====================
interface ResetBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRootType: MappingObjectType;
}

export const ResetBlockModal: React.FC<ResetBlockModalProps> = ({
  isOpen,
  onClose,
  currentRootType
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ty-overlay backdrop-blur-xs p-4">
      <div className="bg-[var(--ty-fill-white-color)] rounded-ty-lg shadow-ty-lg border border-[var(--ty-orange-color)]/40 max-w-md w-full p-5 animate-in fade-in zoom-in-95 duration-150 space-y-4">
        <div className="flex items-start space-x-3">
          <div className="p-2 rounded-ty-sm bg-[var(--ty-orange-lightest-color)] text-[var(--ty-orange-color)] border border-[var(--ty-orange-color)]/30 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-ty-sm font-bold text-[var(--ty-font-main-color)]">
              当前无法重置“{formatRootTypeDisplayName(currentRootType.name, currentRootType.code)}”接入
            </h3>
            <p className="text-ty-xs text-[var(--ty-danger-color)] font-semibold">
              当前有 1 个同步任务正在执行，请等待任务结束后再重置。
            </p>
          </div>
        </div>

        <div className="bg-[var(--ty-fill-weak-dark-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-3 text-ty-xs text-[var(--ty-font-sub-color)] leading-relaxed">
          为保证数据完整性与检索底座并发安全，禁止在数据同步或历史任务执行期间重置接入。其他根类型的独立配置与同步不受影响。
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-4 bg-[var(--ty-primary-color)] hover:opacity-90 text-[var(--ty-font-white-color)] rounded-ty-sm text-ty-xs font-medium cursor-pointer transition-colors"
          >
            我知道了
          </button>
        </div>
      </div>
    </div>
  );
};

// ==================== 2.3 重置接入审计记录弹窗 ====================
interface ResetAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  auditRecords: ResetAuditRecord[];
  currentRootTypeId?: string;
}

export const ResetAuditModal: React.FC<ResetAuditModalProps> = ({
  isOpen,
  onClose,
  auditRecords,
  currentRootTypeId
}) => {
  if (!isOpen) return null;

  const displayedRecords = currentRootTypeId
    ? auditRecords.filter(r => r.rootTypeId === currentRootTypeId)
    : auditRecords;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ty-overlay backdrop-blur-xs p-4">
      <div className="bg-[var(--ty-fill-white-color)] rounded-ty-lg shadow-ty-lg border border-[var(--ty-border-color)] max-w-3xl w-full p-5 animate-in fade-in zoom-in-95 duration-150 space-y-4 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-[var(--ty-border-light-color)] pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-ty-sm border bg-[var(--ty-fill-weak-dark-color)] text-[var(--ty-font-main-color)] border-[var(--ty-border-color)]">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-ty-sm font-bold text-[var(--ty-font-main-color)]">
                重置接入操作审计记录
              </h3>
              <p className="text-ty-xs text-[var(--ty-font-sub-color)]">
                严格留痕：记录每次重置接入操作人、影响数据量、字段状态变更与执行结果
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--ty-font-sub-light-color)] hover:text-[var(--ty-font-main-color)] cursor-pointer p-1 rounded-ty-sm hover:bg-[var(--ty-fill-dark-color)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 space-y-3 pr-1">
          {displayedRecords.length === 0 ? (
            <div className="py-12 text-center text-[var(--ty-font-sub-color)] text-ty-xs">
              暂无重置接入审计记录
            </div>
          ) : (
            displayedRecords.map(record => (
              <div
                key={record.id}
                className="border border-[var(--ty-border-color)] rounded-ty-sm p-3.5 bg-[var(--ty-fill-weak-dark-color)] space-y-2 text-ty-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-[var(--ty-font-main-color)]">
                      {record.id}
                    </span>
                    <span className="px-2 py-0.5 rounded-ty-sm font-medium bg-[var(--ty-primary-color)]/10 text-[var(--ty-primary-color)] text-ty-2xs">
                      {record.rootTypeName}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-ty-sm text-ty-2xs font-bold ${
                    record.status === 'SUCCESS'
                      ? 'bg-[var(--ty-green-lightest-color)] text-[var(--ty-green-color)] border border-[var(--ty-green-color)]/30'
                      : record.status === 'RESETTING'
                      ? 'bg-[var(--ty-orange-lightest-color)] text-[var(--ty-orange-color)] border border-[var(--ty-orange-color)]/30 animate-pulse'
                      : 'bg-[var(--ty-danger-lightest-color)] text-[var(--ty-danger-color)] border border-[var(--ty-danger-color)]/30'
                  }`}>
                    {record.status === 'SUCCESS' ? '重置成功' : record.status === 'RESETTING' ? '重置执行中' : '重置失败'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-ty-2xs bg-[var(--ty-fill-white-color)] p-2.5 rounded-ty-sm border border-[var(--ty-border-light-color)]">
                  <div>
                    <span className="text-[var(--ty-font-sub-color)]">操作人：</span>
                    <span className="font-medium text-[var(--ty-font-main-color)]">{record.operator}</span>
                  </div>
                  <div>
                    <span className="text-[var(--ty-font-sub-color)]">发起时间：</span>
                    <span className="font-mono text-[var(--ty-font-main-color)]">{record.initiatedAt}</span>
                  </div>
                  <div>
                    <span className="text-[var(--ty-font-sub-color)]">完成时间：</span>
                    <span className="font-mono text-[var(--ty-font-main-color)]">{record.completedAt || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[var(--ty-font-sub-color)]">安全编码校验：</span>
                    <span className="font-mono text-[var(--ty-green-color)] font-bold">
                      {record.confirmedInputCode} (通过)
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-ty-2xs">
                  <div>
                    <span className="text-[var(--ty-font-sub-color)]">已删除底座索引数据：</span>
                    <span className="font-mono font-bold text-[var(--ty-danger-color)]">
                      {record.deletedDocCount.toLocaleString()} 条
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--ty-font-sub-color)]">保留并转草稿字段数：</span>
                    <span className="font-mono font-bold text-[var(--ty-orange-color)]">
                      {record.retainedDraftCount} 个
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--ty-font-sub-color)]">物理列/Schema 保留状态：</span>
                    <span className="font-bold text-[var(--ty-font-sub-color)]">
                      {record.manticoreSchemaRetentionNote}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end pt-2 border-t border-[var(--ty-border-light-color)]">
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-4 bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm text-ty-xs font-medium text-[var(--ty-font-main-color)] hover:bg-[var(--ty-fill-color)] cursor-pointer transition-colors"
          >
            关闭
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

  // 2. 根据超链接缺参策略 HIDE_ENTIRE_COLUMN 进行整列隐藏判断：缺参字段整列不进入结果表格
  const displayQueryFields = formalQueryFields.filter(
    f => !isFieldColumnHiddenByMissingParam(f, previewRecords || [])
  );
  const hiddenColumnsCount = formalQueryFields.length - displayQueryFields.length;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ty-overlay backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[var(--ty-fill-white-color)] rounded-ty-lg shadow-ty-lg border border-[var(--ty-border-color)] max-w-6xl w-full flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[var(--ty-border-color)] flex items-center justify-between bg-[var(--ty-fill-weak-dark-color)] shrink-0">
          <div className="space-y-0.5">
            <div className="flex items-center space-x-2">
              <h3 className="text-ty-sm font-bold text-[var(--ty-font-main-color)] flex items-center">
                <Eye className="w-4 h-4 mr-1.5 text-[var(--ty-primary-color)]" />
                正式查询底座数据预览
              </h3>
              <span className="px-2 py-0.5 text-ty-2xs font-mono font-medium rounded-ty-sm bg-[var(--ty-fill-color)] text-[var(--ty-font-main-color)] border border-[var(--ty-border-color)]">
                {formatRootTypeDisplayName(currentRootType.name, currentRootType.code)}
              </span>
              <span className="px-2 py-0.5 text-ty-2xs font-mono font-semibold rounded-ty-sm bg-[var(--ty-green-lightest-color)] text-[var(--ty-font-main-light-color)] border border-[var(--ty-green-color)]/30">
                底座展示列: {displayQueryFields.length} 个
              </span>
              {hiddenColumnsCount > 0 && (
                <span className="px-2 py-0.5 text-ty-2xs font-mono font-medium rounded-ty-sm bg-[var(--ty-orange-lightest-color)] text-[var(--ty-font-main-light-color)] border border-[var(--ty-orange-color)]/30">
                  缺参隐藏列: {hiddenColumnsCount} 个
                </span>
              )}
            </div>
            <p className="text-ty-xs text-[var(--ty-font-sub-color)]">
              只读当前已成功同步的正式查询底座数据。超链接配置已真实生效，严格遵循 URL 模板与缺参策略。
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-[var(--ty-font-sub-light-color)] hover:text-[var(--ty-font-main-color)] cursor-pointer p-1 rounded-ty-sm hover:bg-[var(--ty-fill-dark-color)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 状态与底座说明条 */}
        <div className="px-5 py-2.5 bg-[var(--ty-primary-lightest-color)] border-b border-[var(--ty-primary-color)]/30 text-ty-xs flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center space-x-2 text-[var(--ty-font-main-light-color)]">
            <Info className="w-4 h-4 text-[var(--ty-primary-color)] shrink-0" />
            <span>
              当前正式查询底座展示 <strong>{displayQueryFields.length}</strong> 个结果列，已按顺序号从小到大排布。
            </span>
          </div>

          {(pendingSyncFields.length > 0 || draftFields.length > 0 || hiddenColumnsCount > 0) && (
            <div className="text-ty-2xs text-[var(--ty-font-main-light-color)] bg-[var(--ty-orange-lightest-color)] px-2 py-0.5 rounded-ty-sm border border-[var(--ty-orange-color)]/30 flex items-center space-x-1.5">
              {pendingSyncFields.length > 0 && (
                <span>
                  待进入底座（{pendingSyncFields.length} 个）；
                </span>
              )}
              {draftFields.length > 0 && (
                <span>草稿项（{draftFields.length} 个）已自动隔离；</span>
              )}
              {hiddenColumnsCount > 0 && (
                <span>有 {hiddenColumnsCount} 列因超链接缺少必要参数按配置整列隐藏。</span>
              )}
            </div>
          )}
        </div>

        {/* 模拟查询条件工具条 (32px 高度) */}
        <div className="px-5 py-2.5 bg-[var(--ty-fill-white-color)] border-b border-[var(--ty-border-color)] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-2 text-ty-xs flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--ty-font-sub-light-color)]" />
              <input
                type="text"
                placeholder="模拟全文检索或编码/名称关键词..."
                value={searchKeyword}
                onChange={e => setSearchKeyword(e.target.value)}
                className="w-full h-8 pl-7 pr-3 bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm text-ty-xs text-[var(--ty-font-main-color)] focus:outline-hidden focus:border-[var(--ty-primary-color)]"
              />
            </div>
          </div>

          <div className="text-ty-xs text-[var(--ty-font-sub-color)]">
            命中 <span className="font-bold text-[var(--ty-font-main-color)] font-mono">{filteredData.length}</span> 条记录
          </div>
        </div>

        {/* 查询结果表格 */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left text-ty-xs">
            <thead className="bg-[var(--ty-fill-weak-dark-color)] border-b border-[var(--ty-border-color)] text-[var(--ty-font-sub-color)] font-semibold sticky top-0 z-10">
              <tr>
                {displayQueryFields.length > 0 ? (
                  displayQueryFields.map(f => (
                    <th
                      key={f.id}
                      className="py-2.5 px-3 whitespace-nowrap"
                      style={{ width: f.defaultColumnWidth ? `${f.defaultColumnWidth}px` : 'auto' }}
                    >
                      {f.displayTitle}
                      <span className="text-ty-2xs font-mono text-[var(--ty-font-sub-light-color)] block font-normal">
                        {f.manticoreField}
                      </span>
                    </th>
                  ))
                ) : (
                  <th className="py-2.5 px-3">无正式可查展示列</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--ty-border-light-color)] text-[var(--ty-font-main-color)]">
              {displayQueryFields.length > 0 && filteredData.length > 0 ? (
                filteredData.map(row => (
                  <tr key={row.id} className="hover:bg-[var(--ty-fill-weak-dark-color)] transition-colors">
                    {displayQueryFields.map(f => {
                      const linkRes = resolveFieldHyperlink(f, row);

                      if (linkRes.type === 'LINK') {
                        return (
                          <td key={f.id} className="py-2.5 px-3">
                            <a
                              href={linkRes.url}
                              target={linkRes.target}
                              rel={linkRes.target === '_blank' ? 'noreferrer' : undefined}
                              className="font-mono font-semibold text-[var(--ty-primary-color)] hover:opacity-80 hover:underline inline-flex items-center"
                              title={`跳转源系统: ${linkRes.url}`}
                            >
                              <span>{linkRes.text}</span>
                              <Link className="w-2.5 h-2.5 ml-1 text-[var(--ty-primary-color)]/70 shrink-0" />
                            </a>
                          </td>
                        );
                      }

                      if (linkRes.type === 'DISABLED_LINK') {
                        return (
                          <td key={f.id} className="py-2.5 px-3">
                            <span
                              className="font-mono text-[var(--ty-font-sub-light-color)] line-through decoration-[var(--ty-font-sub-light-color)] cursor-not-allowed inline-flex items-center bg-[var(--ty-fill-dark-color)] px-1.5 py-0.5 rounded-ty-xs text-ty-2xs"
                              title={`超链接已禁用: ${linkRes.reason}`}
                            >
                              <span>{linkRes.text}</span>
                              <Link className="w-2.5 h-2.5 ml-1 text-[var(--ty-font-sub-light-color)] shrink-0" />
                            </span>
                          </td>
                        );
                      }

                      return (
                        <td key={f.id} className="py-2.5 px-3">
                          <span className="font-mono text-[var(--ty-font-main-color)]">{linkRes.text}</span>
                        </td>
                      );
                    })}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={displayQueryFields.length || 1} className="py-12 text-center text-[var(--ty-font-sub-light-color)]">
                    <FileSpreadsheet className="w-8 h-8 text-[var(--ty-border-color)] mx-auto mb-2" />
                    {displayQueryFields.length === 0
                      ? '当前根类型尚未配置可展示结果列或已被缺参策略隐藏'
                      : '未查找到相关数据'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 底部关闭栏 */}
        <div className="px-5 py-3 bg-[var(--ty-fill-weak-dark-color)] border-t border-[var(--ty-border-color)] flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-4 bg-[var(--ty-fill-dark-color)] hover:bg-[var(--ty-fill-color)] text-[var(--ty-font-main-color)] border border-[var(--ty-border-color)] rounded-ty-sm text-ty-xs font-medium cursor-pointer transition-colors"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ty-overlay backdrop-blur-xs p-4">
      <div className="bg-[var(--ty-fill-white-color)] rounded-ty-lg shadow-ty-lg border border-[var(--ty-border-color)] max-w-lg w-full p-5 animate-in fade-in zoom-in-95 duration-150 space-y-4">
        <div className="flex items-start justify-between border-b border-[var(--ty-border-light-color)] pb-3">
          <div>
            <h3 className="text-ty-sm font-bold text-[var(--ty-font-main-color)]">字段映射详细定义</h3>
            <p className="text-ty-xs font-mono text-[var(--ty-primary-color)]">{field.manticoreField} ({field.displayTitle})</p>
          </div>
          <button type="button" onClick={onClose} className="text-[var(--ty-font-sub-light-color)] hover:text-[var(--ty-font-main-color)] cursor-pointer p-1 rounded-ty-sm hover:bg-[var(--ty-fill-dark-color)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 text-ty-xs">
          {/* PLM 来源 */}
          <div className="bg-[var(--ty-fill-weak-dark-color)] p-3 rounded-ty-sm border border-[var(--ty-border-color)] space-y-1.5">
            <div className="font-semibold text-[var(--ty-font-main-color)]">1. PLM 来源元数据</div>
            <div className="grid grid-cols-2 gap-2 text-ty-2xs">
              <div><span className="text-[var(--ty-font-sub-light-color)]">源字段 Key:</span> <span className="font-mono font-medium text-[var(--ty-font-main-color)]">{field.sourceFieldKey}</span></div>
              <div><span className="text-[var(--ty-font-sub-light-color)]">源字段名称:</span> <span className="font-mono font-medium text-[var(--ty-font-main-color)]">{field.sourceFieldName}</span></div>
              <div>
                <span className="text-[var(--ty-font-sub-light-color)]">来源显示名:</span>{' '}
                <span className="font-medium text-[var(--ty-font-main-color)]">{field.sourceDisplayName}</span>
                {field.isDisplayNameMissing && (
                  <span className="ml-1 text-ty-2xs text-[var(--ty-font-main-light-color)] bg-[var(--ty-orange-lightest-color)] border border-[var(--ty-orange-color)]/30 px-1 rounded-ty-xs font-medium">已兜底</span>
                )}
              </div>
              <div><span className="text-[var(--ty-font-sub-light-color)]">业务类型:</span> <span className="font-medium text-[var(--ty-font-main-color)]">{field.sourceDataTypeLabel}</span></div>
              <div><span className="text-[var(--ty-font-sub-light-color)]">默认单位:</span> <span className="font-mono text-[var(--ty-font-main-color)]">{field.defaultUnit || '-'}</span></div>
            </div>
          </div>

          {/* Manticore 底层 */}
          <div className="bg-[var(--ty-fill-weak-dark-color)] p-3 rounded-ty-sm border border-[var(--ty-border-color)] space-y-1.5">
            <div className="font-semibold text-[var(--ty-font-main-color)]">2. Manticore 底层配置</div>
            <div className="grid grid-cols-2 gap-2 text-ty-2xs">
              <div><span className="text-[var(--ty-font-sub-light-color)]">物理字段:</span> <span className="font-mono font-semibold text-[var(--ty-primary-color)]">{field.manticoreField}</span></div>
              <div><span className="text-[var(--ty-font-sub-light-color)]">数据类型:</span> <span className="font-mono font-semibold text-[var(--ty-font-main-color)]">{field.manticoreType}</span></div>
              <div><span className="text-[var(--ty-font-sub-light-color)]">顺序号:</span> <span className="font-mono font-bold text-[var(--ty-font-main-color)] bg-[var(--ty-fill-color)] px-1.5 py-0.5 rounded-ty-xs border border-[var(--ty-border-color)]">{field.displayOrder ?? field.defaultDisplayOrder ?? '-'}</span></div>
              <div><span className="text-[var(--ty-font-sub-light-color)]">唯一主键:</span> <span className="text-[var(--ty-font-main-color)]">{field.isUniqueKey ? '是' : '否'}</span></div>
              <div><span className="text-[var(--ty-font-sub-light-color)]">排序支持:</span> <span className="text-[var(--ty-font-main-color)]">{field.isSortable ? '支持' : '不支持'}</span></div>
            </div>
          </div>

          {/* 状态与生命周期 */}
          <div className="bg-[var(--ty-fill-weak-dark-color)] p-3 rounded-ty-sm border border-[var(--ty-border-color)] space-y-1.5">
            <div className="font-semibold text-[var(--ty-font-main-color)]">3. 配置与底座归属</div>
            <div className="grid grid-cols-2 gap-2 text-ty-2xs">
              <div><span className="text-[var(--ty-font-sub-light-color)]">配置状态:</span> <span className="font-medium text-[var(--ty-font-main-color)]">{field.configStatus}</span></div>
              <div>
                <span className="text-[var(--ty-font-sub-light-color)]">正式底座归属:</span>{' '}
                <span className={field.isInFormalQueryBase ? 'text-[var(--ty-green-color)] font-medium' : 'text-[var(--ty-orange-color)] font-medium'}>
                  {field.isInFormalQueryBase ? '已在正式底座' : '待进入正式底座'}
                </span>
              </div>
              <div><span className="text-[var(--ty-font-sub-light-color)]">含数据影响:</span> <span className="text-[var(--ty-font-main-color)]">{field.isDataImpactingChange ? '是' : '否'}</span></div>
              <div><span className="text-[var(--ty-font-sub-light-color)]">更新时间:</span> <span className="text-[var(--ty-font-main-color)]">{field.updatedAt}</span></div>
            </div>
          </div>

          {/* 结果展示与源系统超链接 */}
          <div className="bg-[var(--ty-fill-weak-dark-color)] p-3 rounded-ty-sm border border-[var(--ty-border-color)] space-y-1.5">
            <div className="font-semibold text-[var(--ty-font-main-color)]">4. 结果展示与源系统超链接</div>
            <div className="grid grid-cols-2 gap-2 text-ty-2xs">
              <div>
                <span className="text-[var(--ty-font-sub-light-color)]">结果表格展示:</span>{' '}
                <span className={field.isDisplayInResult ? 'text-[var(--ty-green-color)] font-semibold' : 'text-[var(--ty-font-sub-color)]'}>
                  {field.isDisplayInResult ? '是' : '否'}
                </span>
              </div>
              <div>
                <span className="text-[var(--ty-font-sub-light-color)]">字段值超链接:</span>{' '}
                {isFieldHyperlinkValid(field) ? (
                  <span className="text-[var(--ty-primary-color)] font-semibold inline-flex items-center">
                    <Link className="w-3 h-3 mr-1 text-[var(--ty-primary-color)]" />
                    已生效启用
                  </span>
                ) : field.displayType === 'LINK' ? (
                  <span className="text-[var(--ty-orange-color)] font-semibold inline-flex items-center" title="配置未完整满足5项有效口径，在查询结果中降级展示为普通文本">
                    未完整配置 (降级为普通文本)
                  </span>
                ) : (
                  <span className="text-[var(--ty-font-sub-color)]">未启用 (普通文本)</span>
                )}
              </div>
              {isFieldHyperlinkValid(field) && field.hyperlinkConfig && (
                <>
                  <div className="col-span-2">
                    <span className="text-[var(--ty-font-sub-light-color)]">URL 模板:</span>{' '}
                    <span className="font-mono text-[var(--ty-primary-color)] break-all bg-[var(--ty-fill-white-color)] px-1.5 py-0.5 rounded-ty-xs border border-[var(--ty-border-color)]">
                      {field.hyperlinkConfig.urlTemplate || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--ty-font-sub-light-color)]">OID 来源字段:</span>{' '}
                    <span className="font-mono font-medium text-[var(--ty-font-main-color)]">{field.hyperlinkConfig.oidSourceField || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[var(--ty-font-sub-light-color)]">OTYPE 来源字段:</span>{' '}
                    <span className="font-mono font-medium text-[var(--ty-font-main-color)]">{field.hyperlinkConfig.otypeSourceField || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[var(--ty-font-sub-light-color)]">打开方式:</span>{' '}
                    <span className="font-medium text-[var(--ty-font-main-color)]">{field.hyperlinkConfig.openTarget === '_self' ? '当前窗口 (_self)' : '新窗口 (_blank)'}</span>
                  </div>
                  <div>
                    <span className="text-[var(--ty-font-sub-light-color)]">缺参策略:</span>{' '}
                    <span className="font-medium text-[var(--ty-font-main-color)]">
                      {field.hyperlinkConfig.onMissingParam === 'SHOW_DISABLED_LINK'
                        ? '显示置灰不可点链接'
                        : field.hyperlinkConfig.onMissingParam === 'HIDE_ENTIRE_COLUMN'
                        ? '整列不进入结果表格'
                        : '隐藏链接展示普通文本'}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-4 bg-[var(--ty-fill-dark-color)] hover:bg-[var(--ty-fill-color)] text-[var(--ty-font-main-color)] border border-[var(--ty-border-color)] rounded-ty-sm text-ty-xs font-medium cursor-pointer transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
