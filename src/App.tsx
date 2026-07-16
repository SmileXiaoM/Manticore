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
  CategoryCoverage
} from './types';

export default function App() {
  // Master Interactive State
  const [fieldRules, setFieldRules] = useState<FieldSimilarityRule[]>(initialFieldRules);
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
                  rules={fieldRules} 
                  onUpdateRules={setFieldRules} 
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
                <PublishRecordView />
              )}

              {currentView === 'query-preview' && (
                <QueryPreviewView 
                  rules={fieldRules} 
                  objectConfigStatus={objectConfigStatus}
                  onNavigate={setCurrentView}
                />
              )}

              {currentView === 'client-find-similar' && (
                <ClientFindSimilarView 
                  rules={fieldRules} 
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
