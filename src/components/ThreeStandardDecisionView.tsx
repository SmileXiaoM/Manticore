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
import { useFeedback } from './ui/FeedbackProvider';
import { paginateRows, TablePagination } from './ui/TablePagination';

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
  const { notify, confirm } = useFeedback();
  const [activeTab, setActiveTab] = useState<'threshold' | 'hard' | 'coverage'>('threshold');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

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
  const thresholdPage = paginateRows<ThresholdRule>(filteredThresholds, page, pageSize);
  const hardRulePage = paginateRows<HardRule>(filteredHardRules, page, pageSize);
  const coveragePage = paginateRows<CategoryCoverage>(filteredCoverages, page, pageSize);

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
        notify('请填写必填项：规则名称、适用物料分类。', 'warning');
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
        notify('请填写必填项：规则名称、触发条件字段、触发逻辑。', 'warning');
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
        notify('请填写必填项：分类层级路径。', 'warning');
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

  const handleDelete = async (type: 'threshold' | 'hard' | 'coverage', id: string) => {
    if (await confirm({ title: '删除规则', message: '确定要删除这条决策处理规则吗？评审原型将即时生效。', confirmText: '删除', tone: 'danger' })) {
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
    <div className="space-y-4" id="three-standard-decision-view-container">

      {/* Top Main Banner with explicit Stage Definition */}
      <div className="bg-[var(--ty-fill-white-color)] rounded-ty-sm border border-[var(--ty-border-color)] p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="w-full">
            <div className="flex items-center space-x-2">
              <h1 className="text-ty-xl font-bold text-[var(--ty-font-main-color)] flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5 text-[var(--ty-orange-color)]" />
                <span>三化决策规则配置</span>
              </h1>
              <span className="inline-flex items-center gap-1 min-h-6 px-2 inline-flex items-center bg-[var(--ty-orange-lightest-color)] text-[var(--ty-font-main-light-color)] rounded-ty-xs text-ty-2xs font-semibold border border-[var(--ty-orange-color)]/30">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--ty-orange-color)]" />
                三阶段后续概念原型
              </span>
            </div>

            <div className="mt-2 p-3 bg-[var(--ty-fill-weak-dark-color)] border border-[var(--ty-border-color)] rounded-ty-sm text-ty-xs text-[var(--ty-font-sub-color)] leading-relaxed">
              <p className="font-semibold text-[var(--ty-font-main-color)] mb-1 flex items-center">
                <Info className="w-4 h-4 mr-1 text-[var(--ty-primary-color)]" />
                三阶段后续决策规则行为说明
              </p>
              <ul className="list-disc pl-4 space-y-1 mt-1">
                <li><strong className="text-[var(--ty-font-main-color)]">二阶段</strong>只输出相似度分数、命中原因和差异字段等证据；</li>
                <li><strong className="text-[var(--ty-font-main-color)]">三阶段</strong>规则才输出建议复用、建议复核、允许新建、禁止复用等业务建议；</li>
                <li>三阶段规则不参与二阶段字段相似度算分；</li>
                <li className="text-[var(--ty-orange-color)] font-semibold">当前页面仅作为概念设计原型，不进入二阶段交付和验收基线。</li>
              </ul>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-ty-2xs text-[var(--ty-font-main-light-color)] font-semibold bg-[var(--ty-orange-lightest-color)] min-h-6 px-2 inline-flex items-center rounded-ty-xs border border-[var(--ty-orange-color)]/30 shrink-0 self-start mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--ty-orange-color)]" />
            <span>参考规则集 V1.2.0（草案）</span>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-[var(--ty-border-color)] mt-4">
          <button
            onClick={() => { setActiveTab('threshold'); setKeyword(''); setPage(1); }}
            className={`px-4 py-2 text-ty-sm font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'threshold'
                ? 'border-[var(--ty-primary-color)] text-[var(--ty-primary-color)]'
                : 'border-transparent text-[var(--ty-font-sub-color)] hover:text-[var(--ty-font-main-color)]'
            }`}
          >
            决策阈值规则 ({filteredThresholds.length})
          </button>
          <button
            onClick={() => { setActiveTab('hard'); setKeyword(''); setPage(1); }}
            className={`px-4 py-2 text-ty-sm font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'hard'
                ? 'border-[var(--ty-primary-color)] text-[var(--ty-primary-color)]'
                : 'border-transparent text-[var(--ty-font-sub-color)] hover:text-[var(--ty-font-main-color)]'
            }`}
          >
            硬性控制与强制复核 ({filteredHardRules.length})
          </button>
          <button
            onClick={() => { setActiveTab('coverage'); setKeyword(''); setPage(1); }}
            className={`px-4 py-2 text-ty-sm font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'coverage'
                ? 'border-[var(--ty-primary-color)] text-[var(--ty-primary-color)]'
                : 'border-transparent text-[var(--ty-font-sub-color)] hover:text-[var(--ty-font-main-color)]'
            }`}
          >
            分类覆盖绑定规则 ({filteredCoverages.length})
          </button>
        </div>
      </div>

      {/* Control Actions & Searching */}
      <div className="bg-[var(--ty-fill-white-color)] px-4 py-3 border border-[var(--ty-border-color)] rounded-ty-sm flex items-center justify-between">
        <div className="relative w-80">
          <Search className="w-3.5 h-3.5 text-[var(--ty-font-sub-light-color)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
            placeholder={
              activeTab === 'threshold'
                ? "搜索阈值规则名称、适用分类..."
                : activeTab === 'hard'
                  ? "搜索强控/强制复核规则、触发字段..."
                  : "搜索分类绑定路径、覆盖描述..."
            }
            className="w-full pl-9 pr-3 h-8 bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm text-ty-xs text-[var(--ty-font-main-color)] focus:outline-none focus:border-[var(--ty-primary-color)]"
          />
        </div>

        <div>
          <button
            onClick={() => handleAddNew(activeTab)}
            className="flex items-center space-x-2 px-4 h-8 bg-[var(--ty-primary-color)] hover:bg-[var(--ty-primary-hover-color)] text-[var(--ty-font-white-color)] rounded-ty-sm text-ty-xs font-semibold transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>
              {activeTab === 'threshold' ? '新建阈值规则' : activeTab === 'hard' ? '新建强制/硬控场景' : '绑定分类决策策略'}
            </span>
          </button>
        </div>
      </div>

      {/* Main lists */}
      <div className="overflow-hidden">

        {activeTab === 'threshold' && (
          <div className="space-y-4">
            <div className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="ty-data-table w-full min-w-[960px] text-left border-collapse text-ty-xs">
                  <thead>
                    <tr className="bg-[var(--ty-fill-weak-dark-color)] border-b border-[var(--ty-border-color)] text-[var(--ty-font-sub-color)] font-semibold">
                      <th className="w-12 px-2 py-2 text-center">序号</th>
                      <th className="px-4 py-2 whitespace-nowrap">规则名称</th>
                      <th className="px-4 py-2 whitespace-nowrap">适用对象类型</th>
                      <th className="px-4 py-2 whitespace-nowrap">适用物料分类</th>
                      <th className="px-4 py-2 whitespace-nowrap text-[var(--ty-green-color)]">建议复用线</th>
                      <th className="px-4 py-2 whitespace-nowrap text-[var(--ty-orange-color)]">建议复核区间</th>
                      <th className="px-4 py-2 whitespace-nowrap text-[var(--ty-font-sub-color)]">允许新建线</th>
                      <th className="px-4 py-2 whitespace-nowrap">状态</th>
                      <th className="px-4 py-2 whitespace-nowrap">生效版本</th>
                      <th className="px-4 py-2 whitespace-nowrap text-center">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--ty-border-light-color)]">
                    {filteredThresholds.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-4 py-8 text-center text-[var(--ty-font-sub-light-color)]">暂无符合条件的阈值规则</td>
                      </tr>
                    ) : (
                      thresholdPage.rows.map((r, index) => (
                        <tr key={r.id} className="hover:bg-[var(--ty-fill-weak-dark-color)] transition-colors">
                          <td className="w-12 px-2 py-3 text-center text-[var(--ty-font-sub-color)]">{(thresholdPage.currentPage - 1) * pageSize + index + 1}</td>
                          <td className="px-4 py-3 font-semibold text-[var(--ty-font-main-color)] whitespace-nowrap">{r.ruleName}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="bg-[var(--ty-primary-lighter-color)]/30 text-[var(--ty-primary-color)] border border-[var(--ty-primary-lighter-color)] min-h-6 px-2 inline-flex items-center rounded-ty-xs text-ty-2xs">
                              {r.applicableObjectType === 'PART_MECHANICAL' ? '机械零件' : '电气元器件'}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium text-[var(--ty-font-main-color)] whitespace-nowrap">{r.applicableCategory}</td>
                          <td className="px-4 py-3 font-mono font-bold text-[var(--ty-green-color)] whitespace-nowrap">
                            &gt;= {r.reuseThreshold}%
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-[var(--ty-orange-color)] whitespace-nowrap">
                            {r.reviewThresholdMin}% - {r.reviewThresholdMax}%
                          </td>
                          <td className="px-4 py-3 font-mono text-[var(--ty-font-sub-light-color)] whitespace-nowrap">
                            &lt; {r.reviewThresholdMin}%
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <button
                              onClick={() => handleStatusToggle('threshold', r)}
                              aria-label={`${r.isEnabled ? '停用' : '启用'}${r.ruleName}`}
                              className="h-8 inline-flex items-center cursor-pointer"
                            >
                              <span className={`inline-flex items-center gap-1 min-h-6 px-2 inline-flex items-center rounded-ty-xs font-bold text-ty-2xs ${
                                r.isEnabled
                                  ? 'bg-[var(--ty-green-lightest-color)] text-[var(--ty-font-main-light-color)] border border-[var(--ty-green-color)]/30'
                                  : 'bg-[var(--ty-fill-color)] text-[var(--ty-font-sub-color)] border border-[var(--ty-border-color)]'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${r.isEnabled ? 'bg-[var(--ty-green-color)]' : 'bg-[var(--ty-font-sub-light-color)]'}`} />
                                {r.isEnabled ? '启用中' : '已停用'}
                              </span>
                            </button>
                          </td>
                          <td className="px-4 py-3 font-mono text-[var(--ty-font-sub-light-color)] whitespace-nowrap">{r.version}</td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center space-x-2">
                              <button onClick={() => handleEdit('threshold', r)} className="h-8 w-8 inline-flex items-center justify-center hover:bg-[var(--ty-fill-weak-dark-color)] rounded-ty-xs text-[var(--ty-font-sub-color)] hover:text-[var(--ty-primary-color)] transition-all cursor-pointer" aria-label={`编辑${r.ruleName}`}>
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleDelete('threshold', r.id)} className="h-8 w-8 inline-flex items-center justify-center hover:bg-[var(--ty-fill-weak-dark-color)] rounded-ty-xs text-[var(--ty-font-sub-color)] hover:text-[var(--ty-red-color)] transition-all cursor-pointer" aria-label={`删除${r.ruleName}`}>
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
              <TablePagination total={filteredThresholds.length} page={thresholdPage.currentPage} pageSize={pageSize} itemLabel="条" onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
            </div>
          </div>
        )}

        {activeTab === 'hard' && (
          <div className="space-y-4">
            <div className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="ty-data-table w-full min-w-[1000px] text-left border-collapse text-ty-xs">
                  <thead>
                    <tr className="bg-[var(--ty-fill-weak-dark-color)] border-b border-[var(--ty-border-color)] text-[var(--ty-font-sub-color)] font-semibold">
                      <th className="w-12 px-2 py-2 text-center">序号</th>
                      <th className="px-4 py-2 whitespace-nowrap">强制/硬性控制规则名称</th>
                      <th className="px-4 py-2 whitespace-nowrap">测试示例</th>
                      <th className="px-4 py-2 whitespace-nowrap">决策建议分类</th>
                      <th className="px-4 py-2 whitespace-nowrap">适用物料分类</th>
                      <th className="px-4 py-2 whitespace-nowrap">触发条件字段</th>
                      <th className="px-4 py-2 min-w-[160px]">判断触发逻辑</th>
                      <th className="px-4 py-2 whitespace-nowrap">命中后强制转换流程动作</th>
                      <th className="px-4 py-2 whitespace-nowrap">状态</th>
                      <th className="px-4 py-2 whitespace-nowrap text-center">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--ty-border-light-color)]">
                    {filteredHardRules.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-4 py-8 text-center text-[var(--ty-font-sub-light-color)]">暂无符合条件的硬控规则</td>
                      </tr>
                    ) : (
                      hardRulePage.rows.map((r, index) => (
                        <tr key={r.id} className="hover:bg-[var(--ty-fill-weak-dark-color)] transition-colors">
                          <td className="w-12 px-2 py-3 text-center text-[var(--ty-font-sub-color)]">{(hardRulePage.currentPage - 1) * pageSize + index + 1}</td>
                          <td className="px-4 py-3 font-semibold text-[var(--ty-font-main-color)] whitespace-nowrap">{r.ruleName}</td>
                          <td className="px-4 py-3 text-[var(--ty-font-sub-color)] font-mono whitespace-nowrap">{r.triggerExample}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {r.ruleType === 'FORCE_REVIEW' ? (
                              <span className="bg-[var(--ty-orange-lightest-color)] text-[var(--ty-font-main-light-color)] border border-[var(--ty-orange-color)]/30 min-h-6 px-2 inline-flex items-center rounded-ty-xs text-ty-2xs font-bold inline-flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--ty-orange-color)]" />
                                强制复核
                              </span>
                            ) : r.ruleType === 'NON_REUSABLE' ? (
                              <span className="bg-[var(--ty-red-lightest-color)] text-[var(--ty-font-main-light-color)] border border-[var(--ty-red-color)]/30 min-h-6 px-2 inline-flex items-center rounded-ty-xs text-ty-2xs font-bold inline-flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--ty-red-color)]" />
                                禁止复用
                              </span>
                            ) : (
                              <span className="bg-[var(--ty-fill-color)] text-[var(--ty-font-sub-color)] border border-[var(--ty-border-color)] min-h-6 px-2 inline-flex items-center rounded-ty-xs text-ty-2xs">风险预警</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-[var(--ty-font-sub-color)] font-medium whitespace-nowrap">{r.applicableCategory}</td>
                          <td className="px-4 py-3 font-mono text-[var(--ty-font-main-color)] font-semibold whitespace-nowrap">{r.triggerField}</td>
                          <td className="px-4 py-3 text-[var(--ty-font-sub-color)] min-w-[160px] max-w-xs break-words" title={r.triggerCondition}>{r.triggerCondition}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {r.actionAfterTrigger === 'RECOMMEND_REVIEW' ? (
                              <span className="text-[var(--ty-orange-color)] font-bold flex items-center space-x-1">
                                <AlertTriangle className="w-3.5 h-3.5 text-[var(--ty-orange-color)] shrink-0" />
                                <span>降级强制复核建议</span>
                              </span>
                            ) : r.actionAfterTrigger === 'PROHIBIT_REUSE' ? (
                              <span className="text-[var(--ty-red-color)] font-bold flex items-center space-x-1">
                                <XCircle className="w-3.5 h-3.5 text-[var(--ty-red-color)] shrink-0" />
                                <span className="text-[var(--ty-red-color)] font-bold">禁止复用建议</span>
                              </span>
                            ) : (
                              <span className="text-[var(--ty-font-sub-color)] font-semibold flex items-center space-x-1">
                                <Info className="w-3.5 h-3.5 text-[var(--ty-font-sub-light-color)] shrink-0" />
                                <span>仅输出高亮差异预警</span>
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <button
                              onClick={() => handleStatusToggle('hard', r)}
                              aria-label={`${r.isEnabled ? '停用' : '启用'}${r.ruleName}`}
                              className="h-8 inline-flex items-center cursor-pointer"
                            >
                              <span className={`inline-flex items-center gap-1 min-h-6 px-2 inline-flex items-center rounded-ty-xs text-ty-2xs font-bold ${
                                r.isEnabled
                                  ? 'bg-[var(--ty-green-lightest-color)] text-[var(--ty-font-main-light-color)] border border-[var(--ty-green-color)]/30'
                                  : 'bg-[var(--ty-fill-color)] text-[var(--ty-font-sub-color)] border border-[var(--ty-border-color)]'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${r.isEnabled ? 'bg-[var(--ty-green-color)]' : 'bg-[var(--ty-font-sub-light-color)]'}`} />
                                {r.isEnabled ? '已启动' : '已停用'}
                              </span>
                            </button>
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center space-x-2">
                              <button onClick={() => handleEdit('hard', r)} className="h-8 w-8 inline-flex items-center justify-center hover:bg-[var(--ty-fill-weak-dark-color)] rounded-ty-xs text-[var(--ty-font-sub-color)] hover:text-[var(--ty-primary-color)] transition-all cursor-pointer" aria-label={`编辑${r.ruleName}`}>
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleDelete('hard', r.id)} className="h-8 w-8 inline-flex items-center justify-center hover:bg-[var(--ty-fill-weak-dark-color)] rounded-ty-xs text-[var(--ty-font-sub-color)] hover:text-[var(--ty-red-color)] transition-all cursor-pointer" aria-label={`删除${r.ruleName}`}>
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
              <TablePagination total={filteredHardRules.length} page={hardRulePage.currentPage} pageSize={pageSize} itemLabel="条" onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
            </div>
          </div>
        )}

        {activeTab === 'coverage' && (
          <div className="space-y-4">
            {/* Category inheritance guidelines */}
            <div className="bg-[var(--ty-green-lightest-color)] border border-[var(--ty-green-color)]/30 rounded-ty-sm p-4 text-ty-xs">
              <span className="font-bold text-[var(--ty-font-main-color)] block mb-1">🌲 分类策略继承与差异化覆盖策略</span>
              <ul className="list-disc pl-4 space-y-1 text-[var(--ty-font-sub-color)] text-ty-2xs">
                <li><strong className="text-[var(--ty-font-main-color)]">高阶大类直接继承</strong>：缺省配置下，所有子分类会自动继承父分类的相似度字段权重和决策阈值，避免配置雪崩。</li>
                <li><strong className="text-[var(--ty-font-main-color)]">差异化细化重置</strong>：针对特定需要高度敏感控制的细类（如 "芯片"、"标准螺钉"），管理员可以新建绑定记录，覆盖其白名单和计算模型，从而执行更严格/更宽松的业务门槛。</li>
              </ul>
            </div>

            <div className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="ty-data-table w-full min-w-[980px] text-left border-collapse text-ty-xs">
                  <thead>
                    <tr className="bg-[var(--ty-fill-weak-dark-color)] border-b border-[var(--ty-border-color)] text-[var(--ty-font-sub-color)] font-semibold">
                      <th className="w-12 px-2 py-2 text-center">序号</th>
                      <th className="px-4 py-2 whitespace-nowrap">分类层级路径</th>
                      <th className="px-4 py-2 whitespace-nowrap">层级关系</th>
                      <th className="px-4 py-2 whitespace-nowrap">绑定阈值规则</th>
                      <th className="px-4 py-2 whitespace-nowrap">绑定白名单对照</th>
                      <th className="px-4 py-2 whitespace-nowrap">绑定计算字段规则</th>
                      <th className="px-4 py-2 min-w-[160px]">核心权重覆盖详情描述</th>
                      <th className="px-4 py-2 whitespace-nowrap">生效状态</th>
                      <th className="px-4 py-2 whitespace-nowrap text-center">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--ty-border-light-color)]">
                    {filteredCoverages.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-8 text-center text-[var(--ty-font-sub-light-color)]">暂无符合条件的分类覆盖绑定关系</td>
                      </tr>
                    ) : (
                      coveragePage.rows.map((r, index) => (
                        <tr key={r.id} className="hover:bg-[var(--ty-fill-weak-dark-color)] transition-colors">
                          <td className="w-12 px-2 py-3 text-center text-[var(--ty-font-sub-color)]">{(coveragePage.currentPage - 1) * pageSize + index + 1}</td>
                          <td className="px-4 py-3 font-semibold text-[var(--ty-font-main-color)] font-mono whitespace-nowrap">{r.categoryPath}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {r.inheritParent ? (
                              <span className="text-[var(--ty-green-color)] font-medium flex items-center space-x-1">
                                <Check className="w-3.5 h-3.5" />
                                <span>继承父级</span>
                              </span>
                            ) : (
                              <span className="text-[var(--ty-font-main-light-color)] font-bold flex items-center space-x-1 bg-[var(--ty-orange-lightest-color)] min-h-6 px-2 inline-flex items-center rounded-ty-xs border border-[var(--ty-orange-color)]/30 text-ty-2xs">
                                <ToggleLeft className="w-3.5 h-3.5 text-[var(--ty-orange-color)]" />
                                <span>首层策略重设</span>
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-[var(--ty-font-main-color)] font-medium whitespace-nowrap">{r.thresholdRuleId}</td>
                          <td className="px-4 py-3 font-mono text-[var(--ty-font-sub-color)] whitespace-nowrap">{r.whitelistId}</td>
                          <td className="px-4 py-3 text-[var(--ty-font-sub-color)] font-mono whitespace-nowrap">{r.similarityRuleSetId}</td>
                          <td className="px-4 py-3 text-[var(--ty-font-sub-color)] min-w-[160px] max-w-xs break-words" title={r.weightOverrideInfo}>
                            {r.weightOverrideInfo}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <button
                              onClick={() => handleStatusToggle('coverage', r)}
                              aria-label={`${r.isEnabled ? '停用' : '启用'}${r.categoryPath}覆盖策略`}
                              className="h-8 inline-flex items-center cursor-pointer"
                            >
                              <span className={`inline-flex items-center gap-1 min-h-6 px-2 inline-flex items-center rounded-ty-xs text-ty-2xs font-bold ${
                                r.isEnabled
                                  ? 'bg-[var(--ty-green-lightest-color)] text-[var(--ty-font-main-light-color)] border border-[var(--ty-green-color)]/30'
                                  : 'bg-[var(--ty-fill-color)] text-[var(--ty-font-sub-color)] border border-[var(--ty-border-color)]'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${r.isEnabled ? 'bg-[var(--ty-green-color)]' : 'bg-[var(--ty-font-sub-light-color)]'}`} />
                                {r.isEnabled ? '绑定生效中' : '已停用'}
                              </span>
                            </button>
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center space-x-2">
                              <button onClick={() => handleEdit('coverage', r)} className="h-8 w-8 inline-flex items-center justify-center hover:bg-[var(--ty-fill-weak-dark-color)] rounded-ty-xs text-[var(--ty-font-sub-color)] hover:text-[var(--ty-primary-color)] transition-all cursor-pointer" aria-label={`编辑${r.categoryPath}覆盖策略`}>
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleDelete('coverage', r.id)} className="h-8 w-8 inline-flex items-center justify-center hover:bg-[var(--ty-fill-weak-dark-color)] rounded-ty-xs text-[var(--ty-font-sub-color)] hover:text-[var(--ty-red-color)] transition-all cursor-pointer" aria-label={`删除${r.categoryPath}覆盖策略`}>
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
              <TablePagination total={filteredCoverages.length} page={coveragePage.currentPage} pageSize={pageSize} itemLabel="条" onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
            </div>
          </div>
        )}

      </div>

      {/* 业务指南 */}
      <div className="p-4 bg-[var(--ty-fill-weak-dark-color)] border border-[var(--ty-border-color)] rounded-ty-sm space-y-3">
        <div className="flex items-center space-x-2">
          <span className="min-h-6 px-2 inline-flex items-center bg-[var(--ty-primary-color)] text-[var(--ty-font-white-color)] rounded-ty-xs text-ty-2xs font-bold">
            业务指南
          </span>
          <h4 className="text-ty-xs font-bold text-[var(--ty-font-main-color)]">三化决策规则与管理阈值说明</h4>
        </div>

        <div className="text-ty-xs text-[var(--ty-font-sub-color)] space-y-3 leading-relaxed">
          {/* Business Guide */}
          <div>
            <p>
              此模块属于<strong className="text-[var(--ty-font-main-color)]">三阶段（三化决策）的规则中心</strong>。系统首先根据属性、名称等计算出纯客观的相似度得分（像不像）后，三化决策模块将分数对应到管理阈值线，并加载硬性控制或强控规则，输出最终的业务治理建议（能不能直接复用 / 是否需要人工复核 / 是否允许新建），不负责相似度分数的计算本身。应用端查找时只输出建议，不硬性拦截用户新建。
            </p>
          </div>

          {/* Scale Legend */}
          <div className="pt-2 border-t border-[var(--ty-border-color)]">
            <span className="font-semibold text-[var(--ty-font-main-color)] block mb-1">📊 三化审核阈值口径划分（供参考）：</span>
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center space-x-1 bg-[var(--ty-green-lightest-color)] text-[var(--ty-font-main-light-color)] min-h-6 px-2 inline-flex items-center rounded-ty-xs border border-[var(--ty-green-color)]/30 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--ty-green-color)]" />
                <span>建议复用: &gt;= 86%</span>
              </span>
              <span className="flex items-center space-x-1 bg-[var(--ty-orange-lightest-color)] text-[var(--ty-font-main-light-color)] min-h-6 px-2 inline-flex items-center rounded-ty-xs border border-[var(--ty-orange-color)]/30 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--ty-orange-color)]" />
                <span>建议复核: 68% - 86%</span>
              </span>
              <span className="flex items-center space-x-1 bg-[var(--ty-fill-color)] text-[var(--ty-font-sub-color)] min-h-6 px-2 inline-flex items-center rounded-ty-xs border border-[var(--ty-border-color)] font-bold">
                <span>允许新建: &lt; 68%</span>
              </span>
            </div>
          </div>

          {/* Hard Control Examples */}
          <div className="pt-2 border-t border-[var(--ty-border-color)]">
            <span className="font-semibold text-[var(--ty-font-main-color)] block mb-2">🚫 典型硬控降级业务场景示例：</span>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="bg-[var(--ty-fill-white-color)] p-2 rounded-ty-sm border border-[var(--ty-border-color)]">
                <span className="font-semibold text-[var(--ty-font-main-color)] block mb-0.5">材质大类不一致</span>
                <span className="text-ty-2xs text-[var(--ty-font-sub-color)]">关键用料冲突，相似度再高也必须强制判定为 <strong className="text-[var(--ty-orange-color)] font-medium">强制复核</strong></span>
              </div>
              <div className="bg-[var(--ty-fill-white-color)] p-2 rounded-ty-sm border border-[var(--ty-border-color)]">
                <span className="font-semibold text-[var(--ty-font-main-color)] block mb-0.5">公差尺寸溢出</span>
                <span className="text-ty-2xs text-[var(--ty-font-sub-color)]">规格字段差异超限，强制判定为 <strong className="text-[var(--ty-orange-color)] font-medium">强制复核</strong></span>
              </div>
              <div className="bg-[var(--ty-fill-white-color)] p-2 rounded-ty-sm border border-[var(--ty-border-color)]">
                <span className="font-semibold text-[var(--ty-font-main-color)] block mb-0.5">候选件状态已作废</span>
                <span className="text-ty-2xs text-[var(--ty-font-sub-color)]">候选件已失效或退市停产，强制判定为 <strong className="text-[var(--ty-red-color)] font-medium">禁止复用</strong></span>
              </div>
              <div className="bg-[var(--ty-fill-white-color)] p-2 rounded-ty-sm border border-[var(--ty-border-color)]">
                <span className="font-semibold text-[var(--ty-font-main-color)] block mb-0.5">关键耐压/封装不同</span>
                <span className="text-ty-2xs text-[var(--ty-font-sub-color)]">阻容感核心安全或核心字段属性冲突，强制判定为 <strong className="text-[var(--ty-orange-color)] font-medium">建议复核</strong></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RENDER POPUP EDITING FOR DECISION RULES */}
      {editingRule && (
        <div className="fixed inset-0 bg-ty-overlay backdrop-blur-xs flex items-center justify-center z-50 px-4 py-[60px]">
          <section role="dialog" aria-modal="true" aria-labelledby="three-standard-dialog-title" className="standard-form-dialog bg-[var(--ty-fill-white-color)] rounded-ty-lg shadow-ty-lg w-[min(600px,calc(100vw-32px))] border border-[var(--ty-border-color)] flex flex-col max-h-[calc(100dvh-120px)] overflow-hidden">

            {/* Modal Header */}
            <div className="px-4 py-3 border-b border-[var(--ty-border-color)] flex items-center justify-between bg-[var(--ty-fill-weak-dark-color)] shrink-0">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-[var(--ty-orange-color)]" />
                <h2 id="three-standard-dialog-title" className="font-semibold text-[var(--ty-font-main-color)] text-ty-lg">
                  {editingRule.isNew ? '新建' : '编辑'}
                  {editingRule.type === 'threshold' ? '三化管理决策阈值线' : editingRule.type === 'hard' ? '强制复核与硬性控制规则' : '分类大类覆盖决策绑定'}
                </h2>
              </div>
              <button type="button" aria-label="关闭三化决策规则弹窗" onClick={() => setEditingRule(null)} className="h-7 w-7 flex items-center justify-center text-[var(--ty-font-sub-light-color)] hover:text-[var(--ty-font-main-color)] hover:bg-[var(--ty-fill-color)] rounded-ty-sm cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSave} className="flex-1 overflow-auto p-4 space-y-4">

              <div className="p-3 bg-[var(--ty-primary-lighter-color)]/20 rounded-ty-sm text-ty-xs text-[var(--ty-primary-color)] flex items-start space-x-2 border border-[var(--ty-primary-lighter-color)]">
                <Info className="w-3.5 h-3.5 text-[var(--ty-primary-color)] shrink-0 mt-0.5" />
                <span>
                  <strong>阶段导视：</strong>此处的改动不作用于相似度字段算分。它主要负责把相似度得分 (0-100) 的计算结果，转义为应用端新建时的业务建议逻辑。
                </span>
              </div>

              {/* Threshold rule form fields */}
              {editingRule.type === 'threshold' && (
                <div className="space-y-4 text-ty-xs">
                  <div>
                    <label className="block font-semibold text-[var(--ty-font-main-color)] mb-1">阈值规则名称 <span className="text-[var(--ty-red-color)]">*</span></label>
                    <input
                      type="text"
                      required
                      value={editingRule.item.ruleName}
                      onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, ruleName: e.target.value }})}
                      placeholder="例如: 阀门大类专属决策阈值"
                      className="w-full bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-2 focus:border-[var(--ty-primary-color)] font-semibold text-[var(--ty-font-main-color)] outline-hidden"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-[var(--ty-font-main-color)] mb-1">适用对象类型</label>
                      <select
                        value={editingRule.item.applicableObjectType}
                        onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, applicableObjectType: e.target.value as ObjectType }})}
                        className="w-full bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-2 focus:border-[var(--ty-primary-color)] text-[var(--ty-font-main-color)] outline-hidden"
                      >
                        <option value="PART_MECHANICAL">机械零件</option>
                        <option value="PART_ELECTRICAL">电气元器件</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-[var(--ty-font-main-color)] mb-1">适用物料分类 <span className="text-[var(--ty-red-color)]">*</span></label>
                      <input
                        type="text"
                        required
                        value={editingRule.item.applicableCategory}
                        onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, applicableCategory: e.target.value }})}
                        placeholder="例如: 阀门/法兰阀/截止阀"
                        className="w-full bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-2 focus:border-[var(--ty-primary-color)] font-medium text-[var(--ty-font-main-color)] outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-[var(--ty-fill-weak-dark-color)] rounded-ty-sm border border-[var(--ty-border-color)] space-y-3">
                    <span className="font-bold text-[var(--ty-font-main-color)] block text-ty-xs">决策输出推荐区间数值 (%)</span>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block font-semibold text-[var(--ty-green-color)] mb-1">建议复用线 &gt;=</label>
                        <input
                          type="number"
                          min="1" max="100"
                          value={editingRule.item.reuseThreshold}
                          onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, reuseThreshold: parseInt(e.target.value) || 85 }})}
                          className="w-full bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-2 text-center text-ty-xs font-bold font-mono text-[var(--ty-green-color)] focus:border-[var(--ty-primary-color)] outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-[var(--ty-orange-color)] mb-1">复核区间下限 &gt;=</label>
                        <input
                          type="number"
                          min="1" max="100"
                          value={editingRule.item.reviewThresholdMin}
                          onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, reviewThresholdMin: parseInt(e.target.value) || 65 }})}
                          className="w-full bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-2 text-center text-ty-xs font-bold font-mono text-[var(--ty-orange-color)] focus:border-[var(--ty-primary-color)] outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-[var(--ty-font-sub-color)] mb-1">复核区间上限 &lt;</label>
                        <input
                          type="number"
                          min="1" max="100"
                          value={editingRule.item.reviewThresholdMax}
                          onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, reviewThresholdMax: parseInt(e.target.value) || 85 }})}
                          className="w-full bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-2 text-center text-ty-xs font-bold font-mono text-[var(--ty-font-main-color)] focus:border-[var(--ty-primary-color)] outline-hidden"
                        />
                      </div>
                    </div>
                    <span className="text-ty-2xs text-[var(--ty-font-sub-light-color)] block">注：计算分数低于复核区间下限时，系统将输出 “允许新建” 的建议。</span>
                  </div>

                  <div>
                    <label className="block font-semibold text-[var(--ty-font-main-color)] mb-1">是否启用此阈值规则</label>
                    <select
                      value={editingRule.item.isEnabled ? 'true' : 'false'}
                      onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, isEnabled: e.target.value === 'true' }})}
                      className="w-full bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-2 focus:border-[var(--ty-primary-color)] font-semibold text-[var(--ty-font-main-color)] outline-hidden"
                    >
                      <option value="true" className="text-[var(--ty-green-color)]">已启用 (ACTIVE)</option>
                      <option value="false" className="text-[var(--ty-font-sub-light-color)]">已停用 (INACTIVE)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-[var(--ty-font-main-color)] mb-1">规则备注</label>
                    <input
                      type="text"
                      value={editingRule.item.remarks || ''}
                      onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, remarks: e.target.value }})}
                      placeholder="例如：对标准通用阀门适当调高复用阈值，规避小差异引起的重复新建。"
                      className="w-full bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-2 focus:border-[var(--ty-primary-color)] text-[var(--ty-font-main-color)] outline-hidden"
                    />
                  </div>
                </div>
              )}

              {/* Hard control rule form fields */}
              {editingRule.type === 'hard' && (
                <div className="space-y-4 text-ty-xs">
                  <div>
                    <label className="block font-semibold text-[var(--ty-font-main-color)] mb-1">控制规则名称 <span className="text-[var(--ty-red-color)]">*</span></label>
                    <input
                      type="text"
                      required
                      value={editingRule.item.ruleName}
                      onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, ruleName: e.target.value }})}
                      placeholder="例如: 材质不一致降级保护规则"
                      className="w-full bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-2 focus:border-[var(--ty-primary-color)] font-semibold text-[var(--ty-font-main-color)] outline-hidden"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-[var(--ty-font-main-color)] mb-1">决策建议类型</label>
                      <select
                        value={editingRule.item.ruleType}
                        onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, ruleType: e.target.value as any }})}
                        className="w-full bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-2 focus:border-[var(--ty-primary-color)] font-bold text-[var(--ty-font-main-color)] outline-hidden"
                      >
                        <option value="FORCE_REVIEW">强制复核规则 (建议人工复核)</option>
                        <option value="NON_REUSABLE">不可复用规则 (输出禁止复用)</option>
                        <option value="RISK_ALERT">仅做差异预警 (仅输出高亮差异字段)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-[var(--ty-font-main-color)] mb-1">适用物料分类 <span className="text-[var(--ty-red-color)]">*</span></label>
                      <input
                        type="text"
                        required
                        value={editingRule.item.applicableCategory}
                        onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, applicableCategory: e.target.value }})}
                        placeholder="通用件 / 芯片类 / ALL"
                        className="w-full bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-2 focus:border-[var(--ty-primary-color)] text-[var(--ty-font-main-color)] outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-[var(--ty-font-main-color)] mb-1">触发条件判定字段 <span className="text-[var(--ty-red-color)]">*</span></label>
                      <input
                        type="text"
                        required
                        value={editingRule.item.triggerField}
                        onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, triggerField: e.target.value }})}
                        placeholder="如: material, lifecycleState"
                        className="w-full bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-2 focus:border-[var(--ty-primary-color)] font-mono font-bold text-[var(--ty-font-main-color)] outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-[var(--ty-font-main-color)] mb-1">触发测试示例值</label>
                      <input
                        type="text"
                        value={editingRule.item.triggerExample}
                        onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, triggerExample: e.target.value }})}
                        placeholder="如: Q235B vs SUS304"
                        className="w-full bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-2 focus:border-[var(--ty-primary-color)] text-[var(--ty-font-main-color)] outline-hidden"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-[var(--ty-font-main-color)] mb-1">判断触发逻辑(可输入表达式说明) <span className="text-[var(--ty-red-color)]">*</span></label>
                    <textarea
                      rows={3}
                      required
                      value={editingRule.item.triggerCondition}
                      onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, triggerCondition: e.target.value }})}
                      placeholder="例如: 候选件与拟建件物料大类一致，但详细材质大类发生重大改变(铁系 vs 不锈钢系)，导致安全性受阻。"
                      className="w-full bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-2 focus:border-[var(--ty-primary-color)] text-[var(--ty-font-main-color)] outline-hidden"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-[var(--ty-font-main-color)] mb-1">匹配后触发动作</label>
                      <select
                        value={editingRule.item.actionAfterTrigger}
                        onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, actionAfterTrigger: e.target.value as any }})}
                        className="w-full bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-2 focus:border-[var(--ty-primary-color)] font-bold text-[var(--ty-font-main-color)] outline-hidden"
                      >
                        <option value="RECOMMEND_REVIEW">强制置为 [建议复核] 状态</option>
                        <option value="PROHIBIT_REUSE">强制拦截置为 [禁止复用] 状态</option>
                        <option value="ONLY_ALERT">仅进行前台差异红字强预警</option>
                      </select>
                      <span className="text-ty-2xs text-[var(--ty-font-sub-light-color)] block mt-1">注：只有设置为 [PROHIBIT_REUSE] 且启用时，最终计算才会展现 “禁止复用” 字样。</span>
                    </div>

                    <div>
                      <label className="block font-semibold text-[var(--ty-font-main-color)] mb-1">优先级排序 (数字越大越优先)</label>
                      <input
                        type="number"
                        value={editingRule.item.priority}
                        onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, priority: parseInt(e.target.value) || 1 }})}
                        className="w-full bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-2 focus:border-[var(--ty-primary-color)] text-[var(--ty-font-main-color)] outline-hidden"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-[var(--ty-font-main-color)] mb-1">启用状态</label>
                    <select
                      value={editingRule.item.isEnabled ? 'true' : 'false'}
                      onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, isEnabled: e.target.value === 'true' }})}
                      className="w-full bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-2 focus:border-[var(--ty-primary-color)] font-semibold text-[var(--ty-font-main-color)] outline-hidden"
                    >
                      <option value="true" className="text-[var(--ty-green-color)]">已启动 (ACTIVE)</option>
                      <option value="false" className="text-[var(--ty-font-sub-light-color)]">已停用 (INACTIVE)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Category coverage form fields */}
              {editingRule.type === 'coverage' && (
                <div className="space-y-4 text-ty-xs">
                  <div>
                    <label className="block font-semibold text-[var(--ty-font-main-color)] mb-1">物料分类层级路径 (用于承接决策策略) <span className="text-[var(--ty-red-color)]">*</span></label>
                    <input
                      type="text"
                      required
                      value={editingRule.item.categoryPath}
                      onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, categoryPath: e.target.value }})}
                      placeholder="例如: PLM/标准件/螺栓螺钉/外六角"
                      className="w-full bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-2 focus:border-[var(--ty-primary-color)] font-mono font-semibold text-[var(--ty-font-main-color)] outline-hidden"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-[var(--ty-font-main-color)] mb-1">策略来源层级模式</label>
                      <select
                        value={editingRule.item.inheritParent ? 'true' : 'false'}
                        onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, inheritParent: e.target.value === 'true' }})}
                        className="w-full bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-2 focus:border-[var(--ty-primary-color)] text-[var(--ty-font-main-color)] outline-hidden"
                      >
                        <option value="true">继承父分类决策策略 (Inherit)</option>
                        <option value="false">重置覆盖，执行特异决策策略 (Override)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-[var(--ty-font-main-color)] mb-1">绑定对应阈值规则</label>
                      <select
                        value={editingRule.item.thresholdRuleId}
                        onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, thresholdRuleId: e.target.value }})}
                        className="w-full bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-2 focus:border-[var(--ty-primary-color)] font-medium text-[var(--ty-font-main-color)] outline-hidden"
                      >
                        {thresholdRules.map(t => (
                          <option key={t.id} value={t.ruleName}>{t.ruleName}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-[var(--ty-font-main-color)] mb-1">绑定字段白名单集</label>
                      <input
                        type="text"
                        value={editingRule.item.whitelistId}
                        onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, whitelistId: e.target.value }})}
                        className="w-full bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-2 focus:border-[var(--ty-primary-color)] font-mono text-[var(--ty-font-sub-color)] outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-[var(--ty-font-main-color)] mb-1">绑定算分规则引擎集</label>
                      <input
                        type="text"
                        value={editingRule.item.similarityRuleSetId}
                        onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, similarityRuleSetId: e.target.value }})}
                        className="w-full bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-2 focus:border-[var(--ty-primary-color)] font-mono text-[var(--ty-font-sub-color)] outline-hidden"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-[var(--ty-font-main-color)] mb-1">核心权重覆盖详情描述</label>
                    <textarea
                      rows={3}
                      value={editingRule.item.weightOverrideInfo}
                      onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, weightOverrideInfo: e.target.value }})}
                      placeholder="例如：重设芯片引脚数(pin_count)权重为0.4，重设封装类型权重为0.3。"
                      className="w-full bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-2 focus:border-[var(--ty-primary-color)] text-[var(--ty-font-main-color)] outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[var(--ty-font-main-color)] mb-1">绑定生效状态</label>
                    <select
                      value={editingRule.item.isEnabled ? 'true' : 'false'}
                      onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, isEnabled: e.target.value === 'true' }})}
                      className="w-full bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-2 focus:border-[var(--ty-primary-color)] font-semibold text-[var(--ty-font-main-color)] outline-hidden"
                    >
                      <option value="true" className="text-[var(--ty-green-color)]">启动绑定并生效 (ACTIVE)</option>
                      <option value="false" className="text-[var(--ty-font-sub-light-color)]">已停用此大类绑定 (INACTIVE)</option>
                    </select>
                  </div>
                </div>
              )}

            </form>

            {/* Modal Actions */}
            <div className="px-4 py-3 border-t border-[var(--ty-border-color)] flex justify-end space-x-3 bg-[var(--ty-fill-weak-dark-color)] shrink-0">
              <button
                type="button"
                onClick={() => setEditingRule(null)}
                className="h-8 min-w-[68px] px-4 border border-[var(--ty-border-color)] bg-[var(--ty-fill-white-color)] hover:bg-[var(--ty-fill-weak-dark-color)] rounded-ty-sm text-ty-xs font-semibold text-[var(--ty-font-sub-color)] transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="h-8 min-w-[68px] px-4 bg-[var(--ty-primary-color)] hover:bg-[var(--ty-primary-hover-color)] rounded-ty-sm text-ty-xs font-semibold text-[var(--ty-font-white-color)] transition-colors cursor-pointer"
              >
                保存规则 (立即生效)
              </button>
            </div>

          </section>
        </div>
      )}

    </div>
  );
};
