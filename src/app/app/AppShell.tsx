"use client";

import { useEffect, useState } from "react";
import { ChevronsLeft, ChevronsRight } from "lucide-react";

const COLLAPSED_KEY = "newcrm:sidebar-collapsed";

export default function AppShell({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Load persisted state on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(COLLAPSED_KEY);
      if (saved === "1") setCollapsed(true);
    } catch {}
    setHydrated(true);
  }, []);

  function toggle() {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
      } catch {}
      return next;
    });
  }

  // Avoid hydration flash by not rendering collapsed state until client-side
  const dataCollapsed = hydrated && collapsed;

  return (
    <div
      className={
        "min-h-screen bg-surface grid " +
        (dataCollapsed ? "grid-cols-[64px_1fr]" : "grid-cols-[232px_1fr]")
      }
      data-sidebar-collapsed={dataCollapsed}
    >
      <aside
        className="sidebar flex flex-col h-screen sticky top-0"
        data-collapsed={dataCollapsed}
      >
        {sidebar}
        <div className="collapse-bar">
          <button
            className="flex items-center gap-1.5"
            type="button"
            onClick={toggle}
            title={dataCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {dataCollapsed ? (
              <ChevronsRight size={13} />
            ) : (
              <>
                <ChevronsLeft size={13} /> Collapse
              </>
            )}
          </button>
        </div>
      </aside>

      <main className="min-w-0 bg-white flex flex-col">{children}</main>
    </div>
  );
}
