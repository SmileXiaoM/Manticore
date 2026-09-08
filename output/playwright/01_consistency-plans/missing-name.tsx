// 仅浏览器验证用：通过组件现有 props 注入缺失显示名和对象级错误，不修改正式字段数据。
import React from 'react';
import { createRoot } from 'react-dom/client';
import { DataConsistencyCheckView } from '../../../src/components/DataConsistencyCheckView';
import { initialFieldMappings } from '../../../src/stage1MappingData';
import '../../../src/index.css';
import '../../../src/components/data-consistency-check.css';
const fieldMappings = structuredClone(initialFieldMappings);
for (const field of fieldMappings.PART) {
  if (['iba_part_number', 'iba_part_name'].includes(field.sourceFieldKey)) field.sourceDisplayName = '  ';
}
createRoot(document.getElementById('root')!).render(<DataConsistencyCheckView fieldMappings={fieldMappings} batches={undefined} runOptions={{ objectErrorIds: ['P-BROKEN'] }} />);
