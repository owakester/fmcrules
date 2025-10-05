<template>
  <div class="space-y-1 text-sm text-slate-200">
    <p class="font-semibold">{{ rule.policyName }} - {{ rule.ruleName }}</p>
    <p class="text-xs text-slate-400">Accion: {{ rule.action }} - Estado: {{ rule.enabled ? 'Activa' : 'Inactiva' }}</p>
    <div class="grid gap-1 text-xs text-slate-400 sm:grid-cols-2">
      <p><span class="text-slate-500">Origen:</span> {{ formatList(rule.sourceNetworks) }}</p>
      <p><span class="text-slate-500">Destino:</span> {{ formatList(rule.destinationNetworks) }}</p>
      <p><span class="text-slate-500">Puertos origen:</span> {{ formatList(rule.sourcePorts) }}</p>
      <p><span class="text-slate-500">Puertos destino:</span> {{ formatList(rule.destinationPorts) }}</p>
    </div>
    <p v-if="rule.comments.length" class="text-xs text-slate-400">
      <span class="text-slate-500">Comentarios:</span>
      <span>
        <template v-for="(comment, idx) in rule.comments" :key="idx">
          {{ comment.text || 'Sin comentario' }}<span v-if="comment.user || comment.date"> ({{ [comment.user, comment.date].filter(Boolean).join(' - ') }})</span><span v-if="idx < rule.comments.length - 1"> - </span>
        </template>
      </span>
    </p>
  </div>
</template>

<script setup lang="ts">
import type { RuleRow } from "../types";

const props = defineProps<{ rule: RuleRow }>();

function formatList(values: string[]): string {
  return values.length ? values.join(", ") : "-";
}
</script>
