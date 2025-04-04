"use client";

import {
    Address,
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
    useToast,
} from "@courselit/components-library";
import { AppDispatch } from "@courselit/state-management";
import { networkAction } from "@courselit/state-management/dist/action-creators";
import { FetchBuilder, capitalize } from "@courselit/utils";
import {
    TOAST_TITLE_ERROR,
    MAIL_TABLE_HEADER_STATUS,
    MAIL_TABLE_HEADER_SUBJECT,
    MAIL_TABLE_HEADER_ENTRANTS,
} from "@ui-config/strings";
import { useEffect, useState } from "react";
import { isDateInFuture } from "../../../lib/utils";

interface SequencesListProps {
    address: Address;
    loading: boolean;
    type: SequenceType;
    dispatch?: AppDispatch;
}

const SequencesList = ({
    address,
    dispatch,
    loading,
    type,
}: SequencesListProps) => {
    const [page, setPage] = useState(1);
    // const [rowsPerPage, setRowsPerPage] = useState(10);
    const [count, setCount] = useState(0);
    const [sequences, setSequences] = useState<
        Pick<
            Sequence,
            "sequenceId" | "title" | "emails" | "status" | "entrantsCount"
        >[]
    >([]);
    const { toast } = useToast();

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
                    sequenceId
                    emails {
                        subject
                        published
                        delayInMillis
                    }
                    title
                    status
                    entrantsCount
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
            toast({
                title: TOAST_TITLE_ERROR,
                description: e.message,
                variant: "destructive",
            });
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
            toast({
                title: TOAST_TITLE_ERROR,
                description: e.message,
                variant: "destructive",
            });
        } finally {
            dispatch && dispatch(networkAction(false));
        }
    };

    return (
        <Table aria-label="Broadcasts" className="w-full mt-4">
            <TableHead>
                <td>{MAIL_TABLE_HEADER_SUBJECT}</td>
                <td align="right">{MAIL_TABLE_HEADER_STATUS}</td>
                {type === "sequence" && (
                    <td align="right">{MAIL_TABLE_HEADER_ENTRANTS}</td>
                )}
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
                                href={`/dashboard/mails/${type}/${broadcast.sequenceId}`}
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
                        {type === "sequence" && (
                            <td align="right">{broadcast.entrantsCount}</td>
                        )}
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
};

export default SequencesList;
