"use client";

import { TextRenderer } from "@courselit/page-blocks";
import { ThemeStyle } from "@courselit/page-models";
import { TableOfContent } from "@components/table-of-content";
import WidgetErrorBoundary from "@components/public/base-layout/template/widget-error-boundary";

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
            <WidgetErrorBoundary widgetName="text-editor">
                <TextRenderer json={json} theme={theme} />
            </WidgetErrorBoundary>
        </div>
    );
}
