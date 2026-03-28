import { hasPermissionToAccessSetupChecklist } from "@/lib/utils";
import DashboardContent from "@components/admin/dashboard-content";
import { GET_SET_UP } from "@ui-config/strings";
import { getSetupChecklist } from "../action";
import { getProfile } from "@/app/(with-contexts)/action";
import SetupAccordion from "./setup-accordion";
import { redirect } from "next/navigation";
import { checkPermission } from "@courselit/utils";
import { ADMIN_PERMISSIONS } from "@ui-config/constants";
import { Metadata, ResolvingMetadata } from "next";

export async function generateMetadata(
    props,
    parent: ResolvingMetadata,
): Promise<Metadata> {
    return {
        title: `${GET_SET_UP} | ${(await parent)?.title?.absolute}`,
    };
}

export default async function Page() {
    const profile = await getProfile();
    let setupChecklist: any = null;

    const breadcrumbs = [{ label: GET_SET_UP, href: "#" }];

    if (profile && profile.userId) {
        if (checkPermission(profile.permissions, ADMIN_PERMISSIONS)) {
            if (hasPermissionToAccessSetupChecklist(profile.permissions!)) {
                setupChecklist = await getSetupChecklist();
            } else {
                redirect("/dashboard/overview");
            }
        } else {
            redirect("/dashboard/my-content");
        }
    }

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            <div className="flex flex-col gap-4">
                <h1 className="text-4xl font-semibold mb-4">
                    Let&apos;s finish setting up your school!
                </h1>
                <SetupAccordion
                    checklist={setupChecklist?.checklist || []}
                    totalChecklistItems={setupChecklist?.total || 0}
                />
            </div>
        </DashboardContent>
    );
}
