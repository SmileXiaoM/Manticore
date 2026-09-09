import React from 'react';
import {
  Sliders,
  FileText,
  BookOpen,
  Search,
  Eye,
  ShieldAlert,
  Grid,
  Settings,
  Database,
  FileSearch,
  ScrollText
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onNavigate: (viewId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate }) => {
  return (
    <aside className="w-64 bg-[var(--ty-font-main-color)] text-[var(--ty-font-placeholder-color)] border-r border-[var(--ty-fill-darkest-color)] flex flex-col shrink-0">
      {/* Platform Env tag */}
      <div className="p-4 bg-[var(--ty-font-main-color)] border-b border-[var(--ty-fill-darkest-color)] flex items-center space-x-2">
        <ShieldAlert className="w-4 h-4 text-[var(--ty-primary-color)]" />
        <span className="text-ty-xs font-semibold tracking-wider text-[var(--ty-font-white-color)]">PLM Manticore 管理控制台</span>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        <button onClick={() => onNavigate('dashboard')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-ty-sm text-ty-ss font-medium text-left ${currentView === 'dashboard' ? 'bg-[var(--ty-primary-color)] text-[var(--ty-font-white-color)]' : 'text-[var(--ty-font-placeholder-color)] hover:bg-[var(--ty-fill-darkest-color)]'}`}><Grid className="w-3.5 h-3.5" />运行看板</button>

        {/* Section 0: 一阶段：检索底座 */}
        <div>
          <span className="px-3 text-ty-2xs uppercase tracking-wider text-[var(--ty-font-sub-color)] font-bold block mb-2">一阶段：检索底座</span>
          <div className="space-y-1">
            <button
              onClick={() => onNavigate('stage1-mapping-config')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-ty-sm text-ty-ss font-medium transition-colors text-left cursor-pointer ${
                currentView === 'stage1-mapping-config'
                  ? 'bg-[var(--ty-primary-color)] text-[var(--ty-font-white-color)] font-semibold'
                  : 'text-[var(--ty-font-placeholder-color)] hover:text-[var(--ty-font-white-color)] hover:bg-[var(--ty-fill-darkest-color)]/50'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-[var(--ty-primary-hover-color)]" />
              <span>接入配置</span>
              {currentView === 'stage1-mapping-config' && <span className="w-1.5 h-1.5 rounded-full bg-[var(--ty-fill-white-color)] ml-auto"></span>}
            </button>

            <button
              onClick={() => onNavigate('source-ingestion-logs')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-ty-sm text-ty-ss font-medium transition-colors text-left cursor-pointer ${
                currentView === 'source-ingestion-logs'
                  ? 'bg-[var(--ty-primary-color)] text-[var(--ty-font-white-color)] font-semibold'
                  : 'text-[var(--ty-font-placeholder-color)] hover:text-[var(--ty-font-white-color)] hover:bg-[var(--ty-fill-darkest-color)]/50'
              }`}
            >
              <ScrollText className="w-3.5 h-3.5 text-[var(--ty-primary-hover-color)]" />
              <span>中间表写入队列</span>
              {currentView === 'source-ingestion-logs' && <span className="w-1.5 h-1.5 rounded-full bg-[var(--ty-fill-white-color)] ml-auto"></span>}
            </button>

            <button
              onClick={() => onNavigate('data-sync-quality')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-ty-sm text-ty-ss font-medium transition-colors text-left cursor-pointer ${
                currentView === 'data-sync-quality'
                  ? 'bg-[var(--ty-primary-color)] text-[var(--ty-font-white-color)] font-semibold'
                  : 'text-[var(--ty-font-placeholder-color)] hover:text-[var(--ty-font-white-color)] hover:bg-[var(--ty-fill-darkest-color)]/50'
              }`}
            >
              <Database className="w-3.5 h-3.5 text-[var(--ty-primary-hover-color)]" />
              <span>Manticore 同步队列</span>
              {currentView === 'data-sync-quality' && <span className="w-1.5 h-1.5 rounded-full bg-[var(--ty-fill-white-color)] ml-auto"></span>}
            </button>

            <button
              onClick={() => onNavigate('data-consistency-check')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-ty-sm text-ty-ss font-medium transition-colors text-left cursor-pointer ${
                currentView === 'data-consistency-check'
                  ? 'bg-[var(--ty-primary-color)] text-[var(--ty-font-white-color)] font-semibold'
                  : 'text-[var(--ty-font-placeholder-color)] hover:text-[var(--ty-font-white-color)] hover:bg-[var(--ty-fill-darkest-color)]/50'
              }`}
              id="sidebar-nav-data-consistency-check"
            >
              <FileSearch className="w-3.5 h-3.5 text-[var(--ty-primary-hover-color)]" />
              <span>数据一致性核验</span>
              {currentView === 'data-consistency-check' && <span className="w-1.5 h-1.5 rounded-full bg-[var(--ty-fill-white-color)] ml-auto"></span>}
            </button>
          </div>
        </div>

        {/* Section 1: 属性相似度 */}
        <div>
          <span className="px-3 text-ty-2xs uppercase tracking-wider text-[var(--ty-font-sub-color)] font-bold block mb-2">二阶段：非 AI 属性相似度</span>
          <div className="space-y-1">
            <button
              onClick={() => onNavigate('field-rules')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-ty-sm text-ty-ss font-medium transition-colors text-left cursor-pointer ${
                currentView === 'field-rules'
                  ? 'bg-[var(--ty-primary-color)] text-[var(--ty-font-white-color)] font-semibold'
                  : 'text-[var(--ty-font-placeholder-color)] hover:text-[var(--ty-font-white-color)] hover:bg-[var(--ty-fill-darkest-color)]/50'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-[var(--ty-primary-hover-color)]" />
              <span>字段相似度规则</span>
              {currentView === 'field-rules' && <span className="w-1.5 h-1.5 rounded-full bg-[var(--ty-fill-white-color)] ml-auto"></span>}
            </button>

            <button
              onClick={() => onNavigate('query-preview')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-ty-sm text-ty-ss font-medium transition-colors text-left cursor-pointer ${
                currentView === 'query-preview'
                  ? 'bg-[var(--ty-primary-color)] text-[var(--ty-font-white-color)] font-semibold'
                  : 'text-[var(--ty-font-placeholder-color)] hover:text-[var(--ty-font-white-color)] hover:bg-[var(--ty-fill-darkest-color)]/50'
              }`}
            >
              <Search className="w-3.5 h-3.5 text-[var(--ty-green-color)]" />
              <span>相似度查询预览</span>
              {currentView === 'query-preview' && <span className="w-1.5 h-1.5 rounded-full bg-[var(--ty-fill-white-color)] ml-auto"></span>}
            </button>

            <button
              onClick={() => onNavigate('client-find-similar')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-ty-sm text-ty-ss font-medium transition-colors text-left cursor-pointer ${
                currentView === 'client-find-similar'
                  ? 'bg-[var(--ty-primary-color)] text-[var(--ty-font-white-color)] font-semibold'
                  : 'text-[var(--ty-font-placeholder-color)] hover:text-[var(--ty-font-white-color)] hover:bg-[var(--ty-fill-darkest-color)]/50'
              }`}
            >
              <Eye className="w-3.5 h-3.5 text-[var(--ty-primary-hover-color)]" />
              <span>应用端查找相似件</span>
              {currentView === 'client-find-similar' && <span className="w-1.5 h-1.5 rounded-full bg-[var(--ty-fill-white-color)] ml-auto"></span>}
            </button>

            <button
              onClick={() => onNavigate('publish-records')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-ty-sm text-ty-ss font-medium transition-colors text-left cursor-pointer ${
                currentView === 'publish-records'
                  ? 'bg-[var(--ty-primary-color)] text-[var(--ty-font-white-color)] font-semibold'
                  : 'text-[var(--ty-font-placeholder-color)] hover:text-[var(--ty-font-white-color)] hover:bg-[var(--ty-fill-darkest-color)]/50'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-[var(--ty-orange-color)]" />
              <span>变更记录</span>
              {currentView === 'publish-records' && <span className="w-1.5 h-1.5 rounded-full bg-[var(--ty-fill-white-color)] ml-auto"></span>}
            </button>
          </div>
        </div>

        {/* Section 2: 三阶段：数据治理与业务决策 */}
        <div>
          <span className="px-3 text-ty-2xs uppercase tracking-wider text-[var(--ty-font-sub-color)] font-bold block mb-2">三阶段：业务决策（后续阶段）</span>
          <div className="space-y-1">
            <button
              onClick={() => onNavigate('data-processing')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-ty-sm text-ty-ss font-medium transition-colors text-left cursor-pointer ${
                currentView === 'data-processing'
                  ? 'bg-[var(--ty-primary-color)] text-[var(--ty-font-white-color)] font-semibold'
                  : 'text-[var(--ty-font-placeholder-color)] hover:text-[var(--ty-font-white-color)] hover:bg-[var(--ty-fill-darkest-color)]/50'
              }`}
            >
              <Settings className="w-3.5 h-3.5 text-[var(--ty-orange-color)]" />
              <span>数据处理规则</span>
              {currentView === 'data-processing' && <span className="w-1.5 h-1.5 rounded-full bg-[var(--ty-fill-white-color)] ml-auto"></span>}
            </button>

            <button
              onClick={() => onNavigate('decision-rules')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-ty-sm text-ty-ss font-medium transition-colors text-left cursor-pointer ${
                currentView === 'decision-rules'
                  ? 'bg-[var(--ty-primary-color)] text-[var(--ty-font-white-color)] font-semibold'
                  : 'text-[var(--ty-font-placeholder-color)] hover:text-[var(--ty-font-white-color)] hover:bg-[var(--ty-fill-darkest-color)]/50'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-[var(--ty-orange-color)]" />
              <span>三化决策规则</span>
              {currentView === 'decision-rules' && <span className="w-1.5 h-1.5 rounded-full bg-[var(--ty-fill-white-color)] ml-auto"></span>}
            </button>
          </div>
        </div>

      </nav>

      {/* Sidebar Footer */}
      <div className="p-4 bg-[var(--ty-font-main-color)] border-t border-[var(--ty-fill-darkest-color)] text-ty-2xs text-[var(--ty-font-sub-color)] space-y-1">
        <div className="font-semibold text-[var(--ty-font-placeholder-color)]">PLM Manticore Engine</div>
        <div>属性相似度检索与物料治理平台</div>
      </div>
    </aside>
  );
};
