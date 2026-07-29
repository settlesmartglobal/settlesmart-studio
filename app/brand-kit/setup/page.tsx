import { redirect } from "next/navigation";

export default function BrandKitSetupRedirect() {
  redirect("/studio?section=brand");
}
