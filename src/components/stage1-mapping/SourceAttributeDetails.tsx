import React from 'react';
import { SourceFieldMeta } from '../../stage1MappingTypes';
import './source-attribute-details.css';

const kindLabels = { HARD: '硬属性', EXTENDED: '扩展属性', VIRTUAL: '虚拟属性' };

export function SourceAttributeDetails({ meta, compact = false }: { meta: SourceFieldMeta; compact?: boolean }) {
  const enumDefined = meta.hasEnumDefinition ??
    (meta.enumDefinition || (meta.enumOptions?.length ?? 0) > 0 ? true : undefined);
  const tables = meta.sourceTables === undefined
    ? '未返回'
    : meta.sourceTables.length ? meta.sourceTables.join('、') : '无直接来源表';
  const kind = meta.attributeKind ? kindLabels[meta.attributeKind] || '类别未返回' : '类别未返回';
  return (
    <div className={`source-attribute-details${compact ? ' source-attribute-details--compact' : ''}`}>
      {meta.isExampleMetadata && !compact && <span className="source-attribute-example">示例元数据</span>}
      {compact ? <>
        <p><span className="source-attribute-label">{tables}</span></p>
        <p>{kind} · {meta.isMultiValue === undefined ? '多值状态未返回' : meta.isMultiValue ? '多值' : '单值'} · {enumDefined === undefined ? '枚举未返回' : enumDefined ? `有枚举${meta.enumOptions?.length ? ` ${meta.enumOptions.length} 项` : ''}` : '无枚举'}</p>
      </> : <dl>
        <div className="source-attribute-table"><dt>来源表</dt><dd>{tables}</dd></div>
        <div><dt>属性类别</dt><dd>{meta.attributeKind ? kindLabels[meta.attributeKind] || '未返回' : '未返回'}</dd></div>
        <div><dt>是否多值</dt><dd>{meta.isMultiValue === undefined ? '未返回' : meta.isMultiValue ? '是' : '否'}</dd></div>
        <div><dt>枚举定义</dt><dd>{enumDefined === undefined ? '未返回' : enumDefined ? '有' : '无'}</dd></div>
      </dl>}
      {enumDefined && !compact && (
        <details onClick={event => event.stopPropagation()}>
          <summary>{compact ? '有枚举 · 查看定义' : '查看枚举定义'}</summary>
          {meta.enumDefinition && <p>{meta.enumDefinition.name || '枚举名称未返回'} <code>{meta.enumDefinition.code}</code></p>}
          {meta.enumOptions?.length ? (
            <div className="source-enum-options">
              <p>已返回 {meta.enumOptions.length} 项</p>
              <table aria-label="枚举编码与名称">
                <thead><tr><th>编码</th><th>名称</th></tr></thead>
                <tbody>{meta.enumOptions.map((option, index) => <tr key={`${option.code}-${index}`}><td><code>{option.code}</code></td><td>{option.label || '未返回'}</td></tr>)}</tbody>
              </table>
            </div>
          ) : <p>枚举选项未返回</p>}
        </details>
      )}
    </div>
  );
}
