"use client";

import { useMemo } from "react";
import { Lightbulb, AlertTriangle, Info, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDatasetStore } from "@/stores/dataset-store";
import { useFilteredData } from "@/hooks/use-filtered-data";
import { generateInsights } from "@/lib/analysis/insights";
import type { Insight } from "@/types/data";

const SEVERITY_STYLES: Record<
  Insight["severity"],
  { border: string; icon: React.ElementType; iconClass: string; bg: string }
> = {
  info: {
    border: "border-l-accent-blue",
    icon: Info,
    iconClass: "text-accent-blue",
    bg: "bg-accent-blue/5",
  },
  warning: {
    border: "border-l-warning",
    icon: AlertTriangle,
    iconClass: "text-warning",
    bg: "bg-warning/5",
  },
  notable: {
    border: "border-l-accent-red",
    icon: Star,
    iconClass: "text-accent-red",
    bg: "bg-accent-red/5",
  },
};

export function KeyInsights() {
  const columns = useDatasetStore((s) => s.columns);
  const isLoaded = useDatasetStore((s) => s.isLoaded);
  const { filteredRows } = useFilteredData();

  const insights = useMemo(() => {
    if (!isLoaded || filteredRows.length === 0 || columns.length === 0) return [];
    try {
      return generateInsights(filteredRows, columns);
    } catch {
      return [];
    }
  }, [filteredRows, columns, isLoaded]);

  return (
    <Card className="bg-surface border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Lightbulb className="h-4 w-4 text-warning" />
          Key Insights
        </CardTitle>
        {insights.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {insights.length} found
          </span>
        )}
      </CardHeader>
      <CardContent>
        {!isLoaded ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Load a dataset to see insights
          </p>
        ) : insights.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No insights generated for this dataset
          </p>
        ) : (
          <ScrollArea className="h-[280px] pr-3">
            <div className="space-y-3">
              {insights.map((insight, index) => {
                const style = SEVERITY_STYLES[insight.severity];
                const IconComponent = style.icon;

                return (
                  <div
                    key={`${insight.type}-${index}`}
                    className={`rounded-md border-l-4 ${style.border} ${style.bg} p-3`}
                  >
                    <div className="flex items-start gap-2">
                      <IconComponent className={`mt-0.5 h-4 w-4 shrink-0 ${style.iconClass}`} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {insight.title}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {insight.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
