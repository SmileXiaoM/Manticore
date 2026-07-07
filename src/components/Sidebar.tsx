import React, { useState } from 'react';
import { 
  Sliders, 
  Settings, 
  FileText, 
  BookOpen, 
  GitMerge, 
  History, 
  Search, 
  Eye, 
  Cpu, 
  ChevronDown, 
  ChevronRight,
  Database,
  Grid
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onNavigate: (viewId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate }) => {
  // Always expand "相似度配置" by default, as specified
  const [configExpanded, setConfigExpanded] = useState(true);

  // Determine if a view is part of the config submenu
  const isConfigSubView = [
    'field-rules', 
    'standardization-rules', 
    'synonym-rules', 
    'alignment-rules',
    'publish-records'
  ].includes(currentView);

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 border-r border-slate-800 flex flex-col shrink-0">
      {/* Platform Env tag */}
      <div className="p-4 bg-slate-950 border-b border-slate-800/80 flex items-center space-x-2">
        <Cpu className="w-4 h-4 text-blue-400" />
        <span className="text-xs font-mono tracking-wider text-slate-400 uppercase">Manticore admin_env</span>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
        
        {/* Core Submenu trigger */}
        <div>
          <button
            onClick={() => setConfigExpanded(!configExpanded)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
              isConfigSubView 
                ? 'bg-slate-800/40 text-white' 
                : 'hover:bg-slate-800/50 hover:text-white'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <Sliders className="w-4 h-4 text-blue-400" />
              <span>相似度配置</span>
            </div>
            {configExpanded ? (
              <ChevronDown className="w-4 h-4 text-slate-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-500" />
            )}
          </button>

          {/* Submenu Children */}
          {configExpanded && (
            <div className="mt-1 ml-4 pl-3 border-l border-slate-800 space-y-1">
              <button
                onClick={() => onNavigate('field-rules')}
                className={`w-full flex items-center space-x-2 px-3 py-2 rounded text-xs font-medium transition-colors text-left ${
                  currentView === 'field-rules'
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <span>字段相似度规则</span>
                {currentView === 'field-rules' && <span className="w-1.5 h-1.5 rounded-full bg-white ml-auto"></span>}
              </button>

              <button
                onClick={() => onNavigate('standardization-rules')}
                className={`w-full flex items-center space-x-2 px-3 py-2 rounded text-xs font-medium transition-colors text-left ${
                  currentView === 'standardization-rules'
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <span>标准化规则</span>
                {currentView === 'standardization-rules' && <span className="w-1.5 h-1.5 rounded-full bg-white ml-auto"></span>}
              </button>

              <button
                onClick={() => onNavigate('synonym-rules')}
                className={`w-full flex items-center space-x-2 px-3 py-2 rounded text-xs font-medium transition-colors text-left ${
                  currentView === 'synonym-rules'
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <span>同义词规则</span>
                {currentView === 'synonym-rules' && <span className="w-1.5 h-1.5 rounded-full bg-white ml-auto"></span>}
              </button>

              <button
                onClick={() => onNavigate('alignment-rules')}
                className={`w-full flex items-center space-x-2 px-3 py-2 rounded text-xs font-medium transition-colors text-left ${
                  currentView === 'alignment-rules'
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <span>分类 / 类型归一</span>
                {currentView === 'alignment-rules' && <span className="w-1.5 h-1.5 rounded-full bg-white ml-auto"></span>}
              </button>

              <button
                onClick={() => onNavigate('publish-records')}
                className={`w-full flex items-center space-x-2 px-3 py-2 rounded text-xs font-medium transition-colors text-left ${
                  currentView === 'publish-records'
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <span>发布记录</span>
                {currentView === 'publish-records' && <span className="w-1.5 h-1.5 rounded-full bg-white ml-auto"></span>}
              </button>
            </div>
          )}
        </div>

        {/* Query & Test section */}
        <div className="pt-2 border-t border-slate-800/80">
          <span className="px-3 text-[10px] uppercase tracking-wider text-slate-500 font-bold block mb-1">调试与验证</span>
          <button
            onClick={() => onNavigate('query-preview')}
            className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
              currentView === 'query-preview'
                ? 'bg-blue-600 text-white font-semibold'
                : 'hover:bg-slate-800/50 text-slate-300 hover:text-white'
            }`}
          >
            <Search className="w-4 h-4 text-emerald-400" />
            <span>相似度查询预览</span>
          </button>
        </div>

        {/* Data dictionary schemas (Non-shell explanation lists) */}
        <div className="pt-2 border-t border-slate-800/80">
          <span className="px-3 text-[10px] uppercase tracking-wider text-slate-500 font-bold block mb-1">数据字典与规范 (说明页)</span>
          <button
            onClick={() => onNavigate('attribute-types')}
            className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded text-xs font-medium transition-colors ${
              currentView === 'attribute-types'
                ? 'bg-amber-600/20 text-amber-300 border border-amber-600/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>属性对应类型清单</span>
          </button>

          <button
            onClick={() => onNavigate('attribute-enums')}
            className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded text-xs font-medium transition-colors mt-1 ${
              currentView === 'attribute-enums'
                ? 'bg-amber-600/20 text-amber-300 border border-amber-600/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>属性对应枚举清单</span>
          </button>
        </div>

        {/* Client End Simulation */}
        <div className="pt-2 border-t border-slate-800/80">
          <span className="px-3 text-[10px] uppercase tracking-wider text-slate-500 font-bold block mb-1">应用层 (生产环境)</span>
          <button
            onClick={() => onNavigate('client-find-similar')}
            className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
              currentView === 'client-find-similar'
                ? 'bg-emerald-600 text-white font-semibold'
                : 'hover:bg-slate-800/50 text-slate-300 hover:text-white'
            }`}
          >
            <Eye className="w-4 h-4 text-emerald-400" />
            <span>应用端查找相似件</span>
          </button>
        </div>

      </nav>

      {/* Sidebar Footer with system parameters */}
      <div className="p-4 bg-slate-950/80 border-t border-slate-800/80 text-[11px] text-slate-500 font-mono space-y-1">
        <div>Manticore DB: v2.4.19</div>
        <div>Elastic Nodes: 3 Active</div>
        <div>Weight total: 100% (Balanced)</div>
        <div className="text-emerald-400/80">● Cluster synchronized</div>
      </div>
    </aside>
  );
};
