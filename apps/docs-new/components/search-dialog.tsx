"use client";

import { OramaCloud } from "@orama/core";
import OramaSearchDialog from "fumadocs-ui/components/dialog/search-orama";
import { useEffect, useState } from "react";

const projectId = process.env.NEXT_PUBLIC_ORAMA_PROJECT_ID;
const apiKey = process.env.NEXT_PUBLIC_ORAMA_API_KEY;

export default function SearchDialog(
    props: React.ComponentProps<typeof OramaSearchDialog>,
) {
    const [client, setClient] = useState<OramaCloud | null>(null);

    useEffect(() => {
        if (!projectId || !apiKey) {
            return;
        }

        setClient(
            new OramaCloud({
                projectId,
                apiKey,
            }),
        );
    }, []);

    if (!client) {
        return <></>;
    }

    return <OramaSearchDialog {...props} client={client} showOrama />;
}
