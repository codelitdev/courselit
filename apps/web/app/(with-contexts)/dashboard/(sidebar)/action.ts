"use server";

import { auth } from "@/auth";
import { Domain, Page } from "@courselit/common-models";
import DomainModel from "@models/Domain";
import { ObjectId } from "mongodb";
import { getProfile } from "../../action";
import { hasPermissionToAccessSetupChecklist } from "@/lib/utils";
import CourseModel from "@models/Course";
import PageModel from "@models/Page";
import constants from "@config/constants";
import { headers } from "next/headers";

const DEFAULT_PAGE_CONTENT =
    "This is the default page created for you by CourseLit";

export async function getSetupChecklist(): Promise<{
    checklist: string[];
    total: number;
} | null> {
    const session = await auth.api.getSession({
        headers: await headers(),
    });
    if (!session) {
        return null;
    }

    try {
        const domain = await DomainModel.findOne<Domain>(
            {
                _id: new ObjectId((session.user as any)?.domainId!),
            },
            {
                _id: 1,
                name: 1,
                "settings.title": 1,
                "settings.currencyISOCode": 1,
                "settings.paymentMethod": 1,
            },
        ).lean();
        if (!domain) {
            return null;
        }

        const user = await getProfile();
        if (!user) {
            return null;
        }

        if (!hasPermissionToAccessSetupChecklist(user.permissions)) {
            return null;
        }

        const [publishedProducts, homePage] = await Promise.all([
            CourseModel.countDocuments({
                domain: domain._id,
                published: true,
            }),
            PageModel.findOne(
                {
                    domain: domain._id,
                    pageId: "homepage",
                },
                {
                    "layout.name": 1,
                    "layout.settings": 1,
                },
            ).lean() as unknown as Page,
        ]);

        const checklist = {
            branding: constants.multitenant
                ? domain.settings.title === domain.name
                : domain.settings.title ===
                  constants.schoolNameForSingleTenancy,
            payment: !(
                domain.settings.currencyISOCode && domain.settings.paymentMethod
            ),
            product: publishedProducts === 0,
            page: homePage?.layout
                .filter((x) => x.name === "rich-text")
                .some((block) =>
                    JSON.stringify(block.settings?.text || "").includes(
                        DEFAULT_PAGE_CONTENT,
                    ),
                ),
        };

        return {
            checklist: Object.keys(checklist).filter((x) => checklist[x]),
            total: Object.keys(checklist).length,
        };
    } catch (err: any) {
        return null;
    }
}
