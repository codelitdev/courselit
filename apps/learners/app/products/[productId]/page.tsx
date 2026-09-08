import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ productId: string }>;
}

export default async function LegacyPublicProductDetailPage({ params }: Props) {
  const { productId } = await params;
  redirect(`/product/${encodeURIComponent(productId)}`);
}
