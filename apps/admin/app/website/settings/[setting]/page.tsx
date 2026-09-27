import { notFound } from "next/navigation";
import { SettingsPage } from "@/app/settings/page";

export default async function WebsiteSettingPage({
  params,
}: {
  params: Promise<{ setting: string }>;
}) {
  const { setting } = await params;
  if (setting !== "branding" && setting !== "code-injection") notFound();
  return <SettingsPage mode="website" />;
}
