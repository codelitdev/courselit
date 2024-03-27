import constants from "../../config/constants";
import CourseModel, { Course } from "../../models/Course";
import GQLContext from "../../models/GQLContext";
import { Page } from "../../models/Page";

export async function getPageResponse(page: Page, ctx: GQLContext) {
    let layout = page.layout.map((widget) =>
        widget.shared
            ? Object.assign({}, ctx.subdomain.sharedWidgets[widget.name], {
                  widgetId: widget.widgetId,
              })
            : widget,
    );
    const pageData =
        page.type.toLowerCase() === constants.product
            ? await getCourse(
                  page.entityId!,
                  ctx.subdomain._id as unknown as string,
              )
            : {};

    return {
        pageId: page.pageId,
        name: page.name,
        type: page.type,
        entityId: page.entityId,
        pageData,
        layout,
        draftLayout: page.draftLayout
            ? page.draftLayout.length
                ? page.draftLayout.map((widget) =>
                      widget.shared
                          ? Object.assign(
                                {},
                                ctx.subdomain.sharedWidgets[widget.name],
                                { widgetId: widget.widgetId },
                            )
                          : widget,
                  )
                : layout
            : undefined,
    };
}

async function getCourse(
    courseId: string,
    domain: string,
): Promise<Pick<
    Course,
    | "courseId"
    | "title"
    | "description"
    | "cost"
    | "costType"
    | "type"
    | "tags"
    | "featuredImage"
> | null> {
    return await CourseModel.findOne(
        {
            courseId,
            domain,
        },
        {
            _id: 0,
            courseId: 1,
            title: 1,
            description: 1,
            cost: 1,
            costType: 1,
            type: 1,
            tags: 1,
            featuredImage: 1,
        },
    );
}
