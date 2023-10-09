import React from "react";
import {
    BUTTON_NEW_GROUP_TEXT,
    BUTTON_NEW_LESSON_TEXT,
    DELETE_SECTION_HEADER,
    EDIT_SECTION_HEADER,
    LESSON_GROUP_DELETED,
} from "../../../../../ui-config/strings";
import useCourse from "../course-hook";
import { Add, MoreVert } from "@courselit/icons";
import { Course, Lesson } from "@courselit/common-models";
import { useRouter } from "next/router";
import {
    Section,
    Link,
    LessonIcon,
    Button,
    Menu2,
    MenuItem,
} from "@courselit/components-library";
import {
    actionCreators,
    AppDispatch,
    AppState,
} from "@courselit/state-management";
import { connect } from "react-redux";
import { Address, AppMessage } from "@courselit/common-models";
import { FetchBuilder } from "@courselit/utils";

interface LessonSectionProps {
    group: Record<string, unknown>;
    course: Partial<Course>;
    onGroupDelete: (groupId: string, courseId: string) => void;
}

function LessonSection({ group, course, onGroupDelete }: LessonSectionProps) {
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
                            onClick={() => onGroupDelete(group.id, course.id)}
                        />
                    </Menu2>
                </div>
                <div>
                    {course.lessons
                        .filter((lesson: Lesson) => lesson.groupId === group.id)
                        .sort((a: any, b: any) => a.groupRank - b.groupRank)
                        .map((lesson: Lesson) => (
                            <div
                                className="flex items-center gap-2"
                                key={lesson.lessonId}
                            >
                                <LessonIcon type={lesson.type} />
                                <Link
                                    href={`/dashboard/product/${course.courseId}/section/${group.id}/lesson/${lesson.lessonId}`}
                                >
                                    {lesson.title}
                                </Link>
                            </div>
                        ))}
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
    dispatch: AppDispatch;
    address: Address;
}

function LessonsList({ id, dispatch, address }: LessonsProps) {
    const course = useCourse(id);
    const router = useRouter();

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
            dispatch(actionCreators.networkAction(true));
            const response = await fetch.exec();
            if (response.removeGroup?.courseId) {
                dispatch(
                    actionCreators.setAppMessage(
                        new AppMessage(LESSON_GROUP_DELETED),
                    ),
                );
                course.groups.splice(
                    course.groups.findIndex((group) => group.id === groupId),
                    1,
                );
            }
        } catch (err: any) {
            dispatch(actionCreators.setAppMessage(new AppMessage(err.message)));
        } finally {
            dispatch(actionCreators.networkAction(false));
        }
    };

    if (!course) {
        return null;
    }

    return (
        <div className="flex flex-col gap-4">
            {course.groups.map(
                (group: Record<string, unknown>, index: number) => (
                    <LessonSection
                        group={group}
                        course={course}
                        onGroupDelete={removeGroup}
                        key={index}
                    />
                ),
            )}
            <div>
                <Link href={`/dashboard/product/${id}/section/new`}>
                    <Button>{BUTTON_NEW_GROUP_TEXT}</Button>
                </Link>
            </div>
        </div>
    );
}

const mapStateToProps = (state: AppState) => ({
    loading: state.networkAction,
    address: state.address,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({ dispatch });

export default connect(mapStateToProps, mapDispatchToProps)(LessonsList);
