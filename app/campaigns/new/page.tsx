import { redirect } from "next/navigation";

export default function NewCampaignRedirect() {
  redirect("/studio?section=campaigns");
}
