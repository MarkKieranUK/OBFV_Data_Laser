"use client";

import { Bar, Line, Pie, Doughnut, Scatter } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
  Title,
  Filler,
} from "chart.js";
import type { InlineChatChart } from "@/types/ai";
import { CHART_COLORS } from "@/lib/constants";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
  Title,
  Filler
);

const MINI_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  color: "#e2e8f0",
  plugins: {
    legend: {
      display: false,
      labels: { color: "#e2e8f0", font: { size: 10 } },
    },
    tooltip: {
      backgroundColor: "#1e293b",
      titleColor: "#f8fafc",
      bodyColor: "#cbd5e1",
      cornerRadius: 4,
      padding: 6,
      titleFont: { size: 11 },
      bodyFont: { size: 10 },
    },
    title: {
      display: false,
    },
  },
  scales: {
    x: {
      ticks: { color: "#94a3b8", font: { size: 9 }, maxRotation: 45 },
      grid: { color: "#1e293b" },
    },
    y: {
      ticks: { color: "#94a3b8", font: { size: 9 } },
      grid: { color: "#1e293b" },
      beginAtZero: true,
    },
  },
} as const;

const PIE_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  color: "#e2e8f0",
  plugins: {
    legend: {
      display: true,
      position: "right" as const,
      labels: { color: "#e2e8f0", font: { size: 9 }, padding: 8 },
    },
    tooltip: MINI_OPTIONS.plugins.tooltip,
  },
} as const;

export function InlineChart({ chart }: { chart: InlineChatChart }) {
  const colors = chart.datasets.length > 1
    ? CHART_COLORS
    : chart.type === "pie" || chart.type === "doughnut"
    ? CHART_COLORS
    : [CHART_COLORS[0]];

  const data = {
    labels: chart.labels,
    datasets: chart.datasets.map((ds, i) => ({
      label: ds.label,
      data: ds.data,
      backgroundColor:
        chart.type === "pie" || chart.type === "doughnut"
          ? CHART_COLORS.slice(0, chart.labels.length)
          : colors[i % colors.length],
      borderColor:
        chart.type === "line"
          ? colors[i % colors.length]
          : undefined,
      borderWidth: chart.type === "line" ? 2 : 0,
      tension: 0.3,
    })),
  };

  const ChartComponent = {
    bar: Bar,
    horizontalBar: Bar,
    groupedBar: Bar,
    stackedBar: Bar,
    line: Line,
    pie: Pie,
    doughnut: Doughnut,
    scatter: Scatter,
  }[chart.type] ?? Bar;

  const options =
    chart.type === "pie" || chart.type === "doughnut"
      ? PIE_OPTIONS
      : chart.type === "horizontalBar"
      ? { ...MINI_OPTIONS, indexAxis: "y" as const }
      : chart.type === "stackedBar"
      ? {
          ...MINI_OPTIONS,
          scales: {
            ...MINI_OPTIONS.scales,
            x: { ...MINI_OPTIONS.scales.x, stacked: true },
            y: { ...MINI_OPTIONS.scales.y, stacked: true },
          },
        }
      : MINI_OPTIONS;

  return (
    <div className="my-2 rounded-md border border-border bg-background p-2">
      {chart.title && (
        <p className="mb-1 text-xs font-medium text-muted-foreground">
          {chart.title}
        </p>
      )}
      <div className="h-48">
        <ChartComponent data={data} options={options as any} />
      </div>
    </div>
  );
}
