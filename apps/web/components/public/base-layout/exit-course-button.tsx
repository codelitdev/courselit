import React from "react";
import { Button, Tooltip } from "@courselit/components-library";
import Link from "next/link";
import { Exit } from "@courselit/icons";
import { BTN_EXIT_COURSE, BTN_EXIT_COURSE_TOOLTIP } from "@ui-config/strings";

function ExitCourseButton() {
    return (
        <Link href="/my-content">
            <Tooltip title={BTN_EXIT_COURSE_TOOLTIP}>
                <Button component="button" className="flex gap-2">
                    <Exit /> {BTN_EXIT_COURSE}
                </Button>
            </Tooltip>
        </Link>
    );
}

export default ExitCourseButton;
