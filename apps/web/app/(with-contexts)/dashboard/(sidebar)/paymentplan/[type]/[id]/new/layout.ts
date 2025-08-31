import { Metadata, ResolvingMetadata } from "next";
import { NEW_PAYMENT_PLAN_HEADER } from "@/ui-config/strings";

export async function generateMetadata(
    {
        params,
    }: {
        params: any;
    },
    parent: ResolvingMetadata,
): Promise<Metadata> {
    return {
        title: `${NEW_PAYMENT_PLAN_HEADER} | ${(await parent)?.title?.absolute}`,
    };
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
