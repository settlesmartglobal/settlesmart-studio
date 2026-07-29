import { redirect } from "next/navigation";

export default function StudioCreateRedirect() {
  redirect("/studio?section=create");
}
