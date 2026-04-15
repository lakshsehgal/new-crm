import "./globals.css";
import type { Metadata } from "next";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Neuroid CRM",
  description: "Internal CRM with webhooks, Gmail sync and pipeline kanban.",
  // Favicon is served from /public/logos/favicon.png. To rebrand, replace
  // that single file — no code change required.
  icons: {
    icon: { url: "/logos/favicon.png", type: "image/png" },
    shortcut: { url: "/logos/favicon.png", type: "image/png" },
    apple: { url: "/logos/favicon.png" },
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
