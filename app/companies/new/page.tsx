import { redirect } from "next/navigation";

export default function NewCompanyRedirect() {
  redirect("/studio?section=brand");
}
