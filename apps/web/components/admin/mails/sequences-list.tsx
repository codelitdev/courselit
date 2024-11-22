"use client";

import {
    Address,
    AppMessage,
    Constants,
    Sequence,
    SequenceType,
} from "@courselit/common-models";
import {
    Chip,
    Link,
    Table,
    TableBody,
    TableHead,
    TableRow,
} from "@courselit/components-library";
import { AppDispatch } from "@courselit/state-management";
import {
    networkAction,
    setAppMessage,
} from "@courselit/state-management/dist/action-creators";
import { FetchBuilder, capitalize } from "@courselit/utils";
import {
    MAIL_TABLE_HEADER_STATUS,
    MAIL_TABLE_HEADER_SUBJECT,
} from "@ui-config/strings";
import { useEffect, useState } from "react";
import { isDateInFuture } from "../../../lib/utils";

interface SequencesListProps {
    address: Address;
    loading: boolean;
    type: SequenceType;
    prefix: string;
    dispatch?: AppDispatch;
}

const SequencesList = ({
    address,
    dispatch,
    loading,
    type,
    prefix,
}: SequencesListProps) => {
    const [page, setPage] = useState(1);
    // const [rowsPerPage, setRowsPerPage] = useState(10);
    const [count, setCount] = useState(0);
    const [sequences, setSequences] = useState<
        Pick<Sequence, "sequenceId" | "title" | "emails" | "status">[]
    >([]);

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
    };

    const fetch = new FetchBuilder()
        .setUrl(`${address.backend}/api/graph`)
        .setIsGraphQLEndpoint(true);

    useEffect(() => {
        loadSequences();
    }, [page]);

    useEffect(() => {
        loadSequenceCount();
    }, []);

    const loadSequences = async () => {
        const query = `
            query GetSequences($page: Int, $type: SequenceType!) {
                broadcasts: getSequences(
                    offset: $page,
                    type: $type
                ) {
                    sequenceId,
                    emails {
                        subject,
                        published,
                        delayInMillis
                    }
                    title,
                    status
                },
            }`;

        const fetcher = fetch
            .setPayload({
                query,
                variables: {
                    page,
                    type: type.toUpperCase(),
                },
            })
            .build();

        try {
            dispatch && dispatch(networkAction(true));
            const response = await fetcher.exec();
            if (response.broadcasts) {
                setSequences(response.broadcasts);
            }
        } catch (e: any) {
            dispatch && dispatch(setAppMessage(new AppMessage(e.message)));
        } finally {
            dispatch && dispatch(networkAction(false));
        }
    };

    const loadSequenceCount = async () => {
        const query = `
            query getSequenceCount($type: SequenceType) {
                count: getSequenceCount(type: $type) 
            }`;

        const fetcher = fetch
            .setPayload({
                query,
                variables: {
                    type: type.toUpperCase(),
                },
            })
            .build();

        try {
            dispatch && dispatch(networkAction(true));
            const response = await fetcher.exec();
            if (response.count) {
                setCount(response.count);
            }
        } catch (e: any) {
            dispatch && dispatch(setAppMessage(new AppMessage(e.message)));
        } finally {
            dispatch && dispatch(networkAction(false));
        }
    };

    return (
        <Table aria-label="Broadcasts" className="w-full mt-4">
            <TableHead>
                <td>{MAIL_TABLE_HEADER_SUBJECT}</td>
                <td align="right">{MAIL_TABLE_HEADER_STATUS}</td>
            </TableHead>
            <TableBody
                count={count}
                page={page}
                onPageChange={handlePageChange}
                loading={loading}
            >
                {sequences.map((broadcast) => (
                    <TableRow key={broadcast.sequenceId}>
                        <td className="py-4">
                            <Link
                                href={`${prefix}/mails/${type}/${broadcast.sequenceId}${
                                    prefix === "/dashboard" ? "/edit" : ""
                                }`}
                                className="flex"
                            >
                                {type === "broadcast" &&
                                    (broadcast.emails[0].subject === " "
                                        ? "--"
                                        : broadcast.emails[0].subject)}
                                {type === "sequence" &&
                                    (broadcast.title === " "
                                        ? "Untitled Sequence"
                                        : broadcast.title)}
                            </Link>
                        </td>
                        <td align="right">
                            {type === "broadcast" && (
                                <>
                                    {broadcast.status ===
                                        Constants.sequenceStatus[1] &&
                                        !isDateInFuture(
                                            new Date(
                                                broadcast.emails[0].delayInMillis,
                                            ),
                                        ) && (
                                            <Chip className="!bg-black text-white !border-black">
                                                Sent
                                            </Chip>
                                        )}
                                    {broadcast.status ===
                                        Constants.sequenceStatus[1] &&
                                        isDateInFuture(
                                            new Date(
                                                broadcast.emails[0].delayInMillis,
                                            ),
                                        ) && <Chip>Scheduled</Chip>}
                                    {[
                                        Constants.sequenceStatus[0],
                                        Constants.sequenceStatus[2],
                                    ].includes(
                                        broadcast.status as
                                            | (typeof Constants.sequenceStatus)[0]
                                            | (typeof Constants.sequenceStatus)[2],
                                    ) && <Chip>Draft</Chip>}
                                </>
                            )}
                            {type === "sequence" && (
                                <>
                                    {[
                                        Constants.sequenceStatus[0],
                                        Constants.sequenceStatus[2],
                                    ].includes(
                                        broadcast.status as "draft" | "paused",
                                    ) && (
                                        <Chip>
                                            {capitalize(broadcast.status)}
                                        </Chip>
                                    )}
                                    {broadcast.status ===
                                        Constants.sequenceStatus[1] && (
                                        <Chip className="!bg-black text-white !border-black">
                                            {capitalize(broadcast.status)}
                                        </Chip>
                                    )}
                                </>
                            )}
                        </td>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
};

export default SequencesList;
