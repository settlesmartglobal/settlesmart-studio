import { redirect } from "next/navigation";

export default function StudioTemplatesRedirect() {
  redirect("/studio?section=templates");
}
