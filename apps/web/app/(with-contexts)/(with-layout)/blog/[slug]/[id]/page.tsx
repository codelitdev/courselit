"use client";

import { useContext } from "react";
import { Course } from "@courselit/common-models";
import { Section } from "@courselit/page-primitives";
import Post from "./post";
import { ThemeContext } from "@components/contexts";

export default function BlogPost({
    params,
}: {
    params: { slug: string; id: string };
    course: Course;
}) {
    const { theme } = useContext(ThemeContext);

    return (
        <Section theme={theme.theme}>
            <div className="flex flex-col gap-4 max-w-[640px] mx-auto">
                <Post courseId={params.id} />
            </div>
        </Section>
    );
}
