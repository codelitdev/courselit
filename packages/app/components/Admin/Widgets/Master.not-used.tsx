import React from "react";
import { styled } from "@mui/material/styles";
import { ImageList, ImageListItem, Typography } from "@mui/material";
import { Section } from "@courselit/components-library";

const PREFIX = "Master";

const classes = {
  widgetCard: `${PREFIX}-widgetCard`,
  widgetCardLogo: `${PREFIX}-widgetCardLogo`,
  caption: `${PREFIX}-caption`,
};

const StyledImageList = styled(ImageList)(({ theme }: { theme: any }) => ({
  [`& .${classes.widgetCard}`]: {
    background: "white",
    textAlign: "center",
    padding: 16,
  },

  [`& .${classes.widgetCardLogo}`]: {
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

  [`& .${classes.caption}`]: {
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
}));

interface MasterProps {
  componentsMap: any;
  onWidgetSelect: (...args: any[]) => void;
}

const Master = (props: MasterProps) => {
  const { componentsMap, onWidgetSelect } = props;

  return (
    <StyledImageList cols={3}>
      {Object.keys(componentsMap).map((name) =>
        componentsMap[name].component ? (
          <ImageListItem key={name} onClick={() => onWidgetSelect(name)}>
            <Section>
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
            </Section>
          </ImageListItem>
        ) : null
      )}
    </StyledImageList>
  );
};

export default Master;
