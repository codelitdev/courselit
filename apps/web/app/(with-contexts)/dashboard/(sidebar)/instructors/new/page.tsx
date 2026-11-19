"use client";

import { useRouter } from "next/navigation";
import { UIConstants } from "@courselit/common-models";
import DashboardContent from "@components/admin/dashboard-content";
import InstructorForm from "@components/admin/instructors/instructor-form";
import {
    INSTRUCTOR_DIALOG_CREATE_TITLE,
    INSTRUCTORS_PAGE_HEADING,
} from "@ui-config/strings";

const { permissions } = UIConstants;

const breadcrumbs = [
    { label: INSTRUCTORS_PAGE_HEADING, href: "/dashboard/instructors" },
    { label: INSTRUCTOR_DIALOG_CREATE_TITLE, href: "#" },
];

export default function NewInstructorPage() {
    const router = useRouter();

    return (
        <DashboardContent
            breadcrumbs={breadcrumbs}
            permissions={[permissions.manageAnyCourse, permissions.manageSite]}
        >
            <div className="max-w-2xl space-y-8">
                <h1 className="text-4xl font-semibold">
                    {INSTRUCTOR_DIALOG_CREATE_TITLE}
                </h1>
                <InstructorForm
                    onSaved={() => router.push("/dashboard/instructors")}
                />
            </div>
        </DashboardContent>
    );
}
