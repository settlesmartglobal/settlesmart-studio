import Link from "next/link";
import { prisma } from "@/core/database/prisma";
import { appUrl, formatMoney } from "@/modules/wave1/utils";
import { QrCodeBox } from "../components/forms";
import { AssetImage } from "../components/asset-image";
import { OrderActionButtons, PaymentRecordForm } from "../components/order-actions";
import { ProductActionBar, RiderCreateForm } from "../components/commerce-actions";

const sections = ["overview", "restaurant", "menu", "orders", "kitchen", "delivery", "customers", "promotions", "reports", "settings"] as const;
const labels: Record<(typeof sections)[number], string> = {
  overview: "Overview",
  restaurant: "Restaurant",
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

export default async function CommercePage({ searchParams }: { searchParams: Promise<{ section?: string; status?: string; q?: string; category?: string; availability?: string }> }) {
  const params = await searchParams;
  const active = sections.includes(params.section as never) ? params.section ?? "overview" : "overview";
  const company = await getCommerceData();
  const orders = company?.orders ?? [];
  const today = new Date().toDateString();
  const todayOrders = orders.filter((order) => order.placedAt.toDateString() === today);
  const completed = orders.filter((order) => ["DELIVERED", "COMPLETED"].includes(order.status));
  const revenueToday = todayOrders.filter((order) => ["DELIVERED", "COMPLETED"].includes(order.status)).reduce((sum, order) => sum + Number(order.totalAmount), 0);
  const publicUrl = company?.orderingSlug ? `${appUrl()}/order/${company.orderingSlug}` : "";
  const filteredOrders = params.status && params.status !== "ALL" ? orders.filter((order) => order.status === params.status) : orders;
  const menuQuery = (params.q ?? "").trim().toLowerCase();
  const menuCategory = params.category ?? "ALL";
  const menuAvailability = params.availability ?? "ALL";

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-slate-950">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-4 sm:px-6">
        <header className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-4">
            <div className="mr-auto">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">SettleSmart Commerce™</p>
              <h1 className="text-2xl font-semibold">{company?.commerceSettings?.displayName ?? company?.name ?? "Commerce Workspace"}</h1>
              <p className="text-sm text-slate-500">{company?.commerceSettings?.description ?? "Restaurant ordering and operations."}</p>
            </div>
            {publicUrl && <Link href={publicUrl} className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold">Public Ordering</Link>}
            <Link href="/studio?section=media" className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Studio Media</Link>
          </div>
          <nav className="mt-4 flex gap-2 overflow-x-auto">
            {sections.map((section) => <Link key={section} href={`/commerce?section=${section}`} className={`shrink-0 rounded-md px-3 py-2 text-sm font-semibold ${active === section ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"}`}>{labels[section]}</Link>)}
          </nav>
        </header>

        <section className="mt-5 flex-1 rounded-lg border border-slate-200 bg-white/75 p-4 shadow-sm">
          {!company && <Empty title="Seed Commerce Demo" body="Run the Commerce demo seed to create Dubai Delights Restaurant and its operational data." />}
          {company && active === "overview" && <div className="space-y-5"><div className="grid gap-4 md:grid-cols-4"><Metric label="Orders today" value={String(todayOrders.length)} /><Metric label="Revenue today" value={`AED ${formatMoney(revenueToday)}`} /><Metric label="Pending" value={String(orders.filter((order) => order.status === "PENDING").length)} /><Metric label="Ready" value={String(orders.filter((order) => order.status === "READY").length)} /></div><div className="grid gap-4 md:grid-cols-4"><Metric label="Preparing" value={String(orders.filter((order) => order.status === "PREPARING").length)} /><Metric label="Out for delivery" value={String(orders.filter((order) => order.status === "OUT_FOR_DELIVERY").length)} /><Metric label="Completed" value={String(completed.length)} /><Metric label="Cancelled" value={String(orders.filter((order) => order.status === "CANCELLED").length)} /></div><div className="grid gap-4 lg:grid-cols-3"><Card title="Quick actions"><div className="grid gap-2 text-sm">{[["Add Product", "/commerce/products/new"], ["Create Category", "/commerce/categories"], ["View Incoming Orders", "/commerce?section=orders&status=PENDING"], ["Open Kitchen", "/commerce?section=kitchen"], ["Add Rider", "/commerce?section=delivery"], ["View Public Ordering Page", publicUrl]].map(([action, href]) => <Link key={action} href={href} className="rounded-md border border-slate-200 px-3 py-2 font-semibold">{action}</Link>)}</div></Card><Card title="Ordering QR">{publicUrl ? <QrCodeBox url={publicUrl} /> : <p className="text-sm text-slate-500">Set an ordering slug first.</p>}</Card><Card title="Rider availability"><div className="space-y-2 text-sm">{company.riders.map((rider) => <div key={rider.id} className="flex justify-between rounded-md bg-slate-50 px-3 py-2"><span>{rider.name}</span><b>{rider.availabilityStatus}</b></div>)}</div></Card></div><Card title="Recent orders"><OrderList orders={orders.slice(0, 8)} riders={company.riders} /></Card></div>}
          {company && active === "restaurant" && <div className="grid gap-4 lg:grid-cols-2"><Card title="Restaurant setup"><div className="mb-4 grid gap-3 sm:grid-cols-[96px_1fr]"><AssetImage src={company.commerceSettings?.logoPath ?? company.brandProfile?.logoPath} alt={`${company.name} logo`} className="aspect-square w-24 rounded-md object-cover" /><AssetImage src={company.commerceSettings?.coverImagePath} alt={`${company.name} cover image`} className="aspect-video w-full rounded-md object-cover" /></div><dl className="grid gap-3 text-sm"><Row label="Display name" value={company.commerceSettings?.displayName ?? company.name} /><Row label="Public slug" value={company.orderingSlug ?? "Not set"} /><Row label="Cuisine" value={(company.commerceSettings?.cuisinesJson as string[] | null)?.join(", ") ?? "Indian, Arabic, Indo-Chinese"} /><Row label="Currency" value={company.commerceSettings?.currency ?? "AED"} /><Row label="Timezone" value={company.commerceSettings?.timezone ?? "Asia/Dubai"} /><Row label="Tax" value={`${formatMoney(company.commerceSettings?.taxPercentage)}%`} /><Row label="Accepting orders" value={company.commerceSettings?.acceptingOrders ? "Open" : "Closed"} /></dl></Card><Card title="Branches">{company.branches.map((branch) => <article key={branch.id} className="border-b border-slate-100 py-3 text-sm"><b>{branch.name}</b><p className="text-slate-500">{branch.code} · {branch.address}</p><p className="mt-1">Delivery {formatMoney(branch.deliveryRadiusKm)} km · Prep {branch.preparationMinutes} min · {branch.temporarilyClosed ? branch.closureReason : "Open"}</p></article>)}</Card></div>}
          {company && active === "menu" && <div className="space-y-4"><Card title="Menu controls"><form className="grid gap-2 sm:grid-cols-5"><input type="hidden" name="section" value="menu" /><input name="q" defaultValue={params.q ?? ""} placeholder="Search products" className="rounded-md border border-slate-200 px-3 py-2 text-sm" /><select name="category" defaultValue={menuCategory} className="rounded-md border border-slate-200 px-3 py-2 text-sm"><option value="ALL">All categories</option>{company.productCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select><select name="availability" defaultValue={menuAvailability} className="rounded-md border border-slate-200 px-3 py-2 text-sm"><option value="ALL">All availability</option><option value="AVAILABLE">Available</option><option value="UNAVAILABLE">Unavailable</option><option value="OUT_OF_STOCK">Out of stock</option></select><button className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold">Apply filters</button><Link href="/commerce/products/new" className="rounded-md bg-slate-950 px-3 py-2 text-center text-sm font-semibold text-white">Add Product</Link></form></Card>{company.productCategories.filter((category) => menuCategory === "ALL" || category.id === menuCategory).map((category) => { const products = category.products.filter((product) => (!menuQuery || `${product.name} ${product.shortDescription ?? ""}`.toLowerCase().includes(menuQuery)) && (menuAvailability === "ALL" || (menuAvailability === "AVAILABLE" && product.available && product.inStock) || (menuAvailability === "UNAVAILABLE" && !product.available) || (menuAvailability === "OUT_OF_STOCK" && !product.inStock))); return <Card key={category.id} title={category.name}><AssetImage src={category.imagePath} alt={`${category.name} category`} className="mb-4 aspect-[5/1] w-full rounded-md object-cover" />{products.length === 0 ? <p className="text-sm text-slate-500">No products match these filters.</p> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{products.map((product) => <article key={product.id} className="rounded-md border border-slate-200 p-4"><div className="flex gap-3"><AssetImage src={product.imagePath} alt={product.name} className="h-16 w-16 rounded-md object-cover" /><div><h3 className="font-semibold">{product.name}</h3><p className="text-sm text-slate-500">AED {formatMoney(product.promotionalPrice ?? product.regularPrice)} · {product.available && product.inStock ? "Available" : product.inStock ? "Inactive" : "Out of stock"}</p></div></div><p className="mt-3 line-clamp-2 text-sm text-slate-600">{product.shortDescription}</p><ProductActionBar productId={product.id} productSlug={product.slug} orderingSlug={company.orderingSlug} inStock={product.inStock} available={product.available} /></article>)}</div>}</Card>; })}</div>}
          {company && active === "orders" && <div className="space-y-4"><StatusTabs /><OrderList orders={filteredOrders} riders={company.riders} /></div>}
          {company && active === "kitchen" && <div className="grid gap-4 lg:grid-cols-3">{["ACCEPTED", "PREPARING", "READY"].map((status) => <Card key={status} title={status.replaceAll("_", " ")}><KitchenTickets orders={orders.filter((order) => order.status === status)} /></Card>)}</div>}
          {company && active === "delivery" && <div className="grid gap-4 lg:grid-cols-[1fr_320px]"><div className="grid gap-4 md:grid-cols-2">{["READY", "RIDER_ASSIGNED", "PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED"].map((status) => <Card key={status} title={status.replaceAll("_", " ")}><OrderList orders={orders.filter((order) => order.status === status)} compact riders={company.riders} /></Card>)}</div><div className="space-y-4"><Card title="Add rider"><RiderCreateForm companyId={company.id} /></Card><Card title="Riders">{company.riders.map((rider) => <div key={rider.id} className="border-b border-slate-100 py-3 text-sm"><b>{rider.name}</b><p>{rider.mobile}</p><p className="text-slate-500">{rider.vehicleType} · {rider.vehicleNumber} · {rider.availabilityStatus}</p><Link href={`/delivery/${rider.secureAccessCode}`} className="mt-2 inline-flex text-emerald-700">Mobile view</Link></div>)}</Card></div></div>}
          {company && active === "customers" && <Card title="Customers"><div className="grid gap-3 md:grid-cols-2">{company.customers.map((customer) => { const total = customer.orders.reduce((sum, order) => sum + Number(order.totalAmount), 0); return <article key={customer.id} className="rounded-md border border-slate-200 p-4 text-sm"><b>{customer.name}</b><p className="text-slate-500">{customer.mobile} · {customer.email ?? "No email"}</p><p className="mt-2">{customer.orders.length} orders · AED {formatMoney(total)} spend · AED {formatMoney(customer.orders.length ? total / customer.orders.length : 0)} AOV</p></article>; })}</div></Card>}
          {company && active === "promotions" && <Card title="Promotions">{company.promotions.map((promo) => <article key={promo.id} className="border-b border-slate-100 py-3 text-sm"><b>{promo.code}</b><p>{promo.name} · {promo.type} · Minimum AED {formatMoney(promo.minimumOrder)}</p><p className="text-slate-500">{promo.usages.length} uses · {promo.active ? "Active" : "Inactive"}</p></article>)}</Card>}
          {company && active === "reports" && <Reports orders={orders} />}
          {company && active === "settings" && <div className="grid gap-4 lg:grid-cols-2"><Card title="Development notifications">{company.notificationEvents.map((event) => { const metadata = event.metadataJson as { whatsappFallbackUrl?: string } | null; return <div key={event.id} className="border-b border-slate-100 py-2 text-sm"><p>{event.eventType} · {event.message}</p><p className="text-xs text-slate-500">Provider: {event.channel}</p>{metadata?.whatsappFallbackUrl && <a href={metadata.whatsappFallbackUrl} className="mt-1 inline-flex text-xs font-semibold text-emerald-700">Open WhatsApp fallback</a>}</div>; })}</Card><Card title="Studio integration"><p className="text-sm text-slate-500">Approved Studio media available for Commerce selection: {company.mediaAssets.length}</p><div className="mt-3 grid gap-2">{company.mediaAssets.map((asset) => <div key={asset.id} className="grid grid-cols-[72px_1fr] gap-3 rounded-md border border-slate-200 p-2 text-sm"><AssetImage src={asset.filePath} alt={asset.title} className="aspect-video w-full rounded-md object-cover" /><span>{asset.title} · {asset.usageType}</span></div>)}</div><p className="mt-4 text-sm text-slate-500">Demo reset is development-only and documented in `docs/commerce/README.md`.</p></Card></div>}
        </section>
      </div>
    </main>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-semibold">{title}</h2><div className="mt-4">{children}</div></section>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-slate-200 bg-white p-4"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div>;
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-4 border-b border-slate-100 pb-2"><dt className="text-slate-500">{label}</dt><dd className="text-right font-medium">{value}</dd></div>;
}

function Empty({ title, body }: { title: string; body: string }) {
  return <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center"><h2 className="text-xl font-semibold">{title}</h2><p className="mt-2 text-sm text-slate-500">{body}</p></div>;
}

function StatusTabs() {
  return <nav className="flex gap-2 overflow-x-auto">{["ALL", "PENDING", "ACCEPTED", "PREPARING", "READY", "RIDER_ASSIGNED", "OUT_FOR_DELIVERY", "COMPLETED", "REJECTED", "CANCELLED"].map((status) => <Link key={status} href={`/commerce?section=orders&status=${status}`} className="shrink-0 rounded-md bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">{status.replaceAll("_", " ")}</Link>)}</nav>;
}

function OrderList({ orders, compact = false, riders = [] }: { orders: CommerceOrders; compact?: boolean; riders?: CommerceCompany["riders"] }) {
  if (!orders?.length) return <p className="text-sm text-slate-500">No orders in this view.</p>;
  return <div className="grid gap-3">{orders.map((order) => <article key={order.id} className="rounded-md border border-slate-200 bg-white p-4 text-sm"><div className="flex flex-wrap items-start gap-3"><div className="mr-auto"><b>{order.orderNumber}</b><p className="text-slate-500">{order.customerNameSnapshot} · {order.customerMobileSnapshot}</p></div><span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">{order.status.replaceAll("_", " ")}</span></div>{!compact && <p className="mt-2 text-slate-600">{order.fulfilmentType} · {order.items.length} items · {order.paymentMethod} · {order.paymentStatus} · AED {formatMoney(order.totalAmount)}</p>}<OrderActionButtons orderId={order.id} status={order.status} fulfilmentType={order.fulfilmentType} riders={riders} paymentStatus={order.paymentStatus} />{(order.status === "DELIVERED" || (order.status === "READY" && order.fulfilmentType === "PICKUP")) && order.paymentStatus !== "COLLECTED" && <PaymentRecordForm orderId={order.id} totalAmount={Number(order.totalAmount)} />}<Link href={`/receipt/${order.orderNumber}?token=${order.trackingToken}`} className="mt-3 inline-flex rounded bg-slate-100 px-2 py-1 text-xs font-semibold">Receipt</Link></article>)}</div>;
}

function KitchenTickets({ orders }: { orders: CommerceOrders }) {
  if (!orders?.length) return <p className="text-sm text-slate-500">Nothing waiting here.</p>;
  return <div className="space-y-3">{orders.map((order) => <article key={order.id} className="rounded-md border border-slate-200 p-3 text-sm"><b>{order.orderNumber}</b><p className="text-slate-500">{order.fulfilmentType} · placed {order.placedAt.toLocaleTimeString()}</p><ul className="mt-2 space-y-1">{order.items.map((item) => <li key={item.id}>{item.quantity}x {item.productNameSnapshot}</li>)}</ul><OrderActionButtons orderId={order.id} status={order.status} fulfilmentType={order.fulfilmentType} paymentStatus={order.paymentStatus} /></article>)}</div>;
}

function Reports({ orders }: { orders: CommerceOrders }) {
  const total = orders.reduce((sum, order) => sum + Number(order.totalAmount), 0);
  const discounts = orders.reduce((sum, order) => sum + Number(order.discountAmount), 0);
  const taxes = orders.reduce((sum, order) => sum + Number(order.taxAmount), 0);
  const delivery = orders.reduce((sum, order) => sum + Number(order.deliveryCharge), 0);
  const feedback = orders.map((order) => order.feedback).filter(Boolean);
  const averageRating = feedback.length ? feedback.reduce((sum, item) => sum + (item?.rating ?? 0), 0) / feedback.length : 0;
  return <div className="space-y-4"><div className="grid gap-4 md:grid-cols-4"><Metric label="Total orders" value={String(orders.length)} /><Metric label="Gross revenue" value={`AED ${formatMoney(total)}`} /><Metric label="Discounts" value={`AED ${formatMoney(discounts)}`} /><Metric label="Tax" value={`AED ${formatMoney(taxes)}`} /></div><Card title="Operational breakdown"><div className="grid gap-3 text-sm md:grid-cols-3"><p>Delivery fees: AED {formatMoney(delivery)}</p><p>Average order value: AED {formatMoney(orders.length ? total / orders.length : 0)}</p><p>Cancellation rate: {orders.length ? Math.round((orders.filter((order) => order.status === "CANCELLED").length / orders.length) * 100) : 0}%</p><p>Delivery orders: {orders.filter((order) => order.fulfilmentType === "DELIVERY").length}</p><p>Pickup orders: {orders.filter((order) => order.fulfilmentType === "PICKUP").length}</p><p>Completed orders: {orders.filter((order) => ["DELIVERED", "COMPLETED"].includes(order.status)).length}</p><p>Feedback count: {feedback.length}</p><p>Average rating: {averageRating ? averageRating.toFixed(1) : "No ratings yet"}</p><p>Collected payments: {orders.filter((order) => order.paymentStatus === "COLLECTED").length}</p></div></Card></div>;
}
