import { AuthComplete } from "@/components/auth/auth-complete";
import { PublicSitePage } from "@/components/public-site-page";

export default async function AuthCompletePage({
  params,
}: {
  params: Promise<{ schoolId: string }>;
}) {
  const { schoolId } = await params;
  return (
    <PublicSitePage
      pageSlug="login"
      allowEmpty
      systemRoute="login"
      systemContent={<AuthComplete />}
      schoolId={schoolId}
    />
  );
}
