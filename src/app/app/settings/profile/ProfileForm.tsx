"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera } from "lucide-react";
import { initials } from "@/lib/utils";

type Initial = {
  name: string;
  email: string;
  image: string;
  title: string;
  role: "ADMIN" | "USER";
};

export default function ProfileForm({ initial }: { initial: Initial }) {
  const [name, setName] = useState(initial.name);
  const [title, setTitle] = useState(initial.title);
  const [image, setImage] = useState(initial.image);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/internal/me", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          title,
          image: image || null,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(j?.error ?? "Failed to save");
        return;
      }
      toast.success("Profile saved");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card p-6 space-y-5">
      <div className="flex items-center gap-4">
        <div className="relative">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt=""
              className="size-16 rounded-full object-cover border border-border"
              onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
            />
          ) : (
            <div className="size-16 rounded-full bg-accentSoft text-accent grid place-items-center text-lg font-semibold">
              {initials(name, initial.email)}
            </div>
          )}
          <div className="absolute -bottom-1 -right-1 size-6 rounded-full bg-white border border-border grid place-items-center text-muted">
            <Camera size={12} />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-semibold truncate">
            {name || initial.email.split("@")[0]}
          </div>
          <div className="text-sm text-muted truncate">
            {title || (initial.role === "ADMIN" ? "Workspace admin" : "Member")}
          </div>
          <div className="text-xs text-mutedSoft mt-0.5 truncate">{initial.email}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="label">Full name</span>
          <input
            className="input mt-1.5"
            placeholder="e.g. Laksh Sehgal"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="label">Job title</span>
          <input
            className="input mt-1.5"
            placeholder="e.g. Head of Growth"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
      </div>

      <label className="block">
        <span className="label">Photo URL</span>
        <input
          className="input mt-1.5"
          placeholder="https://… (or leave blank to use initials)"
          value={image}
          onChange={(e) => setImage(e.target.value)}
          type="url"
        />
        <p className="text-[11.5px] text-muted mt-1.5">
          Paste a public image URL. We don&apos;t host uploads yet.
        </p>
      </label>

      <div className="flex justify-end gap-2 pt-1">
        <button
          className="btn-primary"
          onClick={save}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
