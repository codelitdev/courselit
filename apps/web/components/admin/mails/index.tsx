import React, { useEffect, useState } from "react";
import {
    Address,
    AppMessage,
    Constants,
    Profile,
    Sequence,
    SequenceType,
} from "@courselit/common-models";
import { AppDispatch, AppState } from "@courselit/state-management";
import {
    BTN_NEW_MAIL,
    MAIL_TABLE_HEADER_STATUS,
    PAGE_HEADER_ALL_MAILS,
    MAIL_TABLE_HEADER_SUBJECT,
    PAGE_PLACEHOLDER_MAIL,
    //BTN_NEW_SEQUENCE,
} from "../../../ui-config/strings";
import { connect } from "react-redux";
import { FetchBuilder } from "@courselit/utils";
import { actionCreators } from "@courselit/state-management";
import { setAppMessage } from "@courselit/state-management/dist/action-creators";
import { useRouter } from "next/router";
import { ThunkDispatch } from "redux-thunk";
import {
    Link,
    Chip,
    Button,
    Table,
    TableHead,
    TableBody,
    TableRow,
    Tabs,
} from "@courselit/components-library";
import { AnyAction } from "redux";
const { networkAction } = actionCreators;

interface MailsProps {
    address: Address;
    profile: Profile;
    dispatch: AppDispatch;
    featureFlags: string[];
    loading: boolean;
}

function Mails({
    address,
    profile,
    dispatch,
    featureFlags,
    loading,
}: MailsProps) {
    const [broadcastPage, setBroadcastPage] = useState(1);
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [broadcastCount, setBroadcastCount] = useState(0);
    const [_, setSequenceCount] = useState(0);
    const [__, setMails] = useState([]);
    const [broadcasts, setBroadcasts] = useState<
        Pick<Sequence, "sequenceId" | "title" | "emails">[]
    >([]);
    const router = useRouter();

    const handleBroadcastPageChange = (newPage: number) => {
        setBroadcastPage(newPage);
    };

    const fetch = new FetchBuilder()
        .setUrl(`${address.backend}/api/graph`)
        .setIsGraphQLEndpoint(true);

    /*
    const handleRowsPerPageChange = (
        e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
        setRowsPerPage(parseInt(e.target.value, 10));
        setPage(0);
    };
    */

    useEffect(() => {
        if (!featureFlags.includes("mail")) {
            router.replace("/dashboard");
        }
    }, [featureFlags, router]);

    const loadBroadcasts = async () => {
        const query = `
            query GetBroadcasts($page: Int) {
                broadcasts: getBroadcasts(
                    offset: $page
                ) {
                    sequenceId,
                    emails {
                        subject,
                        published
                    }
                    title
                },
            }`;

        const fetcher = fetch
            .setPayload({
                query,
                variables: {
                    page: broadcastPage,
                },
            })
            .build();

        try {
            dispatch(networkAction(true));
            const response = await fetcher.exec();
            if (response.broadcasts) {
                setBroadcasts(response.broadcasts);
            }
        } catch (e: any) {
            dispatch(setAppMessage(new AppMessage(e.message)));
        } finally {
            dispatch(networkAction(false));
        }
    };

    const loadMails = async () => {
        const query = `
            query {
                mails: getMails(searchData: {
                    offset: ${page},
                    rowsPerPage: ${rowsPerPage}
                }) {
                    mailId,
                    to,
                    subject,
                    body,
                    published,
                    user {
                        userId,
                        email,
                        name
                    },
                    updatedAt
                },
                count: getMailsCount
            }`;

        const fetcher = fetch.setPayload(query).build();

        try {
            dispatch(networkAction(true));
            const response = await fetcher.exec();
            if (response.mails) {
                setMails(response.mails);
            }
        } catch (e: any) {
            dispatch(setAppMessage(new AppMessage(e.message)));
        } finally {
            dispatch(networkAction(false));
        }
    };

    useEffect(() => {
        loadMails();
    }, [page, rowsPerPage]);

    useEffect(() => {
        loadBroadcasts();
    }, [broadcastPage]);

    const loadSequenceCount = async (type: SequenceType) => {
        const query = `
            query getSequenceCount($type: SequenceType) {
                count: getSequenceCount(type: $type) 
            }`;

        const fetcher = fetch
            .setPayload({
                query,
                variables: {
                    type,
                },
            })
            .build();

        try {
            dispatch(networkAction(true));
            const response = await fetcher.exec();
            if (response.count) {
                if (type === Constants.mailTypes[0].toUpperCase()) {
                    setBroadcastCount(response.count);
                }
                if (type === Constants.mailTypes[1].toUpperCase()) {
                    setSequenceCount(response.count);
                }
            }
        } catch (e: any) {
            dispatch(setAppMessage(new AppMessage(e.message)));
        } finally {
            dispatch(networkAction(false));
        }
    };

    useEffect(() => {
        loadSequenceCount(Constants.mailTypes[0].toUpperCase() as SequenceType);
        //loadSequenceCount("sequence");
    }, []);

    // const createMail = async () => {
    //     const mutation = `
    //         mutation {
    //             mail: createMail {
    //                 mailId
    //             }
    //         }
    //     `;
    //     const fetch = new FetchBuilder()
    //         .setUrl(`${address.backend}/api/graph`)
    //         .setPayload(mutation)
    //         .setIsGraphQLEndpoint(true)
    //         .build();
    //     try {
    //         (dispatch as ThunkDispatch<AppState, null, AnyAction>)(
    //             networkAction(true),
    //         );
    //         const response = await fetch.exec();
    //         if (response.mail && response.mail.mailId) {
    //             router.push(`/dashboard/mails/${response.mail.mailId}/edit`);
    //         }
    //     } catch (err) {
    //         dispatch(setAppMessage(new AppMessage(err.message)));
    //     } finally {
    //         (dispatch as ThunkDispatch<AppState, null, AnyAction>)(
    //             networkAction(false),
    //         );
    //     }
    // };

    /*
    const createSequence = async () => {
        const mutation = `
            mutation {
              sequence: createSequence {
                  sequenceId
                }
        }
    `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload(mutation)
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            (dispatch as ThunkDispatch<AppState, null, AnyAction>)(
                networkAction(true),
            );
            const response = await fetch.exec();
            if (response.sequence && response.sequence.sequenceId) {
                router.push(
                    `/dashboard/mails/sequence/${response.mail.mailId}/edit`,
                );
            }
        } catch (err) {
            dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            (dispatch as ThunkDispatch<AppState, null, AnyAction>)(
                networkAction(false),
            );
        }
    };
    */

    const createBroadcast = async () => {
        const mutation = `
        mutation {
            sequence: createSequence(type: BROADCAST) {
                sequenceId
            }
        }
    `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload(mutation)
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            (dispatch as ThunkDispatch<AppState, null, AnyAction>)(
                networkAction(true),
            );
            const response = await fetch.exec();
            if (response.sequence && response.sequence.sequenceId) {
                router.push(
                    `/dashboard/mails/broadcast/${response.sequence.sequenceId}/edit`,
                );
            }
        } catch (err) {
            dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            (dispatch as ThunkDispatch<AppState, null, AnyAction>)(
                networkAction(false),
            );
        }
    };

    return (
        <div className="flex flex-col">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-4xl font-semibold mb-4">
                    {PAGE_HEADER_ALL_MAILS}
                </h1>
                <div className="flex gap-2">
                    <Button onClick={() => createBroadcast()}>
                        {BTN_NEW_MAIL}
                    </Button>
                    {/*
                    <Button onClick={() => createSequence()}>
                        {BTN_NEW_SEQUENCE}
                    </Button>
                    */}
                </div>
            </div>
            <Tabs items={["Broadcasts"]}>
                <div>
                    {broadcasts.length === 0 && (
                        <div className="flex justify-center">
                            {PAGE_PLACEHOLDER_MAIL}
                        </div>
                    )}
                    {broadcasts.length > 0 && (
                        <Table aria-label="Broadcasts" className="w-full mt-4">
                            <TableHead>
                                <td>{MAIL_TABLE_HEADER_SUBJECT}</td>
                                <td align="right">
                                    {MAIL_TABLE_HEADER_STATUS}
                                </td>
                            </TableHead>
                            <TableBody
                                count={broadcastCount}
                                page={broadcastPage}
                                onPageChange={handleBroadcastPageChange}
                                loading={loading}
                            >
                                {broadcasts.map((broadcast) => (
                                    <TableRow key={broadcast.sequenceId}>
                                        <td className="py-4">
                                            <Link
                                                href={`/dashboard/mails/broadcast/${broadcast.sequenceId}/edit`}
                                                className="flex"
                                            >
                                                {broadcast.emails[0].subject ===
                                                " "
                                                    ? "--"
                                                    : broadcast.emails[0]
                                                          .subject}
                                            </Link>
                                        </td>
                                        <td align="right">
                                            {broadcast.emails[0].published && (
                                                <Chip className="!bg-black text-white !border-black">
                                                    Sent
                                                </Chip>
                                            )}
                                            {!broadcast.emails[0].published && (
                                                <Chip>Draft</Chip>
                                            )}
                                        </td>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
                <div>Sequences</div>
                <div>Template</div>
            </Tabs>
        </div>
    );
}

const mapStateToProps = (state: AppState) => ({
    address: state.address,
    profile: state.profile,
    featureFlags: state.featureFlags,
    loading: state.networkAction,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({ dispatch });

export default connect(mapStateToProps, mapDispatchToProps)(Mails);
