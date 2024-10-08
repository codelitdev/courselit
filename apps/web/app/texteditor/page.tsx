"use client";

import { AddressContext } from "@components/contexts";
import { TextEditor } from "@courselit/components-library";
import { useContext } from "react";

export default function Page() {
    const address = useContext(AddressContext);

    return <TextEditor onChange={() => {}} url={address.backend} />;
}
