"use client";

import { Building2, Check, ExternalLink, Globe, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { AuthGate } from "@/components/auth-gate";
import { CreateSchoolDialog } from "@/components/layout/create-school-dialog";
import { Button } from "@/components/ui/codelit/button";

type SchoolItem = {
  id: string;
  name: string;
  subdomain: string;
  status: string;
  locale: string;
  currency: string;
  selected?: boolean;
};

export default function SchoolsPage() {
  const [schools, setSchools] = useState<SchoolItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  function loadSchools() {
    return fetch("/api/v1/schools", {
      credentials: "include",
      cache: "no-store",
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load schools");
        return (await res.json()) as { items?: SchoolItem[] };
      })
      .then((body) => {
        const items = body.items ?? [];
        setSchools(items);
        if (items.length === 0) setCreateDialogOpen(true);
      })
      .catch(() => {
        // If request failed (e.g. rate-limit or network), don't falsely open create dialog
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    void loadSchools();
  }, []);

  async function handleSwitchSchool(schoolId: string) {
    if (switching) return;
    setSwitching(schoolId);
    try {
      const response = await fetch("/api/school/select", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ schoolId }),
      });
      if (response.ok) {
        window.location.reload();
      }
    } finally {
      setSwitching(null);
    }
  }

  return (
    <AuthGate>
      <div className="page-shell">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Schools</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your schools and switch between them.
            </p>
          </div>
          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="flex items-center gap-1.5"
          >
            <Plus className="size-4" />
            New school
          </Button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            Loading schools…
          </div>
        ) : schools.length === 0 ? (
          <div className="rounded-xl border border-dashed p-12 text-center space-y-3">
            <div className="mx-auto flex aspect-square size-12 items-center justify-center rounded-lg bg-[var(--primary-soft)] text-primary">
              <Building2 className="size-6" />
            </div>
            <h2 className="text-base font-semibold">No schools found</h2>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              You haven&apos;t created or joined any schools yet. Create your first
              school to get started.
            </p>
            <Button onClick={() => setCreateDialogOpen(true)} className="mt-2">
              <Plus className="size-4 mr-1.5" />
              New school
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {schools.map((school) => {
              const isSelected = Boolean(school.selected);
              return (
                <div
                  key={school.id}
                  className={`rounded-xl border bg-card p-5 shadow-sm transition-all ${
                    isSelected ? "ring-2 ring-primary/40 border-primary" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex aspect-square size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--primary-soft)] font-semibold text-primary">
                        {(school.name || "S").slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h2 className="truncate text-base font-semibold">
                          {school.name}
                        </h2>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <Globe className="size-3 shrink-0" />
                          <span className="truncate">
                            {school.subdomain}.courselit.app
                          </span>
                        </div>
                      </div>
                    </div>
                    {isSelected ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary shrink-0">
                        <Check className="size-3" />
                        Active
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-2 pt-4 border-t">
                    <div className="text-xs text-muted-foreground">
                      Status:{" "}
                      <span className="font-medium capitalize text-foreground">
                        {school.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={`http://${school.subdomain}.localhost:3001`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors p-1"
                        title="Open public site"
                      >
                        <ExternalLink className="size-3.5" />
                        <span className="sr-only">Visit site</span>
                      </a>

                      {!isSelected && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void handleSwitchSchool(school.id)}
                          disabled={switching === school.id}
                        >
                          {switching === school.id ? "Switching…" : "Select"}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <CreateSchoolDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onSuccess={() => {
            void loadSchools();
            window.location.reload();
          }}
        />
      </div>
    </AuthGate>
  );
}
