"use client";

import { LessonViewer } from "@components/public/lesson-viewer";
import { LessonDiscussionPanel } from "@components/public/lesson-discussion-panel";
import { redirect } from "next/navigation";
import { useContext, use, useEffect, useState } from "react";
import { ProfileContext, AddressContext } from "@components/contexts";
import { Profile } from "@courselit/common-models";
import { FetchBuilder } from "@courselit/utils";

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
    const [discussionsEnabled, setDiscussionsEnabled] = useState(false);

    useEffect(() => {
        if (id) {
            loadCourseDiscussionsStatus();
        }
    }, [id]);

    const loadCourseDiscussionsStatus = async () => {
        try {
            const query = `
                query {
                    course: getCourse(id: "${id}") {
                        discussions
                    }
                }
            `;
            const fetch = new FetchBuilder()
                .setUrl(`${address.backend}/api/graph`)
                .setPayload(query)
                .setIsGraphQLEndpoint(true)
                .build();
            const response = await fetch.exec();
            if (response.course) {
                setDiscussionsEnabled(!!response.course.discussions);
            }
        } catch (err) {
            // ignore
        }
    };

    if (!lesson) {
        redirect(`/course/${slug}/${id}`);
    }

    return (
        <div
            className={`flex gap-0 ${discussionsEnabled ? "lg:pr-[340px]" : ""}`}
        >
            <div className="flex-1 min-w-0">
                <LessonViewer
                    lessonId={lesson as string}
                    slug={slug}
                    profile={profile as Profile}
                    setProfile={setProfile}
                    address={address}
                    productId={id}
                />
            </div>
            {discussionsEnabled && (
                <>
                    <div className="hidden lg:block fixed right-0 top-16 bottom-0 w-[340px] border-l bg-background overflow-hidden">
                        <LessonDiscussionPanel
                            courseId={id}
                            lessonId={lesson as string}
                            slug={slug}
                        />
                    </div>
                    <div className="lg:hidden fixed bottom-6 right-6 z-50">
                        <MobileDiscussionDrawer>
                            <LessonDiscussionPanel
                                courseId={id}
                                lessonId={lesson as string}
                                slug={slug}
                            />
                        </MobileDiscussionDrawer>
                    </div>
                </>
            )}
        </div>
    );
}

function MobileDiscussionDrawer({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setOpen(!open)}
                className="bg-primary text-primary-foreground rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
            </button>
            {open && (
                <div className="fixed inset-0 z-50">
                    <div
                        className="absolute inset-0 bg-black/50"
                        onClick={() => setOpen(false)}
                    />
                    <div className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-background shadow-xl">
                        <div className="flex items-center justify-between px-4 py-3 border-b">
                            <h3 className="font-semibold">Discussions</h3>
                            <button
                                onClick={() => setOpen(false)}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M18 6 6 18" />
                                    <path d="m6 6 12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="h-[calc(100%-49px)]">{children}</div>
                    </div>
                </div>
            )}
        </>
    );
}
