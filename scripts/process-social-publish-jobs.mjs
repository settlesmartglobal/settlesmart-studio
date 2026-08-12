const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL;
const secret = process.env.STUDIO_CRON_SECRET;
const limit = Number(process.env.SOCIAL_PUBLISH_JOB_LIMIT ?? 10);

if (!baseUrl || !secret) {
  console.error("NEXT_PUBLIC_APP_URL and STUDIO_CRON_SECRET are required.");
  process.exit(1);
}

fetch(`${baseUrl.replace(/\/$/, "")}/api/studio/social/process?limit=${limit}`, {
  method: "POST",
  headers: { Authorization: `Bearer ${secret}` },
})
  .then(async (response) => {
    const json = await response.json();
    if (!response.ok) throw new Error(json.error ?? "Scheduled publish processing failed.");
    console.log(`Processed ${json.processed} scheduled social publish job(s).`);
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
