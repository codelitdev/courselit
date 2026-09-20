"use client";

import { PlatformTabs, PlatformTabsContent } from "@courselit/components-library";
import {
  Check,
  Code,
  Copy,
  CreditCard,
  ExternalLink,
  Info,
  Key,
  Mail,
  Palette,
  RotateCcw,
  Save,
  Trash2,
  Users,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/auth-gate";
import { BrandingSettings } from "@/components/settings/branding-settings";
import { TeamSettings } from "@/components/settings/team-settings";
import { CodeInjectionSettings } from "@/components/website/code-injection-settings";
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

const GENERAL_SETTINGS_TABS = ["payment", "team", "api-keys"] as const;
const MAIL_SETTINGS_TABS = ["delivery"] as const;
const WEBSITE_SETTINGS_TABS = ["branding", "code-injection"] as const;
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

type ApiKeyItem = {
  id?: string;
  publicId: string;
  createdAt?: string;
};

type SchoolItem = {
  id: string;
  name: string;
  currency: string;
  selected?: boolean;
};

export function SettingsPage({ mode = "general" }: { mode?: SettingsMode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedTab = isSettingsTab(searchParams.get("tab"), mode)
    ? searchParams.get("tab")!
    : mode === "website"
      ? "branding"
      : mode === "mails"
        ? "delivery"
        : "payment";

  useEffect(() => {
    const legacyTab = searchParams.get("tab");
    if (mode === "website" && legacyTab === "payment") {
      router.replace("/settings?tab=payment", { scroll: false });
      return;
    }
    if (mode !== "general") return;
    if (legacyTab === "branding") {
      router.replace("/website/settings?tab=branding", { scroll: false });
    } else if (legacyTab === "code-injection") {
      router.replace("/website/settings?tab=code-injection", { scroll: false });
    } else if (legacyTab === "mails") {
      router.replace("/mails/settings", { scroll: false });
    } else if (legacyTab === "miscellaneous") {
      router.replace("/settings?tab=api-keys", { scroll: false });
    }
  }, [mode, router, searchParams]);

  const [currency, setCurrency] = useState("USD");
  const [currencySaving, setCurrencySaving] = useState(false);
  const [currencyError, setCurrencyError] = useState<string | null>(null);
  const [currencySaved, setCurrencySaved] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [stripeKey, setStripeKey] = useState("");
  const [stripeSecret, setStripeSecret] = useState("");
  const [stripeWebhookSecret, setStripeWebhookSecret] = useState("");
  const [razorpayKey, setRazorpayKey] = useState("");
  const [razorpaySecret, setRazorpaySecret] = useState("");
  const [razorpayWebhookSecret, setRazorpayWebhookSecret] = useState("");
  const [lemonsqueezyKey, setLemonsqueezyKey] = useState("");
  const [lemonsqueezyStoreId, setLemonsqueezyStoreId] = useState("");
  const [lemonsqueezyOneTime, setLemonsqueezyOneTime] = useState("");
  const [lemonsqueezyMonthly, setLemonsqueezyMonthly] = useState("");
  const [lemonsqueezyYearly, setLemonsqueezyYearly] = useState("");
  const [lemonsqueezyWebhookSecret, setLemonsqueezyWebhookSecret] = useState("");
  const [resetOpen, setResetOpen] = useState(false);

  const [mailingAddress, setMailingAddress] = useState("");
  const [mailingAddressSaving, setMailingAddressSaving] = useState(false);
  const [mailingAddressSaved, setMailingAddressSaved] = useState(false);
  const [mailingAddressError, setMailingAddressError] = useState<string | null>(null);

  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);

  const webhookUrl = useMemo(() => {
    if (typeof window === "undefined") return "/v1/storefront/webhooks/{provider}";
    return `${window.location.origin}/api/v1/storefront/webhooks/${paymentMethod || "{provider}"}`;
  }, [paymentMethod]);

  useEffect(() => {
    void fetch("/api/v1/schools", { credentials: "include", cache: "no-store" })
      .then((response) => (response.ok ? response.json() : { items: [] }))
      .then((body: { items?: SchoolItem[] }) => {
        const items = body.items ?? [];
        const selected = items.find((item) => item.selected) ?? items[0];
        if (!selected) return;
        setSchoolId(selected.id);
        setCurrency(selected.currency || "USD");
        void fetch("/api/v1/school/payment-settings", {
          credentials: "include",
          cache: "no-store",
          headers: { "x-school-id": selected.id },
        })
          .then((response) => (response.ok ? response.json() : null))
          .then((settings: {
            provider?: string | null;
            stripe?: { publishableKey?: string };
            razorpay?: { keyId?: string };
            lemonsqueezy?: { storeId?: string; oneTimeVariantId?: string; monthlyVariantId?: string; yearlyVariantId?: string };
          } | null) => {
            if (!settings) return;
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

  useEffect(() => {
    if (!schoolId || mode !== "general") return;
    void fetch("/api/v1/api-keys", {
      credentials: "include",
      cache: "no-store",
      headers: { "x-school-id": schoolId },
    })
      .then((response) => (response.ok ? response.json() : { items: [] }))
      .then((body: { items?: ApiKeyItem[] }) => setApiKeys(body.items ?? []))
      .catch(() => setApiKeys([]));
  }, [mode, schoolId]);

  function selectTab(tab: string) {
    const params = new URLSearchParams(searchParams.toString());
    const settingsPath =
      mode === "website"
        ? "/website/settings"
        : mode === "mails"
          ? "/mails/settings"
          : "/settings";
    if (
      (mode === "website" && tab === "branding") ||
      (mode === "mails" && tab === "delivery") ||
      (mode === "general" && tab === "payment")
    ) {
      params.delete("tab");
    }
    else params.set("tab", tab);
    const query = params.toString();
    router.replace(`${settingsPath}${query ? `?${query}` : ""}`, { scroll: false });
  }

  async function copyWebhook() {
    try {
      await navigator.clipboard.writeText(webhookUrl);
    } catch {
      /* ignore */
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
            webhookSecret: stripeWebhookSecret,
          } : undefined,
          razorpay: paymentMethod === "razorpay" ? {
            keyId: razorpayKey,
            keySecret: razorpaySecret,
            webhookSecret: razorpayWebhookSecret,
          } : undefined,
          lemonsqueezy: paymentMethod === "lemonsqueezy" ? {
            apiKey: lemonsqueezyKey,
            storeId: lemonsqueezyStoreId,
            oneTimeVariantId: lemonsqueezyOneTime,
            monthlyVariantId: lemonsqueezyMonthly,
            yearlyVariantId: lemonsqueezyYearly,
            webhookSecret: lemonsqueezyWebhookSecret,
          } : undefined,
        }),
      });
      if (!paymentResponse.ok) {
        const paymentBody = (await paymentResponse.json().catch(() => null)) as { message?: string } | null;
        throw new Error(paymentBody?.message ?? "Unable to save payment settings.");
      }
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

  async function revokeKey(publicId: string) {
    if (!schoolId) return;
    const response = await fetch(`/api/v1/api-keys/${publicId}`, {
      method: "DELETE",
      credentials: "include",
      headers: { "x-school-id": schoolId },
    });
    if (response.ok) {
      setApiKeys((items) => items.filter((item) => item.publicId !== publicId));
    }
  }

  return (
    <AuthGate>
      <div className="page-shell">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">
            {mode === "website"
              ? "Website settings"
              : mode === "mails"
                ? "Mail settings"
                : "Settings"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "website"
              ? "Manage your website branding and code injection."
              : mode === "mails"
                ? "Manage mail delivery settings for this school."
                : "Manage team access, API access, and payment settings for this school."}
          </p>
        </header>

        <PlatformTabs
          value={selectedTab}
          onValueChange={selectTab}
          ariaLabel={
            mode === "website"
              ? "Website settings"
              : mode === "mails"
                ? "Mail settings"
                : "School settings"
          }
          items={
            mode === "website"
              ? [
                  {
                    value: "branding",
                    label: "Branding",
                    icon: <Palette className="size-4" />,
                  },
                  {
                    value: "code-injection",
                    label: "Code Injection",
                    icon: <Code className="size-4" />,
                  },
                ]
              : mode === "mails"
                ? [
                    {
                      value: "delivery",
                      label: "Mail delivery",
                      icon: <Mail className="size-4" />,
                    },
                  ]
              : [
                  {
                    value: "payment",
                    label: "Payments",
                    icon: <CreditCard className="size-4" />,
                  },
                  {
                    value: "team",
                    label: "Team",
                    icon: <Users className="size-4" />,
                  },
                  {
                    value: "api-keys",
                    label: "API keys",
                    icon: <Key className="size-4" />,
                  },
                ]
          }
        >
          <PlatformTabsContent value="branding" className="w-full pt-4">
            <BrandingSettings />
          </PlatformTabsContent>

          <PlatformTabsContent value="payment" className="space-y-6 pt-4">
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
                  <div className="space-y-1.5">
                    <Label htmlFor="stripe-webhook-secret">Stripe Webhook Secret</Label>
                    <Input
                      id="stripe-webhook-secret"
                      type="password"
                      autoComplete="off"
                      value={stripeWebhookSecret}
                      onChange={(event) => setStripeWebhookSecret(event.target.value)}
                      placeholder="whsec_…"
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
                  <div className="space-y-1.5">
                    <Label htmlFor="razorpay-webhook-secret">Razorpay Webhook Secret</Label>
                    <Input
                      id="razorpay-webhook-secret"
                      type="password"
                      autoComplete="off"
                      value={razorpayWebhookSecret}
                      onChange={(event) => setRazorpayWebhookSecret(event.target.value)}
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
                  <div className="space-y-1.5">
                    <Label htmlFor="ls-webhook-secret">Lemon Squeezy Webhook Secret</Label>
                    <Input
                      id="ls-webhook-secret"
                      type="password"
                      autoComplete="off"
                      value={lemonsqueezyWebhookSecret}
                      onChange={(event) => setLemonsqueezyWebhookSecret(event.target.value)}
                    />
                  </div>
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
            <Card>
              <CardHeader>
                <CardTitle>Payment confirmation webhook</CardTitle>
                <CardDescription className="flex items-start gap-2">
                  <Info className="mt-0.5 size-4 shrink-0" />
                  <span>
                    Use this URL in your payment provider dashboard.{" "}
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
              <CardContent className="flex gap-2">
                <Input readOnly value={webhookUrl} />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void copyWebhook()}
                >
                  <Copy className="size-4" />
                </Button>
              </CardContent>
            </Card>
          </PlatformTabsContent>

          <PlatformTabsContent value="code-injection" className="w-full pt-4">
            <CodeInjectionSettings />
          </PlatformTabsContent>

          {mode === "mails" ? (
            <PlatformTabsContent value="delivery" className="pt-4">
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
            </PlatformTabsContent>
          ) : null}

          {mode === "general" ? (
            <PlatformTabsContent
              value="api-keys"
              className="space-y-4 pt-4"
            >
            <Card>
              <CardHeader>
                <CardTitle>API Keys</CardTitle>
                <CardDescription>
                  Keys for the public product and learner APIs.{" "}
                  <a
                    href="https://docs.courselit.app/developers/introduction"
                    className="underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Learn more about API keys
                  </a>
                  .
                </CardDescription>
              </CardHeader>
              <CardContent>
                {apiKeys.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Key className="mb-2 size-8 opacity-50" />
                    <p>No API keys found</p>
                  </div>
                ) : (
                  <ul className="divide-y">
                    {apiKeys.map((key) => (
                      <li
                        key={key.publicId}
                        className="flex items-center justify-between gap-3 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium">{key.publicId}</p>
                          {key.createdAt ? (
                            <p className="text-xs text-muted-foreground">
                              {new Date(key.createdAt).toLocaleString()}
                            </p>
                          ) : null}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => void revokeKey(key.publicId)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
            </PlatformTabsContent>
          ) : null}

          {mode === "general" ? (
            <PlatformTabsContent value="team" className="w-full pt-4">
              <TeamSettings />
            </PlatformTabsContent>
          ) : null}
        </PlatformTabs>

        

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
