<template>
  <section class="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h3 class="text-lg font-semibold text-slate-200">Actividad reciente</h3>
      <span v-if="chartData" class="text-xs text-slate-500">
        Ultimas {{ chartData.points }} comparaciones
      </span>
    </div>
    <p v-if="!chartData" class="mt-4 text-xs text-slate-500">
      Se mostrara un resumen cuando exista historial de cambios.
    </p>
    <div v-else class="mt-4">
      <svg
        :viewBox="`0 0 ${chartData.width} ${chartData.height}`"
        class="h-56 w-full"
        fill="none"
      >
        <rect
          :x="chartData.padding"
          :y="chartData.padding"
          :width="chartData.innerWidth"
          :height="chartData.innerHeight"
          fill="rgba(15, 23, 42, 0.2)"
          stroke="rgba(71, 85, 105, 0.4)"
        />
        <g v-for="line in chartData.gridLines" :key="`grid-${line.value}`">
          <line
            :x1="chartData.padding"
            :x2="chartData.padding + chartData.innerWidth"
            :y1="line.y"
            :y2="line.y"
            stroke="rgba(148, 163, 184, 0.2)"
            stroke-dasharray="4 4"
          />
          <text :x="chartData.padding - 8" :y="line.y + 4" fill="#94a3b8" font-size="10" text-anchor="end">
            {{ line.value }}
          </text>
        </g>
        <g v-for="series in chartData.series" :key="series.key">
          <path :d="series.path" :stroke="series.color" stroke-width="2" stroke-linecap="round" fill="none" />
          <g v-for="point in series.points" :key="`${series.key}-point-${point.x}`">
            <circle :cx="point.x" :cy="point.y" r="3" :fill="series.color" />
          </g>
        </g>
        <g>
          <text
            v-for="label in chartData.axisLabels"
            :key="label.x"
            :x="label.x"
            :y="chartData.height - chartData.padding + 20"
            fill="#94a3b8"
            font-size="10"
            text-anchor="middle"
          >
            {{ label.text }}
          </text>
        </g>
      </svg>
      <div class="mt-3 flex flex-wrap gap-4 text-xs">
        <div v-for="series in chartData.series" :key="`legend-${series.key}`" class="flex items-center gap-2">
          <span
            class="inline-block h-2 w-6 rounded"
            :style="{ backgroundColor: series.color }"
          ></span>
          <span class="text-slate-400">{{ series.label }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { ChangeHistoryEntry } from "../types";

const props = defineProps<{
  history: ChangeHistoryEntry[];
}>();

const width = 420;
const height = 200;
const padding = 36;

interface NormalizedPoint {
  timestamp: string;
  added: number;
  removed: number;
  modified: number;
}

interface ChartSeries {
  key: "added" | "removed" | "modified";
  label: string;
  color: string;
  path: string;
  points: Array<{ x: number; y: number }>;
}

const chartData = computed(() => {
  if (!props.history.length) {
    return null;
  }

  const normalized: NormalizedPoint[] = props.history.map((entry) => ({
    timestamp: entry.timestamp,
    added: entry.report.summary.addedRules,
    removed: entry.report.summary.removedRules,
    modified: entry.report.summary.modifiedRules,
  }));

  const maxValue = Math.max(
    1,
    ...normalized.map((point) => Math.max(point.added, point.removed, point.modified))
  );

  const count = normalized.length;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;
  const stepX = count > 1 ? innerWidth / (count - 1) : 0;

  const toX = (index: number) => padding + index * stepX;
  const toY = (value: number) => padding + innerHeight - (value / maxValue) * innerHeight;

  const buildPath = (values: number[]) => {
    return values
      .map((value, index) => {
        const x = toX(index).toFixed(2);
        const y = toY(value).toFixed(2);
        return `${index === 0 ? "M" : "L"}${x} ${y}`;
      })
      .join(" ");
  };

  const series: ChartSeries[] = [
    {
      key: "added",
      label: "Agregadas",
      color: "#34d399",
      path: buildPath(normalized.map((point) => point.added)),
      points: normalized.map((point, index) => ({ x: toX(index), y: toY(point.added) })),
    },
    {
      key: "removed",
      label: "Eliminadas",
      color: "#f87171",
      path: buildPath(normalized.map((point) => point.removed)),
      points: normalized.map((point, index) => ({ x: toX(index), y: toY(point.removed) })),
    },
    {
      key: "modified",
      label: "Modificadas",
      color: "#38bdf8",
      path: buildPath(normalized.map((point) => point.modified)),
      points: normalized.map((point, index) => ({ x: toX(index), y: toY(point.modified) })),
    },
  ];

  const labelInterval = Math.max(1, Math.ceil(count / 4));
  const axisLabels = normalized.map((point, index) => {
    if (index % labelInterval === 0 || index === count - 1) {
      return {
        x: toX(index),
        text: formatTimestamp(point.timestamp),
      };
    }
    return null;
  }).filter((item): item is { x: number; text: string } => Boolean(item));

  const segments = 4;
  const rawGrid = Array.from({ length: segments }, (_, idx) => {
    const ratio = (idx + 1) / segments;
    const value = Math.round(maxValue * ratio);
    return {
      value,
      y: toY(value),
    };
  });

  const gridLines = rawGrid.filter(
    (line, index, arr) => index === arr.findIndex((item) => Math.abs(item.y - line.y) < 0.5)
  );

  return {
    width,
    height,
    padding,
    innerWidth,
    innerHeight,
    maxValue,
    points: count,
    series,
    axisLabels,
    gridLines,
  };
});

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
</script>
