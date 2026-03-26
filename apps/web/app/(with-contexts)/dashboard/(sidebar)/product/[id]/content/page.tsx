"use client";

import { useContext, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";
import {
    COURSE_CONTENT_HEADER,
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
import { useToast } from "@courselit/components-library";
import { FetchBuilder } from "@courselit/utils";
import { Plus } from "lucide-react";
import ContentSectionsBoard from "./components/content-sections-board";

const { permissions } = UIConstants;

export default function ContentPage() {
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<Record<
        string,
        string
    > | null>(null);
    const [orderedSections, setOrderedSections] = useState<Group[] | null>(
        null,
    );

    const params = useParams();
    const productId = params.id as string;
    const address = useContext(AddressContext);
    const { product } = useProduct(productId);
    const { toast } = useToast();
    const resolvedOrderedSections = orderedSections ?? product?.groups ?? [];

    const breadcrumbs = [
        { label: MANAGE_COURSES_PAGE_HEADING, href: "/dashboard/products" },
        {
            label: product ? truncate(product.title || "", 20) || "..." : "...",
            href: `/dashboard/product/${productId}`,
        },
        { label: COURSE_CONTENT_HEADER, href: "#" },
    ];

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
                    courseId,
                },
            })
            .setIsGraphQLEndpoint(true)
            .build();

        try {
            const response = await fetch.exec();
            if (response.removeGroup?.courseId) {
                setOrderedSections((prev) =>
                    (prev ?? product?.groups ?? []).filter(
                        (section) => section.id !== groupId,
                    ),
                );
                toast({
                    title: TOAST_TITLE_SUCCESS,
                    description: LESSON_GROUP_DELETED,
                });
            }
        } catch (err: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        }
    };

    const handleDelete = async () => {
        if (!itemToDelete?.id || !product?.courseId) {
            return;
        }

        setDeleteDialogOpen(false);
        await removeGroup(itemToDelete.id, product.courseId);
        setItemToDelete(null);
    };

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
                {product?.courseId ? (
                    <ContentSectionsBoard
                        orderedSections={resolvedOrderedSections}
                        setOrderedSections={setOrderedSections}
                        lessons={product.lessons ?? []}
                        courseId={product.courseId}
                        productId={productId}
                        productType={product.type}
                        address={address.backend}
                        onRequestDelete={(item) => {
                            setItemToDelete({
                                type: "section",
                                title: item.title,
                                id: item.id,
                            });
                            setDeleteDialogOpen(true);
                        }}
                    />
                ) : null}

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
