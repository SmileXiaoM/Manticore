import React, { useState, useMemo } from 'react';
import {
  Plus,
  Save,
  Search,
  Edit2,
  Trash2,
  Undo2,
  ChevronRight,
  GitPullRequest,
  CheckCircle2
} from 'lucide-react';
import { ClassificationAlignmentRule, ObjectType } from '../types';

interface AlignmentViewProps {
  rules: ClassificationAlignmentRule[];
  onUpdateRules: (newRules: ClassificationAlignmentRule[]) => void;
}

export const AlignmentView: React.FC<AlignmentViewProps> = ({
  rules,
  onUpdateRules
}) => {
  const [editingRule, setEditingRule] = useState<ClassificationAlignmentRule | null>(null);
  const [isNew, setIsNew] = useState(false);

  // Filters state
  const [filterType, setFilterType] = useState('ALL');
  const [filterSource, setFilterSource] = useState('');
  const [filterStd, setFilterStd] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Form states
  const [formRuleType, setFormRuleType] = useState<'CLASSIFICATION' | 'TYPE' | 'ATTRIBUTES'>('CLASSIFICATION');
  const [formSourceSystem, setFormSourceSystem] = useState('');
  const [formSourceObjectType, setFormSourceObjectType] = useState('');
  const [formSourcePath, setFormSourcePath] = useState('');
  const [formStandardPath, setFormStandardPath] = useState('');
  const [formHierarchyStrategy, setFormHierarchyStrategy] = useState<'ALIGN_STANDARD' | 'CO_LEVEL_SIMILAR' | 'PARENT_CHILD_SIMILAR' | 'DISPLAY_ONLY'>('ALIGN_STANDARD');
  const [formSimilarityDiscount, setFormSimilarityDiscount] = useState(1.0);
  const [formApplicableObjectType, setFormApplicableObjectType] = useState<ObjectType>('PART_MECHANICAL');
  const [formRemarks, setFormRemarks] = useState('');

  // Switches
  const [formIsActive, setFormIsActive] = useState(true);
  const [formIsSimilarityActive, setFormIsSimilarityActive] = useState(true);

  // Filter Logic
  const filteredRules = useMemo(() => {
    return rules.filter(r => {
      const matchType = filterType === 'ALL' || r.ruleType === filterType;

      const matchSource = filterSource === '' ||
        r.sourceSystem.toLowerCase().includes(filterSource.toLowerCase()) ||
        r.sourcePath.toLowerCase().includes(filterSource.toLowerCase());

      const matchStd = filterStd === '' ||
        r.standardPath.toLowerCase().includes(filterStd.toLowerCase());

      const matchStatus = filterStatus === 'ALL' ||
        (filterStatus === 'ACTIVE' && r.status === 'ACTIVE') ||
        (filterStatus === 'INACTIVE' && r.status === 'INACTIVE');

      return matchType && matchSource && matchStd && matchStatus;
    });
  }, [rules, filterType, filterSource, filterStd, filterStatus]);

  // Handle Edit Click
  const handleEdit = (rule: ClassificationAlignmentRule) => {
    setEditingRule(rule);
    setIsNew(false);

    setFormRuleType(rule.ruleType);
    setFormSourceSystem(rule.sourceSystem);
    setFormSourceObjectType(rule.sourceObjectType);
    setFormSourcePath(rule.sourcePath);
    setFormStandardPath(rule.standardPath);
    setFormHierarchyStrategy(rule.hierarchyStrategy);
    setFormSimilarityDiscount(rule.similarityDiscount);
    setFormApplicableObjectType(rule.applicableObjectType);
    setFormRemarks(rule.remarks || '');

    setFormIsActive(rule.status === 'ACTIVE');
    setFormIsSimilarityActive(rule.isSimilarityActive);
  };

  // Handle New Click
  const handleNew = () => {
    setEditingRule(null);
    setIsNew(true);

    setFormRuleType('CLASSIFICATION');
    setFormSourceSystem('Windchill PLM');
    setFormSourceObjectType('wt.part.WTPart');
    setFormSourcePath('/旧分类树/电子件/阻容/陶瓷电容');
    setFormStandardPath('/国家标准分类/电子元器件/电容器/固定电容器/多层陶瓷电容器');
    setFormHierarchyStrategy('ALIGN_STANDARD');
    setFormSimilarityDiscount(1.0);
    setFormApplicableObjectType('PART_ELECTRICAL');
    setFormRemarks('');

    setFormIsActive(true);
    setFormIsSimilarityActive(true);
  };

  // Handle Save
  const handleSave = () => {
    if (!formSourcePath || !formStandardPath || !formSourceSystem) {
      alert('请填齐所有必填选项（源路径、标准路径、源系统）！');
      return;
    }

    const updated: ClassificationAlignmentRule = {
      id: isNew ? `A-00${rules.length + 1}` : (editingRule?.id || 'A-TMP'),
      ruleType: formRuleType,
      sourceSystem: formSourceSystem,
      sourceObjectType: formSourceObjectType,
      sourcePath: formSourcePath,
      standardPath: formStandardPath,
      hierarchyStrategy: formHierarchyStrategy,
      similarityDiscount: Number(formSimilarityDiscount),
      applicableObjectType: formApplicableObjectType,
      status: formIsActive ? 'ACTIVE' : 'INACTIVE',
      version: isNew ? 'v1.0.0' : (editingRule?.version || 'v1.0.0'),
      lastEditor: '李晓华 (数据标准管理员)',
      lastEditTime: new Date().toISOString().replace('T', ' ').substring(0, 19),
      remarks: formRemarks,
      isSimilarityActive: formIsSimilarityActive
    };

    if (isNew) {
      onUpdateRules([...rules, updated]);
    } else {
      onUpdateRules(rules.map(r => r.id === updated.id ? updated : r));
    }

    setIsNew(false);
    setEditingRule(null);
  };

  // Handle Delete
  const handleDelete = (id: string) => {
    if (window.confirm(`确定要删除分类归一规则 ${id} 吗？`)) {
      onUpdateRules(rules.filter(r => r.id !== id));
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">

      {/* Title Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0 flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2 text-xs text-slate-500 mb-1">
            <span>相似度配置</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-800 font-medium">分类 / 类型归一</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            {isNew ? '新建分类 / 类型归一规则' : editingRule ? '编辑分类 / 类型归一规则' : '异构系统分类与类型归一对齐配置'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            规范多系统集成（Windchill, SAP, Teamcenter）下不一致的零组件分类。设置折扣权重、层级退让机制，确保相似度引擎能够跨系统计算几何与属性匹配。
          </p>
        </div>

        {!editingRule && !isNew ? (
          <button
            onClick={handleNew}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新建归一规则</span>
          </button>
        ) : (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => { setEditingRule(null); setIsNew(false); }}
              className="flex items-center space-x-1.5 px-3.5 py-2 border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 rounded-md text-xs font-medium transition-colors"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>返回列表</span>
            </button>
            <button
              onClick={handleSave}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md text-xs font-semibold shadow-xs transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>保存归一配置</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Content container */}
      {!(editingRule || isNew) ? (
        // FRAME 7: LIST VIEW
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Filters area */}
          <div className="px-6 py-3 shrink-0 flex flex-wrap items-center gap-3 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center space-x-1.5 text-xs">
              <span className="text-slate-500">规则类型:</span>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-white border border-slate-300 rounded px-2 py-1.5 text-xs"
              >
                <option value="ALL">全部类型</option>
                <option value="CLASSIFICATION">分类路径归一 (CLASSIFICATION)</option>
                <option value="TYPE">对象类型归一 (TYPE)</option>
                <option value="ATTRIBUTES">属性键组归一</option>
              </select>
            </div>

            <div className="flex items-center space-x-1.5 text-xs">
              <span className="text-slate-500">源系统/源路径:</span>
              <input
                type="text"
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value)}
                placeholder="搜索 Windchill / SAP / 路径..."
                className="bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs w-52 focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div className="flex items-center space-x-1.5 text-xs">
              <span className="text-slate-500">标准分类路径:</span>
              <input
                type="text"
                value={filterStd}
                onChange={(e) => setFilterStd(e.target.value)}
                placeholder="搜索国标标准分类路径..."
                className="bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs w-52 focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div className="flex items-center space-x-1.5 text-xs">
              <span className="text-slate-500">状态:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-white border border-slate-300 rounded px-2 py-1.5 text-xs"
              >
                <option value="ALL">全部状态</option>
                <option value="ACTIVE">启用 (ACTIVE)</option>
                <option value="INACTIVE">禁用 (INACTIVE)</option>
              </select>
            </div>

            {(filterType !== 'ALL' || filterSource || filterStd || filterStatus !== 'ALL') && (
              <button
                onClick={() => {
                  setFilterType('ALL');
                  setFilterSource('');
                  setFilterStd('');
                  setFilterStatus('ALL');
                }}
                className="text-xs text-blue-600 hover:text-blue-800 underline pl-1"
              >
                清除条件
              </button>
            )}
          </div>

          {/* High density table */}
          <div className="flex-1 overflow-auto px-6 pb-6 pt-4">
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm min-w-[1500px] overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 text-xs font-semibold font-sans">
                    <th className="px-3 py-2.5 border-r border-slate-200">规则类型</th>
                    <th className="px-3 py-2.5 border-r border-slate-200">集成源头系统</th>
                    <th className="px-3 py-2.5 border-r border-slate-200">源系统对象类型</th>
                    <th className="px-4 py-2.5 border-r border-slate-200">异构源分类 / 类型全路径 (Source)</th>
                    <th className="px-4 py-2.5 border-r border-slate-200">对应标准 PLM 分类/类型路径 (Standard)</th>
                    <th className="px-3 py-2.5 border-r border-slate-200">层级策略机制</th>
                    <th className="px-3 py-2.5 border-r border-slate-200 text-center">相似度折扣</th>
                    <th className="px-3 py-2.5 border-r border-slate-200">适用物料类型</th>
                    <th className="px-3 py-2.5 border-r border-slate-200 text-center">状态</th>
                    <th className="px-3 py-2.5 border-r border-slate-200">生效版本</th>
                    <th className="px-3 py-2.5 border-r border-slate-200">最后维护人</th>
                    <th className="px-3 py-2.5 border-r border-slate-200">最后维护时间</th>
                    <th className="px-4 py-2.5 text-center">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs font-sans">
                  {filteredRules.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Rule Type */}
                      <td className="px-3 py-2 border-r border-slate-200 font-medium whitespace-nowrap">
                        {r.ruleType === 'CLASSIFICATION' ? (
                          <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-mono">分类路径归一</span>
                        ) : (
                          <span className="bg-sky-50 text-sky-800 border border-sky-200 px-2 py-0.5 rounded text-[10px] font-mono">对象类型归一</span>
                        )}
                      </td>

                      {/* Source System */}
                      <td className="px-3 py-2 border-r border-slate-200 font-semibold text-slate-800 whitespace-nowrap">
                        {r.sourceSystem}
                      </td>

                      {/* Source object type */}
                      <td className="px-3 py-2 border-r border-slate-200 font-mono text-slate-500 whitespace-nowrap">
                        {r.sourceObjectType}
                      </td>

                      {/* Source path */}
                      <td className="px-4 py-2 border-r border-slate-200 text-slate-600 font-mono max-w-[280px] truncate" title={r.sourcePath}>
                        {r.sourcePath}
                      </td>

                      {/* Standard path */}
                      <td className="px-4 py-2 border-r border-slate-200 font-bold text-slate-900 font-mono max-w-[280px] truncate" title={r.standardPath}>
                        {r.standardPath}
                      </td>

                      {/* Strategy */}
                      <td className="px-3 py-2 border-r border-slate-200 whitespace-nowrap">
                        {r.hierarchyStrategy === 'ALIGN_STANDARD' ? (
                          <span className="text-slate-700">归一为标准分类</span>
                        ) : r.hierarchyStrategy === 'CO_LEVEL_SIMILAR' ? (
                          <span className="text-amber-700 font-medium">同级视为相似 (退让)</span>
                        ) : r.hierarchyStrategy === 'PARENT_CHILD_SIMILAR' ? (
                          <span className="text-indigo-700 font-medium">父子级相似 (折合)</span>
                        ) : (
                          <span className="text-slate-400">仅展示不计分</span>
                        )}
                      </td>

                      {/* Similarity Discount */}
                      <td className="px-3 py-2 border-r border-slate-200 text-center font-bold text-slate-800 whitespace-nowrap font-mono">
                        {r.similarityDiscount === 1.0 ? (
                          <span className="text-emerald-600">1.00 (无损)</span>
                        ) : (
                          <span className="text-amber-600">{r.similarityDiscount.toFixed(2)}</span>
                        )}
                      </td>

                      {/* Applicable object type */}
                      <td className="px-3 py-2 border-r border-slate-200 whitespace-nowrap text-slate-600">
                        {r.applicableObjectType === 'PART_MECHANICAL' ? '机械零件' : '电气元器件'}
                      </td>

                      {/* Status */}
                      <td className="px-3 py-2 border-r border-slate-200 text-center whitespace-nowrap">
                        {r.status === 'ACTIVE' ? (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-medium">启用中</span>
                        ) : (
                          <span className="bg-slate-100 text-slate-400 border border-slate-200 px-2 py-0.5 rounded font-medium">禁用</span>
                        )}
                      </td>

                      {/* Version */}
                      <td className="px-3 py-2 border-r border-slate-200 font-mono text-slate-500 whitespace-nowrap">
                        {r.version}
                      </td>

                      {/* Creator */}
                      <td className="px-3 py-2 border-r border-slate-200 text-slate-600 whitespace-nowrap">
                        {r.lastEditor}
                      </td>

                      {/* Edit time */}
                      <td className="px-3 py-2 border-r border-slate-200 text-slate-500 font-mono whitespace-nowrap">
                        {r.lastEditTime}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-2 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            onClick={() => handleEdit(r)}
                            className="p-1 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded transition-colors"
                            title="修改归一对齐"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(r.id)}
                            className="p-1 text-slate-600 hover:text-red-600 hover:bg-slate-100 rounded transition-colors"
                            title="删除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        // FRAME 8: NEW / EDIT FORM VIEW
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">

            <div className="bg-slate-50 px-6 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-800">
                {isNew ? '创建新分类与类型映射归一规则' : `正在编辑规则: [${editingRule?.id}]`}
              </span>
              <span className="text-xs bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 font-mono text-emerald-700">
                Manticore Taxonomy Align
              </span>
            </div>

            <div className="p-6 space-y-5 text-xs">

              {/* Row 1: Rule Type & Source System & Source Object type */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 mb-1.5">归一规则类型</label>
                  <select
                    value={formRuleType}
                    onChange={(e) => setFormRuleType(e.target.value as any)}
                    className="w-full bg-white border border-slate-300 rounded p-2 text-xs focus:ring-1 focus:ring-blue-500 font-medium text-slate-800"
                  >
                    <option value="CLASSIFICATION">分类路径映射归一 (CLASSIFICATION)</option>
                    <option value="TYPE">系统基础对象类型映射归一 (TYPE)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1.5">集成源头业务系统 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formSourceSystem}
                    onChange={(e) => setFormSourceSystem(e.target.value)}
                    placeholder="例如: SAP ERP 或 TC PLM"
                    className="w-full bg-white border border-slate-300 rounded p-2 text-xs focus:ring-1 focus:ring-blue-500 font-semibold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1.5">源系统对象类型 (Object Type) <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formSourceObjectType}
                    onChange={(e) => setFormSourceObjectType(e.target.value)}
                    placeholder="例如: MARA 或 wt.part.WTPart"
                    className="w-full bg-white border border-slate-300 rounded p-2 text-xs focus:ring-1 focus:ring-blue-500 font-mono text-slate-600"
                  />
                </div>
              </div>

              {/* Row 2: Source Path & Standard Path */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 mb-1.5">源头不规则分类树/类型路径 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formSourcePath}
                    onChange={(e) => setFormSourcePath(e.target.value)}
                    placeholder="例如: /旧分类树/电子件/阻容/陶瓷电容"
                    className="w-full bg-white border border-slate-300 rounded p-2 text-xs font-mono text-slate-700 focus:ring-1 focus:ring-blue-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">集成推送物料在原始系统中的原路径或原始代号。</span>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1.5">对应 PLM 集团标准分类/类型路径 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formStandardPath}
                    onChange={(e) => setFormStandardPath(e.target.value)}
                    placeholder="例如: /国家标准分类/电子元器件/电容器/多层陶瓷电容器"
                    className="w-full bg-white border border-slate-300 rounded p-2 text-xs font-semibold font-mono text-slate-900 focus:ring-1 focus:ring-blue-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">集团主数据管理办公室发布的集团唯一主路径。</span>
                </div>
              </div>

              {/* Row 3: Layer Strategy & Similarity Discount & Applicable object */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 mb-1.5">层级演进退让策略</label>
                  <select
                    value={formHierarchyStrategy}
                    onChange={(e) => setFormHierarchyStrategy(e.target.value as any)}
                    className="w-full bg-white border border-slate-300 rounded p-2 text-xs focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="ALIGN_STANDARD">直接归一为标准分类 (ALIGN_STANDARD)</option>
                    <option value="CO_LEVEL_SIMILAR">同级视为相似 (CO_LEVEL_SIMILAR)</option>
                    <option value="PARENT_CHILD_SIMILAR">父子级相似退避 (PARENT_CHILD_SIMILAR)</option>
                    <option value="DISPLAY_ONLY">仅展示不参与评分 (DISPLAY_ONLY)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1.5">相似度匹配折让系数 (0.0 ~ 1.0)</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      step="0.05"
                      min="0.0"
                      max="1.0"
                      value={formSimilarityDiscount}
                      onChange={(e) => setFormSimilarityDiscount(Number(e.target.value))}
                      className="w-24 bg-white border border-slate-300 rounded p-2 text-xs font-mono font-bold text-center text-slate-800 focus:ring-1 focus:ring-blue-500"
                    />
                    <span className="text-slate-500">1.0 为无损折现</span>
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1.5">适用主对象大类</label>
                  <select
                    value={formApplicableObjectType}
                    onChange={(e) => setFormApplicableObjectType(e.target.value as ObjectType)}
                    className="w-full bg-white border border-slate-300 rounded p-2 text-xs focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="PART_MECHANICAL">机械零件 (PART_MECHANICAL)</option>
                    <option value="PART_ELECTRICAL">电气元器件 (PART_ELECTRICAL)</option>
                    <option value="DOCUMENT">工程文档 (DOCUMENT)</option>
                  </select>
                </div>
              </div>

              {/* Switches */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <span className="font-semibold text-slate-800 block mb-2.5">策略生效开关</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex items-center space-x-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <div>
                      <span className="font-medium text-slate-800 block">启用此条归一对齐规则</span>
                      <span className="text-[10px] text-slate-500">是否立即进入匹配范围</span>
                    </div>
                  </label>

                  <label className="flex items-center space-x-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIsSimilarityActive}
                      onChange={(e) => setFormIsSimilarityActive(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <div>
                      <span className="font-medium text-slate-800 block">在 Manticore 二阶段中计算相似折扣</span>
                      <span className="text-[10px] text-slate-500">对不吻合的异构系统进行折让系数修正得分</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block font-medium text-slate-700 mb-1.5">维护说明与依据备注</label>
                <textarea
                  rows={2}
                  value={formRemarks}
                  onChange={(e) => setFormRemarks(e.target.value)}
                  placeholder="提供维护背景..."
                  className="w-full bg-white border border-slate-300 rounded p-2 text-xs focus:ring-1 focus:ring-blue-500"
                />
              </div>

            </div>

            {/* Form footer */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end space-x-3">
              <button
                onClick={() => { setEditingRule(null); setIsNew(false); }}
                className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 rounded text-xs font-medium text-slate-700 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-xs font-semibold text-white shadow-xs transition-colors"
              >
                保存归一对齐策略
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
