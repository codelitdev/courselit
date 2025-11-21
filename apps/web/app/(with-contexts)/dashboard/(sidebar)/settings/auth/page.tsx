"use client";

import React, { useState, useEffect, useContext } from "react";
import DashboardContent from "@components/admin/dashboard-content";
import { UIConstants } from "@courselit/common-models";
import {
    Form,
    FormField,
    Button,
    Checkbox,
    useToast,
} from "@courselit/components-library";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@components/ui/card";
import { AddressContext } from "@components/contexts";
import { TOAST_TITLE_ERROR, TOAST_TITLE_SUCCESS } from "@/ui-config/strings";

const { permissions } = UIConstants;

const breadcrumbs = [
    { label: "Settings", href: "/dashboard/settings" },
    { label: "Authentication", href: "#" },
];

interface AuthSettings {
    emailOtp: { enabled: boolean };
    google: { enabled: boolean; clientId?: string; clientSecret?: string };
    github: { enabled: boolean; clientId?: string; clientSecret?: string };
    saml: {
        enabled: boolean;
        entryPoint?: string;
        issuer?: string;
        cert?: string;
        emailDomain?: string;
    };
}

export default function AuthSettingsPage() {
    const [settings, setSettings] = useState<AuthSettings>({
        emailOtp: { enabled: true },
        google: { enabled: false },
        github: { enabled: false },
        saml: { enabled: false },
    });
    const [loading, setLoading] = useState(false);
    const address = useContext(AddressContext);
    const { toast } = useToast();

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const res = await fetch(`${address.backend}/api/settings/auth`, {
                headers: {
                    "Content-Type": "application/json",
                },
            });
            if (res.ok) {
                const data = await res.json();
                if (data.auth) {
                    setSettings(data.auth);
                }
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch(`${address.backend}/api/settings/auth`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(settings),
            });

            if (res.ok) {
                toast({
                    title: TOAST_TITLE_SUCCESS,
                    description: "Authentication settings saved successfully.",
                });
            } else {
                const data = await res.json();
                throw new Error(data.message || "Failed to save settings");
            }
        } catch (err: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const updateSetting = (
        section: keyof AuthSettings,
        key: string,
        value: any,
    ) => {
        setSettings((prev) => ({
            ...prev,
            [section]: {
                ...prev[section],
                [key]: value,
            },
        }));
    };

    return (
        <DashboardContent
            breadcrumbs={breadcrumbs}
            permissions={[permissions.manageSite]}
        >
            <div className="flex justify-between items-baseline mb-6">
                <h1 className="text-4xl font-semibold">
                    Authentication Settings
                </h1>
            </div>

            <Form onSubmit={handleSubmit} className="flex flex-col gap-8">
                {/* Email OTP */}
                <Card>
                    <CardHeader>
                        <CardTitle>Email OTP</CardTitle>
                        <CardDescription>
                            Enable or disable Email + OTP authentication.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <Checkbox
                                checked={settings.emailOtp.enabled}
                                onChange={(checked: boolean) =>
                                    updateSetting(
                                        "emailOtp",
                                        "enabled",
                                        checked,
                                    )
                                }
                            />
                            <span>Enable Email OTP</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Google OAuth */}
                <Card>
                    <CardHeader>
                        <CardTitle>Google OAuth</CardTitle>
                        <CardDescription>
                            Configure Google Sign-In.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Checkbox
                                checked={settings.google.enabled}
                                onChange={(checked: boolean) =>
                                    updateSetting("google", "enabled", checked)
                                }
                            />
                            <span>Enable Google Sign-In</span>
                        </div>
                        {settings.google.enabled && (
                            <>
                                <FormField
                                    label="Client ID"
                                    name="googleClientId"
                                    value={settings.google.clientId || ""}
                                    onChange={(e: any) =>
                                        updateSetting(
                                            "google",
                                            "clientId",
                                            e.target.value,
                                        )
                                    }
                                />
                                <FormField
                                    label="Client Secret"
                                    name="googleClientSecret"
                                    value={settings.google.clientSecret || ""}
                                    onChange={(e: any) =>
                                        updateSetting(
                                            "google",
                                            "clientSecret",
                                            e.target.value,
                                        )
                                    }
                                    type="password"
                                />
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* GitHub OAuth */}
                <Card>
                    <CardHeader>
                        <CardTitle>GitHub OAuth</CardTitle>
                        <CardDescription>
                            Configure GitHub Sign-In.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Checkbox
                                checked={settings.github.enabled}
                                onChange={(checked: boolean) =>
                                    updateSetting("github", "enabled", checked)
                                }
                            />
                            <span>Enable GitHub Sign-In</span>
                        </div>
                        {settings.github.enabled && (
                            <>
                                <FormField
                                    label="Client ID"
                                    name="githubClientId"
                                    value={settings.github.clientId || ""}
                                    onChange={(e: any) =>
                                        updateSetting(
                                            "github",
                                            "clientId",
                                            e.target.value,
                                        )
                                    }
                                />
                                <FormField
                                    label="Client Secret"
                                    name="githubClientSecret"
                                    value={settings.github.clientSecret || ""}
                                    onChange={(e: any) =>
                                        updateSetting(
                                            "github",
                                            "clientSecret",
                                            e.target.value,
                                        )
                                    }
                                    type="password"
                                />
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* SAML SSO */}
                <Card>
                    <CardHeader>
                        <CardTitle>SAML SSO</CardTitle>
                        <CardDescription>
                            Configure SAML Single Sign-On.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Checkbox
                                checked={settings.saml.enabled}
                                onChange={(checked: boolean) =>
                                    updateSetting("saml", "enabled", checked)
                                }
                            />
                            <span>Enable SAML SSO</span>
                        </div>
                        {settings.saml.enabled && (
                            <>
                                <FormField
                                    label="Entry Point (SSO URL)"
                                    name="samlEntryPoint"
                                    value={settings.saml.entryPoint || ""}
                                    onChange={(e: any) =>
                                        updateSetting(
                                            "saml",
                                            "entryPoint",
                                            e.target.value,
                                        )
                                    }
                                />
                                <FormField
                                    label="Issuer (Entity ID)"
                                    name="samlIssuer"
                                    value={settings.saml.issuer || ""}
                                    onChange={(e: any) =>
                                        updateSetting(
                                            "saml",
                                            "issuer",
                                            e.target.value,
                                        )
                                    }
                                />
                                <FormField
                                    label="Email Domain (e.g. acme.com)"
                                    name="samlEmailDomain"
                                    value={settings.saml.emailDomain || ""}
                                    onChange={(e: any) =>
                                        updateSetting(
                                            "saml",
                                            "emailDomain",
                                            e.target.value,
                                        )
                                    }
                                />
                                <FormField
                                    label="Certificate (PEM)"
                                    name="samlCert"
                                    value={settings.saml.cert || ""}
                                    onChange={(e: any) =>
                                        updateSetting(
                                            "saml",
                                            "cert",
                                            e.target.value,
                                        )
                                    }
                                    component="textarea"
                                    rows={10}
                                />
                            </>
                        )}
                    </CardContent>
                </Card>

                <div>
                    <Button type="submit" disabled={loading}>
                        {loading ? "Saving..." : "Save Settings"}
                    </Button>
                </div>
            </Form>
        </DashboardContent>
    );
}
