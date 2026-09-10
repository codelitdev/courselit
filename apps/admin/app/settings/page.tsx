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
  Settings,
  Sliders,
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
import { Checkbox } from "@/components/ui/codelit/checkbox";
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

const GENERAL_SETTINGS_TABS = ["api-keys", "team"] as const;
const MAIL_SETTINGS_TABS = ["delivery"] as const;
const WEBSITE_SETTINGS_TABS = [
  "branding",
  "payment",
  "code-injection",
  "login-methods",
] as const;
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
        : "api-keys";

  useEffect(() => {
    const legacyTab = searchParams.get("tab");
    if (mode !== "general") return;
    if (legacyTab === "branding") {
      router.replace("/website/settings?tab=branding", { scroll: false });
    } else if (legacyTab === "code-injection") {
      router.replace("/website/settings?tab=code-injection", { scroll: false });
    } else if (legacyTab === "payment") {
      router.replace("/website/settings?tab=payment", { scroll: false });
    } else if (legacyTab === "login-methods") {
      router.replace("/website/settings?tab=login-methods", { scroll: false });
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
  const [emailLogin, setEmailLogin] = useState(true);
  const [googleLogin, setGoogleLogin] = useState(false);
  const [ssoLogin, setSsoLogin] = useState(false);
  const [ssoConfigured, setSsoConfigured] = useState(false);
  const [googleConfigured, setGoogleConfigured] = useState(false);

  const [ssoDialogOpen, setSsoDialogOpen] = useState(false);
  const [googleDialogOpen, setGoogleDialogOpen] = useState(false);
  const [ssoResetConfirmOpen, setSsoResetConfirmOpen] = useState(false);
  const [googleResetConfirmOpen, setGoogleResetConfirmOpen] = useState(false);

  const [ssoIdpMetadata, setSsoIdpMetadata] = useState("");
  const [ssoEntryPoint, setSsoEntryPoint] = useState("");
  const [ssoCert, setSsoCert] = useState("");
  const [ssoSaving, setSsoSaving] = useState(false);
  const [ssoResetting, setSsoResetting] = useState(false);
  const [ssoError, setSsoError] = useState<string | null>(null);

  const [googleClientId, setGoogleClientId] = useState("");
  const [googleClientSecret, setGoogleClientSecret] = useState("");
  const [googleHasSavedSecret, setGoogleHasSavedSecret] = useState(false);
  const [googleSaving, setGoogleSaving] = useState(false);
  const [googleResetting, setGoogleResetting] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  const [loginMethodsSaving, setLoginMethodsSaving] = useState(false);
  const [loginMethodsError, setLoginMethodsError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

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

  useEffect(() => {
    if (!schoolId || mode !== "website") return;
    void fetch("/api/v1/school/login-methods", {
      credentials: "include",
      cache: "no-store",
      headers: { "x-school-id": schoolId },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        const methods = data.loginMethods || ["email"];
        setEmailLogin(methods.includes("email"));
        setGoogleLogin(methods.includes("google"));
        setSsoLogin(methods.includes("sso"));
        if (data.sso) {
          setSsoIdpMetadata(data.sso.idpMetadata || "");
          setSsoEntryPoint(data.sso.entryPoint || "");
          setSsoCert(data.sso.cert || "");
          setSsoConfigured(Boolean(data.sso.configured));
        }
        if (data.google) {
          setGoogleClientId(data.google.clientId || "");
          setGoogleHasSavedSecret(Boolean(data.google.hasClientSecret));
          setGoogleConfigured(Boolean(data.google.configured));
        }
      })
      .catch(() => {});
  }, [mode, schoolId]);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const ssoSpAcsUrl = `${origin}/api/auth/sso/saml2/sp/acs/sso`;
  const ssoSpEntityId = `${origin}/api/auth/sso/saml2/sp/metadata?providerId=sso`;
  const googleRedirectUri = `${origin}/api/auth/sso/oauth2/callback/google`;

  async function copyText(text: string, field: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      /* ignore */
    }
  }

  async function updateLoginMethods(updated: {
    email?: boolean;
    google?: boolean;
    sso?: boolean;
  }) {
    if (!schoolId || loginMethodsSaving) return;
    const nextEmail = updated.email ?? emailLogin;
    const nextGoogle = updated.google ?? googleLogin;
    const nextSso = updated.sso ?? ssoLogin;

    if (!nextEmail && !nextGoogle && !nextSso) {
      setLoginMethodsError("At least one login method must be enabled.");
      return;
    }

    if (nextSso && !ssoConfigured) {
      setSsoDialogOpen(true);
      return;
    }

    if (nextGoogle && !googleConfigured) {
      setGoogleDialogOpen(true);
      return;
    }

    setLoginMethodsSaving(true);
    setLoginMethodsError(null);
    const methods: string[] = [];
    if (nextEmail) methods.push("email");
    if (nextGoogle) methods.push("google");
    if (nextSso) methods.push("sso");

    try {
      const response = await fetch("/api/v1/school/login-methods", {
        method: "PATCH",
        credentials: "include",
        headers: {
          "content-type": "application/json",
          "x-school-id": schoolId,
        },
        body: JSON.stringify({ loginMethods: methods }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.message || "Failed to update login methods.");
      }
      setEmailLogin(nextEmail);
      setGoogleLogin(nextGoogle);
      setSsoLogin(nextSso);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update login methods.";
      setLoginMethodsError(msg);
    } finally {
      setLoginMethodsSaving(false);
    }
  }

  async function saveSsoConfig() {
    if (!schoolId || ssoSaving) return;
    setSsoSaving(true);
    setSsoError(null);
    try {
      const methods = [
        ...new Set([
          ...(emailLogin ? ["email"] : []),
          ...(googleLogin ? ["google"] : []),
          "sso",
        ]),
      ];
      const response = await fetch("/api/v1/school/login-methods", {
        method: "PATCH",
        credentials: "include",
        headers: {
          "content-type": "application/json",
          "x-school-id": schoolId,
        },
        body: JSON.stringify({
          sso: {
            idpMetadata: ssoIdpMetadata,
            entryPoint: ssoEntryPoint,
            cert: ssoCert,
          },
          loginMethods: methods,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.message || "Failed to save SSO configuration.");
      }
      setSsoConfigured(true);
      setSsoLogin(true);
      setSsoDialogOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save SSO configuration.";
      setSsoError(msg);
    } finally {
      setSsoSaving(false);
    }
  }

  async function resetSsoConfig() {
    if (!schoolId || ssoResetting) return;
    setSsoResetting(true);
    setSsoError(null);
    try {
      const remaining = [];
      if (emailLogin) remaining.push("email");
      if (googleLogin) remaining.push("google");
      if (remaining.length === 0) remaining.push("email");

      const response = await fetch("/api/v1/school/login-methods", {
        method: "PATCH",
        credentials: "include",
        headers: {
          "content-type": "application/json",
          "x-school-id": schoolId,
        },
        body: JSON.stringify({
          sso: null,
          loginMethods: remaining,
        }),
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body?.message || "Failed to reset SSO configuration.");
      }
      setSsoIdpMetadata("");
      setSsoEntryPoint("");
      setSsoCert("");
      setSsoConfigured(false);
      setSsoLogin(false);
      if (remaining.includes("email")) setEmailLogin(true);
      setSsoResetConfirmOpen(false);
      setSsoDialogOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to reset SSO configuration.";
      setSsoError(msg);
    } finally {
      setSsoResetting(false);
    }
  }

  async function saveGoogleConfig() {
    if (!schoolId || googleSaving) return;
    setGoogleSaving(true);
    setGoogleError(null);
    try {
      const methods = [
        ...new Set([
          ...(emailLogin ? ["email"] : []),
          "google",
          ...(ssoLogin ? ["sso"] : []),
        ]),
      ];
      const response = await fetch("/api/v1/school/login-methods", {
        method: "PATCH",
        credentials: "include",
        headers: {
          "content-type": "application/json",
          "x-school-id": schoolId,
        },
        body: JSON.stringify({
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret || undefined,
          },
          loginMethods: methods,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.message || "Failed to save Google configuration.");
      }
      setGoogleConfigured(true);
      setGoogleLogin(true);
      setGoogleHasSavedSecret(Boolean(googleClientSecret || googleHasSavedSecret));
      setGoogleDialogOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save Google configuration.";
      setGoogleError(msg);
    } finally {
      setGoogleSaving(false);
    }
  }

  async function resetGoogleConfig() {
    if (!schoolId || googleResetting) return;
    setGoogleResetting(true);
    setGoogleError(null);
    try {
      const remaining = [];
      if (emailLogin) remaining.push("email");
      if (ssoLogin) remaining.push("sso");
      if (remaining.length === 0) remaining.push("email");

      const response = await fetch("/api/v1/school/login-methods", {
        method: "PATCH",
        credentials: "include",
        headers: {
          "content-type": "application/json",
          "x-school-id": schoolId,
        },
        body: JSON.stringify({
          google: null,
          loginMethods: remaining,
        }),
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body?.message || "Failed to reset Google configuration.");
      }
      setGoogleClientId("");
      setGoogleClientSecret("");
      setGoogleConfigured(false);
      setGoogleLogin(false);
      setGoogleHasSavedSecret(false);
      if (remaining.includes("email")) setEmailLogin(true);
      setGoogleResetConfirmOpen(false);
      setGoogleDialogOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to reset Google configuration.";
      setGoogleError(msg);
    } finally {
      setGoogleResetting(false);
    }
  }

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
      (mode === "general" && tab === "api-keys")
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
              ? "Manage your website branding, payments, code injection, and login methods."
              : mode === "mails"
                ? "Manage mail delivery settings for this school."
                : "Manage team access and API access for this school."}
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
                    value: "payment",
                    label: "Payments",
                    icon: <CreditCard className="size-4" />,
                  },
                  {
                    value: "code-injection",
                    label: "Code Injection",
                    icon: <Code className="size-4" />,
                  },
                  {
                    value: "login-methods",
                    label: "Login methods",
                    icon: <Sliders className="size-4" />,
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

          {mode === "website" ? (
            <PlatformTabsContent
              value="login-methods"
              className="space-y-4 pt-4"
            >
              <Card>
                <CardHeader>
                  <CardTitle>Login methods</CardTitle>
                  <CardDescription>
                    Choose how learners can sign in to your school.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {loginMethodsError ? (
                    <p className="text-sm text-destructive" role="alert">
                      {loginMethodsError}
                    </p>
                  ) : null}
                  <LoginMethodRow
                    label="Email"
                    checked={emailLogin}
                    disabled={emailLogin && !googleLogin && !ssoLogin}
                    onCheckedChange={(checked) =>
                      void updateLoginMethods({ email: checked })
                    }
                  />
                  <LoginMethodRow
                    label="Google"
                    checked={googleLogin}
                    onCheckedChange={(checked) =>
                      void updateLoginMethods({ google: checked })
                    }
                    onConfigure={() => setGoogleDialogOpen(true)}
                  />
                  <LoginMethodRow
                    label="SSO"
                    checked={ssoLogin}
                    onCheckedChange={(checked) =>
                      void updateLoginMethods({ sso: checked })
                    }
                    onConfigure={() => setSsoDialogOpen(true)}
                  />
                </CardContent>
              </Card>
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

        {/* SSO Configuration Dialog */}
        <Dialog open={ssoDialogOpen} onOpenChange={setSsoDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Single Sign-On (SSO)</DialogTitle>
              <DialogDescription>
                Configure SAML 2.0 Identity Provider for your learners.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-2">
              {/* SP Settings */}
              <div className="space-y-3 rounded-lg border bg-muted/40 p-4">
                <div>
                  <h3 className="text-sm font-semibold">School Settings (SP)</h3>
                  <p className="text-xs text-muted-foreground">
                    Enter these URLs into your Identity Provider (Okta, Azure AD, OneLogin, etc.).
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="space-y-1">
                    <Label className="text-xs">SP ACS URL (Assertion Consumer Service)</Label>
                    <div className="flex gap-2">
                      <Input readOnly value={ssoSpAcsUrl} className="font-mono text-xs" />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 w-9 p-0"
                        onClick={() => void copyText(ssoSpAcsUrl, "sso_acs")}
                        title="Copy SP ACS URL"
                      >
                        {copiedField === "sso_acs" ? (
                          <Check className="size-4 text-emerald-600" />
                        ) : (
                          <Copy className="size-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">SP Entity ID / Metadata URL</Label>
                    <div className="flex gap-2">
                      <Input readOnly value={ssoSpEntityId} className="font-mono text-xs" />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 w-9 p-0"
                        onClick={() => void copyText(ssoSpEntityId, "sso_entity")}
                        title="Copy SP Entity ID"
                      >
                        {copiedField === "sso_entity" ? (
                          <Check className="size-4 text-emerald-600" />
                        ) : (
                          <Copy className="size-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* IdP Settings */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="sso-idp-metadata">IDP Metadata XML</Label>
                  <Textarea
                    id="sso-idp-metadata"
                    rows={5}
                    className="font-mono text-xs"
                    placeholder="<EntityDescriptor xmlns=...>"
                    value={ssoIdpMetadata}
                    onChange={(e) => setSsoIdpMetadata(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sso-entry-point">Entry Point URL</Label>
                  <Input
                    id="sso-entry-point"
                    placeholder="https://login.microsoftonline.com/.../saml2"
                    value={ssoEntryPoint}
                    onChange={(e) => setSsoEntryPoint(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sso-cert">Certificate (X.509)</Label>
                  <Textarea
                    id="sso-cert"
                    rows={5}
                    className="font-mono text-xs"
                    placeholder="-----BEGIN CERTIFICATE----- ... -----END CERTIFICATE-----"
                    value={ssoCert}
                    onChange={(e) => setSsoCert(e.target.value)}
                  />
                </div>
              </div>

              {ssoError ? (
                <p className="text-sm text-destructive" role="alert">
                  {ssoError}
                </p>
              ) : null}

              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Info className="size-3.5" />
                <span>
                  Need help? View the{" "}
                  <a
                    href="https://docs.courselit.app/schools/sso"
                    target="_blank"
                    rel="noreferrer"
                    className="underline inline-flex items-center gap-0.5"
                  >
                    SSO documentation <ExternalLink className="size-3" />
                  </a>
                  .
                </span>
              </div>
            </div>
            <DialogFooter className="flex items-center justify-between sm:justify-between">
              {ssoConfigured ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSsoResetConfirmOpen(true)}
                  disabled={ssoSaving || ssoResetting}
                >
                  <RotateCcw className="mr-1.5 size-4" />
                  Reset
                </Button>
              ) : (
                <div />
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSsoDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => void saveSsoConfig()}
                  disabled={
                    ssoSaving ||
                    !ssoIdpMetadata.trim() ||
                    !ssoEntryPoint.trim() ||
                    !ssoCert.trim()
                  }
                >
                  <Save className="mr-1.5 size-4" />
                  {ssoSaving ? "Saving…" : "Save"}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* SSO Reset Confirmation Dialog */}
        <Dialog open={ssoResetConfirmOpen} onOpenChange={setSsoResetConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Clear SSO configuration?</DialogTitle>
              <DialogDescription>
                This action is irreversible. All SSO provider configuration will be wiped out
                and SSO login will be disabled.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSsoResetConfirmOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => void resetSsoConfig()}
                disabled={ssoResetting}
              >
                {ssoResetting ? "Resetting…" : "Reset"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Google Configuration Dialog */}
        <Dialog open={googleDialogOpen} onOpenChange={setGoogleDialogOpen}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Google Sign-in</DialogTitle>
              <DialogDescription>
                Configure Google OAuth credentials for your learners.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-2">
              {/* Redirect details */}
              <div className="space-y-3 rounded-lg border bg-muted/40 p-4">
                <div>
                  <h3 className="text-sm font-semibold">Google Cloud Credentials</h3>
                  <p className="text-xs text-muted-foreground">
                    Add these URLs to your OAuth 2.0 Client ID settings in Google Cloud Console.
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Authorized redirect URI</Label>
                    <div className="flex gap-2">
                      <Input readOnly value={googleRedirectUri} className="font-mono text-xs" />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 w-9 p-0"
                        onClick={() => void copyText(googleRedirectUri, "google_uri")}
                        title="Copy Redirect URI"
                      >
                        {copiedField === "google_uri" ? (
                          <Check className="size-4 text-emerald-600" />
                        ) : (
                          <Copy className="size-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Authorized JavaScript origin</Label>
                    <div className="flex gap-2">
                      <Input readOnly value={origin} className="font-mono text-xs" />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 w-9 p-0"
                        onClick={() => void copyText(origin, "google_origin")}
                        title="Copy Origin"
                      >
                        {copiedField === "google_origin" ? (
                          <Check className="size-4 text-emerald-600" />
                        ) : (
                          <Copy className="size-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Client credentials */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="google-client-id">Client ID</Label>
                  <Input
                    id="google-client-id"
                    placeholder="e.g. 123456789-abc.apps.googleusercontent.com"
                    value={googleClientId}
                    onChange={(e) => setGoogleClientId(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="google-client-secret">Client Secret</Label>
                  <Input
                    id="google-client-secret"
                    type="password"
                    autoComplete="off"
                    placeholder={
                      googleHasSavedSecret
                        ? "Secret saved. Enter a new secret to update."
                        : "Enter Client Secret"
                    }
                    value={googleClientSecret}
                    onChange={(e) => setGoogleClientSecret(e.target.value)}
                  />
                  {googleHasSavedSecret && !googleClientSecret ? (
                    <p className="text-xs text-muted-foreground">
                      A client secret is currently configured and saved.
                    </p>
                  ) : null}
                </div>
              </div>

              {googleError ? (
                <p className="text-sm text-destructive" role="alert">
                  {googleError}
                </p>
              ) : null}

              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Info className="size-3.5" />
                <span>
                  Need help? View the{" "}
                  <a
                    href="https://docs.courselit.app/schools/google-sign-in"
                    target="_blank"
                    rel="noreferrer"
                    className="underline inline-flex items-center gap-0.5"
                  >
                    Google sign-in documentation <ExternalLink className="size-3" />
                  </a>
                  .
                </span>
              </div>
            </div>
            <DialogFooter className="flex items-center justify-between sm:justify-between">
              {googleConfigured ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setGoogleResetConfirmOpen(true)}
                  disabled={googleSaving || googleResetting}
                >
                  <RotateCcw className="mr-1.5 size-4" />
                  Reset
                </Button>
              ) : (
                <div />
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setGoogleDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => void saveGoogleConfig()}
                  disabled={
                    googleSaving ||
                    !googleClientId.trim() ||
                    (!googleHasSavedSecret && !googleClientSecret.trim())
                  }
                >
                  <Save className="mr-1.5 size-4" />
                  {googleSaving ? "Saving…" : "Save"}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Google Reset Confirmation Dialog */}
        <Dialog open={googleResetConfirmOpen} onOpenChange={setGoogleResetConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Clear Google configuration?</DialogTitle>
              <DialogDescription>
                This action is irreversible. The Google client credentials will be removed
                and Google sign-in will be disabled.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setGoogleResetConfirmOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => void resetGoogleConfig()}
                disabled={googleResetting}
              >
                {googleResetting ? "Resetting…" : "Reset"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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

function LoginMethodRow({
  label,
  checked,
  disabled,
  onCheckedChange,
  onConfigure,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (value: boolean) => void;
  onConfigure?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/30 px-4 py-3.5">
      <div className="flex items-center gap-3">
        <Checkbox
          checked={checked}
          disabled={disabled}
          onCheckedChange={(value) => onCheckedChange(value === true)}
          aria-label={label}
        />
        <span className="font-medium">{label}</span>
      </div>
      {onConfigure ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="size-8 p-0"
          onClick={onConfigure}
          title={`Configure ${label}`}
        >
          <Settings className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}
