import { Constants } from "@courselit/common-models";
import constants from "../../config/constants";
import GQLContext from "../../models/GQLContext";
import PageModel, { Page } from "../../models/Page";
import { getCommunity } from "../communities/logic";
import { getCourse } from "../courses/logic";
import { generateUniqueId, slugify } from "@courselit/utils";
import { getPlans } from "../paymentplans/logic";
import mongoose from "mongoose";
import { responses } from "../../config/strings";

const MAX_SLUG_ATTEMPTS = 100;
const MAX_SLUG_LENGTH = 200;

/**
 * Validates and slugifies a raw string input.
 * Throws if the result is empty or exceeds max length.
 */
export function validateSlug(raw: string): string {
    const slugged = slugify(raw);
    if (!slugged) throw new Error(responses.invalid_input);
    if (slugged.length > MAX_SLUG_LENGTH)
        throw new Error(responses.invalid_input);
    return slugged;
}

/**
 * Generates a unique pageId by slugifying the base.
 *
 * When `useSuffixOnCollision` is true (default), appends numeric
 * suffixes (-1, -2, …) on collision. When false, throws
 * `page_id_already_exists` on the first collision — useful for
 * user-created pages where the slug is chosen deliberately.
 *
 * Callers should wrap Page creation in try-catch for isDuplicateKeyError
 * to handle TOCTOU race conditions.
 */
export async function generateUniquePageId(
    domainId: mongoose.Types.ObjectId,
    baseSlug: string,
    useSuffixOnCollision: boolean = true,
): Promise<string> {
    const base = validateSlug(baseSlug);

    let candidate = base;
    let suffix = 0;

    while (suffix < MAX_SLUG_ATTEMPTS) {
        const existing = await PageModel.findOne({
            domain: domainId,
            pageId: candidate,
        });
        if (!existing) return candidate;
        if (!useSuffixOnCollision) {
            throw new Error(responses.page_id_already_exists);
        }
        suffix++;
        candidate = `${base}-${suffix}`;
    }
    throw new Error(responses.internal_error);
}

/**
 * Detects MongoDB duplicate key errors (code 11000).
 */
export function isDuplicateKeyError(err: any): boolean {
    return err?.code === 11000;
}

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

// TODO: Figure out a better way to update ctx.subdomain.sharedWidgets
// currently this function is getting called multiple times as the version 0
// of the subdomain is not getting replaces in ctx
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
