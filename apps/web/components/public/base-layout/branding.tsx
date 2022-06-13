/**
 * A component that shows site's logo and name.
 */

import React from "react";
import { styled } from "@mui/system";
import { Link, Grid, Typography } from "@mui/material";
import { connect } from "react-redux";
import type { AppState } from "@courselit/state-management";
import { Image } from "@courselit/components-library";

const PREFIX = "Branding";

const classes = {
    toolbar: `${PREFIX}-toolbar`,
    logoAdjustment: `${PREFIX}-logoAdjustment`,
    logocontainer: `${PREFIX}-logocontainer`,
    logoimg: `${PREFIX}-logoimg`,
    siteName: `${PREFIX}-siteName`,
};

const StyledLink = styled(Link)(({ theme }) => ({
    [`& .${classes.toolbar}`]: theme.mixins.toolbar,
    [`& .${classes.logoAdjustment}`]: {},

    [`& .${classes.logocontainer}`]: Object.assign(
        {},
        {
            width: "2.4em",
            height: "2.4em",
            display: "flex",
            marginRight: theme.spacing(1),
        },
        theme.logo
    ),

    [`& .${classes.logoimg}`]: {
        borderRadius: "0.2em",
    },

    [`& .${classes.siteName}`]: Object.assign(
        {},
        {
            display: "none",
        },
        theme.siteName
    ),
}));

interface BrandingProps {
    siteinfo: typeof defaultState.siteinfo;
}

const Branding = ({ siteinfo }: BrandingProps) => {
    return (
        <StyledLink
            href="/"
            color="inherit"
            style={{ textDecoration: "none" }}
            underline="hover"
        >
            <Grid
                container
                alignItems="center"
                className={`${classes.toolbar} ${classes.logoAdjustment}`}
            >
                <Grid item className={classes.logocontainer}>
                    <Image src={siteinfo.logopath.file} height={36} />
                </Grid>
                <Grid item className={classes.siteName}>
                    <Typography variant="h5">{siteinfo.title}</Typography>
                </Grid>
            </Grid>
        </StyledLink>
    );
};

const mapStateToProps = (state: AppState) => ({
    siteinfo: state.siteinfo,
});

export default connect(mapStateToProps)(Branding);
