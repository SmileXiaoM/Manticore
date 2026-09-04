import { FieldMappingItem } from './stage1MappingTypes';

export type HyperlinkResolution =
  | { type: 'TEXT'; text: string }
  | { type: 'DISABLED_LINK'; text: string; reason: string }
  | { type: 'LINK'; text: string; url: string; target: '_blank' | '_self' }
  | { type: 'HIDE_COLUMN'; text: string };

/**
 * 健壮地从单条记录中获取指定属性值 (兼容下划线、驼峰与大小写)
 */
export function getRecordValueByKey(record: Record<string, any>, key?: string): string | null {
  if (!record || !key) return null;

  const rawKey = key.trim();
  if (!rawKey) return null;

  // 1. 精确匹配
  if (record[rawKey] !== undefined && record[rawKey] !== null) {
    const val = String(record[rawKey]).trim();
    if (val !== '' && val !== 'undefined' && val !== 'null') {
      return val;
    }
  }

  // 2. 蛇形 -> 驼峰 (如 master_oid -> masterOid)
  const camelKey = rawKey.replace(/_([a-z0-9])/g, (_, l) => l.toUpperCase());
  if (camelKey !== rawKey && record[camelKey] !== undefined && record[camelKey] !== null) {
    const val = String(record[camelKey]).trim();
    if (val !== '' && val !== 'undefined' && val !== 'null') {
      return val;
    }
  }

  // 3. 驼峰 -> 蛇形 (如 masterOid -> master_oid)
  const snakeKey = rawKey.replace(/([A-Z])/g, '_$1').toLowerCase();
  if (snakeKey !== rawKey && record[snakeKey] !== undefined && record[snakeKey] !== null) {
    const val = String(record[snakeKey]).trim();
    if (val !== '' && val !== 'undefined' && val !== 'null') {
      return val;
    }
  }

  // 4. 忽略大小写及下划线模糊匹配
  const cleanTarget = rawKey.toLowerCase().replace(/_/g, '');
  for (const objKey of Object.keys(record)) {
    if (objKey.toLowerCase().replace(/_/g, '') === cleanTarget) {
      if (record[objKey] !== undefined && record[objKey] !== null) {
        const val = String(record[objKey]).trim();
        if (val !== '' && val !== 'undefined' && val !== 'null') {
          return val;
        }
      }
    }
  }

  return null;
}

/**
 * 从记录中获取字段的原始单元格文本展示值
 */
export function getFieldCellDisplayValue(field: FieldMappingItem, record: Record<string, any>): string {
  if (!record) return '-';

  // 1. 尝试 manticoreField (蛇形或驼峰)
  const mfVal = getRecordValueByKey(record, field.manticoreField);
  if (mfVal !== null) return mfVal;

  // 2. 尝试 PLM 源字段名 sourceFieldName
  const sfVal = getRecordValueByKey(record, field.sourceFieldName);
  if (sfVal !== null) return sfVal;

  // 3. 尝试 PLM 源字段 key sourceFieldKey
  const skVal = getRecordValueByKey(record, field.sourceFieldKey);
  if (skVal !== null) return skVal;

  // 4. 针对特殊物理字段的带单位兜底
  if (field.manticoreField.includes('nominal_diameter') && record.nominalDiameter) {
    return `${record.nominalDiameter} mm`;
  }
  if (field.manticoreField.includes('voltage') && record.ratedVoltage) {
    return `${record.ratedVoltage} V`;
  }
  if (field.manticoreField.includes('capacitance') && record.capacitance) {
    return `${record.capacitance} uF`;
  }

  return '-';
}

/**
 * 统一判定字段是否具备真正有效的超链接配置：
 * 必须同时满足以下 5 项条件：
 * 1. 字段允许在结果中展示 (isDisplayInResult 为 true)；
 * 2. 已启用超链接 (displayType === 'LINK')；
 * 3. 存在 hyperlinkConfig 配置对象；
 * 4. urlTemplate 非空；
 * 5. 模板所需的 {oid}、{otype} 来源字段配置完整：
 *    - 若模板包含 {oid}，oidSourceField 必须非空；
 *    - 若模板包含 {otype}，otypeSourceField 必须非空。
 *
 * 【重要隔离原则】：
 * 严格只读取当前已生效字段上的正式值，严禁从草稿 draftData 读取，
 * 确保已配置字段在保存草稿尚未生效前，绝不影响正式底座预览与生效状态！
 */
export function isFieldHyperlinkValid(field: FieldMappingItem): boolean {
  if (!field) return false;

  // 1. 必须允许在结果中展示
  if (!field.isDisplayInResult) return false;

  // 2. 必须已启用超链接
  if (field.displayType !== 'LINK') return false;

  // 3. 必须存在超链接配置对象
  if (!field.hyperlinkConfig) return false;

  // 4. urlTemplate 非空
  const template = field.hyperlinkConfig.urlTemplate?.trim();
  if (!template) return false;

  // 5. 模板所需的 {oid}、{otype} 来源字段配置完整
  if (template.includes('{oid}') && !field.hyperlinkConfig.oidSourceField?.trim()) {
    return false;
  }
  if (template.includes('{otype}') && !field.hyperlinkConfig.otypeSourceField?.trim()) {
    return false;
  }

  return true;
}

/**
 * 判定单条记录对于某个启用超链接的字段是否缺少必要替换参数
 * 仅对有效超链接配置进行检查，只读取正式生效配置
 */
export function isFieldHyperlinkParamMissing(
  field: FieldMappingItem,
  record: Record<string, any>
): boolean {
  if (!isFieldHyperlinkValid(field)) return false;

  const config = field.hyperlinkConfig!;
  const template = config.urlTemplate.trim();

  // 检查 {oid}
  if (template.includes('{oid}')) {
    const oidVal = getRecordValueByKey(record, config.oidSourceField);
    if (!oidVal) return true;
  }

  // 检查 {otype}
  if (template.includes('{otype}')) {
    const otypeVal = getRecordValueByKey(record, config.otypeSourceField);
    if (!otypeVal) return true;
  }

  return false;
}

/**
 * 检查字段是否因为缺参策略设定为 HIDE_ENTIRE_COLUMN 而应该整列隐藏
 * 规则：
 * 1. 字段必须具备有效超链接配置；
 * 2. 缺参策略为 HIDE_ENTIRE_COLUMN；
 * 3. 记录集存在缺参（或记录为空），则整列不进入正式结果表格。
 * 【隔离原则】：严格只读正式生效配置，严禁从 draftData 读取。
 */
export function isFieldColumnHiddenByMissingParam(
  field: FieldMappingItem,
  records: Record<string, any>[]
): boolean {
  if (!isFieldHyperlinkValid(field)) return false;

  const config = field.hyperlinkConfig!;
  if (config.onMissingParam !== 'HIDE_ENTIRE_COLUMN') {
    return false;
  }

  // 若无记录或记录中存在缺参记录，则触发整列隐藏
  if (!records || records.length === 0) {
    return true;
  }

  return records.some(rec => isFieldHyperlinkParamMissing(field, rec));
}

/**
 * 统一超链接解析函数：根据字段正式生效配置与当前记录，计算最终展示形式 (超链接、纯文本、置灰禁用链接或隐藏列)
 * 【隔离原则】：严格只读正式生效配置，严禁从 draftData 读取。
 */
export function resolveFieldHyperlink(
  field: FieldMappingItem,
  record: Record<string, any>
): HyperlinkResolution {
  const cellVal = getFieldCellDisplayValue(field, record);

  // 1. 若不满足有效超链接配置判定，始终按普通文本展示
  if (!isFieldHyperlinkValid(field)) {
    return {
      type: 'TEXT',
      text: cellVal
    };
  }

  const config = field.hyperlinkConfig!;
  const displayText =
    config.displayTextSource === 'STATIC_TEXT' && config.staticLabel?.trim()
      ? config.staticLabel.trim()
      : cellVal;

  const template = config.urlTemplate.trim();
  const onMissing = config.onMissingParam || 'HIDE_LINK_SHOW_TEXT';

  // 2. 解析并替换 {oid} 与 {otype}，严格使用 encodeURIComponent 进行 URL 编码
  let finalUrl = template;
  let hasMissingParam = false;
  let missingReason = '';

  if (template.includes('{oid}')) {
    const oidVal = getRecordValueByKey(record, config.oidSourceField);
    if (!oidVal) {
      hasMissingParam = true;
      missingReason = `缺少 OID 源字段 [${config.oidSourceField}] 取值`;
    } else {
      finalUrl = finalUrl.split('{oid}').join(encodeURIComponent(oidVal));
    }
  }

  if (template.includes('{otype}')) {
    const otypeVal = getRecordValueByKey(record, config.otypeSourceField);
    if (!otypeVal) {
      hasMissingParam = true;
      missingReason = missingReason
        ? `${missingReason}, 缺少 OTYPE 源字段 [${config.otypeSourceField}] 取值`
        : `缺少 OTYPE 源字段 [${config.otypeSourceField}] 取值`;
    } else {
      finalUrl = finalUrl.split('{otype}').join(encodeURIComponent(otypeVal));
    }
  }

  // 3. 防御性检查：生成的 URL 绝不可包含 'undefined' 或 'null' 或残留未解析的占位符
  if (
    finalUrl.includes('undefined') ||
    finalUrl.includes('null') ||
    finalUrl.includes('{')
  ) {
    hasMissingParam = true;
    missingReason = missingReason || 'URL 模板包含未解析的占位符或无效参数';
  }

  // 4. 缺参策略处理
  if (hasMissingParam) {
    if (onMissing === 'HIDE_ENTIRE_COLUMN') {
      return { type: 'HIDE_COLUMN', text: cellVal };
    }
    if (onMissing === 'SHOW_DISABLED_LINK') {
      return {
        type: 'DISABLED_LINK',
        text: displayText,
        reason: missingReason
      };
    }
    // HIDE_LINK_SHOW_TEXT：只展示普通文本
    return {
      type: 'TEXT',
      text: cellVal
    };
  }

  // 5. 参数完整：返回真实超链接与配置的打开方式 (不得固定为 _blank)
  const openTarget = config.openTarget === '_self' ? '_self' : '_blank';

  return {
    type: 'LINK',
    text: displayText,
    url: finalUrl,
    target: openTarget
  };
}
