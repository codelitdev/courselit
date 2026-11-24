"use client";

import { defaultTemplateEmail, EmailPreview } from "@sendlit/email-blocks";
import { marketingPreviewContext } from "@sendlit/email-blocks/footer";
import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { CourseLitLoading } from "@/components/loading";
import { Button } from "@/components/ui/codelit/button";
import { Input } from "@/components/ui/codelit/input";
import { FieldBlock, Hint } from "@/components/ui/codelit/onboarding-ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/codelit/select";
import { MARKETING_EMAIL_BLOCKS } from "@/lib/email-editor-blocks";
import { isMailingAddressMissing } from "@/lib/email-readiness";
import {
  addressPreview,
  COUNTRIES,
  countryFromLocale,
  draftFromPostalAddress,
  type MailingAddressDraft,
  type MailingAddressErrors,
  type PostalAddress,
  postalAddressFromDraft,
  validateMailingAddress,
} from "@/lib/mailing-address";

/** The school's mail settings, as `GET /api/v1/school/mails/settings` returns them. */
export type MailingSettings = {
  postalAddress: PostalAddress | null;
};

type SettingsState =
  | { status: "loading" }
  | { status: "ready"; settings: MailingSettings | null };

/** Loads the school's mail settings; `settings` is null when they can't be read. */
export function useMailingSettings(schoolId: string | null) {
  const [state, setState] = useState<SettingsState>({ status: "loading" });

  useEffect(() => {
    if (!schoolId) return;
    let active = true;
    setState({ status: "loading" });
    void fetch("/api/v1/school/mails/settings", {
      credentials: "include",
      cache: "no-store",
      headers: { "x-school-id": schoolId },
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: MailingSettings | null) => {
        if (active) setState({ status: "ready", settings: body });
      })
      .catch(() => {
        if (active) setState({ status: "ready", settings: null });
      });
    return () => {
      active = false;
    };
  }, [schoolId]);

  return [state, setState] as const;
}

/**
 * Shows "Get ready to send email" in place of a marketing screen until the
 * school has a mailing address, then the screen itself. When the settings
 * can't be read it shows the screen; the API still refuses to send.
 */
export function MailingAddressGate({
  schoolId,
  children,
}: {
  schoolId: string | null;
  children: ReactNode;
}) {
  const [state, setState] = useMailingSettings(schoolId);

  // Until the school is known, the screen shows its own loading or error state.
  if (!schoolId) return <>{children}</>;
  if (state.status === "loading") {
    return <CourseLitLoading label="Loading…" className="min-h-64" />;
  }
  if (state.settings && isMailingAddressMissing(state.settings)) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Get ready to send email"
          description="Anti-spam law requires a postal address in every marketing email. It appears in the footer of the emails you send."
        />
        <MailingAddressForm
          schoolId={schoolId}
          settings={state.settings}
          submitLabel="Save and continue"
          onSaved={(settings) => setState({ status: "ready", settings })}
        />
      </div>
    );
  }
  return <>{children}</>;
}

/** Marketing → Settings: edit the saved address. */
export function MailDeliverySettings({ schoolId }: { schoolId: string | null }) {
  const [state, setState] = useMailingSettings(schoolId);
  if (!schoolId || state.status === "loading") {
    return <CourseLitLoading label="Loading…" className="min-h-64" />;
  }
  return (
    <MailingAddressForm
      schoolId={schoolId}
      settings={state.settings}
      submitLabel="Save"
      onSaved={(settings) => setState({ status: "ready", settings })}
    />
  );
}

/**
 * The postal address form and a preview of the email footer it goes into.
 * The preview is SendLit's own render of a marketing email, so it shows the
 * address exactly as recipients will see it.
 */
export function MailingAddressForm({
  schoolId,
  settings,
  submitLabel,
  onSaved,
}: {
  schoolId: string;
  settings: MailingSettings | null;
  submitLabel: string;
  onSaved: (settings: MailingSettings) => void;
}) {
  const [address, setAddress] = useState<MailingAddressDraft>(() =>
    draftFromPostalAddress(
      settings?.postalAddress,
      countryFromLocale(typeof navigator === "undefined" ? null : navigator.language),
    ),
  );
  const [errors, setErrors] = useState<MailingAddressErrors>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const set = (key: keyof MailingAddressDraft, value: string) => {
    setSaved(false);
    setAddress((current) => ({ ...current, [key]: value }));
  };
  const previewAddress = useMemo(() => addressPreview(address), [address]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    const found = validateMailingAddress(address);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const response = await fetch("/api/v1/school/mails/settings", {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json", "x-school-id": schoolId },
        body: JSON.stringify({ postalAddress: postalAddressFromDraft(address) }),
      });
      const body = (await response.json().catch(() => null)) as
        | (MailingSettings & { message?: string })
        | null;
      if (!response.ok || !body) {
        throw new Error(body?.message || "Unable to save your mailing address.");
      }
      setSaved(true);
      onSaved(body);
    } catch (caught) {
      setSaveError(
        caught instanceof Error ? caught.message : "Unable to save your mailing address.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
      <form className="flex max-w-2xl flex-col gap-4" onSubmit={(event) => void save(event)}>
        <FieldBlock label="Street address" htmlFor="mail-line1" error={errors.line1}>
          <Input
            id="mail-line1"
            autoComplete="address-line1"
            value={address.line1}
            disabled={saving}
            aria-invalid={Boolean(errors.line1)}
            onChange={(event) => set("line1", event.target.value)}
          />
        </FieldBlock>
        <FieldBlock label="Address line 2" htmlFor="mail-line2" aside="Optional">
          <Input
            id="mail-line2"
            autoComplete="address-line2"
            placeholder="Apartment, suite, unit or building"
            value={address.line2}
            disabled={saving}
            onChange={(event) => set("line2", event.target.value)}
          />
        </FieldBlock>
        <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
          <FieldBlock label="City" htmlFor="mail-city">
            <Input
              id="mail-city"
              autoComplete="address-level2"
              value={address.city}
              disabled={saving}
              onChange={(event) => set("city", event.target.value)}
            />
          </FieldBlock>
          <FieldBlock label="State or region" htmlFor="mail-region" aside="Optional">
            <Input
              id="mail-region"
              autoComplete="address-level1"
              value={address.region}
              disabled={saving}
              onChange={(event) => set("region", event.target.value)}
            />
          </FieldBlock>
        </div>
        <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
          <FieldBlock label="Postal code" htmlFor="mail-postal" error={errors.postalCode}>
            <Input
              id="mail-postal"
              autoComplete="postal-code"
              value={address.postalCode}
              disabled={saving}
              aria-invalid={Boolean(errors.postalCode)}
              onChange={(event) => set("postalCode", event.target.value)}
            />
          </FieldBlock>
          <FieldBlock label="Country" htmlFor="mail-country">
            <Select
              value={address.country}
              onValueChange={(value) => set("country", value)}
              disabled={saving}
            >
              <SelectTrigger id="mail-country" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldBlock>
        </div>
        <Hint>
          A PO box or business address works too, if you&apos;d rather not share your
          home address.
        </Hint>
        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : submitLabel}
          </Button>
          {saved ? (
            <p className="text-sm text-muted-foreground" role="status">
              Mailing address saved.
            </p>
          ) : null}
          {saveError ? (
            <p className="text-sm text-destructive" role="alert">
              {saveError}
            </p>
          ) : null}
        </div>
      </form>
      <FooterPreview address={previewAddress} />
    </div>
  );
}

/** A marketing email rendered by SendLit, with `address` in its footer,
 * formatted by SendLit as it is in the emails that are sent. */
function FooterPreview({ address }: { address: PostalAddress | null }) {
  // Rendering is async; wait for typing to pause instead of on every key.
  const [settled, setSettled] = useState(address);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(address), 300);
    return () => clearTimeout(timer);
  }, [address]);
  const renderContext = useMemo(
    () => marketingPreviewContext({ postalAddress: settled }),
    [settled],
  );

  return (
    <aside className="flex flex-col gap-2" aria-label="Where your address appears">
      <p className="text-[13px] font-semibold">Where your address appears</p>
      <EmailPreview
        content={defaultTemplateEmail}
        blocks={MARKETING_EMAIL_BLOCKS}
        renderContext={renderContext}
        className="w-full overflow-hidden rounded-2xl border border-border"
        iframeTitle="Email footer preview"
      />
      <p className="text-[12.5px] text-muted-foreground">
        Every marketing email ends with this footer.
      </p>
    </aside>
  );
}
