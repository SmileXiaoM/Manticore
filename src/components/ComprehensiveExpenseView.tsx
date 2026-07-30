import React, { useState, useMemo } from 'react';
import {
  ProjectSummaryItem,
  SummaryKpiData,
  DepartmentExpenseStat,
  SummaryFilter
} from '../types';
import { ProjectDetailDrawer } from './ProjectDetailDrawer';
import {
  Search,
  RotateCcw,
  Download,
  Building2,
  Calendar,
  Filter,
  BarChart3,
  PieChart,
  FileText,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Users,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye
} from 'lucide-react';

interface ComprehensiveExpenseViewProps {
  kpiData: SummaryKpiData;
  projectList: ProjectSummaryItem[];
  departmentStats: DepartmentExpenseStat[];
}

export const ComprehensiveExpenseView: React.FC<ComprehensiveExpenseViewProps> = ({
  kpiData,
  projectList,
  departmentStats
}) => {
  // Filter States
  const [dateRange, setDateRange] = useState<string>('2026-Q2');
  const [department, setDepartment] = useState<string>('all');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // Applied Query State
  const [appliedFilter, setAppliedFilter] = useState<SummaryFilter>({
    dateRange: '2026-Q2',
    department: 'all',
    searchKeyword: ''
  });

  // Selected Project for Detail Drawer
  const [selectedProject, setSelectedProject] = useState<ProjectSummaryItem | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 5;

  // Handle Query Trigger
  const handleSearch = () => {
    setAppliedFilter({
      dateRange,
      department,
      searchKeyword
    });
    setCurrentPage(1);
  };

  // Handle Reset Trigger
  const handleReset = () => {
    setDateRange('2026-Q2');
    setDepartment('all');
    setSearchKeyword('');
    setAppliedFilter({
      dateRange: '2026-Q2',
      department: 'all',
      searchKeyword: ''
    });
    setCurrentPage(1);
  };

  // Filtered Project List
  const filteredProjects = useMemo(() => {
    return projectList.filter((item) => {
      // Department Filter
      if (appliedFilter.department !== 'all' && item.department !== appliedFilter.department) {
        return false;
      }
      // Keyword Search (Code or Name)
      if (appliedFilter.searchKeyword.trim()) {
        const kw = appliedFilter.searchKeyword.toLowerCase().trim();
        const matchCode = item.code.toLowerCase().includes(kw);
        const matchName = item.name.toLowerCase().includes(kw);
        const matchDept = item.department.toLowerCase().includes(kw);
        if (!matchCode && !matchName && !matchDept) {
          return false;
        }
      }
      return true;
    });
  }, [projectList, appliedFilter]);

  // Recalculated KPIs based on filtered projects
  const dynamicKpi = useMemo(() => {
    if (appliedFilter.department === 'all' && !appliedFilter.searchKeyword.trim()) {
      return kpiData;
    }
    const approvedSum = filteredProjects.reduce((sum, p) => sum + p.approvedExpense, 0);
    const overStandardSum = filteredProjects.reduce((sum, p) => sum + p.overStandardAmount, 0);
    const totalTripsSum = filteredProjects.reduce((sum, p) => sum + p.tripCount, 0);
    const estEmployeeDeduction = Math.round(overStandardSum * 0.85);

    return {
      totalTravelExpense: Math.round(approvedSum + estEmployeeDeduction),
      companyApprovedExpense: approvedSum,
      employeeDeductionAmount: estEmployeeDeduction,
      overStandardPendingAmount: overStandardSum,
      ctripServiceFee: Math.round(totalTripsSum * 55),
      totalTrips: totalTripsSum
    };
  }, [kpiData, filteredProjects, appliedFilter]);

  // Recalculated Department Stats
  const dynamicDeptStats = useMemo(() => {
    const deptMap: Record<string, { totalApproved: number; projectCount: number; tripCount: number; overStandardAmount: number }> = {};

    filteredProjects.forEach((p) => {
      if (!deptMap[p.department]) {
        deptMap[p.department] = { totalApproved: 0, projectCount: 0, tripCount: 0, overStandardAmount: 0 };
      }
      deptMap[p.department].totalApproved += p.approvedExpense;
      deptMap[p.department].projectCount += 1;
      deptMap[p.department].tripCount += p.tripCount;
      deptMap[p.department].overStandardAmount += p.overStandardAmount;
    });

    return Object.entries(deptMap).map(([dept, data]) => ({
      department: dept,
      ...data
    }));
  }, [filteredProjects]);

  // Paginated Projects
  const totalPages = Math.ceil(filteredProjects.length / pageSize) || 1;
  const paginatedProjects = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProjects.slice(start, start + pageSize);
  }, [filteredProjects, currentPage, pageSize]);

  // CSV Export Handler
  const handleExport = () => {
    const headers = ['项目编号', '项目名称', '所属部门', '公司认可费用(元)', '出差次数(次)', '出差人数(人)', '超标金额(元)', '出差备注'];
    const rows = filteredProjects.map((p) => [
      p.code,
      `"${p.name.replace(/"/g, '""')}"`,
      p.department,
      p.approvedExpense.toFixed(2),
      p.tripCount,
      p.travelerCount,
      p.overStandardAmount.toFixed(2),
      `"${(p.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `综合费用统计_项目费用汇总_${appliedFilter.dateRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Filter Panel */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-emerald-600" />
              <span>综合费用统计分析</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              对项目/商机费用、部门费用分布、公司认可费用与超标待确认金额进行多维度统览与审计。
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              id="export-btn-summary"
              onClick={handleExport}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-semibold transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>导出项目费用汇总</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          {/* Time Range */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>时间范围</span>
            </label>
            <select
              id="select-date-range"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            >
              <option value="2026-Q2">2026年 第二季度 (Q2)</option>
              <option value="2026-06">2026年 06月</option>
              <option value="2026-05">2026年 05月</option>
              <option value="2026-Q1">2026年 第一季度 (Q1)</option>
            </select>
          </div>

          {/* Department */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center space-x-1">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>所属部门</span>
            </label>
            <select
              id="select-department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            >
              <option value="all">全部部门 (全部)</option>
              <option value="技术研发部">技术研发部</option>
              <option value="华东销售部">华东销售部</option>
              <option value="品牌营销部">品牌营销部</option>
              <option value="智能制造部">智能制造部</option>
              <option value="人力行政部">人力行政部</option>
            </select>
          </div>

          {/* Project / Opportunity Search */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center space-x-1">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span>项目 / 商机检索</span>
            </label>
            <div className="relative">
              <input
                id="input-search-project"
                type="text"
                placeholder="搜索项目编号或名称..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl pl-3 pr-8 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
              {searchKeyword && (
                <button
                  onClick={() => setSearchKeyword('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* Search / Reset Buttons */}
          <div className="flex items-center space-x-2">
            <button
              id="btn-query"
              onClick={handleSearch}
              className="flex-1 flex items-center justify-center space-x-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-colors"
            >
              <Search className="w-3.5 h-3.5" />
              <span>查询</span>
            </button>

            <button
              id="btn-reset"
              onClick={handleReset}
              className="flex items-center justify-center space-x-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-xl border border-slate-200 transition-colors"
              title="重置筛选条件"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>重置</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Top KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Expense */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">总差旅支出</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="font-mono text-xl font-bold text-slate-900 tracking-tight">
            ¥{dynamicKpi.totalTravelExpense.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">含公司认可与员工自付部分</p>
        </div>

        {/* Company Approved Expense */}
        <div className="bg-white p-4.5 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/30 to-white shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-800">公司认可费用</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="font-mono text-xl font-bold text-emerald-700 tracking-tight">
            ¥{dynamicKpi.companyApprovedExpense.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-emerald-600/90 mt-1">企业核销并承担的最终费用</p>
        </div>

        {/* Over Standard Pending */}
        <div className="bg-white p-4.5 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/30 to-white shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-800">超标待确认金额</span>
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="font-mono text-xl font-bold text-amber-700 tracking-tight">
            ¥{dynamicKpi.overStandardPendingAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-amber-600/90 mt-1">需要部门经理二次复核</p>
        </div>

        {/* Employee Deduction Amount */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">员工承担费用</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="font-mono text-xl font-bold text-slate-900 tracking-tight">
            ¥{dynamicKpi.employeeDeductionAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">超标自付与私享抵扣部分</p>
        </div>

        {/* Total Trips */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">出差总次数</span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="font-mono text-xl font-bold text-slate-900 tracking-tight">
            {dynamicKpi.totalTrips} <span className="text-xs text-slate-500 font-normal">次</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">携程与线下行程统计</p>
        </div>
      </div>

      {/* 3. Department Analytics Section */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
            <PieChart className="w-4 h-4 text-emerald-600" />
            <span>部门费用分布与差旅频次</span>
          </h3>
          <span className="text-[11px] text-slate-400">维度：部门归属</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
          {dynamicDeptStats.map((stat, idx) => {
            const pct = dynamicKpi.companyApprovedExpense > 0
              ? ((stat.totalApproved / dynamicKpi.companyApprovedExpense) * 100).toFixed(1)
              : '0.0';
            return (
              <div key={idx} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-800 text-xs">{stat.department}</span>
                  <span className="font-mono text-[10px] bg-slate-200/70 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                    {stat.projectCount} 项目
                  </span>
                </div>

                <div>
                  <div className="font-mono text-sm font-bold text-emerald-700">
                    ¥{stat.totalApproved.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500 mt-0.5">
                    <span>认可费用占比</span>
                    <span className="font-mono font-medium">{pct}%</span>
                  </div>
                </div>

                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                </div>

                <div className="flex justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                  <span>出差: <strong className="font-mono text-slate-700">{stat.tripCount}次</strong></span>
                  {stat.overStandardAmount > 0 && (
                    <span className="text-amber-700 font-medium">超标: ¥{stat.overStandardAmount.toLocaleString()}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Project / Opportunity Expense Summary Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Header / Title */}
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-emerald-600" />
              <span>项目 / 商机费用汇总</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              展示各项目/商机的出差频次、公司认可费用及超标待确认金额。点击“查看详情”进一步调阅费用构成。
            </p>
          </div>
          <div className="text-xs text-slate-500 font-mono bg-white px-3 py-1 rounded-lg border border-slate-200 self-start sm:self-auto">
            共 <strong className="text-slate-800">{filteredProjects.length}</strong> 项记录
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                <th className="p-3.5 pl-5 min-w-[240px]">项目 / 商机</th>
                <th className="p-3.5 w-36">部门</th>
                <th className="p-3.5 w-40 text-right">公司认可费用</th>
                <th className="p-3.5 w-28 text-right">出差次数</th>
                <th className="p-3.5 w-32 text-right">超标金额</th>
                <th className="p-3.5 w-28 text-center pr-5">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedProjects.length > 0 ? (
                paginatedProjects.map((project) => (
                  <tr key={project.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* 项目/商机 */}
                    <td className="p-3.5 pl-5">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800 text-xs hover:text-emerald-700 transition-colors">
                          {project.name}
                        </span>
                        <span className="font-mono text-[11px] text-slate-400 mt-0.5">
                          {project.code}
                        </span>
                      </div>
                    </td>

                    {/* 部门 */}
                    <td className="p-3.5">
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        {project.department}
                      </span>
                    </td>

                    {/* 公司认可费用 */}
                    <td className="p-3.5 text-right font-mono text-sm font-bold text-emerald-700">
                      ¥{project.approvedExpense.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                    </td>

                    {/* 出差次数 */}
                    <td className="p-3.5 text-right font-mono text-slate-800 font-semibold">
                      {project.tripCount} <span className="text-slate-400 font-normal">次</span>
                    </td>

                    {/* 超标金额 */}
                    <td className="p-3.5 text-right font-mono">
                      {project.overStandardAmount > 0 ? (
                        <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          ¥{project.overStandardAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">¥0.00</span>
                      )}
                    </td>

                    {/* 操作 */}
                    <td className="p-3.5 text-center pr-5">
                      <button
                        id={`btn-view-detail-${project.id}`}
                        onClick={() => setSelectedProject(project)}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs rounded-lg border border-emerald-200 transition-colors shadow-2xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>查看详情</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    <AlertCircle className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                    未搜索到符合条件的项目/商机记录
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer / Pagination */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
          <div>
            显示第 <strong className="text-slate-800">{filteredProjects.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</strong> 至{' '}
            <strong className="text-slate-800">{Math.min(currentPage * pageSize, filteredProjects.length)}</strong> 项，共{' '}
            <strong className="text-slate-800">{filteredProjects.length}</strong> 项记录
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-xs px-2">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Project Detail Drawer */}
      <ProjectDetailDrawer
        project={selectedProject}
        onClose={() => setSelectedProject(null)}
      />
    </div>
  );
};
