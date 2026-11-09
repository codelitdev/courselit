"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { AuthGate } from "@/components/auth-gate";
import { PageHeader } from "@/components/layout/page-header";
import { CourseLitLoading } from "@/components/loading";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/codelit/button";
import { cn } from "@/lib/utils";
import {
  CHECKLIST_GROUPS,
  type ChecklistKey,
  pageEditorHref,
  pickHomePage,
  pickLegalPage,
} from "./checklist-model";
import { OnboardingVisibilityMenu } from "./onboarding-menu";
import { useOnboarding } from "./use-onboarding";

async function fetchPages() {
  const response = await fetch("/api/v1/school/website/pages", {
    credentials: "include",
    cache: "no-store",
  });
  if (!response.ok) throw new Error("pages");
  const body = (await response.json()) as {
    items?: Array<{ id: string; slug: string; status: string; kind?: string }>;
  };
  return (body.items ?? []).filter((p) => p.kind !== "blog");
}

export function OnboardingChecklist() {
  const router = useRouter();
  const { state, school, loading, failed, isOwner, progress, update } = useOnboarding();
  const schoolName = school?.name ?? "your school";
  const [busy, setBusy] = useState<ChecklistKey | null>(null);

  async function go(key: ChecklistKey) {
    switch (key) {
      case "pay":
        return router.push("/settings?tab=payment");
      case "mail":
        return router.push("/marketing/settings");
      case "domain":
        return router.push("/website/settings?tab=domain");
      case "ai":
        return router.push("/settings?tab=ai-assistants");
      case "learners":
        return router.push("/contacts");
      case "welcome":
        return router.push("/marketing/sequences");
      case "course":
        return router.push("/products/new");
      case "team":
        return router.push("/settings?tab=team");
      case "legal":
      case "home": {
        setBusy(key);
        try {
          const pages = await fetchPages();
          const page = key === "home" ? pickHomePage(pages) : pickLegalPage(pages);
          if (!page) return router.push("/website/pages");
          if (key === "home") await update({ markDone: ["home"] });
          router.push(pageEditorHref(page.id, "/onboarding"));
        } catch {
          toast.error("Could not open the page editor. Try again.");
        } finally {
          setBusy(null);
        }
      }
    }
  }

  async function removeFromSidebar() {
    const ok = await update({ checklistHidden: true });
    if (!ok) {
      toast.error("Could not update the sidebar. Try again.");
      return;
    }
    toast.success("Onboarding hidden. Bring it back from the Overview menu");
    router.push("/");
  }

  return (
    <AuthGate>
      <div className="page-shell space-y-6">
        {!isOwner ? (
          <p className="text-sm text-muted-foreground">
            Only the school owner can see the setup checklist.
          </p>
        ) : loading ? (
          <CourseLitLoading className="p-12" />
        ) : failed || !state ? (
          <p role="alert" className="text-sm text-destructive">
            Unable to load your setup checklist. Please try again.
          </p>
        ) : (
          <>
            <PageHeader
              title={
                progress.allDone ? "You're all set" : `Finish setting up ${schoolName}`
              }
              description={
                progress.allDone
                  ? "Every setup step is done."
                  : "Each step ticks itself off when it's done. Do them in any order."
              }
              action={
                <OnboardingVisibilityMenu
                  mode="hide"
                  onChanged={() => router.push("/")}
                />
              }
            />

            {progress.allDone ? (
              <Card className="flex flex-col items-center gap-2 px-5 py-14 text-center">
                <span className="grid size-12 place-items-center rounded-[14px] bg-success-soft text-success-ink">
                  <Check className="size-6" strokeWidth={2.4} aria-hidden="true" />
                </span>
                <h2 className="text-[15px] font-semibold">
                  {schoolName} is all set up
                </h2>
                <p className="max-w-md text-sm text-muted-foreground">
                  Payments, email, your domain and your team are ready. You can remove
                  Onboarding from the sidebar now.
                </p>
                <div className="mt-2 flex gap-2">
                  <Button onClick={() => void removeFromSidebar()}>
                    Remove from sidebar
                  </Button>
                  <Button variant="outline" onClick={() => router.push("/")}>
                    Go to Overview
                  </Button>
                </div>
              </Card>
            ) : (
              <>
                <div className="flex items-center gap-3.5">
                  <div
                    className="h-2 flex-1 overflow-hidden rounded-full bg-muted"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={progress.total}
                    aria-valuenow={progress.doneCount}
                  >
                    <div
                      className="h-full rounded-full bg-primary transition-[width]"
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>
                  <span className="whitespace-nowrap text-sm font-semibold">
                    {progress.doneCount} of {progress.total} done
                  </span>
                </div>

                {CHECKLIST_GROUPS.map((group) => {
                  const doneInGroup = group.items.filter((i) =>
                    progress.isDone(i.key),
                  ).length;
                  return (
                    <section
                      key={group.name}
                      aria-label={group.name}
                      className="space-y-2.5"
                    >
                      <h2 className="text-base font-bold">
                        {group.name}
                        <span className="ml-2 font-mono text-[12.5px] font-medium text-muted-foreground">
                          {doneInGroup} of {group.items.length}
                        </span>
                      </h2>
                      <Card className="overflow-hidden">
                        <ul>
                          {group.items.map((item, index) => {
                            const done = progress.isDone(item.key);
                            const first = progress.firstTodo === item.key;
                            return (
                              <li
                                key={item.key}
                                className={cn(
                                  "grid grid-cols-[26px_minmax(0,1fr)_auto] items-center gap-3.5 px-5 py-3.5",
                                  index > 0 && "border-t",
                                  first && "bg-[var(--primary-soft)]",
                                )}
                              >
                                <span
                                  className={cn(
                                    "grid size-[26px] place-items-center rounded-full border-[1.5px]",
                                    done
                                      ? "border-success bg-success text-white"
                                      : first
                                        ? "border-primary"
                                        : "border-input",
                                  )}
                                >
                                  {done ? (
                                    <Check
                                      className="size-3.5"
                                      strokeWidth={3}
                                      aria-hidden="true"
                                    />
                                  ) : null}
                                </span>
                                <span className="min-w-0">
                                  <b
                                    className={cn(
                                      "block text-sm font-semibold",
                                      done && "text-muted-foreground line-through",
                                    )}
                                  >
                                    {item.title}
                                  </b>
                                  <span className="block text-[0.8125rem] text-muted-foreground">
                                    {item.why}
                                  </span>
                                </span>
                                {done ? (
                                  <span className="text-sm text-muted-foreground">
                                    Done
                                  </span>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant={first ? "primary" : "outline"}
                                    disabled={busy === item.key}
                                    onClick={() => void go(item.key)}
                                  >
                                    {item.cta}
                                  </Button>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </Card>
                    </section>
                  );
                })}
              </>
            )}
          </>
        )}
      </div>
    </AuthGate>
  );
}
