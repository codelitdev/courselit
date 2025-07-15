import { Metadata, ResolvingMetadata } from "next";
import { EDIT_EMAIL } from "@ui-config/strings";

export async function generateMetadata(
    { params }: { params: any },
    parent: ResolvingMetadata,
): Promise<Metadata> {
    return {
        title: `${EDIT_EMAIL} | ${(await parent)?.title?.absolute}`,
    };
}

export default function DripEmailEditorLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
