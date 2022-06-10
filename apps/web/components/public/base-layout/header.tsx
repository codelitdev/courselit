import React from "react";
import { styled } from "@mui/system";
import { Theme } from "@mui/material/styles";
import { Grid } from "@mui/material";
import SessionButton from "../session-button";
import { useTheme } from "@mui/material";
import dynamic from "next/dynamic";

const PREFIX = "Header";

const classes = {
    branding: `${PREFIX}-branding`,
};

const StyledGrid = styled(Grid)(({ theme }: { theme: any }) => ({
    [`& .${classes.branding}`]: {
        [theme.breakpoints.up("sm")]: {
            display: "none",
        },
    },
}));

const Branding = dynamic(() => import("./branding"));

interface HeaderProps {}

const Header = ({}: HeaderProps) => {
    const theme: Theme = useTheme();

    return (
        <StyledGrid
            container
            justifyContent="space-between"
            direction="row"
            alignItems="center"
        >
            <Grid item>
                <div className={classes.branding}>
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

export default Header;
