import React, { ChangeEvent, useEffect, useState } from "react";
import { Address, AppMessage, Profile } from "@courselit/common-models";
import { AppDispatch, AppState } from "@courselit/state-management";
import {
    BTN_NEW_MAIL,
    MAIL_TABLE_HEADER_STATUS,
    PAGE_HEADER_ALL_MAILS,
    MAIL_TABLE_HEADER_SUBJECT,
    PAGE_PLACEHOLDER_MAIL,
    MAIL_TABLE_HEADER_RECEPIENTS,
    MAIL_TABLE_HEADER_SENDER,
    MAIL_SENDER_YOU,
    MAIL_TABLE_HEADER_SENT_ON,
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
} from "@courselit/components-library";
import { formattedLocaleDate } from "../../../ui-lib/utils";
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
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [count, setCount] = useState(0);
    const [mails, setMails] = useState([]);
    const router = useRouter();

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
    };

    const handleRowsPerPageChange = (
        e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
        setRowsPerPage(parseInt(e.target.value, 10));
        setPage(0);
    };

    useEffect(() => {
        loadMailsCount();
    }, []);

    useEffect(() => {
        loadMails();
    }, [page, rowsPerPage]);

    useEffect(() => {
        if (!featureFlags.includes("mail")) {
            router.replace("/dashboard");
        }
    }, [featureFlags]);

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

    const loadMailsCount = async () => {
        const query = `
            query {
                count: getMailsCount
            }`;

        const fetcher = fetch.setPayload(query).build();

        try {
            dispatch(networkAction(true));
            const response = await fetcher.exec();
            if (response.count) {
                setCount(response.count);
            }
        } catch (e: any) {
            dispatch(setAppMessage(new AppMessage(e.message)));
        } finally {
            dispatch(networkAction(false));
        }
    };

    const fetch = new FetchBuilder()
        .setUrl(`${address.backend}/api/graph`)
        .setIsGraphQLEndpoint(true);

    const createMail = async () => {
        const mutation = `
            mutation {
                mail: createMail {
                    mailId
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
            if (response.mail && response.mail.mailId) {
                router.push(`/dashboard/mails/${response.mail.mailId}/edit`);
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
                <div>
                    <Button onClick={createMail}>{BTN_NEW_MAIL}</Button>
                </div>
            </div>
            {mails.length === 0 && (
                <div className="flex justify-center">
                    {PAGE_PLACEHOLDER_MAIL}
                </div>
            )}
            {mails.length > 0 && (
                <Table aria-label="Mails">
                    <TableHead>
                        <td>{MAIL_TABLE_HEADER_SUBJECT}</td>
                        <td align="right">{MAIL_TABLE_HEADER_SENDER}</td>
                        <td align="right">{MAIL_TABLE_HEADER_RECEPIENTS}</td>
                        <td align="right">{MAIL_TABLE_HEADER_STATUS}</td>
                        <td align="right">{MAIL_TABLE_HEADER_SENT_ON}</td>
                    </TableHead>
                    <TableBody
                        count={count}
                        page={page}
                        onPageChange={handlePageChange}
                        loading={loading}
                    >
                        {mails.map((mail: Mail) => (
                            <TableRow key={mail.mailId}>
                                <td className="py-4">
                                    <Link
                                        href={`/dashboard/mails/${mail.mailId}/edit`}
                                        className="flex"
                                    >
                                        {mail.subject || "--"}
                                    </Link>
                                </td>
                                <td align="right">
                                    <Link
                                        href={`/dashboard/users/${mail.user.userId}`}
                                        className="flex justify-end items-center"
                                    >
                                        {mail.user.name || mail.user.email}
                                        {mail.user.userId ===
                                            profile.userId && (
                                            <span className="text-xs">
                                                ({MAIL_SENDER_YOU})
                                            </span>
                                        )}
                                    </Link>
                                </td>
                                <td align="right">{mail.to.length}</td>
                                <td align="right">
                                    {mail.published && (
                                        <Chip className="!bg-black">Sent</Chip>
                                    )}
                                    {!mail.published && <Chip>Draft</Chip>}
                                </td>
                                <td align="right">
                                    {mail.published
                                        ? formattedLocaleDate(mail.updatedAt)
                                        : ""}
                                </td>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
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
