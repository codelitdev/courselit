import React from "react";
import { Button2, Tooltip } from "@courselit/components-library";
import Link from "next/link";
import { Exit } from "@courselit/icons";
import { BTN_EXIT_COURSE, BTN_EXIT_COURSE_TOOLTIP } from "@ui-config/strings";

function ExitCourseButton() {
    return (
        <Link href="/my-content">
            <Tooltip title={BTN_EXIT_COURSE_TOOLTIP}>
                <Button2 variant="secondary" className="flex gap-2">
                    <Exit /> {BTN_EXIT_COURSE}
                </Button2>
            </Tooltip>
        </Link>
    );
}

export default ExitCourseButton;
