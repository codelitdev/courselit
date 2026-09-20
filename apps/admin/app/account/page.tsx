"use client";

import { ImageUploadDialog, type SelectedImage } from "@frontlit/media-uploader";
import { Camera, Check, Trash2 } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { AuthGate } from "@/components/auth-gate";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/codelit/button";
import { Input } from "@/components/ui/codelit/input";
import { Label } from "@/components/ui/codelit/label";
import {
  type CourseLitMedia,
  filterCourseLitMediaAdapters,
  mediaMatchesAcceptedTypes,
  useCourseLitMediaUploader,
} from "@/lib/course-media-uploader";

const PROFILE_PHOTO_ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];

interface AccountUser {
  id?: string;
  email: string;
  name?: string | null;
  image?: string | null;
}

export default function AccountPage() {
  const [account, setAccount] = useState<AccountUser | null>(null);
  const [name, setName] = useState("");
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"success" | "error" | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const initialValuesRef = useRef<{ name: string; image: string | null }>({
    name: "",
    image: null,
  });

  const mediaAdapters = useCourseLitMediaUploader({
    schoolId: schoolId ?? "",
    purpose: "learner_avatar",
    accessPolicy: "public",
  });
  const filteredMediaAdapters = filterCourseLitMediaAdapters(
    mediaAdapters,
    PROFILE_PHOTO_ACCEPTED_TYPES,
  );

  useEffect(() => {
    fetch("/api/auth/get-session", { cache: "no-store", credentials: "include" })
      .then(async (response) => {
        if (!response.ok) return null;
        const data = (await response.json()) as { user?: AccountUser };
        return data.user ?? null;
      })
      .then((user) => {
        if (user) {
          setAccount(user);
          setName(user.name ?? "");
          setAvatarSrc(user.image ?? null);
          initialValuesRef.current = {
            name: user.name ?? "",
            image: user.image ?? null,
          };
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void fetch("/api/v1/schools", { cache: "no-store", credentials: "include" })
      .then((response) => (response.ok ? response.json() : { items: [] }))
      .then((body: { items?: Array<{ id: string; selected?: boolean }> }) => {
        const selected = body.items?.find((item) => item.selected) ?? body.items?.[0];
        if (selected) setSchoolId(selected.id);
      })
      .catch(() => {});
  }, []);

  function selectPhoto(selected: SelectedImage<CourseLitMedia>) {
    if (!selected.media) {
      setErrorMessage("Profile photos must be stored in the media library.");
      setSaveStatus("error");
      return;
    }
    if (!mediaMatchesAcceptedTypes(selected.media, PROFILE_PHOTO_ACCEPTED_TYPES)) {
      setErrorMessage("Profile photos must be PNG, JPEG, or WebP images.");
      setSaveStatus("error");
      return;
    }
    setAvatarSrc(selected.media.canonicalUrl);
    setSaveStatus(null);
    setErrorMessage(null);
    setPhotoDialogOpen(false);
  }

  function handleRemovePhoto() {
    setAvatarSrc(null);
  }

  async function handleSaveProfile(e: FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage("Please enter your name.");
      setSaveStatus("error");
      return;
    }

    setIsSaving(true);
    setSaveStatus(null);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/auth/update-user", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: trimmedName,
          image: avatarSrc,
        }),
      });

      if (!response.ok) {
        throw new Error("Unable to save profile changes.");
      }

      initialValuesRef.current = {
        name: trimmedName,
        image: avatarSrc,
      };

      setAccount((prev) =>
        prev ? { ...prev, name: trimmedName, image: avatarSrc } : prev,
      );

      setSaveStatus("success");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to update profile.");
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
    }
  }

  const hasChanges =
    name !== initialValuesRef.current.name ||
    avatarSrc !== initialValuesRef.current.image;

  const initials = (name || account?.email || "U").slice(0, 1).toUpperCase();

  return (
    <AuthGate>
      <div className="page-shell">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Account</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your profile details and preferences.
          </p>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            Loading profile…
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Display picture card */}
              <Card className="w-full lg:w-1/3">
                <CardHeader>
                  <CardTitle>Display picture</CardTitle>
                  <CardDescription>
                    Your public photo visible to teammates.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-4 text-center">
                  <Avatar className="size-28 ring-2 ring-border/60">
                    {avatarSrc ? <AvatarImage src={avatarSrc} alt={name} /> : null}
                    <AvatarFallback className="text-xl font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <ImageUploadDialog<CourseLitMedia>
                      {...filteredMediaAdapters}
                      open={photoDialogOpen}
                      onOpenChange={setPhotoDialogOpen}
                      title="Select profile photo"
                      acceptedTypes={PROFILE_PHOTO_ACCEPTED_TYPES}
                      maxUploadBytes={2 * 1024 * 1024}
                      allowUnsplash={false}
                      metadataMode="alt"
                      onSelect={selectPhoto}
                    >
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setErrorMessage(null)}
                        disabled={!schoolId}
                      >
                        <Camera className="size-3.5 mr-1.5" />
                        Change photo
                      </Button>
                    </ImageUploadDialog>
                    {avatarSrc && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRemovePhoto}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="size-3.5 mr-1.5" />
                        Remove
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG or WebP. Max 2MB.
                  </p>
                </CardContent>
              </Card>

              {/* Details card */}
              <Card className="w-full lg:w-2/3">
                <form onSubmit={handleSaveProfile}>
                  <CardHeader>
                    <CardTitle>Details</CardTitle>
                    <CardDescription>Update your personal information.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="account-email">Email</Label>
                      <Input
                        id="account-email"
                        type="email"
                        value={account?.email ?? ""}
                        disabled
                        readOnly
                      />
                      <p className="text-xs text-muted-foreground">
                        Your email address is managed through authentication and cannot
                        be changed.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="account-name">Name</Label>
                      <Input
                        id="account-name"
                        type="text"
                        required
                        placeholder="Your full name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>

                    {saveStatus === "success" && (
                      <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        <Check className="size-4" />
                        Profile updated successfully.
                      </div>
                    )}

                    {saveStatus === "error" && errorMessage && (
                      <p role="alert" className="text-xs font-medium text-destructive">
                        {errorMessage}
                      </p>
                    )}
                  </CardContent>
                  <CardFooter className="flex justify-end">
                    <Button type="submit" disabled={isSaving || !hasChanges}>
                      {isSaving ? "Saving…" : "Save changes"}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </div>
          </div>
        )}
      </div>
    </AuthGate>
  );
}
