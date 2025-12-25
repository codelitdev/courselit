"use client";

import { LessonViewer } from "@components/public/lesson-viewer";
import { redirect } from "next/navigation";
import { useContext, use } from "react";
import { ProfileContext, AddressContext } from "@components/contexts";
import { Profile } from "@courselit/common-models";

export default function LessonPage(props: {
    params: Promise<{
        slug: string;
        id: string;
        lesson: string;
    }>;
}) {
    const params = use(props.params);
    const { slug, id, lesson } = params;
    const { profile, setProfile } = useContext(ProfileContext);
    const address = useContext(AddressContext);

    if (!lesson) {
        redirect(`/course-old/${slug}/${id}`);
    }

    return (
        <LessonViewer
            lessonId={lesson as string}
            slug={slug}
            profile={profile as Profile}
            setProfile={setProfile}
            address={address}
            productId={id}
            path="/course-old"
        />
    );
}
