"use client";

import { Section, Text1, Button } from "@courselit/page-primitives";
import { LOGOUT, LOGOUT_MESSAGE } from "@ui-config/strings";
import { useContext } from "react";
import { ThemeContext } from "@components/contexts";
import { authClient } from "@/lib/auth-client";
import { useToast } from "@courselit/components-library";

export default function ClientSide() {
    const { theme } = useContext(ThemeContext);
    const { toast } = useToast();

    const handleLogout = async () => {
        const { error } = await authClient.signOut({
            fetchOptions: {
                onSuccess: () => {
                    window.location.href = "/login";
                },
            },
        });

        if (error) {
            toast({
                title: "Error",
                description: error?.message,
                variant: "destructive",
            });
        }
    };

    return (
        <Section theme={theme.theme}>
            <div className="flex flex-col gap-4">
                <Text1 theme={theme.theme}>{LOGOUT_MESSAGE}</Text1>
                <div>
                    <Button theme={theme.theme} onClick={handleLogout}>
                        {LOGOUT}
                    </Button>
                </div>
            </div>
        </Section>
    );
}
