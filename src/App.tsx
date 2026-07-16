import { useState, useMemo } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';

// Views
import { FieldSimilarityView } from './components/FieldSimilarityView';
import { StandardizationView } from './components/StandardizationView';
import { SynonymView } from './components/SynonymView';
import { AlignmentView } from './components/AlignmentView';
import { PublishRecordView } from './components/PublishRecordView';
import { AttributeTypesView } from './components/AttributeTypesView';
import { AttributeEnumsView } from './components/AttributeEnumsView';
import { QueryPreviewView } from './components/QueryPreviewView';
import { ClientFindSimilarView } from './components/ClientFindSimilarView';
import { DataProcessingView } from './components/DataProcessingView';
import { ThreeStandardDecisionView } from './components/ThreeStandardDecisionView';

// Three-Standardization Audit Views
import { FieldWhitelistView } from './components/FieldWhitelistView';
import { ThresholdRuleView } from './components/ThresholdRuleView';
import { HardRuleView } from './components/HardRuleView';
import { CategoryCoverageView } from './components/CategoryCoverageView';

// Data
import { 
  initialFieldRules, 
  initialStandardizationRules, 
  initialSynonymRules, 
  initialAlignmentRules, 
  initialPublishRecords,
  initialFieldWhitelists,
  initialThresholdRules,
  initialHardRules,
  initialCategoryCoverages
} from './data';

import { 
  FieldSimilarityRule, 
  StandardizationRule, 
  SynonymRule, 
  ClassificationAlignmentRule, 
  PublishRecord,
  FieldWhitelistItem,
  ThresholdRule,
  HardRule,
  CategoryCoverage,
  ChangeRecord,
  ObjectType
} from './types';

export default function App() {
  // Master Interactive State
  // 1. 编辑中规则 (当前编辑内容)
  const [editingFieldRules, setEditingFieldRules] = useState<FieldSimilarityRule[]>(initialFieldRules);
  // 2. 已保存规则
  const [savedFieldRules, setSavedFieldRules] = useState<FieldSimilarityRule[]>(initialFieldRules);
  // 3. 当前启用生效规则 (业务端/应用端和试算引擎读取此变量)
  const [activeFieldRules, setActiveFieldRules] = useState<FieldSimilarityRule[]>(initialFieldRules);

  // 4. 配置变更审计记录
  const [changeRecords, setChangeRecords] = useState<ChangeRecord[]>([
    {
      id: 'CR-001',
      objectType: '机械零件 (PART_MECHANICAL)',
      configVersion: 'v2.5.0',
      operationType: '启用',
      summary: '微调主要材质权重为25%，标称直径权重为15%，启用全套相似度计算规则，单位目录验证正常。',
      operator: '李晓华 (数据标准管理员)',
      time: '2026-07-15 16:30:12',
      result: 'SUCCESS'
    },
    {
      id: 'CR-002',
      objectType: '电气元器件 (PART_ELECTRICAL)',
      configVersion: 'v1.0.1',
      operationType: '保存',
      summary: '配置工作电压规则，保存未完成配置但暂不启用。权重累计为30%，继续完善其他字段。',
      operator: '赵丽 (电气工程师)',
      time: '2026-07-15 15:45:22',
      result: 'SUCCESS'
    },
    {
      id: 'CR-003',
      objectType: '机械零件 (PART_MECHANICAL)',
      configVersion: 'v2.4.9',
      operationType: '启用',
      summary: '尝试启用新增标称直径字段强过滤规则，因配置权重总和85%不满足100%要求导致校验失败。',
      operator: '王明 (机械工程师)',
      time: '2026-07-15 14:10:05',
      result: 'FAILED',
      failureReason: '参与评分字段权重合计为 85%，不满足 100% 满分校验规则。'
    },
    {
      id: 'CR-004',
      objectType: '电气元器件 (PART_ELECTRICAL)',
      configVersion: 'v1.0.0',
      operationType: '停用',
      summary: '由于电气元器件分类元数据重构，手动下线停用该对象类型的二阶段相似度对比计算。',
      operator: '张建国 (系统架构师)',
      time: '2026-07-12 11:20:00',
      result: 'SUCCESS'
    },
    {
      id: 'CR-005',
      objectType: '机械零件 (PART_MECHANICAL)',
      configVersion: 'v2.4.0',
      operationType: '启用',
      summary: '完成机械零件初版配置规则映射启用，主要覆盖规格描述、标称直径、主要材质、螺距和分类。',
      operator: '张建国 (系统架构师)',
      time: '2026-07-02 15:00:00',
      result: 'SUCCESS'
    }
  ]);

  const [standardizationRules, setStandardizationRules] = useState<StandardizationRule[]>(initialStandardizationRules);
  const [synonymRules, setSynonymRules] = useState<SynonymRule[]>(initialSynonymRules);
  const [alignmentRules, setAlignmentRules] = useState<ClassificationAlignmentRule[]>(initialAlignmentRules);

  // New "三化审核最小闭环" State Arrays
  const [whitelists, setWhitelists] = useState<FieldWhitelistItem[]>(initialFieldWhitelists);
  const [thresholdRules, setThresholdRules] = useState<ThresholdRule[]>(initialThresholdRules);
  const [hardRules, setHardRules] = useState<HardRule[]>(initialHardRules);
  const [coverages, setCoverages] = useState<CategoryCoverage[]>(initialCategoryCoverages);
  
  // Track activeObjectType at App level to support precise unsaved guard
  const [activeObjectType, setActiveObjectType] = useState<ObjectType>('PART_MECHANICAL');
  
  // View Router State
  const [currentView, setCurrentView] = useState<string>('field-rules');
  const [pendingView, setPendingView] = useState<string | null>(null);
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);

  const handleNavigate = (newView: string) => {
    // R10-BLK-04: strict unsaved changes guard for the active objectType only!
    const activeEditing = editingFieldRules.filter(r => r.objectType === activeObjectType);
    const activeSaved = savedFieldRules.filter(r => r.objectType === activeObjectType);
    const isModified = JSON.stringify(activeEditing) !== JSON.stringify(activeSaved);
    
    if (currentView === 'field-rules' && newView !== 'field-rules' && isModified) {
      setPendingView(newView);
      setShowUnsavedConfirm(true);
    } else {
      setCurrentView(newView);
    }
  };

  const handleConfirmDiscard = () => {
    setEditingFieldRules(JSON.parse(JSON.stringify(savedFieldRules)));
    if (pendingView) {
      setCurrentView(pendingView);
    }
    setPendingView(null);
    setShowUnsavedConfirm(false);
  };

  const handleCancelDiscard = () => {
    setPendingView(null);
    setShowUnsavedConfirm(false);
  };

  // Explicit independent configuration status per object type
  const [objectConfigStatus, setObjectConfigStatus] = useState<Record<string, {
    enabled: boolean;
    configVersion: string;
    lastModifiedAt: string;
  }>>({
    PART_MECHANICAL: { enabled: true, configVersion: 'v2.5.0', lastModifiedAt: '2026-07-15 16:30:12' },
    PART_ELECTRICAL: { enabled: false, configVersion: 'v1.0.0', lastModifiedAt: '2026-07-12 11:20:00' },
    PART_HYDRAULIC: { enabled: false, configVersion: 'v1.0.0', lastModifiedAt: '-' },
    PART_PNEUMATIC: { enabled: false, configVersion: 'v1.0.0', lastModifiedAt: '-' },
    PART_OPTICAL: { enabled: false, configVersion: 'v1.0.0', lastModifiedAt: '-' },
  });

  // Helper to determine if a view should not have administrative shell/chrome
  const isNonShellView = ['attribute-types', 'attribute-enums'].includes(currentView);

  return (
    <div className="w-full h-screen flex flex-col overflow-hidden bg-slate-50 text-slate-800">
      
      {isNonShellView ? (
        // Non-shell Figma specification sheets taking up the full screen
        <div className="flex-1 overflow-auto">
          {currentView === 'attribute-types' && (
            <AttributeTypesView onBackToApp={() => handleNavigate('field-rules')} />
          )}
          {currentView === 'attribute-enums' && (
            <AttributeEnumsView onBackToApp={() => handleNavigate('field-rules')} />
          )}
        </div>
      ) : (
        // Standard PLM Admin Environment with Header, Sidebar, and Content view
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Admin Header Bar */}
          <Header 
            onNavigate={handleNavigate} 
          />

          {/* Sidebar & Body Split */}
          <div className="flex-1 flex overflow-hidden">
            
            {/* Sidebar Navigation */}
            <Sidebar currentView={currentView} onNavigate={handleNavigate} />

            {/* Dynamic View Dispatcher */}
            <main className="flex-1 flex flex-col overflow-hidden">
              {currentView === 'field-rules' && (
                <FieldSimilarityView 
                  editingRules={editingFieldRules} 
                  onUpdateEditingRules={setEditingFieldRules}
                  savedRules={savedFieldRules}
                  onUpdateSavedRules={setSavedFieldRules}
                  activeRules={activeFieldRules}
                  onUpdateActiveRules={setActiveFieldRules}
                  changeRecords={changeRecords}
                  onUpdateChangeRecords={setChangeRecords}
                  objectConfigStatus={objectConfigStatus}
                  onUpdateConfigStatus={setObjectConfigStatus}
                  onNavigate={handleNavigate}
                  activeObjectType={activeObjectType}
                  setActiveObjectType={setActiveObjectType}
                />
              )}

              {currentView === 'standardization-rules' && (
                <StandardizationView 
                  rules={standardizationRules} 
                  onUpdateRules={setStandardizationRules} 
                />
              )}

              {currentView === 'synonym-rules' && (
                <SynonymView 
                  rules={synonymRules} 
                  onUpdateRules={setSynonymRules} 
                />
              )}

              {currentView === 'alignment-rules' && (
                <AlignmentView 
                  rules={alignmentRules} 
                  onUpdateRules={setAlignmentRules} 
                />
              )}

              {currentView === 'publish-records' && (
                <PublishRecordView changeRecords={changeRecords} />
              )}

              {currentView === 'query-preview' && (
                <QueryPreviewView 
                  editingRules={editingFieldRules}
                  savedRules={savedFieldRules}
                  activeRules={activeFieldRules}
                  objectConfigStatus={objectConfigStatus}
                  onNavigate={handleNavigate}
                />
              )}

              {currentView === 'client-find-similar' && (
                <ClientFindSimilarView 
                  rules={activeFieldRules} 
                  objectConfigStatus={objectConfigStatus}
                  onNavigate={handleNavigate}
                />
              )}

              {/* Three-Standardization (三化审核) Configuration Views */}
              {currentView === 'field-whitelists' && (
                <FieldWhitelistView 
                  whitelists={whitelists} 
                  onUpdateWhitelists={setWhitelists} 
                />
              )}

              {currentView === 'threshold-rules' && (
                <ThresholdRuleView 
                  thresholdRules={thresholdRules} 
                  onUpdateThresholdRules={setThresholdRules} 
                />
              )}

              {currentView === 'hard-rules' && (
                <HardRuleView 
                  hardRules={hardRules} 
                  onUpdateHardRules={setHardRules} 
                />
              )}

              {currentView === 'category-coverages' && (
                <CategoryCoverageView 
                  coverages={coverages} 
                  onUpdateCoverages={setCoverages} 
                />
              )}

              {currentView === 'data-processing' && (
                <DataProcessingView
                  standardizationRules={standardizationRules}
                  onUpdateStandardizationRules={setStandardizationRules}
                  synonymRules={synonymRules}
                  onUpdateSynonymRules={setSynonymRules}
                  alignmentRules={alignmentRules}
                  onUpdateAlignmentRules={setAlignmentRules}
                />
              )}

              {currentView === 'decision-rules' && (
                <ThreeStandardDecisionView
                  thresholdRules={thresholdRules}
                  onUpdateThresholdRules={setThresholdRules}
                  hardRules={hardRules}
                  onUpdateHardRules={setHardRules}
                  coverages={coverages}
                  onUpdateCoverages={setCoverages}
                />
              )}
            </main>
          </div>
        </div>
      )}

      {showUnsavedConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs" id="unsaved-modal-overlay">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in duration-150" id="unsaved-modal-content">
            <div className="flex items-start space-x-3">
              <div className="bg-amber-100 p-2 rounded-full text-amber-600 shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">未应用配置更改警告</h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  检测到您当前在<strong>「二阶段字段属性相似度配置」</strong>中有尚未应用的编辑中草稿（即临时未保存更改）。
                </p>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  如果您现在切换页面，所有未保存的编辑内容都将丢失。是否确认放弃更改并离开？
                </p>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={handleCancelDiscard}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-50 rounded text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                id="btn-unsaved-cancel"
              >
                留在当前页面 (返回保存)
              </button>
              <button
                onClick={handleConfirmDiscard}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded text-xs font-bold text-white shadow-xs transition-colors cursor-pointer"
                id="btn-unsaved-discard"
              >
                放弃更改并离开
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
