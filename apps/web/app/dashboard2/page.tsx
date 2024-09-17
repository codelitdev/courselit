"use client";

import { AddressContext } from "@components/contexts";
import { useContext, useEffect, useState } from "react";

export default function Page() {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const address = useContext(AddressContext);

    return (
        <div>
            {/* {isClient && (
                <TextEditor onChange={() => {}} url={address.backend} />
            )} */}
            {/* <SimpleEditor
                initialContent={{ type: "doc" }}
                onChange={(e) => console.log(e)}
            /> */}
        </div>
    );
}
