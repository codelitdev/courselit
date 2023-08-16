import * as React from "react";
import { LessonType } from "@courselit/common-models";
import { Video } from "@courselit/components-library/icons/video";
import { Text as TextIcon } from '@courselit/components-library/icons/text'
import { File } from "@courselit/components-library/icons/file";
import { Speaker } from "@courselit/components-library/icons/speaker";
import { FileText } from "@courselit/components-library/icons/file-text";
import { Link } from "@courselit/components-library/icons/link";
import { Quiz } from "@courselit/components-library/icons/quiz";
import { QuestionMark } from "@courselit/components-library/icons/question-mark";

export default function LessonIcon({ type }: { type: LessonType }) {
    switch (type.toLowerCase() as LessonType) {
        case "video":
            return <Video />;
        case "audio":
            return <Speaker />;
        case "text":
            return <TextIcon />;
        case "pdf":
            return <FileText />;
        case "quiz":
            return <Quiz />;
        case "file":
            return <File />;
        case "embed":
            return <Link />;
        default:
            return <QuestionMark />;
    }
}
