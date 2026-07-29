import Link from "next/link";
import { prisma } from "@/core/database/prisma";
import { AppShell, EmptyState, Panel } from "../components/shell";

export default async function CompaniesPage() {
  const companies = await prisma.company.findMany({ orderBy: { createdAt: "desc" } });
  return <AppShell title="Companies"><div className="mb-4 flex justify-end"><Link className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white" href="/companies/new">Create Company</Link></div>{companies.length === 0 ? <EmptyState title="No companies yet" body="Create a company profile to begin Studio setup." /> : <Panel><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-slate-500"><th className="py-2">Company</th><th>Business type</th><th>Location</th><th>Commerce</th><th>Status</th><th>Actions</th></tr></thead><tbody>{companies.map((c) => <tr key={c.id} className="border-t border-slate-100"><td className="py-3 font-medium">{c.name}</td><td>{c.businessType}</td><td>{[c.city, c.country].filter(Boolean).join(", ") || "Not set"}</td><td>{c.commerceEnabled ? "Enabled" : "Off"}</td><td>{c.status}</td><td className="space-x-3"><Link className="text-sky-700" href={`/companies/${c.id}`}>Open</Link><Link className="text-sky-700" href={`/companies/${c.id}/edit`}>Edit</Link></td></tr>)}</tbody></table></div></Panel>}</AppShell>;
}
