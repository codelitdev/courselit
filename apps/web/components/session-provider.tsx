"use client";

import { ReactNode } from "react";
import { authClient } from "@/lib/auth-client";

interface SessionProviderProps {
    children: ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
    return <authClient.SessionProvider>{children}</authClient.SessionProvider>;
}
