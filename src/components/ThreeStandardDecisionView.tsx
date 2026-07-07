import React, { useState, useMemo } from 'react';
import { 
  ShieldAlert, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Info, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight,
  GitPullRequest,
  Check,
  ToggleLeft,
  XCircle
} from 'lucide-react';
import { ThresholdRule, HardRule, CategoryCoverage } from '../types';

interface ThreeStandardDecisionViewProps {
  thresholdRules: ThresholdRule[];
  onUpdateThresholdRules: (rules: ThresholdRule[]) => void;
  hardRules: HardRule[];
  onUpdateHardRules: (rules: HardRule[]) => void;
  coverages: CategoryCoverage[];
  onUpdateCoverages: (coverages: CategoryCoverage[]) => void;
}

export const ThreeStandardDecisionView: React.FC<ThreeStandardDecisionViewProps> = ({
  thresholdRules,
  onUpdateThresholdRules,
  hardRules,
  onUpdateHardRules,
  coverages,
  onUpdateCoverages
}) => {
  const [activeTab, setActiveTab] = useState<'threshold' | 'hard' | 'coverage'>('threshold');
  const [keyword, setKeyword] = useState('');

  // Filtering calculations
  const filteredThresholds = useMemo(() => {
    return thresholdRules.filter(r => 
      keyword === '' || 
      r.ruleName.toLowerCase().includes(keyword.toLowerCase()) ||
      r.applicableCategory.toLowerCase().includes(keyword.toLowerCase())
    );
  }, [thresholdRules, keyword]);

  const filteredHardRules = useMemo(() => {
    return hardRules.filter(r => 
      keyword === '' || 
      r.ruleName.toLowerCase().includes(keyword.toLowerCase()) ||
      r.applicableCategory.toLowerCase().includes(keyword.toLowerCase()) ||
      r.triggerField.toLowerCase().includes(keyword.toLowerCase())
    );
  }, [hardRules, keyword]);

  const filteredCoverages = useMemo(() => {
    return coverages.filter(r => 
      keyword === '' || 
      r.categoryPath.toLowerCase().includes(keyword.toLowerCase()) ||
      r.weightOverrideInfo.toLowerCase().includes(keyword.toLowerCase())
    );
  }, [coverages, keyword]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
      
      {/* Top Main Banner with explicit Stage Definition */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5 text-amber-500 animate-pulse" />
              <span>三化决策规则配置</span>
            </h1>
            <p className="text-xs text-blue-700 mt-1 flex items-center space-x-1 font-medium">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>流程架构：二阶段负责计算客观相似度 (像不像)，三化决策规则负责把相似度转换成业务管理建议 (判不判)。</span>
            </p>
          </div>
          <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded font-semibold">
            三阶段：决策输出
          </span>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 mt-4 -mb-4">
          <button
            onClick={() => { setActiveTab('threshold'); setKeyword(''); }}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'threshold'
                ? 'border-amber-600 text-amber-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            决策阈值规则 ({filteredThresholds.length})
          </button>
          <button
            onClick={() => { setActiveTab('hard'); setKeyword(''); }}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'hard'
                ? 'border-amber-600 text-amber-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            一票否决强控规则 ({filteredHardRules.length})
          </button>
          <button
            onClick={() => { setActiveTab('coverage'); setKeyword(''); }}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'coverage'
                ? 'border-amber-600 text-amber-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            分类覆盖绑定规则 ({filteredCoverages.length})
          </button>
        </div>
      </div>

      {/* Control Actions & Searching */}
      <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 shrink-0 flex items-center justify-between">
        <div className="relative w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={
              activeTab === 'threshold' 
                ? "搜索阈值规则名称、适用分类..." 
                : activeTab === 'hard'
                  ? "搜索强控规则、触发字段..."
                  : "搜索分类绑定路径、覆盖描述..."
            }
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <button
            onClick={() => alert('UCD 评审版已简化强控与阈值修改流，重点展示三化审核业务逻辑闭环。')}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-slate-900 text-white hover:bg-slate-800 rounded-md text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>
              {activeTab === 'threshold' ? '新建阈值线' : activeTab === 'hard' ? '新建强控场景' : '绑定分类策略'}
            </span>
          </button>
        </div>
      </div>

      {/* Main lists */}
      <div className="flex-1 overflow-auto p-6">
        
        {activeTab === 'threshold' && (
          <div className="space-y-4">
            {/* Legend / Standard Threshold Scale Card */}
            <div className="bg-gradient-to-r from-amber-50 to-blue-50 border border-amber-100 rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 block mb-1">💡 UCD 评审导读：标准三化审核阈值口径划分</span>
                <span className="text-[11px] text-slate-500">
                  相似度计算完毕后，系统将依据如下区间直接匹配三化审核建议，提供非自动化的审核复选支撑：
                </span>
              </div>
              <div className="flex items-center space-x-3 mt-3 md:mt-0">
                <span className="flex items-center space-x-1 text-xs bg-emerald-500/10 text-emerald-700 px-2.5 py-1 rounded border border-emerald-500/20 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>建议复用: &gt;= 86%</span>
                </span>
                <span className="flex items-center space-x-1 text-xs bg-amber-500/10 text-amber-700 px-2.5 py-1 rounded border border-amber-500/20 font-bold">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span>建议复核: 68% - 86%</span>
                </span>
                <span className="flex items-center space-x-1 text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded border border-slate-200 font-bold">
                  <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                  <span>允许新建: &lt; 68%</span>
                </span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 text-xs font-semibold">
                    <th className="px-4 py-3">规则名称</th>
                    <th className="px-4 py-3">适用对象类型</th>
                    <th className="px-4 py-3">适用物料分类</th>
                    <th className="px-4 py-3 text-emerald-700">建议复用线</th>
                    <th className="px-4 py-3 text-amber-700">建议复核区间</th>
                    <th className="px-4 py-3 text-slate-600">允许新建线</th>
                    <th className="px-4 py-3">状态</th>
                    <th className="px-4 py-3">生效版本</th>
                    <th className="px-4 py-3 text-center">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredThresholds.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-semibold text-slate-900">{r.ruleName}</td>
                      <td className="px-4 py-3">
                        <span className="bg-blue-50 text-blue-700 border border-blue-100 px-1.5 py-0.5 rounded text-[10px]">
                          {r.applicableObjectType === 'PART_MECHANICAL' ? '机械零件' : '电气元器件'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700">{r.applicableCategory}</td>
                      <td className="px-4 py-3 font-mono font-bold text-emerald-600">
                        &gt;= {r.reuseThreshold}%
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-amber-600">
                        {r.reviewThresholdMin}% - {r.reviewThresholdMax}%
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-500">
                        &lt; {r.reviewThresholdMin}%
                      </td>
                      <td className="px-4 py-3">
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded font-bold text-[10px]">
                          启用中
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-500">{r.version}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button onClick={() => alert('已进入 UCD 审核预览，此处仅供评审。')} className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-blue-600">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'hard' && (
          <div className="space-y-4">
            {/* Hard rule logic guidelines */}
            <div className="bg-red-50 border border-red-100 rounded-lg p-4">
              <span className="text-xs font-bold text-red-900 block mb-1">🚫 强控制口径与红线设计 (一票否决)</span>
              <span className="text-[11px] text-red-700 block mb-2">
                为规避核心业务隐患，系统支持不参考相似度直接输出一票否决意见。典型的内置强控制场景如下：
              </span>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-2 text-[11px]">
                <div className="bg-white border border-red-100 p-2 rounded shadow-xs">
                  <span className="font-semibold text-slate-800 block mb-0.5">材料不一致</span>
                  <span className="text-slate-500">核心材料属性冲突时，强制降级为<strong className="text-amber-600">建议复核</strong></span>
                </div>
                <div className="bg-white border border-red-100 p-2 rounded shadow-xs">
                  <span className="font-semibold text-slate-800 block mb-0.5">尺寸超容差</span>
                  <span className="text-slate-500">超出机械公差退避阈值时，强制降级为<strong className="text-amber-600">建议复核</strong></span>
                </div>
                <div className="bg-white border border-red-100 p-2 rounded shadow-xs">
                  <span className="font-semibold text-slate-800 block mb-0.5">生命周期停用</span>
                  <span className="text-slate-500">若候选件已停用或作废，强制拦截标记为<strong className="text-red-600">禁止复用</strong></span>
                </div>
                <div className="bg-white border border-red-100 p-2 rounded shadow-xs">
                  <span className="font-semibold text-slate-800 block mb-0.5">来源数据不同步</span>
                  <span className="text-slate-500">当PLM/ERP主数据未到位，强制升至<strong className="text-amber-600">建议复核</strong></span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 text-xs font-semibold">
                    <th className="px-4 py-3">一票否决规则名称</th>
                    <th className="px-4 py-3">规则类型</th>
                    <th className="px-4 py-3">适用物料分类</th>
                    <th className="px-4 py-3">触发条件字段</th>
                    <th className="px-4 py-3">触发判断逻辑</th>
                    <th className="px-4 py-3">命中后强制转化动作</th>
                    <th className="px-4 py-3">状态</th>
                    <th className="px-4 py-3 text-center">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredHardRules.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{r.ruleName}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">示例：{r.triggerExample}</div>
                      </td>
                      <td className="px-4 py-3">
                        {r.ruleType === 'FORCE_REVIEW' ? (
                          <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-bold">强制复核</span>
                        ) : r.ruleType === 'NON_REUSABLE' ? (
                          <span className="bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded text-[10px] font-bold">不可复用</span>
                        ) : (
                          <span className="bg-slate-50 text-slate-600 border border-slate-200 px-2 py-0.5 rounded text-[10px]">风险预警</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-700 font-medium">{r.applicableCategory}</td>
                      <td className="px-4 py-3 font-mono text-slate-600 font-semibold">{r.triggerField}</td>
                      <td className="px-4 py-3 text-slate-500 max-w-xs truncate" title={r.triggerCondition}>{r.triggerCondition}</td>
                      <td className="px-4 py-3">
                        {r.actionAfterTrigger === 'RECOMMEND_REVIEW' ? (
                          <span className="text-amber-700 font-bold flex items-center space-x-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span>强制降级为 [建议复核]</span>
                          </span>
                        ) : (
                          <span className="text-red-700 font-bold flex items-center space-x-1">
                            <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                            <span>一票否决 [禁止复用]</span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          r.isEnabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'
                        }`}>
                          {r.isEnabled ? '已启动' : '未启动'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => alert('已进入 UCD 审核，此处仅供评审。')} className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-blue-600">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'coverage' && (
          <div className="space-y-4">
            {/* Category inheritance guidelines */}
            <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 text-xs">
              <span className="font-bold text-emerald-900 block mb-1">🌲 分类策略继承与差异化覆盖策略</span>
              <ul className="list-disc pl-4 space-y-1 text-emerald-800 text-[11px]">
                <li><strong>默认规则继承</strong>：子分类自动继承父分类的相似度权重和决策阈值。</li>
                <li><strong>高阶差异口径</strong>：标准件（高复用，严阈值）、定制件（定制属性评分高）、电气元器件（极重视工作电压与封装形式）等大类支持通过覆盖机制分别进行差异化口径控制。</li>
              </ul>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 text-xs font-semibold">
                    <th className="px-4 py-3">分类层级路径</th>
                    <th className="px-4 py-3">继承自父级?</th>
                    <th className="px-4 py-3">绑定阈值规则</th>
                    <th className="px-4 py-3">绑定白名单过滤</th>
                    <th className="px-4 py-3">绑定核心算分字段</th>
                    <th className="px-4 py-3">核心权重覆盖详情描述</th>
                    <th className="px-4 py-3">生效状态</th>
                    <th className="px-4 py-3 text-center">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredCoverages.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-semibold text-slate-900 font-mono">{r.categoryPath}</td>
                      <td className="px-4 py-3">
                        {r.inheritParent ? (
                          <span className="text-emerald-600 font-medium flex items-center space-x-1">
                            <Check className="w-3.5 h-3.5" />
                            <span>继承</span>
                          </span>
                        ) : (
                          <span className="text-amber-600 font-bold flex items-center space-x-1">
                            <ToggleLeft className="w-3.5 h-3.5" />
                            <span>首层覆盖</span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-700 font-medium">{r.thresholdRuleId}</td>
                      <td className="px-4 py-3 font-mono text-slate-500">{r.whitelistId}</td>
                      <td className="px-4 py-3 text-slate-600 font-mono">{r.similarityRuleSetId}</td>
                      <td className="px-4 py-3 text-slate-500 max-w-xs truncate" title={r.weightOverrideInfo}>
                        {r.weightOverrideInfo}
                      </td>
                      <td className="px-4 py-3">
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded text-[10px] font-bold">
                          绑定生效中
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => alert('已进入 UCD 审核，此处仅供评审。')} className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-blue-600">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
