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
    <div className="space-y-4" id="publish-record-view-container">

      {/* Title Header */}
      <div className="bg-[var(--ty-fill-white-color)] rounded-[4px] border border-[var(--ty-border-color)] p-4 shadow-2xs">
        <div className="flex items-center space-x-2 text-ty-2xs text-[var(--ty-font-sub-light-color)] mb-1">
          <span>相似度配置</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-[var(--ty-font-main-color)] font-medium">变更记录</span>
        </div>
        <h1 className="text-ty-lg font-bold text-[var(--ty-font-main-color)] tracking-tight">配置变更审计历史</h1>
        <p className="text-ty-xs text-[var(--ty-font-sub-color)] mt-0.5">
          追溯各对象类型下 Manticore 属性相似度配置的保存、启用、停用及完整性校验审计日志。
        </p>
      </div>

      {/* Filters bar */}
      <div className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-[4px] p-3 shadow-2xs flex flex-wrap items-center gap-4">
        <div className="flex items-center space-x-2">
          <span className="text-ty-xs font-semibold text-[var(--ty-font-sub-color)]">对象类型:</span>
          <select
            value={filterObjectType}
            onChange={(e) => setFilterObjectType(e.target.value)}
            className="text-ty-xs h-8 border border-[var(--ty-border-color)] rounded-[4px] px-2.5 bg-[var(--ty-fill-white-color)] text-[var(--ty-font-main-color)] outline-hidden font-medium cursor-pointer focus:border-[var(--ty-primary-color)]"
          >
            <option value="ALL">全部类型</option>
            <option value="PART_MECHANICAL">机械零件</option>
            <option value="PART_ELECTRICAL">电气元器件</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-ty-xs font-semibold text-[var(--ty-font-sub-color)]">操作类型:</span>
          <select
            value={filterOpType}
            onChange={(e) => setFilterOpType(e.target.value)}
            className="text-ty-xs h-8 border border-[var(--ty-border-color)] rounded-[4px] px-2.5 bg-[var(--ty-fill-white-color)] text-[var(--ty-font-main-color)] outline-hidden font-medium cursor-pointer focus:border-[var(--ty-primary-color)]"
          >
            <option value="ALL">全部操作</option>
            <option value="保存">保存</option>
            <option value="启用">启用</option>
            <option value="停用">停用</option>
          </select>
        </div>

        <div className="text-ty-xs text-[var(--ty-font-sub-light-color)] font-mono ml-auto">
          共 {filteredRecords.length} 条审计记录
        </div>
      </div>

      {/* Change Records Table */}
      <div className="bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-[4px] shadow-2xs overflow-hidden">
        <div className="bg-[var(--ty-fill-weak-dark-color)] px-4 py-2.5 border-b border-[var(--ty-border-color)] flex items-center justify-between">
          <span className="text-ty-xs font-semibold text-[var(--ty-font-main-color)] flex items-center space-x-1.5">
            <History className="w-3.5 h-3.5 text-[var(--ty-primary-color)]" />
            <span>操作变更审计日志 (只读安全审计记录)</span>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-ty-xs">
            <thead>
              <tr className="bg-[var(--ty-fill-weak-dark-color)] border-b border-[var(--ty-border-color)] text-[var(--ty-font-sub-color)] font-semibold">
                <th className="px-4 py-2.5 w-1/6">对象类型</th>
                <th className="px-4 py-2.5 w-24">配置版本</th>
                <th className="px-3 py-2.5 text-center w-20">操作类型</th>
                <th className="px-5 py-2.5">变更摘要</th>
                <th className="px-4 py-2.5 w-40">操作人</th>
                <th className="px-4 py-2.5 w-36">操作时间</th>
                <th className="px-3 py-2.5 text-center w-24">执行结果</th>
                <th className="px-4 py-2.5 w-1/5">失败原因</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--ty-border-light-color)]">
              {filteredRecords.length > 0 ? (
                filteredRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-[var(--ty-fill-weak-dark-color)] transition-colors">
                    {/* Object Type */}
                    <td className="px-4 py-3 font-medium text-[var(--ty-font-main-color)]">
                      {rec.objectType}
                    </td>

                    {/* Config Version */}
                    <td className="px-4 py-3 font-mono font-bold text-[var(--ty-font-main-color)]">
                      {rec.configVersion}
                    </td>

                    {/* Operation Type */}
                    <td className="px-3 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-[2px] text-[10px] font-bold ${
                        rec.operationType === '启用' ? 'bg-[var(--ty-green-light-color)] text-[var(--ty-green-color)] border border-[var(--ty-green-color)]/30' :
                        rec.operationType === '停用' ? 'bg-[var(--ty-fill-color)] text-[var(--ty-font-sub-color)] border border-[var(--ty-border-color)]' :
                        'bg-[var(--ty-primary-lighter-color)]/30 text-[var(--ty-primary-color)] border border-[var(--ty-primary-lighter-color)]'
                      }`}>
                        {rec.operationType}
                      </span>
                    </td>

                    {/* Change Summary */}
                    <td className="px-5 py-3 text-[var(--ty-font-sub-color)] leading-relaxed font-medium text-ty-xs">
                      {rec.summary}
                    </td>

                    {/* Operator */}
                    <td className="px-4 py-3 text-[var(--ty-font-main-color)] whitespace-nowrap font-medium">
                      {rec.operator}
                    </td>

                    {/* Operation Time */}
                    <td className="px-4 py-3 font-mono text-[var(--ty-font-sub-light-color)] whitespace-nowrap text-ty-2xs">
                      {rec.time}
                    </td>

                    {/* Execution Result */}
                    <td className="px-3 py-3 text-center">
                      {rec.result === 'SUCCESS' ? (
                        <span className="text-[var(--ty-green-color)] font-semibold flex items-center justify-center space-x-1 text-ty-xs">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[var(--ty-green-color)]" />
                          <span>成功</span>
                        </span>
                      ) : (
                        <span className="text-[var(--ty-red-color)] font-semibold flex items-center justify-center space-x-1 text-ty-xs">
                          <XCircle className="w-3.5 h-3.5 text-[var(--ty-red-color)]" />
                          <span>失败</span>
                        </span>
                      )}
                    </td>

                    {/* Failure Reason */}
                    <td className="px-4 py-3 text-[var(--ty-font-sub-color)] leading-normal">
                      {rec.failureReason ? (
                        <span className="text-[var(--ty-red-color)] font-medium text-ty-2xs bg-[var(--ty-red-light-color)] px-2 py-1 rounded-[2px] border border-[var(--ty-red-color)]/30 block">
                          {rec.failureReason}
                        </span>
                      ) : (
                        <span className="text-[var(--ty-font-sub-light-color)] font-mono">-</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-[var(--ty-font-sub-light-color)]">
                    暂无符合条件的变更记录。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
