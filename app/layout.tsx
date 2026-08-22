import type { Metadata, Viewport } from "next";
import { ServiceWorkerRegistration } from "./components/service-worker-registration";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "SettleSmart Commerce",
  description: "Business ordering and operations by SettleSmart Works",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "SettleSmart Commerce",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col"><ServiceWorkerRegistration />{children}</body>
    </html>
  );
}
