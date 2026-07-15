import React, { useState } from 'react';
import { 
  History, 
  ChevronRight, 
  CheckCircle, 
  AlertTriangle, 
  Eye, 
  GitCompare, 
  RotateCcw,
  ArrowRight,
  Info
} from 'lucide-react';
import { PublishRecord } from '../types';
import { versionDiffs } from '../data';

interface PublishRecordViewProps {
  records: PublishRecord[];
  onRollback: (version: string) => void;
}

export const PublishRecordView: React.FC<PublishRecordViewProps> = ({ 
  records,
  onRollback
}) => {
  const [selectedRecord, setSelectedRecord] = useState<PublishRecord>(records[0]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
      
      {/* Title Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0 flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2 text-xs text-slate-500 mb-1">
            <span>相似度配置</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-800 font-medium">发布记录</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">版本发布与配置审计历史</h1>
          <p className="text-xs text-slate-500 mt-1">
            追溯 Manticore 二阶段相似度规则每次发布生成的版本快照，支持线上配置的差异对比及复制为新草稿。
          </p>
        </div>
      </div>

      {/* Main split-view */}
      <div className="flex-1 flex flex-col overflow-y-auto p-6 space-y-6">
        
        {/* Upper Segment: Publish Records Table */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden shrink-0">
          <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-800 flex items-center space-x-1.5">
              <History className="w-3.5 h-3.5 text-blue-500" />
              <span>版本快照发布日志 (点击行切换查看详细版本差异)</span>
            </span>
            <span className="text-xs text-slate-400">仅审计已同步生效配置</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-semibold font-sans">
                  <th className="px-4 py-2">版本号</th>
                  <th className="px-4 py-2">发布生效时间</th>
                  <th className="px-4 py-2">发布操作人</th>
                  <th className="px-5 py-2">变更摘要说明</th>
                  <th className="px-4 py-2">影响物料对象大类</th>
                  <th className="px-3 py-2 text-center">影响字段数</th>
                  <th className="px-3 py-2 text-center">系统校验</th>
                  <th className="px-3 py-2 text-center">发布状态</th>
                  <th className="px-4 py-2 text-center">版本审计入口</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {records.map((rec) => {
                  const isSelected = selectedRecord.id === rec.id;
                  return (
                    <tr 
                      key={rec.id} 
                      onClick={() => setSelectedRecord(rec)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-50/70 border-l-4 border-l-blue-600 font-medium' : 'hover:bg-slate-50/60'
                      }`}
                    >
                      {/* Version Code */}
                      <td className="px-4 py-2.5 font-bold text-slate-900 font-mono">
                        {rec.versionCode}
                        {rec.status === 'ACTIVE' && (
                          <span className="ml-1.5 text-xs bg-emerald-100 text-emerald-800 border border-emerald-200 px-1 rounded-full font-sans">
                            当前生效
                          </span>
                        )}
                      </td>

                      {/* Time */}
                      <td className="px-4 py-2.5 font-mono text-slate-600">
                        {rec.publishTime}
                      </td>

                      {/* Publisher */}
                      <td className="px-4 py-2.5 text-slate-800">
                        {rec.publisher}
                      </td>

                      {/* Summary */}
                      <td className="px-5 py-2.5 text-slate-500 max-w-[320px] truncate" title={rec.changeSummary}>
                        {rec.changeSummary}
                      </td>

                      {/* Affected Object */}
                      <td className="px-4 py-2.5 text-slate-600 font-mono whitespace-nowrap">
                        {rec.affectedObjectType}
                      </td>

                      {/* Count */}
                      <td className="px-3 py-2.5 text-center font-bold text-slate-700 font-mono">
                        {rec.affectedFieldCount}
                      </td>

                      {/* Validation Result */}
                      <td className="px-3 py-2.5 text-center whitespace-nowrap">
                        {rec.validationResult === 'SUCCESS' ? (
                          <span className="text-emerald-600 flex items-center justify-center space-x-1">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>成功</span>
                          </span>
                        ) : (
                          <span className="text-amber-600 flex items-center justify-center space-x-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>警告</span>
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-3 py-2.5 text-center whitespace-nowrap">
                        {rec.status === 'ACTIVE' ? (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-medium">线上运行中</span>
                        ) : rec.status === 'SUPERSEDED' ? (
                          <span className="bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded font-medium">已被历史替代</span>
                        ) : (
                          <span className="bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded font-medium">已回滚历史</span>
                        )}
                      </td>

                      {/* Action Entries */}
                      <td className="px-4 py-2.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              alert(`查看版本 ${rec.versionCode} 完整的静态配置文件 JSON！`);
                            }}
                            className="text-blue-600 hover:text-blue-800 text-xs font-medium flex items-center space-x-0.5"
                          >
                            <Eye className="w-3 h-3" />
                            <span>查看</span>
                          </button>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              alert(`生成当前草稿与已发布版本 ${rec.versionCode} 差异报告！`);
                            }}
                            className="text-slate-600 hover:text-slate-800 text-xs font-medium flex items-center space-x-0.5"
                          >
                            <GitCompare className="w-3 h-3" />
                            <span>对比</span>
                          </button>

                          {rec.status !== 'ACTIVE' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(`确定要将版本 ${rec.versionCode} 的所有规则配置复制为新草稿吗？这不会直接更改当前线上生效的版本。`)) {
                                  onRollback(rec.versionCode);
                                }
                              }}
                              className="text-blue-600 hover:text-blue-800 text-xs font-medium flex items-center space-x-0.5"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>复制为新草稿</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Lower Segment: Version Diff detail based on selection */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden flex-1 flex flex-col min-h-[300px]">
          
          <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-800 flex items-center space-x-2">
              <GitCompare className="w-4 h-4 text-purple-600" />
              <span>所选版本差异对照细节: </span>
              <strong className="text-blue-700 font-bold font-mono text-sm">{selectedRecord.versionCode}</strong>
            </span>
            <span className="text-xs text-slate-500 flex items-center space-x-1 bg-white border border-slate-200 px-2 py-0.5 rounded">
              <Info className="w-3.5 h-3.5 text-blue-500" />
              <span>影响说明旨在减少上线冲突风险</span>
            </span>
          </div>

          <div className="p-4 flex-1 overflow-auto">
            {/* Version diff table list */}
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="px-4 py-2 border-r border-slate-100">规则字段及配置路径</th>
                  <th className="px-4 py-2 border-r border-slate-100 bg-red-50 text-red-700 font-bold">变更前 (Before)</th>
                  <th className="px-4 py-2 border-r border-slate-100 bg-emerald-50 text-emerald-700 font-bold">变更后 (After)</th>
                  <th className="px-4 py-2">影响性及验证结论 (Impact & Verification)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {versionDiffs.map((diff, index) => (
                  <tr key={index} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 border-r border-slate-100 font-medium text-slate-900 font-mono">
                      {diff.fieldName}
                    </td>
                    <td className="px-4 py-3 border-r border-slate-100 bg-red-50/20 font-mono text-red-800">
                      {diff.beforeValue}
                    </td>
                    <td className="px-4 py-3 border-r border-slate-100 bg-emerald-50/20 font-mono text-emerald-800 font-bold flex items-center space-x-1">
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span>{diff.afterValue}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {diff.impactDescription}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Quick validation box at bottom of diff */}
            <div className="mt-5 bg-amber-50 border border-amber-200 p-3.5 rounded-md text-xs">
              <span className="font-semibold text-amber-900 block mb-1 flex items-center space-x-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>发布校验报告: {selectedRecord.versionCode}</span>
              </span>
              <p className="text-amber-800 leading-normal">
                经 Manticore 集群预编译校验，本版本中“材质牌号归一”对应规则共覆盖 SAP ERP 和 TC 系统总计 14,240 余种零部件，计算图模型无环路冲突。直径公差未引起大范围全字搜索抖动，可安全承载二阶段去重过滤。
              </p>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
