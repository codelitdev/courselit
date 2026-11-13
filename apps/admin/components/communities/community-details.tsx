"use client";

import type { MediaRef } from "@courselit/api-contract";
import { ExternalLink, LayoutTemplate, Monitor, Smartphone } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useUnsavedChangesWarning } from "@/components/mails/unsaved-changes";
import { PaymentPlanList } from "@/components/products/payment-plan-list";
import { RichTextEditor } from "@/components/products/rich-text-editor";
import { Button } from "@/components/ui/codelit/button";
import { Input } from "@/components/ui/codelit/input";
import { Switch } from "@/components/ui/codelit/switch";
import { bannerSwitchUpdate, communityDetailsDirty } from "@/lib/community-details";
import { cn } from "@/lib/utils";
import { CommunityFeaturedImage } from "./community-featured-image";
import { CommunityHomePreview } from "./community-previews";
import { WhoGetsIn } from "./community-setup";
import {
  type Community,
  CommunityCard,
  communityEditorContent,
  communityPagePath,
  communityPlainText,
  type CommunityRequest,
  errorMessage,
  type Post,
  type School,
  type StorefrontPlan,
} from "./community-shared";

export function CommunityDetails({
  school,
  community,
  setCommunity,
  plans,
  setPlans,
  request,
  address,
  salesPageUrl,
  salesPageEditorHref,
  setNotice,
}: {
  school: School;
  community: Community;
  setCommunity: (community: Community) => void;
  plans: StorefrontPlan[];
  setPlans: (plans: StorefrontPlan[]) => void;
  request: CommunityRequest;
  address: string;
  salesPageUrl: string | null;
  salesPageEditorHref: string | null;
  setNotice: (value: string | null) => void;
}) {
  const [name, setName] = useState(community.name);
  const [description, setDescription] = useState(community.description);
  const [banner, setBanner] = useState(community.banner);
  const [bannerOn, setBannerOn] = useState(Boolean(communityPlainText(community.banner)));
  const [autoAcceptMembers, setAutoAcceptMembers] = useState(community.autoAcceptMembers);
  const [joiningReasonText, setJoiningReasonText] = useState(community.joiningReasonText);
  const [editorKey, setEditorKey] = useState(0);
  const [posts, setPosts] = useState<Post[]>([]);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  /** The card or control being saved, so only its buttons wait. */
  const [saving, setSaving] = useState<
    "details" | "banner" | "question" | "image" | "bannerSwitch" | "autoAccept" | null
  >(null);

  useEffect(() => {
    let active = true;
    void request<{ items?: Post[] }>(
      communityPagePath(`/api/v1/communities/${encodeURIComponent(community.id)}/posts`),
    )
      .then((body) => {
        if (active) setPosts(body.items ?? []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [community.id, request]);

  const dirty = communityDetailsDirty(community, {
    name,
    description,
    banner,
    bannerOn,
    joiningReasonText,
  });
  useUnsavedChangesWarning(dirty.any);

  async function update(
    key: NonNullable<typeof saving>,
    body: Partial<
      Pick<
        Community,
        | "name"
        | "description"
        | "banner"
        | "autoAcceptMembers"
        | "joiningReasonText"
        | "featuredImage"
      >
    >,
    done: string,
  ): Promise<Community | null> {
    if (saving) return null;
    setSaving(key);
    try {
      const updated = await request<Community>(`/api/v1/communities/${community.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setCommunity({ ...updated, salesPage: community.salesPage });
      setNotice(done);
      return updated;
    } catch (caught) {
      toast.error(errorMessage(caught, "Unable to save the change."));
      return null;
    } finally {
      setSaving(null);
    }
  }

  async function saveDetails() {
    if (!dirty.details || !name.trim()) return;
    const updated = await update(
      "details",
      { name: name.trim(), description },
      "Details saved.",
    );
    if (updated) setName(updated.name);
  }

  function discardDetails() {
    setName(community.name);
    setDescription(community.description);
    setEditorKey((key) => key + 1);
  }

  async function saveBanner() {
    if (!dirty.banner) return;
    const updated = await update("banner", { banner }, "Welcome banner saved.");
    if (updated) setBanner(updated.banner);
  }

  function discardBanner() {
    setBanner(community.banner);
    setEditorKey((key) => key + 1);
  }

  async function switchBanner(on: boolean) {
    const body = bannerSwitchUpdate(on, community.banner);
    if (!body) {
      setBannerOn(on);
      return;
    }
    // Keep the text on screen so switching back on brings it back to edit.
    if (await update("bannerSwitch", body, "Welcome banner removed.")) {
      setBannerOn(false);
    }
  }

  async function changeAutoAccept(value: boolean) {
    if (value === community.autoAcceptMembers) return;
    const previous = autoAcceptMembers;
    setAutoAcceptMembers(value);
    const updated = await update(
      "autoAccept",
      { autoAcceptMembers: value },
      value ? "Everyone who joins gets in." : "New members now need your approval.",
    );
    if (!updated) setAutoAcceptMembers(previous);
  }

  async function saveQuestion() {
    if (!dirty.question) return;
    await update("question", { joiningReasonText }, "Question saved.");
  }

  function discardQuestion() {
    setJoiningReasonText(community.joiningReasonText);
  }

  function changeFeaturedImage(selection: MediaRef | null) {
    void update(
      "image",
      { featuredImage: selection },
      selection ? "Featured image saved." : "Featured image removed.",
    );
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-5">
        <section className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
          <div className="field">
            <label htmlFor="community-name">Community name</label>
            <Input
              id="community-name"
              required
              maxLength={200}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Community name"
            />
          </div>
          <CommunityFeaturedImage
            school={school}
            value={community.featuredImage}
            disabled={saving === "image"}
            onChange={changeFeaturedImage}
          />
          <div className="field">
            <span className="font-medium">Description</span>
            <RichTextEditor
              key={`description-${editorKey}`}
              school={school}
              purpose="community_content"
              initialContent={communityEditorContent(description)}
              refresh={Date.parse(community.updatedAt) + editorKey}
              onChange={(document) => setDescription(JSON.stringify(document))}
              showToolbar={false}
              placeholder="What will members get out of joining?"
              className="rounded-md border bg-card"
              editorClassName="min-h-[140px]"
            />
          </div>
          {salesPageEditorHref ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/40 px-4 py-3 text-sm">
              <p className="flex min-w-0 flex-1 items-start gap-2 text-muted-foreground">
                <LayoutTemplate className="mt-0.5 size-4 shrink-0" />
                <span>
                  These details headline your community&apos;s sales page.{" "}
                  Add testimonials, FAQs or a video around this block in the page
                  editor.
                </span>
              </p>
              <Button asChild variant="outline" size="sm">
                <Link href={salesPageEditorHref}>Edit sales page</Link>
              </Button>
            </div>
          ) : null}
          <SaveRow
            dirty={dirty.details}
            saving={saving === "details"}
            canSave={Boolean(name.trim())}
            label="Save details"
            onDiscard={discardDetails}
            onSave={() => void saveDetails()}
          />
        </section>
        <CommunityCard
          title="Welcome banner"
          description="Pinned to the top of Home, where members land after joining."
          action={
            <Switch
              checked={bannerOn}
              disabled={saving === "bannerSwitch"}
              onCheckedChange={(on) => void switchBanner(on)}
              aria-label="Show welcome banner"
            />
          }
        >
          {bannerOn ? (
            <div className="field">
              <span className="font-medium">Message</span>
              <RichTextEditor
                key={`banner-${editorKey}`}
                school={school}
                purpose="community_content"
                initialContent={communityEditorContent(banner)}
                refresh={Date.parse(community.updatedAt) + editorKey}
                onChange={(document) => setBanner(JSON.stringify(document))}
                showToolbar={false}
                placeholder="Welcome! Introduce yourself in General, then share one thing you are working on."
                className="rounded-md border bg-card"
                editorClassName="min-h-[88px]"
              />
              <p className="text-xs text-muted-foreground">
                Change it for launches, events or breaks. Members see the newest version.
              </p>
              <SaveRow
                dirty={dirty.banner}
                saving={saving === "banner"}
                label="Save message"
                onDiscard={discardBanner}
                onSave={() => void saveBanner()}
              />
            </div>
          ) : null}
        </CommunityCard>
        <CommunityCard title="Who gets in">
          <WhoGetsIn
            autoAcceptMembers={autoAcceptMembers}
            onAutoAcceptChange={(value) => void changeAutoAccept(value)}
            joiningReasonText={joiningReasonText}
            onJoiningReasonTextChange={setJoiningReasonText}
          />
          {!autoAcceptMembers ? (
            <SaveRow
              dirty={dirty.question}
              saving={saving === "question"}
              label="Save question"
              onDiscard={discardQuestion}
              onSave={() => void saveQuestion()}
            />
          ) : null}
        </CommunityCard>
        <PaymentPlanList
          listPath={`/api/v1/communities/${encodeURIComponent(community.id)}/plans`}
          createPath={`/api/v1/communities/${encodeURIComponent(community.id)}/plans`}
          planPath={(planId) => `/api/v1/community-plans/${encodeURIComponent(planId)}`}
          defaultPath={(planId) =>
            `/api/v1/community-plans/${encodeURIComponent(planId)}/default`
          }
          archivePath={(planId) =>
            `/api/v1/community-plans/${encodeURIComponent(planId)}/archive`
          }
          school={school}
          plans={plans}
          request={request}
          onChanged={setPlans}
          title="Plans"
          description="Several can be active at once. The starred plan is shown first. Archiving stops new sign-ups; current members keep their access and price."
          entityLabel="community"
        />
      </div>
      <div className="space-y-3 lg:sticky lg:top-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium">
            Preview
          </p>
          <div className="flex items-center gap-2">
            {salesPageUrl ? (
              <Button asChild variant="ghost" size="sm">
                <a href={salesPageUrl} target="_blank" rel="noreferrer">
                  <ExternalLink /> Open sales page
                </a>
              </Button>
            ) : null}
            <div className="inline-flex rounded-lg bg-muted p-1" role="group" aria-label="Preview size">
              {(
                [
                  ["desktop", Monitor, "Desktop preview"],
                  ["mobile", Smartphone, "Mobile preview"],
                ] as const
              ).map(([value, Icon, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-label={label}
                  aria-pressed={device === value}
                  onClick={() => setDevice(value)}
                  className={cn(
                    "rounded-md px-2 py-1",
                    device === value
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground",
                  )}
                >
                  <Icon className="size-4" />
                </button>
              ))}
            </div>
          </div>
        </div>
        <CommunityHomePreview
          schoolName={school.name}
          address={address.replace(/\/join$/, "/dashboard")}
          community={{ name, categories: community.categories }}
          banner={bannerOn ? banner : ""}
          posts={posts}
          device={device}
        />
        <p className="text-center text-xs text-muted-foreground">
          A sample of Home, where members land after joining. The sales page is edited
          in the page editor.
        </p>
      </div>
    </div>
  );
}

/**
 * A card's own save controls, shown once its text is edited, the same as
 * product settings: switches and choices elsewhere save immediately.
 */
function SaveRow({
  dirty,
  saving,
  canSave = true,
  label,
  onDiscard,
  onSave,
}: {
  dirty: boolean;
  saving: boolean;
  canSave?: boolean;
  label: string;
  onDiscard: () => void;
  onSave: () => void;
}) {
  if (!dirty) return null;
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-4">
      <span className="mr-auto text-sm text-muted-foreground">
        You have unsaved changes.
      </span>
      <Button type="button" variant="ghost" onClick={onDiscard} disabled={saving}>
        Discard
      </Button>
      <Button type="button" onClick={onSave} disabled={saving || !canSave}>
        {saving ? "Saving…" : label}
      </Button>
    </div>
  );
}
