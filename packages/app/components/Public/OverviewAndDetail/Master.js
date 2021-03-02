import React from "react";
import PropTypes from "prop-types";
import { GridList, GridListTile } from "@material-ui/core";
import { Card } from "@courselit/components-library";
// import { makeStyles } from "@material-ui/styles";

// const useStyles = makeStyles((theme) => ({
//   widgetCard: {
//     background: "white",
//     textAlign: "center",
//     padding: 16,
//   },
//   widgetCardLogo: {
//     width: 32,
//     height: "80%",
//     marginBottom: theme.spacing(1),
//     [theme.breakpoints.up("sm")]: {
//       width: 48,
//     },
//     [theme.breakpoints.up("md")]: {
//       width: 64,
//     },
//   },
//   caption: {
//     overflow: "hidden",
//     textOverflow: "ellipsis",
//   },
// }));

const Master = ({ componentsMap, onSelect }) => {
  return (
    <GridList cols={3}>
      {componentsMap.map(({ Overview }, index) => (
        <GridListTile key={index} onClick={() => onSelect(index)}>
          <Card>{Overview}</Card>
        </GridListTile>
      ))}
    </GridList>
  );
};

Master.propTypes = {
  componentsMap: PropTypes.object.isRequired,
  onSelect: PropTypes.func.isRequired,
};

export default Master;
