"use client";

import { useState } from "react";

/**
 * Renders the workspace logo from /public/logos/logo.png with a graceful
 * fallback to /public/logos/logo.svg (shipped default) if the PNG 404s.
 * Lets ops-y people drop either file in the folder without breaking the UI.
 */
export default function BrandLogo({
  className,
  alt = "",
}: {
  className?: string;
  alt?: string;
}) {
  const [src, setSrc] = useState("/logos/logo.png");
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => {
        if (src !== "/logos/logo.svg") setSrc("/logos/logo.svg");
      }}
    />
  );
}
