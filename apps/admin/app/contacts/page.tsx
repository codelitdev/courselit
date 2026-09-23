"use client";

import { Badge } from "@codelitdev/design-system";
import {
  ContactFilterBuilder,
  type ContactFilterCondition,
  type ContactFilterSegment,
  type ContactFilterWithAggregator,
} from "@sendlit/email-blocks";
import { ChevronRight, Contact as ContactIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/empty-state";
import { CourseLitLoading } from "@/components/loading";
import { Button } from "@/components/ui/codelit/button";
import { AuthGate } from "../../components/auth-gate";

type School = {
  id: string;
  name: string;
  subdomain: string;
  permissions?: readonly string[];
  selected?: boolean;
};

type ContactItem = {
  id: string;
  schoolId: string;
  email: string;
  name: string;
  bio: string;
  status: "active" | "deactivated" | "deletion_pending";
  registrationStatus: "registered" | "newsletter_only";
  createdAt: string;
  updatedAt: string;
  lastActiveAt: string | null;
  marketing: {
    subscribed: boolean;
    tags: string[];
  };
};

export default function ContactsPage() {
  const [school, setSchool] = useState<School | null>(null);

  // Contacts state
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  // Segments and Filters state
  const [segments, setSegments] = useState<ContactFilterSegment[]>([]);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string>("");
  const [filter, setFilter] = useState<ContactFilterWithAggregator>({
    aggregator: "or",
    filters: [],
  });

  const [error, setError] = useState<string | null>(null);

  const loadContacts = useCallback(async (selected: School) => {
    setLoadingContacts(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/contacts?rowsPerPage=100", {
        credentials: "include",
        cache: "no-store",
        headers: { "x-school-id": selected.id },
      });
      if (!response.ok) throw new Error("Unable to load contacts.");
      const body = (await response.json()) as { items?: ContactItem[] };
      setContacts(body.items ?? []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load contacts.");
    } finally {
      setLoadingContacts(false);
    }
  }, []);

  const loadSegments = useCallback(async (selected: School) => {
    try {
      const response = await fetch("/api/v1/contact-segments", {
        credentials: "include",
        cache: "no-store",
        headers: { "x-school-id": selected.id },
      });
      if (response.ok) {
        const body = (await response.json()) as {
          items?: Array<{
            id?: string;
            segmentId?: string;
            name: string;
            filter: ContactFilterWithAggregator;
          }>;
        };
        const loaded: ContactFilterSegment[] = (body.items ?? []).map((seg) => ({
          id: seg.id || seg.segmentId || "",
          name: seg.name,
          filter: seg.filter,
        }));
        setSegments(loaded);
      }
    } catch {
      /* ignore segment load errors on initial fetch */
    }
  }, []);

  useEffect(() => {
    void fetch("/api/v1/schools", { credentials: "include", cache: "no-store" })
      .then((response) => (response.ok ? response.json() : { items: [] }))
      .then(async (body: { items?: School[] }) => {
        const selected =
          body.items?.find((item) => item.selected) ?? body.items?.[0] ?? null;
        setSchool(selected);
        if (selected) {
          await Promise.all([loadContacts(selected), loadSegments(selected)]);
        }
      })
      .catch(() => setError("Unable to load school context."));
  }, [loadContacts, loadSegments]);

  // Filter contacts based on ContactFilterWithAggregator
  const filteredContacts = useMemo<ContactItem[]>(() => {
    const filterList = filter?.filters ?? [];
    if (filterList.length === 0) {
      return contacts;
    }

    const matchesCondition = (
      contact: ContactItem,
      cond: ContactFilterCondition,
    ): boolean => {
      const val = (cond.value ?? "").trim().toLowerCase();

      switch (cond.name) {
        case "email": {
          const email = contact.email.toLowerCase();
          const name = (contact.name ?? "").toLowerCase();
          if (cond.condition === "is") {
            return email === val;
          }
          if (cond.condition === "contains") {
            return email.includes(val) || name.includes(val);
          }
          if (cond.condition === "not_contains") {
            return !email.includes(val) && !name.includes(val);
          }
          return true;
        }

        case "tag": {
          const tags = contact.marketing?.tags ?? [];
          const hasTag = tags.some((t) => t.toLowerCase() === val);
          if (cond.condition === "is_not") {
            return !hasTag;
          }
          return hasTag;
        }

        case "subscription": {
          const subscribed = contact.marketing?.subscribed ?? false;
          if (cond.condition === "is") {
            if (val === "subscribed") return Boolean(subscribed);
            if (val === "unsubscribed") return !subscribed;
          }
          return true;
        }

        case "signedUp": {
          if (!cond.value) return true;
          const targetMs = Number(cond.value) || new Date(cond.value).getTime();
          const contactMs = new Date(contact.createdAt).getTime();
          if (Number.isNaN(contactMs) || Number.isNaN(targetMs)) return true;

          if (cond.condition === "before") {
            return contactMs < targetMs;
          }
          if (cond.condition === "after") {
            return contactMs > targetMs;
          }
          if (cond.condition === "on") {
            const d1 = new Date(contactMs);
            const d2 = new Date(targetMs);
            return (
              d1.getFullYear() === d2.getFullYear() &&
              d1.getMonth() === d2.getMonth() &&
              d1.getDate() === d2.getDate()
            );
          }
          return true;
        }

        default:
          return true;
      }
    };

    return contacts.filter((contact) => {
      if (filter.aggregator === "and") {
        return filterList.every((cond) => matchesCondition(contact, cond));
      }
      return filterList.some((cond) => matchesCondition(contact, cond));
    });
  }, [contacts, filter]);

  // Segment Handlers
  async function handleSaveSegment(
    name: string,
    filterValue: ContactFilterWithAggregator,
  ) {
    if (!school) return;
    setError(null);
    try {
      const response = await fetch("/api/v1/contact-segments", {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
          "x-school-id": school.id,
        },
        body: JSON.stringify({
          name,
          filter: {
            version: 1,
            aggregator: filterValue.aggregator,
            filters: filterValue.filters,
          },
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Unable to save segment.");
      }
      const created = (await response.json()) as {
        id?: string;
        segmentId?: string;
        name: string;
        filter: ContactFilterWithAggregator;
      };
      const newSeg: ContactFilterSegment = {
        id: created.id || created.segmentId || "",
        name: created.name,
        filter: created.filter,
      };
      setSegments((prev) => [...prev, newSeg]);
      setSelectedSegmentId(newSeg.id);
    } catch (caught) {
      const msg = caught instanceof Error ? caught.message : "Unable to save segment.";
      setError(msg);
      throw caught;
    }
  }

  async function handleDeleteSegment(segment: ContactFilterSegment) {
    if (!school) return;
    setError(null);
    try {
      const response = await fetch(`/api/v1/contact-segments/${segment.id}`, {
        method: "DELETE",
        credentials: "include",
        headers: { "x-school-id": school.id },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Unable to delete segment.");
      }
      setSegments((prev) => prev.filter((s) => s.id !== segment.id));
      if (selectedSegmentId === segment.id) {
        setSelectedSegmentId("");
        setFilter({ aggregator: "or", filters: [] });
      }
    } catch (caught) {
      const msg =
        caught instanceof Error ? caught.message : "Unable to delete segment.";
      setError(msg);
      throw caught;
    }
  }

  return (
    <AuthGate>
      <main className="page-shell">
        <PageHeader
          title="Contacts"
          description="Manage audience contacts, learners, subscribers, segmentation, and tags."
        />

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        {/* ContactFilterBuilder Block */}
        <div>
          <ContactFilterBuilder
            value={filter}
            onChange={(next) => {
              setSelectedSegmentId("");
              setFilter(next);
            }}
            segments={segments}
            selectedSegmentId={selectedSegmentId}
            onSegmentSelect={(seg) => {
              setSelectedSegmentId(seg.id);
              setFilter(seg.filter);
            }}
            onSaveSegment={handleSaveSegment}
            onDeleteSegment={handleDeleteSegment}
            count={filteredContacts.length}
            countLabel="Contacts"
          />
        </div>

        {/* Contacts List */}
        <div className="space-y-4">
          {loadingContacts && contacts.length === 0 ? (
            <CourseLitLoading label="Loading contacts…" className="py-12" />
          ) : contacts.length === 0 ? (
            <EmptyState
              icon={ContactIcon}
              title="No Contacts Found"
              description="Contacts will appear here as they register, enroll in courses, or subscribe to your mailing list."
            />
          ) : filteredContacts.length === 0 ? (
            <div className="py-12 text-center">
              <ContactIcon className="mx-auto size-8 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">No matching contacts</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                No contacts matched your current filter criteria.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilter({ aggregator: "or", filters: [] });
                  setSelectedSegmentId("");
                }}
              >
                Clear filters
              </Button>
            </div>
          ) : (
            <div className="divide-y overflow-hidden rounded-xl border bg-card">
              {filteredContacts.map((contact) => {
                const isLearner = contact.registrationStatus === "registered";
                const isSubscribed = contact.marketing?.subscribed;
                const tags = contact.marketing?.tags ?? [];

                return (
                  <Link
                    key={contact.id}
                    href={`/contacts/${encodeURIComponent(contact.id)}`}
                    className="group flex items-center gap-3 px-4 py-3.5 transition-colors sm:px-5 cursor-pointer hover:bg-muted/35 focus-visible:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-semibold">
                          {contact.name || contact.email}
                        </span>
                        {contact.name ? (
                          <span className="truncate text-xs text-muted-foreground">
                            ({contact.email})
                          </span>
                        ) : null}

                        <Badge variant={isSubscribed ? "success" : "outline"}>
                          {isSubscribed ? "Subscribed" : "Unsubscribed"}
                        </Badge>

                        <Badge
                          variant={isLearner ? "default" : "neutral"}
                          dot={isLearner}
                        >
                          {isLearner
                            ? contact.status === "active"
                              ? "Learner"
                              : "Suspended"
                            : "Newsletter only"}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        {tags.length === 0 ? (
                          <span className="text-muted-foreground">No tags</span>
                        ) : (
                          tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 font-medium text-muted-foreground"
                            >
                              {tag}
                            </span>
                          ))
                        )}
                        {contact.createdAt ? (
                          <span className="ml-1 text-muted-foreground">
                            joined {new Date(contact.createdAt).toLocaleDateString()}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </AuthGate>
  );
}
