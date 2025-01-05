import constants from "../../config/constants";
import CourseModel, { Course } from "../../models/Course";
import GQLContext from "../../models/GQLContext";
import { Page } from "../../models/Page";
import { getCommunity } from "../communities/logic";

export async function getPageResponse(
    page: Page,
    ctx: GQLContext,
): Promise<Partial<Page>> {
    const layout = page.layout.map((widget) =>
        widget.shared
            ? Object.assign({}, ctx.subdomain.sharedWidgets[widget.name], {
                  widgetId: widget.widgetId,
              })
            : widget,
    );
    let pageData: any = {
        pageType: "site",
    };
    switch (page.type.toLowerCase()) {
        case constants.product:
            const course = await getCourse(
                page.entityId!,
                ctx.subdomain._id as unknown as string,
            );
            if (course) {
                pageData = {
                    ...course,
                    pageType: "product",
                };
            }
            break;
        case constants.communityPage:
            const community = await getCommunity({
                ctx,
                id: page.entityId!,
            });
            if (community) {
                pageData = {
                    name: community.name,
                    description: community.description,
                    communityId: community.communityId,
                    defaultPaymentPlan: community.defaultPaymentPlan,
                    paymentPlans: community.paymentPlans.map((p) => ({
                        emiAmount: p.emiAmount,
                        emiTotalInstallments: p.emiTotalInstallments,
                        subscriptionMonthlyAmount: p.subscriptionMonthlyAmount,
                        subscriptionYearlyAmount: p.subscriptionYearlyAmount,
                        type: p.type,
                        oneTimeAmount: p.oneTimeAmount,
                        name: p.name,
                        planId: p.planId,
                    })),
                    pageType: "community",
                    membersCount: community.membersCount,
                };
            }
            break;
    }
    // const pageData =
    //     page.type.toLowerCase() === constants.product
    //         ? await getCourse(
    //               page.entityId!,
    //               ctx.subdomain._id as unknown as string,
    //           )
    //         : {};

    const sharedWidgetsToDraftSharedWidgets = (widget) =>
        widget.shared
            ? Object.assign(
                  {},
                  ctx.subdomain.draftSharedWidgets[widget.name] ||
                      ctx.subdomain.sharedWidgets[widget.name],
                  { widgetId: widget.widgetId },
              )
            : widget;

    return {
        pageId: page.pageId,
        name: page.name,
        type: page.type,
        entityId: page.entityId,
        pageData,
        layout,
        draftLayout: page.draftLayout
            ? page.draftLayout.length
                ? page.draftLayout.map(sharedWidgetsToDraftSharedWidgets)
                : layout.map(sharedWidgetsToDraftSharedWidgets)
            : undefined,
        title: page.title,
        description: page.description,
        socialImage: page.socialImage,
        robotsAllowed: page.robotsAllowed,
        draftTitle: page.draftTitle,
        draftDescription: page.draftDescription,
        draftSocialImage: page.draftSocialImage,
        draftRobotsAllowed: page.draftRobotsAllowed,
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
