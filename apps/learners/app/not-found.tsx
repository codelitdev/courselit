import Link from "next/link";
import {
  LearnerButton as Button,
  LearnerHeader2,
  LearnerText2,
} from "@/components/themed-page-builder";

export default function NotFound() {
  return (
    <main className="flex min-h-[400px] flex-col items-center justify-center p-6 text-center">
      <LearnerHeader2 className="mb-2">Page not found</LearnerHeader2>
      <LearnerText2 className="mb-4 text-muted-foreground">
        The requested page could not be found.
      </LearnerText2>
      <Button asChild>
        <Link href="/">Return home</Link>
      </Button>
    </main>
  );
}
