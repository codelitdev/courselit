"use client";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    ChevronUp,
    ChevronDown,
    ChevronRight,
    Droplets,
    MoreHorizontal,
    Plus,
} from "lucide-react";
import Link from "next/link";
import { Constants, Group } from "@courselit/common-models";
import {
    BUTTON_NEW_LESSON_TEXT,
    BUTTON_NEW_LESSON_TEXT_DOWNLOAD,
    EDIT_SECTION_HEADER,
    BUTTON_MOVE_SECTION_UP,
    BUTTON_MOVE_SECTION_DOWN,
} from "@ui-config/strings";
import SectionLessonList from "./section-lesson-list";
import { LessonSummary } from "./helpers";

export default function ContentSectionCard({
    section,
    lessons,
    lessonInsertionCueIndex,
    collapsed,
    sectionMenuOpenId,
    productType,
    totalGroups,
    productId,
    lessonDragDisabled,
    canMoveUp,
    canMoveDown,
    sectionMoveDisabled,
    onMoveUp,
    onMoveDown,
    onSectionMenuOpenChange,
    onToggleCollapse,
    onRequestDelete,
}: {
    section: Group;
    lessons: LessonSummary[];
    lessonInsertionCueIndex?: number | null;
    collapsed: boolean;
    sectionMenuOpenId: string | null;
    productType?: string;
    totalGroups: number;
    productId: string;
    lessonDragDisabled: boolean;
    canMoveUp: boolean;
    canMoveDown: boolean;
    sectionMoveDisabled: boolean;
    onMoveUp: () => void;
    onMoveDown: () => void;
    onSectionMenuOpenChange: (sectionId: string | null) => void;
    onToggleCollapse: (sectionId: string) => void;
    onRequestDelete: (item: { id: string; title: string }) => void;
}) {
    const isSingleDownloadGroup =
        productType?.toLowerCase() === Constants.CourseType.DOWNLOAD &&
        totalGroups === 1;

    return (
        <div className="mb-6 relative w-full">
            <div className="flex items-center justify-between mb-3 border-b border-gray-200 pb-3">
                <div className="flex items-center space-x-3">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onToggleCollapse(section.id)}
                        className="p-0 hover:bg-transparent"
                    >
                        {collapsed ? (
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
                                            This section has scheduled release
                                        </p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onMoveUp}
                        disabled={!canMoveUp || sectionMoveDisabled}
                        aria-label={BUTTON_MOVE_SECTION_UP}
                        title={BUTTON_MOVE_SECTION_UP}
                        className="h-8 w-8"
                    >
                        <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onMoveDown}
                        disabled={!canMoveDown || sectionMoveDisabled}
                        aria-label={BUTTON_MOVE_SECTION_DOWN}
                        title={BUTTON_MOVE_SECTION_DOWN}
                        className="h-8 w-8"
                    >
                        <ChevronDown className="h-4 w-4" />
                    </Button>
                    <DropdownMenu
                        modal={false}
                        open={sectionMenuOpenId === section.id}
                        onOpenChange={(open) =>
                            onSectionMenuOpenChange(open ? section.id : null)
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
                            <DropdownMenuItem asChild>
                                <Link
                                    href={`/dashboard/product/${productId}/content/section/${section.id}`}
                                >
                                    {EDIT_SECTION_HEADER}
                                </Link>
                            </DropdownMenuItem>
                            {!isSingleDownloadGroup && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onClick={() =>
                                            onRequestDelete({
                                                id: section.id,
                                                title: section.name,
                                            })
                                        }
                                        className="text-red-600"
                                    >
                                        Delete Section
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
            {!collapsed && (
                <div className="space-y-2 ml-8">
                    <SectionLessonList
                        sectionId={section.id}
                        productId={productId}
                        lessons={lessons}
                        disabled={lessonDragDisabled}
                        insertionCueIndex={lessonInsertionCueIndex}
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
                            {productType?.toLowerCase() ===
                            Constants.CourseType.DOWNLOAD
                                ? BUTTON_NEW_LESSON_TEXT_DOWNLOAD
                                : BUTTON_NEW_LESSON_TEXT}
                        </Link>
                    </Button>
                </div>
            )}
        </div>
    );
}
