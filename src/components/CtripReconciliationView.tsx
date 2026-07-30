import React, { useState, useMemo } from 'react';
import { CtripReconciliationItem } from '../types';
import {
  Receipt,
  Search,
  Filter,
  Download,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Eye,
  X,
  FileText,
  DollarSign
} from 'lucide-react';

interface CtripReconciliationViewProps {
  reconciliations: CtripReconciliationItem[];
}

export const CtripReconciliationView: React.FC<CtripReconciliationViewProps> = ({ reconciliations }) => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [selectedDiffItem, setSelectedDiffItem] = useState<CtripReconciliationItem | null>(null);

  const filteredItems = useMemo(() => {
    return reconciliations.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (typeFilter !== 'all' && item.type !== typeFilter) return false;
      if (searchKeyword.trim()) {
        const kw = searchKeyword.toLowerCase().trim();
        const matchOrder = item.orderNo.toLowerCase().includes(kw);
        const matchTraveler = item.traveler.toLowerCase().includes(kw);
        const matchProject = item.projectName.toLowerCase().includes(kw) || item.projectCode.toLowerCase().includes(kw);
        if (!matchOrder && !matchTraveler && !matchProject) return false;
      }
      return true;
    });
  }, [reconciliations, statusFilter, typeFilter, searchKeyword]);

  const kpis = useMemo(() => {
    const totalBill = filteredItems.reduce((sum, item) => sum + item.orderAmount, 0);
    const approvedTotal = filteredItems.reduce((sum, item) => sum + item.approvedAmount, 0);
    const diffTotal = filteredItems.reduce((sum, item) => sum + item.diffAmount, 0);
    const serviceFeeTotal = filteredItems.reduce((sum, item) => sum + item.serviceFee, 0);

    return { totalBill, approvedTotal, diffTotal, serviceFeeTotal };
  }, [filteredItems]);

  const handleExport = () => {
    const headers = ['携程订单号', '出行人', '部门', '项目/商机编号', '项目/商机名称', '消费类型', '账单金额(元)', '公司认可(元)', '差异金额(元)', '携程服务费(元)', '对账状态', '差异原因'];
    const rows = filteredItems.map((item) => [
      item.orderNo,
      item.traveler,
      item.department,
      item.projectCode,
      `"${item.projectName.replace(/"/g, '""')}"`,
      item.type,
      item.orderAmount.toFixed(2),
      item.approvedAmount.toFixed(2),
      item.diffAmount.toFixed(2),
      item.serviceFee.toFixed(2),
      item.status,
      `"${item.diffReason.replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `携程对账单明细_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* 1. Page Header & Filter Controls */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Receipt className="w-5 h-5 text-emerald-600" />
              <span>携程企业大客户对账中心</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              自动比对携程企业账单与公司差旅标准，核对认可金额、个人超扣与月度企业服务费。
            </p>
          </div>

          <button
            onClick={handleExport}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-semibold transition-colors shadow-sm self-start md:self-auto"
          >
            <Download className="w-4 h-4" />
            <span>导出携程对账单</span>
          </button>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">对账状态</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            >
              <option value="all">全部对账状态</option>
              <option value="完全匹配">完全匹配</option>
              <option value="标准超扣">标准超扣</option>
              <option value="待确认">待确认</option>
              <option value="手工调整">手工调整</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">消费类型</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            >
              <option value="all">全部类型</option>
              <option value="机票">机票</option>
              <option value="酒店">酒店</option>
              <option value="火车票">火车票</option>
              <option value="用车">用车</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">搜索关键词</label>
            <div className="relative">
              <input
                type="text"
                placeholder="搜索携程订单号、出行人或项目名称..."
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

      {/* 2. Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 block mb-1">携程账单总金额</span>
          <div className="font-mono text-xl font-bold text-slate-900">
            ¥{kpis.totalBill.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">企业大客户挂账应付金额</p>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/20 to-white shadow-sm">
          <span className="text-xs font-bold text-emerald-800 block mb-1">公司认可核销金额</span>
          <div className="font-mono text-xl font-bold text-emerald-700">
            ¥{kpis.approvedTotal.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-emerald-600 mt-1">进入公司报销成本库</p>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/20 to-white shadow-sm">
          <span className="text-xs font-bold text-amber-800 block mb-1">标准超扣 / 待确认差异</span>
          <div className="font-mono text-xl font-bold text-amber-700">
            ¥{kpis.diffTotal.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-amber-600 mt-1">转员工个人扣包或特批中</p>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 block mb-1">携程企业服务费</span>
          <div className="font-mono text-xl font-bold text-slate-800">
            ¥{kpis.serviceFeeTotal.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">挂账预订固定技术服务服务费</p>
        </div>
      </div>

      {/* 3. Reconciliation Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
            <Receipt className="w-4 h-4 text-emerald-600" />
            <span>携程账单对账明细</span>
          </h3>
          <span className="text-xs text-slate-500 font-mono">共 {filteredItems.length} 条账单记录</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <th className="p-3 pl-5">订单号 & 日期</th>
                <th className="p-3">出行人 / 部门</th>
                <th className="p-3">项目 / 商机</th>
                <th className="p-3">类型</th>
                <th className="p-3 text-right">账单金额</th>
                <th className="p-3 text-right">公司认可</th>
                <th className="p-3 text-right">差异金额</th>
                <th className="p-3 text-center">对账状态</th>
                <th className="p-3 text-center pr-5">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3 pl-5 font-mono">
                    <div className="font-bold text-slate-800">{item.orderNo}</div>
                    <div className="text-[11px] text-slate-400">{item.date}</div>
                  </td>

                  <td className="p-3">
                    <div className="font-semibold text-slate-800">{item.traveler}</div>
                    <div className="text-[11px] text-slate-500">{item.department}</div>
                  </td>

                  <td className="p-3">
                    <div className="text-slate-800 font-medium truncate max-w-[180px]" title={item.projectName}>
                      {item.projectName}
                    </div>
                    <div className="font-mono text-[11px] text-slate-400">{item.projectCode}</div>
                  </td>

                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium border border-slate-200">
                      {item.type}
                    </span>
                  </td>

                  <td className="p-3 text-right font-mono font-bold text-slate-800">
                    ¥{item.orderAmount.toFixed(2)}
                  </td>

                  <td className="p-3 text-right font-mono font-bold text-emerald-700">
                    ¥{item.approvedAmount.toFixed(2)}
                  </td>

                  <td className="p-3 text-right font-mono">
                    {item.diffAmount > 0 ? (
                      <span className="text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        ¥{item.diffAmount.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-slate-400">¥0.00</span>
                    )}
                  </td>

                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                      item.status === '完全匹配'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : item.status === '标准超扣'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                      {item.status}
                    </span>
                  </td>

                  <td className="p-3 text-center pr-5">
                    <button
                      onClick={() => setSelectedDiffItem(item)}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 font-medium transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>查看差异</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Difference Modal */}
      {selectedDiffItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                <Receipt className="w-4 h-4 text-emerald-600" />
                <span>携程对账差异详情</span>
              </h3>
              <button onClick={() => setSelectedDiffItem(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">携程订单号:</span>
                  <span className="font-mono font-bold text-slate-800">{selectedDiffItem.orderNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">出行人 / 部门:</span>
                  <span className="font-medium text-slate-800">{selectedDiffItem.traveler} ({selectedDiffItem.department})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">关联项目:</span>
                  <span className="font-medium text-slate-800">{selectedDiffItem.projectName}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">账单原价</span>
                  <span className="font-mono font-bold text-slate-800">¥{selectedDiffItem.orderAmount.toFixed(2)}</span>
                </div>
                <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200">
                  <span className="text-emerald-600 block text-[10px]">公司认可</span>
                  <span className="font-mono font-bold text-emerald-700">¥{selectedDiffItem.approvedAmount.toFixed(2)}</span>
                </div>
                <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200">
                  <span className="text-amber-600 block text-[10px]">差异扣款</span>
                  <span className="font-mono font-bold text-amber-700">¥{selectedDiffItem.diffAmount.toFixed(2)}</span>
                </div>
              </div>

              <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200/80 text-amber-900 leading-relaxed">
                <span className="font-bold block mb-1">差异原因说明:</span>
                <p className="text-[11px] text-amber-800">{selectedDiffItem.diffReason}</p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedDiffItem(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-medium"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
