"use client";

import { Button } from "@codelitdev/design-system";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" data-product="courselit">
      <body className="flex min-h-screen flex-col items-center justify-center p-6 text-center antialiased">
        <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
        <p className="text-sm text-muted-foreground mb-4 max-w-md">
          {error.message || "An unexpected error occurred."}
        </p>
        <Button onClick={() => reset()}>Try again</Button>
      </body>
    </html>
  );
}
