import { Metadata, ResolvingMetadata } from "next";
import UsersHub from "./users-hub";

export async function generateMetadata(
    props: {
        params: Promise<any>;
        searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
    },
    parent: ResolvingMetadata,
): Promise<Metadata> {
    const searchParams = await props.searchParams;
    const tab = searchParams["tab"] || "All users";

    return {
        title: `${tab} | ${(await parent)?.title?.absolute}`,
    };
}

export default function Page() {
    return <UsersHub />;
}
