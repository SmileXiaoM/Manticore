import React from 'react';
import {
  Sliders,
  FileText,
  BookOpen,
  Search,
  Eye,
  ShieldAlert,
  Grid,
  Settings
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onNavigate: (viewId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate }) => {
  return (
    <aside className="w-64 bg-slate-900 text-slate-300 border-r border-slate-800 flex flex-col shrink-0">
      {/* Platform Env tag */}
      <div className="p-4 bg-slate-950 border-b border-slate-800/80 flex items-center space-x-2">
        <ShieldAlert className="w-4 h-4 text-blue-500" />
        <span className="text-xs font-semibold tracking-wider text-slate-200">PLM Manticore 管理控制台</span>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">

        {/* Section 1: 属性相似度 */}
        <div>
          <span className="px-3 text-[10px] uppercase tracking-wider text-slate-500 font-bold block mb-2">二阶段：非 AI 属性相似度</span>
          <div className="space-y-1">
            <button
              onClick={() => onNavigate('field-rules')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded text-xs font-medium transition-colors text-left ${
                currentView === 'field-rules'
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-blue-400" />
              <span>字段相似度规则</span>
              {currentView === 'field-rules' && <span className="w-1.5 h-1.5 rounded-full bg-white ml-auto"></span>}
            </button>

            <button
              onClick={() => onNavigate('query-preview')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded text-xs font-medium transition-colors text-left ${
                currentView === 'query-preview'
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <Search className="w-3.5 h-3.5 text-emerald-400" />
              <span>相似度查询预览</span>
              {currentView === 'query-preview' && <span className="w-1.5 h-1.5 rounded-full bg-white ml-auto"></span>}
            </button>

            <button
              onClick={() => onNavigate('client-find-similar')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded text-xs font-medium transition-colors text-left ${
                currentView === 'client-find-similar'
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <Eye className="w-3.5 h-3.5 text-sky-400" />
              <span>应用端查找相似件</span>
              {currentView === 'client-find-similar' && <span className="w-1.5 h-1.5 rounded-full bg-white ml-auto"></span>}
            </button>

            <button
              onClick={() => onNavigate('publish-records')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded text-xs font-medium transition-colors text-left ${
                currentView === 'publish-records'
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-orange-400" />
              <span>变更记录</span>
              {currentView === 'publish-records' && <span className="w-1.5 h-1.5 rounded-full bg-white ml-auto"></span>}
            </button>
          </div>
        </div>

        {/* Section 2: 三阶段：数据治理与业务决策 */}
        <div>
          <span className="px-3 text-[10px] uppercase tracking-wider text-slate-500 font-bold block mb-2">三阶段：业务决策（后续阶段）</span>
          <div className="space-y-1">
            <button
              onClick={() => onNavigate('data-processing')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded text-xs font-medium transition-colors text-left ${
                currentView === 'data-processing'
                  ? 'bg-amber-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <Settings className="w-3.5 h-3.5 text-amber-400" />
              <span>数据处理规则</span>
              {currentView === 'data-processing' && <span className="w-1.5 h-1.5 rounded-full bg-white ml-auto"></span>}
            </button>

            <button
              onClick={() => onNavigate('decision-rules')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded text-xs font-medium transition-colors text-left ${
                currentView === 'decision-rules'
                  ? 'bg-amber-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
              <span>三化决策规则</span>
              {currentView === 'decision-rules' && <span className="w-1.5 h-1.5 rounded-full bg-white ml-auto"></span>}
            </button>
          </div>
        </div>

      </nav>

      {/* Sidebar Footer */}
      <div className="p-4 bg-slate-950/80 border-t border-slate-800/80 text-[11px] text-slate-500 space-y-1">
        <div className="font-semibold text-slate-400">PLM Manticore Engine</div>
        <div>属性相似度检索与物料治理平台</div>
      </div>
    </aside>
  );
};
