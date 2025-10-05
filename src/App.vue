<template>
  <div class="max-w-7xl mx-auto px-4 py-8 space-y-6">
    <header class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-3xl font-semibold">Firewall Policies</h1>
        <p class="text-slate-400 text-sm">
          Visualiza y filtra las reglas exportadas desde Cisco FMC.
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

    <section class="grid gap-4 bg-slate-900/60 border border-slate-800 rounded-xl p-4">
      <div class="grid gap-2">
        <label for="search" class="text-sm text-slate-300">Busqueda rapida</label>
        <input
          id="search"
          v-model="filters.search"
          type="search"
          placeholder="Busca por nombre de politica, regla, aplicaciones o comentarios"
          class="w-full rounded-md bg-slate-950 border border-slate-800 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
        />
      </div>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label class="grid gap-1 text-sm">
          <span class="text-slate-300">Politica</span>
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
          <span class="text-slate-300">Accion</span>
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
      <RuleTable :rules="rules.value" :loading="loading.value" />\n      <pre class="text-xs text-slate-500 whitespace-pre-wrap">{{ JSON.stringify(rules.value.slice(0,5), null, 2) }}</pre>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import RuleTable from "./components/RuleTable.vue";
import { usePolicies } from "./composables/usePolicies";

const { loading, error, rules, filters, policyOptions, actionOptions, reload } = usePolicies();

const statusMessage = computed(() => {
  if (loading.value) {
    return "Cargando reglas...";
  }
  const total = rules.value.length;
  return total === 1 ? "1 regla coincidio con el filtro" : `${total} reglas coinciden con el filtro`;
});

async function handleReload() {
  await reload();
}
</script>








