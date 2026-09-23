"use client";

import {
  LearnerButton as Button,
  LearnerHeader2,
  LearnerText2,
} from "@/components/themed-page-builder";
import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-[400px] flex-col items-center justify-center p-6 text-center">
      <LearnerHeader2 className="mb-2">Something went wrong</LearnerHeader2>
      <LearnerText2 className="mb-4 max-w-md text-muted-foreground">
        {error.message || "An unexpected error occurred."}
      </LearnerText2>
      <Button onClick={() => reset()}>Try again</Button>
    </main>
  );
}
