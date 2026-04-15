import "./globals.css";
import type { Metadata } from "next";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Neuroid CRM",
  description: "Internal CRM with webhooks, Gmail sync and pipeline kanban.",
  // Favicon: drop your file at /public/logos/favicon.png to rebrand.
  // Next.js will also auto-detect src/app/icon.svg as a fallback if the
  // PNG is missing at request time.
  icons: {
    // Browser tries each in order; falls back to the gradient "N" SVG
    // if the user hasn't uploaded a PNG yet.
    icon: [
      { url: "/logos/favicon.png", type: "image/png" },
      { url: "/logos/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/logos/favicon.png" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
