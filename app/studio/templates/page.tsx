import { AppShell, Panel } from "../../components/shell";

const templates = [
  ["recruitment_professional", "Recruitment Professional", "Structured hiring message with sober employer branding."],
  ["food_product", "Food/Product Promotion", "Food close-ups, offer clarity and delivery CTA."],
  ["retail_offer", "Retail/Grocery Offer", "Shelf/product bundle layout for practical offers."],
  ["hospitality", "Hotel/Hospitality", "Rooms, reception, guest experience and booking CTA."],
  ["corporate_service", "Corporate/Service", "Clean service pitch with trust cues and action path."],
];

export default function TemplatesPage() {
  return <AppShell title="Templates"><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{templates.map(([id, name, desc]) => <Panel key={id}><div className="text-xs font-semibold uppercase text-slate-500">{id}</div><h2 className="mt-2 font-semibold">{name}</h2><p className="mt-2 text-sm text-slate-500">{desc}</p></Panel>)}</div></AppShell>;
}
