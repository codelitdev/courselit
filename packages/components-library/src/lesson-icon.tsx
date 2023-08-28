import * as React from "react";
import { LessonType } from "@courselit/common-models";
import {
    Video,
    Text as TextIcon,
    File,
    Speaker,
    FileText,
    Link,
    Quiz,
    QuestionMark,
} from "@courselit/icons";

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
