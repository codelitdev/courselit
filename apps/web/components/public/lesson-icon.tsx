import React from "react";
import {
    Article,
    ArtTrack,
    Audiotrack,
    InsertDriveFile,
    OndemandVideo,
    PictureAsPdf,
    Quiz,
    TextSnippet,
} from "@mui/icons-material";
import {
    LESSON_TYPE_AUDIO,
    LESSON_TYPE_EMBED,
    LESSON_TYPE_FILE,
    LESSON_TYPE_PDF,
    LESSON_TYPE_QUIZ,
    LESSON_TYPE_TEXT,
    LESSON_TYPE_VIDEO,
} from "../../ui-config/constants";

type Type =
    | typeof LESSON_TYPE_VIDEO
    | typeof LESSON_TYPE_AUDIO
    | typeof LESSON_TYPE_TEXT
    | typeof LESSON_TYPE_PDF
    | typeof LESSON_TYPE_QUIZ
    | typeof LESSON_TYPE_FILE;

export default function LessonIcon({ type }: { type: Type }) {
    switch (type.toLowerCase()) {
        case LESSON_TYPE_VIDEO:
            return <OndemandVideo />;
        case LESSON_TYPE_AUDIO:
            return <Audiotrack />;
        case LESSON_TYPE_TEXT:
            return <Article />;
        case LESSON_TYPE_PDF:
            return <PictureAsPdf />;
        case LESSON_TYPE_QUIZ:
            return <Quiz />;
        case LESSON_TYPE_FILE:
            return <InsertDriveFile />;
        case LESSON_TYPE_EMBED:
            return <ArtTrack />;
        default:
            return <TextSnippet />;
    }
}
