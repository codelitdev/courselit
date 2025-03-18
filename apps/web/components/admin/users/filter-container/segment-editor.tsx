import type { Address } from "@courselit/common-models";
import { useToast } from "@courselit/components-library";
import { FetchBuilder } from "@courselit/utils";
import React, { useState } from "react";
import {
    TOAST_TITLE_ERROR,
    POPUP_CANCEL_ACTION,
    POPUP_OK_ACTION,
    USER_SEGMENT_DESCRIPTION,
    USER_SEGMENT_DROPDOWN_LABEL,
} from "@ui-config/strings";
import Segment from "@ui-models/segment";
import DocumentationLink from "@components/public/documentation-link";
import {
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
} from "@components/ui/dropdown-menu";
import { Button } from "@components/ui/button";
import { Trash2 } from "lucide-react";
import {
    Dialog,
    DialogFooter,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogContent,
} from "@components/ui/dialog";

interface DeleteSegmentProps {
    selectedSegment: string;
    segments?: Segment[];
}

interface SegmentEditorProps {
    segments: Segment[];
    selectedSegment: string;
    address: Address;
    onDelete: (props: DeleteSegmentProps) => void;
}

export default function SegmentEditor2({
    segments,
    selectedSegment,
    address,
    onDelete,
}: SegmentEditorProps) {
    const [activeSegment, setActiveSegment] = useState<Segment>();
    const { toast } = useToast();

    const deleteSegment = async () => {
        const mutation = `
                mutation {
                    segments: deleteSegment(
                        segmentId: "${activeSegment?.segmentId}",
                    ) {
                        name,
                        filter {
                            aggregator,
                            filters {
                                name,
                                condition,
                                value,
                                valueLabel
                            },
                        }
                        segmentId
                    }
                }
            `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload(mutation)
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            const response = await fetch.exec();
            const segmentId =
                activeSegment?.segmentId === selectedSegment
                    ? ""
                    : selectedSegment;
            if (response.segments) {
                setActiveSegment(undefined);
                onDelete({
                    selectedSegment: segmentId,
                    segments: response.segments,
                });
            } else {
                onDelete({
                    selectedSegment: segmentId,
                });
            }
        } catch (err) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        }
    };

    return (
        <>
            <DropdownMenuContent className="w-72">
                {!activeSegment && (
                    <>
                        <DropdownMenuLabel className="text-base font-bold">
                            {USER_SEGMENT_DROPDOWN_LABEL}
                        </DropdownMenuLabel>
                        <div className="text-xs text-muted-foreground px-2 pb-2">
                            {USER_SEGMENT_DESCRIPTION}{" "}
                            <DocumentationLink path="/en/users/segments" />
                        </div>
                        {segments.map((segment) => (
                            <DropdownMenuItem
                                key={segment.segmentId}
                                className="flex items-center justify-between group"
                                onClick={() => {
                                    onDelete({
                                        selectedSegment: segment.segmentId,
                                    });
                                }}
                            >
                                <span
                                    className={
                                        segment.segmentId === selectedSegment
                                            ? "font-medium"
                                            : ""
                                    }
                                >
                                    {segment.name}
                                </span>
                                {segment.segmentId && (
                                    <span className="mr-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => {
                                                setActiveSegment(segment);
                                            }}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </span>
                                )}
                            </DropdownMenuItem>
                        ))}
                    </>
                )}
                {/* {activeSegment && (
                <>
                    <PopoverHeader>{USER_DELETE_SEGMENT}</PopoverHeader>
                    <PopoverDescription>{`${USER_DELETE_SEGMENT_DESCRIPTION}"${activeSegment.name}"?`}</PopoverDescription>
                    <div className="flex justify-between mt-4">
                        <Button
                            name="delete"
                            onClick={(e: MouseEvent) => {
                                e.preventDefault();
                                deleteSegment();
                            }}
                        >
                            {POPUP_OK_ACTION}
                        </Button>
                        <Button
                            name="cancel"
                            variant="soft"
                            onClick={(e: MouseEvent) => {
                                e.preventDefault();
                                onDelete({
                                    selectedSegment,
                                });
                            }}
                        >
                            {POPUP_CANCEL_ACTION}
                        </Button>
                    </div>
                </>
            )} */}
            </DropdownMenuContent>
            <Dialog
                open={!!activeSegment}
                onOpenChange={() => setActiveSegment(undefined)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Segment</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete the segment &quot;
                            {activeSegment?.name}&quot;? This action cannot be
                            undone.
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setActiveSegment(undefined)}
                        >
                            {POPUP_CANCEL_ACTION}
                        </Button>
                        <Button variant="destructive" onClick={deleteSegment}>
                            {POPUP_OK_ACTION}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
