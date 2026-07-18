import { createAuthClient } from "better-auth/client";
import { emailOTPClient } from "better-auth/client/plugins";
import { ssoClient } from "@better-auth/sso/client";

type AuthClientResult = Promise<{
    error?: {
        message?: string;
    } | null;
}>;

type AuthClient = {
    emailOtp: {
        sendVerificationOtp: (input: {
            email: string;
            type: "sign-in";
        }) => AuthClientResult;
    };
    signIn: {
        emailOtp: (input: { email: string; otp: string }) => AuthClientResult;
        sso: (input: {
            providerId: string;
            callbackURL?: string;
        }) => AuthClientResult;
    };
    signOut: (input?: {
        fetchOptions?: { onSuccess?: () => void };
    }) => AuthClientResult;
};

export const authClient = createAuthClient({
    plugins: [emailOTPClient(), ssoClient()],
}) as unknown as AuthClient;
