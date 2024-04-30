import {
    Address,
    AppMessage,
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
import { AppDispatch, AppState } from "@courselit/state-management";
import {
    networkAction,
    setAppMessage,
} from "@courselit/state-management/dist/action-creators";
import { FetchBuilder } from "@courselit/utils";
import {
    MAIL_TABLE_HEADER_STATUS,
    MAIL_TABLE_HEADER_SUBJECT,
} from "@ui-config/strings";
import { useEffect, useState } from "react";
import { connect } from "react-redux";

interface SequencesListProps {
    address: Address;
    dispatch: AppDispatch;
    loading: boolean;
    type: SequenceType;
}

const SequencesList = ({
    address,
    dispatch,
    loading,
    type,
}: SequencesListProps) => {
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [count, setCount] = useState(0);
    const [sequences, setSequences] = useState<
        Pick<Sequence, "sequenceId" | "title" | "emails">[]
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
                        published
                    }
                    title
                },
            }`;

        const fetcher = fetch
            .setPayload({
                query,
                variables: {
                    page,
                    type,
                },
            })
            .build();

        try {
            dispatch(networkAction(true));
            const response = await fetcher.exec();
            if (response.broadcasts) {
                setSequences(response.broadcasts);
            }
        } catch (e: any) {
            dispatch(setAppMessage(new AppMessage(e.message)));
        } finally {
            dispatch(networkAction(false));
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
                    type,
                },
            })
            .build();

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
                                href={`/dashboard/mails/broadcast/${broadcast.sequenceId}/edit`}
                                className="flex"
                            >
                                {broadcast.emails[0].subject === " "
                                    ? "--"
                                    : broadcast.emails[0].subject}
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
    );
};

const mapStateToProps = (state: AppState) => ({
    address: state.address,
    loading: state.networkAction,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({ dispatch });

export default connect(mapStateToProps, mapDispatchToProps)(SequencesList);
