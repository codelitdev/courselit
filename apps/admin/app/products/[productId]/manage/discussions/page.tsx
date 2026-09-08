import { redirect } from "next/navigation";

export default async function ProductDiscussionReportsRedirect({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  redirect(`/products/${encodeURIComponent(productId)}/manage/discussions/reports`);
}
