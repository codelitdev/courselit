import { useState, useCallback, useMemo } from "react";
import { FetchBuilder } from "@courselit/utils";
import { useContext } from "react";
import { AddressContext } from "@components/contexts";
import { Sequence } from "@courselit/common-models";

interface UseSequenceReturn {
    sequence: Sequence | null;
    loading: boolean;
    error: string | null;
    loadSequence: (sequenceId: string) => Promise<void>;
}

export function useSequence(): UseSequenceReturn {
    const [sequence, setSequence] = useState<Sequence | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const address = useContext(AddressContext);

    const fetch = useMemo(
        () =>
            new FetchBuilder()
                .setUrl(`${address.backend}/api/graph`)
                .setIsGraphQLEndpoint(true),
        [address.backend],
    );

    const loadSequence = useCallback(
        async (sequenceId: string) => {
            if (!sequenceId) {
                setError("Sequence ID is required");
                return;
            }

            setLoading(true);
            setError(null);

            const query = `
            query GetSequence($sequenceId: String!) {
                sequence: getSequence(sequenceId: $sequenceId) {
                    sequenceId,
                    title,
                    type,
                    emails {
                        emailId,
                        templateId,
                        content {
                            content {
                                blockType,
                                settings
                            },
                            style,
                            meta
                        },
                        subject,
                        delayInMillis,
                        published
                    },
                    filter {
                        aggregator,
                        filters {
                            name,
                            condition,
                            value,
                            valueLabel
                        },
                    },
                    report {
                        broadcast {
                            lockedAt,
                            sentAt
                        }
                    },
                    status,
                    entrantsCount,
                    trigger {
                        type,
                        data
                    },
                    from {
                        name,
                        email
                    },
                    emailsOrder,
                }
            }`;

            const fetcher = fetch
                .setPayload({ query, variables: { sequenceId } })
                .build();

            try {
                const response = await fetcher.exec();
                if (response.sequence) {
                    setSequence(response.sequence);
                } else {
                    setError("Sequence not found");
                }
            } catch (e: any) {
                setError(e.message || "Failed to load sequence");
                console.error("Failed to load sequence:", e.message);
            } finally {
                setLoading(false);
            }
        },
        [fetch],
    );

    return {
        sequence,
        loading,
        error,
        loadSequence,
    };
}
