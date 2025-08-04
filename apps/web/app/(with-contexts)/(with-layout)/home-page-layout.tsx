"use client";

import {
    AddressContext,
    ProfileContext,
    ServerConfigContext,
    SiteInfoContext,
    TypefacesContext,
    ThemeContext,
} from "@components/contexts";
import { BaseLayout } from "@components/public/base-layout";
import { Profile } from "@courselit/common-models";
import { getFullSiteSetup } from "@ui-lib/utils";
import { useContext } from "react";
import { CodeInjectorWrapper } from "@components/public/code-injector";

export default function HomepageLayout({
    children,
    siteInfo,
}: {
    children: React.ReactNode;
    siteInfo: Awaited<ReturnType<typeof getFullSiteSetup>>;
}) {
    const address = useContext(AddressContext);
    const siteinfo = useContext(SiteInfoContext);
    const typefaces = useContext(TypefacesContext);
    const config = useContext(ServerConfigContext);
    const { profile } = useContext(ProfileContext);
    const { theme } = useContext(ThemeContext);

    return (
        <BaseLayout
            layout={siteInfo!.page.layout}
            title={siteInfo!.page.title || ""}
            typefaces={typefaces}
            siteInfo={siteinfo}
            dispatch={() => {}}
            theme={theme}
            state={{
                config: config,
                siteinfo,
                address: address,
                profile: profile as Profile,
                auth: profile?.email
                    ? {
                          guest: false,
                          checked: true,
                      }
                    : {
                          guest: true,
                          checked: true,
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
            {children}
            <CodeInjectorWrapper />
        </BaseLayout>
    );
}
