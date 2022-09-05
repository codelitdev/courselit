import GQLContext from "../../models/GQLContext";
import { Page } from "../../models/Page";

export function getPageResponse(page: Page, ctx: GQLContext) {
    const layout = page.layout.map((widget) =>
        widget.shared
            ? Object.assign({}, ctx.subdomain.sharedWidgets[widget.name], {
                  widgetId: widget.widgetId,
              })
            : widget
    );
    return {
        pageId: page.pageId,
        name: page.name,
        type: page.type,
        entityId: page.entityId,
        layout,
        draftLayout: page.draftLayout
            ? page.draftLayout.length
                ? page.draftLayout.map((widget) =>
                      widget.shared
                          ? Object.assign(
                                {},
                                ctx.subdomain.sharedWidgets[widget.name],
                                { widgetId: widget.widgetId }
                            )
                          : widget
                  )
                : layout
            : undefined,
    };
}
