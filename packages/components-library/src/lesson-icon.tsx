import * as React from "react";
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
import { LessonType } from "@courselit/common-models";

export default function LessonIcon({ type }: { type: LessonType }) {
    switch (type.toLowerCase() as LessonType) {
        case "video":
            return <OndemandVideo />;
        case "audio":
            return <Audiotrack />;
        case "text":
            return <Article />;
        case "pdf":
            return <PictureAsPdf />;
        case "quiz":
            return <Quiz />;
        case "file":
            return <InsertDriveFile />;
        case "embed":
            return <ArtTrack />;
        default:
            return <TextSnippet />;
    }
}
