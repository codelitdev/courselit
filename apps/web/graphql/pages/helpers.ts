import { Constants } from "@courselit/common-models";
import constants from "../../config/constants";
import GQLContext from "../../models/GQLContext";
import { Page } from "../../models/Page";
import { getCommunity } from "../communities/logic";
import { getCourse } from "../courses/logic";

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
        pageType: Constants.PageType.SITE,
    };
    switch (page.type) {
        case constants.product:
            const course = await getCourse(page.entityId!, ctx);
            if (course) {
                pageData = {
                    pageType: Constants.PageType.PRODUCT,
                    title: course.title,
                    cost: course.cost,
                    costType: course.costType,
                    type: course.type,
                    tags: course.tags,
                    featuredImage: course.featuredImage,
                    courseId: course.courseId,
                    leadMagnet: course.leadMagnet,
                    defaultPaymentPlan: course.defaultPaymentPlan,
                    paymentPlans: course.paymentPlans.map((p) => ({
                        emiAmount: p.emiAmount,
                        emiTotalInstallments: p.emiTotalInstallments,
                        subscriptionMonthlyAmount: p.subscriptionMonthlyAmount,
                        subscriptionYearlyAmount: p.subscriptionYearlyAmount,
                        type: p.type,
                        oneTimeAmount: p.oneTimeAmount,
                        name: p.name,
                        planId: p.planId,
                    })),
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
                    pageType: Constants.PageType.COMMUNITY,
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
                    membersCount: community.membersCount,
                    featuredImage: community.featuredImage,
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

// async function getCourse(
//     courseId: string,
//     domain: string,
// ): Promise<Pick<
//     Course,
//     | "courseId"
//     | "title"
//     | "description"
//     | "cost"
//     | "costType"
//     | "type"
//     | "tags"
//     | "featuredImage"
//     | "leadMagnet"
//     | "defaultPaymentPlan"
//     | "paymentPlans"
// > | null> {
//     return await CourseModel.findOne(
//         {
//             courseId,
//             domain,
//         },
//         {
//             _id: 0,
//             courseId: 1,
//             title: 1,
//             description: 1,
//             cost: 1,
//             costType: 1,
//             type: 1,
//             tags: 1,
//             featuredImage: 1,
//             leadMagnet: 1,
//             defaultPaymentPlan: 1,
//             paymentPlans: 1,
//         },
//     );
// }
