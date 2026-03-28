import {
    Constants,
    Lesson,
    Media,
    Profile,
    TextEditorContent,
} from "@courselit/common-models";
import { MediaSelector, useToast } from "@courselit/components-library";
import { Editor, emptyDoc as TextEditorEmptyDoc } from "@courselit/text-editor";
import { QuizBuilder } from "@components/admin/products/quiz-builder";
import { Info } from "lucide-react";
import {
    TEXT_EDITOR_PLACEHOLDER,
    TOAST_TITLE_ERROR,
    TOAST_TITLE_SUCCESS,
} from "@ui-config/strings";
import {
    MIMETYPE_VIDEO,
    MIMETYPE_AUDIO,
    MIMETYPE_PDF,
} from "@ui-config/constants";
import { useContext, useState } from "react";
import { AddressContext, ProfileContext } from "@components/contexts";
import { FetchBuilder } from "@courselit/utils";
import { Textarea } from "@components/ui/textarea";
import dynamic from "next/dynamic";
const LessonEmbedViewer = dynamic(
    () => import("@components/public/lesson-viewer/embed-viewer"),
);

interface LessonContentRendererProps {
    lesson: Partial<Lesson>;
    errors: Partial<Record<keyof Lesson, string>>;
    onContentChange: (content: { value: string }) => void;
    onLessonChange: (updates: Partial<Lesson>) => void;
}

export function LessonContentRenderer({
    lesson,
    errors,
    onContentChange,
    onLessonChange,
}: LessonContentRendererProps) {
    const address = useContext(AddressContext);
    const { profile } = useContext(ProfileContext);
    const [embedURL, setEmbedURL] = useState<string>(
        (lesson.content as any)?.value ?? "",
    );
    const { toast } = useToast();

    const saveMediaContent = async (media?: Media) => {
        const query = `
            mutation ($id: ID!, $media: MediaInput) {
                lesson: updateLesson(lessonData: {
                    id: $id
                    media: $media
                }) {
                    lessonId
                }
            }
        `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload({
                query,
                variables: {
                    id: lesson?.lessonId,
                    media: media
                        ? Object.assign({}, media, {
                              file:
                                  media.access === "public" ? media.file : null,
                          })
                        : null,
                },
            })
            .setIsGraphQLEndpoint(true)
            .build();

        try {
            await fetch.exec();
            toast({
                title: TOAST_TITLE_SUCCESS,
                description: "Lesson updated",
            });
        } catch (err: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        }
    };

    switch (lesson.type) {
        case Constants.LessonType.TEXT:
            return (
                <div className="space-y-2">
                    <Editor
                        initialContent={
                            lesson.content
                                ? (lesson.content as TextEditorContent).type ===
                                  "doc"
                                    ? lesson.content
                                    : TextEditorEmptyDoc
                                : TextEditorEmptyDoc
                        }
                        onChange={(state: any) => {
                            onContentChange(state);
                        }}
                        url={address.backend}
                        placeholder={TEXT_EDITOR_PLACEHOLDER}
                    />
                    {errors.content && (
                        <p className="text-sm text-red-500">{errors.content}</p>
                    )}
                </div>
            );
        case Constants.LessonType.EMBED:
            return (
                <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                        <Textarea
                            placeholder="e.g. YouTube video URL or iframe code"
                            value={embedURL}
                            onChange={(e) => {
                                setEmbedURL(e.target.value);
                                if (
                                    JSON.stringify(lesson.content) !==
                                    JSON.stringify({ value: e.target.value })
                                ) {
                                    onContentChange({ value: e.target.value });
                                }
                            }}
                            className={errors.content ? "border-red-500" : ""}
                        />
                    </div>
                    {errors.content && (
                        <p className="text-sm text-red-500">{errors.content}</p>
                    )}
                    {embedURL && (
                        <LessonEmbedViewer content={{ value: embedURL }} />
                    )}
                </div>
            );
        case Constants.LessonType.QUIZ:
            return (
                <div className="space-y-4">
                    <QuizBuilder
                        content={JSON.parse(
                            JSON.stringify(lesson.content || {}),
                        )}
                        onChange={(state: any) => {
                            onContentChange(state);
                        }}
                    />
                    {errors.content && (
                        <p className="text-sm text-red-500">{errors.content}</p>
                    )}
                </div>
            );
        case Constants.LessonType.VIDEO:
        case Constants.LessonType.AUDIO:
        case Constants.LessonType.PDF:
        case Constants.LessonType.FILE:
            return (
                <div className="space-y-2">
                    <MediaSelector
                        disabled={!lesson?.lessonId}
                        title=""
                        src={(lesson?.media && lesson?.media.thumbnail) || ""}
                        srcTitle={
                            (lesson?.media && lesson?.media.originalFileName) ||
                            ""
                        }
                        onSelection={(media?: Media) => {
                            if (media) {
                                onLessonChange({
                                    title:
                                        lesson?.title || media.originalFileName,
                                    media,
                                });
                                saveMediaContent(media);
                            }
                        }}
                        mimeTypesToShow={
                            lesson.type === Constants.LessonType.VIDEO
                                ? MIMETYPE_VIDEO
                                : lesson.type === Constants.LessonType.AUDIO
                                  ? MIMETYPE_AUDIO
                                  : lesson.type === Constants.LessonType.PDF
                                    ? MIMETYPE_PDF
                                    : undefined
                        }
                        strings={{}}
                        profile={profile as Profile}
                        address={address}
                        mediaId={lesson?.media?.mediaId}
                        onRemove={() => {
                            onLessonChange({
                                media: {},
                            });
                            saveMediaContent();
                        }}
                        type="lesson"
                    />
                    {!(lesson?.lessonId && lesson?.title) && (
                        <p className="text-xs text-muted-foreground flex items-center gap-2">
                            <Info className="w-4 h-4" />
                            Set the title of the lesson to enable media upload
                        </p>
                    )}
                </div>
            );
        case Constants.LessonType.SCORM:
            return (
                <div className="space-y-4">
                    <div className="p-4 rounded-lg border bg-muted/50">
                        {(lesson.content as any)?.mediaId ? (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="font-medium">
                                        SCORM Package:
                                    </span>
                                    <span className="text-muted-foreground">
                                        {(lesson.content as any)?.title ||
                                            "Uploaded"}
                                    </span>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    Version:{" "}
                                    {(lesson.content as any)?.version || "1.2"}
                                    {(lesson.content as any)?.fileCount &&
                                        ` • ${(lesson.content as any)?.fileCount} files`}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-4">
                                <p className="text-sm text-muted-foreground mb-2">
                                    Save the lesson first, then upload the SCORM
                                    package.
                                </p>
                            </div>
                        )}
                    </div>
                    {!lesson?.lessonId && (
                        <p className="text-xs text-muted-foreground flex items-center gap-2">
                            <Info className="w-4 h-4" />
                            Save the lesson to enable SCORM package upload
                        </p>
                    )}
                </div>
            );
        default:
            return null;
    }
}
