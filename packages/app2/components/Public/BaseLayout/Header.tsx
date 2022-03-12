import React from "react";
import { styled } from '@mui/material/styles';
import PropTypes from "prop-types";
import { Grid } from "@mui/material";
import SessionButton from "../SessionButton";
import { useTheme } from "@mui/styles";
import dynamic from "next/dynamic";

const PREFIX = 'Header';

const classes = {
  branding: `${PREFIX}-branding`
};

const StyledGrid = styled(Grid)((
  {
    theme
  }
) => ({
  [`& .${classes.branding}`]: {
    [theme.breakpoints.up("sm")]: {
      display: "none",
    },
  }
}));

const Branding = dynamic(() => import("./Branding"));

interface HeaderProps {}

const Header = ({}: HeaderProps) => {
  const theme = useTheme();

  return (
    <StyledGrid container justifyContent="space-between" direction="row" alignItems="center">
      <Grid item>
        <div>
          <Branding />
        </div>
      </Grid>
      {!theme.hideLoginButton && (
        <Grid item>
          <SessionButton />
        </Grid>
      )}
    </StyledGrid>
  );
};

export default (Header);
