"use client";

import { COURSELIT_CLASSIC_THEME } from "@courselit/page-blocks/theme";
import { Button, Header2, Text2 } from "@frontlit/page-builder/primitives";

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
        <Header2 theme={COURSELIT_CLASSIC_THEME.theme} className="mb-2">
          Something went wrong
        </Header2>
        <Text2
          theme={COURSELIT_CLASSIC_THEME.theme}
          className="mb-4 max-w-md text-muted-foreground"
        >
          {error.message || "An unexpected error occurred."}
        </Text2>
        <Button theme={COURSELIT_CLASSIC_THEME.theme} onClick={() => reset()}>
          Try again
        </Button>
      </body>
    </html>
  );
}
