import {
    Address,
    AppMessage,
    Constants,
    DripType,
} from "@courselit/common-models";
import {
    Button,
    Form,
    FormField,
    Section,
    Skeleton,
    Switch,
} from "@courselit/components-library";
import { actionCreators, AppDispatch } from "@courselit/state-management";
import { FetchBuilder } from "@courselit/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, useEffect, useState } from "react";
import {
    BTN_CONTINUE,
    DRIP_SECTION_STATUS,
    EDIT_SECTION_DRIP,
    EDIT_SECTION_HEADER,
    LABEL_DRIP_DATE,
    LABEL_DRIP_DELAY,
    LABEL_DRIP_EMAIL_SUBJECT,
    LABEL_GROUP_NAME,
    NEW_SECTION_HEADER,
    POPUP_CANCEL_ACTION,
} from "../../../../ui-config/strings";
import useCourse from "./course-hook";
import { Select } from "@courselit/components-library";
import { Checkbox } from "@courselit/components-library";
import { MailEditorAndPreview } from "@components/admin/mails/mail-editor-and-preview";

interface SectionEditorProps {
    id: string;
    section?: string;
    loading?: boolean;
    address: Address;
    dispatch?: AppDispatch;
    prefix: string;
}

export default function SectionEditor({
    id,
    loading = false,
    section,
    dispatch,
    address,
    prefix,
}: SectionEditorProps) {
    const [name, setName] = useState("");
    const [status, setStatus] = useState(true);
    const [type, setType] = useState<DripType>();
    const [delay, setDelay] = useState(0);
    const [date, setDate] = useState<number>();
    const [notifyUsers, setNotifyUsers] = useState(false);
    const [emailContent, setEmailContent] = useState("");
    const [emailSubject, setEmailSubject] = useState("");
    const router = useRouter();
    const course = useCourse(id, address, dispatch);

    useEffect(() => {
        if (section && course && course.groups) {
            const group = course.groups.find((group) => group.id === section);
            if (group) {
                const type = group.drip?.type
                    ? group.drip?.type ===
                      Constants.dripType[0].split("-")[0].toUpperCase()
                        ? Constants.dripType[0]
                        : Constants.dripType[1]
                    : undefined;
                setName(group.name);
                setType(type);
                setDelay(group.drip?.delayInMillis / 86400000);
                setDate(group.drip?.dateInUTC);
                setNotifyUsers(!!group.drip?.email);
                setEmailContent(
                    group.drip?.email?.content ||
                        `Hi {{ subscriber.name }},
                    \n<p>A new section is now available in <a href='${address.frontend}/course/${course.slug}/${course.courseId}'>${course.title}</a>.</p>
                    \nCheers!`,
                );
                setEmailSubject(
                    group.drip?.email?.subject ||
                        `A new section is now available in ${course.title}`,
                );
                setStatus(
                    typeof group.drip?.status === "boolean"
                        ? group.drip?.status
                        : true,
                );
            }
        }
    }, [course]);

    const updateGroup = async (e) => {
        e.preventDefault();
        const query = section
            ? `
        mutation updateGroup($id: ID!, $courseId: ID!, $name: String, $drip: DripInput) {
            course: updateGroup(
                id: $id,
                courseId: $courseId,
                name: $name,
                drip: $drip 
            ) {
                courseId,
                groups {
                    id,
                    name,
                    rank,
                    collapsed,
                    drip {
                        type,
                        status,
                        delayInMillis,
                        dateInUTC,
                        email {
                            content,
                            subject
                        }
                    }
                }
            }
        }
        `
            : `
        mutation addGroup($courseId: ID!, $name: String!) {
            course: addGroup(id: $courseId, name: $name) {
                courseId,
                groups {
                    id,
                    name,
                    rank,
                    collapsed,
                    drip {
                        type,
                        status,
                        delayInMillis,
                        dateInUTC,
                        email {
                            content,
                            subject
                        }
                    }
                }
            }
        }
    `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload({
                query,
                variables: section
                    ? {
                          id: section,
                          courseId: course.id,
                          name,
                          drip: type
                              ? {
                                    status,
                                    type: type.toUpperCase().split("-")[0],
                                    delayInMillis: delay,
                                    dateInUTC: date,
                                    email: notifyUsers
                                        ? {
                                              subject: emailSubject,
                                              content: emailContent,
                                          }
                                        : undefined,
                                }
                              : undefined,
                      }
                    : {
                          courseId: course?.id,
                          name,
                      },
            })
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            dispatch && dispatch(actionCreators.networkAction(true));
            const response = await fetch.exec();
            if (response.course) {
                router.replace(
                    `${prefix}/product/${course?.courseId}${
                        prefix === "/dashboard" ? "/content" : "?tab=Content"
                    }`,
                );
            }
        } catch (err: any) {
            dispatch &&
                dispatch(
                    actionCreators.setAppMessage(new AppMessage(err.message)),
                );
        } finally {
            dispatch && dispatch(actionCreators.networkAction(false));
        }
    };

    if (!course) {
        return (
            <div className="flex flex-col gap-4">
                <Skeleton className="w-full h-8" />
                <Skeleton className="w-full h-20" />
                <div className="flex gap-2">
                    <Skeleton className="w-20 h-9" />
                    <Skeleton className="w-20 h-9" />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col">
            <h1 className="text-3xl font-semibold mb-4">
                {section ? EDIT_SECTION_HEADER : NEW_SECTION_HEADER}
            </h1>
            <Form onSubmit={updateGroup} className="flex flex-col gap-4">
                <FormField
                    label={LABEL_GROUP_NAME}
                    name="Section name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                />
                {section && (
                    <Section>
                        <h2 className="text-xl font-medium mb-4">
                            {EDIT_SECTION_DRIP}
                        </h2>

                        <div className="flex flex-col gap-4">
                            <div className="flex justify-between items-center">
                                <p>{DRIP_SECTION_STATUS}</p>
                                <Switch checked={status} onChange={setStatus} />
                            </div>
                            <Select
                                value={type}
                                onChange={setType}
                                title="Type"
                                options={[
                                    {
                                        label: "Drip by date",
                                        value: Constants.dripType[1],
                                    },
                                    {
                                        label: "Drip by days after the last drip",
                                        value: Constants.dripType[0],
                                    },
                                ]}
                            />
                            {type === Constants.dripType[1] && (
                                <FormField
                                    value={new Date(
                                        (date || new Date().getTime()) -
                                            new Date().getTimezoneOffset() *
                                                60000,
                                    )
                                        .toISOString()
                                        .slice(0, 16)}
                                    type="datetime-local"
                                    label={LABEL_DRIP_DATE}
                                    // min={new Date().toISOString().slice(0, 16)}
                                    min={
                                        !date
                                            ? new Date()
                                                  .toISOString()
                                                  .slice(0, 16)
                                            : undefined
                                    }
                                    onChange={(
                                        e: ChangeEvent<HTMLInputElement>,
                                    ) => {
                                        const selectedDate = new Date(
                                            e.target.value,
                                        );
                                        setDate(selectedDate.getTime());
                                    }}
                                />
                            )}
                            {type === Constants.dripType[0] && (
                                <FormField
                                    type="number"
                                    min={0}
                                    label={LABEL_DRIP_DELAY}
                                    name="delayInMillis"
                                    value={delay}
                                    onChange={(e) => setDelay(+e.target.value)}
                                    required
                                />
                            )}
                            {type && (
                                <>
                                    <h3 className="font-semibold">
                                        Notify users
                                    </h3>
                                    <div className="flex items-center gap-2 justify-between">
                                        <p>
                                            Send email notification to the users
                                            when this section has dripped
                                        </p>
                                        <Checkbox
                                            checked={notifyUsers}
                                            onChange={(value: boolean) =>
                                                setNotifyUsers(value)
                                            }
                                        />
                                    </div>
                                    {notifyUsers && (
                                        <div>
                                            <FormField
                                                label={LABEL_DRIP_EMAIL_SUBJECT}
                                                name="emailSubject"
                                                value={emailSubject}
                                                onChange={(e) =>
                                                    setEmailSubject(
                                                        e.target.value,
                                                    )
                                                }
                                                required
                                            />
                                            <MailEditorAndPreview
                                                content={emailContent}
                                                onChange={setEmailContent}
                                            />
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </Section>
                )}
                <div className="flex gap-2">
                    <Button disabled={!name || loading} type="submit">
                        {BTN_CONTINUE}
                    </Button>
                    {course.courseId && (
                        <Link
                            href={`${prefix}/product/${course.courseId}${
                                prefix === "/dashboard"
                                    ? "/content"
                                    : "?tab=Content"
                            }`}
                        >
                            <Button variant="soft">
                                {POPUP_CANCEL_ACTION}
                            </Button>
                        </Link>
                    )}
                </div>
            </Form>
        </div>
    );
}
