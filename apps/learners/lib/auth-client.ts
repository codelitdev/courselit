import { createAuthClient } from "better-auth/client";
import { emailOTPClient } from "better-auth/client/plugins";
import { ssoClient } from "@better-auth/sso/client";

export const authClient = createAuthClient({
  baseURL: typeof window !== "undefined" ? window.location.origin : "",
  basePath: "/api/auth",
  plugins: [emailOTPClient(), ssoClient()],
});
