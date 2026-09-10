import { redirect } from "next/navigation";

export default async function WebsitePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;

  if (tab === "blogs") redirect("/website/blogs");
  if (tab === "branding" || tab === "code-injection") {
    redirect(`/website/settings?tab=${tab}`);
  }
  redirect("/website/pages");
}
