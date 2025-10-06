<template>
  <div class="space-y-6">
    <header class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h2 class="text-2xl font-semibold">Change Tracking</h2>
        <p class="text-sm text-slate-400">
          Compara el snapshot actual con un baseline para identificar reglas agregadas, eliminadas o modificadas.
        </p>
      </div>
      <div class="flex flex-wrap gap-2 text-sm">
        <input
          ref="fileInput"
          class="hidden"
          type="file"
          accept="application/json"
          @change="handleFileUpload"
        />
        <button class="rounded-md border border-slate-700 px-3 py-2 hover:bg-slate-800" @click="openFilePicker">
          Cargar baseline (JSON)
        </button>
        <button
          class="rounded-md border border-slate-700 px-3 py-2 hover:bg-slate-800"
          :disabled="loadingBaseline"
          @click="reloadDefaultBaseline"
        >
          Recargar baseline por defecto
        </button>
        <button
          class="rounded-md border border-slate-700 px-3 py-2 hover:bg-slate-800"
          :disabled="!history.length"
          @click="clearHistory"
        >
          Limpiar historial
        </button>
        <button
          class="rounded-md border border-slate-700 px-3 py-2 hover:bg-slate-800"
          :disabled="!canExportCsv"
          @click="exportCsvReport"
        >
          Exportar cambios (CSV)
        </button>
      </div>
    </header>

    <section
      v-if="pendingBaseline && pendingBaselineDiff"
      class="space-y-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100"
    >
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 class="text-lg font-semibold text-amber-100">Validacion de nuevo baseline</h3>
          <p class="text-xs text-amber-200">
            Comparando "{{ baselineLabel }}" con "{{ pendingBaseline.label }}".
          </p>
        </div>
        <div class="flex flex-wrap gap-2 text-xs">
          <button
            class="rounded-md border border-amber-200/60 bg-amber-200/10 px-3 py-2 font-semibold text-amber-50 hover:bg-amber-200/20"
            @click="confirmPendingBaseline"
          >
            Reemplazar baseline
          </button>
          <button
            class="rounded-md border border-amber-200/60 px-3 py-2 text-amber-50 hover:bg-amber-200/10"
            @click="cancelPendingBaseline"
          >
            Cancelar
          </button>
        </div>
      </div>
      <div class="grid gap-3 sm:grid-cols-3">
        <div :class="statClass(pendingBaselineDiff.summary.addedRules, 'emerald')">
          <p class="text-[11px] uppercase tracking-wide text-amber-200">Reglas nuevas en baseline</p>
          <p class="text-lg font-semibold text-amber-50">{{ pendingBaselineDiff.summary.addedRules }}</p>
        </div>
        <div :class="statClass(pendingBaselineDiff.summary.removedRules, 'rose')">
          <p class="text-[11px] uppercase tracking-wide text-amber-200">Reglas que se perderan</p>
          <p class="text-lg font-semibold text-amber-50">{{ pendingBaselineDiff.summary.removedRules }}</p>
        </div>
        <div :class="statClass(pendingBaselineDiff.summary.modifiedRules, 'sky')">
          <p class="text-[11px] uppercase tracking-wide text-amber-200">Reglas con cambios</p>
          <p class="text-lg font-semibold text-amber-50">{{ pendingBaselineDiff.summary.modifiedRules }}</p>
        </div>
      </div>
      <div class="space-y-2 text-[11px] text-amber-200">
        <div v-if="pendingBaselineDiff.added.length">
          <p class="font-semibold text-amber-100">Reglas nuevas</p>
          <ul class="list-disc space-y-1 pl-4">
            <li v-for="rule in pendingBaselineDiff.added.slice(0, 3)" :key="'pending-add-' + rule.policyId + rule.ruleId">
              {{ rule.policyName }} - {{ rule.ruleName }}
            </li>
          </ul>
          <p v-if="pendingBaselineDiff.added.length > 3" class="italic text-amber-300">... y {{ pendingBaselineDiff.added.length - 3 }} mas.</p>
        </div>
        <div v-if="pendingBaselineDiff.removed.length">
          <p class="font-semibold text-amber-100">Reglas que se eliminaran</p>
          <ul class="list-disc space-y-1 pl-4">
            <li v-for="rule in pendingBaselineDiff.removed.slice(0, 3)" :key="'pending-rem-' + rule.policyId + rule.ruleId">
              {{ rule.policyName }} - {{ rule.ruleName }}
            </li>
          </ul>
          <p v-if="pendingBaselineDiff.removed.length > 3" class="italic text-amber-300">... y {{ pendingBaselineDiff.removed.length - 3 }} mas.</p>
        </div>
        <div v-if="pendingBaselineDiff.modified.length">
          <p class="font-semibold text-amber-100">Cambios relevantes</p>
          <ul class="list-disc space-y-1 pl-4">
            <li
              v-for="item in pendingBaselineDiff.modified.slice(0, 3)"
              :key="'pending-mod-' + item.key"
            >
              {{ item.policyName }} - {{ item.ruleName }} ({{ item.changes.length }} campos)
            </li>
          </ul>
          <p v-if="pendingBaselineDiff.modified.length > 3" class="italic text-amber-300">... y {{ pendingBaselineDiff.modified.length - 3 }} mas.</p>
        </div>
      </div>
    </section>

    <section class="grid gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300">
      <div class="flex flex-col gap-1">
        <span class="text-xs uppercase tracking-wide text-slate-500">Baseline actual</span>
        <span class="text-slate-200">{{ baselineLabel }}</span>
        <span v-if="baselineMeta" class="text-xs text-slate-500">Cargado: {{ formatDate(baselineMeta.loadedAt) }}</span>
      </div>
      <div v-if="baselineError" class="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
        {{ baselineError }}
      </div>
      <div v-else-if="!baselineRules.length" class="text-xs text-slate-500">
        No se detecto un baseline. Carga un archivo JSON exportado previamente para habilitar el seguimiento de cambios.
      </div>
      <div v-if="report" class="grid gap-3">
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div :class="statClass(report.summary.totalCurrentRules)">
            <p class="text-xs uppercase tracking-wide text-slate-400">Total actual</p>
            <p class="text-lg font-semibold text-slate-100">{{ report.summary.totalCurrentRules }}</p>
          </div>
          <div :class="statClass(report.summary.totalBaselineRules)">
            <p class="text-xs uppercase tracking-wide text-slate-400">Baseline</p>
            <p class="text-lg font-semibold text-slate-100">{{ report.summary.totalBaselineRules }}</p>
          </div>
          <div :class="statClass(report.summary.addedRules, 'emerald')">
            <p class="text-xs uppercase tracking-wide text-slate-400">Agregadas</p>
            <p class="text-lg font-semibold text-slate-100">{{ report.summary.addedRules }}</p>
          </div>
          <div :class="statClass(report.summary.removedRules, 'rose')">
            <p class="text-xs uppercase tracking-wide text-slate-400">Eliminadas</p>
            <p class="text-lg font-semibold text-slate-100">{{ report.summary.removedRules }}</p>
          </div>
          <div :class="statClass(report.summary.modifiedRules, 'sky')">
            <p class="text-xs uppercase tracking-wide text-slate-400">Modificadas</p>
            <p class="text-lg font-semibold text-slate-100">{{ report.summary.modifiedRules }}</p>
          </div>
        </div>
      </div>
    </section>

    <TrendChart v-if="historyForChart.length" :history="historyForChart" />

    <section v-if="report" class="space-y-6">
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-xs uppercase tracking-wide text-slate-500">Filtros rapidos:</span>
        <button :class="filterButtonClass('all')" @click="selectFilter('all')">Todos</button>
        <button :class="filterButtonClass('added')" @click="selectFilter('added')">Solo agregadas</button>
        <button :class="filterButtonClass('removed')" @click="selectFilter('removed')">Solo eliminadas</button>
        <button :class="filterButtonClass('critical')" @click="selectFilter('critical')">Modificaciones criticas</button>
      </div>

      <section class="space-y-2 rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-300">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span class="text-[11px] uppercase tracking-wide text-slate-500">Nota del analista</span>
          <span v-if="noteStatus === 'saved'" class="text-[11px] text-emerald-400">Nota guardada</span>
        </div>
        <textarea
          v-model="analystNote"
          class="h-24 w-full rounded-md border border-slate-700 bg-slate-900/60 p-2 text-sm text-slate-200 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          placeholder="Describe decisiones, contexto o pasos a seguir..."
        ></textarea>
        <div class="flex justify-end">
          <button
            class="rounded-md border border-sky-500/60 px-3 py-2 text-xs text-sky-200 hover:bg-sky-500/10 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="!currentHistoryEntry"
            @click="saveAnalystNote"
          >
            Guardar nota
          </button>
        </div>
      </section>

      <div v-if="shouldShowSection('added')">
        <h3 class="text-lg font-semibold text-slate-200">Reglas agregadas ({{ report.summary.addedRules }})</h3>
        <p class="text-xs text-slate-400" v-if="!report.added.length">No se detectaron reglas nuevas.</p>
        <div class="space-y-3" v-else>
          <div v-for="rule in report.added" :key="'added-' + rule.policyId + rule.ruleId" class="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
            <RuleSummary :rule="rule" />
            <ul v-if="describeAddedRule(rule).length" class="mt-2 space-y-1 text-[11px] text-emerald-100">
              <li v-for="(line, idx) in describeAddedRule(rule)" :key="'added-desc-' + rule.policyId + rule.ruleId + idx">
                {{ line }}
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div v-if="shouldShowSection('removed')">
        <h3 class="text-lg font-semibold text-slate-200">Reglas eliminadas ({{ report.summary.removedRules }})</h3>
        <p class="text-xs text-slate-400" v-if="!report.removed.length">No se eliminaron reglas.</p>
        <div class="space-y-3" v-else>
          <div v-for="rule in report.removed" :key="'removed-' + rule.policyId + rule.ruleId" class="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3">
            <RuleSummary :rule="rule" />
            <ul v-if="describeRemovedRule(rule).length" class="mt-2 space-y-1 text-[11px] text-rose-100">
              <li v-for="(line, idx) in describeRemovedRule(rule)" :key="'removed-desc-' + rule.policyId + rule.ruleId + idx">
                {{ line }}
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div v-if="shouldShowSection('modified')">
        <h3 class="text-lg font-semibold text-slate-200">
          Reglas modificadas ({{
            activeFilter === 'critical' ? filteredModified.length : report.summary.modifiedRules
          }})
        </h3>
        <p class="text-xs text-slate-400" v-if="!filteredModified.length">
          {{ activeFilter === 'critical' ? 'No se detectaron modificaciones criticas (accion/estado).' : 'No se detectaron cambios en reglas existentes.' }}
        </p>
        <div class="space-y-4" v-else>
          <details v-for="item in filteredModified" :key="'mod-' + item.key" class="rounded-lg border border-sky-500/30 bg-sky-500/10" open>
            <summary class="cursor-pointer px-3 py-2 text-sm font-medium text-sky-200">
              {{ item.policyName }} - {{ item.ruleName }}
            </summary>
            <div class="space-y-2 px-3 pb-3 text-xs text-slate-200">
              <RuleSummary :rule="item.current" />
              <ul v-if="describeModifiedRuleChange(item).length" class="space-y-1 rounded-md border border-sky-500/30 bg-sky-500/10 p-3 text-[11px] text-sky-100">
                <li v-for="(line, idx) in describeModifiedRuleChange(item)" :key="'mod-desc-' + item.key + idx">
                  {{ line }}
                </li>
              </ul>
              <div class="overflow-x-auto">
                <table class="min-w-full text-left text-slate-200">
                  <thead class="text-[11px] uppercase tracking-wider text-slate-400">
                    <tr>
                      <th class="py-1 pr-3">Campo</th>
                      <th class="py-1 pr-3">Baseline</th>
                      <th class="py-1">Actual</th>
                    </tr>
                  </thead>
                  <tbody class="text-[12px]">
                    <tr v-for="change in item.changes" :key="change.field">
                      <td class="py-1 pr-3 align-top text-slate-300">{{ change.label }}</td>
                      <td class="py-1 pr-3 align-top text-slate-500">{{ change.previous || '-' }}</td>
                      <td class="py-1 align-top text-slate-200">{{ change.current || '-' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </details>
        </div>
      </div>
    </section>

    <section class="space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-slate-200">Histórico de cambios</h3>
        <span class="text-xs text-slate-500">Se almacenan hasta 20 comparaciones recientes.</span>
      </div>
      <div v-if="!history.length" class="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-4 text-xs text-slate-500">
        Aún no hay historial disponible.
      </div>
      <div v-else class="space-y-3">
        <details v-for="entry in history" :key="entry.id" class="rounded-lg border border-slate-800 bg-slate-900/60" open>
          <summary class="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm text-slate-200">
            <span>{{ formatDate(entry.timestamp) }} - {{ entry.baselineLabel }}</span>
            <span class="text-xs text-slate-500">
              +{{ entry.report.summary.addedRules }} / -{{ entry.report.summary.removedRules }} / Delta {{ entry.report.summary.modifiedRules }}
            </span>
          </summary>
          <div class="space-y-2 px-3 pb-3 text-xs text-slate-300">
            <p>Total actual: {{ entry.report.summary.totalCurrentRules }} - Baseline: {{ entry.report.summary.totalBaselineRules }}</p>
            <p v-if="entry.note" class="text-[11px] text-emerald-300">Nota: {{ entry.note }}</p>
            <div v-if="entry.report.modified.length" class="space-y-2">
              <p class="text-slate-400">Cambios destacados:</p>
              <ul class="text-[11px] text-slate-400">
                <li v-for="item in entry.report.modified" :key="entry.id + item.key">
                  {{ item.policyName }} - {{ item.ruleName }} ({{ item.changes.length }} campos modificados)
                </li>
              </ul>
            </div>
          </div>
        </details>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, withDefaults } from "vue";
import type { ChangeHistoryEntry, ModifiedRuleChange, RuleChangeReport, RuleRow } from "../types";
import { diffRuleSets } from "../utils/ruleDiff";
import RuleSummary from "./RuleSummary.vue";
import TrendChart from "./TrendChart.vue";
import { flattenPolicies } from "../composables/usePolicies";

type BaselineSource = "default" | "upload";

interface BaselineMeta {
  label: string;
  source: BaselineSource;
  loadedAt: string;
}

interface PendingBaseline {
  label: string;
  source: BaselineSource;
  rules: RuleRow[];
  loadedAt: string;
}

const props = withDefaults(
  defineProps<{
    rules?: RuleRow[] | Readonly<{ value: RuleRow[] }>;
    loading?: boolean | Readonly<{ value: boolean }>;
  }>(),
  {
    rules: () => [],
    loading: false,
  }
);

const currentRules = computed(() => {
  const source = props.rules as unknown;
  if (Array.isArray(source)) {
    return source;
  }
  if (source && typeof source === 'object' && 'value' in source) {
    return (source as { value: RuleRow[] }).value ?? [];
  }
  return [];
});

const isLoading = computed(() => {
  const source = props.loading as unknown;
  if (typeof source === 'boolean') {
    return source;
  }
  if (source && typeof source === 'object' && 'value' in source) {
    return Boolean((source as { value: boolean }).value);
  }
  return false;
});

const BASELINE_URL = "/data/policies-baseline.json";
const HISTORY_KEY = "firewall-change-history";

const fileInput = ref<HTMLInputElement | null>(null);
const baselineRules = ref<RuleRow[]>([]);
const baselineMeta = ref<BaselineMeta | null>(null);
const baselineError = ref<string | null>(null);
const loadingBaseline = ref(false);
const pendingBaseline = ref<PendingBaseline | null>(null);

const baselineLabel = computed(() => baselineMeta.value?.label ?? "Sin baseline");

const report = computed<RuleChangeReport | null>(() => {
  if (!baselineRules.value.length || !currentRules.value.length) {
    return null;
  }
  const diff = diffRuleSets(currentRules.value, baselineRules.value);
  diff.baselineLabel = baselineLabel.value;
  diff.currentLabel = `Snapshot actual (${new Date().toLocaleString()})`;
  return diff;
});

const canExportCsv = computed(() => {
  const current = report.value;
  if (!current) {
    return false;
  }
  return current.added.length > 0 || current.modified.length > 0 || current.removed.length > 0;
});

const history = ref<ChangeHistoryEntry[]>(loadHistory());

const activeFilter = ref<"all" | "added" | "removed" | "critical">("all");
const analystNote = ref("");
const noteStatus = ref<"idle" | "saved">("idle");
let noteStatusTimeout: ReturnType<typeof setTimeout> | null = null;

const currentReportId = computed(() => {
  const current = report.value;
  if (!current) {
    return null;
  }
  return `${current.baselineHash}|${current.currentHash}`;
});

const currentHistoryEntry = computed(() => {
  const id = currentReportId.value;
  if (!id) {
    return null;
  }
  return history.value.find((entry) => entry.id === id) ?? null;
});

const historyForChart = computed(() => {
  if (!history.value.length) {
    return [];
  }
  return [...history.value].slice(0, 12).reverse();
});

const filteredModified = computed(() => {
  const current = report.value;
  if (!current) {
    return [];
  }
  if (activeFilter.value === "critical") {
    return current.modified.filter(hasCriticalChange);
  }
  return current.modified;
});

const hasCurrentData = computed(() => Boolean(report.value));
const pendingBaselineDiff = computed<RuleChangeReport | null>(() => {
  if (!pendingBaseline.value || !baselineRules.value.length) {
    return null;
  }
  const diff = diffRuleSets(pendingBaseline.value.rules, baselineRules.value);
  diff.baselineLabel = baselineLabel.value;
  diff.currentLabel = pendingBaseline.value.label;
  return diff;
});

watch(
  currentHistoryEntry,
  (entry) => {
    analystNote.value = entry?.note ?? "";
  },
  { immediate: true }
);

watch(
  () => report.value,
  () => {
    activeFilter.value = "all";
  }
);

watch(
  () => report.value,
  (current) => {
    if (!current) {
      return;
    }
    const id = `${current.baselineHash}|${current.currentHash}`;
    const existing = history.value.find((entry) => entry.id === id);
    if (existing) {
      analystNote.value = existing.note ?? "";
      noteStatus.value = "idle";
      return;
    }
    history.value.unshift({
      id,
      timestamp: new Date().toISOString(),
      baselineLabel: current.baselineLabel,
      currentLabel: current.currentLabel,
      report: current,
      note: analystNote.value.trim() || undefined,
    });
    history.value = history.value.slice(0, 20);
    saveHistory();
    analystNote.value = analystNote.value.trim();
    noteStatus.value = "idle";
  }
);

function statClass(value: number, accent?: "emerald" | "rose" | "sky") {
  const base = "rounded-lg border px-3 py-2 text-center";
  if (accent && value > 0) {
    if (accent === "emerald") {
      return `${base} border-emerald-500/40 bg-emerald-500/10`;
    }
    if (accent === "rose") {
      return `${base} border-rose-500/40 bg-rose-500/10`;
    }
    if (accent === "sky") {
      return `${base} border-sky-500/40 bg-sky-500/10`;
    }
  }
  return `${base} border-slate-800 bg-slate-900/60`;
}

function loadHistory(): ChangeHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ChangeHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

function saveHistory() {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.value));
}

function clearHistory() {
  history.value = [];
  localStorage.removeItem(HISTORY_KEY);
  analystNote.value = "";
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

const ARRAY_FIELDS = new Set<keyof RuleRow>([
  "sourceZones",
  "destinationZones",
  "sourceNetworks",
  "destinationNetworks",
  "sourceDynamicObjects",
  "destinationDynamicObjects",
  "sourcePorts",
  "destinationPorts",
  "applications",
  "urls",
  "variableSet",
  "ipsPolicy",
  "filePolicy",
  "timeRanges",
  "securityGroupTags",
  "snmpAlerts",
]);

const BOOLEAN_FIELDS = new Set<keyof RuleRow>([
  "policyDefaultLogBegin",
  "policyDefaultLogEnd",
  "policyDefaultEnableSyslog",
  "policyDefaultSendEventsToFMC",
  "logBegin",
  "logEnd",
  "logFiles",
  "enableSyslog",
  "sendEventsToFMC",
]);

function hasCriticalChange(item: ModifiedRuleChange): boolean {
  return item.changes.some((change) => change.field === "action" || change.field === "enabled");
}

function shouldShowSection(section: "added" | "removed" | "modified"): boolean {
  if (activeFilter.value === "all") {
    return true;
  }
  if (activeFilter.value === "added") {
    return section === "added";
  }
  if (activeFilter.value === "removed") {
    return section === "removed";
  }
  if (activeFilter.value === "critical") {
    return section === "modified";
  }
  return true;
}

function selectFilter(filter: "all" | "added" | "removed" | "critical") {
  activeFilter.value = filter;
}

function filterButtonClass(filter: "all" | "added" | "removed" | "critical"): string {
  const base = "rounded-md border px-3 py-2 text-xs transition";
  const isActive = activeFilter.value === filter;
  if (isActive) {
    return `${base} border-sky-500/60 bg-sky-500/20 text-sky-100`;
  }
  return `${base} border-slate-700 text-slate-300 hover:bg-slate-800`;
}

function describeAddedRule(rule: RuleRow): string[] {
  const lines: string[] = [];
  lines.push(`Regla nueva con accion ${rule.action || "-"} (${rule.enabled ? "activa" : "inactiva"}).`);
  const originSummary = summarizeArrayField(rule.sourceNetworks, "Origen");
  if (originSummary) {
    lines.push(originSummary);
  }
  const destinationSummary = summarizeArrayField(rule.destinationNetworks, "Destino");
  if (destinationSummary) {
    lines.push(destinationSummary);
  }
  const destinationPortsSummary = summarizeArrayField(rule.destinationPorts, "Puertos destino");
  if (destinationPortsSummary) {
    lines.push(destinationPortsSummary);
  }
  const applicationSummary = summarizeArrayField(rule.applications, "Aplicaciones");
  if (applicationSummary) {
    lines.push(applicationSummary);
  }
  return lines;
}

function describeRemovedRule(rule: RuleRow): string[] {
  const lines: string[] = [];
  lines.push(`Se elimino la regla con accion ${rule.action || "-"} (${rule.enabled ? "activa" : "inactiva"}).`);
  const destinationSummary = summarizeArrayField(rule.destinationNetworks, "Destino previo");
  if (destinationSummary) {
    lines.push(destinationSummary);
  }
  const applicationSummary = summarizeArrayField(rule.applications, "Aplicaciones previas");
  if (applicationSummary) {
    lines.push(applicationSummary);
  }
  return lines;
}

function describeModifiedRuleChange(item: ModifiedRuleChange): string[] {
  const lines: string[] = [];
  item.changes.forEach((change) => {
    const field = change.field;
    if (ARRAY_FIELDS.has(field)) {
      const before = toStringArray(item.baseline[field]);
      const after = toStringArray(item.current[field]);
      const { added, removed } = diffArray(before, after);
      const target = change.label.toLowerCase();
      if (added.length) {
        lines.push(`${added.length > 1 ? "Se agregaron" : "Se agrego"} ${formatListForSentence(added)} a ${target}.`);
      }
      if (removed.length) {
        lines.push(`${removed.length > 1 ? "Se eliminaron" : "Se elimino"} ${formatListForSentence(removed)} de ${target}.`);
      }
      if (!added.length && !removed.length) {
        lines.push(`Se actualizo ${target}.`);
      }
      return;
    }
    if (BOOLEAN_FIELDS.has(field)) {
      lines.push(
        `${change.label} se configuro en ${formatBooleanForCsv(item.current[field] as boolean | null)} (antes ${formatBooleanForCsv(item.baseline[field] as boolean | null)}).`
      );
      return;
    }
    if (field === "index") {
      const previousIndex = item.baseline.index ?? "-";
      const currentIndex = item.current.index ?? "-";
      lines.push(`La regla cambio de posicion ${previousIndex} a ${currentIndex}.`);
      return;
    }
    if (field === "comments") {
      const beforeCount = item.baseline.comments.length;
      const afterCount = item.current.comments.length;
      if (afterCount > beforeCount) {
        lines.push(`Se agregaron comentarios (total ${afterCount}).`);
      } else if (afterCount < beforeCount) {
        lines.push(`Se eliminaron comentarios (total ${afterCount}).`);
      } else {
        lines.push("Se actualizaron los comentarios de la regla.");
      }
      return;
    }
    lines.push(`Se actualizo ${change.label.toLowerCase()} de ${change.previous || "-"} a ${change.current || "-"}.`);
  });
  return lines;
}

function summarizeArrayField(values: string[], label: string): string | null {
  if (!values || !values.length) {
    return null;
  }
  const list = values.slice(0, 3);
  const formatted = formatListForSentence(list);
  const extra = values.length > 3 ? ` (+${values.length - 3} mas)` : "";
  return `${label}: ${formatted}${extra}.`;
}

function diffArray(before: string[], after: string[]) {
  const beforeSet = new Set(before);
  const afterSet = new Set(after);
  const added = after.filter((value) => !beforeSet.has(value));
  const removed = before.filter((value) => !afterSet.has(value));
  return { added, removed };
}

function toStringArray(value: RuleRow[keyof RuleRow]): string[] {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.map(String).filter((entry) => entry.trim().length > 0);
  }
  return String(value).split(",").map((entry) => entry.trim()).filter((entry) => entry.length > 0);
}

function formatListForSentence(values: string[]): string {
  if (!values.length) {
    return "-";
  }
  if (values.length === 1) {
    return values[0];
  }
  if (values.length === 2) {
    return `${values[0]} y ${values[1]}`;
  }
  return `${values.slice(0, -1).join(", ")} y ${values[values.length - 1]}`;
}

function saveAnalystNote() {
  const entry = currentHistoryEntry.value;
  if (!entry) {
    return;
  }
  const trimmed = analystNote.value.trim();
  history.value = history.value.map((item) =>
    item.id === entry.id ? { ...item, note: trimmed || undefined } : item
  );
  analystNote.value = trimmed;
  saveHistory();
  noteStatus.value = "saved";
  if (noteStatusTimeout) {
    clearTimeout(noteStatusTimeout);
  }
  noteStatusTimeout = setTimeout(() => {
    noteStatus.value = "idle";
    noteStatusTimeout = null;
  }, 2000);
}

function exportCsvReport() {
  const current = report.value;
  if (!current || !canExportCsv.value) {
    return;
  }

  const rows: string[][] = [];
  const exportNote = analystNote.value.trim() || currentHistoryEntry.value?.note || "";
  const exportTimestamp = currentHistoryEntry.value?.timestamp ?? new Date().toISOString();
  const exportDate = formatTimestampForCsv(exportTimestamp);
  rows.push([
    "Tipo",
    "Politica",
    "Regla",
    "Accion",
    "Estado",
    "Default Action",
    "Default Log Begin",
    "Default Log End",
    "Origen",
    "Destino",
    "Puertos Origen",
    "Puertos Destino",
    "Aplicaciones",
    "Comentarios",
    "Cambios",
    "Fecha comparacion",
    "Nota",
  ]);

  current.added.forEach((rule) => {
    rows.push(buildCsvRow(rule, "Agregada", describeAddedRule(rule), exportDate, exportNote));
  });

  current.modified.forEach((item) => {
    const description = describeModifiedRuleChange(item);
    rows.push(
      buildCsvRow(
        item.current,
        "Modificada",
        description.length ? description : ["Cambios detectados"],
        exportDate,
        exportNote
      )
    );
  });

  current.removed.forEach((rule) => {
    rows.push(buildCsvRow(rule, "Eliminada", describeRemovedRule(rule), exportDate, exportNote));
  });

  if (rows.length === 1) {
    return;
  }

  const csvContent = rows
    .map((columns) => columns.map(escapeCsvValue).join(","))
    .join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const fileName = `change-tracking-${formatDateSuffix(new Date())}.csv`;
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function buildCsvRow(rule: RuleRow, type: string, changeSummary: string[], date: string, note: string): string[] {
  return [
    type,
    rule.policyName || "-",
    rule.ruleName || rule.ruleId || "-",
    rule.action || "-",
    rule.enabled ? "Activa" : "Inactiva",
    rule.policyDefaultAction || "-",
    formatBooleanForCsv(rule.policyDefaultLogBegin),
    formatBooleanForCsv(rule.policyDefaultLogEnd),
    formatListForCsv(rule.sourceNetworks),
    formatListForCsv(rule.destinationNetworks),
    formatListForCsv(rule.sourcePorts),
    formatListForCsv(rule.destinationPorts),
    formatListForCsv(rule.applications),
    formatCommentsForCsv(rule.comments),
    changeSummary.length ? changeSummary.join(" | ") : "-",
    date || "-",
    note || "-",
  ];
}

function formatListForCsv(values: string[]): string {
  return values && values.length ? values.join("; ") : "-";
}

function formatBooleanForCsv(value: boolean | null | undefined): string {
  if (value === true) {
    return "Si";
  }
  if (value === false) {
    return "No";
  }
  return "N/D";
}

function formatCommentsForCsv(comments: RuleRow["comments"]): string {
  if (!comments || !comments.length) {
    return "-";
  }
  return comments
    .map((comment) => {
      const parts: string[] = [];
      if (comment.text) {
        parts.push(comment.text);
      }
      const meta: string[] = [];
      if (comment.user) {
        meta.push(comment.user);
      }
      if (comment.date) {
        meta.push(comment.date);
      }
      if (meta.length) {
        parts.push(`(${meta.join(" - ")})`);
      }
      return parts.join(" ");
    })
    .join(" | ");
}

function escapeCsvValue(value: string): string {
  const safeValue = value.replace(/\r?\n/g, " ").replace(/\r/g, " ");
  return `"${safeValue.replace(/"/g, '""')}"`;
}

function formatTimestampForCsv(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

function formatDateSuffix(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

function queueBaseline(rules: RuleRow[], label: string, source: BaselineSource) {
  if (!baselineRules.value.length) {
    applyBaseline(rules, label, source);
    return;
  }
  pendingBaseline.value = {
    rules,
    label,
    source,
    loadedAt: new Date().toISOString(),
  };
}

function applyBaseline(rules: RuleRow[], label: string, source: BaselineSource) {
  baselineRules.value = rules;
  baselineMeta.value = {
    label,
    source,
    loadedAt: new Date().toISOString(),
  };
  pendingBaseline.value = null;
}

function confirmPendingBaseline() {
  const pending = pendingBaseline.value;
  if (!pending) {
    return;
  }
  applyBaseline(pending.rules, pending.label, pending.source);
}

function cancelPendingBaseline() {
  pendingBaseline.value = null;
}

async function reloadDefaultBaseline() {
  loadingBaseline.value = true;
  baselineError.value = null;
  try {
    const response = await fetch(BASELINE_URL, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`No se encontró el archivo ${BASELINE_URL}`);
    }
    const payload = await response.json();
    queueBaseline(flattenFromSnapshot(payload), "Baseline por defecto", "default");
  } catch (error) {
    baselineRules.value = [];
    baselineMeta.value = null;
    baselineError.value = error instanceof Error ? error.message : "No se pudo cargar el baseline";
  } finally {
    loadingBaseline.value = false;
  }
}

function openFilePicker() {
  fileInput.value?.click();
}

function handleFileUpload(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) {
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const payload = JSON.parse(String(reader.result));
      queueBaseline(flattenFromSnapshot(payload), `Archivo: ${file.name}`, "upload");
      baselineError.value = null;
    } catch (error) {
      baselineError.value = "El archivo no tiene el formato esperado.";
    }
  };
  reader.onerror = () => {
    baselineError.value = "No se pudo leer el archivo seleccionado.";
  };
  reader.readAsText(file);
  target.value = "";
}

function flattenFromSnapshot(payload: unknown): RuleRow[] {
  if (Array.isArray(payload)) {
    return flattenPolicies(payload as any);
  }
  if (payload && typeof payload === "object" && Array.isArray((payload as any).policies)) {
    return flattenPolicies((payload as any).policies);
  }
  throw new Error("El snapshot no tiene el formato esperado");
}

onBeforeUnmount(() => {
  if (noteStatusTimeout) {
    clearTimeout(noteStatusTimeout);
    noteStatusTimeout = null;
  }
});

onMounted(() => {
  void reloadDefaultBaseline();
});
</script>
