import React from 'react';
import { TabType } from '../types';
import { BarChart3, Receipt, Users, Building, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, onTabChange }) => {
  return (
    <header className="bg-white text-slate-900 border-b border-slate-200 shadow-xs sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 font-bold">
              <Building className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center space-x-2">
                <span>差旅费用管理看板</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                  企业级
                </span>
              </h1>
              <p className="text-xs text-slate-500">控费精细化 · 账单自动化 · 员工多维抵扣透明化</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              id="tab-summary"
              onClick={() => onTabChange('summary')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'summary'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>综合费用统计</span>
            </button>

            <button
              id="tab-reconciliation"
              onClick={() => onTabChange('reconciliation')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'reconciliation'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>携程对账</span>
            </button>

            <button
              id="tab-deduction"
              onClick={() => onTabChange('deduction')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'deduction'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>员工承担与抵扣</span>
            </button>
          </nav>

          {/* Right Status / User */}
          <div className="flex items-center space-x-3 text-xs text-slate-600">
            <div className="hidden md:flex items-center space-x-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-slate-600 font-medium">数据源: 财务ERP与携程API同步</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
