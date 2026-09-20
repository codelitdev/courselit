"use client";

import { ImageUploadDialog, type SelectedImage } from "@frontlit/media-uploader";
import { Camera, LogOut, Trash2 } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { LearnerAccountTabs } from "@/components/account/learner-account-tabs";
import {
  requestJson,
  useLearnerSession,
} from "@/components/communities/learner-community";
import { LearnerShell } from "@/components/layout/learner-shell";
import {
  LearnerButton as Button,
  LearnerAvatar,
  LearnerAvatarFallback,
  LearnerAvatarImage,
  LearnerHeader1,
  LearnerHeader2,
  LearnerInput,
  LearnerLabel,
  LearnerText2,
  LearnerTextarea,
  LearnerCard as PageCard,
  LearnerCardContent as PageCardContent,
} from "@/components/themed-page-builder";
import { authClient } from "@/lib/auth-client";
import {
  type LearnerAvatarMedia,
  useLearnerProfileMediaUploader,
} from "@/lib/profile-media-uploader";
import { clearSchoolId } from "@/lib/school";

type LearnerProfile = {
  name: string;
  avatarMediaId: string | null;
  image: string | null;
  bio: string;
};

const PROFILE_PHOTO_ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];

function initialsFor(profile: LearnerProfile, email: string) {
  const source = profile.name.trim() || email;
  return source.slice(0, 1).toUpperCase() || "L";
}

export default function AccountPage() {
  const { learner, checking } = useLearnerSession("/dashboard/account/profile");
  const [signingOut, setSigningOut] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarMediaId, setAvatarMediaId] = useState<string | null>(null);
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);
  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);
  const mediaAdapters = useLearnerProfileMediaUploader();

  useEffect(() => {
    if (!learner) return;
    setName(learner.name);
    setBio(learner.bio);
    setAvatarMediaId(learner.avatarMediaId);
    setAvatarSrc(learner.image);
    setProfile({
      name: learner.name,
      avatarMediaId: learner.avatarMediaId,
      image: learner.image,
      bio: learner.bio,
    });
    setNameError(null);
    setProfileSaved(false);
  }, [learner]);

  async function savePhoto(
    nextAvatarMediaId: string | null,
    nextAvatarSrc: string | null,
    previous: { avatarMediaId: string | null; image: string | null },
  ) {
    const nextName = name.trim();
    if (!nextName) {
      setPhotoError("Enter your name before changing your photo.");
      setAvatarMediaId(previous.avatarMediaId);
      setAvatarSrc(previous.image);
      return;
    }

    setSavingPhoto(true);
    setPhotoError(null);
    try {
      const updated = await requestJson<LearnerProfile>("/api/v1/learner/me", {
        method: "PATCH",
        body: JSON.stringify({
          name: nextName,
          avatarMediaId: nextAvatarMediaId,
          image: nextAvatarSrc,
        }),
      });
      setName(updated.name);
      setAvatarMediaId(updated.avatarMediaId);
      setAvatarSrc(updated.image);
      setBio(updated.bio);
      setProfile(updated);
    } catch (error) {
      setAvatarMediaId(previous.avatarMediaId);
      setAvatarSrc(previous.image);
      setPhotoError(
        error instanceof Error ? error.message : "Unable to update your photo.",
      );
    } finally {
      setSavingPhoto(false);
    }
  }

  async function selectPhoto(selected: SelectedImage<LearnerAvatarMedia>) {
    if (!selected.media) {
      setPhotoError("Select an uploaded image.");
      return;
    }
    const previous = { avatarMediaId, image: avatarSrc };
    setAvatarMediaId(selected.media.id);
    setAvatarSrc(selected.media.url);
    setPhotoError(null);
    setPhotoDialogOpen(false);
    await savePhoto(selected.media.id, selected.media.url, previous);
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextName = name.trim();
    if (!nextName) {
      setNameError("Enter your name.");
      setProfileSaved(false);
      return;
    }

    setSavingName(true);
    setNameError(null);
    setProfileSaved(false);
    try {
      const updated = await requestJson<LearnerProfile>("/api/v1/learner/me", {
        method: "PATCH",
        body: JSON.stringify({
          name: nextName,
          avatarMediaId,
          image: avatarSrc,
          bio,
        }),
      });
      setName(updated.name);
      setAvatarMediaId(updated.avatarMediaId);
      setBio(updated.bio);
      setAvatarSrc(updated.image);
      setProfile(updated);
      setProfileSaved(true);
    } catch (error) {
      setNameError(
        error instanceof Error ? error.message : "Unable to update your name.",
      );
    } finally {
      setSavingName(false);
    }
  }

  async function signOut() {
    setSigningOut(true);
    await Promise.allSettled([
      authClient.signOut(),
      fetch("/api/v1/learner/auth/sign-out", {
        method: "POST",
        credentials: "include",
      }),
    ]);
    clearSchoolId();
    window.location.href = "/";
  }

  if (checking) {
    return (
      <main className="flex min-h-[400px] items-center justify-center p-6">
        <LearnerText2>Loading account…</LearnerText2>
      </main>
    );
  }

  if (!learner) return null;

  const currentProfile = profile ?? {
    name,
    avatarMediaId,
    image: avatarSrc,
    bio,
  };
  const hasChanges =
    currentProfile.name !== name ||
    currentProfile.avatarMediaId !== avatarMediaId ||
    currentProfile.image !== avatarSrc ||
    currentProfile.bio !== bio;

  return (
    <LearnerShell user={{ ...learner, ...currentProfile }} headerTitle="Account">
      <main className="grid gap-7">
        <header>
          <LearnerText2 className="text-muted-foreground">Learner account</LearnerText2>
          <LearnerHeader1>Account</LearnerHeader1>
          <LearnerText2 className="mt-2 text-muted-foreground">
            Manage the profile information shown to other learners.
          </LearnerText2>
        </header>
        <LearnerAccountTabs />

        <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <PageCard aria-labelledby="display-picture-title">
            <PageCardContent className="grid justify-items-center gap-5 text-center">
              <div>
                <LearnerText2 className="text-muted-foreground">
                  Display picture
                </LearnerText2>
                <LearnerHeader2 id="display-picture-title">
                  Your profile photo
                </LearnerHeader2>
                <LearnerText2 className="mt-2 text-muted-foreground">
                  Your public photo visible to other learners.
                </LearnerText2>
              </div>
              <LearnerAvatar className="size-28">
                {avatarSrc ? <LearnerAvatarImage src={avatarSrc} alt={name} /> : null}
                <LearnerAvatarFallback>
                  {initialsFor(currentProfile, learner.email)}
                </LearnerAvatarFallback>
              </LearnerAvatar>
              <ImageUploadDialog<LearnerAvatarMedia>
                {...mediaAdapters}
                open={photoDialogOpen}
                onOpenChange={setPhotoDialogOpen}
                title="Select profile photo"
                allowExistingMedia={false}
                acceptedTypes={PROFILE_PHOTO_ACCEPTED_TYPES}
                maxUploadBytes={2 * 1024 * 1024}
                allowUnsplash={false}
                metadataMode="alt"
                onSelect={selectPhoto}
              >
                <Button
                  type="button"
                  variant="outline"
                  disabled={savingPhoto}
                  onClick={() => setPhotoError(null)}
                >
                  <Camera />
                  {savingPhoto ? "Saving…" : "Change photo"}
                </Button>
              </ImageUploadDialog>
              <LearnerText2 className="text-xs text-muted-foreground">
                JPG, PNG or WebP. Max 2MB.
              </LearnerText2>
              {avatarSrc ? (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={savingPhoto}
                  onClick={() => {
                    const previous = { avatarMediaId, image: avatarSrc };
                    setAvatarMediaId(null);
                    setAvatarSrc(null);
                    void savePhoto(null, null, previous);
                  }}
                >
                  <Trash2 />
                  Remove photo
                </Button>
              ) : null}
              {photoError ? (
                <LearnerText2 className="text-destructive">{photoError}</LearnerText2>
              ) : null}
            </PageCardContent>
          </PageCard>

          <PageCard aria-labelledby="profile-title">
            <PageCardContent className="grid gap-5">
              <div>
                <LearnerText2 className="text-muted-foreground">Details</LearnerText2>
                <LearnerHeader2 id="profile-title">Your learner profile</LearnerHeader2>
                <LearnerText2 className="mt-2 text-muted-foreground">
                  Update the personal information shown in your learner account.
                </LearnerText2>
              </div>
              <form
                className="grid gap-4"
                onSubmit={(event) => void saveProfile(event)}
              >
                <LearnerLabel>
                  Email
                  <LearnerInput readOnly value={learner.email} />
                </LearnerLabel>
                <LearnerLabel>
                  Name
                  <LearnerInput
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value);
                      setProfileSaved(false);
                      setNameError(null);
                    }}
                    maxLength={200}
                    autoComplete="name"
                  />
                </LearnerLabel>
                <LearnerLabel>
                  Bio
                  <LearnerTextarea
                    rows={4}
                    placeholder="A brief bio about yourself…"
                    value={bio}
                    onChange={(event) => {
                      setBio(event.target.value);
                      setProfileSaved(false);
                      setNameError(null);
                    }}
                    maxLength={2_000}
                  />
                </LearnerLabel>
                <div className="flex flex-wrap items-center gap-3">
                  <Button type="submit" disabled={savingName || !hasChanges}>
                    {savingName ? "Saving…" : "Save changes"}
                  </Button>
                  {profileSaved ? (
                    <LearnerText2 className="text-muted-foreground">
                      Profile updated.
                    </LearnerText2>
                  ) : null}
                  {nameError ? (
                    <LearnerText2 className="text-destructive">
                      {nameError}
                    </LearnerText2>
                  ) : null}
                </div>
              </form>
            </PageCardContent>
          </PageCard>
        </div>

        <PageCard aria-labelledby="account-actions-title">
          <PageCardContent className="grid gap-5">
            <div>
              <LearnerText2 className="text-muted-foreground">Session</LearnerText2>
              <LearnerHeader2 id="account-actions-title">
                Stay in control
              </LearnerHeader2>
              <LearnerText2 className="mt-2 text-muted-foreground">
                Sign out of this learner session when you are finished.
              </LearnerText2>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={signingOut}
                onClick={() => void signOut()}
              >
                <LogOut />
                {signingOut ? "Signing out…" : "Log out"}
              </Button>
            </div>
          </PageCardContent>
        </PageCard>
      </main>
    </LearnerShell>
  );
}
