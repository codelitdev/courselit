import React from "react";
import { DOCUMENTATION_LINK_LABEL } from "../../ui-config/strings";

interface DocumentationLinkProps {
    text?: string;
    path: string;
}

export default function DocumentationLink({
    path,
    text = DOCUMENTATION_LINK_LABEL,
}: DocumentationLinkProps) {
    return (
        <a
            className="underline"
            target="_blank"
            rel="noopener noreferrer"
            href={`https://docs.courselit.app${path}`}
        >
            {text}
        </a>
    );
}
