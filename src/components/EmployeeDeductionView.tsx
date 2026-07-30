import React, { useState, useMemo } from 'react';
import { EmployeeDeductionItem } from '../types';
import {
  Users,
  Search,
  Filter,
  Download,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Calendar,
  HelpCircle
} from 'lucide-react';

interface EmployeeDeductionViewProps {
  deductions: EmployeeDeductionItem[];
}

export const EmployeeDeductionView: React.FC<EmployeeDeductionViewProps> = ({ deductions }) => {
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  const filteredItems = useMemo(() => {
    return deductions.filter((item) => {
      if (departmentFilter !== 'all' && item.department !== departmentFilter) return false;
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (searchKeyword.trim()) {
        const kw = searchKeyword.toLowerCase().trim();
        const matchName = item.empName.toLowerCase().includes(kw);
        const matchId = item.empId.toLowerCase().includes(kw);
        if (!matchName && !matchId) return false;
      }
      return true;
    });
  }, [deductions, departmentFilter, statusFilter, searchKeyword]);

  const kpis = useMemo(() => {
    const totalOverStandard = filteredItems.reduce((sum, item) => sum + item.overStandardDeduction, 0);
    const totalPrivateExpense = filteredItems.reduce((sum, item) => sum + item.personalPrivateExpense, 0);
    const totalAllowanceOffset = filteredItems.reduce((sum, item) => sum + item.allowanceOffset, 0);
    const totalNetDeduction = filteredItems.reduce((sum, item) => sum + item.netDeduction, 0);

    return { totalOverStandard, totalPrivateExpense, totalAllowanceOffset, totalNetDeduction };
  }, [filteredItems]);

  const handleExport = () => {
    const headers = ['工号', '姓名', '部门', '总出差消费(元)', '公司支付(元)', '超标个人承担(元)', '私享消费抵扣(元)', '津贴抵扣金额(元)', '期末实际扣款(元)', '扣款状态', '结算月份'];
    const rows = filteredItems.map((item) => [
      item.empId,
      item.empName,
      item.department,
      item.totalExpense.toFixed(2),
      item.companyPaid.toFixed(2),
      item.overStandardDeduction.toFixed(2),
      item.personalPrivateExpense.toFixed(2),
      item.allowanceOffset.toFixed(2),
      item.netDeduction.toFixed(2),
      item.status,
      item.month
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `员工承担与抵扣明细_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Filter */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Users className="w-5 h-5 text-emerald-600" />
              <span>员工承担与抵扣管理</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              按月度统计员工超标个人承担、私享行程支付、出差津贴抵扣及薪资扣款执行状态。
            </p>
          </div>

          <button
            onClick={handleExport}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-semibold transition-colors shadow-sm self-start md:self-auto"
          >
            <Download className="w-4 h-4" />
            <span>导出员工抵扣表</span>
          </button>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">所属部门</label>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            >
              <option value="all">全部部门</option>
              <option value="技术研发部">技术研发部</option>
              <option value="华东销售部">华东销售部</option>
              <option value="品牌营销部">品牌营销部</option>
              <option value="智能制造部">智能制造部</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">扣款状态</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            >
              <option value="all">全部状态</option>
              <option value="已扣款">已扣款</option>
              <option value="待结算">待结算</option>
              <option value="申诉中">申诉中</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">搜索员工</label>
            <div className="relative">
              <input
                type="text"
                placeholder="搜索员工姓名或工号..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl pl-3 pr-8 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
              {searchKeyword && (
                <button onClick={() => setSearchKeyword('')} className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600">
                  ×
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Key Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4.5 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/20 to-white shadow-sm">
          <span className="text-xs font-bold text-amber-800 block mb-1">超标个人承担总额</span>
          <div className="font-mono text-xl font-bold text-amber-700">
            ¥{kpis.totalOverStandard.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-amber-600 mt-1">因舱位/酒店标高产生自付</p>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 block mb-1">私享行程挂账抵扣</span>
          <div className="font-mono text-xl font-bold text-slate-800">
            ¥{kpis.totalPrivateExpense.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">因私延长行程个人付款</p>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/20 to-white shadow-sm">
          <span className="text-xs font-bold text-emerald-800 block mb-1">出差津贴抵扣抵消</span>
          <div className="font-mono text-xl font-bold text-emerald-700">
            ¥{kpis.totalAllowanceOffset.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-emerald-600 mt-1">用未领津贴直接抵扣差价</p>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/20 to-white shadow-sm">
          <span className="text-xs font-bold text-blue-800 block mb-1">期末实际薪资扣款</span>
          <div className="font-mono text-xl font-bold text-blue-700">
            ¥{kpis.totalNetDeduction.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-blue-600 mt-1">计算公式: 超标 + 私享 - 津贴抵扣</p>
        </div>
      </div>

      {/* 3. Deductions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
            <Users className="w-4 h-4 text-emerald-600" />
            <span>员工个人抵扣明细表</span>
          </h3>
          <span className="text-xs text-slate-500 font-mono">共 {filteredItems.length} 人次记录</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <th className="p-3 pl-5">员工 / 工号</th>
                <th className="p-3">部门</th>
                <th className="p-3 text-right">总出差消费</th>
                <th className="p-3 text-right">公司支付</th>
                <th className="p-3 text-right">超标自付</th>
                <th className="p-3 text-right">私享消费</th>
                <th className="p-3 text-right">津贴抵扣</th>
                <th className="p-3 text-right">实际扣款</th>
                <th className="p-3 text-center pr-5">状态</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3 pl-5">
                    <div className="font-bold text-slate-800">{item.empName}</div>
                    <div className="font-mono text-[11px] text-slate-400">{item.empId}</div>
                  </td>

                  <td className="p-3 text-slate-700 font-medium">
                    {item.department}
                  </td>

                  <td className="p-3 text-right font-mono font-semibold text-slate-800">
                    ¥{item.totalExpense.toFixed(2)}
                  </td>

                  <td className="p-3 text-right font-mono font-semibold text-emerald-700">
                    ¥{item.companyPaid.toFixed(2)}
                  </td>

                  <td className="p-3 text-right font-mono text-amber-700 font-semibold">
                    ¥{item.overStandardDeduction.toFixed(2)}
                  </td>

                  <td className="p-3 text-right font-mono text-slate-600">
                    ¥{item.personalPrivateExpense.toFixed(2)}
                  </td>

                  <td className="p-3 text-right font-mono text-emerald-600">
                    -¥{item.allowanceOffset.toFixed(2)}
                  </td>

                  <td className="p-3 text-right font-mono font-bold text-blue-700">
                    ¥{item.netDeduction.toFixed(2)}
                  </td>

                  <td className="p-3 text-center pr-5">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                      item.status === '已扣款'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : item.status === '待结算'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
