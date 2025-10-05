import { computed, reactive, ref, watchEffect } from "vue";
import type {
  NamedCollection,
  NamedEntity,
  RawPolicy,
  RawRule,
  RuleFilters,
  RuleRow,
  RuleComment
} from "../types";

interface UsePoliciesOptions {
  sourceUrl?: string;
}

interface UsePoliciesResult {
  loading: Readonly<{ value: boolean }>;
  error: Readonly<{ value: string | null }>;
  rules: Readonly<{ value: RuleRow[] }>;
  filters: RuleFilters;
  policyOptions: Readonly<{ value: Array<{ id: string; name: string }> }>;
  actionOptions: Readonly<{ value: string[] }>;
  reload: () => Promise<void>;
}

const defaultFilters = (): RuleFilters => ({
  search: "",
  policyId: null,
  action: null,
  enabledOnly: false
});

export function usePolicies(options: UsePoliciesOptions = {}): UsePoliciesResult {
  const sourceUrl = options.sourceUrl ?? "/data/policies.json";
  const loading = ref(false);
  const error = ref<string | null>(null);
  const rawRows = ref<RuleRow[]>([]);
  const filters = reactive<RuleFilters>(defaultFilters());

  const policyOptions = computed(() => {
    const seen = new Map<string, string>();
    rawRows.value.forEach((row) => {
      if (!seen.has(row.policyId)) {
        seen.set(row.policyId, row.policyName || row.policyId);
      }
    });
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  });

  const actionOptions = computed(() => {
    const set = new Set<string>();
    rawRows.value.forEach((row) => {
      if (row.action) {
        set.add(row.action);
      }
    });
    return Array.from(set.values()).sort();
  });

  const filteredRules = ref<RuleRow[]>([]);

  watchEffect(() => {
    const search = filters.search.trim().toLowerCase();
    filteredRules.value = rawRows.value.filter((row) => {
      if (filters.policyId && row.policyId !== filters.policyId) {
        return false;
      }
      if (filters.action && row.action !== filters.action) {
        return false;
      }
      if (filters.enabledOnly && !row.enabled) {
        return false;
      }
      if (!search) {
        return true;
      }
      return (
        row.policyName.toLowerCase().includes(search) ||
        row.ruleName.toLowerCase().includes(search) ||
        row.comments.some((comment) => comment.toLowerCase().includes(search)) ||
        matchesList(row.sourceNetworks, search) ||
        matchesList(row.destinationNetworks, search) ||
        matchesList(row.applications, search) ||
        matchesList(row.urls, search)
      );
    });
  });

  async function reload(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const response = await fetch(sourceUrl, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const payload = (await response.json()) as RawPolicy[];
      rawRows.value = flattenPolicies(payload);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      error.value = message;
      rawRows.value = [];
    } finally {
      loading.value = false;
    }
  }

  reload();

  return {
    loading,
    error,
    rules: filteredRules,
    filters,
    policyOptions,
    actionOptions,
    reload
  };
}

function flattenPolicies(policies: RawPolicy[]): RuleRow[] {
  const rows: RuleRow[] = [];
  policies.forEach((entry) => {
    const policy = entry.policy;
    const rules = entry.rules ?? [];
    rules.forEach((rule) => {
      rows.push(transformRule(policy, rule));
    });
  });
  return rows;
}

function transformRule(policy: RawPolicy["policy"], rule: RawRule): RuleRow {
  return {
    policyName: policy.name ?? "Sin nombre",
    policyId: policy.id ?? "",
    policyDescription: policy.description ?? "",
    ruleName: rule.name ?? "Sin nombre",
    ruleId: rule.id ?? "",
    action: (rule.action ?? "").toUpperCase(),
    enabled: rule.enabled ?? false,
    section: rule.section?.name ?? "",
    index: rule.ruleIndex ?? 0,
    sourceZones: extractNames(rule.sourceZones),
    destinationZones: extractNames(rule.destinationZones),
    sourceNetworks: extractCollection(rule.sourceNetworks),
    destinationNetworks: extractCollection(rule.destinationNetworks),
    sourceDynamicObjects: extractCollection(rule.sourceDynamicObjects),
    destinationDynamicObjects: extractCollection(rule.destinationDynamicObjects),
    sourcePorts: extractCollection(rule.sourcePorts),
    destinationPorts: extractCollection(rule.destinationPorts),
    applications: extractCollection(rule.applications),
    urls: extractCollection(rule.urls),
    variableSet: extractEntity(rule.variableSet),
    ipsPolicy: extractEntity(rule.ipsPolicy),
    filePolicy: extractEntity(rule.filePolicy),
    timeRanges: extractCollection(rule.timeRangeObjects),
    securityGroupTags: extractCollection(rule.sourceSecurityGroupTags),
    snmpAlerts: extractCollection(rule.snmpConfig),
    logBegin: normalizeBool(rule.logBegin),
    logEnd: normalizeBool(rule.logEnd),
    logFiles: normalizeBool(rule.logFiles),
    enableSyslog: normalizeBool(rule.enableSyslog),
    sendEventsToFMC: normalizeBool(rule.sendEventsToFMC),
    comments: (rule.commentHistoryList ?? [])
      .map((item): RuleComment => ({
        text: typeof item?.comment === "string" ? item.comment.trim() : "",
        user: typeof item?.createdBy === "string" ? item.createdBy.trim() : (typeof item?.user?.name === "string" ? item.user.name.trim() : undefined),
        date: typeof item?.createdOn === "string" ? item.createdOn : (typeof item?.date === "string" ? item.date : undefined)
      }))
      .filter((entry) => entry.text || entry.user || entry.date)
  };
}

function extractNames(collection?: { items?: NamedEntity[] }): string[] {
  if (!collection?.items) {
    return [];
  }
  return uniqueStrings(collection.items.map(resolveName));
}

function extractCollection(collection?: NamedCollection): string[] {
  if (!collection) {
    return [];
  }
  const values: string[] = [];
  if (collection.items) {
    values.push(...collection.items.map(resolveName));
  }
  if (collection.objects) {
    values.push(...collection.objects.map(resolveName));
  }
  if (collection.applications) {
    values.push(...collection.applications.map(resolveName));
  }
  return uniqueStrings(values);
}

function extractEntity(entity?: NamedCollection | NamedEntity | null): string[] {
  if (!entity) {
    return [];
  }
  if (Array.isArray((entity as NamedCollection).items) ||
      Array.isArray((entity as NamedCollection).objects) ||
      Array.isArray((entity as NamedCollection).applications)) {
    return extractCollection(entity as NamedCollection);
  }
  return uniqueStrings([resolveName(entity as NamedEntity)]);
}

function normalizeBool(value: unknown): boolean | null {
  if (typeof value === "boolean") {
    return value;
  }
  return null;
}

function resolveName(entity?: NamedEntity): string {
  const candidate = entity?.name || entity?.value || entity?.url || "";
  return candidate.trim();
}

function matchesList(list: string[], search: string): boolean {
  return list.some((item) => item.toLowerCase().includes(search));
}

function uniqueStrings(values: string[]): string[] {
  const set = new Set(values.filter(Boolean));
  return Array.from(set.values());
}
