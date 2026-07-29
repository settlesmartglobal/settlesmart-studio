import { redirect } from "next/navigation";

export default function MediaLibraryRedirect() {
  redirect("/studio?section=media");
}
