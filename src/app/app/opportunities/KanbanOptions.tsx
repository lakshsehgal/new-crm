"use client";

import { useEffect, useRef, useState } from "react";
import { SlidersHorizontal, Check } from "lucide-react";

export type KanbanAppearance = {
  density: "minimal" | "full";
  showLeadStatus: boolean;
  showContact: boolean;
  showLastNote: boolean;
  showLastTouchpoint: boolean;
};

const STORAGE_KEY = "newcrm:kanban-appearance";
const DEFAULT_APPEARANCE: KanbanAppearance = {
  density: "full",
  showLeadStatus: false,
  showContact: true,
  showLastNote: false,
  showLastTouchpoint: false,
};

/** Read current appearance settings from localStorage (client-only). */
export function readKanbanAppearance(): KanbanAppearance {
  if (typeof window === "undefined") return DEFAULT_APPEARANCE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_APPEARANCE;
    return { ...DEFAULT_APPEARANCE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

function writeKanbanAppearance(a: KanbanAppearance) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(a));
  } catch {}
  // Notify listeners (KanbanBoard) so they re-read without a full reload
  window.dispatchEvent(new CustomEvent("newcrm:kanban-appearance"));
}

export default function KanbanOptions() {
  const [open, setOpen] = useState(false);
  const [appearance, setAppearance] = useState<KanbanAppearance>(DEFAULT_APPEARANCE);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAppearance(readKanbanAppearance());
  }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function update<K extends keyof KanbanAppearance>(
    key: K,
    value: KanbanAppearance[K],
  ) {
    const next = { ...appearance, [key]: value };
    setAppearance(next);
    writeKanbanAppearance(next);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        className="pill"
        onClick={() => setOpen((o) => !o)}
        title="Customize board appearance"
      >
        <SlidersHorizontal size={13} /> Options
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 card shadow-pop z-30 py-3 w-[280px] pop-in">
          <Section label="Values">
            <select
              className="input mt-1 w-full"
              value={appearance.density}
              onChange={(e) =>
                update("density", e.target.value as KanbanAppearance["density"])
              }
            >
              <option value="minimal">Minimal</option>
              <option value="full">Full</option>
            </select>
          </Section>

          <div className="border-t border-border my-2" />

          <Section label="Customize appearance">
            <Toggle
              label="Lead status"
              checked={appearance.showLeadStatus}
              onChange={(v) => update("showLeadStatus", v)}
            />
            <Toggle
              label="Contact"
              checked={appearance.showContact}
              onChange={(v) => update("showContact", v)}
            />
            <Toggle
              label="Last note"
              checked={appearance.showLastNote}
              onChange={(v) => update("showLastNote", v)}
            />
            <Toggle
              label="Last touchpoint"
              checked={appearance.showLastTouchpoint}
              onChange={(v) => update("showLastTouchpoint", v)}
            />
          </Section>
        </div>
      )}
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-3">
      <div className="text-[10.5px] uppercase tracking-wide text-mutedSoft font-semibold pb-1.5">
        {label}
      </div>
      {children}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      className="w-full flex items-center gap-2 py-1.5 text-sm"
      onClick={() => onChange(!checked)}
    >
      <span
        className={
          "size-9 h-5 rounded-full relative transition-colors " +
          (checked ? "bg-accent" : "bg-border")
        }
        style={{ width: 32 }}
      >
        <span
          className="absolute top-0.5 size-4 bg-white rounded-full shadow transition-transform"
          style={{ left: checked ? 14 : 2 }}
        />
      </span>
      <span className="flex-1 text-left">{label}</span>
      {checked && <Check size={12} className="text-accent" />}
    </button>
  );
}
