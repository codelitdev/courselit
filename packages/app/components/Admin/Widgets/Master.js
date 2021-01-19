import React from "react";
import PropTypes from "prop-types";
import { GridList, GridListTile, Typography } from "@material-ui/core";
import { makeStyles } from "@material-ui/styles";
import { Card } from "@courselit/components-library";

const useStyles = makeStyles((theme) => ({
  widgetCard: {
    background: "white",
    textAlign: "center",
    padding: 16,
  },
  widgetCardLogo: {
    width: 32,
    height: "80%",
    marginBottom: theme.spacing(1),
    [theme.breakpoints.up("sm")]: {
      width: 48,
    },
    [theme.breakpoints.up("md")]: {
      width: 64,
    },
  },
  caption: {
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
}));

const Master = (props) => {
  const { componentsMap, onWidgetSelect } = props;
  const classes = useStyles();

  return (
    <GridList cols={3}>
      {Object.keys(componentsMap).map((name) =>
        componentsMap[name].component ? (
          <GridListTile key={name} onClick={() => onWidgetSelect(name)}>
            <Card>
              <div className={classes.widgetCard}>
                {componentsMap[name].icon && (
                  <>
                    <img
                      src={componentsMap[name].icon}
                      className={classes.widgetCardLogo}
                    />
                    <br />
                  </>
                )}
                {!componentsMap[name].icon && (
                  <>
                    <img
                      src="/courselit_backdrop_square.webp"
                      className={classes.widgetCardLogo}
                    />
                    <br />
                  </>
                )}
                <Typography variant="body1" className={classes.caption}>
                  {componentsMap[name].caption}
                </Typography>
              </div>
            </Card>
          </GridListTile>
        ) : null
      )}
    </GridList>
  );
};

Master.propTypes = {
  componentsMap: PropTypes.object.isRequired,
  onWidgetSelect: PropTypes.func.isRequired,
};

export default Master;
