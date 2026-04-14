import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Collapsible section rendered as a Close-style rounded card. Uses a native
 * <details> element so it works without JS, while the styles in globals.css
 * animate the chevron via [open].
 */
export default function Section({
  icon,
  iconBg,
  title,
  count,
  right,
  children,
  defaultOpen = false,
}: {
  icon?: ReactNode;
  iconBg?: string;
  title: string;
  count?: number;
  right?: ReactNode;
  children?: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details className="section" open={defaultOpen}>
      <summary>
        <span className="chev">
          <ChevronRight size={14} />
        </span>
        {icon && (
          <span className={"sec-ico " + (iconBg ?? "bg-surface")}>{icon}</span>
        )}
        <span className="sec-title">{title}</span>
        {typeof count === "number" && <span className="sec-count">{count}</span>}
        <span className="ml-auto flex items-center gap-1">{right}</span>
      </summary>
      {children && <div className="bg-white">{children}</div>}
    </details>
  );
}

export function SectionIconBtn({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <span
      className="size-5 grid place-items-center rounded text-muted hover:bg-surface hover:text-ink cursor-pointer"
      title={title}
    >
      {children}
    </span>
  );
}
