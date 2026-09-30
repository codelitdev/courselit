import { notFound } from "next/navigation";
import { PublicCheckoutSession } from "@/components/public-checkout-session";
import { PublicSitePage } from "@/components/public-site-page";

interface Props {
  params: Promise<{ schoolId: string }>;
  searchParams: Promise<{
    session?: string;
  }>;
}

export default async function CheckoutPage({ params, searchParams }: Props) {
  const { schoolId } = await params;
  const { session } = await searchParams;
  if (!session) notFound();
  return (
    <PublicSitePage
      pageSlug="checkout"
      allowEmpty
      systemRoute="checkout"
      systemContent={<PublicCheckoutSession sessionId={session} />}
      schoolId={schoolId}
    />
  );
}
