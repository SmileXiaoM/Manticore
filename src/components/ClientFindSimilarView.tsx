import React, { useState } from 'react';
import {
  Eye,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Info,
  ArrowLeftRight,
  RotateCcw,
  Search,
  X,
  FileCheck2,
  SlidersHorizontal
} from 'lucide-react';
import { runSimilaritySearch, allMechanicalParts, allElectricalParts, formatWithDisplayUnit, processEnumList } from '../data';
import { FieldSimilarityRule, ScoredCandidate, SearchRunResult } from '../types';
import unitCatalogData from '../unit-catalog.json';

interface ClientFindSimilarViewProps {
  rules: FieldSimilarityRule[];
  objectConfigStatus: Record<string, {
    enabled: boolean;
    configVersion: string;
    lastModifiedAt: string;
  }>;
  onNavigate?: (view: string) => void;
}

export const ClientFindSimilarView: React.FC<ClientFindSimilarViewProps> = ({ rules, objectConfigStatus, onNavigate }) => {
  // Benchmark part options lists
  const mechanicalBenchmarkOptions = [
    { code: 'PART-2026-000100', name: '六角头螺栓 M10 x 50 (PART-2026-000100)' },
    { code: 'PART-A-FULL', name: '六角头螺栓 M10 x 50 (全量命中) (PART-A-FULL)' },
    { code: 'PART-B-UNIT', name: '六角螺栓 M10 x 50 (厘米量纲) (PART-B-UNIT)' },
    { code: 'PART-C-MISSING', name: '螺栓 M10 (轻量空值型) (PART-C-MISSING)' }
  ];

  const electricalBenchmarkOptions = [
    { code: 'ELEC-2026-000100', name: '直流继电器 12V (ELEC-2026-000100)' },
    { code: 'ELEC-A-FULL', name: '直流继电器 12V (全量匹配) (ELEC-A-FULL)' },
    { code: 'ELEC-B-TEMP', name: '直流继电器 12V (高温偏差版) (ELEC-B-TEMP)' }
  ];

  // Load active units dynamically from JSON drive
  const lengthUnits = unitCatalogData.quantities
    .find((q: any) => q.code === 'LENGTH' || q.name === '长度')
    ?.units.filter((u: any) => !u.status || u.status === 'ACTIVE') || [];

  const voltageUnits = unitCatalogData.quantities
    .find((q: any) => q.code === 'VOLTAGE' || q.name === '电压')
    ?.units.filter((u: any) => !u.status || u.status === 'ACTIVE') || [];

  // Query Filters State
  const [objectType, setObjectType] = useState('PART_MECHANICAL');
  const [reqCode, setReqCode] = useState('PART-2026-000100'); // set default benchmark part code
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('ALL');
  
  // Benchmark searchable combobox dropdown states
  const [benchmarkSearchText, setBenchmarkSearchText] = useState('');
  const [isBenchmarkDropdownOpen, setIsBenchmarkDropdownOpen] = useState(false);
  const [isBenchmarkFocused, setIsBenchmarkFocused] = useState(false);

  // R19-UI-02: Unit-based Numerical filter state
  const [diameterNumValue, setDiameterNumValue] = useState('10');
  const [diameterUnit, setDiameterUnit] = useState('mm');
  const [diameterOperator, setDiameterOperator] = useState('EQUALS'); // 'EQUALS', 'ALL'

  const [voltageNumValue, setVoltageNumValue] = useState('12');
  const [voltageUnit, setVoltageUnit] = useState('V');
  const [voltageOperator, setVoltageOperator] = useState('EQUALS'); // 'EQUALS', 'ALL'

  // R20-UI-01: Material Enum Dual-Mode filter state
  const [materialOperator, setMaterialOperator] = useState('EQUALS'); // 'CONTAINS', 'EQUALS', 'NOT_EQUALS'
  const [materialTextValue, setMaterialTextValue] = useState('');
  const [materialSelectValue, setMaterialSelectValue] = useState('SUS304');
  const [isMaterialDropdownOpen, setIsMaterialDropdownOpen] = useState(false);
  const [materialSearchText, setMaterialSearchText] = useState('');
  const [isMaterialFocused, setIsMaterialFocused] = useState(false);

  // R20-UI-01: Simple single-select lifecycle filter state
  const [lifecycleFilter, setLifecycleFilter] = useState('ALL');

  const [specInput, setSpecInput] = useState('');

  // Helper to dynamically extract all unique candidate materials under current object type
  const getCandidateMaterials = () => {
    const pool = objectType === 'PART_MECHANICAL' ? allMechanicalParts : allElectricalParts;
    return processEnumList(pool.map(p => p.material));
  };

  // Helper to dynamically extract all unique candidate lifecycles under current object type
  const getCandidateLifecycles = () => {
    const pool = objectType === 'PART_MECHANICAL' ? allMechanicalParts : allElectricalParts;
    return processEnumList(pool.map(p => p.lifecycleState));
  };

  const isSecondPhaseEnabled = objectConfigStatus[objectType]?.enabled ?? true;

  // Dynamic Search Run Result State
  const [isWaiting, setIsWaiting] = useState<boolean>(true);
  const [searchResult, setSearchResult] = useState<SearchRunResult | null>(() => ({
    reference: null,
    scoredCandidates: []
  }));

  const { reference, scoredCandidates } = searchResult || { reference: null, scoredCandidates: [] };

  // Selected candidate for side comparative drawer
  const [selectedForCompare, setSelectedForCompare] = useState<ScoredCandidate | null>(null);

  const invalidateOldResults = () => {
    setSearchResult({
      reference: null,
      scoredCandidates: []
    });
    setSelectedForCompare(null);
    setIsWaiting(true);
  };

  const handleSearch = () => {
    if (reqCode.trim() === '') {
      alert('请先选择基准零部件！');
      setSearchResult({
        reference: null,
        scoredCandidates: []
      });
      setSelectedForCompare(null);
      setIsWaiting(true);
      return;
    }

    // R20-UI-05: Pre-search unknown/inactive unit validation
    if (objectType === 'PART_MECHANICAL') {
      const qty = unitCatalogData.quantities.find((q: any) => q.code === 'LENGTH' || q.name === '长度');
      const unit = qty?.units.find((u: any) => u.code === diameterUnit);
      if (!unit || (unit.status && unit.status !== 'ACTIVE')) {
        alert("未知或已失效度量衡单位，计算被阻断！");
        invalidateOldResults();
        return;
      }
    } else if (objectType === 'PART_ELECTRICAL') {
      const qty = unitCatalogData.quantities.find((q: any) => q.code === 'VOLTAGE' || q.name === '电压');
      const unit = qty?.units.find((u: any) => u.code === voltageUnit);
      if (!unit || (unit.status && unit.status !== 'ACTIVE')) {
        alert("未知或已失效度量衡单位，计算被阻断！");
        invalidateOldResults();
        return;
      }
    }

    try {
      const res = runSimilaritySearch(objectType, reqCode, rules, {
        keyword,
        category,
        specInput,
        materialOperator: materialOperator,
        materialValue: materialOperator === 'CONTAINS' ? materialTextValue : materialSelectValue,
        diameterValue: diameterNumValue,
        diameterUnit: diameterUnit,
        diameterOperator: diameterOperator,
        voltageValue: voltageNumValue,
        voltageUnit: voltageUnit,
        voltageOperator: voltageOperator,
        lifecycle: lifecycleFilter
      });
      if (res.errorCode === 'OBJECT_TYPE_MISMATCH' && res.errorMessage) {
        alert(`检索被阻断：${res.errorMessage}`);
        invalidateOldResults();
        return;
      }
      setSearchResult(res);
      setIsWaiting(false);
    } catch (e: any) {
      alert(`检索遇到未知单位换算或数据阻断异常：${e.message || e}`);
      invalidateOldResults();
    }
  };

  const handleResetFilters = () => {
    setObjectType('PART_MECHANICAL');
    setReqCode('PART-2026-000100');
    setKeyword('');
    setCategory('ALL');
    setSpecInput('');
    setDiameterNumValue('10');
    setDiameterUnit('mm');
    setDiameterOperator('EQUALS');
    setVoltageNumValue('12');
    setVoltageUnit('V');
    setVoltageOperator('EQUALS');
    setMaterialOperator('EQUALS');
    setMaterialTextValue('');
    setMaterialSelectValue('SUS304');
    setMaterialSearchText('');
    setIsMaterialDropdownOpen(false);
    setIsMaterialFocused(false);
    setLifecycleFilter('ALL');
    setBenchmarkSearchText('');
    setIsBenchmarkDropdownOpen(false);
    setIsBenchmarkFocused(false);
    setSearchResult({
      reference: null,
      scoredCandidates: []
    });
    setIsWaiting(true);
  };

  const handleReset = () => {
    handleResetFilters();
    setSelectedForCompare(null);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 font-sans" id="client-similar-container">
      <style>{`
        @media (max-width: 820px) {
          #query-row-1 {
            grid-template-columns: 1fr !important;
          }
          #query-filters-grid-container {
            grid-template-columns: 1fr !important;
          }
          #query-filters-grid-container > div {
            width: 100% !important;
          }
          #query-filters-grid-container .flex.items-center.space-x-1.w-full {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          #query-filters-grid-container .flex.items-center.space-x-1.w-full > * {
            width: 100% !important;
            margin-left: 0 !important;
            margin-top: 4px !important;
          }
        }
        @media (min-width: 821px) {
          #query-row-1 {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
          #query-filters-grid-container {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          }
        }
      `}</style>

      {/* 2.1 Corporate Page Header with Reset Tool */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0 flex items-center justify-between gap-4" id="client-header">
        <div>
          <div className="flex items-center space-x-2 text-xs text-slate-500 mb-1">
            <span>研发设计工作台</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-800 font-semibold">物料去重与对齐比对</span>
          </div>
          <h1 className="text-lg font-bold text-slate-900">查找相似件（业务端）</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            选择一个已有零部件作为基准，按已启用的非 AI 属性相似度规则查找相近候选件。
          </p>
        </div>

        <button
          id="btn-reset-workbench"
          onClick={handleReset}
          className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs border border-slate-700 transition-colors cursor-pointer font-semibold flex items-center space-x-1 shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>重置工作台</span>
        </button>
      </div>

      {/* Main Container Scroll area (Vertical hierarchy) */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4" id="client-scroll-area">

        {/* 2.2 顶部查询条件区 */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4" id="client-query-box">

          {/* Row 1: Core Type and Searchable Benchmark Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-3 border-b border-slate-100" id="query-row-1">
            <div className="flex items-center space-x-2 text-xs">
              <label className="font-semibold text-slate-700 shrink-0 min-w-[80px]">物料分类类型:</label>
              <select
                id="client-select-objtype"
                value={objectType}
                onChange={(e) => {
                  const newType = e.target.value;
                  setObjectType(newType);
                  
                  // R24-SWITCH-01 requirements:
                  // 1. setSearchResult(null)
                  setSearchResult(null);
                  
                  // 2. setSelectedForCompare(null)
                  setSelectedForCompare(null);
                  
                  // 3. Clear search terms, category to 'ALL', spec to ''
                  setKeyword('');
                  setCategory('ALL');
                  setSpecInput('');
                  
                  // 4. Reset diameter value to '10', voltage value to '12'
                  setDiameterNumValue('10');
                  setDiameterUnit('mm');
                  setDiameterOperator('EQUALS');
                  setVoltageNumValue('12');
                  setVoltageUnit('V');
                  setVoltageOperator('EQUALS');
                  
                  // 5. Clean material options, select the first material of new pool, clear materialSearchText and materialTextValue
                  const pool = newType === 'PART_MECHANICAL' ? allMechanicalParts : allElectricalParts;
                  const mats = processEnumList(pool.map(p => p.material));
                  setMaterialSelectValue(mats[0] || '');
                  setMaterialOperator('EQUALS');
                  setMaterialTextValue('');
                  setMaterialSearchText('');
                  setIsMaterialDropdownOpen(false);
                  setIsMaterialFocused(false);
                  
                  // 6. Set reqCode to first valid Benchmark code
                  setReqCode(newType === 'PART_ELECTRICAL' ? 'ELEC-2026-000100' : 'PART-2026-000100');
                  
                  // 7. Clear lifecycle filter to 'ALL'
                  setLifecycleFilter('ALL');
                  
                  setIsWaiting(true);
                }}
                className="bg-white border border-slate-300 rounded px-2.5 py-1.5 font-semibold text-slate-700 text-xs w-full max-w-[200px] shadow-2xs"
              >
                <option value="PART_MECHANICAL">机械零件</option>
                <option value="PART_ELECTRICAL">电气元器件</option>
              </select>
            </div>

            {/* R19-UI-04: Searchable Benchmark Select */}
            <div className="flex items-center space-x-2 text-xs relative" id="benchmark-combobox-wrapper">
              <label className="font-semibold text-slate-700 shrink-0 min-w-[80px]">基准零部件:</label>
              <div className="relative w-full max-w-[320px]" id="benchmark-combobox">
                <div className="flex border border-slate-300 rounded overflow-hidden bg-white focus-within:ring-1 focus-within:ring-slate-400 w-full">
                  <input
                    type="text"
                    id="benchmark-search-input"
                    value={
                      isBenchmarkFocused
                        ? benchmarkSearchText
                        : (() => {
                            const pool = objectType === 'PART_MECHANICAL' ? mechanicalBenchmarkOptions : electricalBenchmarkOptions;
                            const match = pool.find(p => p.code === reqCode);
                            return match ? match.name : "";
                          })()
                    }
                    onChange={(e) => {
                      setBenchmarkSearchText(e.target.value);
                      setIsBenchmarkDropdownOpen(true);
                    }}
                    onFocus={() => {
                      setIsBenchmarkFocused(true);
                      setBenchmarkSearchText('');
                      setIsBenchmarkDropdownOpen(true);
                    }}
                    placeholder="输入名称或编码检索基准零部件..."
                    className="w-full text-xs px-2.5 py-1.5 bg-white text-slate-800 outline-hidden font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const willOpen = !isBenchmarkDropdownOpen;
                      setIsBenchmarkDropdownOpen(willOpen);
                      if (willOpen) {
                        setIsBenchmarkFocused(true);
                        setBenchmarkSearchText('');
                      } else {
                        setIsBenchmarkFocused(false);
                      }
                    }}
                    className="px-2 text-slate-500 hover:bg-slate-100 text-xs focus:outline-hidden border-l border-slate-100"
                  >
                    ▼
                  </button>
                </div>

                {isBenchmarkDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded shadow-lg max-h-48 overflow-y-auto" id="benchmark-options-list">
                    {(() => {
                      const pool = objectType === 'PART_MECHANICAL' ? mechanicalBenchmarkOptions : electricalBenchmarkOptions;
                      const filtered = pool.filter(p => {
                        const searchLower = benchmarkSearchText.toLowerCase().trim();
                        if (!searchLower) return true;
                        return p.code.toLowerCase().includes(searchLower) || p.name.toLowerCase().includes(searchLower);
                      });

                      if (filtered.length === 0) {
                        return (
                          <div className="p-3 text-xs text-slate-400 text-center font-medium bg-slate-50/50" id="benchmark-empty">
                            未找到可用物料
                          </div>
                        );
                      }

                      return filtered.map(opt => {
                        const isSelected = opt.code === reqCode;
                        return (
                          <button
                            type="button"
                            key={opt.code}
                            onClick={() => {
                              setReqCode(opt.code);
                              setBenchmarkSearchText('');
                              setIsBenchmarkDropdownOpen(false);
                              setIsBenchmarkFocused(false);
                              invalidateOldResults();
                            }}
                            className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 transition-colors flex justify-between items-center ${
                              isSelected ? 'bg-slate-100 font-bold text-slate-900' : 'text-slate-700'
                            }`}
                          >
                            <span className="font-semibold">{opt.name}</span>
                            {isSelected && <span className="text-slate-900 font-bold">✓</span>}
                          </button>
                        );
                      });
                    })()}
                  </div>
                )}
                {isBenchmarkDropdownOpen && (
                  <div 
                    className="fixed inset-0 z-40 cursor-default" 
                    onClick={() => {
                      setIsBenchmarkDropdownOpen(false);
                      setIsBenchmarkFocused(false);
                      setBenchmarkSearchText('');
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Row 2: Query Filters Grid (Robust, non-overflowing grid) */}
          <div id="query-filters-grid-container" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 pb-3 border-b border-slate-100 text-xs">
            
            {/* Cell 1: Nominal Diameter / Working Voltage */}
            {objectType === 'PART_MECHANICAL' ? (
              <div className="flex flex-col space-y-1.5" id="mechanical-diameter-filter">
                <label className="font-semibold text-slate-700">标称直径 (Dia):</label>
                <div className="flex items-center space-x-1 w-full">
                  <select
                    id="diameter-operator-select"
                    value={diameterOperator}
                    onChange={(e) => {
                      setDiameterOperator(e.target.value);
                      invalidateOldResults();
                    }}
                    className="bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-700 font-medium h-8 shrink-0"
                  >
                    <option value="EQUALS">等于 (=)</option>
                    <option value="ALL">全部/不限</option>
                  </select>
                  {diameterOperator === 'EQUALS' && (
                    <>
                      <input
                        type="number"
                        step="any"
                        placeholder="数值"
                        value={diameterNumValue}
                        onChange={(e) => {
                          setDiameterNumValue(e.target.value);
                          invalidateOldResults();
                        }}
                        className="bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 w-full font-semibold h-8"
                      />
                      <select
                        id="diameter-unit-select"
                        value={diameterUnit}
                        onChange={(e) => {
                          setDiameterUnit(e.target.value);
                          invalidateOldResults();
                        }}
                        className="bg-white border border-slate-300 rounded px-1.5 py-1 text-xs text-slate-600 font-semibold h-8 shrink-0"
                      >
                        {lengthUnits.map((u: any) => (
                          <option key={u.code} value={u.code}>{u.name}</option>
                        ))}
                      </select>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col space-y-1.5" id="electrical-voltage-filter">
                <label className="font-semibold text-slate-700">工作电压 (Vol):</label>
                <div className="flex items-center space-x-1 w-full">
                  <select
                    id="voltage-operator-select"
                    value={voltageOperator}
                    onChange={(e) => {
                      setVoltageOperator(e.target.value);
                      invalidateOldResults();
                    }}
                    className="bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-700 font-medium h-8 shrink-0"
                  >
                    <option value="EQUALS">等于 (=)</option>
                    <option value="ALL">全部/不限</option>
                  </select>
                  {voltageOperator === 'EQUALS' && (
                    <>
                      <input
                        type="number"
                        step="any"
                        placeholder="数值"
                        value={voltageNumValue}
                        onChange={(e) => {
                          setVoltageNumValue(e.target.value);
                          invalidateOldResults();
                        }}
                        className="bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 w-full font-semibold h-8"
                      />
                      <select
                        id="voltage-unit-select"
                        value={voltageUnit}
                        onChange={(e) => {
                          setVoltageUnit(e.target.value);
                          invalidateOldResults();
                        }}
                        className="bg-white border border-slate-300 rounded px-1.5 py-1 text-xs text-slate-600 font-semibold h-8 shrink-0"
                      >
                        {voltageUnits.map((u: any) => (
                          <option key={u.code} value={u.code}>{u.name}</option>
                        ))}
                      </select>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Cell 2: Primary Material */}
            <div className="flex flex-col space-y-1.5" id="enum-material-filter">
              <label className="font-semibold text-slate-700">主要材质:</label>
              <div className="flex items-center space-x-1 w-full">
                <select
                  id="material-operator-select"
                  value={materialOperator}
                  onChange={(e) => {
                    const op = e.target.value;
                    setMaterialOperator(op);
                    if (op === 'CONTAINS') {
                      // Switching to fuzzy search mode: clear dropdown selection and dropdown text states
                      setMaterialSelectValue('');
                      setMaterialSearchText('');
                    } else {
                      // Switching to dropdown select mode: clear fuzzy text state
                      setMaterialTextValue('');
                      const mats = getCandidateMaterials();
                      setMaterialSelectValue(mats[0] || '');
                      setMaterialSearchText('');
                    }
                    setIsMaterialDropdownOpen(false);
                    setIsMaterialFocused(false);
                    invalidateOldResults();
                  }}
                  className="bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-700 font-medium cursor-pointer h-8 shrink-0 animate-none"
                >
                  <option value="EQUALS">等于 (=)</option>
                  <option value="NOT_EQUALS">不等于 (≠)</option>
                  <option value="CONTAINS">包含 (Contains)</option>
                </select>

                {materialOperator === 'CONTAINS' ? (
                  <input
                    type="text"
                    id="material-text-input"
                    placeholder="输入材质子串..."
                    value={materialTextValue}
                    onChange={(e) => {
                      setMaterialTextValue(e.target.value);
                      invalidateOldResults();
                    }}
                    className="bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-800 w-full font-semibold h-8"
                  />
                ) : (
                  <div className="relative w-full" id="material-combobox-wrapper">
                    <div className="flex border border-slate-300 rounded overflow-hidden bg-white focus-within:ring-1 focus-within:ring-slate-400 w-full h-8">
                      <input
                        type="text"
                        id="material-combobox-input"
                        value={
                          isMaterialFocused
                            ? materialSearchText
                            : materialSelectValue
                        }
                        onChange={(e) => {
                          setMaterialSearchText(e.target.value);
                          setIsMaterialDropdownOpen(true);
                        }}
                        onFocus={() => {
                          setIsMaterialFocused(true);
                          setMaterialSearchText('');
                          setIsMaterialDropdownOpen(true);
                        }}
                        placeholder="检索..."
                        className="w-full text-xs px-2 py-1 bg-white text-slate-800 outline-hidden font-semibold"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const willOpen = !isMaterialDropdownOpen;
                          setIsMaterialDropdownOpen(willOpen);
                          if (willOpen) {
                            setIsMaterialFocused(true);
                            setMaterialSearchText('');
                          } else {
                            setIsMaterialFocused(false);
                          }
                        }}
                        className="px-1 text-slate-500 hover:bg-slate-100 text-[10px] focus:outline-hidden border-l border-slate-100"
                      >
                        ▼
                      </button>
                    </div>

                    {isMaterialDropdownOpen && (
                      <div className="absolute z-50 w-48 mt-1 bg-white border border-slate-200 rounded shadow-lg max-h-48 overflow-y-auto left-0" id="material-combobox-options">
                        {(() => {
                          const pool = getCandidateMaterials();
                          const filtered = pool.filter(mat => {
                            const searchLower = materialSearchText.toLowerCase().trim();
                            if (!searchLower) return true;
                            return mat.toLowerCase().includes(searchLower);
                          });

                          if (filtered.length === 0) {
                            return (
                              <div className="p-2 text-[11px] text-slate-400 text-center font-medium bg-slate-50/50">
                                未匹配材质
                              </div>
                            );
                          }

                          return filtered.map(mat => {
                            const isSelected = mat === materialSelectValue;
                            return (
                              <button
                                type="button"
                                key={mat}
                                onClick={() => {
                                  setMaterialSelectValue(mat);
                                  setMaterialSearchText('');
                                  setIsMaterialDropdownOpen(false);
                                  setIsMaterialFocused(false);
                                  invalidateOldResults();
                                }}
                                className={`w-full text-left px-2.5 py-1.5 text-[11px] hover:bg-slate-50 transition-colors flex justify-between items-center ${
                                  isSelected ? 'bg-slate-100 font-bold text-slate-900' : 'text-slate-700'
                                }`}
                              >
                                <span className="font-semibold">{mat}</span>
                                {isSelected && <span className="text-slate-900 font-bold">✓</span>}
                              </button>
                            );
                          });
                        })()}
                      </div>
                    )}
                    {isMaterialDropdownOpen && (
                      <div 
                        className="fixed inset-0 z-40 cursor-default" 
                        onClick={() => {
                          setIsMaterialDropdownOpen(false);
                          setIsMaterialFocused(false);
                          setMaterialSearchText('');
                        }}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Cell 3: Keyword Search */}
            <div className="flex flex-col space-y-1.5">
              <label className="font-semibold text-slate-700">名称/关键词:</label>
              <input
                id="client-input-keyword"
                type="text"
                value={keyword}
                placeholder="搜索库内候选件名称..."
                onChange={(e) => {
                  setKeyword(e.target.value);
                  invalidateOldResults();
                }}
                className="bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-800 w-full h-8 font-semibold"
              />
            </div>

            {/* Cell 4: Category Search */}
            <div className="flex flex-col space-y-1.5">
              <label className="font-semibold text-slate-700">分类目录:</label>
              <select
                id="client-select-category"
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  invalidateOldResults();
                }}
                className="bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-700 font-semibold h-8 w-full cursor-pointer"
              >
                <option value="ALL">全部二级分类</option>
                <option value="BOLT">螺纹副/内六角螺栓</option>
                <option value="OTHER">其他大类</option>
              </select>
            </div>

            {/* Cell 5: Spec Description */}
            <div className="flex flex-col space-y-1.5">
              <label className="font-semibold text-slate-500">规格描述:</label>
              <input
                id="client-input-spec"
                type="text"
                placeholder="如: M10 x 50"
                value={specInput}
                onChange={(e) => {
                  setSpecInput(e.target.value);
                  invalidateOldResults();
                }}
                className="bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-800 w-full h-8 font-semibold"
              />
            </div>

            {/* Cell 6: Lifecycle State */}
            <div className="flex flex-col space-y-1.5" id="lifecycle-filter-container">
              <label className="font-semibold text-slate-700">生命周期:</label>
              <select
                id="client-select-lifecycle"
                value={lifecycleFilter}
                onChange={(e) => {
                  setLifecycleFilter(e.target.value);
                  invalidateOldResults();
                }}
                className="bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-700 font-medium h-8 w-full cursor-pointer"
              >
                <option value="ALL">全部生命周期</option>
                {getCandidateLifecycles().map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>

          </div>

          {/* Row 3: Action Buttons */}
          <div className="flex justify-end items-center space-x-2 pt-1">
            <button
              id="client-btn-search"
              onClick={handleSearch}
              className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-1.5 rounded text-xs font-semibold shadow-sm flex items-center space-x-1 cursor-pointer transition-colors h-8"
            >
              <Search className="w-3.5 h-3.5" />
              <span>查询相似件</span>
            </button>
            <button
              id="client-btn-clear"
              onClick={handleResetFilters}
              className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded text-xs font-medium cursor-pointer transition-colors h-8"
            >
              <span>清空条件</span>
            </button>
          </div>

        </div>

        {isWaiting ? (
          <div className="bg-white border border-slate-200 rounded-lg p-12 text-center shadow-2xs" id="client-waiting-placeholder">
            <div className="max-w-md mx-auto space-y-4">
              <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto text-slate-400 border border-slate-200">
                <Search className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold text-slate-800">等待查询，请先执行试算</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  系统已载入最新配置，应用端首期自动试算保护已启动。请在上方输入条件，并点击<strong>“查询相似件”</strong>按钮，系统将执行 Manticore 去重引擎及属性相似度加权算分。
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* 2.3 基准零部件摘要区 */}
            {reference ? (
              <div className="bg-slate-100 border border-slate-200 rounded-lg px-4 py-3 flex flex-wrap items-center gap-x-8 gap-y-1.5 text-xs text-slate-600 shadow-2xs" id="client-target-summary">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-800">基准零部件</span>
                  <span className="text-slate-300">|</span>
                </div>
                <div>
                  <span className="text-slate-400">基准件编码:</span>{' '}
                  <span className="font-mono font-bold text-slate-900">{reference.objectId || reqCode}</span>
                </div>
                <div>
                  <span className="text-slate-400">基准件名称:</span>{' '}
                  <span className="font-semibold text-slate-900">{reference.objectName}</span>
                </div>
                <div>
                  <span className="text-slate-400">主要材质:</span>{' '}
                  <span className="font-mono font-bold text-slate-900">{reference.attributes.core_material || reference.material || '--'}</span>
                </div>
                <div>
                  <span className="text-slate-400">标称直径及单位:</span>{' '}
                  <span className="font-bold text-slate-900">
                    {reference.attributes.nominal_diameter !== undefined && reference.attributes.nominal_diameter !== null
                      ? `${reference.attributes.nominal_diameter} ${reference.units?.nominal_diameter || ''}`.trim()
                      : '--'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">长度及单位:</span>{' '}
                  <span className="font-bold text-slate-900">
                    {reference.attributes.nominal_length !== undefined && reference.attributes.nominal_length !== null
                      ? `${reference.attributes.nominal_length} ${reference.units?.nominal_length || ''}`.trim()
                      : '--'}
                  </span>
                </div>
                {reference.objectType === 'PART_ELECTRICAL' && (
                  <>
                    <div>
                      <span className="text-slate-400">工作电压:</span>{' '}
                      <span className="font-bold text-slate-900">
                        {reference.attributes.working_voltage !== undefined && reference.attributes.working_voltage !== null
                          ? `${reference.attributes.working_voltage} ${reference.units?.working_voltage || 'V'}`
                          : '--'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">工作温度:</span>{' '}
                      <span className="font-bold text-slate-900">
                        {reference.attributes.working_temp !== undefined && reference.attributes.working_temp !== null
                          ? formatWithDisplayUnit(
                              reference.attributes.working_temp,
                              reference.units?.working_temp || 'K',
                              rules.find(r => r.propertyCode === 'working_temp')?.displayUnit || 'degC',
                              '温度'
                            )
                          : '--'}
                      </span>
                    </div>
                  </>
                )}
                <div>
                  <span className="text-slate-400">分类路径:</span>{' '}
                  <span className="font-mono text-slate-700">{reference.classificationPath}</span>
                </div>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-xs text-red-800 shadow-2xs" id="client-target-error">
                未找到基准零部件: <strong className="font-mono">{reqCode}</strong> (可试用机械: REQ-2026-000100, 电气: ELEC-2026-000100)
              </div>
            )}

        {/* 2.4 全宽候选件结果表 */}
        {!isSecondPhaseEnabled && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs text-red-800 shadow-2xs">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4.5 h-4.5 text-red-600 shrink-0" />
              <span>
                <strong>⚠️ 属性相似度计算关闭：</strong>业务端提示：当前物料类别 [{objectType === 'PART_MECHANICAL' ? '机械零件' : '电气元器件'}] 属性相似度规则比分已被管理员停用。一阶段基础检索召回功能正常，但相似度分数归 0。
              </span>
            </div>
            <button
              onClick={() => onNavigate?.('field-rules')}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded font-bold transition-colors cursor-pointer shrink-0 text-xs"
            >
              前往配置端启用
            </button>
          </div>
        )}

        {scoredCandidates.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-12 text-center shadow-2xs" id="client-empty-results-placeholder">
            <div className="max-w-md mx-auto space-y-4">
              <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto text-slate-400 border border-slate-200">
                <Search className="w-6 h-6 text-slate-400" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold text-slate-800">未找到符合当前查询条件的相似候选件</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  请调整关键词、分类、生命周期、规格或材质条件后重新查询。
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden w-full" id="client-results-box">

            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center shrink-0">
              <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                <Eye className="w-4 h-4 text-emerald-600" />
                <span>属性相似件检索结果 (Manticore 实时比对)</span>
              </span>
              <span className="text-xs text-slate-400 font-medium">共检索到 {scoredCandidates.length} 条相似件纪录，点击“字段对比”进行去重闭环。</span>
            </div>

            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse text-xs min-w-[1250px] xl:min-w-0 xl:w-full" id="client-results-table">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold font-sans">
                    <th className="px-3 py-3 text-center w-12 whitespace-nowrap">序号</th>
                    <th className="px-3 py-3 whitespace-nowrap">候选件编码</th>
                    <th className="px-4 py-3 whitespace-nowrap">名称</th>
                    <th className="px-3 py-3 whitespace-nowrap aux-col-spec">规格/关键尺寸</th>
                    <th className="px-3 py-3 whitespace-nowrap aux-col-mat">材料</th>
                    <th className="px-4 py-3 whitespace-nowrap aux-col-class">分类</th>
                    <th className="px-3 py-3 text-center whitespace-nowrap">生命周期</th>
                    <th className="px-3 py-3 text-center whitespace-nowrap">相似度</th>
                    <th className="px-3 py-3 text-center whitespace-nowrap">分档</th>
                    <th className="px-3 py-3 text-center whitespace-nowrap">覆盖率</th>
                    <th className="px-3 py-3 text-center whitespace-nowrap">命中数</th>
                    <th className="px-3 py-3 text-center whitespace-nowrap">差异数</th>
                    <th className="px-4 py-3 text-center whitespace-nowrap w-40 sticky-ops">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {scoredCandidates.map((candidate, idx) => {
                    const isSelected = selectedForCompare?.objectId === candidate.objectId;
                    const scoreColor = !isSecondPhaseEnabled
                      ? 'text-slate-400 font-medium'
                      : candidate.similarityScore >= 85
                      ? 'text-emerald-700 font-extrabold'
                      : candidate.similarityScore >= 70
                      ? 'text-blue-700 font-bold'
                      : 'text-slate-600 font-medium';

                    return (
                      <tr
                        key={candidate.objectId}
                        className={`hover:bg-slate-50/50 transition-colors ${isSelected ? 'bg-emerald-50/30' : ''} ${!isSecondPhaseEnabled ? 'opacity-85' : ''}`}
                      >
                        {/* 序号 */}
                        <td className="px-3 py-3 text-center font-mono text-slate-400 whitespace-nowrap">
                          {idx + 1}
                        </td>

                        {/* 候选件编码 */}
                        <td className="px-3 py-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                          {candidate.objectId}
                        </td>

                        {/* 名称 */}
                        <td className="px-4 py-3 font-semibold text-slate-950 truncate max-w-[150px] whitespace-nowrap" title={candidate.objectName}>
                          {candidate.objectName}
                        </td>

                        {/* 规格/关键尺寸 */}
                        <td className="px-3 py-3 font-semibold text-slate-800 whitespace-nowrap font-mono aux-col-spec">
                          {candidate.specification}
                        </td>

                        {/* 材料 */}
                        <td className="px-3 py-3 font-mono text-slate-700 whitespace-nowrap aux-col-mat">
                          {candidate.material}
                        </td>

                        {/* 分类 */}
                        <td className="px-4 py-3 text-slate-500 font-mono truncate max-w-[150px] whitespace-nowrap aux-col-class" title={candidate.classificationPath}>
                          {candidate.classificationPath}
                        </td>

                        {/* 生命周期 */}
                        <td className="px-3 py-3 text-center whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[11px] border ${
                            candidate.lifecycleState === '有效' || candidate.lifecycleState.includes('已发布') || candidate.lifecycleState.includes('Released')
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200/60'
                              : candidate.lifecycleState === '已作废' || candidate.lifecycleState.includes('作废') || candidate.lifecycleState.includes('失效')
                              ? 'bg-rose-50 text-rose-800 border-rose-200/60'
                              : candidate.lifecycleState === '设计中' || candidate.lifecycleState.includes('草稿')
                              ? 'bg-blue-50 text-blue-800 border-blue-200/60'
                              : 'bg-slate-50 text-slate-600 border border-slate-200'
                          }`}>
                            {candidate.lifecycleState}
                          </span>
                        </td>

                        {/* 相似度 */}
                        <td className="px-3 py-3 text-center font-mono whitespace-nowrap">
                          {isSecondPhaseEnabled ? (
                            <span className={`${scoreColor} text-xs`}>{candidate.similarityScore.toFixed(1)}%</span>
                          ) : (
                            <span className="text-slate-400 text-xs font-semibold">0.0% <span className="text-[10px] text-slate-400 font-normal">(计算关闭)</span></span>
                          )}
                        </td>

                        {/* 分档 */}
                        <td className="px-3 py-3 text-center font-semibold text-slate-700 whitespace-nowrap">
                          {isSecondPhaseEnabled ? (
                            <span className={`px-2 py-0.5 rounded text-[11px] ${
                              candidate.similarityScore >= 85 ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' :
                              candidate.similarityScore >= 70 ? 'bg-blue-50 text-blue-800 border border-blue-100' :
                              'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}>
                              {candidate.similarityTier}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-400 border border-slate-200 font-normal">
                              计算停用
                            </span>
                          )}
                        </td>

                        {/* 覆盖率 */}
                        <td className="px-3 py-3 text-center font-mono text-slate-600 whitespace-nowrap">
                          {isSecondPhaseEnabled ? `${candidate.coverageRate}%` : '-'}
                        </td>

                        {/* 命中数 */}
                        <td className="px-3 py-3 text-center font-mono text-slate-600 whitespace-nowrap">
                          {isSecondPhaseEnabled ? `${candidate.fullHitCount} / ${candidate.compareFields.length}` : '-'}
                        </td>

                        {/* 差异数 */}
                        <td className="px-3 py-3 text-center font-mono font-semibold text-red-600 whitespace-nowrap">
                          {isSecondPhaseEnabled ? candidate.differenceCount : '-'}
                        </td>

                        {/* 操作 */}
                        <td className="px-4 py-3 text-center whitespace-nowrap sticky-ops">
                          <div className="flex items-center justify-center space-x-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedForCompare(candidate)}
                              className="px-2.5 py-1 text-xs font-bold rounded cursor-pointer border border-slate-300 text-slate-700 bg-slate-50 hover:bg-slate-100 transition-colors whitespace-nowrap"
                            >
                              字段对比
                            </button>
                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

          </>
        )}
      </div>

      {/* 2.5 属性对比抽屉 (点击拉起，默认关闭，固定在右侧覆盖而不挤压主表) */}
      {selectedForCompare && reference && (
        <>
          {/* Drawer Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 z-40 transition-opacity"
            onClick={() => setSelectedForCompare(null)}
            id="client-drawer-backdrop"
          />

          {/* Drawer Sidebar */}
          <div
            id="client-comparison-drawer"
            className="fixed right-0 top-0 h-full w-full max-w-[540px] bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200 transition-transform duration-300"
          >
            {/* Header */}
            <div className="bg-slate-800 text-white px-5 py-4 border-b border-slate-900 flex items-center justify-between shrink-0">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold tracking-wider text-emerald-400 uppercase flex items-center space-x-1">
                  <ArrowLeftRight className="w-3 h-3" />
                  <span>精密属性对齐看板</span>
                </span>
                <h2 className="text-sm font-bold flex items-center space-x-2">
                  <span>对齐比对:</span>
                  <span className="font-mono text-emerald-200">{selectedForCompare.objectId}</span>
                </h2>
              </div>

              <div className="flex items-center space-x-2.5">
                <span className="text-[11px] bg-slate-700/70 text-emerald-300 border border-slate-600 px-2 py-0.5 rounded font-mono font-bold shrink-0">
                  属性/字段映射拉通
                </span>
                <button
                  onClick={() => setSelectedForCompare(null)}
                  className="p-1 hover:bg-slate-700 text-slate-300 hover:text-white rounded transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs text-slate-600">

              {/* Reference Header Panel */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">基准件 :</span>
                  <strong className="text-slate-900 font-mono">{reqCode}</strong>
                </div>
                <div className="text-slate-700 font-semibold truncate leading-normal">
                  {reference.objectName}
                </div>

                <div className="border-t border-slate-200/60 my-2"></div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">候选件 :</span>
                  <strong className="text-emerald-700 font-mono">{selectedForCompare.objectId}</strong>
                </div>
                <div className="text-emerald-800 font-semibold truncate leading-normal">
                  {selectedForCompare.objectName}
                </div>
              </div>

              {!isSecondPhaseEnabled && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3.5 text-red-800 text-xs flex flex-col gap-1.5 leading-relaxed">
                  <div className="font-bold flex items-center space-x-1">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>⚠️ 属性级计算处于全局停用状态</span>
                  </div>
                  <p className="text-[11px] text-red-700">
                    当前选择的分类已全局关闭属性相似度比分。下方各特征值比对正常展示，但未激活量纲换算、扣分机制及归一化百分比算分（相似度强制归 0）。
                  </p>
                </div>
              )}

              {/* Mapped Table Comparison Details */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 flex items-center space-x-1">
                  <span>映射字段属性对齐细节</span>
                </span>

                <div className="border border-slate-200 rounded-lg overflow-hidden shadow-2xs bg-white">
                  <div className="grid grid-cols-3 bg-slate-100 border-b border-slate-200 p-2.5 font-semibold text-slate-700 text-xs">
                    <div>物理属性字段</div>
                    <div>基准件值</div>
                    <div>候选件值</div>
                  </div>

                  <div className="divide-y divide-slate-100 text-xs">
                    {selectedForCompare.compareFields.map((item, idx) => (
                      <div key={idx} className="grid grid-cols-3 p-2.5 hover:bg-slate-50 transition-colors">
                        <div className="font-semibold text-slate-500">{item.fieldLabel}</div>
                        <div className="font-mono text-slate-800 truncate">{String(item.sourceValue ?? '无')}</div>
                        <div className={`font-mono truncate font-medium ${
                          isSecondPhaseEnabled && item.status !== 'FULL' ? 'text-red-600 font-bold bg-red-50 px-1.5 rounded border border-red-100' : 'text-slate-800'
                        }`}>
                          {String(item.candidateValue ?? '无')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Rationale and score info */}
              <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200 text-xs text-slate-600 space-y-2">
                <div className="flex justify-between items-center">
                  <strong className="text-slate-700">Manticore 计算得分:</strong>
                  {isSecondPhaseEnabled ? (
                    <span className="text-blue-600 font-bold font-mono bg-blue-50 border border-blue-200 px-2 py-0.5 rounded text-xs">
                      {selectedForCompare.similarityScore.toFixed(1)}%相似度 ({selectedForCompare.similarityTier})
                    </span>
                  ) : (
                    <span className="text-slate-400 font-bold font-mono bg-slate-100 border border-slate-300 px-2 py-0.5 rounded text-xs">
                      0.0%相似度 (计算已停用)
                    </span>
                  )}
                </div>
                <div>
                  <strong className="text-slate-700 block mb-0.5">属性差异诊断:</strong>
                  <div className="leading-relaxed bg-white p-2.5 rounded border border-slate-100 text-slate-600 space-y-1">
                    {!isSecondPhaseEnabled ? (
                      <div className="text-slate-400 font-medium">
                        因该对象类型的属性比分处于全局关闭状态，无属性差异扣分诊断。
                      </div>
                    ) : selectedForCompare.differenceCount > 0 ? (
                      selectedForCompare.compareFields
                        .filter(f => f.status !== 'FULL')
                        .map((f, fIdx) => (
                          <div key={fIdx} className="flex items-start space-x-1">
                            <span className="text-red-500 shrink-0">•</span>
                            <span><strong>{f.fieldLabel}</strong>: {f.reason}</span>
                          </div>
                        ))
                    ) : (
                      <div className="text-emerald-700 font-semibold flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>核心材质、尺寸与螺纹螺距属性完全一致，匹配算分无特征冲突。</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 shrink-0 text-right">
              <button
                onClick={() => setSelectedForCompare(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold cursor-pointer transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </>
      )}

    </div>
  );
};
