// Supported learner auth endpoints: /api/v1/learner/auth/sign-in, /api/v1/learner/auth/sign-up
import { PublicLoginBlock } from "@/components/public-login-block";
import { PublicSitePage } from "@/components/public-site-page";

export default async function LearnerLoginPage({
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
      systemContent={<PublicLoginBlock />}
      schoolId={schoolId}
    />
  );
}
