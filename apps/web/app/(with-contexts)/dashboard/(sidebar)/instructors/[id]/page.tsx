"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { UIConstants } from "@courselit/common-models";
import DashboardContent from "@components/admin/dashboard-content";
import InstructorForm from "@components/admin/instructors/instructor-form";
import useInstructors from "@/hooks/use-instructors";
import {
    INSTRUCTOR_DIALOG_EDIT_TITLE,
    INSTRUCTORS_PAGE_HEADING,
} from "@ui-config/strings";

const { permissions } = UIConstants;

const breadcrumbs = [
    { label: INSTRUCTORS_PAGE_HEADING, href: "/dashboard/instructors" },
    { label: INSTRUCTOR_DIALOG_EDIT_TITLE, href: "#" },
];

export default function EditInstructorPage(props: {
    params: Promise<{ id: string }>;
}) {
    const { id } = use(props.params);
    const router = useRouter();
    const { instructors, loaded } = useInstructors();
    const instructor = instructors.find((item) => item.instructorId === id);

    if (loaded && !instructor) {
        router.replace("/dashboard/instructors");
    }

    return (
        <DashboardContent
            breadcrumbs={breadcrumbs}
            permissions={[permissions.manageAnyCourse, permissions.manageSite]}
        >
            <div className="max-w-2xl space-y-8">
                <h1 className="text-4xl font-semibold">
                    {INSTRUCTOR_DIALOG_EDIT_TITLE}
                </h1>
                {instructor && (
                    <InstructorForm
                        key={instructor.instructorId}
                        instructor={instructor}
                        onSaved={() => router.push("/dashboard/instructors")}
                    />
                )}
            </div>
        </DashboardContent>
    );
}
