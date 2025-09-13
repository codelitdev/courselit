"use client";

import { Section, Text1, Button } from "@courselit/page-primitives";
import {
    LOGGING_OUT,
    LOGOUT,
    LOGOUT_MESSAGE,
    TOAST_TITLE_ERROR,
    UNABLE_TO_LOGOUT,
} from "@ui-config/strings";
import { useContext, useState } from "react";
import { ThemeContext } from "@components/contexts";
import { toast } from "@/hooks/use-toast";

export default function ClientSide() {
    const [loading, setLoading] = useState(false);
    const { theme } = useContext(ThemeContext);

    const handleLogout = async () => {
        setLoading(true);
        const response = await fetch("/logout/server");
        if (response.ok) {
            window.location.href = "/";
        } else {
            toast({
                title: TOAST_TITLE_ERROR,
                description: UNABLE_TO_LOGOUT,
                variant: "destructive",
            });
        }
        setLoading(false);
    };

    return (
        <Section theme={theme.theme}>
            <Text1 theme={theme.theme}>{LOGOUT_MESSAGE}</Text1>
            <Button
                theme={theme.theme}
                onClick={handleLogout}
                disabled={loading}
            >
                {loading ? LOGGING_OUT : LOGOUT}
            </Button>
        </Section>
    );
}
