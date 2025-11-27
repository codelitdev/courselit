"use client";

import { Section, Text1, Button } from "@courselit/page-primitives";
import { LOGOUT, LOGOUT_MESSAGE } from "@ui-config/strings";
import { useContext } from "react";
import { ThemeContext } from "@components/contexts";
import { authClient } from "@/lib/auth-client";

export default function ClientSide() {
    const { theme } = useContext(ThemeContext);

    const handleLogout = async () => {
        await authClient.signOut({
            fetchOptions: {
                onSuccess: () => {
                    window.location.href = "/login";
                },
            },
        });
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
