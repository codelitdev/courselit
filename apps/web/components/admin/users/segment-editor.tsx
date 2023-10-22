import React, { useState } from "react";
import { USER_SEGMENT_DROPDOWN_LABEL } from "../../../ui-config/strings";
import PopoverHeader from "./popover-header";

interface SegmentEditorProps {
    segments: unknown[];
    selectedSegment: unknown;
}

export default function SegmentEditor({
    segments,
    selectedSegment
}: SegmentEditorProps) {
    const [activeSegment, setActiveSegment] = useState("");

    return (
        <div className="px-1 py-1">
            {!activeSegment && (
                <div>
                    <PopoverHeader>{USER_SEGMENT_DROPDOWN_LABEL}</PopoverHeader>
                    <ul>
                        {segments.map((segment: unknown[]) => (
                            <li
                                key={segment.segmentId}
                                className="cursor-pointer px-2 text-medium leading-none rounded-[3px] flex items-center h-8 relative select-none outline-none data-[disabled]:text-slate-200 data-[disabled]:pointer-events-none hover:bg-slate-200"
                                onClick={() => setActiveSegment(segment.segmentId)}
                            >
                                {segment.name}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            {activeCategory && activeCategory === "email" && (
                <EmailFilterEditor onApply={changeFilter} />
            )}
        </div>
    )
}
