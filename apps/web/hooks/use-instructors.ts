import { useCallback, useEffect, useState } from "react";
import type { Instructor } from "@courselit/common-models";
import { useGraphQLFetch } from "./use-graphql-fetch";

const QUERY_INSTRUCTORS = `
    query {
        instructors: getInstructors {
            instructorId
            name
            bio
            userId
            avatar {
                mediaId
                originalFileName
                mimeType
                size
                access
                file
                thumbnail
                caption
            }
            links {
                label
                url
            }
        }
    }
`;

export default function useInstructors(): {
    instructors: Instructor[];
    loaded: boolean;
    error: Error | null;
    reload: () => Promise<void>;
} {
    const fetch = useGraphQLFetch();
    const [instructors, setInstructors] = useState<Instructor[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const reload = useCallback(async () => {
        try {
            const response = await fetch
                .setPayload({ query: QUERY_INSTRUCTORS })
                .build()
                .exec();
            setInstructors(response?.instructors ?? []);
            setError(null);
        } catch (err: any) {
            setError(err);
        } finally {
            setLoaded(true);
        }
    }, [fetch]);

    useEffect(() => {
        reload();
    }, [reload]);

    return { instructors, loaded, error, reload };
}
