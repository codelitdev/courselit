import React from "react";
import { Grid, Typography } from "@mui/material";
import { HEADER_DESIGN } from "../../../ui-config/strings";
import { connect } from "react-redux";
import constants from "../../../config/constants";
import { checkPermission } from "../../../ui-lib/utils";
import { Section } from "@courselit/components-library";
import dynamic from "next/dynamic";
import State from "../../../ui-models/state";
import Profile from "../../../ui-models/profile";
const ThemesManager = dynamic(() => import("./ThemesManager"));
const LayoutManager = dynamic(() => import("./LayoutManager"));

const { permissions } = constants;

interface AppearanceProps {
  profile: Profile;
}

const Appearance = (props: AppearanceProps) => {
  return (
    <Grid container spacing={2}>
      <Grid item xs>
        <Section>
          <Typography variant="h1" style={{ wordBreak: "break-word" }}>
            {HEADER_DESIGN}
          </Typography>
        </Section>
      </Grid>
      {checkPermission(props.profile.permissions, [
        permissions.manageLayout,
      ]) && <LayoutManager />}

      {checkPermission(props.profile.permissions, [
        permissions.manageThemes,
      ]) && <ThemesManager />}
    </Grid>
  );
};

const mapStateToProps = (state: State) => ({
  profile: state.profile,
});

export default connect(mapStateToProps)(Appearance);
