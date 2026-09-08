import React from 'react';
import { Database, CheckCircle, AlertTriangle, User, History, ArrowUpRight } from 'lucide-react';

interface HeaderProps {
  onNavigate: (viewId: string) => void;
  currentView?: string;
}

export const Header: React.FC<HeaderProps> = ({
  onNavigate,
  currentView = 'field-rules'
}) => {
  const getStageBadge = () => {
    if (currentView === 'dashboard') return '运行看板';
    if (
      currentView === 'data-sync-quality' || currentView === 'source-ingestion-logs' || currentView === 'target-presence' ||
      currentView === 'stage1-mapping-config' ||
      currentView === 'data-consistency-check'
    ) {
      return '一阶段检索底座';
    }
    if (currentView === 'data-processing' || currentView === 'decision-rules') {
      return '三阶段业务决策';
    }
    return '二阶段非 AI 属性相似度';
  };

  return (
    <header className="h-14 bg-[var(--ty-fill-white-color)] border-b border-[var(--ty-border-color)] flex items-center justify-between px-6 shrink-0 z-10 sticky top-0">
      {/* Left: Brand logo & Context */}
      <div className="flex items-center space-x-3">
        <div className="bg-[var(--ty-primary-color)] text-[var(--ty-font-white-color)] p-1.5 rounded-ty-sm flex items-center justify-center">
          <Database className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-[var(--ty-font-main-color)] text-sm tracking-tight">PLM / Manticore</span>
            <span className="text-xs bg-[var(--ty-fill-weak-dark-color)] text-[var(--ty-font-sub-color)] px-1.5 py-0.5 rounded-ty-xs font-mono font-medium">{getStageBadge()}</span>
          </div>
          <span className="text-xs text-[var(--ty-font-sub-color)] leading-none mt-0.5">企业级物料去重与多维搜索管理台</span>
        </div>
      </div>

      {/* Center/Right: Profile and shortcuts */}
      <div className="flex items-center space-x-4">
        {/* Link shortcuts */}
        <div className="flex items-center space-x-3 text-[var(--ty-font-sub-color)] text-xs pl-4">
          <button
            onClick={() => onNavigate('client-find-similar')}
            className="flex items-center space-x-1 bg-[var(--ty-primary-color)] text-[var(--ty-font-white-color)] px-2.5 py-1 rounded-ty-sm hover:bg-[var(--ty-primary-hover-color)] font-semibold transition-colors cursor-pointer"
          >
            <span>应用端界面</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* User profile */}
        <div className="flex items-center space-x-2 border-l border-[var(--ty-border-color)] pl-4">
          <div className="w-7 h-7 bg-[var(--ty-fill-weak-dark-color)] rounded-full flex items-center justify-center text-[var(--ty-font-sub-color)] font-semibold text-ty-xs border border-[var(--ty-border-color)]">
            <User className="w-4 h-4 text-[var(--ty-icon-color)]" />
          </div>
          <div className="hidden md:flex flex-col">
            <span className="text-ty-xs font-medium text-[var(--ty-font-main-color)]">李晓华</span>
            <span className="text-ty-2xs text-[var(--ty-font-sub-color)] leading-none">数据标准管理员</span>
          </div>
        </div>
      </div>
    </header>
  );
};
