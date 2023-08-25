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
        <div className="flex items-center">
            <div className="mr-2">
                <Link
                    href="/"
                    sxProps={{
                        cursor: "pointer",
                    }}
                >
                    <Image
                        borderRadius={1}
                        src={siteinfo.logo.file}
                        width={36}
                        height={36}
                        alt=""
                    />
                </Link>
            </div>
            <p className="text-2xl font-bold">{siteinfo.title}</p>
        </div>
    );
};

const mapStateToProps = (state: AppState) => ({
    siteinfo: state.siteinfo,
});

export default connect(mapStateToProps)(Branding);
