import React, { useState, useMemo } from 'react';
import {
  Settings,
  Search,
  Info,
  Plus,
  Edit2,
  Trash2,
  X,
  HelpCircle,
  ToggleLeft,
  ToggleRight,
  Check,
  AlertCircle
} from 'lucide-react';
import { StandardizationRule, SynonymRule, ClassificationAlignmentRule, ObjectType } from '../types';
import { useFeedback } from './ui/FeedbackProvider';
import { paginateRows, TablePagination } from './ui/TablePagination';

interface DataProcessingViewProps {
  standardizationRules: StandardizationRule[];
  onUpdateStandardizationRules: (rules: StandardizationRule[]) => void;
  synonymRules: SynonymRule[];
  onUpdateSynonymRules: (rules: SynonymRule[]) => void;
  alignmentRules: ClassificationAlignmentRule[];
  onUpdateAlignmentRules: (rules: ClassificationAlignmentRule[]) => void;
}

export const DataProcessingView: React.FC<DataProcessingViewProps> = ({
  standardizationRules,
  onUpdateStandardizationRules,
  synonymRules,
  onUpdateSynonymRules,
  alignmentRules,
  onUpdateAlignmentRules
}) => {
  const { notify, confirm } = useFeedback();
  const [activeTab, setActiveTab] = useState<'standard' | 'synonym' | 'align'>('standard');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Editing modal state
  const [editingRule, setEditingRule] = useState<{
    type: 'standard' | 'synonym' | 'align';
    isNew: boolean;
    item: any;
  } | null>(null);

  // 1. Filter logic for each tab
  const filteredStandard = useMemo(() => {
    return standardizationRules.filter(r =>
      keyword === '' ||
      r.ruleName.toLowerCase().includes(keyword.toLowerCase()) ||
      r.applicableProperty.toLowerCase().includes(keyword.toLowerCase()) ||
      r.standardValue.toLowerCase().includes(keyword.toLowerCase())
    );
  }, [standardizationRules, keyword]);

  const filteredSynonym = useMemo(() => {
    return synonymRules.filter(r =>
      keyword === '' ||
      r.primaryWord.toLowerCase().includes(keyword.toLowerCase()) ||
      r.synonyms.some(s => s.toLowerCase().includes(keyword.toLowerCase())) ||
      r.applicableProperty.toLowerCase().includes(keyword.toLowerCase())
    );
  }, [synonymRules, keyword]);

  const filteredAlign = useMemo(() => {
    return alignmentRules.filter(r =>
      keyword === '' ||
      r.sourcePath.toLowerCase().includes(keyword.toLowerCase()) ||
      r.standardPath.toLowerCase().includes(keyword.toLowerCase())
    );
  }, [alignmentRules, keyword]);
  const standardPage = paginateRows<StandardizationRule>(filteredStandard, page, pageSize);
  const synonymPage = paginateRows<SynonymRule>(filteredSynonym, page, pageSize);
  const alignPage = paginateRows<ClassificationAlignmentRule>(filteredAlign, page, pageSize);

  // CRUD operation handlers
  const handleEdit = (type: 'standard' | 'synonym' | 'align', item: any) => {
    setEditingRule({
      type,
      isNew: false,
      item: JSON.parse(JSON.stringify(item)) // deep clone for modal edits
    });
  };

  const handleAddNew = (type: 'standard' | 'synonym' | 'align') => {
    let defaultItem: any = {};
    if (type === 'standard') {
      defaultItem = {
        ruleName: '',
        applicableObjectType: 'PART_MECHANICAL' as ObjectType,
        applicableProperty: '',
        propertyType: 'TEXT',
        rawValue: '',
        standardValue: '',
        ruleMethod: 'MAP',
        matchPriority: 1,
        isSimilarityActive: true,
        isFullTextActive: true,
        status: 'ACTIVE',
        remarks: ''
      };
    } else if (type === 'synonym') {
      defaultItem = {
        primaryWord: '',
        synonyms: [],
        applicableObjectType: 'PART_MECHANICAL' as ObjectType,
        applicableProperty: '',
        scope: 'GLOBAL',
        isSimilarityActive: true,
        isFullTextActive: true,
        status: 'ACTIVE',
        remarks: ''
      };
    } else {
      defaultItem = {
        ruleType: 'CLASSIFICATION',
        sourceSystem: 'ERP',
        sourceObjectType: 'PART',
        sourcePath: '',
        standardPath: '',
        hierarchyStrategy: 'ALIGN_STANDARD',
        similarityDiscount: 0.9,
        applicableObjectType: 'PART_MECHANICAL' as ObjectType,
        status: 'ACTIVE',
        remarks: '',
        isSimilarityActive: true
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

    if (type === 'standard') {
      if (!item.ruleName || !item.applicableProperty || !item.standardValue) {
        notify('请填入必填项：规则名称、适用属性及标准值。', 'warning');
        return;
      }
      let updated: StandardizationRule[];
      if (isNew) {
        const newRule: StandardizationRule = {
          ...item,
          id: 'std_' + Date.now(),
          version: 'V' + (standardizationRules.length + 1) + '.0',
          lastEditor: '评审员',
          lastEditTime: new Date().toISOString().split('T')[0]
        };
        updated = [...standardizationRules, newRule];
      } else {
        updated = standardizationRules.map(r => r.id === item.id ? {
          ...r,
          ...item,
          lastEditor: '评审员',
          lastEditTime: new Date().toISOString().split('T')[0]
        } : r);
      }
      onUpdateStandardizationRules(updated);
    } else if (type === 'synonym') {
      if (!item.primaryWord || !item.synonyms || item.synonyms.length === 0) {
        notify('请填入必填项：主词以及至少一个同义词别名。', 'warning');
        return;
      }
      let updated: SynonymRule[];
      if (isNew) {
        const newRule: SynonymRule = {
          ...item,
          id: 'syn_' + Date.now(),
          version: 'V' + (synonymRules.length + 1) + '.0',
          lastEditor: '评审员',
          lastEditTime: new Date().toISOString().split('T')[0]
        };
        updated = [...synonymRules, newRule];
      } else {
        updated = synonymRules.map(r => r.id === item.id ? {
          ...r,
          ...item,
          lastEditor: '评审员',
          lastEditTime: new Date().toISOString().split('T')[0]
        } : r);
      }
      onUpdateSynonymRules(updated);
    } else if (type === 'align') {
      if (!item.sourcePath || !item.standardPath) {
        notify('请填入必填项：源路径以及标准路径。', 'warning');
        return;
      }
      let updated: ClassificationAlignmentRule[];
      if (isNew) {
        const newRule: ClassificationAlignmentRule = {
          ...item,
          id: 'ali_' + Date.now(),
          version: 'V' + (alignmentRules.length + 1) + '.0',
          lastEditor: '评审员',
          lastEditTime: new Date().toISOString().split('T')[0]
        };
        updated = [...alignmentRules, newRule];
      } else {
        updated = alignmentRules.map(r => r.id === item.id ? {
          ...r,
          ...item,
          lastEditor: '评审员',
          lastEditTime: new Date().toISOString().split('T')[0]
        } : r);
      }
      onUpdateAlignmentRules(updated);
    }

    setEditingRule(null);
  };

  const handleDelete = async (type: 'standard' | 'synonym' | 'align', id: string) => {
    if (await confirm({ title: '删除规则', message: '确定要删除这条数据预处理规则吗？评审原型将即时生效。', confirmText: '删除', tone: 'danger' })) {
      if (type === 'standard') {
        onUpdateStandardizationRules(standardizationRules.filter(r => r.id !== id));
      } else if (type === 'synonym') {
        onUpdateSynonymRules(synonymRules.filter(r => r.id !== id));
      } else if (type === 'align') {
        onUpdateAlignmentRules(alignmentRules.filter(r => r.id !== id));
      }
    }
  };

  const handleStatusToggle = (type: 'standard' | 'synonym' | 'align', item: any) => {
    const newStatus = item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    if (type === 'standard') {
      onUpdateStandardizationRules(standardizationRules.map(r => r.id === item.id ? { ...r, status: newStatus } : r));
    } else if (type === 'synonym') {
      onUpdateSynonymRules(synonymRules.map(r => r.id === item.id ? { ...r, status: newStatus } : r));
    } else if (type === 'align') {
      onUpdateAlignmentRules(alignmentRules.map(r => r.id === item.id ? { ...r, status: newStatus } : r));
    }
  };

  return (
    <div className="space-y-4" id="data-processing-view-container">

      {/* Header Area */}
      <div className="bg-[var(--ty-fill-white-color)] rounded-ty-sm border border-[var(--ty-border-color)] p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="w-full">
            <div className="flex items-center space-x-2">
              <h1 className="text-ty-xl font-bold text-[var(--ty-font-main-color)] flex items-center space-x-2">
                <Settings className="w-5 h-5 text-[var(--ty-primary-color)]" />
                <span>数据处理规则 (算分前置清洗)</span>
              </h1>
              <span className="min-h-6 px-2 inline-flex items-center bg-[var(--ty-orange-lightest-color)] text-[var(--ty-font-main-light-color)] rounded-ty-xs text-ty-2xs font-semibold border border-[var(--ty-orange-color)]/30">
                三阶段后续概念原型
              </span>
            </div>

            <div className="mt-2 p-3 bg-[var(--ty-fill-weak-dark-color)] border border-[var(--ty-border-color)] rounded-ty-sm text-ty-xs text-[var(--ty-font-sub-color)] leading-relaxed">
              <p className="font-semibold text-[var(--ty-font-main-color)] mb-1 flex items-center">
                <Info className="w-4 h-4 mr-1 text-[var(--ty-primary-color)]" />
                三阶段后续规则行为说明
              </p>
              <p>
                标准化、同义词、分类/类型归一属于三阶段后续能力。
                <strong className="text-[var(--ty-font-main-color)]">二阶段当前不读取、不执行这些规则。</strong>
                三阶段未来启用后，可在字段评分前进行数据清洗和归一，并解释处理前值与处理后值。
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0 self-start mt-1">
            <span className="text-ty-2xs text-[var(--ty-font-main-light-color)] font-semibold bg-[var(--ty-orange-lightest-color)] min-h-6 px-2 inline-flex items-center rounded-ty-xs border border-[var(--ty-orange-color)]/30">
              后续阶段草案，不进入二阶段交付
            </span>
          </div>
        </div>

        {/* Tab Headers */}
        <div className="flex border-b border-[var(--ty-border-color)] mt-4">
          <button
            onClick={() => { setActiveTab('standard'); setKeyword(''); setPage(1); }}
            className={`px-4 py-2 text-ty-sm font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'standard'
                ? 'border-[var(--ty-primary-color)] text-[var(--ty-primary-color)]'
                : 'border-transparent text-[var(--ty-font-sub-color)] hover:text-[var(--ty-font-main-color)]'
            }`}
          >
            标准化规则 ({filteredStandard.length})
          </button>
          <button
            onClick={() => { setActiveTab('synonym'); setKeyword(''); setPage(1); }}
            className={`px-4 py-2 text-ty-sm font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'synonym'
                ? 'border-[var(--ty-primary-color)] text-[var(--ty-primary-color)]'
                : 'border-transparent text-[var(--ty-font-sub-color)] hover:text-[var(--ty-font-main-color)]'
            }`}
          >
            同义词规则 ({filteredSynonym.length})
          </button>
          <button
            onClick={() => { setActiveTab('align'); setKeyword(''); setPage(1); }}
            className={`px-4 py-2 text-ty-sm font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'align'
                ? 'border-[var(--ty-primary-color)] text-[var(--ty-primary-color)]'
                : 'border-transparent text-[var(--ty-font-sub-color)] hover:text-[var(--ty-font-main-color)]'
            }`}
          >
            分类 / 类型归一 ({filteredAlign.length})
          </button>
        </div>
      </div>

      {/* Control filters & action bar */}
      <div className="bg-[var(--ty-fill-white-color)] px-4 py-3 border border-[var(--ty-border-color)] rounded-ty-sm flex items-center justify-between">
        <div className="relative w-72">
          <Search className="w-3.5 h-3.5 text-[var(--ty-font-sub-light-color)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
            placeholder={
              activeTab === 'standard'
                ? "搜索规则名称、适用属性..."
                : activeTab === 'synonym'
                  ? "搜索主词、同义词或属性..."
                  : "搜索源路径、标准路径..."
            }
            className="w-full pl-9 pr-3 h-8 bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm text-ty-xs text-[var(--ty-font-main-color)] focus:outline-none focus:border-[var(--ty-primary-color)]"
          />
        </div>

        <div>
          <button
            onClick={() => handleAddNew(activeTab)}
            className="flex items-center space-x-2 px-4 h-8 bg-[var(--ty-primary-color)] text-[var(--ty-font-white-color)] hover:bg-[var(--ty-primary-hover-color)] rounded-ty-sm text-ty-xs font-semibold transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>
              {activeTab === 'standard' ? '新建标准化规则' : activeTab === 'synonym' ? '新建同义词匹配' : '新建类型路径归一'}
            </span>
          </button>
        </div>
      </div>

      {/* Grid Content */}
      <div className="space-y-4">

        {activeTab === 'standard' && (
          <div className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-left border-collapse text-ty-xs">
                <thead>
                  <tr className="bg-[var(--ty-fill-weak-dark-color)] border-b border-[var(--ty-border-color)] text-[var(--ty-font-sub-color)] font-semibold">
                    <th className="w-12 px-2 py-2 text-center">序号</th>
                    <th className="px-4 py-2 whitespace-nowrap">规则名称</th>
                    <th className="px-4 py-2 whitespace-nowrap">适用对象类型</th>
                    <th className="px-4 py-2 whitespace-nowrap">适用属性</th>
                    <th className="px-4 py-2 min-w-[140px]">映射前原始值</th>
                    <th className="px-4 py-2 min-w-[120px]">清洗后(标准值)</th>
                    <th className="px-4 py-2 whitespace-nowrap">匹配模式</th>
                    <th className="px-4 py-2 whitespace-nowrap">状态</th>
                    <th className="px-4 py-2 whitespace-nowrap text-center">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--ty-border-light-color)]">
                  {filteredStandard.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-[var(--ty-font-sub-light-color)]">暂无符合条件的标准化规则</td>
                    </tr>
                  ) : (
                    standardPage.rows.map((r, index) => (
                      <tr key={r.id} className="hover:bg-[var(--ty-fill-weak-dark-color)] transition-colors">
                        <td className="w-12 px-2 py-3 text-center text-[var(--ty-font-sub-color)]">{(standardPage.currentPage - 1) * pageSize + index + 1}</td>
                        <td className="px-4 py-3 font-medium text-[var(--ty-font-main-color)] whitespace-nowrap">{r.ruleName}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="bg-[var(--ty-primary-lightest-color)] text-[var(--ty-font-main-light-color)] border border-[var(--ty-primary-color)]/30 min-h-6 px-2 inline-flex items-center rounded-ty-xs text-ty-2xs">
                            {r.applicableObjectType === 'PART_MECHANICAL' ? '机械零件' : r.applicableObjectType === 'PART_ELECTRICAL' ? '电气元器件' : '通用件'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-[var(--ty-font-sub-color)] whitespace-nowrap">{r.applicableProperty}</td>
                        <td className="px-4 py-3 text-[var(--ty-font-sub-color)] min-w-[140px] max-w-xs break-words" title={r.rawValue}>
                          {r.rawValue ? r.rawValue.replace(/\n/g, ' | ') : '任意/匹配所有'}
                        </td>
                        <td className="px-4 py-3 font-semibold text-[var(--ty-font-main-color)] min-w-[120px]">{r.standardValue}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="min-h-6 px-2 inline-flex items-center bg-[var(--ty-fill-weak-dark-color)] text-[var(--ty-font-sub-color)] rounded-ty-xs text-ty-2xs font-mono border border-[var(--ty-border-color)]">
                            {r.ruleMethod === 'MAP' ? '多对一映射' : r.ruleMethod === 'REGEX' ? '正则提取' : '文本替换'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button
                            onClick={() => handleStatusToggle('standard', r)}
                            title="点击快速启用/禁用"
                            className="flex items-center space-x-1 cursor-pointer"
                          >
                            <span className={`inline-flex items-center gap-1 min-h-6 px-2 inline-flex items-center rounded-ty-xs text-ty-2xs font-bold transition-colors ${
                              r.status === 'ACTIVE'
                                ? 'bg-[var(--ty-green-lightest-color)] text-[var(--ty-font-main-light-color)] border border-[var(--ty-green-color)]/30'
                                : 'bg-[var(--ty-fill-color)] text-[var(--ty-font-sub-color)] border border-[var(--ty-border-color)]'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${r.status === 'ACTIVE' ? 'bg-[var(--ty-green-color)]' : 'bg-[var(--ty-font-sub-light-color)]'}`} />
                              {r.status === 'ACTIVE' ? '启用中' : '已禁用'}
                            </span>
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center space-x-2">
                            <button onClick={() => handleEdit('standard', r)} className="p-1 hover:bg-[var(--ty-fill-weak-dark-color)] rounded-ty-xs text-[var(--ty-font-sub-color)] hover:text-[var(--ty-primary-color)] transition-all cursor-pointer" title="编辑规则">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDelete('standard', r.id)} className="p-1 hover:bg-[var(--ty-fill-weak-dark-color)] rounded-ty-xs text-[var(--ty-font-sub-color)] hover:text-[var(--ty-red-color)] transition-all cursor-pointer" title="删除规则">
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
            <TablePagination total={filteredStandard.length} page={standardPage.currentPage} pageSize={pageSize} itemLabel="条" onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
          </div>
        )}

        {activeTab === 'synonym' && (
          <div className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-left border-collapse text-ty-xs">
                <thead>
                  <tr className="bg-[var(--ty-fill-weak-dark-color)] border-b border-[var(--ty-border-color)] text-[var(--ty-font-sub-color)] font-semibold">
                    <th className="w-12 px-2 py-2 text-center">序号</th>
                    <th className="px-4 py-2 whitespace-nowrap">主词 (唯一推荐名)</th>
                    <th className="px-4 py-2 min-w-[200px]">同义词别名集 (触发拉平)</th>
                    <th className="px-4 py-2 whitespace-nowrap">作用范围</th>
                    <th className="px-4 py-2 whitespace-nowrap">适用对象类型</th>
                    <th className="px-4 py-2 whitespace-nowrap">适用属性</th>
                    <th className="px-4 py-2 whitespace-nowrap">状态</th>
                    <th className="px-4 py-2 whitespace-nowrap text-center">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--ty-border-light-color)]">
                  {filteredSynonym.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-[var(--ty-font-sub-light-color)]">暂无符合条件的同义词规则</td>
                    </tr>
                  ) : (
                    synonymPage.rows.map((r, index) => (
                      <tr key={r.id} className="hover:bg-[var(--ty-fill-weak-dark-color)] transition-colors">
                        <td className="w-12 px-2 py-3 text-center text-[var(--ty-font-sub-color)]">{(synonymPage.currentPage - 1) * pageSize + index + 1}</td>
                        <td className="px-4 py-3 font-semibold text-[var(--ty-font-main-color)] whitespace-nowrap">{r.primaryWord}</td>
                        <td className="px-4 py-3 min-w-[200px]">
                          <div className="flex flex-wrap gap-1">
                            {r.synonyms && r.synonyms.map((s, idx) => (
                              <span key={idx} className="bg-[var(--ty-primary-lightest-color)] text-[var(--ty-font-main-light-color)] border border-[var(--ty-primary-color)]/30 min-h-6 px-2 inline-flex items-center rounded-ty-xs text-ty-2xs font-medium">
                                {s}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-[var(--ty-font-sub-color)] font-medium">
                            {r.scope === 'GLOBAL' ? '全局通用' : r.scope === 'OBJECT_SPECIFIC' ? '对象专用' : '特定属性'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="bg-[var(--ty-primary-lightest-color)] text-[var(--ty-font-main-light-color)] border border-[var(--ty-primary-color)]/30 min-h-6 px-2 inline-flex items-center rounded-ty-xs text-ty-2xs">
                            {r.applicableObjectType === 'PART_MECHANICAL' ? '机械零件' : r.applicableObjectType === 'PART_ELECTRICAL' ? '电气元器件' : '通用件'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-[var(--ty-font-sub-light-color)] whitespace-nowrap">{r.applicableProperty || '全部/不限'}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button
                            onClick={() => handleStatusToggle('synonym', r)}
                            title="点击快速启用/禁用"
                            className="flex items-center space-x-1 cursor-pointer"
                          >
                            <span className={`inline-flex items-center gap-1 min-h-6 px-2 inline-flex items-center rounded-ty-xs text-ty-2xs font-bold transition-colors ${
                              r.status === 'ACTIVE'
                                ? 'bg-[var(--ty-green-lightest-color)] text-[var(--ty-font-main-light-color)] border border-[var(--ty-green-color)]/30'
                                : 'bg-[var(--ty-fill-color)] text-[var(--ty-font-sub-color)] border border-[var(--ty-border-color)]'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${r.status === 'ACTIVE' ? 'bg-[var(--ty-green-color)]' : 'bg-[var(--ty-font-sub-light-color)]'}`} />
                              {r.status === 'ACTIVE' ? '启用中' : '已禁用'}
                            </span>
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center space-x-2">
                            <button onClick={() => handleEdit('synonym', r)} className="p-1 hover:bg-[var(--ty-fill-weak-dark-color)] rounded-ty-xs text-[var(--ty-font-sub-color)] hover:text-[var(--ty-primary-color)] transition-all cursor-pointer" title="编辑规则">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDelete('synonym', r.id)} className="p-1 hover:bg-[var(--ty-fill-weak-dark-color)] rounded-ty-xs text-[var(--ty-font-sub-color)] hover:text-[var(--ty-red-color)] transition-all cursor-pointer" title="删除规则">
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
            <TablePagination total={filteredSynonym.length} page={synonymPage.currentPage} pageSize={pageSize} itemLabel="条" onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
          </div>
        )}

        {activeTab === 'align' && (
          <div className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-left border-collapse text-ty-xs">
                <thead>
                  <tr className="bg-[var(--ty-fill-weak-dark-color)] border-b border-[var(--ty-border-color)] text-[var(--ty-font-sub-color)] font-semibold">
                    <th className="w-12 px-2 py-2 text-center">序号</th>
                    <th className="px-4 py-2 whitespace-nowrap">类型</th>
                    <th className="px-4 py-2 min-w-[160px]">源系统分类/类型路径 (未清洗源)</th>
                    <th className="px-4 py-2 min-w-[160px]">标准归一分类/类型路径</th>
                    <th className="px-4 py-2 whitespace-nowrap">层级匹配相似度折扣 (退避退水系数)</th>
                    <th className="px-4 py-2 whitespace-nowrap">适用对象</th>
                    <th className="px-4 py-2 whitespace-nowrap">状态</th>
                    <th className="px-4 py-2 whitespace-nowrap text-center">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--ty-border-light-color)]">
                  {filteredAlign.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-[var(--ty-font-sub-light-color)]">暂无符合条件的分类/类型归一规则</td>
                    </tr>
                  ) : (
                    alignPage.rows.map((r, index) => (
                      <tr key={r.id} className="hover:bg-[var(--ty-fill-weak-dark-color)] transition-colors">
                        <td className="w-12 px-2 py-3 text-center text-[var(--ty-font-sub-color)]">{(alignPage.currentPage - 1) * pageSize + index + 1}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-semibold text-[var(--ty-font-main-color)]">
                            {r.ruleType === 'CLASSIFICATION' ? '分类路径映射' : r.ruleType === 'TYPE' ? '对象类型归一' : '属性对照'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[var(--ty-red-color)] font-medium font-mono min-w-[160px] break-all">{r.sourcePath}</td>
                        <td className="px-4 py-3 text-[var(--ty-green-color)] font-semibold font-mono min-w-[160px] break-all">{r.standardPath}</td>
                        <td className="px-4 py-3 font-mono font-bold text-[var(--ty-font-main-color)] whitespace-nowrap">
                          {r.similarityDiscount * 100}% <span className="text-ty-2xs text-[var(--ty-font-sub-light-color)] font-normal">({r.similarityDiscount < 1.0 ? '跨级损耗' : '完全拉平'})</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="bg-[var(--ty-primary-lightest-color)] text-[var(--ty-font-main-light-color)] border border-[var(--ty-primary-color)]/30 min-h-6 px-2 inline-flex items-center rounded-ty-xs text-ty-2xs">
                            {r.applicableObjectType === 'PART_MECHANICAL' ? '机械零件' : r.applicableObjectType === 'PART_ELECTRICAL' ? '电气元器件' : '通用件'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button
                            onClick={() => handleStatusToggle('align', r)}
                            title="点击快速启用/禁用"
                            className="flex items-center space-x-1 cursor-pointer"
                          >
                            <span className={`inline-flex items-center gap-1 min-h-6 px-2 inline-flex items-center rounded-ty-xs text-ty-2xs font-bold transition-colors ${
                              r.status === 'ACTIVE'
                                ? 'bg-[var(--ty-green-lightest-color)] text-[var(--ty-font-main-light-color)] border border-[var(--ty-green-color)]/30'
                                : 'bg-[var(--ty-fill-color)] text-[var(--ty-font-sub-color)] border border-[var(--ty-border-color)]'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${r.status === 'ACTIVE' ? 'bg-[var(--ty-green-color)]' : 'bg-[var(--ty-font-sub-light-color)]'}`} />
                              {r.status === 'ACTIVE' ? '启用中' : '已禁用'}
                            </span>
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center space-x-2">
                            <button onClick={() => handleEdit('align', r)} className="p-1 hover:bg-[var(--ty-fill-weak-dark-color)] rounded-ty-xs text-[var(--ty-font-sub-color)] hover:text-[var(--ty-primary-color)] transition-all cursor-pointer" title="编辑规则">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDelete('align', r.id)} className="p-1 hover:bg-[var(--ty-fill-weak-dark-color)] rounded-ty-xs text-[var(--ty-font-sub-color)] hover:text-[var(--ty-red-color)] transition-all cursor-pointer" title="删除规则">
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
            <TablePagination total={filteredAlign.length} page={alignPage.currentPage} pageSize={pageSize} itemLabel="条" onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
          </div>
        )}

      </div>

      {/* 业务指南 */}
      <div className="p-4 bg-[var(--ty-fill-weak-dark-color)] border border-[var(--ty-border-color)] rounded-ty-sm">
        <div className="flex items-center space-x-2 mb-2">
          <span className="min-h-6 px-2 inline-flex items-center bg-[var(--ty-primary-color)] text-[var(--ty-font-white-color)] rounded-ty-xs text-ty-2xs font-bold">
            业务指南
          </span>
          <h4 className="text-ty-xs font-bold text-[var(--ty-font-main-color)]">前置数据清洗与归一说明</h4>
        </div>
        <div className="text-ty-xs text-[var(--ty-font-sub-color)] space-y-2 leading-relaxed">
          <p>
            此模块属于<strong className="text-[var(--ty-font-main-color)]">字段属性相似度算分的前置辅助清洗与归一</strong>。在对候选件和拟建件各字段进行比对评分之前，通过本页规则对单位、格式、书写习惯以及同义术语进行统合（如将 "φ", "D", "直径" 映射清洗为规范规格，或进行同义词主副匹配），不在此直接设置或修改相似度权重，以保证评分前数据的高保真度与同义拉平。
          </p>
          <div className="pt-2 border-t border-[var(--ty-border-color)] flex flex-wrap items-center gap-4 text-[var(--ty-font-sub-light-color)] font-mono text-ty-2xs">
            <span><strong>算分完整链路方案：</strong> 1. 前置数据清洗 (当前页) → 2. 相似度评分引擎 → 3. 业务决策输出</span>
          </div>
        </div>
      </div>

      {/* RENDER MODAL POPUP FOR CRUD */}
      {editingRule && (
        <div className="fixed inset-0 bg-ty-overlay backdrop-blur-xs flex items-center justify-center z-50 px-4 py-[60px]">
          <section role="dialog" aria-modal="true" aria-labelledby="data-processing-dialog-title" className="standard-form-dialog bg-[var(--ty-fill-white-color)] rounded-ty-lg shadow-ty-lg w-[min(600px,calc(100vw-32px))] border border-[var(--ty-border-color)] flex flex-col max-h-[calc(100dvh-120px)] overflow-hidden">

            {/* Modal Header */}
            <div className="px-4 py-3 border-b border-[var(--ty-border-color)] flex items-center justify-between bg-[var(--ty-fill-weak-dark-color)] shrink-0">
              <div className="flex items-center space-x-2">
                <Settings className="w-4 h-4 text-[var(--ty-primary-color)]" />
                <h2 id="data-processing-dialog-title" className="font-semibold text-[var(--ty-font-main-color)] text-ty-lg">
                  {editingRule.isNew ? '新建' : '编辑'}
                  {editingRule.type === 'standard' ? '标准化处理规则' : editingRule.type === 'synonym' ? '同义词映射词典' : '分类/类型归一策略'}
                </h2>
              </div>
              <button type="button" aria-label="关闭数据处理规则弹窗" onClick={() => setEditingRule(null)} className="h-7 w-7 flex items-center justify-center text-[var(--ty-font-sub-light-color)] hover:text-[var(--ty-font-main-color)] hover:bg-[var(--ty-fill-color)] rounded-ty-sm cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSave} className="flex-1 overflow-auto p-4 space-y-4">

              {/* Common Information Alert */}
              <div className="p-3 bg-[var(--ty-orange-lightest-color)] rounded-ty-sm text-ty-xs text-[var(--ty-font-main-light-color)] flex items-start space-x-2 border border-[var(--ty-orange-color)]/30">
                <AlertCircle className="w-3.5 h-3.5 text-[var(--ty-orange-color)] shrink-0 mt-0.5" />
                <span>
                  <strong className="text-[var(--ty-orange-color)]">三阶段原型提示：</strong>当前编辑的数据预处理参数属于<strong>三阶段未来启用后的规则行为</strong>，仅作原型交互，不直接或间接决定当前的二阶段物料字段相似度算分。
                </span>
              </div>

              {/* Standard Form Fields */}
              {editingRule.type === 'standard' && (
                <div className="space-y-4 text-ty-xs">
                  <div>
                    <label className="block font-semibold text-[var(--ty-font-main-color)] mb-1">规则名称 <span className="text-[var(--ty-red-color)]">*</span></label>
                    <input
                      type="text"
                      required
                      value={editingRule.item.ruleName}
                      onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, ruleName: e.target.value }})}
                      placeholder="例如: 螺纹/孔径单位规范化"
                      className="w-full bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-2 text-ty-xs text-[var(--ty-font-main-color)] focus:border-[var(--ty-primary-color)] outline-hidden"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-[var(--ty-font-main-color)] mb-1">适用对象类型</label>
                      <select
                        value={editingRule.item.applicableObjectType}
                        onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, applicableObjectType: e.target.value as ObjectType }})}
                        className="w-full bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-2 text-ty-xs text-[var(--ty-font-main-color)] focus:border-[var(--ty-primary-color)] outline-hidden"
                      >
                        <option value="PART_MECHANICAL">机械零件</option>
                        <option value="PART_ELECTRICAL">电气元器件</option>
                        <option value="ALL">全部大类</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-[var(--ty-font-main-color)] mb-1">适用属性英文编码 <span className="text-[var(--ty-red-color)]">*</span></label>
                      <input
                        type="text"
                        required
                        value={editingRule.item.applicableProperty}
                        onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, applicableProperty: e.target.value }})}
                        placeholder="如: thread_specification"
                        className="w-full bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-2 text-ty-xs text-[var(--ty-font-main-color)] focus:border-[var(--ty-primary-color)] outline-hidden font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-[var(--ty-font-main-color)] mb-1">处理模式</label>
                      <select
                        value={editingRule.item.ruleMethod}
                        onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, ruleMethod: e.target.value as any }})}
                        className="w-full bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-2 text-ty-xs text-[var(--ty-font-main-color)] focus:border-[var(--ty-primary-color)] outline-hidden"
                      >
                        <option value="MAP">多对一静态映射 (Map)</option>
                        <option value="REGEX">正则表达式匹配提取 (Regex)</option>
                        <option value="REPLACE">纯文本替换 (Replace)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-[var(--ty-font-main-color)] mb-1">匹配优先级 (数字越小越优先)</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={editingRule.item.matchPriority}
                        onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, matchPriority: parseInt(e.target.value) || 1 }})}
                        className="w-full bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-2 text-ty-xs text-[var(--ty-font-main-color)] focus:border-[var(--ty-primary-color)] outline-hidden"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-[var(--ty-font-main-color)] mb-1">映射前原始值 (多行文本，一行代表一个匹配源)</label>
                    <textarea
                      rows={3}
                      value={editingRule.item.rawValue}
                      onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, rawValue: e.target.value }})}
                      placeholder="φ&#10;D&#10;直径"
                      className="w-full bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-2 text-ty-xs text-[var(--ty-font-main-color)] focus:border-[var(--ty-primary-color)] outline-hidden font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[var(--ty-font-main-color)] mb-1">清洗映射后(标准值) <span className="text-[var(--ty-red-color)]">*</span></label>
                    <input
                      type="text"
                      required
                      value={editingRule.item.standardValue}
                      onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, standardValue: e.target.value }})}
                      placeholder="M"
                      className="w-full bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-2 text-ty-xs text-[var(--ty-font-main-color)] focus:border-[var(--ty-primary-color)] outline-hidden font-mono"
                    />
                  </div>

                  <div className="flex items-center space-x-6 bg-[var(--ty-fill-weak-dark-color)] p-3 rounded-ty-sm border border-[var(--ty-border-color)]">
                    <label className="flex items-center space-x-2 font-semibold text-[var(--ty-font-main-color)] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingRule.item.isSimilarityActive}
                        onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, isSimilarityActive: e.target.checked }})}
                        className="rounded text-[var(--ty-primary-color)] focus:ring-[var(--ty-primary-color)] h-3.5 w-3.5"
                      />
                      <span>参与算分清洗</span>
                    </label>

                    <label className="flex items-center space-x-2 font-semibold text-[var(--ty-font-main-color)] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingRule.item.isFullTextActive}
                        onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, isFullTextActive: e.target.checked }})}
                        className="rounded text-[var(--ty-primary-color)] focus:ring-[var(--ty-primary-color)] h-3.5 w-3.5"
                      />
                      <span>参与全局检索清洗</span>
                    </label>
                  </div>

                  <div>
                    <label className="block font-semibold text-[var(--ty-font-main-color)] mb-1">状态</label>
                    <select
                      value={editingRule.item.status}
                      onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, status: e.target.value as any }})}
                      className="w-full bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-2 text-ty-xs text-[var(--ty-font-main-color)] focus:border-[var(--ty-primary-color)] outline-hidden font-semibold"
                    >
                      <option value="ACTIVE">启用中 (ACTIVE)</option>
                      <option value="INACTIVE">已禁用 (INACTIVE)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-[var(--ty-font-main-color)] mb-1">备注/说明 (对齐逻辑使用)</label>
                    <input
                      type="text"
                      value={editingRule.item.remarks || ''}
                      onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, remarks: e.target.value }})}
                      placeholder="解释此字段属性映射的业务背景"
                      className="w-full bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-2 text-ty-xs text-[var(--ty-font-main-color)] focus:border-[var(--ty-primary-color)] outline-hidden"
                    />
                  </div>
                </div>
              )}

              {/* Synonym Form Fields */}
              {editingRule.type === 'synonym' && (
                <div className="space-y-4 text-ty-xs">
                  <div>
                    <label className="block font-semibold text-[var(--ty-font-main-color)] mb-1">主词 (唯一推荐标准名) <span className="text-[var(--ty-red-color)]">*</span></label>
                    <input
                      type="text"
                      required
                      value={editingRule.item.primaryWord}
                      onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, primaryWord: e.target.value }})}
                      placeholder="例如: 芯片"
                      className="w-full bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-2 text-ty-xs text-[var(--ty-font-main-color)] focus:border-[var(--ty-primary-color)] outline-hidden font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[var(--ty-font-main-color)] mb-1">同义词别名集 (多个别名，用中文、英文逗号或空格分隔) <span className="text-[var(--ty-red-color)]">*</span></label>
                    <input
                      type="text"
                      required
                      value={editingRule.item.synonyms ? editingRule.item.synonyms.join(', ') : ''}
                      onChange={(e) => {
                        const splitWords = e.target.value.split(/[,,，，\s]+/).filter(Boolean);
                        setEditingRule({ ...editingRule, item: { ...editingRule.item, synonyms: splitWords }});
                      }}
                      placeholder="例如: 集成电路, IC, 微处理器, chip"
                      className="w-full bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-2 text-ty-xs text-[var(--ty-font-main-color)] focus:border-[var(--ty-primary-color)] outline-hidden"
                    />
                    <span className="text-ty-2xs text-[var(--ty-font-sub-light-color)] block mt-1">系统将把别名集的词自动指向并拉平至主词计算相似度。</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-[var(--ty-font-main-color)] mb-1">作用范围</label>
                      <select
                        value={editingRule.item.scope}
                        onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, scope: e.target.value as any }})}
                        className="w-full bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-2 text-ty-xs text-[var(--ty-font-main-color)] focus:border-[var(--ty-primary-color)] outline-hidden font-medium"
                      >
                        <option value="GLOBAL">全局通用 (GLOBAL)</option>
                        <option value="OBJECT_SPECIFIC">对象专用 (OBJECT_SPECIFIC)</option>
                        <option value="PROPERTY_SPECIFIC">特定属性约束 (PROPERTY_SPECIFIC)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-[var(--ty-font-main-color)] mb-1">适用对象类型</label>
                      <select
                        value={editingRule.item.applicableObjectType}
                        onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, applicableObjectType: e.target.value as ObjectType }})}
                        className="w-full bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-2 text-ty-xs text-[var(--ty-font-main-color)] focus:border-[var(--ty-primary-color)] outline-hidden"
                      >
                        <option value="PART_MECHANICAL">机械零件</option>
                        <option value="PART_ELECTRICAL">电气元器件</option>
                        <option value="ALL">全部大类</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-[var(--ty-font-main-color)] mb-1">适用特定属性 (仅在“作用范围”为特定属性时生效)</label>
                    <input
                      type="text"
                      value={editingRule.item.applicableProperty || ''}
                      onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, applicableProperty: e.target.value }})}
                      placeholder="如: material_name, 如果全局不限请留空"
                      className="w-full bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-2 text-ty-xs text-[var(--ty-font-main-color)] focus:border-[var(--ty-primary-color)] outline-hidden font-mono"
                    />
                  </div>

                  <div className="flex items-center space-x-6 bg-[var(--ty-fill-weak-dark-color)] p-3 rounded-ty-sm border border-[var(--ty-border-color)]">
                    <label className="flex items-center space-x-2 font-semibold text-[var(--ty-font-main-color)] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingRule.item.isSimilarityActive}
                        onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, isSimilarityActive: e.target.checked }})}
                        className="rounded text-[var(--ty-primary-color)] focus:ring-[var(--ty-primary-color)] h-3.5 w-3.5"
                      />
                      <span>计算相似度拉平</span>
                    </label>

                    <label className="flex items-center space-x-2 font-semibold text-[var(--ty-font-main-color)] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingRule.item.isFullTextActive}
                        onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, isFullTextActive: e.target.checked }})}
                        className="rounded text-[var(--ty-primary-color)] focus:ring-[var(--ty-primary-color)] h-3.5 w-3.5"
                      />
                      <span>全文分词联想拉平</span>
                    </label>
                  </div>

                  <div>
                    <label className="block font-semibold text-[var(--ty-font-main-color)] mb-1">启用状态</label>
                    <select
                      value={editingRule.item.status}
                      onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, status: e.target.value as any }})}
                      className="w-full bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-2 text-ty-xs text-[var(--ty-font-main-color)] focus:border-[var(--ty-primary-color)] outline-hidden font-semibold"
                    >
                      <option value="ACTIVE">已启用 (ACTIVE)</option>
                      <option value="INACTIVE">已停用 (INACTIVE)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Path Alignment Form Fields */}
              {editingRule.type === 'align' && (
                <div className="space-y-4 text-ty-xs">
                  <div>
                    <label className="block font-semibold text-[var(--ty-font-main-color)] mb-1">对照规则类型</label>
                    <select
                      value={editingRule.item.ruleType}
                      onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, ruleType: e.target.value as any }})}
                      className="w-full bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-2 text-ty-xs text-[var(--ty-font-main-color)] focus:border-[var(--ty-primary-color)] outline-hidden font-semibold"
                    >
                      <option value="CLASSIFICATION">分类映射关系 (Classification Path)</option>
                      <option value="TYPE">对象类型归一 (Object Type Mapping)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-[var(--ty-font-main-color)] mb-1">外部/源分类路径 (未规范源数据路径) <span className="text-[var(--ty-red-color)]">*</span></label>
                    <input
                      type="text"
                      required
                      value={editingRule.item.sourcePath}
                      onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, sourcePath: e.target.value }})}
                      placeholder="例如: ERP/五金件/紧固件"
                      className="w-full bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-2 text-ty-xs text-[var(--ty-red-color)] focus:border-[var(--ty-primary-color)] outline-hidden font-mono font-medium"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[var(--ty-font-main-color)] mb-1">对照归一到标准分类路径 (Manticore 内部) <span className="text-[var(--ty-red-color)]">*</span></label>
                    <input
                      type="text"
                      required
                      value={editingRule.item.standardPath}
                      onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, standardPath: e.target.value }})}
                      placeholder="例如: PLM/标准件/螺栓螺钉/六角螺母"
                      className="w-full bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-2 text-ty-xs text-[var(--ty-green-color)] focus:border-[var(--ty-primary-color)] outline-hidden font-mono font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-[var(--ty-font-main-color)] mb-1">分类层级匹配退避相似度折扣 (0.00 ~ 1.00)</label>
                      <input
                        type="number"
                        step="0.05"
                        min="0"
                        max="1"
                        value={editingRule.item.similarityDiscount}
                        onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, similarityDiscount: parseFloat(e.target.value) || 0.9 }})}
                        className="w-full bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-2 text-ty-xs focus:border-[var(--ty-primary-color)] outline-hidden font-mono font-bold text-[var(--ty-font-main-color)]"
                      />
                      <span className="text-ty-2xs text-[var(--ty-font-sub-light-color)] block mt-1">例如 0.9 代表映射成功后，基础评分扣减 10% 做惩罚退水。</span>
                    </div>

                    <div>
                      <label className="block font-semibold text-[var(--ty-font-main-color)] mb-1">适用对象类型</label>
                      <select
                        value={editingRule.item.applicableObjectType}
                        onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, applicableObjectType: e.target.value as ObjectType }})}
                        className="w-full bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-2 text-ty-xs text-[var(--ty-font-main-color)] focus:border-[var(--ty-primary-color)] outline-hidden"
                      >
                        <option value="PART_MECHANICAL">机械零件</option>
                        <option value="PART_ELECTRICAL">电气元器件</option>
                        <option value="ALL">全部大类</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-[var(--ty-font-main-color)] mb-1">映射启用状态</label>
                    <select
                      value={editingRule.item.status}
                      onChange={(e) => setEditingRule({ ...editingRule, item: { ...editingRule.item, status: e.target.value as any }})}
                      className="w-full bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm p-2 text-ty-xs text-[var(--ty-font-main-color)] focus:border-[var(--ty-primary-color)] outline-hidden font-semibold"
                    >
                      <option value="ACTIVE">启用对照关系 (ACTIVE)</option>
                      <option value="INACTIVE">禁用对照关系 (INACTIVE)</option>
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
