import React from "react";
import { Button, Grid, Typography } from "@mui/material";
import { BTN_EDIT_SITE, HEADER_DESIGN } from "../../../ui-config/strings";
import { connect } from "react-redux";
import dynamic from "next/dynamic";
import Profile from "../../../ui-models/profile";
import { UIConstants as constants } from "@courselit/common-models";
import { checkPermission } from "@courselit/utils";
import { AppState } from "@courselit/state-management";
const ThemesManager = dynamic(() => import("./themes-manager"));

const { permissions } = constants;

interface AppearanceProps {
    profile: Profile;
}

const Appearance = (props: AppearanceProps) => {
    return (
        <Grid container spacing={2}>
            <Grid item xs={12}>
                <Grid
                    container
                    justifyContent="space-between"
                    alignItems="center"
                >
                    <Grid item>
                        <Typography
                            variant="h1"
                            style={{ wordBreak: "break-word" }}
                        >
                            {HEADER_DESIGN}
                        </Typography>
                    </Grid>
                    <Grid>
                        <Button
                            component="a"
                            href={`/dashboard/page/homepage/edit`}
                            variant="contained"
                        >
                            {BTN_EDIT_SITE}
                        </Button>
                    </Grid>
                </Grid>
            </Grid>
            {checkPermission(props.profile.permissions, [
                permissions.manageSite,
            ]) && (
                <Grid item xs={12}>
                    <ThemesManager />
                </Grid>
            )}
        </Grid>
    );
};

const mapStateToProps = (state: AppState) => ({
    profile: state.profile,
});

export default connect(mapStateToProps)(Appearance);
