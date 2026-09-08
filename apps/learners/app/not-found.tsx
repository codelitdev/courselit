import Link from "next/link";
import { Button } from "@/components/ui/codelit/button";

export default function NotFound() {
  return (
    <main className="flex min-h-[400px] flex-col items-center justify-center p-6 text-center">
      <h2 className="text-xl font-semibold mb-2">Page not found</h2>
      <p className="text-sm text-muted-foreground mb-4">
        The requested page could not be found.
      </p>
      <Button asChild>
        <Link href="/">Return home</Link>
      </Button>
    </main>
  );
}
