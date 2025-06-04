"use client";

import { TextRenderer } from "@courselit/components-library";

export default function ClientSideTextRenderer({ json }: { json: any }) {
    return <TextRenderer json={json} showTableOfContent={true} />;
}
