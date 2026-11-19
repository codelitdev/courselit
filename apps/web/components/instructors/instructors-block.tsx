import type { Instructor } from "@courselit/common-models";
import { Header2, Header3, Text2 } from "@courselit/page-primitives";
import type { ThemeStyle } from "@courselit/page-models";
import { INSTRUCTORS_VIEWER_HEADING } from "@ui-config/strings";
import InstructorAvatar from "./instructor-avatar";

export default function InstructorsBlock({
    instructors,
    theme,
}: {
    instructors: Instructor[];
    theme: ThemeStyle;
}) {
    if (!instructors.length) {
        return null;
    }

    return (
        <section className="mt-12 flex flex-col gap-6">
            <Header2 theme={theme} className="text-2xl">
                {INSTRUCTORS_VIEWER_HEADING}
            </Header2>
            <ul className="flex flex-col gap-6">
                {instructors.map((instructor) => (
                    <li
                        key={instructor.instructorId}
                        className="flex items-start gap-4"
                    >
                        <InstructorAvatar
                            instructor={instructor}
                            className="h-16 w-16"
                        />
                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                            <Header3 theme={theme} className="text-lg">
                                {instructor.name}
                            </Header3>
                            {instructor.bio && (
                                <Text2
                                    theme={theme}
                                    className="whitespace-pre-line text-muted-foreground"
                                >
                                    {instructor.bio}
                                </Text2>
                            )}
                            {instructor.links.length > 0 && (
                                <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                                    {instructor.links.map((link) => (
                                        <li key={`${link.label}-${link.url}`}>
                                            <a
                                                href={link.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="underline underline-offset-4"
                                            >
                                                {link.label}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </li>
                ))}
            </ul>
        </section>
    );
}
