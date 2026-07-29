import { redirect } from "next/navigation";

export default function CompanyEditRedirect() {
  redirect("/studio?section=brand");
}
