import { redirect } from "next/navigation";

export default function BrandingPage() {
  redirect("/website/settings?tab=branding");
}
