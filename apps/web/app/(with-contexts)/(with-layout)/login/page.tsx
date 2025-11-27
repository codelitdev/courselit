import { auth } from "@/auth";
import { redirect } from "next/navigation";
import LoginForm from "./login-form";
import { headers } from "next/headers";

export default async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const headersList = await headers();
    const session = await auth.api.getSession({
        headers: headersList,
    });

    const redirectTo = (await searchParams).redirect as string | undefined;

    if (session) {
        redirect(redirectTo || "/dashboard");
    }

    return <LoginForm redirectTo={redirectTo} />;
}
