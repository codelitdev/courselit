import React from "react";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import { FREE_COST } from "../config/strings";
import { siteInfoProps } from "../types";
import { Typography } from "@material-ui/core";
import { makeStyles } from "@material-ui/styles";

const useStyles = makeStyles({
  price: {
    fontSize: "3em"
  }
});

const PriceTag = props => {
  const classes = useStyles();
  const cost = props.cost || 0;
  const costText =
    cost <= 0
      ? FREE_COST
      : props.siteInfo.currencyUnit
      ? `${props.siteInfo.currencyUnit}${cost}`
      : `${cost} ${props.siteInfo.currencyISOCode}`;

  return (
    <Typography variant="subtitle1" color="primary" className={classes.price}>
      {costText}
    </Typography>
  );
};

PriceTag.propTypes = {
  cost: PropTypes.number.isRequired,
  siteInfo: siteInfoProps.isRequired
};

const mapStateToProps = state => ({
  siteInfo: state.siteinfo
});

export default connect(mapStateToProps)(PriceTag);
