import React from 'react';
import { AttributeTypeItem } from '../types';
import { attributeTypes } from '../data';
import { BookOpen, Table, FileSpreadsheet, ArrowLeftRight } from 'lucide-react';

interface AttributeTypesViewProps {
  onBackToApp?: () => void;
}

export const AttributeTypesView: React.FC<AttributeTypesViewProps> = ({ onBackToApp }) => {
  return (
    <div className="w-full min-h-screen bg-slate-100 p-8 flex flex-col font-sans">
      
      {/* Non-shell Figma spec heading */}
      <div className="max-w-7xl mx-auto w-full bg-slate-900 text-white rounded-t-xl p-6 shadow-md border border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-amber-500 text-slate-900 p-2 rounded-lg font-bold">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs bg-amber-500/20 text-amber-300 font-sans px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                  设计说明 / 配置对齐说明 / 非产品界面
                </span>
                <span className="text-xs text-slate-400 font-mono">Frame 10 / 13</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight mt-1">物料通用属性对应数据类型及配置组件清单</h1>
            </div>
          </div>
          
          {/* Back to app action if provided */}
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
          用于指导 Figma 团队建立底层字段组件、查询接口映射及标准化能力的数据规范定义页。
          在此详细梳理不同属性类型对应在 Manticore 全文检索、二阶段评分时的候选能力，是系统底层的逻辑元数据基石。
        </p>
      </div>

      {/* Main specification content */}
      <div className="max-w-7xl mx-auto w-full bg-white border border-slate-200 p-6 shadow-sm rounded-b-xl space-y-6 flex-1">
        
        {/* Typology explanation legends */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
          <div className="text-xs">
            <span className="font-bold text-slate-800 block mb-1">📐 支持属性类型</span>
            <span className="text-slate-500 text-xs leading-relaxed block">
              涵盖 PLM 全域的 <strong>TEXT, LONG_TEXT, NUMBER, DATE, ENUM, BOOLEAN, CLASS_TREE, OBJECT_REF</strong>。
            </span>
          </div>
          <div className="text-xs">
            <span className="font-bold text-slate-800 block mb-1">⚙️ 配置侧组件</span>
            <span className="text-slate-500 text-xs leading-relaxed block">
              管理端录入规范，指导表单生成：<strong>TextArea, Select, MultiSelect, NumberInput, DatePicker, ObjectPicker</strong> 等。
            </span>
          </div>
          <div className="text-xs">
            <span className="font-bold text-slate-800 block mb-1">🔍 检索侧组件</span>
            <span className="text-slate-500 text-xs leading-relaxed block">
              客户端或预览页的查询控件：如带容差(+/- Tol)的数值检索、层级树选择器、单/多选枚举。
            </span>
          </div>
          <div className="text-xs">
            <span className="font-bold text-slate-800 block mb-1">⚡ 可选匹配方式</span>
            <span className="text-slate-500 text-xs leading-relaxed block">
              Manticore 引擎底层可选的相似算法：包含 <strong>TF-IDF, Cosine 向量, 双向容差, 层级衰减</strong>。
            </span>
          </div>
        </div>

        {/* Detailed High-Density specification grid */}
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold">
                <th className="px-4 py-3 border-r border-slate-200">对象大类</th>
                <th className="px-4 py-3 border-r border-slate-200">属性中文名称</th>
                <th className="px-4 py-3 border-r border-slate-200">标准属性编码</th>
                <th className="px-4 py-3 border-r border-slate-200">属性数据类型</th>
                <th className="px-4 py-3 border-r border-slate-200">管理端配置组件</th>
                <th className="px-4 py-3 border-r border-slate-200">查询端搜索组件</th>
                <th className="px-3 py-3 text-center border-r border-slate-200">是否枚举</th>
                <th className="px-4 py-3 border-r border-slate-200">可选二阶段匹配算法 (Manticore)</th>
                <th className="px-4 py-3 border-r border-slate-200">可选标准化 / 归一化策略</th>
                <th className="px-4 py-3">字段属性含义及设计指导说明</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-sans">
              {attributeTypes.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50">
                  {/* Object Type */}
                  <td className="px-4 py-3 border-r border-slate-200 font-semibold text-slate-800 whitespace-nowrap">
                    {item.objectType}
                  </td>

                  {/* Property Name */}
                  <td className="px-4 py-3 border-r border-slate-200 font-bold text-slate-900 whitespace-nowrap">
                    {item.propertyName}
                  </td>

                  {/* Property Code */}
                  <td className="px-4 py-3 border-r border-slate-200 font-mono text-slate-700 whitespace-nowrap">
                    {item.propertyCode}
                  </td>

                  {/* Physical Type */}
                  <td className="px-4 py-3 border-r border-slate-200 whitespace-nowrap">
                    <span className="font-mono bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200 font-semibold">
                      {item.dataType}
                    </span>
                  </td>

                  {/* Config Component */}
                  <td className="px-4 py-3 border-r border-slate-200 text-slate-600 whitespace-nowrap font-mono">
                    {item.configComponent}
                  </td>

                  {/* Query Component */}
                  <td className="px-4 py-3 border-r border-slate-200 text-slate-600 whitespace-nowrap font-mono">
                    {item.queryComponent}
                  </td>

                  {/* Is Enum */}
                  <td className="px-3 py-3 text-center border-r border-slate-200 font-mono">
                    {item.isEnum ? (
                      <span className="text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">YES</span>
                    ) : (
                      <span className="text-slate-400">NO</span>
                    )}
                  </td>

                  {/* Match types */}
                  <td className="px-4 py-3 border-r border-slate-200 max-w-[200px]">
                    <div className="flex flex-col space-y-1">
                      {item.optionalMatchTypes.map((t, idx) => (
                        <span key={idx} className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-xs border border-blue-100 block font-mono">
                          • {t}
                        </span>
                      ))}
                    </div>
                  </td>

                  {/* Standardization */}
                  <td className="px-4 py-3 border-r border-slate-200 max-w-[180px]">
                    <div className="flex flex-col space-y-1">
                      {item.optionalStandardization.map((s, idx) => (
                        <span key={idx} className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded text-xs border border-purple-100 block font-mono">
                          • {s}
                        </span>
                      ))}
                    </div>
                  </td>

                  {/* Description */}
                  <td className="px-4 py-3 text-slate-500 max-w-[280px] leading-relaxed">
                    {item.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Visual spec checklist footer */}
        <div className="border-t border-slate-200 pt-5 flex flex-col md:flex-row items-center justify-between text-xs text-slate-500">
          <span>PLM / Manticore 二阶段相似度匹配底层模型规范. 最终交付：工艺数据 management 办公室</span>
          <span className="text-slate-400">最后更新: 2026-07-06 20:00:00</span>
        </div>

      </div>

    </div>
  );
};
