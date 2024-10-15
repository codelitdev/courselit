import React from "react";
import {
    COURSE_STUDENT_NO_RECORDS,
    COURSE_STUDENT_REPORT_HEADER,
    COURSE_STUDENT_SEARCH_BY_TEXT,
    COURSE_STUDENT_TABLE_HEADER_DOWNLOAD,
    COURSE_STUDENT_TABLE_HEADER_LAST_ACCESSED_ON,
    COURSE_STUDENT_TABLE_HEADER_PROGRESS,
    COURSE_STUDENT_TABLE_HEADER_SIGNED_UP_ON,
    PRICING_EMAIL,
    USER_TABLE_HEADER_NAME,
} from "../../../../../../ui-config/strings";
import { ChangeEvent, useEffect, useState } from "react";
import { FetchBuilder } from "@courselit/utils";
import { actionCreators, AppDispatch } from "@courselit/state-management";
import { Address } from "@courselit/common-models";
import { Search, Circle, CheckCircled } from "@courselit/icons";
import useCourse from "../../course-hook";
import {
    Dialog2,
    IconButton,
    Link,
    Form,
    FormField,
} from "@courselit/components-library";
const { networkAction } = actionCreators;

interface StudentsProps {
    course: ReturnType<typeof useCourse>;
    address: Address;
    dispatch?: AppDispatch;
    loading: boolean;
    prefix: string;
}

interface Student {
    userId: string;
    email: string;
    name: string;
    progress: string[];
    signedUpOn: number;
    lastAccessedOn: number;
}

export default function Students({
    course,
    address,
    dispatch,
    loading,
    prefix,
}: StudentsProps) {
    const [students, setStudents] = useState<Student[]>([]);
    const [text, setText] = useState("");

    useEffect(() => {
        if (course?.courseId) {
            fetchStudents();
        }
    }, [course]);

    const fetchStudents = async () => {
        const mutation = text
            ? `
            query {
                report: getReports(id: "${course?.courseId}") {
                    students (text: "${text}") {
                        email,
                        userId,
                        name,
                        progress,
                        signedUpOn,
                        lastAccessedOn,
                        downloaded
                    }
                }
            }
            `
            : `
            query {
                report: getReports(id: "${course?.courseId}") {
                    students {
                        email,
                        userId,
                        name,
                        progress,
                        signedUpOn,
                        lastAccessedOn,
                        downloaded
                    }
                }
            }
            `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload(mutation)
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            dispatch && dispatch(networkAction(true));
            const response = await fetch.exec();
            setStudents(response.report.students);
        } finally {
            dispatch && dispatch(networkAction(false));
        }
    };

    const onKeyDown = (e: any) => {
        if (e.keyCode === 13) {
            fetchStudents();
        }
    };

    return (
        <div className="flex flex-col">
            <h1 className="text-xl font-semibold mb-4">
                {COURSE_STUDENT_REPORT_HEADER}
            </h1>
            <Form
                onSubmit={(e: ChangeEvent<HTMLInputElement>) => {
                    e.preventDefault();
                    fetchStudents();
                }}
                className="flex gap-2 mb-4"
            >
                <FormField
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setText(e.target.value)
                    }
                    value={text}
                    placeholder={COURSE_STUDENT_SEARCH_BY_TEXT}
                    onKeyDown={onKeyDown}
                    disabled={loading}
                    className="w-full"
                />
                <IconButton>
                    <Search />
                </IconButton>
            </Form>
            <table aria-label="Course students">
                <thead className="border-0 border-b border-slate-200">
                    <tr className="font-medium">
                        <td>{USER_TABLE_HEADER_NAME}</td>
                        {course?.costType?.toLowerCase() !== PRICING_EMAIL && (
                            <td>{COURSE_STUDENT_TABLE_HEADER_PROGRESS}</td>
                        )}
                        {course?.costType?.toLowerCase() === PRICING_EMAIL && (
                            <td>{COURSE_STUDENT_TABLE_HEADER_DOWNLOAD}</td>
                        )}
                        <td>{COURSE_STUDENT_TABLE_HEADER_SIGNED_UP_ON}</td>
                        <td>{COURSE_STUDENT_TABLE_HEADER_LAST_ACCESSED_ON}</td>
                    </tr>
                </thead>
                <tbody>
                    {students.map((student: any) => (
                        <tr
                            key={student.email as string}
                            className="hover:!bg-slate-100"
                        >
                            <td className="py-2">
                                <Link
                                    href={`${prefix}/users/${student.userId}`}
                                >
                                    {student.name || (student.email as string)}
                                </Link>
                            </td>
                            {course?.costType?.toLowerCase() !==
                                PRICING_EMAIL && (
                                <td className="underline">
                                    <Dialog2
                                        title={`${
                                            student!.name || student!.email
                                        }'s Progress`}
                                        trigger={
                                            <span className="cursor-pointer w-full">
                                                {
                                                    (
                                                        student.progress as string[]
                                                    ).length
                                                }{" "}
                                                / {course?.lessons?.length}
                                            </span>
                                        }
                                    >
                                        {course?.lessons?.map((lesson: any) => (
                                            <div
                                                key={lesson.lessonId}
                                                className="flex justify-between items-center mb-1"
                                            >
                                                <p>{lesson.title}</p>
                                                <span>
                                                    {student.progress.includes(
                                                        lesson.lessonId,
                                                    ) ? (
                                                        <CheckCircled />
                                                    ) : (
                                                        <Circle />
                                                    )}
                                                </span>
                                            </div>
                                        ))}
                                    </Dialog2>
                                </td>
                            )}
                            {course?.costType?.toLowerCase() ===
                                PRICING_EMAIL && (
                                <td>
                                    {student.downloaded && <CheckCircled />}
                                    {!student.downloaded && <></>}
                                </td>
                            )}
                            <td>
                                {student.signedUpOn
                                    ? new Date(
                                          student.signedUpOn as number,
                                      ).toLocaleDateString()
                                    : "-"}
                            </td>
                            <td>
                                {student.lastAccessedOn
                                    ? new Date(
                                          student.lastAccessedOn as number,
                                      ).toLocaleDateString()
                                    : "-"}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {!students.length && (
                <div className="flex justify-center">
                    <p className="mt-4">{COURSE_STUDENT_NO_RECORDS}</p>
                </div>
            )}
            {/*
            {student && (
                <Dialog
                    open={progressDialogOpened}
                    onClose={resetActiveStudent}
                >
                    <DialogTitle>
                        <b>{student!.name || student!.email}</b>&apos;s Progress
                    </DialogTitle>
                    <DialogContent>
                        {course?.lessons?.map((lesson: any) => (
                            <ListItem key={lesson.lessonId}>
                                <ListItemText>{lesson.title}</ListItemText>
                                <ListItemIcon>
                                    {student.progress.includes(
                                        lesson.lessonId,
                                    ) ? (
                                        <CheckCircled />
                                    ) : (
                                        <Circle />
                                    )}
                                </ListItemIcon>
                            </ListItem>
                        ))}
                    </DialogContent>
                </Dialog>
            )}
            */}
        </div>
    );
}
