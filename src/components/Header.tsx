import React from 'react';
import { Database, CheckCircle, AlertTriangle, User, History, ArrowUpRight } from 'lucide-react';

interface HeaderProps {
  onNavigate: (viewId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  onNavigate
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

      {/* Center/Right: Profile and shortcuts */}
      <div className="flex items-center space-x-4">
        {/* Link shortcuts */}
        <div className="flex items-center space-x-3 text-slate-500 text-xs pl-4">
          <button 
            onClick={() => onNavigate('client-find-similar')}
            className="flex items-center space-x-1 bg-blue-50 text-blue-700 px-2.5 py-1 rounded hover:bg-blue-100 font-semibold transition-colors font-sans"
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
            <span className="text-[10px] text-slate-500 leading-none font-sans">数据标准管理员</span>
          </div>
        </div>
      </div>
    </header>
  );
};
