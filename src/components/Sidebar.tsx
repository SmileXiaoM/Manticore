import React from 'react';
import { 
  Sliders, 
  FileText, 
  BookOpen, 
  Search, 
  Eye, 
  ShieldAlert,
  History,
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
        <ShieldAlert className="w-4 h-4 text-amber-500" />
        <span className="text-xs font-semibold tracking-wider text-slate-200">PLM Manticore 评审版</span>
        <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30 font-mono ml-auto">UCD</span>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        
        {/* Section 1: 相似度配置 */}
        <div>
          <span className="px-3 text-[10px] uppercase tracking-wider text-slate-500 font-bold block mb-2">二阶段：相似度配置</span>
          <div className="space-y-1">
            <button
              onClick={() => onNavigate('field-rules')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded text-xs font-medium transition-colors text-left ${
                currentView === 'field-rules'
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>字段相似度规则</span>
              {currentView === 'field-rules' && <span className="w-1.5 h-1.5 rounded-full bg-white ml-auto"></span>}
            </button>

            <button
              onClick={() => onNavigate('data-processing')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded text-xs font-medium transition-colors text-left ${
                currentView === 'data-processing'
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>数据处理规则</span>
              {currentView === 'data-processing' && <span className="w-1.5 h-1.5 rounded-full bg-white ml-auto"></span>}
            </button>
          </div>
        </div>

        {/* Section 2: 三化决策 */}
        <div>
          <span className="px-3 text-[10px] uppercase tracking-wider text-slate-500 font-bold block mb-2">三阶段：三化决策</span>
          <div className="space-y-1">
            <button
              onClick={() => onNavigate('decision-rules')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded text-xs font-medium transition-colors text-left ${
                currentView === 'decision-rules'
                  ? 'bg-amber-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>三化决策规则</span>
              {currentView === 'decision-rules' && <span className="w-1.5 h-1.5 rounded-full bg-white ml-auto"></span>}
            </button>
          </div>
        </div>

        {/* Section 3: 验证与应用 */}
        <div>
          <span className="px-3 text-[10px] uppercase tracking-wider text-slate-500 font-bold block mb-2">验证与应用</span>
          <div className="space-y-1">
            <button
              onClick={() => onNavigate('query-preview')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-md text-sm font-medium transition-colors text-left ${
                currentView === 'query-preview'
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'hover:bg-slate-800/50 text-slate-300 hover:text-white'
              }`}
            >
              <Search className="w-4 h-4 text-emerald-400" />
              <span>相似度查询预览</span>
            </button>

            <button
              onClick={() => onNavigate('client-find-similar')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-md text-sm font-medium transition-colors text-left mt-1 ${
                currentView === 'client-find-similar'
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'hover:bg-slate-800/50 text-slate-300 hover:text-white'
              }`}
            >
              <Eye className="w-4 h-4 text-emerald-400" />
              <span>应用端查找相似件</span>
            </button>
          </div>
        </div>

        {/* Section 4: 版本与说明 */}
        <div>
          <span className="px-3 text-[10px] uppercase tracking-wider text-slate-500 font-bold block mb-2">版本与说明</span>
          <div className="space-y-1">
            <button
              onClick={() => onNavigate('publish-records')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded text-xs font-medium transition-colors text-left ${
                currentView === 'publish-records'
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>发布记录</span>
            </button>

            <button
              onClick={() => onNavigate('attribute-types')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded text-xs font-medium transition-colors text-left ${
                currentView === 'attribute-types'
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>属性类型清单 (对齐用)</span>
            </button>

            <button
              onClick={() => onNavigate('attribute-enums')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded text-xs font-medium transition-colors text-left ${
                currentView === 'attribute-enums'
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>属性枚举清单 (对齐用)</span>
            </button>
          </div>
        </div>

      </nav>

      {/* Sidebar Footer */}
      <div className="p-4 bg-slate-950/80 border-t border-slate-800/80 text-[11px] text-slate-500 space-y-1">
        <div className="font-semibold text-slate-400">UCD 评审专版 v2.5</div>
        <div>减少左侧菜单，聚焦核心场景</div>
        <div className="text-emerald-400/80">● 流程闭环已打通</div>
      </div>
    </aside>
  );
};
