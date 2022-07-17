import GQLContext from "../../models/GQLContext";
import { Page } from "../../models/Page";

export function getPageResponse(page: Page, ctx: GQLContext) {
    return {
        pageId: page.pageId,
        name: page.name,
        type: page.type,
        entityId: page.entityId,
        layout: [ctx.subdomain.header, ...page.layout, ctx.subdomain.footer],
        draftLayout: page.draftLayout ? page.draftLayout.length ? [
            ctx.subdomain.header,
            ...page.draftLayout,
            ctx.subdomain.footer,
        ] : [
            ctx.subdomain.header,
            ...page.layout,
            ctx.subdomain.footer,
        ] : undefined,
    };
}