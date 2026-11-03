"use client";

import { ClipboardCheck, EyeOff, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/codelit/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/codelit/dropdown-menu";
import { useOnboarding } from "./use-onboarding";

/** "More options" menu: hides Onboarding from the sidebar, or brings it back. */
export function OnboardingVisibilityMenu({
  mode,
  onChanged,
}: {
  mode: "hide" | "show";
  onChanged?: () => void;
}) {
  const { update } = useOnboarding();

  async function toggle() {
    const hide = mode === "hide";
    const ok = await update({ checklistHidden: hide });
    if (!ok) {
      toast.error("Could not update the sidebar. Try again.");
      return;
    }
    toast.success(
      hide
        ? "Onboarding hidden. Bring it back from the Overview menu"
        : "Onboarding is back in the sidebar",
    );
    onChanged?.();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="md" aria-label="More options">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => void toggle()}>
          {mode === "hide" ? (
            <>
              <EyeOff /> Hide from sidebar
            </>
          ) : (
            <>
              <ClipboardCheck /> Show Onboarding in sidebar
            </>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
