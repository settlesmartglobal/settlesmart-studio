import { redirect } from "next/navigation";

export default function StudioProcessingRedirect() {
  redirect("/studio?section=processing");
}
