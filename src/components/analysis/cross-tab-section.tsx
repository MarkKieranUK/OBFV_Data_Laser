"use client";

import { CrossTabBuilder } from "./cross-tab-builder";

export function CrossTabSection() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Cross-Tabulation</h2>
      <CrossTabBuilder />
    </div>
  );
}
