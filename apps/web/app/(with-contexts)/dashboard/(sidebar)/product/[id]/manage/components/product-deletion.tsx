"use client";

import { useContext, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Loader2 } from "lucide-react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@courselit/components-library";
import { FetchBuilder } from "@courselit/utils";
import { AddressContext } from "@components/contexts";
import {
    APP_MESSAGE_COURSE_DELETED,
    BTN_DELETE_COURSE,
    DANGER_ZONE_HEADER,
    TOAST_TITLE_ERROR,
    TOAST_TITLE_SUCCESS,
} from "@ui-config/strings";
import { useRouter } from "next/navigation";

interface ProductDeletionProps {
    product: any;
}

export default function ProductDeletion({ product }: ProductDeletionProps) {
    const { toast } = useToast();
    const router = useRouter();
    const address = useContext(AddressContext);
    const [deleteConfirmation, setDeleteConfirmation] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);

    const deleteProduct = async () => {
        if (!product) return;

        const query = `
            mutation {
                result: deleteCourse(id: "${product?.courseId}")
            }
        `;

        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload(query)
            .setIsGraphQLEndpoint(true)
            .build();

        try {
            setIsDeleting(true);
            const response = await fetch.exec();

            if (response.result) {
                toast({
                    title: TOAST_TITLE_SUCCESS,
                    description: APP_MESSAGE_COURSE_DELETED,
                });
                router.push("/dashboard/products");
            }
        } catch (err: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="space-y-8">
            <div className="space-y-4">
                <h2 className="text-destructive font-semibold">
                    {DANGER_ZONE_HEADER}
                </h2>
                <AlertDialog
                    onOpenChange={(open) =>
                        !open &&
                        (setDeleteConfirmation(""), setIsDeleting(false))
                    }
                >
                    <AlertDialogTrigger asChild>
                        <Button
                            type="button"
                            variant="destructive"
                            disabled={isDeleting}
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {BTN_DELETE_COURSE}
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>
                                Are you absolutely sure?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                This action is irreversible. All product data
                                will be permanently deleted.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="py-4">
                            <Label
                                htmlFor="delete-confirmation"
                                className="text-sm font-medium"
                            >
                                Type &quot;delete&quot; to confirm
                            </Label>
                            <Input
                                id="delete-confirmation"
                                type="text"
                                placeholder="Type 'delete' to confirm"
                                value={deleteConfirmation}
                                onChange={(e) =>
                                    setDeleteConfirmation(e.target.value)
                                }
                                className="mt-2"
                            />
                        </div>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={deleteProduct}
                                disabled={
                                    deleteConfirmation !== "delete" ||
                                    isDeleting
                                }
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isDeleting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Deleting...
                                    </>
                                ) : (
                                    "Delete"
                                )}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    );
}
