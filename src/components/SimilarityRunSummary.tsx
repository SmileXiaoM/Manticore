import type { SearchRunResult } from '../types';
import { HelpTooltip } from './ui/HelpTooltip';

interface SimilarityRunSummaryProps {
  result: SearchRunResult;
  className?: string;
}

export function SimilarityRunSummary({ result, className = '' }: SimilarityRunSummaryProps) {
  const returnedCount = result.returnedCount ?? result.scoredCandidates.length;
  const scoredCount = result.scoredCount ?? result.scoredCandidates.length;
  const excludedCount = result.excludedCandidates.length;
  const candidateCount = result.candidateCount ?? scoredCount + excludedCount;
  const topK = result.topK ?? 200;

  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-ty-2xs text-[var(--ty-font-sub-color)] ${className}`.trim()}>
      <span>候选数据：<strong className="font-mono text-[var(--ty-font-main-color)]">{candidateCount}</strong> 条</span>
      <span>完成评分：<strong className="font-mono text-[var(--ty-font-main-color)]">{scoredCount}</strong> 条</span>
      <span>排除候选：<strong className="font-mono text-[var(--ty-font-main-color)]">{excludedCount}</strong> 条</span>
      <span>返回结果：<strong className="font-mono text-[var(--ty-primary-color)]">前 {topK} 条</strong></span>
      <HelpTooltip
        label="查看查询返回规则"
        content="候选按当前数据权限获得，完成字段匹配、排除与评分后按未舍入得分降序稳定排序，再截取 TopK，最后才分页展示。TopK 不等于每页显示数量。"
      />
    </div>
  );
}
