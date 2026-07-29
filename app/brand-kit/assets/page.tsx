import { redirect } from "next/navigation";

export default function BrandAssetsRedirect() {
  redirect("/studio?section=brand");
}
