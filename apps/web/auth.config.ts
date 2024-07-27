// @ts-nocheck
import { type NextAuthConfig } from "next-auth";

export const authConfig = {
    providers: [],
    pages: {
        signIn: "/login",
    },
    callbacks: {
        async redirect({ url }) {
            return url;
        },
    },
} satisfies NextAuthConfig;
