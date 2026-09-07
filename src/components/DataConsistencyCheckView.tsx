import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Play,
  RotateCcw,
  ArrowRight,
  X,
  Sliders,
  Layers,
  FileCheck2,
  Filter
} from 'lucide-react';
import {
  ConsistencyBatchRecord,
  ConsistencyObjectResult,
  ConsistencyItemStatus,
  formatLocalDateTime,
  formatLocalDateCode
} from '../types/consistencyCheck';
import {
  initialConsistencyBatches,
  demoObjectResults
} from '../data/consistencyCheckData';

interface DataConsistencyCheckViewProps {
  onNavigateToSyncQuality?: () => void;
}

// 根类型定义
interface RootTypeOption {
  code: string;
  name: string;
  docCount: number;
}

const ROOT_TYPE_OPTIONS: RootTypeOption[] = [
  { code: 'PART', name: '零部件 (Part)', docCount: 38400 },
  { code: 'DOCUMENT', name: '文档 (Document)', docCount: 52000 },
  { code: 'PROCESS', name: '工艺路线 (Process)', docCount: 19200 }
];

// 核验模式
type CheckScopeMode = 'SAMPLE' | 'EXHAUSTIVE_SCOPE' | 'SPECIFIC_IDS';

// 限定范围选项（全量核验）
const EXHAUSTIVE_SCOPE_OPTIONS = [
  { id: 'SCOPE_BOLT', name: '标准件 > 紧固件 > 螺栓', count: 36 },
  { id: 'SCOPE_GEAR', name: '传动系统 > 齿轮箱部件', count: 24 },
  { id: 'SCOPE_SEAL', name: '密封与弹性元件', count: 18 },
  { id: 'SCOPE_VALVE', name: '液压动力与控制阀组', count: 42 }
];

export const DataConsistencyCheckView: React.FC<DataConsistencyCheckViewProps> = ({
  onNavigateToSyncQuality
}) => {
  // 1. 根类型与核验范围状态
  const [selectedRootTypeCode, setSelectedRootTypeCode] = useState<string>('PART');
  const [scopeMode, setScopeMode] = useState<CheckScopeMode>('SAMPLE');
  const [sampleLimit, setSampleLimit] = useState<number>(100);
  const [selectedExhaustiveScopeId, setSelectedExhaustiveScopeId] = useState<string>('SCOPE_BOLT');
  const [inputObjectIds, setInputObjectIds] = useState<string>('P-30001, P-30002, P-30003, P-30004, P-30005');

  // 2. 核验批次记录列表与当前选中批次
  const [batches, setBatches] = useState<ConsistencyBatchRecord[]>(initialConsistencyBatches);
  const [selectedBatch, setSelectedBatch] = useState<ConsistencyBatchRecord | null>(null);
  const [selectedObjectForCompare, setSelectedObjectForCompare] = useState<ConsistencyObjectResult | null>(null);

  // 批次详情抽屉内的筛选与分页
  const [detailFilterStatus, setDetailFilterStatus] = useState<'ALL' | ConsistencyItemStatus>('ALL');
  const [detailPageIndex, setDetailPageIndex] = useState<number>(1);
  const detailPageSize = 10;

  // 临时提示
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'warning' } | null>(null);

  const showToast = (text: string, type: 'success' | 'warning' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 当前选中的根类型信息
  const currentRootType = useMemo(() => {
    return ROOT_TYPE_OPTIONS.find(r => r.code === selectedRootTypeCode) || ROOT_TYPE_OPTIONS[0];
  }, [selectedRootTypeCode]);

  // 解析手动输入的对象 ID
  const parsedIds = useMemo(() => {
    const list = inputObjectIds
      .split(/[\n,，\s]+/)
      .map(s => s.trim())
      .filter(Boolean);
    const uniqueList = Array.from(new Set(list));
    return {
      rawCount: list.length,
      uniqueIds: uniqueList,
      duplicateCount: list.length - uniqueList.length
    };
  }, [inputObjectIds]);

  // 获取最近一次执行的批次记录（看板数据来源）
  const latestBatch = batches[0];

  // 计算本次抽检/全量核验一致率
  const latestStats = useMemo(() => {
    if (!latestBatch) {
      return {
        effectiveCount: 0,
        differenceCount: 0,
        pendingCount: 0,
        consistentCount: 0,
        ratePercent: '100.0'
      };
    }
    const effective = latestBatch.actualCount;
    const diff = latestBatch.differenceCount;
    // 待处理数 = 待复查 + 检查未完成
    const pending = (latestBatch.pendingRecheckCount || 0) + (latestBatch.incompleteCount || 0);
    const consistent = latestBatch.consistentCount;
    const rate = effective > 0 ? ((consistent / effective) * 100).toFixed(1) : '100.0';
    return {
      effectiveCount: effective,
      differenceCount: diff,
      pendingCount: pending,
      consistentCount: consistent,
      ratePercent: rate
    };
  }, [latestBatch]);

  // 2. 发起核验操作
  const handleTriggerCheck = () => {
    const now = new Date();
    const dateCode = formatLocalDateCode(now);
    const timeStr = formatLocalDateTime(now);
    const batchId = `CC-${dateCode}-${String(batches.length + 1).padStart(3, '0')}`;

    let scopeDescription = '';
    let strategySummary = '';
    let objectResults: ConsistencyObjectResult[] = [];

    if (scopeMode === 'SAMPLE') {
      scopeDescription = `全库随机与重点抽检 (${sampleLimit} 个样本)`;
      strategySummary = `抽检核验 (样本量: ${sampleLimit})`;
      // 生成符合样本量的结果数据（前 5 项复用典型 demo，其余保持高一致率）
      objectResults = [...demoObjectResults];
      const additionalCount = Math.max(0, sampleLimit - objectResults.length);
      for (let i = 0; i < additionalCount; i++) {
        const idNum = 30006 + i;
        objectResults.push({
          objectId: `P-${idNum}`,
          objectName: `零部件物料样本 P-${idNum}`,
          rootTypeCode: selectedRootTypeCode,
          selectedReason: 'RANDOM_SAMPLE',
          lastModifiedAt: formatLocalDateTime(new Date(Date.now() - (i + 1) * 3600000)),
          status: 'CONSISTENT',
          statusDetail: '映射转换后双端字段一致',
          differenceFields: [],
          fields: [
            {
              fieldCode: 'version_lifecycle',
              fieldName: '版本与生命周期状态',
              plmRawValue: 'Rev 1 / 已发布',
              mappedExpectedValue: 'Rev 1 / 已发布',
              manticoreActualValue: 'Rev 1 / 已发布',
              matchStatus: 'MATCH'
            },
            {
              fieldCode: 'part_name',
              fieldName: '物料名称',
              plmRawValue: `零部件物料样本 P-${idNum}`,
              mappedExpectedValue: `零部件物料样本 P-${idNum}`,
              manticoreActualValue: `零部件物料样本 P-${idNum}`,
              matchStatus: 'MATCH'
            },
            {
              fieldCode: 'primary_material',
              fieldName: '主要材质',
              plmRawValue: 'Q235B',
              mappedExpectedValue: '碳素结构钢 (Q235B)',
              manticoreActualValue: '碳素结构钢 (Q235B)',
              matchStatus: 'MATCH'
            }
          ]
        });
      }
    } else if (scopeMode === 'EXHAUSTIVE_SCOPE') {
      const scopeItem = EXHAUSTIVE_SCOPE_OPTIONS.find(s => s.id === selectedExhaustiveScopeId) || EXHAUSTIVE_SCOPE_OPTIONS[0];
      scopeDescription = `指定范围全量核验：${scopeItem.name} (${scopeItem.count} 个)`;
      strategySummary = `全量核验 (${scopeItem.name})`;
      // 全量范围生成对应数量的对象
      const totalInScope = scopeItem.count;
      for (let i = 0; i < totalInScope; i++) {
        const isDiff = i === 2; // 模拟少量差异
        objectResults.push({
          objectId: `P-SC-${1000 + i}`,
          objectName: `${scopeItem.name.split('>').pop()?.trim()} #${i + 1}`,
          rootTypeCode: selectedRootTypeCode,
          selectedReason: 'MANUAL_SPECIFIED',
          lastModifiedAt: formatLocalDateTime(new Date(Date.now() - (i + 1) * 7200000)),
          status: isDiff ? 'DIFFERENCE_FOUND' : 'CONSISTENT',
          statusDetail: isDiff ? '发现字段不一致：物料材质规格值与目标存储不符' : '字段全部比对一致',
          differenceFields: isDiff ? ['主要材质'] : [],
          fields: [
            {
              fieldCode: 'part_name',
              fieldName: '物料名称',
              plmRawValue: `${scopeItem.name.split('>').pop()?.trim()} #${i + 1}`,
              mappedExpectedValue: `${scopeItem.name.split('>').pop()?.trim()} #${i + 1}`,
              manticoreActualValue: `${scopeItem.name.split('>').pop()?.trim()} #${i + 1}`,
              matchStatus: 'MATCH'
            },
            {
              fieldCode: 'primary_material',
              fieldName: '主要材质',
              plmRawValue: isDiff ? '35CrMo' : 'Q235B',
              mappedExpectedValue: isDiff ? '铬钼合金钢 (35CrMo)' : '碳素结构钢 (Q235B)',
              manticoreActualValue: isDiff ? '碳素结构钢 (Q235B)' : '碳素结构钢 (Q235B)',
              matchStatus: isDiff ? 'MISMATCH' : 'MATCH'
            }
          ]
        });
      }
    } else {
      // SPECIFIC_IDS
      if (parsedIds.uniqueIds.length === 0) {
        showToast('请输入至少 1 个有效的对象 ID', 'warning');
        return;
      }
      scopeDescription = `指定对象核验：${parsedIds.uniqueIds.length} 个`;
      strategySummary = `定向核验 (${parsedIds.uniqueIds.length} 个对象)`;

      const demoMap = new Map(demoObjectResults.map(item => [item.objectId, item]));
      parsedIds.uniqueIds.forEach((id, idx) => {
        if (demoMap.has(id)) {
          objectResults.push({ ...demoMap.get(id)! });
        } else {
          objectResults.push({
            objectId: id,
            objectName: `物料 ${id}`,
            rootTypeCode: selectedRootTypeCode,
            selectedReason: 'MANUAL_SPECIFIED',
            lastModifiedAt: formatLocalDateTime(new Date(Date.now() - (idx + 1) * 3600000)),
            status: 'CONSISTENT',
            statusDetail: '双端字段比对一致',
            differenceFields: [],
            fields: [
              {
                fieldCode: 'part_name',
                fieldName: '物料名称',
                plmRawValue: `物料 ${id}`,
                mappedExpectedValue: `物料 ${id}`,
                manticoreActualValue: `物料 ${id}`,
                matchStatus: 'MATCH'
              }
            ]
          });
        }
      });
    }

    const actualCount = objectResults.length;
    const consistentCount = objectResults.filter(o => o.status === 'CONSISTENT').length;
    const differenceCount = objectResults.filter(o => o.status === 'DIFFERENCE_FOUND').length;
    const pendingRecheckCount = objectResults.filter(o => o.status === 'PENDING_RECHECK').length;
    const incompleteCount = objectResults.filter(o => o.status === 'INCOMPLETE').length;

    const newBatch: ConsistencyBatchRecord = {
      id: batchId,
      planName: scopeMode === 'SAMPLE' ? '抽检核验' : scopeMode === 'EXHAUSTIVE_SCOPE' ? '指定范围全量核验' : '定向指定核验',
      triggerType: 'MANUAL_BY_PLAN',
      rootTypeCode: selectedRootTypeCode,
      rootTypeName: currentRootType.name,
      scopeDescription,
      strategySummary,
      executedAt: timeStr,
      plmReadTime: `${timeStr}`,
      manticoreReadTime: `${timeStr}`,
      benchmarkSource: 'PLM 源端主数据',
      plannedCount: actualCount,
      actualCount,
      focusCount: Math.floor(actualCount / 2),
      randomCount: Math.ceil(actualCount / 2),
      manualCount: scopeMode === 'SPECIFIC_IDS' ? actualCount : 0,
      deduplicatedCount: parsedIds.duplicateCount,
      consistentCount,
      differenceCount,
      pendingRecheckCount,
      incompleteCount,
      frozenObjectIds: objectResults.map(o => o.objectId),
      objectResults,
      status: 'COMPLETED'
    };

    setBatches([newBatch, ...batches]);
    showToast(`已完成核验，生成批次号：${newBatch.id}`, 'success');
  };

  // 抽屉内部筛选结果
  const filteredBatchResults = useMemo(() => {
    if (!selectedBatch) return [];
    if (detailFilterStatus === 'ALL') return selectedBatch.objectResults;
    if (detailFilterStatus === 'PENDING_RECHECK') {
      return selectedBatch.objectResults.filter(
        item => item.status === 'PENDING_RECHECK' || item.status === 'INCOMPLETE'
      );
    }
    return selectedBatch.objectResults.filter(item => item.status === detailFilterStatus);
  }, [selectedBatch, detailFilterStatus]);

  const totalPages = Math.max(1, Math.ceil(filteredBatchResults.length / detailPageSize));
  const paginatedBatchResults = useMemo(() => {
    const start = (detailPageIndex - 1) * detailPageSize;
    return filteredBatchResults.slice(start, start + detailPageSize);
  }, [filteredBatchResults, detailPageIndex]);

  // 计算单个批次的一致率
  const getBatchConsistencyRate = (b: ConsistencyBatchRecord) => {
    if (!b.actualCount || b.actualCount === 0) return '100.0%';
    return `${((b.consistentCount / b.actualCount) * 100).toFixed(1)}%`;
  };

  return (
    <div className="space-y-5" id="data-consistency-check-view">
      {/* Toast 提示框 */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 animate-in fade-in slide-in-from-top-2">
          <div
            className={`px-4 py-2.5 rounded-ty-sm shadow-ty-lg border flex items-center space-x-2 text-ty-xs font-medium ${
              toastMessage.type === 'success'
                ? 'bg-[var(--ty-green-lightest-color)] text-[var(--ty-green-color)] border-[var(--ty-green-color)]/30'
                : 'bg-[var(--ty-orange-lightest-color)] text-[var(--ty-orange-color)] border-[var(--ty-orange-color)]/30'
            }`}
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* 顶部标题栏 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-[var(--ty-border-color)]">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-ty-lg font-bold text-[var(--ty-font-main-color)]">数据一致性核验</h1>
            <span className="px-2 py-0.5 rounded-ty-xs bg-[var(--ty-fill-weak-dark-color)] text-[var(--ty-font-sub-color)] border border-[var(--ty-border-color)] text-ty-2xs font-normal">
              业务数据级比对
            </span>
          </div>
          <p className="text-ty-xs text-[var(--ty-font-sub-color)] mt-1">
            面向 PLM 源端与 Manticore 实际数据进行业务字段级比对，输出一致率、有效比对数及差异明细。
          </p>
        </div>
        {onNavigateToSyncQuality && (
          <button
            onClick={onNavigateToSyncQuality}
            className="inline-flex items-center text-ty-xs text-[var(--ty-primary-color)] hover:underline self-start sm:self-auto cursor-pointer"
            id="link-to-sync-quality"
          >
            <span>查看数据同步记录</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </button>
        )}
      </div>

      {/* 1. 根类型与核验范围 + 2. 发起核验操作卡片 */}
      <div className="bg-[var(--ty-fill-white-color)] rounded-ty-lg border border-[var(--ty-border-color)] p-5 space-y-4" id="consistency-action-card">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--ty-border-color)]">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-4 bg-[var(--ty-primary-color)] rounded-ty-xs"></div>
            <h2 className="text-ty-sm font-bold text-[var(--ty-font-main-color)]">发起一致性核验</h2>
          </div>
          <span className="text-ty-2xs text-[var(--ty-font-sub-color)]">
            当前源端数据总量：<strong className="text-[var(--ty-font-main-color)]">{currentRootType.docCount.toLocaleString()} 条</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* 根类型选择 (4列) */}
          <div className="lg:col-span-4 space-y-2">
            <label className="text-ty-xs font-semibold text-[var(--ty-font-main-color)] block">
              1. 选择核验根类型
            </label>
            <div className="space-y-2">
              {ROOT_TYPE_OPTIONS.map(rt => (
                <label
                  key={rt.code}
                  className={`flex items-center justify-between p-3 rounded-ty-sm border cursor-pointer transition-colors ${
                    selectedRootTypeCode === rt.code
                      ? 'border-[var(--ty-primary-color)] bg-[var(--ty-primary-lightest-color)]/20'
                      : 'border-[var(--ty-border-color)] bg-[var(--ty-fill-white-color)] hover:bg-[var(--ty-fill-weak-dark-color)]'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <input
                      type="radio"
                      name="root-type-selector"
                      checked={selectedRootTypeCode === rt.code}
                      onChange={() => setSelectedRootTypeCode(rt.code)}
                      className="text-[var(--ty-primary-color)] focus:ring-0"
                    />
                    <span className={`text-ty-xs font-medium ${selectedRootTypeCode === rt.code ? 'text-[var(--ty-primary-color)] font-bold' : 'text-[var(--ty-font-main-color)]'}`}>
                      {rt.name}
                    </span>
                  </div>
                  <span className="text-ty-2xs font-mono text-[var(--ty-font-sub-color)]">
                    {rt.docCount.toLocaleString()} 条
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* 核验范围配置 (5列) */}
          <div className="lg:col-span-5 space-y-2">
            <label className="text-ty-xs font-semibold text-[var(--ty-font-main-color)] block">
              2. 确定核验范围与模式
            </label>
            <div className="p-3 rounded-ty-sm border border-[var(--ty-border-color)] bg-[var(--ty-fill-weak-dark-color)]/30 space-y-3">
              {/* 模式页签 */}
              <div className="flex rounded-ty-xs bg-[var(--ty-fill-weak-dark-color)] p-0.5 border border-[var(--ty-border-color)] text-ty-2xs">
                <button
                  type="button"
                  onClick={() => setScopeMode('SAMPLE')}
                  className={`flex-1 py-1 px-2 rounded-ty-xs font-medium transition-colors cursor-pointer text-center ${
                    scopeMode === 'SAMPLE'
                      ? 'bg-[var(--ty-fill-white-color)] text-[var(--ty-primary-color)] font-bold shadow-xs'
                      : 'text-[var(--ty-font-sub-color)] hover:text-[var(--ty-font-main-color)]'
                  }`}
                >
                  抽检核验
                </button>
                <button
                  type="button"
                  onClick={() => setScopeMode('EXHAUSTIVE_SCOPE')}
                  className={`flex-1 py-1 px-2 rounded-ty-xs font-medium transition-colors cursor-pointer text-center ${
                    scopeMode === 'EXHAUSTIVE_SCOPE'
                      ? 'bg-[var(--ty-fill-white-color)] text-[var(--ty-primary-color)] font-bold shadow-xs'
                      : 'text-[var(--ty-font-sub-color)] hover:text-[var(--ty-font-main-color)]'
                  }`}
                >
                  指定范围全量核验
                </button>
                <button
                  type="button"
                  onClick={() => setScopeMode('SPECIFIC_IDS')}
                  className={`flex-1 py-1 px-2 rounded-ty-xs font-medium transition-colors cursor-pointer text-center ${
                    scopeMode === 'SPECIFIC_IDS'
                      ? 'bg-[var(--ty-fill-white-color)] text-[var(--ty-primary-color)] font-bold shadow-xs'
                      : 'text-[var(--ty-font-sub-color)] hover:text-[var(--ty-font-main-color)]'
                  }`}
                >
                  指定对象 ID
                </button>
              </div>

              {/* 模式 1：抽检核验样本量 */}
              {scopeMode === 'SAMPLE' && (
                <div className="space-y-2 pt-1 text-ty-xs">
                  <span className="text-[var(--ty-font-sub-color)] block text-ty-2xs">
                    设置单次抽查样本数量（按重点高频与全库随机提取）：
                  </span>
                  <div className="flex items-center space-x-2">
                    {[50, 100, 200].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setSampleLimit(val)}
                        className={`px-3 py-1.5 rounded-ty-sm text-ty-xs font-mono font-semibold border transition-colors cursor-pointer ${
                          sampleLimit === val
                            ? 'bg-[var(--ty-primary-color)] text-[var(--ty-font-white-color)] border-[var(--ty-primary-color)]'
                            : 'bg-[var(--ty-fill-white-color)] text-[var(--ty-font-main-color)] border-[var(--ty-border-color)] hover:border-[var(--ty-primary-color)]'
                        }`}
                      >
                        {val} 个样本
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 模式 2：指定范围全量核验 */}
              {scopeMode === 'EXHAUSTIVE_SCOPE' && (
                <div className="space-y-1.5 pt-1 text-ty-xs">
                  <span className="text-[var(--ty-font-sub-color)] block text-ty-2xs">
                    选择具体业务子范围（核验该范围内全部对象）：
                  </span>
                  <select
                    value={selectedExhaustiveScopeId}
                    onChange={(e) => setSelectedExhaustiveScopeId(e.target.value)}
                    className="w-full px-3 py-1.5 border border-[var(--ty-border-color)] rounded-ty-sm text-ty-xs bg-[var(--ty-fill-white-color)] focus:outline-hidden focus:border-[var(--ty-primary-color)]"
                  >
                    {EXHAUSTIVE_SCOPE_OPTIONS.map(opt => (
                      <option key={opt.id} value={opt.id}>
                        {opt.name} ({opt.count} 个对象)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* 模式 3：指定对象 ID */}
              {scopeMode === 'SPECIFIC_IDS' && (
                <div className="space-y-1.5 pt-1 text-ty-xs">
                  <div className="flex items-center justify-between text-ty-2xs">
                    <span className="text-[var(--ty-font-sub-color)]">输入对象标识（逗号/换行分隔）：</span>
                    <span className="text-[var(--ty-primary-color)] font-mono font-medium">
                      已识别 {parsedIds.uniqueIds.length} 个
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    value={inputObjectIds}
                    onChange={(e) => setInputObjectIds(e.target.value)}
                    placeholder="输入对象编码，例如：P-30001, P-30002..."
                    className="w-full px-3 py-1.5 border border-[var(--ty-border-color)] rounded-ty-sm text-ty-xs bg-[var(--ty-fill-white-color)] font-mono resize-none focus:outline-hidden focus:border-[var(--ty-primary-color)]"
                  />
                </div>
              )}
            </div>
          </div>

          {/* 发起核验操作区 (3列) */}
          <div className="lg:col-span-3 flex flex-col justify-between space-y-3">
            <div>
              <label className="text-ty-xs font-semibold text-[var(--ty-font-main-color)] block mb-2">
                3. 执行核验
              </label>
              <div className="p-3 bg-[var(--ty-fill-weak-dark-color)]/60 rounded-ty-sm border border-[var(--ty-border-color)] text-ty-2xs space-y-1.5 text-[var(--ty-font-sub-color)]">
                <div>根类型：<strong className="text-[var(--ty-font-main-color)]">{currentRootType.name}</strong></div>
                <div>模式：<strong className="text-[var(--ty-font-main-color)]">
                  {scopeMode === 'SAMPLE' ? `抽检 (${sampleLimit}个)` : scopeMode === 'EXHAUSTIVE_SCOPE' ? '指定范围全量' : '指定对象ID'}
                </strong></div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleTriggerCheck}
              className="w-full py-2.5 px-4 rounded-ty-sm bg-[var(--ty-primary-color)] hover:bg-[var(--ty-primary-hover-color)] active:bg-[var(--ty-primary-active-color)] text-[var(--ty-font-white-color)] text-ty-xs font-semibold flex items-center justify-center space-x-2 transition-colors cursor-pointer shadow-sm"
              id="btn-trigger-consistency-check"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>
                {scopeMode === 'SAMPLE' && `发起抽检核验 (${sampleLimit}个)`}
                {scopeMode === 'EXHAUSTIVE_SCOPE' && '发起全量核验'}
                {scopeMode === 'SPECIFIC_IDS' && `发起定向核验 (${parsedIds.uniqueIds.length}个)`}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. 本次核验一致率 与 4. 有效比对数、不一致数、待处理数 看板卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="consistency-metrics-board">
        {/* 指标 1：本次核验一致率 */}
        <div className="bg-[var(--ty-fill-white-color)] rounded-ty-lg border border-[var(--ty-border-color)] p-4.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-ty-xs font-medium text-[var(--ty-font-sub-color)]">
              本次核验一致率
            </span>
            <span className={`px-2 py-0.5 rounded-ty-xs text-ty-2xs font-semibold ${
              Number(latestStats.ratePercent) >= 90
                ? 'bg-[var(--ty-green-lightest-color)] text-[var(--ty-green-color)]'
                : 'bg-[var(--ty-red-lightest-color)] text-[var(--ty-red-color)]'
            }`}>
              {Number(latestStats.ratePercent) >= 90 ? '一致率良好' : '需重点关注'}
            </span>
          </div>
          <div className="mt-2.5">
            <div className="text-ty-2xl font-bold font-mono text-[var(--ty-font-main-color)] tracking-tight">
              {latestStats.ratePercent}%
            </div>
            <div className="w-full bg-[var(--ty-fill-darkest-color)]/10 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  Number(latestStats.ratePercent) >= 90 ? 'bg-[var(--ty-green-color)]' : 'bg-[var(--ty-orange-color)]'
                }`}
                style={{ width: `${latestStats.ratePercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* 指标 2：有效比对数 */}
        <div className="bg-[var(--ty-fill-white-color)] rounded-ty-lg border border-[var(--ty-border-color)] p-4.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-ty-xs font-medium text-[var(--ty-font-sub-color)]">
              有效比对数
            </span>
            <span className="text-ty-2xs text-[var(--ty-font-sub-color)]">双端有效样本</span>
          </div>
          <div className="mt-2.5 flex items-baseline space-x-1.5">
            <span className="text-ty-2xl font-bold font-mono text-[var(--ty-primary-color)] tracking-tight">
              {latestStats.effectiveCount}
            </span>
            <span className="text-ty-xs text-[var(--ty-font-sub-color)]">个对象</span>
          </div>
        </div>

        {/* 指标 3：不一致数 */}
        <div className="bg-[var(--ty-fill-white-color)] rounded-ty-lg border border-[var(--ty-border-color)] p-4.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-ty-xs font-medium text-[var(--ty-font-sub-color)]">
              不一致数
            </span>
            <span className={`px-2 py-0.5 rounded-ty-xs text-ty-2xs font-semibold ${
              latestStats.differenceCount > 0
                ? 'bg-[var(--ty-red-lightest-color)] text-[var(--ty-red-color)]'
                : 'bg-[var(--ty-green-lightest-color)] text-[var(--ty-green-color)]'
            }`}>
              {latestStats.differenceCount > 0 ? '存在差异' : '无差异'}
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline space-x-1.5">
            <span className={`text-ty-2xl font-bold font-mono tracking-tight ${
              latestStats.differenceCount > 0 ? 'text-[var(--ty-red-color)]' : 'text-[var(--ty-green-color)]'
            }`}>
              {latestStats.differenceCount}
            </span>
            <span className="text-ty-xs text-[var(--ty-font-sub-color)]">个对象</span>
          </div>
        </div>

        {/* 指标 4：待处理数 */}
        <div className="bg-[var(--ty-fill-white-color)] rounded-ty-lg border border-[var(--ty-border-color)] p-4.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-ty-xs font-medium text-[var(--ty-font-sub-color)]">
              待处理数
            </span>
            <span className="text-ty-2xs text-[var(--ty-font-sub-color)]">同步缓冲/未完成</span>
          </div>
          <div className="mt-2.5 flex items-baseline space-x-1.5">
            <span className={`text-ty-2xl font-bold font-mono tracking-tight ${
              latestStats.pendingCount > 0 ? 'text-[var(--ty-orange-color)]' : 'text-[var(--ty-font-main-color)]'
            }`}>
              {latestStats.pendingCount}
            </span>
            <span className="text-ty-xs text-[var(--ty-font-sub-color)]">个对象</span>
          </div>
        </div>
      </div>

      {/* 5. 结果列表和差异详情 (表格卡片) */}
      <div className="bg-[var(--ty-fill-white-color)] rounded-ty-lg border border-[var(--ty-border-color)] overflow-hidden" id="consistency-batch-history-card">
        <div className="px-5 py-3.5 border-b border-[var(--ty-border-color)] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-4 bg-[var(--ty-primary-color)] rounded-ty-xs"></div>
            <h2 className="text-ty-sm font-bold text-[var(--ty-font-main-color)]">核验结果历史列表</h2>
            <span className="text-ty-2xs text-[var(--ty-font-sub-color)]">
              (共 {batches.length} 次核验记录)
            </span>
          </div>
          <span className="text-ty-2xs text-[var(--ty-font-sub-color)]">
            基准来源: PLM 源端主数据
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-ty-xs">
            <thead>
              <tr className="border-b border-[var(--ty-border-color)] bg-[var(--ty-fill-weak-dark-color)] text-[var(--ty-font-sub-color)] font-semibold text-ty-2xs">
                <th className="py-2.5 px-3.5">批次编号</th>
                <th className="py-2.5 px-3">核验根类型</th>
                <th className="py-2.5 px-3">核验范围与模式</th>
                <th className="py-2.5 px-3 text-center">核验一致率</th>
                <th className="py-2.5 px-3 text-center">有效比对数</th>
                <th className="py-2.5 px-3 text-center">不一致数</th>
                <th className="py-2.5 px-3 text-center">待处理数</th>
                <th className="py-2.5 px-3">执行时间</th>
                <th className="py-2.5 px-3.5 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--ty-border-color)]">
              {batches.map(batch => {
                const rateStr = getBatchConsistencyRate(batch);
                const isGood = Number(rateStr.replace('%', '')) >= 90;
                const pendingTotal = (batch.pendingRecheckCount || 0) + (batch.incompleteCount || 0);

                return (
                  <tr key={batch.id} className="hover:bg-[var(--ty-fill-weak-dark-color)] transition-colors">
                    <td className="py-3 px-3.5 font-mono font-bold text-[var(--ty-primary-color)]">
                      {batch.id}
                    </td>
                    <td className="py-3 px-3 font-medium text-[var(--ty-font-main-color)]">
                      {batch.rootTypeName}
                    </td>
                    <td className="py-3 px-3 text-ty-2xs text-[var(--ty-font-main-color)] max-w-xs truncate" title={batch.scopeDescription}>
                      {batch.scopeDescription}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-ty-xs text-ty-2xs font-bold font-mono ${
                        isGood
                          ? 'bg-[var(--ty-green-lightest-color)] text-[var(--ty-green-color)]'
                          : 'bg-[var(--ty-red-lightest-color)] text-[var(--ty-red-color)]'
                      }`}>
                        {rateStr}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-semibold text-[var(--ty-font-main-color)]">
                      {batch.actualCount}
                    </td>
                    <td className="py-3 px-3 text-center font-mono">
                      {batch.differenceCount > 0 ? (
                        <span className="px-1.5 py-0.5 rounded-ty-xs bg-[var(--ty-red-lightest-color)] text-[var(--ty-red-color)] font-bold">
                          {batch.differenceCount}
                        </span>
                      ) : (
                        <span className="text-[var(--ty-green-color)] font-medium">0</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center font-mono">
                      {pendingTotal > 0 ? (
                        <span className="px-1.5 py-0.5 rounded-ty-xs bg-[var(--ty-orange-lightest-color)] text-[var(--ty-orange-color)] font-bold">
                          {pendingTotal}
                        </span>
                      ) : (
                        <span className="text-[var(--ty-font-sub-color)]">0</span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-ty-2xs text-[var(--ty-font-sub-color)]">
                      {batch.executedAt}
                    </td>
                    <td className="py-3 px-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedBatch(batch);
                          setDetailFilterStatus('ALL');
                          setDetailPageIndex(1);
                        }}
                        className="px-2.5 py-1 rounded-ty-sm bg-[var(--ty-fill-white-color)] hover:bg-[var(--ty-primary-lightest-color)] text-[var(--ty-primary-color)] border border-[var(--ty-primary-color)]/30 text-ty-2xs font-semibold transition-colors cursor-pointer"
                      >
                        查看差异详情
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 差异详情抽屉 */}
      {selectedBatch && (
        <div className="fixed inset-0 z-50 overflow-hidden" id="batch-detail-drawer-overlay">
          <div
            className="absolute inset-0 bg-ty-overlay backdrop-blur-xs transition-opacity"
            onClick={() => setSelectedBatch(null)}
          />
          <div className="fixed inset-y-0 right-0 max-w-4xl w-full bg-[var(--ty-fill-white-color)] shadow-ty-lg flex flex-col z-10 animate-in slide-in-from-right duration-200">
            {/* 头部 */}
            <div className="px-6 py-4 border-b border-[var(--ty-border-color)] flex items-center justify-between bg-[var(--ty-fill-weak-dark-color)]">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-ty-sm font-bold text-[var(--ty-font-main-color)]">
                    批次核验详情：<span className="font-mono text-[var(--ty-primary-color)]">{selectedBatch.id}</span>
                  </h3>
                  <span className="px-2 py-0.5 rounded-ty-xs bg-[var(--ty-primary-lightest-color)] text-[var(--ty-primary-color)] text-ty-2xs font-semibold">
                    {selectedBatch.rootTypeName}
                  </span>
                </div>
                <span className="text-ty-2xs text-[var(--ty-font-sub-color)] mt-0.5 block">
                  执行时间: {selectedBatch.executedAt} · 范围: {selectedBatch.scopeDescription}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBatch(null)}
                className="p-1 rounded-ty-sm text-[var(--ty-font-sub-color)] hover:text-[var(--ty-font-main-color)] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 抽屉指标栏 */}
            <div className="px-6 py-3.5 border-b border-[var(--ty-border-color)] bg-[var(--ty-fill-white-color)] grid grid-cols-4 gap-3 text-center">
              <div>
                <span className="text-ty-2xs text-[var(--ty-font-sub-color)] block">本次一致率</span>
                <span className="text-ty-sm font-bold font-mono text-[var(--ty-font-main-color)]">
                  {getBatchConsistencyRate(selectedBatch)}
                </span>
              </div>
              <div>
                <span className="text-ty-2xs text-[var(--ty-font-sub-color)] block">有效比对数</span>
                <span className="text-ty-sm font-bold font-mono text-[var(--ty-primary-color)]">
                  {selectedBatch.actualCount}
                </span>
              </div>
              <div>
                <span className="text-ty-2xs text-[var(--ty-font-sub-color)] block">不一致数</span>
                <span className={`text-ty-sm font-bold font-mono ${
                  selectedBatch.differenceCount > 0 ? 'text-[var(--ty-red-color)]' : 'text-[var(--ty-green-color)]'
                }`}>
                  {selectedBatch.differenceCount}
                </span>
              </div>
              <div>
                <span className="text-ty-2xs text-[var(--ty-font-sub-color)] block">待处理数</span>
                <span className="text-ty-sm font-bold font-mono text-[var(--ty-orange-color)]">
                  {(selectedBatch.pendingRecheckCount || 0) + (selectedBatch.incompleteCount || 0)}
                </span>
              </div>
            </div>

            {/* 抽屉内容列表区 */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-ty-xs">
              {/* 筛选过滤栏 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5 text-ty-2xs">
                  <span className="text-[var(--ty-font-sub-color)] mr-1">筛选状态:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setDetailFilterStatus('ALL');
                      setDetailPageIndex(1);
                    }}
                    className={`px-2.5 py-1 rounded-ty-xs font-medium border transition-colors cursor-pointer ${
                      detailFilterStatus === 'ALL'
                        ? 'bg-[var(--ty-primary-color)] text-[var(--ty-font-white-color)] border-[var(--ty-primary-color)] font-bold'
                        : 'bg-[var(--ty-fill-white-color)] text-[var(--ty-font-sub-color)] border-[var(--ty-border-color)]'
                    }`}
                  >
                    全部 ({selectedBatch.objectResults.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDetailFilterStatus('DIFFERENCE_FOUND');
                      setDetailPageIndex(1);
                    }}
                    className={`px-2.5 py-1 rounded-ty-xs font-medium border transition-colors cursor-pointer ${
                      detailFilterStatus === 'DIFFERENCE_FOUND'
                        ? 'bg-[var(--ty-red-color)] text-[var(--ty-font-white-color)] border-[var(--ty-red-color)] font-bold'
                        : 'bg-[var(--ty-red-lightest-color)] text-[var(--ty-red-color)] border-[var(--ty-red-color)]/30'
                    }`}
                  >
                    不一致 ({selectedBatch.differenceCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDetailFilterStatus('PENDING_RECHECK');
                      setDetailPageIndex(1);
                    }}
                    className={`px-2.5 py-1 rounded-ty-xs font-medium border transition-colors cursor-pointer ${
                      detailFilterStatus === 'PENDING_RECHECK'
                        ? 'bg-[var(--ty-orange-color)] text-[var(--ty-font-white-color)] border-[var(--ty-orange-color)] font-bold'
                        : 'bg-[var(--ty-orange-lightest-color)] text-[var(--ty-orange-color)] border-[var(--ty-orange-color)]/30'
                    }`}
                  >
                    待处理 ({(selectedBatch.pendingRecheckCount || 0) + (selectedBatch.incompleteCount || 0)})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDetailFilterStatus('CONSISTENT');
                      setDetailPageIndex(1);
                    }}
                    className={`px-2.5 py-1 rounded-ty-xs font-medium border transition-colors cursor-pointer ${
                      detailFilterStatus === 'CONSISTENT'
                        ? 'bg-[var(--ty-green-color)] text-[var(--ty-font-white-color)] border-[var(--ty-green-color)] font-bold'
                        : 'bg-[var(--ty-green-lightest-color)] text-[var(--ty-green-color)] border-[var(--ty-green-color)]/30'
                    }`}
                  >
                    一致 ({selectedBatch.consistentCount})
                  </button>
                </div>
                <span className="text-ty-2xs text-[var(--ty-font-sub-color)]">
                  点击“查看对比”展开具体字段预期值与存储值对比
                </span>
              </div>

              {/* 对象明细表格 */}
              <div className="border border-[var(--ty-border-color)] rounded-ty-sm overflow-hidden">
                <table className="w-full text-left border-collapse text-ty-xs">
                  <thead>
                    <tr className="border-b border-[var(--ty-border-color)] bg-[var(--ty-fill-weak-dark-color)] text-[var(--ty-font-sub-color)] font-semibold text-ty-2xs">
                      <th className="py-2.5 px-3">对象标识</th>
                      <th className="py-2.5 px-3">对象业务名称</th>
                      <th className="py-2.5 px-3 text-center">核验状态</th>
                      <th className="py-2.5 px-3">比对说明</th>
                      <th className="py-2.5 px-3 text-center">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--ty-border-color)]">
                    {paginatedBatchResults.map(item => (
                      <tr key={item.objectId} className="hover:bg-[var(--ty-fill-weak-dark-color)] transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-[var(--ty-font-main-color)]">
                          {item.objectId}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-[var(--ty-font-main-color)]">
                          {item.objectName}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {item.status === 'CONSISTENT' && (
                            <span className="px-2 py-0.5 rounded-ty-xs bg-[var(--ty-green-lightest-color)] text-[var(--ty-green-color)] text-ty-2xs font-bold">
                              一致
                            </span>
                          )}
                          {item.status === 'DIFFERENCE_FOUND' && (
                            <span className="px-2 py-0.5 rounded-ty-xs bg-[var(--ty-red-lightest-color)] text-[var(--ty-red-color)] text-ty-2xs font-bold">
                              {item.isTargetMissing ? '目标缺失' : '存在差异'}
                            </span>
                          )}
                          {item.status === 'PENDING_RECHECK' && (
                            <span className="px-2 py-0.5 rounded-ty-xs bg-[var(--ty-orange-lightest-color)] text-[var(--ty-orange-color)] text-ty-2xs font-bold">
                              待处理
                            </span>
                          )}
                          {item.status === 'INCOMPLETE' && (
                            <span className="px-2 py-0.5 rounded-ty-xs bg-[var(--ty-fill-weak-dark-color)] text-[var(--ty-font-sub-color)] text-ty-2xs font-bold border border-[var(--ty-border-color)]">
                              未完成
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-ty-2xs text-[var(--ty-font-sub-color)] max-w-sm truncate" title={item.statusDetail}>
                          {item.statusDetail}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedObjectForCompare(item)}
                            className="px-2 py-0.5 text-ty-2xs font-semibold text-[var(--ty-primary-color)] hover:underline cursor-pointer"
                          >
                            查看对比
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 分页控制 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-ty-2xs text-[var(--ty-font-sub-color)]">
                    第 {detailPageIndex} / {totalPages} 页 (共 {filteredBatchResults.length} 条)
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      disabled={detailPageIndex <= 1}
                      onClick={() => setDetailPageIndex(p => Math.max(1, p - 1))}
                      className="px-2.5 py-1 text-ty-2xs rounded-ty-xs border border-[var(--ty-border-color)] bg-[var(--ty-fill-white-color)] disabled:opacity-40 cursor-pointer"
                    >
                      上一页
                    </button>
                    <button
                      type="button"
                      disabled={detailPageIndex >= totalPages}
                      onClick={() => setDetailPageIndex(p => Math.min(totalPages, p + 1))}
                      className="px-2.5 py-1 text-ty-2xs rounded-ty-xs border border-[var(--ty-border-color)] bg-[var(--ty-fill-white-color)] disabled:opacity-40 cursor-pointer"
                    >
                      下一页
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 底部 */}
            <div className="px-6 py-3 border-t border-[var(--ty-border-color)] bg-[var(--ty-fill-weak-dark-color)] flex items-center justify-end">
              <button
                type="button"
                onClick={() => setSelectedBatch(null)}
                className="px-4 py-1.5 border border-[var(--ty-border-color)] rounded-ty-sm bg-[var(--ty-fill-white-color)] text-[var(--ty-font-main-color)] text-ty-xs font-semibold cursor-pointer hover:bg-[var(--ty-fill-weak-dark-color)]"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 单个对象字段对比详情弹窗 */}
      {selectedObjectForCompare && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ty-overlay backdrop-blur-xs" id="field-compare-modal-overlay">
          <div className="bg-[var(--ty-fill-white-color)] rounded-ty-lg shadow-ty-lg border border-[var(--ty-border-color)] max-w-2xl w-full p-5 space-y-4 animate-in zoom-in-95 duration-150">
            {/* 头部 */}
            <div className="flex items-start justify-between border-b border-[var(--ty-border-color)] pb-3">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-ty-sm font-bold text-[var(--ty-font-main-color)] font-mono">
                    {selectedObjectForCompare.objectId}
                  </h3>
                  <span className="text-ty-xs font-semibold text-[var(--ty-font-main-color)]">
                    {selectedObjectForCompare.objectName}
                  </span>
                  {selectedObjectForCompare.status === 'CONSISTENT' && (
                    <span className="px-2 py-0.5 rounded-ty-xs bg-[var(--ty-green-lightest-color)] text-[var(--ty-green-color)] text-ty-2xs font-bold">
                      一致
                    </span>
                  )}
                  {selectedObjectForCompare.status === 'DIFFERENCE_FOUND' && (
                    <span className="px-2 py-0.5 rounded-ty-xs bg-[var(--ty-red-lightest-color)] text-[var(--ty-red-color)] text-ty-2xs font-bold">
                      {selectedObjectForCompare.isTargetMissing ? '目标缺失' : '存在差异'}
                    </span>
                  )}
                  {selectedObjectForCompare.status === 'PENDING_RECHECK' && (
                    <span className="px-2 py-0.5 rounded-ty-xs bg-[var(--ty-orange-lightest-color)] text-[var(--ty-orange-color)] text-ty-2xs font-bold">
                      待处理
                    </span>
                  )}
                  {selectedObjectForCompare.status === 'INCOMPLETE' && (
                    <span className="px-2 py-0.5 rounded-ty-xs bg-[var(--ty-fill-weak-dark-color)] text-[var(--ty-font-sub-color)] text-ty-2xs font-bold">
                      未完成
                    </span>
                  )}
                </div>
                <p className="text-ty-2xs text-[var(--ty-font-sub-color)] mt-1">
                  最后变更: {selectedObjectForCompare.lastModifiedAt || '未知'} · 判定说明: {selectedObjectForCompare.statusDetail}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedObjectForCompare(null)}
                className="p-1 rounded-ty-sm text-[var(--ty-font-sub-color)] hover:text-[var(--ty-font-main-color)] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 逐字段比对表格 */}
            <div className="border border-[var(--ty-border-color)] rounded-ty-sm overflow-hidden">
              <table className="w-full text-left border-collapse text-ty-xs">
                <thead>
                  <tr className="border-b border-[var(--ty-border-color)] bg-[var(--ty-fill-weak-dark-color)] text-[var(--ty-font-sub-color)] font-semibold text-ty-2xs">
                    <th className="py-2 px-3">核验字段名称</th>
                    <th className="py-2 px-3">PLM 源端预期值</th>
                    <th className="py-2 px-3">Manticore 实际存储值</th>
                    <th className="py-2 px-3 text-center">判定结果</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--ty-border-color)] text-ty-2xs">
                  {selectedObjectForCompare.fields.map(f => (
                    <tr key={f.fieldCode} className="hover:bg-[var(--ty-fill-weak-dark-color)]">
                      <td className="py-2.5 px-3 font-semibold text-[var(--ty-font-main-color)]">
                        {f.fieldName}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[var(--ty-font-main-color)]">
                        {f.mappedExpectedValue ?? f.plmRawValue ?? <span className="text-[var(--ty-font-placeholder-color)] italic">-</span>}
                      </td>
                      <td className="py-2.5 px-3 font-mono">
                        {f.manticoreActualValue ? (
                          <span className="text-[var(--ty-font-main-color)]">{f.manticoreActualValue}</span>
                        ) : (
                          <span className="text-[var(--ty-red-color)] font-bold italic">未检索到记录</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {f.matchStatus === 'MATCH' && (
                          <span className="px-1.5 py-0.5 rounded-ty-xs bg-[var(--ty-green-lightest-color)] text-[var(--ty-green-color)] font-bold">
                            一致
                          </span>
                        )}
                        {f.matchStatus === 'MISMATCH' && (
                          <span className="px-1.5 py-0.5 rounded-ty-xs bg-[var(--ty-red-lightest-color)] text-[var(--ty-red-color)] font-bold">
                            不匹配
                          </span>
                        )}
                        {f.matchStatus === 'TARGET_MISSING' && (
                          <span className="px-1.5 py-0.5 rounded-ty-xs bg-[var(--ty-red-lightest-color)] text-[var(--ty-red-color)] font-bold">
                            目标缺失
                          </span>
                        )}
                        {f.matchStatus === 'UNVERIFIABLE' && (
                          <span className="px-1.5 py-0.5 rounded-ty-xs bg-[var(--ty-orange-lightest-color)] text-[var(--ty-orange-color)] font-bold">
                            待处理
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 弹窗底部 */}
            <div className="flex items-center justify-end pt-1">
              <button
                type="button"
                onClick={() => setSelectedObjectForCompare(null)}
                className="px-4 py-1.5 border border-[var(--ty-border-color)] rounded-ty-sm bg-[var(--ty-fill-white-color)] text-[var(--ty-font-main-color)] text-ty-xs font-semibold cursor-pointer hover:bg-[var(--ty-fill-weak-dark-color)]"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
