import React, { useState, useMemo, useEffect } from 'react';
import {
  Database,
  Fingerprint,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  Layers,
  Activity
} from 'lucide-react';
import {
  SyncBatch,
  VerificationRecord,
  VerificationStatus,
  SyncException,
  QualityActiveTab
} from '../syncQualityTypes';
import {
  initialSyncBatches,
  initialVerificationRecords,
  initialSyncExceptions,
  deriveBatchVerificationStatus,
  validateDataIntegrity,
  runNegativeIntegrityAssertions
} from '../syncQualityData';
import { SyncLogsTab } from './sync-quality/SyncLogsTab';
import { VerificationTab } from './sync-quality/VerificationTab';
import { ExceptionDisposalTab } from './sync-quality/ExceptionDisposalTab';

interface ToastState {
  id: string;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
}

export const DataSyncQualityView: React.FC = () => {
  // 当前激活的子页签
  const [activeTab, setActiveTab] = useState<QualityActiveTab>('SYNC_LOGS');

  // 全局共享状态
  const [batches, setBatches] = useState<SyncBatch[]>(initialSyncBatches);
  const [verifications, setVerifications] = useState<VerificationRecord[]>(initialVerificationRecords);
  const [exceptions, setExceptions] = useState<SyncException[]>(initialSyncExceptions);

  // 跨抽屉控制选中的 ID
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [selectedVerificationId, setSelectedVerificationId] = useState<string | null>(null);
  const [selectedExceptionId, setSelectedExceptionId] = useState<string | null>(null);

  // Toast 消息队列
  const [toasts, setToasts] = useState<ToastState[]>([]);

  // 开发环境/启动时实际执行数据完整性校验与负向断言验证 (R1.8, R3)
  useEffect(() => {
    const integrity = validateDataIntegrity(batches, verifications, exceptions);
    if (!integrity.valid) {
      console.error('[数据质量完整性校验失败]', integrity.errors);
    } else if (import.meta.env.DEV) {
      console.log('[数据质量完整性校验通过] 初始数据关系完全闭环一致');
    }

    // 开发期轻量负向断言自检 (验证 5 类人为缺失/异常数据均能被准确捕获)
    if (import.meta.env.DEV) {
      const negativeRes = runNegativeIntegrityAssertions(batches, verifications, exceptions);
      if (negativeRes.allNegativePassed) {
        console.log('[负向异常断言验证通过] 5 项异常场景均被精准捕获');
      } else {
        console.error('[负向异常断言验证未完全通过]', negativeRes.testCases);
      }
    }
  }, []);

  // 集中派生批次状态（隔离定向核验与整批状态，避免局部通过覆盖整批预警 R1）
  const derivedBatches = useMemo(() => {
    return batches.map(b => {
      const derived = deriveBatchVerificationStatus(b, verifications, exceptions);
      return {
        ...b,
        verificationStatus: derived.verificationStatus,
        linkedVerificationId: derived.linkedVerificationId || b.linkedVerificationId
      };
    });
  }, [batches, verifications, exceptions]);

  const showToast = (message: string, type: 'success' | 'warning' | 'error' | 'info' = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // 跨页跳转辅助函数
  const handleOpenBatchDrawer = (batchId: string) => {
    setSelectedVerificationId(null);
    setSelectedExceptionId(null);
    setSelectedBatchId(batchId);
    setActiveTab('SYNC_LOGS');
  };

  const handleOpenVerificationDrawer = (verificationId: string) => {
    setSelectedBatchId(null);
    setSelectedExceptionId(null);
    setSelectedVerificationId(verificationId);
    setActiveTab('VERIFICATION');
  };

  const handleOpenExceptionDrawer = (exceptionId: string) => {
    setSelectedBatchId(null);
    setSelectedVerificationId(null);
    setSelectedExceptionId(exceptionId);
    setActiveTab('EXCEPTION_DISPOSAL');
  };

  // 添加核验记录：整批核验才更新主核验 ID，定向核验不得覆盖整批
  const handleAddVerification = (newRecord: VerificationRecord) => {
    setVerifications(prev => [newRecord, ...prev]);
    if (newRecord.verificationScope === 'FULL_BATCH' || (!newRecord.verificationScope && newRecord.linkedExceptionIds.length === 0)) {
      setBatches(prev =>
        prev.map(b =>
          b.id === newRecord.linkedBatchId
            ? {
                ...b,
                linkedVerificationId: newRecord.id
              }
            : b
        )
      );
    }
  };

  // 更新核验结果：只更新核验单本身，批次状态由集中派生函数自动计算
  const handleUpdateVerificationResult = (
    verificationId: string,
    result: VerificationStatus,
    updates?: Partial<VerificationRecord>
  ) => {
    setVerifications(prev =>
      prev.map(v => (v.id === verificationId ? { ...v, result, ...(updates || {}) } : v))
    );
  };

  return (
    <div className="space-y-4">
      {/* 紧凑页面标题与业务说明 - 820px 响应式自适应防逐字竖排 */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
        <div className="min-w-0">
          <div className="flex items-center space-x-2.5 flex-wrap sm:flex-nowrap">
            <div className="w-7 h-7 rounded-md bg-blue-600 text-white flex items-center justify-center font-bold shrink-0">
              <Activity className="w-4 h-4" />
            </div>
            <h1 className="text-base font-bold text-slate-900 tracking-tight whitespace-nowrap">数据同步质量保障</h1>
            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200 whitespace-nowrap shrink-0">
              一阶段检索底座
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            面向 PLM 多对象数据抽取接入、同步执行监控、源库与检索库一致性核验及异常补偿恢复全闭环。
          </p>
        </div>

        {/* 顶部三个紧凑页签 */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg border border-slate-200 shrink-0 self-start md:self-auto overflow-x-auto max-w-full">
          <button
            onClick={() => {
              setActiveTab('SYNC_LOGS');
              setSelectedVerificationId(null);
              setSelectedExceptionId(null);
            }}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'SYNC_LOGS'
                ? 'bg-white text-blue-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Database className="w-3.5 h-3.5 shrink-0" />
            <span>同步记录</span>
            <span className="text-[11px] font-mono font-normal opacity-70">({derivedBatches.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('VERIFICATION');
              setSelectedBatchId(null);
              setSelectedExceptionId(null);
            }}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'VERIFICATION'
                ? 'bg-white text-blue-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Fingerprint className="w-3.5 h-3.5 shrink-0" />
            <span>一致性核验</span>
            <span className="text-[11px] font-mono font-normal opacity-70">({verifications.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('EXCEPTION_DISPOSAL');
              setSelectedBatchId(null);
              setSelectedVerificationId(null);
            }}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'EXCEPTION_DISPOSAL'
                ? 'bg-white text-rose-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>异常处置</span>
            {exceptions.filter(e => e.status === 'PENDING').length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-mono font-bold">
                {exceptions.filter(e => e.status === 'PENDING').length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 主视图内容区域 */}
      <div className="transition-opacity duration-150">
        {activeTab === 'SYNC_LOGS' && (
          <SyncLogsTab
            batches={derivedBatches}
            verifications={verifications}
            exceptions={exceptions}
            onOpenVerificationDrawer={handleOpenVerificationDrawer}
            onOpenExceptionDrawer={handleOpenExceptionDrawer}
            selectedBatchId={selectedBatchId}
            onSelectBatchId={setSelectedBatchId}
          />
        )}

        {activeTab === 'VERIFICATION' && (
          <VerificationTab
            verifications={verifications}
            batches={derivedBatches}
            onOpenBatchDrawer={handleOpenBatchDrawer}
            onOpenExceptionDrawer={handleOpenExceptionDrawer}
            onAddVerification={handleAddVerification}
            onUpdateVerificationResult={handleUpdateVerificationResult}
            selectedVerificationId={selectedVerificationId}
            onSelectVerificationId={setSelectedVerificationId}
            onShowToast={showToast}
          />
        )}

        {activeTab === 'EXCEPTION_DISPOSAL' && (
          <ExceptionDisposalTab
            exceptions={exceptions}
            batches={derivedBatches}
            verifications={verifications}
            onUpdateExceptions={setExceptions}
            onAddVerification={handleAddVerification}
            onUpdateVerificationResult={handleUpdateVerificationResult}
            onOpenBatchDrawer={handleOpenBatchDrawer}
            onOpenVerificationDrawer={handleOpenVerificationDrawer}
            selectedExceptionId={selectedExceptionId}
            onSelectExceptionId={setSelectedExceptionId}
            onShowToast={showToast}
          />
        )}
      </div>

      {/* Toast 提示容器 */}
      {toasts.length > 0 && (
        <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-2 max-w-sm pointer-events-none">
          {toasts.map(t => (
            <div
              key={t.id}
              className={`p-3.5 rounded-lg shadow-xl border text-xs flex items-start space-x-2.5 pointer-events-auto animate-in slide-in-from-bottom-2 fade-in duration-150 ${
                t.type === 'success'
                  ? 'bg-emerald-900 text-emerald-50 border-emerald-700'
                  : t.type === 'error'
                  ? 'bg-rose-900 text-rose-50 border-rose-700'
                  : t.type === 'warning'
                  ? 'bg-amber-900 text-amber-50 border-amber-700'
                  : 'bg-slate-900 text-slate-50 border-slate-700'
              }`}
            >
              {t.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
              {t.type === 'error' && <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}
              {t.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />}
              {t.type === 'info' && <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />}

              <div className="flex-1 font-medium leading-relaxed">{t.message}</div>
              <button
                onClick={() => removeToast(t.id)}
                className="text-white/60 hover:text-white shrink-0 ml-1 cursor-pointer"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
