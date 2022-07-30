import React from "react";
import { Button, Grid, Typography } from "@mui/material";
import { BTN_EDIT_SITE, HEADER_DESIGN } from "../../../ui-config/strings";
import { connect } from "react-redux";
import constants from "../../../config/constants";
import { checkPermission } from "../../../ui-lib/utils";
import dynamic from "next/dynamic";
import State from "../../../ui-models/state";
import Profile from "../../../ui-models/profile";
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

const mapStateToProps = (state: State) => ({
    profile: state.profile,
});

export default connect(mapStateToProps)(Appearance);
