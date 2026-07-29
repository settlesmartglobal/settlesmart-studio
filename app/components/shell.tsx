import Link from "next/link";
import { Bell, Building2, ChartNoAxesColumn, Clapperboard, ImageIcon, LayoutDashboard, Palette, Search, Settings, WandSparkles } from "lucide-react";
import { prisma } from "@/core/database/prisma";

const nav = [
  ["Overview", "/studio?section=overview", LayoutDashboard],
  ["Brand", "/studio?section=brand", Building2],
  ["Create", "/studio?section=create", WandSparkles],
  ["Campaigns", "/studio?section=campaigns", Clapperboard],
  ["Media", "/studio?section=media", ImageIcon],
  ["Processing", "/studio?section=processing", ChartNoAxesColumn],
  ["Templates", "/studio?section=templates", Palette],
  ["Settings", "/studio?section=settings", Settings],
] as const;

export async function AppShell({ title, children }: { title: string; children: React.ReactNode }) {
  const companies = await prisma.company.findMany({ orderBy: { createdAt: "desc" }, take: 8 });
  return (
    <div className="min-h-screen bg-[#f7f8fb] text-slate-950">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white/95 px-4 py-5 lg:block">
        <Link href="/" className="block px-2">
          <div className="text-lg font-semibold">SettleSmart Studio</div>
          <div className="text-xs text-slate-500">Create once. Approve once. Use everywhere.</div>
        </Link>
        <nav className="mt-8 space-y-1">
          {nav.map(([label, href, Icon]) => (
            <Link key={href} href={href} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950">
              <Icon size={17} />
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="flex min-h-16 flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
            <div className="mr-auto">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">SettleSmart Works</div>
              <h1 className="text-xl font-semibold">{title}</h1>
            </div>
            <select className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm">
              <option>Active company</option>
              {companies.map((company) => <option key={company.id}>{company.name}</option>)}
            </select>
            <div className="flex h-10 min-w-52 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-400">
              <Search size={16} /> Search
            </div>
            <button className="grid size-10 place-items-center rounded-md border border-slate-200 bg-white" aria-label="Notifications"><Bell size={17} /></button>
            <div className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-sky-500 to-emerald-500 text-sm font-bold text-white">SS</div>
          </div>
          <nav className="flex gap-2 overflow-x-auto px-4 pb-3 lg:hidden">
            {nav.map(([label, href]) => <Link key={href} className="shrink-0 rounded-md bg-slate-100 px-3 py-2 text-xs font-medium" href={href}>{label}</Link>)}
          </nav>
        </header>
        <main className="px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}

export function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-lg border border-slate-200 bg-white p-5 shadow-sm ${className}`}>{children}</section>;
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center"><h2 className="font-semibold">{title}</h2><p className="mt-1 text-sm text-slate-500">{body}</p></div>;
}
