import React, { useState, useMemo } from 'react';
import {
  Search,
  RotateCcw,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  UserCheck,
  ExternalLink,
  Lock,
  MessageSquare,
  ShieldCheck,
  ArrowRight,
  X,
  Play,
  FileEdit,
  CheckCheck
} from 'lucide-react';
import {
  SyncException,
  ExceptionStatus,
  ExceptionSeverity,
  ExceptionType,
  VerificationRecord,
  SyncBatch
} from '../../syncQualityTypes';

interface ExceptionDisposalTabProps {
  exceptions: SyncException[];
  batches: SyncBatch[];
  verifications: VerificationRecord[];
  onUpdateExceptions: (updated: SyncException[]) => void;
  onOpenBatchDrawer: (batchId: string) => void;
  onOpenVerificationDrawer: (verificationId: string) => void;
  selectedExceptionId?: string | null;
  onSelectExceptionId: (id: string | null) => void;
  onShowToast: (message: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

export const ExceptionDisposalTab: React.FC<ExceptionDisposalTabProps> = ({
  exceptions,
  batches,
  verifications,
  onUpdateExceptions,
  onOpenBatchDrawer,
  onOpenVerificationDrawer,
  selectedExceptionId,
  onSelectExceptionId,
  onShowToast
}) => {
  // 筛选状态
  const [exceptionType, setExceptionType] = useState<string>('ALL');
  const [objectType, setObjectType] = useState<string>('ALL');
  const [severity, setSeverity] = useState<string>('ALL');
  const [status, setStatus] = useState<string>('ALL');
  const [assignee, setAssignee] = useState<string>('ALL');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // 多选状态
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // 抽屉页签
  const [activeDrawerTab, setActiveDrawerTab] = useState<'DETAIL' | 'TIMELINE'>('DETAIL');

  // 模态弹窗状态
  const [retryModalEx, setRetryModalEx] = useState<SyncException | null>(null);
  const [showBatchRetryModal, setShowBatchRetryModal] = useState(false);
  const [businessConfirmModalEx, setBusinessConfirmModalEx] = useState<SyncException | null>(null);
  const [businessReasonInput, setBusinessReasonInput] = useState('');
  const [addNoteModalEx, setAddNoteModalEx] = useState<SyncException | null>(null);
  const [noteInput, setNoteInput] = useState('');
  const [closeModalEx, setCloseModalEx] = useState<SyncException | null>(null);
  const [closeConclusionInput, setCloseConclusionInput] = useState('');
  const [reverifyModalEx, setReverifyModalEx] = useState<SyncException | null>(null);

  // 执行中状态
  const [isProcessing, setIsProcessing] = useState(false);

  const handleResetFilters = () => {
    setExceptionType('ALL');
    setObjectType('ALL');
    setSeverity('ALL');
    setStatus('ALL');
    setAssignee('ALL');
    setSearchKeyword('');
  };

  // 过滤异常列表
  const filteredExceptions = useMemo(() => {
    return exceptions.filter(item => {
      if (exceptionType !== 'ALL' && item.exceptionType !== exceptionType) return false;
      if (objectType !== 'ALL' && item.objectType !== objectType) return false;
      if (severity !== 'ALL' && item.severity !== severity) return false;
      if (status !== 'ALL' && item.status !== status) return false;
      if (assignee !== 'ALL' && !item.assignee.includes(assignee)) return false;
      if (searchKeyword.trim()) {
        const kw = searchKeyword.trim().toLowerCase();
        const matchId = item.id.toLowerCase().includes(kw);
        const matchCode = item.objectCode.toLowerCase().includes(kw);
        const matchBatch = item.sourceBatchId.toLowerCase().includes(kw);
        if (!matchId && !matchCode && !matchBatch) return false;
      }
      return true;
    });
  }, [exceptions, exceptionType, objectType, severity, status, assignee, searchKeyword]);

  // 当前选中的异常抽屉项
  const selectedException = useMemo(() => {
    return exceptions.find(e => e.id === selectedExceptionId) || null;
  }, [exceptions, selectedExceptionId]);

  // 全选/反选
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredExceptions.map(e => e.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // 状态渲染
  const renderExceptionStatusBadge = (st: ExceptionStatus) => {
    switch (st) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <Clock className="w-3 h-3 text-rose-600" />
            待处理
          </span>
        );
      case 'RETRYING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <RefreshCw className="w-3 h-3 text-blue-600 animate-spin" />
            重试中
          </span>
        );
      case 'PENDING_BUSINESS_CONFIRM':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <UserCheck className="w-3 h-3 text-amber-600" />
            待业务确认
          </span>
        );
      case 'PENDING_REVIEW':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <ShieldCheck className="w-3 h-3 text-indigo-600" />
            待复核
          </span>
        );
      case 'RECOVERED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            已恢复
          </span>
        );
      case 'CLOSED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
            <CheckCheck className="w-3 h-3 text-slate-500" />
            已关闭
          </span>
        );
    }
  };

  const renderSeverityBadge = (sev: ExceptionSeverity) => {
    switch (sev) {
      case 'HIGH':
        return <span className="text-rose-700 font-bold bg-rose-50 px-1.5 py-0.5 rounded">高</span>;
      case 'MEDIUM':
        return <span className="text-amber-700 font-medium bg-amber-50 px-1.5 py-0.5 rounded">中</span>;
      case 'LOW':
        return <span className="text-slate-600 font-medium bg-slate-100 px-1.5 py-0.5 rounded">低</span>;
    }
  };

  // 1. 单条重新同步
  const handleExecuteSingleRetry = (targetEx: SyncException) => {
    // 权限检查
    if (!targetEx.hasPermission) {
      onShowToast(
        `无操作权限：当前登录角色（数据标准管理员）仅拥有零件与文档对象的补偿权限，工艺对象需工艺系统管理员（ROLE_PROCESS_ADMIN）执行。`,
        'error'
      );
      setRetryModalEx(null);
      return;
    }

    setIsProcessing(true);

    // 状态先变更为重试中
    const nowTime = '2026-08-25 16:35:10';
    const updated = exceptions.map(e => {
      if (e.id === targetEx.id) {
        return {
          ...e,
          status: 'RETRYING' as ExceptionStatus,
          retryCount: e.retryCount + 1,
          lastHandledTime: nowTime,
          timeline: [
            ...e.timeline,
            {
              id: `TL-ACT-${Date.now()}-1`,
              node: '人工补偿',
              timestamp: nowTime,
              operator: '李晓华 (数据标准管理员)',
              note: '已发起单条人工补偿同步，任务正在向 Manticore 推送最新切片数据...',
              result: 'INFO' as const
            }
          ]
        };
      }
      return e;
    });
    onUpdateExceptions(updated);
    setRetryModalEx(null);

    // 模拟重试响应
    setTimeout(() => {
      setIsProcessing(false);
      // 特殊分支：EX-20260825-003 演示失败，其他演示成功
      if (targetEx.id === 'EX-20260825-003') {
        const failedUpdated = updated.map(e => {
          if (e.id === targetEx.id) {
            return {
              ...e,
              status: 'PENDING' as ExceptionStatus,
              timeline: [
                ...e.timeline,
                {
                  id: `TL-ACT-${Date.now()}-2`,
                  node: '人工补偿失败',
                  timestamp: '2026-08-25 16:35:18',
                  operator: '补偿引擎',
                  note: '大文本流式解析校验超时 (HTTP 504 Gateway Timeout)，未能完成增量刷新，已保留待处理状态。',
                  result: 'FAILED' as const
                }
              ]
            };
          }
          return e;
        });
        onUpdateExceptions(failedUpdated);
        onShowToast(`异常 ${targetEx.id} 补偿重试失败：大文本流式解析超时，已回退为待处理状态`, 'error');
      } else {
        const successUpdated = updated.map(e => {
          if (e.id === targetEx.id) {
            return {
              ...e,
              status: 'PENDING_REVIEW' as ExceptionStatus,
              timeline: [
                ...e.timeline,
                {
                  id: `TL-ACT-${Date.now()}-2`,
                  node: '重新核验通过',
                  timestamp: '2026-08-25 16:35:20',
                  operator: '补偿引擎 & 核验校验器',
                  note: '单条补偿已成功写入 Manticore 索引，指纹核验比对一致，已自动流转至待复核。',
                  result: 'SUCCESS' as const
                }
              ]
            };
          }
          return e;
        });
        onUpdateExceptions(successUpdated);
        onShowToast(`异常 ${targetEx.id} 补偿重试成功，已自动更新为“待复核”状态`, 'success');
      }
    }, 1800);
  };

  // 2. 批量重试
  const handleExecuteBatchRetry = () => {
    setShowBatchRetryModal(false);
    setIsProcessing(true);

    const selectedItems = exceptions.filter(e => selectedIds.includes(e.id));
    let successCount = 0;
    let failCount = 0;
    let skipNoPermCount = 0;

    const nowTime = '2026-08-25 16:36:00';

    const newExceptions = exceptions.map(e => {
      if (!selectedIds.includes(e.id)) return e;

      if (!e.hasPermission) {
        skipNoPermCount++;
        return e;
      }

      if (e.id === 'EX-20260825-003') {
        failCount++;
        return {
          ...e,
          retryCount: e.retryCount + 1,
          lastHandledTime: nowTime,
          timeline: [
            ...e.timeline,
            {
              id: `TL-BATCH-${Date.now()}-f`,
              node: '批量补偿重试',
              timestamp: nowTime,
              operator: '李晓华 (数据标准管理员)',
              note: '批量补偿触发：大文本字段解析超时，重试失败。',
              result: 'FAILED' as const
            }
          ]
        };
      } else {
        successCount++;
        return {
          ...e,
          status: 'PENDING_REVIEW' as ExceptionStatus,
          retryCount: e.retryCount + 1,
          lastHandledTime: nowTime,
          timeline: [
            ...e.timeline,
            {
              id: `TL-BATCH-${Date.now()}-s`,
              node: '批量补偿成功',
              timestamp: nowTime,
              operator: '李晓华 (数据标准管理员)',
              note: '批量补偿触发：数据已重新入库，转入待复核。',
              result: 'SUCCESS' as const
            }
          ]
        };
      }
    });

    setTimeout(() => {
      setIsProcessing(false);
      onUpdateExceptions(newExceptions);
      setSelectedIds([]);
      onShowToast(
        `批量重试处理完成：成功 ${successCount} 条，失败 ${failCount} 条，无权限跳过 ${skipNoPermCount} 条`,
        failCount > 0 || skipNoPermCount > 0 ? 'warning' : 'success'
      );
    }, 1500);
  };

  // 3. 转待业务确认
  const handleSaveBusinessConfirm = () => {
    if (!businessConfirmModalEx) return;
    if (!businessReasonInput.trim()) {
      onShowToast('请填写转交业务确认的具体原因与说明', 'warning');
      return;
    }

    const nowTime = '2026-08-25 16:38:00';
    const updated = exceptions.map(e => {
      if (e.id === businessConfirmModalEx.id) {
        return {
          ...e,
          status: 'PENDING_BUSINESS_CONFIRM' as ExceptionStatus,
          businessConfirmReason: businessReasonInput.trim(),
          lastHandledTime: nowTime,
          timeline: [
            ...e.timeline,
            {
              id: `TL-BC-${Date.now()}`,
              node: '待业务确认',
              timestamp: nowTime,
              operator: '李晓华 (数据标准管理员)',
              note: `转交业务端确认说明：${businessReasonInput.trim()}`,
              result: 'INFO' as const
            }
          ]
        };
      }
      return e;
    });

    onUpdateExceptions(updated);
    setBusinessConfirmModalEx(null);
    setBusinessReasonInput('');
    onShowToast(`异常 ${businessConfirmModalEx.id} 已成功转入“待业务确认”阶段`, 'success');
  };

  // 4. 填写处理说明
  const handleSaveNote = () => {
    if (!addNoteModalEx) return;
    if (!noteInput.trim()) {
      onShowToast('处理说明内容不能为空', 'warning');
      return;
    }

    const nowTime = '2026-08-25 16:40:00';
    const updated = exceptions.map(e => {
      if (e.id === addNoteModalEx.id) {
        return {
          ...e,
          lastHandledTime: nowTime,
          timeline: [
            ...e.timeline,
            {
              id: `TL-NOTE-${Date.now()}`,
              node: '人工处理记录',
              timestamp: nowTime,
              operator: '李晓华 (数据标准管理员)',
              note: noteInput.trim(),
              result: 'INFO' as const
            }
          ]
        };
      }
      return e;
    });

    onUpdateExceptions(updated);
    setAddNoteModalEx(null);
    setNoteInput('');
    onShowToast(`已成功为 ${addNoteModalEx.id} 追加处理说明`, 'success');
  };

  // 5. 复核通过并关闭
  const handleSaveClose = () => {
    if (!closeModalEx) return;
    if (!closeConclusionInput.trim()) {
      onShowToast('请填写最终复核结论说明', 'warning');
      return;
    }

    const nowTime = '2026-08-25 16:42:00';
    const updated = exceptions.map(e => {
      if (e.id === closeModalEx.id) {
        return {
          ...e,
          status: 'CLOSED' as ExceptionStatus,
          closeConclusion: closeConclusionInput.trim(),
          lastHandledTime: nowTime,
          timeline: [
            ...e.timeline,
            {
              id: `TL-CLOSE-${Date.now()}`,
              node: '复核通过并关闭',
              timestamp: nowTime,
              operator: '李晓华 (数据标准管理员)',
              note: `复核结论：${closeConclusionInput.trim()}`,
              result: 'SUCCESS' as const
            }
          ]
        };
      }
      return e;
    });

    onUpdateExceptions(updated);
    setCloseModalEx(null);
    setCloseConclusionInput('');
    onShowToast(`异常 ${closeModalEx.id} 已复核通过并正式关闭留痕`, 'success');
  };

  // 6. 重新核验
  const handleExecuteReverify = (targetEx: SyncException) => {
    setIsProcessing(true);
    setReverifyModalEx(null);

    const nowTime = '2026-08-25 16:45:00';
    const updated = exceptions.map(e => {
      if (e.id === targetEx.id) {
        return {
          ...e,
          status: 'PENDING_REVIEW' as ExceptionStatus,
          lastHandledTime: nowTime,
          timeline: [
            ...e.timeline,
            {
              id: `TL-REV-${Date.now()}`,
              node: '重新核验',
              timestamp: nowTime,
              operator: '系统核验引擎',
              note: `针对批次 ${targetEx.sourceBatchId} 及对象 ${targetEx.objectCode} 完成定向比对，差异已修复，进入待复核状态。`,
              result: 'SUCCESS' as const
            }
          ]
        };
      }
      return e;
    });

    setTimeout(() => {
      setIsProcessing(false);
      onUpdateExceptions(updated);
      onShowToast(`对象 ${targetEx.objectCode} 重新核验已通过，已转入“待复核”状态`, 'success');
    }, 1500);
  };

  return (
    <div className="space-y-4">
      {/* 顶部紧凑摘要带 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-white p-3.5 rounded-lg border border-slate-200 text-xs shadow-2xs">
        <div className="flex items-center space-x-3 pr-2 border-r border-slate-100 last:border-r-0">
          <div className="w-8 h-8 rounded-md bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-slate-400 font-medium text-[11px]">待处理异常</div>
            <div className="text-slate-900 font-bold text-sm tracking-tight truncate">
              {exceptions.filter(e => e.status === 'PENDING').length} <span className="text-xs font-normal text-rose-600 ml-1">需人工干预</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3 pr-2 border-r border-slate-100 last:border-r-0">
          <div className="w-8 h-8 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <UserCheck className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-slate-400 font-medium text-[11px]">待业务确认</div>
            <div className="text-slate-900 font-bold text-sm tracking-tight truncate">
              {exceptions.filter(e => e.status === 'PENDING_BUSINESS_CONFIRM').length} <span className="text-xs font-normal text-amber-600 ml-1">条记录</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3 pr-2 border-r border-slate-100 last:border-r-0">
          <div className="w-8 h-8 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-slate-400 font-medium text-[11px]">待复核验证</div>
            <div className="text-slate-900 font-bold text-sm tracking-tight truncate">
              {exceptions.filter(e => e.status === 'PENDING_REVIEW').length} <span className="text-xs font-normal text-indigo-600 ml-1">已重试成功</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCheck className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-slate-400 font-medium text-[11px]">已恢复与关闭</div>
            <div className="text-slate-900 font-bold text-sm tracking-tight truncate">
              {exceptions.filter(e => e.status === 'CLOSED' || e.status === 'RECOVERED').length} <span className="text-xs font-normal text-emerald-600 ml-1">条已归档</span>
            </div>
          </div>
        </div>
      </div>

      {/* 顶部横向筛选与批量操作栏 */}
      <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 items-end">
          {/* 异常类型 */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">异常类型</label>
            <select
              value={exceptionType}
              onChange={e => setExceptionType(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all cursor-pointer"
            >
              <option value="ALL">全部异常类型</option>
              <option value="VERSION_LAG">版本滞后</option>
              <option value="STATUS_MISMATCH">状态不一致</option>
              <option value="TEXT_STALE">大文本旧值</option>
              <option value="MANTICORE_MISSING">Manticore 缺失记录</option>
            </select>
          </div>

          {/* 对象类型 */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">对象类型</label>
            <select
              value={objectType}
              onChange={e => setObjectType(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all cursor-pointer"
            >
              <option value="ALL">全部对象</option>
              <option value="Part">零部件 (Part)</option>
              <option value="Document">文档 (Document)</option>
              <option value="Process">工艺对象 (Process)</option>
            </select>
          </div>

          {/* 严重程度 */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">严重程度</label>
            <select
              value={severity}
              onChange={e => setSeverity(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all cursor-pointer"
            >
              <option value="ALL">全部严重度</option>
              <option value="HIGH">高</option>
              <option value="MEDIUM">中</option>
              <option value="LOW">低</option>
            </select>
          </div>

          {/* 处理状态 */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">处理状态</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all cursor-pointer"
            >
              <option value="ALL">全部状态</option>
              <option value="PENDING">待处理</option>
              <option value="RETRYING">重试中</option>
              <option value="PENDING_BUSINESS_CONFIRM">待业务确认</option>
              <option value="PENDING_REVIEW">待复核</option>
              <option value="RECOVERED">已恢复</option>
              <option value="CLOSED">已关闭</option>
            </select>
          </div>

          {/* 责任人 */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">责任人</label>
            <select
              value={assignee}
              onChange={e => setAssignee(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all cursor-pointer"
            >
              <option value="ALL">全部责任人</option>
              <option value="李晓华">李晓华 (数据管理员)</option>
              <option value="王工">王工 (液压设计室)</option>
              <option value="陈工艺">陈工艺 (工艺系统)</option>
            </select>
          </div>

          {/* 搜索框与重置 */}
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="搜索 EX-... / P-..."
                value={searchKeyword}
                onChange={e => setSearchKeyword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded pl-7 pr-2.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
            </div>
            <button
              onClick={handleResetFilters}
              className="p-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded transition-colors cursor-pointer shrink-0"
              title="重置筛选"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 批量操作工具条 */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2 text-slate-600">
            <span>
              已选择 <strong className="text-blue-600 font-bold font-mono">{selectedIds.length}</strong> 项
            </span>
            {selectedIds.length > 0 && (
              <button
                onClick={() => setSelectedIds([])}
                className="text-slate-500 hover:text-slate-800 underline ml-2"
              >
                取消全选
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              disabled={selectedIds.length === 0 || isProcessing}
              onClick={() => setShowBatchRetryModal(true)}
              className={`px-3 py-1.5 rounded text-xs font-bold transition-colors flex items-center space-x-1.5 cursor-pointer ${
                selectedIds.length > 0 && !isProcessing
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
              <span>批量重新同步 ({selectedIds.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* 主表格容器 */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-3 w-8 text-center">
                  <input
                    type="checkbox"
                    checked={
                      filteredExceptions.length > 0 &&
                      selectedIds.length === filteredExceptions.length
                    }
                    onChange={e => handleSelectAll(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-3">异常编号</th>
                <th className="py-3 px-3">对象编码</th>
                <th className="py-3 px-3">对象类型 / 软类型</th>
                <th className="py-3 px-3">异常类型</th>
                <th className="py-3 px-3">来源批次</th>
                <th className="py-3 px-3 text-center">严重度</th>
                <th className="py-3 px-3">当前状态</th>
                <th className="py-3 px-3 text-right">重试次数</th>
                <th className="py-3 px-3">责任人</th>
                <th className="py-3 px-3">最近处理时间</th>
                <th className="py-3 px-3.5 text-center sticky-ops">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExceptions.length > 0 ? (
                filteredExceptions.map(item => {
                  const isChecked = selectedIds.includes(item.id);
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isChecked ? 'bg-blue-50/30' : selectedExceptionId === item.id ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelect(item.id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-rose-700 hover:underline cursor-pointer">
                        <button
                          onClick={() => {
                            onSelectExceptionId(item.id);
                            setActiveDrawerTab('DETAIL');
                          }}
                          className="text-left font-mono font-bold"
                        >
                          {item.id}
                        </button>
                      </td>
                      <td className="py-3 px-3 font-mono font-semibold text-slate-900">{item.objectCode}</td>
                      <td className="py-3 px-3 text-slate-700">
                        <span className="font-medium text-slate-900">{item.objectType}</span>
                        <span className="text-slate-400 mx-1">/</span>
                        <span className="text-slate-600">{item.softType}</span>
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-800">{item.exceptionTypeLabel}</td>
                      <td className="py-3 px-3 font-mono">
                        <button
                          onClick={() => onOpenBatchDrawer(item.sourceBatchId)}
                          className="text-slate-700 hover:text-blue-600 hover:underline flex items-center space-x-1"
                        >
                          <span>{item.sourceBatchId}</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </button>
                      </td>
                      <td className="py-3 px-3 text-center">{renderSeverityBadge(item.severity)}</td>
                      <td className="py-3 px-3 whitespace-nowrap">{renderExceptionStatusBadge(item.status)}</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-800">{item.retryCount}</td>
                      <td className="py-3 px-3 text-slate-700 whitespace-nowrap">{item.assignee}</td>
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">{item.lastHandledTime}</td>
                      <td className="py-3 px-3.5 text-center sticky-ops whitespace-nowrap">
                        <button
                          onClick={() => {
                            onSelectExceptionId(item.id);
                            setActiveDrawerTab('DETAIL');
                          }}
                          className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                        >
                          处置详情
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <CheckCircle2 className="w-8 h-8 text-slate-300" />
                      <p className="text-xs font-medium text-slate-500">未找到符合当前筛选条件的异常记录</p>
                      <button
                        onClick={handleResetFilters}
                        className="text-xs text-blue-600 hover:underline font-medium"
                      >
                        重置所有筛选条件
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 异常详情右侧抽屉 */}
      {selectedException && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-[760px] h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200">
            {/* 抽屉头部 */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-md bg-rose-600 text-white flex items-center justify-center font-bold text-sm">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-sm font-bold text-slate-900 font-mono">{selectedException.id}</h2>
                    {renderExceptionStatusBadge(selectedException.status)}
                    {renderSeverityBadge(selectedException.severity)}
                  </div>
                  <p className="text-xs text-slate-500">
                    对象: <span className="font-mono font-bold text-slate-800">{selectedException.objectCode}</span> ({selectedException.objectName})
                  </p>
                </div>
              </div>
              <button
                onClick={() => onSelectExceptionId(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 抽屉页签导航 */}
            <div className="px-5 border-b border-slate-200 flex space-x-4 bg-white shrink-0">
              <button
                onClick={() => setActiveDrawerTab('DETAIL')}
                className={`py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                  activeDrawerTab === 'DETAIL'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                异常详情与处置
              </button>
              <button
                onClick={() => setActiveDrawerTab('TIMELINE')}
                className={`py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                  activeDrawerTab === 'TIMELINE'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                处置时间线 ({selectedException.timeline.length})
              </button>
            </div>

            {/* 抽屉内容区 */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* 页签 1: 异常详情 */}
              {activeDrawerTab === 'DETAIL' && (
                <div className="space-y-4 text-xs">
                  {/* 权限警告卡片 (若无权限) */}
                  {!selectedException.hasPermission && (
                    <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-lg text-amber-900 flex items-start space-x-2.5">
                      <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">无操作补偿权限：</span>
                        <p className="mt-0.5 text-amber-800 leading-relaxed">
                          当前登录角色（数据标准管理员）仅拥有零件与文档对象的补偿权限，工艺对象需由工艺系统管理员（ROLE_PROCESS_ADMIN）执行补偿与重试。
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 异常业务描述 */}
                  <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-lg space-y-1.5">
                    <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      <span>异常业务说明 ({selectedException.exceptionTypeLabel})</span>
                    </div>
                    <p className="text-slate-700 leading-relaxed">{selectedException.businessDescription}</p>
                  </div>

                  {/* 核心属性网格 */}
                  <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
                    <h3 className="text-xs font-bold text-slate-900">对象与关联信息</h3>
                    <div className="grid grid-cols-2 gap-y-2.5">
                      <div>
                        <span className="text-slate-500">对象编码：</span>
                        <span className="font-mono font-bold text-slate-900 ml-1">{selectedException.objectCode}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">对象名称：</span>
                        <span className="font-medium text-slate-800 ml-1">{selectedException.objectName}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">对象类型 / 软类型：</span>
                        <span className="text-slate-800 ml-1">{selectedException.objectType} / {selectedException.softType}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">异常严重度：</span>
                        <span className="ml-1">{renderSeverityBadge(selectedException.severity)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">来源批次：</span>
                        <button
                          onClick={() => {
                            onSelectExceptionId(null);
                            onOpenBatchDrawer(selectedException.sourceBatchId);
                          }}
                          className="font-mono text-blue-600 hover:underline font-semibold ml-1 inline-flex items-center space-x-0.5"
                        >
                          <span>{selectedException.sourceBatchId}</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                      <div>
                        <span className="text-slate-500">关联核验：</span>
                        <button
                          onClick={() => {
                            onSelectExceptionId(null);
                            onOpenVerificationDrawer(selectedException.linkedVerificationId);
                          }}
                          className="font-mono text-blue-600 hover:underline font-semibold ml-1 inline-flex items-center space-x-0.5"
                        >
                          <span>{selectedException.linkedVerificationId}</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                      <div>
                        <span className="text-slate-500">责任人：</span>
                        <span className="text-slate-800 ml-1">{selectedException.assignee}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">已重试次数：</span>
                        <span className="font-mono text-slate-800 font-semibold ml-1">{selectedException.retryCount} 次</span>
                      </div>
                    </div>
                  </div>

                  {/* 业务确认原因展示（如有） */}
                  {selectedException.businessConfirmReason && (
                    <div className="bg-amber-50/60 border border-amber-200 p-3 rounded-lg space-y-1">
                      <div className="font-bold text-amber-900">业务确认说明：</div>
                      <p className="text-amber-800">{selectedException.businessConfirmReason}</p>
                    </div>
                  )}

                  {/* 最终关闭结论（如有） */}
                  {selectedException.closeConclusion && (
                    <div className="bg-emerald-50/60 border border-emerald-200 p-3 rounded-lg space-y-1">
                      <div className="font-bold text-emerald-900">最终复核与关闭结论：</div>
                      <p className="text-emerald-800">{selectedException.closeConclusion}</p>
                    </div>
                  )}

                  {/* 处置操作工作台 */}
                  <div className="border border-slate-200 bg-slate-50 rounded-lg p-4 space-y-3">
                    <h3 className="text-xs font-bold text-slate-900">异常处置工作台</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {/* 重新同步 */}
                      <button
                        onClick={() => setRetryModalEx(selectedException)}
                        className="flex items-center justify-center space-x-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>重新同步/补偿</span>
                      </button>

                      {/* 重新核验 */}
                      <button
                        onClick={() => setReverifyModalEx(selectedException)}
                        className="flex items-center justify-center space-x-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>发起重新核验</span>
                      </button>

                      {/* 转待业务确认 */}
                      <button
                        onClick={() => {
                          setBusinessReasonInput(selectedException.businessConfirmReason || '');
                          setBusinessConfirmModalEx(selectedException);
                        }}
                        className="flex items-center justify-center space-x-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>转待业务确认</span>
                      </button>

                      {/* 填写处理说明 */}
                      <button
                        onClick={() => {
                          setNoteInput('');
                          setAddNoteModalEx(selectedException);
                        }}
                        className="flex items-center justify-center space-x-1.5 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>追加处理说明</span>
                      </button>

                      {/* 复核通过并关闭 */}
                      <button
                        disabled={selectedException.status !== 'PENDING_REVIEW'}
                        onClick={() => {
                          setCloseConclusionInput('');
                          setCloseModalEx(selectedException);
                        }}
                        className={`flex items-center justify-center space-x-1.5 px-3 py-2 rounded text-xs font-semibold transition-colors cursor-pointer ${
                          selectedException.status === 'PENDING_REVIEW'
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                        }`}
                        title={selectedException.status !== 'PENDING_REVIEW' ? '仅在“待复核”状态可用' : ''}
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        <span>复核通过并关闭</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 页签 2: 处置时间线 */}
              {activeDrawerTab === 'TIMELINE' && (
                <div className="space-y-4">
                  <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {selectedException.timeline.map((tl, idx) => (
                      <div key={tl.id} className="relative text-xs">
                        <div
                          className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            tl.result === 'SUCCESS'
                              ? 'bg-emerald-600 text-white'
                              : tl.result === 'FAILED'
                              ? 'bg-rose-600 text-white'
                              : 'bg-blue-600 text-white'
                          }`}
                        >
                          {idx + 1}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{tl.node}</span>
                          <span className="font-mono text-slate-400 text-[11px]">{tl.timestamp}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">操作人: {tl.operator}</div>
                        <p className="text-slate-700 mt-1 leading-relaxed bg-slate-50 p-2 rounded border border-slate-100">
                          {tl.note}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 抽屉底部操作 */}
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end space-x-3 shrink-0">
              <button
                onClick={() => onSelectExceptionId(null)}
                className="px-4 py-1.5 border border-slate-300 hover:bg-slate-100 rounded text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 对话框 1: 单条重新同步确认 */}
      {retryModalEx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-2xs animate-in fade-in duration-150 p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4 animate-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">确认重新同步/人工补偿</h3>
              </div>
              <button onClick={() => setRetryModalEx(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-slate-600">
              <p>
                即将对异常单 <strong className="text-slate-900 font-mono">{retryModalEx.id}</strong> (对象: <code className="font-mono text-blue-600">{retryModalEx.objectCode}</code>) 发起定向数据抽取与写入补偿。
              </p>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-200 space-y-1">
                <div>异常类型：<span className="font-semibold text-slate-800">{retryModalEx.exceptionTypeLabel}</span></div>
                <div>来源批次：<span className="font-mono text-slate-800">{retryModalEx.sourceBatchId}</span></div>
                <div>重试后流转：<span className="text-indigo-600 font-semibold">先变更为“重试中”，成功后流转至“待复核”</span></div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setRetryModalEx(null)}
                className="px-3.5 py-1.5 border border-slate-300 hover:bg-slate-50 rounded text-xs font-semibold text-slate-700 cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={() => handleExecuteSingleRetry(retryModalEx)}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold cursor-pointer"
              >
                确认发起
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 对话框 2: 批量重试确认 */}
      {showBatchRetryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-2xs animate-in fade-in duration-150 p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4 animate-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">批量重新同步确认</h3>
              </div>
              <button onClick={() => setShowBatchRetryModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-slate-600">
              <p>
                已选择 <strong className="text-blue-600 font-bold font-mono">{selectedIds.length}</strong> 条异常记录进行批量补偿。
              </p>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-200 space-y-1">
                <div>有权限执行：<strong className="text-emerald-700">{exceptions.filter(e => selectedIds.includes(e.id) && e.hasPermission).length} 条</strong></div>
                <div>无权限跳过：<strong className="text-rose-600">{exceptions.filter(e => selectedIds.includes(e.id) && !e.hasPermission).length} 条 (工艺对象需专权)</strong></div>
              </div>
              <p className="text-[11px] text-slate-500">
                系统将自动过滤无权限项并对可执行项发起并发重试，完成后自动汇总反馈。
              </p>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowBatchRetryModal(false)}
                className="px-3.5 py-1.5 border border-slate-300 hover:bg-slate-50 rounded text-xs font-semibold text-slate-700 cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={handleExecuteBatchRetry}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold cursor-pointer"
              >
                确认开始批量重试
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 对话框 3: 转待业务确认 */}
      {businessConfirmModalEx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-2xs animate-in fade-in duration-150 p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4 animate-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <UserCheck className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">转待业务确认</h3>
              </div>
              <button onClick={() => setBusinessConfirmModalEx(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-slate-600">
                异常单 <strong className="text-slate-900 font-mono">{businessConfirmModalEx.id}</strong> (对象: {businessConfirmModalEx.objectCode}) 需转交业务室确认。请填写确认原因与需要核实的事项：
              </p>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  转交原因与核实说明 <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={businessReasonInput}
                  onChange={e => setBusinessReasonInput(e.target.value)}
                  placeholder="例如：PLM 流程记录显示该文档曾被短暂撤回，需确认以哪个最终盖章版本为准..."
                  className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded p-2.5 text-xs focus:ring-1 focus:ring-amber-500 focus:bg-white"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setBusinessConfirmModalEx(null)}
                className="px-3.5 py-1.5 border border-slate-300 hover:bg-slate-50 rounded text-xs font-semibold text-slate-700 cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={handleSaveBusinessConfirm}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-bold cursor-pointer"
              >
                确认提交
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 对话框 4: 填写处理说明 */}
      {addNoteModalEx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-2xs animate-in fade-in duration-150 p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4 animate-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">追加处理说明</h3>
              </div>
              <button onClick={() => setAddNoteModalEx(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-slate-600">
                记录对异常单 <strong className="text-slate-900 font-mono">{addNoteModalEx.id}</strong> 的分析研判与排查记录，将追加至时间线留痕：
              </p>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  处理说明内容 <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={noteInput}
                  onChange={e => setNoteInput(e.target.value)}
                  placeholder="填写排查进度、网络抖动原因或与 PLM 管理员沟通记录..."
                  className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded p-2.5 text-xs focus:ring-1 focus:ring-blue-500 focus:bg-white"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setAddNoteModalEx(null)}
                className="px-3.5 py-1.5 border border-slate-300 hover:bg-slate-50 rounded text-xs font-semibold text-slate-700 cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={handleSaveNote}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold cursor-pointer"
              >
                保存并追加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 对话框 5: 复核通过并关闭 */}
      {closeModalEx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-2xs animate-in fade-in duration-150 p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4 animate-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <CheckCheck className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">复核通过并关闭异常单</h3>
              </div>
              <button onClick={() => setCloseModalEx(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-slate-600">
                异常单 <strong className="text-slate-900 font-mono">{closeModalEx.id}</strong> 已完成重新同步并核验一致。请录入关闭归档结论：
              </p>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  复核结论说明 <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={closeConclusionInput}
                  onChange={e => setCloseConclusionInput(e.target.value)}
                  placeholder="例如：经重新补偿同步与哈希核验比对，源库与检索库版本已完全一致，予以复核通过并归档关闭。"
                  className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded p-2.5 text-xs focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setCloseModalEx(null)}
                className="px-3.5 py-1.5 border border-slate-300 hover:bg-slate-50 rounded text-xs font-semibold text-slate-700 cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={handleSaveClose}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold cursor-pointer"
              >
                确认关闭归档
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 对话框 6: 重新核验确认 */}
      {reverifyModalEx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-2xs animate-in fade-in duration-150 p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4 animate-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">发起重新核验</h3>
              </div>
              <button onClick={() => setReverifyModalEx(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-slate-600">
              <p>
                即将对异常单 <strong className="text-slate-900 font-mono">{reverifyModalEx.id}</strong> 发起定向重新核验，核验通过后将自动流转至“待复核”状态。
              </p>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-200 space-y-1">
                <div>对象：<span className="font-mono text-slate-900">{reverifyModalEx.objectCode}</span> ({reverifyModalEx.objectName})</div>
                <div>来源批次：<span className="font-mono text-slate-900">{reverifyModalEx.sourceBatchId}</span></div>
                <div>核验方式：<span className="font-semibold text-indigo-700">标准化哈希定向比对</span></div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setReverifyModalEx(null)}
                className="px-3.5 py-1.5 border border-slate-300 hover:bg-slate-50 rounded text-xs font-semibold text-slate-700 cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={() => handleExecuteReverify(reverifyModalEx)}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold cursor-pointer"
              >
                确认核验
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
