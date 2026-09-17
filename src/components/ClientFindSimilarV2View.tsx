import React, { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Download,
  Eye,
  FileCheck2,
  Filter,
  Grid2X2,
  ImageOff,
  Layers3,
  List,
  Package,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  convertFromBaseUnit,
  convertToBaseUnit,
  mockFormBaselines,
  mockPartDatabase,
  parseSimilarityRuleScopeKey,
  resolveSimilarityRuleScope,
  runSimilaritySearch,
  similarityClassificationOptions,
  softTypeOptions,
} from "../data";
import {
  CompareFieldResult,
  FieldSimilarityRule,
  ReferenceObject,
  ScoredCandidate,
  SearchRunResult,
  SimilarityBaseline,
  SimilarityGroupConfigStatus,
  SimilarityRuntimeConfig,
  SimilarityTierConfigMap,
} from "../types";
import { getSimilarityTierConfig } from "../similarityTier";
import { useFeedback } from "./ui/FeedbackProvider";
import { TablePagination } from "./ui/TablePagination";
import { HelpTooltip } from "./ui/HelpTooltip";
import { SimilarityRunSummary } from "./SimilarityRunSummary";

interface ClientFindSimilarV2ViewProps {
  rules: FieldSimilarityRule[];
  objectConfigStatus: Record<string, SimilarityGroupConfigStatus>;
  tierConfigs: SimilarityTierConfigMap;
  runtimeConfig: SimilarityRuntimeConfig;
}
type ViewMode = "LIST" | "GRID";
type QueryMode = "EXISTING_PART" | "CONDITIONS";
type FacetKind = "VALUE" | "NUMBER";
type NumericRange = { from: string; to: string };
type FacetDefinition = {
  fieldKey: string;
  label: string;
  rule: FieldSimilarityRule;
  kind: FacetKind;
  unit?: string;
  referenceNumber?: number;
};
type FacetOption = { value: string; count: number };
type SearchRequest = { baseline: SimilarityBaseline; scopeKey: string };
type ResultAttribute = {
  fieldKey: string;
  label: string;
  rule: FieldSimilarityRule;
};

const EMPTY_VALUE_FILTERS: Record<string, string[]> = {};
const EMPTY_NUMERIC_FILTERS: Record<string, NumericRange> = {};
const VIEW_MODE_STORAGE_KEY =
  "manticore.user.xiaohua.application-similarity.v2.view-mode";
const formatNumber = (value: number) =>
  Number.isInteger(value) ? String(value) : String(Number(value.toFixed(4)));
const isNumericRule = (rule: FieldSimilarityRule) =>
  rule.fieldType.includes("NUMBER_WITH_UNIT") ||
  /^(int|integer|bigint|float|double|number)$/i.test(rule.fieldType.trim());
const getTypeAttributeName = (scopeKey: string) => {
  const typeId = parseSimilarityRuleScopeKey(scopeKey).typeId;
  return softTypeOptions.find((option) => option.id === typeId)?.name || typeId;
};
const getCandidateRawValue = (candidate: ScoredCandidate, fieldKey: string) =>
  candidate.customAttributes?.[fieldKey] ??
  candidate.compareFields.find((field) => field.fieldKey === fieldKey)
    ?.candidateValue;
const getDisplayUnit = (
  rule: FieldSimilarityRule,
  units?: Record<string, string>,
) =>
  rule.displayUnit && rule.displayUnit !== "无"
    ? rule.displayUnit
    : units?.[rule.propertyCode];
const normalizeNumberForDisplay = (
  raw: unknown,
  units: Record<string, string> | undefined,
  rule: FieldSimilarityRule,
) => {
  const value = Number(raw);
  if (!Number.isFinite(value)) return null;
  const originalUnit = units?.[rule.propertyCode];
  const displayUnit = getDisplayUnit(rule, units);
  if (
    !rule.fieldType.includes("NUMBER_WITH_UNIT") ||
    !originalUnit ||
    !displayUnit ||
    originalUnit === displayUnit
  )
    return value;
  try {
    return convertFromBaseUnit(
      convertToBaseUnit(value, originalUnit, rule.unitFamily || ""),
      displayUnit,
      rule.unitFamily || "",
    );
  } catch {
    return null;
  }
};
const getCandidateNumber = (
  candidate: ScoredCandidate,
  rule: FieldSimilarityRule,
) =>
  normalizeNumberForDisplay(
    getCandidateRawValue(candidate, rule.propertyCode),
    mockPartDatabase.find((part) => part.objectId === candidate.objectId)
      ?.units,
    rule,
  );
const getCandidateText = (
  candidate: ScoredCandidate,
  rule: FieldSimilarityRule,
) => {
  const value =
    candidate.compareFields.find((item) => item.fieldKey === rule.propertyCode)
      ?.candidateValue ?? getCandidateRawValue(candidate, rule.propertyCode);
  return value === undefined || value === null || value === ""
    ? "（缺失）"
    : String(value);
};
const getResultAttributeValue = (
  candidate: ScoredCandidate,
  rule: FieldSimilarityRule,
) => {
  if (!isNumericRule(rule)) return getCandidateText(candidate, rule);
  const value = getCandidateNumber(candidate, rule);
  if (value === null) return "（缺失）";
  const unit = getDisplayUnit(
    rule,
    mockPartDatabase.find((part) => part.objectId === candidate.objectId)
      ?.units,
  );
  return `${formatNumber(value)}${unit ? ` ${unit}` : ""}`;
};
const getReferenceAttributeValue = (
  reference: ReferenceObject,
  rule: FieldSimilarityRule,
) => {
  const raw = reference.attributes[rule.propertyCode];
  if (!isNumericRule(rule)) {
    return raw === undefined || raw === null || raw === ""
      ? "（缺失）"
      : String(raw);
  }
  const value = normalizeNumberForDisplay(raw, reference.units, rule);
  if (value === null) return "（缺失）";
  const unit = getDisplayUnit(rule, reference.units);
  return `${formatNumber(value)}${unit ? ` ${unit}` : ""}`;
};
const formatCompareValue = (value: CompareFieldResult["sourceValue"]) =>
  value === undefined || value === null || value === "" ? "（缺失）" : String(value);
const hasFieldValueDifference = (field: CompareFieldResult) =>
  field.missingSide !== undefined ||
  formatCompareValue(field.sourceValue) !== formatCompareValue(field.candidateValue);
const getFieldDifferenceLabel = (field: CompareFieldResult) => {
  if (field.missingSide === "REFERENCE") return "基准缺失";
  if (field.missingSide === "CANDIDATE") return "候选缺失";
  return hasFieldValueDifference(field) ? "有差异" : "一致";
};
const getFieldDifferenceTone = (field: CompareFieldResult) =>
  hasFieldValueDifference(field)
    ? "bg-[var(--ty-orange-lightest-color)] text-[var(--ty-orange-color)]"
    : "bg-[var(--ty-green-lightest-color)] text-[var(--ty-font-main-light-color)]";
const getFieldScoreLabel = (field: CompareFieldResult) => {
  if (!field.isScoreActive) return "仅展示";
  if (field.missingSide === "CANDIDATE")
    return field.candidateMissingHandling === "SKIP" ? "缺失跳过" : "缺失 0 分";
  if (field.status === "EXCLUDED") return "已排除";
  return `贡献 ${field.weightedScore.toFixed(2)} 分`;
};
const getCandidateMeta = (candidate: ScoredCandidate) => ({
  type: getTypeAttributeName(candidate.softTypeId),
  category:
    candidate.classificationPath.split("/").filter(Boolean).at(-1) || "未分类",
  source: "IntePLM V21",
});
const getInitialViewMode = (): ViewMode => {
  try {
    return window.localStorage.getItem(VIEW_MODE_STORAGE_KEY) === "GRID"
      ? "GRID"
      : "LIST";
  } catch {
    return "LIST";
  }
};

export const ClientFindSimilarV2View: React.FC<
  ClientFindSimilarV2ViewProps
> = ({ rules, objectConfigStatus, tierConfigs, runtimeConfig }) => {
  const { notify } = useFeedback();
  const [queryMode, setQueryMode] = useState<QueryMode>("EXISTING_PART");
  const [referenceInput, setReferenceInput] = useState("PART-2026-000100");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [conditionRootTypeId, setConditionRootTypeId] = useState("PART");
  const [conditionSoftTypeId, setConditionSoftTypeId] = useState("IN_HOUSE");
  const [conditionClassificationPath, setConditionClassificationPath] =
    useState("");
  const [conditionValues, setConditionValues] = useState<
    Record<string, string | number>
  >({});
  const [conditionUnits, setConditionUnits] = useState<Record<string, string>>(
    {},
  );
  const [result, setResult] = useState<SearchRunResult | null>(null);
  const [searchRequest, setSearchRequest] = useState<SearchRequest | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(getInitialViewMode);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [valueFilters, setValueFilters] =
    useState<Record<string, string[]>>(EMPTY_VALUE_FILTERS);
  const [numericFilters, setNumericFilters] = useState<
    Record<string, NumericRange>
  >(EMPTY_NUMERIC_FILTERS);
  const [moreFacetsOpen, setMoreFacetsOpen] = useState(false);
  const [moreFacetSearch, setMoreFacetSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [preview, setPreview] = useState<ScoredCandidate | null>(null);
  const [compareCandidates, setCompareCandidates] = useState<
    ScoredCandidate[]
  >([]);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [isFormEntryOpen, setIsFormEntryOpen] = useState(false);
  const [formEntryId, setFormEntryId] = useState("FORM-001");

  const resetResultControls = () => {
    setPreview(null);
    setCompareCandidates([]);
    setIsCompareOpen(false);
    setValueFilters(EMPTY_VALUE_FILTERS);
    setNumericFilters(EMPTY_NUMERIC_FILTERS);
    setMoreFacetsOpen(false);
    setMoreFacetSearch("");
    setPage(1);
  };
  const executeSearch = (baseline: SimilarityBaseline, scopeKey: string) => {
    resetResultControls();
    setSearchRequest({ baseline, scopeKey });
  };
  const getExistingScope = (partId: string) => {
    const part = mockPartDatabase.find(
      (item) =>
        item.objectId.toUpperCase() === partId.trim().toUpperCase() ||
        item.requestCode.toUpperCase() === partId.trim().toUpperCase(),
    );
    if (!part)
      return { part: null, scope: null, error: "未找到该已有零部件。" };
    const scope = resolveSimilarityRuleScope(
      part.softTypeId,
      part.classificationPath,
      rules,
      objectConfigStatus,
    );
    return {
      part,
      scope,
      error: scope
        ? ""
        : "当前类型属性值及所属分类没有已启用的有效规则。",
    };
  };
  const handleExistingSearch = (id = referenceInput) => {
    const resolved = getExistingScope(id);
    if (!resolved.part || !resolved.scope) {
      setResult({
        reference: resolved.part,
        baselineType: "EXISTING_PART",
        scoredCandidates: [],
        excludedCandidates: [],
        errorCode: resolved.part ? "NO_RULES" : "REFERENCE_NOT_FOUND",
        errorMessage: resolved.error,
      });
      resetResultControls();
      return;
    }
    setReferenceInput(resolved.part.objectId);
    setSuggestionsOpen(false);
    executeSearch(
      { type: "EXISTING_PART", objectId: resolved.part.objectId },
      resolved.scope.scopeKey,
    );
  };

  const conditionClassifications = useMemo(
    () =>
      similarityClassificationOptions.filter(
        (option) => option.typeId === conditionSoftTypeId,
      ),
    [conditionSoftTypeId],
  );
  const conditionScope = useMemo(
    () =>
      resolveSimilarityRuleScope(
        conditionSoftTypeId,
        conditionClassificationPath,
        rules,
        objectConfigStatus,
      ),
    [
      conditionSoftTypeId,
      conditionClassificationPath,
      rules,
      objectConfigStatus,
    ],
  );
  const conditionRules = useMemo(
    () =>
      rules.filter(
        (rule) =>
          rule.rootTypeId === conditionRootTypeId &&
          rule.softTypeId === conditionScope?.scopeKey &&
          rule.enabled &&
          rule.isAppEndActive &&
          rule.isScoreActive,
      ),
    [rules, conditionRootTypeId, conditionScope],
  );
  const setConditionSoftType = (nextSoftTypeId: string) => {
    setConditionSoftTypeId(nextSoftTypeId);
    setConditionClassificationPath("");
    setConditionValues({});
    setConditionUnits({});
  };
  const handleConditionClassification = (nextPath: string) => {
    setConditionClassificationPath(nextPath);
    setConditionValues((previous) => ({
      ...previous,
      category_path: nextPath,
    }));
  };
  const getConditionEnumOptions = (rule: FieldSimilarityRule) =>
    [
      ...new Set(
        mockPartDatabase
          .filter(
            (part) =>
              part.rootTypeId === conditionRootTypeId &&
              part.softTypeId === conditionSoftTypeId,
          )
          .map((part) => part.attributes[rule.propertyCode])
          .filter(
            (value) => value !== undefined && value !== null && value !== "",
          )
          .map((value) => String(value)),
      ),
    ].sort((left, right) => left.localeCompare(right, "zh-CN"));
  const handleConditionSearch = () => {
    if (!conditionScope) {
      setResult({
        reference: null,
        baselineType: "FORM_VALUES",
        scoredCandidates: [],
        excludedCandidates: [],
        errorCode: "NO_RULES",
        errorMessage: "当前类型/分类未配置可用相似度规则。",
      });
      resetResultControls();
      return;
    }
    const hasScoreInput = conditionRules.some(
      (rule) =>
        rule.propertyCode !== "category_path" &&
        String(conditionValues[rule.propertyCode] ?? "").trim() !== "",
    );
    if (!hasScoreInput) {
      notify("请至少填写一个参与评分的属性后再查询。", "warning");
      return;
    }
    const values = {
      ...conditionValues,
      ...(conditionClassificationPath
        ? { category_path: conditionClassificationPath }
        : {}),
    };
    executeSearch(
      {
        type: "FORM_VALUES",
        requestNo: "属性条件查询",
        temporaryNo: "ATTRIBUTE-QUERY",
        rootTypeId: conditionRootTypeId,
        softTypeId: conditionSoftTypeId,
        values,
        units: conditionUnits,
      },
      conditionScope.scopeKey,
    );
  };
  const formEntries = useMemo(
    () => [
      ...mockFormBaselines
        .filter((form) => form.rootTypeId === "PART")
        .map((form) => ({ id: form.id, title: form.title })),
      { id: "NO_RULES", title: "新建冲压件申请单（未配置规则示意）" },
    ],
    [],
  );
  const currentFormEntry = useMemo(
    () => mockFormBaselines.find((form) => form.id === formEntryId) || null,
    [formEntryId],
  );
  const formEntryScope = useMemo(
    () =>
      currentFormEntry
        ? resolveSimilarityRuleScope(
            currentFormEntry.softTypeId,
            String(currentFormEntry.values.category_path || ""),
            rules,
            objectConfigStatus,
          )
        : null,
    [currentFormEntry, rules, objectConfigStatus],
  );
  const formEntryRules = useMemo(
    () =>
      currentFormEntry && formEntryScope
        ? rules.filter(
            (rule) =>
              rule.rootTypeId === "PART" &&
              rule.softTypeId === formEntryScope.scopeKey &&
              rule.enabled &&
              rule.isAppEndActive &&
              rule.isScoreActive,
          )
        : [],
    [currentFormEntry, formEntryScope, rules],
  );
  const handleFormEntrySearch = () => {
    if (!currentFormEntry || !formEntryScope || formEntryRules.length === 0) {
      notify("当前表单未配置相似度规则，仍可正常确认保存。", "warning");
      return;
    }
    executeSearch(
      {
        type: "FORM_VALUES",
        requestNo: currentFormEntry.requestNo,
        temporaryNo: currentFormEntry.temporaryNo,
        rootTypeId: currentFormEntry.rootTypeId,
        softTypeId: currentFormEntry.softTypeId,
        values: currentFormEntry.values,
        units: currentFormEntry.units,
      },
      formEntryScope.scopeKey,
    );
    setIsFormEntryOpen(false);
  };
  useEffect(() => {
    const timer = window.setTimeout(
      () => handleExistingSearch("PART-2026-000100"),
      0,
    );
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    // Each baseline mode owns its query state; do not carry a previous result into a new query form.
    setResult(null);
    setSearchRequest(null);
    resetResultControls();
  }, [queryMode]);
  useEffect(() => {
    try {
      window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
    } catch {
      // A private browser session may prohibit persistence; the view remains usable in memory.
    }
  }, [viewMode]);

  const suggestions = useMemo(() => {
    const keyword = referenceInput.trim().toLowerCase();
    const parts = mockPartDatabase.filter((part) => part.rootTypeId === "PART");
    return (
      keyword
        ? parts.filter((part) =>
            [part.objectId, part.requestCode, part.objectName].some((value) =>
              value.toLowerCase().includes(keyword),
            ),
          )
        : parts
    ).slice(0, 8);
  }, [referenceInput]);
  const candidates = result?.scoredCandidates || [];
  const resultScope = useMemo(
    () =>
      result?.reference
        ? resolveSimilarityRuleScope(
            result.reference.softTypeId,
            result.reference.classificationPath,
            rules,
            objectConfigStatus,
          )
        : null,
    [result, rules, objectConfigStatus],
  );
  const activeResultRules = useMemo(
    () =>
      rules.filter(
        (rule) =>
          rule.rootTypeId === "PART" &&
          rule.softTypeId === resultScope?.scopeKey &&
          rule.enabled &&
          rule.isAppEndActive &&
          rule.isScoreActive,
      ),
    [rules, resultScope],
  );
  const activeDisplayOnlyResultRules = useMemo(
    () =>
      rules.filter(
        (rule) =>
          rule.rootTypeId === "PART" &&
          rule.softTypeId === resultScope?.scopeKey &&
          rule.enabled &&
          rule.isAppEndActive &&
          !rule.isScoreActive,
      ),
    [rules, resultScope],
  );
  const facetStatisticsResult = useMemo(() => {
    if (!searchRequest) return null;
    return runSimilaritySearch(
      "PART",
      searchRequest.scopeKey,
      searchRequest.baseline,
      rules,
      undefined,
      getSimilarityTierConfig(tierConfigs, searchRequest.scopeKey),
      runtimeConfig,
    );
  }, [searchRequest, rules, tierConfigs, runtimeConfig]);
  useEffect(() => {
    if (!searchRequest) return;

    const scopeRules = rules.filter(
      (rule) =>
        rule.rootTypeId === "PART" &&
        rule.softTypeId === searchRequest.scopeKey &&
        rule.enabled &&
        rule.isAppEndActive &&
        rule.isScoreActive,
    );
    const candidateMatchesFilters = (candidate: ReferenceObject) =>
      scopeRules.every((rule) => {
        if (isNumericRule(rule)) {
          const range = numericFilters[rule.propertyCode];
          if (!range?.from && !range?.to) return true;
          const value = normalizeNumberForDisplay(
            candidate.attributes[rule.propertyCode],
            candidate.units,
            rule,
          );
          return (
            value !== null &&
            (!range.from || value >= Number(range.from)) &&
            (!range.to || value <= Number(range.to))
          );
        }
        const selected = valueFilters[rule.propertyCode] || [];
        if (selected.length === 0) return true;
        const value = candidate.attributes[rule.propertyCode];
        return selected.includes(
          value === undefined || value === null || value === ""
            ? "（缺失）"
            : String(value),
        );
      });

    setLoading(true);
    const timer = window.setTimeout(() => {
      setResult(
        runSimilaritySearch(
          "PART",
          searchRequest.scopeKey,
          searchRequest.baseline,
          rules,
          undefined,
          getSimilarityTierConfig(tierConfigs, searchRequest.scopeKey),
          runtimeConfig,
          candidateMatchesFilters,
        ),
      );
      setLoading(false);
    }, 240);
    return () => window.clearTimeout(timer);
  }, [
    searchRequest,
    rules,
    tierConfigs,
    runtimeConfig,
    valueFilters,
    numericFilters,
  ]);
  const facetDefinitions = useMemo<FacetDefinition[]>(() => {
    if (!result?.reference) return [];
    return activeResultRules
      .sort(
        (left, right) =>
          right.weight - left.weight ||
          activeResultRules.indexOf(left) - activeResultRules.indexOf(right),
      )
      .map((rule) => {
        const kind: FacetKind = isNumericRule(rule) ? "NUMBER" : "VALUE";
        const referenceNumber =
          kind === "NUMBER"
            ? normalizeNumberForDisplay(
                result.reference?.attributes?.[rule.propertyCode],
                result.reference?.units,
                rule,
              )
            : undefined;
        return {
          fieldKey: rule.propertyCode,
          label: rule.fieldName,
          rule,
          kind,
          unit:
            kind === "NUMBER"
              ? getDisplayUnit(rule, result.reference?.units)
              : undefined,
          referenceNumber: referenceNumber ?? undefined,
        };
      });
  }, [activeResultRules, result]);
  const facetByKey = useMemo(
    () => new Map(facetDefinitions.map((facet) => [facet.fieldKey, facet])),
    [facetDefinitions],
  );
  const matchesResultFilters = (
    candidate: ScoredCandidate,
    ignoredKey?: string,
  ) =>
    facetDefinitions.every((facet) => {
      if (facet.fieldKey === ignoredKey) return true;
      if (facet.kind === "NUMBER") {
        const range = numericFilters[facet.fieldKey];
        if (!range?.from && !range?.to) return true;
        const value = getCandidateNumber(candidate, facet.rule);
        if (value === null) return false;
        return (
          (!range.from || value >= Number(range.from)) &&
          (!range.to || value <= Number(range.to))
        );
      }
      const selected = valueFilters[facet.fieldKey] || [];
      return (
        selected.length === 0 ||
        selected.includes(getCandidateText(candidate, facet.rule))
      );
    });
  const facetOptions = useMemo(
    () =>
      facetDefinitions.reduce<Record<string, FacetOption[]>>((all, facet) => {
        if (facet.kind === "NUMBER") {
          all[facet.fieldKey] = [];
          return all;
        }
        const counts = new Map<string, number>();
        const selectedValues = valueFilters[facet.fieldKey] || [];
        const statisticsCandidates =
          facetStatisticsResult?.preTopKScoredCandidates || [];
        statisticsCandidates
          .filter((candidate) =>
            matchesResultFilters(candidate, facet.fieldKey),
          )
          .forEach((candidate) => {
            const value = getCandidateText(candidate, facet.rule);
            counts.set(value, (counts.get(value) || 0) + 1);
          });
        selectedValues.forEach((value) => {
          if (!counts.has(value)) counts.set(value, 0);
        });
        all[facet.fieldKey] = [...counts.entries()]
          .map(([value, count]) => ({ value, count }))
          .sort(
            (left, right) =>
              right.count - left.count ||
              left.value.localeCompare(right.value, "zh-CN"),
          );
        return all;
      }, {}),
    [
      facetDefinitions,
      facetStatisticsResult,
      valueFilters,
      numericFilters,
    ],
  );
  const filteredCandidates = useMemo(
    () => candidates,
    [candidates],
  );
  const primaryFacets = facetDefinitions.slice(0, 2);
  const additionalFacets = facetDefinitions
    .slice(2)
    .filter((facet) =>
      `${facet.label} ${facet.fieldKey}`
        .toLowerCase()
        .includes(moreFacetSearch.trim().toLowerCase()),
    );
  const activeValueTags = (
    Object.entries(valueFilters) as Array<[string, string[]]>
  ).flatMap(([fieldKey, values]) =>
    values.map((value) => ({ fieldKey, value })),
  );
  const activeNumericTags = (
    Object.entries(numericFilters) as Array<[string, NumericRange]>
  )
    .filter(
      ([fieldKey, range]) =>
        facetByKey.has(fieldKey) && Boolean(range.from || range.to),
    )
    .map(([fieldKey, range]) => ({ fieldKey, range }));
  const hasActiveFilters =
    activeValueTags.length > 0 || activeNumericTags.length > 0;
  const resultAttributes = useMemo<ResultAttribute[]>(
    () =>
      [...activeResultRules]
        .sort(
          (left, right) =>
            right.weight - left.weight ||
            activeResultRules.indexOf(left) - activeResultRules.indexOf(right),
        )
        .slice(0, 4)
        .map((rule) => ({
          fieldKey: rule.propertyCode,
          label: rule.fieldName,
          rule,
        })),
    [activeResultRules],
  );
  const compareScoreAttributes = useMemo<ResultAttribute[]>(
    () =>
      [...activeResultRules]
        .sort(
          (left, right) =>
            right.weight - left.weight ||
            activeResultRules.indexOf(left) - activeResultRules.indexOf(right),
        )
        .map((rule) => ({
          fieldKey: rule.propertyCode,
          label: rule.fieldName,
          rule,
        })),
    [activeResultRules],
  );
  const compareDisplayAttributes = useMemo<ResultAttribute[]>(
    () =>
      [...activeDisplayOnlyResultRules]
        .sort((left, right) => left.fieldName.localeCompare(right.fieldName, "zh-CN"))
        .map((rule) => ({
          fieldKey: rule.propertyCode,
          label: rule.fieldName,
          rule,
        })),
    [activeDisplayOnlyResultRules],
  );
  const pageCandidates = filteredCandidates.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );
  const compareIds = useMemo(
    () => compareCandidates.map((candidate) => candidate.objectId),
    [compareCandidates],
  );
  const selectedCompare = compareCandidates;
  const currentCandidateIds = useMemo(
    () => new Set(candidates.map((candidate) => candidate.objectId)),
    [candidates],
  );
  const selectedOutsideCurrentFilters = selectedCompare.filter(
    (candidate) => !currentCandidateIds.has(candidate.objectId),
  ).length;
  const queryContext = useMemo(() => {
    if (!result?.reference) return null;
    return {
      reference:
        result.baselineType === "FORM_VALUES"
          ? `${result.formBaselineInfo?.requestNo || result.reference.requestCode} · 按条件查找`
          : `${result.reference.objectId} · ${result.reference.objectName}`,
      typeName: getTypeAttributeName(result.reference.softTypeId),
      classificationPath:
        result.reference.classificationPath.replace(/^\//, "") || "未选择分类",
      rule: `${resultScope?.label || "无有效规则"} · ${resultScope ? objectConfigStatus[resultScope.scopeKey]?.configVersion || "当前启用版本" : "未解析"}`,
    };
  }, [result, resultScope, objectConfigStatus]);
  const toggleValueFilter = (fieldKey: string, value: string) => {
    setValueFilters((previous) => ({
      ...previous,
      [fieldKey]: (previous[fieldKey] || []).includes(value)
        ? previous[fieldKey].filter((item) => item !== value)
        : [...(previous[fieldKey] || []), value],
    }));
    setPage(1);
  };
  const setNumericRange = (fieldKey: string, patch: Partial<NumericRange>) => {
    setNumericFilters((previous) => ({
      ...previous,
      [fieldKey]: {
        from: previous[fieldKey]?.from || "",
        to: previous[fieldKey]?.to || "",
        ...patch,
      },
    }));
    setPage(1);
  };
  const applyNumericQuickFilter = (
    facet: FacetDefinition,
    mode: "REFERENCE" | "TOLERANCE",
  ) => {
    if (facet.referenceNumber === undefined) return;
    let from = facet.referenceNumber;
    let to = facet.referenceNumber;
    if (
      mode === "TOLERANCE" &&
      facet.rule.matchConfig?.kind === "NUMERIC_TOLERANCE"
    ) {
      const tolerance =
        facet.rule.matchConfig.toleranceType === "PERCENTAGE"
          ? (Math.abs(facet.referenceNumber) *
              facet.rule.matchConfig.toleranceValue) /
            100
          : facet.rule.matchConfig.toleranceValue;
      from -= tolerance;
      to += tolerance;
    }
    setNumericFilters((previous) => ({
      ...previous,
      [facet.fieldKey]: { from: formatNumber(from), to: formatNumber(to) },
    }));
    setPage(1);
  };
  const clearResultFilters = () => {
    setValueFilters(EMPTY_VALUE_FILTERS);
    setNumericFilters(EMPTY_NUMERIC_FILTERS);
    setPage(1);
  };
  const toggleCompare = (candidate: ScoredCandidate) => {
    if (compareIds.includes(candidate.objectId)) {
      setCompareCandidates((previous) =>
        previous.filter((item) => item.objectId !== candidate.objectId),
      );
      return;
    }
    if (compareIds.length >= 4) {
      notify("一次最多可对比 4 件候选件。", "warning");
      return;
    }
    setCompareCandidates((previous) => [...previous, candidate]);
  };
  const exportCurrentTopK = () => {
    if (!result || filteredCandidates.length === 0) {
      notify("当前没有可导出的相似件结果。", "warning");
      return;
    }
    const quote = (value: unknown) =>
      `"${String(value ?? "").replaceAll('"', '""')}"`;
    const rows = [
      [
        "候选件编码",
        "候选件名称",
        "类型属性值",
        "分类",
        "属性相似度",
        "覆盖率",
      ],
      ...filteredCandidates.map((candidate) => [
        candidate.objectId,
        candidate.objectName,
        getCandidateMeta(candidate).type,
        candidate.classificationPath,
        `${candidate.similarityScore.toFixed(2)}%`,
        `${candidate.coverageRate}%`,
      ]),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map(quote).join(",")).join("\n")}`;
    const downloadUrl = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    const referenceNo =
      result.reference?.objectId ||
      result.formBaselineInfo?.requestNo ||
      result.reference?.requestCode ||
      "临时编号";
    const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
    anchor.href = downloadUrl;
    anchor.download = `${referenceNo}_相似件查询_${date}.csv`;
    anchor.click();
    URL.revokeObjectURL(downloadUrl);
    notify("已导出当前 TopK 结果（CSV）。", "success");
  };

  return (
    <div className="space-y-4" id="client-find-similar-v2-view">
      <section className="bg-[var(--ty-fill-white-color)] rounded-ty-sm border border-[var(--ty-border-color)] p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 border-b border-[var(--ty-border-color)] pb-3">
          <div className="flex items-center flex-wrap gap-2">
            <Layers3 className="w-5 h-5 text-[var(--ty-primary-color)]" />
            <h1 className="text-ty-xl font-semibold text-[var(--ty-font-main-color)]">
              应用端查找相似件
            </h1>
            <span className="min-h-6 px-2 inline-flex items-center rounded-ty-xs border border-[var(--ty-primary-color)]/30 bg-[var(--ty-primary-lightest-color)] text-[var(--ty-primary-color)] text-ty-2xs font-semibold">
              V2.0
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsFormEntryOpen(true)}
            className="h-8 px-3 inline-flex items-center gap-1.5 rounded-ty-sm border border-[var(--ty-border-color)] text-ty-xs font-medium text-[var(--ty-primary-color)] cursor-pointer"
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            新建/编辑零部件
          </button>
        </div>
        <div
          className="inline-flex max-w-full overflow-x-auto items-center p-1 rounded-ty-sm border border-[var(--ty-border-color)] bg-[var(--ty-fill-weak-dark-color)]"
          role="tablist"
          aria-label="查询基准方式"
        >
          <button
            type="button"
            role="tab"
            aria-selected={queryMode === "EXISTING_PART"}
            onClick={() => setQueryMode("EXISTING_PART")}
            className={`h-7 shrink-0 px-3 rounded-ty-xs text-ty-xs font-medium cursor-pointer ${queryMode === "EXISTING_PART" ? "bg-[var(--ty-fill-white-color)] text-[var(--ty-primary-color)] shadow-sm" : "text-[var(--ty-font-sub-color)]"}`}
          >
            选择已有零部件
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={queryMode === "CONDITIONS"}
            onClick={() => setQueryMode("CONDITIONS")}
            className={`h-7 shrink-0 px-3 rounded-ty-xs text-ty-xs font-medium cursor-pointer ${queryMode === "CONDITIONS" ? "bg-[var(--ty-fill-white-color)] text-[var(--ty-primary-color)] shadow-sm" : "text-[var(--ty-font-sub-color)]"}`}
          >
            按条件查找
          </button>
        </div>
        {queryMode === "EXISTING_PART" ? (
          <div className="relative grid grid-cols-1 md:grid-cols-[minmax(280px,1fr)_auto] gap-3">
            <label className="flex flex-col gap-1">
              <span className="inline-flex items-center gap-1 text-ty-xs font-semibold text-[var(--ty-font-sub-color)]">
                输入物料编码、申请号或名称
                <HelpTooltip
                  label="查看基准件选择说明"
                  content="从候选项选择已有零部件后，系统带出其类型、分类和适用规则；不会根据模糊输入静默猜测基准。"
                />
              </span>
              <input
                id="v2-reference-input"
                role="combobox"
                aria-expanded={suggestionsOpen}
                aria-controls="v2-reference-suggestions"
                autoComplete="off"
                value={referenceInput}
                onFocus={() => setSuggestionsOpen(true)}
                onChange={(event) => {
                  setReferenceInput(event.target.value);
                  setSuggestionsOpen(true);
                }}
                onKeyDown={(event) =>
                  event.key === "Enter" && handleExistingSearch()
                }
                placeholder="输入后选择已有零部件"
                className="h-8 px-3 rounded-ty-sm border border-[var(--ty-border-color)] text-ty-xs font-mono focus:outline-hidden focus:border-[var(--ty-primary-color)]"
              />
            </label>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => handleExistingSearch()}
                disabled={loading}
                className="h-8 inline-flex items-center gap-2 px-4 rounded-ty-sm bg-[var(--ty-primary-color)] text-[var(--ty-font-white-color)] text-ty-xs font-semibold disabled:opacity-50 cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
                {loading ? "正在查询相似件，请稍后" : "查找相似件"}
              </button>
            </div>
            {suggestionsOpen && (
              <div
                id="v2-reference-suggestions"
                role="listbox"
                className="absolute z-20 left-0 right-0 top-[70px] max-h-64 overflow-y-auto rounded-ty-sm border border-[var(--ty-border-color)] bg-[var(--ty-fill-white-color)] shadow-ty-lg"
              >
                {suggestions.length > 0 ? (
                  suggestions.map((part) => (
                    <button
                      key={part.objectId}
                      type="button"
                      role="option"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setReferenceInput(part.objectId);
                        setSuggestionsOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left border-b last:border-b-0 border-[var(--ty-border-light-color)] hover:bg-[var(--ty-fill-weak-dark-color)] cursor-pointer"
                    >
                      <span className="block text-ty-xs font-semibold">
                        {part.objectName}
                      </span>
                      <span className="block mt-0.5 text-ty-2xs text-[var(--ty-font-sub-color)] font-mono">
                        {part.objectId} · {getTypeAttributeName(part.softTypeId)} ·{" "}
                        {part.classificationPath
                          .split("/")
                          .filter(Boolean)
                          .at(-1)}
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="p-3 text-ty-xs text-[var(--ty-font-sub-color)]">
                    未找到可选择的已有零部件
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <ConditionQuery
            rootTypeId={conditionRootTypeId}
            softTypeId={conditionSoftTypeId}
            classificationPath={conditionClassificationPath}
            classifications={conditionClassifications}
            scope={conditionScope}
            rules={conditionRules}
            values={conditionValues}
            onSoftTypeChange={setConditionSoftType}
            onClassificationChange={handleConditionClassification}
            onValueChange={(rule, value) => {
              setConditionValues((previous) => ({
                ...previous,
                [rule.propertyCode]: value,
              }));
              const unit = getDisplayUnit(rule);
              if (isNumericRule(rule) && unit)
                setConditionUnits((previous) => ({
                  ...previous,
                  [rule.propertyCode]: unit,
                }));
            }}
            getEnumOptions={getConditionEnumOptions}
            loading={loading}
            onSearch={handleConditionSearch}
          />
        )}
        {queryContext && (
          <QueryContext
            context={queryContext}
            onModify={() =>
              document
                .getElementById(
                  queryMode === "EXISTING_PART"
                    ? "v2-reference-input"
                    : "v2-condition-query",
                )
                ?.focus()
            }
          />
        )}
      </section>
      <section className="bg-[var(--ty-fill-white-color)] rounded-ty-sm border border-[var(--ty-border-color)] overflow-hidden">
        <div className="p-3 border-b border-[var(--ty-border-color)] bg-[var(--ty-fill-weak-dark-color)] flex flex-wrap gap-2 items-center justify-between">
          <span className="text-ty-xs font-semibold text-[var(--ty-font-main-color)]">
            属性相似结果
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              title="导出当前 TopK 结果"
              aria-label="导出当前 TopK 结果"
              onClick={exportCurrentTopK}
              disabled={!result || loading || filteredCandidates.length === 0}
              className="h-8 w-8 inline-flex items-center justify-center rounded-ty-sm border border-[var(--ty-border-color)] bg-[var(--ty-fill-white-color)] text-[var(--ty-font-main-color)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setFiltersOpen((open) => !open)}
              className="h-8 px-3 inline-flex items-center gap-1.5 rounded-ty-sm border border-[var(--ty-border-color)] bg-[var(--ty-fill-white-color)] text-ty-xs font-medium cursor-pointer"
            >
              <Filter className="w-3.5 h-3.5" />
              筛选结果{" "}
              {filtersOpen ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
            <div className="inline-flex h-8 items-center rounded-ty-sm border border-[var(--ty-border-color)] bg-[var(--ty-fill-white-color)] p-0.5">
              <button
                title="列表视图"
                aria-label="列表视图"
                onClick={() => setViewMode("LIST")}
                className={`w-7 h-6 inline-flex items-center justify-center rounded-ty-xs cursor-pointer ${viewMode === "LIST" ? "bg-[var(--ty-primary-lightest-color)] text-[var(--ty-primary-color)]" : "text-[var(--ty-font-sub-color)]"}`}
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                title="缩略卡片视图"
                aria-label="缩略卡片视图"
                onClick={() => setViewMode("GRID")}
                className={`w-7 h-6 inline-flex items-center justify-center rounded-ty-xs cursor-pointer ${viewMode === "GRID" ? "bg-[var(--ty-primary-lightest-color)] text-[var(--ty-primary-color)]" : "text-[var(--ty-font-sub-color)]"}`}
              >
                <Grid2X2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
        <div
          className={`grid ${filtersOpen ? "lg:grid-cols-[280px_minmax(0,1fr)]" : "grid-cols-1"}`}
        >
          {filtersOpen && (
            <FacetPanel
              primaryFacets={primaryFacets}
              additionalFacets={additionalFacets}
              totalFacetCount={facetDefinitions.length}
              moreOpen={moreFacetsOpen}
              moreSearch={moreFacetSearch}
              openGroups={openGroups}
              options={facetOptions}
              values={valueFilters}
              ranges={numericFilters}
              hasActiveFilters={hasActiveFilters}
              onClear={clearResultFilters}
              onMoreOpen={() => setMoreFacetsOpen((value) => !value)}
              onMoreSearch={setMoreFacetSearch}
              onToggleOpen={(key, defaultOpen) =>
                setOpenGroups((previous) => ({
                  ...previous,
                  [key]: !(previous[key] ?? defaultOpen),
                }))
              }
              onToggleValue={toggleValueFilter}
              onRangeChange={setNumericRange}
              onQuickFilter={applyNumericQuickFilter}
              loading={loading}
            />
          )}
          {
            <div className="min-w-0">
              {result && !result.errorCode && (
                <div className="px-3 pt-3">
                  <div className="text-ty-xs text-[var(--ty-font-sub-color)]">
                    共 {result.returnedCount ?? result.scoredCandidates.length} 条结果，已按相似度排序。
                  </div>
                  <details className="mt-1 text-ty-2xs text-[var(--ty-font-sub-color)]">
                    <summary className="w-fit cursor-pointer hover:text-[var(--ty-primary-color)]">查看计算摘要</summary>
                    <SimilarityRunSummary result={result} className="mt-1" />
                  </details>
                </div>
              )}
              {hasActiveFilters && (
                <ActiveFilterTags
                  valueTags={activeValueTags}
                  numericTags={activeNumericTags}
                  facetByKey={facetByKey}
                  onToggleValue={toggleValueFilter}
                  onClearRange={(fieldKey) =>
                    setNumericFilters((previous) => ({
                      ...previous,
                      [fieldKey]: { from: "", to: "" },
                    }))
                  }
                  onClear={clearResultFilters}
                />
              )}
              {result?.errorCode ? (
                <ResultError result={result} />
              ) : loading ? (
                <div className="p-12 text-center text-ty-xs text-[var(--ty-font-sub-color)]">
                  正在查询相似件，请稍后
                </div>
              ) : filteredCandidates.length === 0 ? (
                <FilteredEmpty
                  hasActiveFilters={hasActiveFilters}
                  onClear={clearResultFilters}
                />
              ) : viewMode === "LIST" ? (
                <CandidateTable
                  candidates={pageCandidates}
                  resultAttributes={resultAttributes}
                  compareIds={compareIds}
                  onPreview={setPreview}
                  onToggleCompare={toggleCompare}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 p-3">
                  {pageCandidates.map((candidate, index) => (
                    <CandidateCard
                      key={candidate.objectId}
                      candidate={candidate}
                      index={index}
                      resultAttributes={resultAttributes}
                      selected={compareIds.includes(candidate.objectId)}
                      compareDisabled={
                        !compareIds.includes(candidate.objectId) &&
                        compareIds.length >= 4
                      }
                      onPreview={() => setPreview(candidate)}
                      onToggle={() => toggleCompare(candidate)}
                    />
                  ))}
                </div>
              )}
              <TablePagination
                total={filteredCandidates.length}
                page={page}
                pageSize={pageSize}
                itemLabel="条"
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(1);
                }}
                pageSizeOptions={[20, 50, 200, 500]}
              />
            </div>
          }
        </div>
      </section>
      {isFormEntryOpen && (
        <div
          className="fixed inset-0 z-[70] bg-ty-overlay flex items-center justify-center p-4"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setIsFormEntryOpen(false)
          }
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="v2-form-entry-title"
            className="w-[min(760px,96vw)] max-h-[88vh] overflow-y-auto rounded-ty-sm border border-[var(--ty-border-color)] bg-[var(--ty-fill-white-color)] shadow-ty-lg"
          >
            <div className="p-4 border-b border-[var(--ty-border-color)] bg-[var(--ty-fill-weak-dark-color)] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-[var(--ty-primary-color)]" />
                <h2
                  id="v2-form-entry-title"
                  className="text-ty-lg font-semibold"
                >
                  新建/编辑零部件
                </h2>
              </div>
              <button
                type="button"
                aria-label="关闭新建或编辑零部件"
                onClick={() => setIsFormEntryOpen(false)}
                className="p-2 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <label className="block max-w-xl">
                <span className="block mb-1 text-ty-xs font-semibold">
                  当前业务表单
                </span>
                <select
                  value={formEntryId}
                  onChange={(event) => setFormEntryId(event.target.value)}
                  className="w-full h-8 rounded-ty-sm border border-[var(--ty-border-color)] px-2 text-ty-xs"
                >
                  {formEntries.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.title}
                    </option>
                  ))}
                </select>
              </label>
              {currentFormEntry ? (
                <>
                  <div className="flex flex-wrap gap-x-5 gap-y-2 rounded-ty-sm border border-[var(--ty-border-color)] bg-[var(--ty-fill-weak-dark-color)] p-3 text-ty-xs">
                    <span>对象类型：<strong>零部件 (PART)</strong></span>
                    <span>
                      类型属性值：<strong>{getTypeAttributeName(currentFormEntry.softTypeId)}</strong>
                    </span>
                    <span>
                      分类：<strong>{String(currentFormEntry.values.category_path || "未选择")}</strong>
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 rounded-ty-sm border border-[var(--ty-border-color)] p-3">
                    {formEntryRules.map((rule) => (
                      <div key={rule.id} className="min-w-0">
                        <span className="block text-ty-2xs text-[var(--ty-font-sub-color)]">
                          {rule.fieldName}
                        </span>
                        <strong className="block mt-1 truncate text-ty-xs" title={String(currentFormEntry.values[rule.propertyCode] ?? "--")}>
                          {String(currentFormEntry.values[rule.propertyCode] ?? "--")}
                          {getDisplayUnit(rule, currentFormEntry.units)
                            ? ` ${getDisplayUnit(rule, currentFormEntry.units)}`
                            : ""}
                        </strong>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="rounded-ty-sm border border-[var(--ty-border-color)] bg-[var(--ty-fill-weak-dark-color)] p-4 text-ty-xs text-[var(--ty-font-sub-color)]">
                  当前表单未解析到已启用规则。相似件查询入口不显示，业务表单仍可正常确认保存。
                </div>
              )}
            </div>
            <div className="p-3 border-t border-[var(--ty-border-color)] bg-[var(--ty-fill-weak-dark-color)] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsFormEntryOpen(false)}
                className="h-8 px-4 rounded-ty-sm border border-[var(--ty-border-color)] text-ty-xs cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  notify("业务表单已按示意确认保存。", "success");
                  setIsFormEntryOpen(false);
                }}
                className="h-8 px-4 rounded-ty-sm bg-[var(--ty-primary-color)] text-[var(--ty-font-white-color)] text-ty-xs font-semibold cursor-pointer"
              >
                确认
              </button>
              {currentFormEntry && formEntryScope && formEntryRules.length > 0 && (
                <button
                  type="button"
                  onClick={handleFormEntrySearch}
                  className="h-8 px-4 inline-flex items-center gap-1.5 rounded-ty-sm border border-[var(--ty-primary-color)] bg-[var(--ty-fill-white-color)] text-[var(--ty-primary-color)] text-ty-xs font-semibold cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                  查找相似件
                </button>
              )}
            </div>
          </section>
        </div>
      )}
      {selectedCompare.length > 0 && (
        <>
          <CompareTray
            count={selectedCompare.length}
            outsideCurrentFilters={selectedOutsideCurrentFilters}
            onOpen={() => setIsCompareOpen(true)}
            onClear={() => {
              setCompareCandidates([]);
              setIsCompareOpen(false);
            }}
          />
          {isCompareOpen && (
            <div
              className="fixed inset-0 z-[75] bg-ty-overlay flex justify-end"
              role="presentation"
              onMouseDown={(event) =>
                event.target === event.currentTarget && setIsCompareOpen(false)
              }
            >
              <ComparePanel
                candidates={selectedCompare}
                reference={result?.reference || null}
                attributes={compareScoreAttributes}
                displayAttributes={compareDisplayAttributes}
                currentCandidateIds={currentCandidateIds}
                onClose={() => setIsCompareOpen(false)}
                onClear={() => {
                  setCompareCandidates([]);
                  setIsCompareOpen(false);
                }}
                onToggle={toggleCompare}
              />
            </div>
          )}
        </>
      )}
      {preview && (
        <PreviewDrawer
          candidate={preview}
          reference={result?.reference || null}
          queryContext={queryContext?.reference || referenceInput}
          ruleContext={queryContext?.rule || "当前启用规则"}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
};

const ConditionQuery: React.FC<{
  rootTypeId: string;
  softTypeId: string;
  classificationPath: string;
  classifications: typeof similarityClassificationOptions;
  scope: ReturnType<typeof resolveSimilarityRuleScope>;
  rules: FieldSimilarityRule[];
  values: Record<string, string | number>;
  onSoftTypeChange: (value: string) => void;
  onClassificationChange: (value: string) => void;
  onValueChange: (rule: FieldSimilarityRule, value: string | number) => void;
  getEnumOptions: (rule: FieldSimilarityRule) => string[];
  loading: boolean;
  onSearch: () => void;
}> = ({
  rootTypeId,
  softTypeId,
  classificationPath,
  classifications,
  scope,
  rules,
  values,
  onSoftTypeChange,
  onClassificationChange,
  onValueChange,
  getEnumOptions,
  loading,
  onSearch,
}) => (
  <section
    id="v2-condition-query"
    tabIndex={-1}
    className="rounded-ty-sm border border-[var(--ty-border-color)] bg-[var(--ty-fill-weak-dark-color)] p-3 space-y-3"
    aria-label="按条件查找"
  >
    <div className="flex items-center gap-2 text-ty-2xs text-[var(--ty-font-sub-color)]">
      <span>对象类型</span>
      <strong className="rounded-ty-xs bg-[var(--ty-fill-white-color)] px-2 py-1 text-[var(--ty-font-main-color)]">
        零部件 (PART)
      </strong>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-ty-xs font-semibold">类型属性值</span>
        <select
          value={softTypeId}
          onChange={(event) => onSoftTypeChange(event.target.value)}
          className="h-8 rounded-ty-sm border border-[var(--ty-border-color)] bg-[var(--ty-fill-white-color)] px-2 text-ty-xs"
        >
          {softTypeOptions
            .filter((option) => option.rootTypeId === rootTypeId)
            .map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-ty-xs font-semibold">
          分类{" "}
          <span className="font-normal text-[var(--ty-font-sub-color)]">
            (可选)
          </span>
        </span>
        <select
          value={classificationPath}
          onChange={(event) => onClassificationChange(event.target.value)}
          className="h-8 rounded-ty-sm border border-[var(--ty-border-color)] bg-[var(--ty-fill-white-color)] px-2 text-ty-xs"
        >
          <option value="">按类型属性值通用规则</option>
          {classifications.map((option) => (
            <option key={option.id} value={option.path}>
              {option.name}
            </option>
          ))}
        </select>
      </label>
    </div>
    {scope ? (
      <>
        <div className="flex flex-wrap items-center justify-between gap-2 text-ty-2xs text-[var(--ty-font-sub-color)]">
          <HelpTooltip
            label="查看按条件查询说明"
            content="至少填写一个参与评分的属性；字段与单位随类型属性值和分类自动变化。"
          />
          <span>采用：{scope.label}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {rules
            .filter((rule) => rule.propertyCode !== "category_path")
            .map((rule) => (
              <ConditionField
                key={rule.id}
                rule={rule}
                value={values[rule.propertyCode] ?? ""}
                enumOptions={getEnumOptions(rule)}
                unit={getDisplayUnit(rule)}
                onChange={(value) => onValueChange(rule, value)}
              />
            ))}
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onSearch}
            disabled={loading}
            className="h-8 inline-flex items-center gap-2 px-4 rounded-ty-sm bg-[var(--ty-primary-color)] text-[var(--ty-font-white-color)] text-ty-xs font-semibold disabled:opacity-50 cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            {loading ? "正在查询相似件，请稍后" : "按条件查找相似件"}
          </button>
        </div>
      </>
    ) : (
      <div className="rounded-ty-xs border border-[var(--ty-warning-color)]/40 bg-[var(--ty-warning-lightest-color)] p-3 text-ty-xs text-[var(--ty-font-main-color)]">
        当前类型属性值/分类未配置可用相似度规则。请调整条件或联系维护人员；系统不会自动套用其他类型属性值规则。
      </div>
    )}
  </section>
);

const ConditionField: React.FC<{
  rule: FieldSimilarityRule;
  value: string | number;
  enumOptions: string[];
  unit?: string;
  onChange: (value: string | number) => void;
}> = ({ rule, value, enumOptions, unit, onChange }) => {
  const isNumeric = isNumericRule(rule);
  const isEnum = rule.fieldType.includes("ENUM");

  return (
    <label className="flex flex-col gap-1">
      <span className="text-ty-xs font-medium truncate" title={rule.fieldName}>
        {rule.fieldName}{" "}
        <span className="text-[var(--ty-font-sub-color)]">
          ({rule.weight}%)
        </span>
      </span>
      {isEnum ? (
        <select
          value={String(value)}
          onChange={(event) => onChange(event.target.value)}
          className="h-8 rounded-ty-sm border border-[var(--ty-border-color)] bg-[var(--ty-fill-white-color)] px-2 text-ty-xs"
        >
          <option value="">请选择</option>
          {enumOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <div className="relative">
          <input
            type={isNumeric ? "number" : "text"}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={
              isNumeric
                ? `请输入数值${unit ? `（${unit}）` : ""}`
                : `请输入${rule.fieldName}`
            }
            className="h-8 w-full rounded-ty-sm border border-[var(--ty-border-color)] bg-[var(--ty-fill-white-color)] px-2 pr-10 text-ty-xs"
          />
          {unit && (
            <span className="absolute right-2 top-2 text-ty-2xs text-[var(--ty-font-sub-color)]">
              {unit}
            </span>
          )}
        </div>
      )}
    </label>
  );
};
const QueryContext: React.FC<{
  context: {
    reference: string;
    typeName: string;
    classificationPath: string;
    rule: string;
  };
  onModify: () => void;
}> = ({ context, onModify }) => (
  <div className="border border-[var(--ty-border-color)] rounded-ty-sm bg-[var(--ty-fill-weak-dark-color)] p-3">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div className="flex items-center gap-1.5 text-ty-xs font-semibold text-[var(--ty-font-main-color)]">
        <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--ty-primary-color)]" />
        本次查询上下文
      </div>
      <button
        type="button"
        onClick={onModify}
        className="h-7 px-2.5 rounded-ty-sm border border-[var(--ty-border-color)] bg-[var(--ty-fill-white-color)] text-ty-2xs text-[var(--ty-primary-color)] cursor-pointer"
      >
        修改查询条件
      </button>
    </div>
    <dl className="mt-2 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-5 gap-y-2 text-ty-2xs">
      <div>
        <dt className="text-[var(--ty-font-sub-color)]">基准</dt>
        <dd
          className="mt-0.5 font-mono text-[var(--ty-font-main-color)] truncate"
          title={context.reference}
        >
          {context.reference}
        </dd>
      </div>
      <div>
        <dt className="text-[var(--ty-font-sub-color)]">类型属性值</dt>
        <dd className="mt-0.5 text-[var(--ty-font-main-color)]">
          {context.typeName}
        </dd>
      </div>
      <div>
        <dt className="text-[var(--ty-font-sub-color)]">分类</dt>
        <dd
          className="mt-0.5 text-[var(--ty-font-main-color)] truncate"
          title={context.classificationPath}
        >
          {context.classificationPath}
        </dd>
      </div>
      <div>
        <dt className="text-[var(--ty-font-sub-color)]">采用规则</dt>
        <dd
          className="mt-0.5 text-[var(--ty-font-main-color)] truncate"
          title={context.rule}
        >
          {context.rule}
        </dd>
      </div>
    </dl>
  </div>
);
const DynamicFacetGroup: React.FC<{
  facet: FacetDefinition;
  open: boolean;
  options: FacetOption[];
  selected: string[];
  range?: NumericRange;
  onToggleOpen: () => void;
  onToggleValue: (value: string) => void;
  onRangeChange: (patch: Partial<NumericRange>) => void;
  onQuickFilter: (mode: "REFERENCE" | "TOLERANCE") => void;
}> = ({
  facet,
  open,
  options,
  selected,
  range,
  onToggleOpen,
  onToggleValue,
  onRangeChange,
  onQuickFilter,
}) => (
  <div className="border-b border-[var(--ty-border-color)] pb-2">
    <button
      type="button"
      onClick={onToggleOpen}
      className="w-full py-1 flex items-center justify-between text-ty-xs font-medium text-left text-[var(--ty-font-main-color)] cursor-pointer"
    >
      <span className="min-w-0 truncate" title={facet.label}>
        {facet.label}{" "}
        <span className="text-ty-2xs font-normal text-[var(--ty-font-sub-color)]">
          {facet.rule.weight}%
        </span>
      </span>
      {open ? (
        <ChevronDown className="w-3.5 h-3.5 shrink-0" />
      ) : (
        <ChevronRight className="w-3.5 h-3.5 shrink-0" />
      )}
    </button>
    {open &&
      (facet.kind === "NUMBER" ? (
        <NumericFacet
          facet={facet}
          range={range}
          onRangeChange={onRangeChange}
          onQuickFilter={onQuickFilter}
        />
      ) : (
        <ValueFacet
          options={options}
          selected={selected}
          onToggleValue={onToggleValue}
        />
      ))}
  </div>
);
const VALUE_FACET_INITIAL_LIMIT = 6;
const VALUE_FACET_PAGE_SIZE = 10;
const ValueFacet: React.FC<{
  options: FacetOption[];
  selected: string[];
  onToggleValue: (value: string) => void;
}> = ({ options, selected, onToggleValue }) => {
  const [query, setQuery] = useState("");
  const [visibleLimit, setVisibleLimit] = useState(VALUE_FACET_INITIAL_LIMIT);
  const optionByValue = useMemo(
    () => new Map(options.map((option) => [option.value, option])),
    [options],
  );

  useEffect(() => {
    setVisibleLimit(VALUE_FACET_INITIAL_LIMIT);
  }, [query, options.length]);

  const allOptions = useMemo(
    () => [
      ...options,
      ...selected
        .filter((value) => !optionByValue.has(value))
        .map((value) => ({ value, count: 0 })),
    ],
    [options, optionByValue, selected],
  );
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const matched = allOptions.filter((option) =>
    option.value.toLocaleLowerCase().includes(normalizedQuery),
  );
  const pinned = allOptions.filter((option) => selected.includes(option.value));
  const unselected = matched.filter(
    (option) => !selected.includes(option.value),
  );
  const visible = [...pinned, ...unselected.slice(0, visibleLimit)];
  const hasMore = unselected.length > visibleLimit;
  const hasManyValues = allOptions.length > VALUE_FACET_INITIAL_LIMIT;

  return (
    <div className="mt-1.5 space-y-1">
      {hasManyValues && (
        <input
          aria-label="筛选属性值"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索属性值"
          className="h-7 w-full rounded-ty-xs border border-[var(--ty-border-color)] bg-[var(--ty-fill-white-color)] px-2 text-ty-2xs"
        />
      )}
      {visible.map((option) => (
        <label
          key={option.value}
          className={`flex items-center justify-between gap-2 text-ty-2xs ${option.count === 0 ? "text-[var(--ty-font-sub-light-color)] cursor-not-allowed" : "text-[var(--ty-font-sub-color)] cursor-pointer"}`}
        >
          <span className="flex items-center gap-1.5 min-w-0">
            <input
              type="checkbox"
              disabled={option.count === 0 && !selected.includes(option.value)}
              checked={selected.includes(option.value)}
              onChange={() => onToggleValue(option.value)}
            />
            <span className="truncate" title={option.value}>
              {option.value}
            </span>
          </span>
          <span className="font-mono">{option.count}</span>
        </label>
      ))}
      {matched.length === 0 && pinned.length === 0 && (
        <p className="py-1 text-ty-2xs text-[var(--ty-font-sub-color)]">
          未找到属性值
        </p>
      )}
      {hasManyValues && matched.length > 0 && (
        <div className="flex items-center justify-between gap-2 pt-1 text-ty-2xs">
          <span className="text-[var(--ty-font-sub-color)]">
            {query
              ? `匹配 ${matched.length} 项`
              : `已显示 ${visible.length} / ${allOptions.length}`}
          </span>
          {hasMore && (
            <button
              type="button"
              onClick={() =>
                setVisibleLimit((limit) => limit + VALUE_FACET_PAGE_SIZE)
              }
              className="text-[var(--ty-primary-color)] cursor-pointer"
            >
              加载更多（
              {Math.min(
                VALUE_FACET_PAGE_SIZE,
                unselected.length - visibleLimit,
              )}
              ）
            </button>
          )}
        </div>
      )}
    </div>
  );
};
const NumericFacet: React.FC<{
  facet: FacetDefinition;
  range?: NumericRange;
  onRangeChange: (patch: Partial<NumericRange>) => void;
  onQuickFilter: (mode: "REFERENCE" | "TOLERANCE") => void;
}> = ({ facet, range, onRangeChange }) => (
  <div className="mt-1.5 space-y-2">
    <div className="grid grid-cols-2 gap-1">
      <input
        aria-label={facet.label + "最小值"}
        type="number"
        value={range?.from || ""}
        onChange={(event) => onRangeChange({ from: event.target.value })}
        placeholder="最小"
        className="h-7 min-w-0 rounded-ty-xs border border-[var(--ty-border-color)] bg-[var(--ty-fill-white-color)] px-2 text-ty-2xs"
      />
      <input
        aria-label={facet.label + "最大值"}
        type="number"
        value={range?.to || ""}
        onChange={(event) => onRangeChange({ to: event.target.value })}
        placeholder="最大"
        className="h-7 min-w-0 rounded-ty-xs border border-[var(--ty-border-color)] bg-[var(--ty-fill-white-color)] px-2 text-ty-2xs"
      />
    </div>
    <div className="flex items-center gap-1 text-ty-2xs text-[var(--ty-font-sub-color)]">
      <span>单位：{facet.unit || "源字段"}</span>
      <HelpTooltip
        label={`查看${facet.label}数值筛选说明`}
        content="输入最小值或最大值后，系统按显示单位筛选候选、重新评分排序，再截取 TopK。"
      />
    </div>
  </div>
);
const FacetPanel: React.FC<{
  primaryFacets: FacetDefinition[];
  additionalFacets: FacetDefinition[];
  totalFacetCount: number;
  moreOpen: boolean;
  moreSearch: string;
  openGroups: Record<string, boolean>;
  options: Record<string, FacetOption[]>;
  values: Record<string, string[]>;
  ranges: Record<string, NumericRange>;
  hasActiveFilters: boolean;
  onClear: () => void;
  onMoreOpen: () => void;
  onMoreSearch: (value: string) => void;
  onToggleOpen: (key: string, defaultOpen: boolean) => void;
  onToggleValue: (key: string, value: string) => void;
  onRangeChange: (key: string, patch: Partial<NumericRange>) => void;
  onQuickFilter: (
    facet: FacetDefinition,
    mode: "REFERENCE" | "TOLERANCE",
  ) => void;
  loading: boolean;
}> = ({
  primaryFacets,
  additionalFacets,
  totalFacetCount,
  moreOpen,
  moreSearch,
  openGroups,
  options,
  values,
  ranges,
  hasActiveFilters,
  onClear,
  onMoreOpen,
  onMoreSearch,
  onToggleOpen,
  onToggleValue,
  onRangeChange,
  onQuickFilter,
  loading,
}) => (
  <aside
    className="border-r border-[var(--ty-border-color)] bg-[var(--ty-fill-weak-dark-color)] p-3 space-y-2 max-h-[calc(100vh-220px)] overflow-y-auto"
    aria-label="筛选结果"
  >
    <div className="flex items-center justify-between gap-1">
      <span className="text-ty-xs font-semibold text-[var(--ty-font-main-color)]">
        动态筛选属性
      </span>
      <div className="flex items-center gap-1">
        <HelpTooltip
          label="查看动态筛选属性说明"
          content="筛选属性来自当前规则中已启用且参与应用端评分的字段。筛选会先缩小候选范围，再重新评分、排序并截取 TopK。"
        />
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClear}
            className="text-ty-2xs text-[var(--ty-primary-color)] cursor-pointer"
          >
            清空
          </button>
        )}
      </div>
    </div>
    {primaryFacets.map((facet) => (
      <DynamicFacetGroup
        key={facet.fieldKey}
        facet={facet}
        open={openGroups[facet.fieldKey] ?? true}
        options={options[facet.fieldKey] || []}
        selected={values[facet.fieldKey] || []}
        range={ranges[facet.fieldKey]}
        onToggleOpen={() => onToggleOpen(facet.fieldKey, true)}
        onToggleValue={(value) => onToggleValue(facet.fieldKey, value)}
        onRangeChange={(patch) => onRangeChange(facet.fieldKey, patch)}
        onQuickFilter={(mode) => onQuickFilter(facet, mode)}
      />
    ))}
    {totalFacetCount > 2 && (
      <div className="border-b border-[var(--ty-border-color)] pb-2">
        <button
          type="button"
          onClick={onMoreOpen}
          className="w-full py-1 flex items-center justify-between text-ty-xs font-medium text-left text-[var(--ty-font-main-color)] cursor-pointer"
        >
          <span>更多评分属性（{totalFacetCount - 2}）</span>
          {moreOpen ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </button>
        {moreOpen && (
          <div className="mt-1.5 space-y-2">
            <input
              aria-label="搜索更多评分属性"
              value={moreSearch}
              onChange={(event) => onMoreSearch(event.target.value)}
              placeholder="搜索属性名称"
              className="h-7 w-full rounded-ty-xs border border-[var(--ty-border-color)] bg-[var(--ty-fill-white-color)] px-2 text-ty-2xs"
            />
            {additionalFacets.length > 0 ? (
              additionalFacets.map((facet) => (
                <DynamicFacetGroup
                  key={facet.fieldKey}
                  facet={facet}
                  open={openGroups[facet.fieldKey] ?? false}
                  options={options[facet.fieldKey] || []}
                  selected={values[facet.fieldKey] || []}
                  range={ranges[facet.fieldKey]}
                  onToggleOpen={() => onToggleOpen(facet.fieldKey, false)}
                  onToggleValue={(value) =>
                    onToggleValue(facet.fieldKey, value)
                  }
                  onRangeChange={(patch) =>
                    onRangeChange(facet.fieldKey, patch)
                  }
                  onQuickFilter={(mode) => onQuickFilter(facet, mode)}
                />
              ))
            ) : (
              <p className="text-ty-2xs text-[var(--ty-font-sub-color)]">
                未找到匹配属性
              </p>
            )}
          </div>
        )}
      </div>
    )}
    {totalFacetCount === 0 && !loading && (
      <p className="py-4 text-ty-2xs text-[var(--ty-font-sub-color)]">
        当前规则没有可筛选的评分属性。
      </p>
    )}
  </aside>
);
const ActiveFilterTags: React.FC<{
  valueTags: { fieldKey: string; value: string }[];
  numericTags: { fieldKey: string; range: NumericRange }[];
  facetByKey: Map<string, FacetDefinition>;
  onToggleValue: (fieldKey: string, value: string) => void;
  onClearRange: (fieldKey: string) => void;
  onClear: () => void;
}> = ({
  valueTags,
  numericTags,
  facetByKey,
  onToggleValue,
  onClearRange,
  onClear,
}) => (
  <div className="px-3 pt-3 flex flex-wrap gap-2">
    {valueTags.map((tag) => (
      <span
        key={`${tag.fieldKey}-${tag.value}`}
        className="inline-flex items-center gap-1 min-h-6 px-2 rounded-ty-xs border border-[var(--ty-primary-color)]/30 bg-[var(--ty-primary-lightest-color)] text-ty-2xs text-[var(--ty-font-main-light-color)]"
      >
        {facetByKey.get(tag.fieldKey)?.label}：{tag.value}
        <button
          type="button"
          title="移除筛选"
          onClick={() => onToggleValue(tag.fieldKey, tag.value)}
          className="cursor-pointer"
        >
          <X className="w-3 h-3" />
        </button>
      </span>
    ))}
    {numericTags.map((tag) => {
      const facet = facetByKey.get(tag.fieldKey);
      return (
        <span
          key={tag.fieldKey}
          className="inline-flex items-center gap-1 min-h-6 px-2 rounded-ty-xs border border-[var(--ty-primary-color)]/30 bg-[var(--ty-primary-lightest-color)] text-ty-2xs text-[var(--ty-font-main-light-color)]"
        >
          {facet?.label}：{tag.range.from || "不限"} 至 {tag.range.to || "不限"}{" "}
          {facet?.unit || ""}
          <button
            type="button"
            title="移除筛选"
            onClick={() => onClearRange(tag.fieldKey)}
            className="cursor-pointer"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      );
    })}
    <button
      type="button"
      onClick={onClear}
      className="text-ty-2xs text-[var(--ty-primary-color)] cursor-pointer"
    >
      清空全部
    </button>
  </div>
);
const ResultError: React.FC<{ result: SearchRunResult }> = ({ result }) => (
  <div className="p-12 text-center">
    <Search className="w-8 h-8 mx-auto text-[var(--ty-font-sub-light-color)]" />
    <h2 className="mt-3 text-ty-sm font-semibold">
      {result.errorCode === "NO_RULES" ? "无可适用规则" : "未找到基准件"}
    </h2>
    <p className="mt-1 text-ty-xs text-[var(--ty-font-sub-color)]">
      {result.errorMessage}
    </p>
  </div>
);
const FilteredEmpty: React.FC<{
  hasActiveFilters: boolean;
  onClear: () => void;
}> = ({ hasActiveFilters, onClear }) => (
  <div className="p-12 text-center">
    <Search className="w-8 h-8 mx-auto text-[var(--ty-font-sub-light-color)]" />
    <h2 className="mt-3 text-ty-sm font-semibold">
      {hasActiveFilters
        ? "未找到符合当前筛选条件的相似件"
        : "尚未生成可展示的相似件"}
    </h2>
    {hasActiveFilters && (
      <button
        type="button"
        onClick={onClear}
        className="mt-3 h-8 px-3 rounded-ty-sm border border-[var(--ty-border-color)] text-ty-xs text-[var(--ty-primary-color)] cursor-pointer"
      >
        清除筛选
      </button>
    )}
  </div>
);
const CandidateTable: React.FC<{
  candidates: ScoredCandidate[];
  resultAttributes: ResultAttribute[];
  compareIds: string[];
  onPreview: (candidate: ScoredCandidate) => void;
  onToggleCompare: (candidate: ScoredCandidate) => void;
}> = ({
  candidates,
  resultAttributes,
  compareIds,
  onPreview,
  onToggleCompare,
}) => (
  <div className="overflow-x-auto p-3">
    <table className="ty-data-table w-full min-w-[1200px] text-left text-ty-xs border-collapse">
      <thead>
        <tr className="bg-[var(--ty-fill-weak-dark-color)] border-b border-[var(--ty-border-color)] text-[var(--ty-font-sub-color)]">
          <th className="p-2 w-10">对比</th>
          <th className="p-2">物料</th>
          <th className="p-2">类型/分类</th>
          {resultAttributes.map((attribute) => (
            <th key={attribute.fieldKey} className="p-2 min-w-28">
              {attribute.label}
            </th>
          ))}
          <th className="p-2">来源</th>
          <th className="p-2">属性相似</th>
          <th className="p-2">覆盖率</th>
          <th className="p-2 sticky right-0 bg-[var(--ty-fill-weak-dark-color)]">
            操作
          </th>
        </tr>
      </thead>
      <tbody>
        {candidates.map((candidate) => {
          const meta = getCandidateMeta(candidate);
          const compareDisabled =
            !compareIds.includes(candidate.objectId) && compareIds.length >= 4;
          return (
            <tr
              key={candidate.objectId}
              className="border-b border-[var(--ty-border-light-color)] hover:bg-[var(--ty-fill-weak-dark-color)]"
            >
              <td className="p-2">
                <span
                  className="inline-flex"
                  title={
                    compareDisabled ? "最多选择 4 件；请先移除已选候选。" : undefined
                  }
                >
                  <input
                    aria-label={`加入对比 ${candidate.objectId}`}
                    type="checkbox"
                    checked={compareIds.includes(candidate.objectId)}
                    disabled={compareDisabled}
                    onChange={() => onToggleCompare(candidate)}
                  />
                </span>
              </td>
              <td className="p-2">
                <strong>{candidate.objectName}</strong>
                <div className="font-mono text-ty-2xs text-[var(--ty-font-sub-color)]">
                  {candidate.objectId}
                </div>
              </td>
              <td className="p-2">
                {meta.type}
                <div
                  className="truncate max-w-40 text-ty-2xs text-[var(--ty-font-sub-color)]"
                  title={candidate.classificationPath}
                >
                  {meta.category}
                </div>
              </td>
              {resultAttributes.map((attribute) => (
                <td key={attribute.fieldKey} className="p-2 max-w-40">
                  <span
                    className="block truncate"
                    title={getResultAttributeValue(candidate, attribute.rule)}
                  >
                    {getResultAttributeValue(candidate, attribute.rule)}
                  </span>
                </td>
              ))}
              <td className="p-2">{meta.source}</td>
              <td className="p-2 font-mono font-bold text-[var(--ty-primary-color)]">
                {candidate.similarityScore.toFixed(2)}%
              </td>
              <td className="p-2">{candidate.coverageRate}%</td>
              <td className="p-2 sticky right-0 bg-[var(--ty-fill-white-color)]">
                <button
                  type="button"
                  onClick={() => onPreview(candidate)}
                  className="h-7 px-2 inline-flex items-center gap-1 border border-[var(--ty-border-color)] rounded-ty-sm text-[var(--ty-primary-color)] cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  详情
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);
const CandidateCard: React.FC<{
  candidate: ScoredCandidate;
  index: number;
  resultAttributes: ResultAttribute[];
  selected: boolean;
  compareDisabled: boolean;
  onPreview: () => void;
  onToggle: () => void;
}> = ({
  candidate,
  index,
  resultAttributes,
  selected,
  compareDisabled,
  onPreview,
  onToggle,
}) => {
  const meta = getCandidateMeta(candidate);
  const hasImage = index % 3 !== 2;
  return (
    <article className="border border-[var(--ty-border-color)] rounded-ty-sm overflow-hidden bg-[var(--ty-fill-white-color)]">
      <div className="h-28 flex items-center justify-center bg-[var(--ty-fill-weak-dark-color)] border-b border-[var(--ty-border-color)]">
        {hasImage ? (
          <Package className="w-9 h-9 text-[var(--ty-primary-color)]" />
        ) : (
          <div className="text-center text-[var(--ty-font-sub-light-color)]">
            <ImageOff className="w-7 h-7 mx-auto" />
            <span className="text-ty-2xs">暂无缩略图</span>
          </div>
        )}
      </div>
      <div className="p-3 space-y-2">
        <div className="min-w-0">
          <div
            className="truncate text-ty-xs font-semibold"
            title={candidate.objectName}
          >
            {candidate.objectName}
          </div>
          <div className="font-mono text-ty-2xs text-[var(--ty-font-sub-color)]">
            {candidate.objectId}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-ty-2xs text-[var(--ty-font-sub-color)]">
          <span>类型 {meta.type}</span>
          <span>来源 {meta.source}</span>
          <span className="col-span-2 truncate" title={candidate.classificationPath}>
            分类 {meta.category}
          </span>
          <span>
            属性相似{" "}
            <strong className="font-mono text-[var(--ty-primary-color)]">
              {candidate.similarityScore.toFixed(2)}%
            </strong>
          </span>
          <span>覆盖 {candidate.coverageRate}%</span>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-[var(--ty-border-light-color)] pt-2 text-ty-2xs">
          {resultAttributes.map((attribute) => (
            <div key={attribute.fieldKey} className="min-w-0">
              <span className="block truncate text-[var(--ty-font-sub-color)]">
                {attribute.label}
              </span>
              <strong
                className="block truncate text-[var(--ty-font-main-color)]"
                title={getResultAttributeValue(candidate, attribute.rule)}
              >
                {getResultAttributeValue(candidate, attribute.rule)}
              </strong>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onPreview}
            className="flex-1 h-8 inline-flex justify-center items-center gap-1 rounded-ty-sm border border-[var(--ty-border-color)] text-ty-xs text-[var(--ty-primary-color)] cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            详情
          </button>
          <button
            type="button"
            onClick={onToggle}
            disabled={compareDisabled}
            title={
              compareDisabled ? "最多选择 4 件；请先移除已选候选。" : undefined
            }
            className={`flex-1 h-8 rounded-ty-sm text-ty-xs cursor-pointer disabled:opacity-50 ${selected ? "bg-[var(--ty-primary-color)] text-[var(--ty-font-white-color)]" : "border border-[var(--ty-border-color)] text-[var(--ty-font-main-color)]"}`}
          >
            {selected ? "已加入对比" : "加入对比"}
          </button>
        </div>
      </div>
    </article>
  );
};
const CompareTray: React.FC<{
  count: number;
  outsideCurrentFilters: number;
  onOpen: () => void;
  onClear: () => void;
}> = ({ count, outsideCurrentFilters, onOpen, onClear }) => (
  <section
    id="client-v2-compare-tray"
    aria-live="polite"
    className="fixed bottom-4 right-4 z-[60] w-[min(420px,calc(100vw-32px))] rounded-ty-sm border border-[var(--ty-border-color)] bg-[var(--ty-fill-white-color)] px-3 py-2 shadow-ty-lg"
  >
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1.5 text-ty-xs font-semibold text-[var(--ty-font-main-color)]">
          <Layers3 className="w-4 h-4 text-[var(--ty-primary-color)]" />
          已选 {count}/4 件
        </span>
        {count >= 4 && (
          <span className="min-h-5 inline-flex items-center rounded-ty-xs bg-[var(--ty-orange-lightest-color)] px-1.5 text-ty-2xs text-[var(--ty-orange-color)]">
            最多选择 4 件
          </span>
        )}
        {outsideCurrentFilters > 0 && (
          <span className="min-h-5 inline-flex items-center rounded-ty-xs bg-[var(--ty-orange-lightest-color)] px-1.5 text-ty-2xs text-[var(--ty-orange-color)]">
            {outsideCurrentFilters} 件不在当前筛选
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onClear}
          className="h-8 px-2 text-ty-xs text-[var(--ty-font-sub-color)] cursor-pointer"
        >
          清空
        </button>
        <button
          type="button"
          onClick={onOpen}
          className="h-8 px-3 inline-flex items-center gap-1.5 rounded-ty-sm bg-[var(--ty-primary-color)] text-[var(--ty-font-white-color)] text-ty-xs font-semibold cursor-pointer"
        >
          查看对比
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  </section>
);

const ComparePanel: React.FC<{
  candidates: ScoredCandidate[];
  reference: ReferenceObject | null;
  attributes: ResultAttribute[];
  displayAttributes: ResultAttribute[];
  currentCandidateIds: Set<string>;
  onClose: () => void;
  onClear: () => void;
  onToggle: (candidate: ScoredCandidate) => void;
}> = ({
  candidates,
  reference,
  attributes,
  displayAttributes,
  currentCandidateIds,
  onClose,
  onClear,
  onToggle,
}) => (
  <section
    role="dialog"
    aria-modal="true"
    aria-labelledby="client-v2-compare-panel-title"
    className="w-[min(1080px,100vw)] h-full bg-[var(--ty-fill-white-color)] shadow-ty-lg border-l border-[var(--ty-border-color)] flex flex-col overflow-hidden"
    id="client-v2-compare-panel"
  >
    <header className="p-4 border-b border-[var(--ty-border-color)] bg-[var(--ty-fill-weak-dark-color)] flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Layers3 className="w-5 h-5 shrink-0 text-[var(--ty-primary-color)]" />
          <h2
            id="client-v2-compare-panel-title"
            className="text-ty-lg font-semibold text-[var(--ty-font-main-color)]"
          >
            候选件对比（{candidates.length}/4）
          </h2>
          <HelpTooltip
            label="查看候选件对比说明"
            content="以当前查询基准和参与评分的字段逐项对照；字段得分不另行生成新的总分。"
          />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onClear}
          className="h-8 px-3 rounded-ty-sm border border-[var(--ty-border-color)] bg-[var(--ty-fill-white-color)] text-ty-xs cursor-pointer"
        >
          清空
        </button>
        <button
          type="button"
          aria-label="关闭候选件对比"
          onClick={onClose}
          className="h-8 w-8 inline-flex items-center justify-center rounded-ty-sm text-[var(--ty-font-sub-color)] hover:bg-[var(--ty-fill-color)] cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </header>
    <div className="flex-1 overflow-auto p-4 space-y-3">
      {reference && attributes.length > 0 ? (
        <div className="overflow-x-auto border border-[var(--ty-border-color)] rounded-ty-sm">
          <table className="ty-data-table min-w-[820px] w-full text-left text-ty-xs border-collapse">
            <thead>
              <tr className="bg-[var(--ty-fill-weak-dark-color)] border-b border-[var(--ty-border-color)] text-[var(--ty-font-sub-color)] align-top">
                <th className="p-3 min-w-36">评分属性</th>
                <th className="p-3 min-w-48">
                  <span className="block text-[var(--ty-font-main-color)]">查询基准</span>
                  <span className="block mt-1 font-mono text-ty-2xs font-normal">
                    {reference.objectId}
                  </span>
                </th>
                {candidates.map((candidate) => (
                  <th key={candidate.objectId} className="p-3 min-w-48">
                    <div className="flex items-start justify-between gap-2">
                      <span className="min-w-0">
                        <span
                          className="block truncate text-[var(--ty-font-main-color)]"
                          title={candidate.objectName}
                        >
                          {candidate.objectName}
                        </span>
                        <span className="block mt-1 font-mono text-ty-2xs font-normal">
                          {candidate.objectId}
                        </span>
                        <span className="block mt-1 font-mono text-[var(--ty-primary-color)]">
                          {candidate.similarityScore.toFixed(2)}%
                        </span>
                        {!currentCandidateIds.has(candidate.objectId) && (
                          <span className="inline-flex mt-1 min-h-5 items-center rounded-ty-xs bg-[var(--ty-orange-lightest-color)] px-1.5 text-ty-2xs font-normal text-[var(--ty-orange-color)]">
                            当前筛选外
                          </span>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => onToggle(candidate)}
                        aria-label={`移除 ${candidate.objectId}`}
                        className="shrink-0 p-1 rounded-ty-xs hover:bg-[var(--ty-fill-color)] cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {attributes.map((attribute) => (
                <tr
                  key={attribute.fieldKey}
                  className="border-b last:border-b-0 border-[var(--ty-border-light-color)] align-top"
                >
                  <th className="p-3 font-medium text-[var(--ty-font-main-color)]">
                    <span className="block">{attribute.label}</span>
                    <span className="block mt-1 font-mono text-ty-2xs font-normal text-[var(--ty-font-sub-color)]">
                      权重 {attribute.rule.weight}%
                    </span>
                  </th>
                  <td className="p-3 font-medium text-[var(--ty-font-main-color)] break-words">
                    {getReferenceAttributeValue(reference, attribute.rule)}
                  </td>
                  {candidates.map((candidate) => {
                    const detail = candidate.compareFields.find(
                      (field) => field.fieldKey === attribute.fieldKey,
                    );
                    const referenceValue = getReferenceAttributeValue(
                      reference,
                      attribute.rule,
                    );
                    const candidateValue = detail
                      ? formatCompareValue(detail.candidateValue)
                      : getResultAttributeValue(candidate, attribute.rule);
                    const hasValueDifference = detail
                      ? hasFieldValueDifference(detail)
                      : referenceValue !== candidateValue;
                    return (
                      <td key={candidate.objectId} className="p-3">
                        <span
                          className={`block font-medium break-words ${hasValueDifference ? "text-[var(--ty-orange-color)]" : "text-[var(--ty-font-main-color)]"}`}
                        >
                          {candidateValue}
                        </span>
                        <div className="mt-2 flex flex-wrap gap-1.5 text-ty-2xs">
                          <span
                            className={`inline-flex min-h-5 items-center px-1.5 rounded-ty-xs ${hasValueDifference ? "bg-[var(--ty-orange-lightest-color)] text-[var(--ty-orange-color)]" : "bg-[var(--ty-green-lightest-color)] text-[var(--ty-font-main-light-color)]"}`}
                          >
                            {detail
                              ? getFieldDifferenceLabel(detail)
                              : hasValueDifference
                                ? "有差异"
                                : "一致"}
                          </span>
                          <span className="inline-flex min-h-5 items-center px-1.5 rounded-ty-xs bg-[var(--ty-fill-color)] text-[var(--ty-font-sub-color)]">
                            {detail ? getFieldScoreLabel(detail) : "无字段明细"}
                          </span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-8 text-center text-ty-xs text-[var(--ty-font-sub-color)]">
          当前查询没有可用于对比的评分属性。
        </div>
      )}
      {reference && displayAttributes.length > 0 && (
        <details className="border border-[var(--ty-border-color)] rounded-ty-sm overflow-hidden">
          <summary className="cursor-pointer px-3 py-2 bg-[var(--ty-fill-weak-dark-color)] text-ty-xs font-semibold text-[var(--ty-font-main-color)]">
            其他展示属性（{displayAttributes.length}）
          </summary>
          <div className="overflow-x-auto border-t border-[var(--ty-border-color)]">
            <table className="ty-data-table min-w-[820px] w-full text-left text-ty-xs border-collapse">
              <thead>
                <tr className="bg-[var(--ty-fill-weak-dark-color)] text-[var(--ty-font-sub-color)] align-top">
                  <th className="p-3 min-w-36">展示属性</th>
                  <th className="p-3 min-w-48">
                    <span className="block text-[var(--ty-font-main-color)]">查询基准</span>
                    <span className="block mt-1 font-mono text-ty-2xs font-normal">
                      {reference.objectId}
                    </span>
                  </th>
                  {candidates.map((candidate) => (
                    <th key={candidate.objectId} className="p-3 min-w-48">
                      <span
                        className="block truncate text-[var(--ty-font-main-color)]"
                        title={candidate.objectName}
                      >
                        {candidate.objectName}
                      </span>
                      <span className="block mt-1 font-mono text-ty-2xs font-normal">
                        {candidate.objectId}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayAttributes.map((attribute) => (
                  <tr
                    key={attribute.fieldKey}
                    className="border-t border-[var(--ty-border-light-color)] align-top"
                  >
                    <th className="p-3 font-medium text-[var(--ty-font-main-color)]">
                      {attribute.label}
                    </th>
                    <td className="p-3 font-medium text-[var(--ty-font-main-color)] break-words">
                      {getReferenceAttributeValue(reference, attribute.rule)}
                    </td>
                    {candidates.map((candidate) => {
                      const detail = candidate.compareFields.find(
                        (field) => field.fieldKey === attribute.fieldKey,
                      );
                      const referenceValue = getReferenceAttributeValue(
                        reference,
                        attribute.rule,
                      );
                      const candidateValue = detail
                        ? formatCompareValue(detail.candidateValue)
                        : getResultAttributeValue(candidate, attribute.rule);
                      const hasValueDifference = detail
                        ? hasFieldValueDifference(detail)
                        : referenceValue !== candidateValue;
                      return (
                        <td key={candidate.objectId} className="p-3">
                          <span
                            className={`block font-medium break-words ${hasValueDifference ? "text-[var(--ty-orange-color)]" : "text-[var(--ty-font-main-color)]"}`}
                          >
                            {candidateValue}
                          </span>
                          <span
                            className={`inline-flex mt-2 min-h-5 items-center rounded-ty-xs px-1.5 text-ty-2xs ${hasValueDifference ? "bg-[var(--ty-orange-lightest-color)] text-[var(--ty-orange-color)]" : "bg-[var(--ty-green-lightest-color)] text-[var(--ty-font-main-light-color)]"}`}
                          >
                            {detail
                              ? getFieldDifferenceLabel(detail)
                              : hasValueDifference
                                ? "有差异"
                                : "一致"}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  </section>
);
const FieldDetailTable: React.FC<{
  fields: CompareFieldResult[];
  showScore: boolean;
}> = ({ fields, showScore }) => (
  <div className="overflow-x-auto border border-[var(--ty-border-color)] rounded-ty-sm">
    <table className="ty-data-table min-w-[820px] w-full text-left text-ty-xs border-collapse">
      <thead>
        <tr className="bg-[var(--ty-fill-weak-dark-color)] text-[var(--ty-font-sub-color)]">
          <th className="p-3 min-w-32">字段</th>
          <th className="p-3 min-w-36">基准值</th>
          <th className="p-3 min-w-36">候选值</th>
          <th className="p-3 min-w-24">差异</th>
          <th className="p-3 min-w-24">
            {showScore ? "字段贡献" : "处理方式"}
          </th>
          <th className="p-3 min-w-52">命中或缺失原因</th>
        </tr>
      </thead>
      <tbody>
        {fields.map((field) => (
          <tr
            key={field.fieldKey}
            className="border-t border-[var(--ty-border-light-color)] align-top"
          >
            <th className="p-3 font-medium text-[var(--ty-font-main-color)]">
              <span className="block">{field.fieldLabel}</span>
              {showScore && (
                <span className="block mt-1 font-mono text-ty-2xs font-normal text-[var(--ty-font-sub-color)]">
                  权重 {field.weight}%
                </span>
              )}
            </th>
            <td className="p-3 break-words">
              {formatCompareValue(field.sourceValue)}
            </td>
            <td
              className={`p-3 break-words font-medium ${hasFieldValueDifference(field) ? "text-[var(--ty-orange-color)]" : "text-[var(--ty-font-main-color)]"}`}
            >
              {formatCompareValue(field.candidateValue)}
            </td>
            <td className="p-3">
              <span
                className={`inline-flex min-h-5 items-center rounded-ty-xs px-1.5 text-ty-2xs ${getFieldDifferenceTone(field)}`}
              >
                {getFieldDifferenceLabel(field)}
              </span>
            </td>
            <td className="p-3">
              <span className="font-mono text-[var(--ty-font-main-color)]">
                {showScore
                  ? getFieldScoreLabel(field)
                  : "仅展示"}
              </span>
            </td>
            <td className="p-3 leading-5 text-[var(--ty-font-sub-color)]">
              {field.reason || "仅用于对比展示，不参与相似度评分。"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const PreviewDrawer: React.FC<{
  candidate: ScoredCandidate;
  reference: ReferenceObject | null;
  queryContext: string;
  ruleContext: string;
  onClose: () => void;
}> = ({ candidate, reference, queryContext, ruleContext, onClose }) => {
  const scoringFields = candidate.compareFields.filter(
    (field) => field.isScoreActive,
  );
  const displayOnlyDifferences = candidate.compareFields.filter(
    (field) => !field.isScoreActive && hasFieldValueDifference(field),
  );

  return (
  <div
    className="fixed inset-0 z-[80] bg-ty-overlay flex justify-end"
    onMouseDown={(event) => event.target === event.currentTarget && onClose()}
  >
    <section
      role="dialog"
      aria-modal="true"
      aria-label="候选件详情"
      className="w-[min(980px,100vw)] h-full bg-[var(--ty-fill-white-color)] shadow-ty-lg flex flex-col overflow-hidden"
    >
      <div className="p-4 flex items-center justify-between border-b border-[var(--ty-border-color)] bg-[var(--ty-fill-weak-dark-color)]">
        <div>
          <div className="flex items-center gap-1">
            <h2 className="text-ty-lg font-semibold">候选件详情</h2>
            <HelpTooltip
              label="查看候选件详情说明"
              content="字段得分使用本次查询采用的规则计算；仅展示字段不参与相似度评分。"
            />
          </div>
          <p className="text-ty-2xs text-[var(--ty-font-sub-color)]">
            当前查询基准：{queryContext}
          </p>
        </div>
        <button
          type="button"
          aria-label="关闭候选件详情"
          onClick={onClose}
          className="p-2 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="h-28 rounded-ty-sm bg-[var(--ty-fill-weak-dark-color)] flex items-center justify-center">
          <Package className="w-16 h-16 text-[var(--ty-primary-color)]" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 text-ty-xs rounded-ty-sm border border-[var(--ty-border-color)] p-3">
          <div>
            <span className="text-[var(--ty-font-sub-color)]">物料编码</span>
            <strong className="block font-mono">{candidate.objectId}</strong>
          </div>
          <div>
            <span className="text-[var(--ty-font-sub-color)]">生命周期</span>
            <strong className="block">{candidate.lifecycleState}</strong>
          </div>
          <div>
            <span className="text-[var(--ty-font-sub-color)]">材质</span>
            <strong className="block">{candidate.material}</strong>
          </div>
          <div>
            <span className="text-[var(--ty-font-sub-color)]">总分</span>
            <strong className="block font-mono text-[var(--ty-primary-color)]">
              {candidate.similarityScore.toFixed(2)}%
            </strong>
          </div>
          <div>
            <span className="text-[var(--ty-font-sub-color)]">分档</span>
            <strong className="block">{candidate.similarityTier}</strong>
          </div>
          <div>
            <span className="text-[var(--ty-font-sub-color)]">覆盖率</span>
            <strong className="block font-mono">{candidate.coverageRate}%</strong>
          </div>
          <div className="col-span-2 lg:col-span-3 min-w-0">
            <span className="text-[var(--ty-font-sub-color)]">采用规则</span>
            <strong className="block mt-0.5 truncate" title={ruleContext}>
              {ruleContext}
            </strong>
          </div>
        </div>
        <section>
          <h3 className="mb-2 text-ty-sm font-semibold text-[var(--ty-font-main-color)]">
            评分字段明细
          </h3>
          {reference && scoringFields.length > 0 ? (
            <FieldDetailTable fields={scoringFields} showScore />
          ) : (
            <p className="rounded-ty-sm border border-[var(--ty-border-color)] p-3 text-ty-xs text-[var(--ty-font-sub-color)]">
              当前候选没有可展示的评分字段明细。
            </p>
          )}
        </section>
        <section>
          <h3 className="mb-2 text-ty-sm font-semibold text-[var(--ty-font-main-color)]">
            非评分属性差异
          </h3>
          {displayOnlyDifferences.length > 0 ? (
            <FieldDetailTable fields={displayOnlyDifferences} showScore={false} />
          ) : (
            <p className="rounded-ty-sm border border-[var(--ty-border-color)] p-3 text-ty-xs text-[var(--ty-font-sub-color)]">
              未发现非评分属性差异。
            </p>
          )}
        </section>
      </div>
    </section>
  </div>
  );
};
