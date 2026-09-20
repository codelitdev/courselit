import { notFound } from "next/navigation";
import { PublicCheckoutSession } from "@/components/public-checkout-session";
import { PublicSitePage } from "@/components/public-site-page";

interface Props {
  searchParams: Promise<{
    session?: string;
  }>;
}

export default async function CheckoutPage({ searchParams }: Props) {
  const { session } = await searchParams;
  if (!session) notFound();
  return (
    <PublicSitePage
      pageSlug="checkout"
      allowEmpty
      systemRoute="checkout"
      systemContent={<PublicCheckoutSession sessionId={session} />}
    />
  );
}
