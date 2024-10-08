import { Metadata, ResolvingMetadata } from "next";
import UsersHub from "./users-hub";

export async function generateMetadata(
    {
        params,
        searchParams,
    }: {
        params: any;
        searchParams: { [key: string]: string | string[] | undefined };
    },
    parent: ResolvingMetadata,
): Promise<Metadata> {
    const tab = searchParams["tab"] || "All users";

    return {
        title: `${tab} | ${(await parent)?.title?.absolute}`,
    };
}

export default function Page() {
    return <UsersHub />;
}
