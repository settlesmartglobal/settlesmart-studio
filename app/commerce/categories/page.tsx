import { prisma } from "@/core/database/prisma";
import { AppShell, Panel } from "../../components/shell";
import { CommerceForm } from "../../components/forms";

export default async function CategoriesPage() {
  const [companies, categories] = await Promise.all([prisma.company.findMany({ orderBy: { name: "asc" } }), prisma.productCategory.findMany({ include: { company: true }, orderBy: { name: "asc" } })]);
  return <AppShell title="Categories"><div className="grid gap-5 lg:grid-cols-[420px_1fr]"><Panel><CommerceForm companies={companies} /></Panel><Panel>{categories.map((c) => <div key={c.id} className="border-b border-slate-100 py-3"><b>{c.name}</b><span className="text-sm text-slate-500"> · {c.company.name} · {c.active ? "Active" : "Inactive"}</span></div>)}</Panel></div></AppShell>;
}
