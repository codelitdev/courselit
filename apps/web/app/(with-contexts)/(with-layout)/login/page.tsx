import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import LoginForm from "./login-form";

export default async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });
    const redirectTo = (await searchParams).redirect as string | undefined;

    if (session) {
        redirect(redirectTo || "/dashboard");
    }

    return <LoginForm redirectTo={redirectTo} />;
}
