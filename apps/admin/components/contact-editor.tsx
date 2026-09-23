"use client";

import { Badge } from "@codelitdev/design-system";
import { TagEditor } from "@sendlit/email-blocks";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { AuthGate } from "@/components/auth-gate";
import { CourseLitLoading } from "@/components/loading";
import { PageHeader } from "@/components/layout/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Switch } from "@/components/ui/codelit/switch";
import { hasSchoolPermission } from "@/lib/school-permissions";

type School = {
  id: string;
  permissions?: readonly string[];
};

type Contact = {
  id: string;
  schoolId: string;
  email: string;
  name: string;
  bio: string;
  avatar: { url: string; thumbnailUrl?: string | null } | null;
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

type ContactForm = {
  name: string;
  bio: string;
  status: "active" | "deactivated";
  subscribed: boolean;
  tags: string[];
};

function sameTags(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  const rightTags = new Set(right);
  return left.every((tag) => rightTags.has(tag));
}

export function ContactEditor({
  contactId,
}: {
  contactId: string;
}) {
  const router = useRouter();
  const [school, setSchool] = useState<School | null>(null);
  const [contact, setContact] = useState<Contact | null>(null);
  const [tagOptions, setTagOptions] = useState<string[]>([]);
  const [form, setForm] = useState<ContactForm>({
    name: "",
    bio: "",
    status: "active",
    subscribed: false,
    tags: [],
  });
  const initialForm = useRef<ContactForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
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
        const [contactResponse, contactsListResponse] = await Promise.all([
          fetch(`/api/v1/contacts/${encodeURIComponent(contactId)}`, {
            cache: "no-store",
            credentials: "include",
            headers,
          }),
          fetch("/api/v1/contacts?rowsPerPage=100", {
            cache: "no-store",
            credentials: "include",
            headers,
          }),
        ]);

        if (!contactResponse.ok) {
          throw new Error("Unable to load contact.");
        }

        const loadedContact = (await contactResponse.json()) as Contact;
        const contactsListBody = contactsListResponse.ok
          ? ((await contactsListResponse.json()) as { items?: Contact[] })
          : { items: [] };

        const options = new Set<string>(loadedContact.marketing?.tags ?? []);
        for (const c of contactsListBody.items ?? []) {
          for (const tag of c.marketing?.tags ?? []) options.add(tag);
        }

        if (!active) return;
        const loadedForm: ContactForm = {
          name: loadedContact.name ?? "",
          bio: loadedContact.bio ?? "",
          status: loadedContact.status === "deactivated" ? "deactivated" : "active",
          subscribed: loadedContact.marketing?.subscribed ?? false,
          tags: [...(loadedContact.marketing?.tags ?? [])],
        };
        setSchool(selected);
        setContact(loadedContact);
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
  }, [contactId]);

  const hasChanges = Boolean(
    initialForm.current &&
      (form.name.trim() !== initialForm.current.name.trim() ||
        form.bio.trim() !== initialForm.current.bio.trim() ||
        form.status !== initialForm.current.status ||
        form.subscribed !== initialForm.current.subscribed ||
        !sameTags(form.tags, initialForm.current.tags)),
  );

  async function saveContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!school || !contact || saving || !hasChanges) return;

    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const profileChanged = Boolean(
        initialForm.current &&
          (form.name.trim() !== initialForm.current.name.trim() ||
            form.bio.trim() !== initialForm.current.bio.trim() ||
            form.status !== initialForm.current.status),
      );
      const marketingChanged = Boolean(
        initialForm.current &&
          (form.subscribed !== initialForm.current.subscribed ||
            !sameTags(form.tags, initialForm.current.tags)),
      );

      let updatedContact = contact;

      if (profileChanged) {
        const response = await fetch(
          `/api/v1/contacts/${encodeURIComponent(contact.id)}`,
          {
            method: "PATCH",
            credentials: "include",
            headers: {
              "content-type": "application/json",
              "x-school-id": school.id,
            },
            body: JSON.stringify({
              name: form.name.trim(),
              bio: form.bio.trim(),
              status: form.status,
            }),
          },
        );
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as {
            message?: string;
          } | null;
          throw new Error(body?.message ?? "Unable to save contact profile.");
        }
        updatedContact = (await response.json()) as Contact;
      }

      if (marketingChanged) {
        const response = await fetch(
          `/api/v1/contacts/${encodeURIComponent(contact.id)}/marketing`,
          {
            method: "PATCH",
            credentials: "include",
            headers: {
              "content-type": "application/json",
              "x-school-id": school.id,
            },
            body: JSON.stringify({
              subscribed: form.subscribed,
              tags: form.tags,
            }),
          },
        );
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as {
            message?: string;
          } | null;
          throw new Error(body?.message ?? "Unable to save contact marketing.");
        }
        const marketingData = (await response.json()) as {
          subscribed: boolean;
          tags: string[];
        };
        updatedContact = {
          ...updatedContact,
          marketing: marketingData,
        };
      }

      const updatedForm: ContactForm = {
        name: updatedContact.name ?? "",
        bio: updatedContact.bio ?? "",
        status: updatedContact.status === "deactivated" ? "deactivated" : "active",
        subscribed: updatedContact.marketing?.subscribed ?? false,
        tags: [...(updatedContact.marketing?.tags ?? [])],
      };
      setContact(updatedContact);
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

    setDeleting(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/v1/contacts/${encodeURIComponent(contact.id)}`,
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

  const canDeleteContacts = hasSchoolPermission(school, "contacts:delete");
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
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    contact.registrationStatus === "registered"
                      ? "default"
                      : "neutral"
                  }
                >
                  {contact.registrationStatus === "registered"
                    ? "Learner"
                    : "Newsletter only"}
                </Badge>
                <Badge variant={form.subscribed ? "success" : "outline"}>
                  {form.subscribed ? "Subscribed" : "Unsubscribed"}
                </Badge>
              </div>
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
          <CourseLitLoading label="Loading contact…" className="p-12" />
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
                        {contact.avatar ? (
                          <AvatarImage
                            src={contact.avatar.thumbnailUrl ?? contact.avatar.url}
                            alt={displayName}
                          />
                        ) : null}
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
                    <div className="space-y-1.5">
                      <Label htmlFor="contact-bio">Bio</Label>
                      <Input
                        id="contact-bio"
                        value={form.bio}
                        placeholder="Learner bio or notes"
                        onChange={(event) => {
                          setSaved(false);
                          setForm((current) => ({
                            ...current,
                            bio: event.target.value,
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
                      Manage access to marketing mail and portal sign-in.
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

                    <div className="flex items-start justify-between gap-4 rounded-[var(--radius)] border p-3">
                      <div className="space-y-1">
                        <Label htmlFor="contact-status">Portal access</Label>
                        <p className="text-xs text-muted-foreground">
                          {form.status === "active"
                            ? "This contact is active and can sign in."
                            : "This contact is deactivated."}
                        </p>
                      </div>
                      <Switch
                        id="contact-status"
                        checked={form.status === "active"}
                        onCheckedChange={(checked) => {
                          setSaved(false);
                          setForm((current) => ({
                            ...current,
                            status: checked ? "active" : "deactivated",
                          }));
                        }}
                      />
                    </div>
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

            {canDeleteContacts ? (
              <Card className="border-destructive/40">
                <CardHeader>
                  <CardTitle className="text-destructive">Danger zone</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={deleting}
                    onClick={() => setRemoveDialogOpen(true)}
                  >
                    <Trash2 className="size-4" />
                    {deleting ? "Removing…" : "Remove contact"}
                  </Button>
                </CardContent>
              </Card>
            ) : null}

            <Dialog
              open={removeDialogOpen}
              onOpenChange={(open) => {
                if (!deleting) setRemoveDialogOpen(open);
              }}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Remove this contact?</DialogTitle>
                  <DialogDescription>
                    This initiates coordinated removal of the contact from the school,
                    including their profile, learning records, tags, and subscription settings.
                    This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setRemoveDialogOpen(false)}
                    disabled={deleting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => void deleteContact()}
                    disabled={deleting}
                  >
                    {deleting ? "Removing…" : "Remove contact"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        ) : null}
      </main>
    </AuthGate>
  );
}
