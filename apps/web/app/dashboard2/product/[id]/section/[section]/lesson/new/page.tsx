"use client";

import LessonEditor from "@/components/admin/products/editor/content/lesson";
import { AddressContext, ProfileContext } from "@components/contexts";
import { useContext } from "react";

export default function Page({
    params,
}: {
    params: { id: string; section: string };
}) {
    const address = useContext(AddressContext);
    const profile = useContext(ProfileContext);
    const { id, section } = params;

    return (
        <LessonEditor
            courseId={id as string}
            sectionId={section as string}
            address={address}
            profile={profile as Profile}
            prefix="/dashboard2"
            isNew={true}
        />
    );
}
