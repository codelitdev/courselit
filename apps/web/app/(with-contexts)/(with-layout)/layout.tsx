import { auth } from "@/auth";
import { SessionProvider } from "next-auth/react";
import HomepageLayout from "./home-page-layout";

export default async function Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    return (
        <SessionProvider session={session}>
            <HomepageLayout>{children}</HomepageLayout>
        </SessionProvider>
    );
}
