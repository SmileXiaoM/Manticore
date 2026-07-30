import React, { useState } from 'react';
import { TabType } from './types';
import { Header } from './components/Header';
import { ComprehensiveExpenseView } from './components/ComprehensiveExpenseView';
import { CtripReconciliationView } from './components/CtripReconciliationView';
import { EmployeeDeductionView } from './components/EmployeeDeductionView';

import {
  initialSummaryKpi,
  initialProjectSummaries,
  initialDepartmentStats,
  initialCtripReconciliations,
  initialEmployeeDeductions
} from './data';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('summary');

  return (
    <div className="min-h-screen bg-slate-100/70 font-sans text-slate-800 antialiased flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Global Top Navigation Header */}
      <Header activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'summary' && (
          <ComprehensiveExpenseView
            kpiData={initialSummaryKpi}
            projectList={initialProjectSummaries}
            departmentStats={initialDepartmentStats}
          />
        )}

        {activeTab === 'reconciliation' && (
          <CtripReconciliationView
            reconciliations={initialCtripReconciliations}
          />
        )}

        {activeTab === 'deduction' && (
          <EmployeeDeductionView
            deductions={initialEmployeeDeductions}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-4 text-center text-xs text-slate-400 shrink-0 mt-8">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>差旅费用管理看板 &copy; 2026 企业财务控费与差旅审计系统</span>
          <span className="font-mono text-[11px] text-slate-400">系统版本: v2.4.0 · 接口数据已实时加签校验</span>
        </div>
      </footer>
    </div>
  );
}
