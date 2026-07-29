import { prisma } from "@/core/database/prisma";
import { AppShell, EmptyState, Panel } from "../../components/shell";

export default async function ProcessingJobsPage() {
  const jobs = await prisma.mediaProcessingJob.findMany({ include: { company: true, campaign: true, outputMediaAsset: true }, orderBy: { createdAt: "desc" } });
  return <AppShell title="Processing Jobs">{jobs.length === 0 ? <EmptyState title="No processing jobs" body="Poster renders, image enhancements and video assembly jobs will appear here." /> : <div className="grid gap-4">{jobs.map((j) => <Panel key={j.id}><div className="flex flex-wrap justify-between gap-3"><div><b>{j.jobType}</b><p className="text-sm text-slate-500">{j.company.name} · {j.campaign?.name ?? "No campaign"}</p></div><div className="text-sm font-semibold">{j.status} · {j.progress}%</div></div>{j.errorMessage && <p className="mt-2 text-sm text-red-600">{j.errorMessage}</p>}{j.outputMediaAsset && <a className="mt-3 inline-flex text-sm text-sky-700" href={j.outputMediaAsset.filePath}>View output</a>}</Panel>)}</div>}</AppShell>;
}
