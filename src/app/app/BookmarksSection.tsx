"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Bookmark as BookmarkIcon,
  Plus,
  X,
  Trash2,
  ExternalLink,
  Folder,
  FolderOpen,
  ChevronRight,
} from "lucide-react";

type Bookmark = {
  id: string;
  title: string;
  url: string;
  folder: string | null;
};

const EXPANDED_KEY = "newcrm:bookmark-folders-expanded";
const SECTION_KEY = "newcrm:bookmarks-open";

function loadSectionOpen(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(SECTION_KEY) !== "0";
  } catch {
    return true;
  }
}

function loadExpanded(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(EXPANDED_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function saveExpanded(state: Record<string, boolean>) {
  try {
    localStorage.setItem(EXPANDED_KEY, JSON.stringify(state));
  } catch {}
}

export default function BookmarksSection({
  bookmarks: initial,
}: {
  bookmarks: Bookmark[];
}) {
  const [bookmarks, setBookmarks] = useState(initial);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [folder, setFolder] = useState("");
  const [newFolderMode, setNewFolderMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sectionOpen, setSectionOpen] = useState(() =>
    typeof window !== "undefined" ? loadSectionOpen() : true,
  );
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    typeof window !== "undefined" ? loadExpanded() : {},
  );
  const router = useRouter();

  // Group bookmarks by folder
  const { folders, ungrouped, folderNames } = useMemo(() => {
    const groups: Record<string, Bookmark[]> = {};
    const ungrouped: Bookmark[] = [];
    for (const b of bookmarks) {
      if (b.folder) {
        (groups[b.folder] ??= []).push(b);
      } else {
        ungrouped.push(b);
      }
    }
    return {
      folders: groups,
      ungrouped,
      folderNames: Object.keys(groups).sort(),
    };
  }, [bookmarks]);

  function toggleFolder(name: string) {
    setExpanded((prev) => {
      const next = { ...prev, [name]: !prev[name] };
      saveExpanded(next);
      return next;
    });
  }

  async function add() {
    if (!title.trim() || !url.trim()) return toast.error("Title and URL required");
    let normalizedUrl = url.trim();
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }
    setSaving(true);
    try {
      const folderValue = folder.trim() || null;
      const res = await fetch("/api/internal/bookmarks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          url: normalizedUrl,
          folder: folderValue,
        }),
      });
      if (!res.ok) return toast.error("Failed to save");
      const created = await res.json();
      setBookmarks((prev) => [...prev, created]);
      // Auto-expand the folder we just added into
      if (folderValue) {
        setExpanded((prev) => {
          const next = { ...prev, [folderValue]: true };
          saveExpanded(next);
          return next;
        });
      }
      setTitle("");
      setUrl("");
      setFolder("");
      setNewFolderMode(false);
      setAdding(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
    await fetch(`/api/internal/bookmarks/${id}`, { method: "DELETE" });
    router.refresh();
  }

  async function moveToFolder(id: string, newFolder: string | null) {
    setBookmarks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, folder: newFolder } : b)),
    );
    await fetch(`/api/internal/bookmarks/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ folder: newFolder }),
    });
    router.refresh();
  }

  async function deleteFolder(folderName: string) {
    const items = folders[folderName] ?? [];
    if (items.length === 0) return;
    if (
      !confirm(
        `Delete folder "${folderName}" and all ${items.length} bookmark${items.length === 1 ? "" : "s"} inside?`,
      )
    )
      return;
    setBookmarks((prev) => prev.filter((b) => b.folder !== folderName));
    await Promise.all(
      items.map((b) =>
        fetch(`/api/internal/bookmarks/${b.id}`, { method: "DELETE" }),
      ),
    );
    router.refresh();
  }

  const hasAnyBookmarks = bookmarks.length > 0;

  return (
    <>
      <div className="section-label">
        <button
          onClick={() => {
            setSectionOpen((prev) => {
              const next = !prev;
              try { localStorage.setItem(SECTION_KEY, next ? "1" : "0"); } catch {}
              return next;
            });
          }}
          className="flex items-center gap-1"
        >
          <ChevronRight
            size={10}
            className={"transition-transform " + (sectionOpen ? "rotate-90" : "")}
          />
          <span>Bookmarks</span>
        </button>
        {sectionOpen && (
          <button
            onClick={() => setAdding(true)}
            className="size-5 grid place-items-center rounded text-sidebar-muted hover:text-white"
            title="Add bookmark"
          >
            <Plus size={12} />
          </button>
        )}
      </div>

      {sectionOpen && !hasAnyBookmarks && !adding && (
        <div className="bookmark-empty">
          <span>No bookmarks yet</span>
        </div>
      )}

      {/* Folders */}
      {sectionOpen && folderNames.map((name) => {
        const isOpen = !!expanded[name];
        const items = folders[name] ?? [];
        return (
          <div key={name} className="bookmark-folder">
            <div className="bookmark-folder-head group">
              <button
                onClick={() => toggleFolder(name)}
                className="bookmark-folder-toggle"
              >
                <ChevronRight
                  size={11}
                  className={
                    "flex-shrink-0 transition-transform " +
                    (isOpen ? "rotate-90" : "")
                  }
                />
                {isOpen ? (
                  <FolderOpen size={12} className="flex-shrink-0" />
                ) : (
                  <Folder size={12} className="flex-shrink-0" />
                )}
                <span className="flex-1 truncate">{name}</span>
                <span className="bookmark-folder-count">{items.length}</span>
              </button>
              <button
                onClick={() => deleteFolder(name)}
                className="bookmark-remove"
                title="Delete folder"
              >
                <Trash2 size={10} />
              </button>
            </div>
            {isOpen &&
              items.map((b) => (
                <BookmarkRow
                  key={b.id}
                  bookmark={b}
                  indent
                  onRemove={remove}
                />
              ))}
          </div>
        );
      })}

      {/* Ungrouped bookmarks */}
      {sectionOpen && ungrouped.map((b) => (
        <BookmarkRow key={b.id} bookmark={b} onRemove={remove} />
      ))}

      {/* Add form */}
      {sectionOpen && adding && (
        <div className="bookmark-add">
          <input
            autoFocus
            className="bookmark-input"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") add();
              if (e.key === "Escape") {
                setAdding(false);
                setTitle("");
                setUrl("");
                setFolder("");
              }
            }}
          />
          <input
            className="bookmark-input"
            placeholder="https://..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") add();
            }}
          />

          {/* Folder picker */}
          {newFolderMode ? (
            <input
              className="bookmark-input"
              placeholder="New folder name"
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") add();
              }}
            />
          ) : (
            <div className="flex gap-1">
              <select
                className="bookmark-input flex-1"
                value={folder}
                onChange={(e) => {
                  if (e.target.value === "__new__") {
                    setNewFolderMode(true);
                    setFolder("");
                  } else {
                    setFolder(e.target.value);
                  }
                }}
              >
                <option value="">No folder</option>
                {folderNames.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
                <option value="__new__">+ New folder…</option>
              </select>
            </div>
          )}

          <div className="flex gap-1">
            <button
              onClick={add}
              disabled={saving || !title.trim() || !url.trim()}
              className="flex-1 px-2 py-1 text-[11.5px] font-semibold bg-accent text-white rounded hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => {
                setAdding(false);
                setNewFolderMode(false);
                setTitle("");
                setUrl("");
                setFolder("");
              }}
              className="size-7 grid place-items-center rounded text-sidebar-muted hover:text-white hover:bg-sidebar-hover"
            >
              <X size={13} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function BookmarkRow({
  bookmark: b,
  indent,
  onRemove,
}: {
  bookmark: Bookmark;
  indent?: boolean;
  onRemove: (id: string) => void;
}) {
  return (
    <div className={"bookmark-row group " + (indent ? "bookmark-indent" : "")}>
      <a
        href={b.url}
        target="_blank"
        rel="noopener noreferrer"
        className="bookmark-link"
        title={b.url}
      >
        <BookmarkIcon size={12} className="flex-shrink-0" />
        <span className="flex-1 truncate">{b.title}</span>
        <ExternalLink
          size={10}
          className="flex-shrink-0 opacity-0 group-hover:opacity-60"
        />
      </a>
      <button
        onClick={() => onRemove(b.id)}
        className="bookmark-remove"
        title="Remove bookmark"
      >
        <Trash2 size={10} />
      </button>
    </div>
  );
}
