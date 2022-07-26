import React from "react";
import { Theme } from "@mui/material/styles";
import { Grid } from "@mui/material";
import SessionButton from "../session-button";
import { useTheme } from "@mui/material";
import dynamic from "next/dynamic";

const Branding = dynamic(() => import("./branding"));

interface HeaderProps {}

const Header = ({}: HeaderProps) => {
    const theme: Theme = useTheme();

    return (
        <Grid
            container
            justifyContent="space-between"
            direction="row"
            alignItems="center"
        >
            <Grid item>
                <Branding />
            </Grid>
            {!theme.hideLoginButton && (
                <Grid item>
                    <SessionButton />
                </Grid>
            )}
        </Grid>
    );
};

export default Header;
