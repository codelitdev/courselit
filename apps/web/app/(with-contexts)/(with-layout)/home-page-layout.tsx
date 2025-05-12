"use client";

import {
    AddressContext,
    ProfileContext,
    ServerConfigContext,
    SiteInfoContext,
    TypefacesContext,
    ThemeContext,
} from "@components/contexts";
import { MasterLayout } from "@components/public/base-layout";
import { Profile } from "@courselit/common-models";
import { getPage } from "@ui-lib/utils";
import { useContext, useEffect, useState } from "react";

export default function HomepageLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const address = useContext(AddressContext);
    const siteinfo = useContext(SiteInfoContext);
    const typefaces = useContext(TypefacesContext);
    const [page, setPage] = useState<any>(null);
    const config = useContext(ServerConfigContext);
    const { profile } = useContext(ProfileContext);
    const theme = useContext(ThemeContext);

    useEffect(() => {
        if (address.backend) {
            getPage(address.backend).then(setPage);
        }
    }, [address]);

    if (!page) {
        return null;
    }

    return (
        <MasterLayout
            layout={page.layout}
            title={page.title}
            typefaces={typefaces}
            siteInfo={siteinfo}
            dispatch={() => {}}
            theme={theme}
            state={{
                config: config,
                siteinfo,
                address: address,
                profile: profile as Profile,
                auth: {
                    guest: profile ? false : true,
                    checked: profile ? true : false,
                },
                networkAction: false,
                theme,
                typefaces,
                message: {
                    message: "",
                    open: false,
                    action: null,
                },
            }}
        >
            <div className="mx-auto lg:max-w-[1200px] w-full">{children}</div>
        </MasterLayout>
    );
}
