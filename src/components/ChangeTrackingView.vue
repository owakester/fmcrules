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
      </div>
    </header>

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

    <section v-if="report" class="space-y-6">
      <div>
        <h3 class="text-lg font-semibold text-slate-200">Reglas agregadas ({{ report.summary.addedRules }})</h3>
        <p class="text-xs text-slate-400" v-if="!report.added.length">No se detectaron reglas nuevas.</p>
        <div class="space-y-3" v-else>
          <div v-for="rule in report.added" :key="'added-' + rule.policyId + rule.ruleId" class="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
            <RuleSummary :rule="rule" />
          </div>
        </div>
      </div>

      <div>
        <h3 class="text-lg font-semibold text-slate-200">Reglas eliminadas ({{ report.summary.removedRules }})</h3>
        <p class="text-xs text-slate-400" v-if="!report.removed.length">No se eliminaron reglas.</p>
        <div class="space-y-3" v-else>
          <div v-for="rule in report.removed" :key="'removed-' + rule.policyId + rule.ruleId" class="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3">
            <RuleSummary :rule="rule" />
          </div>
        </div>
      </div>

      <div>
        <h3 class="text-lg font-semibold text-slate-200">Reglas modificadas ({{ report.summary.modifiedRules }})</h3>
        <p class="text-xs text-slate-400" v-if="!report.modified.length">No se detectaron cambios en reglas existentes.</p>
        <div class="space-y-4" v-else>
          <details v-for="item in report.modified" :key="'mod-' + item.key" class="rounded-lg border border-sky-500/30 bg-sky-500/10" open>
            <summary class="cursor-pointer px-3 py-2 text-sm font-medium text-sky-200">
              {{ item.policyName }} - {{ item.ruleName }}
            </summary>
            <div class="space-y-2 px-3 pb-3 text-xs text-slate-200">
              <RuleSummary :rule="item.current" />
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
import { computed, onMounted, ref, watch, withDefaults } from "vue";
import type { ChangeHistoryEntry, RuleChangeReport, RuleRow } from "../types";
import { diffRuleSets } from "../utils/ruleDiff";
import RuleSummary from "./RuleSummary.vue";
import { flattenPolicies } from "../composables/usePolicies";

type BaselineSource = "default" | "upload";

interface BaselineMeta {
  label: string;
  source: BaselineSource;
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

const history = ref<ChangeHistoryEntry[]>(loadHistory());

watch(
  () => report.value,
  (current) => {
    if (!current) {
      return;
    }
    const id = `${current.baselineHash}|${current.currentHash}`;
    if (history.value.some((entry) => entry.id === id)) {
      return;
    }
    history.value.unshift({
      id,
      timestamp: new Date().toISOString(),
      baselineLabel: current.baselineLabel,
      currentLabel: current.currentLabel,
      report: current,
    });
    history.value = history.value.slice(0, 20);
    saveHistory();
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
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
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
    assignBaseline(flattenFromSnapshot(payload), "Baseline por defecto", "default");
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
      assignBaseline(flattenFromSnapshot(payload), `Archivo: ${file.name}`, "upload");
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

function assignBaseline(rules: RuleRow[], label: string, source: BaselineSource) {
  baselineRules.value = rules;
  baselineMeta.value = {
    label,
    source,
    loadedAt: new Date().toISOString(),
  };
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

onMounted(() => {
  void reloadDefaultBaseline();
});
</script>
