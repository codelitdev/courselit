import React from "react";
import {
    BUTTON_NEW_GROUP_TEXT,
    BUTTON_NEW_LESSON_TEXT,
    DELETE_SECTION_HEADER,
    EDIT_SECTION_HEADER,
    TOAST_TITLE_ERROR,
    LESSON_GROUP_DELETED,
} from "../../../../../ui-config/strings";
import { CourseWithAdminProps } from "../course-hook";
import { Add, MoreVert } from "@courselit/icons";
import { Lesson, Address, Group } from "@courselit/common-models";
import {
    Section,
    Link,
    LessonIcon,
    Button,
    Menu2,
    MenuItem,
    DragAndDrop,
    useToast,
} from "@courselit/components-library";
import { actionCreators, AppDispatch } from "@courselit/state-management";
import { FetchBuilder } from "@courselit/utils";

interface LessonSectionProps {
    group: Group;
    course: CourseWithAdminProps;
    onGroupDelete: (groupId: string, courseId: string) => void;
    address: Address;
    dispatch?: AppDispatch;
    toast: ReturnType<typeof useToast>["toast"];
}

function LessonItem({
    lesson,
    courseId,
    groupId,
}: {
    lesson: Lesson;
    courseId: string;
    groupId: string;
}) {
    return (
        <div className="flex items-center gap-2" key={lesson.lessonId}>
            <LessonIcon type={lesson.type} />
            <Link
                href={`/dashboard/product/${courseId}/section/${groupId}/lesson/${lesson.lessonId}`}
            >
                {lesson.title}
            </Link>
        </div>
    );
}

function LessonSection({
    group,
    course,
    onGroupDelete,
    address,
    dispatch,
    toast,
}: LessonSectionProps) {
    const updateGroup = async (lessonsOrder: string[]) => {
        const mutation = `
        mutation UpdateGroup ($id: ID!, $courseId: String!, $lessonsOrder: [String]!) {
            updateGroup(
                id: $id,
                courseId: $courseId,
                lessonsOrder: $lessonsOrder
            ) {
               courseId,
               title
            }
        }
        `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload({
                query: mutation,
                variables: {
                    id: group.id,
                    courseId: course.courseId,
                    lessonsOrder,
                },
            })
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            dispatch && dispatch(actionCreators.networkAction(true));
            const response = await fetch.exec();
        } catch (err: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        } finally {
            dispatch && dispatch(actionCreators.networkAction(false));
        }
    };

    return (
        <Section>
            <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                    <h2 className="font-medium">{group.name}</h2>
                    <Menu2 icon={<MoreVert />} variant="soft">
                        <MenuItem>
                            <Link
                                href={`/dashboard/product/${course.courseId}/section/${group.id}`}
                                className="flex w-full"
                            >
                                {EDIT_SECTION_HEADER}
                            </Link>
                        </MenuItem>
                        <MenuItem
                            component="dialog"
                            title={DELETE_SECTION_HEADER}
                            triggerChildren={DELETE_SECTION_HEADER}
                            onClick={() =>
                                onGroupDelete(group.id, course.courseId)
                            }
                        />
                    </Menu2>
                </div>
                <div>
                    <DragAndDrop
                        items={course.lessons
                            .filter(
                                (lesson: Lesson) => lesson.groupId === group.id,
                            )
                            .sort(
                                (a: any, b: any) =>
                                    (group.lessonsOrder as any[])?.indexOf(
                                        a.lessonId,
                                    ) -
                                    (group.lessonsOrder as any[])?.indexOf(
                                        b.lessonId,
                                    ),
                            )
                            .map((lesson: Lesson) => ({
                                id: lesson.lessonId,
                                courseId: course.courseId,
                                groupId: lesson.groupId,
                                lesson,
                            }))}
                        Renderer={LessonItem}
                        key={JSON.stringify(course.lessons)}
                        onChange={(items: any) => {
                            const newLessonsOrder: any = items.map(
                                (item: { lesson: { lessonId: any } }) =>
                                    item.lesson.lessonId,
                            );
                            updateGroup(newLessonsOrder);
                        }}
                    />
                </div>
                <div>
                    <Link
                        href={`/dashboard/product/${course.courseId}/section/${group.id}/lesson/new`}
                    >
                        <Button variant="soft">
                            <Add />
                            {BUTTON_NEW_LESSON_TEXT}
                        </Button>
                    </Link>
                </div>
            </div>
        </Section>
    );
}

interface LessonsProps {
    id: string;
    address: Address;
    dispatch?: AppDispatch;
    course: CourseWithAdminProps;
}

export default function LessonsList({
    id,
    dispatch,
    address,
    course,
}: LessonsProps) {
    const { toast } = useToast();
    const removeGroup = async (groupId: string, courseId: string) => {
        const mutation = `
        mutation {
            removeGroup(
                id: "${groupId}",
                courseId: "${courseId}"
            ) {
               courseId 
            }
        }
        `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload(mutation)
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            dispatch && dispatch(actionCreators.networkAction(true));
            const response = await fetch.exec();
            if (response.removeGroup?.courseId) {
                toast({
                    title: "",
                    description: LESSON_GROUP_DELETED,
                });
                course.groups.splice(
                    course.groups.findIndex((group) => group.id === groupId),
                    1,
                );
            }
        } catch (err: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        } finally {
            dispatch && dispatch(actionCreators.networkAction(false));
        }
    };

    if (!course) {
        return null;
    }

    return (
        <div className="flex flex-col gap-4">
            {course.groups.map((group) => (
                <LessonSection
                    group={group}
                    course={course}
                    onGroupDelete={removeGroup}
                    key={group.id}
                    address={address}
                    dispatch={dispatch}
                    toast={toast}
                />
            ))}
            <div>
                <Link href={`/dashboard/product/${id}/section/new`}>
                    <Button>{BUTTON_NEW_GROUP_TEXT}</Button>
                </Link>
            </div>
        </div>
    );
}
