import { auth } from "@/auth";
import { redirect } from "next/navigation";
import LoginForm from "./login-form";

export default async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const session = await auth();
    const redirectTo = (await searchParams).redirect as string | undefined;

    if (session) {
        redirect(redirectTo || "/dashboard");
    }

    return <LoginForm redirectTo={redirectTo} />;
}
