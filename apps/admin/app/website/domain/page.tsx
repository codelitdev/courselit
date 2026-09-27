import { redirect } from "next/navigation";

export default function WebsiteDomainPage() {
  redirect("/website/settings?tab=domain");
}
