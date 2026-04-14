"use client";

import { useEffect, useRef, useState } from "react";
import { Columns3, Check } from "lucide-react";

/**
 * Column visibility picker. Wrap a table's <th> / <td> cells with data-col="<key>"
 * and this component will toggle display on those cells via a scoped <style> tag.
 *
 * Visibility is persisted to localStorage under `newcrm:cols:<storageKey>`.
 */
export default function ColumnPicker({
  storageKey,
  columns,
}: {
  storageKey: string;
  columns: { key: string; label: string; locked?: boolean }[];
}) {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement>(null);

  // Load persisted
  useEffect(() => {
    try {
      const raw = localStorage.getItem("newcrm:cols:" + storageKey);
      if (raw) setHidden(new Set(JSON.parse(raw)));
    } catch {}
  }, [storageKey]);

  // Persist + close on outside click
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function toggle(key: string) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      try {
        localStorage.setItem("newcrm:cols:" + storageKey, JSON.stringify([...next]));
      } catch {}
      return next;
    });
  }

  return (
    <div className="relative" ref={ref}>
      {/* Scoped CSS that hides cells for this table */}
      <style>{
        [...hidden]
          .map((k) => `[data-col-scope="${storageKey}"] [data-col="${k}"]{display:none !important;}`)
          .join("")
      }</style>

      <button className="pill" onClick={() => setOpen((o) => !o)}>
        <Columns3 size={13} />
        <span>Columns</span>
        {hidden.size > 0 && (
          <span className="text-[10px] bg-accent text-white rounded-full px-1.5 ml-1">
            {columns.length - hidden.size}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 card shadow-pop z-30 py-1 min-w-[200px] pop-in">
          <div className="px-3 py-1.5 text-[10.5px] uppercase tracking-wide text-mutedSoft">
            Visible columns
          </div>
          {columns.map((c) => {
            const visible = !hidden.has(c.key);
            return (
              <button
                key={c.key}
                onClick={() => !c.locked && toggle(c.key)}
                className={
                  "w-full text-left text-sm px-3 py-1.5 flex items-center gap-2 " +
                  (c.locked ? "opacity-60 cursor-not-allowed" : "hover:bg-surface")
                }
                disabled={c.locked}
              >
                <span className={"size-4 rounded border grid place-items-center " +
                  (visible ? "bg-accent border-accent text-white" : "border-border")}>
                  {visible && <Check size={10} />}
                </span>
                <span className="flex-1">{c.label}</span>
                {c.locked && <span className="text-[10px] text-mutedSoft">locked</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
