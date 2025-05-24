import { auth } from "@/auth";
import { redirect } from "next/navigation";
import LoginForm from "./login-form";

export default async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const session = await auth();
    const redirectTo = (await searchParams).redirect;

    if (session) {
        redirect(
            typeof redirectTo === "string"
                ? redirectTo
                : "/dashboard/my-content",
        );
    }

    return <LoginForm />;
}
