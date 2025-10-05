<template>
  <div class="bg-slate-900/60 border border-slate-800 rounded-xl">
    <div v-if="isLoading" class="p-6 text-center text-sm text-slate-400">
      Cargando informacion de reglas...
    </div>
    <div v-else-if="!visibleRules.length" class="p-6 text-center text-sm text-slate-400">
      No se encontraron reglas con los filtros actuales.
    </div>
    <div v-else class="overflow-x-auto">
      <table class="min-w-full divide-y divide-slate-800">
        <thead class="bg-slate-950/40 text-xs uppercase tracking-wide text-slate-400">
          <tr>
            <th class="px-4 py-3 text-left">Politica</th>
            <th class="px-4 py-3 text-left">Regla</th>
            <th class="px-4 py-3 text-left">Accion</th>
            <th class="px-4 py-3 text-left">Estado</th>
            <th class="px-4 py-3 text-left">Origen</th>
            <th class="px-4 py-3 text-left">Destino</th>
            <th class="px-4 py-3 text-left">Aplicaciones</th>
            <th class="px-4 py-3 text-left">Comentarios</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-800 text-sm">
          <tr
            v-for="rule in visibleRules"
            :key="rule.ruleId || `${rule.policyId}-${rule.index}`"
            class="hover:bg-slate-950/60"
          >
            <td class="px-4 py-3 align-top">
              <p class="font-medium text-slate-200">{{ rule.policyName }}</p>
              <p class="text-xs text-slate-500">{{ rule.policyDescription || rule.policyId }}</p>
            </td>
            <td class="px-4 py-3 align-top">
              <p class="font-medium text-slate-200">{{ rule.ruleName }}</p>
              <p class="text-xs text-slate-500">ID: {{ rule.ruleId || 'N/D' }}</p>
              <p v-if="rule.section" class="text-xs text-slate-500">Seccion: {{ rule.section }} - Indice {{ rule.index }}</p>
              <details class="mt-2 text-xs text-slate-400">
                <summary class="cursor-pointer text-sky-400">Detalles</summary>
                <div class="mt-1 space-y-1">
                  <p><span class="text-slate-500">Variable set:</span> {{ formatList(rule.variableSet) }}</p>
                  <p><span class="text-slate-500">IPS:</span> {{ formatList(rule.ipsPolicy) }}</p>
                  <p><span class="text-slate-500">File:</span> {{ formatList(rule.filePolicy) }}</p>
                  <p><span class="text-slate-500">Times:</span> {{ formatList(rule.timeRanges) }}</p>
                  <p><span class="text-slate-500">Syslog:</span> {{ boolLabel(rule.enableSyslog) }}</p>
                  <p><span class="text-slate-500">Eventos FMC:</span> {{ boolLabel(rule.sendEventsToFMC) }}</p>
                </div>
              </details>
            </td>
            <td class="px-4 py-3 align-top">
              <span
                class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
                :class="actionPill(rule.action)"
              >
                {{ rule.action || 'N/A' }}
              </span>
            </td>
            <td class="px-4 py-3 align-top">
              <span
                class="inline-flex items-center gap-2 text-xs text-slate-300"
                :class="rule.enabled ? 'text-emerald-300' : 'text-slate-500'"
              >
                <span class="inline-flex h-2 w-2 rounded-full" :class="rule.enabled ? 'bg-emerald-400' : 'bg-slate-600'" />
                {{ rule.enabled ? 'Activa' : 'Inactiva' }}
              </span>
              <div class="text-xs text-slate-500 mt-2 space-y-1">
                <p>Log inicio: {{ boolLabel(rule.logBegin) }}</p>
                <p>Log fin: {{ boolLabel(rule.logEnd) }}</p>
                <p>Log archivos: {{ boolLabel(rule.logFiles) }}</p>
              </div>
            </td>
            <td class="px-4 py-3 align-top">
              <p><span class="text-xs text-slate-500">Zonas:</span> {{ formatList(rule.sourceZones) }}</p>
              <p><span class="text-xs text-slate-500">Redes:</span> {{ formatList(rule.sourceNetworks) }}</p>
              <p><span class="text-xs text-slate-500">Dyn Obj:</span> {{ formatList(rule.sourceDynamicObjects) }}</p>
              <p><span class="text-xs text-slate-500">Puertos:</span> {{ formatList(rule.sourcePorts) }}</p>
            </td>
            <td class="px-4 py-3 align-top">
              <p><span class="text-xs text-slate-500">Zonas:</span> {{ formatList(rule.destinationZones) }}</p>
              <p><span class="text-xs text-slate-500">Redes:</span> {{ formatList(rule.destinationNetworks) }}</p>
              <p><span class="text-xs text-slate-500">Dyn Obj:</span> {{ formatList(rule.destinationDynamicObjects) }}</p>
              <p><span class="text-xs text-slate-500">Puertos:</span> {{ formatList(rule.destinationPorts) }}</p>
            </td>
            <td class="px-4 py-3 align-top">
              <p>{{ formatList(rule.applications) }}</p>
              <p v-if="(rule.urls?.length ?? 0)" class="text-xs text-slate-500">URLs: {{ formatList(rule.urls) }}</p>
            </td>
            <td class="px-4 py-3 align-top max-w-xs">
              <ul class="space-y-2">
                <li v-for="(comment, index) in rule.comments" :key="index" class="text-xs text-slate-300">
                  <p>{{ comment.text || 'Sin comentario' }}</p>
                  <p v-if="comment.user || comment.date" class="text-[11px] text-slate-500">
                    <span v-if="comment.user">{{ comment.user }}</span>
                    <span v-if="comment.user && comment.date"> - </span>
                    <span v-if="comment.date">{{ formatCommentDate(comment.date) }}</span>
                  </p>
                </li>
                <li v-if="!rule.comments.length" class="text-xs text-slate-500">Sin comentarios</li>
              </ul>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { RuleRow } from "../types";

interface Props {
  rules: RuleRow[];
  loading: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  rules: () => [],
  loading: false,
});

const visibleRules = computed(() => props.rules);
const isLoading = computed(() => props.loading);

function formatList(values: readonly string[] | undefined): string {
  if (!Array.isArray(values) || !values.length) {
    return "-";
  }
  return values.join(", ");
}

function boolLabel(value: boolean | null): string {
  if (value === true) {
    return "Si";
  }
  if (value === false) {
    return "No";
  }
  return "N/D";
}

function actionPill(action: string): string {
  const normalized = action.toUpperCase();
  if (normalized === "ALLOW") {
    return "bg-emerald-500/20 text-emerald-200";
  }
  if (normalized === "BLOCK" || normalized === "DENY") {
    return "bg-rose-500/20 text-rose-200";
  }
  return "bg-slate-700/40 text-slate-200";
}

function formatCommentDate(value?: string): string {
  if (!value) {
    return "";
  }
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleString();
  }
  return value;
}
</script>
