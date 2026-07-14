import React, { useState, useMemo } from 'react';
import { 
  ShieldAlert, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Info, 
  Check, 
  X,
  AlertTriangle,
  XCircle,
  ToggleLeft,
  ArrowRight,
  HelpCircle,
  CheckCircle2
} from 'lucide-react';
import { ThresholdRule, HardRule, CategoryCoverage, ObjectType } from '../types';

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

  // Editing overlay state
  const [editingRule, setEditingRule] = useState<{
    type: 'threshold' | 'hard' | 'coverage';
    isNew: boolean;
    item: any;
  } | null>(null);

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

  // CRUD handlers
  const handleEdit = (type: 'threshold' | 'hard' | 'coverage', item: any) => {
    setEditingRule({
      type,
      isNew: false,
      item: JSON.parse(JSON.stringify(item)) // deep clone for modal form edits
    });
  };

  const handleAddNew = (type: 'threshold' | 'hard' | 'coverage') => {
    let defaultItem: any = {};
    if (type === 'threshold') {
      defaultItem = {
        ruleName: '',
        applicableObjectType: 'PART_MECHANICAL' as ObjectType,
        applicableCategory: '',
        reuseThreshold: 85,
        reviewThresholdMin: 65,
        reviewThresholdMax: 85,
        isEnabled: true,
        version: 'V1.0',
        remarks: ''
      };
    } else if (type === 'hard') {
      defaultItem = {
        ruleName: '',
        ruleType: 'FORCE_REVIEW' as any,
        applicableObjectType: 'PART_MECHANICAL' as ObjectType,
        applicableCategory: '',
        triggerField: '',
        triggerCondition: '',
        triggerExample: '',
        actionAfterTrigger: 'RECOMMEND_REVIEW' as any,
        priority: 1,
        isEnabled: true,
        remarks: ''
      };
    } else {
      defaultItem = {
        categoryPath: '',
        objectType: 'PART_MECHANICAL' as ObjectType,
        whitelistId: 'WLIST_DEFAULT',
        similarityRuleSetId: 'RSET_DEFAULT',
        thresholdRuleId: thresholdRules[0]?.ruleName || '默认阈值规则',
        hardRuleSetIds: ['HRULE_DEFAULT'],
        weightOverrideInfo: '不覆盖，继承父级权重',
        inheritParent: true,
        isEnabled: true,
        version: 'V1.0'
      };
    }

    setEditingRule({
      type,
      isNew: true,
      item: defaultItem
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule) return;

    const { type, isNew, item } = editingRule;

    if (type === 'threshold') {
      if (!item.ruleName || !item.applicableCategory) {
        alert('请填写必填项：规则名称、适用物料分类。');
        return;
      }
      let updated: ThresholdRule[];
      if (isNew) {
        const newRule: ThresholdRule = {
          ...item,
          id: 'th_' + Date.now(),
          version: 'V' + (thresholdRules.length + 1) + '.0',
        };
        updated = [...thresholdRules, newRule];
      } else {
        updated = thresholdRules.map(r => r.id === item.id ? item : r);
      }
      onUpdateThresholdRules(updated);
    } else if (type === 'hard') {
      if (!item.ruleName || !item.triggerField || !item.triggerCondition) {
        alert('请填写必填项：规则名称、触发条件字段、触发逻辑。');
        return;
      }
      let updated: HardRule[];
      if (isNew) {
        const newRule: HardRule = {
          ...item,
          id: 'hd_' + Date.now(),
        };
        updated = [...hardRules, newRule];
      } else {
        updated = hardRules.map(r => r.id === item.id ? item : r);
      }
      onUpdateHardRules(updated);
    } else if (type === 'coverage') {
      if (!item.categoryPath) {
        alert('请填写必填项：分类层级路径。');
        return;
      }
      let updated: CategoryCoverage[];
      if (isNew) {
        const newRule: CategoryCoverage = {
          ...item,
          id: 'cov_' + Date.now(),
          version: 'V' + (coverages.length + 1) + '.0',
        };
        updated = [...coverages, newRule];
      } else {
        updated = coverages.map(r => r.id === item.id ? item : r);
      }
      onUpdateCoverages(updated);
    }

    setEditingRule(null);
  };

  const handleDelete = (type: 'threshold' | 'hard' | 'coverage', id: string) => {
    if (window.confirm('确定要删除这条决策处理规则吗？(评审原型支持即时生效)')) {
      if (type === 'threshold') {
        onUpdateThresholdRules(thresholdRules.filter(r => r.id !== id));
      } else if (type === 'hard') {
        onUpdateHardRules(hardRules.filter(r => r.id !== id));
      } else if (type === 'coverage') {
        onUpdateCoverages(coverages.filter(r => r.id !== id));
      }
    }
  };

  const handleStatusToggle = (type: 'threshold' | 'hard' | 'coverage', item: any) => {
    if (type === 'threshold') {
      onUpdateThresholdRules(thresholdRules.map(r => r.id === item.id ? { ...r, isEnabled: !r.isEnabled } : r));
    } else if (type === 'hard') {
      onUpdateHardRules(hardRules.map(r => r.id === item.id ? { ...r, isEnabled: !r.isEnabled } : r));
    } else if (type === 'coverage') {
      onUpdateCoverages(coverages.map(r => r.id === item.id ? { ...r, isEnabled: !r.isEnabled } : r));
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 relative">
      
      {/* Top Main Banner with explicit Stage Definition */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5 text-amber-500" />
                <span>三化决策规则配置</span>
              </h1>
              <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded text-[10px] font-semibold border border-amber-200">
                [正式系统界面]
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1.5 flex items-center">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 mr-2"></span>
              三化决策规则：用于将相似度结果转换为复用、复核、新建等业务建议，不负责相似度计算本身。
            </p>
          </div>
          <div className="flex items-center space-x-2 text-xs text-slate-400 font-mono">
            <span>决策引擎版本: V1.2.0</span>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 mt-4 -mb-4">
          <button
            onClick={() => { setActiveTab('threshold'); setKeyword(''); }}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'threshold'
                ? 'border-amber-600 text-amber-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            决策阈值规则 ({filteredThresholds.length})
          </button>
          <button
            onClick={() => { setActiveTab('hard'); setKeyword(''); }}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'hard'
                ? 'border-amber-600 text-amber-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            硬性控制与强制复核 ({filteredHardRules.length})
          </button>
          <button
            onClick={() => { setActiveTab('coverage'); setKeyword(''); }}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'coverage'
                ? 'border-amber-600 text-amber-600 font-bold'
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
                  ? "搜索强控/强制复核规则、触发字段..."
                  : "搜索分类绑定路径、覆盖描述..."
            }
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <button
            onClick={() => handleAddNew(activeTab)}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>
              {activeTab === 'threshold' ? '新建阈值规则' : activeTab === 'hard' ? '新建强制/硬控场景' : '绑定分类决策策略'}
            </span>
          </button>
        </div>
      </div>

      {/* Main lists */}
      <div className="flex-1 overflow-auto p-6">
        
        {activeTab === 'threshold' && (
          <div className="space-y-4">
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
                    <th className="px-4 py-3 text-center">操作(原型可编辑)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredThresholds.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-slate-400">暂无符合条件的阈值规则</td>
                    </tr>
                  ) : (
                    filteredThresholds.map(r => (
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
                          <button
                            onClick={() => handleStatusToggle('threshold', r)}
                            title="点击快速启用/禁用"
                          >
                            <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                              r.isEnabled ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-400 border border-slate-200'
                            }`}>
                              {r.isEnabled ? '启用中' : '已停用'}
                            </span>
                          </button>
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-500">{r.version}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center space-x-1.5">
                            <button onClick={() => handleEdit('threshold', r)} className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-blue-600 transition-all" title="编辑阈值">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDelete('threshold', r.id)} className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-red-600 transition-all" title="删除阈值">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'hard' && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 text-xs font-semibold">
                    <th className="px-4 py-3">强制/硬性控制规则名称</th>
                    <th className="px-4 py-3">决策建议分类</th>
                    <th className="px-4 py-3">适用物料分类</th>
                    <th className="px-4 py-3">触发条件字段</th>
                    <th className="px-4 py-3">判断触发逻辑</th>
                    <th className="px-4 py-3">命中后强制转换流程动作</th>
                    <th className="px-4 py-3">状态</th>
                    <th className="px-4 py-3 text-center">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredHardRules.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-400">暂无符合条件的硬控规则</td>
                    </tr>
                  ) : (
                    filteredHardRules.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{r.ruleName}</div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">测试示例：{r.triggerExample}</div>
                        </td>
                        <td className="px-4 py-3">
                          {r.ruleType === 'FORCE_REVIEW' ? (
                            <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-bold">强制复核</span>
                          ) : r.ruleType === 'NON_REUSABLE' ? (
                            <span className="bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded text-[10px] font-bold">禁止复用</span>
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
                              <span>降级强制复核建议</span>
                            </span>
                          ) : r.actionAfterTrigger === 'PROHIBIT_REUSE' ? (
                            <span className="text-red-700 font-bold flex items-center space-x-1">
                              <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                              <span className="text-red-600 font-bold">禁止复用建议</span>
                            </span>
                          ) : (
                            <span className="text-slate-600 font-semibold flex items-center space-x-1">
                              <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>仅输出高亮差异预警</span>
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleStatusToggle('hard', r)}
                            title="点击启用/停用"
                          >
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              r.isEnabled ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-400 border border-slate-200'
                            }`}>
                              {r.isEnabled ? '已启动' : '已停用'}
                            </span>
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center space-x-1.5">
                            <button onClick={() => handleEdit('hard', r)} className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-blue-600 transition-all" title="编辑强控">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDelete('hard', r.id)} className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-red-600 transition-all" title="删除强控">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
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
                <li><strong>高阶大类直接继承</strong>：缺省配置下，所有子分类会自动继承父分类的相似度字段权重和决策阈值，避免配置雪崩。</li>
                <li><strong>差异化细化重置</strong>：针对特定需要高度敏感控制的细类（如 "芯片"、"标准螺钉"），管理员可以新建绑定记录，覆盖其白名单和计算模型，从而执行更严格/更宽松的业务门槛。</li>
              </ul>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 text-xs font-semibold">
                    <th className="px-4 py-3">分类层级路径</th>
                    <th className="px-4 py-3">层级关系</th>
                    <th className="px-4 py-3">绑定阈值规则</th>
                    <th className="px-4 py-3">绑定白名单对照</th>
                    <th className="px-4 py-3">绑定计算字段规则</th>
                    <th className="px-4 py-3">核心权重覆盖详情描述</th>
                    <th className="px-4 py-3">生效状态</th>
                    <th className="px-4 py-3 text-center">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredCoverages.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-400">暂无符合条件的分类覆盖绑定关系</td>
                    </tr>
                  ) : (
                    filteredCoverages.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-semibold text-slate-900 font-mono">{r.categoryPath}</td>
                        <td className="px-4 py-3">
                          {r.inheritParent ? (
                            <span className="text-emerald-600 font-medium flex items-center space-x-1">
                              <Check className="w-3.5 h-3.5" />
                              <span>继承父级</span>
                            </span>
                          ) : (
                            <span className="text-amber-600 font-bold flex items-center space-x-1 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 text-[10px]">
                              <ToggleLeft className="w-3.5 h-3.5" />
                              <span>首层策略重设</span>
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
                          <button
                            onClick={() => handleStatusToggle('coverage', r)}
                            title="点击启动/停用"
                          >
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              r.isEnabled ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-400 border border-slate-200'
                            }`}>
                              {r.isEnabled ? '绑定生效中' : '已停用'}
                            </span>
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center space-x-1.5">
                            <button onClick={() => handleEdit('coverage', r)} className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-blue-600 transition-all" title="编辑覆盖绑定">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDelete('coverage', r.id)} className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-red-600 transition-all" title="删除覆盖绑定">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* 业务指南 */}
      <div className="mx-6 mb-6 p-4 bg-slate-50 border border-slate-200 rounded-lg shrink-0 space-y-4">
        <div className="flex items-center space-x-2">
          <span className="px-2 py-0.5 bg-slate-600 text-white rounded text-[10px] font-bold">
            业务指南
          </span>
          <h4 className="text-xs font-bold text-slate-800">三化决策规则与管理阈值说明</h4>
        </div>

        <div className="text-[11px] text-slate-600 space-y-3 leading-relaxed">
          {/* Business Guide */}
          <div>
            <p>
              此模块属于<strong>三阶段（三化决策）的规则中心</strong>。系统在二阶段根据属性、名称等计算出纯客观的相似度得分（像不像）后，三化决策模块将分数对应到管理阈值线，并加载硬性控制或强控规则，输出最终的业务治理建议（能不能直接复用 / 是否需要人工复核 / 是否允许新建），不负责相似度分数的计算本身。应用端查找时只输出建议，不硬性拦截用户新建。
            </p>
          </div>

          {/* Scale Legend */}
          <div className="pt-2 border-t border-slate-200">
            <span className="font-semibold text-slate-700 block mb-1">📊 三化审核阈值口径划分（供参考）：</span>
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center space-x-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200 font-bold">
                <span>建议复用: &gt;= 86%</span>
              </span>
              <span className="flex items-center space-x-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200 font-bold">
                <span>建议复核: 68% - 86%</span>
              </span>
              <span className="flex items-center space-x-1 bg-slate-50 text-slate-600 px-2 py-0.5 rounded border border-slate-200 font-bold">
                <span>允许新建: &lt; 68%</span>
              </span>
            </div>
          </div>

          {/* Hard Control Examples */}
          <div className="pt-2 border-t border-slate-200">
            <span className="font-semibold text-slate-700 block mb-1.5">🚫 典型硬控降级业务场景示例：</span>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
              <div className="bg-white p-2 rounded border border-slate-200">
                <span className="font-semibold text-slate-800 block mb-0.5">材质大类不一致</span>
                <span className="text-[10px] text-slate-500">关键用料冲突，相似度再高也必须强制判定为 <strong className="text-amber-600 font-medium">强制复核</strong></span>
              </div>
              <div className="bg-white p-2 rounded border border-slate-200">
                <span className="font-semibold text-slate-800 block mb-0.5">公差尺寸溢出</span>
                <span className="text-[10px] text-slate-500">物理规格差异超限，强制判定为 <strong className="text-amber-600 font-medium">强制复核</strong></span>
              </div>
              <div className="bg-white p-2 rounded border border-slate-200">
                <span className="font-semibold text-slate-800 block mb-0.5">候选件状态已作废</span>
                <span className="text-[10px] text-slate-500">候选件已失效或退市停产，强制判定为 <strong className="text-red-600 font-medium">禁止复用</strong></span>
              </div>
              <div className="bg-white p-2 rounded border border-slate-200">
                <span className="font-semibold text-slate-800 block mb-0.5">关键耐压/封装不同</span>
                <span className="text-[10px] text-slate-500">阻容感核心安全或物理特性冲突，强制判定为 <strong className="text-amber-600 font-medium">建议复核</strong></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RENDER POPUP EDITING FOR DECISION RULES */}
      {editingRule && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-xl w-full border border-slate-200 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-lg shrink-0">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-slate-900">
                  {editingRule.isNew ? '新建' : '编辑'}
                  {editingRule.type === 'threshold' ? '三化管理决策阈值线' : editingRule.type === 'hard' ? '强制复核与硬性控制规则' : '分类大类覆盖决策绑定'}
                </h3>
              </div>
              <button onClick={() => setEditingRule(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSave} className="flex-1 overflow-auto p-6 space-y-4">
              
              <div className="p-2.5 bg-blue-50 rounded text-[11px] text-blue-800 flex items-start space-x-1.5">
                <Info className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  <strong>阶段导视：</strong>此处的改动不作用于二阶段字段算分。它主要负责把相似度得分 (0-100) 的计算结果，转义为应用端新建时的业务建议逻辑。
                </span>
              </div>

              {/* Threshold rule form fields */}
              {editingRule.type === 'threshold' && (
                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">阈值规则名称 <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      required
                      value={editingRule.item.ruleName}
                      onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, ruleName: e.target.value }})}
                      placeholder="例如: 阀门大类专属决策阈值"
                      className="w-full bg-white border border-slate-300 rounded p-2 focus:ring-1 focus:ring-blue-500 font-semibold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">适用对象类型</label>
                      <select 
                        value={editingRule.item.applicableObjectType}
                        onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, applicableObjectType: e.target.value as ObjectType }})}
                        className="w-full bg-white border border-slate-300 rounded p-2 focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="PART_MECHANICAL">机械零件</option>
                        <option value="PART_ELECTRICAL">电气元器件</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">适用物料分类 <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        required
                        value={editingRule.item.applicableCategory}
                        onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, applicableCategory: e.target.value }})}
                        placeholder="例如: 阀门/法兰阀/截止阀"
                        className="w-full bg-white border border-slate-300 rounded p-2 focus:ring-1 focus:ring-blue-500 font-medium"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-3">
                    <span className="font-bold text-slate-700 block text-[11px]">决策输出推荐区间数值 (%)</span>
                    
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block font-semibold text-emerald-700 mb-1">建议复用线 &gt;=</label>
                        <input 
                          type="number" 
                          min="1" max="100"
                          value={editingRule.item.reuseThreshold}
                          onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, reuseThreshold: parseInt(e.target.value) || 85 }})}
                          className="w-full bg-white border border-slate-300 rounded p-1.5 text-center text-xs font-bold font-mono text-emerald-600 focus:ring-1 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-amber-700 mb-1">复核区间下限 &gt;=</label>
                        <input 
                          type="number" 
                          min="1" max="100"
                          value={editingRule.item.reviewThresholdMin}
                          onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, reviewThresholdMin: parseInt(e.target.value) || 65 }})}
                          className="w-full bg-white border border-slate-300 rounded p-1.5 text-center text-xs font-bold font-mono text-amber-600 focus:ring-1 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">复核区间上限 &lt;</label>
                        <input 
                          type="number" 
                          min="1" max="100"
                          value={editingRule.item.reviewThresholdMax}
                          onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, reviewThresholdMax: parseInt(e.target.value) || 85 }})}
                          className="w-full bg-white border border-slate-300 rounded p-1.5 text-center text-xs font-bold font-mono text-slate-600 focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 block">注：计算分数低于复核区间下限时，系统将输出 “允许新建” 的建议。</span>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">是否启用此阈值规则</label>
                    <select 
                      value={editingRule.item.isEnabled ? 'true' : 'false'}
                      onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, isEnabled: e.target.value === 'true' }})}
                      className="w-full bg-white border border-slate-300 rounded p-2 focus:ring-1 focus:ring-blue-500 font-semibold"
                    >
                      <option value="true" className="text-emerald-600">已启用 (ACTIVE)</option>
                      <option value="false" className="text-slate-400">已停用 (INACTIVE)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">规则备注</label>
                    <input 
                      type="text" 
                      value={editingRule.item.remarks || ''}
                      onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, remarks: e.target.value }})}
                      placeholder="例如：对标准通用阀门适当调高复用阈值，规避小差异引起的重复新建。"
                      className="w-full bg-white border border-slate-300 rounded p-2 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* Hard control rule form fields */}
              {editingRule.type === 'hard' && (
                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">控制规则名称 <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      required
                      value={editingRule.item.ruleName}
                      onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, ruleName: e.target.value }})}
                      placeholder="例如: 材质不一致降级保护规则"
                      className="w-full bg-white border border-slate-300 rounded p-2 focus:ring-1 focus:ring-blue-500 font-semibold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">决策建议类型</label>
                      <select 
                        value={editingRule.item.ruleType}
                        onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, ruleType: e.target.value as any }})}
                        className="w-full bg-white border border-slate-300 rounded p-2 focus:ring-1 focus:ring-blue-500 font-bold"
                      >
                        <option value="FORCE_REVIEW">强制复核规则 (建议人工复核)</option>
                        <option value="NON_REUSABLE">不可复用规则 (输出禁止复用)</option>
                        <option value="RISK_ALERT">仅做差异预警 (仅输出高亮差异字段)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">适用物料分类 <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        required
                        value={editingRule.item.applicableCategory}
                        onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, applicableCategory: e.target.value }})}
                        placeholder="通用件 / 芯片类 / ALL"
                        className="w-full bg-white border border-slate-300 rounded p-2 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">触发条件判定字段 <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        required
                        value={editingRule.item.triggerField}
                        onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, triggerField: e.target.value }})}
                        placeholder="如: material, lifecycleState"
                        className="w-full bg-white border border-slate-300 rounded p-2 focus:ring-1 focus:ring-blue-500 font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">触发测试示例值</label>
                      <input 
                        type="text" 
                        value={editingRule.item.triggerExample}
                        onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, triggerExample: e.target.value }})}
                        placeholder="如: Q235B vs SUS304"
                        className="w-full bg-white border border-slate-300 rounded p-2 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">判断触发逻辑(可输入表达式说明) <span className="text-red-500">*</span></label>
                    <textarea 
                      rows={3}
                      required
                      value={editingRule.item.triggerCondition}
                      onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, triggerCondition: e.target.value }})}
                      placeholder="例如: 候选件与拟建件物料大类一致，但详细材质大类发生重大改变(铁系 vs 不锈钢系)，导致安全性受阻。"
                      className="w-full bg-white border border-slate-300 rounded p-2 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">匹配后触发动作</label>
                      <select 
                        value={editingRule.item.actionAfterTrigger}
                        onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, actionAfterTrigger: e.target.value as any }})}
                        className="w-full bg-white border border-slate-300 rounded p-2 focus:ring-1 focus:ring-blue-500 font-bold"
                      >
                        <option value="RECOMMEND_REVIEW">强制置为 [建议复核] 状态</option>
                        <option value="PROHIBIT_REUSE">强制拦截置为 [禁止复用] 状态</option>
                        <option value="ONLY_ALERT">仅进行前台差异红字强预警</option>
                      </select>
                      <span className="text-[10px] text-slate-400 block mt-1">注：只有设置为 [PROHIBIT_REUSE] 且启用时，最终计算才会展现 “禁止复用” 字样。</span>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">优先级排序 (数字越大越优先)</label>
                      <input 
                        type="number" 
                        value={editingRule.item.priority}
                        onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, priority: parseInt(e.target.value) || 1 }})}
                        className="w-full bg-white border border-slate-300 rounded p-2 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">启用状态</label>
                    <select 
                      value={editingRule.item.isEnabled ? 'true' : 'false'}
                      onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, isEnabled: e.target.value === 'true' }})}
                      className="w-full bg-white border border-slate-300 rounded p-2 focus:ring-1 focus:ring-blue-500 font-semibold"
                    >
                      <option value="true" className="text-emerald-600">已启动 (ACTIVE)</option>
                      <option value="false" className="text-slate-400">已停用 (INACTIVE)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Category coverage form fields */}
              {editingRule.type === 'coverage' && (
                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">物料分类层级路径 (用于承接决策策略) <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      required
                      value={editingRule.item.categoryPath}
                      onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, categoryPath: e.target.value }})}
                      placeholder="例如: PLM/标准件/螺栓螺钉/外六角"
                      className="w-full bg-white border border-slate-300 rounded p-2 focus:ring-1 focus:ring-blue-500 font-mono font-semibold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">策略来源层级模式</label>
                      <select 
                        value={editingRule.item.inheritParent ? 'true' : 'false'}
                        onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, inheritParent: e.target.value === 'true' }})}
                        className="w-full bg-white border border-slate-300 rounded p-2 focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="true">继承父分类决策策略 (Inherit)</option>
                        <option value="false">重置覆盖，执行特异决策策略 (Override)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">绑定对应阈值规则</label>
                      <select 
                        value={editingRule.item.thresholdRuleId}
                        onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, thresholdRuleId: e.target.value }})}
                        className="w-full bg-white border border-slate-300 rounded p-2 focus:ring-1 focus:ring-blue-500 font-medium"
                      >
                        {thresholdRules.map(t => (
                          <option key={t.id} value={t.ruleName}>{t.ruleName}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">绑定字段白名单集</label>
                      <input 
                        type="text"
                        value={editingRule.item.whitelistId}
                        onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, whitelistId: e.target.value }})}
                        className="w-full bg-white border border-slate-300 rounded p-2 focus:ring-1 focus:ring-blue-500 font-mono text-slate-600"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">绑定算分规则引擎集</label>
                      <input 
                        type="text"
                        value={editingRule.item.similarityRuleSetId}
                        onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, similarityRuleSetId: e.target.value }})}
                        className="w-full bg-white border border-slate-300 rounded p-2 focus:ring-1 focus:ring-blue-500 font-mono text-slate-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">核心权重覆盖详情描述</label>
                    <textarea 
                      rows={3}
                      value={editingRule.item.weightOverrideInfo}
                      onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, weightOverrideInfo: e.target.value }})}
                      placeholder="例如：重设芯片引脚数(pin_count)权重为0.4，重设封装类型权重为0.3。"
                      className="w-full bg-white border border-slate-300 rounded p-2 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">绑定生效状态</label>
                    <select 
                      value={editingRule.item.isEnabled ? 'true' : 'false'}
                      onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, isEnabled: e.target.value === 'true' }})}
                      className="w-full bg-white border border-slate-300 rounded p-2 focus:ring-1 focus:ring-blue-500 font-semibold"
                    >
                      <option value="true" className="text-emerald-600">启动绑定并生效 (ACTIVE)</option>
                      <option value="false" className="text-slate-400">已停用此大类绑定 (INACTIVE)</option>
                    </select>
                  </div>
                </div>
              )}

            </form>

            {/* Modal Actions */}
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end space-x-3 bg-slate-50 rounded-b-lg shrink-0">
              <button
                type="button"
                onClick={() => setEditingRule(null)}
                className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-100 rounded text-xs font-semibold text-slate-700 transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded text-xs font-semibold text-white shadow-xs transition-colors"
              >
                保存规则 (立即生效)
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
