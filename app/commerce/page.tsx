import Link from "next/link";
import { prisma } from "@/core/database/prisma";
import { appUrl, formatMoney } from "@/modules/wave1/utils";
import { QrCodeBox } from "../components/forms";
import { AssetImage } from "../components/asset-image";
import { OrderActionButtons, PaymentRecordForm } from "../components/order-actions";
import { CommerceSettingsForm, ProductActionBar, RiderCreateForm, WhatsAppTestForm } from "../components/commerce-actions";
import { whatsappTemplates } from "@/modules/wave1/notifications";
import { commerceReadiness } from "@/modules/wave1/readiness";
import { commerceStoreUrl, whatsappStoreShareUrl } from "@/modules/wave1/storefront";

const sections = ["overview", "business", "menu", "orders", "kitchen", "delivery", "customers", "promotions", "reports", "settings"] as const;
const labels: Record<(typeof sections)[number], string> = {
  overview: "Overview",
  business: "Business",
  menu: "Menu",
  orders: "Orders",
  kitchen: "Kitchen",
  delivery: "Delivery",
  customers: "Customers",
  promotions: "Promotions",
  reports: "Reports",
  settings: "Settings",
};

async function getCommerceData() {
  const company = await prisma.company.findFirst({
    where: { commerceEnabled: true, slug: "dubai-delights" },
    include: {
      brandProfile: true,
      commerceSettings: true,
      branches: { include: { hours: true }, orderBy: { createdAt: "asc" } },
      productCategories: { include: { products: { include: { variants: true, addOnGroups: { include: { group: { include: { addOns: true } } } } }, orderBy: { displayOrder: "asc" } } }, orderBy: { displayOrder: "asc" } },
      customers: { include: { orders: true }, orderBy: { updatedAt: "desc" } },
      orders: { include: { customer: true, items: true, branch: true, rider: true, statusHistory: true, feedback: true }, orderBy: { placedAt: "desc" } },
      riders: { include: { orders: true }, orderBy: { name: "asc" } },
      promotions: { include: { usages: true }, orderBy: { createdAt: "desc" } },
      notificationEvents: { orderBy: { createdAt: "desc" }, take: 10 },
      mediaAssets: { where: { approvalStatus: "APPROVED", approvedForExternalUse: true }, orderBy: { updatedAt: "desc" }, take: 12 },
    },
  });
  return company;
}

type CommerceCompany = NonNullable<Awaited<ReturnType<typeof getCommerceData>>>;
type CommerceOrders = CommerceCompany["orders"];
type RiderOption = { id: string; name: string; mobile: string; vehicleType: string | null; vehicleNumber: string | null; availabilityStatus: string; active: boolean };

function toCommerceSettingsCompany(company: CommerceCompany) {
  return {
    id: company.id,
    name: company.name,
    description: company.description,
    phone: company.phone,
    whatsapp: company.whatsapp,
    email: company.email,
    address: company.address,
    city: company.city,
    latitude: company.latitude == null ? null : Number(company.latitude),
    longitude: company.longitude == null ? null : Number(company.longitude),
    commerceSettings: company.commerceSettings
      ? {
          displayName: company.commerceSettings.displayName,
          description: company.commerceSettings.description,
          currency: company.commerceSettings.currency,
          timezone: company.commerceSettings.timezone,
          taxPercentage: Number(company.commerceSettings.taxPercentage),
          minimumOrderAmount: Number(company.commerceSettings.minimumOrderAmount),
          deliveryCharge: Number(company.commerceSettings.deliveryCharge),
          freeDeliveryThreshold: company.commerceSettings.freeDeliveryThreshold == null ? null : Number(company.commerceSettings.freeDeliveryThreshold),
          preparationMinutes: company.commerceSettings.preparationMinutes,
          deliveryRadiusKm: Number(company.commerceSettings.deliveryRadiusKm),
          deliveryEnabled: company.commerceSettings.deliveryEnabled,
          pickupEnabled: company.commerceSettings.pickupEnabled,
          cashPaymentEnabled: company.commerceSettings.cashPaymentEnabled,
          cardOnDeliveryEnabled: company.commerceSettings.cardOnDeliveryEnabled,
          onlinePaymentEnabled: company.commerceSettings.onlinePaymentEnabled,
          acceptingOrders: company.commerceSettings.acceptingOrders,
          temporaryClosureMessage: company.commerceSettings.temporaryClosureMessage,
          logoPath: company.commerceSettings.logoPath,
          coverImagePath: company.commerceSettings.coverImagePath,
          terms: company.commerceSettings.terms,
          cancellationPolicy: company.commerceSettings.cancellationPolicy,
        }
      : null,
    branches: company.branches.map((branch) => ({
      temporarilyClosed: branch.temporarilyClosed,
      closureReason: branch.closureReason,
      hours: branch.hours.map((hour) => ({
        dayOfWeek: hour.dayOfWeek,
        openTime: hour.openTime,
        closeTime: hour.closeTime,
        closed: hour.closed,
      })),
    })),
  };
}

export default async function CommercePage({ searchParams }: { searchParams: Promise<{ section?: string; status?: string; q?: string; category?: string; availability?: string }> }) {
  const params = await searchParams;
  const active = sections.includes(params.section as never) ? params.section ?? "overview" : "overview";
  const company = await getCommerceData();
  const orders = company?.orders ?? [];
  const today = new Date().toDateString();
  const todayOrders = orders.filter((order) => order.placedAt.toDateString() === today);
  const completed = orders.filter((order) => order.status === "COMPLETED");
  const revenueToday = todayOrders.filter((order) => ["PAYMENT_COLLECTED", "COMPLETED"].includes(order.status)).reduce((sum, order) => sum + Number(order.totalAmount), 0);
  const publicUrl = company?.orderingSlug ? commerceStoreUrl(company.orderingSlug) : "";
  const filteredOrders = params.status && params.status !== "ALL" ? orders.filter((order) => order.status === params.status) : orders;
  const menuQuery = (params.q ?? "").trim().toLowerCase();
  const menuCategory = params.category ?? "ALL";
  const menuAvailability = params.availability ?? "ALL";
  const riderOptions = company?.riders.map((rider) => ({ id: rider.id, name: rider.name, mobile: rider.mobile, vehicleType: rider.vehicleType, vehicleNumber: rider.vehicleNumber, availabilityStatus: rider.availabilityStatus, active: rider.active })) ?? [];
  const readiness = company ? commerceReadiness(company, publicUrl) : null;

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-slate-950">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-4 sm:px-6">
        <header className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-4">
            <div className="mr-auto">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">SettleSmart Commerce™</p>
              <h1 className="text-2xl font-semibold">{company?.commerceSettings?.displayName ?? company?.name ?? "Commerce Workspace"}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500"><span>{company?.businessType ? `${company.businessType.replaceAll("_", " ")} Operations` : "Business Operations"}</span>{company && <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${company.commerceSettings?.acceptingOrders ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}><span className="size-2 rounded-full bg-current" />{company.commerceSettings?.acceptingOrders ? "Accepting Orders" : "Paused"}</span>}</div>
            </div>
            {publicUrl && <Link href={publicUrl} className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold">Preview Customer Store</Link>}
            {publicUrl && <Link href={publicUrl} className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold">Public Ordering</Link>}
            <Link href="/studio?section=media" className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Studio Media</Link>
          </div>
          <nav className="mt-4 flex gap-2 overflow-x-auto">
            {sections.map((section) => <Link key={section} href={`/commerce?section=${section}`} className={`shrink-0 rounded-md px-3 py-2 text-sm font-semibold ${active === section ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"}`}>{labels[section]}</Link>)}
          </nav>
        </header>

        <section className="mt-5 flex-1 rounded-lg border border-slate-200 bg-white/75 p-4 shadow-sm">
          {!company && <Empty title="Seed Commerce Demo" body="Run the Commerce demo seed to create Dubai Delights Restaurant and its operational data." />}
          {company && active === "overview" && <div className="space-y-5"><div className="grid gap-4 lg:grid-cols-3"><Metric label="Orders Today" value={String(todayOrders.length)} featured /><Metric label="Revenue Today" value={`AED ${formatMoney(revenueToday)}`} featured /><Metric label="Average Order Value" value={`AED ${formatMoney(todayOrders.length ? revenueToday / todayOrders.length : 0)}`} featured /></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><Metric label="Pending" value={String(orders.filter((order) => order.status === "PENDING").length)} compact /><Metric label="Preparing" value={String(orders.filter((order) => order.status === "PREPARING").length)} compact /><Metric label="Ready" value={String(orders.filter((order) => order.status === "READY").length)} compact /><Metric label="Out for Delivery" value={String(orders.filter((order) => order.status === "OUT_FOR_DELIVERY").length)} compact /><Metric label="Completed" value={String(completed.length)} compact /></div><LiveOperations orders={orders} /><div className="grid gap-4 lg:grid-cols-[0.9fr_0.9fr_1.2fr]"><Card title="Business readiness"><p className="text-2xl font-semibold">{readiness?.percent === 100 ? "100% Ready" : `${readiness?.percent ?? 0}% Ready`}</p><p className={`mt-1 text-sm font-semibold ${readiness?.status === "READY TO ACCEPT ORDERS" ? "text-emerald-700" : "text-amber-700"}`}>{readiness?.status === "READY TO ACCEPT ORDERS" ? "Ready to Accept Orders" : "Setup Incomplete"}</p><div className="mt-3 grid gap-1.5 text-sm">{readiness?.items.map((item) => <div key={`${item.group}-${item.label}`} className="flex justify-between gap-3 rounded-md bg-slate-50 px-3 py-2"><span>{item.label}</span><b className={item.ok ? "text-emerald-700" : "text-amber-700"}>{item.ok ? "Ready" : "Needed"}</b></div>)}</div></Card><Card title="Quick actions"><div className="grid grid-cols-2 gap-2 text-sm">{[["+ Add Product", "/commerce/products/new"], ["Import Catalogue", "/commerce/products"], ["Create Category", "/commerce/categories"], ["Incoming Orders", "/commerce?section=orders&status=PENDING"], ["Open Kitchen", "/commerce?section=kitchen"], ["Add Rider", "/commerce?section=delivery"], ["Notifications", "/commerce?section=settings"], ["Preview Store", publicUrl]].map(([action, href]) => <Link key={action} href={href || "/commerce"} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 font-semibold hover:bg-white">{action}</Link>)}</div></Card><Card title="Your Digital Store"><p className="mb-3 text-sm text-slate-500">Display this QR at your counter, tables or packaging, or share the store link with customers.</p><p className="mb-3 font-semibold">{company.commerceSettings?.displayName ?? company.name}</p>{publicUrl ? <><QrCodeBox url={publicUrl} /><div className="mt-3 flex flex-wrap gap-2 text-sm"><a href={whatsappStoreShareUrl(company.commerceSettings?.displayName ?? company.name, publicUrl)} className="rounded-md border border-slate-200 px-3 py-2 font-semibold">Share on WhatsApp</a><Link href={publicUrl} className="rounded-md border border-slate-200 px-3 py-2 font-semibold">Preview Store</Link></div></> : <p className="text-sm text-slate-500">Set an ordering slug first.</p>}</Card></div><Card title="Recent orders"><RecentOrdersCompact orders={orders.slice(0, 5)} /><Link href="/commerce?section=orders&status=ALL" className="mt-4 inline-flex rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold">View All Orders</Link></Card></div>}
          {company && active === "business" && <div className="grid gap-4 lg:grid-cols-2"><Card title="Business setup"><div className="mb-4 grid gap-3 sm:grid-cols-[96px_1fr]"><AssetImage src={company.commerceSettings?.logoPath ?? company.brandProfile?.logoPath} alt={`${company.name} logo`} className="aspect-square w-24 rounded-md object-cover" /><AssetImage src={company.commerceSettings?.coverImagePath} alt={`${company.name} cover image`} className="aspect-video w-full rounded-md object-cover" /></div><dl className="grid gap-3 text-sm"><Row label="Display name" value={company.commerceSettings?.displayName ?? company.name} /><Row label="Public slug" value={company.orderingSlug ?? "Not set"} /><Row label="Business type" value={company.businessType.replaceAll("_", " ")} /><Row label="Currency" value={company.commerceSettings?.currency ?? "AED"} /><Row label="Timezone" value={company.commerceSettings?.timezone ?? "Asia/Dubai"} /><Row label="Tax" value={`${formatMoney(company.commerceSettings?.taxPercentage)}%`} /><Row label="Accepting orders" value={company.commerceSettings?.acceptingOrders ? "Open" : "Closed"} /></dl></Card><Card title="Business settings"><CommerceSettingsForm company={toCommerceSettingsCompany(company)} /></Card><Card title="Branches">{company.branches.map((branch) => <article key={branch.id} className="border-b border-slate-100 py-3 text-sm"><b>{branch.name}</b><p className="text-slate-500">{branch.code} · {branch.address}</p><p className="mt-1">Delivery {formatMoney(branch.deliveryRadiusKm)} km · Prep {branch.preparationMinutes} min · {branch.temporarilyClosed ? branch.closureReason : "Open"}</p></article>)}</Card></div>}
          {company && active === "menu" && <div className="space-y-4"><Card title="Menu controls"><form className="grid gap-2 sm:grid-cols-5"><input type="hidden" name="section" value="menu" /><input name="q" defaultValue={params.q ?? ""} placeholder="Search products" className="rounded-md border border-slate-200 px-3 py-2 text-sm" /><select name="category" defaultValue={menuCategory} className="rounded-md border border-slate-200 px-3 py-2 text-sm"><option value="ALL">All categories</option>{company.productCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select><select name="availability" defaultValue={menuAvailability} className="rounded-md border border-slate-200 px-3 py-2 text-sm"><option value="ALL">All availability</option><option value="AVAILABLE">Available</option><option value="UNAVAILABLE">Unavailable</option><option value="OUT_OF_STOCK">Out of stock</option></select><button className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold">Apply filters</button><Link href="/commerce/products/new" className="rounded-md bg-slate-950 px-3 py-2 text-center text-sm font-semibold text-white">Add Product</Link></form></Card>{company.productCategories.filter((category) => menuCategory === "ALL" || category.id === menuCategory).map((category) => { const products = category.products.filter((product) => (!menuQuery || `${product.name} ${product.shortDescription ?? ""}`.toLowerCase().includes(menuQuery)) && (menuAvailability === "ALL" || (menuAvailability === "AVAILABLE" && product.available && product.inStock) || (menuAvailability === "UNAVAILABLE" && !product.available) || (menuAvailability === "OUT_OF_STOCK" && !product.inStock))); return <Card key={category.id} title={category.name}>{category.imagePath && !category.imagePath.includes("commerce-placeholder") && <AssetImage src={category.imagePath} alt={`${category.name} category`} className="mb-4 max-h-40 w-full rounded-md object-cover" />}{products.length === 0 ? <p className="text-sm text-slate-500">No products match these filters.</p> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{products.map((product) => <article key={product.id} className="rounded-md border border-slate-200 p-4"><AssetImage src={product.imagePath} alt={`${product.name} product image`} className="h-32 w-full rounded-md object-cover sm:h-36" /><div className="mt-3"><h3 className="font-semibold">{product.name}</h3><p className="text-sm text-slate-500">AED {formatMoney(product.promotionalPrice ?? product.regularPrice)} · {product.available && product.inStock ? "Available" : product.inStock ? "Inactive" : "Out of stock"}</p></div><p className="mt-3 line-clamp-2 text-sm text-slate-600">{product.shortDescription}</p><ProductActionBar productId={product.id} productSlug={product.slug} orderingSlug={company.orderingSlug} inStock={product.inStock} available={product.available} /></article>)}</div>}</Card>; })}</div>}
          {company && active === "orders" && <div className="space-y-4"><RoleTabs base="/commerce?section=orders" tabs={[["New Orders", "PENDING"], ["Accepted Orders", "ACCEPTED"], ["Payment Pending", "DELIVERED"], ["Completed", "COMPLETED"]]} /><OrderList orders={filteredOrders} riders={riderOptions} role="front" /></div>}
          {company && active === "kitchen" && <div className="grid gap-4 lg:grid-cols-3">{[["Accepted", "ACCEPTED"], ["Preparing", "PREPARING"], ["Prepared / Ready", "READY"]].map(([title, status]) => <Card key={status} title={title}><KitchenTickets orders={orders.filter((order) => order.status === status)} /></Card>)}</div>}
          {company && active === "delivery" && <div className="grid gap-4 lg:grid-cols-[1fr_320px]"><div className="grid gap-4 md:grid-cols-2">{[["Ready", "READY"], ["Rider Assigned", "RIDER_ASSIGNED"], ["Out for Delivery", "OUT_FOR_DELIVERY"], ["Delivered", "DELIVERED"]].map(([title, status]) => <Card key={status} title={title}><OrderList orders={orders.filter((order) => status === "OUT_FOR_DELIVERY" ? ["PICKED_UP", "OUT_FOR_DELIVERY"].includes(order.status) : order.status === status)} compact riders={riderOptions} role="dispatch" /></Card>)}</div><div className="space-y-4"><Card title="Add rider"><RiderCreateForm companyId={company.id} /></Card><Card title="Riders">{company.riders.map((rider) => <div key={rider.id} className="border-b border-slate-100 py-3 text-sm"><b>{rider.name}</b><p>{rider.mobile}</p><p className="text-slate-500">{rider.vehicleType} · {rider.vehicleNumber} · {rider.availabilityStatus}</p><Link href={`/delivery/${rider.secureAccessCode}`} className="mt-2 inline-flex text-emerald-700">Mobile view</Link></div>)}</Card></div></div>}
          {company && active === "customers" && <Card title="Customers"><div className="grid gap-3 md:grid-cols-2">{company.customers.map((customer) => { const total = customer.orders.reduce((sum, order) => sum + Number(order.totalAmount), 0); return <article key={customer.id} className="rounded-md border border-slate-200 p-4 text-sm"><b>{customer.name}</b><p className="text-slate-500">{customer.mobile} · {customer.email ?? "No email"}</p><p className="mt-2">{customer.orders.length} orders · AED {formatMoney(total)} spend · AED {formatMoney(customer.orders.length ? total / customer.orders.length : 0)} AOV</p></article>; })}</div></Card>}
          {company && active === "promotions" && <Card title="Promotions">{company.promotions.map((promo) => <article key={promo.id} className="border-b border-slate-100 py-3 text-sm"><b>{promo.code}</b><p>{promo.name} · {promo.type} · Minimum AED {formatMoney(promo.minimumOrder)}</p><p className="text-slate-500">{promo.usages.length} uses · {promo.active ? "Active" : "Inactive"}</p></article>)}</Card>}
          {company && active === "reports" && <Reports orders={orders} />}
          {company && active === "settings" && <div className="grid gap-4 lg:grid-cols-2"><Card title="WhatsApp notifications"><dl className="grid gap-2 text-sm"><Row label="Active provider" value={process.env.WHATSAPP_PROVIDER ?? "development"} /><Row label="Webhook URL" value={`${appUrl()}/api/webhooks/whatsapp`} /><Row label="Meta readiness" value={process.env.WHATSAPP_PROVIDER === "meta" && process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN ? "Configured" : "Not configured"} /></dl><div className="mt-4 grid gap-2 text-xs">{Object.entries(whatsappTemplates).map(([event, template]) => <div key={event} className="rounded-md bg-slate-50 px-3 py-2"><b>{event}</b><p>{template?.name}</p></div>)}</div><WhatsAppTestForm /></Card><Card title="Latest notifications">{company.notificationEvents.map((event) => { const metadata = event.metadataJson as { whatsappFallbackUrl?: string } | null; return <div key={event.id} className="border-b border-slate-100 py-2 text-sm"><p>{event.eventType} · {event.message}</p><p className="text-xs text-slate-500">Provider: {event.provider ?? event.channel} · {event.status}</p>{event.manualFallbackUrl && <a href={event.manualFallbackUrl} className="mt-1 inline-flex text-xs font-semibold text-emerald-700">Open WhatsApp</a>}{metadata?.whatsappFallbackUrl && !event.manualFallbackUrl && <a href={metadata.whatsappFallbackUrl} className="mt-1 inline-flex text-xs font-semibold text-emerald-700">Open WhatsApp fallback</a>}</div>; })}</Card><Card title="Roles and permissions"><div className="grid gap-2 text-sm">{[["COMMERCE_OWNER", "Full Commerce access"], ["FRONT_DESK", "Orders, customers, payments"], ["KITCHEN", "Accepted, preparing, prepared tickets"], ["DISPATCH", "Ready orders, rider assignment, delivery board"], ["RIDER", "Assigned mobile delivery workflow"]].map(([roleName, scope]) => <div key={roleName} className="rounded-md bg-slate-50 px-3 py-2"><b>{roleName}</b><p className="text-slate-500">{scope}</p></div>)}</div></Card><Card title="Studio integration"><p className="text-sm text-slate-500">Approved Studio media available for Commerce selection: {company.mediaAssets.length}</p><div className="mt-3 grid gap-2">{company.mediaAssets.map((asset) => <div key={asset.id} className="grid grid-cols-[72px_1fr] gap-3 rounded-md border border-slate-200 p-2 text-sm"><AssetImage src={asset.filePath} alt={asset.title} className="aspect-video w-full rounded-md object-cover" /><span>{asset.title} · {asset.usageType}</span></div>)}</div><p className="mt-4 text-sm text-slate-500">Demo reset is development-only and documented in `docs/commerce/README.md`.</p></Card></div>}
        </section>
      </div>
    </main>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2><div className="mt-4">{children}</div></section>;
}

function Metric({ label, value, featured = false, compact = false }: { label: string; value: string; featured?: boolean; compact?: boolean }) {
  return <div className={`rounded-lg border border-slate-200 bg-white shadow-sm ${featured ? "p-5" : compact ? "p-4" : "p-4"}`}><p className="text-sm font-medium text-slate-500">{label}</p><p className={`mt-2 font-semibold ${featured ? "text-3xl" : "text-2xl"}`}>{value}</p></div>;
}

function LiveOperations({ orders }: { orders: CommerceOrders }) {
  const items = [
    { label: "New Orders", status: "PENDING", href: "/commerce?section=orders&status=PENDING", action: "View Orders" },
    { label: "Preparing", status: "PREPARING", href: "/commerce?section=kitchen", action: "Open Kitchen" },
    { label: "Ready", status: "READY", href: "/commerce?section=delivery", action: "View Ready Orders" },
    { label: "Delivery", status: "OUT_FOR_DELIVERY", href: "/commerce?section=delivery", action: "Open Delivery" },
  ];
  return <Card title="Live operations"><div className="grid gap-3 lg:grid-cols-4">{items.map((item, index) => <div key={item.status} className="relative"><Link href={item.href} className="block rounded-md border border-slate-200 bg-slate-50 p-4 hover:bg-white"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</p><p className="mt-2 text-3xl font-semibold">{orders.filter((order) => order.status === item.status).length}</p><p className="mt-3 text-sm font-semibold text-emerald-700">{item.action}</p></Link>{index < items.length - 1 && <span className="absolute -right-2 top-1/2 hidden -translate-y-1/2 text-slate-300 lg:block">→</span>}</div>)}</div></Card>;
}

function RecentOrdersCompact({ orders }: { orders: CommerceOrders }) {
  if (!orders.length) return <p className="text-sm text-slate-500">No recent orders yet.</p>;
  return <div className="grid gap-2">{orders.map((order) => <article key={order.id} className="grid gap-2 rounded-md border border-slate-200 bg-white p-3 text-sm md:grid-cols-[1.1fr_1fr_0.8fr_0.8fr_0.8fr_auto] md:items-center"><div><b>{order.orderNumber}</b><p className="text-slate-500">{order.customerNameSnapshot}</p></div><span>{order.fulfilmentType.replaceAll("_", " ")}</span><span>AED {formatMoney(order.totalAmount)}</span><span>{order.paymentStatus.replaceAll("_", " ")}</span><span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">{order.status.replaceAll("_", " ")}</span><div className="flex items-center gap-3"><span className="text-xs text-slate-500">{order.placedAt.toLocaleString()}</span><Link href={`/orders/${order.id}`} className="font-semibold text-emerald-700">View / Manage</Link></div></article>)}</div>;
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-4 border-b border-slate-100 pb-2"><dt className="text-slate-500">{label}</dt><dd className="text-right font-medium">{value}</dd></div>;
}

function Empty({ title, body }: { title: string; body: string }) {
  return <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center"><h2 className="text-xl font-semibold">{title}</h2><p className="mt-2 text-sm text-slate-500">{body}</p></div>;
}

function RoleTabs({ base, tabs }: { base: string; tabs: Array<[string, string]> }) {
  return <nav className="flex gap-2 overflow-x-auto"><Link href={`${base}&status=ALL`} className="shrink-0 rounded-md bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">All</Link>{tabs.map(([label, status]) => <Link key={status} href={`${base}&status=${status}`} className="shrink-0 rounded-md bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">{label}</Link>)}</nav>;
}

function customerInstructions(order: CommerceOrders[number]) {
  return order.specialInstructions?.trim() || "No special instructions";
}

function OrderList({ orders, compact = false, riders = [], role = "front" }: { orders: CommerceOrders; compact?: boolean; riders?: RiderOption[]; role?: "front" | "dispatch" }) {
  if (!orders?.length) return <p className="text-sm text-slate-500">No orders in this view.</p>;
  return <div className="grid gap-3">{orders.map((order) => <article key={order.id} className="rounded-md border border-slate-200 bg-white p-4 text-sm"><div className="flex flex-wrap items-start gap-3"><div className="mr-auto"><b>{order.orderNumber}</b><p className="text-slate-500">{order.customerNameSnapshot} · {order.customerMobileSnapshot}</p></div><span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">{order.status.replaceAll("_", " ")}</span></div>{!compact && <p className="mt-2 text-slate-600">{order.fulfilmentType} · {order.items.length} items · {order.paymentMethod} · {order.paymentStatus} · AED {formatMoney(order.totalAmount)} · {order.placedAt.toLocaleString()}</p>}<ul className="mt-3 space-y-1">{order.items.map((item) => <li key={item.id}>{item.quantity}x {item.productNameSnapshot}</li>)}</ul><p className="mt-3 rounded-md bg-slate-50 p-3 text-slate-700"><b>Customer instructions</b><br />{customerInstructions(order)}</p><OrderActionButtons orderId={order.id} status={order.status} fulfilmentType={order.fulfilmentType} riders={riders} receiptHref={`/receipt/${order.orderNumber}?token=${order.trackingToken}`} />{role === "front" && ((order.fulfilmentType === "PICKUP" && order.status === "READY") || order.status === "DELIVERED") && <PaymentRecordForm orderId={order.id} totalAmount={Number(order.totalAmount)} />}{role === "dispatch" && order.status === "DELIVERED" && <PaymentRecordForm orderId={order.id} totalAmount={Number(order.totalAmount)} />}</article>)}</div>;
}

function KitchenTickets({ orders }: { orders: CommerceOrders }) {
  if (!orders?.length) return <p className="text-sm text-slate-500">Nothing waiting here.</p>;
  return <div className="space-y-3">{orders.map((order) => <article key={order.id} className="rounded-md border border-slate-200 p-3 text-sm"><b>{order.orderNumber}</b><p className="text-slate-500">{order.fulfilmentType} · placed {order.placedAt.toLocaleTimeString()}</p><ul className="mt-2 space-y-1">{order.items.map((item) => <li key={item.id}>{item.quantity}x {item.productNameSnapshot}</li>)}</ul><p className="mt-3 rounded-md bg-slate-50 p-3"><b>Customer instructions</b><br />{customerInstructions(order)}</p><OrderActionButtons orderId={order.id} status={order.status} fulfilmentType={order.fulfilmentType} /></article>)}</div>;
}

function Reports({ orders }: { orders: CommerceOrders }) {
  const total = orders.reduce((sum, order) => sum + Number(order.totalAmount), 0);
  const discounts = orders.reduce((sum, order) => sum + Number(order.discountAmount), 0);
  const taxes = orders.reduce((sum, order) => sum + Number(order.taxAmount), 0);
  const delivery = orders.reduce((sum, order) => sum + Number(order.deliveryCharge), 0);
  const feedback = orders.map((order) => order.feedback).filter(Boolean);
  const averageRating = feedback.length ? feedback.reduce((sum, item) => sum + (item?.rating ?? 0), 0) / feedback.length : 0;
  return <div className="space-y-4"><div className="grid gap-4 md:grid-cols-4"><Metric label="Total orders" value={String(orders.length)} /><Metric label="Gross revenue" value={`AED ${formatMoney(total)}`} /><Metric label="Discounts" value={`AED ${formatMoney(discounts)}`} /><Metric label="Tax" value={`AED ${formatMoney(taxes)}`} /></div><Card title="Operational breakdown"><div className="grid gap-3 text-sm md:grid-cols-3"><p>Delivery fees: AED {formatMoney(delivery)}</p><p>Average order value: AED {formatMoney(orders.length ? total / orders.length : 0)}</p><p>Cancellation rate: {orders.length ? Math.round((orders.filter((order) => order.status === "CANCELLED").length / orders.length) * 100) : 0}%</p><p>Delivery orders: {orders.filter((order) => order.fulfilmentType === "DELIVERY").length}</p><p>Pickup orders: {orders.filter((order) => order.fulfilmentType === "PICKUP").length}</p><p>Completed orders: {orders.filter((order) => order.status === "COMPLETED").length}</p><p>Feedback count: {feedback.length}</p><p>Average rating: {averageRating ? averageRating.toFixed(1) : "No ratings yet"}</p><p>Collected payments: {orders.filter((order) => ["PAYMENT_COLLECTED", "COMPLETED"].includes(order.status)).length}</p></div></Card></div>;
}
