"use client";

import { TextRenderer } from "@courselit/page-blocks";
import { ThemeStyle } from "@courselit/page-models";
import { TableOfContent } from "@components/table-of-content";

export default function ClientSideTextRenderer({
    json,
    theme,
}: {
    json: any;
    theme: ThemeStyle;
}) {
    return (
        <div className="flex flex-col gap-4">
            <TableOfContent json={json} theme={theme} />
            <TextRenderer json={json} theme={theme} />
        </div>
    );
}
