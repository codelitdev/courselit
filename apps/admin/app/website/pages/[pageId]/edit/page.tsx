import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ pageId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function EditWebsitePageRoute({ params, searchParams }: Props) {
  const { pageId } = await params;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (Array.isArray(value)) {
      for (const item of value) query.append(key, item);
    } else if (value !== undefined) {
      query.set(key, value);
    }
  }
  const suffix = query.toString() ? `?${query.toString()}` : "";
  redirect(`/pages/${encodeURIComponent(pageId)}/edit${suffix}`);
}
