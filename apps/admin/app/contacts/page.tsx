"use client";

import { Badge } from "@codelitdev/design-system";
import {
  ContactFilterBuilder,
  type ContactFilterCondition,
  type ContactFilterSegment,
  type ContactFilterWithAggregator,
  TagEditor,
} from "@sendlit/email-blocks";
import { ChevronRight, Contact, Plus } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/codelit/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/codelit/dialog";
import { Input } from "@/components/ui/codelit/input";
import { Label } from "@/components/ui/codelit/label";
import { hasSchoolPermission } from "@/lib/school-permissions";
import { AuthGate } from "../../components/auth-gate";

type School = {
  id: string;
  name: string;
  subdomain: string;
  permissions?: readonly string[];
  selected?: boolean;
};

type Learner = {
  id: string;
  schoolId: string;
  email: string;
  name: string;
  status: "active" | "deactivated";
  createdAt: string;
};

type Subscriber = {
  contactId: string;
  email: string;
  name?: string | null;
  firstName?: string;
  lastName?: string;
  subscribed: boolean;
  tags?: string[];
  createdAt?: string;
};

type ContactItem = {
  id: string;
  email: string;
  name: string;
  subscribed: boolean;
  tags: string[];
  createdAt: string;
  learner?: Learner;
  contact?: Subscriber;
};

export default function ContactsPage() {
  const [school, setSchool] = useState<School | null>(null);

  // Learners state
  const [learners, setLearners] = useState<Learner[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingLearners, setLoadingLearners] = useState(false);

  // Subscribers state
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loadingSubscribers, setLoadingSubscribers] = useState(false);
  const [newSubscriberOpen, setNewSubscriberOpen] = useState(false);
  const [subscriberEmail, setSubscriberEmail] = useState("");
  const [subscriberName, setSubscriberName] = useState("");
  const [subscriberTags, setSubscriberTags] = useState<string[]>([]);
  const [savingSubscriber, setSavingSubscriber] = useState(false);

  // Segments and Filters state
  const [segments, setSegments] = useState<ContactFilterSegment[]>([]);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string>("");
  const [filter, setFilter] = useState<ContactFilterWithAggregator>({
    aggregator: "or",
    filters: [],
  });

  const [error, setError] = useState<string | null>(null);

  const loadLearners = useCallback(async (selected: School, cursor?: string) => {
    setLoadingLearners(true);
    setError(null);
    try {
      const search = new URLSearchParams({ limit: "50" });
      if (cursor) search.set("cursor", cursor);
      const response = await fetch(`/api/v1/learners?${search.toString()}`, {
        credentials: "include",
        cache: "no-store",
        headers: { "x-school-id": selected.id },
      });
      if (!response.ok) throw new Error("Unable to load learners.");
      const body = (await response.json()) as {
        items?: Learner[];
        nextCursor?: string | null;
      };
      setLearners((current) =>
        cursor ? [...current, ...(body.items ?? [])] : (body.items ?? []),
      );
      setNextCursor(body.nextCursor ?? null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load learners.");
    } finally {
      setLoadingLearners(false);
    }
  }, []);

  const loadSubscribers = useCallback(async (selected: School) => {
    setLoadingSubscribers(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/school/mails/subscribers", {
        credentials: "include",
        cache: "no-store",
        headers: { "x-school-id": selected.id },
      });
      if (!response.ok) throw new Error("Unable to load subscribers.");
      const body = (await response.json()) as { items?: Subscriber[] };
      setSubscribers(body.items ?? []);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to load subscribers.",
      );
    } finally {
      setLoadingSubscribers(false);
    }
  }, []);

  const loadSegments = useCallback(async (selected: School) => {
    try {
      const response = await fetch("/api/v1/school/segments", {
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
          await Promise.all([
            loadLearners(selected),
            loadSubscribers(selected),
            loadSegments(selected),
          ]);
        }
      })
      .catch(() => setError("Unable to load school context."));
  }, [loadLearners, loadSubscribers, loadSegments]);

  // Merge subscribers and learners into a unified contacts list
  const allContacts = useMemo<ContactItem[]>(() => {
    const map = new Map<string, ContactItem>();

    for (const sub of subscribers) {
      const emailLower = sub.email.toLowerCase();
      const displayName =
        sub.name ||
        (sub.firstName ? `${sub.firstName} ${sub.lastName || ""}`.trim() : "");
      map.set(emailLower, {
        id: sub.contactId,
        email: sub.email,
        name: displayName,
        subscribed: sub.subscribed,
        tags: Array.isArray(sub.tags) ? [...sub.tags] : [],
        createdAt: sub.createdAt || new Date().toISOString(),
        contact: sub,
      });
    }

    for (const learner of learners) {
      const emailLower = learner.email.toLowerCase();
      const existing = map.get(emailLower);
      if (existing) {
        existing.learner = learner;
        if (!existing.name && learner.name) {
          existing.name = learner.name;
        }
        if (!existing.tags.includes("learner")) {
          existing.tags.push("learner");
        }
      } else {
        map.set(emailLower, {
          id: learner.id,
          email: learner.email,
          name: learner.name,
          subscribed: false,
          tags: ["learner"],
          createdAt: learner.createdAt,
          learner,
        });
      }
    }

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [learners, subscribers]);

  // Extract all unique tags used across contacts to offer as options in TagEditor
  const allKnownTags = useMemo<string[]>(() => {
    const set = new Set<string>();
    for (const u of allContacts) {
      for (const t of u.tags) {
        if (t) set.add(t);
      }
    }
    return Array.from(set).sort();
  }, [allContacts]);

  // Filter contacts based on ContactFilterWithAggregator
  const filteredContacts = useMemo<ContactItem[]>(() => {
    const filterList = filter?.filters ?? [];
    if (filterList.length === 0) {
      return allContacts;
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
          const hasTag = contact.tags.some((t) => t.toLowerCase() === val);
          if (cond.condition === "is_not") {
            return !hasTag;
          }
          return hasTag;
        }

        case "subscription": {
          if (cond.condition === "is") {
            if (val === "subscribed") return Boolean(contact.subscribed);
            if (val === "unsubscribed") return !contact.subscribed;
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

    return allContacts.filter((contact) => {
      if (filter.aggregator === "and") {
        return filterList.every((cond) => matchesCondition(contact, cond));
      }
      return filterList.some((cond) => matchesCondition(contact, cond));
    });
  }, [allContacts, filter]);

  // Segment Handlers
  async function handleSaveSegment(
    name: string,
    filterValue: ContactFilterWithAggregator,
  ) {
    if (!school) return;
    setError(null);
    try {
      const response = await fetch("/api/v1/school/segments", {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
          "x-school-id": school.id,
        },
        body: JSON.stringify({ name, filter: filterValue }),
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
      const response = await fetch(`/api/v1/school/segments/${segment.id}`, {
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

  // Add Subscriber
  async function handleAddSubscriber(e: React.FormEvent) {
    e.preventDefault();
    if (!school || !subscriberEmail.trim() || savingSubscriber) return;
    setSavingSubscriber(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/school/mails/subscribers", {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
          "x-school-id": school.id,
        },
        body: JSON.stringify({
          email: subscriberEmail.trim(),
          name: subscriberName.trim() || undefined,
          tags: subscriberTags.length > 0 ? subscriberTags : undefined,
        }),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || "Unable to add subscriber.");
      }
      setSubscriberEmail("");
      setSubscriberName("");
      setSubscriberTags([]);
      setNewSubscriberOpen(false);
      await loadSubscribers(school);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to add subscriber.");
    } finally {
      setSavingSubscriber(false);
    }
  }

  const isLoading = loadingLearners || loadingSubscribers;
  const canWriteContacts = hasSchoolPermission(school, "learners:write");

  return (
    <AuthGate>
      <main className="page-shell">
        <PageHeader
          title="Contacts"
          description="Manage audience contacts, learners, subscribers, segmentation, and tags."
          action={
            canWriteContacts ? (
              <Button
                type="button"
                onClick={() => {
                  setSubscriberEmail("");
                  setSubscriberName("");
                  setSubscriberTags([]);
                  setNewSubscriberOpen(true);
                }}
              >
                <Plus className="size-4 mr-1.5" />
                Add subscriber
              </Button>
            ) : undefined
          }
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
          {isLoading && allContacts.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Loading contacts…
            </div>
          ) : allContacts.length === 0 ? (
            <EmptyState
              icon={Contact}
              title="No Contacts Found"
              description="Contacts will appear here as they register, enroll in courses, or subscribe to your mailing list."
              action={
                canWriteContacts ? (
                  <Button
                    type="button"
                    onClick={() => {
                      setSubscriberEmail("");
                      setSubscriberName("");
                      setSubscriberTags([]);
                      setNewSubscriberOpen(true);
                    }}
                  >
                    <Plus className="size-4" />
                    Add subscriber
                  </Button>
                ) : undefined
              }
            />
          ) : filteredContacts.length === 0 ? (
            <div className="py-12 text-center">
              <Contact className="mx-auto size-8 text-muted-foreground mb-2" />
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
                const row = (
                  <>
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

                        <Badge variant={contact.subscribed ? "success" : "outline"}>
                          {contact.subscribed ? "Subscribed" : "Unsubscribed"}
                        </Badge>

                        {contact.learner ? (
                          <Badge
                            variant={
                              contact.learner.status === "active"
                                ? "default"
                                : "destructive"
                            }
                            dot
                          >
                            {contact.learner.status === "active"
                              ? "Learner"
                              : "Suspended"}
                          </Badge>
                        ) : (
                          <Badge variant="neutral">Subscriber</Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        {contact.tags.length === 0 ? (
                          <span className="text-muted-foreground">No tags</span>
                        ) : (
                          contact.tags.map((tag) => (
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
                    {contact.contact?.contactId ? (
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    ) : null}
                  </>
                );
                const className =
                  "group flex items-center gap-3 px-4 py-3.5 transition-colors sm:px-5";
                const learnerQuery = contact.learner
                  ? `?learnerId=${encodeURIComponent(contact.learner.id)}`
                  : "";

                return contact.contact?.contactId ? (
                  <Link
                    key={contact.id || contact.email}
                    href={`/contacts/${encodeURIComponent(contact.contact.contactId)}${learnerQuery}`}
                    className={`${className} cursor-pointer hover:bg-muted/35 focus-visible:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                  >
                    {row}
                  </Link>
                ) : (
                  <div key={contact.id || contact.email} className={className}>
                    {row}
                  </div>
                );
              })}
            </div>
          )}

          {nextCursor ? (
            <Button
              type="button"
              variant="outline"
              disabled={loadingLearners || !school}
              onClick={() => school && void loadLearners(school, nextCursor)}
            >
              {loadingLearners ? "Loading…" : "Load more learners"}
            </Button>
          ) : null}
        </div>

        {/* Add Subscriber Modal with TagEditor */}
        <Dialog open={newSubscriberOpen} onOpenChange={setNewSubscriberOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New contact</DialogTitle>
              <DialogDescription>Add a new contact to your audience.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddSubscriber} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="new-sub-email">Email address *</Label>
                <Input
                  id="new-sub-email"
                  type="email"
                  placeholder="name@example.com"
                  required
                  value={subscriberEmail}
                  onChange={(e) => setSubscriberEmail(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-sub-name">Name (optional)</Label>
                <Input
                  id="new-sub-name"
                  placeholder="Jane Doe"
                  value={subscriberName}
                  onChange={(e) => setSubscriberName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tags (optional)</Label>
                <TagEditor
                  tags={subscriberTags}
                  options={allKnownTags}
                  onAdd={(tag) =>
                    setSubscriberTags((current) =>
                      current.includes(tag) ? current : [...current, tag],
                    )
                  }
                  onRemove={(tag) =>
                    setSubscriberTags((current) =>
                      current.filter((item) => item !== tag),
                    )
                  }
                />
              </div>
              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setNewSubscriberOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!subscriberEmail.trim() || savingSubscriber}
                >
                  {savingSubscriber ? "Creating…" : "Create contact"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </AuthGate>
  );
}
