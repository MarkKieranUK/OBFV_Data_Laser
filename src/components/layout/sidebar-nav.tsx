"use client";

import {
  LayoutDashboard,
  TableProperties,
  BarChart3,
  Grid3X3,
  Calculator,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/stores/ui-store";
import type { DashboardSection } from "@/types/data";

const NAV_ITEMS: { section: DashboardSection; label: string; icon: React.ElementType }[] = [
  { section: "overview", label: "Overview", icon: LayoutDashboard },
  { section: "table", label: "Data Table", icon: TableProperties },
  { section: "charts", label: "Chart Builder", icon: BarChart3 },
  { section: "crosstab", label: "Cross-Tab", icon: Grid3X3 },
  { section: "stats", label: "Summary Stats", icon: Calculator },
  { section: "groupby", label: "Group By", icon: Layers },
];

export function SidebarNav() {
  const activeSection = useUIStore((s) => s.activeSection);
  const setActiveSection = useUIStore((s) => s.setActiveSection);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);

  if (!sidebarOpen) return null;

  return (
    <nav className="flex w-56 shrink-0 flex-col gap-1 border-r border-border bg-sidebar p-3">
      {NAV_ITEMS.map(({ section, label, icon: Icon }) => (
        <Button
          key={section}
          variant={activeSection === section ? "secondary" : "ghost"}
          className={`justify-start gap-2.5 text-sm ${
            activeSection === section
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground/70 hover:text-sidebar-foreground"
          }`}
          onClick={() => setActiveSection(section)}
        >
          <Icon className="h-4 w-4" />
          {label}
        </Button>
      ))}
    </nav>
  );
}
