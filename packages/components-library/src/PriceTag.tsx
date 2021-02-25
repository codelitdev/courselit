import { Typography } from "@material-ui/core";
import * as React from "react";
import { connect } from "react-redux";

interface PriceTagProps {
  cost: number;
  siteInfo: any;
  freeCostCaption: string;
}

const PriceTag = (props: PriceTagProps) => {
  const cost = props.cost || 0;
  const costText =
    cost <= 0
      ? props.freeCostCaption
      : props.siteInfo.currencyUnit
      ? `${props.siteInfo.currencyUnit}${cost}`
      : `${cost} ${props.siteInfo.currencyISOCode}`;

  return <Typography variant="h6">{costText}</Typography>;
};

const mapStateToProps = (state: any) => ({
  siteInfo: state.siteinfo,
});

export default connect(mapStateToProps)(PriceTag);
