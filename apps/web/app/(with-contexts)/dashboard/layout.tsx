import React from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();
    if (!session) {
        redirect("/login?redirect=/dashboard");
    }

    return children;
}
