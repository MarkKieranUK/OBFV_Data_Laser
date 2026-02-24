"use client";

import { useMemo, useRef, useCallback } from "react";
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
import { Bar, Line, Pie, Doughnut, Scatter } from "react-chartjs-2";
import { Download, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/stores/ui-store";
import { useFilteredData } from "@/hooks/use-filtered-data";
import { CHART_COLORS, CHART_COLORS_ALPHA, CHART_TYPE_LABELS } from "@/lib/constants";
import { getChartOptions } from "@/lib/chart/chart-config";
import { exportChartAsPNG } from "@/lib/chart/chart-export";

// Register all necessary Chart.js components at module level
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

type ChartDataset = {
  label: string;
  data: number[];
  backgroundColor: string | string[];
  borderColor: string | string[];
  borderWidth?: number;
};

export function ChartDisplay() {
  const chartRef = useRef<ChartJS | null>(null);
  const chartConfig = useUIStore((s) => s.chartConfig);
  const { filteredRows } = useFilteredData();

  const { xColumn, yColumn, groupByColumn, chartType } = chartConfig;

  const chartData = useMemo(() => {
    if (!xColumn || filteredRows.length === 0) return null;

    const isCount = !yColumn || yColumn === "__count__";

    if (groupByColumn) {
      // Grouped data
      const groups = new Map<string, Map<string, number[]>>();
      const xLabelsSet = new Set<string>();
      const groupLabelsSet = new Set<string>();

      for (const row of filteredRows) {
        const xVal = String(row[xColumn] ?? "");
        const groupVal = String(row[groupByColumn] ?? "");
        xLabelsSet.add(xVal);
        groupLabelsSet.add(groupVal);

        if (!groups.has(groupVal)) {
          groups.set(groupVal, new Map());
        }
        const groupMap = groups.get(groupVal)!;

        if (isCount) {
          if (!groupMap.has(xVal)) groupMap.set(xVal, [1]);
          else groupMap.get(xVal)![0]++;
        } else {
          const numVal = Number(row[yColumn]);
          if (!isNaN(numVal)) {
            if (!groupMap.has(xVal)) groupMap.set(xVal, []);
            groupMap.get(xVal)!.push(numVal);
          }
        }
      }

      const xLabels = Array.from(xLabelsSet);
      const groupLabels = Array.from(groupLabelsSet);

      const datasets: ChartDataset[] = groupLabels.map((groupLabel, i) => {
        const colorIndex = i % CHART_COLORS.length;
        const groupMap = groups.get(groupLabel)!;

        const data = xLabels.map((xLabel) => {
          const values = groupMap.get(xLabel);
          if (!values || values.length === 0) return 0;
          if (isCount) return values[0];
          // Mean aggregation
          return values.reduce((sum, v) => sum + v, 0) / values.length;
        });

        return {
          label: groupLabel,
          data,
          backgroundColor: CHART_COLORS_ALPHA[colorIndex],
          borderColor: CHART_COLORS[colorIndex],
          borderWidth: 2,
        };
      });

      return { labels: xLabels, datasets };
    }

    // Ungrouped data
    const aggregated = new Map<string, number[]>();
    for (const row of filteredRows) {
      const xVal = String(row[xColumn] ?? "");

      if (isCount) {
        if (!aggregated.has(xVal)) aggregated.set(xVal, [1]);
        else aggregated.get(xVal)![0]++;
      } else {
        const numVal = Number(row[yColumn]);
        if (!isNaN(numVal)) {
          if (!aggregated.has(xVal)) aggregated.set(xVal, []);
          aggregated.get(xVal)!.push(numVal);
        }
      }
    }

    const labels = Array.from(aggregated.keys());
    const data = labels.map((label) => {
      const values = aggregated.get(label)!;
      if (isCount) return values[0];
      return values.reduce((sum, v) => sum + v, 0) / values.length;
    });

    const isPieOrDoughnut = chartType === "pie" || chartType === "doughnut";
    const bgColors = isPieOrDoughnut
      ? labels.map((_, i) => CHART_COLORS_ALPHA[i % CHART_COLORS_ALPHA.length])
      : CHART_COLORS_ALPHA[0];
    const borderColors = isPieOrDoughnut
      ? labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length])
      : CHART_COLORS[0];

    return {
      labels,
      datasets: [
        {
          label: isCount ? "Count" : yColumn,
          data,
          backgroundColor: bgColors,
          borderColor: borderColors,
          borderWidth: 2,
        },
      ],
    };
  }, [xColumn, yColumn, groupByColumn, chartType, filteredRows]);

  const options = useMemo(() => {
    if (!xColumn) return {};
    try {
      return getChartOptions(chartType);
    } catch {
      // Fallback options if getChartOptions throws
      return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: "#8899b4" },
          },
        },
        scales:
          chartType !== "pie" && chartType !== "doughnut"
            ? {
                x: {
                  ticks: { color: "#8899b4" },
                  grid: { color: "#2a355520" },
                },
                y: {
                  ticks: { color: "#8899b4" },
                  grid: { color: "#2a355520" },
                },
              }
            : undefined,
      };
    }
  }, [chartType, xColumn, yColumn]);

  const handleDownload = useCallback(() => {
    if (chartRef.current) {
      try {
        exportChartAsPNG(chartRef.current);
      } catch {
        // Fallback: use the built-in toBase64Image
        const url = chartRef.current.toBase64Image();
        const a = document.createElement("a");
        a.href = url;
        a.download = "chart.png";
        a.click();
      }
    }
  }, []);

  const renderChart = () => {
    if (!chartData) return null;

    const chartProps = {
      ref: (ref: ChartJS | null) => {
        chartRef.current = ref;
      },
      data: chartData,
      options: { ...options, maintainAspectRatio: false },
    };

    switch (chartType) {
      case "bar":
      case "groupedBar":
        return <Bar {...(chartProps as React.ComponentProps<typeof Bar>)} />;

      case "horizontalBar":
        return (
          <Bar
            data={chartData}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            options={{ ...chartProps.options, indexAxis: "y" as const } as any}
            ref={chartRef as React.RefObject<ChartJS<"bar"> | null>}
          />
        );

      case "stackedBar":
        return (
          <Bar
            data={chartData}
            options={{
              ...chartProps.options,
              scales: {
                x: { stacked: true },
                y: { stacked: true },
              },
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any}
            ref={chartRef as React.RefObject<ChartJS<"bar"> | null>}
          />
        );

      case "line":
        return <Line {...(chartProps as React.ComponentProps<typeof Line>)} />;

      case "pie":
        return <Pie {...(chartProps as React.ComponentProps<typeof Pie>)} />;

      case "doughnut":
        return <Doughnut {...(chartProps as React.ComponentProps<typeof Doughnut>)} />;

      case "scatter": {
        // For scatter, remap data to {x, y} points
        const scatterData = {
          datasets: chartData.datasets.map((ds) => ({
            ...ds,
            data: ds.data.map((val, i) => ({
              x: Number(chartData.labels[i]) || i,
              y: val,
            })),
          })),
        };
        return (
          <Scatter
            ref={(ref) => {
              chartRef.current = ref as ChartJS | null;
            }}
            data={scatterData as React.ComponentProps<typeof Scatter>["data"]}
            options={{ ...options, maintainAspectRatio: false } as React.ComponentProps<typeof Scatter>["options"]}
          />
        );
      }

      default:
        return <Bar {...(chartProps as React.ComponentProps<typeof Bar>)} />;
    }
  };

  return (
    <Card className="bg-surface border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <BarChart3 className="h-4 w-4 text-accent-red" />
          {xColumn
            ? CHART_TYPE_LABELS[chartType]
            : "Chart Preview"}
        </CardTitle>
        {chartData && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="h-7 text-xs"
          >
            <Download className="mr-1 h-3 w-3" />
            Download PNG
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {!xColumn ? (
          <div className="flex h-[400px] items-center justify-center">
            <div className="text-center">
              <BarChart3 className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                Select columns to begin
              </p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                Choose an X axis column from the configuration panel
              </p>
            </div>
          </div>
        ) : !chartData ? (
          <div className="flex h-[400px] items-center justify-center">
            <p className="text-sm text-muted-foreground">
              No data available for the selected columns
            </p>
          </div>
        ) : (
          <div className="h-[400px]">{renderChart()}</div>
        )}
      </CardContent>
    </Card>
  );
}
