import { prisma } from "@/core/database/prisma";
import { AppShell, Panel } from "../../components/shell";

const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

export default async function OperatingHoursPage() {
  const hours = await prisma.operatingHours.findMany({ include: { company: true }, orderBy: [{ companyId: "asc" }, { dayOfWeek: "asc" }] });
  return <AppShell title="Operating Hours"><Panel>{hours.length === 0 ? <p className="text-sm text-slate-500">No operating hours configured yet. Use the API to upsert weekly hours for a company.</p> : hours.map((h) => <div key={h.id} className="border-b border-slate-100 py-3 text-sm"><b>{h.company.name}</b> · {days[h.dayOfWeek]} · {h.closed ? "Closed" : `${h.openTime} to ${h.closeTime}`}</div>)}</Panel></AppShell>;
}
