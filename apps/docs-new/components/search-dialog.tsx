"use client";

import { OramaCloud } from "@orama/core";
import OramaSearchDialog from "fumadocs-ui/components/dialog/search-orama";

const projectId = process.env.NEXT_PUBLIC_ORAMA_PROJECT_ID;
const apiKey = process.env.NEXT_PUBLIC_ORAMA_API_KEY;

const client =
    projectId && apiKey
        ? new OramaCloud({
              projectId,
              apiKey,
          })
        : null;

export default function SearchDialog(
    props: React.ComponentProps<typeof OramaSearchDialog>,
) {
    if (!client) {
        return <></>;
    }

    return <OramaSearchDialog {...props} client={client} showOrama />;
}
