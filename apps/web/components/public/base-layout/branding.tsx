import React from "react";
import { connect } from "react-redux";
import type { AppState } from "@courselit/state-management";
import { Image, Link } from "@courselit/components-library";
import { SiteInfo } from "@courselit/common-models";

interface BrandingProps {
    siteinfo: SiteInfo;
}

const Branding = ({ siteinfo }: BrandingProps) => {
    return (
        <Link href="/">
            <div className="flex items-center">
                <div className="mr-2">
                    <Image
                        borderRadius={1}
                        src={siteinfo.logo?.file || ""}
                        width="w-[36px]"
                        height="h-[36px]"
                        alt="logo"
                    />
                </div>
                <p className="text-2xl font-bold">{siteinfo.title}</p>
            </div>
        </Link>
    );
};

const mapStateToProps = (state: AppState) => ({
    siteinfo: state.siteinfo,
});

export default connect(mapStateToProps)(Branding);
