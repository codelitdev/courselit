"use client";

import { Badge } from "@codelitdev/design-system";
import { TagEditor } from "@sendlit/email-blocks";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { AuthGate } from "@/components/auth-gate";
import { PageHeader } from "@/components/layout/page-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/codelit/button";
import { Input } from "@/components/ui/codelit/input";
import { Label } from "@/components/ui/codelit/label";
import { Switch } from "@/components/ui/codelit/switch";

type School = { id: string };

type Contact = {
  contactId: string;
  email: string;
  name?: string | null;
  subscribed: boolean;
  customFields?: Record<string, unknown>;
  tags: string[];
  createdAt?: string | null;
  updatedAt?: string | null;
};

type Learner = {
  id: string;
  email: string;
  name: string;
  status: "active" | "deactivated";
};

type ContactForm = {
  name: string;
  subscribed: boolean;
  tags: string[];
  learnerStatus: Learner["status"] | null;
};

function sameTags(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  const rightTags = new Set(right);
  return left.every((tag) => rightTags.has(tag));
}

export function ContactEditor({
  contactId,
  learnerId,
}: {
  contactId: string;
  learnerId?: string;
}) {
  const router = useRouter();
  const [school, setSchool] = useState<School | null>(null);
  const [contact, setContact] = useState<Contact | null>(null);
  const [learner, setLearner] = useState<Learner | null>(null);
  const [tagOptions, setTagOptions] = useState<string[]>([]);
  const [form, setForm] = useState<ContactForm>({
    name: "",
    subscribed: false,
    tags: [],
    learnerStatus: null,
  });
  const initialForm = useRef<ContactForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const schoolsResponse = await fetch("/api/v1/schools", {
          cache: "no-store",
          credentials: "include",
        });
        if (!schoolsResponse.ok) throw new Error("Unable to load school context.");
        const schoolsBody = (await schoolsResponse.json()) as {
          items?: Array<School & { selected?: boolean }>;
        };
        const selected =
          schoolsBody.items?.find((item) => item.selected) ?? schoolsBody.items?.[0];
        if (!selected) throw new Error("No school is selected.");

        const headers = { "x-school-id": selected.id };
        const [contactResponse, subscribersResponse, learnersResponse] =
          await Promise.all([
            fetch(`/api/v1/school/mails/subscribers/${encodeURIComponent(contactId)}`, {
              cache: "no-store",
              credentials: "include",
              headers,
            }),
            fetch("/api/v1/school/mails/subscribers?limit=50", {
              cache: "no-store",
              credentials: "include",
              headers,
            }),
            learnerId
              ? fetch("/api/v1/learners?limit=50", {
                  cache: "no-store",
                  credentials: "include",
                  headers,
                })
              : Promise.resolve(null),
          ]);
        if (!contactResponse.ok) {
          throw new Error("Unable to load contact.");
        }

        const loadedContact = (await contactResponse.json()) as Contact;
        const subscribersBody = subscribersResponse.ok
          ? ((await subscribersResponse.json()) as { items?: Contact[] })
          : { items: [] };
        const learnersBody = learnersResponse?.ok
          ? ((await learnersResponse.json()) as { items?: Learner[] })
          : { items: [] };
        const loadedLearner =
          learnersBody.items?.find((item) => item.id === learnerId) ?? null;
        const options = new Set<string>(loadedContact.tags ?? []);
        for (const subscriber of subscribersBody.items ?? []) {
          for (const tag of subscriber.tags ?? []) options.add(tag);
        }

        if (!active) return;
        const loadedForm = {
          name: loadedContact.name ?? "",
          subscribed: loadedContact.subscribed,
          tags: [...(loadedContact.tags ?? [])],
          learnerStatus: loadedLearner?.status ?? null,
        };
        setSchool(selected);
        setContact(loadedContact);
        setLearner(loadedLearner);
        setForm(loadedForm);
        initialForm.current = loadedForm;
        setTagOptions(Array.from(options).sort());
      } catch (caught) {
        if (active) {
          setError(
            caught instanceof Error ? caught.message : "Unable to load contact.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [contactId, learnerId]);

  const hasChanges = Boolean(
    initialForm.current &&
      (form.name.trim() !== initialForm.current.name.trim() ||
        form.subscribed !== initialForm.current.subscribed ||
        !sameTags(form.tags, initialForm.current.tags) ||
        form.learnerStatus !== initialForm.current.learnerStatus),
  );

  async function saveContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!school || !contact || saving || !hasChanges) return;

    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const contactChanged = Boolean(
        initialForm.current &&
          (form.name.trim() !== initialForm.current.name.trim() ||
            form.subscribed !== initialForm.current.subscribed ||
            !sameTags(form.tags, initialForm.current.tags)),
      );
      const learnerChanged = Boolean(
        learner &&
          initialForm.current &&
          form.learnerStatus !== initialForm.current.learnerStatus,
      );

      let updatedContact = contact;
      if (contactChanged) {
        const response = await fetch(
          `/api/v1/school/mails/subscribers/${encodeURIComponent(contact.contactId)}`,
          {
            method: "PATCH",
            credentials: "include",
            headers: {
              "content-type": "application/json",
              "x-school-id": school.id,
            },
            body: JSON.stringify({
              name: form.name.trim(),
              subscribed: form.subscribed,
              tags: form.tags,
            }),
          },
        );
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as {
            message?: string;
          } | null;
          throw new Error(body?.message ?? "Unable to save contact.");
        }
        updatedContact = (await response.json()) as Contact;
      }

      let updatedLearner = learner;
      if (learnerChanged && learner) {
        const response = await fetch(
          `/api/v1/learners/${encodeURIComponent(learner.id)}`,
          {
            method: "PATCH",
            credentials: "include",
            headers: {
              "content-type": "application/json",
              "x-school-id": school.id,
            },
            body: JSON.stringify({ status: form.learnerStatus }),
          },
        );
        if (!response.ok) throw new Error("Unable to update account status.");
        updatedLearner = (await response.json()) as Learner;
      }

      const updatedForm = {
        name: updatedContact.name ?? "",
        subscribed: updatedContact.subscribed,
        tags: [...(updatedContact.tags ?? [])],
        learnerStatus: updatedLearner?.status ?? null,
      };
      setContact(updatedContact);
      setLearner(updatedLearner);
      setForm(updatedForm);
      initialForm.current = updatedForm;
      setTagOptions((current) =>
        Array.from(new Set([...current, ...updatedForm.tags])).sort(),
      );
      setSaved(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save contact.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteContact() {
    if (!school || !contact || deleting) return;
    if (!window.confirm("Remove this contact from the audience?")) return;

    setDeleting(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/v1/school/mails/subscribers/${encodeURIComponent(contact.contactId)}`,
        {
          method: "DELETE",
          credentials: "include",
          headers: { "x-school-id": school.id },
        },
      );
      if (!response.ok) throw new Error("Unable to remove contact.");
      router.push("/contacts");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to remove contact.");
      setDeleting(false);
    }
  }

  const displayName = contact?.name?.trim() || contact?.email || "Contact";
  const initials = displayName.slice(0, 1).toUpperCase();

  return (
    <AuthGate>
      <main className="page-shell">
        <PageHeader
          title={loading ? "Contact" : displayName}
          description={contact?.email ?? "Edit contact details and audience settings."}
          action={
            contact ? (
              <Badge variant={form.subscribed ? "success" : "outline"}>
                {form.subscribed ? "Subscribed" : "Unsubscribed"}
              </Badge>
            ) : null
          }
        />

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        {saved ? (
          <p className="rounded-[var(--radius)] bg-[var(--primary-soft)] px-3 py-2 text-sm text-primary">
            Contact updated.
          </p>
        ) : null}

        {loading ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            Loading contact…
          </div>
        ) : contact ? (
          <>
            <form onSubmit={saveContact} className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
                <Card>
                  <CardHeader>
                    <CardTitle>Contact details</CardTitle>
                    <CardDescription>
                      Update the information used to identify this contact.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="flex items-center gap-3 rounded-[var(--radius)] border bg-muted/20 p-3">
                      <Avatar>
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{displayName}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {contact.email}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="contact-email">Email address</Label>
                      <Input
                        id="contact-email"
                        value={contact.email}
                        disabled
                        readOnly
                      />
                      <p className="text-xs text-muted-foreground">
                        Email addresses cannot be changed after a contact is created.
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="contact-name">Name</Label>
                      <Input
                        id="contact-name"
                        value={form.name}
                        placeholder="Jane Doe"
                        onChange={(event) => {
                          setSaved(false);
                          setForm((current) => ({
                            ...current,
                            name: event.target.value,
                          }));
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Account status</CardTitle>
                    <CardDescription>
                      Manage access to marketing mail and the learner account.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-start justify-between gap-4 rounded-[var(--radius)] border p-3">
                      <div className="space-y-1">
                        <Label htmlFor="contact-subscribed">Mailing subscription</Label>
                        <p className="text-xs text-muted-foreground">
                          {form.subscribed
                            ? "This contact is eligible for marketing mail."
                            : "This contact will not receive marketing mail."}
                        </p>
                      </div>
                      <Switch
                        id="contact-subscribed"
                        checked={form.subscribed}
                        onCheckedChange={(checked) => {
                          setSaved(false);
                          setForm((current) => ({ ...current, subscribed: checked }));
                        }}
                      />
                    </div>
                    {learner ? (
                      <div className="flex items-start justify-between gap-4 rounded-[var(--radius)] border p-3">
                        <div className="space-y-1">
                          <Label htmlFor="learner-status">Learner account</Label>
                          <p className="text-xs text-muted-foreground">
                            {form.learnerStatus === "active"
                              ? "This learner can sign in to the portal."
                              : "This learner cannot sign in to the portal."}
                          </p>
                        </div>
                        <Switch
                          id="learner-status"
                          checked={form.learnerStatus === "active"}
                          onCheckedChange={(checked) => {
                            setSaved(false);
                            setForm((current) => ({
                              ...current,
                              learnerStatus: checked ? "active" : "deactivated",
                            }));
                          }}
                        />
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Tags</CardTitle>
                  <CardDescription>
                    Use tags to organize contacts and target segments.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <TagEditor
                    tags={form.tags}
                    options={tagOptions}
                    onAdd={(tag) => {
                      setSaved(false);
                      setForm((current) =>
                        current.tags.includes(tag)
                          ? current
                          : { ...current, tags: [...current.tags, tag] },
                      );
                    }}
                    onRemove={(tag) => {
                      setSaved(false);
                      setForm((current) => ({
                        ...current,
                        tags: current.tags.filter((item) => item !== tag),
                      }));
                    }}
                  />
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button type="submit" disabled={saving || !hasChanges}>
                  {saving ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </form>

            <Card className="border-destructive/40">
              <CardHeader>
                <CardTitle className="text-destructive">Danger zone</CardTitle>
                <CardDescription>
                  Removing a contact takes them out of this school&apos;s mailing
                  audience.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={deleting}
                  onClick={() => void deleteContact()}
                >
                  <Trash2 className="size-4" />
                  {deleting ? "Removing…" : "Remove contact"}
                </Button>
              </CardContent>
            </Card>
          </>
        ) : null}
      </main>
    </AuthGate>
  );
}
