import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    plugins: [emailOTPClient()],
});

export const { signIn, signOut, signUp, useSession, getSession } = authClient;

// Email OTP specific methods
export const sendVerificationOtp = authClient.emailOtp.sendVerificationOtp;
export const verifyEmailOtp = authClient.emailOtp.verifyEmailOtp;
