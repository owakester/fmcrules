<template>
  <div class="max-w-7xl mx-auto px-4 py-8 space-y-6">
    <header class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-3xl font-semibold">Firewall Policies</h1>
        <p class="text-slate-400 text-sm">
          Visualiza y filtra las reglas exportadas desde Cisco FMC o analiza los cambios entre snapshots.
        </p>
      </div>
      <div class="flex gap-2">
        <button
          class="px-4 py-2 rounded-md bg-sky-500 hover:bg-sky-400 transition-colors text-sm font-medium"
          @click="handleReload"
          :disabled="loading"
        >
          <span v-if="loading" class="animate-pulse">Actualizando...</span>
          <span v-else>Actualizar datos</span>
        </button>
      </div>
    </header>

    <nav class="flex gap-2">
      <button :class="tabClass('rules')" @click="activeTab = 'rules'">Reglas</button>
      <button :class="tabClass('changes')" @click="activeTab = 'changes'">Change Tracking</button>
    </nav>

    <div v-if="activeTab === 'rules'" class="space-y-6">
      <section class="grid gap-4 bg-slate-900/60 border border-slate-800 rounded-xl p-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <span class="text-xs uppercase tracking-wide text-slate-500">Filtros</span>
          <button
            class="rounded-md border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="!canExportRules"
            @click="exportRulesCsv"
          >
            Exportar resultados (CSV)
          </button>
        </div>
        <div class="grid gap-2">
          <label for="search" class="text-sm text-slate-300">Busqueda rápida</label>
          <input
            id="search"
            v-model="filters.search"
            type="search"
            placeholder="Busca por nombre de política, regla, aplicaciones o comentarios"
            class="w-full rounded-md bg-slate-950 border border-slate-800 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
          />
        </div>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label class="grid gap-1 text-sm">
            <span class="text-slate-300">Política</span>
            <select
              v-model="filters.policyId"
              class="rounded-md bg-slate-950 border border-slate-800 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
            >
              <option :value="null">Todas</option>
              <option v-for="option in policyOptions" :key="option.id" :value="option.id">
                {{ option.name }}
              </option>
            </select>
          </label>
          <label class="grid gap-1 text-sm">
            <span class="text-slate-300">Acción</span>
            <select
              v-model="filters.action"
              class="rounded-md bg-slate-950 border border-slate-800 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
            >
              <option :value="null">Todas</option>
              <option v-for="action in actionOptions" :key="action" :value="action">
                {{ action }}
              </option>
            </select>
          </label>
          <label class="flex items-center gap-2 text-sm text-slate-300">
            <input
              v-model="filters.enabledOnly"
              type="checkbox"
              class="h-4 w-4 rounded border border-slate-700 bg-slate-950"
            />
            Solo reglas habilitadas
          </label>
          <p class="text-sm text-slate-400">
            {{ statusMessage }}
          </p>
        </div>
      </section>

      <section>
        <div v-if="error" class="p-4 rounded-md border border-red-500/30 bg-red-500/10 text-red-200 text-sm">
          {{ error }}
        </div>
        <RuleTable :rules="rules" :loading="loading" />
      </section>
    </div>

    <div v-else>
      <ChangeTrackingView :rules="allRules" :loading="loading" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import RuleTable from "./components/RuleTable.vue";
import ChangeTrackingView from "./components/ChangeTrackingView.vue";
import { usePolicies } from "./composables/usePolicies";
import type { RuleRow } from "./types";

const { loading, error, rules, allRules, filters, policyOptions, actionOptions, reload } = usePolicies();

const activeTab = ref<"rules" | "changes">("rules");

const statusMessage = computed(() => {
  if (loading.value) {
    return "Cargando reglas...";
  }
  const total = rules.value.length;
  return total === 1 ? "1 regla coincidio con el filtro" : `${total} reglas coinciden con el filtro`;
});

const canExportRules = computed(() => !loading.value && rules.value.length > 0);

function handleReload() {
  void reload();
}

function tabClass(tab: "rules" | "changes"): string {
  const base = "rounded-md px-3 py-2 text-sm transition-colors";
  if (activeTab.value === tab) {
    return `${base} bg-slate-800 text-slate-100`;
  }
  return `${base} text-slate-400 hover:bg-slate-800`;
}

function exportRulesCsv() {
  if (!rules.value.length) {
    return;
  }

  const rows: string[][] = [
    [
      "Politica",
      "Descripcion",
      "Accion por defecto",
      "Log inicio por defecto",
      "Log fin por defecto",
      "Syslog por defecto",
      "Eventos FMC por defecto",
      "Regla",
      "ID",
      "Seccion",
      "Indice",
      "Accion",
      "Estado",
      "Zonas origen",
      "Redes origen",
      "Objetos dinamicos origen",
      "Puertos origen",
      "Zonas destino",
      "Redes destino",
      "Objetos dinamicos destino",
      "Puertos destino",
      "Aplicaciones",
      "URLs",
      "Variable set",
      "IPS",
      "File policy",
      "Time ranges",
      "Security group tags",
      "SNMP alerts",
      "Log inicio",
      "Log fin",
      "Log archivos",
      "Syslog",
      "Eventos FMC",
      "Comentarios",
    ],
  ];

  rules.value.forEach((rule) => {
    rows.push(buildRuleCsvRow(rule));
  });

  const csvContent = rows
    .map((columns) => columns.map(escapeCsvValue).join(","))
    .join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const fileName = `firewall-rules-${formatDateSuffix(new Date())}.csv`;
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function buildRuleCsvRow(rule: RuleRow): string[] {
  return [
    safeText(rule.policyName),
    safeText(rule.policyDescription),
    safeText(rule.policyDefaultAction),
    formatBooleanForCsv(rule.policyDefaultLogBegin),
    formatBooleanForCsv(rule.policyDefaultLogEnd),
    formatBooleanForCsv(rule.policyDefaultEnableSyslog),
    formatBooleanForCsv(rule.policyDefaultSendEventsToFMC),
    safeText(rule.ruleName),
    safeText(rule.ruleId),
    safeText(rule.section),
    String(rule.index ?? ""),
    safeText(rule.action),
    rule.enabled ? "Activa" : "Inactiva",
    formatListForCsv(rule.sourceZones),
    formatListForCsv(rule.sourceNetworks),
    formatListForCsv(rule.sourceDynamicObjects),
    formatListForCsv(rule.sourcePorts),
    formatListForCsv(rule.destinationZones),
    formatListForCsv(rule.destinationNetworks),
    formatListForCsv(rule.destinationDynamicObjects),
    formatListForCsv(rule.destinationPorts),
    formatListForCsv(rule.applications),
    formatListForCsv(rule.urls),
    formatListForCsv(rule.variableSet),
    formatListForCsv(rule.ipsPolicy),
    formatListForCsv(rule.filePolicy),
    formatListForCsv(rule.timeRanges),
    formatListForCsv(rule.securityGroupTags),
    formatListForCsv(rule.snmpAlerts),
    formatBooleanForCsv(rule.logBegin),
    formatBooleanForCsv(rule.logEnd),
    formatBooleanForCsv(rule.logFiles),
    formatBooleanForCsv(rule.enableSyslog),
    formatBooleanForCsv(rule.sendEventsToFMC),
    formatCommentsForCsv(rule.comments),
  ];
}

function formatListForCsv(values?: string[]): string {
  if (!values || !values.length) {
    return "-";
  }
  return values.join("; ");
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
  const sanitized = value.replace(/\r?\n/g, " ").replace(/\r/g, " ");
  return `"${sanitized.replace(/"/g, '""')}"`;
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

function safeText(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }
  return value;
}
</script>
