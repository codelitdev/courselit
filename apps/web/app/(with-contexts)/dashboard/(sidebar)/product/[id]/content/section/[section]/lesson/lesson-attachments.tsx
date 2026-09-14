import { Media, Profile } from "@courselit/common-models";
import { MediaSelector } from "@courselit/components-library";
import { useContext } from "react";
import { AddressContext, ProfileContext } from "@components/contexts";
import { LESSON_RESOURCES_ADD } from "@ui-config/strings";

interface LessonAttachmentsProps {
    attachments: Partial<Media>[];
    disabled?: boolean;
    onChange: (attachments: Partial<Media>[]) => void;
}

export function LessonAttachments({
    attachments,
    disabled = false,
    onChange,
}: LessonAttachmentsProps) {
    const address = useContext(AddressContext);
    const { profile } = useContext(ProfileContext);

    return (
        <div className="space-y-2">
            {attachments.map((attachment, index) => (
                <MediaSelector
                    key={attachment.mediaId || index}
                    title=""
                    src={attachment.thumbnail || ""}
                    srcTitle={attachment.originalFileName || ""}
                    mediaId={attachment.mediaId}
                    profile={profile as Profile}
                    address={address}
                    strings={{}}
                    type="lesson"
                    deleteOnRemove={false}
                    onSelection={() => {}}
                    onRemove={() => {
                        onChange(attachments.filter((_, i) => i !== index));
                    }}
                />
            ))}
            <MediaSelector
                key={`add-resource-${attachments.length}`}
                title={LESSON_RESOURCES_ADD}
                src=""
                srcTitle=""
                hidePreview={true}
                disabled={disabled}
                profile={profile as Profile}
                address={address}
                strings={{}}
                type="lesson"
                onSelection={(media?: Media) => {
                    if (media) {
                        onChange([...attachments, media]);
                    }
                }}
            />
        </div>
    );
}
