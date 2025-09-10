"use client";

import { Constants, Sequence, SequenceType } from "@courselit/common-models";
import { Chip, Link, useToast } from "@courselit/components-library";
import { FetchBuilder, capitalize } from "@courselit/utils";
import {
    TOAST_TITLE_ERROR,
    MAIL_TABLE_HEADER_STATUS,
    MAIL_TABLE_HEADER_SUBJECT,
    MAIL_TABLE_HEADER_ENTRANTS,
} from "@ui-config/strings";
import { useEffect, useState, useContext } from "react";
import { isDateInFuture } from "../../../lib/utils";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { PaginationControls } from "@components/public/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { AddressContext } from "@components/contexts";

interface SequencesListProps {
    type: SequenceType;
}

const SequencesList = ({ type }: SequencesListProps) => {
    const [page, setPage] = useState(1);
    const [count, setCount] = useState(0);
    const [sequences, setSequences] = useState<
        Pick<
            Sequence,
            "sequenceId" | "title" | "emails" | "status" | "entrantsCount"
        >[]
    >([]);
    const [isLoading, setIsLoading] = useState(false);
    const address = useContext(AddressContext);
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
        setIsLoading(true);
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
            setIsLoading(false);
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
        }
    };

    const totalPages = Math.ceil(count / 10); // 10 items per page

    return (
        <div className="space-y-4">
            <Table aria-label="Broadcasts" className="w-full">
                <TableHeader>
                    <TableRow>
                        <TableHead>{MAIL_TABLE_HEADER_SUBJECT}</TableHead>
                        <TableHead className="text-right">
                            {MAIL_TABLE_HEADER_STATUS}
                        </TableHead>
                        {type === "sequence" && (
                            <TableHead className="text-right">
                                {MAIL_TABLE_HEADER_ENTRANTS}
                            </TableHead>
                        )}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading
                        ? Array.from({ length: 10 }).map((_, idx) => (
                              <TableRow key={"skeleton-" + idx}>
                                  <TableCell className="py-4">
                                      <Skeleton className="h-5 w-40" />
                                  </TableCell>
                                  <TableCell className="py-4 text-right">
                                      <Skeleton className="h-5 w-24 ml-auto" />
                                  </TableCell>
                                  {type === "sequence" && (
                                      <TableCell className="py-4 text-right">
                                          <Skeleton className="h-5 w-12 ml-auto" />
                                      </TableCell>
                                  )}
                              </TableRow>
                          ))
                        : sequences.map((broadcast) => (
                              <TableRow key={broadcast.sequenceId}>
                                  <TableCell className="py-4">
                                      <Link
                                          href={`/dashboard/mails/${type}/${broadcast.sequenceId}`}
                                          className="flex"
                                      >
                                          {type === "broadcast" &&
                                              (broadcast.emails[0].subject ===
                                              " "
                                                  ? "--"
                                                  : broadcast.emails[0]
                                                        .subject)}
                                          {type === "sequence" &&
                                              (broadcast.title === " "
                                                  ? "Untitled Sequence"
                                                  : broadcast.title)}
                                      </Link>
                                  </TableCell>
                                  <TableCell className="text-right">
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
                                                  broadcast.status as
                                                      | "draft"
                                                      | "paused",
                                              ) && (
                                                  <Chip>
                                                      {capitalize(
                                                          broadcast.status,
                                                      )}
                                                  </Chip>
                                              )}
                                              {broadcast.status ===
                                                  Constants
                                                      .sequenceStatus[1] && (
                                                  <Chip className="!bg-black text-white !border-black">
                                                      {capitalize(
                                                          broadcast.status,
                                                      )}
                                                  </Chip>
                                              )}
                                          </>
                                      )}
                                  </TableCell>
                                  {type === "sequence" && (
                                      <TableCell className="text-right">
                                          {broadcast.entrantsCount}
                                      </TableCell>
                                  )}
                              </TableRow>
                          ))}
                </TableBody>
            </Table>
            {totalPages > 1 && (
                <PaginationControls
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                    disabled={isLoading}
                />
            )}
        </div>
    );
};

export default SequencesList;
