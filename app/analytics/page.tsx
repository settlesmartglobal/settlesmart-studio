import { redirect } from "next/navigation";

export default function AnalyticsRedirect() {
  redirect("/studio?section=overview");
}
