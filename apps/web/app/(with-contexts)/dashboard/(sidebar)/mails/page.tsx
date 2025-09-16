import { Metadata, ResolvingMetadata } from "next";
import MailHub from "./mail-hub";

export async function generateMetadata(
    props: {
        params: Promise<any>;
        searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
    },
    parent: ResolvingMetadata,
): Promise<Metadata> {
    const searchParams = await props.searchParams;
    const tab = searchParams["tab"] || "Broadcasts";

    return {
        title: `${tab} | ${(await parent)?.title?.absolute}`,
    };
}

export default function Page() {
    return <MailHub />;
}
