"use client";

import { Button } from "@codelitdev/design-system";
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
      <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
      <p className="text-sm text-muted-foreground mb-4 max-w-md">
        {error.message || "An unexpected error occurred."}
      </p>
      <Button onClick={() => reset()}>Try again</Button>
    </main>
  );
}
