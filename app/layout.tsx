import type { Metadata, Viewport } from "next";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "SettleSmart Studio",
  description: "AI-Powered Marketing & Brand Operations Platform by SettleSmart Works",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Studio",
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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
