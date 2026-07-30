import React from 'react';
import { ProjectSummaryItem } from '../types';
import { X, Building2, Plane, Hotel, Train, Car, Coins, FileText, CheckCircle2, UserCheck, AlertTriangle } from 'lucide-react';

interface ProjectDetailDrawerProps {
  project: ProjectSummaryItem | null;
  onClose: () => void;
}

export const ProjectDetailDrawer: React.FC<ProjectDetailDrawerProps> = ({ project, onClose }) => {
  if (!project) return null;

  const { flight, hotel, train, localTaxi, allowance } = project.expenseComposition;
  const totalComp = flight + hotel + train + localTaxi + allowance;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-sm flex justify-end transition-opacity animate-in fade-in">
      <div className="w-full max-w-xl bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col overflow-hidden">
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 font-bold shrink-0">
              <Building2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs font-bold text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded">
                  {project.code}
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium border border-blue-200">
                  {project.department}
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-900 mt-0.5">
                {project.name}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            title="关闭抽屉"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body - Scrollable */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-xs text-slate-700">
          {/* Key Indicators Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-100">
              <span className="text-slate-500 block mb-1">公司认可费用</span>
              <span className="font-mono text-base font-bold text-emerald-700 block">
                ¥{project.approvedExpense.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-100">
              <span className="text-slate-500 block mb-1">出差次数 / 人数</span>
              <div className="flex items-baseline space-x-1">
                <span className="font-mono text-base font-bold text-blue-700">{project.tripCount}</span>
                <span className="text-slate-500">次 /</span>
                <span className="font-mono text-sm font-semibold text-blue-600">{project.travelerCount}</span>
                <span className="text-slate-500">人</span>
              </div>
            </div>

            <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-100">
              <span className="text-slate-500 block mb-1">超标金额</span>
              <span className="font-mono text-base font-bold text-amber-700 block">
                ¥{project.overStandardAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Expense Composition */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
            <h3 className="font-bold text-slate-800 text-xs flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>项目费用类型构成</span>
              </span>
              <span className="font-mono text-slate-500 font-normal">
                合计: ¥{totalComp.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
              </span>
            </h3>

            {/* Breakdown Items */}
            <div className="space-y-2.5 pt-1">
              {/* Flight */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="flex items-center space-x-1.5 text-slate-700">
                    <Plane className="w-3.5 h-3.5 text-blue-500" />
                    <span>机票费用</span>
                  </span>
                  <span className="font-mono font-semibold text-slate-800">
                    ¥{flight.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                    <span className="text-slate-400 font-normal ml-1">
                      ({totalComp > 0 ? ((flight / totalComp) * 100).toFixed(1) : 0}%)
                    </span>
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-500 h-full rounded-full transition-all"
                    style={{ width: `${totalComp > 0 ? (flight / totalComp) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Hotel */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="flex items-center space-x-1.5 text-slate-700">
                    <Hotel className="w-3.5 h-3.5 text-indigo-500" />
                    <span>酒店住宿</span>
                  </span>
                  <span className="font-mono font-semibold text-slate-800">
                    ¥{hotel.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                    <span className="text-slate-400 font-normal ml-1">
                      ({totalComp > 0 ? ((hotel / totalComp) * 100).toFixed(1) : 0}%)
                    </span>
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full rounded-full transition-all"
                    style={{ width: `${totalComp > 0 ? (hotel / totalComp) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Train */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="flex items-center space-x-1.5 text-slate-700">
                    <Train className="w-3.5 h-3.5 text-emerald-500" />
                    <span>火车票</span>
                  </span>
                  <span className="font-mono font-semibold text-slate-800">
                    ¥{train.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                    <span className="text-slate-400 font-normal ml-1">
                      ({totalComp > 0 ? ((train / totalComp) * 100).toFixed(1) : 0}%)
                    </span>
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all"
                    style={{ width: `${totalComp > 0 ? (train / totalComp) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Local Taxi */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="flex items-center space-x-1.5 text-slate-700">
                    <Car className="w-3.5 h-3.5 text-amber-500" />
                    <span>市内交通</span>
                  </span>
                  <span className="font-mono font-semibold text-slate-800">
                    ¥{localTaxi.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                    <span className="text-slate-400 font-normal ml-1">
                      ({totalComp > 0 ? ((localTaxi / totalComp) * 100).toFixed(1) : 0}%)
                    </span>
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all"
                    style={{ width: `${totalComp > 0 ? (localTaxi / totalComp) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Allowance */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="flex items-center space-x-1.5 text-slate-700">
                    <Coins className="w-3.5 h-3.5 text-purple-500" />
                    <span>出差津贴</span>
                  </span>
                  <span className="font-mono font-semibold text-slate-800">
                    ¥{allowance.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                    <span className="text-slate-400 font-normal ml-1">
                      ({totalComp > 0 ? ((allowance / totalComp) * 100).toFixed(1) : 0}%)
                    </span>
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-purple-500 h-full rounded-full transition-all"
                    style={{ width: `${totalComp > 0 ? (allowance / totalComp) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Project Notes & Business Standard */}
          <div className="space-y-3">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-600">
              <span className="font-bold text-slate-800 block mb-1 flex items-center space-x-1">
                <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>项目差旅备注:</span>
              </span>
              <p className="text-slate-700 leading-relaxed">{project.notes}</p>
            </div>

            <div className="p-3 bg-emerald-50/70 rounded-lg border border-emerald-200/80 text-emerald-900 leading-relaxed">
              <span className="font-bold text-emerald-800 block mb-1 flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>公司认可费用业务口径说明:</span>
              </span>
              <p className="text-[11px] text-emerald-800/90">
                “公司认可费用”为符合集团差旅管理规定、通过出差申请与预算核准且最终进入财务报销核销的费用总额。机票、酒店和火车票统一通过企业携程通道统缴结算。
              </p>
            </div>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-medium text-xs rounded-lg transition-colors"
          >
            关闭窗口
          </button>
        </div>
      </div>
    </div>
  );
};
