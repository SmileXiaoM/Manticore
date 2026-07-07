import { useState } from 'react';
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
  CategoryCoverage
} from './types';

export default function App() {
  // Master Interactive State
  const [fieldRules, setFieldRules] = useState<FieldSimilarityRule[]>(initialFieldRules);
  const [standardizationRules, setStandardizationRules] = useState<StandardizationRule[]>(initialStandardizationRules);
  const [synonymRules, setSynonymRules] = useState<SynonymRule[]>(initialSynonymRules);
  const [alignmentRules, setAlignmentRules] = useState<ClassificationAlignmentRule[]>(initialAlignmentRules);
  const [publishRecords, setPublishRecords] = useState<PublishRecord[]>(initialPublishRecords);

  // New "三化审核最小闭环" State Arrays
  const [whitelists, setWhitelists] = useState<FieldWhitelistItem[]>(initialFieldWhitelists);
  const [thresholdRules, setThresholdRules] = useState<ThresholdRule[]>(initialThresholdRules);
  const [hardRules, setHardRules] = useState<HardRule[]>(initialHardRules);
  const [coverages, setCoverages] = useState<CategoryCoverage[]>(initialCategoryCoverages);
  
  // View Router State
  const [currentView, setCurrentView] = useState<string>('field-rules');

  // Triggered when clicking "Publish Config" from field similarity rules
  const handlePublishConfig = () => {
    const nextVersion = `v2.4.${publishRecords.length + 1}`;
    const newRecord: PublishRecord = {
      id: `PUB-00${publishRecords.length + 1}`,
      versionCode: nextVersion,
      publishTime: new Date().toISOString().replace('T', ' ').substring(0, 19),
      publisher: '李晓华 (工艺数据管理员)',
      changeSummary: '将草稿池中的规则打包同步。更新了工作电压规则，完成了主要材质字段空值退让方案。',
      affectedObjectType: 'PART_MECHANICAL, PART_ELECTRICAL',
      affectedFieldCount: 3,
      validationResult: 'SUCCESS',
      status: 'ACTIVE'
    };

    // Make old active record superseded
    const updatedRecords = publishRecords.map(r => r.status === 'ACTIVE' ? { ...r, status: 'SUPERSEDED' as const } : r);
    setPublishRecords([newRecord, ...updatedRecords]);

    // Set all modified rules to published
    const updatedFieldRules = fieldRules.map(f => f.status === 'CHANGED' ? { ...f, status: 'PUBLISHED' as const, publishVersion: nextVersion } : f);
    setFieldRules(updatedFieldRules);

    alert(`🎉 恭喜！已成功发布新配置快照 [ ${nextVersion} ] 并写入 Manticore 二阶段检索集群中！所有规则已完成同步。`);
    setCurrentView('publish-records');
  };

  // Triggered on rollback
  const handleRollbackVersion = (version: string) => {
    const updatedRecords = publishRecords.map(r => {
      if (r.versionCode === version) {
        return { ...r, status: 'ACTIVE' as const };
      }
      if (r.status === 'ACTIVE') {
        return { ...r, status: 'SUPERSEDED' as const };
      }
      return r;
    });
    setPublishRecords(updatedRecords);
    alert(`成功！已将 Manticore 评分节点一键回滚重置到 [ ${version} ] 生效版本配置。已重新编译图模型索引。`);
  };

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
          <Header onNavigate={setCurrentView} />

          {/* Sidebar & Body Split */}
          <div className="flex-1 flex overflow-hidden">
            
            {/* Sidebar Navigation */}
            <Sidebar currentView={currentView} onNavigate={setCurrentView} />

            {/* Dynamic View Dispatcher */}
            <main className="flex-1 flex flex-col overflow-hidden">
              {currentView === 'field-rules' && (
                <FieldSimilarityView 
                  rules={fieldRules} 
                  onUpdateRules={setFieldRules} 
                  onPublish={handlePublishConfig} 
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
                <PublishRecordView 
                  records={publishRecords} 
                  onRollback={handleRollbackVersion} 
                />
              )}

              {currentView === 'query-preview' && (
                <QueryPreviewView onPublishClick={handlePublishConfig} />
              )}

              {currentView === 'client-find-similar' && (
                <ClientFindSimilarView />
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
