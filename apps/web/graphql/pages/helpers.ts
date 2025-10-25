import { Constants } from "@courselit/common-models";
import constants from "../../config/constants";
import GQLContext from "../../models/GQLContext";
import { Page } from "../../models/Page";
import { getCommunity } from "../communities/logic";
import { getCourse } from "../courses/logic";
import { generateUniqueId } from "@courselit/utils";
import { getPlans } from "../paymentplans/logic";

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
                    paymentPlans: (
                        await getPlans({
                            entityId: course.courseId,
                            entityType: Constants.MembershipEntityType.COURSE,
                            ctx,
                        })
                    ).map((p) => ({
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
                    membersCount: community.membersCount,
                    featuredImage: community.featuredImage,
                    paymentPlans: (
                        await getPlans({
                            entityId: community.communityId,
                            entityType:
                                Constants.MembershipEntityType.COMMUNITY,
                            ctx,
                        })
                    ).map((p) => ({
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
    }

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

export async function initSharedWidgets(ctx: GQLContext) {
    let subdomainChanged = false;
    if (!ctx.subdomain.sharedWidgets.header) {
        ctx.subdomain.sharedWidgets.header = {
            name: "header",
            shared: true,
            deleteable: false,
            widgetId: generateUniqueId(),
            settings: {
                links: [
                    {
                        label: "Products",
                        href: "/products",
                        isButton: false,
                        isPrimary: false,
                    },
                    {
                        label: "Blog",
                        href: "/blog",
                        isButton: false,
                        isPrimary: false,
                    },
                    {
                        label: "Start learning",
                        href: "/products",
                        isButton: true,
                        isPrimary: true,
                    },
                ],
                linkAlignment: "center",
                showLoginControl: true,
                linkFontWeight: "font-normal",
                spacingBetweenLinks: 16,
            },
        };
        subdomainChanged = true;
    }
    if (!ctx.subdomain.sharedWidgets.footer) {
        ctx.subdomain.sharedWidgets.footer = {
            name: "footer",
            shared: true,
            deleteable: false,
            widgetId: generateUniqueId(),
            settings: {
                sections: [
                    {
                        name: "Legal",
                        links: [
                            { label: "Terms of Use", href: "/p/terms" },
                            { label: "Privacy Policy", href: "/p/privacy" },
                        ],
                    },
                ],
                titleFontSize: 2,
                socials: {
                    facebook: "",
                    twitter: "https://twitter.com/courselit",
                    instagram: "",
                    youtube: "",
                    linkedin: "",
                    discord: "",
                    github: "https://github.com/codelitdev/courselit",
                },
                socialIconsSize: 24,
            },
        };
        subdomainChanged = true;
    }
    // if (!ctx.subdomain.sharedWidgets["newsletter-signup"]) {
    //     ctx.subdomain.sharedWidgets["newsletter-signup"] = {
    //         name: "newsletter-signup",
    //         shared: true,
    //         deleteable: true,
    //         widgetId: generateUniqueId(),
    //         settings: {
    //             alignment: "center",
    //         },
    //     };
    //     subdomainChanged = true;
    // }
    if (subdomainChanged) {
        (ctx.subdomain as any).markModified("sharedWidgets");
        try {
            await (ctx.subdomain as any).save();
        } catch (e) {}
    }
}

export async function copySharedWidgetsToDomain(
    layout,
    domain: GQLContext["subdomain"],
) {
    for (let widget of layout) {
        if (widget.widgetId && isSharedWidget(widget)) {
            domain.draftSharedWidgets[widget.name] = Object.assign(
                {},
                domain.draftSharedWidgets[widget.name],
                widget,
            );
            widget.settings = undefined;
        }
    }
    (domain as any).markModified("draftSharedWidgets");
    await (domain as any).save();
    return layout;
}

function isSharedWidget(widget: any) {
    return ["header", "footer"].includes(widget.name);
}
