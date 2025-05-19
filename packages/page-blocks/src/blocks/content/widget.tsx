import { useEffect, useState } from "react";
import {
    Course,
    Group,
    Lesson,
    LessonType,
    WidgetProps,
} from "@courselit/common-models";
import Settings from "./settings";
import { FetchBuilder } from "@courselit/utils";
import { actionCreators } from "@courselit/state-management";
import {
    Link,
    LessonIcon,
    TextRenderer,
    Skeleton,
    useToast,
    Badge,
    Accordion,
    AccordionItem,
    AccordionTrigger,
    AccordionContent,
} from "@courselit/components-library";
import {
    Header1,
    Text1,
    Caption,
    Subheader1,
    Section,
} from "@courselit/page-primitives";
import { ThemeStyle } from "@courselit/page-models";

interface CourseWithGroups extends Course {
    groups: Group[];
    lessons: Lesson[];
}

export default function Widget({
    settings: {
        title,
        description,
        headerAlignment,
        backgroundColor,
        foregroundColor,
        badgeBackgroundColor,
        badgeForegroundColor,
        cssId,
        maxWidth,
        verticalPadding,
    },
    state,
    dispatch,
    pageData: product,
}: WidgetProps<Settings>): JSX.Element {
    const { theme } = state;
    const overiddenTheme: ThemeStyle = JSON.parse(JSON.stringify(theme.theme));
    overiddenTheme.structure.page.width =
        maxWidth || theme.theme.structure.page.width;
    overiddenTheme.structure.section.verticalPadding =
        verticalPadding || theme.theme.structure.section.verticalPadding;

    const [course, setCourse] = useState<CourseWithGroups>();
    const [formattedCourse, setFormattedCourse] = useState<
        Record<string, Lesson[]>
    >({});
    const { toast } = useToast();

    useEffect(() => {
        if (product.courseId) {
            loadCourse(product.courseId as string);
        }
    }, [product]);

    const loadCourse = async (courseId: string) => {
        const query = `
            query {
                course: getCourse(id: "${courseId}", asGuest: true) {
                    title,
                    description,
                    type,
                    lessons {
                        id,
                        title,
                        groupId,
                        lessonId,
                        type,
                        requiresEnrollment
                    },
                    groups {
                        id,
                        name,
                        rank,
                        lessonsOrder
                    },
                    courseId,
                    cost,
                    featuredImage {
                        mediaId,
                        originalFileName,
                        mimeType,
                        size,
                        access,
                        file,
                        thumbnail,
                        caption
                    },
                    published,
                    privacy,
                    pageId,
                    slug
                }
            }
        `;
        const fetch = new FetchBuilder()
            .setUrl(`${state.address.backend}/api/graph`)
            .setPayload(query)
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            dispatch(actionCreators.networkAction(true));
            const response = await fetch.exec();
            if (response.course) {
                setCourse(response.course);
            }
        } catch (err: any) {
            toast({
                title: "Error",
                description: err.message,
                variant: "destructive",
            });
        } finally {
            dispatch(actionCreators.networkAction(false));
        }
    };

    useEffect(() => {
        if (course) {
            const formattedCourse: Record<string, Lesson[]> = {};
            course.groups.map((group) => {
                formattedCourse[group.name] = course.lessons
                    .filter((lesson: Lesson) => lesson.groupId === group.id)
                    .sort(
                        (a: any, b: any) =>
                            group.lessonsOrder?.indexOf(a.lessonId) -
                            group.lessonsOrder?.indexOf(b.lessonId),
                    );
            });
            setFormattedCourse(formattedCourse);
        }
    }, [course]);

    return (
        <Section
            theme={overiddenTheme}
            style={{
                backgroundColor,
                color: foregroundColor,
            }}
            id={cssId}
        >
            <div className={`flex flex-col gap-4`}>
                <div
                    className={`flex flex-col mb-4 ${
                        headerAlignment === "center"
                            ? "items-center"
                            : "items-start"
                    }`}
                >
                    <Header1 theme={overiddenTheme} className="mb-4">
                        {title}
                    </Header1>
                    {description && (
                        <div
                            className={`${
                                headerAlignment === "center"
                                    ? "text-center"
                                    : "text-left"
                            }`}
                        >
                            <Subheader1 theme={overiddenTheme}>
                                <TextRenderer json={description} />
                            </Subheader1>
                        </div>
                    )}
                </div>
                {!course && (
                    <div className="flex flex-col gap-2">
                        {[1, 2, 3, 4].map((item) => (
                            <div key={item}>
                                <div className="flex gap-2 items-center mb-2">
                                    <Skeleton className="h-8 w-full" />
                                    <Skeleton className="h-6 w-[100px] rounded-[300px]" />
                                    <Skeleton className="h-6 w-6" />
                                </div>
                                <hr className="w-full" />
                            </div>
                        ))}
                    </div>
                )}
                <Accordion type="single" collapsible>
                    {Object.keys(formattedCourse).map((group, index) => (
                        <AccordionItem
                            value={group}
                            key={index}
                            className="border-b-0"
                            style={{
                                borderBottom: `1px solid ${overiddenTheme?.colors?.border}`,
                            }}
                        >
                            <AccordionTrigger>
                                <div className="flex grow justify-between mr-2">
                                    <Text1 theme={overiddenTheme}>
                                        {group}
                                    </Text1>
                                    <Badge
                                        style={{
                                            backgroundColor:
                                                badgeBackgroundColor,
                                        }}
                                    >
                                        <Caption
                                            theme={overiddenTheme}
                                            className="leading-none"
                                            style={{
                                                color:
                                                    badgeForegroundColor ||
                                                    "white",
                                            }}
                                        >
                                            {`${formattedCourse[group].length} lessons`}
                                        </Caption>
                                    </Badge>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                {formattedCourse[group].map(
                                    (lesson: Lesson) => (
                                        <div
                                            key={lesson.lessonId}
                                            className="flex items-center gap-2 py-2 px-2 hover:bg-gray-100 rounded"
                                        >
                                            <LessonIcon
                                                type={lesson.type as LessonType}
                                            />
                                            <Link
                                                href={`/course/${course.slug}/${course.courseId}/${lesson.lessonId}`}
                                                style={{
                                                    color: foregroundColor,
                                                }}
                                            >
                                                <Text1 theme={overiddenTheme}>
                                                    {lesson.title}
                                                </Text1>
                                            </Link>
                                            {!lesson.requiresEnrollment && (
                                                <Badge
                                                    style={{
                                                        backgroundColor:
                                                            badgeBackgroundColor,
                                                    }}
                                                >
                                                    <Caption
                                                        theme={overiddenTheme}
                                                        className="leading-none"
                                                        style={{
                                                            color:
                                                                badgeForegroundColor ||
                                                                "white",
                                                        }}
                                                    >
                                                        Preview
                                                    </Caption>
                                                </Badge>
                                            )}
                                        </div>
                                    ),
                                )}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </div>
        </Section>
    );
}
