import { getAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import LoginForm from "./login-form";
import { headers } from "next/headers";
import DomainModel from "@models/Domain";

export default async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const domainName = (await headers()).get("domain");
    const auth = await getAuth(domainName || undefined);
    const session = await auth.api.getSession({
        headers: await headers(),
    });
    const redirectTo = (await searchParams).redirect as string | undefined;

    if (session) {
        redirect(redirectTo || "/dashboard");
    }

    const domain = await DomainModel.findOne({ name: domainName }).lean();
    const authConfig = {
        emailOtp: domain?.auth?.emailOtp?.enabled ?? true,
        google: domain?.auth?.google?.enabled ?? false,
        github: domain?.auth?.github?.enabled ?? false,
        saml: domain?.auth?.saml?.enabled ?? false,
    };

    return <LoginForm redirectTo={redirectTo} authConfig={authConfig} />;
}
