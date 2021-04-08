import React from "react";
import { Grid, Typography } from "@material-ui/core";
import { HEADER_DESIGN } from "../../../config/strings.js";
import { connect } from "react-redux";
import { permissions } from "../../../config/constants.js";
import { profileProps } from "../../../types.js";
import { checkPermission } from "../../../lib/utils.js";
import { Section } from "@courselit/components-library";
import dynamic from "next/dynamic";
const ThemesManager = dynamic(() => import("./ThemesManager"));
const LayoutManager = dynamic(() => import("./LayoutManager"));

const Appearance = (props) => {
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

Appearance.propTypes = {
  profile: profileProps,
};

const mapStateToProps = (state) => ({
  profile: state.profile,
});

export default connect(mapStateToProps)(Appearance);
