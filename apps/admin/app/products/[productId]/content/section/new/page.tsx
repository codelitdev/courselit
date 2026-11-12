import { redirect } from "next/navigation";

/** Sections are added and edited inline on the Content tab. */
export default async function SectionPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  redirect(`/products/${encodeURIComponent(productId)}/content`);
}
