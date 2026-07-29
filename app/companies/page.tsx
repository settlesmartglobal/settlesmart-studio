import { redirect } from "next/navigation";

export default function CompaniesRedirect() {
  redirect("/studio?section=brand");
}
