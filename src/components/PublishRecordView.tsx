import React, { useState } from 'react';
import {
  History,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Info,
  SlidersHorizontal,
  Search
} from 'lucide-react';
import { ChangeRecord } from '../types';

interface PublishRecordViewProps {
  changeRecords: ChangeRecord[];
}

export const PublishRecordView: React.FC<PublishRecordViewProps> = ({ changeRecords }) => {
  const [filterObjectType, setFilterObjectType] = useState<string>('ALL');
  const [filterOpType, setFilterOpType] = useState<string>('ALL');

  const filteredRecords = changeRecords.filter(r => {
    const objectTypeMap: Record<string, string> = {
      'PART_MECHANICAL': '机械零件',
      'PART_ELECTRICAL': '电气元器件'
    };
    const targetLabel = objectTypeMap[filterObjectType] || filterObjectType;
    const matchType = filterObjectType === 'ALL' || r.objectType.includes(targetLabel);
    const matchOp = filterOpType === 'ALL' || r.operationType === filterOpType;
    return matchType && matchOp;
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 font-sans">

      {/* Title Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0 flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2 text-xs text-slate-500 mb-1">
            <span>相似度配置</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-800 font-medium">变更记录</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">配置变更审计历史</h1>
          <p className="text-xs text-slate-500 mt-1">
            追溯各对象类型下 Manticore 属性相似度配置的保存、启用、停用及完整性校验审计日志。
          </p>
        </div>
      </div>

      {/* Filter and Content panel */}
      <div className="flex-1 flex flex-col p-6 overflow-hidden">

        {/* Filters bar */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4 shadow-xs shrink-0 flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-600">对象类型:</span>
            <select
              value={filterObjectType}
              onChange={(e) => setFilterObjectType(e.target.value)}
              className="text-xs border border-slate-200 rounded px-2.5 py-1.5 bg-slate-50 text-slate-700 outline-hidden font-medium cursor-pointer"
            >
              <option value="ALL">全部类型</option>
              <option value="PART_MECHANICAL">机械零件</option>
              <option value="PART_ELECTRICAL">电气元器件</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-600">操作类型:</span>
            <select
              value={filterOpType}
              onChange={(e) => setFilterOpType(e.target.value)}
              className="text-xs border border-slate-200 rounded px-2.5 py-1.5 bg-slate-50 text-slate-700 outline-hidden font-medium cursor-pointer"
            >
              <option value="ALL">全部操作</option>
              <option value="保存">保存</option>
              <option value="启用">启用</option>
              <option value="停用">停用</option>
            </select>
          </div>

          <div className="text-xs text-slate-400 font-mono ml-auto">
            共 {filteredRecords.length} 条审计记录
          </div>
        </div>

        {/* Change Records Table */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm flex-1 flex flex-col overflow-hidden">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-800 flex items-center space-x-1.5">
              <History className="w-3.5 h-3.5 text-blue-500" />
              <span>操作变更审计日志 (只读安全审计记录)</span>
            </span>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-semibold font-sans">
                  <th className="px-4 py-3 w-1/6">对象类型</th>
                  <th className="px-4 py-3 w-24">配置版本</th>
                  <th className="px-3 py-3 text-center w-20">操作类型</th>
                  <th className="px-5 py-3">变更摘要</th>
                  <th className="px-4 py-3 w-40">操作人</th>
                  <th className="px-4 py-3 w-36">操作时间</th>
                  <th className="px-3 py-3 text-center w-24">执行结果</th>
                  <th className="px-4 py-3 w-1/5">失败原因</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredRecords.length > 0 ? (
                  filteredRecords.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Object Type */}
                      <td className="px-4 py-3.5 font-medium text-slate-900 font-sans">
                        {rec.objectType}
                      </td>

                      {/* Config Version */}
                      <td className="px-4 py-3.5 font-mono font-bold text-slate-800">
                        {rec.configVersion}
                      </td>

                      {/* Operation Type */}
                      <td className="px-3 py-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          rec.operationType === '启用' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                          rec.operationType === '停用' ? 'bg-slate-100 text-slate-700 border border-slate-200' :
                          'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}>
                          {rec.operationType}
                        </span>
                      </td>

                      {/* Change Summary */}
                      <td className="px-5 py-3.5 text-slate-600 leading-relaxed font-sans font-medium text-xs">
                        {rec.summary}
                      </td>

                      {/* Operator */}
                      <td className="px-4 py-3.5 text-slate-700 whitespace-nowrap font-medium">
                        {rec.operator}
                      </td>

                      {/* Operation Time */}
                      <td className="px-4 py-3.5 font-mono text-slate-500 whitespace-nowrap">
                        {rec.time}
                      </td>

                      {/* Execution Result */}
                      <td className="px-3 py-3.5 text-center">
                        {rec.result === 'SUCCESS' ? (
                          <span className="text-emerald-600 font-semibold flex items-center justify-center space-x-1 text-xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            <span>成功</span>
                          </span>
                        ) : (
                          <span className="text-red-600 font-semibold flex items-center justify-center space-x-1 text-xs">
                            <XCircle className="w-3.5 h-3.5 text-red-500" />
                            <span>失败</span>
                          </span>
                        )}
                      </td>

                      {/* Failure Reason */}
                      <td className="px-4 py-3.5 text-slate-500 leading-normal font-sans">
                        {rec.failureReason ? (
                          <span className="text-red-500 font-medium text-xs bg-red-50/50 px-2 py-1 rounded border border-red-100 block">
                            {rec.failureReason}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-400 font-sans">
                      暂无符合条件的变更记录。
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};
