import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  RotateCcw,
  Download,
  CheckCircle2,
  ChevronRight,
  Info,
  Layers,
  SlidersHorizontal,
  FileText,
  X,
  Eye,
  FileCheck2
} from 'lucide-react';
import {
  rootTypeOptions,
  softTypeOptions,
  mockFormBaselines,
  mockPartDatabase,
  stage1MappedFields,
  runSimilaritySearch,
  formatFieldWithFallback
} from '../data';
import {
  FieldSimilarityRule,
  ScoredCandidate,
  SearchRunResult,
  SimilarityBaseline,
  ObjectType
} from '../types';

interface ClientFindSimilarViewProps {
  rules: FieldSimilarityRule[];
  objectConfigStatus: Record<string, {
    enabled: boolean;
    configVersion: string;
    lastModifiedAt: string;
  }>;
  onNavigate?: (view: string) => void;
}

export const ClientFindSimilarView: React.FC<ClientFindSimilarViewProps> = ({
  rules,
  objectConfigStatus,
  onNavigate
}) => {
  // 1. 查询条件
  const [rootTypeId, setRootTypeId] = useState<string>('PART');
  const [softTypeId, setSoftTypeId] = useState<string>('IN_HOUSE');
  const [baselineType, setBaselineType] = useState<'EXISTING_PART' | 'FORM_VALUES'>('EXISTING_PART');
  const [existingPartId, setExistingPartId] = useState<string>('PART-2026-000100');
  const [selectedFormId, setSelectedFormId] = useState<string>('FORM-001');
  const [keyword, setKeyword] = useState<string>('');

  // 分页状态
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  // 搜索加载与结果
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchRunResult | null>(null);

  // 选中的对比物料 (侧边/抽屉业务对比)
  const [selectedForCompare, setSelectedForCompare] = useState<ScoredCandidate | null>(null);

  // 导出提示
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const availableSoftTypes = useMemo(() => {
    return softTypeOptions.filter(st => st.rootTypeId === rootTypeId);
  }, [rootTypeId]);

  const availableExistingParts = useMemo(() => {
    return mockPartDatabase.filter(p => p.rootTypeId === rootTypeId && p.softTypeId === softTypeId);
  }, [rootTypeId, softTypeId]);

  const availableFormBaselines = useMemo(() => {
    return mockFormBaselines.filter(f => f.rootTypeId === rootTypeId && f.softTypeId === softTypeId);
  }, [rootTypeId, softTypeId]);

  // 切换根类型
  const handleRootTypeChange = (newRootId: string) => {
    setRootTypeId(newRootId);
    const softs = softTypeOptions.filter(st => st.rootTypeId === newRootId);
    if (softs.length > 0) {
      setSoftTypeId(softs[0].id);
    } else {
      setSoftTypeId('');
    }
  };

  // 切换条件时重置选项
  useEffect(() => {
    if (availableExistingParts.length > 0) {
      setExistingPartId(availableExistingParts[0].objectId);
    } else {
      setExistingPartId('');
    }

    if (availableFormBaselines.length > 0) {
      setSelectedFormId(availableFormBaselines[0].id);
    } else {
      setSelectedFormId('');
    }

    setSearchResult(null);
    setSelectedForCompare(null);
    setCurrentPage(1);
  }, [rootTypeId, softTypeId, baselineType]);

  // 执行业务相似件查询
  const handleSearch = () => {
    let baseline: SimilarityBaseline;
    if (baselineType === 'EXISTING_PART') {
      if (!existingPartId) {
        alert('请选择或输入基准物料编码！');
        return;
      }
      baseline = {
        type: 'EXISTING_PART',
        objectId: existingPartId
      };
    } else {
      const formItem = mockFormBaselines.find(f => f.id === selectedFormId);
      if (!formItem) {
        alert('请选择有效的申请表单！');
        return;
      }
      baseline = {
        type: 'FORM_VALUES',
        requestNo: formItem.requestNo,
        temporaryNo: formItem.temporaryNo,
        rootTypeId: formItem.rootTypeId,
        softTypeId: formItem.softTypeId,
        values: formItem.values,
        units: formItem.units
      };
    }

    setIsSearching(true);
    setSelectedForCompare(null);

    setTimeout(() => {
      // 业务端只应用已启用的 active 规则 (或传入的 rules)
      const res = runSimilaritySearch(rootTypeId, softTypeId, baseline, rules, keyword);
      setSearchResult(res);
      setIsSearching(false);
      setCurrentPage(1);
    }, 200);
  };

  const handleReset = () => {
    setRootTypeId('PART');
    setSoftTypeId('IN_HOUSE');
    setBaselineType('EXISTING_PART');
    setExistingPartId('PART-2026-000100');
    setKeyword('');
    setSearchResult(null);
    setSelectedForCompare(null);
    setCurrentPage(1);
  };

  // 动态展示列 (由一阶段已映射关键字段驱动)
  const keyDisplayColumns = useMemo(() => {
    return stage1MappedFields.filter(
      f =>
        f.rootTypeId === rootTypeId &&
        (!f.softTypeId || f.softTypeId === softTypeId) &&
        f.isKeyDisplayColumn
    );
  }, [rootTypeId, softTypeId]);

  // 导出功能
  const handleExport = () => {
    if (!searchResult || searchResult.scoredCandidates.length === 0) return;

    const refCode =
      searchResult.reference?.objectId ||
      searchResult.reference?.requestCode ||
      'SIMILAR_PARTS';
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const fileName = `${refCode}_相似件查询_${dateStr}.xlsx`;

    // 构造 CSV 内容模拟下载
    const headers = [
      '序号',
      '物料编码',
      '物料名称',
      ...keyDisplayColumns.map(c => c.displayName),
      '生命周期状态',
      '相似度得分',
      '相似度等级',
      '属性覆盖率'
    ];

    const rows = searchResult.scoredCandidates.map((c, i) => [
      i + 1,
      c.objectId,
      c.objectName,
      ...keyDisplayColumns.map(col => c.customAttributes?.[col.fieldCode] ?? '--'),
      c.lifecycleState,
      `${c.similarityScore.toFixed(2)}%`,
      c.similarityTier,
      `${c.coverageRate}%`
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map(r => r.map(x => `"${x}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // 弹出 Toast 提示
    setToastMessage(`已导出当前条件下全量相似件数据 (${searchResult.scoredCandidates.length} 条)`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const currentRootTypeObj = rootTypeOptions.find(rt => rt.id === rootTypeId);
  const currentSoftTypeObj = softTypeOptions.find(st => st.id === softTypeId);

  const paginatedCandidates = useMemo(() => {
    if (!searchResult) return [];
    const start = (currentPage - 1) * pageSize;
    return searchResult.scoredCandidates.slice(start, start + pageSize);
  }, [searchResult, currentPage]);

  const totalPages = searchResult ? Math.ceil(searchResult.scoredCandidates.length / pageSize) : 1;

  return (
    <div className="space-y-6" id="client-find-similar-view-container">
      {/* Toast 提示 */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 顶部标题与业务场景说明 */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <FileCheck2 className="w-5 h-5 text-blue-600" />
              查找相似物料 (相似件查询)
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              支持基于已有物料或新建申请单表单字段值，快速检索企业物料库中高度相似的可复用件
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              重置
            </button>
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors shadow-xs disabled:opacity-50"
              id="client-search-btn"
            >
              <Search className="w-3.5 h-3.5" />
              {isSearching ? '正在查找...' : '查询相似件'}
            </button>
          </div>
        </div>

        {/* 顶部水平查询条件栏 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* 1. 根类型 */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              根类型
            </label>
            <select
              value={rootTypeId}
              onChange={e => handleRootTypeChange(e.target.value)}
              className="w-full h-9 text-xs font-medium border border-slate-300 rounded-md px-2.5 bg-white text-slate-800 focus:ring-1 focus:ring-blue-500"
              id="client-root-type-select"
            >
              {rootTypeOptions.map(rt => (
                <option key={rt.id} value={rt.id}>
                  {rt.name}
                </option>
              ))}
            </select>
          </div>

          {/* 2. 软类型 */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              软类型 (业务分类)
            </label>
            <select
              value={softTypeId}
              onChange={e => setSoftTypeId(e.target.value)}
              className="w-full h-9 text-xs font-medium border border-slate-300 rounded-md px-2.5 bg-white text-slate-800 focus:ring-1 focus:ring-blue-500"
              id="client-soft-type-select"
            >
              {availableSoftTypes.map(st => (
                <option key={st.id} value={st.id}>
                  {st.name}
                </option>
              ))}
            </select>
          </div>

          {/* 3. 基准来源 */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              基准来源
            </label>
            <select
              value={baselineType}
              onChange={e => setBaselineType(e.target.value as any)}
              className="w-full h-9 text-xs font-semibold border border-slate-300 rounded-md px-2.5 bg-white text-blue-700 focus:ring-1 focus:ring-blue-500"
              id="client-baseline-type-select"
            >
              <option value="EXISTING_PART">已有物料作为基准</option>
              <option value="FORM_VALUES">当前业务表单录入值</option>
            </select>
          </div>

          {/* 4. 基准选择器 */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600 block">
              {baselineType === 'EXISTING_PART' ? '基准物料' : '当前业务申请单'}
            </label>
            {baselineType === 'EXISTING_PART' ? (
              availableExistingParts.length > 0 ? (
                <select
                  value={existingPartId}
                  onChange={e => setExistingPartId(e.target.value)}
                  className="w-full h-9 text-xs font-medium border border-slate-300 rounded-md px-2 bg-white text-slate-800 focus:ring-1 focus:ring-blue-500"
                >
                  {availableExistingParts.map(p => (
                    <option key={p.objectId} value={p.objectId}>
                      {p.objectId} - {p.objectName}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={existingPartId}
                  onChange={e => setExistingPartId(e.target.value)}
                  placeholder="输入物料编码..."
                  className="w-full h-9 text-xs border border-slate-300 rounded-md px-2.5 bg-white"
                />
              )
            ) : availableFormBaselines.length > 0 ? (
              <select
                value={selectedFormId}
                onChange={e => setSelectedFormId(e.target.value)}
                className="w-full h-9 text-xs font-medium border border-slate-300 rounded-md px-2 bg-white text-slate-800 focus:ring-1 focus:ring-blue-500"
              >
                {availableFormBaselines.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.requestNo} ({f.temporaryNo})
                  </option>
                ))}
              </select>
            ) : (
              <div className="h-9 px-2 flex items-center text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-md">
                暂无预置表单
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 结果区域 */}
      {isSearching ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center shadow-sm">
          <div className="inline-block animate-spin text-blue-600 mb-3">
            <RotateCcw className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">正在查询相似物料，请稍候...</h3>
        </div>
      ) : !searchResult ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 mx-auto flex items-center justify-center mb-3">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">选择基准并点击“查询相似件”</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
            系统将自动根据当前物料分类的已生效规则，为您智能匹配并推荐高复用价值的相似物料。
          </p>
        </div>
      ) : searchResult.errorCode === 'NO_RULES' ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 mx-auto flex items-center justify-center mb-3">
            <Info className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">当前分类尚未启用相似度规则</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
            {searchResult.errorMessage}
          </p>
        </div>
      ) : searchResult.scoredCandidates.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 mx-auto flex items-center justify-center mb-3">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">未找到符合当前条件的相似件</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
            您可以尝试放宽筛选条件，或在设计中创建新物料。
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden space-y-0">
          {/* 基准物料信息与导出操作条 */}
          <div className="p-4 bg-slate-50/90 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-2xs">
                基准
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">
                    {searchResult.reference?.objectName}
                  </span>
                  <span className="text-xs font-mono px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded font-semibold">
                    {searchResult.reference?.objectId}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 bg-slate-200 text-slate-700 rounded font-medium">
                    {searchResult.baselineType === 'FORM_VALUES' ? '申请表单' : '已有物料'}
                  </span>
                </div>
                <div className="text-xs text-slate-500 flex flex-wrap items-center gap-3 mt-1">
                  <span>
                    规格：
                    <strong className="text-slate-700 font-medium">
                      {searchResult.reference?.specification || '--'}
                    </strong>
                  </span>
                  <span>
                    材质：
                    <strong className="text-slate-700 font-medium">
                      {searchResult.reference?.material || '--'}
                    </strong>
                  </span>
                  <span>
                    分类：
                    <strong className="text-slate-700 font-medium">
                      {searchResult.reference?.classificationPath}
                    </strong>
                  </span>
                </div>
              </div>
            </div>

            {/* 导出按钮 */}
            <div className="flex items-center gap-2.5">
              <span className="text-xs text-slate-500">
                共找到 <strong className="text-blue-600 font-bold">{searchResult.scoredCandidates.length}</strong> 件相似物料
              </span>
              <button
                onClick={handleExport}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors shadow-2xs"
                title="导出当前条件下全量相似件数据 (XLSX/CSV)"
                id="client-export-btn"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                导出查询结果
              </button>
            </div>
          </div>

          {/* 嵌入式业务结果列表 (按一阶段动态展示列呈现) */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-2.5 px-4 w-12 text-center">序号</th>
                  <th className="py-2.5 px-4">物料编码与名称</th>
                  {keyDisplayColumns.map(col => (
                    <th key={col.fieldCode} className="py-2.5 px-4">
                      {col.displayName}
                    </th>
                  ))}
                  <th className="py-2.5 px-4">生命周期状态</th>
                  <th className="py-2.5 px-4">相似度</th>
                  <th className="py-2.5 px-4">等级 / 覆盖率</th>
                  <th className="py-2.5 px-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {paginatedCandidates.map((cand, idx) => (
                  <tr
                    key={cand.objectId}
                    className="hover:bg-blue-50/30 transition-colors"
                    id={`client-cand-row-${cand.objectId}`}
                  >
                    <td className="py-3 px-4 text-center font-mono text-slate-400 font-medium">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </td>

                    {/* 物料编码与名称 */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{cand.objectName}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {cand.objectId}
                      </div>
                    </td>

                    {/* 动态一阶段业务属性列 */}
                    {keyDisplayColumns.map(col => {
                      const val = cand.customAttributes?.[col.fieldCode] ?? (cand as any)[col.fieldCode] ?? '--';
                      return (
                        <td key={col.fieldCode} className="py-3 px-4 text-slate-700 font-medium">
                          {String(val)}
                        </td>
                      );
                    })}

                    {/* 状态 */}
                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-0.5 text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">
                        {cand.lifecycleState}
                      </span>
                    </td>

                    {/* 相似度得分 (四舍五入保留2位小数，原始浮点排序) */}
                    <td className="py-3 px-4">
                      <span
                        className={`text-base font-bold font-mono ${
                          cand.similarityScore >= 85
                            ? 'text-emerald-600'
                            : cand.similarityScore >= 70
                            ? 'text-blue-600'
                            : 'text-slate-600'
                        }`}
                      >
                        {cand.similarityScore.toFixed(2)}%
                      </span>
                    </td>

                    {/* 等级 / 覆盖率 */}
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-0.5 items-start">
                        <span
                          className={`px-1.5 py-0.2 text-[10px] font-bold rounded ${
                            cand.similarityTier === '高相似'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : cand.similarityTier === '中相似'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {cand.similarityTier}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          覆盖率 {cand.coverageRate}%
                        </span>
                      </div>
                    </td>

                    {/* 操作 */}
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedForCompare(cand)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                        id={`client-view-compare-${cand.objectId}`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        对比分析
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 分页控制栏 */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50 text-xs">
              <span className="text-slate-500">
                第 {currentPage} 页 / 共 {totalPages} 页 (共 {searchResult.scoredCandidates.length} 条)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="px-2.5 py-1 border border-slate-300 rounded bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  上一页
                </button>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="px-2.5 py-1 border border-slate-300 rounded bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  下一页
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 业务端对比分析抽屉 (业务友好语言说明，屏蔽技术公式) */}
      {selectedForCompare && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end"
          id="client-compare-drawer-backdrop"
        >
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            {/* 抽屉头部 */}
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>物料属性差异对比</span>
                  <span className="text-sm font-mono text-blue-600 font-bold">
                    综合匹配度 {selectedForCompare.similarityScore.toFixed(2)}%
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 font-mono">
                  {selectedForCompare.objectId} - {selectedForCompare.objectName}
                </p>
              </div>
              <button
                onClick={() => setSelectedForCompare(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 抽屉对比内容 */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100 text-xs text-blue-800 leading-relaxed">
                提示：本对比展示当前候选物料与基准物料的核心属性吻合情况，供研发工程师与物料管理员决策是否直接复用或改型。
              </div>

              <div className="space-y-3">
                {selectedForCompare.compareFields.map(f => (
                  <div
                    key={f.fieldKey}
                    className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/60 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-xs">{f.fieldLabel}</span>
                      <span
                        className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                          f.status === 'FULL'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : f.status === 'PARTIAL'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {f.status === 'FULL'
                          ? '完全吻合'
                          : f.status === 'PARTIAL'
                          ? '部分吻合'
                          : '存在差异/缺失'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 bg-white p-2.5 rounded border border-slate-200 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-0.5">基准物料值</span>
                        <span className="font-semibold text-slate-800">
                          {String(f.sourceValue ?? '--')}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-0.5">候选物料值</span>
                        <span className="font-semibold text-slate-800">
                          {String(f.candidateValue ?? '--')}
                        </span>
                      </div>
                    </div>

                    {/* 业务解释 */}
                    <div className="text-[11px] text-slate-600 leading-relaxed pt-1">
                      {f.reason}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 抽屉底部 */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedForCompare(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
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
