"use client";

import { ComponentType, useContext, useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    ChevronRight,
    MoreHorizontal,
    Plus,
    FileText,
    Video,
    HelpCircle,
    ChevronDown,
    Droplets,
} from "lucide-react";
import Link from "next/link";
import {
    BUTTON_NEW_LESSON_TEXT,
    BUTTON_NEW_LESSON_TEXT_DOWNLOAD,
    COURSE_CONTENT_HEADER,
    EDIT_SECTION_HEADER,
    LESSON_GROUP_DELETED,
    MANAGE_COURSES_PAGE_HEADING,
    TOAST_TITLE_ERROR,
    TOAST_TITLE_SUCCESS,
} from "@ui-config/strings";
import DashboardContent from "@components/admin/dashboard-content";
import { AddressContext } from "@components/contexts";
import useProduct from "@/hooks/use-product";
import { truncate } from "@ui-lib/utils";
import { Constants, Group, UIConstants } from "@courselit/common-models";
import { DragAndDrop, useToast } from "@courselit/components-library";
import { FetchBuilder } from "@courselit/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
const { permissions } = UIConstants;

const DragAndDropWithDisabled = DragAndDrop as ComponentType<{
    items: any;
    onChange: any;
    Renderer: any;
    disabled?: boolean;
}>;

export default function ContentPage() {
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [sectionMenuOpenId, setSectionMenuOpenId] = useState<string | null>(
        null,
    );
    const [itemToDelete, setItemToDelete] = useState<Record<
        string,
        string
    > | null>(null);
    const [collapsedSections, setCollapsedSections] = useState<string[]>([]);
    const [orderedSections, setOrderedSections] = useState<any[]>([]);
    const [isReordering, setIsReordering] = useState(false);
    const router = useRouter();
    const params = useParams();
    const productId = params.id as string;
    const address = useContext(AddressContext);
    const { product } = useProduct(productId);
    const sortedProductGroups = useMemo(
        () =>
            [...(product?.groups ?? [])].sort(
                (a, b) => (a.rank ?? 0) - (b.rank ?? 0),
            ),
        [product?.groups],
    );

    useEffect(() => {
        setOrderedSections(sortedProductGroups);
    }, [sortedProductGroups]);
    const breadcrumbs = [
        { label: MANAGE_COURSES_PAGE_HEADING, href: "/dashboard/products" },
        {
            label: product ? truncate(product.title || "", 20) || "..." : "...",
            href: `/dashboard/product/${productId}`,
        },
        { label: COURSE_CONTENT_HEADER, href: "#" },
    ];
    const { toast } = useToast();

    const handleDelete = async () => {
        const item = itemToDelete;
        setDeleteDialogOpen(false);
        setItemToDelete(null);
        setSectionMenuOpenId(null);
        await removeGroup(item?.id!, product?.courseId!);
    };

    const toggleSectionCollapse = (sectionId: string) => {
        setCollapsedSections((prev) =>
            prev.includes(sectionId)
                ? prev.filter((id) => id !== sectionId)
                : [...prev, sectionId],
        );
    };

    const LessonTypeIcon = ({ type }) => {
        switch (type) {
            case "video":
                return <Video className="h-4 w-4 text-muted-foreground" />;
            case "text":
                return <FileText className="h-4 w-4 text-muted-foreground" />;
            case "quiz":
                return <HelpCircle className="h-4 w-4 text-muted-foreground" />;
            default:
                return null;
        }
    };

    const updateGroup = async (group, lessonsOrder: string[]) => {
        const mutation = `
        mutation UpdateGroup ($id: ID!, $courseId: String!, $lessonsOrder: [String]!) {
            updateGroup(
                id: $id,
                courseId: $courseId,
                lessonsOrder: $lessonsOrder
            ) {
               courseId,
               title
            }
        }
        `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload({
                query: mutation,
                variables: {
                    id: group.id,
                    courseId: product?.courseId,
                    lessonsOrder,
                },
            })
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            await fetch.exec();
        } catch (err: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        }
    };

    const removeGroup = async (groupId: string, courseId: string) => {
        const mutation = `
            mutation RemoveGroup ($id: String!, $courseId: String!) {
                removeGroup(
                    id: $id,
                    courseId: $courseId
                ) {
                courseId 
                }
            }
        `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload({
                query: mutation,
                variables: {
                    id: groupId,
                    courseId: courseId,
                },
            })
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            const response = await fetch.exec();
            if (response.removeGroup?.courseId) {
                setOrderedSections((prev) =>
                    prev.filter((section) => section.id !== groupId),
                );
                toast({
                    title: TOAST_TITLE_SUCCESS,
                    description: LESSON_GROUP_DELETED,
                });
                // course.groups.splice(
                //     course.groups.findIndex((group) => group.id === groupId),
                //     1,
                // );
            }
        } catch (err: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        }
    };

    const reorderGroups = async (
        groupIds: string[],
        fallbackSections: any[],
    ) => {
        if (!product?.courseId) {
            return;
        }

        const mutation = `
            mutation ReorderGroups($courseId: String!, $groupIds: [String!]!) {
                course: reorderGroups(courseId: $courseId, groupIds: $groupIds) {
                    courseId
                    groups {
                        id
                        rank
                    }
                }
            }
        `;

        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload({
                query: mutation,
                variables: {
                    courseId: product.courseId,
                    groupIds,
                },
            })
            .setIsGraphQLEndpoint(true)
            .build();

        setIsReordering(true);
        try {
            await fetch.exec();
        } catch (err: any) {
            setOrderedSections(fallbackSections);
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setIsReordering(false);
        }
    };

    const renderedSections = orderedSections.map((section) => ({
        id: section.id,
        section,
    }));

    return (
        <DashboardContent
            breadcrumbs={breadcrumbs}
            permissions={[
                permissions.manageAnyCourse,
                permissions.manageCourse,
            ]}
        >
            <h1 className="text-4xl font-semibold tracking-tight mb-8">
                Content
            </h1>

            <ScrollArea className="h-[calc(100vh-180px)]">
                <DragAndDropWithDisabled
                    key={renderedSections
                        .map((section) => section.id)
                        .join(",")}
                    items={renderedSections}
                    disabled={isReordering}
                    onChange={(items: any[]) => {
                        if (isReordering) {
                            return;
                        }

                        const fallbackSections = [...orderedSections];
                        const nextSections = items.map((item) => item.section);
                        setOrderedSections(nextSections);
                        reorderGroups(
                            nextSections.map((section) => section.id),
                            fallbackSections,
                        );
                    }}
                    Renderer={({ section }: { section: Group }) => (
                        <div className="mb-6 relative w-full">
                            <div className="flex items-center justify-between mb-3 border-b border-gray-200 pb-3">
                                <div className="flex items-center space-x-3">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                            toggleSectionCollapse(section.id)
                                        }
                                        className="p-0 hover:bg-transparent"
                                    >
                                        {collapsedSections.includes(
                                            section.id,
                                        ) ? (
                                            <ChevronRight className="h-5 w-5 text-gray-500" />
                                        ) : (
                                            <ChevronDown className="h-5 w-5 text-gray-500" />
                                        )}
                                    </Button>
                                    <div className="flex items-center space-x-2">
                                        <h2 className="text-xl font-semibold tracking-tight">
                                            {section.name}
                                        </h2>
                                        {section.drip?.status && (
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger>
                                                        <Droplets className="h-4 w-4 text-gray-400" />
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>
                                                            This section has
                                                            scheduled release
                                                        </p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        )}
                                    </div>
                                </div>
                                <DropdownMenu
                                    modal={false}
                                    open={sectionMenuOpenId === section.id}
                                    onOpenChange={(open) =>
                                        setSectionMenuOpenId(
                                            open ? section.id : null,
                                        )
                                    }
                                >
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="hover:bg-gray-100"
                                        >
                                            <MoreHorizontal className="h-5 w-5" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                            onClick={() =>
                                                router.push(
                                                    `/dashboard/product/${productId}/content/section/${section.id}`,
                                                )
                                            }
                                        >
                                            {EDIT_SECTION_HEADER}
                                        </DropdownMenuItem>
                                        {!(
                                            product?.type?.toLowerCase() ===
                                                Constants.CourseType.DOWNLOAD &&
                                            product?.groups?.length === 1
                                        ) && (
                                            <>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={() => {
                                                        setSectionMenuOpenId(
                                                            null,
                                                        );
                                                        setItemToDelete({
                                                            type: "section",
                                                            title: section.name,
                                                            id: section.id,
                                                        });
                                                        setDeleteDialogOpen(
                                                            true,
                                                        );
                                                    }}
                                                    className="text-red-600"
                                                >
                                                    Delete Section
                                                </DropdownMenuItem>
                                            </>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                            {!collapsedSections.includes(section.id) && (
                                <div className="space-y-2 ml-8">
                                    <DragAndDrop
                                        items={product
                                            ?.lessons!.filter(
                                                (lesson) =>
                                                    lesson.groupId ===
                                                    section.id,
                                            )
                                            .sort(
                                                (a: any, b: any) =>
                                                    (
                                                        section.lessonsOrder as any[]
                                                    )?.indexOf(a.lessonId) -
                                                    (
                                                        section.lessonsOrder as any[]
                                                    )?.indexOf(b.lessonId),
                                            )
                                            .map((lesson) => ({
                                                id: lesson.lessonId,
                                                courseId: product?.courseId,
                                                groupId: lesson.groupId,
                                                lesson,
                                            }))}
                                        Renderer={({ lesson }) => (
                                            <div
                                                className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted transition-colors duration-150 ease-in-out cursor-pointer w-full"
                                                onClick={() =>
                                                    router.push(
                                                        `/dashboard/product/${productId}/content/section/${section.id}/lesson?id=${lesson.lessonId}`,
                                                    )
                                                }
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <LessonTypeIcon
                                                        type={lesson.type}
                                                    />
                                                    <span className="text-sm font-medium text-foreground">
                                                        {lesson.title}
                                                    </span>
                                                </div>
                                                <div className="flex items-center space-x-3">
                                                    {!lesson.published && (
                                                        <Badge
                                                            variant="outline"
                                                            className="ml-2 text-xs"
                                                        >
                                                            Draft
                                                        </Badge>
                                                    )}
                                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                            </div>
                                        )}
                                        key={JSON.stringify(product?.lessons)}
                                        onChange={(items: any) => {
                                            const newLessonsOrder: any =
                                                items.map(
                                                    (item: {
                                                        lesson: {
                                                            lessonId: any;
                                                        };
                                                    }) => item.lesson.lessonId,
                                                );
                                            updateGroup(
                                                section,
                                                newLessonsOrder,
                                            );
                                        }}
                                    />
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="mt-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                                        asChild
                                    >
                                        <Link
                                            href={`/dashboard/product/${productId}/content/section/${section.id}/lesson`}
                                        >
                                            <Plus className="mr-2 h-4 w-4" />
                                            {product?.type?.toLowerCase() ===
                                            Constants.CourseType.DOWNLOAD
                                                ? BUTTON_NEW_LESSON_TEXT_DOWNLOAD
                                                : BUTTON_NEW_LESSON_TEXT}
                                        </Link>
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                />
                {product?.type?.toLowerCase() !==
                    Constants.CourseType.DOWNLOAD && (
                    <div className="mt-8 flex justify-center">
                        <Button
                            variant="outline"
                            className="text-sm font-medium"
                            asChild
                        >
                            <Link
                                href={`/dashboard/product/${productId}/content/section/new`}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Add Section
                            </Link>
                        </Button>
                    </div>
                )}
            </ScrollArea>

            <Dialog
                open={deleteDialogOpen}
                onOpenChange={(open) => {
                    setDeleteDialogOpen(open);
                    if (!open) {
                        setItemToDelete(null);
                    }
                }}
            >
                <DialogContent
                    onCloseAutoFocus={(event) => event.preventDefault()}
                >
                    <DialogHeader>
                        <DialogTitle className="text-xl font-semibold">
                            Confirm Deletion
                        </DialogTitle>
                        <DialogDescription className="text-sm text-gray-500 mt-2">
                            Are you sure you want to delete the{" "}
                            {itemToDelete?.type} &quot;{itemToDelete?.title}
                            &quot;? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-6">
                        <Button
                            variant="outline"
                            onClick={() => setDeleteDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDelete}>
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardContent>
    );
}
