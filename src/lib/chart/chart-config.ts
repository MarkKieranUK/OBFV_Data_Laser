import type { ChartType } from "@/types/data";
import type { ChartOptions } from "chart.js";
import { CHART_COLORS } from "@/lib/constants";

/**
 * Default Chart.js configuration for the dark-themed OBFV Data Laser dashboard.
 * Uses the custom CHART_COLORS palette and sets up dark backgrounds with light text.
 */
export const CHART_DEFAULTS = {
  responsive: true,
  maintainAspectRatio: false,
  color: "#e2e8f0", // light text for dark theme (slate-200)
  backgroundColor: "transparent",
  borderColor: "#334155", // slate-700 for grid lines

  font: {
    family: "'Inter', 'system-ui', sans-serif",
    size: 12,
  },

  palette: CHART_COLORS,

  plugins: {
    legend: {
      labels: {
        color: "#e2e8f0",
        padding: 16,
        usePointStyle: true,
        font: {
          size: 12,
        },
      },
    },
    tooltip: {
      backgroundColor: "#1e293b", // slate-800
      titleColor: "#f8fafc", // slate-50
      bodyColor: "#cbd5e1", // slate-300
      borderColor: "#475569", // slate-600
      borderWidth: 1,
      cornerRadius: 6,
      padding: 10,
      titleFont: {
        size: 13,
        weight: "bold" as const,
      },
      bodyFont: {
        size: 12,
      },
    },
  },

  scales: {
    x: {
      ticks: {
        color: "#94a3b8", // slate-400
        font: { size: 11 },
      },
      grid: {
        color: "#1e293b", // slate-800
      },
      border: {
        color: "#334155", // slate-700
      },
    },
    y: {
      ticks: {
        color: "#94a3b8",
        font: { size: 11 },
      },
      grid: {
        color: "#1e293b",
      },
      border: {
        color: "#334155",
      },
    },
  },
} as const;

/**
 * Get Chart.js options appropriate for the given chart type.
 * Applies dark-theme defaults and chart-type-specific configuration.
 */
export function getChartOptions(chartType: ChartType): ChartOptions {
  const baseOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    color: CHART_DEFAULTS.color,
    plugins: {
      legend: {
        ...CHART_DEFAULTS.plugins.legend,
      },
      tooltip: {
        ...CHART_DEFAULTS.plugins.tooltip,
      },
    },
  };

  switch (chartType) {
    case "bar":
    case "groupedBar":
      return {
        ...baseOptions,
        scales: {
          x: {
            ...CHART_DEFAULTS.scales.x,
          },
          y: {
            ...CHART_DEFAULTS.scales.y,
            beginAtZero: true,
          },
        },
        plugins: {
          ...baseOptions.plugins,
          legend: {
            ...CHART_DEFAULTS.plugins.legend,
            display: chartType === "groupedBar",
          },
        },
      } as ChartOptions;

    case "horizontalBar":
      return {
        ...baseOptions,
        indexAxis: "y" as const,
        scales: {
          x: {
            ...CHART_DEFAULTS.scales.x,
            beginAtZero: true,
          },
          y: {
            ...CHART_DEFAULTS.scales.y,
          },
        },
        plugins: {
          ...baseOptions.plugins,
          legend: {
            ...CHART_DEFAULTS.plugins.legend,
            display: false,
          },
        },
      } as ChartOptions;

    case "stackedBar":
      return {
        ...baseOptions,
        scales: {
          x: {
            ...CHART_DEFAULTS.scales.x,
            stacked: true,
          },
          y: {
            ...CHART_DEFAULTS.scales.y,
            stacked: true,
            beginAtZero: true,
          },
        },
      } as ChartOptions;

    case "line":
      return {
        ...baseOptions,
        scales: {
          x: {
            ...CHART_DEFAULTS.scales.x,
          },
          y: {
            ...CHART_DEFAULTS.scales.y,
            beginAtZero: true,
          },
        },
        elements: {
          line: {
            tension: 0.3,
            borderWidth: 2,
          },
          point: {
            radius: 3,
            hoverRadius: 6,
          },
        },
      } as ChartOptions;

    case "pie":
    case "doughnut":
      return {
        ...baseOptions,
        plugins: {
          ...baseOptions.plugins,
          legend: {
            ...CHART_DEFAULTS.plugins.legend,
            position: "right" as const,
          },
        },
      } as ChartOptions;

    case "scatter":
      return {
        ...baseOptions,
        scales: {
          x: {
            ...CHART_DEFAULTS.scales.x,
            type: "linear" as const,
            position: "bottom" as const,
          },
          y: {
            ...CHART_DEFAULTS.scales.y,
          },
        },
        elements: {
          point: {
            radius: 4,
            hoverRadius: 7,
          },
        },
        plugins: {
          ...baseOptions.plugins,
          legend: {
            ...CHART_DEFAULTS.plugins.legend,
            display: false,
          },
        },
      } as ChartOptions;

    default:
      return baseOptions;
  }
}
