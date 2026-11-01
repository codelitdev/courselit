// Learners sign in here with an emailed code or Google; both end in a session for this school only.
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
