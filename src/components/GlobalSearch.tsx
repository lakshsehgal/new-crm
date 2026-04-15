"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Target, Users, Trophy } from "lucide-react";
import { formatMoney } from "@/lib/utils";

type Result = {
  leads: { id: string; name: string; status: string }[];
  contacts: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    lead: { id: string; name: string } | null;
  }[];
  opportunities: {
    id: string;
    name: string;
    value: string;
    lead: { id: string; name: string };
    stage: { name: string };
  }[];
};

const EMPTY: Result = { leads: [], contacts: [], opportunities: [] };

export default function GlobalSearch() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Result>(EMPTY);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // ⌘K / Ctrl-K to focus
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Click outside closes
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Debounced fetch
  useEffect(() => {
    if (!q.trim()) {
      setResults(EMPTY);
      return;
    }
    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/internal/search?q=${encodeURIComponent(q.trim())}`,
        );
        if (res.ok) setResults(await res.json());
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(handle);
  }, [q]);

  const total =
    results.leads.length + results.contacts.length + results.opportunities.length;

  function go(href: string) {
    setOpen(false);
    setQ("");
    router.push(href);
  }

  function onEnter() {
    if (results.opportunities[0]) {
      go(`/app/opportunities/${results.opportunities[0].id}`);
    } else if (results.leads[0]) {
      go(`/app/leads/${results.leads[0].id}`);
    } else if (results.contacts[0]) {
      go(`/app/contacts/${results.contacts[0].id}`);
    }
  }

  return (
    <div className="relative w-full max-w-xl" ref={ref}>
      <div className="relative">
        <Search
          size={14}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          ref={inputRef}
          className="w-full rounded-md border border-border bg-surface pl-8 pr-12 py-1.5 text-sm outline-none focus:bg-white focus:border-accent"
          placeholder="Search leads, contacts, opportunities…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onEnter();
          }}
        />
        <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-mutedSoft border border-border rounded px-1.5 py-0.5 bg-white">
          ⌘K
        </kbd>
      </div>

      {open && q.trim() && (
        <div className="absolute top-full left-0 right-0 mt-1 card shadow-pop z-40 max-h-[60vh] overflow-y-auto pop-in">
          {loading && total === 0 && (
            <div className="px-4 py-6 text-center text-sm text-muted">
              Searching…
            </div>
          )}
          {!loading && total === 0 && (
            <div className="px-4 py-6 text-center text-sm text-muted">
              No matches for "{q}"
            </div>
          )}

          {results.opportunities.length > 0 && (
            <Section label="Opportunities">
              {results.opportunities.map((o) => (
                <button
                  key={o.id}
                  onClick={() => go(`/app/opportunities/${o.id}`)}
                  className="w-full text-left px-3 py-2 hover:bg-surface flex items-center gap-2"
                >
                  <Trophy size={13} className="text-amber-500 flex-shrink-0" />
                  <span className="font-medium truncate flex-1">{o.name}</span>
                  <span className="text-[11px] text-muted">{o.lead.name}</span>
                  <span className="badge text-[10px]">{o.stage.name}</span>
                  <span className="text-[12px] font-semibold ml-2">
                    {formatMoney(o.value)}
                  </span>
                </button>
              ))}
            </Section>
          )}
          {results.leads.length > 0 && (
            <Section label="Leads">
              {results.leads.map((l) => (
                <button
                  key={l.id}
                  onClick={() => go(`/app/leads/${l.id}`)}
                  className="w-full text-left px-3 py-2 hover:bg-surface flex items-center gap-2"
                >
                  <Target size={13} className="text-blue-500 flex-shrink-0" />
                  <span className="font-medium truncate flex-1">{l.name}</span>
                  <span className="badge text-[10px]">
                    {l.status.replace("_", " ")}
                  </span>
                </button>
              ))}
            </Section>
          )}
          {results.contacts.length > 0 && (
            <Section label="Contacts">
              {results.contacts.map((c) => {
                const name =
                  [c.firstName, c.lastName].filter(Boolean).join(" ") ||
                  c.email ||
                  "(no name)";
                return (
                  <button
                    key={c.id}
                    onClick={() => go(`/app/contacts/${c.id}`)}
                    className="w-full text-left px-3 py-2 hover:bg-surface flex items-center gap-2"
                  >
                    <Users size={13} className="text-indigo-500 flex-shrink-0" />
                    <span className="font-medium truncate flex-1">{name}</span>
                    {c.lead && (
                      <span className="text-[11px] text-muted">
                        {c.lead.name}
                      </span>
                    )}
                    {c.email && (
                      <span className="text-[11px] text-mutedSoft truncate max-w-[180px]">
                        {c.email}
                      </span>
                    )}
                  </button>
                );
              })}
            </Section>
          )}
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
    <div className="border-b border-border last:border-0">
      <div className="px-3 pt-2 pb-1 text-[10.5px] uppercase tracking-wide text-mutedSoft font-semibold">
        {label}
      </div>
      <div className="pb-1">{children}</div>
    </div>
  );
}
