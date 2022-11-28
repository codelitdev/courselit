/**
 * A component that shows site's logo and name.
 */

import React from "react";
import { Grid, Typography } from "@mui/material";
import { connect } from "react-redux";
import type { AppState } from "@courselit/state-management";
import { Image, Link } from "@courselit/components-library";
import { SiteInfo } from "@courselit/common-models";

interface BrandingProps {
    siteinfo: SiteInfo;
}

const Branding = ({ siteinfo }: BrandingProps) => {
    return (
        <Grid container alignItems="center">
            <Grid item sx={{ mr: 1 }}>
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
                    />
                </Link>
            </Grid>
            <Grid item>
                <Typography variant="h5">{siteinfo.title}</Typography>
            </Grid>
        </Grid>
    );
};

const mapStateToProps = (state: AppState) => ({
    siteinfo: state.siteinfo,
});

export default connect(mapStateToProps)(Branding);
