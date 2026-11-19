"use client";

import { useState } from "react";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { UIConstants } from "@courselit/common-models";
import type { Instructor } from "@courselit/common-models";
import { useToast } from "@courselit/components-library";
import DashboardContent from "@components/admin/dashboard-content";
import AdminEmptyState from "@components/admin/empty-state";
import InstructorAvatar from "@components/instructors/instructor-avatar";
import { Button } from "@components/ui/button";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@components/ui/alert-dialog";
import { useGraphQLFetch } from "@/hooks/use-graphql-fetch";
import useInstructors from "@/hooks/use-instructors";
import {
    BTN_NEW_INSTRUCTOR,
    INSTRUCTORS_EMPTY_DESCRIPTION,
    INSTRUCTORS_EMPTY_TITLE,
    INSTRUCTORS_PAGE_DESCRIPTION,
    INSTRUCTORS_PAGE_HEADING,
    INSTRUCTOR_DELETED_MESSAGE,
    INSTRUCTOR_DELETE_DESCRIPTION,
    INSTRUCTOR_DELETE_TITLE,
    TOAST_TITLE_ERROR,
    TOAST_TITLE_SUCCESS,
} from "@ui-config/strings";

const { permissions } = UIConstants;

const breadcrumbs = [{ label: INSTRUCTORS_PAGE_HEADING, href: "#" }];

const MUTATION_DELETE = `
    mutation DeleteInstructor($instructorId: String!) {
        deleted: deleteInstructor(instructorId: $instructorId)
    }
`;

export default function InstructorsPage() {
    const { toast } = useToast();
    const fetch = useGraphQLFetch();
    const { instructors, loaded, reload } = useInstructors();
    const [toDelete, setToDelete] = useState<Instructor | null>(null);

    const confirmDelete = async () => {
        if (!toDelete) return;
        const { instructorId } = toDelete;
        setToDelete(null);
        try {
            const response = await fetch
                .setPayload({
                    query: MUTATION_DELETE,
                    variables: { instructorId },
                })
                .build()
                .exec();
            if (response?.deleted) {
                toast({
                    title: TOAST_TITLE_SUCCESS,
                    description: INSTRUCTOR_DELETED_MESSAGE,
                });
                await reload();
            }
        } catch (err: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        }
    };

    return (
        <DashboardContent
            breadcrumbs={breadcrumbs}
            permissions={[permissions.manageAnyCourse, permissions.manageSite]}
        >
            <div className="space-y-8">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-semibold">
                            {INSTRUCTORS_PAGE_HEADING}
                        </h1>
                        <p className="text-muted-foreground mt-2">
                            {INSTRUCTORS_PAGE_DESCRIPTION}
                        </p>
                    </div>
                    <Link href="/dashboard/instructors/new">
                        <Button>{BTN_NEW_INSTRUCTOR}</Button>
                    </Link>
                </div>
                {loaded && instructors.length === 0 && (
                    <AdminEmptyState
                        title={INSTRUCTORS_EMPTY_TITLE}
                        description={INSTRUCTORS_EMPTY_DESCRIPTION}
                    />
                )}
                <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {instructors.map((instructor) => (
                        <li
                            key={instructor.instructorId}
                            className="flex items-start gap-4 rounded-lg border p-4"
                        >
                            <InstructorAvatar
                                instructor={instructor}
                                className="h-12 w-12"
                            />
                            <div className="min-w-0 flex-1">
                                <p className="font-semibold">
                                    {instructor.name}
                                </p>
                                {instructor.bio && (
                                    <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
                                        {instructor.bio}
                                    </p>
                                )}
                            </div>
                            <div className="flex shrink-0 gap-1">
                                <Button
                                    asChild
                                    variant="ghost"
                                    size="icon"
                                    aria-label={`Edit ${instructor.name}`}
                                >
                                    <Link
                                        href={`/dashboard/instructors/${instructor.instructorId}`}
                                        aria-label={`Edit ${instructor.name}`}
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </Link>
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={`Delete ${instructor.name}`}
                                    onClick={() => setToDelete(instructor)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
            <AlertDialog
                open={Boolean(toDelete)}
                onOpenChange={(open) => !open && setToDelete(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {INSTRUCTOR_DELETE_TITLE}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {INSTRUCTOR_DELETE_DESCRIPTION}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete}>
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </DashboardContent>
    );
}
