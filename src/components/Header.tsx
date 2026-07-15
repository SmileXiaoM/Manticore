import React from 'react';
import { Database, CheckCircle, AlertTriangle, User, History, ArrowUpRight } from 'lucide-react';

interface HeaderProps {
  onNavigate: (viewId: string) => void;
  activeVersion: string;
  hasUnpublishedDrafts: boolean;
  lastDraftEditTime: string;
}

export const Header: React.FC<HeaderProps> = ({ 
  onNavigate, 
  activeVersion, 
  hasUnpublishedDrafts, 
  lastDraftEditTime 
}) => {
  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10 sticky top-0">
      {/* Left: Brand logo & Context */}
      <div className="flex items-center space-x-3">
        <div className="bg-blue-600 text-white p-1.5 rounded-md flex items-center justify-center">
          <Database className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-900 text-sm tracking-tight">PLM / Manticore</span>
            <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono font-medium">二阶段相似度引擎</span>
          </div>
          <span className="text-[11px] text-slate-500 leading-none">企业级物料去重与多维搜索管理台</span>
        </div>
      </div>

      {/* Center/Right: Engine Status Badges & Info */}
      <div className="flex items-center space-x-4">
        {/* Active Release Status */}
        <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded text-xs">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
          <span className="text-slate-500">已发布规则版本:</span>
          <span className="font-mono font-semibold text-slate-800">{activeVersion}</span>
        </div>

        {/* Draft Notice */}
        {hasUnpublishedDrafts && (
          <div className="flex items-center space-x-2 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded text-xs animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-amber-700">有草稿未发布</span>
            <span className="text-amber-500">|</span>
            <span className="text-slate-500 font-mono text-[11px]">编辑于 {lastDraftEditTime.split(' ')[1] || lastDraftEditTime}</span>
          </div>
        )}

        {/* Link shortcuts */}
        <div className="flex items-center space-x-3 text-slate-500 text-xs border-l border-slate-200 pl-4">
          <button 
            onClick={() => onNavigate('publish-records')}
            className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
            title="查看发布历史与版本差异"
          >
            <History className="w-3.5 h-3.5" />
            <span>发布记录</span>
          </button>
          
          <button 
            onClick={() => onNavigate('client-find-similar')}
            className="flex items-center space-x-1 bg-blue-50 text-blue-700 px-2 py-1 rounded hover:bg-blue-100 transition-colors"
          >
            <span>应用端界面</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* User profile */}
        <div className="flex items-center space-x-2 border-l border-slate-200 pl-4">
          <div className="w-7 h-7 bg-slate-200 rounded-full flex items-center justify-center text-slate-700 font-semibold text-xs border border-slate-300">
            <User className="w-4 h-4 text-slate-600" />
          </div>
          <div className="hidden md:flex flex-col">
            <span className="text-xs font-medium text-slate-800">李晓华</span>
            <span className="text-[10px] text-slate-500 leading-none">数据标准管理员</span>
          </div>
        </div>
      </div>
    </header>
  );
};
