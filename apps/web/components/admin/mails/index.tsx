import React, { useEffect, useState } from "react";
import {
    Address,
    AppMessage,
    Constants,
    Domain,
    Sequence,
    SequenceType,
} from "@courselit/common-models";
import { AppDispatch, AppState } from "@courselit/state-management";
import {
    BTN_NEW_MAIL,
    PAGE_HEADER_ALL_MAILS,
    BROADCASTS,
    SEQUENCES,
    BTN_NEW_SEQUENCE,
} from "../../../ui-config/strings";
import { FetchBuilder } from "@courselit/utils";
import { actionCreators } from "@courselit/state-management";
import { setAppMessage } from "@courselit/state-management/dist/action-creators";
import { useRouter } from "next/navigation";
import { ThunkDispatch } from "redux-thunk";
import {
    Button,
    Tabbs,
    Card,
    CardHeader,
    CardDescription,
    CardContent,
    CardFooter,
    CardTitle,
} from "@courselit/components-library";
import { AnyAction } from "redux";
import RequestForm from "./request-form";
import SequencesList from "./sequences-list";
const { networkAction } = actionCreators;

interface MailsProps {
    address: Address;
    selectedTab: typeof BROADCASTS | typeof SEQUENCES;
    dispatch?: AppDispatch;
    prefix: string;
    loading: boolean;
}

type MailsTab = typeof BROADCASTS | typeof SEQUENCES;

export default function Mails({
    address,
    dispatch,
    selectedTab,
    prefix,
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
    const [siteInfo, setSiteInfo] = useState<Domain>();
    const router = useRouter();

    const handleBroadcastPageChange = (newPage: number) => {
        setBroadcastPage(newPage);
    };

    const fetch = new FetchBuilder()
        .setUrl(`${address.backend}/api/graph`)
        .setIsGraphQLEndpoint(true);

    useEffect(() => {
        const getSiteInfo = async () => {
            const query = `
            query {
                siteInfo: getSiteInfo {
                    quota {
                        mail {
                            daily,
                            monthly
                        }
                    },
                    settings {
                        mailingAddress
                    }
                }
            }`;

            const fetcher = fetch.setPayload({ query }).build();

            try {
                dispatch && dispatch(networkAction(true));
                const response = await fetcher.exec();
                if (response.siteInfo) {
                    setSiteInfo(response.siteInfo);
                }
            } catch (e: any) {
                dispatch && dispatch(setAppMessage(new AppMessage(e.message)));
            } finally {
                dispatch && dispatch(networkAction(false));
            }
        };

        getSiteInfo();
    }, []);

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
            dispatch && dispatch(networkAction(true));
            const response = await fetcher.exec();
            if (response.broadcasts) {
                setBroadcasts(response.broadcasts);
            }
        } catch (e: any) {
            dispatch && dispatch(setAppMessage(new AppMessage(e.message)));
        } finally {
            dispatch && dispatch(networkAction(false));
        }
    };

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
            dispatch && dispatch(networkAction(true));
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
            dispatch && dispatch(setAppMessage(new AppMessage(e.message)));
        } finally {
            dispatch && dispatch(networkAction(false));
        }
    };

    useEffect(() => {
        loadSequenceCount(Constants.mailTypes[0].toUpperCase() as SequenceType);
    }, []);

    const createSequence = async (type: SequenceType) => {
        const mutation = `
        mutation createSequence(
            $type: SequenceType!
        ) {
            sequence: createSequence(type: $type) {
                sequenceId
            }
        }
    `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload({
                query: mutation,
                variables: {
                    type: type.toUpperCase(),
                },
            })
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            dispatch &&
                (dispatch as ThunkDispatch<AppState, null, AnyAction>)(
                    networkAction(true),
                );
            const response = await fetch.exec();
            if (response.sequence && response.sequence.sequenceId) {
                router.push(
                    `${prefix}/mails/${
                        selectedTab === BROADCASTS ? "broadcast" : "sequence"
                    }/${response.sequence.sequenceId}${
                        prefix === "/dashboard" ? "/edit" : ""
                    }`,
                );
            }
        } catch (err) {
            dispatch && dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            dispatch &&
                (dispatch as ThunkDispatch<AppState, null, AnyAction>)(
                    networkAction(false),
                );
        }
    };

    const onPrimaryButtonClick = () => {
        if (selectedTab === BROADCASTS) {
            createSequence("broadcast");
        } else if (selectedTab === SEQUENCES) {
            createSequence("sequence");
        } else {
        }
    };

    if ((siteInfo && !siteInfo?.quota) || !siteInfo?.settings?.mailingAddress) {
        return (
            <div className="flex flex-col">
                <h1 className="text-4xl font-semibold mb-8">
                    {PAGE_HEADER_ALL_MAILS}
                </h1>
                <div className="flex flex-col gap-4 mb-8">
                    <h2 className="text-2xl font-semibold">
                        Before you start!
                    </h2>
                    <p className="text-slate-500">
                        There a few things you need to do in order to start
                        sending marketing emails.
                    </p>
                </div>
                {!siteInfo?.settings?.mailingAddress && (
                    <Card className="mb-8">
                        <CardHeader>
                            <CardTitle>Set your mailing address</CardTitle>
                            <CardDescription>
                                We need this in order to comply with the
                                CAN-SPAM Act.
                            </CardDescription>
                        </CardHeader>
                        <CardFooter>
                            <div className="w-[120px]">
                                <Button
                                    component="link"
                                    href={`${prefix}/settings?tab=Mails`}
                                >
                                    Go to settings
                                </Button>
                            </div>
                        </CardFooter>
                    </Card>
                )}
                {!siteInfo?.quota?.mail && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Request access</CardTitle>
                            <CardDescription>
                                Please fill in the form to request access to the
                                mailing feature. We need to review your use case
                                so as to keep our services clean.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <RequestForm address={address} />
                        </CardContent>
                    </Card>
                )}
                <div></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-4xl font-semibold mb-4">
                    {PAGE_HEADER_ALL_MAILS}
                </h1>
                <div className="flex gap-2">
                    <Button onClick={onPrimaryButtonClick}>
                        {selectedTab === BROADCASTS
                            ? BTN_NEW_MAIL
                            : BTN_NEW_SEQUENCE}
                    </Button>
                </div>
            </div>
            <Tabbs
                items={[BROADCASTS, SEQUENCES]}
                value={selectedTab}
                onChange={(tab: MailsTab) => {
                    router.replace(`${prefix}/mails?tab=${tab}`);
                }}
            >
                <SequencesList
                    type={Constants.mailTypes[0] as SequenceType}
                    address={address}
                    loading={loading}
                    dispatch={dispatch}
                    prefix={prefix}
                />
                <SequencesList
                    type={Constants.mailTypes[1] as SequenceType}
                    address={address}
                    loading={loading}
                    dispatch={dispatch}
                    prefix={prefix}
                />
            </Tabbs>
        </div>
    );
}
