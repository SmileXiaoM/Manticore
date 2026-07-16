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
  ChangeRecord
} from './types';

export default function App() {
  // Master Interactive State
  // 1. 编辑中规则 (草稿池)
  const [editingFieldRules, setEditingFieldRules] = useState<FieldSimilarityRule[]>(initialFieldRules);
  // 2. 已保存规则
  const [savedFieldRules, setSavedFieldRules] = useState<FieldSimilarityRule[]>(initialFieldRules);
  // 3. 线上当前生效规则 (业务端/应用端和试算引擎读取此变量)
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
  
  // View Router State
  const [currentView, setCurrentView] = useState<string>('field-rules');

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
            <AttributeTypesView onBackToApp={() => setCurrentView('field-rules')} />
          )}
          {currentView === 'attribute-enums' && (
            <AttributeEnumsView onBackToApp={() => setCurrentView('field-rules')} />
          )}
        </div>
      ) : (
        // Standard PLM Admin Environment with Header, Sidebar, and Content view
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Admin Header Bar */}
          <Header 
            onNavigate={setCurrentView} 
          />

          {/* Sidebar & Body Split */}
          <div className="flex-1 flex overflow-hidden">
            
            {/* Sidebar Navigation */}
            <Sidebar currentView={currentView} onNavigate={setCurrentView} />

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
                  onNavigate={setCurrentView}
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
                  onNavigate={setCurrentView}
                />
              )}

              {currentView === 'client-find-similar' && (
                <ClientFindSimilarView 
                  rules={activeFieldRules} 
                  objectConfigStatus={objectConfigStatus}
                  onNavigate={setCurrentView}
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

    </div>
  );
}
