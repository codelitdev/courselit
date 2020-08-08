import React from "react";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import { FREE_COST } from "../config/strings";
import { siteInfoProps } from "../types";

const PriceTag = (props) => {
  const cost = props.cost || 0;
  const costText =
    cost <= 0
      ? FREE_COST
      : props.siteInfo.currencyUnit
      ? `${props.siteInfo.currencyUnit}${cost}`
      : `${cost} ${props.siteInfo.currencyISOCode}`;

  return <>{costText}</>;
};

PriceTag.propTypes = {
  cost: PropTypes.number.isRequired,
  siteInfo: siteInfoProps.isRequired,
};

const mapStateToProps = (state) => ({
  siteInfo: state.siteinfo,
});

export default connect(mapStateToProps)(PriceTag);
