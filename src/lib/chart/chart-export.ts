import type { Chart } from "chart.js";

/**
 * Export a Chart.js chart instance as a PNG image download.
 *
 * Takes a Chart.js chart reference (the Chart instance itself),
 * renders it to a data URL, creates a temporary download link,
 * and triggers a browser download.
 *
 * @param chartRef - A Chart.js Chart instance. If null or undefined, the function
 *                   returns silently without action.
 * @param fileName - Optional file name for the downloaded PNG. Defaults to
 *                   "chart-export.png".
 */
export function exportChartAsPNG(
  chartRef: Chart | null | undefined,
  fileName: string = "chart-export.png"
): void {
  if (!chartRef) return;

  try {
    const canvas = chartRef.canvas;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL("image/png", 1.0);

    const link = document.createElement("a");
    link.download = fileName.endsWith(".png") ? fileName : `${fileName}.png`;
    link.href = dataUrl;

    // Append to body, click, and remove to trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch {
    // Canvas may be tainted or unavailable in some environments.
    // Fail silently rather than crashing the UI.
    console.warn("Failed to export chart as PNG.");
  }
}
