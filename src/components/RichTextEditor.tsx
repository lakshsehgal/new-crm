"use client";

import { useEffect, useRef } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Link as LinkIcon,
  Undo2,
  Redo2,
  RemoveFormatting,
} from "lucide-react";

/**
 * Minimal rich-text editor used in the email composer. Renders a
 * contentEditable surface with a small formatting toolbar (Bold / Italic /
 * Underline / Strike / Lists / Link / Undo / Redo / Clear). Emits HTML via
 * onChange. Uses document.execCommand — legacy but reliable for Gmail-style
 * plain-HTML body content, and avoids pulling in a heavy editor dependency.
 */
export default function RichTextEditor({
  value,
  onChange,
  placeholder,
  minHeight = 220,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Sync initial value. Only update DOM when the prop truly differs from what
  // the editor already holds so we don't clobber the caret on every keystroke.
  useEffect(() => {
    if (!ref.current) return;
    if (ref.current.innerHTML !== value) {
      ref.current.innerHTML = value ?? "";
    }
  }, [value]);

  function exec(command: string, arg?: string) {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    onChange(ref.current?.innerHTML ?? "");
  }

  function insertLink() {
    const url = prompt("Link URL");
    if (!url) return;
    const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    exec("createLink", href);
  }

  return (
    <div className="rte">
      <div className="rte-toolbar">
        <ToolbarButton
          onClick={() => exec("bold")}
          title="Bold (⌘B)"
        >
          <Bold size={13} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => exec("italic")}
          title="Italic (⌘I)"
        >
          <Italic size={13} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => exec("underline")}
          title="Underline (⌘U)"
        >
          <Underline size={13} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => exec("strikeThrough")}
          title="Strikethrough"
        >
          <Strikethrough size={13} />
        </ToolbarButton>
        <div className="rte-divider" />
        <ToolbarButton
          onClick={() => exec("insertUnorderedList")}
          title="Bulleted list"
        >
          <List size={13} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => exec("insertOrderedList")}
          title="Numbered list"
        >
          <ListOrdered size={13} />
        </ToolbarButton>
        <ToolbarButton onClick={insertLink} title="Insert link">
          <LinkIcon size={13} />
        </ToolbarButton>
        <div className="rte-divider" />
        <ToolbarButton onClick={() => exec("undo")} title="Undo">
          <Undo2 size={13} />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec("redo")} title="Redo">
          <Redo2 size={13} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => exec("removeFormat")}
          title="Clear formatting"
        >
          <RemoveFormatting size={13} />
        </ToolbarButton>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        className="rte-surface"
        style={{ minHeight }}
        data-placeholder={placeholder ?? "Write your message…"}
        onInput={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
            e.preventDefault();
            exec("bold");
          } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "i") {
            e.preventDefault();
            exec("italic");
          } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "u") {
            e.preventDefault();
            exec("underline");
          }
        }}
      />
    </div>
  );
}

function ToolbarButton({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className="rte-btn"
      title={title}
      onMouseDown={(e) => {
        e.preventDefault(); // keep selection in the editor
        onClick();
      }}
    >
      {children}
    </button>
  );
}
