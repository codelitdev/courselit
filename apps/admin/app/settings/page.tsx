"use client";

import {
  Bell,
  Check,
  CheckCircle2,
  Code,
  CreditCard,
  ExternalLink,
  Globe,
  Info,
  Key,
  LogIn,
  Mail,
  Palette,
  RotateCcw,
  Save,
  Sparkles,
  Users,
} from "lucide-react";
import type { SchoolPaymentSettings } from "@courselit/api-contract";
import { PlatformTabs, PlatformTabsContent } from "@courselit/components-library";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthGate } from "@/components/auth-gate";
import { AiAssistantSettings } from "@/components/settings/ai-assistant-settings";
import { ApiKeySettings } from "@/components/settings/api-key-settings";
import { BrandingSettings } from "@/components/settings/branding-settings";
import { EmailDeliveryNotice } from "@/components/mails/email-delivery-notice";
import { LoginProviderSettings } from "@/components/settings/login-provider-settings";
import { NotificationSettings } from "@/components/settings/notification-settings";
import { TeamSettings } from "@/components/settings/team-settings";
import { CodeInjectionSettings } from "@/components/website/code-injection-settings";
import { DomainSettings } from "@/components/website/domain-settings";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/codelit/select";
import { Textarea } from "@/components/ui/codelit/textarea";
import currencies from "@/data/currencies.json";

const GENERAL_SETTINGS_TABS = ["payment", "team", "notifications", "login-providers", "api-keys", "ai-assistants"] as const;
const MAIL_SETTINGS_TABS = ["delivery"] as const;
const WEBSITE_SETTINGS_TABS = ["branding", "code-injection", "domain"] as const;
type SettingsMode = "general" | "website" | "mails";
type SettingsTab =
  | (typeof GENERAL_SETTINGS_TABS)[number]
  | (typeof MAIL_SETTINGS_TABS)[number]
  | (typeof WEBSITE_SETTINGS_TABS)[number];

const PAYMENT_METHODS = [
  { value: "stripe", label: "Stripe" },
  { value: "razorpay", label: "Razorpay" },
  { value: "lemonsqueezy", label: "Lemonsqueezy" },
] as const;

function isSettingsTab(value: string | null, mode: SettingsMode): value is SettingsTab {
  const tabs =
    mode === "website"
      ? WEBSITE_SETTINGS_TABS
      : mode === "mails"
        ? MAIL_SETTINGS_TABS
        : GENERAL_SETTINGS_TABS;
  return tabs.includes(value as never);
}

type PaymentProvider = NonNullable<SchoolPaymentSettings["provider"]>;

const PROVIDER_LABELS: Record<PaymentProvider, string> = {
  stripe: "Stripe",
  razorpay: "Razorpay",
  lemonsqueezy: "Lemon Squeezy",
};

function isPaymentProvider(value: string): value is PaymentProvider {
  return value in PROVIDER_LABELS;
}

/** Whether the saved keys are enough to register a webhook. */
function isConfigured(
  settings: SchoolPaymentSettings[PaymentProvider],
): boolean {
  if ("apiKeyConfigured" in settings) return settings.apiKeyConfigured && Boolean(settings.storeId);
  return settings.secretConfigured;
}

type SchoolItem = {
  id: string;
  name: string;
  currency: string;
  isOwner?: boolean;
  selected?: boolean;
};


export function SettingsPage({ mode = "general" }: { mode?: SettingsMode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const pathTab =
    searchParams.get("tab") ??
    (mode === "website"
      ? pathname.split("/")[3] ?? "branding"
      : mode === "mails"
        ? "delivery"
        : pathname.split("/")[2] ?? "payment");
  const selectedTab =
    isSettingsTab(pathTab, mode)
      ? pathTab
      : mode === "website"
        ? "branding"
        : mode === "mails"
          ? "delivery"
          : "payment";
  const pageDetails =
    mode === "website"
      ? {
          title: "Website settings",
          description: "Manage your website branding, domain, and code injection.",
        }
        : mode === "mails"
          ? {
              title: "Mail delivery",
              description: "Set the mailing address used to meet email compliance requirements.",
            }
          : {
              title: "Settings",
              description: "Manage payments, team access, notifications, login providers, and API keys for this school.",
            };

  function selectWebsiteTab(tab: string) {
    if (mode !== "website") return;
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "branding") params.delete("tab");
    else params.set("tab", tab);
    const query = params.toString();
    router.replace(`/website/settings${query ? `?${query}` : ""}`, { scroll: false });
  }

  function selectGeneralTab(tab: string) {
    if (mode !== "general") return;
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "payment") params.delete("tab");
    else params.set("tab", tab);
    const query = params.toString();
    router.replace(`/settings${query ? `?${query}` : ""}`, { scroll: false });
  }

  const [currency, setCurrency] = useState("USD");
  const [currencySaving, setCurrencySaving] = useState(false);
  const [currencyError, setCurrencyError] = useState<string | null>(null);
  const [currencySaved, setCurrencySaved] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [stripeKey, setStripeKey] = useState("");
  const [stripeSecret, setStripeSecret] = useState("");
  const [razorpayKey, setRazorpayKey] = useState("");
  const [razorpaySecret, setRazorpaySecret] = useState("");
  const [lemonsqueezyKey, setLemonsqueezyKey] = useState("");
  const [lemonsqueezyStoreId, setLemonsqueezyStoreId] = useState("");
  const [lemonsqueezyOneTime, setLemonsqueezyOneTime] = useState("");
  const [lemonsqueezyMonthly, setLemonsqueezyMonthly] = useState("");
  const [lemonsqueezyYearly, setLemonsqueezyYearly] = useState("");
  const [paymentSettings, setPaymentSettings] = useState<SchoolPaymentSettings | null>(null);
  const [webhookRetrying, setWebhookRetrying] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  const [mailingAddress, setMailingAddress] = useState("");
  const [mailingAddressSaving, setMailingAddressSaving] = useState(false);
  const [mailingAddressSaved, setMailingAddressSaved] = useState(false);
  const [mailingAddressError, setMailingAddressError] = useState<string | null>(null);

  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);

  const providerSettings = isPaymentProvider(paymentMethod)
    ? paymentSettings?.[paymentMethod]
    : undefined;
  const webhook = providerSettings?.webhook;
  const currencyLocked = paymentSettings?.currencyLocked === true;

  useEffect(() => {
    void fetch("/api/v1/schools", { credentials: "include", cache: "no-store" })
      .then((response) => (response.ok ? response.json() : { items: [] }))
      .then((body: { items?: SchoolItem[] }) => {
        const items = body.items ?? [];
        const selected = items.find((item) => item.selected) ?? items[0];
        if (!selected) return;
        setSchoolId(selected.id);
        setIsOwner(selected.isOwner === true);
        setCurrency(selected.currency || "USD");
        void fetch("/api/v1/school/payment-settings", {
          credentials: "include",
          cache: "no-store",
          headers: { "x-school-id": selected.id },
        })
          .then((response) => (response.ok ? response.json() : null))
          .then((settings: SchoolPaymentSettings | null) => {
            if (!settings) return;
            setPaymentSettings(settings);
            setPaymentMethod(settings.provider ?? "");
            setStripeKey(settings.stripe?.publishableKey ?? "");
            setRazorpayKey(settings.razorpay?.keyId ?? "");
            setLemonsqueezyStoreId(settings.lemonsqueezy?.storeId ?? "");
            setLemonsqueezyOneTime(settings.lemonsqueezy?.oneTimeVariantId ?? "");
            setLemonsqueezyMonthly(settings.lemonsqueezy?.monthlyVariantId ?? "");
            setLemonsqueezyYearly(settings.lemonsqueezy?.yearlyVariantId ?? "");
          })
          .catch(() => {});
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!schoolId || mode !== "mails") return;
    void fetch("/api/v1/school/mails/settings", {
      credentials: "include",
      cache: "no-store",
      headers: { "x-school-id": schoolId },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { mailingAddress?: string } | null) => {
        if (data?.mailingAddress) {
          setMailingAddress(data.mailingAddress);
        }
      })
      .catch(() => {});
  }, [mode, schoolId]);

  async function saveMailingSettings() {
    if (!schoolId || mailingAddressSaving) return;
    setMailingAddressSaving(true);
    setMailingAddressError(null);
    setMailingAddressSaved(false);
    try {
      const response = await fetch("/api/v1/school/mails/settings", {
        method: "PATCH",
        credentials: "include",
        headers: {
          "content-type": "application/json",
          "x-school-id": schoolId,
        },
        body: JSON.stringify({ mailingAddress }),
      });
      const body = (await response.json().catch(() => null)) as {
        mailingAddress?: string;
        message?: string;
      } | null;
      if (!response.ok) {
        throw new Error(body?.message ?? "Unable to save mailing settings.");
      }
      if (body?.mailingAddress !== undefined) {
        setMailingAddress(body.mailingAddress);
      }
      setMailingAddressSaved(true);
    } catch (caught) {
      setMailingAddressError(
        caught instanceof Error ? caught.message : "Unable to save mailing settings.",
      );
    } finally {
      setMailingAddressSaving(false);
    }
  }

  /** Ask the API to register the provider's webhook again. */
  async function retryWebhook() {
    if (!schoolId || !isPaymentProvider(paymentMethod) || webhookRetrying) return;
    setWebhookRetrying(true);
    try {
      const response = await fetch("/api/v1/school/payment-settings", {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json", "x-school-id": schoolId },
        body: JSON.stringify({ [paymentMethod]: {} }),
      });
      if (response.ok) setPaymentSettings((await response.json()) as SchoolPaymentSettings);
    } finally {
      setWebhookRetrying(false);
    }
  }

  async function saveCurrency() {
    if (!schoolId || currencySaving) return;
    setCurrencySaving(true);
    setCurrencyError(null);
    setCurrencySaved(false);
    try {
      const response = await fetch(`/api/v1/schools/${encodeURIComponent(schoolId)}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "content-type": "application/json",
          "x-school-id": schoolId,
        },
        body: JSON.stringify({ currency }),
      });
      const body = (await response.json().catch(() => null)) as {
        currency?: string;
        message?: string;
      } | null;
      if (!response.ok) {
        throw new Error(body?.message ?? "Unable to save the currency.");
      }
      if (body?.currency) setCurrency(body.currency);
      const paymentResponse = await fetch("/api/v1/school/payment-settings", {
        method: "PATCH",
        credentials: "include",
        headers: {
          "content-type": "application/json",
          "x-school-id": schoolId,
        },
        body: JSON.stringify({
          provider: paymentMethod || null,
          stripe: paymentMethod === "stripe" ? {
            publishableKey: stripeKey,
            secretKey: stripeSecret,
          } : undefined,
          razorpay: paymentMethod === "razorpay" ? {
            keyId: razorpayKey,
            keySecret: razorpaySecret,
          } : undefined,
          lemonsqueezy: paymentMethod === "lemonsqueezy" ? {
            apiKey: lemonsqueezyKey,
            storeId: lemonsqueezyStoreId,
            oneTimeVariantId: lemonsqueezyOneTime,
            monthlyVariantId: lemonsqueezyMonthly,
            yearlyVariantId: lemonsqueezyYearly,
          } : undefined,
        }),
      });
      if (!paymentResponse.ok) {
        const paymentBody = (await paymentResponse.json().catch(() => null)) as { message?: string } | null;
        throw new Error(paymentBody?.message ?? "Unable to save payment settings.");
      }
      setPaymentSettings((await paymentResponse.json()) as SchoolPaymentSettings);
      setCurrencySaved(true);
    } catch (caught) {
      setCurrencyError(
        caught instanceof Error ? caught.message : "Unable to save the currency.",
      );
    } finally {
      setCurrencySaving(false);
    }
  }

  async function resetPaymentMethod() {
    if (!schoolId) return;
    await fetch("/api/v1/school/payment-settings", {
      method: "PATCH",
      credentials: "include",
      headers: { "content-type": "application/json", "x-school-id": schoolId },
      body: JSON.stringify({ provider: null }),
    });
    setPaymentMethod("");
    setResetOpen(false);
  }


  return (
    <AuthGate>
      <div className="page-shell">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">{pageDetails.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{pageDetails.description}</p>
        </header>

        {mode === "website" ? (
          <PlatformTabs
            value={selectedTab}
            onValueChange={selectWebsiteTab}
            ariaLabel="Website settings"
            items={[
              { value: "branding", label: "Branding", icon: <Palette className="size-4" /> },
              { value: "code-injection", label: "Code Injection", icon: <Code className="size-4" /> },
              { value: "domain", label: "Domain", icon: <Globe className="size-4" /> },
            ]}
          >
            <PlatformTabsContent value="branding" className="w-full pt-4">
              <BrandingSettings />
            </PlatformTabsContent>
            <PlatformTabsContent value="code-injection" className="w-full pt-4">
              <CodeInjectionSettings />
            </PlatformTabsContent>
            <PlatformTabsContent value="domain" className="w-full pt-4">
              <DomainSettings />
            </PlatformTabsContent>
          </PlatformTabs>
        ) : null}

        {mode !== "website" ? (
          <PlatformTabs
            value={selectedTab}
            onValueChange={mode === "general" ? selectGeneralTab : undefined}
            ariaLabel={mode === "mails" ? "Mail settings" : "School settings"}
            items={
              mode === "mails"
                ? [{ value: "delivery", label: "Mail delivery", icon: <Mail className="size-4" /> }]
                : [
                    { value: "payment", label: "Payments", icon: <CreditCard className="size-4" /> },
                    { value: "team", label: "Team", icon: <Users className="size-4" /> },
                    {
                      value: "notifications",
                      label: "Notifications",
                      icon: <Bell className="size-4" />,
                    },
                    {
                      value: "login-providers",
                      label: "Login providers",
                      icon: <LogIn className="size-4" />,
                    },
                    // API keys belong to the school; only its owner manages them.
                    ...(isOwner
                      ? [{ value: "api-keys", label: "API keys", icon: <Key className="size-4" /> }]
                      : []),
                    {
                      value: "ai-assistants",
                      label: (
                        <span className="inline-flex items-center gap-2">
                          AI assistants
                          <span className="rounded-full bg-[var(--primary-soft)] px-1.5 py-0.5 font-mono text-[10.5px] font-semibold leading-none text-primary">
                            New
                          </span>
                        </span>
                      ),
                      icon: <Sparkles className="size-4" />,
                    },
                  ]
            }
          >
          <PlatformTabsContent value="payment" className="w-full">
          {mode === "general" && selectedTab === "payment" ? (
            <div className="space-y-6 pt-4">
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                void saveCurrency();
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="settings-currency">Currency</Label>
                <Select
                  value={currency}
                  disabled={currencyLocked}
                  onValueChange={(value) => {
                    setCurrency(value);
                    setCurrencyError(null);
                    setCurrencySaved(false);
                  }}
                >
                  <SelectTrigger id="settings-currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((item) => (
                      <SelectItem key={item.isoCode} value={item.isoCode}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {currencyLocked ? (
                  <p className="text-xs text-muted-foreground">
                    Your school has taken payments, so its currency can no longer be
                    changed.
                  </p>
                ) : null}
                {paymentMethod === "lemonsqueezy" ? (
                  <p className="text-xs text-destructive">
                    The currency selected will not be applied during checkout. Set your
                    desired currency in your LemonSqueezy dashboard.
                  </p>
                ) : null}
              </div>
              <div className="flex items-end gap-2">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Label htmlFor="settings-payment-method">Payment Method</Label>
                  <Select
                    value={paymentMethod || "none"}
                    onValueChange={(value) =>
                      setPaymentMethod(value === "none" ? "" : value)
                    }
                  >
                    <SelectTrigger id="settings-payment-method">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {PAYMENT_METHODS.map((method) => (
                        <SelectItem key={method.value} value={method.value}>
                          {method.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!paymentMethod}
                  onClick={() => setResetOpen(true)}
                  title="Clear the current payment method and keep saved gateway credentials"
                >
                  <RotateCcw className="size-4" />
                  Reset
                </Button>
              </div>
              {paymentMethod === "stripe" ? (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="stripe-key">Stripe Publishable Key</Label>
                    <Input
                      id="stripe-key"
                      value={stripeKey}
                      onChange={(event) => setStripeKey(event.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="stripe-secret">Stripe Secret Key</Label>
                    <Input
                      id="stripe-secret"
                      type="password"
                      autoComplete="off"
                      value={stripeSecret}
                      onChange={(event) => setStripeSecret(event.target.value)}
                    />
                  </div>
                </>
              ) : null}
              {paymentMethod === "razorpay" ? (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="razorpay-key">Razorpay Key</Label>
                    <Input
                      id="razorpay-key"
                      value={razorpayKey}
                      onChange={(event) => setRazorpayKey(event.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="razorpay-secret">Razorpay Secret Key</Label>
                    <Input
                      id="razorpay-secret"
                      type="password"
                      autoComplete="off"
                      value={razorpaySecret}
                      onChange={(event) => setRazorpaySecret(event.target.value)}
                    />
                  </div>
                </>
              ) : null}
              {paymentMethod === "lemonsqueezy" ? (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="ls-key">Lemonsqueezy Key</Label>
                    <Input
                      id="ls-key"
                      value={lemonsqueezyKey}
                      onChange={(event) => setLemonsqueezyKey(event.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ls-store">Lemonsqueezy Store ID</Label>
                    <Input
                      id="ls-store"
                      value={lemonsqueezyStoreId}
                      onChange={(event) => setLemonsqueezyStoreId(event.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ls-onetime">One time variant ID</Label>
                    <Input
                      id="ls-onetime"
                      value={lemonsqueezyOneTime}
                      onChange={(event) => setLemonsqueezyOneTime(event.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ls-monthly">
                      Subscription (Monthly) variant ID
                    </Label>
                    <Input
                      id="ls-monthly"
                      value={lemonsqueezyMonthly}
                      onChange={(event) => setLemonsqueezyMonthly(event.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ls-yearly">Subscription (Yearly) variant ID</Label>
                    <Input
                      id="ls-yearly"
                      value={lemonsqueezyYearly}
                      onChange={(event) => setLemonsqueezyYearly(event.target.value)}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Learners pay the price you set in CourseLit, but Lemon Squeezy&apos;s
                    checkout also shows each subscription variant&apos;s own price. Set
                    those variants to the price of your usual plan so the two match.
                  </p>
                </>
              ) : null}
              <div className="flex items-center gap-3">
                <Button type="submit" disabled={!schoolId || currencySaving}>
                  {currencySaving ? "Saving…" : "Save"}
                </Button>
                {currencySaved ? (
                  <p className="text-sm text-muted-foreground" role="status">
                    Currency saved.
                  </p>
                ) : null}
                {currencyError ? (
                  <p className="text-sm text-destructive" role="alert">
                    {currencyError}
                  </p>
                ) : null}
              </div>
            </form>
            {isPaymentProvider(paymentMethod) && webhook ? (
              <Card>
                <CardHeader>
                  <CardTitle>Payment confirmation webhook</CardTitle>
                  <CardDescription className="flex items-start gap-2">
                    <Info className="mt-0.5 size-4 shrink-0" />
                    <span>
                      CourseLit sets this up on your {PROVIDER_LABELS[paymentMethod]} account
                      when you save your keys.{" "}
                      <a
                        className="underline"
                        href="https://docs.courselit.app/schools/set-up-payments"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Documentation
                      </a>
                      .
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {webhook.connected ? (
                    <p className="flex items-start gap-2 text-sm" role="status">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span>
                        Connected. {PROVIDER_LABELS[paymentMethod]} sends payment
                        events to <code className="break-all text-xs">{webhook.url}</code>
                      </span>
                    </p>
                  ) : (
                    <div className="space-y-3">
                      <p
                        className={webhook.error ? "text-sm text-destructive" : "text-sm text-muted-foreground"}
                        role={webhook.error ? "alert" : undefined}
                      >
                        {webhook.error ??
                          "Not connected yet. Save your keys to connect it."}
                      </p>
                      {webhook.error && providerSettings && isConfigured(providerSettings) ? (
                        <Button
                          type="button"
                          variant="outline"
                          disabled={webhookRetrying}
                          onClick={() => void retryWebhook()}
                        >
                          {webhookRetrying ? "Connecting…" : "Try again"}
                        </Button>
                      ) : null}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : null}
            </div>
          ) : null}
          </PlatformTabsContent>

          <PlatformTabsContent value="delivery" className="w-full">
          {mode === "mails" && selectedTab === "delivery" ? (
            <div className="space-y-4 pt-4">
              <EmailDeliveryNotice schoolId={schoolId} />
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void saveMailingSettings();
                }}
              >
                <div className="space-y-1.5">
                  <Label htmlFor="mailing-address">Mailing Address</Label>
                  <Textarea
                    id="mailing-address"
                    rows={5}
                    value={mailingAddress}
                    onChange={(event) => setMailingAddress(event.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    This is required in order to comply with the CAN-SPAM Act.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    type="submit"
                    variant="outline"
                    disabled={!schoolId || mailingAddressSaving}
                  >
                    {mailingAddressSaving ? "Saving…" : "Save"}
                  </Button>
                  {mailingAddressSaved ? (
                    <p className="text-sm text-muted-foreground" role="status">
                      Mailing settings saved.
                    </p>
                  ) : null}
                  {mailingAddressError ? (
                    <p className="text-sm text-destructive" role="alert">
                      {mailingAddressError}
                    </p>
                  ) : null}
                </div>
              </form>
            </div>
          ) : null}
          </PlatformTabsContent>

          <PlatformTabsContent value="login-providers" className="w-full">
          {mode === "general" && selectedTab === "login-providers" ? (
            <div className="w-full pt-4">
              <LoginProviderSettings />
            </div>
          ) : null}
          </PlatformTabsContent>

          <PlatformTabsContent value="api-keys" className="w-full">
          {mode === "general" && selectedTab === "api-keys" && isOwner ? (
            <div className="w-full pt-4">
              <ApiKeySettings schoolId={schoolId} />
            </div>
          ) : null}
          </PlatformTabsContent>

          <PlatformTabsContent value="ai-assistants" className="w-full">
          {mode === "general" && selectedTab === "ai-assistants" ? (
            <div className="w-full pt-4">
              <AiAssistantSettings />
            </div>
          ) : null}
          </PlatformTabsContent>

          <PlatformTabsContent value="notifications" className="w-full">
          {mode === "general" && selectedTab === "notifications" ? (
            <div className="w-full pt-4">
              <NotificationSettings />
            </div>
          ) : null}
          </PlatformTabsContent>

          <PlatformTabsContent value="team" className="w-full">
          {mode === "general" && selectedTab === "team" ? (
            <div className="w-full pt-4">
              <TeamSettings />
            </div>
          ) : null}
          </PlatformTabsContent>
          </PlatformTabs>
        ) : null}

        

        <Dialog open={resetOpen} onOpenChange={setResetOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reset payment method?</DialogTitle>
              <DialogDescription>
                After reset, all paid plans of all products will fail at checkout with
                an error. Free plans will keep on working.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setResetOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void resetPaymentMethod()}
              >
                Reset
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AuthGate>
  );
}

export default SettingsPage;
