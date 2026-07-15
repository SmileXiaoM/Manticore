import React from 'react';
import { AttributeEnumItem } from '../types';
import { attributeEnums } from '../data';
import { BookOpen, AlertCircle, FileSpreadsheet, Layers } from 'lucide-react';

interface AttributeEnumsViewProps {
  onBackToApp?: () => void;
}

export const AttributeEnumsView: React.FC<AttributeEnumsViewProps> = ({ onBackToApp }) => {
  return (
    <div className="w-full min-h-screen bg-slate-100 p-8 flex flex-col font-sans">
      
      {/* Figma design header frame */}
      <div className="max-w-7xl mx-auto w-full bg-slate-900 text-white rounded-t-xl p-6 shadow-md border border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-purple-500 text-slate-900 p-2 rounded-lg font-bold">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs bg-purple-500/20 text-purple-300 font-sans px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                  设计说明 / 配置对齐说明 / 非产品界面
                </span>
                <span className="text-xs text-slate-400 font-mono">Frame 11 / 13</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight mt-1">受控枚举属性值字典对齐及归一清单</h1>
            </div>
          </div>
          
          {/* Back Action */}
          {onBackToApp && (
            <button
              onClick={onBackToApp}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold shadow-xs transition-colors"
            >
              ← 返回 PLM 管理台原型
            </button>
          )}
        </div>
        
        <p className="text-slate-300 text-xs mt-3 leading-relaxed max-w-4xl">
          针对所有枚举类型属性（如主要材质、生命周期状态、基本计量单位、表面处理、来源系统等），梳理在 Manticore 二阶段匹配中
          可接纳的全部异构原始值、对应的官方归一标准值、同义词别名。通过此页清晰区分工艺已发布词典和待业务部门最终确认的草案（如表面处理方式）。
        </p>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto w-full bg-white border border-slate-200 p-6 shadow-sm rounded-b-xl space-y-6 flex-1">
        
        {/* Warning Callout Box for Business Confirmation */}
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-xs text-amber-800 space-y-1">
            <span className="font-bold block text-sm">工艺数据安全警示：含有“待业务确认”草案数据</span>
            <p className="leading-relaxed">
              部分复杂属性（如 <strong>表面处理方式 (surface_treatment)</strong> ）的枚举收敛值由于涉及多个老旧子工厂图纸历史习惯，当前列出的数据仅供技术对接与测试，并已明确标注
              <strong className="text-amber-700 underline mx-1">“待业务确认”</strong>。在主数据办公室审核会签前，<strong>切勿</strong>将本页涉及的临时映射伪造为线上最终真实数据进行数据库注入！
            </p>
          </div>
        </div>

        {/* List of Enums Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold">
                <th className="px-4 py-3 border-r border-slate-200">对象类型</th>
                <th className="px-4 py-3 border-r border-slate-200">属性名称</th>
                <th className="px-4 py-3 border-r border-slate-200">属性编码</th>
                <th className="px-4 py-3 border-r border-slate-200">数据源字典来源</th>
                <th className="px-4 py-3 border-r border-slate-200">原始枚举码值 (Code)</th>
                <th className="px-4 py-3 border-r border-slate-200">物料俗称/枚举显示名</th>
                <th className="px-4 py-3 border-r border-slate-200">归一化后标准值 (Standardized)</th>
                <th className="px-4 py-3 border-r border-slate-200">同义词 / 别名气泡集</th>
                <th className="px-3 py-3 text-center border-r border-slate-200">参与相似计算</th>
                <th className="px-4 py-3 border-r border-slate-200 text-center">状态说明</th>
                <th className="px-4 py-3">字段属性含义说明</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-sans">
              {attributeEnums.map((eItem) => (
                <tr key={eItem.id} className="hover:bg-slate-50/50">
                  {/* Object Type */}
                  <td className="px-4 py-3 border-r border-slate-200 font-medium text-slate-700 whitespace-nowrap">
                    {eItem.objectType}
                  </td>

                  {/* Property Name */}
                  <td className="px-4 py-3 border-r border-slate-200 font-bold text-slate-900 whitespace-nowrap">
                    {eItem.propertyName}
                  </td>

                  {/* Property Code */}
                  <td className="px-4 py-3 border-r border-slate-200 font-mono text-slate-700 whitespace-nowrap">
                    {eItem.propertyCode}
                  </td>

                  {/* Source */}
                  <td className="px-4 py-3 border-r border-slate-200 text-slate-500 max-w-[150px] truncate" title={eItem.enumSource}>
                    {eItem.enumSource}
                  </td>

                  {/* Code */}
                  <td className="px-4 py-3 border-r border-slate-200 font-mono text-indigo-700 font-semibold whitespace-nowrap">
                    {eItem.enumValueCode}
                  </td>

                  {/* Display Name */}
                  <td className="px-4 py-3 border-r border-slate-200 font-semibold text-slate-800 whitespace-nowrap">
                    {eItem.enumDisplayName}
                  </td>

                  {/* Standardized Value */}
                  <td className="px-4 py-3 border-r border-slate-200 text-emerald-800 font-bold font-mono whitespace-nowrap">
                    {eItem.status === 'UNCONFIRMED' ? (
                      <span className="text-amber-600 font-semibold italic">待工艺业务会签确认</span>
                    ) : (
                      eItem.standardValue
                    )}
                  </td>

                  {/* Synonyms list as tags */}
                  <td className="px-4 py-3 border-r border-slate-200 max-w-[200px]">
                    <div className="flex flex-wrap gap-1">
                      {eItem.synonyms.map((tag, sIdx) => (
                        <span key={sIdx} className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-xs border border-slate-200 font-mono">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>

                  {/* Is similarity active */}
                  <td className="px-3 py-3 text-center border-r border-slate-200 font-mono whitespace-nowrap">
                    {eItem.isSimilarityActive ? (
                      <span className="text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">YES</span>
                    ) : (
                      <span className="text-slate-300">--</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 border-r border-slate-200 text-center whitespace-nowrap">
                    {eItem.status === 'ACTIVE' ? (
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-medium">
                        已启用
                      </span>
                    ) : (
                      <span className="bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded font-bold animate-pulse">
                        待业务确认
                      </span>
                    )}
                  </td>

                  {/* Description */}
                  <td className="px-4 py-3 text-slate-500 leading-relaxed max-w-[200px]">
                    {eItem.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Document Footer */}
        <div className="border-t border-slate-200 pt-5 flex flex-col md:flex-row items-center justify-between text-xs text-slate-500">
          <span>PLM / Manticore 数据字典收敛图. 所有不规则俗称需经过 MAP / REGEX 二重转换</span>
          <span className="text-slate-400 font-mono">MDM_DI_MAPPING v3.4.0</span>
        </div>

      </div>

    </div>
  );
};
