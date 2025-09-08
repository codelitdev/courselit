"use client";

import { LessonViewer } from "@components/public/lesson-viewer";
import { redirect } from "next/navigation";
import { useContext } from "react";
import { ProfileContext, AddressContext } from "@components/contexts";
import { Profile } from "@courselit/common-models";

export default function LessonPage({
    params
}: {
    params: {
        slug: string;
        id: string;
        lesson: string;
    }
}) {
    const { slug, id, lesson } = params;
    const { profile, setProfile } = useContext(ProfileContext);
    const address = useContext(AddressContext);

    if (!lesson) {
        redirect(`/course/${slug}/${id}`);
    }

    return (
        <LessonViewer
            lessonId={lesson as string}
            slug={slug}
            profile={profile as Profile}
            setProfile={setProfile}
            address={address}
            productId={id}
        />
    )
}