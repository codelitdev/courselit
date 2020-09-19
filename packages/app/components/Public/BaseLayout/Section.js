import React from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { Grid } from "@material-ui/core";
import WidgetByName from "./WidgetByName";

const Section = (props) => {
  const { name, layout } = props;
  const sectionLayout = layout[name];

  return sectionLayout && sectionLayout.length ? (
    <Grid container item direction="column">
      {sectionLayout.map((item, index) => (
        <Grid item key={index}>
          <WidgetByName name={item} />
        </Grid>
      ))}
    </Grid>
  ) : (
    <></>
  );
};

Section.propTypes = {
  name: PropTypes.string.isRequired,
  layout: PropTypes.object.isRequired,
};

const mapStateToProps = (state) => ({
  layout: state.layout,
});

export default connect(mapStateToProps)(Section);
