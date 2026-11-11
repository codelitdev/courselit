"use client";

import type { ContactFilterSet } from "@courselit/api-contract";
import { Badge } from "@codelitdev/design-system";
import {
  ContactFilterBuilder,
  type ContactFilterSegment,
  type ContactFilterWithAggregator,
} from "@sendlit/email-blocks";
import { ChevronRight, Contact as ContactIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/empty-state";
import { CourseLitLoading } from "@/components/loading";
import { Button } from "@/components/ui/codelit/button";
import { AuthGate } from "../../components/auth-gate";
import { fromContactFilterSet, toContactFilterSet } from "@/lib/contact-filters";

type School = {
  id: string;
  name: string;
  subdomain: string;
  permissions?: readonly string[];
  selected?: boolean;
};

const CONTACTS_PER_PAGE = 50;

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
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const latestRequest = useRef(0);

  // Segments and Filters state
  const [segments, setSegments] = useState<ContactFilterSegment[]>([]);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string>("");
  const [filter, setFilter] = useState<ContactFilterWithAggregator>({
    aggregator: "or",
    filters: [],
  });

  const [error, setError] = useState<string | null>(null);

  const loadContacts = useCallback(
    async (
      selected: School,
      currentFilter: ContactFilterWithAggregator,
      currentPage: number,
      segmentId: string,
    ) => {
      const request = ++latestRequest.current;
      setLoadingContacts(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: String(currentPage),
          rowsPerPage: String(CONTACTS_PER_PAGE),
        });
        // A saved segment is listed by its id, so filters the builder can't
        // show (products, community) still apply.
        const filterSet = toContactFilterSet(currentFilter);
        if (segmentId) params.set("segmentId", segmentId);
        else if (filterSet.filters.length > 0)
          params.set("filter", JSON.stringify(filterSet));
        const response = await fetch(`/api/v1/contacts?${params}`, {
          credentials: "include",
          cache: "no-store",
          headers: { "x-school-id": selected.id },
        });
        if (!response.ok) throw new Error("Unable to load contacts.");
        const body = (await response.json()) as {
          items?: ContactItem[];
          total?: number;
        };
        if (request !== latestRequest.current) return;
        setContacts(body.items ?? []);
        setTotal(body.total ?? 0);
      } catch (caught) {
        if (request !== latestRequest.current) return;
        setError(caught instanceof Error ? caught.message : "Unable to load contacts.");
      } finally {
        if (request === latestRequest.current) setLoadingContacts(false);
      }
    },
    [],
  );

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
            filter: ContactFilterSet;
          }>;
        };
        const loaded: ContactFilterSegment[] = (body.items ?? []).map((seg) => ({
          id: seg.id || seg.segmentId || "",
          name: seg.name,
          filter: fromContactFilterSet(seg.filter),
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
        if (selected) await loadSegments(selected);
        else setLoadingContacts(false);
      })
      .catch(() => {
        setError("Unable to load school context.");
        setLoadingContacts(false);
      });
  }, [loadSegments]);

  // The server filters and pages the contacts; typing in a filter value waits
  // for a pause before asking again.
  useEffect(() => {
    if (!school) return;
    const timer = setTimeout(
      () => void loadContacts(school, filter, page, selectedSegmentId),
      300,
    );
    return () => clearTimeout(timer);
  }, [school, filter, page, selectedSegmentId, loadContacts]);

  function applyFilter(next: ContactFilterWithAggregator) {
    setFilter(next);
    setPage(1);
  }

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
        body: JSON.stringify({ name, filter: toContactFilterSet(filterValue) }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Unable to save segment.");
      }
      const created = (await response.json()) as {
        id?: string;
        segmentId?: string;
        name: string;
        filter: ContactFilterSet;
      };
      const newSeg: ContactFilterSegment = {
        id: created.id || created.segmentId || "",
        name: created.name,
        filter: fromContactFilterSet(created.filter),
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
        applyFilter({ aggregator: "or", filters: [] });
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
              applyFilter(next);
            }}
            segments={segments}
            selectedSegmentId={selectedSegmentId}
            onSegmentSelect={(seg) => {
              setSelectedSegmentId(seg.id);
              applyFilter(seg.filter);
            }}
            onSaveSegment={handleSaveSegment}
            onDeleteSegment={handleDeleteSegment}
            count={total}
            countLabel="Contacts"
          />
        </div>

        {/* Contacts List */}
        <div className="space-y-4">
          {loadingContacts && contacts.length === 0 ? (
            <CourseLitLoading label="Loading contacts…" className="py-12" />
          ) : contacts.length === 0 && filter.filters.length === 0 && page === 1 ? (
            <EmptyState
              icon={ContactIcon}
              title="No Contacts Found"
              description="Contacts will appear here as they register, enroll in courses, or subscribe to your mailing list."
            />
          ) : contacts.length === 0 ? (
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
                  applyFilter({ aggregator: "or", filters: [] });
                  setSelectedSegmentId("");
                }}
              >
                Clear filters
              </Button>
            </div>
          ) : (
            <>
              <div className="divide-y overflow-hidden rounded-xl border bg-card">
                {contacts.map((contact) => {
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
              {total > CONTACTS_PER_PAGE ? (
                <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
                  <span>
                    {(page - 1) * CONTACTS_PER_PAGE + 1}–
                    {Math.min(page * CONTACTS_PER_PAGE, total)} of {total}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={page === 1 || loadingContacts}
                      onClick={() => setPage((current) => current - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={page * CONTACTS_PER_PAGE >= total || loadingContacts}
                      onClick={() => setPage((current) => current + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </main>
    </AuthGate>
  );
}
