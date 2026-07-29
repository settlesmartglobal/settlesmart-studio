import Link from "next/link";
import { AppShell, Panel } from "./components/shell";
import { prisma } from "@/core/database/prisma";

export default async function Home() {
  const [companies, commerceCompanies, products, newOrders, campaigns, approvedMedia] = await Promise.all([
    prisma.company.count(),
    prisma.company.count({ where: { commerceEnabled: true } }),
    prisma.product.count(),
    prisma.order.count({ where: { status: "NEW" } }),
    prisma.studioCampaign.count(),
    prisma.mediaAsset.count({ where: { approvalStatus: "APPROVED" } }),
  ]);
  const stats = [
    ["Companies", companies],
    ["Commerce-enabled companies", commerceCompanies],
    ["Products", products],
    ["New orders", newOrders],
    ["Campaigns", campaigns],
    ["Approved media", approvedMedia],
  ];
  const actions = [
    ["Create Company", "/companies/new"],
    ["Set Up Brand Kit", "/brand-kit/setup"],
    ["Add Product", "/commerce/products/new"],
    ["View Orders", "/orders"],
    ["Create Campaign", "/campaigns/new"],
    ["Upload Media", "/media-library"],
  ];
  return (
    <AppShell title="Dashboard">
      <div className="mb-6">
        <p className="text-sm font-medium text-sky-700">AI-Powered Marketing & Brand Operations Platform</p>
        <h2 className="mt-2 text-3xl font-semibold">SettleSmart Studio Beta</h2>
        <p className="mt-2 max-w-3xl text-slate-600">A tenant-first foundation for local commerce, brand operations, reusable media, and campaign records.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map(([label, value]) => (
          <Panel key={label}>
            <div className="text-sm text-slate-500">{label}</div>
            <div className="mt-3 text-3xl font-semibold">{value}</div>
          </Panel>
        ))}
      </div>
      <Panel className="mt-6">
        <h3 className="text-lg font-semibold">Quick actions</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {actions.map(([label, href]) => (
            <Link key={href} href={href} className="rounded-md border border-slate-200 px-4 py-3 text-sm font-medium hover:border-sky-300 hover:bg-sky-50">{label}</Link>
          ))}
        </div>
      </Panel>
    </AppShell>
  );
}
