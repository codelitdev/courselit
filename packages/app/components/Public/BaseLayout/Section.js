import React from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { Grid } from "@material-ui/core";
import WidgetByName from "./WidgetByName";
import { useRouter } from "next/router";
import widgets from "../../../config/widgets";
import { withStyles } from "@material-ui/styles";

const styles = (theme) => ({
  spacing: {
    marginBottom: theme.spacing(2),
  },
});

const Section = (props) => {
  const { name, layout, classes } = props;
  const sectionLayout = layout[name];
  const router = useRouter();

  return sectionLayout && sectionLayout.length ? (
    <Grid container direction="column">
      {sectionLayout.map((item, index) =>
        widgets[item].metadata.excludeFromPaths &&
        widgets[item].metadata.excludeFromPaths.includes(router.pathname) ? (
          <div key={index}></div>
        ) : (
          <Grid item key={index} className={classes.spacing}>
            <WidgetByName name={item} section={name} />
          </Grid>
        )
      )}
    </Grid>
  ) : (
    <></>
  );
};

Section.propTypes = {
  name: PropTypes.string.isRequired,
  layout: PropTypes.object.isRequired,
  classes: PropTypes.object.isRequired,
};

const mapStateToProps = (state) => ({
  layout: state.layout,
});

export default connect(mapStateToProps)(withStyles(styles)(Section));
