import GQLContext from "../../models/GQLContext";
import { Page } from "../../models/Page";
// import { getMedia } from "../media/logic";

// export async function replaceMediaIdWithMediaObjectForWidget(
//     settings: Record<string, unknown>
// ) {
//     const result: Record<string, unknown> = {};
//     console.log('replateMedia', settings);
//     for (let prop of Object.keys(settings)) {
//         if (
//             typeof settings[prop] === "object" &&
//             (settings[prop] as Record<string, unknown>).mediaId
//         ) {
//             result[prop] = await getMedia(
//                 (settings[prop] as Record<string, string>).mediaId
//             );
//         } else {
//             result[prop] = settings[prop];
//         }
//     }
//     return result;
// }

export function getPageResponse(page: Page, ctx: GQLContext) {
    let layout = page.layout.map((widget) =>
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
