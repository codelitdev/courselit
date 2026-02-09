import constants from "../../config/constants";
import CourseModel from "@courselit/orm-models/dao/course";
import GQLContext from "../../models/GQLContext";
import { Page } from "@courselit/orm-models/dao/page";
import { Domain } from "@courselit/orm-models/dao/domain";
import { Course } from "@courselit/common-models";

const { analyticsDurations } = constants;

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

export const calculatePastDate = (
    duration: (typeof analyticsDurations)[number],
    domain: Domain,
    from?: Date,
): Date => {
    const startDate = from || new Date();
    let result: Date = new Date(startDate.getTime());

    result.setUTCHours(0, 0, 0, 0);

    switch (duration) {
        case "1d":
            result.setUTCDate(result.getUTCDate() - 0);
            break;
        case "7d":
            result.setUTCDate(result.getUTCDate() - 6);
            break;
        case "30d":
            result.setUTCDate(result.getUTCDate() - 29);
            break;
        case "90d":
            result.setUTCDate(result.getUTCDate() - 89);
            break;
        case "1y":
            result.setUTCFullYear(result.getUTCFullYear() - 1);
            break;
        case "lifetime":
            result = new Date(domain.createdAt);
            break;
        default:
            throw new Error("Invalid duration");
    }

    return result;
};
