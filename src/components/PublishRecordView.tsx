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

interface ChangeRecord {
  id: string;
  objectType: string;
  configVersion: string;
  operationType: '保存' | '启用' | '停用';
  summary: string;
  operator: string;
  time: string;
  result: 'SUCCESS' | 'FAILED';
  failureReason?: string;
}

export const PublishRecordView: React.FC = () => {
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

  const [filterObjectType, setFilterObjectType] = useState<string>('ALL');
  const [filterOpType, setFilterOpType] = useState<string>('ALL');

  const filteredRecords = changeRecords.filter(r => {
    const matchType = filterObjectType === 'ALL' || r.objectType.includes(filterObjectType);
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
            追溯各对象类型下 Manticore 二阶段相似度配置的保存、启用、停用及完整性校验审计日志。
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
